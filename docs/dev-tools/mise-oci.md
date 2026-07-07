# mise oci <Badge type="warning" text="experimental" />

`mise oci build` 会将一个 `mise.toml` 转换为容器镜像，并且每个已安装的工具对应一个
[OCI](https://github.com/opencontainers/image-spec) 层。

其优势在于，**仅升级任意单个工具版本，只会使一个内容可寻址 blob 失效**。使用 Dockerfile 时，每个 `RUN install_tool` 都叠加在前一个之上——更改较早的 `RUN` 会使后续所有层失效。mise 的磁盘布局（每个工具都安装在独立的 `$MISE_DATA_DIR/installs/<plugin>/<version>/` 目录中）使得层的顺序在语义上变得无关紧要，因此切换某个工具的版本只会切换单个层，而其他所有内容（基础镜像、其他工具、mise 本身、镜像配置）都会原样复用。

::: warning Experimental
`mise oci build` 是实验性功能。可通过以下方式启用：

```sh
mise settings experimental=true
# 或者，在单次调用中：
MISE_EXPERIMENTAL=1 mise oci build …
```

标志、输出布局和默认值在未来版本中可能会发生变化。
:::

## 命令一览

| 命令             | 作用                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `mise oci build` | 在磁盘上生成一个 OCI 镜像布局。                                           |
| `mise oci run`   | 构建（或复用）一个镜像，并通过 podman/docker 在其中运行命令。           |
| `mise oci push`  | 构建（或复用）一个镜像，并通过 skopeo 或 crane 将其推送到镜像仓库。     |

## 快速开始

```sh
# 使用默认基础镜像从当前 mise.toml 构建镜像
#（debian:bookworm-slim）。输出到 ./mise-oci/。
mise oci build

# 在镜像中运行交互式 shell（如果存在则使用 podman，否则
# 使用 docker + skopeo）。
mise oci run -it -- bash

# 推送到镜像仓库（调用 skopeo；如果不可用则回退到 crane）。
mise oci push ghcr.io/me/devenv:latest

# 你也可以手动通过 skopeo/crane：
skopeo inspect oci:./mise-oci
skopeo copy oci:./mise-oci docker://ghcr.io/me/devenv:latest
```

## 分层工作原理

给定这个 `mise.toml`：

```toml
[tools]
node = "20"
python = "3.12"
jq = "1.8.1"
```

`mise oci build` 会生成大致如下的分层：

1. **基础镜像层**（例如 `debian:bookworm-slim`）——直接从
   registry 原样复制，因此会触发 registry 去重。
2. **mise 二进制文件** 位于 `/usr/local/bin/mise`（可通过 `--no-mise` 跳过）。
3. **每个工具一个层**，每层都以
   `/mise/installs/<plugin>/<version>/` 为根目录。并标注
   `dev.mise.tool.short` 和 `dev.mise.tool.version`。
4. **已配置的 apt `[bootstrap.packages]`**，如果有的话，会安装到基础
   rootfs 中，并作为一个包层输出。
5. **已配置的 `[dotfiles]`**，如果有的话，会被烘焙为镜像文件。
6. **生成的 `/etc/mise/config.toml`**，其中引用 `/mise` 作为数据
   目录。

将 `node` 从 `20.10` 升级到 `20.11` 只会使 node 层失效。
Python、jq、mise、基础层以及生成的配置都会从
上一次构建中复用（或在拉取时从 registry 复用）。

## `mise oci build`

```sh
mise oci build [-o PATH] [--from REF] [--tag REF] [--mount-point PATH]
               [--no-mise] [--owner UID[:GID]]
```

- `-o, --output PATH` — 输出目录（默认 `./mise-oci`）
- `--from REF` — 基础镜像引用（覆盖 `[oci].from` 和
  `oci.default_from` 设置）。使用 `scratch` 可在没有基础镜像的情况下构建。
- `-t, --tag REF` — 写入 `index.json` 的标签，作为
  `org.opencontainers.image.ref.name` 注解
- `--mount-point PATH` — mise 安装内容在镜像内的存放位置
  （默认 `/mise`）。必须是绝对路径。
- `--no-mise` — 不将正在运行的 mise 二进制文件嵌入到
  `/usr/local/bin/mise`
- `--owner UID[:GID]` — 每个生成的层条目的数字所有者。
  默认为 `[oci].user_id` / `[oci].group_id`，然后是 `0:0`。如果省略 GID，
  则默认为 UID。这只影响文件所有权，不影响镜像的 `USER` 指令。

## `mise oci run`

构建（或复用）一个镜像，并在其中运行命令，类似于
`docker run` / `podman run`。会继承 stdin/stdout/stderr。

```sh
mise oci run [--engine ENGINE] [--image-dir DIR]
             [--from REF] [--mount-point PATH] [--no-mise]
             [--owner UID[:GID]]
             [-i] [-t] [-e KEY=VAL]... [--volume HOST:CONTAINER]...
             [-w DIR] [--keep]
             -- <cmd> [args...]
```

- `--engine` — `auto`（默认，优先使用 podman）、`podman` 或 `docker`。
- `--image-dir` — 跳过构建，直接使用现有的 OCI 布局。
- `--owner UID[:GID]` — 在全新构建时，为生成的 layer 条目指定数字所有者；
  不能与 `--image-dir` 同时使用。
- `-i`、`-t`、`-e`、`--volume`、`-w`、`--keep` — 以与
  `docker run` 相同的方式透传给底层引擎。（`--volume` 没有 `-v`
  短选项，因为 mise 已将 `-v` 保留给 `--verbose`；请使用
  `--volume` 或 `--mount`。）

示例：

```sh
# 交互式 shell
mise oci run -it -- bash

# 带环境变量 + 挂载卷的一次性命令
mise oci run -e DEBUG=1 --volume "$PWD:/work" -w /work -- npm test

# 复用之前构建的布局
mise oci build -o ./img
mise oci run --image-dir ./img -- node --version
```

**要求：** 需要 `podman`（原生支持 OCI-layout）或
`docker + skopeo`（skopeo 会将该布局加载到 docker daemon 中）。

## `mise oci push`

构建（或复用）一个镜像，并通过 `skopeo` 或
`crane` 将其推送到镜像仓库。mise 本身不会处理凭据——请配置
底层工具（`docker login`、`REGISTRY_AUTH_FILE`、`crane auth
login` 等）。

```sh
mise oci push [--tool TOOL] [--image-dir DIR]
              [--from REF] [--mount-point PATH] [--no-mise]
              [--owner UID[:GID]]
              <REGISTRY_REF>
```

- `<REGISTRY_REF>` — 完整限定的目标地址（例如
  `ghcr.io/me/devenv:latest`）。必须包含镜像仓库主机名。
- `--tool` — `auto`（默认，优先使用 skopeo）、`skopeo` 或 `crane`。
- `--image-dir` — 推送一个已有的 OCI 布局，而不是构建。

- `--owner UID[:GID]` — 在全新构建时，为生成的层条目指定数字所有者；它不能与
  `--image-dir` 同时使用。

示例：

```sh
# 一次性构建并推送
mise oci push ghcr.io/me/devenv:latest

# 推送之前构建好的镜像
mise oci build -o ./img
mise oci push --image-dir ./img ghcr.io/me/devenv:v1
```

### `mise.toml` 中的 `[oci]` 部分

```toml
[oci]
from        = "debian:bookworm-slim"  # 基础镜像引用
tag         = "ghcr.io/me/devenv:v1"  # 构建镜像的默认标签
workdir     = "/workspace"             # WORKDIR
entrypoint  = ["bash", "-l"]           # ENTRYPOINT
cmd         = []                        # CMD
user        = "nonroot"                # USER
user_id     = 1000                      # tar 层条目 UID（文件所有权）
group_id    = 1000                      # tar 层条目 GID（默认使用 user_id）
mount_point = "/mise"                  # 工具在镜像中的安装位置

# 注入到镜像配置中的额外环境变量（仅限镜像本身——不会覆盖 MISE_*）。
[oci.env]
NODE_ENV = "production"

# 注入到镜像配置中的标签。
[oci.labels]
"org.opencontainers.image.source" = "https://github.com/me/my-app"
```

`[oci].user` 设置镜像的 `USER` 指令。`[oci].user_id` 和
`[oci].group_id` 设置层中文件的所有权；如果未配置 `group_id`，
则默认使用解析后的 `user_id`。

CLI 标志会覆盖 `[oci]` 部分。`[oci]` 部分会覆盖
`oci.default_from` / `oci.default_mount_point` 设置。

当 `mise.toml` 文件分层（全局 + 项目）时，各部分会按字段逐项合并，
每个字段以更具体的文件为准。

### OCI 镜像中的 `[bootstrap]` 和 `[dotfiles]`

`mise oci build` 会将项目作用域的 `[bootstrap.packages]` 和
`[dotfiles]` 条目应用到镜像中。这相当于
`mise bootstrap` 中声明式包和 dotfile 部分的 OCI 版本。
传入 `--include-global` 也会包含全局配置中的 `[bootstrap.packages]` 和
`[dotfiles]`。

```toml
[bootstrap.packages]
"apt:curl" = "latest"

[dotfiles]
"/etc/profile.d/project.sh" = { source = "profile.sh", mode = "copy" }
"~/.config/app/config.toml" = { source = "config.toml", mode = "template" }
```

对于包，OCI 构建目前支持基于 Debian/Ubuntu
基础镜像的 `apt:` 条目。mise 会将基础镜像解包到临时 rootfs 中，调用宿主机的
`apt-get` 安装到该 rootfs，然后把文件系统变更作为一个 OCI 层输出，并标注
`dev.mise.system.packages=apt`。目前其他系统包管理器在 OCI 构建中会被拒绝。

对于镜像构建，`symlink` 和 `symlink-each` 条目会作为文件内容复制。
宿主机上的符号链接通常会指回检出路径，在容器内会失效，因此镜像会改为接收解析后的内容。
以 `~/` 开头的目标会写入 `/root/` 下。

`mise oci build` 不会运行 `[bootstrap.macos.defaults]` 和命令式的
`bootstrap` 任务。macOS 默认配置不适用于 Linux OCI 镜像，而容器特有的启动工作
应放在镜像的 entrypoint 或 command 中。

### 设置

| 设置                    | 默认值               | 描述                                   |
| ----------------------- | -------------------- | -------------------------------------- |
| `oci.default_from`       | `debian:bookworm-slim` | 未指定时使用的默认基础镜像。 |
| `oci.default_mount_point` | `/mise`               | 工具在镜像内的安装位置。      |

默认基础镜像**特意**基于 glibc。Alpine / musl 会破坏
大多数 mise 安装的预编译二进制文件（Node、Python wheels、Ruby gems）。
如果你知道你的工具是静态链接的，可以通过 `--from alpine:…` 启用——否则请准备好遇到问题。

## 镜像中的环境变量

镜像配置的 `Env` 按以下顺序构建（后面的条目优先）：

1. 基础镜像环境变量（来自拉取的 `--from` 镜像配置）。
2. 你的 `mise.toml` 中的 `[env]` 部分（已完全解析——模板已展开，`.env` 文件已读取）。
3. 每个工具的 `exec_env()` —— 例如 `JAVA_HOME`、`GOROOT`、`GEM_HOME`。
   路径会从主机安装目录重新映射到镜像内路径。
4. `[oci].env` 条目。
5. 合成的 PATH（镜像中每个工具的 bin 路径）以及
   继承的 PATH。
6. `MISE_DATA_DIR=/mise` 和 `MISE_CONFIG_DIR=/etc/mise` —— 始终
   最后应用，因此不会被覆盖。

::: warning `[env]` 中的密钥会被烘焙进镜像
`mise` 的 `[env]` 部分中的任何内容——包括从
`.env` 文件加载的值——都会写入镜像配置 JSON，并且对
任何运行 `docker inspect` / `skopeo inspect` 的人可见。**不要把
密钥放在那里。** 请在运行时使用 `docker run -e`、secret 挂载或编排器
secrets。仅对适合保留在镜像中的值使用 `[oci].env`。

`mise` 会输出一条警告，列出它烘焙进的 `[env]` 变量数量。
:::

## 支持的后端

mise 的所有第一方后端都会完全安装在其
按版本划分的安装目录下，因此它们可以像按工具分层一样工作：

`core`, `aqua`, `cargo`, `npm`, `go`, `pipx`, `github`, `gitlab`,
`forgejo`, `ubi`, `spm`, `http`, `s3`, `gem`, `conda`, `dotnet`。

**v1 中不支持：** `asdf` 和 `vfox` 插件（包括第三方
vfox 插件）。它们的安装脚本可能会写入按版本目录之外的路径，
从而破坏每个工具仅一层的约束。使用它们时会报错并给出清晰的提示。

## 注册表基础镜像支持

v1 可以从任何支持匿名拉取的 OCI Distribution v2 注册表中拉取基础镜像：

- Docker Hub（`debian`、`ubuntu`、`node`、…）——令牌认证匿名处理。
- GitHub Container Registry（`ghcr.io/…`）——仅支持公开镜像。
- Quay.io（`quay.io/…`）——仅支持公开镜像。
- 自托管 / 其他注册表——如果不需要认证则可正常工作。

受认证的拉取（私有基础镜像）是后续计划。

支持 digest 引用：

```sh
mise oci build --from ubuntu@sha256:e3b0c44298fc...
```

## 可复现性

在同一主机上，使用未更改的输入重新运行 `mise oci build`
会生成字节级完全相同的工具层摘要。跨机器时，层摘要
可能会漂移，因为编译产物（pyc 字节码、生成的
node-gyp 输出等）可能会嵌入绝对路径。

要实现完全可复现的镜像配置时间戳，请设置
`SOURCE_DATE_EPOCH`：

```sh
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) mise oci build
```

## 跨平台构建

OCI 镜像面向 Linux。 在 macOS 或 Windows 上构建会生成一个 `os` 字段为 `linux` 的镜像，但其中嵌入的二进制文件（mise 以及每个工具层）仍然是宿主机原生的——它们在容器内执行时会因 `Exec format error` 而失败。

要获得可正常工作的镜像，请在 Linux 主机上（或在 Linux 容器内——`docker run -v $PWD:/src -w /src debian mise oci build` 可行）运行 `mise oci build`。当检测到这种不匹配时，mise 会打印警告。

## 已知限制（v1）

- `asdf` / `vfox` 后端会被拒绝（见上文）。
- `--from` 仅支持匿名镜像仓库拉取；目前还不支持认证。
  （`mise oci push` 确实支持认证——它只是委托给 skopeo/crane
  而这些工具本身已经支持。）
- 跨平台构建会生成损坏的镜像（可执行文件是宿主机原生的）；
  请在 Linux 主机上运行构建。
- Alpine / musl 基础镜像会导致大多数工具失效。
- `mise oci run` / `oci push` 会调用外部工具
  （podman、docker+skopeo、crane）。没有内置的容器运行时或
  镜像仓库客户端。

## 另请参阅

- [`mise oci build`](/cli/oci/build.md) — 完整 CLI 参考
- [OCI 镜像规范](https://github.com/opencontainers/image-spec)
- [skopeo](https://github.com/containers/skopeo)，用于推送镜像
