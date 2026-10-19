---
description: "在 mise bootstrap 安装 Docker 并写入项目文件后，管理主机上的 Docker Compose 项目，使其保持运行、停止或移除状态。"
socialDescription: "管理主机上的 Docker Compose 项目，使其保持运行、停止或移除状态。"
---

# Docker Compose 项目

使用 `[bootstrap.compose]` 可让主机上的 Docker Compose 项目保持运行、停止或移除状态。同一份配置还可安装 Docker 并写入项目文件，适合管理自托管服务。

## 示例

```toml
[bootstrap.compose.app]
project_dir = "/opt/app"
```

```sh
mise bootstrap compose apply --dry-run
mise bootstrap compose apply
```

[`mise bootstrap compose apply`](/cli/bootstrap/compose/apply.html) 会针对 `/opt/app` 中的 Compose 文件运行 `docker compose up --detach --wait`，并等待服务启动；如果服务定义了健康检查，也会等待其通过。之后再次运行时，只有项目配置偏离 Compose 模型才会发生变更。

## 安装 Docker 并运行项目

[`mise bootstrap`](/bootstrap.html) 会在处理软件包、文件、系统服务和防火墙后应用 Compose 项目，因此可以用一份配置安装 Docker、写入 Compose 文件及其密钥，并启动项目。以下示例面向 Ubuntu 主机，其软件仓库提供 `docker.io` 和 `docker-compose-v2` 软件包：

```toml
[bootstrap.secrets]
s3_access_key = "S3_ACCESS_KEY" # read from $S3_ACCESS_KEY
s3_secret_key = "S3_SECRET_KEY"

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
template = true
owner = "root"
group = "root"
mode = "0600"

[bootstrap.compose.mise-cache]
project_dir = "/opt/mise-cache"
files = ["compose.yaml"]
env_files = [".env"]
project_name = "mise-cache"
sudo = true # the bootstrap user cannot reach the Docker socket
depends_on = ["package:apt:docker.io", "service:docker"]
```

在此 `mise.toml` 旁创建 `infra/mise-cache/compose.yaml`，设置两个[密钥输入项](/bootstrap/secrets.html)，然后运行 `mise bootstrap`。环境文件模板要求值为单行，且符合 Compose 的 `.env` 格式。

项目会自动依赖 `/opt/mise-cache` 中的文件，无需显式声明，因为 mise 会将项目与其 `project_dir`、`files` 和 `env_files` 对应的托管条目关联起来。`depends_on` 则添加对 Docker 软件包和服务的依赖。

## 选择项目状态 {#lifecycle-and-convergence}

| `state`               | 命令                  | 达到目标状态的条件                                                                              |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `"running"` (default) | `compose up --detach` | Every selected service runs, is healthy if it has a health check, and matches the Compose model |
| `"stopped"`           | `compose stop`        | No selected container is running; containers and data are kept                                  |
| `"absent"`            | `compose down`        | No container of the project remains                                                             |

对于运行中的项目，mise 会将 Compose 为每个服务计算的配置哈希与容器上的 `com.docker.compose.config-hash` 标签比较。因此，即使旧容器仍在运行，编辑 Compose 文件、插值变量、配置档案或服务定义也会被识别为更新。

请在 `oneshot` 中列出只运行一次后退出的服务。它们以代码 0 退出后即视为已达到目标状态，因此迁移或初始化任务不会让项目持续处于过期状态。

`remove_orphans = true` 为默认值。启用时，mise 也会移除 Compose 模型中已不存在服务对应的容器：`up` 和 `down` 会传入 `--remove-orphans`，停止项目时则通过容器引擎移除这些容器。

## 选择文件、配置档案和服务 {#project-selection}

`project_dir` 为必填项，且必须是绝对路径。mise 会将其作为 `--project-directory` 传给 Compose，并以此为基准解析 `files` 和 `env_files` 中的相对路径。未设置 `files` 时，Compose 会按常规方式查找项目文件。若列出多个 Compose 文件或环境文件，mise 会按所列顺序传递，因此后面的文件会按 Compose 规则覆盖前面的文件。

```toml
[bootstrap.compose.edge]
project_dir = "/srv/edge"
files = ["compose.yaml", "compose.prod.yaml"]
env_files = [".env"]
profiles = ["monitoring"]
services = ["proxy", "grafana"]
```

`services` 会将 `up` 和 `stop` 限定为指定服务；未设置时，mise 会管理文件和配置档案启用的所有服务。请将密钥值放在由 [`[bootstrap.files]`](/bootstrap/files.html) 模板以 `0600` 权限写入的环境文件中，而不要放在 `mise.toml` 里。

## 使用 Podman 或其他引擎 {#engines-and-privileges}

如果 `docker compose` 可用，mise 会优先使用它；否则会使用独立的 Docker Compose v2 `docker-compose`。mise 不支持 Compose v1，因为它缺少 mise 所需的检查和生命周期选项。可将 `command` 设为其他 Compose 前端（例如 Podman 或远程 Docker context），并通过 `engine_command` 指定 mise 用来读取容器标签和移除孤立容器的引擎命令。这两项都是参数列表，不会通过 Shell 运行：

```toml
[bootstrap.compose.edge]
project_dir = "/srv/edge"
command = ["podman", "compose"]
engine_command = ["podman"]
```

当 `command` 包含 `compose` 参数时，引擎默认为该参数之前的命令，因此上例中的 `engine_command` 只是显式写出默认值。否则，引擎默认为 `docker`。

当项目属于系统 Docker 守护进程，且运行 bootstrap 的用户无法访问其 socket 时，请设置 `sudo = true`。之后 mise 会通过 `sudo` 运行所有 Compose 和引擎命令，包括 `status` 所用命令，并遵循 [`system_packages.sudo`](/configuration/settings.html#system_packages.sudo) 设置。mise 会先完成身份验证再捕获命令输出，因此不会隐藏 `sudo` 密码提示。

## 使用模板 {#templates}

项目配置值支持 [Tera 模板](/templates.html)。mise 会先渲染模板，再检查 `project_dir` 或解析 `files` 与 `env_files`。因此，可移植配置可以使用 `[vars]`、环境变量或配置自身位置中的值：

```toml
[vars]
site = "prod"

[bootstrap.compose.app]
project_dir = "{{ config_root }}/compose"
files = ["compose.yaml", "compose.{{ vars.site }}.yaml"]
env_files = ["{{ config_root }}/compose/.env"]
```

此处的 <code v-pre>{{ config_root }}</code> 是声明配置的根目录：项目配置对应项目目录，全局配置则对应 `MISE_GLOBAL_CONFIG_ROOT`（默认为 `$HOME`）。该值不会随运行 mise 时所在的目录而改变。

文本值和文本列表都会渲染，包括 `files`、`env_files`、`command`、`services`、`profiles` 和 `depends_on` 中的条目。`state`、`pull`、`build`、`recreate` 和 `down_images` 等取值范围固定的字段必须直接填写字面值。不含模板语法的值会原样使用。mise 不支持 `exec()`，因为 `status`、`plan`、`apply --dry-run` 和 `apply` 必须对同一声明进行渲染；详见 [Bootstrap 中的模板](/bootstrap.html#templates)。模板错误会中止命令，并指出声明所在的配置文件。

## 配置如何合并

不同配置文件中的项目会按名称合并，并遵循[配置层级](/configuration.html#configuration-hierarchy)。更靠近当前目录的配置会整体替换同名项目声明；mise 不会跨文件合并字段。

## 移除项目

删除声明不会改变项目状态。若要停止并移除项目，请将 `state` 设为 `"absent"` 并应用更改，然后再删除该条目：

```toml
[bootstrap.compose.mise-cache]
project_dir = "/opt/mise-cache"
state = "absent"
down_volumes = true
```

`down_volumes = true` 还会删除项目的具名卷和匿名卷，`down_images` 则会移除项目的 `"local"` 或 `"all"` 镜像。两者都会删除 `compose up` 无法重建的数据，请仅在确实要删除时启用。[`mise bootstrap unapply`](/bootstrap/modules.html#remove-a-module-s-resources) 不会移除 Compose 项目；请改为将其声明为不存在。

## 预览并应用

使用 [`mise bootstrap compose status`](/cli/bootstrap/compose/status.html) 检查各项目的状态，并在应用前预览将执行的命令：

```sh
mise bootstrap compose status            # state of each project
mise bootstrap compose status --json     # the same, as JSON
mise bootstrap compose status --missing  # exit 1 if any project would change
mise bootstrap compose apply --dry-run   # print the Compose commands
mise bootstrap compose apply             # apply after a confirmation prompt
mise bootstrap compose apply --yes       # apply without prompting
```

`mise bootstrap compose apply` 只会更改 Compose 项目，不会安装 Docker 或写入项目文件；如果项目的 Compose 文件尚不存在，状态会显示为 `unknown`。若同一份配置也声明了这些资源，可一并预览并应用：

```sh
mise bootstrap plan
mise bootstrap --only packages,files,services,compose --dry-run
```

`mise bootstrap` 会在前序步骤完成后重新检查项目，因此同一次运行中创建的 Compose 文件或 Docker 安装也会被识别。试运行无法判断镜像是否能启动或通过健康检查。

## 参考

| 字段                      | 取值                                                                                                                            | 默认值                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `project_dir`             | 绝对路径                                                                                                                       | 必填                                     |
| `project_name`            | 小写字母、数字、`-` 和 `_`，且以字母或数字开头                                                                                | 由 Compose 选择                          |
| `files`                   | Compose 文件，通过 `--file` 传递                                                                                                | Compose 自行查找                         |
| `env_files`               | 插值文件，通过 `--env-file` 传递                                                                                                | `[]`                                     |
| `profiles`                | 配置档案，通过 `--profile` 传递                                                                                                 | `[]`                                     |
| `services`                | 要管理的服务                                                                                                                   | 所有已启用的服务                          |
| `oneshot`                 | 允许退出后保持停止状态的服务（退出代码须为 0）；若设置此项，也必须包含在 `services` 中                                           | `[]`                                     |
| `depends_on`              | 应优先应用的 Bootstrap 资源，格式为 `<kind>:<name>`；kind 可为 `package`、`file`、`directory`、`service`、`user` 或 `group`       | `[]`                                     |
| `state`                   | `"running"`、`"stopped"`、`"absent"`                                                                                            | `"running"`                              |
| `pull`                    | `"missing"`、`"always"`、`"never"`                                                                                              | `"missing"`                              |
| `build`                   | `"auto"`、`"always"`（`--build`）、`"never"`（`--no-build`）                                                                    | `"auto"`                                 |
| `recreate`                | `"auto"`、`"always"`（`--force-recreate`）、`"never"`（`--no-recreate`）                                                        | `"auto"`                                 |
| `wait`                    | `true` 会向 `up` 传入 `--wait`                                                                                                 | `true`                                   |
| `wait_timeout`            | `--wait-timeout` 的秒数                                                                                                        | 无                                       |
| `timeout`                 | `up`、`stop` 和 `down` 的 `--timeout` 秒数                                                                                    | 无                                       |
| `remove_orphans`          | `true` 会移除模型中已不存在的容器                                                                                              | `true`                                   |
| `renew_anonymous_volumes` | `true` 会向 `up` 传入 `--renew-anon-volumes`                                                                                   | `false`                                  |
| `down_volumes`            | `true` 会向 `down` 传入 `--volumes`                                                                                            | `false`                                  |
| `down_images`             | `"local"` 或 `"all"`，作为 `--rmi` 的值传递                                                                                    | 无                                       |
| `sudo`                    | `true` 会通过 `sudo` 运行 Compose 和引擎命令                                                                                    | `false`                                  |
| `command`                 | 以参数列表形式指定 Compose 命令                                                                                                | `docker compose` 或 Docker Compose v2 的 `docker-compose` |
| `engine_command`          | 以参数列表形式指定引擎命令                                                                                                     | 根据 `command` 推导，或使用 `docker`     |

mise 规划运行步骤时会拒绝以下配置组合：

- `services` 不能与 `state = "absent"` 同时使用，因为 `compose down` 会移除整个项目。
- `down_volumes` 和 `down_images` 要求 `state = "absent"`。
- `renew_anonymous_volumes` 要求 `state = "running"`。
- `wait_timeout` 要求 `wait = true`，且值必须大于零。
- 每个 `depends_on` 条目都必须指向已声明的资源；拼写错误会在规划阶段报错。

Docker 命令参考：[`docker compose`](https://docs.docker.com/reference/cli/docker/compose/)、[`up`](https://docs.docker.com/reference/cli/docker/compose/up/) 和 [`down`](https://docs.docker.com/reference/cli/docker/compose/down/)。

## 另请参阅

- Compose 项目在执行顺序中的位置，请参阅 [Bootstrap](/bootstrap.html#how-it-runs)。
- [Linux 防火墙](/bootstrap/firewall.html)不会过滤 Docker 发布的端口。
- 若要运行按项目而非按主机启动的开发服务，请参阅[守护进程](/daemons.html)。
