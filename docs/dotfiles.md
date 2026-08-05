# 点文件

> [!WARNING]
> 顶层的 `mise dotfiles` 命令已弃用，并且不会在帮助信息中显示。它将在 mise 2027.2.0 中开始发出警告，并在 mise 2028.2.0 中移除。请改用
> `mise bootstrap dotfiles`。

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

新条目通过 `mise bootstrap dotfiles add` 捕获并应用；传入
`--no-apply` 可仅捕获它们。现有条目可以通过 `mise bootstrap dotfiles apply` 显式应用，也可以作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用。它们不会由 `mise install` 或 `mise bootstrap packages` 隐式应用。
嵌套的 apply 命令会运行已配置的
`pre-dotfiles` 和 `post-dotfiles` bootstrap 钩子。

## 整文件条目

整文件条目以目标路径为键——绝对路径或以
`~/` 开头——并且可以指向源文件或目录。如果省略 `source`，
mise 会在 `dotfiles.root` 下镜像相对于主目录的目标路径：`~/.zshrc`
使用 `~/.dotfiles/.zshrc`，而 `~/.config/foo.toml` 使用
`~/.dotfiles/.config/foo.toml`。`$HOME` 之外的目标必须指定
`source`。

字符串条目是使用 `dotfiles.default_mode` 的显式源的简写形式。
`mise bootstrap dotfiles add` 会省略隐含的源和内置的 `symlink` 模式，
但会保留通过 `--mode` 显式选择的模式：

```toml
[dotfiles]
"~/.zshrc" = {}
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

## 排除文件

遍历源目录的模式——`symlink-each`，以及源为目录的
`copy`——接受一个 glob 模式列表 `exclude`。当你要将一个并不完全由你管理的目录作为条目指向目标时，可以使用此方式，例如该目录中包含
`mise.toml` 文件：

```toml
[dotfiles]
"~" = { source = ".", mode = "symlink-each", exclude = ["mise.toml", "*.md", ".git"] }
```

不包含 `/` 的模式会匹配任意单个路径组件，因此 `"mise.toml"`
会跳过目录树中出现的该文件，而 `"*.md"` 会跳过所有
Markdown 文件。包含 `/` 的模式会锚定到源目录根路径：
`"nvim/spell"` 只会跳过该路径。匹配目录的任一类型模式都会跳过该目录下的所有内容。

排除一个 mise 已经应用的文件，会在下一次应用时移除它留下的内容，效果与删除源文件相同。

## 模式

| 模式           | 行为                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `symlink`      | 将目标链接到源。适用于文件和目录——目录源会为整个目录创建一个链接。这是默认模式。                                                                                                                                                                                                                                                                                                                      |
| `symlink-each` | 源必须是目录：在目标下重新创建其目录结构，并分别为每个文件创建符号链接，因此目标目录（例如 `~/.config`）也可以存放 mise 不管理的文件。在下一次应用时，删除源文件会移除其留下的链接；mise 未创建的文件和链接永远不会被触碰。受管理的链接会记录在 `$MISE_STATE_DIR/dotfiles` 下，因此共享目标在首次应用后不会被递归扫描。 |
| `copy`         | 复制源文件（或递归复制目录）。当目标必须是真实文件时使用此模式——例如某些会就地重写其配置的工具。目录复制是累加式的：匹配的文件会被覆盖，mise 不管理的文件会保留。复制内容永远不会被清理，因此删除源文件后，副本仍会保留。                                                                                                                                       |
| `template`     | 通过 [mise 模板引擎](/templates.html) 渲染源文件并写入结果。权限取自源文件（如果权限发生偏移，也会进行修复）。                                                                                                                                                                                                                                                                                                    |

模板与其他 mise 模板（`env`、`vars`、
`exec()` 等）使用相同的上下文，这也是使用模板的主要原因：根据机器为一个源文件
生成输出。

要检测模板的输出是否发生偏移，必须对其进行渲染，因此
`mise bootstrap dotfiles status` 和实际应用都会从你信任的配置中评估模板——包括任何
`exec()` 调用——就像 `[env]` 模板一样。
`--dry-run` 是例外：它承诺不执行任何操作，因此会跳过模板渲染，并将这些条目列为 `(if changed)`。

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

- **声明式且可叠加** — 条目会跨
  [配置层级](/configuration.html)（全局 → 项目）合并。整文件条目按目标路径合并；编辑条目按
  `(path, id)` 合并。
- **显式应用** — `mise bootstrap dotfiles add` 会应用其捕获的条目，除非设置了
  `--no-apply`。未被 `add` 捕获的条目将由 `mise bootstrap dotfiles apply` 或 [`mise bootstrap`](/bootstrap.html) 应用。
- **幂等** — 已处于目标状态的条目会被跳过；重复运行始终是安全的。
- **未知模式和操作会被忽略并发出警告**，因此使用较新 mise 版本功能的配置仍可解析。

## 冲突

mise 拒绝_替换_它不管理的现有文件：符号链接应指向的位置存在真实文件或目录，或文件应位于的位置存在目录，都会被视为错误，并列出冲突路径。传入
`mise bootstrap dotfiles apply --force` 可替换它们。

在独立的符号链接应用过程中，真实文件和目录始终需要使用 `--force`，即使它们的可见内容和权限完全匹配。可移植的文件系统 API 无法比较所有权、ACL、扩展属性、标志和安全标签。`mise bootstrap dotfiles add` 会在创建符号链接之前，将每个捕获的真实路径移动到其源路径，从而避免这种破坏性比较；跨文件系统移动则会回退为保留符号链接和权限的复制操作。

内容更新不属于冲突：`copy` 或 `template` 条目会在不使用 `--force` 的情况下覆盖目标文件内容——这正是这些模式所声明的意图。符号链接会被自由重新指向，因为符号链接本身不是数据。

`edit` 条目永远不需要 `--force`：一个 block 只拥有标记之间的内容，而一行内容只会追加。以下两种情况会直接报错而不是去猜测：损坏的标记，以及目标是符号链接。通过符号链接进行编辑会修改链接指向的内容，通常是一个 `[dotfiles]` 源文件，因此应将编辑指向真实文件。

从配置中移除条目会保留其文件、区块或行，因为活动配置仍定义着哪些状态属于某个条目。当你希望 mise 清理其可观察到的痕迹时，请在移除条目之前运行
`mise bootstrap dotfiles unapply`。

## 取消应用

`mise bootstrap dotfiles unapply` 会移除已配置的目标，但不会删除其 `[dotfiles]` 条目或源文件。它会使用当前配置、文件系统以及记录的 `symlink-each` 状态来确定该条目所拥有的内容：

- 只有在 `symlink` 目标仍然指向已配置的源时，才会将其移除。
- `symlink-each` 会移除从源到目标的精确链接，包括已删除源文件对应的悬空链接。目标下的其他链接和文件会保留。
- 只有在文件副本和渲染后的模板内容仍然匹配时，才会将其移除。已修改的目标需要使用 `--force`。
- 目录副本会逐个文件移除。未受管理的相邻文件始终会保留，并且只有在目录为空时才会移除目录。
- 由标记分隔的代码块会连同其标记一起移除。普通的行编辑没有所有权标记，需要使用 `--force`。

取消应用采取审慎策略，因为 `copy` 和 `template` 条目没有应用清单。尤其是，在追加式目录复制中，如果源文件已被删除，就无法再识别出某个复制的文件。请手动移除这些残留文件。先使用 `--dry-run` 检查可识别的移除项；模板的试运行不会渲染模板或执行模板函数。

## 命令

```sh
mise bootstrap dotfiles status            # 显示已应用/缺失/不一致/源文件缺失
mise bootstrap dotfiles status --missing  # 如果存在任何不同步内容则退出并返回 1

mise bootstrap dotfiles apply                     # 应用文件和编辑
mise bootstrap dotfiles apply --dry-run           # 显示将要执行的操作
mise bootstrap dotfiles apply --dry-run --verbose # 包含类似 diff 的详细信息
mise bootstrap dotfiles apply --yes               # 跳过确认提示
mise bootstrap dotfiles apply --force             # 同时替换冲突文件

mise bootstrap dotfiles unapply             # 移除可识别的受管理目标
mise bootstrap dotfiles unapply --dry-run   # 预览移除操作
mise bootstrap dotfiles unapply --force     # 同时移除已修改/有歧义的目标

mise bootstrap dotfiles add ~/.zshrc       # 将实时文件捕获到 dotfiles.root
mise bootstrap dotfiles edit ~/.zshrc      # 编辑受管理的源文件或所属配置
mise bootstrap dotfiles edit --apply ~/.zshrc
```

`mise bootstrap dotfiles status` 会将每个条目标记为 `applied`、`missing`、
带有原因的 `differs`，或 `source missing`。

## 捕获更改

如果你就地编辑了复制的点文件，并希望将这些更改保存回
你的点文件中，请再次运行 `mise bootstrap dotfiles add`：

```sh
$EDITOR ~/.config/starship.toml
mise bootstrap dotfiles add ~/.config/starship.toml
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

这是一种引导模式：在首次运行 `mise bootstrap dotfiles apply` 或
`mise bootstrap` 之前，先克隆实际仓库（例如
`~/src/dotfiles`）。
首次运行所需的源文件应使用实际仓库路径；在 mise 创建该符号链接之前，
`~/.dotfiles` 并不存在。
替换 `~/.config/mise/config.toml` 会影响后续的 mise 调用，因此请确保在应用配置之前，
源文件中包含有效的配置。

## 由 root 拥有的文件

点文件会以当前用户身份写入——这里没有 sudo。以 root 身份运行时（容器、CI）可以管理
`/etc/hosts`；否则 mise 会因为普通的权限错误而失败。

## Windows

文件符号链接在 Windows 上需要提升权限，因此 `symlink` 和 `symlink-each`
在文件上会回退为复制；目录符号链接则使用 junctions。
