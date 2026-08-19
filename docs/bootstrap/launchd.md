# launchd

mise 可以在
`[bootstrap.macos.launchd.agents]` 中声明 macOS 用户 LaunchAgent，并通过
`mise bootstrap macos launchd-agents apply` 或作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用：

```toml
[bootstrap.macos.launchd.agents.my-sync]
program = "~/.local/bin/my-sync"
args = ["--watch"]
run_at_load = true
start_calendar_interval = { hour = 2, minute = 0 }
environment = { PATH = "/opt/homebrew/bin:/usr/bin:/bin" }
working_directory = "~"
stdout_path = "~/Library/Logs/my-sync.log"
stderr_path = "~/Library/Logs/my-sync.err.log"
```

每个代理都会写入 `~/Library/LaunchAgents/dev.mise.<name>.plist`，并通过
`launchctl bootstrap gui/$UID
~/Library/LaunchAgents/dev.mise.<name>.plist` 加载。代理名称可以包含字母、
数字、`.`、`_` 和 `-`。mise 仅拥有它创建的、带有
`dev.mise.` 标签前缀的 plist 文件。

## 支持的键

| TOML key                  | launchd key               |
| ------------------------- | ------------------------- |
| `program`                 | `ProgramArguments[0]`     |
| `args`                    | `ProgramArguments[1..]`   |
| `run_at_load`             | `RunAtLoad`               |
| `keep_alive`              | `KeepAlive`               |
| `start_interval`          | `StartInterval`           |
| `throttle_interval`       | `ThrottleInterval`        |
| `start_calendar_interval` | `StartCalendarInterval`   |
| `queue_directories`       | `QueueDirectories`        |
| `environment`             | `EnvironmentVariables`    |
| `working_directory`       | `WorkingDirectory`        |
| `stdout_path`             | `StandardOutPath`         |
| `stderr_path`             | `StandardErrorPath`       |
| `kickstart`               | 运行 `launchctl kickstart` |

`program`、`working_directory`、`stdout_path`、`stderr_path` 以及
`queue_directories` 中的每个条目，在写入 plist 前都会将单独的 `~` 和
`~/` 展开为当前用户的主目录。`args` 会完全按照
原样传递。`start_calendar_interval` 接受 `minute`（0-59）、`hour`（0-23）、`day`
（1-31）、`weekday`（0-7）和 `month`（1-12），并写入相应的
launchd 日历键。对于多个相互独立的日历计划，请使用内联表数组：

```toml
start_calendar_interval = [{ hour = 3 }, { hour = 12, weekday = 1 }]
```

`start_interval` 和 `start_calendar_interval` 是相互独立的 launchd
触发器。如果两者都设置，launchd 可以根据任一计划启动代理。

`throttle_interval` 是 launchd 在代理两次运行之间等待的最小秒数（launchd 的默认值为 10）。

`queue_directories` 会在所列目录中的任意一个非空时启动代理；launchd 希望代理清空这些目录。launchd 要求此处使用绝对路径，因此每个条目必须以 `/` 开头，或使用展开后为绝对路径的 `~` 或 `~/` 路径。

## 语义

- **声明式且可叠加** — agent 名称会在 [配置层级](/configuration.html) 中合并（全局 → 项目）。更局部的配置会替换同一 agent 名称的完整声明。
- **仅限 macOS** — 在其他平台上该部分不生效：`mise bootstrap macos launchd-agents status` 会将条目标记为已跳过，而 `mise bootstrap macos launchd-agents apply` 会忽略它们。
- **仅手动应用** — mise 从不隐式写入或加载 LaunchAgents；只有 `mise bootstrap macos launchd-agents apply` 和 `mise bootstrap` 会这样做。
- **仅限用户级 agent** — mise 会写入 `~/Library/LaunchAgents`。不支持 `/Library/LaunchDaemons` 中的系统守护进程。

## 命令

```sh
mise bootstrap macos launchd-agents status            # 显示 LaunchAgent 状态
mise bootstrap macos launchd-agents status --json     # 机器可读
mise bootstrap macos launchd-agents status --missing  # 如果任何 agent 缺失、已更改或未加载，则退出 1

mise bootstrap macos launchd-agents apply           # 写入并加载缺失/已更改的 agent
mise bootstrap macos launchd-agents apply --dry-run # 打印命令而不实际运行
mise bootstrap macos launchd-agents apply --yes     # 跳过确认提示
```

`status` 会将每个 agent 报告为 `loaded`、`unloaded`、`differs` 或 `missing`。
`apply` 会重写已更改的 plist，如果存在则卸载旧任务，加载新任务，
启用它，并且仅当 `kickstart = true` 时运行 `kickstart`。
