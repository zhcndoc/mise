# Docker Compose 项目

`[bootstrap.compose]` 以声明方式管理长期运行的 Docker Compose
项目，此过程发生在软件包、特权文件、目录和系统服务完成收敛之后。因此，它适用于自托管服务：其 Compose 文件、环境文件、Docker 安装以及守护进程生命周期均由同一份 bootstrap 配置管理。

```toml
[bootstrap.packages]
"apt:docker.io" = "latest"
"apt:docker-compose-v2" = "latest"

[bootstrap.services.docker]
state = "running"
enabled = true

[bootstrap.directories."/opt/mise-cache"]
mode = "0755"

[bootstrap.files."/opt/mise-cache/compose.yaml"]
source = "./infra/mise-cache/compose.yaml"
mode = "0644"

[bootstrap.files."/opt/mise-cache/.env"]
content = """
S3_ACCESS_KEY={{ secret(name="s3_access_key") }}
S3_SECRET_KEY={{ secret(name="s3_secret_key") }}
"""
mode = "0600"

[bootstrap.compose.mise-cache]
project_dir = "/opt/mise-cache"
files = ["compose.yaml"]
env_files = [".env"]
project_name = "mise-cache"
state = "running"
sudo = true
depends_on = ["package:apt:docker.io", "service:docker"]
```

`project_dir` 是必需项，且必须使用绝对路径。`files` 和 `env_files` 中的相对路径将以此目录为基准解析。如果未指定 `files`，Compose 将执行其常规的项目目录发现。Mise 会按照声明顺序传递多个文件和环境文件，因此后面的条目会保留 Compose 的覆盖语义。

## 生命周期与收敛

`state` 控制项目生命周期：

- `"running"`（默认）运行 `compose up --detach`，检查每个选定服务的运行状态和健康状态，并将 Compose 的规范配置哈希与每个容器的 `com.docker.compose.config-hash` 标签进行比较。
- `"stopped"` 运行 `compose stop`，保留已配置的容器和项目数据。当 `remove_orphans = true` 时，从 Compose 模型中移除的容器将通过已配置的容器引擎移除。
- `"absent"` 运行 `compose down`，并可选择移除卷和镜像。

只有在容器状态和渲染后的 Compose 模型均匹配时，状态才会保持收敛。
对 Compose 文件、插值输入、配置文件或服务配置的更改会作为更新显示，而不会被仅仅处于运行状态的容器所掩盖。

`oneshot` 列出成功退出且退出代码为 0 后已收敛的选定服务。其他选定服务必须处于运行状态，并且在存在健康检查时必须处于健康状态。

## 项目选择

- `project_name`：显式指定的 Compose 项目名称。必须以小写字母或数字开头，且只能包含小写字母、数字、短横线和下划线。
- `files`：通过 `--file` 传入的有序 Compose 文件。
- `env_files`：通过 `--env-file` 传入的有序插值环境文件。请将机密值放入权限模式为 `0600` 的受管文件中，而不要放入引导配置。
- `profiles`：通过 `--profile` 启用的配置文件。
- `services`：可选的服务子集。为空表示启用所选文件和配置文件中的每个服务。
- `oneshot`：允许保持退出状态的成功完成服务。当设置了 `services` 时，每个一次性服务也必须在其中被选中。
- `depends_on`：必须先完成收敛的其他引导资源 ID，例如 `"package:apt:docker.io"` 或 `"service:docker"`。与 `project_dir`、`files` 和 `env_files` 匹配的受管条目会自动关联。
  显式依赖项必须存在，因此拼写错误会在规划阶段失败。

## 应用策略

- `pull`：`"missing"`（默认）、`"always"` 或 `"never"`。
- `build`：`"auto"`（默认）、`"always"`（`--build`）或 `"never"`
  （`--no-build`）。
- `recreate`：`"auto"`（默认）、`"always"`（`--force-recreate`）或
  `"never"`（`--no-recreate`）。
- `wait`：在 `up` 后等待正在运行/健康的服务（默认值为 `true`）。
- `wait_timeout`：最长等待时间（以秒为单位）。
- `timeout`：停止/关闭超时时间（以秒为单位）。
- `remove_orphans`：移除模型中不再存在的项目容器
  （默认值为 `true`）。
- `renew_anonymous_volumes`：在 `up` 期间更新匿名卷（默认值为
  `false`）。
- `down_volumes`：在 `down` 期间移除命名卷和匿名卷（默认值为
  `false`）。此操作具有破坏性，应谨慎启用。
- `down_images`：在 `down` 期间可选择移除项目的 `"local"` 或 `"all"` 镜像。
  此操作同样具有破坏性。

## 引擎和权限

Mise 在可用时使用 `docker compose`，并在不可用时回退到独立的 Docker
Compose v2 `docker-compose` 命令。不支持旧版 Compose v1，因为它缺少安全
收敛所需的结构化检查和生命周期标志。`command` 和 `engine_command` 接受
Podman、远程 Docker 上下文或其他兼容前端的 argv 数组，不会调用 shell：

```toml
[bootstrap.compose.edge]
project_dir = "/srv/edge"
command = ["podman", "compose"]
engine_command = ["podman"]
```

引擎命令仅用于检查容器配置哈希标签。当项目属于系统 Docker 守护进程且
bootstrap 用户无权访问套接字时，请设置 `sudo = true`。Mise 会在捕获
状态输出前进行身份验证，绝不会隐藏交互式 sudo 提示，并遵循现有的
`system_packages.sudo` 策略。

```sh
mise bootstrap compose status
mise bootstrap compose status --json
mise bootstrap compose apply --dry-run
mise bootstrap compose apply --yes
```

聚合的 `mise bootstrap plan` 会在软件包、文件、目录和系统服务资源之后安排
Compose 项目。聚合应用会在这些依赖完成后重新检查项目，因此，同一次运行中
创建的 Compose 文件或 Docker 安装无需在执行期间进行猜测即可得到处理。

有关底层生命周期语义，请参阅 Docker 关于
[`docker compose`](https://docs.docker.com/reference/cli/docker/compose/)、
[`up`](https://docs.docker.com/reference/cli/docker/compose/up/) 和
[`down`](https://docs.docker.com/reference/cli/docker/compose/down/) 的
参考文档。
