# launchd <Badge type="warning" text="experimental" />

mise 可以在
`[bootstrap.macos.launchd.agents]` 中声明 macOS 用户 LaunchAgents，并使用
`mise bootstrap macos launchd-agents apply` 应用它们：

```toml
[bootstrap.macos.launchd.agents.my-sync]
program = "~/.local/bin/my-sync"
args = ["--watch"]
run_at_load = true
start_interval = 300
environment = { PATH = "/opt/homebrew/bin:/usr/bin:/bin" }
working_directory = "~"
stdout_path = "~/Library/Logs/my-sync.log"
stderr_path = "~/Library/Logs/my-sync.err.log"
```

每个 agent 都会写入 `~/Library/LaunchAgents/dev.mise.<name>.plist`，并通过
`launchctl bootstrap gui/$UID
~/Library/LaunchAgents/dev.mise.<name>.plist` 加载。Agent 名称可以包含字母、
数字、`.`、`_` 和 `-`。mise 仅拥有它创建的、带有
`dev.mise.` 标签前缀的 plist 文件。

## 支持的键

| TOML 键             | launchd 键               |
| ------------------- | ------------------------- |
| `program`           | `ProgramArguments[0]`     |
| `args`              | `ProgramArguments[1..]`   |
| `run_at_load`       | `RunAtLoad`               |
| `keep_alive`       | `KeepAlive`               |
| `start_interval`    | `StartInterval`           |
| `environment`       | `EnvironmentVariables`    |
| `working_directory` | `WorkingDirectory`        |
| `stdout_path`       | `StandardOutPath`         |
| `stderr_path`       | `StandardErrorPath`       |
| `kickstart`         | 运行 `launchctl kickstart` |

`program`、`working_directory`、`stdout_path` 和 `stderr_path` 会在写入 plist 之前将不带内容的
`~` 和 `~/` 展开为当前用户的主目录。
`args` 会严格按原样传递。

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
