# systemd

mise 可以在
`[bootstrap.linux.systemd.units]` 中声明 Linux systemd 用户服务和定时器，并通过
`mise bootstrap linux systemd-units apply` 应用这些配置，或将其作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用：

```toml
[bootstrap.linux.systemd.units.my-sync]
description = "同步文件"
exec_start = "~/.local/bin/my-sync --watch"
after = ["network-online.target"]
wants = ["network-online.target"]
environment = { PATH = "/usr/local/bin:/usr/bin:/bin" }
working_directory = "~"
restart = "on-failure"
restart_sec = "5s"
standard_output = "append:%h/.local/state/my-sync.log"
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
[bootstrap.linux.systemd.units.healthcheck-timer]
description = "periodically check daemon health"
on_boot_sec = "2min"
on_unit_inactive_sec = "5min"
randomized_delay_sec = "30s"
persistent = true
unit = "healthcheck"
```

不带单元类型后缀的 `unit` 值会解析为由 mise 管理的服务
`dev.mise.<unit>.service`——因此，`unit = "healthcheck"` 会指向上面的
`healthcheck` 服务条目。若要让定时器指向未由 mise 管理的单元，请提供完整限定名称（例如
`unit = "nginx.service"`），该名称会原样写入。

定时器必须至少设置以下选项之一：`on_boot_sec`、`on_unit_active_sec`、
`on_unit_inactive_sec` 或 `on_calendar`。`exec_start`、`environment` 和
`restart` 等仅适用于服务的键在定时器条目中会被拒绝；请为定时器触发的单元单独创建服务条目。

每个单元都会写入
`~/.config/systemd/user/dev.mise.<name>.service` 或
`~/.config/systemd/user/dev.mise.<name>.timer`，并通过
`systemctl --user` 进行管理。单元名称可以包含字母、数字、`.`、
`_`、`-` 和 `@`。mise 仅管理它以 `dev.mise.` 前缀创建的单元文件。

## 支持的键

| TOML 键                | systemd 键                    |
| ---------------------- | ------------------------------ |
| `description`          | `Description`                  |
| `after`                | `After`                        |
| `wants`                | `Wants`                        |
| `exec_start`           | `ExecStart`                    |
| `type`                 | `Type`                         |
| `remain_after_exit`    | `RemainAfterExit`              |
| `exec_stop`            | `ExecStop`                     |
| `timeout_start_sec`    | `TimeoutStartSec`              |
| `timeout_stop_sec`     | `TimeoutStopSec`               |
| `no_new_privileges`    | `NoNewPrivileges`              |
| `private_tmp`          | `PrivateTmp`                   |
| `environment`          | `Environment`                  |
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

在写入服务文件之前，`exec_start` 和 `working_directory` 会将裸 `~` 和
`~/` 展开为当前用户的主目录。对于服务，`wanted_by` 默认为
`["default.target"]`；对于定时器，默认为 `["timers.target"]`；设置
`wanted_by = []` 可写入单元并禁用之前的任何启用状态。`start`
默认为 `true`；设置 `start = false` 可写入并启用单元，但不让其保持运行。

## 语义

- **声明式且可叠加** — unit 名称会跨越[配置层级](/configuration.html)（全局 → 项目）合并。对于相同的 unit 名称，更本地的配置会替换完整声明。当某个条目在服务和定时器之间发生变化时，mise 会停止、禁用并移除过时的配对 unit。
- **仅限 Linux** — 在其他平台上，此部分不会生效：
  `mise bootstrap linux systemd-units status` 会将条目列为已跳过，而
  `mise bootstrap linux systemd-units apply` 会忽略这些条目。
- **仅支持用户 unit** — mise 会写入 `~/.config/systemd/user`，并使用
  `systemctl --user`。不支持位于 `/etc/systemd/system` 中的系统服务。
- **仅限目标用户** — 请以拥有这些服务的用户运行 mise，并确保该用户具有可访问的 systemd 用户管理器。由于 `systemctl --user`
  会针对错误的用户管理器，使用 `sudo mise` 时会跳过执行。
- **仅手动应用** — mise 从不会隐式写入或启动 systemd unit；只有 `mise bootstrap linux systemd-units apply` 和 `mise bootstrap` 会执行此操作。

## 命令

```sh
mise bootstrap linux systemd-units status            # 显示 systemd 用户服务状态
mise bootstrap linux systemd-units status --json     # 机器可读
mise bootstrap linux systemd-units status --missing  # 如果任何单元缺失、已更改或非活动，则退出 1

mise bootstrap linux systemd-units apply           # 写入并启动缺失/已更改的单元
mise bootstrap linux systemd-units apply --dry-run # 打印命令而不运行它们
mise bootstrap linux systemd-units apply --yes     # 跳过确认提示
```

`status` 将每个单元报告为 `active`（活动）、`inactive`（非活动）、`differs`（存在差异）或 `missing`（缺失）。

`apply` 会重写已更改单元文件，运行 `systemctl --user daemon-reload`，
启用设置了 `wanted_by` 的单元，禁用设置为 `wanted_by = []` 的单元，
并在 `start = true` 时重启它们，或在 `start = false` 时停止它们。
