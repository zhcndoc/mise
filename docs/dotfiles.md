# Dotfiles <Badge type="warning" text="experimental" />

mise 可以管理 `mise.toml` 中 `[dotfiles]` 部分的配置文件。
每个条目可以拥有整个文件或目录，也可以管理由其他所有者拥有的文件中的一小部分内容。

```toml
[settings]
dotfiles.root = "~/.dotfiles"
dotfiles.default_mode = "symlink"

[dotfiles]
"~/.zshrc" = {}                                                       # ~/.dotfiles/.zshrc
"~/.gitconfig" = "dotfiles/gitconfig"                                # 显式源
"~/.config/alacritty.toml" = { mode = "copy" }                       # ~/.dotfiles/.config/alacritty.toml
"~/.config/starship.toml" = { source = "dotfiles/starship.toml", mode = "copy" }
"~/.ssh/config" = { source = "dotfiles/ssh_config.tmpl", mode = "template" }
"~/.config/nvim" = "dotfiles/nvim"                                   # 目录本身使用符号链接
"~/.local/bin" = { source = "dotfiles/bin", mode = "symlink-each" }  # 为其中每个文件创建符号链接
"~/hosts/dev" = { line = "127.0.0.1 dev.local" }                     # 编辑 ~/hosts 中的一行
```

Dotfiles 只会在明确请求时应用，使用
`mise dotfiles apply` 或 [`mise bootstrap`](/cli/bootstrap.html)。它们
不会被 `mise install` 或 `mise bootstrap packages` 隐式应用。

## 整文件条目

整文件条目以目标路径为键——绝对路径或以
`~/` 开头——并且可以指向源文件或目录。如果省略 `source`，
mise 会在 `dotfiles.root` 下镜像相对于主目录的目标路径：`~/.zshrc`
使用 `~/.dotfiles/.zshrc`，而 `~/.config/foo.toml` 使用
`~/.dotfiles/.config/foo.toml`。`$HOME` 之外的目标必须指定
`source`。

字符串条目是显式源与 `dotfiles.default_mode` 的简写。写入 `[dotfiles]` 的命令始终会以带有 `mode` 的表格形式写入，即使它是默认值也是如此：

```toml
[dotfiles]
"~/.zshrc" = { mode = "symlink" }
"~/.ssh/config" = { source = "ssh/config", mode = "copy" }
```

相对的显式源会相对于声明该条目的配置文件所在目录进行解析，因此全局的 `~/.config/mise/config.toml` 可以管理放在其旁边的 dotfiles，而项目配置可以从仓库中提供机器设置。

源路径可以包含诸如 `*`、`**`、`?` 或 `[ab]` 之类的通配符。
当一个包含通配符的源匹配多个路径时，目标路径必须包含匹配的通配符，这样每个源才能展开为唯一的目标：

```toml
[dotfiles]
"~/.config/*.toml" = "dotfiles/config/*.toml"
"~/.local/share/app/**/*.json" = { source = "dotfiles/app/**/*.json", mode = "copy" }
"~/.config/app?.toml" = "dotfiles/config/app?.toml"
"~/.config/theme-[ab].toml" = "dotfiles/config/theme-[ab].toml"
```

## 模式

| 模式           | 行为                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `symlink`      | 将目标以符号链接的方式链接到源。适用于文件和目录——目录源只为整个目录创建一个链接。这是默认值。                                                                                                     |
| `symlink-each` | 源必须是目录：在目标下重建其目录结构，并逐个为每个文件创建符号链接，因此目标目录（例如 `~/.config`）也可以保留 mise 不管理的文件。                                                  |
| `copy`         | 复制源文件（或目录，递归复制）。当目标必须是真实文件时使用——例如会原地重写配置的工具。目录复制是追加式的：匹配的文件会被覆盖，mise 不管理的文件会保留在原处。 |
| `template`     | 通过 [mise 模板引擎](/templates.html) 渲染源文件并写入结果。权限会从源文件继承（如果发生偏移则会被修复）。                                                                                   |

模板与其他 mise 模板（`env`、`vars`、
`exec()` 等）使用相同的上下文，这也是使用它们的主要原因：一个源文件，
按机器生成输出。

检测模板输出是否发生偏移需要先渲染它，因此
`mise dotfiles status` 和真正的应用都会从你受信任的配置中计算模板——包括所有
`exec()` 调用——就像 `[env]` 模板一样。
`--dry-run` 是个例外：它承诺不会执行任何操作，所以会跳过
模板渲染，并将这些条目标记为 `(if changed)`。

## 编辑条目

编辑条目管理文件中的一部分：shell rc 中的 `mise activate` 块、`/etc/hosts` 中的一条记录，或配置文件中的一小段片段。它们通过目标路径加上用于命名文件中每个编辑项的 id 来进行键控：

```toml
[dotfiles]
"~/.zshrc/activate" = { block = 'eval "$(mise activate zsh)"' }
"~/.zshrc/aliases" = { block = '''
alias ll='ls -l'
alias la='ls -la'
''' }
"/etc/hosts/dev" = { line = "127.0.0.1 dev.local" }
"~/.gitconfig/identity" = { source = "snippets/git-identity.tmpl", template = "tera" }
```

对于编辑条目，`source` 会与 `template = "tera"` 配对，以使该条目无歧义地成为一个编辑项。只有 `source` 的表项则表示整文件条目，并使用 `dotfiles.default_mode`。

`block` 由目标文件中的标记注释所界定，标记名称由条目的 id 命名：

```sh
# >>> mise:activate >>> managed by mise - do not edit between markers
eval "$(mise activate zsh)"
# <<< mise:activate <<<
```

这些标记是所有权记录，存储在文件本身中，因此设计保持无状态：应用时只替换标记之间的内容，或者在缺失时追加该块，而文件中的其他所有内容都不会被触碰。

id 可以包含字母、数字、`_`、`-` 和 `.`。标记注释前缀会根据文件扩展名推断（shell/config 文件为 `#`，Lua 为 `--`，类 C 语言为 `//`，INI 为 `;`，vim 为 `"`），也可以通过 `comment = "..."` 覆盖。完全不能包含行注释的文件（严格 JSON、XML）不适合使用块——应改用整文件条目。

`line` 用于确保文件中的某处存在一整行精确内容，若不存在则将其追加到末尾。它不会修改或删除其他行，这正是它能够安全地保持幂等性的原因。该值必须是单行；多行内容请使用块。

## 语义

- **声明式且可叠加** — 条目会跨越
  [配置层级](/configuration.html)（全局 → 项目）进行合并。整文件
  条目按目标路径合并；编辑条目按 `(path, id)` 合并。
- **仅手动应用** — 不会隐式写入任何内容。只有
  `mise dotfiles apply` 或 [`mise bootstrap`](/cli/bootstrap.html) 会应用
  dotfiles。
- **幂等** — 已经处于目标状态的条目会被跳过；
  重复运行始终是安全的。
- **未知的模式和操作会被忽略并给出警告**，因此使用较新 mise 版本功能的配置仍然可以解析。

## 冲突

mise 不会 _替换_ 它不管理的现有文件：如果本应放置符号链接的位置已经存在一个真实文件或目录，或者如果本应放置文件的位置已经存在一个目录，这些都会被视为错误，并列出冲突路径。传入 `mise dotfiles apply --force` 可将其替换。

对于符号链接条目，如果现有的普通文件内容与源文件完全相同，则无需 `--force` 也会通过将其替换为所请求的符号链接来完成收敛。如果内容不同，mise 仍会将其视为冲突。

内容更新不属于冲突：`copy` 或 `template` 条目会在不使用 `--force` 的情况下覆盖目标文件内容——这正是这些模式所声明的意图。符号链接会被自由重新指向，因为符号链接本身不是数据。

`edit` 条目永远不需要 `--force`：一个 block 只拥有标记之间的内容，而一行内容只会追加。以下两种情况会直接报错而不是去猜测：损坏的标记，以及目标是符号链接。通过符号链接进行编辑会修改链接指向的内容，通常是一个 `[dotfiles]` 源文件，因此应将编辑指向真实文件。

从配置中移除某个条目，不会删除其文件、block 或行，因为 mise 不保存状态数据库。请手动删除未受管理的残留项。

## 命令

```sh
mise dotfiles status            # 显示已应用/缺失/有差异/源缺失
mise dotfiles status --missing  # 如果有任何不同步的内容则退出 1

mise dotfiles apply                     # 应用文件和编辑
mise dotfiles apply --dry-run           # 输出将要执行的内容
mise dotfiles apply --dry-run --verbose # 包括类似 diff 的详细信息
mise dotfiles apply --yes               # 跳过确认提示
mise dotfiles apply --force             # 同时替换冲突文件

mise dotfiles add ~/.zshrc       # 将一个实时文件捕获到 dotfiles.root 中
mise dotfiles edit ~/.zshrc      # 编辑受管理的源或所属配置
mise dotfiles edit --apply ~/.zshrc
```

`mise dotfiles status` 会将每个条目标记为 `applied`、`missing`、
带有原因的 `differs`，或 `source missing`。

## 捕获更改

如果你直接编辑了一个已复制的 dotfile，并想把这些更改重新保存回
你的 dotfiles 中，再次运行 `mise dotfiles add`：

```sh
$EDITOR ~/.config/starship.toml
mise dotfiles add ~/.config/starship.toml
```

对于未受管理的目标，`add` 会创建一个 `[dotfiles]` 条目，并将
源文件播种到 `dotfiles.root` 下。对于已经受管理的目标，它会从实时目标
更新现有源。

## 自管理 mise 配置

你可以把 mise 配置和 dotfiles 根目录也作为 dotfiles 来管理：

```toml
[settings]
dotfiles.root = "~/.dotfiles"

[dotfiles]
"~/.dotfiles" = "~/src/dotfiles"
"~/.config/mise/config.toml" = "~/src/dotfiles/mise/config.toml"
```

这是一种引导启动模式：在第一次执行 `mise dotfiles apply` 或 `mise bootstrap` 之前，先克隆真实仓库（例如
`~/src/dotfiles`）。
第一次运行时所需的源文件请使用真实仓库路径；`~/.dotfiles`
在 mise 创建该符号链接之前并不存在。
替换 `~/.config/mise/config.toml` 会影响未来的 mise 调用，因此
在应用之前，请确保源文件包含有效的配置。

## 由 root 拥有的文件

点文件会以当前用户身份写入——这里没有 sudo。以 root 身份运行时（容器、CI）可以管理
`/etc/hosts`；否则 mise 会因为普通的权限错误而失败。

## Windows

文件符号链接在 Windows 上需要提升权限，因此 `symlink` 和 `symlink-each`
在文件上会回退为复制；目录符号链接则使用 junctions。
