---
description: "将整个 dotfiles 目录树作为命名组部署，并为每台机器选择要应用的组。"
socialDescription: "将 dotfiles 目录树作为组部署，并为每台机器选择要应用的组。"
---

# 文件组

组是一棵有名称的 dotfiles 目录树，可按应用或机器角色划分。mise 无需逐项列出，就能部署树中的所有文件；每台机器可以选择要应用哪些组。

## 定义组 {#define-a-group}

使用 `[dotfile_groups.<name>]` 配置表声明一个组，并指定其 `root`：

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

| Key          | Default        | Meaning                                                                                                                                                                           |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`       | (required)     | The directory tree to deploy. A relative path starts at `dotfiles.root`.                                                                                                          |
| `target`     | `~`            | The directory the tree deploys into.                                                                                                                                              |
| `mode`       | `symlink-each` | `symlink-each` links each file, `copy` copies each file, and `symlink` links the whole tree. `dot_prefix`, `manifest`, and `entries` need `symlink-each` or `copy`.               |
| `exclude`    |                | Paths under the root to skip, using the [pattern syntax](/dotfiles/reference.html#patterns).                                                                                      |
| `dot_prefix` | `false`        | Deploy `dot-<name>` names as `.<name>`, as described in [Visible source names](/dotfiles/managed.html#dot-prefix).                                                                |
| `manifest`   |                | `"git"` deploys only files in Git's index, as described in [Deploy only files committed to Git](/dotfiles/managed.html#git-tracked-directories).                                  |
| `relative`   |                | Link by relative paths, as described in [Relative symlinks](/dotfiles/managed.html#relative).                                                                                     |
| `depends`    |                | 按名称指定组、按目标路径指定整文件条目；mise 会先写入这些依赖，再写入此组及其条目。详见[等待其他条目](/dotfiles/managed.html#depends)。 |
| `entries`    |                | Whole-file entries for parts of the tree; see [Group entries](#group-entries). Requires `symlink-each` or `copy`.                                                                 |

A group with `mode = "symlink"` and an `entries` table is invalid: mise warns
and ignores the whole group. With `symlink`, mise also ignores `dot_prefix`
and `manifest`.

## Group entries {#group-entries}

`[dotfile_groups.<name>.entries]` describes parts of the tree with the same
syntax as [`[dotfiles]` entries](/dotfiles/managed.html#whole-file-entries),
keyed by target path. Each entry is cut out of the walk, so it decides how its
path is deployed. For example, to link a directory as a whole instead of each
file in it, so that files the application creates there also land in your
dotfiles:

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

- An entry without `source` finds it under the root, at its path inside the
  group's target: `~/.config/kitty` in the `home` group reads
  `~/.dotfiles/home/dot-config/kitty`.
  With `mode = "template"`, a missing file falls back to the same path plus
  `.tera`, so `"~/.config/git/config" = { mode = "template" }` renders
  `home/dot-config/git/config.tera` and does not also deploy it with the suffix.
- A relative `source` starts at the root. When it lies inside the root, or
  inside the tree of another entry that walks a directory, that walk skips it,
  so `git/config.tmpl` is rendered to `~/.gitconfig` and not also linked to
  `~/git/config.tmpl`.
- An entry without `mode` deploys like the group: a directory the group's way,
  a file as one link, or as one copy in a `copy` group.
  例外情况是仅设置 `permissions` 的条目：它不会继承组的 `mode`，也不会部署文件，只会调整现有目标的权限（详见[权限](/dotfiles/managed.html#permissions)）。若要部署文件并设置权限，也要设置 `mode`，例如 `{ mode = "copy", permissions = "0600" }`。
- An entry that walks a directory inherits the group's `dot_prefix` and
  `manifest`, and the group's `exclude` patterns that contain no `/`, unless
  it sets its own.
- Every entry, including each target its `variants` name, must lie inside the
  group's target, and cannot be the target itself. An entry beneath another
  walking entry is cut out of that one too. An entry beneath a directory
  linked as a whole would change a file in the root itself, so mise reports it
  as a conflict before anything is written.

要将条目放入组中，请在 `[dotfile_groups.<name>.entries]` 下声明；在 `[dotfiles]` 条目中设置 `group` 键无效。

### 组中的编辑项 {#group-edits}

条目也可以[编辑文件的一部分](/dotfiles/edits.html)，而不是部署整个文件。键的写法与 `[dotfiles]` 编辑项相同：先写文件路径，再跟 ID；值则是包含 `block`、`line` 或 `merge` 的配置表：

```toml
[dotfile_groups.common]
root = "common"

[dotfile_groups.common.entries]
"~/.config/mise/conf.d/private.local.toml/defaults" = { source = "../templates/private.toml", merge = "missing", permissions = "0600" }
```

- 编辑项仅在选中该组时生效。选择其他组的机器不会修改此文件。
- 相对 `source` 路径与组中其他条目一样，以组根目录为基准；未设置来源的 `merge` 会读取根目录中同一路径的文件。遍历目录的组不会重复部署编辑项读取或修改的文件。
- 被编辑的文件必须位于组的目标目录内。编辑项可使用 `[dotfiles]` 编辑项支持的键；如果设置了仅供整文件条目使用的键（例如 `mode`），mise 会发出警告并忽略整个组。
- 取消选择该组会停止应用编辑项，但会保留它写入的文件内容。`mise dot unapply --group` 只会移除该组部署的文件；若要移除编辑项的代码块或行，请在组仍被选中时运行 `mise dot unapply <path>`。

## Select groups {#selecting-groups}

Every declared group applies until you select some. Use
`[bootstrap] dotfile_groups` to choose the groups a machine applies, for
example in that machine's `~/.config/mise/config.local.toml`:

```toml
[bootstrap]
dotfile_groups = ["home", "zsh"]
```

更靠近当前目录的配置文件中的组列表会替换其他列表。无论机器选择了哪些组，`[dotfiles]` 条目都会应用；组中的条目（包括其[编辑项](#group-edits)）则仅在该组被选中时应用。

### 无需配置表的组 {#groups-without-a-table}

如果选中的名称没有对应的 `[dotfile_groups]` 配置表，但它指向 [`dotfiles.root`](/configuration/settings.html#dotfiles.root) 下的一个目录，则该目录会按默认设置作为组根目录，并逐个文件部署到 `~`。这样一来，软件包目录无需额外配置表：

```text
~/.dotfiles/
├── kitty/.config/kitty/kitty.conf
├── nvim/.config/nvim/init.lua
└── zsh/.zshrc
```

```toml
[bootstrap]
dotfile_groups = ["kitty", "nvim", "zsh"]
```

`~/.config/kitty/kitty.conf` 会链接到 `~/.dotfiles/kitty/.config/kitty/kitty.conf`，其他文件也以此类推。只有当组需要额外设置（例如 `entries`、`dot_prefix` 或其他 `target`）时才需编写配置表；配置表会替换该组的默认设置。这类组只在某个列表选中它们时存在。如果列表中的名称既未声明，也不是目录，mise 会发出警告。

两个已选组不能部署到同一个目标文件；一个组也不能将目录整体链接，而另一个组又在其中放置文件。出现任一情况时，mise 会在写入前报告冲突并指出相关组名。

## 取消选择并移除组 {#deselecting-and-removing-groups}

取消选择某个组或删除其配置表后，组中的文件会保留，`mise dot status` 会将其列为 `orphaned`。mise 会在[状态目录](/dotfiles/reference.html#state-files)中记录各组部署的内容，因此能够识别这些文件。如果某个已选组不再部署某个文件，例如添加了新的 `exclude` 模式或删除了复制来源文件，该文件也会成为孤立文件。只要仍有活动条目部署某个文件，该文件就不会变成孤立文件，即使条目已移至其他组也是如此。仅设置权限的条目不会部署文件，因此不能阻止文件变成孤立文件：从原先部署文件的条目中移除 `mode` 后，该文件会变成孤立文件，并由 `--prune` 移除。如果 mise 无法读取某个组（例如其 `root` 不存在），会警告该组，而不会列出其中的文件。

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

| GNU Stow                        | mise                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 软件包目录 | `[bootstrap] dotfile_groups` 指定的 `dotfiles.root` 下的目录，详见[无需配置表的组](#groups-without-a-table) |
| `stow --dotfiles`               | `dot_prefix = true`                                                                                                              |
| Relative links (Stow's default) | [`dotfiles.relative_symlinks`](/configuration/settings.html#dotfiles.relative_symlinks) or `relative = true`                     |
| `stow -D <package>`             | `mise dot unapply --group <name>`                                                                                                |
| `stow --adopt`                  | `mise dot add --group <name> <file>`                                                                                             |
| Choosing which packages to stow | `[bootstrap] dotfile_groups`                                                                                                     |

Stow links a whole directory when nothing else lives in it. A `symlink-each`
group always links file by file; to link a directory as a whole, add a
`symlink` [group entry](#group-entries) for it.

要将机器从 Stow 迁移过来，请选择相同的软件包并运行 `mise dot apply`；无需先取消 Stow 链接。如果 Stow 曾将整个目录链接（例如将 `~/.config/kitty` 链接到 `~/.dotfiles/kitty/.config/kitty`），`mise dot status` 会报告该链接，而 apply 会将其替换为真实目录，并在其中逐个链接文件。如果链接指向组根目录中的其他位置，即使传入 `--force` 也会拒绝操作，因为沿该链接写入会修改根目录中的文件。
