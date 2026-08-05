# mise oci <Badge type="warning" text="实验性" />

`mise oci build` 会将一个 `mise.toml` 转换为容器镜像，并且每个已安装的工具对应一个
[OCI](https://github.com/opencontainers/image-spec) 层。

其优势在于，**仅升级任意单个工具版本，只会使一个内容可寻址 blob 失效**。使用 Dockerfile 时，每个 `RUN install_tool` 都叠加在前一个之上——更改较早的 `RUN` 会使后续所有层失效。mise 的磁盘布局（每个工具都安装在独立的 `$MISE_DATA_DIR/installs/<plugin>/<version>/` 目录中）使得层的顺序在语义上变得无关紧要，因此切换某个工具的版本只会切换单个层，而其他所有内容（基础镜像、其他工具、mise 本身、镜像配置）都会原样复用。

::: warning 实验性
`mise oci build` 是实验性功能。可通过以下方式启用：

```sh
mise settings experimental=true
# 或者，在单次调用中：
MISE_EXPERIMENTAL=1 mise oci build …
```

标志、输出布局和默认值在未来版本中可能会发生变化。
:::

## 命令一览

| 命令             | 作用                                               |
| ---------------- | -------------------------------------------------- |
| `mise oci build` | 在磁盘上生成 OCI 镜像布局。                         |
| `mise oci run`   | 构建（或复用）镜像，并通过 podman/docker 在其中运行命令。 |
| `mise oci push`  | 构建（或复用）镜像，并将其推送到镜像仓库。           |

## 快速开始

```sh
# 使用默认基础镜像从当前 mise.toml 构建镜像
#（debian:bookworm-slim）。输出到 ./mise-oci/。
mise oci build

# 在镜像中运行交互式 shell（如果存在则使用 podman，否则使用
# docker）。
mise oci run -it -- bash

# 使用内置客户端推送到镜像仓库（无需 skopeo/crane）。
mise oci push ghcr.io/me/devenv:latest

# 输出是标准 OCI 镜像布局，因此外部工具也可以使用：
skopeo inspect oci:./mise-oci
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
               [--copy HOST_PATH:IMAGE_PATH]...
               [--no-mise] [--owner UID[:GID]]
```

- `-o, --output PATH` — 输出目录（默认为 `./mise-oci`）
- `--from REF` — 基础镜像引用（覆盖 `[oci].from` 和
  `oci.default_from` 设置）。使用 `scratch` 可在没有基础镜像的情况下构建。
- `-t, --tag REF` — 写入 `index.json` 的
  `org.opencontainers.image.ref.name` 注解中的标签
- `--mount-point PATH` — mise 在镜像中的安装位置
  （默认为 `/mise`）。必须是绝对路径。
- `--copy HOST_PATH:IMAGE_PATH` — 将主机文件或目录复制到镜像中的绝对路径。
  对于多个负载，可重复使用此标志。每个负载都会在工具层之后作为独立的、
  内容寻址的层生成。
- `--no-mise` — 不在 `/usr/local/bin/mise` 嵌入正在运行的 mise 二进制文件
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

**要求：**必须使用 `podman`（原生支持 OCI 布局）或
`docker`（mise 通过 `docker load` 将镜像流式传输到守护进程）。

## `mise oci push`

使用 mise 内置的 registry 客户端构建（或复用）镜像并将其推送到 registry——无需
skopeo、crane 或 docker 守护进程。只有 registry 中尚不存在的 blob 才会被上传，
因此，对于大部分内容未变化的工具集，重复推送时传输的数据非常少。
当基础镜像位于目标 registry 时，其 blob 会进行跨仓库挂载，而不是重新上传（不会传输任何字节）。
大型层会分块上传并显示进度条，暂时性的网络故障会采用退避策略重试
（`http_retries` 控制尝试次数）。

### 层复用

如果工具层的缓存键（工具、版本、镜像内前缀和文件所有者）与之前推送的镜像匹配，
则会**直接从 registry 复用，而不是重新构建**——完全跳过 tar/gzip 操作。
被复用的工具甚至不需要在本地安装，这会让 CI 推送变得很快：只有版本确实发生变化的工具才会被安装和打包。

- 默认情况下，缓存来源就是目标引用本身（之前以该标签推送的镜像）。
- `--cache-from REF` 会从**同一仓库**中的另一个标签复用层——适用于每次推送都使用唯一标签的情况：

  ```sh
  mise oci push --cache-from ghcr.io/me/dev:latest ghcr.io/me/dev:$GIT_SHA
  ```

- `--no-cache` 会禁用复用，并从本地安装重新构建每一层（类似 docker 的逃生舱——复用会信任
  registry 中的层内容与其注解匹配，而不是在本地重新构建完全相同的字节）。

有一个注意事项：环境派生（`JAVA_HOME` 风格的 `exec_env` 变量）会基于本地安装运行。
对于未安装的复用工具，大多数后端仍能正确派生路径，但较特殊的后端可能会生成不完整的环境变量——如果镜像配置看起来不正确，
请传入 `--no-cache`（并确保工具已安装）。

```sh
mise oci push [--image-dir DIR]
              [--from REF] [--mount-point PATH] [--no-mise]
              [--owner UID[:GID]]
              <REGISTRY_REF>
```

- `<REGISTRY_REF>` — 完全限定的目标地址（例如
  `ghcr.io/me/devenv:latest`）。必须包含 registry 主机名。回环地址 registry
  （`localhost:5000/…`）会通过普通 HTTP 访问，这是与 docker 相同的默认不安全约定。
  非回环的普通 HTTP registry（例如 `registry.lan:5000`）必须通过
  `oci.insecure_registries` 设置显式启用：

  ```toml
  [settings.oci]
  insecure_registries = ["registry.lan:5000"]
  ```

- `--image-dir` — 推送现有的 OCI 布局，而不是进行构建。

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

### 推送认证

凭据会按照 docker 和 podman 使用的相同来源解析，顺序如下：

1. `$REGISTRY_AUTH_FILE`
2. `$XDG_RUNTIME_DIR/containers/auth.json`（podman）
3. `~/.config/containers/auth.json`
4. `~/.docker/config.json`（或 `$DOCKER_CONFIG/config.json`）

支持内联的 `auths` 条目和凭据助手
（`credsStore` / `credHelpers`，例如 `docker-credential-osxkeychain`、
`docker-credential-ecr-login`）——因此，只需执行普通的
`docker login ghcr.io` 或 `podman login ghcr.io` 即可完成设置。
如果找不到凭据，mise 会匿名推送（适用于本地 registry）并发出警告。

对于 ghcr.io，令牌需要具备 `write:packages` 权限范围。

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

[[oci.copy]]
host  = "dist/my-app"
image = "/usr/local/bin/my-app"

[[oci.copy]]
host  = "assets"
image = "/srv/app/assets"

# 注入到镜像配置中的额外环境变量（仅适用于镜像——不会覆盖 MISE_*）。
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

复制源可以是文件、目录或符号链接。目录内容会放置在
`image` 指定的位置；不会添加源目录名称。镜像路径必须是绝对路径，且不能包含
`.` 或 `..` 组件。父目录会自动创建，可执行位会被保留，所有权遵循
`--owner` 或 `[oci].user_id` / `[oci].group_id`。复制层会添加
`dev.mise.copy=<image path>` 注解，以便在检查期间识别。
`[[oci.copy]]` 中的相对 `host` 路径相对于声明它们的配置文件所在目录解析；
CLI 中的相对路径相对于当前工作目录解析。
当分层配置复制到相同的镜像路径时，较不具体的条目会先输出，以便更具体的配置生效。
CLI 复制项最后输出。

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

基础镜像可以从任何 OCI Distribution v2 注册表中拉取 —
Docker Hub、ghcr.io、quay.io、自托管注册表等。对于公开镜像，
匿名令牌身份验证会自动处理；当你已登录时
（`docker login` / `podman login`），系统会使用这些凭据，因此
私有基础镜像也同样可用。

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

### 多架构镜像

单个主机只能构建单个平台，但 `mise oci push
--update-index` 允许每种架构使用一个运行器来组装多架构
标签：每次推送都会按摘要上传其平台清单，并将标签指向一个 OCI **镜像索引**，同时保留其他已推送平台的条目。

```yaml
# CI 示例：每种架构一个作业，使用相同的标签
jobs:
  push-amd64: # runs-on: ubuntu-24.04
    run: mise oci push --update-index ghcr.io/me/dev:latest
  push-arm64: # runs-on: ubuntu-24.04-arm
    needs: push-amd64 # 按顺序执行，以避免读-改-写竞争
    run: mise oci push --update-index ghcr.io/me/dev:latest
```

重新推送相同的平台会替换其条目（不会产生重复项），并且单架构标签会升级为索引，同时不会丢失现有平台。通过索引可以复用层——缓存会解析到与构建平台匹配的条目。

请注意，索引更新采用读-改-写方式（Distribution API 不支持条件写入），因此来自不同运行器的并发推送可能发生竞争——请像上面那样按顺序执行。

## 已知限制（v1）

- `asdf` / `vfox` 后端会被拒绝（见上文）。
- 跨平台构建会生成损坏的镜像（二进制文件采用主机原生格式）；
  请在 Linux 主机上运行构建。
- Alpine / musl 基础镜像会导致大多数工具无法正常运行。
- `mise oci run` 需要容器引擎（podman 或 docker）——mise
  没有内置的容器运行时。推送不需要外部工具。

## 另请参阅

- [`mise oci build`](/cli/oci/build.md) — 完整的 CLI 参考
- [OCI 镜像规范](https://github.com/opencontainers/image-spec)
- [OCI 分发规范](https://github.com/opencontainers/distribution-spec)
