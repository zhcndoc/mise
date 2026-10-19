---
description: 使用内置服务预设，将 PostgreSQL、Redis、CockroachDB、NATS 和 SpiceDB 作为项目 daemon 运行。
socialDescription: 将 PostgreSQL、Redis、CockroachDB、NATS 和 SpiceDB 作为项目 daemon 运行。
---

# 服务预设 <Badge type="warning" text="实验性" />

服务预设用于在本地开发时运行常见服务，并提供启动命令、待安装工具、就绪检查、数据目录以及供应用程序读取的连接变量。

::: warning 实验性功能
Daemon 功能仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true` 启用；详见[要求](/daemons.html#requirements)。
:::

| 预设                          | 工具          | 默认端口     | 命名端口                              | 其他依赖         |
| ----------------------------- | ------------- | ------------ | ------------------------------------- | ---------------- |
| [`postgres`](#postgresql)     | `postgres`    | 5432         | None                                  |                  |
| [`redis`](#redis)             | `redis`       | 6379         | None                                  |                  |
| [`cockroachdb`](#cockroachdb) | `cockroach`   | 26257        | `http_port` 8080                      |                  |
| [`nats`](#nats)               | `nats-server` | 4222         | `monitor_port` 8222                   | `curl` on `PATH` |
| [`spicedb`](#spicedb)         | `spicedb`     | 50051        | `http_port` 8443, `metrics_port` 9090 | `curl` on `PATH` |

NATS 和 SpiceDB 使用 `curl` 执行 HTTP 就绪检查。

::: warning 仅限本地开发
这些预设监听回环地址，并且不启用身份验证或使用固定的开发密钥。请仅在可信的本地计算机上使用。在共享或不可信的环境中，请编写自定义 daemon 并配置适当的身份验证和网络限制。
:::

## 声明预设 {#declare-a-preset}

使用预设名称作为条目名，并指定所需版本：

```toml
[daemons]
postgres = "18"
redis = "8"
```

若要运行同一预设的第二个实例，或更改其端口、选项或数据目录，请使用表格。表格名会成为 daemon 的名称：

```toml
[daemons.analytics]
preset = "postgres"
version = "18"
port = 5433
options.database = "analytics"
```

预设会使用上表中的工具安装对应服务。若要改用其他工具安装，请设置 `tool`。预设接受的所有键请参阅 [Daemon 配置键](/daemons.html#daemon-keys)。

由于这些服务的客户端不使用 HTTP，预设不会获得代理主机名。若要更改此行为，请参阅[单个 daemon 的代理设置](/daemons/worktrees.html#per-daemon-proxy-settings)。

## 连接变量与工具版本 {#connection-variables-and-tool-versions}

每个预设都会导出连接变量，具体列表见下方对应小节。这些变量可通过 `mise env`、`mise exec` 和任务使用。显式设置的 `[env]` 值会覆盖预设导出的值。若多个实例导出同一变量，以最后声明的实例为准；请用 `[env]` 选择应用程序要连接的实例。

显式指定的 `[tools]` 版本必须满足预设的版本请求。例如，预设请求 `"18"` 时，`[tools]` 中的 `postgres = "18.1"` 符合要求。共用同一工具的实例必须使用相同的版本请求。

## 端口 {#ports}

每个预设都会监听默认端口，以及（若有）命名端口。设置 `port` 可更换默认端口，设置 `port = "auto"` 可为每个 Git worktree 分配独立端口，设置 `ports.<name>` 可更改命名端口。详见[端口](/daemons/worktrees.html#ports)。

## 预设选项 {#preset-options}

可为预设实例设置选项，例如 `options.database = "app"`。文件路径相对于项目根目录解析，开头的 `~/` 会展开为 home 目录。mise 加载配置时会检查选项类型和格式。数据库名称只能包含字母、数字和下划线。

首次初始化时使用的选项（例如数据库名称和 CockroachDB 集群设置）更改后不会影响现有数据。SpiceDB 会在每次启动时根据当前数据存储选项运行迁移。

### PostgreSQL

PostgreSQL 使用 `postgres` 用户，并通过本地 trust 认证。设置 `options.database` 可在首次初始化时创建数据库；默认值为 `postgres`。之后更改此选项不会在现有集群中创建另一个数据库。

PostgreSQL 不会以 root 身份运行。请以普通用户运行 mise 来启动它，例如在容器镜像中使用 `USER`。以 root 身份启动 PostgreSQL daemon 或 provider 时，会在 mise 安装任何内容之前失败。

导出变量：`PGHOST`、`PGPORT`、`PGUSER`、`PGDATABASE` 和 `DATABASE_URL`。

### Redis

Redis 启用了仅追加持久化，且没有可配置选项。

导出变量：`REDIS_URL`。

### CockroachDB

CockroachDB 会以 `root` 数据库用户运行单节点非安全集群。

| 选项         | 默认值        | 说明                                                             |
| ------------ | ------------- | ---------------------------------------------------------------- |
| `database`   | `"defaultdb"` | Database named in exported connection strings                    |
| `databases`  | `[]`          | Databases to create during first initialization                  |
| `settings`   | `[]`          | Cluster setting assignments to apply during first initialization |
| `locality`   | `""`          | Node locality passed to `--locality`                             |
| `max_offset` | `""`          | Clock offset limit passed to `--max-offset`, such as `"500ms"`   |

`database` 用于选择连接字符串中的数据库，不会创建数据库。要创建数据库，请将名称加入 `databases`。每个 `settings` 条目都是一个赋值，例如 `"sql.defaults.vectorize = 'off'"`；mise 会在前面加上 `SET CLUSTER SETTING`。

`databases` 条目可以使用 `name=region` 指定主区域。请在 `locality` 中声明相同区域，以便初始化时该区域已存在：

```toml
[daemons.crdb]
preset = "cockroachdb"
version = "26"
options.database = "app"
options.databases = ["app=us-east-2"]
options.locality = "region=us-east-2"
```

导出变量：`COCKROACH_HOST`、`COCKROACH_URL` 和 `DATABASE_URL`。

### NATS

NATS 默认启用 JetStream，并将数据保存在 daemon 的数据目录中。

| 选项                  | 默认值  | 说明                                                       |
| --------------------- | ------- | ---------------------------------------------------------- |
| `jetstream`           | `true`  | Enable JetStream when no configuration file is supplied    |
| `config`              | `""`    | Path to a NATS configuration file                          |
| `tls_cert`, `tls_key` | `""`    | Paths to the server certificate and private key            |
| `tls_ca`              | `""`    | Path to a CA certificate for verifying client certificates |

设置 `config` 后，由该文件控制是否启用 JetStream 以及数据的存储位置。此时 mise 不会传入 JetStream 或存储相关标志，`jetstream` 选项也不会生效。

同时设置 `tls_cert` 和 `tls_key` 可启用 TLS。`tls_ca` 依赖这两个选项，并会启用客户端证书验证。

导出变量：`NATS_URL` 和 `NATS_MONITORING_URL`。启用 TLS 后，`NATS_URL` 会使用 `tls://` 协议，以便客户端通过 TLS 连接。

### SpiceDB

SpiceDB 默认使用内存数据存储，因此进程停止后授权数据会丢失。若要持久保存数据，请将 `datastore_engine` 设为 `memory` 以外的值，并同时设置 `datastore_uri`。只设置其中一项会报错。

| 选项               | 默认值           | 说明                                     |
| ------------------ | ---------------- | ---------------------------------------- |
| `datastore_engine` | `"memory"`       | Backing datastore engine                 |
| `datastore_uri`    | `""`             | Connection URI for the backing datastore |
| `datastore_daemon` | `""`             | Local daemon to wait for before starting |
| `preshared_key`    | `"mise-dev-key"` | gRPC preshared key                       |

使用持久化数据存储时，mise 会在每次启动前运行 `spicedb migrate head`。若数据存储由另一个 daemon 提供，请像[下方示例](#example-cockroachdb-spicedb-and-nats)一样设置 `datastore_daemon`。此选项只控制启动顺序：`datastore_uri` 是字面字符串，不会跟随该 daemon 的[自动端口](/daemons/worktrees.html#automatic-ports)。若端口发生变化，也请更新 URI。

导出变量：`SPICEDB_ENDPOINT` 和 `SPICEDB_PRESHARED_KEY`。

## 示例：CockroachDB、SpiceDB 和 NATS {#example-cockroachdb-spicedb-and-nats}

此配置将应用程序数据和 SpiceDB 授权数据分别存入 CockroachDB 的不同数据库，并使用 NATS 进行消息传递：

```toml
[settings]
experimental = true

[daemons.crdb]
preset = "cockroachdb"
version = "26"
options.database = "app"
options.databases = ["app", "spicedb"]

[daemons.spicedb]
preset = "spicedb"
version = "1"
options.datastore_engine = "cockroachdb"
options.datastore_uri = "postgresql://root@127.0.0.1:26257/spicedb?sslmode=disable"
options.datastore_daemon = "crdb"

[daemons.events]
preset = "nats"
version = "2"
```

运行 `mise daemons start` 可启动这三个服务。首次初始化时，mise 会创建 `app` 和 `spicedb` 数据库。CockroachDB 就绪后，mise 会运行 `spicedb migrate head`，然后启动 SpiceDB。每次启动都会运行迁移，因此升级或重置数据存储后也会应用待处理的架构变更。

`options.database = "app"` 用于选择导出的 `DATABASE_URL` 和 `COCKROACH_URL` 中的数据库；`options.databases` 列出要创建的数据库。

## Windows {#windows}

- `redis` 预设没有 Windows 版本。
- 其他预设使用 pitchfork 默认的 `cmd /C` shell 运行。不支持使用其他 `windows_shell`。
- 只有 pitchfork 2.29.0 或更高版本能够正常停止 PostgreSQL，该版本会向其发送 Ctrl+C。旧版本会终止 PostgreSQL；它会在下次启动时恢复。
- PostgreSQL 不允许以管理员权限运行。请勿从提升权限的命令提示符或以管理员身份运行的 supervisor 启动它。
- Windows 会为 Hyper-V 和 WSL 保留一些端口范围。使用 `netsh interface ipv4 show excludedportrange protocol=tcp` 列出这些范围；如果预设端口落在其中，请将 `port` 或 `ports` 设为其他值。
- Windows 上无法使用[共享服务器 provider](/daemons/sharing.html#shared-server-providers)。
