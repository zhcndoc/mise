---
description: "在 mise.toml 中声明 macOS LaunchAgent，再使用 launchctl 将其写入并加载到登录会话。"
socialDescription: "在 mise.toml 中声明 macOS LaunchAgent 并使用 launchctl 加载。"
---

# macOS LaunchAgents（启动代理）

在 `[bootstrap.macos.launchd.agents]` 中为 macOS 用户声明 LaunchAgent。运行 [`mise bootstrap`](/bootstrap.html) 或 [`mise bootstrap macos launchd-agents apply`](/cli/bootstrap/macos/launchd-agents/apply.html) 后，每个代理都会写入 `~/Library/LaunchAgents/dev.mise.<name>.plist` 并加载到当前登录会话。

若要用同一份声明在 macOS、Linux 和 Windows 后台运行程序，请改用[用户服务](/bootstrap/services.html#user-services)。需要日历计划、启动事件、队列目录或进程类型等 launchd 功能时，请使用 LaunchAgent。两个位置不能声明相同名称，因为它们会写入同一个 plist。

## 示例

请先安装程序并创建所需的日志目录。示例中的 `my-sync` 代表你自己的程序：

```toml
[bootstrap.macos.launchd.agents.my-sync]
program = "~/.local/bin/my-sync"
args = ["--watch"]
run_at_load = true
keep_alive_on_failure = true
environment = { PATH = "/opt/homebrew/bin:/usr/bin:/bin" }
working_directory = "~"
stdout_path = "~/Library/Logs/my-sync.log"
stderr_path = "~/Library/Logs/my-sync.err.log"
```

请在代理所属用户已登录 Mac 桌面的情况下，以该用户身份运行 apply：代理会加载到 `gui/<uid>` launchd 域中，该域仅在用户登录时存在。

```sh
mise bootstrap macos launchd-agents apply --dry-run
mise bootstrap macos launchd-agents apply
```

mise 会写入 `~/Library/LaunchAgents/dev.mise.my-sync.plist`，并通过 `launchctl bootstrap gui/<uid>` 加载。代理会立即启动，并在每次登录时启动；如果运行失败，launchd 会重新启动它。

代理使用 launchd 的环境，而不是 shell 环境，因此不会自动获得 mise 激活环境或 `[tools]` 中工具所在的 `PATH`。请使用绝对路径，并声明程序所需的环境变量。`program` 和 `args` 会直接组成参数列表，不经过 shell；若需管道或重定向，请运行 `/bin/sh -c '...'` 或使用包装脚本。

## 按计划运行

`start_interval` 每隔指定秒数启动一次代理。`start_calendar_interval` 则在指定日历时间启动代理，可使用 `minute`（0-59）、`hour`（0-23）、`day`（1-31）、`weekday`（0-7，其中 0 和 7 表示星期日）和 `month`（1-12）字段。省略字段表示匹配所有值。若需设置多个计划，请使用数组：

```toml
[bootstrap.macos.launchd.agents.daily-sync]
program = "~/.local/bin/my-sync"
start_calendar_interval = [{ hour = 3, minute = 0 }, { hour = 12, minute = 0, weekday = 1 }]
```

此配置会在每天 03:00 和每周一 12:00 运行。如果同时设置 `start_interval` 和 `start_calendar_interval`，任一计划都可以启动代理。

只要 `queue_directories` 列出的目录中有一个非空，launchd 就会启动代理，并预期代理会清空这些目录。每个条目都必须是绝对路径、`~` 或以 `~/` 开头的路径。

## 在启动事件时运行

`launch_events` 会写入 launchd 的 `LaunchEvents` 字典。按事件流嵌套配置表，再按自选的事件名称嵌套。每个事件中的属性必须使用 launchd 原有名称，且区分大小写：

```toml
[bootstrap.macos.launchd.agents.usb-handler]
program = "~/.local/bin/device-handler"

[bootstrap.macos.launchd.agents.usb-handler.launch_events."com.apple.iokit.matching".apple-usb]
IOProviderClass = "IOUSBHostDevice"
idVendor = 1452
IOMatchLaunchStream = true
```

此配置会订阅匹配的 Apple USB 设备。程序必须通过 `xpc_set_event_stream_handler` 接收事件流；`LaunchEvents` 不是在收到通知时运行任意命令的通用机制。请使用支持所选事件流的处理程序。

事件属性会保留字符串、布尔值、整数、实数、数组和嵌套表。TOML 日期时间值不受支持。事件流名称中包含点号时请加引号，以便 TOML 将其视为单个键。字符串值支持模板，但事件属性中的 `~` 会原样传递。

## Keep a program running

- `run_at_load = true` 会在代理加载时启动程序，包括 apply 时和用户登录时。
- `keep_alive = true` 会在程序每次退出后重新启动。
- `keep_alive_on_failure = true` 只会在程序以错误状态退出后重新启动。`keep_alive` 和 `keep_alive_on_failure` 最多只能设置一个。
- `throttle_interval` 是两次启动之间的最短间隔秒数（launchd 默认为 10）。
- `kickstart = true` 会在加载后运行 `launchctl kickstart`；如果程序尚未运行，该命令会启动它。

## 设置代理优先级

`process_type` 用于设置 launchd 的调度级别：`Background`、`Standard`、`Adaptive` 或 `Interactive`。对于应让出资源的后台工作，请使用 `Background`；launchd 会限制其 CPU 和磁盘 I/O。值区分大小写。若使用其他值，mise 会发出警告并跳过该代理，因为 launchd 会静默忽略不认识的 `ProcessType`，导致任务以默认级别运行。

`nice` 用于设置进程的 nice 值，范围为 -20 到 20。值越大，进程优先级越低。

```toml
[bootstrap.macos.launchd.agents.indexer]
program = "~/.local/bin/indexer"
start_interval = 3600
process_type = "Background"
nice = 10
```

## 使用模板 {#templates}

字符串值可以使用 [Tera 模板](/templates.html)，并在声明该代理的配置上下文中渲染。`args`、`environment` 和 `queue_directories` 中的条目也支持模板：

```toml
[bootstrap.macos.launchd.agents.my-sync]
program = "{{ config_root }}/bin/sync"
working_directory = "{{ config_root }}"
stdout_path = "{{ config_root }}/log/sync.log"
```

这里的 <code v-pre>{{ config_root }}</code> 是声明该代理的配置根目录：项目配置对应项目目录；全局配置对应 `MISE_GLOBAL_CONFIG_ROOT`（默认为 `$HOME`）。它不会随运行 mise 时所在的目录而改变。不含模板语法的值会原样写入；渲染后仍会展开 `~`。此处无法使用 `exec()`；参见 [bootstrap 中的模板](/bootstrap.html#templates)。

## 配置合并方式

代理会按名称跨[配置层级](/configuration.html#configuration-hierarchy)合并。更接近项目的配置会整体替换该名称对应的声明；mise 不会跨文件逐键合并。如果某代理校验失败或模板渲染失败，mise 会发出警告并跳过它，其他代理仍会照常应用。

mise 只管理 `~/Library/LaunchAgents` 中标签以 `dev.mise.` 开头的 plist。它不会更改其他代理，也不支持 `/Library/LaunchDaemons` 中的系统守护进程。

## 移除代理

删除声明不会卸载代理，也不会删除其文件。若要卸载代理并删除 plist，请运行 [`mise bootstrap services remove`](/cli/bootstrap/services/remove.html)：

```sh
mise bootstrap services remove my-sync
```

无论代理是否仍有声明，该命令都能运行；如果仍有声明，下次运行 `mise bootstrap` 时会重新安装代理。不使用 mise 时，请运行 `launchctl bootout gui/$(id -u)/dev.mise.my-sync`，然后删除 `~/Library/LaunchAgents/dev.mise.my-sync.plist`。

## 预览和应用

请使用 [`mise bootstrap macos launchd-agents status`](/cli/bootstrap/macos/launchd-agents/status.html) 检查各代理，并在应用前预览命令：

```sh
mise bootstrap macos launchd-agents status            # state of each agent
mise bootstrap macos launchd-agents status --json     # the same, as JSON
mise bootstrap macos launchd-agents status --missing  # exit 1 if any agent is not loaded
mise bootstrap macos launchd-agents apply --dry-run   # print the commands
mise bootstrap macos launchd-agents apply             # apply after a confirmation prompt
mise bootstrap macos launchd-agents apply --yes       # apply without prompting
```

`launchd` 是 `launchd-agents` 的简写别名。

状态命令会将每个代理报告为 `loaded`、`unloaded`、`differs`（磁盘上的 plist 与声明不匹配）或 `missing`。apply 会更改所有非 `loaded` 状态的代理：写入 plist；若旧任务已加载则先卸载；再使用 `launchctl bootstrap` 加载新任务，通过 `launchctl enable` 启用，并在 `kickstart = true` 时运行 `launchctl kickstart`。卸载代理会停止其运行中的进程。

## 参考

| Key                       | plist key                                | Notes                                                                      |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `program`                 | `ProgramArguments[0]`                    | Required; `~` expanded                                                     |
| `args`                    | `ProgramArguments[1..]`                  | Passed as written                                                          |
| `run_at_load`             | `RunAtLoad`                              | Start when loaded                                                          |
| `keep_alive`              | `KeepAlive`                              | Restart after any exit                                                     |
| `keep_alive_on_failure`   | `KeepAlive = { SuccessfulExit = false }` | Restart after a failure; not with `keep_alive`                             |
| `start_interval`          | `StartInterval`                          | Seconds                                                                    |
| `start_calendar_interval` | `StartCalendarInterval`                  | Table or array of tables with `minute`, `hour`, `day`, `weekday`, `month`  |
| `queue_directories`       | `QueueDirectories`                       | Absolute paths or `~/` paths                                               |
| `launch_events`           | `LaunchEvents`                           | 按事件流和事件名称组织配置表；属性保留原始大小写 |
| `throttle_interval`       | `ThrottleInterval`                       | Minimum seconds between launches                                           |
| `process_type`            | `ProcessType`                            | `Background`, `Standard`, `Adaptive`, or `Interactive`                     |
| `nice`                    | `Nice`                                   | -20 to 20                                                                  |
| `environment`             | `EnvironmentVariables`                   | Table of variables                                                         |
| `working_directory`       | `WorkingDirectory`                       | `~` expanded                                                               |
| `stdout_path`             | `StandardOutPath`                        | `~` expanded                                                               |
| `stderr_path`             | `StandardErrorPath`                      | `~` expanded                                                               |
| `kickstart`               | Not written to the plist                 | Run `launchctl kickstart` after loading                                    |

Agent names may contain letters, numbers, `.`, `_`, and `-`. Each agent's label
is `dev.mise.<name>`.

## On Linux and Windows

The section is ignored on other platforms, so one config can serve several
machines. `status` lists each agent as skipped, `apply` does nothing, and the
full `mise bootstrap` notes the skipped agents in its follow-up summary.

## Troubleshooting

To see why an agent is loaded but not running, inspect it with launchd and read
its output files:

```sh
launchctl print gui/$(id -u)/dev.mise.my-sync
tail ~/Library/Logs/my-sync.err.log
```

`launchctl print` 会显示任务状态、上次退出状态，以及 launchd 运行的程序和参数。在终端中可正常运行、但在此处失败的程序，通常需要使用绝对路径或在 `environment` 中声明变量。

## 另请参阅

- [Bootstrap](/bootstrap.html#how-it-runs)：了解代理在执行顺序中的位置。
- [服务](/bootstrap/services.html)：了解如何用一份声明在各平台运行后台程序。
- [macOS 默认设置](/bootstrap/macos-defaults.html)：管理用户偏好设置。
