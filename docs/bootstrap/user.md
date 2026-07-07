# 用户登录 Shell <Badge type="warning" text="experimental" />

mise 可以在 `[bootstrap.user]` 中声明当前用户的登录 shell，并通过 `mise bootstrap user apply` 或
[`mise bootstrap`](/cli/bootstrap.html) 应用它：

```toml
[bootstrap.user]
login_shell = "/bin/zsh"
```

当配置的 shell 不在 `/etc/shells` 中列出时，mise 会先将其追加进去。当配置的 shell 与用户账户条目中的 shell 不同时时，mise
会运行：

```sh
chsh -s /bin/zsh
```

顶层的 `mise bootstrap` 还会在它更改或将要更改登录 shell 时，附带一个最终的提醒，提示启动一个新的登录会话。

## 语义

`[bootstrap.user].login_shell` 遵循与 [bootstrap packages](/bootstrap/packages/) 相同的手动、幂等模型：

- **本地优先** - 项目配置可以覆盖全局的 `login_shell`；与包/文件列表不同，这里只有一个期望值。
- **仅手动应用** - mise 不会隐式更改你的登录 shell。只有 [`mise bootstrap`](/cli/bootstrap.html) 会应用它。
- **shell 需已列出** - 在许多平台上，shell 必须先出现在 `/etc/shells` 中，`chsh` 才会接受它。若配置的路径缺失，mise 会将其添加到该文件中。
- **仅限 Unix** - 在非 Unix 平台上，或者当 `chsh` 不可用时，`mise bootstrap user status` 会将该项报告为已跳过，而 bootstrap 会忽略它。
- **需要绝对路径** - 相对的 shell 名称会被跳过并给出警告。请使用完整路径，例如 `/bin/zsh` 或 `/opt/homebrew/bin/fish`。

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
