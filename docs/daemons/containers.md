---
description: 使用 Docker 或 Podman 将容器镜像作为项目守护进程运行，并为各工作树分配端口、清理过期容器和有序关闭。
socialDescription: 将 Docker 和 Podman 容器用作项目守护进程。
---

# 容器守护进程 <Badge type="warning" text="实验性" />

容器守护进程使用 Docker 或 Podman 运行镜像，而不是运行 mise 安装的工具。配置时使用 `image` 声明；除此之外，它与其他守护进程的行为相同：端口会随工作树变化，并导出对应的环境变量；服务会等待就绪检查通过，并通过 `mise daemons` 和 [`daemons` 任务](/daemons.html#tasks-that-require-daemons)启动和停止。

::: warning 实验性功能
守护进程目前仍属实验性功能。请在 `[settings]` 下设置 `experimental = true` 以启用；详见[要求](/daemons.html#requirements)。
:::

## 声明容器

```toml
[daemons.postgres]
image = "postgres:18"
port = { auto = true, base = 5432 }
env = { POSTGRES_PASSWORD = "dev" }
data_mount = "/var/lib/postgresql"
ready_cmd = "{{ runtime }} exec {{ container }} pg_isready -U postgres"
```

在主检出目录中，`mise daemons start postgres` 会将容器的 `5432` 端口映射到 `127.0.0.1:5432`。在关联工作树中，主机端口为该工作树的槽位加上 `base`，例如 `5471`；容器仍监听 `5432`。这两种情况下，应用都可读取 `POSTGRES_PORT`。槽位的工作方式详见[自动端口](/daemons/worktrees.html#automatic-ports)。

mise 会在前台运行容器并使用 `--rm`，因此容器输出就是守护进程日志（`mise daemons logs postgres`），容器停止后也会被移除。

## 配置项

| Key              | Meaning                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image`          | 要运行的镜像。设置此项后，守护进程即为容器类型；不能同时设置 `run`、`task` 或 `preset`。 |
| `command`        | 容器命令及参数，会替换镜像默认命令。字符串按 Shell 文本处理，与 `run` 相同；数组则原样传递。 |
| `port`           | 容器主端口映射到主机的端口：可以是整数，也可以是 `{ auto = true, base = 5432 }`。单独使用 `"auto"` 时必须设置 `base`，因为镜像没有默认端口。 |
| `container_port` | `port` 对应的容器监听端口。自动分配端口时默认为 `base`；固定端口时默认为该端口本身。 |
| `ports`          | 按名称声明其他映射端口，详见[多个端口](#several-ports)。 |
| `env`            | 传入容器的变量。变量值会设置在守护进程环境中，并按名称交给运行时，因此不会出现在命令行上。 |
| `volumes`        | `source:target[:options]` 格式的挂载项。以 `.`、`/` 或 `~` 开头的来源是路径（相对于项目根目录）；如果路径不存在则会创建。其他来源会作为命名卷处理。 |
| `data_mount`     | 用于在容器内持久保存数据的路径，详见[保留数据](#keep-data)。 |
| `data_dir`       | `data_mount` 在主机上的目录，可以是相对于项目根目录的路径，也可以是绝对路径。 |
| `runtime`        | `"auto"`（默认值）、`"docker"` 或 `"podman"`，详见[Docker 与 Podman](#docker-and-podman)。 |
| `runtime_args`   | 传给 `<runtime> run` 的额外参数，例如 `["--shm-size=1g"]`；这些参数会放在镜像名称之前。 |

`init`、`depends`、`ready_port`、`ready_cmd`、`proxy` 及其他[守护进程配置项](/daemons.html#daemon-keys)的行为与自定义守护进程相同。容器启动前会先在主机上运行 `init`。与其他带端口的守护进程一样，容器也会获得[代理主机名](/daemons/worktrees.html#stable-urls-per-worktree)；对于不使用 HTTP 的数据库或消息代理，请设置 `proxy = false`。

## 多个端口

为每个额外映射的端口指定名称。整数表示主机端口使用相同的端口号；表格可以设置容器端口和固定主机端口，也可以像 `port` 一样启用按工作树分配端口：

```toml
[daemons.cockroach]
image = "cockroachdb/cockroach:v25.1.0"
command = ["start-single-node", "--insecure"]
port = { auto = true, base = 26257 }
ports.http = { container = 8080, auto = true, base = 27000 }
ready_cmd = "{{ runtime }} exec {{ container }} cockroach sql --insecure -e 'select 1'"
```

自动分配的命名端口会使用与 `port` 相同的槽位（如果 `port` 是固定端口，则使用项目根目录的槽位）；其 `base` 默认为容器端口。槽位为 7 时，此守护进程会映射 `26264` 和 `27007`。

`port` 会导出为 `<NAME>_PORT`，命名端口则导出为 `<NAME>_<PORT>_PORT`；本例中分别为 `COCKROACH_PORT` 和 `COCKROACH_HTTP_PORT`。每个映射端口必须不同。端口使用 TCP，且只绑定到 `127.0.0.1`，因此网络中的其他设备无法访问容器守护进程。

## 就绪检查

容器启动后，映射端口会立即在主机上开放，此时容器内的服务器可能还无法响应，因此 `ready_port` 检查可能过早通过。建议使用会实际查询服务器状态的 `ready_cmd`。`ready_cmd` 和 `health_cmd` 可以使用下表中的变量，mise 会替换这些变量；其他模板（例如 pitchfork 的 <code v-pre>{{ name }}</code>）仍由 pitchfork 处理。`runtime` 是一段 Shell 表达式，因此请在命令字符串中使用，或将它作为 `["sh", "-c", "..."]` 的脚本，而不要把它作为参数数组中的另一个参数：

| Variable                           | Value                                                |
| ---------------------------------- | ---------------------------------------------------- |
| <code v-pre>{{ container }}</code> | 容器名称 |
| <code v-pre>{{ runtime }}</code>   | 守护进程解析出的运行时命令 |
| <code v-pre>{{ port }}</code>      | `port` 对应的主机端口 |
| <code v-pre>{{ NAME }}</code>      | `ports` 下名为 `NAME` 的端口所对应的主机端口 |

例如，<code v-pre>{{ runtime }} exec {{ container }} pg_isready</code> 会查询容器内的服务器；<code v-pre>pg_isready -h 127.0.0.1 -p {{ port }}</code> 则通过映射端口查询。

## 保留数据

`data_mount` 会在主机上保存容器中的指定路径。如果未设置 `data_dir`，目录会放在 mise 的[状态目录](/daemons/data.html#where-data-lives)中。状态目录按项目根目录隔离，因此每个工作树都有自己的目录；`mise daemons prune` 会随项目一起删除该目录。像[预设](/daemons/data.html#keep-data-in-the-checkout)一样，设置 `data_dir` 可将数据保留在检出目录中：

```toml
[daemons.postgres]
image = "postgres:18"
port = { auto = true, base = 5432 }
data_mount = "/var/lib/postgresql"
data_dir = ".data/postgres"
```

其他挂载请使用 `volumes`。在 Linux 上，Docker 自行创建的目录归 root 所有；mise 会先创建路径来源，因此这些目录属于当前用户。镜像可能仍需设置 `runtime_args = ["--user", "..."]` 才能写入这些目录。

## 工作树与清理

容器名称格式为 `mise-<namespace>-<daemon>-<hash>`。其中，[命名空间](/daemons/worktrees.html#namespaces)包含项目信息；对于关联工作树，也包含工作树信息；`<hash>` 是根据完整命名空间和守护进程名称生成的短哈希。因此，不同检出目录或名称相似的守护进程也不会共用或争抢同一个容器名称。每个容器都会添加 `dev.mise.daemon` 和 `dev.mise.project` 标签，可通过 `docker ps --filter label=...` 查找。

守护进程停止时，mise 会对容器运行 `<runtime> stop` 并等待它退出，因此镜像的关闭信号和宽限时间都会生效。如果上次运行被强制终止而遗留了容器，下次启动时会先移除同名容器，不会删除其他容器。如果镜像仍在下载时停止守护进程，启动过程会取消。

## Docker 与 Podman

`runtime = "auto"` 会在 `PATH` 中有 `docker` 时使用 Docker，否则使用 Podman。设置 `runtime = "podman"` 可在项目配置中指定运行时。若要让每位开发者单独选择运行时，或使用 `nerdctl` 等兼容 Docker 的 CLI，请将 `MISE_CONTAINER_RUNTIME` 设置为对应名称或路径；此设置会覆盖配置中的声明。守护进程启动时，mise 会在项目工具环境中查找运行时，因此通过 `[tools]` 安装的运行时也可使用。如果找不到运行时，启动会失败，守护进程日志中会显示原因。

mise 不会替你启动运行时：Docker 或 Podman 自己的服务（Docker Desktop、`podman machine`）必须已经运行。

## 限制

- 不支持 Windows。容器命令是 POSIX Shell 脚本；在 Windows 上仍会加载配置，但启动守护进程时会报错。
- 只映射 TCP 端口，且仅绑定到 `127.0.0.1`。
- 容器守护进程不是[共享服务器](/daemons/sharing.html#shared-server-providers)，mise 也不会拉取或构建镜像；首次使用时由 `docker run` 拉取镜像。
- `[env]` 中的变量不会传入容器。请在守护进程的 `env` 中设置变量。
- 容器停止后会有十秒宽限期，之后运行时才会强制结束容器。mise 会将守护进程的 `stop_signal` 超时设置为 15 秒，以便 pitchfork 等待容器退出；如果自行设置 `stop_signal`，该设置会保留，且时间应长于十秒。
