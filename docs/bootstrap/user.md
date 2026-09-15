---
description: "声明并应用用户的登录 Shell"
socialDescription: "声明并应用用户的登录 Shell"
---

# 用户登录 Shell

mise 可以在 `[bootstrap.user]` 中声明当前用户的登录 Shell，并通过 `mise bootstrap user apply` 应用该配置，或将其作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用：

```toml
[bootstrap.user]
login_shell = "/bin/zsh"
```

在应用此声明之前安装该 Shell，并确认路径存在。此设置会更改账户的登录 Shell；它不会安装 Shell、配置 [mise activation](/bootstrap/shell.html)，也不会替换当前的 Shell 进程。

当配置的 Shell 未列在 `/etc/shells` 中时，mise 会先将其追加进去。当配置的 Shell 与用户账户条目不同时，mise 会运行：

```sh
chsh -s /bin/zsh
```

顶层的 `mise bootstrap` 在更改或将要更改登录 Shell 时，也会在最后提醒你启动新的登录会话。

## 语义

`[bootstrap.user].login_shell` 遵循与 [bootstrap packages](/bootstrap/packages/) 相同的手动、幂等模型：

- **本地配置优先** — 项目配置可以覆盖全局的
  `login_shell`；与软件包／文件列表不同，这里只有一个期望值
- **仅手动应用** — mise 绝不会隐式更改你的登录 Shell。只有 `mise bootstrap user apply` 和
  [`mise bootstrap`](/bootstrap.html) 会应用该配置
- **已列出的 Shell** — 在许多平台上，Shell 必须出现在 `/etc/shells`
  中，`chsh` 才会接受它。当配置的路径缺失时，mise 会将其添加到该文件中
- **仅限 Unix** — 在非 Unix 平台上，或当 `chsh` 不可用时，
  `mise bootstrap user status` 会将该条目报告为已跳过，bootstrap 也会忽略它
- **必须使用绝对路径** — 相对 Shell 名称会在发出警告后跳过。请使用完整路径，例如 `/bin/zsh` 或 `/opt/homebrew/bin/fish`

`/etc/shells` 通常由 root 所有。如果该文件不可写，mise 会使用与系统软件包相同的 sudo 行为：在交互式终端中可以提示输入密码，在非交互式上下文中使用免密码 sudo，并遵循 `system_packages.sudo = false`。

当 `mise` 本身在 `sudo` 下启动时，登录 Shell 状态和 `chsh` 的目标是 `SUDO_USER`，而不是 root。普通的 root 会话，例如容器，仍然以 root 为目标。

## 命令

```sh
mise bootstrap user status            # 显示登录 shell 状态
mise bootstrap user status --missing  # 如果 shell 不同或未列出，则退出 1

mise bootstrap user apply           # 更新 /etc/shells 并运行 chsh -s
mise bootstrap user apply --dry-run # 改为打印命令
mise bootstrap user apply --yes     # 跳过确认提示
```
