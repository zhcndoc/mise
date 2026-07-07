# Shell 激活 <Badge type="warning" text="experimental" />

mise 可以通过 `[bootstrap.mise_shell_activate]` 声明式地为 bash、zsh 和 fish 添加 shell 激活片段。当你希望将 shims 和普通激活设置分开时，可以直接配置启动文件目标：

```toml
[bootstrap.mise_shell_activate]
zprofile = "shims"
zshrc = "activate"
bash_profile = "shims"
bashrc = "activate"
fish = "activate"
```

当你想要一种能够接受未来选项的紧凑表形式时，请使用：

```toml
[bootstrap.mise_shell_activate]
zprofile = {enabled = true, mode = "shims"}
zshrc = {enabled = true, mode = "activate"}
```

Shell 键是快捷方式。例如，`zsh = true` 会展开为
`zprofile = "shims"` 和 `zshrc = "activate"`。

任何目标都可以使用 `"activate"` 或 `"shims"`。布尔值 `true` 会以默认模式启用该
目标，而 `false` 则会禁用它。

`mise bootstrap mise-shell-activate apply` 会向 shell rc
文件写入由标记分隔的代码块：

| 目标           | Shell | 默认模式     | 目标文件                     | 代码块                                 |
| -------------- | ----- | ------------ | ---------------------------- | -------------------------------------- |
| `bash_profile` | bash  | `shims`      | `~/.bash_profile`            | `eval "$(mise activate bash --shims)"` |
| `bashrc`       | bash  | `activate`   | `~/.bashrc`                  | `eval "$(mise activate bash)"`         |
| `zprofile`     | zsh   | `shims`      | `~/.zprofile`                | `eval "$(mise activate zsh --shims)"`  |
| `zshrc`        | zsh   | `activate`   | `~/.zshrc`                   | `eval "$(mise activate zsh)"`          |
| `zshenv`       | zsh   | `shims`      | `~/.zshenv`                  | `eval "$(mise activate zsh --shims)"`  |
| `fish`         | fish  | `activate`   | `~/.config/fish/config.fish` | `mise activate fish \| source`         |

这些标记与 [Dotfiles](/dotfiles.html) 使用的编辑标记相同：

```sh
# >>> mise:activate >>> managed by mise - do not edit between markers
eval "$(mise activate zsh)"
# <<< mise:activate <<<
```

## 语义

`[bootstrap.mise_shell_activate]` 遵循与其他 bootstrap 部分相同的手动、幂等模型：

- **按目标覆盖** - 项目配置可以通过 `zshrc = false` 覆盖某个启动文件的全局设置，而不会更改 `zprofile`。
- **仅手动应用** - mise 从不隐式编辑 shell 的 rc 文件。只有 `mise bootstrap mise-shell-activate apply` 和 `mise bootstrap` 会应用此部分。
- **基于标记的编辑归属** - mise 只拥有其标记之间的块。rc 文件中的其他内容保持不变。
- **默认情况下，shims 不会进入 `zshenv`** - 当显式配置时支持 `zshenv`，但 shell shortcuts 不会写入它，因为 zsh 会在每次调用时读取它，包括脚本。
- **显式 dotfiles 优先** - 如果 `[dotfiles]` 已经将同一个 rc 文件作为整体文件管理，或者为同一目标/id 定义了编辑，例如 `"~/.zshrc/activate"`，mise 会跳过该 shell 的生成式 shell activation 条目。

对于完全由其管理的 rc 文件或自定义激活块，请直接改用 `[dotfiles]`。

## 命令

```sh
mise bootstrap mise-shell-activate status            # 显示激活块状态
mise bootstrap mise-shell-activate status --json     # 机器可读
mise bootstrap mise-shell-activate status --missing  # 如果有任何内容不同步则退出 1

mise bootstrap mise-shell-activate apply           # 写入缺失/不同的块
mise bootstrap mise-shell-activate apply --dry-run # 直接打印编辑内容
mise bootstrap mise-shell-activate apply --yes     # 跳过确认提示
```

JSON 状态条目包括 `target`、`shell`、`path`、`mode` 和 `state`。
`state` 的值为 `"missing" | "applied" | "differs" | "source_missing"`。`state = "differs"` 的条目还包括一个 `reason` 字段。
