---
description: "在后台运行自定义程序和 mise 内置服务，或启动并启用现有的 Linux 系统服务。"
socialDescription: "为当前用户运行后台服务，或管理 Linux 系统服务。"
---

# 服务

使用 `[bootstrap.services]` 可在 Linux、macOS 和 Windows 上以当前用户身份在后台运行程序，
也可启动、停止或启用软件包安装的 Linux systemd 单元。多个 bootstrap 配置段都能在后台运行
程序，请根据用途选择：

| 需求                                                                  | 使用                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| 在 Linux、macOS 和 Windows 上于后台运行程序                           | [用户服务](#user-services)（`scope = "user"`）                |
| 在后台保存 dotfiles 编辑，或更新工具                                   | [内置服务](#built-in-services)                                |
| 启动、停止或启用软件包或托管文件提供的单元                             | [系统服务](#system-services)                                  |
| 使用 systemd 定时器、依赖关系或安全加固等功能                         | [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)  |
| 使用 launchd 日历计划或队列目录等功能                                 | [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html) |
| 运行容器                                                              | [`[bootstrap.compose]`](/bootstrap/compose.html)              |

<a id="user-services"></a>

## 用户服务

用户服务以当前用户身份运行程序，在登录时启动，并在程序失败后重新启动。mise 会写入平台服务管理器
所需的服务定义，不需要 root 权限。

### 运行自己的程序 {#run-your-own-program}

设置 `scope = "user"` 及要运行的命令，然后使用
[`mise bootstrap services apply`](/cli/bootstrap/services/apply.html) 应用配置，再使用
[`mise bootstrap services status`](/cli/bootstrap/services/status.html) 检查状态。
此例假设 `my-agent` 已安装在该路径：

```toml
[bootstrap.services.my-agent]
scope = "user"
command = "~/.local/bin/my-agent --serve"
```

```sh
mise bootstrap services apply
mise bootstrap services status
```

mise 会为当前平台创建服务定义并启动服务：

| 平台     | 服务定义                                                                                 | 管理工具           |
| -------- | ---------------------------------------------------------------------------------------- | ------------------ |
| Linux    | `~/.config/systemd/user/dev.mise.<name>.service`                                         | `systemctl --user` |
| macOS    | `~/Library/LaunchAgents/dev.mise.<name>.plist`                                           | `launchctl`        |
| Windows  | 计划任务 `mise\<name>`，定义文件位于 `$MISE_STATE_DIR/user-services/`                    | `schtasks`         |

mise 会直接运行 `command`，不会通过 Shell 执行，因此管道、重定向和 glob 模式都不起作用；请将此类
命令放进脚本，或使用 `sh -c '...'` 执行。程序路径开头的 `~/` 会展开为主目录。

在 Linux 上，命令会成为单元的 `ExecStart=` 行，因此 systemd 会展开 `$VAR`、`${VAR}` 和
`%h` 等说明符；要表示字面值 `$` 或 `%`，请写成 `$$` 或 `%%`。macOS 上的 launchd 会原样
接收命令各部分，因此要同时兼容两个平台的命令，不应依赖 `$VAR` 或 `%` 说明符；请直接填写
具体值，或通过 `environment` 设置程序读取的变量。

服务不会继承 Shell 中 mise 的激活状态，因此 `[tools]` 中的工具不会出现在服务的 `PATH` 中。
请使用绝对路径，或通过
[`mise exec`](/cli/exec.html) 运行工具，并添加 `requires_tools = true`，使完整的
`mise bootstrap` 流程先安装工具，再启动服务。

[搭建开发环境](/daemons/development-stack.html#keep-the-supervisor-available-at-login)提供了
完整示例：使用用户服务在登录时启动并持续运行 Pitchfork 管理进程。

### 内置服务 {#built-in-services}

内置服务会运行 mise 本身。通过 `builtin` 指定服务类型，此设置也隐含
`scope = "user"`：

```toml
[bootstrap.services.mise-history]
builtin = "history-watch"
```

| `builtin`         | 功能                                                                               | 指南                                                         |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `"history-watch"` | 运行 `mise dot watch`，在跟踪的文件发生编辑时自动保存                              | [自动保存](/dotfiles/history.html#automatic-saves)            |
| `"tool-update"`   | 每小时检查启用 `auto_update` 的工具，并更新符合条件的工具                          | [自动更新工具](/dev-tools/#automatic-tool-updates)            |

这两种服务都以较低优先级运行，在失败后会重新启动，且不需要 `command`。由于它们作用于整个用户
账户而非单个项目，请在全局配置 `~/.config/mise/config.toml` 中声明。内置服务会在
`mise bootstrap` 的服务步骤中启动，早于工具安装，因为它只依赖 mise。

### 将 mise 安装到固定路径 {#durable-executable}

内置服务会运行 mise，因此服务定义会记录一个设置完成后仍须保留在原位置的 mise 二进制绝对路径。
除非当前运行的二进制位于临时目录或远程暂存目录中，否则 mise 会使用当前二进制；若它位于这类
目录中，则会改用 `PATH` 中固定位置的 `mise`。如果找不到固定位置的二进制，状态会显示
`unknown: no durable mise executable; install mise on this host first`，且 mise 不会写入服务
定义。请先在主机上安装 mise，再重新应用配置；执行[远程 bootstrap](/bootstrap/remote.html)时，
请传入 `--install-mise`。

### 用户服务选项 {#user-service-options}

| 键                   | 取值                                                                                     | 默认值                                        |
| ------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| `scope`             | `"user"` 或 `"system"`                                                                  | 使用 `builtin` 时为 `"user"`，否则为 `"system"` |
| `command`           | 要运行的命令行                                                                          | 未设置 `builtin` 时必需                       |
| `builtin`           | `"history-watch"` 或 `"tool-update"`                                                    |                                               |
| `description`       | 服务管理器显示的文本                                                                    |                                               |
| `restart`           | `"on-failure"`、`"always"` 或 `"never"`                                                | `"on-failure"`                                |
| `environment`       | 环境变量表，例如 `{ LOG_LEVEL = "info" }`                                               |                                               |
| `working_directory` | 运行服务的目录；`~` 会展开                                                              |                                               |
| `state`             | `"running"`、`"stopped"`（已安装但未运行）或 `"absent"`                              | `"running"`                                   |
| `enabled`           | 设为 `true` 后，服务会在登录时启动                                                       | `true`                                        |
| `requires_tools`    | 设为 `true` 后，服务会在 `mise bootstrap` 安装 `[tools]` 和插件包之后启动                | `false`                                       |

`command`、`builtin`、`description`、`restart`、`environment`、
`working_directory`、`requires_tools` 和 `state = "absent"` 只适用于用户服务。错误信息提到
这些选项之一时，通常表示该条目缺少 `scope = "user"`。用户服务不能设置 `masked` 或
`on_change`；托管文件中的
[`notify`](/bootstrap/files.html#restart-a-service-after-a-change) 只对系统服务生效。

名称只能包含字母、数字、`.`、`_` 和 `-`。同一个名称不能同时出现在
`[bootstrap.linux.systemd.units]` 或 `[bootstrap.macos.launchd.agents]` 中，否则两处配置会
写入同一个服务定义。

### 平台差异 {#platform-differences}

在 Linux 上，用户服务由 systemd 用户管理器运行；该管理器会在你登录时启动，并在最后一个会话
结束时停止。若要在没有登录会话的服务器上持续运行服务，请执行一次
`sudo loginctl enable-linger $USER` 启用 lingering；mise 不会替你执行此操作。`restart` 会
映射到 systemd 的 `Restart=`，每次重试间隔五秒。

在 macOS 上，`restart` 会映射到 launchd 的 `KeepAlive`；`"on-failure"` 对应
`{ SuccessfulExit = false }`。`enabled` 控制 `RunAtLoad`。launchd 也会将 `KeepAlive` 视为
加载时启动服务的请求，因此对于已停止的服务，mise 会省略 `RunAtLoad`；当 `enabled = false`
时则会省略 `KeepAlive`。`enabled = false` 的运行中服务在应用配置时会启动一次，退出后会保持
停止，直到你再次启动或启用它。

在 Windows 上，`"always"` 和 `"on-failure"` 都会在运行失败时每隔一分钟重试一次，最多三次。
设置 `enabled = true` 后，任务也会在登录时启动。程序成功退出后，任务会保持停止状态，因此
需要持续运行的程序必须自行循环。任务计划程序无法设置环境变量，所以配置了 `environment` 的
服务会通过 mise 运行：mise 先应用变量，再直接启动 `command`，不经过 `cmd.exe`。变量值和命令
会按原样传递，包括 `%`、`&` 和 `|` 等字符。变量名不能为空或包含 `=`，名称和值都不能包含
NUL 字符。此功能要求 mise 安装在[固定路径](#durable-executable)；否则服务状态会显示为
`unknown`。未设置 `environment` 时，命令会直接运行。

### 移除用户服务 {#remove-and-disable}

`state = "absent"` 会移除已安装的单元、agent 或任务，并在该条目保持此状态期间持续移除。
删除配置声明则会让服务继续保留；要移除一次，请运行
[`mise bootstrap services remove`](/cli/bootstrap/services/remove.html):

```sh
mise bootstrap services remove my-agent
```

无论服务是否仍有声明，此命令都可运行。如果声明仍然存在，下次运行 `mise bootstrap` 时会重新安装服务。
[`mise bootstrap unapply`](/bootstrap/modules.html#remove-a-module-s-resources) 也会移除机器模块声明的用户服务。

### 用户服务故障排除

如果平台服务管理器不可用，例如容器中没有 systemd 用户管理器，mise 会将用户服务状态报告为
`unknown`，并发出警告后跳过；`mise bootstrap` 会在后续摘要中再次列出此警告。mise 不会写入任何内容。

内置服务设有启动次数限制，以便在发生崩溃循环时停止重试：Linux 上的 systemd 在五分钟内允许
启动三次，之后不再重试；macOS 上的 launchd 至少等待五分钟才会再次启动。这些限制适用于两种
内置服务，不适用于通过 `command` 自定义的服务。请运行 `mise doctor` 并查看服务日志，修复原因后
重新运行 `mise bootstrap services apply` 或 `mise bootstrap`；这会重置限制并启动服务。在 Linux 上，
也可以直接重启服务：

```sh
systemctl --user reset-failed dev.mise.mise-history.service
systemctl --user start dev.mise.mise-history.service
```

请将 `mise-history` 替换为你的服务名称。如果历史记录监视器正在运行但没有保存文件，请参阅
[检查监视器状态](/dotfiles/history.html#health)。

<a id="system-services"></a>

## 系统服务

系统服务可以启动、停止、启用或屏蔽软件包或[托管文件](/bootstrap/files.html)提供的 systemd
单元。系统服务仅适用于 Linux，且需要 root 权限：只有确实需要更改时，mise 才会使用 `sudo`；若
[`system_packages.sudo`](/configuration/settings.html#system_packages.sudo) 设为 `false`，则会禁止使用 sudo。
`mise bootstrap` 会先应用软件包和文件，并在文件发生更改后重新加载 systemd，
因此可以通过同一份配置安装并启动单元：

```toml
[bootstrap.packages]
"apt:docker.io" = "latest"

[bootstrap.services.docker]
state = "running"
enabled = true
```

未带单元后缀的名称会自动添加 `.service`。也支持
`postgresql@16-main.service` 这类完整单元名、socket 和 timer。如果单元由同一份配置中的软件包
或文件提供，请使用完整的 `mise bootstrap --dry-run` 预览；单独运行
`mise bootstrap services apply` 不会先安装软件包或写入文件。

### 系统服务选项 {#system-service-options}

| 键           | 取值                                                         | 默认值                |
| ----------- | ----------------------------------------------------------- | --------------------- |
| `state`     | `"running"` 或 `"stopped"`                                  | `"running"`           |
| `enabled`   | 设为 `true` 后，单元会在系统启动时运行                       | `true`                |
| `masked`    | 设为 `true` 后，完全禁止启动该单元                           | `false`               |
| `on_change` | `"reload_or_restart"`、`"reload"`、`"restart"` 或 `"none"` | `"reload_or_restart"` |

### 文件更改时重新加载服务 {#reload-a-service-when-its-files-change}

托管文件或目录可以在 mise 更改内容时通过 `notify` 通知系统服务；[更改后重启服务](/bootstrap/files.html#restart-a-service-after-a-change)
介绍了文件侧的配置方式以及通知时会运行的命令。服务的 `on_change` 值决定运行中的单元如何处理：

| `on_change`           | 命令                          |
| --------------------- | ----------------------------- |
| `"reload_or_restart"` | `systemctl reload-or-restart` |
| `"reload"`            | `systemctl reload`            |
| `"restart"`           | `systemctl restart`           |
| `"none"`              | 无                            |

```toml
[bootstrap.services.docker]
on_change = "restart"
```

在更改任何系统服务之前，mise 会运行一次 `systemctl daemon-reload`。只有当同一次运行通过
`[bootstrap.files]` 将单元文件（或其 `name@.service` 模板）写入 `/etc/systemd/system` 等
systemd 单元目录，并且该文件条目的 `notify` 列出了此服务，mise 才会接受尚不存在的单元。

### 停止并禁用服务 {#stop-and-disable-a-service}

删除声明不会改变单元当前状态。若要停止单元并防止它再次启动，请保留一条声明。已屏蔽的单元
还必须停止并禁用：

```toml
[bootstrap.services.old-worker]
state = "stopped"
enabled = false
masked = true
```

如果单元缺失、systemd 不可用，或单元无法启用（例如 static 单元），mise 不会猜测该如何处理。
状态和计划会将服务报告为 `unknown`；应用操作也会失败，而不会运行可能不安全的命令。

## 配置如何合并 {#how-configs-combine}

服务会按照名称在[配置层级](/configuration.html#configuration-hierarchy)中合并。更接近项目的
配置会完整替换同名服务的声明；mise 不会合并不同文件中的键。

## 预览并应用 {#preview-and-apply}

`mise bootstrap services` 同时涵盖这两种作用范围：

```sh
mise bootstrap services status            # 查看每项服务的状态
mise bootstrap services status --json     # 以 JSON 格式输出相同信息
mise bootstrap services status --missing  # 任何服务需要更改时以状态码 1 退出
mise bootstrap services apply --dry-run   # 打印将要运行的命令
mise bootstrap services apply             # 确认后应用
mise bootstrap services apply --yes       # 不经确认直接应用
mise bootstrap services remove <name>     # 移除已安装的用户服务
```

`mise bootstrap status` 和 `mise bootstrap plan` 会以 `user-service:<name>` 的格式列出用户服务。
`mise bootstrap status --json` 会在 `user_services` 下包含每项用户服务生成的定义，供你在应用前检查。

## macOS 和 Windows 上的行为 {#on-macos-and-windows}

用户服务支持三个平台。系统服务仅适用于 Linux：在 macOS 和 Windows 上，`mise bootstrap`、
`mise bootstrap status` 和 `mise bootstrap plan` 会忽略系统服务；如果配置中声明了系统服务，
`mise bootstrap services status` 和 `apply` 则会失败。请将系统服务放在只有 Linux 机器会加载的
配置中，例如[机器模块](/bootstrap/modules.html)。

## 另请参阅

- [Bootstrap](/bootstrap.html#how-it-runs)：了解服务在运行顺序中的位置。
- [系统文件和目录](/bootstrap/files.html)：了解单元文件及 `notify` 监视的配置。
- [systemd 用户单元](/bootstrap/systemd.html)和 [macOS LaunchAgent](/bootstrap/launchd.html)：
  了解平台专属功能。
