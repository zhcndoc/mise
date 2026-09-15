---
description: "从 mise.toml 管理 Linux systemd 用户服务和定时器。"
socialDescription: "从 mise.toml 管理 Linux systemd 用户服务和定时器。"
---

# Linux systemd 用户单元

mise 可以在
`[bootstrap.linux.systemd.units]` 中声明 Linux systemd 用户服务和定时器，并通过
`mise bootstrap linux systemd-units apply` 应用这些配置，或将其作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用：

对于由系统管理器管理的单元，请使用[系统服务](/bootstrap/services.html)。这些用户单元需要一个可访问的用户管理器，并以用户权限运行。请在应用示例之前安装可执行文件；`my-sync` 是你提供的程序的占位符。

```toml
[bootstrap.linux.systemd.units.my-sync]
description = "同步文件"
exec_start = "~/.local/bin/my-sync --watch"
after = ["network-online.target"]
wants = ["network-online.target"]
environment = { PATH = "/usr/local/bin:/usr/bin:/bin" }
environment_file = ["-%h/.config/my-sync.env"]
nice = 10
umask = "0007"
working_directory = "~"
restart = "on-failure"
restart_sec = "5s"
standard_output = "journal"
standard_error = "journal"
```

一次性服务和加固服务可以使用其他服务指令：

```toml
[bootstrap.linux.systemd.units.daemon-lifecycle]
type = "oneshot"
remain_after_exit = true
exec_start = "~/.local/bin/daemon start"
exec_stop = "~/.local/bin/daemon stop"
timeout_start_sec = "120"
timeout_stop_sec = "30"
no_new_privileges = true
private_tmp = true
```

包含 `timer` 键的条目会被渲染为 `.timer`，而不是
`.service`。例如：

```toml
[bootstrap.linux.systemd.units.healthcheck]
description = "check daemon health"
type = "oneshot"
exec_start = "~/.local/bin/daemon healthcheck"
start = false
wanted_by = []

[bootstrap.linux.systemd.units.healthcheck-timer]
description = "periodically check daemon health"
on_boot_sec = "2min"
on_unit_inactive_sec = "5min"
randomized_delay_sec = "30s"
unit = "healthcheck"
```

应用期间，服务会保持禁用和停止状态，以便由定时器控制其执行。与
`on_calendar` 一起使用时，`persistent` 会补执行错过的日历事件；它不会为
`on_unit_inactive_sec` 等单调定时器添加补执行行为。请参阅
[systemd 定时器参考](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html#Persistent=)。

不带单元类型后缀的 `unit` 值会解析为 mise 所拥有的服务
`dev.mise.<unit>.service`——因此，`unit = "healthcheck"` 会指向上面的
`healthcheck` 服务条目。若要将定时器指向未受管理的单元，请提供完整限定名称（例如
`unit = "nginx.service"`），该名称会按原样写入。

定时器必须至少设置以下选项之一：`on_boot_sec`、`on_unit_active_sec`、
`on_unit_inactive_sec` 或 `on_calendar`。`exec_start`、`environment` 和
`restart` 等仅适用于服务的键在定时器条目中会被拒绝；请为定时器触发的单元单独创建服务条目。

每个单元都会写入
`~/.config/systemd/user/dev.mise.<name>.service` 或
`~/.config/systemd/user/dev.mise.<name>.timer`，并通过
`systemctl --user` 进行管理。单元名称可以包含字母、数字、`.`、`_`、`-` 和
`@`。mise 只拥有它使用 `dev.mise.` 前缀创建的单元文件。

## 支持的键

| TOML 键                | systemd 键                    |
| ---------------------- | ------------------------------ |
| `description`          | `Description`                  |
| `after`                | `After`                        |
| `wants`                | `Wants`                        |
| `requires`             | `Requires`                     |
| `exec_start`           | `ExecStart`                    |
| `type`                 | `Type`                         |
| `remain_after_exit`    | `RemainAfterExit`              |
| `exec_stop`            | `ExecStop`                     |
| `timeout_start_sec`    | `TimeoutStartSec`              |
| `timeout_stop_sec`     | `TimeoutStopSec`               |
| `no_new_privileges`    | `NoNewPrivileges`              |
| `private_tmp`          | `PrivateTmp`                   |
| `environment`          | `Environment`                  |
| `environment_file`     | `EnvironmentFile`              |
| `nice`                 | `Nice`                         |
| `umask`                | `UMask`                        |
| `working_directory`    | `WorkingDirectory`             |
| `restart`              | `Restart`                      |
| `restart_sec`          | `RestartSec`                   |
| `standard_output`      | `StandardOutput`               |
| `standard_error`       | `StandardError`                |
| `on_boot_sec`          | `OnBootSec`                    |
| `on_unit_active_sec`   | `OnUnitActiveSec`              |
| `on_unit_inactive_sec` | `OnUnitInactiveSec`            |
| `on_calendar`          | `OnCalendar`                   |
| `randomized_delay_sec` | `RandomizedDelaySec`           |
| `accuracy_sec`         | `AccuracySec`                  |
| `persistent`           | `Persistent`                   |
| `unit`                 | `Unit`                         |
| `wanted_by`            | `WantedBy`                     |
| `start`                | 运行 `systemctl --user restart` |

`requires` 不会隐含顺序；当某个单元必须先启动时，请将同一单元添加到
`after`。`environment_file` 接受绝对路径列表或使用 systemd 说明符的路径，例如
`%h`；在路径前加上 `-` 可使其变为可选路径。systemd 不会在这些路径中展开
`~` 或 `$HOME`。环境变量不适合存储机密信息；敏感值请使用 systemd 凭据。

单元命令不会继承交互式 shell 的 mise 激活状态。请设置明确的可执行文件路径和服务所需的环境。`ExecStart`
使用 systemd 的命令语法；shell 运算符需要显式调用 shell 或使用包装脚本。

`exec_start`、`exec_stop` 和 `working_directory` 会在写入服务文件之前，将裸
`~` 和 `~/` 展开为当前用户的主目录。服务的 `wanted_by` 默认为
`["default.target"]`，定时器的 `wanted_by` 默认为 `["timers.target"]`；设置
`wanted_by = []` 可写入单元并禁用之前的任何启用状态。`start` 默认为
`true`；设置 `start = false` 可写入并启用单元，同时不让其保持运行状态。

## 语义

- **声明式且可追加**——单元名称会在
  [配置层级](/configuration.html)（全局 → 项目）中合并。同一单元名称的更局部配置会替换其完整声明。当条目在服务和定时器之间发生变化时，mise 会停止、禁用并移除过时的同级单元。
- **仅限 Linux**——在其他平台上，此部分不会生效：
  `mise bootstrap linux systemd-units status` 会将条目标记为已跳过，而
  `mise bootstrap linux systemd-units apply` 会忽略它们。
- **仅限用户单元**——mise 会写入 `~/.config/systemd/user`，并使用
  `systemctl --user`。若要管理 `/etc/systemd/system` 中的系统服务，请使用
  [受管理文件](/bootstrap/files.html) 和[系统服务](/bootstrap/services.html)。
- **仅限目标用户**——请以拥有这些服务的用户运行 mise，并确保 systemd 用户管理器可访问。由于
  `systemctl --user` 会指向错误的用户管理器，因此会跳过 `sudo mise`。
- **仅手动应用**——mise 从不隐式写入或启动 systemd 单元；只有
  `mise bootstrap linux systemd-units apply` 和 `mise bootstrap` 会执行此操作。

## 命令

```sh
mise bootstrap linux systemd-units status            # 显示 systemd 用户服务状态
mise bootstrap linux systemd-units status --json     # 机器可读
mise bootstrap linux systemd-units status --missing  # 如果任何单元缺失、已更改或非活动，则退出 1

mise bootstrap linux systemd-units apply           # 写入并启动缺失/已更改的单元
mise bootstrap linux systemd-units apply --dry-run # 打印命令而不运行它们
mise bootstrap linux systemd-units apply --yes     # 跳过确认提示
```

`status` 会将每个单元报告为 `active`（活动）、`inactive`（非活动）、`differs`（存在差异）或 `missing`（缺失）。

`apply` 会重写已更改单元文件，运行 `systemctl --user daemon-reload`，
启用设置了 `wanted_by` 的单元，禁用设置为 `wanted_by = []` 的单元，
并在 `start = true` 时重启它们，或在 `start = false` 时停止它们。
