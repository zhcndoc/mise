---
description: "为你的用户运行后台服务，或管理现有的 Linux 系统服务。"
---

# 服务

使用 `[bootstrap.services]` 在后台运行程序，并在你登录或重启时再次启动程序。选择所需的服务类型：

- [用户服务](#user-services)以当前用户身份在 Linux、macOS 和 Windows 上运行程序。点文件历史记录监视器就是一个示例。
- [系统服务](#system-services)启动、停止和配置现有的 Linux systemd 单元。对于未包含 `builtin` 的条目，这是默认作用域。

## 用户服务

要自动保存[已跟踪的点文件](/dotfiles.html)编辑内容，请将以下内容添加到全局 mise 配置中：

```toml
[bootstrap.services.mise-history]
builtin = "history-watch"
```

安装服务并检查它：

```sh
mise bootstrap services apply
mise dot status
```

监视器运行后，继续正常编辑文件。有关保存行为，请参阅[自动保存](/history.html#automatic-saves)；如果启动失败，请参阅[故障排除](#troubleshooting-user-services)。

### 运行你自己的程序

对于自定义服务，请设置 `scope = "user"` 并提供其命令。此示例假设你已将 `my-agent` 安装在给定路径中：

```toml
[bootstrap.services.my-agent]
scope = "user"
command = "~/.local/bin/my-agent --serve"
```

运行 `mise bootstrap services apply`，然后运行 `mise bootstrap services status`。默认情况下，服务会在登录时启动，并在失败后重启。如果其程序来自 `[tools]`，请添加 `requires_tools = true`，并运行完整的 `mise bootstrap` 以先安装这些工具。

mise 会为你的平台创建服务定义：

| 平台 | 定义 | 管理器 |
| -------- | ------------------------------------------------------------------------------------- | ------------------ |
| Linux    | `~/.config/systemd/user/dev.mise.<name>.service`                                      | `systemctl --user` |
| macOS    | `~/Library/LaunchAgents/dev.mise.<name>.plist`                                        | `launchctl`        |
| Windows  | 计划任务 `mise\<name>`（定义保存在 `$MISE_STATE_DIR/user-services/` 下） | `schtasks`         |

### 用户服务选项

- `command`：要运行的命令行。`~` 和 `~/` 会进行展开。除非设置了 `builtin`，否则为必需项。
- `builtin`：由 mise 提供的服务。`"history-watch"` 会以低优先级运行 `mise dot watch`。它会设置 `scope = "user"` 和 `restart = "on-failure"`。使用它时不要设置 `command`。
- `description`：由服务管理器显示。
- `restart`：`"on-failure"`（默认值）、`"always"` 或 `"never"`。Windows 仅会在失败后重启；请参阅[平台差异](#platform-differences)。
- `environment`：传递给程序的环境变量，例如 `{ LOG_LEVEL = "info" }`。
- `working_directory`：程序运行的目录。
- `state`：`"running"`（默认值）、`"stopped"`（已安装但未运行）或 `"absent"`（已安装的定义会被移除，并且只要仍声明该定义，就会保持移除状态）。
- `enabled`：服务是否在登录时启动（默认值为 `true`）。在 macOS 上，将其设置为 `false` 也会禁用失败后的重启。
- `requires_tools`：在 bootstrap 期间，在 `[tools]` 和插件包管理器之后安装并启动服务。内置监视器会在更早的服务步骤中启动，因为它只需要 mise。

名称只能包含字母、数字、`.`、`_` 或 `-`，并且不能同时出现在 `[bootstrap.linux.systemd.units]` 或 `[bootstrap.macos.launchd.agents]` 中：两者都会写入相同的定义。

### 移除和禁用

`state = "absent"` 会移除已安装的单元、代理或任务，并且只要仍声明该定义，就会在后续运行中保持移除状态。删除声明后，已安装的服务仍会保留，直到执行一次移除操作：

```sh
mise bootstrap services remove my-agent
```

如果它仍然处于声明状态，下一次 `mise bootstrap` 会重新创建它。

### 状态和应用

`mise bootstrap services status` 和 `mise bootstrap services apply` 同时涵盖两个作用域；`mise bootstrap status` 和 `mise bootstrap plan` 会将用户服务列为 `user-service:<name>`。`mise bootstrap status --json` 会在 `user_services` 下包含每个用户服务的渲染定义，因此可以在应用前检查 mise 将要安装的内容。当平台的用户服务管理器不可用时（例如容器中没有 systemd 用户管理器），用户服务会报告为 `unknown`，并在后续提示中跳过；不会写入任何内容。

仅适用于用户服务的字段（`command`、`builtin`、`description`、`restart`、`environment`、`working_directory`、`requires_tools` 和 `state = "absent"`）要求使用用户作用域。如果看到有关其中某个字段的错误，请检查条目是否包含 `scope = "user"` 或 `builtin`。受管理文件通知仅适用于系统服务。

### 用户服务故障排除

如果历史记录监视器停止运行，请运行 `mise doctor` 并检查服务日志。在 Linux 上，它会在五分钟内允许启动三次，之后停止重试。在 macOS 上，重复启动之间至少间隔五分钟。这些限制适用于内置监视器。

在 Linux 上修复原因后，重新运行 `mise bootstrap` 以重置限制并启动监视器。你也可以直接重启它：

```sh
systemctl --user reset-failed dev.mise.mise-history.service
systemctl --user start dev.mise.mise-history.service
```

如果你使用了其他服务名称，请在这些命令中替换 `mise-history`。

如果 `mise doctor` 报告历史记录服务正在运行，但没有监视你的存储库，则表示其进程正在监视其他内容：它由较旧版本的 mise 启动，该版本的监视锁位于其他位置；或者它使用的 `MISE_STATE_DIR` 与你的 shell 不同。即使其定义没有变化，`mise bootstrap services apply` 也会重启它。

#### 将 mise 安装到永久路径 {#durable-executable}

监视器需要一个在设置完成后仍然存在的 mise 可执行文件。如果状态报告 `unknown: no durable mise executable; install mise on this host first`，请在该主机上安装 mise，然后再次应用服务。对于远程 bootstrap，请使用 `--install-mise`。

mise 会将绝对可执行文件路径写入内置服务定义。如果正在运行的二进制文件不在临时目录或远程暂存目录中，则使用该二进制文件。否则，它会在 `PATH` 中查找永久的 mise 二进制文件。如果找不到，则不会写入服务。

### 平台差异

在 Linux 上，`restart` 映射到 systemd 的 `Restart`。在 macOS 上，它映射到 launchd 的 `KeepAlive`；`"on-failure"` 使用 `{ SuccessfulExit = false }`。

在 Windows 上，`"always"` 和 `"on-failure"` 都会最多重试失败的运行三次，每次间隔一分钟。设置 `enabled = true` 后，服务也会在登录时再次启动。成功退出后，服务会保持停止状态。如果 Windows 程序需要在完成工作后继续运行，请让它在内部循环。

在 macOS 上，`enabled` 控制 `RunAtLoad`。launchd 也会将 `KeepAlive` 视为在加载时启动的请求。对于已停止的服务，mise 会省略 `RunAtLoad`；当 `enabled = false` 时，会省略 `KeepAlive`。设置了 `enabled = false` 的运行中服务会在应用时启动一次，然后在退出后保持停止状态，直到你再次启动它或重新启用它。

在 Windows 上，设置 `environment` 会使用 `cmd.exe`。包含 `%`、`"`、`&`、`|`、`<`、`>` 或 `^` 的值会被拒绝。设置 `environment` 后，`command` 也会拒绝 `%`、`&`、`|`、`<`、`>` 和 `^`。请将此类命令移入脚本，或在程序中设置变量。不设置 `environment` 时，命令会直接运行。

## 系统服务

包安装和 `[bootstrap.files]` 会先运行，因此服务可能由软件包安装，或作为受管理的单元文件提供。文件发生更改后，mise 会在应用服务更改前重新加载 systemd。

```toml
[bootstrap.packages]
"apt:docker.io" = "latest"

[bootstrap.services.docker]
state = "running"
enabled = true
```

不带单元后缀的名称会自动添加 `.service`。也接受显式单元名称，例如
`postgresql@16-main.service`，以及套接字和计时器。

本节管理由软件包或[受管理文件](/bootstrap/files.html)提供的现有系统单元。以你的用户身份运行的服务是[用户服务](#user-services)（上述 `scope = "user"`）；手写的用户单元应通过[systemd 用户单元](/bootstrap/systemd.html)处理。

使用 `mise bootstrap services apply --dry-run` 进行预览。如果该单元将由相同的配置创建，请使用完整的 bootstrap，在协调服务前安装其软件包或文件。

### 系统服务选项

- `state`：`"running"`（默认值）或 `"stopped"`
- `enabled`：该单元是否在启动时启动（默认值为 `true`）
- `masked`：systemd 是否必须阻止该单元启动（默认值为
  `false`）
- `on_change`：更改后的受管理文件或目录通知服务时采取的操作：`"reload_or_restart"`（默认值）、`"reload"`、
  `"restart"` 或 `"none"`

受管理的文件和目录可以通知一个或多个服务。通知仅在资源实际发生更改后运行；试运行会显示相同的操作。对于声明为 `state = "stopped"` 的服务，通知永远不会启动或重启该服务；`on_change` 仅在期望的服务状态为运行时生效。

```toml
[bootstrap.files."/etc/docker/daemon.json"]
content = '{ "log-driver": "local" }'
notify = ["docker"]

[bootstrap.services.docker]
state = "running"
enabled = true
on_change = "reload_or_restart"
```

通知名称会在任何 bootstrap 变更之前进行验证，因此拼写错误不会导致主机部分完成配置。mise 会运行一次 `daemon-reload`，重新检查所有受影响的单元，并在更改任何服务之前验证每项操作。仅当变更的通知源是该单元在 systemd 系统单元搜索目录中的受管理文件时，缺失单元才会重试；这也包括实例化单元的 `name@.service` 模板。普通配置文件发出的通知无法使无关的缺失单元出现，因此会继续保持 `unknown`。这样可以安全地启动由 `[bootstrap.files]` 新写入的单元，同时不会削弱故障关闭行为。一旦交互式用户确认了受管理文件的更改，其通知处理程序就会作为该已确认更改的一部分运行；无关的服务偏差仍可单独确认。

`mise bootstrap services status` 和 `mise bootstrap services apply` 仅检查并使服务生命周期状态达到期望状态。它们不会在文件发生更改之前为其合成文件通知。聚合命令 `mise bootstrap status` 和 `mise bootstrap plan` 会包含待处理受管理文件更改所产生的通知后果，而 `mise bootstrap files apply` 仅在因果文件操作成功后运行这些处理程序。

移除服务声明后，其当前状态将不再受管理。要停止服务并阻止未来启动，请保留显式声明。被屏蔽的单元还必须停止并禁用：

```toml
[bootstrap.services.old-worker]
state = "stopped"
enabled = false
masked = true
```

mise 不会对单元缺失、systemd 不可用或单元无法启用的情况进行猜测（例如静态单元）。状态和计划会将资源报告为 `unknown`；应用会故障关闭，而不是运行不安全的命令。

```sh
mise bootstrap services status
mise bootstrap services status --json
mise bootstrap services apply --dry-run
mise bootstrap services apply --yes
```

系统服务管理仅支持 Linux，并且需要 root 权限。只有在需要进行更改时，mise 才会通过 sudo 提示。
