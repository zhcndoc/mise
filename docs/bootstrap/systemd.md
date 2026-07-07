# systemd <Badge type="warning" text="experimental" />

mise 可以在
`[bootstrap.linux.systemd.units]` 中声明 Linux systemd 用户服务，并使用
`mise bootstrap linux systemd-units apply` 将其应用：

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

每个单元都会写入到 `~/.config/systemd/user/dev.mise.<name>.service`，并通过
`systemctl --user` 进行管理。单元名称可以包含字母、数字、`.`,
`_`、`-` 和 `@`。mise 只拥有它创建的、带有 `dev.mise.` 前缀的服务文件。

## 支持的键

| TOML 键             | systemd 键                      |
| ------------------- | ------------------------------ |
| `description`       | `Description`                  |
| `after`             | `After`                        |
| `wants`             | `Wants`                        |
| `exec_start`        | `ExecStart`                    |
| `environment`       | `Environment`                  |
| `working_directory` | `WorkingDirectory`             |
| `restart`           | `Restart`                      |
| `restart_sec`       | `RestartSec`                   |
| `standard_output`   | `StandardOutput`               |
| `standard_error`    | `StandardError`                 |
| `wanted_by`         | `WantedBy`                     |
| `start`             | 运行 `systemctl --user restart` |

`exec_start` 和 `working_directory` 会在写入服务文件之前，将裸 `~` 和 `~/` 展开为当前用户的主目录。`wanted_by` 的默认值为 `["default.target"]`；将 `wanted_by = []` 可写入单元并禁用任何先前的启用状态。`start` 的默认值为 `true`；将 `start = false` 可在写入并启用后不保持单元运行。

## 语义

- **声明式且可叠加** — unit 名称会在
  [配置层级](/configuration.html)（全局 → 项目）之间合并。更局部的
  配置会替换同一 unit 名称的完整声明。
- **仅限 Linux** — 在其他平台上，该部分不会生效：
  `mise bootstrap linux systemd-units status` 会将条目标记为跳过，
  `mise bootstrap linux systemd-units apply` 会忽略它们。
- **仅限用户服务** — mise 会写入 `~/.config/systemd/user`，并使用
  `systemctl --user`。`/etc/systemd/system` 中的系统服务不受支持。
- **仅限目标用户** — 以服务所属的用户身份运行 mise，并确保该用户的 systemd user manager 可访问。`sudo mise` 会被跳过，因为 `systemctl --user`
  会指向错误的用户 manager。
- **仅限手动应用** — mise 从不隐式写入或启动 systemd 服务；
  只有 `mise bootstrap linux systemd-units apply` 和 `mise bootstrap` 会这样做。

## 命令

```sh
mise bootstrap linux systemd-units status            # 显示 systemd 用户服务状态
mise bootstrap linux systemd-units status --json     # 机器可读
mise bootstrap linux systemd-units status --missing  # 如果任何单元缺失、已更改或非活动，则退出 1

mise bootstrap linux systemd-units apply           # 写入并启动缺失/已更改的单元
mise bootstrap linux systemd-units apply --dry-run # 打印命令而不运行它们
mise bootstrap linux systemd-units apply --yes     # 跳过确认提示
```

`status` 会将每个单元报告为 `active`、`inactive`、`differs` 或 `missing`。
`apply` 会重写已更改的服务文件，运行 `systemctl --user daemon-reload`，
启用带有 `wanted_by` 的单元，禁用 `wanted_by = []` 的单元，并在
`start = true` 时重启它们，或在 `start = false` 时停止它们。
