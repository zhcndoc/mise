---
description: "从你维护的来源链接、复制或渲染配置文件，并管理其权限、冲突和移除方式。"
socialDescription: "从你维护的来源链接、复制或渲染 dotfiles。"
---

# 托管文件

托管文件是 mise 根据你维护的来源创建的目标：可以是指向来源的链接、来源的副本、渲染后的模板，也可以是直接写在配置中的内容。请在 `[dotfiles]` 中声明各目标，并运行 [`mise dot apply`](/cli/dotfiles/apply.html)。

## 条目 {#whole-file-entries}

`[dotfiles]` 中的每个条目都以目标路径为键。请使用绝对路径或以 `~/` 开头的路径。来源可以是文件或目录：

```toml
[dotfiles]
"~/.zshrc" = { mode = "symlink" }
"~/.ssh/config" = { source = "ssh/config", mode = "copy" }
"~/.config/nvim" = "dotfiles/nvim"
```

省略 `source` 时，mise 会在 [`dotfiles.root`](/configuration/settings.html#dotfiles.root) 下（默认为 `~/.dotfiles`）查找相对于主目录的同一路径：`~/.zshrc` 对应 `~/.dotfiles/.zshrc`，`~/.config/foo.toml` 对应 `~/.dotfiles/.config/foo.toml`。主目录之外的目标必须指定 `source` 或[内联 `content`](#inline-content)。

相对 `source` 路径以声明该条目的配置文件所在目录为起点。例如，`~/.config/mise/config.toml` 中的 `source = "ssh/config"` 指向 `~/.config/mise/ssh/config`。像上例 `~/.config/nvim` 条目这样的字符串值表示来源，并使用 [`dotfiles.default_mode`](/configuration/settings.html#dotfiles.default_mode) 指定的模式。

To check your work, preview with `mise dot apply --dry-run` (add `--verbose`
to see content diffs) or [`mise dot diff`](/cli/dotfiles/diff.html), apply with
`mise dot apply`, and confirm with
[`mise dot status`](/cli/dotfiles/status.html). Apply skips targets that
already match. `mise dot diff` 会读取配置中声明的所有条目，而不仅是通过 `mise dot add` 创建的条目。它会显示每个将发生变化的目标的差异。如果没有需要更改的内容，整文件条目会显示 `files: all files are applied`，[编辑条目](/dotfiles/edits.html)会显示 `edits: all edits are applied`；`track` 条目会跳过，因为它们由 [`mise dot history diff`](/cli/dotfiles/history/diff.html) 处理。
[reference](/dotfiles/reference.html#entry-keys) lists every entry key.

## 模式 {#modes}

`mode` 决定 mise 如何根据来源创建目标。若未设置，mise 会使用 `dotfiles.default_mode`，其默认值为 `symlink`。

| 模式           | 应用时的行为                                                      | 适用场景                                                              |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `symlink`      | Create one link to a file or a whole directory.                   | Edits through the target should change the source.                    |
| `symlink-each` | Create directories and link each file within them.                | The target directory also holds files you want mise to leave alone.   |
| `copy`         | Copy a file or directory, overwriting matching files.             | The application needs a regular file or writes its own configuration. |
| `template`     | Render a source file with the [template engine](/templates.html). | The output depends on machine-specific variables.                     |
| `absent`       | Remove a file or symlink at the target; takes no source.          | A file you no longer use should not exist on any machine.             |
| `fnox`         | 将 fnox 为目标路径保存的文件写入目标位置；无需来源。 | 文件包含不应进入版本库的机密信息。 |

`mode = "track"` 和 `mode = "track-local"` 不是部署模式：它们会在文件原处保存历史记录，不需要来源。详见[Dotfiles 历史记录](/dotfiles/history.html)。在 Windows 上，除非启用 [`dotfiles.windows_symlinks`](/configuration/settings.html#dotfiles.windows_symlinks)，否则 `symlink` 创建链接失败时会回退为复制，而 `symlink-each` 会复制文件；详见 [Windows](#windows)。

若要将整个目录链接为一个整体：

```toml
[dotfiles]
"~/.config/nvim" = { source = "dotfiles/nvim", mode = "symlink" }
```

`symlink-each` 要求来源为目录。删除或排除来源文件后，下次应用会移除对应链接，目标目录中的其他文件则保持不变。mise 会在[状态目录](/dotfiles/reference.html#state-files)中记录自己创建的链接，请保留该目录，以便后续应用更新或删除这些链接。如果两个[配置环境](/configuration/environments.html)将同一个 `symlink-each` 目标指向不同来源，例如运行 `mise -E work dot apply`，应用另一环境时会移除仅属于旧来源的链接、重新指向共用路径，并保留未托管文件。

目录 `copy` 是增量操作。即使来源文件已被删除或排除，目标文件仍会保留，因此请手动移除这些残留副本。

::: warning 复制内容不会反向同步
应用 `copy` 条目会覆盖直接在目标文件中进行的更改。请先使用 `mise dot add` 将更改保存到来源；详见[接管文件并捕获编辑](#capturing-changes)。
:::

## 仅在文件不存在时创建 {#create-if-missing}

`copy`、`template` 和内联 `content` 条目每次 apply 都会覆盖目标文件。若要初始化一个之后会在本机编辑的文件（例如本地 API 令牌模板），请设置 `create_if_missing = true`：

```toml
[dotfiles]
"~/.config/mise/conf.d/private.local.toml" = { source = "templates/private.toml", mode = "copy", permissions = "0600", create_if_missing = true }
```

- 如果目标不存在，apply 会创建文件并设置 `permissions`。
- 如果目标位置存在除目录以外的任何内容（包括符号链接），apply 都会原样保留，包括文件内容和权限。`status` 会将其报告为已应用，`diff` 不显示差异，因此你所做的修改不会被视为偏离。
- 如果删除目标文件，下次 apply 会重新创建它。

只要目标存在，就不会读取来源文件或渲染模板，因此即使删除了来源，`apply` 和 `status` 也不会失败。目标位置若存在目录，仍会视为[冲突](#conflicts)。`create_if_missing` 需要文件来源，因此不能与目录来源、`symlink`、`symlink-each`、`absent`、`track` 或仅设置权限的条目组合使用。

如果应用会重写文件，而你只需要管理其中部分键，更适合使用 [`merge`](/dotfiles/edits.html#merge) 条目：它只设置随项目提供的键，并保留其他内容。

由于后续编辑过的文件并非由 mise 写入，`mise dot unapply` 默认会保留该文件；传入 `--force` 才会移除，详见[取消应用](#unapplying)。如果目标位于版本库中，请将其加入忽略规则，避免提交你添加的令牌。

## Templates {#templates}

每次应用时，`template` 条目都会使用 mise 的 [Tera 模板](/templates.html)渲染其来源：

```toml
[dotfiles]
"~/.gitconfig" = { source = "dotfiles/gitconfig.tera", mode = "template" }

[vars]
email = "you@example.com"
```

<div v-pre>

```jinja
[user]
    email = {{ vars.email }}
{% if os() == "macos" %}
[credential]
    helper = osxkeychain
{% endif %}
```

</div>

模板可以使用 `env`、`vars`、`exec()` 以及其他[模板上下文](/templates.html#variables)内容。也可以通过 <span v-pre>`{{ secret(name="logical_name") }}`</span> 读取已声明的 [bootstrap 密钥输入](/bootstrap/secrets.html)。向 dotfiles 命令传入 `--prompt-secrets`，可安全提示输入缺失值。应用模板时，mise 会写入渲染后的内容，并将目标权限设为来源文件的权限或 [`permissions`](#permissions) 指定的权限。后续应用也会修复已更改的权限。

`status`、`diff` 和 `apply` 会渲染模板并比较输出，因此会在受信任的配置下运行模板中的 `exec()` 调用。密钥值会在差异和其他命令输出中脱敏。使用 `--dry-run` 时，mise 会跳过 dotfile 模板渲染，并将其标记为 `(if changed)`。试运行期间仍可能执行其他配置表达式，因此只应对受信任的配置使用该选项。

实验性的 [`mise oci build`](/dev-tools/mise-oci.html#bootstrap-and-dotfiles-in-oci-images) 会在受限上下文中渲染模板；该页面列出了它会拒绝的内容。

### 模板渲染为空时移除目标 {#remove-empty}

通常情况下，即使模板输出为空，也会照常写入。设置 `remove_empty = true` 后，如果输出为空或只包含空白字符，mise 会改为移除目标文件。这样，模板就可以决定文件是否存在，例如仅用于工作环境的配置：

```toml
[dotfiles]
"~/.config/app/work.toml" = { source = "work.toml.tera", mode = "template", remove_empty = true }
```

<div v-pre>

```jinja
{% if env.WORK == "1" %}
[proxy]
url = "http://proxy.example.com"
{% endif %}
```

</div>

设置 `WORK=1` 时，`mise dot apply` 会写入文件；未设置时，模板渲染结果为空，下次应用会删除文件。再次设置该变量即可重新创建文件。应用前，`status` 和 `diff` 会显示待删除状态。

只有当目标文件为空、只包含空白字符，或内容仍与 mise 上次写入的内容完全一致时，mise 才会将其删除。如果你编辑过该文件，应用操作会报告[冲突](#conflicts)并保留文件；使用 `mise dot apply --force` 则会强制删除。目标路径是目录，或 mise 无法读取目标（例如权限为 `permissions = "0200"`）时，也会产生冲突。mise 写入内容的记录会[保存在本地](/dotfiles/reference.html#state-files)，因此在从未应用过该模板的机器上，如果目标已存在且内容不同，也会产生冲突。

mise 为目标创建的父目录在变为空目录后会随目标一并删除。例如，如果首次应用前 `~/.config/app` 不存在，删除 `work.toml` 时也会移除 `app`。原本已存在、仍包含其他文件，或其他条目仍需要的目录会保留。mise 只会删除物理位置位于主目录内的目录，绝不会删除主目录本身：目标为 `/opt/app/app.toml` 时会保留 `/opt/app`；如果 `~/.config` 是指向主目录外目录的符号链接，也会保留 `~/.config/app`。

`remove_empty` 需要 `mode = "template"`。目标同时被[跟踪](/dotfiles/history.html)时，`mise dot rollback` 和 `mise dot undo` 可以恢复被移除的文件。

## 内联内容 {#inline-content}

使用 `content` 可直接从配置中的字符串写入整个文件，而无需单独维护来源文件。在 Unix 上，文件权限默认为 `0600`，只有所有者可以读写；除非通过 [`permissions`](#permissions) 设置其他权限：

```toml
[dotfiles]
"~/.config/example.conf" = { content = "enabled = true\n" }
```

`content` 会取代 `source` 和 `mode`。它可以与 `permissions` 和 [`create_if_missing`](#create-if-missing) 一起使用，但不能与 `source`、`mode`、`exclude`、`manifest`、
`encrypt = true`, `remove_empty`, `dot_prefix`, `relative = true`, target
`variants`, the track-only keys `include` and `allow_plaintext`, or the edit
options `block`, `line`, `template`, and `comment`. The
[modes and keys table](/dotfiles/reference.html#modes-and-keys) compares all
entry kinds.

## 将文件存储在 fnox 中 {#fnox}

`mode = "fnox"` 会部署由 [fnox](https://fnox.jdx.dev) 保存内容的文件，例如凭据文件，因此文件内容不会存放在 dotfiles 版本库中。fnox 使用与目标相同的路径作为文件标识，所以此条目不需要 `source`：

```toml
[dotfiles]
"~/.npmrc" = { mode = "fnox" }
```

请先使用 fnox 1.44.0 或更高版本保存该文件。fnox 会通过 age 等提供程序加密文件，并将其保存在全局配置中：

```sh
mise use -g fnox
fnox set --file ~/.npmrc
```

`mise dot apply` 会针对目标运行 `fnox get --file`，并以 `0600` 权限写入结果；如果 [`permissions`](#permissions) 设置了其他权限，则使用该设置。`mise dot edit ~/.npmrc` 会运行 `fnox edit --file`，并将修改保存到 fnox；再次 apply 即可部署修改。mise 要求 `fnox` 位于 `PATH` 中。如果变体选择了其他 `target`，fnox 会按该路径查找文件，因此请用 `fnox set --file` 将文件保存到对应路径。`mise dot add` 不会捕获 fnox 文件，以免将机密复制到 dotfiles 版本库中。

从 fnox 读取文件时可能会出现提示，例如要求输入密码短语。`--dry-run` 会列出 fnox 条目但不读取文件；`mise dot diff` 会说明内容存在差异，但不会打印内容。与渲染模板一样，`mise dot status` 会读取文件进行比较。`mise oci build` 会跳过 fnox 条目，因为任何能够拉取镜像的人都可以读取镜像层。

## 等待其他条目 {#depends}

默认情况下，`mise dot apply` 会先规划所有条目，再开始写入。因此，模板或 [fnox](#fnox) 条目无法使用同一次 apply 创建的文件。`depends` 可让条目等待其他条目完成；值中按名称列出 dotfile 组，按目标路径列出整文件条目：

```toml
[dotfile_groups.secrets]
root = "secrets"
mode = "copy"
target = "~/.config/fnox"

[dotfiles]
"~/.workrc" = { mode = "fnox", depends = ["secrets"] }
"~/.npmrc" = { mode = "fnox", depends = ["~/.ssh/encryption_ed25519"] }
"~/.ssh/encryption_ed25519" = { mode = "template", source = "ssh/encryption_ed25519.tera" }
```

mise 会先写入依赖项，再渲染或读取依赖它们的条目。没有设置 `depends` 的条目会在第一轮写入。

- 组可以依赖其他组和条目。组中的条目会等待组依赖，以及各自声明的依赖。
- 如果 apply 未包含某个依赖项（例如 `mise dot apply <target>` 未指定该条目），该依赖会视为已应用。
- 名称既不是组也不是条目目标路径时会报错；存在循环依赖时也会报错。
- 某一轮失败后，mise 会停止执行：之前轮次写入的内容会保留，并列出因此未应用的条目。
- `--dry-run` 会列出依赖其他条目的项目，但不会渲染或读取它们；每轮只显示一次确认提示。
- 编辑条目和 `mode = "track"` 条目不能设置 `depends`。

`mise dot status` 会读取磁盘上的条目，因此在首次 apply 前，如果模板依赖尚不存在的文件，状态检查会报告该问题。

## Permissions {#permissions}

将 `permissions` 设为八进制字符串，可为目标指定权限，覆盖其原本会获得的权限。该设置可用于来源为文件的 `copy` 和 `template` 条目，以及内联 `content`：

```toml
[dotfiles]
"~/.netrc" = { source = "netrc.tera", mode = "template", permissions = "0600" }
```

如果目标权限发生变化，`mise dot status` 会报告该情况；下次应用时会重新设置权限。

单独使用时，`permissions` 只管理现有文件或目录的权限。mise 不会创建该路径、修改其内容，也不会从 `dotfiles.root` 推断来源：

```toml
[dotfiles]
"~/.ssh" = { permissions = "0700" }
"~/.ssh/config" = { permissions = "0600" }
```

对于主目录之外的路径，或需要指定所有者和组的路径，请改用 [`[bootstrap.files]`](/bootstrap/files.html#permissions-without-content)。

仅权限目标不存在时，应用操作会发出警告并跳过该目标；`status` 会将其计为 `applied`，原因是 `target absent; permissions not applied`，因此 `mise dot status --missing` 不会失败。同一次应用中由其他条目创建的目录仍会设置其权限。mise 不会跟随目标处的符号链接：`status` 会报告该链接，应用操作会发出警告并跳过；如果 mise 运行期间该路径被替换为链接，也会拒绝操作。`mise dot edit` 不会创建缺失的仅权限目标，`mise dot unapply` 也不会移除该目标。

权限模式（例如 `0200`）若连所有者都无法读取目标内容，mise 就只能检查目标权限，因为无法重新读取内容。

`permissions` 不能与 `symlink` 或 `symlink-each` 组合，因为这两种模式本身没有文件权限；也不能与会在历史记录中保存文件权限模式的 `track` 或目录来源组合。仅权限目标不能包含通配符。在 Windows 上，`permissions` 会被忽略并显示警告。

## 删除文件 {#absent}

使用 `mode = "absent"` 删除不再需要在机器上保留的文件，例如已替换工具的配置：

```toml
[dotfiles]
"~/.oldrc" = { mode = "absent" }
```

`mise dot apply` deletes `~/.oldrc` if it exists and does nothing once it is
gone. The entry is the instruction, so mise removes a regular file or a symlink
without comparing its content. It removes a symlink itself, never the file or
directory the link points to. `mise dot apply --dry-run` prints
`rm <target>`, and `mise dot status` shows the entry as `would remove` while
the file is there and `absent` once it is gone.

An `absent` entry never removes a directory, or anything else that is not a
regular file or symlink, such as a socket or FIFO. For those targets, `status`
and `apply` report an error naming the path, even with `--force`, and you
remove it yourself. The one exception is a parent directory that mise created
when an earlier entry wrote this target: once the file is gone and the
directory is empty, it goes too, as [for templates](#remove-empty).

`absent` 条目不能设置 `source`、`content`、`exclude`、`manifest`、`permissions`、`encrypt = true`、`remove_empty`、`create_if_missing`、`relative = true`、`dot_prefix` 或块和行编辑键；若设置这些键，mise 会发出警告并忽略条目。其他条目不能在 `absent` 目标下放置文件，编辑条目也不能修改它要删除的文件。目标必须是单一路径，因此不能包含 `*`、`?` 或 `[`。若要删除名称中包含这些字符的文件，请在 [`[bootstrap.files]`](/bootstrap/files.html#removing-resources) 下声明 `state = "absent"`。

When the removed path is [tracked](/dotfiles/history.html), the removal is
recorded like any other apply, so `mise dot undo` restores the file.
`mise dot unapply` leaves the target alone, because mise did not create the
file. In an image built with the experimental
[`mise oci build`](/dev-tools/mise-oci.html#bootstrap-and-dotfiles-in-oci-images),
an `absent` entry hides the base image's file at that path.

[Target variants](#platform-specific-destinations) work with `absent`, so you
can remove a file on some machines only:

```toml
[dotfiles."~/.bash_profile"]
mode = "absent"
variants = [{ os = "macos" }]
```

没有匹配任何变体的机器会跳过该条目。

## 目录

### 匹配多个来源文件 {#matching-multiple-source-files}

来源路径可以包含 glob 通配符 `*`、`**`、`?` 和 `[ab]`。如果带通配符的来源匹配到多个路径，目标路径必须包含对应的通配符，以便每个来源分别展开到自己的目标：

```toml
[dotfiles]
"~/.config/*.toml" = "dotfiles/config/*.toml"
"~/.local/share/app/**/*.json" = { source = "dotfiles/app/**/*.json", mode = "copy" }
"~/.config/app?.toml" = "dotfiles/config/app?.toml"
"~/.config/theme-[ab].toml" = "dotfiles/config/theme-[ab].toml"
```

### 排除文件 {#excluding-files}

`symlink-each` 条目以及来源为目录的 `copy` 条目会遍历源目录。添加 glob 模式组成的 `exclude` 列表，可跳过其中的文件。例如，来源为同时包含 `mise.toml` 的仓库时：

```toml
[dotfiles]
"~" = { source = ".", mode = "symlink-each", exclude = ["mise.toml", "*.md", ".git"] }
```

模式相对于源目录，并遵循[匹配模式语法](/dotfiles/reference.html#patterns)：不含 `/` 的模式（例如 `*.md`）会匹配任意深度的同名项；含 `/` 的模式（例如 `nvim/spell`）则以源根目录为基准。使用 `**` 可跨目录匹配。

对于 `symlink-each`，排除 mise 之前链接的文件会在下次应用时移除对应链接，效果与删除来源文件相同。目录 `copy` 是增量操作：排除规则会阻止后续复制，但会保留已有目标文件。若要从[跟踪目录](/dotfiles/history.html#exclude-files-from-one-directory)中排除文件，请使用跟踪条目自己的 `exclude` 列表。

`exclude` 是条目的字段，请在配置中编辑对应条目来设置。[`mise dot exclude`](/cli/dotfiles/exclude.html) 是另一项全局规则：它会向 `[history] exclude` 添加一个 glob，并应用于所有受跟踪的路径。

### Deploy only files committed to Git {#git-tracked-directories}

在 `symlink-each` 或目录 `copy` 条目中设置 `manifest = "git"`，即可只管理 Git 索引中的文件。适用于 `.gitignore` 忽略所有内容（`*`），再通过 `git add -f` 选择要纳入的文件的 dotfiles 仓库：Git 索引本身已是待部署文件列表，无需在 mise 中重复声明：

```toml
[dotfiles]
"~" = { source = ".", mode = "symlink-each", manifest = "git" }
```

mise 会在源目录中运行 `git ls-files`。被忽略和未跟踪的文件不会受到影响；从索引中移除文件后，下次应用会移除对应的 `symlink-each` 链接。`exclude` 还可以进一步筛选 Git 文件列表。Git manifest 需要目录来源，并使用 `symlink-each` 或 `copy` 模式。

### 可见的来源名称 {#dot-prefix}

在 `symlink-each` 或目录 `copy` 条目中设置 `dot_prefix = true`，可让 dotfiles 仓库中的文件保持可见。与 GNU Stow 的 `--dotfiles` 选项类似，路径中每个名为 `dot-<name>` 的组件都会部署为 `.<name>`，其他名称保持不变：

```toml
[dotfiles]
"~" = { source = "home", mode = "symlink-each", dot_prefix = true, exclude = ["README.md"] }
```

| 来源                              | 目标                        |
| --------------------------------- | --------------------------- |
| `home/dot-bashrc`                 | `~/.bashrc`                 |
| `home/dot-config/foo/config.toml` | `~/.config/foo/config.toml` |
| `home/bin/dot-helper`             | `~/bin/.helper`             |
| `home/.editorconfig`              | `~/.editorconfig`           |

`exclude` 和 `manifest = "git"` 匹配的是来源名称，例如 `dot-bashrc`。如果两个来源路径部署到同一目标（例如 `dot-bashrc` 和 `.bashrc`），应用会失败并报告这两个路径。`mise dot add` 不会将文件捕获到 `dot_prefix` 条目中，因为这会把目标名称复制到来源；请直接编辑来源。启用了 `dot_prefix` 的[分组](/dotfiles/groups.html)可以接收新文件，并以 `dot-` 开头的名称存储它们。

## 不同机器使用不同目标 {#platform-specific-destinations}

`variants` 在部署条目和跟踪条目中的含义不同。本节中，它用于为每台机器选择目标路径；在[跟踪条目](/dotfiles/history.html#variants)中，它则用于在同一路径下分别保存内容。

若要将同一来源部署到各操作系统上的不同路径：

```toml
[dotfiles."vscode/settings.json"]
source = "dotfiles/vscode/settings.json"
mode = "copy"
variants = [
  { os = "macos", target = "~/Library/Application Support/Code/User/settings.json" },
  { os = "linux", target = "~/.config/Code/User/settings.json" },
  { os = "windows", target = "~/AppData/Roaming/Code/User/settings.json" },
]
```

目标变体适用于 `copy`、`symlink`、`symlink-each`、`template` 和 [`absent`](#absent)。每个变体可按 `os` 选择机器（也可指定架构，例如 `os = "macos/arm64"`），按 `profile` 选择机器（即通过 `-E` 或 `MISE_ENV` 选择的[配置环境](/configuration/environments.html)），或设置 `default = true`。匹配项中最具体的变体优先；得分并列会使条目无效；如果机器没有匹配任何变体且未设置默认项，则会跳过该条目。评分规则见[变体选择器参考](/dotfiles/reference.html#variant-selectors)。

变体中的 `target` 会覆盖表键。每个变体都提供 `target` 时，表键可以使用逻辑名称，如上例所示。否则，表键必须是绝对目标路径或相对于主目录的路径。每个目标都必须是绝对路径或以 `~/` 开头。

变体的 `target` 是模板，因此目标路径可以根据机器配置变化，例如 `XDG_CONFIG_HOME` 不等于 `~/.config` 时：

```toml
[dotfiles.examplectl]
source = "dotfiles/examplectl"
mode = "symlink"
variants = [{ default = true, target = "{{ xdg_config_home }}/examplectl" }]
```

如果要链接到 mise 读取配置的目录，即使该目录由 `MISE_CONFIG_DIR` 指定，也可以使用 `{{ mise_config_dir }}`：

```toml
[dotfiles."git-tools"]
source = "git"
mode = "symlink"
variants = [{ default = true, target = "{{ mise_config_dir }}/conf.d/git-tools" }]
```

该模板包含所有配置文件都可使用的上下文（`env`、`xdg_config_home`、`config_root` 等），但不包含 `exec()` 或 `vars`。渲染结果必须是绝对路径或以 `~/` 开头的路径。条目键不会经过渲染。

When every variant supplies a `target`, you can omit `source`, and mise reads
the source from the entry key as a path under `dotfiles.root`:

```toml
[dotfiles."vscode/settings.json"]
mode = "copy"
variants = [
  { os = "macos", target = "~/Library/Application Support/Code/User/settings.json" },
  { os = "linux", target = "~/.config/Code/User/settings.json" },
]
```

两台机器上都会读取 `~/.dotfiles/vscode/settings.json`。此类键不能包含 `..`。显式指定的 `source` 在所有机器上相同；若为相对路径，则以配置文件所在目录为基准解析。如果任一变体省略 `target`，条目就必须显式指定 `source`，该变体会将表键用作目标路径：

```toml
[dotfiles."~/.config/example/settings.json"]
source = "dotfiles/example/settings.json"
mode = "symlink"
variants = [
  { profile = "work", target = "~/.config/example-work/settings.json" },
  { default = true },
]
```

`status`、`diff`、`apply` 和 `unapply` 都会使用所选目标。更改机器所选的目标路径，不会删除先前部署到旧路径的文件。

### 仅为特定配置部署条目 {#only-for-a-profile}

没有 `target` 的变体只负责选择。若没有 `default` 变体，未匹配任何变体的机器会跳过该条目，因此可以让一个条目等待某个环境，而由另一个文件选择其余配置。`mise.ssh.toml` 中的此条目仅在同时选择 `work` 时部署：

```toml
[dotfiles."~/.ssh/work_key"]
source = "ssh/work_key"
mode = "symlink"
variants = [{ profile = "work" }]
```

`MISE_ENV=ssh` 会跳过 `~/.ssh/work_key`，而 `MISE_ENV=ssh,work` 会创建该链接。

To give a whole set of entries to one operating system, put them in a
platform config file such as `config.macos.toml` instead, with the
[`auto_env`](/configuration/settings.html#auto_env) setting on; see
[Platform environments](/configuration/environments.html#platform-environments).
Use `variants` when one entry needs a different target on each machine.

## 相对符号链接 {#relative}

默认情况下，链接使用绝对路径指向来源。设置 [`dotfiles.relative_symlinks`](/configuration/settings.html#dotfiles.relative_symlinks) 后，链接会像 GNU Stow 一样使用相对于链接所在目录的路径。这样，即使另一台机器将主目录挂载到不同路径（例如通过 NFS），或整个目录树被移动，链接仍能正常工作：

```toml
[settings]
dotfiles.relative_symlinks = true

[dotfiles]
"~/.config/foo" = { source = "~/dotfiles/foo", mode = "symlink" } # ~/.config/foo -> ../dotfiles/foo
"~/.bashrc" = { source = "~/dotfiles/bashrc", relative = false }  # stays absolute
```

条目的 `relative` 键会覆盖此设置，且 `relative = true` 只能用于 `symlink` 或 `symlink-each`。启用相对链接后，下次应用会将指向同一来源的绝对链接改为相对链接；关闭此设置时，仍能到达来源的现有相对链接会保留。Windows 会忽略此选项，因为目录链接使用 junction，无法采用相对路径。

## 接管文件并捕获编辑 {#capturing-changes}

若要开始管理已有文件，请运行 [`mise dot add`](/cli/dotfiles/add.html)：

```sh
mise dot add ~/.inputrc
```

mise 会将文件移动到 `dotfiles.root` 下的来源路径（`~/.dotfiles/.inputrc`），在全局配置中添加条目并应用它。默认使用 `symlink` 模式，因此 `~/.inputrc` 会变成指向已移动文件的链接。如果来源位于另一文件系统，mise 会改为复制文件，并保留符号链接和权限。

- `--mode copy` keeps a regular file at the target; `--mode` takes any mode.
- `--source <path>` 使用指定来源，而不是 `dotfiles.root` 下的来源。相对路径以当前目录为起点；如果来源位于配置文件所在目录中，条目会记录相对于该目录的路径，否则记录绝对路径。
- `--no-apply` 会将文件复制到来源并写入条目，但不更改原文件，方便先检查两者。它仍会写入来源：如果来源已存在且内容不同，`add` 会用当前文件覆盖来源，并且只会在终端中先询问（`--force` 或 `--yes` 可跳过提示）。对于每个已存在的目标，`--dry-run` 都会打印一条 `cp` 命令，无论其内容是否已与来源一致；因此添加前请自行比较已有来源与当前文件。
- `--dry-run` prints the source and config changes without making them.

条目会写入全局配置，或写入 [`write_targets.dotfiles`](/configuration/settings.html#write_targets.dotfiles) 指定的文件。使用 `--local` 可写入项目配置，使用 `--path` 可指定其他文件。对于可推断的来源和默认 `symlink` 模式，`add` 会省略相应配置，因此上例会写入 `"~/.inputrc" = {}`。通过 `--mode` 传入的模式总会写入配置。

如果直接编辑了复制模式的目标，请再次对其运行 `mise dot add`，将更改保存回来源：

```sh
$EDITOR ~/.config/starship.toml
mise dot add ~/.config/starship.toml
```

`mise dot add` 不会捕获 `template` 目标，因为渲染后的文件会覆盖来源中的模板代码及其 `exec()` 输出；请改为编辑来源。传入 `--force` 仍会覆盖来源。

`mise dot add --changed` updates the sources of every changed regular file
managed in `copy` mode, including the files a copy-mode
[group](/dotfiles/groups.html) discovers in its tree. Each file's config must
be trusted. It skips other directory copies, symlinks, templates, and inline
content.

A target inside a [group](/dotfiles/groups.html#adding-files-to-a-group)'s
tree is captured into that group's root instead, without a new entry.

[`mise dot edit <target>`](/cli/dotfiles/edit.html) opens the target's source
in your editor, and `--apply` applies the target when the editor exits. For a
tracked or permissions-only entry it opens the file itself, and for inline
`content`, an `absent` entry, or an edit without a source file it opens the
config file that declares it. For a target that is not managed yet, it first
adds it the way `mise dot add --no-apply` does, after asking (`--yes` skips
the question).

## Conflicts {#conflicts}

A `symlink` or `symlink-each` entry never replaces a real file or directory
where a link should go, or a directory where a file should go. Apply stops
and lists the conflicting paths; `mise dot apply --force` replaces them. A
real file needs `--force` even when its contents and permissions match the
source. To keep the file's content instead, [adopt it](#capturing-changes)
with `mise dot add`. An existing symlink that points elsewhere is repointed
without `--force`.

`copy`、`template` 或内联 `content` 条目无需 `--force` 即可覆盖目标内容，并会将目标位置的符号链接替换为文件。目录若位于复制、模板或内联文件的目标位置，或文件位于目录复制的目标位置，仍会视为冲突，需要 `--force`。如果 `apply` 即将覆盖自 mise 上次写入后被你修改过的 `template` 目标，会先发出警告，方便你将修改移入来源。更改目标来源前，请先运行 `mise dot diff` 检查差异。

[Edit entries](/dotfiles/edits.html#conflicts) apply without `--force`.

## Unapply {#unapplying}

Deleting an entry from your config leaves its file, block, or line in place.
Run [`mise dot unapply <target>`](/cli/dotfiles/unapply.html) first, while
mise can still identify what the entry created, or replace the entry with
[`mode = "absent"`](#absent) to remove the file on machines that already
applied it. A `state = "absent"` declaration under
[`[bootstrap.files]`](/bootstrap/files.html#removing-resources) also removes a
file that no entry created.

`mise dot unapply` removes targets without removing their `[dotfiles]`
entries or source files. It uses the current config, the filesystem, and what
mise recorded about earlier applies to decide what each entry owns:

| Entry                                   | What unapply removes                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `symlink`                               | 仅当链接仍指向配置的来源时，移除该链接。                                                       |
| `symlink-each`                          | 移除来源到目标的精确链接，包括来源已删除后留下的失效链接；其他文件保留。                         |
| `copy` 文件、`template`、内联内容        | 仅当文件内容仍匹配时移除。目标已更改时需要 `--force`。                                         |
| `copy` 目录                             | 逐个移除匹配文件。未托管文件会保留，目录仅在变空后移除。                                       |
| 仅 `permissions`                       | 不移除内容。                                                                                  |
| `absent`                                | 不移除内容。mise 不会重新创建它已删除的文件。                                                  |
| 代码块和行编辑                          | 移除带标记的代码块。普通行没有标记，需要 `--force`。合并的键会保留。                            |

移除 `symlink`、`copy`、`template` 或内联 `content` 目标时，mise 创建的父目录也会在变为空目录后随之移除。mise 写入目标前就已存在、包含其他文件或仍被其他条目使用的目录会保留。mise 只会删除物理位置位于主目录内的目录，绝不会删除主目录本身或其外部的内容，也不会通过符号链接父目录越界删除。

某个条目需要 `--force` 时，unapply 会在移除任何内容前停止并指出该条目。如果你从复制目录的来源中删除了文件，unapply 无法识别它之前对应的副本，因此需要你手动移除该文件。使用 `--dry-run` 可预览将要移除的内容。

文件一旦被[跟踪](/dotfiles/history.html)，每次运行 `mise dot apply`、`add`、`unapply` 或 `edit` 前后都会为跟踪文件保存检查点，因此 [`mise dot undo`](/cli/dotfiles/undo.html) 可以撤销相应更改。

## 主目录之外的文件 {#root-owned-files}

mise 始终以当前运行用户的身份写入 dotfiles，不会使用 `sudo`。`/etc/hosts` 这类目标只有在 mise 以 root 身份运行时才可用，例如在容器中；否则应用时会因权限错误而失败。普通用户若要管理整个 root 所有的文件，可改在 [`[bootstrap.files]`](/bootstrap/files.html) 下声明；文件系统拒绝更改时，该功能会使用 root 权限重试。代码块和行编辑没有相应的提权机制，因此编辑 `/etc/hosts` 这类 root 所有的文件仍需以 root 身份运行 mise。

## 托管 mise 配置本身 {#self-managing-mise-config}

全局 mise 配置和 `dotfiles.root` 本身也可以作为 dotfiles 管理：

```toml
[settings]
dotfiles.root = "~/.dotfiles"

[dotfiles]
"~/.dotfiles" = "~/src/dotfiles"
"~/.config/mise/config.toml" = "~/src/dotfiles/mise/config.toml"
```

Clone the real repository (`~/src/dotfiles` here) before the first
`mise dot apply` or `mise bootstrap`. Use the real repository path for sources
the first run needs, because `~/.dotfiles` does not exist until mise creates
that link. Replacing `~/.config/mise/config.toml` changes what every later
mise command reads, so make sure the source holds a valid config before you
apply it.

## Windows {#windows}

Windows 允许时，文件型 `symlink` 条目会创建符号链接；启用开发者模式后，无需提权即可创建，否则会复制文件。目录链接会使用 junction。`symlink-each` 会复制每个文件，且副本不会跟随来源。来源更改后，副本仍是普通文件，而不是应有的链接；`mise dot apply` 会拒绝在未传入 `--force` 时覆盖它，因为你或应用可能已经修改了副本。可运行 `mise dot apply --force <target>` 刷新某个条目的副本；若希望 apply 始终覆盖文件，请使用 `mode = "copy"`；也可以启用 `dotfiles.windows_symlinks`（见下文），让目标跟随来源。`mise dot status` 接受磁盘上的任一形式。Windows 会忽略 `relative` 和 `permissions`。

Set [`dotfiles.windows_symlinks`](/configuration/settings.html#dotfiles.windows_symlinks)
to `true` to get real file links from both modes. `symlink-each` then links
each file, and a file that cannot be linked fails the apply instead of
becoming a copy, so Developer Mode or an elevated shell is required. Files
earlier applies copied are regular files in the way, so replacing them with
links needs `--force`. Turning the setting off again changes only what new
files get: links already in place stay links, and `mise dot unapply` of a
`symlink-each` entry that holds links needs `--force` unless the setting is
on.
