---
description: 启动在其他仓库中定义的 daemon，或让多个检出目录共用同一个 PostgreSQL、CockroachDB 或 NATS 服务。
socialDescription: "使用其他仓库的守护进程，或共享数据库服务。"
---

# 在项目间共享 daemon <Badge type="warning" text="实验性" />

项目引用可以运行由其他仓库声明的 daemon，所有使用它的项目共用同一个进程。共享服务器 provider 则从全局配置运行一个数据库或 NATS 服务器，并为每个检出目录分配独立的数据库或账户。

::: warning 实验性功能
Daemon 功能仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true` 启用；详见[要求](/daemons.html#requirements)。
:::

|             | 项目引用                        | 共享服务器 provider                                             |
| ----------- | ------------------------------- | --------------------------------------------------------------- |
| 声明位置    | 其他项目的 `mise.toml`          | 你的全局配置 `~/.config/mise/config.toml`                       |
| 共享内容    | 整个进程及其数据                | 服务器；每个检出目录有自己的数据库或 NATS 账户                   |
| 支持范围    | 任意 daemon                     | `postgres`、`cockroachdb` 和 `nats` 预设                        |
| 平台        | 全部                            | Windows 除外                                                    |

## 使用其他项目的 daemon {#use-a-daemon-from-another-project}

使用 `project` 可运行由另一个检出目录声明的 daemon，而无需复制其声明。例如，`../mirror-pipeline/mise.toml` 声明了一个 worker：

```toml
[daemons.worker]
run = "exec npm run worker"
```

在应用程序的 `mise.toml` 中引用它：

```toml
[daemons.pipeline]
project = "../mirror-pipeline"
name = "worker"

[daemons.api]
run = "exec npm run dev"
depends = ["pipeline"]
```

检查并信任另一个项目的配置后，启动 API。由于 `api` 依赖 worker，mise 会先注册并启动 worker：

```sh
mise trust ../mirror-pipeline
mise daemons start api
```

在命令、`depends` 和任务的 `daemons` 中使用本地名称 `pipeline`。mise 会将它解析为 worker 的完整 ID，因此无需配置命名空间。启动时会跨项目遵循 `depends`，但 `stop` 和 `logs` 只会操作当前项目点名的 daemon，并在拥有这些 daemon 的项目中执行。引用不能成为 [`[daemon_groups]`](/daemons.html#groups) 成员，因为组只包含当前项目声明的 daemon。

### 路径与配置 {#paths-and-configuration}

`project` 接受绝对路径或相对于声明项目根目录的路径。`.config/mise/config.toml` 中的引用也相对于项目根目录解析，而不是相对于配置文件所在目录；继承而来的引用则相对于父项目根目录解析。

`name` 用于选择被引用项目中的 daemon，默认值为本地名称。被引用项目可以从父级配置文件继承 daemon 声明和设置。请直接引用定义该 daemon 的项目；引用不能再指向另一个引用。引用表格只接受 `project` 和 `name`，因此环境变量及其他 daemon 选项应在定义 daemon 的项目中设置。

被引用项目的所有配置（包括继承的文件）都必须获得信任。mise 会报告配置路径，以及检查后需要运行的 `mise trust` 命令。`mise run` 和 `mise daemons start` 不会替你信任其他项目的配置。

### 环境与生命周期 {#environment-and-lifecycle}

Worker 会在自己的项目中运行，并使用该项目的工具、环境、命名空间和数据目录。引用预设不会将其导出的变量（例如 `DATABASE_URL`）加入应用程序环境；请自行配置应用程序的连接。

`mise daemons start` 和 `restart` 会在每个项目中安装缺失的工具，然后启动所选 daemon 及其依赖项。被引用项目中的其他 daemon 会继续注册，并可独立运行。[随 shell 自动启动和停止](/daemons.html#automatic-start-and-stop)只涵盖当前项目自己的 daemon，因此应使用 `mise daemons start` 启动被引用的 daemon。

### 项目缺失或未受信任 {#missing-or-untrusted-projects}

如果被引用的检出目录缺失或未受信任，mise 会忽略该引用，配置的其余部分仍可正常工作。因此，没有检出所有仓库的团队成员仍可使用 `mise run` 和 `mise exec`。点名缺失的 daemon，或启动一个 `depends` 依赖它的 daemon 时，操作会失败，并提示预期路径或需要运行的 `mise trust` 命令。其他 daemon 命令会发出警告后继续，因此你仍可以列出并停止自己的 daemon。mise 不会替你信任任何检出目录。

## 共享服务器 provider {#shared-server-providers}

Provider 是供所有检出目录共用的 PostgreSQL、CockroachDB 或 NATS 服务器，并为每个检出目录提供单独的数据库或 NATS 账户。如果每个 worktree 都运行一个服务器会占用过多内存或磁盘空间，可以使用 provider。请在全局配置 `~/.config/mise/config.toml` 中定义 provider：

```toml
[daemon_providers.local-postgres]
preset = "postgres"
version = "18"
```

Provider 接受 `preset`、`version`、`port`、`ports`、`options`、`data_dir` 和 `tool`（用于从不同于预设默认工具的工具安装服务器）。Provider 名称只能使用小写字母、数字和连字符。通过 `mise daemons providers` 或选择该 provider 的 daemon 使用配置时，mise 会拒绝来自其他配置文件的 `[daemon_providers]` 条目。

Provider 的 `port` 默认值为 `"auto"`。对于 provider，它总是根据 provider 状态目录所对应的槽位偏移预设的默认端口，因此服务器不会与项目自己的预设默认端口冲突。设置整数 `port` 可指定固定端口。`mise daemons providers ls --json` 会显示解析后的端口。

Windows 不支持 provider；请在该平台使用普通项目预设。

使用名称管理 provider：

```sh
mise daemons providers ls --json
mise daemons providers start local-postgres
mise daemons providers stop local-postgres
mise daemons providers restart local-postgres
```

Provider 不会加入项目 daemon 组或 shell 会话，也不会在空闲时停止。若要更改 provider 设置，请编辑全局配置并运行 `mise daemons providers restart`；mise 不允许通过再次启动来更改运行中 provider 的配置。

默认情况下，provider 数据位于 `$MISE_STATE_DIR/daemon-providers/<name>/data`。设置 `data_dir` 可选择其他位置；相对路径会在 provider 的状态目录下解析。删除项目或清理已删除的 worktree 不会删除 provider 数据，重命名 provider 也不会迁移其数据。

Provider 的服务器及就绪检查使用 provider 自己的工具和精简环境运行，不会继承调用项目的环境、工具或配置档案。服务器监听回环地址，并使用预设的本地开发认证方式。

### 在项目中使用 provider {#use-a-provider-from-a-project}

如果某个检出目录应拥有自己的服务器和数据，请保留普通预设声明。若要共用服务器但保留独立数据库，请选择 provider：

```toml
[daemons.db]
provider = "local-postgres"
```

Provider 定义在你自己的全局配置中，因此应从 `mise.local.toml` 或 `mise.dev.toml` 之类的配置档案中选择它，而不是写入共享的 `mise.toml`。该声明会[替换](/daemons.html#override-a-daemon)项目自己的 `db`，没有此 provider 的队友仍会使用自己的服务器。mise 不会替你选择 provider；指定不存在的 provider 会报错。Provider 引用只接受 `provider` 和 `resource`；服务器版本、选项和存储位置应在全局配置中设置。

mise 会根据检出目录的规范路径和 daemon 名称生成数据库名称，因此每个 worktree 或无关项目都会在同一服务器上获得独立数据库。指向同一检出目录的符号链接路径会使用相同数据库。移动检出目录会改变数据库名称，旧数据库仍保留在 provider 上。

若还要共用数据库，请在每个使用方中设置相同的 `resource` 名称：

```toml
[daemons.db]
provider = "local-postgres"
resource = "shared_app"
```

Resource 名称必须以小写字母开头，且最多包含 63 个小写字母、数字或下划线。这可以在开发时区分可信的本地项目，但并非安全边界：SQL 客户端使用预设的本地超级用户认证。

PostgreSQL 和 CockroachDB resource 会导出预设通常提供的连接变量，并指向所选数据库。显式设置的 `[env]` 值仍优先。Provider 的工具版本不会成为使用方的工具版本要求。

启动 `db`、运行包含 `daemons = ["db"]` 的任务，或启动设置了 `depends = ["db"]` 的 daemon 时，都会等待服务器就绪并等待数据库创建完成。`mise daemons register` 会准备好这条依赖链，但不会启动服务器或创建数据库，因此之后访问应用程序主机名时即可将其启动。

每个使用方都有一个由 pitchfork 管理的轻量就绪进程。停止或清理使用方时，会停止该进程，而共享服务器及其数据会保留。即使 provider 已有数据，启动另一个使用方仍会创建其数据库。并发创建会串行执行，已有数据库则会保留。mise 不会运行应用程序迁移，也不会删除数据库。

更改使用方的 `resource` 后，请重启其 daemon。`mise daemons ls --json` 会显示每个 daemon 的 `provider`、`resource` 和 `ownership`；`mise daemons providers ls --json` 会显示服务器端口和存储位置。

### 共享 NATS 服务器但隔离消息 {#share-nats-without-sharing-messages}

NATS provider 会为每个 resource 分配独立账户。各账户拥有独立的 subject 和 JetStream 命名空间，因此两个检出目录可以使用相同的 stream 和 subject 名称，而不会收到对方的消息：

```toml
# ~/.config/mise/config.toml
[daemon_providers.local-nats]
preset = "nats"
version = "2"
```

```toml
# mise.local.toml in the project
[daemons.messages]
provider = "local-nats"
```

与 SQL provider 类似，省略 `resource` 可为每个检出目录分配独立账户；在多个使用方中设置相同的 `resource` 可共享账户及其消息。`NATS_URL` 中包含账户的用户名和密码。

mise 首次解析 NATS resource 的连接设置时会生成持久凭据，包括查看环境变量时。凭据和托管的服务器配置会保存在 provider 状态目录下的私有文件中。查看环境变量不会启动 NATS，也不会创建活动账户。Daemon 列表不会显示密码；请将导出的 `NATS_URL` 视为凭据。

启动使用方时，会通过经过验证的配置重载添加其账户。现有账户及其连接会继续可用。重启 provider 会保留凭据和 JetStream 数据；停止使用方不会删除其账户。设置 `options.jetstream = false` 可关闭 JetStream，同时保留各自独立的 subject 命名空间。

NATS provider 要求使用 mise 管理且仅监听回环地址的配置：不接受自定义配置文件、TLS 或证书认证。若需要这些配置，请使用普通 NATS daemon。mise 不会改写现有 NATS 配置或证书映射。
