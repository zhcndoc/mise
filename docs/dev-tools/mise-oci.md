---
description: "mise oci build 会将 mise.toml 转换为容器镜像，并且每个已安装的工具对应一个 OCI 层。"
---

# mise oci <Badge type="warning" text="experimental" />

`mise oci build` 会将一个 `mise.toml` 转换为容器镜像，并且每个已安装的工具对应一个
[OCI](https://github.com/opencontainers/image-spec) 层。

工具层可以在版本发生变化时独立复用。镜像配置、清单以及输入发生变化的层仍需要更新；Python
发生变化时，也可能使依赖它的 pipx 层失效。

请在具有目标架构的 **Linux 主机上构建**。mise 会打包已安装的主机二进制文件；它不会交叉编译，也不会为镜像下载其他操作系统的工具。`mise oci run` 还需要 Docker 或 Podman。构建和推送 OCI 布局使用 mise 自带的镜像和注册表支持。

::: warning 实验性
`mise oci build` 是实验性功能。可通过以下方式启用：

```sh
mise settings set experimental=true
# or, per-invocation:
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

在 Linux 上，先从类似以下的项目配置开始：

```toml [mise.toml]
[settings]
experimental = true

[tools]
node = "24"
```

构建本地镜像布局，然后通过容器引擎验证其中的可执行文件：

```sh
mise oci build -o ./mise-oci
mise oci run --image-dir ./mise-oci -- node --version
```

默认基础镜像为 `debian:bookworm-slim`。将生成的 `mise-oci/` 目录添加到 `.gitignore`。这会创建一个工具环境；它不会自动复制你的应用或安装其软件包依赖。开发时请使用卷，或者使用
[`oci.copy`](/dev-tools/mise-oci.html#oci-section-in-mise-toml) 将需要放入镜像的文件复制进去。

要使用外部工具检查布局，请安装 `skopeo`，然后运行
`skopeo inspect oci:./mise-oci`。要发布它，请参阅[推送认证](#push-authentication)，并选择一个你有写入权限的注册表/仓库：

```sh
mise oci push --image-dir ./mise-oci ghcr.io/OWNER/IMAGE:TAG
```

请替换大写的占位符。此命令会将镜像发布到该注册表；它独立于本地构建和运行检查。

## 分层工作方式

给定这个 `mise.toml`：

```toml
[tools]
node = "20"
python = "3.12"
jq = "1.8.1"
```

`mise oci build` 会生成大致如下的分层：

1. **基础镜像层**（例如 `debian:bookworm-slim`）——从 registry 原样复制，因此 registry
   去重机制可以生效。
2. `/usr/local/bin/mise` 中的 **mise 二进制文件**（使用 `--no-mise` 跳过）。
3. **配置的 apt 或 apk `[bootstrap.packages]`**（如果有），安装到基础 rootfs 中，并作为一个软件包层输出。
4. **每个工具一个层**，每个层的根目录为
   `/mise/installs/<plugin>/<version>/`。使用
   `dev.mise.tool.short` 和 `dev.mise.tool.version` 注解。
5. **配置的 `[dotfiles]`**（如果有），作为镜像文件写入。
6. **生成的 `/etc/mise/config.toml`**，将 `/mise` 作为数据目录。

更改 Node.js 后，不相关的工具归档仍可复用。生成的配置和镜像清单仍会反映新版本。复用还取决于镜像内路径、文件所有权以及任何重定位输入。

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

`oci build`、`oci run` 和 `oci push` 共享一个用于打包工具层的本地缓存。未发生变化的工具只需要 tar 和 gzip 一次，即使构建不同的镜像或使用不同的输出目录也是如此。并发构建会针对每个缓存条目进行协调，每个输出布局都会获得本地缓存层的完整副本。

本地复用会对文件及其镜像路径、可执行权限、符号链接目标、所有权和重定位后的内容进行哈希。编辑或重新安装工具后，如果打包内容发生变化，其缓存就会失效，即使版本、文件大小和修改时间保持不变。缓存命中时仍会读取并哈希安装内容；它们会跳过 tar 构建和 gzip 压缩。基础镜像不属于工具层的缓存键。

传入 `oci build --no-cache` 或 `oci push --no-cache` 可绕过本地缓存。
`mise cache clear TOOL` 会移除该工具的缓存层；`mise cache clear`
会移除所有缓存层。缓存条目位于常规 mise 工具缓存中，因此 CI 任务可以通过 `MISE_CACHE_DIR` 一并保留这些缓存。

当推送一个基础镜像位于目标**同一仓库**中的镜像时，mise 会获取当前基础镜像清单和配置，但将其层 blob 保留在 registry 中。每次推送都会解析可变的基础镜像标签。这样可以避免下载目标中已经包含的基础层，包括使用 `--cache-from` 或 `--no-cache` 时也是如此。安装 `[bootstrap.packages]` 的构建仍会下载基础层以解包文件系统；`oci build` 和 `oci run` 也会下载这些层以生成完整的本地镜像。

缓存键（工具、版本、镜像内前缀和文件所有者）与之前推送的镜像匹配的工具层，会**从 registry 复用而不是重新构建**——完全跳过 tar/gzip 操作。复用的工具甚至不需要在本地安装，这使 CI 推送变得很快：只有实际版本发生变化的工具才会被安装和打包。

- 默认情况下，缓存来源就是目标引用本身（之前以该标签推送的镜像）。
- `--cache-from REF` 会从**同一仓库**中的另一个标签复用层——适用于每次推送都使用唯一标签的情况：

  ```sh
  mise oci push --cache-from ghcr.io/me/dev:latest ghcr.io/me/dev:$GIT_SHA
  ```

- `--no-cache` 会禁用远程和本地工具层复用，并从本地安装重新构建（docker 风格的逃生开关——复用会信任 registry 的层内容与其注解匹配，而不是在本地重新构建完全相同的字节）。

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
entrypoint  = []           # ENTRYPOINT
cmd         = []                        # CMD
user        = "1000:1000"                # USER
user_id     = 1000                      # tar layer entry UID (file ownership)
group_id    = 1000                      # tar layer entry GID (defaults to user_id)
mount_point = "/mise"                  # where tools install in the image

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

复制示例要求 `dist/my-app` 和 `assets` 存在。
`[oci].user` 设置镜像的 `USER` 指令；它不会创建账户、主目录或可写工作区。请使用数字 UID/GID，或使用基础镜像已经提供的用户。`[oci].user_id` 和
`[oci].group_id` 设置层文件所有权；如果未配置 `group_id`，则默认为解析后的 `user_id`。

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

对于软件包，OCI 构建支持 Debian/Ubuntu 基础镜像中的 `apt:` 条目，以及 Alpine/Wolfi 基础镜像中的
`apk:` 条目。mise 会将基础镜像解包到临时 rootfs 中，调用匹配的主机软件包管理器将软件包安装到该 rootfs，
然后将文件系统变更作为一个 OCI 层输出，并使用
`dev.mise.system.packages=apt` 或 `dev.mise.system.packages=apk` 进行注解。一次构建只能使用与其基础镜像匹配的软件包管理器；混用 `apt:` 和 `apk:` 条目会被拒绝。

对于 apt 层，主机必须提供 `apt-get` 和 `dpkg`；对于 apk 层，主机必须提供 `apk`。
apk 软件包脚本会在 chroot 中执行，因此 apk 层目前要求在以 root 身份运行 mise 的 Linux 主机上构建。
`--no-cache` 会传递给 apk，并且会在创建层之前删除临时软件包管理器缓存和日志文件。

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

请选择与打包二进制文件及其共享库兼容的基础镜像。
默认使用 glibc。Alpine/musl 基础镜像需要兼容 musl 或适用的静态二进制文件；更改 `--from` 不会针对不同的 libc 重新构建已安装的工具。运行时所需的系统库必须存在于镜像中。

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

mise 会发出警告，说明它烘焙进镜像的 `[env]` 变量数量。
:::

## 支持的后端

构建器接受内置后端，并打包每个选定工具的安装目录。它还会重定位受支持的可执行文件路径和 shebang。构建器接受某个工具并不保证该工具是自包含的：可能仍需要系统库、外部运行时或其安装目录之外的路径。请将所需的运行时与工具一同声明，并使用项目实际运行的命令验证生成的镜像。

asdf 和 vfox 插件（包括自定义 vfox 后端插件）会被拒绝。它们的安装钩子可能会在每个版本目录之外写入内容，而每工具层模型无法可靠地捕获这些内容。

## 注册表基础镜像支持

基础镜像可以从任何 OCI Distribution v2 注册表中拉取 —
Docker Hub、ghcr.io、quay.io、自托管注册表等。对于公开镜像，
匿名令牌身份验证会自动处理；当你已登录时
（`docker login` / `podman login`），系统会使用这些凭据，因此
私有基础镜像也同样可用。

支持 digest 引用：

```sh
mise oci build --from "REGISTRY/IMAGE@sha256:FULL_DIGEST"
```

请将占位符替换为实际的镜像引用及其完整的 SHA256 摘要。digest 会固定基础镜像；可变标签可能会在之后的构建中解析到新的基础镜像。

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

OCI 镜像以 Linux 为目标。虽然在 macOS 或 Windows 上构建会生成 `os` 字段为 `linux` 的镜像，但其中嵌入的二进制文件（mise 和每个工具层）仍然是主机原生的——在容器中执行时会因 `Exec format error` 而失败。

请在 Linux 主机上，或在已经安装 mise 和所需工具安装依赖的 Linux 开发容器中构建。标准的 `debian` 镜像不包含 mise。不要将 macOS 或 Windows 的工具安装目录挂载到该容器中来替代 Linux 安装。主机和镜像平台不匹配时，mise 会发出警告。

### 多架构镜像

单个主机只能构建单个平台，但 `mise oci push
--update-index` 允许每种架构使用一个运行器来组装多架构
标签：每次推送都会按摘要上传其平台清单，并将标签指向一个 OCI **镜像索引**，同时保留其他已推送平台的条目。

例如，以下 GitHub Actions 任务会一次构建一个架构。
它假定项目具有 `mise.toml`，发布到 GHCR，并且授予工作流访问该软件包的权限：

```yaml
name: Publish development image
on: workflow_dispatch
permissions:
  contents: read
  packages: write
concurrency:
  group: mise-development-image
  cancel-in-progress: false
jobs:
  publish:
    strategy:
      max-parallel: 1
      matrix:
        runner: [ubuntu-24.04, ubuntu-24.04-arm]
    runs-on: ${{ matrix.runner }}
    env:
      MISE_EXPERIMENTAL: "1"
    steps:
      - uses: actions/checkout@v6
      - uses: jdx/mise-action@v4
      - name: Authenticate to GHCR
        env:
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
      - name: Publish this architecture
        run: mise oci push --update-index "ghcr.io/${GITHUB_REPOSITORY,,}/dev:latest"
```

请选择仓库中可用的运行器标签。矩阵串行化可以防止两个平台的推送相互竞争，而工作流并发控制可以防止该工作流的多个运行实例同时更新同一标签。

重新推送同一平台会替换其条目（不会产生重复项），之前的单架构标签会升级为索引，同时不会丢失现有平台。层复用可以通过索引工作——缓存会解析到与构建平台匹配的条目。

索引更新采用读取-修改-写入方式（Distribution API 不支持条件写入），因此不同运行器向同一标签并发推送时可能发生竞争——请像上面的示例一样进行排序。

## 已知限制（v1）

- `asdf` / `vfox` 后端会被拒绝（见上文）。
- 跨平台构建会生成损坏的镜像（二进制文件是主机原生的）；
  请在 Linux 主机上运行构建。
- 基础镜像必须提供兼容的 libc 和其他运行时库。
- `mise oci run` 需要容器引擎（podman 或 docker）——mise 没有
  内置的容器运行时。推送不需要外部工具。

## 另请参阅

- [`mise oci build`](/cli/oci/build.md) — 完整的 CLI 参考
- [OCI 镜像规范](https://github.com/opencontainers/image-spec)
- [OCI 分发规范](https://github.com/opencontainers/distribution-spec)
