---
description: "在 mise.toml 中声明 systemd 用户服务和定时器，再通过 systemctl --user 写入、启用并启动它们。"
socialDescription: "在 mise.toml 中声明 systemd 用户服务和定时器。"
---

# systemd 用户单元

在 `[bootstrap.linux.systemd.units]` 中声明 systemd 用户服务和定时器。
[`mise bootstrap`](/bootstrap.html) 或
[`mise bootstrap linux systemd-units apply`](/cli/bootstrap/linux/systemd-units/apply.html)
会将它们分别写入 `~/.config/systemd/user/dev.mise.<name>.service`（或 `.timer`），并通过 `systemctl --user` 启用和启动。

单元会以当前用户身份在 systemd 用户管理器中运行。如果希望通过一份声明在 Linux、macOS 和 Windows 上运行后台程序，请改用[用户服务](/bootstrap/services.html#user-services)；同一名称不能同时在两处声明，因为两者会写入相同的单元文件。本节适用于定时器、单元依赖、加固和环境文件等 systemd 功能。对于由系统管理器运行的单元（例如通过软件包安装的数据库），请使用[系统服务](/bootstrap/services.html#system-services)。

## 示例

请先安装程序。以下以 `my-sync` 作为程序示例：

```toml
[bootstrap.linux.systemd.units.my-sync]
description = "同步文件"
exec_start = "~/.local/bin/my-sync --watch"
restart = "on-failure"
```

```sh
mise bootstrap linux systemd-units apply --dry-run
mise bootstrap linux systemd-units apply
```

mise 会写入 `~/.config/systemd/user/dev.mise.my-sync.service`，运行 `systemctl --user daemon-reload`，为 `default.target` 启用单元，并重启该单元。程序失败时，systemd 会将其重启。

单元不会继承 shell 中的 mise 激活环境，因此 `[tools]` 中的工具不会出现在它的 `PATH` 中。请使用绝对路径，或在 `exec_*` 键中使用 `~/` 路径，并设置程序所需的环境变量。`exec_start` 使用 systemd 命令语法，而不是 shell 语法；如需管道或重定向，请运行 `/bin/sh -c '...'` 或使用包装脚本。

## 登录时运行一次命令

`oneshot` 服务会运行命令后退出。设置 `remain_after_exit = true` 后，systemd 会继续将其标记为活动状态，因此单元停止时（例如用户管理器关闭时）会运行 `exec_stop`：

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

## 将服务绑定到桌面会话

服务可以随着图形会话启动和停止，并在启动前执行检查：

~~~toml
[bootstrap.linux.systemd.units.panel]
description = "desktop panel"
part_of = ["graphical-session.target"]
after = ["graphical-session.target"]
exec_start_pre = ["~/.local/bin/panel --check-config"]
exec_start = "~/.local/bin/panel"
wanted_by = ["graphical-session.target"]
~~~

`wanted_by` 只会让服务随会话启动；`part_of` 还会让服务随 `graphical-session.target` 停止和重启。如果 `exec_start_pre` 命令失败，systemd 不会运行 `exec_start`，并且 `systemctl --user status` 会显示失败的检查命令。

## 按计划运行

设置任意定时器键后，该条目会生成 `.timer` 单元。请为要执行的工作配置一个服务条目，并使用 `unit` 让定时器指向该服务：

含有 timer 键的条目会被渲染为 `.timer`，而不是 `.service`。例如：
```toml
[bootstrap.linux.systemd.units.backup]
type = "oneshot"
exec_start = "~/.local/bin/backup"
start = false
wanted_by = []

[bootstrap.linux.systemd.units.backup-daily]
on_calendar = "daily"
persistent = true
unit = "backup"
```

服务设置了 `start = false` 和 `wanted_by = []`，因此 apply 会让服务保持停止且不启用，只有定时器会启动它。设置 `persistent = true` 后，如果定时器未运行期间错过了任务（例如机器关机或用户已注销），定时器下次启动时会立即补跑。此选项只适用于 `on_calendar`，不适用于单调计时器。参阅 [systemd 定时器参考](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html#Persistent=)。

单调计时器会以系统启动或服务上次运行的时间为基准。以下示例假设已经像上方的 `backup` 一样声明了 `healthcheck` 服务：

```toml
[bootstrap.linux.systemd.units.healthcheck-timer]
description = "periodically check daemon health"
on_boot_sec = "2min"
on_unit_inactive_sec = "5min"
randomized_delay_sec = "30s"
unit = "healthcheck"
```

不带后缀的 `unit` 值会指向 mise 为该条目生成的服务，因此 `unit = "backup"` 会指向 `dev.mise.backup.service`。带有单元类型后缀的值（例如 `unit = "nginx.service"`）则会原样写入。

定时器必须至少设置 `on_boot_sec`、`on_unit_active_sec`、`on_unit_inactive_sec` 或 `on_calendar` 之一。定时器条目不允许使用 `exec_start`、`environment` 和 `restart` 等服务键。

## 设置环境

```toml
[bootstrap.linux.systemd.units.my-sync]
exec_start = "~/.local/bin/my-sync --watch"
environment = { PATH = "/usr/local/bin:/usr/bin:/bin", LOG_LEVEL = "info" }
environment_file = ["-%h/.config/my-sync.env"]
working_directory = "~"
nice = 10
umask = "0007"
standard_output = "journal"
standard_error = "journal"
```

`environment_file` 接受绝对路径列表，或使用 `%h` 等 systemd 占位符的路径。路径前加 `-` 可将文件设为可选。systemd 不会在这些路径中展开 `~` 或 `$HOME`。

不要将机密值放入 `environment`，因为这些值会被写入单元文件。请将机密放入权限为 `0600` 的 `environment_file`，例如使用[机密输入](/bootstrap/secrets.html)的 [`[bootstrap.files]`](/bootstrap/files.html) 模板生成的文件。服务仍会通过环境变量接收这些值；本节没有用于配置 systemd 凭据（`LoadCredential=`）的键。

## 使用模板 {#templates}

字符串值都是 [Tera 模板](/templates.html)，并使用声明该单元的配置上下文渲染。这样，单元就可以随定义它的项目一起迁移：

~~~toml
[bootstrap.linux.systemd.units.my-service]
description = "my service"
exec_start = "{{ config_root }}/bin/serve"
working_directory = "{{ config_root }}"
environment_file = ["{{ config_root }}/.env"]
~~~

模板会根据声明它的配置渲染，而不是根据当前目录，因此无论从哪里运行 `mise bootstrap`，<code v-pre>{{ config_root }}</code> 的值都不会变化。它代表该配置的根目录：项目配置（包括 `.mise/config.toml`）对应项目目录；全局配置对应 `MISE_GLOBAL_CONFIG_ROOT`（默认值为 `$HOME`）。如果上述配置位于 `~/src/my-project/mise.toml`，则生成的单元会包含 `WorkingDirectory=/home/you/src/my-project` 和 `EnvironmentFile=/home/you/src/my-project/.env`。这对 `environment_file` 尤其重要，因为 `%h` 是在此处指定 home 目录路径的另一种方式。

不含模板语法的值会原样写入，因此 `%h` 和 `%i` 等 systemd 占位符会保留在单元文件中，而 `~` 仍会在模板渲染后展开。这里不支持 `exec()`；请参阅[引导配置中的模板](/bootstrap.html#templates)。

## 配置的合并方式

不同配置会按照单元名称在[配置层级](/configuration.html#configuration-hierarchy)中合并。更靠近项目的配置会整体替换同名声明；mise 不会跨文件合并各个键。验证失败或模板渲染失败的单元会发出警告并跳过，其他单元仍会继续应用。

如果某个条目从服务变为定时器，或从定时器变为服务，apply 会停止、禁用并删除旧单元。mise 只管理 `~/.config/systemd/user` 中名称以 `dev.mise.` 开头的单元文件。

## 移除单元

设置 `state = "absent"` 可停止、禁用并删除单元；只要保留此配置，单元就会一直处于移除状态：

```toml
[bootstrap.linux.systemd.units.backup]
state = "absent"
```

将条目设为 absent 会同时移除 `dev.mise.<name>.timer` 和 `dev.mise.<name>.service`，因此无需说明原先的单元类型，其他键也可以保留。apply 会先停止并禁用定时器，然后停止服务、删除单元文件，并运行 `systemctl --user daemon-reload`。

删除声明不会移除已安装的单元。若只想移除一次服务单元，请运行 [`mise bootstrap services remove`](/cli/bootstrap/services/remove.html)：

```sh
mise bootstrap services remove my-sync
```

如果仍保留该条目，下次运行 `mise bootstrap` 时会重新安装单元。该命令只会移除 `.service` 单元。[`mise bootstrap unapply`](/bootstrap/modules.html#remove-a-module-s-resources) 则会移除机器模块声明的服务和定时器。

## 预览和应用

使用 [`mise bootstrap linux systemd-units status`](/cli/bootstrap/linux/systemd-units/status.html) 检查各单元，并在应用前预览命令：

```sh
mise bootstrap linux systemd-units status            # 查看各单元状态
mise bootstrap linux systemd-units status --json     # 以 JSON 格式输出相同信息
mise bootstrap linux systemd-units status --missing  # 任一单元缺失、已变更或未处于期望的启停状态时返回 1
mise bootstrap linux systemd-units apply --dry-run   # 显示将要运行的命令
mise bootstrap linux systemd-units apply             # 确认后应用
mise bootstrap linux systemd-units apply --yes       # 无需提示直接应用
```

`systemd` 是 `systemd-units` 的简写别名。

状态会将各单元报告为 `active`、`inactive`、`differs`（单元文件或启用状态与声明不一致）或 `missing`。只要 absent 条目的任一单元文件仍存在，其状态就是 `present`；文件全部移除后则为 `absent`。Apply 会更改所有状态不符合预期的单元：写入单元文件、运行 `systemctl --user daemon-reload`、启用设置了 `wanted_by` 的单元、禁用设置了 `wanted_by = []` 的单元，然后重启 `start = true` 的单元，或停止 `start = false` 的单元。

## 参考

服务和定时器均可使用的 `[Unit]` 键：

| 键             | systemd 键     | 说明                                                           |
| ------------- | ------------- | -------------------------------------------------------------- |
| `description` | `Description` |                                                                |
| `after`       | `After`       | 单元列表                                                       |
| `before`      | `Before`      | 单元列表                                                       |
| `wants`       | `Wants`       | 单元列表                                                       |
| `requires`    | `Requires`    | 单元列表；不会为其排序，因此也应将它们添加到 `after` 中         |
| `binds_to`    | `BindsTo`     | 单元列表                                                       |
| `part_of`     | `PartOf`      | 单元列表                                                       |
| `conflicts`   | `Conflicts`   | 单元列表                                                       |

`[Service]` 键：

| 键                  | systemd 键         | 说明                                         |
| ------------------- | ------------------ | -------------------------------------------- |
| `exec_start`        | `ExecStart`        | 服务必填；支持展开 `~`                         |
| `exec_start_pre`    | `ExecStartPre`     | 列表；按顺序逐行写入                           |
| `exec_start_post`   | `ExecStartPost`    | 列表；按顺序逐行写入                           |
| `exec_stop`         | `ExecStop`         |                                              |
| `exec_stop_post`    | `ExecStopPost`     | 列表；按顺序逐行写入                           |
| `type`              | `Type`             | 例如 `"oneshot"`                              |
| `remain_after_exit` | `RemainAfterExit`  |                                              |
| `timeout_start_sec` | `TimeoutStartSec`  |                                              |
| `timeout_stop_sec`  | `TimeoutStopSec`   |                                              |
| `restart`           | `Restart`          | 例如 `"on-failure"`                            |
| `restart_sec`       | `RestartSec`       |                                              |
| `environment`       | `Environment`      | 变量表                                       |
| `environment_file`  | `EnvironmentFile`  | 路径列表；前缀 `-` 表示文件可选               |
| `working_directory` | `WorkingDirectory` | 支持展开 `~`                                  |
| `nice`              | `Nice`             | 范围为 -20 到 19                             |
| `umask`             | `UMask`            | 八进制，范围为 `"0000"` 至 `"0777"`          |
| `no_new_privileges` | `NoNewPrivileges`  |                                              |
| `private_tmp`       | `PrivateTmp`       |                                              |
| `standard_output`   | `StandardOutput`   | 例如 `"journal"`                              |
| `standard_error`    | `StandardError`    |                                              |

在 `exec_*` 键中，开头的 `~` 或 `~/` 会展开为 home 目录，并保留路径前的 systemd 命令前缀。因此，`exec_start_pre = ["-~/bin/check"]` 会从 home 目录运行一个可选检查。

`[Timer]` 键；设置其中任意一项都会将条目变为定时器：

| 键                     | systemd 键           | 说明                                        |
| ---------------------- | -------------------- | ------------------------------------------- |
| `on_boot_sec`          | `OnBootSec`          |                                             |
| `on_unit_active_sec`   | `OnUnitActiveSec`    |                                             |
| `on_unit_inactive_sec` | `OnUnitInactiveSec`  |                                             |
| `on_calendar`          | `OnCalendar`         | 例如 `"daily"` 或 `"Mon *-*-* 09:00"`       |
| `randomized_delay_sec` | `RandomizedDelaySec` |                                             |
| `accuracy_sec`         | `AccuracySec`        |                                             |
| `persistent`           | `Persistent`         | 补跑错过的 `on_calendar` 任务                |
| `unit`                 | `Unit`               | 仅有名称时表示 `dev.mise.<name>.service`      |

`[Install]` 和 mise 键：

| 键          | 作用                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `wanted_by` | `WantedBy`；服务默认为 `["default.target"]`，定时器默认为 `["timers.target"]`。设为 `[]` 时会写入单元但不启用 |
| `start`     | 默认为 `true`，apply 后会重启单元；`false` 会停止单元                                                              |
| `state`     | `"present"`（默认）或 `"absent"`（移除单元）；参见[移除单元](#remove-a-unit)                                    |

Unit names may contain letters, numbers, `.`, `_`, `-`, and `@`.

## macOS 和 Windows 上的行为

此配置段会在其他平台上忽略，因此同一份配置可以供多台机器使用。`status` 会将各单元列为已跳过，`apply` 不会执行任何操作，而完整的 `mise bootstrap` 会在后续摘要中说明跳过的单元。

## 故障排查

| Problem                                                     | What to do                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 单元因 "cannot target SUDO_USER" 被跳过                    | 以拥有这些单元的用户运行 mise，不要使用 `sudo mise`                                                                     |
| 单元因 "systemd user manager not available" 被跳过         | 登录会启动用户管理器的会话；容器通常没有用户管理器                                                                       |
| 退出服务器后单元停止                                        | 运行一次 `sudo loginctl enable-linger $USER` 启用 lingering；mise 不会替你启用                                          |
| 单元启动失败                                                | 使用 `journalctl --user -u dev.mise.<name>` 查看输出，并通过 `systemctl --user status dev.mise.<name>` 查看状态           |

## 另请参阅

- [引导配置](/bootstrap.html#how-it-runs)：查看单元在执行顺序中的位置。
- [服务](/bootstrap/services.html)：了解如何通过一份声明在所有平台配置后台程序和系统单元。
