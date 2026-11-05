---
description: "管理由其他程序维护的文件中的代码块、单行或少量键值，保留文件其余部分不变。"
socialDescription: "在由其他程序维护的文件中管理代码块、行或键值。"
---

# 编辑文件片段

编辑条目只管理文件中的一部分，其余内容保持不变：可以是标记注释之间的代码块、单行，或 JSON、TOML、YAML、INI 文件中的少量键值。适用于你或应用也会手动编辑的文件。

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

JSON 等不支持行注释的文件不能使用代码块。若要设置 JSON、TOML、YAML 或 INI 文件中的键，请使用 [merge 条目](#merge)；否则请[管理整个文件](/dotfiles/managed.html)。

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

来源文件包含需要的键，并使用与目标相同的格式。mise 会根据目标的 `.json`、`.jsonc`、`.toml`、`.yaml`、`.yml` 或 `.ini` 扩展名推断格式。如果文件扩展名无法表明格式，请将 `format` 设为 `"json"`、`"jsonc"`、`"toml"`、`"yaml"` 或 `"ini"`：

```toml
[dotfiles]
"~/.config/Code/User/settings.json/shared" = { source = "vscode/shared.json", merge = true, format = "jsonc" }
"~/.config/pip/pip.conf/shared" = { source = "pip/shared.conf", merge = true, format = "ini" }
```

With `codex/shared.toml` containing:

<!-- schema: skip -->

```toml
model = "gpt-5"

[tui]
theme = "light"
```

applying sets `model` and `tui.theme` and leaves the rest of
`~/.codex/config.toml` as it is, including `[plugins.*]` tables and comments
the application wrote. A missing target is created from the source.

- A table or object that exists on both sides merges recursively. Any other
  value, including an array, is replaced by the source's value.
- Keys that only the target has are never changed, and keys you remove from
  the source are not removed from the target.
- `mise dot status` and `mise dot diff` look only at the keys in the source, so
  keys the application adds never show up as drift.
- TOML 和 YAML 会原地编辑，因此注释、键顺序及未触及键的格式都会保留。JSON 不支持注释；mise 会保留键顺序和缩进，只有受管理的键发生差异时才重写文件。目标文件若不是有效的 JSON、TOML、YAML 或 INI（包括带注释的 JSON），mise 会报告错误且不会覆盖。
- JSONC 是支持注释和尾随逗号的 JSON 格式，例如 VS Code 的 `settings.json`。它像 TOML 和 YAML 一样原地编辑，注释、缩进、尾随逗号以及未触及键的文本都会保留。`format = "jsonc"` 设置（或 `.jsonc` 扩展名）也会应用于来源文件，因此来源中也可以包含注释。其他 JSON5 语法（例如单引号字符串或不带引号的键）不受支持。
- 使用 `format = "ini"` 或 `.ini` 扩展名时，INI 格式遵循 Python `configparser` 的解析规则。`[name]` 表示一个段；第一个段之前的键不属于任何段。`key = value` 和 `key: value` 都可设置键；不含这两种分隔符的行表示值为空的键；缩进比键更深的行会续接该值，包括中间的空行。只有以 `#` 或 `;` 开头的行才是注释，因此 `a = b ; c` 会将 `a` 设为 `b ; c`。值均按字符串处理，段不嵌套，因此来源段会逐键合并。键和段名按原样比较，包括大小写。重复的键或段使用最后一个值，mise 也会设置为该值。来源中未设置的键所在行不会被重写。
- `template = "tera"` renders the source first, as for blocks.
- Like a `symlink` entry, a merge entry without `source` uses the target's path
  under [`dotfiles.root`](/configuration/settings.html#dotfiles.root), so
  `"~/.codex/config.toml/shared" = { merge = true }` reads
  `<dotfiles.root>/.codex/config.toml`.
- To switch an entry from `symlink` to `merge`, point the merge at the same
  source. If the target is a link to that source, `mise dot apply` replaces the
  link with a regular copy before merging, so the application's keys survive
  when you later trim the source down to the keys you own. A target that links
  anywhere else is refused.

Two merge entries that set the same key of one file to different values are
refused instead of fighting over it. An entry with `template = "tera"` is
rendered only when it is applied, so mise finds a conflict with it when both
entries are applied in the same run, not when one is applied alone through a
target filter. mise does not compare a merge with a block or line edit of the
same file, so do not let both own one key.

### Defaults the application may change {#merge-missing}

Some keys are worth shipping as a default but belong to the application once
it has picked a value, such as the model a `/model` command writes. Use
`merge = "missing"` for those. It sets only the keys the target has no value
for, next to a regular `merge = true` entry for the keys you enforce:

```toml
[dotfiles]
"~/.codex/config.toml/shared" = { merge = true }
"~/.codex/config.toml/defaults" = { source = "codex/defaults.toml", merge = "missing" }
```

- A key the target already has keeps its value, even a different one. A key
  the application removes is filled in again on the next apply.
- A table that exists on both sides is compared key by key, so a default
  inside it is added without touching its siblings. A value that is not a
  table counts as present, so a source table under it is skipped.
- `mise dot status` and `mise dot diff` report only missing keys, never a
  differing value.
- A `missing` entry never conflicts with another entry for the same key: the
  other entry's value wins whichever applies first.

### 由 mise 创建文件时设置权限 {#merge-permissions}

`merge` 条目可使用 `permissions` 设置权限，值为八进制字符串，例如 `"0600"`。apply 创建目标文件时，mise 会设置该权限；如果文件已存在，则不会更改权限，因为该文件由写入它的应用管理。这适合先用占位内容初始化、之后再填写的文件，例如令牌文件：

```toml
[dotfiles]
"~/.config/mise/conf.d/private.local.toml/seed" = { source = "templates/private.toml", merge = "missing", permissions = "0600" }
```

首次 apply 会根据来源创建文件，并设为 `0600`。之后的 apply 只会添加缺少的键，因此你填写的令牌会保留；如果文件被删除，也会重新创建。若还要保留现有文件的权限，请为同一路径添加[仅设置权限的条目](/dotfiles/managed.html#permissions)。同一文件的 merge 条目若声明了不同权限，mise 会拒绝应用；在 Windows 上，`permissions` 会被忽略并显示警告。代码块和单行编辑不支持 `permissions`。

### 为缺失的键填入密钥 {#merge-secrets}

设置 `template = "tera"` 的 `merge = "missing"` 条目可通过 <code v-pre>{{ secret(name="...") }}</code> 读取已声明的[密钥输入](/bootstrap/secrets.html)。只有当目标缺少待填写的键时，mise 才会读取或提示输入密钥；已设置的键不会再次要求输入：

```toml
[bootstrap.secrets]
github_token = "MISE_GITHUB_TOKEN"
npm_token = "NPM_TOKEN"

[dotfiles]
"~/.config/mise/conf.d/private.local.toml/seed" = { source = "templates/private.toml", template = "tera", merge = "missing", permissions = "0600" }
```

```toml
# templates/private.toml
[env]
MISE_GITHUB_TOKEN = "{{ secret(name='github_token') }}"
NPM_TOKEN = "{{ secret(name='npm_token') }}"
```

在新机器上运行 `mise dot apply --prompt-secrets` 时，系统会提示输入这两个令牌并创建文件。之后在来源中添加 `PYPI_TOKEN` 并再次 apply，mise 只会提示输入该令牌，其他两个令牌保持不变。

- `mise dot status` 和 `mise dot diff` 不会读取或提示输入密钥。尚未填入密钥的键会报告为缺失，差异中会用 <code v-pre>‹secret:name›</code> 代替其值。
- 即使对应的键已经设置，未在 `[bootstrap.secrets]` 中声明的密钥仍会导致错误。
- 每个 `secret()` 都必须原样插入。若使用 `| upper` 等过滤器更改或移除它，会导致错误，因为 mise 无法判断结果对应哪个密钥。
- `mise bootstrap` 无法预先检查这些密钥，因为是否需要密钥取决于当时文件中的键。密钥不可用时，流程会在该条目处停止。
- 与其他模板一样，密钥值会原样插入；含引号或换行的值可能需要按格式进行转义。如果插入密钥后文件无法解析，mise 会报告错误，但不会打印文件内容。
- 强制应用的 `merge = true` 条目不能使用 `secret()`，因为它会覆盖你之后修改的值。

## Conflicts and removal {#conflicts}

Edits apply without `--force`. mise reports an error when a block's markers
are damaged, or when the target is a symlink; point the edit at the real file
you want to change instead. Editing a root-owned file, such as `/etc/hosts`,
requires running mise as root; see
[Files outside your home directory](/dotfiles/managed.html#root-owned-files).

Deleting an edit entry from your config leaves its block, line, or keys in the
file. [`mise dot unapply`](/cli/dotfiles/unapply.html) removes a block
together with its markers. A plain line has no marker to prove mise added it,
so removing one needs `mise dot unapply --force`. Merged keys stay, because
the application may have changed them since.

编辑条目会按目标路径和 ID 在多个配置文件间合并，因此更靠近项目的配置会替换相同 ID 的编辑项。在[dotfile 组](/dotfiles/groups.html#group-edits)中声明的编辑项仅在选中该组时应用。[参考](/dotfiles/reference.html#edit-keys)列出了所有编辑键。
