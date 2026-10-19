---
description: "将整个 dotfiles 目录树作为命名组部署，并为每台机器选择要应用的组。"
socialDescription: "将 dotfiles 目录树作为组部署，并为每台机器选择要应用的组。"
---

# 文件组

组是一棵有名称的 dotfiles 目录树，可按应用或机器角色划分。mise 无需逐项列出，就能部署树中的所有文件；每台机器可以选择要应用哪些组。

## 定义组 {#define-a-group}

Declare a group with a `[dotfile_groups.<name>]` table that names its `root`:

```toml
[dotfile_groups.zsh]
root = "zsh"           # links ~/.dotfiles/zsh/.zshrc to ~/.zshrc

[dotfile_groups.home]
root = "home"          # ~/.dotfiles/home
target = "~"
mode = "symlink-each"
dot_prefix = true
exclude = ["README.md"]
```

mise 会遍历根目录，并将每个文件部署到目标目录下的相同路径。相对的 `root` 路径始终以 [`dotfiles.root`](/configuration/settings.html#dotfiles.root) 为基准，而不是以声明该组的配置文件所在目录为基准。组名可以包含字母、数字、`-`、`_` 和 `.`。如果更靠近当前目录的配置文件定义了同名组，其配置表会整体替换原组。

### 组键 {#group-keys}

| 键            | 默认值         | 含义                                                                                                                                                                |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`       | （必填）       | 要部署的目录树。相对路径以 `dotfiles.root` 为基准。                                                                                                               |
| `target`     | `~`            | 部署目录树的目标位置。                                                                                                                                              |
| `mode`       | `symlink-each` | `symlink-each` 会为每个文件创建符号链接，`copy` 会复制每个文件，`symlink` 会为整个目录树创建符号链接。`dot_prefix`、`manifest` 和 `entries` 需要使用 `symlink-each` 或 `copy`。 |
| `exclude`    |                | 要跳过的根目录下路径，使用[模式语法](/dotfiles/reference.html#patterns)。                                                                                           |
| `dot_prefix` | `false`        | 按照[源文件的可见名称](/dotfiles/managed.html#dot-prefix)说明，将 `dot-<name>` 部署为 `.<name>`。                                                               |
| `manifest`   |                | 设置为 `"git"` 时，仅部署 Git 索引中的文件，详见[仅部署已提交到 Git 的文件](/dotfiles/managed.html#git-tracked-directories)。                                     |
| `relative`   |                | 使用相对路径创建链接，详见[相对符号链接](/dotfiles/managed.html#relative)。                                                                                        |
| `entries`    |                | 为目录树的部分内容指定整文件条目；详见[组条目](#group-entries)。需要使用 `symlink-each` 或 `copy`。                                                               |

组的 `mode = "symlink"` 不能与 `entries` 表同时使用；如果同时设置，mise 会发出警告并忽略整个组。使用 `symlink` 时，mise 也会忽略 `dot_prefix` 和 `manifest`。

## 组条目 {#group-entries}

`[dotfile_groups.<name>.entries]` 使用与 [`[dotfiles]` 条目](/dotfiles/managed.html#whole-file-entries)相同的语法描述目录树中的部分内容，并以目标路径为键。每个条目都会从目录遍历中单独处理，决定其路径的部署方式。例如，若要为整个目录创建链接，而不是分别链接其中的文件（这样应用在该目录中创建的文件也会进入 dotfiles）：

```toml
[dotfile_groups.home]
root = "home"
dot_prefix = true

[dotfile_groups.home.entries]
"~/.config/kitty" = { mode = "symlink" }                     # ~/.config/kitty -> home/dot-config/kitty
"~/.ssh/config" = { mode = "copy", permissions = "0600" }
"~/.gitconfig" = { source = "git/config.tmpl", mode = "template" }
"~/.kitty-old.conf" = { mode = "absent" }
```

- 未设置 `source` 的条目会在根目录中查找文件，路径与其在组目标目录中的路径一致：`home` 组中的 `~/.config/kitty` 会读取 `~/.dotfiles/home/dot-config/kitty`。
  使用 `mode = "template"` 时，若文件不存在，则会回退到同一路径并附加 `.tera` 后缀。因此，`"~/.config/git/config" = { mode = "template" }` 会渲染 `home/dot-config/git/config.tera`，且不会再部署带后缀的文件。
- 相对的 `source` 路径以根目录为基准。如果它位于根目录内，或位于另一个会遍历目录的条目目录树中，则该目录遍历会跳过此文件。因此，`git/config.tmpl` 会渲染到 `~/.gitconfig`，不会同时链接到 `~/git/config.tmpl`。
- 未设置 `mode` 的条目会沿用组的部署方式：目录按组的方式部署；在 `copy` 组中，文件会作为单个链接或单个副本部署。
- 遍历目录的条目会继承组的 `dot_prefix`、`manifest`，以及不含 `/` 的 `exclude` 模式，除非条目另有设置。
- 每个条目（包括 `variants` 中命名的各目标）都必须位于组的目标目录内，且不能与目标目录本身相同。如果条目位于另一个目录遍历条目之下，也会从该条目的遍历中排除。若条目位于整目录符号链接之下，就会更改根目录中的文件，因此 mise 会在写入前将其报告为冲突。

组条目仅支持整文件条目。请在 `[dotfiles]` 中声明[代码块、行和合并编辑项](/dotfiles/edits.html)。若要将条目放入组中，请在 `[dotfile_groups.<name>.entries]` 下声明；带有 `group` 键的 `[dotfiles]` 条目无效。

## 选择组 {#selecting-groups}

如果没有选择特定组，则会应用所有已声明的组。使用 `[bootstrap] dotfile_groups` 选择机器要应用的组，例如在该机器的 `~/.config/mise/config.local.toml` 中设置：

```toml
[bootstrap]
dotfile_groups = ["home", "zsh"]
```

更靠近当前目录的配置文件中的列表会替换其他列表。无论选择哪些组，所有机器都会应用 `[dotfiles]` 条目。如果列表中包含未在任何位置声明的组，mise 会发出警告。

两个已选组不能部署到同一个目标文件；一个组也不能将目录整体链接，而另一个组又在其中放置文件。出现任一情况时，mise 会在写入前报告冲突并指出相关组名。

## 取消选择并移除组 {#deselecting-and-removing-groups}

取消选择一个组或删除其配置表都不会移除该组的文件；`mise dot status` 会将这些文件列为 `orphaned`。mise 会记录每个组部署的文件，因此能够识别它们；记录保存在[状态目录](/dotfiles/reference.html#state-files)中。若已选组不再部署某个文件（例如新增了 `exclude` 模式，或删除了复制源文件），该文件也会成为孤立文件。只要仍有任何活动条目在部署某文件，该文件就不会成为孤立文件，即使条目已移至其他组也是如此。如果 mise 无法读取某个组（例如其 `root` 不存在），会对该组发出警告，而不会列出其中的文件。

若要移除孤立文件或某个组中的所有文件：

```sh
mise dot apply --prune           # 应用配置并移除孤立文件
mise bootstrap --prune-dotfiles  # 在初始化流程中执行相同操作
mise dot unapply --group work    # 移除一个组的文件
```

`--prune` 和 `unapply --group` 仅会在链接仍指向 mise 创建时的源文件时移除链接；对于复制的文件，仅当其内容仍与 mise 写入时相同才会移除。若文件已被修改，它们会保留文件并显示警告；添加 `--force` 也可移除已更改的副本。清空的目录会被逐级删除，最多删除到部署文件的组或条目的目标目录。`unapply --group` 不要求该组仍处于选中或已声明状态。`--prune` 会在移除任何内容前请求确认，除非传入 `--yes`。它会处理所有组，因此不接受目标参数。

这两个命令会将文件与 mise 上次写入的内容比较，而不是与当前源文件比较，因此修改组根目录不会阻止 `unapply --group` 移除未改动的副本。如果路径经过已链接的目录（例如整个目录已作为链接部署），或位于 `dotfiles.root` 内，即使使用 `--force` 也不会移除该路径，因此不会删除源文件。

## 向组中添加文件 {#adding-files-to-a-group}

[`mise dot add`](/cli/dotfiles/add.html) 会将组目标目录中的文件收录到组根目录，不会写入条目。在使用 `dot_prefix` 的组中，源文件会获得 `dot-` 前缀。上例中的两个组都会部署到 `~`，因此添加新文件时请指定组名：

```sh
mise dot add --group home ~/.config/starship.toml   # -> ~/.dotfiles/home/dot-config/starship.toml
```

如果有多个组都包含该路径，mise 会选择目标目录最深的组。目标深度相同时，优先选择其根目录中已包含该文件的组。若是尚未被任何根目录收录的新文件，则必须传入 `--group`，否则 mise 会拒绝操作。

[`mise dot edit`](/cli/dotfiles/edit.html) 会打开组目录树中对应路径的源文件；需要新建文件时，同样可以通过 `--group` 指定组。设置 `manifest = "git"` 的组只会部署 Git 索引中的文件，因此 `add` 会拒绝将文件收录到该组；请改为将文件复制到根目录并运行 `git add`。

## 从 GNU Stow 迁移 {#coming-from-gnu-stow}

组与 Stow 软件包的用途相同：

| GNU Stow 功能                   | mise 中的对应设置                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A package directory             | A group, `[dotfile_groups.<name>]`, with that directory as `root`                                            |
| `stow --dotfiles`               | `dot_prefix = true`                                                                                          |
| Relative links (Stow's default) | [`dotfiles.relative_symlinks`](/configuration/settings.html#dotfiles.relative_symlinks) or `relative = true` |
| `stow -D <package>`             | `mise dot unapply --group <name>`                                                                            |
| `stow --adopt`                  | `mise dot add --group <name> <file>`                                                                         |
| Choosing which packages to stow | `[bootstrap] dotfile_groups`                                                                                 |

如果目录中没有其他内容，Stow 会将整个目录作为链接。`symlink-each` 组始终逐个文件创建链接；若要将目录整体链接，请为其添加 `symlink` [组条目](#group-entries)。
