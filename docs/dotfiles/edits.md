---
description: "管理由其他程序维护的文件中的代码块、单行或少量键值，保留文件其余部分不变。"
socialDescription: "在由其他程序维护的文件中管理代码块、行或键值。"
---

# 编辑文件片段

编辑条目只管理文件中的一部分，其他内容保持不变：可以是标记注释之间的代码块、单行内容，或 JSON、TOML、YAML 文件中的少数几个键。适用于你或应用程序也会手动编辑的文件。

编辑条目位于 `[dotfiles]` 中。每个键由目标路径和标识该文件中编辑项的 ID 组成：

```toml
[dotfiles]
"~/.zshrc/aliases" = { block = '''
alias ll='ls -l'
alias la='ls -la'
''' }
"~/.ssh/config/include" = { line = "Include ~/.ssh/config.d/*", position = "prepend" }
"~/.gitconfig/identity" = { source = "snippets/git-identity.tmpl", template = "tera" }
```

例如，`"~/.zshrc/aliases"` 会以 ID `aliases` 编辑 `~/.zshrc`。ID 可以包含字母、数字、`_`、`-` 和 `.`。`mise dot apply` 会与其余 `[dotfiles]` 配置一并应用编辑项；`mise dot status` 和 `mise dot diff` 也会报告这些编辑项。

若要将 `mise activate` 添加到 Shell 启动文件，请使用 [Shell 激活](/bootstrap/shell.html)，而不要手动编写代码块。

## 代码块 {#blocks}

`block` 位于两个标记注释之间，标记名称由条目 ID 决定。上方的 `aliases` 条目会写入：

```sh
# >>> mise:aliases >>> managed by mise — do not edit between markers
alias ll='ls -l'
alias la='ls -la'
# <<< mise:aliases <<<
```

应用编辑时会替换标记之间的内容。如果文件中没有该代码块，mise 会将它追加到文件末尾。文件中的其他内容保持不变。

mise 会根据文件扩展名选择标记注释：Lua 使用 `--`，`.vim` 文件使用 `"`，Lisp 使用 `;;`，INI 使用 `;`，JavaScript、Go 和 Rust 等类 C 语言使用 `//`，其他文件则使用 `#`，包括没有扩展名的文件（例如 `.zshrc`）。设置 `comment = "..."` 可使用其他前缀。`~/.vimrc` 没有扩展名，因此默认使用 Vim 不会识别为注释的 `#`；编辑 `~/.vimrc` 时请将 `comment = '"'`。

JSON 等不支持行注释的文件不能使用代码块。若要设置 JSON、TOML 或 YAML 文件中的键，请使用[合并条目](#merge)；其他情况请[管理整个文件](/dotfiles/managed.html)。

### 从文件读取代码块内容 {#block-content-from-a-file}

若要将代码块内容单独存放在文件中，而不是直接写入配置，请像上方的 `identity` 条目那样设置 `source` 和 `template = "tera"`。mise 会在写入代码块前使用 [Tera](/templates.html) 渲染该文件；不含 Tera 语法的内容会原样保留。相对 `source` 路径以声明此条目的配置文件所在目录为基准。只有 `source` 的配置表属于[整文件条目](/dotfiles/managed.html#whole-file-entries)，而不是编辑项。

## 单行 {#lines}

`line` 条目会在指定内容尚不存在时添加该行。默认情况下 mise 会将其追加到文件末尾；设置 `position = "prepend"` 可将其插入文件开头。该行存在后，后续应用不会移动它。包括换行符在内的其他字节均保持不变。值必须是单行；多行内容请使用代码块。

## 设置配置文件中的键 {#merge}

有些应用会将自身状态写入你想管理的配置文件：Codex 会重写 `~/.codex/config.toml`，Claude Code 会重写 `~/.claude/settings.json`，其他工具也可能在每次更改时重写 YAML 文件。`symlink` 或 `copy` 条目会与应用争用整个文件，而应用重写文件后，代码块也会丢失。

`merge` 条目只管理其源文件中包含的键。文件中的其他内容仍由应用管理：

```toml
[dotfiles]
"~/.codex/config.toml/shared" = { source = "codex/shared.toml", merge = true }
"~/.claude/settings.json/shared" = { source = "claude/shared.json", merge = true }
"~/.omp/agent/config.yml/shared" = { source = "omp/shared.yml", merge = true }
```

源文件以与目标相同的格式保存所需键，mise 会根据目标文件的 `.json`、`.toml`、`.yaml` 或 `.yml` 扩展名推断格式。`codex/shared.toml` 的内容如下：

<!-- schema: skip -->

```toml
model = "gpt-5"

[tui]
theme = "light"
```

应用时会设置 `model` 和 `tui.theme`，并保留 `~/.codex/config.toml` 中的其他内容，包括应用写入的 `[plugins.*]` 表和注释。如果目标文件不存在，则会根据源文件创建。

- 两侧都存在的表或对象会递归合并。其他值（包括数组）都会被源文件中的值替换。
- 仅存在于目标文件中的键不会更改；从源文件中删除的键也不会从目标文件中移除。
- `mise dot status` 和 `mise dot diff` 只检查源文件中的键，因此应用新增的键不会被视为偏离配置。
- TOML 和 YAML 会就地编辑，因此注释、键顺序以及未触及键的格式都会保留。JSON 不支持注释；mise 会保留其键顺序和缩进，并且仅在受管理的键不同时才重写文件。如果目标文件不是有效的 JSON、TOML 或 YAML（包括带注释的 JSON），系统会报告错误且不会覆盖文件。
- 与代码块相同，设置 `template = "tera"` 时会先渲染源文件。
- 与 `symlink` 条目类似，未设置 `source` 的合并条目会使用目标路径在 [`dotfiles.root`](/configuration/settings.html#dotfiles.root) 下的对应文件。因此，`"~/.codex/config.toml/shared" = { merge = true }` 会读取 `<dotfiles.root>/.codex/config.toml`。
- 若要将条目从 `symlink` 切换为 `merge`，请让合并条目指向相同源文件。如果目标是指向该源文件的链接，`mise dot apply` 会先将链接替换为普通副本再进行合并，因此之后缩减源文件、只保留自己管理的键时，应用拥有的键仍会保留。若目标链接到其他位置，则操作会被拒绝。

如果两个合并条目为同一文件中的同一个键设置不同值，mise 会拒绝操作，而不会让它们相互覆盖。设置了 `template = "tera"` 的条目只会在应用时渲染，因此仅当两个条目在同一次运行中应用时，mise 才能发现冲突；通过目标过滤单独应用其中一个条目时则不会发现。mise 不会比较同一文件的合并条目与代码块或单行编辑，因此不要让它们同时管理同一个键。

### 应用可以更改的默认值 {#merge-missing}

有些键适合作为默认值提供，但应用一旦选定具体值后就应由应用管理，例如 `/model` 命令写入的模型。对此类键请使用 `merge = "missing"`。它只会设置目标中尚无值的键；你要强制管理的键则另用常规的 `merge = true` 条目：

```toml
[dotfiles]
"~/.codex/config.toml/shared" = { merge = true }
"~/.codex/config.toml/defaults" = { source = "codex/defaults.toml", merge = "missing" }
```

- 目标中已有的键会保留当前值，即使与默认值不同也是如此。若应用删除某个键，下次应用配置时会重新补入该键。
- 两侧都存在的表会逐键检查，因此会添加其中缺少的默认值，而不影响同级键。非表值会被视为已存在，因此其下的源表会跳过。
- `mise dot status` 和 `mise dot diff` 只会报告缺少的键，不会报告值不同。
- `missing` 条目不会与其他设置同一键的条目冲突：无论先应用哪一项，另一条目的值都会生效。

## 冲突和移除 {#conflicts}

编辑项会在不使用 `--force` 的情况下应用。如果代码块标记已损坏，或目标是符号链接，mise 会报告错误；请改为将编辑项指向要更改的实际文件。编辑 `/etc/hosts` 等归 root 所有的文件需要以 root 身份运行 mise；详见[主目录之外的文件](/dotfiles/managed.html#root-owned-files)。

从配置中删除编辑条目不会移除文件中的代码块、行或键。`mise dot unapply` 会连同标记一起移除代码块。普通行没有标记可证明它由 mise 添加，因此移除该行需要运行 `mise dot unapply --force`。合并的键会保留，因为应用可能已更改其值。

不同配置文件中的编辑条目按目标路径和 ID 合并，因此更靠近当前目录的配置会替换同 ID 编辑项。[参考文档](/dotfiles/reference.html#edit-keys)列出了所有编辑键。
