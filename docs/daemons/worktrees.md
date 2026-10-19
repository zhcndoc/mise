---
description: 在多个 Git worktree 中同时运行相同的守护进程，并为每个 worktree 分配独立 ID、端口和稳定的 HTTPS 主机名。
socialDescription: 为每个 Git worktree 分配独立的守护进程 ID、端口和 HTTPS 主机名。
---

# 端口、URL 与 worktree <Badge type="warning" text="实验性" />

在同一项目的多个 Git worktree 中同时运行相同的 daemon。每个检出目录都有独立的 daemon ID、端口和数据；pitchfork 代理还会为每个 HTTP daemon 分配固定主机名，即使端口发生变化也不会改变。

::: warning 实验性功能
Daemon 功能仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true` 启用；详见[要求](/daemons.html#requirements)。
:::

With `namespace = "shop"` and `port = { auto = true, base = 3000 }`, an `api`
daemon looks like this in the primary checkout and in a linked worktree:

|                | 主检出目录 `~/src/shop`         | 链接的 worktree `~/src/shop-pr-42`       |
| -------------- | ----------------------------- | --------------------------------------- |
| Daemon ID      | `shop/api`                    | `shop-<hash>/api`                       |
| 端口           | `3000`                        | 根据路径分配 `3001` 至 `3511` 之一      |
| URL            | `https://api.shop.localhost`  | `https://api.shop-pr-42.shop.localhost` |
| 状态与数据     | 独立目录                      | 独立目录                                |

## 命名空间 {#namespaces}

Daemon 的完整 ID 格式为 `<namespace>/<name>`。如果项目未设置命名空间，也没有自己的 pitchfork 配置文件，mise 会根据项目目录名称和路径哈希生成命名空间，以区分不同检出目录（具体优先顺序见下文）。设置 `namespace` 可为 daemon 指定可预测的 ID，供其他项目在 `depends` 中引用：

```toml
[daemons_settings]
namespace = "services"

[daemons.db]
preset = "postgres"
version = "18"
```

在主检出目录中，数据库 ID 为 `services/db`。数据库向 pitchfork 注册后，其他项目中的 daemon 可以设置 `depends = ["services/db"]`。如果还需要 mise 加载并注册另一个项目的配置，请使用 [`project` 引用](/daemons/sharing.html#use-a-daemon-from-another-project)。

命名空间遵循与 daemon 名称相同的规则：只能使用 ASCII 字母、数字、`.`、`_` 和 `-`；不能为空或仅为 `.`，不能以 `-` 开头或结尾，也不能包含 `..` 或 `--`。

mise 按以下优先顺序选择命名空间：

1. `[daemons_settings]` 中的 `namespace`；在链接的 worktree 中会添加[后缀](#namespaces-in-git-worktrees)，除非设置 `namespace_per_worktree = false`。
2. 项目自己的 pitchfork 配置中的 `namespace`，按以下顺序检查：`pitchfork.local.toml`、`pitchfork.toml`、`.config/pitchfork.local.toml`，然后是 `.config/pitchfork.toml`。
3. 如果上述某个文件存在但没有 `namespace`，则使用项目目录名称。
4. 其他情况下使用 `<directory>-<hash>`。

更改项目命名空间前，请先停止该项目的 daemon。下次启动时会采用新命名空间，并从 mise 状态中移除旧 ID。

### 命名空间继承 {#namespace-inheritance}

`[daemons_settings]` 会逐键合并多个配置文件中的设置，因此只在 `mise.local.toml` 中设置 `namespace_per_worktree` 时，仍会沿用 `mise.toml` 中的 `namespace`。子项目会继承父项目配置中的 daemon 设置。如果多个项目继承同一命名空间，请为它们的 daemon 使用不同名称，或在每个项目中分别设置命名空间。mise 会拒绝已加载项目之间的重复 ID，但无法检测该项目层级及其引用之外的冲突。

全局和系统配置不能设置 `[daemons_settings]`；mise 会忽略其中的该表格并发出警告。

### Git worktree 中的命名空间 {#namespaces-in-git-worktrees}

链接的 Git worktree 会为 `[daemons_settings]` 中的命名空间添加后缀；从 pitchfork 文件读取的命名空间则在所有 worktree 中保持不变。设置 `namespace = "services"` 时，主检出目录使用 `services`，链接的 worktree 使用 `services-<hash>`，其中 `<hash>` 是该 worktree 中项目根路径的十六进制哈希（最多 16 个字符）。每个检出目录都有独立的 daemon ID 和状态。

对 `services/db` 的直接依赖始终指向这个确切 ID，不会跟随当前 worktree 的后缀。如果依赖应在特定检出目录内解析，请使用本地 daemon 名称或 `project` 引用。

若要让多个 worktree 共用一个命名空间，请关闭后缀：

```toml
[daemons_settings]
namespace = "services"
namespace_per_worktree = false
```

只有确实要共享 daemon ID 时才这样设置。否则从多个 worktree 同时启动相同 daemon 会发生冲突。

## 端口 {#ports}

### 固定端口 {#fixed-ports}

若要让所有检出目录使用相同端口，请将 `port` 设为整数。mise 不会搜索空闲端口或自动更换端口，因此 daemon 启动时配置的端口必须全部可用。自定义 daemon 也接受 pitchfork 的结构化 `port` 表格，mise 会原样传递；预设则只接受整数或[自动端口](#automatic-ports)。

### 命名端口 {#named-ports}

有多个监听端口的预设会使用命名端口，具体见[预设表格](/daemons/presets.html)。可以使用 `ports.<name>` 覆盖其中一个端口，也可以同时覆盖主端口：

```toml
[daemons.crdb]
preset = "cockroachdb"
version = "26"
port = 26258
ports.http_port = 8081
```

Daemon 的主端口和命名端口必须各不相同。设置 `port = "auto"` 后，命名端口会随主端口一起偏移，因此每个检出目录都有一组完整的端口。手动设置的命名端口则会按填写值使用。

mise 会将每个命名端口导出为 `<NAME>_<PORT_NAME>`，daemon 名称按[端口变量](#port-variables)中的规则转换：使用 `cockroachdb` 预设的 `crdb` daemon 会导出 `CRDB_HTTP_PORT`，名为 `authz` 的 `spicedb` daemon 则会导出 `AUTHZ_HTTP_PORT` 和 `AUTHZ_METRICS_PORT`。这些变量的值就是 daemon 使用的端口，因此请直接读取，而不要自行增加偏移量：

```toml
[daemons.crdb]
preset = "cockroachdb"
version = "26"
port = "auto"

[env]
COCKROACH_CONSOLE = "http://127.0.0.1:{{ env.CRDB_HTTP_PORT }}"
```

### 自动端口 {#automatic-ports}

设置 `port = "auto"`，即可在主检出目录和链接的 worktree 中运行相同 daemon，而无需手动分配端口：

```toml
[daemons.postgres]
preset = "postgres"
version = "18"
port = "auto"
```

主检出目录使用预设默认端口 `5432`。在链接的 worktree 中，mise 会根据项目根路径计算偏移量。`PGPORT` 和 `DATABASE_URL` 等连接变量会采用解析后的端口，因此应用配置在每个检出目录中都无需更改。

mise 加载配置时就会解析自动端口，因此 daemon 启动前，`mise env` 和 `mise exec` 已会显示这些端口。mise 不会查找空闲端口，也不会在端口被占用时更换端口；详见[端口冲突](#port-conflicts)。

自定义 daemon 没有默认端口，因此请使用表格形式并指定 `base`：

```toml
[daemons.api]
run = "exec npm run dev -- --port $API_PORT"
port = { auto = true, base = 3000 }
```

mise 会将解析后的端口导出为 `API_PORT`；详见[端口变量](#port-variables)。此示例假设应用的 `dev` 脚本接受 `--port` 参数。主检出目录使用 `3000`，链接的 worktree 使用 `3001` 至 `3511` 范围内的端口。固定的 `ready_port` 不会跟随自动端口变化，因此请省略它，或使用会读取解析后端口的就绪检查。

| 选项     | 含义                                      | 默认值                                                 |
| -------- | ----------------------------------------- | ------------------------------------------------------ |
| `auto`   | 启用自动端口，必须设为 `true`。             | 表格形式中必填                                         |
| `base`   | 主检出目录使用的端口                      | 预设默认端口；自定义 daemon 必填                       |
| `stride` | worktree 槽位之间的间隔                    | `1`                                                    |

共有 511 个 worktree 槽位。使用默认间隔时，链接的 worktree 中 PostgreSQL 使用 `5433` 至 `5943`，Redis 使用 `6380` 至 `6890`。如果服务会绑定一段连续端口，请将 `stride` 设为该范围的大小，例如 `port = { auto = true, base = 3000, stride = 10 }`。这样不同槽位之间会间隔 10 个端口，但无法避免两个项目分配到同一槽位。如果解析后的端口超过 `65535`，加载配置会失败。

### 端口变量 {#port-variables}

带有整数或自动 `port` 的自定义 daemon 会导出 `<NAME>_PORT`。mise 会将 daemon 名称转成大写，并将标点替换为下划线：`[daemons.api]` 导出 `API_PORT`，`[daemons.web-ui]` 导出 `WEB_UI_PORT`。预设则会使用解析后的端口导出自身连接变量，例如 `PGPORT` 和 `REDIS_URL`。这些变量可通过 `mise env`、`mise exec` 和 daemon 自身的进程环境获取。显式设置的 `[env]` 值优先于这些变量。

如果 daemon 名称以数字开头，或两个名称转换后得到相同变量（`web-ui` 和 `web_ui`），mise 会发出警告，并且不会为它们导出 `<NAME>_PORT` 或 `<NAME>_URL`。Daemon 仍会运行，pitchfork 也仍会在进程中设置 `$PORT`。预设自己的变量优先于派生变量，因此自定义 daemon 的 `<NAME>_PORT` 与预设命名端口变量冲突时，会以预设变量为准。

### 项目布局与端口稳定性 {#project-layout-and-port-stability}

即使 `mise.toml` 位于 `packages/api` 之类的子目录中，mise 也会找到所属的检出目录。链接的 worktree 中的每个项目根目录都会获得自己的槽位。子模块沿用其所属检出目录的设置：在链接的 worktree 中使用偏移端口，在主检出目录中使用基准端口。

独立克隆（包括使用 `git clone --separate-git-dir` 的克隆）以及 Git 仓库之外的项目都会使用基准端口。裸仓库的所有 worktree 都会使用偏移端口，因为它没有主检出目录。若要为某个检出目录指定固定端口，请在已加入 gitignore 的 `mise.local.toml` 中使用整数 `port`[重新声明 daemon](/daemons.html#override-a-daemon)。

Daemon 注册后，即使升级 mise 也会保留其自动端口。更改 `base` 或 `stride` 会分配新端口；之后请重启 daemon。`mise daemons ls --json` 会显示每个 daemon 的 `port`；自动端口的 `port_auto` 值为 `true`。

### 端口冲突 {#port-conflicts}

同一项目中的两个 daemon 不能共用一个端口。mise 加载配置时会报告冲突，而不是等第二个 daemon 绑定失败。一个预设的两个实例通常会触发此问题，因为它们使用相同的基准端口。请为第二个实例单独设置 `port`；若两者都使用 `port = "auto"`，则为其指定不同的 `base`：

```toml
[daemons]
postgres = "18"

[daemons.analytics]
preset = "postgres"
version = "18"
port = { auto = true, base = 5500 }
```

自动端口根据路径计算，因此不同项目可能会获得相同端口。如果另一个 mise 项目已有 daemon 正在使用该端口，启动会失败，并报告 daemon 名称及其项目根目录。请更改其中一个项目的 `base`，或停止另一个 daemon，然后重试。

已停止的 daemon 不会占用端口。检查只针对正在启动的 daemon，因此本项目 PostgreSQL 端口冲突不会阻止 `mise daemons start redis`。固定端口和自动端口都会执行此检查。

此检查不会预留端口，也无法查看所有监听进程。未受管理的进程、无法连接的 supervisor，或两个项目同时启动，仍可能造成普通的端口绑定失败。mise 会保留选定的端口，而不会尝试其他端口，因此已打开的 shell 会继续使用相同连接设置。

如果端口已被占用，pitchfork 会启动失败。对于自动端口，mise 会发出警告，指出 daemon、端口及该端口是基准端口还是 worktree 偏移端口。若要在此检出目录中使用其他端口，请在已加入 gitignore 的 `mise.local.toml` 中重新声明该 daemon，指定固定 `port` 或不同的 `base`，并重复其余所需键：

```toml
# mise.local.toml
[daemons.api]
run = "exec npm run dev -- --port $API_PORT"
port = 3100
```

## 为每个 worktree 分配稳定 URL {#stable-urls-per-worktree}

不同的端口意味着每项服务都必须知道其他服务的位置。对于 HTTP 服务，pitchfork 反向代理可以省去此步骤：它会将固定主机名路由到 daemon 绑定的端口，而 mise 加载配置时也会生成相同的主机名。必须在 pitchfork 中启用代理；请参阅开发环境指南中的[开始之前](/daemons/development-stack.html#before-you-start)。

如果 daemon 设置了 `port` 且没有设置 `proxy = false`，它就会获得主机名：

```text
<daemon>.<project>.<tld>              主检出目录
<daemon>.<worktree>.<project>.<tld>   链接的 Git worktree
```

Daemon 部分是其名称。项目部分在设置 `[daemons_settings] namespace` 时使用该值，否则使用主检出目录的名称（详见[选择主机名标签](#choose-hostname-labels)）。链接的 worktree 会增加自己的标签。例如，检出到 `~/src/shop` 且设置了 `namespace = "shop"` 的项目，会通过 `https://api.shop.localhost` 提供其 `api` daemon；链接到 `~/src/shop-pr-42` 的 worktree 则通过 `https://api.shop-pr-42.shop.localhost` 提供该服务。两者可以同时运行，端口改变也不会影响 URL。

mise 会按与 `<NAME>_PORT` 相同的命名规则导出 `<NAME>_URL`，因此其他服务无需知道端口即可使用该 URL：

```toml
[daemons.api]
run = "exec npm run dev -- --port $API_PORT"
port = { auto = true, base = 3000 }

[env]
APP_BASE_URL = "{{ env.API_URL }}"
```

如果所有 HTTP 服务都通过这种方式访问彼此，同一项目的多个 worktree 就能同时运行，无需维护端口表。数据库仍使用 `port = "auto"`：代理处理的是 HTTP，而数据库客户端不使用 HTTP，因此所有预设都不会使用代理，并继续导出自身的连接变量，例如 `PGPORT`、`DATABASE_URL` 和 `REDIS_URL`。

未设置 `port` 或设置了 `proxy = false` 的 daemon 不会获得主机名，也不会导出 `<NAME>_URL`。`mise daemons urls` 仍会列出它，但不显示 URL；如果它设置了端口，则会显示端口。

### 单个 daemon 的代理设置 {#per-daemon-proxy-settings}

Daemon 可以使用不同的主机名标签，也可以不分配主机名：

```toml
# https://front.shop.localhost，而不是 https://web.shop.localhost
[daemons.web]
run = "exec npm run dev"
port = 5173
proxy = "front"

# 不分配主机名或 WORKER_URL，只能通过端口访问。
[daemons.worker]
run = "exec npm run worker"
port = 9000
proxy = false
```

对于不使用 HTTP 的自定义 daemon，请设置 `proxy = false`。代理处理 HTTP，因此名为 `redis` 的自定义 Redis daemon 如果不关闭代理，就会获得 `https://` 主机名以及指向该主机名的 `REDIS_URL`，而 Redis 客户端无法使用这种配置。

`proxy = true` 会为预设分配主机名，并使用 daemon 名称作为标签。预设仍不会导出 `<NAME>_URL`。

`proxy_tls` 用于设置代理如何处理 TLS。默认值 `"terminate"` 会在代理处提供 HTTPS，并向 daemon 转发普通 HTTP。如果 daemon 自己提供 TLS，且连接需要端到端保持不变，请使用 `"passthrough"`：

```toml
[daemons.api]
run = "exec npm run dev:https"
port = 3000
proxy_tls = "passthrough"
```

这两个键都会原样传递给 pitchfork，并要求 pitchfork 2.26.0 或更高版本。旧版 supervisor 可以启动 daemon，但不会提供对应主机名的服务。

### 选择主机名标签 {#choose-hostname-labels}

项目标签为去除 worktree 后缀后的 `[daemons_settings] namespace`；如果未设置，则使用主检出目录的名称。不会使用从 pitchfork 文件读取的命名空间。mise 注册项目时会将项目标签传给 pitchfork。如果已安装的 pitchfork 不支持接收标签，请显式设置 `namespace`，否则 mise 打印的 URL 将无法路由。

Worktree 标签默认为链接的 worktree 目录名。若要自行指定，请在该 worktree 内的 pitchfork 配置文件中设置 `worktree_label`，pitchfork 会从该位置读取：

<!-- schema: skip -->

```toml
# worktree 中的 pitchfork.local.toml
worktree_label = "pr-42"
```

mise 会从相同位置读取该键，因此导出的 URL 和代理实际提供服务的主机名保持一致。请使用 `pitchfork.local.toml` 并将其加入 gitignore：跟踪的文件会被所有检出目录共用，而每个 worktree 都需要不同的标签。

如果项目没有设置 `[daemons_settings] namespace`，也没有其他 pitchfork 文件，那么如[命名空间优先顺序](#namespaces)的第 3 项所述，该文件还会将 worktree 命名空间从 `<directory>-<hash>` 改为其目录名称。添加该文件前，请先停止 worktree 的 daemon。

标签会转换为小写字母、数字和 `-`。如果两个 daemon、worktree 或项目转换后得到相同主机名，pitchfork 就不会为其中任何一个路由，因此 mise 不会为它们导出 URL，并会发出警告。Daemon 仍会在各自端口运行。如果其中恰有一个冲突项是当前项目通过 `project` 引用的 daemon，则由该 daemon 所属项目进行注册，pitchfork 会为它提供服务，而本地 daemon 不会获得 URL；警告中会指出该项。

裸仓库的 worktree 没有主检出目录，因此各自使用目录名称作为标签，且主机名中不包含 worktree 部分：位于 `shop/main` 的 daemon 主机名是 `api.main.localhost`，而不是 `api.main.shop.localhost`。不要在这些 worktree 共用的配置文件中设置 `namespace`，否则它们会获得相同主机名，无法通过 `worktree_label` 区分；mise 检测到这种情况时会发出警告。请改为在每个 worktree 已加入 gitignore 的 `mise.local.toml` 中分别设置命名空间：

```toml
# 裸仓库某个 worktree 中的 mise.local.toml
[daemons_settings]
namespace = "shop-pr-42"
```

### 注册以便按需启动 {#register-for-on-demand-startup}

在每个检出目录中运行 [`mise daemons register`](/cli/daemons/register.html)，将其中的 daemon 注册到 pitchfork，但不启动它们。该命令会安装缺失工具、检查定义及其依赖项，并包含 `default` 组之外的 daemon，以及其依赖的其他项目中的 daemon。已运行的 daemon 会继续运行；注册不会重启它们，也不会初始化数据库数据。

Supervisor 正在运行且代理已启用时，首次请求已注册的主机名会启动对应 daemon 及其依赖项。列出 URL 不会注册项目。[开发环境指南](/daemons/development-stack.html)介绍了完整设置流程。

### 列出 URL {#list-urls}

[`mise daemons urls`](/cli/daemons/urls.html) 会按项目根目录分组，列出每个 daemon 的主机名和绑定端口，最后列出 pitchfork 为整个服务栈提供的页面。以下配置位于 `~/src/shop-pr-42` 链接 worktree 中，并使用上方设置的 `worktree_label = "pr-42"`：

```toml
[daemons_settings]
namespace = "shop"

[daemons.api]
run = "exec npm run dev -- --port $API_PORT"
port = { auto = true, base = 3000 }
proxy_tls = "passthrough"

[daemons.web]
run = "exec npm run dev"
port = { auto = true, base = 5173 }
proxy = "front"

[daemons.postgres]
preset = "postgres"
version = "18"
port = "auto"
```

```text
~/src/shop-pr-42
Daemon                          URL                                 Port  Proxy        Status
shop-33110356f24e9076/api       https://api.pr-42.shop.localhost    3187  passthrough  running
shop-33110356f24e9076/web       https://front.pr-42.shop.localhost  5360  terminate    running
shop-33110356f24e9076/postgres  -                                   5619  off          running
  stack:   https://pr-42.shop.localhost
  project: https://shop.localhost
```

ID 后缀是 worktree 的[命名空间哈希](#namespaces-in-git-worktrees)，三个 daemon 使用相同的 worktree 槽位 187。Proxy 列显示 daemon 的 `proxy_tls` 模式；没有主机名时显示 `off`。数据库仍会列出其端口。主检出目录不会打印 stack 页面，因为它的服务栈就是项目本身。`mise daemons ls --json` 会在 `host`、`url` 和 `proxy` 字段中提供相同信息。

### 停止空闲 daemon {#stop-idle-daemons}

访问 daemon 的 URL 会启动该 daemon 及其 `depends` 依赖项（如果它们尚未运行）。默认情况下，pitchfork 不会停止它们，因为空闲关闭功能处于关闭状态。设置 `proxy_idle_timeout` 后，pitchfork 会在代理流量中断指定时长后停止 daemon：

```toml
[daemons.web]
run = "exec npm run dev"
port = 5173
depends = ["db"]
proxy_idle_timeout = "30m"

[daemons.db]
preset = "postgres"
version = "18"
```

访问 `https://web.shop.localhost` 后会启动 `db` 和 `web`。最后一个请求结束 30 分钟后，`web` 会停止；如果没有其他服务依赖 `db`，它也会停止。下次访问时会再次启动两者。

| `proxy_idle_timeout`     | 效果                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 未设置                   | 使用触发该 daemon 启动的请求所属 daemon 的超时时间；否则使用 pitchfork 的 `proxy.idle_timeout`（未设置时默认为关闭）           |
| `"30m"`、`"1h"`、`"90s"` | 代理流量中断指定时长后停止 daemon                                                                                          |
| `false` 或 `"0"`        | 不会因空闲而停止 daemon，即使它是设有超时的 daemon 的依赖项或设置了 `proxy.idle_timeout`                                   |

若要为所有由代理启动的 daemon 启用空闲关闭功能，请设置 pitchfork 的 `proxy.idle_timeout`，例如设置环境变量 `PITCHFORK_PROXY_IDLE_TIMEOUT=15m`，或在 pitchfork 用户配置的 `[settings.proxy]` 下设置 `idle_timeout = "15m"`。已经运行的依赖项会保留启动时采用的超时时间。

只有由代理启动的 daemon 会按此方式停止。通过 `mise daemons start`、shell hook 或 `boot_start` 启动的 daemon 及其依赖项，无论空闲多久都会继续运行。请求在响应完成前都会被视为活动状态；打开的 WebSocket、流式响应或 TLS 直通连接也会让 daemon 保持活动状态，因此持有热重载连接的浏览器标签页会让开发服务器持续运行。直接发送到 daemon 端口的流量不计为活动请求，因此客户端直接连接的 daemon 应将此项设为 `false`。

pitchfork 每隔 `general.interval` 检查空闲 daemon；只有当没有正在运行的 daemon 依赖它，且没有受跟踪的 shell 会话需要它时，才会将其停止，因此 daemon 实际运行时间可能略微超过超时值。详见 pitchfork 的[空闲关闭规则](https://pitchfork.jdx.dev/guides/port-management#idle-shutdown)。

### URL 协议与端口的来源 {#where-the-scheme-and-port-come-from}

mise 会按照 pitchfork 相同的规则生成 URL：协议由 `proxy.https` 决定，顶级域由 `proxy.tld` 决定，只有非标准端口才会显示在 URL 中。mise 从 `/etc/pitchfork/config.toml`、用户文件 `~/.config/pitchfork/config.toml`（如果设置了该变量，则使用 `$PITCHFORK_CONFIG_DIR/config.toml`）和 `PITCHFORK_PROXY_*` 环境变量中读取这些设置；环境变量优先级最高。pitchfork 文件中项目自己的 `[settings.proxy]` 会被忽略。在 pitchfork 的 LAN 模式下（`proxy.lan = true` 或设置了 `proxy.lan_ip`），顶级域为 `local`。

如果没有任何 pitchfork 配置，mise 会使用 pitchfork 默认值：通过 `https://` 和 443 端口访问 `.localhost` 域名。因此即使尚未启用代理，`mise env` 也会导出 URL。请参阅 pitchfork 的[端口管理指南](https://pitchfork.jdx.dev/guides/port-management)启用代理并信任其证书。
