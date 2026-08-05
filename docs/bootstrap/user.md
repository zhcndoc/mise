# 用户登录 Shell

mise 可以在 `[bootstrap.user]` 中声明当前用户的登录 Shell，并通过 `mise bootstrap user apply` 应用该配置，或将其作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用：

```toml
[bootstrap.user]
login_shell = "/bin/zsh"
```

当配置的 Shell 未列在 `/etc/shells` 中时，mise 会先将其追加进去。当配置的 Shell 与用户账户条目中的 Shell 不同时，mise
会运行：

```sh
chsh -s /bin/zsh
```

顶层的 `mise bootstrap` 还会在更改或即将更改登录 Shell 时，附带一条最终提醒，提示启动新的登录会话。

## 语义

`[bootstrap.user].login_shell` 遵循与 [bootstrap packages](/bootstrap/packages/) 相同的手动、幂等模型：

- **越本地优先级越高** — 项目配置可以覆盖全局
  `login_shell`；不同于软件包/文件列表，这里只有一个期望值。
- **仅手动应用** — mise 不会隐式更改你的登录 shell。只有 `mise bootstrap user apply` 和
  [`mise bootstrap`](/bootstrap.html) 会应用它。
- **已列出的 shell** — 在许多平台上，shell 必须先出现在 `/etc/shells` 中，`chsh`
  才会接受它。如果配置的路径不在其中，mise 会将其添加到该文件。
- **仅支持 Unix** — 在非 Unix 平台上，或 `chsh` 不可用时，
  `mise bootstrap user status` 会将该条目标记为已跳过，bootstrap 也会忽略它。
- **必须使用绝对路径** — 相对 shell 名称会在发出警告后跳过。请使用完整路径，例如 `/bin/zsh` 或 `/opt/homebrew/bin/fish`。

`/etc/shells` 通常由 root 拥有。如果该文件不可写，mise 会使用与系统包相同的非交互式 sudo 行为：在交互式终端中可提示输入，在非交互式上下文中使用免密码 sudo，并遵守 `system_packages.sudo = false`。

当 `mise` 本身在 `sudo` 下启动时，登录 shell 状态和 `chsh` 的目标是 `SUDO_USER`，而不是 root。普通的 root 会话，例如容器，仍然以 root 为目标。

## 命令

```sh
mise bootstrap user status            # 显示登录 shell 状态
mise bootstrap user status --missing  # 如果 shell 不同或未列出，则退出 1

mise bootstrap user apply           # 更新 /etc/shells 并运行 chsh -s
mise bootstrap user apply --dry-run # 改为打印命令
mise bootstrap user apply --yes     # 跳过确认提示
```
