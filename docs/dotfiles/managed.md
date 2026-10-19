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

若要检查配置，可运行 `mise dot apply --dry-run` 预览（添加 `--verbose` 可查看内容差异），或运行 [`mise dot diff`](/cli/dotfiles/diff.html)；使用 `mise dot apply` 应用，并通过 [`mise dot status`](/cli/dotfiles/status.html) 确认。已匹配的目标会被跳过。[配置参考](/dotfiles/reference.html#entry-keys)列出了所有条目键。

## 模式 {#modes}

`mode` 决定 mise 如何根据来源创建目标。若未设置，mise 会使用 `dotfiles.default_mode`，其默认值为 `symlink`。

| 模式           | 应用时的行为                                                      | 适用场景                                                              |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `symlink`      | 为文件或整个目录创建一个链接。                                    | 希望通过目标进行的编辑能修改来源时。                                  |
| `symlink-each` | 创建目录，并为其中每个文件分别创建链接。                          | 目标目录还包含需要由 mise 保留的其他文件时。                          |
| `copy`         | 复制文件或目录，并覆盖目标中匹配的文件。                          | 应用程序需要普通文件，或会自行写入配置时。                            |
| `template`     | 使用[模板引擎](/templates.html)渲染来源文件。                    | 输出取决于特定机器上的变量时。                                        |
| `absent`       | 删除目标处的文件或符号链接；不接受来源。                          | 不再使用的文件不应在任何机器上存在时。                                |

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

## 模板 {#templates}

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

`content` 会替代 `source` 和 `mode`。它可以与 `permissions` 组合，但不能与 `source`、`mode`、`exclude`、`manifest`、`encrypt = true`、`remove_empty`、`dot_prefix`、`relative = true`、目标 `variants`、仅跟踪键 `include` 和 `allow_plaintext`，或编辑选项 `block`、`line`、`template` 和 `comment` 同时使用。[模式与键表](/dotfiles/reference.html#modes-and-keys)列出了所有条目类型的对比。

## 权限 {#permissions}

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

如果 `~/.oldrc` 存在，`mise dot apply` 会将其删除；文件不存在时则不执行操作。该条目本身就是删除指令，因此 mise 会直接移除普通文件或符号链接，而不比较其内容。它只会删除符号链接本身，不会删除链接指向的文件或目录。`mise dot apply --dry-run` 会输出 `rm <target>`；文件存在时，`mise dot status` 会将条目标记为 `would remove`，文件删除后则标记为 `absent`。

`absent` 条目绝不会删除目录，或套接字、FIFO 等既非普通文件也非符号链接的内容。遇到这类目标时，即使使用 `--force`，`status` 和 `apply` 仍会报告包含路径的错误，需要你手动删除。唯一例外是 mise 在先前条目写入此目标时创建的父目录：目标文件删除且目录变空后，该目录也会一并删除，规则与[模板](#remove-empty)相同。

`absent` 条目不接受 `source`、`content`、`exclude`、`manifest`、`permissions`、`encrypt = true`、`remove_empty`、`relative = true`、`dot_prefix`，也不接受 block 和 line 编辑键；设置这些键时，mise 会发出警告并忽略该条目。其他条目不能在 `absent` 目标下放置文件，编辑条目也不能修改它要删除的文件。目标必须明确指向一个路径，因此不能包含 `*`、`?` 或 `[`。若要删除名称中含有这些字符的文件，请在 [`[bootstrap.files]`](/bootstrap/files.html#removing-resources) 下声明 `state = "absent"`。

删除路径被[跟踪](/dotfiles/history.html)时，该删除会像其他应用操作一样被记录，因此 `mise dot undo` 可以恢复文件。`mise dot unapply` 不会处理目标，因为该文件不是 mise 创建的。在使用实验性 [`mise oci build`](/dev-tools/mise-oci.html#bootstrap-and-dotfiles-in-oci-images) 构建的镜像中，`absent` 条目会隐藏基础镜像中该路径下的文件。

[`absent` 也支持目标变体](#platform-specific-destinations)，因此你可以只在部分机器上删除文件：

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

### 只部署已提交到 Git 的文件 {#git-tracked-directories}

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

每个变体都提供 `target` 时，可以省略 `source`，mise 会将条目键作为 `dotfiles.root` 下的路径读取来源：

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

若要让一组条目只用于某种操作系统，可启用 [`auto_env`](/configuration/settings.html#auto_env)，并将它们放进 `config.macos.toml` 之类的平台配置文件；详见[平台环境](/configuration/environments.html#platform-environments)。只有单个条目需要在不同机器上使用不同目标时，才使用 `variants`。

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

- `--mode copy` 会在目标处保留普通文件；`--mode` 可接受任意模式。
- `--source <path>` 使用指定来源，而不是 `dotfiles.root` 下的来源。
- `--no-apply` 会将文件复制到来源路径并写入条目，但不更改原文件，方便先检查两者。
- `--dry-run` 只打印来源和配置将发生的更改，不会实际执行。

条目会写入全局配置，或写入 [`write_targets.dotfiles`](/configuration/settings.html#write_targets.dotfiles) 指定的文件。使用 `--local` 可写入项目配置，使用 `--path` 可指定其他文件。对于可推断的来源和默认 `symlink` 模式，`add` 会省略相应配置，因此上例会写入 `"~/.inputrc" = {}`。通过 `--mode` 传入的模式总会写入配置。

如果直接编辑了复制模式的目标，请再次对其运行 `mise dot add`，将更改保存回来源：

```sh
$EDITOR ~/.config/starship.toml
mise dot add ~/.config/starship.toml
```

`mise dot add --changed` 会将所有已更改的普通文件更新回来源，但仅限以 `copy` 模式托管的文件；也包括在目录树中发现的、由 `copy` 模式[分组](/dotfiles/groups.html)托管的文件。每个文件对应的配置都必须受信任。此命令会跳过其他目录复制、符号链接、模板和内联内容。

若目标位于[分组](/dotfiles/groups.html#adding-files-to-a-group)目录树中，捕获的文件会存入该分组根目录，而不会新建条目。

[`mise dot edit <target>`](/cli/dotfiles/edit.html) 会在编辑器中打开目标的来源；指定 `--apply` 后，编辑器退出时会应用目标。对于跟踪条目或仅权限条目，它会打开文件本身；对于内联 `content`、`absent` 条目，或没有来源文件的编辑项，它会打开声明该条目的配置文件。若目标尚未托管，命令会先像 `mise dot add --no-apply` 一样添加它，并在执行前询问你（使用 `--yes` 可跳过询问）。

## 冲突 {#conflicts}

`symlink` 或 `symlink-each` 条目不会替换链接目标位置上的真实文件或目录，也不会替换本应放置文件的目录。应用操作会停止并列出冲突路径；运行 `mise dot apply --force` 可替换这些路径。即使真实文件的内容和权限与来源完全相同，也需要 `--force`。若要保留该文件内容，请使用 `mise dot add` 将其[接管](#capturing-changes)。指向其他位置的现有符号链接会直接改为指向新来源，无需 `--force`。

`copy`、`template` 或内联 `content` 条目无需 `--force` 即可覆盖目标内容，并会将目标处的符号链接替换为文件。但若本应放置复制文件、模板或内联文件的位置是目录，或本应复制目录的位置是文件，仍属于冲突，需要使用 `--force`。更改目标所用的来源前，请先检查 `mise dot diff`。

[编辑条目](/dotfiles/edits.html#conflicts)无需 `--force` 即可应用。

## 撤销应用 {#unapplying}

从配置中删除条目不会移除它创建的文件、代码块或行。请先运行 [`mise dot unapply <target>`](/cli/dotfiles/unapply.html)，趁 mise 仍能识别该条目创建的内容时将其撤销；也可以将条目改为 [`mode = "absent"`](#absent)，以便在已应用该条目的机器上删除文件。对于没有任何条目创建的文件，也可在 [`[bootstrap.files]`](/bootstrap/files.html#removing-resources) 下声明 `state = "absent"` 来删除。

`mise dot unapply` 会移除目标，但不会删除对应的 `[dotfiles]` 条目或来源文件。它会根据当前配置、文件系统，以及 mise 对先前应用操作的记录，判断每个条目所拥有的内容：

| 条目                                    | unapply 移除的内容                                                                            |
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

首次运行 `mise dot apply` 或 `mise bootstrap` 前，请先克隆真实仓库（此处为 `~/src/dotfiles`）。首次运行所需的来源应使用真实仓库路径，因为 `~/.dotfiles` 要等 mise 创建链接后才会存在。替换 `~/.config/mise/config.toml` 会改变之后每个 mise 命令读取的配置，因此应用前请确认来源中包含有效配置。

## Windows 上的行为 {#windows}

文件的 `symlink` 条目会在 Windows 允许时创建符号链接；启用开发者模式后无需提升权限即可创建，否则会复制文件。目录链接则是 junction。`symlink-each` 始终逐个复制文件，因此应编辑来源而非目标，然后运行 `mise dot apply`。`mise dot status` 可以识别磁盘上的这两种形式。Windows 会忽略 `relative` 和 `permissions`。

将 [`dotfiles.windows_symlinks`](/configuration/settings.html#dotfiles.windows_symlinks) 设为 `true`，两种模式都会创建真正的文件链接。此时 `symlink-each` 会逐个链接文件；若无法创建链接，应用操作会失败而不会回退为复制，因此需要启用开发者模式或使用提升权限的 Shell。之前应用时复制的文件会阻挡链接替换，需要使用 `--force`。之后关闭此设置只会影响新文件：已有链接仍保持链接；若 `symlink-each` 条目包含链接，除非重新启用该设置，否则执行 `mise dot unapply` 需要 `--force`。
