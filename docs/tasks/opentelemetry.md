---
description: "将 mise run 的 OpenTelemetry 跟踪和任务输出日志导出到 Jaeger、Grafana Tempo 或任何 OTLP 后端。"
socialDescription: "将 mise run 的跟踪信息和任务日志导出到任意 OpenTelemetry 后端。"
---

# OpenTelemetry <Badge type="warning" text="experimental" />

mise 可以将每次 `mise run` 的跟踪信息导出到任何支持通过 HTTP 传输 OTLP 的后端，例如
[Jaeger](https://www.jaegertracing.io/)、
[Grafana Tempo](https://grafana.com/oss/tempo/) 或 [SigNoz](https://signoz.io/)。
跟踪信息可以显示哪些任务运行缓慢或失败，以及每个任务属于哪个 monorepo 项目。启用日志导出后，每个任务的输出也会显示在对应的跨度旁边。

::: warning 实验性功能
Span 名称、属性和设置可能随版本变化。导出功能还需要启用 `experimental = true`：否则 `mise run` 每次准备导出时都会报错并停止。
:::

## 快速开始

启动一个接受 HTTP OTLP 请求的本地 Jaeger：

```sh
docker run -d --name jaeger -p 16686:16686 -p 4318:4318 jaegertracing/jaeger:latest
```

启用实验性功能和跟踪导出：

```toml [mise.toml]
[settings]
experimental = true
otel.enabled = true
```

将 mise 指向 Jaeger，然后运行一些任务：

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
mise run build ::: test ::: lint
```

打开 `http://localhost:16686` 并选择 `mise` 服务。要同时导出任务输出，请参阅[日志](#logs)。

## 配置

有两个设置可以分别启用两种信号的导出：

| 设置                                                       | 环境变量             | 默认值  | 导出内容                                                 |
| ----------------------------------------------------------- | -------------------- | ------- | -------------------------------------------------------- |
| [`otel.enabled`](/configuration/settings.html#otel.enabled) | `MISE_OTEL_ENABLED`  | `false` | 导出 `mise run` 的跟踪信息。                            |
| [`otel.logs`](/configuration/settings.html#otel.logs)       | `MISE_OTEL_LOGS`     | `false` | 将任务的 stdout 和 stderr 作为日志导出。参见[隐私](#privacy)。 |

其余配置使用标准的
[OpenTelemetry 环境变量](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)。
除非启用了其中一个设置，否则 mise 不会导出任何内容；因此，为其他工具设置
`OTEL_EXPORTER_OTLP_ENDPOINT` 不会导致 mise 发送数据。每种信号还需要指定端点：可以使用通用的
`OTEL_EXPORTER_OTLP_ENDPOINT`，也可以使用该信号专属的 `..._TRACES_ENDPOINT` 或
`..._LOGS_ENDPOINT`。空值视为未设置。

### 标准环境变量

| 变量                                                                    | 用途                                                                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                           | 两种信号共用的 OTLP 端点，例如 `http://localhost:4318`。                                                                                               |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`                                    | 跟踪信息的端点。优先于通用端点。                                                                                                                       |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`                                      | 日志的端点。优先于通用端点。                                                                                                                           |
| `OTEL_EXPORTER_OTLP_HEADERS`                                            | 导出请求使用的请求头，以逗号分隔的 `key=value` 对表示，例如用于身份验证。                                                                               |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS`                                     | 跟踪导出使用的请求头。优先于通用请求头。                                                                                                               |
| `OTEL_EXPORTER_OTLP_LOGS_HEADERS`                                       | 日志导出使用的请求头。优先于通用请求头。                                                                                                               |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                           | `http/protobuf`（默认值）或 `http/json`。不支持 gRPC。                                                                                                 |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`                                    | 跟踪导出使用的协议。优先于通用协议。                                                                                                                   |
| `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`                                      | 日志导出使用的协议。优先于通用协议。                                                                                                                   |
| `OTEL_EXPORTER_OTLP_TIMEOUT`（`..._TRACES_TIMEOUT`、`..._LOGS_TIMEOUT`） | 导出请求超时时间，单位为毫秒。mise 默认为 3 秒，因此即使采集器无法连接，`mise run` 的结束时间最多也只会延后 3 秒。                                    |
| `OTEL_SERVICE_NAME`                                                     | `service.name` 资源属性，默认为 `mise`。                                                                                                               |
| `OTEL_RESOURCE_ATTRIBUTES`                                              | 其他资源属性，以逗号分隔的 `key=value` 对表示。在此处设置 `service.name` 也会替换默认值。                                                               |

向需要身份验证的采集器发送跟踪信息：

```sh
export MISE_EXPERIMENTAL=1
export MISE_OTEL_ENABLED=1
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com:4318
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer mytoken"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=staging,team.name=platform"
```

## 跟踪结构

每次 `mise run` 都会创建一条跟踪记录。根跨度覆盖整个运行过程，初始化跨度覆盖任务开始前的工作，每个任务则各有一个跨度。配置根目录与当前运行项目不同的任务（例如其他 monorepo 项目或父目录配置中的任务）会归到代表该配置根目录的跨度下：

```text
mise run //packages/frontend:lint …       ← root span
├── resolve tasks                         ← setup span
├── install tools                         ← setup span
├── deps                                  ← setup span
├── start daemons                         ← setup span
├── packages/frontend                     ← monorepo group span
│   ├── //packages/frontend:lint          ← task span
│   ├── //packages/frontend:typecheck     ← task span
│   └── //packages/frontend:build         ← task span
├── packages/backend                      ← monorepo group span
│   └── //packages/backend:test           ← task span
└── //:deploy                             ← task span (direct child of root)
```

根跨度以你指定任务的完整解析名称命名。任务跨度使用任务的完整名称及其参数，例如 `//:deploy prod`。如果运行过程获取了[远程任务](/tasks/toml-tasks.html#remote-tasks)，还会出现一个 `fetch tasks` 初始化跨度。mise 对项目的命名方式请参阅 [Monorepo 任务](/tasks/monorepo.html)。

根跨度的属性为 `mise.span_type = "run"`，初始化跨度为 `"setup"`，分组跨度则包含 `"monorepo_group"` 和 `mise.config_root`（即该组的配置根目录）。任务跨度没有 `mise.span_type` 属性。

### 跨度计时

mise 确定要运行的任务后，根跨度便开始计时；最后一个任务结束后，根跨度随之结束。初始化跨度展示了第一个任务开始前的耗时分布，包括获取远程任务、解析任务依赖图、安装缺失工具、运行依赖提供程序以及启动守护进程。在全新的 CI 运行器上首次运行较慢时，通常会看到较长的 `install tools` 跨度。初始化阶段失败时，该阶段的跨度和根跨度都会标记为错误。

mise 开始处理任务时，任务跨度就会启动。因此，从跨度开始到任务首次输出之间的间隔，表示 mise 正在准备该任务所需的工具和环境。根跨度中未被子跨度覆盖的时间属于调度开销，以及等待空闲任务槽位的时间（参见 [`jobs`](/configuration/settings.html#jobs)）。分组跨度会一直保持开启，直到本次运行结束，因为 mise 无法预先知道该项目是否还有其他任务。

### 任务跨度属性

| 属性                     | 值                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `mise.task.name`         | 任务名称。                                                                                               |
| `mise.task.display_name` | 任务名称及其参数，同时也是跨度名称。                                                                     |
| `mise.task.args`         | 传给任务的参数，以空格连接。仅当存在参数时才会出现。                                                     |
| `mise.task.source`       | 定义该任务的配置文件路径。                                                                               |
| `mise.task.config_root`  | 任务配置文件所属的配置根目录。                                                                           |
| `mise.task.skipped`      | 如果 mise 因源文件均为最新而跳过任务，则为 `true`。                                                       |
| `mise.task.cancelled`    | 如果 mise 因其他任务失败或运行被中断（Ctrl-C）而停止该任务，则为 `true`。                                |
| `process.command_args`   | 按 OpenTelemetry CLI 约定，以字符串数组表示完整 argv（`["mise", task_name, ...args]`）。                 |
| `process.exit.code`      | 任务的整数退出码：成功或任务被跳过时为 `0`，否则为失败命令的退出码。                                     |

### 失败任务与取消任务

除非指定 `--continue-on-error`，失败的任务会停止与其并行运行的任务，因此一次故障可能导致多个任务同时结束。只有真正失败的任务会获得 `Error` 跨度状态。被 mise 停止的任务状态为 `Unset`，并带有 `mise.task.cancelled = true`，这样搜索错误跨度时就能找到真正的故障原因。取消任务是由信号终止的，因此通常没有 `process.exit.code`。由于运行失败，根跨度仍会标记为 `Error`。

在首个任务失败后自行以非零状态退出的任务仍会标记为 `Error`，崩溃的任务也一样。只有被 mise 发送的 SIGTERM 终止，或被 SIGINT 中断的任务才算取消。在 Windows 上，进程终止会报告为普通退出码，因此首个任务失败后结束的其他任务都会记录为已取消。

如果任务所需工具安装失败，该任务不会启动，但由于安装失败导致本次运行停止，它仍会获得一个 `Error` 跨度。

`--timeout` 超时后，mise 会将根跨度标记为 `Error` 并立即刷新导出。此时仍在运行的任务不会被导出。

## 跟踪上下文传播

mise 会按照 [OpenTelemetry 环境载体](https://opentelemetry.io/docs/specs/otel/context/env-carriers/)规范，通过 `TRACEPARENT` 和 `TRACESTATE` 环境变量向每个任务传递跟踪上下文。嵌套运行的 `mise run` 会加入同一条跟踪记录；任务启动的程序只要已使用 OpenTelemetry 插桩（任何语言均可），其跨度就会直接归到该任务跨度下，无需额外设置。

## 日志

日志导出需要单独启用（设置 `otel.logs = true` 或 `MISE_OTEL_LOGS=1`），因为它会向采集器发送任务输出，而不只是计时信息。启用前请阅读[隐私](#privacy)一节。

启用日志导出后，mise 会将任务写入 stdout 或 stderr 的每一行作为 OTLP 日志记录导出，并关联到任务跨度，因此可以直接在跟踪记录中查看输出。stdout 行的严重级别为 `INFO`，stderr 行为 `WARN`，因为许多工具会将进度信息和警告写入 stderr；任务是否失败则由跨度状态和 `process.exit.code` 表示。每条记录都带有 `mise.task.name`；任务含参数时还会带有 `mise.task.args`，以及表示输出流的 `output.stream`（`stdout` 或 `stderr`）。

关联到跨度还需要启用跟踪导出。如果只启用 `otel.logs` 而未启用 `otel.enabled`，日志记录仍会带有跟踪 ID 和跨度 ID，但不会导出对应的跨度。

### 导出内容

mise 会在所有逐行读取输出的模式下导出任务输出：`prefix`、`keep-order`、`timed`、`replacing`、`interleave` 和 `quiet`。`silent` 模式、[静默](/tasks/task-configuration.html#silent)任务的输出，以及使用 `--raw` 时的输出都不会导出。

::: warning
启用日志导出后，`interleave` 和 `quiet` 模式的任务会使用管道而非终端，以便 mise 读取每一行。这可能会影响缓冲、颜色、进度条、提示符以及其他会检查 TTY 的行为。使用 `--raw` 运行此类任务可以保留终端行为，但其输出不会导出。
:::

### 嵌套的 `mise run`

任务运行 `mise run` 时，内部运行的输出也会经过外层任务。mise 每行只导出一次，并将其归到实际打印该行的最内层任务：

```mise-toml
[tasks.outer]
run = "echo building; mise run inner; echo done"
```

`building` 和 `done` 属于 `outer` 跨度，`inner` 打印的所有内容则属于 `inner` 跨度。如果内部运行没有自行导出日志（例如它未启用 `otel.logs` 或使用了 `--raw`），外层运行就会代为导出这些输出。若嵌套运行启用了日志导出，内部 `raw` 或 `interactive` 任务的输出不会由任何一层运行导出。无论采用哪种方式，终端上看到的输出都相同。

## 隐私

mise 导出的所有内容都可能由遥测后端按照其保留策略进行存储和索引，并向所有有权限访问该后端的人开放。跟踪导出会发送每个任务的名称、显示名称、参数、配置文件及配置根目录、`process.command_args`、退出码、计时信息和状态。日志导出还会发送任务写入 stdout 和 stderr 的每一行。

- 请通过环境变量传递机密，不要放在参数中。除非参数符合[脱敏规则](/environments/secrets/#redaction)，否则会被导出，例如 `mise run deploy -- --token=hunter2`；环境变量不会导出。
- 启用 `otel.logs = true` 时，任务打印的任何机密都会被导出，包括通过 `set -x` 或调试日志意外泄露的内容。
- 脱敏规则适用于导出的参数、跨度名称、错误消息和日志行，但只会隐藏你列出的值，不会自动识别机密。
- `--raw` 模式下的输出永远不会导出，脱敏规则也不适用于这些输出。

若要让任务输出仅保留在本机，请不要启用 `otel.logs`。

## 行为与限制

- 如果既未启用 `otel.enabled` 也未启用 `otel.logs`，mise 不会创建跟踪上下文，也不会导出任何内容。
- 离线模式（[`offline`](/configuration/settings.html#offline) 或 `MISE_OFFLINE=1`）会关闭导出。
- 导出失败不会导致任务失败。设置 `MISE_DEBUG=1` 运行即可查看相关错误。
