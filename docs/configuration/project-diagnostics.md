---
description: "声明具有可操作失败信息的项目检查，并使用 mise doctor project 运行这些检查"
---

# 项目诊断

`mise doctor project` 会运行项目配置中的命名检查并报告每项结果。使用它来检查仅凭工具版本无法确定的要求，例如编译器是否能发现原生库，或数据库是否接受连接。

```toml
[doctor.checks.openssl]
description = "OpenSSL development files are discoverable"
run = "pkg-config --exists openssl"
hint = "Run `mise bootstrap packages apply` to install the declared build dependencies."
timeout = "5s"
os = ["linux", "macos"]

[doctor.checks.database]
description = "PostgreSQL accepts connections"
run = "pg_isready --quiet"
hint = "Start the project's services with pitchfork."
timeout = "5s"
```

```sh
mise doctor project
mise doctor project --json
```

示例输出：

```text
PASS database: PostgreSQL accepts connections
FAIL openssl: OpenSSL development files are discoverable
  Command exited with exit status: 1
  Run `mise bootstrap packages apply` to install the declared build dependencies.
```

普通的 `mise doctor` 会继续诊断 mise 本身；它不会运行这些检查。进入目录或运行任务时不会自动运行检查。不存在隐式项目检查：声明你需要的要求。

## 检查配置

每个 `[doctor.checks.<name>]` 表支持：

| 字段          | 含义                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run`         | 必需的 shell 命令；退出状态为零表示通过。                                                                                                          |
| `description` | 面向用户的要求描述。文本输出中默认为检查名称。                                                                                                     |
| `hint`        | 失败或执行错误后显示的指导信息。永远不会执行。                                                                                                     |
| `timeout`     | 正时长，例如 `500ms` 或 `5s`；默认为 `10s`。                                                                                                      |
| `dir`         | 工作目录。相对路径从声明配置的根目录解析；`~/` 和绝对路径按给定值使用。默认为该根目录。                                                            |
| `shell`       | 可执行文件及其参数，包括命令标志，例如 `"bash -c"` 或 `"pwsh -Command"`。默认为 mise 的内联任务 shell。                                           |
| `os`          | OS 或 OS/架构选择器，或非空列表，例如 `"linux/arm64"` 或 `["linux", "darwin"]`。省略则在所有平台运行。                                          |

检查使用活动配置层级，包括特定环境的配置。更高优先级的定义会替换同名检查的全部内容，包括其提示信息和工作目录。检查会并发运行，并受 `jobs` 设置（`MISE_JOBS`）限制，因此运行缓慢的探测可以共享等待时间。结果仍按名称排序，检查失败不会停止其他检查。设置 `jobs = 1` 可按顺序执行。

命令会接收项目环境和已安装工具的路径，包括环境移除配置。诊断不会安装工具，也不会运行任务依赖项或任务钩子。环境指令仍会正常求值，因此应将检查编写为检查命令，并使用正常的 mise 配置信任机制。在安全模式下，适用于当前平台的项目检查会报告错误。空的或全部被平台排除的检查列表仍会成功。检查不会在沙箱中运行。

每个命令都有截止时间，以及合计 64 KiB 的标准输出／标准错误限制。超时和输出限制失败会终止所拥有的进程树。命令输出会被捕获并丢弃，而不是包含在报告中，因此探测命令不会意外地将凭据打印到报告中。使用 `description` 和 `hint` 解释要求及解决方法；直接运行命令以获取详细输出。

`dir` 中允许使用绝对路径、以 `~/` 开头的路径以及 `..` 组件，这与任务工作目录相同；不会渲染模板。配置根目录用于确定相对路径；它不是文件系统边界。检查可以有意检查同级检出目录或共享的本地服务目录。全局或系统配置中声明的检查使用调用目录作为其根目录，与任务相同；直接位于主目录中的 `mise.toml` 属于项目配置，并以主目录作为根目录。Shell 覆盖使用任务的引号约定，并遵循 `windows_powershell_no_profile`。OS 选择器接受与工具过滤器相同的别名（`darwin`、`win`、`amd64` 以及其他别名）；`os = []` 会被拒绝。未知的 `[doctor]` 容器选项会被忽略，以实现前向兼容性（JSON schema 也允许这些选项），而未知的检查字段会被拒绝，以便发现拼写错误。

在 Unix 上，Ctrl-C、SIGTERM 和 SIGHUP 会取消正在运行的检查，并关闭其所拥有的进程组，包括 doctor 在 mise 任务中运行时的情况。父进程忽略的信号（例如在 `nohup` 下的 SIGHUP）仍会保持忽略状态。与任何需要监督程序运行才能完成的清理一样，SIGKILL 会阻止清理；请先使用 SIGTERM 停止 doctor，再升级为 SIGKILL。

## 结果与自动化

JSON 报告包含 `checks` 和 `errors` 数组。顶层的 `errors` 包含配置加载错误；在这种情况下，`checks` 为空。否则 `errors` 为空，并且每个声明的检查在 `checks` 中都有一个结果。每个条目包含 `name`、`description`、`source`（声明该检查的配置文件）、`status`、`message` 和 `hint`。不存在的可选字段值为 `null`。

- `pass`：命令成功退出
- `fail`：命令未成功退出
- `error`：mise 无法执行或完成检查，包括超时、无效的检查选项或不可用的项目环境
- `skipped`：检查的 `os` 选择排除了当前系统

Shell 可以将缺少命令报告为非零退出；这属于 `fail`，而无法启动 shell 本身属于 `error`。

如果任意检查失败或无法完成，命令会以状态 1 退出。空检查列表或只有被跳过的检查会成功退出。配置加载失败（包括阻止加载的必需环境值）会在顶层 `errors` 数组中报告。如果配置加载成功，但准备工具环境失败，则受影响的检查各自报告错误，而被平台排除的检查仍保持跳过状态。

这是对当前计算机的兼容性检查。通过并不能证明整个环境具有可复现性。请为环境中所覆盖的部分保留工具和应用程序锁定文件。
