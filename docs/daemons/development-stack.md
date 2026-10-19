---
description: 使用项目 daemon 搭建开发环境，为每个 Git worktree 提供固定 URL，并配置登录时启动的管理进程。
socialDescription: 项目 daemon、每个 Git worktree 的 URL，以及登录时启动的管理进程。
---

# 搭建开发环境 <Badge type="warning" text="实验性" />

本指南将配置一个 Node.js API 及其 PostgreSQL 数据库，使访问 `https://api.shop.localhost` 时两者都会启动；每个 Git worktree 都有自己的数据库和 URL，闲置的环境会自动停止。一个在登录时启动的 pitchfork supervisor 会运行这台机器上所有仓库的 daemon，而每个仓库仍在自己的 `mise.toml` 中保留定义。所有选项请参阅 [daemon 概览](/daemons.html)。

::: warning 实验性功能
Daemon 功能仍处于实验阶段。下方配置会在项目的 `[settings]` 中设置 `experimental = true` 启用。
:::

## 开始之前 {#before-you-start}

你需要准备：

- 一个 Git 仓库，其中的开发服务器接受 `--host` 和 `--port` 参数，并提供 `/health` 端点。示例使用 `~/src/shop` 中的 Node.js 应用。
- `curl`，示例的就绪检查会用到它。
- 将 pitchfork 安装到 `PATH`，以使用其 `proxy` 和 `supervisor` 命令：运行 `mise use -g pitchfork`。主机名功能要求 pitchfork 2.26.0 或更高版本，空闲后停止功能要求 2.27.0；详见[要求](/daemons.html#requirements)。

每台机器只需设置一次 pitchfork 本地 HTTPS 代理。在 `~/.config/pitchfork/config.toml` 中启用它：

```toml
[settings.proxy]
enable = true
```

然后将机器的 DNS、证书信任设置和 HTTPS 端口指向代理，并检查配置结果：

```sh
pitchfork proxy setup
pitchfork proxy doctor
```

`pitchfork proxy setup` 会先显示计划，并在更改配置前征求确认。它会用 sudo 执行所需的系统更改，因此 supervisor 本身仍可由普通用户运行。各平台的详情请参阅 pitchfork 的[本地代理设置](https://pitchfork.jdx.dev/guides/port-management#local-proxy-setup)。Supervisor 启动时会读取代理设置；若它已经在运行，请重启：

```sh
pitchfork supervisor stop
pitchfork supervisor start
```

## 定义一个应用 {#define-one-application}

预设用于运行数据库和消息代理，`run` 用于运行应用服务器，`depends` 则列出服务器所需的服务。对于 `~/src/shop` 中的 Node.js 应用，可从以下 `mise.toml` 开始：

```toml
[settings]
experimental = true

[tools]
node = "24"

[daemons_settings]
namespace = "shop"

[daemons.db]
preset = "postgres"
version = "18"
port = "auto"

[daemons.api]
run = "exec npm run dev -- --host 127.0.0.1 --port $API_PORT"
port = { auto = true, base = 3000 }
ready_cmd = "curl -fsS http://127.0.0.1:$API_PORT/health"
depends = ["db"]

[tasks.test]
daemons = ["db"]
run = "npm test"
```

数据库预设会安装 PostgreSQL、检查其就绪状态、保留数据并导出 `DATABASE_URL`。数据库就绪后才会启动 API。请在应用中使用导出的连接变量，而不是将 localhost 端口复制到 `.env` 文件。

请根据应用调整服务器命令和 `/health` 端点。服务器必须监听 `API_PORT`：mise 配置中的端口无法改变应用程序硬编码使用的端口。

信任配置、注册项目并列出 URL：

```sh
cd ~/src/shop
mise trust
mise daemons register
mise daemons urls
```

`mise daemons register` 会安装缺失的工具、检查定义及其依赖项，并向 pitchfork 注册项目，但不会启动任何服务。更改 daemon 声明后请再次运行。`mise daemons urls` 会列出 API 的 `https://api.shop.localhost` 和数据库端口 `5432`。列出 URL 不会注册项目或安装工具。

`mise run test` 会在运行测试前启动数据库。若要手动启动 API，请运行 `mise daemons start api`，并用 `mise daemons logs api` 查看输出。

## 通过 URL 访问 {#open-it-by-url}

访问 `https://api.shop.localhost`。请求会启动数据库、等待其就绪，再启动 API 并转发到该服务。Supervisor 及其代理必须已经运行。仅执行 DNS 查询不会启动 daemon，访问未知主机名也无法注册检出目录。

以此方式启动的 daemon 会持续运行，直到你将其停止。若要在环境闲置时停止它们，请在 `~/.config/pitchfork/config.toml` 中添加空闲超时设置，并重启 supervisor：

```toml
[settings.proxy]
enable = true
idle_timeout = "15m"
```

闲置 15 分钟后，pitchfork 会停止由代理启动的 API，然后停止不再使用的依赖项。打开的流式响应或 WebSocket 会让 API 保持活动状态；如果另一个正在运行的使用方仍需要共享依赖项，该依赖项也会继续运行。下一个请求会重新启动整个环境；预设数据仍会保存在磁盘上。

若要只为某个 daemon 设置超时，而不是设置全局超时，请在其 `[daemons.<name>]` 表格中添加 `proxy_idle_timeout = "15m"`；设为 `false` 则让它持续运行。详见[停止空闲 daemon](/daemons/worktrees.html#stop-idle-daemons)。

显式启动的 daemon 不受此设置影响：`mise daemons start` 会让 daemon 及其依赖项持续运行，直到你手动停止。如果之前用这种方式启动了 API，请先运行一次 `mise daemons stop api db` 停止整个环境，再尝试按需启动流程。

Shell 会话也可能让由代理启动的 daemon 持续运行。[随 shell 自动启动和停止](/daemons.html#automatic-start-and-stop)会跟踪 shell 进入和离开项目的情况；浏览器触发的启动无需此功能。

## 添加 worktree {#add-a-worktree}

由于数据库和 API 使用自动端口，链接的 worktree 无需额外配置即可获得自己的 daemon ID、端口和数据库。自定义 daemon 需要显式指定 `base`（如示例中的 API）；预设则使用其默认端口作为基准端口。

```sh
git worktree add ../shop-feature -b feature
cd ../shop-feature
mise trust
mise daemons register
```

主检出目录的 API 地址为 `https://api.shop.localhost`，worktree 的地址为 `https://api.shop-feature.shop.localhost`。HTTP 客户端使用 `API_URL`，数据库使用 `DATABASE_URL`。代理只转发 HTTP，不转发 PostgreSQL 或 Redis 流量。

预设的额外监听端口（例如 CockroachDB 的 HTTP 端口）也会随 `port = "auto"` 一起变化。写入预设选项的连接 URI（例如 SpiceDB 的 `datastore_uri`）不会自动改写。详见[命名端口](/daemons/worktrees.html#named-ports)。

## 共享服务 {#share-a-service}

将多个应用共用的基础设施放在单独的仓库中，例如 `~/src/services`，并在其中为每项服务声明一次。应用程序引用该项目，而不是复制服务声明或关闭 worktree 隔离。

在 `~/src/services/mise.toml` 中：

```toml
[settings]
experimental = true

[daemons_settings]
namespace = "services"

[daemons.events]
preset = "nats"
version = "2"
```

在 `~/src/shop/mise.toml` 中添加项目引用，并将 `events` 加入 API 的 `depends`：

```toml
[daemons.events]
project = "../services"

[daemons.api]
run = "exec npm run dev -- --host 127.0.0.1 --port $API_PORT"
port = { auto = true, base = 3000 }
ready_cmd = "curl -fsS http://127.0.0.1:$API_PORT/health"
depends = ["db", "events"]

[env]
NATS_URL = "nats://127.0.0.1:4222"
```

检查并信任 `../services` 后，再次运行 `mise daemons register`。mise 也会注册所引用的 daemon；请求 API 时，pitchfork 会先启动 `events`。`project` 路径相对于当前项目根目录，因此请保持这种同级目录结构，或改用绝对路径。

引用共享的是进程，而不是环境变量。上方的 `NATS_URL` 连接到共享服务的固定端口，因为预设导出的变量仍属于 services 项目。请在基础设施所属项目中停止共享服务，并且只有在没有其他使用方依赖它时才停止。

若要让所有检出目录共用一个 PostgreSQL 服务器，同时为每个目录保留独立数据库，请使用[共享服务器 provider](/daemons/sharing.html#shared-server-providers)，而不是为每个 worktree 单独运行数据库。授权和消息传递服务栈示例请参阅 [CockroachDB、SpiceDB 和 NATS 示例](/daemons/presets.html#example-cockroachdb-spicedb-and-nats)。

## 登录时启动 supervisor {#keep-the-supervisor-available-at-login}

如果通过 [mise bootstrap](/bootstrap.html) 管理这台机器，请在全局配置中声明一个用户服务。下方两个位置都要填写 mise 二进制文件的永久绝对路径。在 Bash 中运行 `type -P mise`、在 Zsh 中运行 `whence -p mise`，或在 Fish 中运行 `command -s mise`，即可查看路径。例如，macOS 上通过 Homebrew 安装时路径可能为 `/opt/homebrew/bin/mise`，Linux 上则可能位于 `~/.local/bin` 下。在已激活 mise 的 Bash 或 Zsh shell 中，`command -v mise` 只会输出 shell 函数的名称 `mise`。即使安装了多个 mise，`PITCHFORK_MISE_BIN` 也会让 daemon 命令使用同一个二进制文件。

```toml
[tools]
pitchfork = "latest"

[bootstrap.services.pitchfork]
scope = "user"
command = "/opt/homebrew/bin/mise exec -- pitchfork supervisor run --boot"
environment = { PITCHFORK_MISE_BIN = "/opt/homebrew/bin/mise" }
working_directory = "~"
requires_tools = true
restart = "on-failure"
```

需要可复现的设置时，请在机器配置中固定经过测试的 pitchfork 版本。设置 `requires_tools` 后，完整运行 `mise bootstrap` 会先安装该工具，再启动服务。launchd 或 systemd 需要托管前台运行的 `supervisor run --boot` 进程；`supervisor start` 会使进程脱离托管。

使用 `mise bootstrap --dry-run` 预览，使用 `mise bootstrap` 应用设置，再通过 `mise bootstrap services status` 检查结果。macOS 上的服务是用户级 LaunchAgent `~/Library/LaunchAgents/dev.mise.pitchfork.plist`；Linux 上则是 systemd 用户单元 `~/.config/systemd/user/dev.mise.pitchfork.service`。两者都会在用户登录时启动，不会早于用户会话。详见[用户服务](/bootstrap/services.html#user-services)。`--boot` 会启动标记了 [`boot_start = true`](https://pitchfork.jdx.dev/reference/configuration#boot-start) 的 daemon；只希望按需启动的应用不要设置此项。

更改设置后，使用以下命令重启 supervisor：

```sh
systemctl --user restart dev.mise.pitchfork.service       # Linux
launchctl kickstart -k "gui/$(id -u)/dev.mise.pitchfork"  # macOS
```

登录启动只能由一种方式负责。应用 bootstrap 服务前，请使用 `pitchfork supervisor stop` 停止手动启动的 supervisor，例如[开始之前](#before-you-start)中启动的实例。如果之前运行过 `pitchfork boot enable`，也请运行 `pitchfork boot disable`。停止 supervisor 会中断正在运行的 daemon，因此请在允许整个环境停止时执行。不要通过两种方式重复注册同一个 supervisor。

托管服务正常运行后，可在 `~/.config/pitchfork/config.toml` 中设置以下选项，避免 CLI 命令启动不受管理的替代 supervisor：

```toml
[settings.supervisor]
auto_start = false
```

如果不使用 mise bootstrap，请改用 [`pitchfork boot enable`](https://pitchfork.jdx.dev/guides/boot-start)。无论选择哪种方式，项目定义都会保留在各自的仓库中。

## 后续步骤 {#next-steps}

- 使用 `mise daemons stop api db` 停止整个环境。
- 运行 `git worktree remove` 后，使用 [`mise daemons prune`](/daemons/data.html#clean-up-deleted-projects) 删除该 worktree 的数据库。
- 使用 [`init`](/daemons.html#setup-before-the-process-starts) 在 API 启动前运行迁移，例如设置 `init = "npm run migrate"`。每次启动都会在依赖项就绪后运行该命令，因此应确保重复执行是安全的。
- 将短时构建和测试命令保留为任务。只有当服务器命令本身需要 mise 任务时，才将任务作为 daemon 运行；详见[将任务作为 daemon 运行](/daemons.html#daemons-that-run-a-task)。
- 添加 [`default` 组](/daemons.html#groups)，这样 `mise daemons start` 只会启动日常使用的 daemon。
- Redis、CockroachDB、NATS 和 SpiceDB 的说明请参阅[服务预设](/daemons/presets.html)。
