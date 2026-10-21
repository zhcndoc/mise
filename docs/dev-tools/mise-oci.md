---
description: 根据项目的 mise.toml 构建容器镜像，每种工具对应一个 OCI 层，然后在本地运行或推送到镜像仓库。
socialDescription: 根据项目的 mise.toml 构建容器镜像，每种工具各占一层。
---

# OCI 镜像 <Badge type="warning" text="实验性" />

`mise oci build` 会将项目 `mise.toml` 中声明的工具打包到容器镜像中，每种工具各占一个 [OCI](https://github.com/opencontainers/image-spec) 层，因此更改某个工具的版本时只需重建该工具对应的层。`mise oci run` 会通过 Docker 或 Podman 在镜像中运行命令；`mise oci push` 则会将镜像上传到镜像仓库。

::: warning 实验性功能
`mise oci` 目前仍处于实验阶段。可在 `[settings]` 下设置 `experimental = true` 启用，也可以设置 `MISE_EXPERIMENTAL=1`。不同发行版之间，命令标志和输出布局可能发生变化。
:::

## 要求

- Linux 宿主机，且宿主机体系结构必须与镜像一致。mise 会将宿主机上已安装的工具复制到镜像中，不会进行交叉编译。因此，在 macOS 或 Windows 上构建的镜像会包含宿主机二进制文件，运行时会出现 `Exec format error`；mise 也会在此类系统上构建时发出警告。在其他操作系统上，请在拥有独立工具安装的 Linux 容器中运行 mise；标准 `debian` 镜像不包含 mise，将 macOS 或 Windows 上的工具安装目录挂载到容器中也无法使用。
- 工具必须已安装在宿主机上。构建前运行 `mise install`；如果配置的版本尚未安装，构建会失败。例外是 [`mise oci push` 从镜像仓库复用的工具层](#reuse-layers-from-the-registry)。
- 仅运行 `mise oci run` 时需要 Docker 或 Podman。构建和推送使用 mise 自带的镜像仓库客户端。
- 基础镜像必须使用兼容的 libc。参见[基础镜像](#registry-base-image-support)。

<a id="quick-start"></a>

## 快速开始

在 Linux 上，可先创建如下项目配置：

```toml [mise.toml]
[settings]
experimental = true

[tools]
node = "24"
```

安装工具、构建镜像，然后在镜像中运行命令：

```sh
mise install
mise oci build -o ./mise-oci
mise oci run --image-dir ./mise-oci -- node --version
# v24.x.x
```

`mise oci build` 会将 OCI 镜像布局写入 `./mise-oci`；请将 `mise-oci/` 加入 `.gitignore`。镜像会在 [`oci.default_from`](/configuration/settings.html#oci.default_from) 指定的基础镜像上包含你的工具，但不包含应用程序或其软件包。开发时可以使用 `--volume` 挂载项目，也可以[将文件复制到镜像中](#copy-files-into-the-image)。

若要在不使用容器引擎的情况下检查镜像布局，请运行 `skopeo inspect oci:./mise-oci`。发布镜像请参阅[推送到镜像仓库](#mise-oci-push)。

## 镜像包含哪些内容

默认情况下，镜像只包含项目配置文件中声明的内容：项目的 `mise.toml` 及其父目录中的配置文件（例如 monorepo 根目录中的配置），但不包含直接位于主目录下的 `mise.toml`。全局配置（`~/.config/mise/config.toml`）和系统配置中的工具、`[oci]` 设置、`[bootstrap.packages]`、`[dotfiles]`，以及环境中的 `MISE_<TOOL>_VERSION` 覆盖项都不会纳入，因此个人工具不会混入项目镜像。对 `build`、`run` 或 `push` 传入 `--include-global` 可将这些配置纳入镜像。若没有任何项目配置，除非传入 `--include-global`，否则命令会失败。

例外是 `[env]`：mise 会从每个已加载的配置中读取它，包括全局配置。参见[镜像中的环境变量](#environment-variables-in-the-image)。

### 镜像层 {#how-layering-works}

`mise oci build` 会按以下顺序生成镜像层：

1. 基础镜像的各层，直接从镜像仓库复制，保持不变，以便镜像仓库进行去重。
2. 正在运行的 mise 二进制文件，位于 `/usr/local/bin/mise`；传入 `--no-mise` 时除外。
3. 如果有 apt 或 apk [系统软件包](#bootstrap-and-dotfiles-in-oci-images)，则为其生成一层。
4. 每个用于安装工具的 [vfox 插件](#vfox-plugins)各占一层，存放于 `/mise/plugins/<name>/`，并添加 `dev.mise.plugin` 注解。
5. 每种工具在 `/mise/installs/<tool>/<version>/` 各占一层，并添加 `dev.mise.tool.short` 和 `dev.mise.tool.version` 注解。
6. [复制到镜像中的每个文件或目录](#copy-files-into-the-image)各占一层，并添加 `dev.mise.copy` 注解。
7. 如果有[点文件](#bootstrap-and-dotfiles-in-oci-images)，则为其生成一层。
8. `/etc/mise/config.toml`，其中将每个打包的工具固定到精确版本。镜像的 `MISE_DATA_DIR` 和 `MISE_CONFIG_DIR=/etc/mise` 环境变量会让内置 mise 使用这些文件。

以上路径使用默认挂载点 `/mise`；可通过 `--mount-point` 或 `[oci].mount_point` 修改。

更改 Node.js 版本时，只会重建 Node.js 对应的镜像层。其他工具层会复用，配置层、镜像配置和清单则会更新，以记录新版本。镜像内路径、文件所有者或内容发生变化时，也会重建对应工具层；更改 Python 还可能重建关联到该 Python 的 `pypi:` 工具层。

## 配置镜像 {#oci-section-in-mise-toml}

在项目的 `mise.toml` 中使用 `[oci]` 段设置镜像选项：

```toml
[oci]
from = "debian:bookworm-slim"  # base image
tag = "ghcr.io/me/devenv:v1"   # tag recorded in the layout
workdir = "/workspace"         # WORKDIR
entrypoint = []                # ENTRYPOINT
cmd = []                       # CMD
user = "1000:1000"             # USER
user_id = 1000                 # owner UID of files in generated layers
group_id = 1000                # owner GID (defaults to user_id)
mount_point = "/mise"          # where tools live in the image

[oci.labels]
"org.opencontainers.image.source" = "https://github.com/me/my-app"
```

`entrypoint`、`cmd` 和 `user` 默认沿用基础镜像中的值；若基础镜像和 `[oci]` 均未设置 `workdir`，则默认为 `/workspace`。`user` 会设置镜像的 `USER`，但不会创建用户账户、主目录或可写工作区，因此请使用数字 UID 和 GID，或基础镜像中已有的用户。`user_id` 和 `group_id` 用于设置生成层中文件的所有者（未设置时为 `0:0`）；`--owner UID[:GID]` 可覆盖这两个值。

### 优先级

命令行标志优先于 `[oci]`；`[oci]` 又优先于
[`oci.default_from`](/configuration/settings.html#oci.default_from) 与
[`oci.default_mount_point`](/configuration/settings.html#oci.default_mount_point)
设置。如果多个项目配置文件都设置了 `[oci]`（例如 monorepo 根目录和子项目），mise 会逐字段合并，并以更具体的文件中对应字段为准；`[oci.env]` 和 `[oci.labels]` 则按键合并。只有传入 `--include-global` 时才会应用全局配置中的 `[oci]`。

### 镜像中的环境变量

镜像环境按以下顺序构建，后面的条目会覆盖前面的条目：

1. 基础镜像的环境变量。
2. 每个已加载配置中的 `[env]`，包括全局 `~/.config/mise/config.toml`，即使未传入 `--include-global` 也会读取。模板会展开，`.env` 文件也会读取。
3. 各工具设置的变量，例如 `JAVA_HOME`、`GOROOT` 或 `GEM_HOME`；其中的宿主机路径会改写为镜像路径。
4. `[oci.env]`。
5. `PATH`：先列出镜像中各工具的 bin 目录，再附加以上配置中的 `PATH`。
6. `MISE_DATA_DIR`（挂载点）和 `MISE_CONFIG_DIR=/etc/mise`。以上配置均无法覆盖它们。

::: warning `[env]` 中的值会写入镜像
`[env]` 中的所有内容，包括从 `.env` 文件和全局配置加载的值，都会写入镜像配置。任何拿到镜像的人都能通过 `docker inspect` 或 `skopeo inspect` 读取这些内容。在构建准备推送的镜像前，请从全局 `[env]` 中移除个人令牌或取消设置。密钥应在运行时通过 `docker run -e`、密钥挂载或编排工具传入；`[oci.env]` 中只放适合公开的值。mise 会提示写入镜像的 `[env]` 变量数量。
:::

通过 `[env]` 将变量标记为 `required` 后，`mise oci` 命令会用 `[oci.env]` 中的值满足该要求，因此构建宿主机无需设置此变量。这样可以为仅在运行时提供的密钥设置占位值：

```toml
[env]
AWS_ACCESS_KEY_ID = { required = "AWS access key ID for S3", redact = true }

[oci.env]
AWS_ACCESS_KEY_ID = "placeholder"
```

只有项目配置中的 `[oci.env]` 会满足此要求；其他命令仍会强制检查 `required`。

### 将文件复制到镜像中 {#copy-files-into-the-image}

每个 `[[oci.copy]]` 条目或 `--copy HOST:IMAGE` 标志都会在工具层之后添加一层：

```toml
[[oci.copy]]
host = "dist/my-app"
image = "/usr/local/bin/my-app"

[[oci.copy]]
host = "assets"
image = "/srv/app/assets"
```

来源可以是文件、目录或符号链接，并且构建时必须存在。目录内容会复制到 `image` 指定的位置，不会额外添加源目录名称。镜像路径必须是绝对路径，不能包含 `.` 或 `..` 组件。mise 会创建父目录、保留可执行权限，并根据 `--owner` 或 `user_id` 和 `group_id` 设置所有权。`[[oci.copy]]` 中的相对 `host` 路径相对于声明该条目的配置文件所在目录解析；相对 `--copy` 路径则相对于当前目录解析。分层配置将内容复制到相同镜像路径时，会先处理不够具体的条目，因此更具体的配置优先，`--copy` 层最后处理。mise 会对每个复制项发出警告，提醒你检查其中是否包含密钥。

## 系统软件包与点文件 {#bootstrap-and-dotfiles-in-oci-images}

`mise oci build` 会将项目的 `[bootstrap.packages]` 和 `[dotfiles]` 条目应用到镜像中，这相当于在镜像中执行 [`mise bootstrap`](/bootstrap.html) 的软件包和点文件部分。传入 `--include-global` 后，也会应用全局和系统配置中的条目。

```toml
[bootstrap.packages]
"apt:curl" = "latest"

[dotfiles]
"/etc/profile.d/project.sh" = { source = "profile.sh", mode = "copy" }
"~/.config/app/config.toml" = { source = "config.toml", mode = "template" }
```

Debian 或 Ubuntu 基础镜像可以使用 `apt:` 软件包条目；Alpine 或 Wolfi 基础镜像可以使用 `apk:` 条目，但一次构建不能混用两者。mise 会将基础镜像解包到临时根文件系统，在宿主机上运行相应的软件包管理器进行安装，并将变更输出为带有 `dev.mise.system.packages` 注解的层。使用 apt 时，宿主机需要 `apt-get` 和 `dpkg`；使用 apk 时需要 `apk`。软件包脚本会在镜像的 chroot 中运行，因此构建 apt 或 apk 层时 mise 都必须以 root 身份运行（apk 还要求宿主机为 Linux）。创建镜像层前，mise 会清除软件包管理器缓存和日志。

其他软件包管理器（例如 `brew:`）的条目会导致构建失败。请将它们放在镜像构建不会读取的配置中，或者在构建时通过
[`system_packages.managers`](/configuration/settings.html#system_packages.managers)
设置排除该软件包管理器，例如 `MISE_SYSTEM_PACKAGES_MANAGERS=apt mise oci build`。

点文件会作为普通文件写入镜像：

- `symlink` 和 `symlink-each` 条目会复制为文件内容，因为指向构建宿主机检出目录的链接在容器中会失效。
- 以 `~/` 开头的目标路径会写入 `/root/` 下。
- `absent` 条目或渲染结果为空的 `remove_empty` 模板会添加 OCI whiteout，从而隐藏基础镜像中该路径已有的文件。
- 调用 `secret()` 的模板会导致构建失败。模板渲染时不提供 `env` 上下文；调用 `get_env()`、`exec()`、`read_file()`、`read_json()`、`read_yaml()` 或 `read_toml()` 也会导致构建失败，因为这些值可能从镜像层中恢复。
- 跟踪文件和仅修改权限的条目不会纳入镜像。

如果纳入的配置设置了 `[bootstrap.macos.*]` 默认项，`mise oci build` 会失败；请将这些设置放在构建不会读取的配置中，例如不传入 `--include-global` 时的全局配置。其他 `[bootstrap]` 段（例如 `[bootstrap.files]`）和 `bootstrap` 任务不会应用到镜像。容器启动时要执行的工作请放入镜像的 `entrypoint` 或 `cmd`。

## 在镜像中运行命令 {#mise-oci-run}

`mise oci run` 会构建镜像，或使用通过 `--image-dir` 指定的布局，将镜像载入容器引擎，并使用当前终端的 stdin、标准输出和标准错误运行命令：

```sh
mise oci run -it -- bash
mise oci run -e DEBUG=1 --volume "$PWD:/work" -w /work -- npm test
```

mise 优先使用可原生加载 OCI 布局的 Podman；否则会通过 `docker load` 将镜像流式传入 Docker。可使用 `--engine` 选择引擎。`--volume` 没有 `-v` 简写，因为 `-v` 是 mise 的 `--verbose`。命令退出后，mise 会移除容器和载入的镜像。传入 `--keep` 可将镜像保留在引擎的存储中；在 Docker 中，其标签为 `mise-oci:run-*`。

## 推送到镜像仓库 {#mise-oci-push}

`mise oci push` 会构建镜像，或使用通过 `--image-dir` 指定的布局，并通过 mise 自带的镜像仓库客户端上传。它不需要 Docker、skopeo 或 crane。

```sh
# Build and push in one step
mise oci push ghcr.io/me/devenv:latest

# Push an image built earlier
mise oci build -o ./img
mise oci push --image-dir ./img ghcr.io/me/devenv:v1
```

镜像引用中应包含仓库主机名。包含路径但未指定主机名的引用（例如 `me/devenv:latest`）会推送到 Docker Hub（`docker.io`）；不带路径的名称（例如 `devenv:latest`）则会被拒绝。

mise 只会上传镜像仓库中尚不存在的数据块，因此推送几乎未更改的镜像时传输量很小。如果目标仓库中已有基础镜像，其镜像层会跨仓库挂载，而不会重复上传。如果基础镜像与目标位于同一仓库，mise 也不会下载其镜像层，除非构建过程安装了 `[bootstrap.packages]`。较大的镜像层会分块上传，失败的请求最多重试 [`http_retries`](/configuration/settings.html#http_retries) 次。

### 身份验证 {#push-authentication}

mise 会按以下顺序从 Docker 和 Podman 使用的相同文件中读取镜像仓库凭据：

1. `$REGISTRY_AUTH_FILE`
2. `$XDG_RUNTIME_DIR/containers/auth.json`
3. `~/.config/containers/auth.json`
4. `~/.docker/config.json` 或 `$DOCKER_CONFIG/config.json`

内嵌的 `auths` 条目和凭据助手（`credsStore`、`credHelpers`，例如 `docker-credential-osxkeychain` 或 `docker-credential-ecr-login`）都受支持，因此只需运行 `docker login ghcr.io` 或 `podman login ghcr.io` 即可完成设置。没有凭据时，mise 会发出警告并匿名推送，适用于本地镜像仓库。推送到 ghcr.io 时，令牌需要 `write:packages` 范围。

### HTTP 镜像仓库

与 Docker 一样，mise 会通过明文 HTTP 访问 `localhost:5000` 等回环地址上的镜像仓库。其他使用明文 HTTP 的仓库请列入
[`oci.insecure_registries`](/configuration/settings.html#oci.insecure_registries):

```toml
[settings.oci]
insecure_registries = ["registry.lan:5000"]
```

### 复用镜像仓库中的镜像层

`mise oci push` 会复用目标位置已有镜像中的工具层。工具、版本、挂载点、文件所有者均匹配时即可复用；对于 vfox 工具，插件内容也必须匹配。复用的工具不会重新打包，也无需在本地安装，因此 CI 推送时只需安装和打包已更改的工具。

如果每次推送都使用唯一标签，可通过 `--cache-from` 从同一仓库的其他标签复用镜像层：

```sh
mise oci push --cache-from ghcr.io/me/dev:latest "ghcr.io/me/dev:$GIT_SHA"
```

`--no-cache` 会关闭远程和本地复用，并根据本地安装重建每个工具层。如果不想信任镜像仓库中的层与其注解相符，可使用此标志。`--cache-from` 不能与 `--no-cache` 或 `--image-dir` 同时使用。

`JAVA_HOME` 等工具环境变量根据本地安装计算。对于未在本地安装但从镜像仓库复用的工具，大多数后端也能正确计算这些变量；不过，如果 vfox 插件的环境钩子会检查安装目录，生成的值可能不完整。如果镜像环境看起来不正确，请先安装该工具，再使用 `--no-cache` 推送。

## 多架构镜像

一台宿主机只能构建一个平台。要发布多架构标签，请针对每种架构各运行一次
`mise oci push --update-index`：每次推送都会按摘要上传该平台的清单，并将标签指向 OCI
镜像索引，同时保留其他平台已推送的条目。再次推送同一平台会替换该平台的条目；单平台标签也会转换为索引，并保留原平台。通过索引复用镜像层时，会使用与当前构建平台对应的条目。

以下 GitHub Actions 工作流每次构建一种架构。此示例假设项目中有 `mise.toml`，并且工作流有权限写入 GHCR 软件包：

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
      - uses: actions/checkout@v7
      - uses: jdx/mise-action@v5
      - name: Authenticate to GHCR
        env:
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
      - name: Publish this architecture
        run: mise oci push --update-index "ghcr.io/${GITHUB_REPOSITORY,,}/dev:latest"
```

更新索引需要先读取、再修改并写回。由于镜像仓库 API 不支持条件写入，同时向同一标签推送两次可能会导致某个平台条目丢失。`max-parallel: 1` 会依次构建各个架构；工作流的 `concurrency` 组则确保两个工作流运行不会同时更新该标签。请使用仓库实际提供的 runner 标签。

## 镜像层缓存与可复现性 {#layer-reuse}

`mise oci build`、`run` 和 `push` 共用已打包工具层的本地缓存，因此即使生成不同镜像或输出到不同目录，未更改的工具也只需压缩一次。缓存键涵盖每个文件的内容和镜像路径、可执行权限、符号链接目标、所有权及重定位后的内容，但不包含基础镜像。如果编辑或重新安装工具后打包内容发生变化，其缓存条目就会失效，即使版本、文件大小和修改时间保持不变。命中缓存时仍会读取并计算安装文件的哈希，但会跳过构建和压缩 tar 包。

`mise oci build --no-cache` 和 `mise oci push --no-cache` 会跳过本地缓存。`mise oci run` 没有对应标志；请先使用 `--no-cache` 构建，再通过 `mise oci run --image-dir` 使用构建结果。`mise cache clear TOOL` 会删除某个工具的缓存层，`mise cache clear` 则会全部清除。缓存条目位于 mise 缓存目录中，因此 CI 作业可以通过缓存 `MISE_CACHE_DIR` 来保留这些条目。

### 可复现性

在同一台宿主机上，输入不变时重新构建会生成逐字节相同的工具层。不同机器构建出的镜像层摘要可能不同，因为 Python 字节码或 node-gyp 输出等编译文件可能包含绝对路径。若要让镜像配置中的时间戳可复现，请设置 `SOURCE_DATE_EPOCH`：

```sh
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) mise oci build
```

## 支持的后端

除 asdf 外，`mise oci build` 支持打包所有后端的工具，包括 vfox 插件。它会将每个工具的安装目录复制到对应镜像层，并重写指向宿主机安装目录的可执行文件路径和 shebang。但这并不意味着工具可以独立运行：它仍可能依赖系统库、其他运行时或安装目录之外的文件。请同时声明工具所需的运行时，并使用项目实际运行的命令测试镜像。

[asdf 插件](/dev-tools/backends/asdf.html)不受支持。它们的安装脚本可能会在版本目录之外写入文件，而单个工具层无法捕获这些文件；此外，它们的 `exec-env` 脚本要求运行时提供 bash。

### vfox 插件

通过 [vfox 插件](/dev-tools/backends/vfox.html)安装的工具（包括自定义[后端插件](/backend-plugin-development.html)，如 `my-plugin:tool`）会像其他工具一样打包。mise 还会将每个插件（不含 `.git`）复制到 `/mise/plugins/<name>/` 下的独立镜像层中，使镜像内置的 mise 无需克隆插件即可使用这些工具，并记录复制的每个插件目录。内置在 mise 二进制文件中的插件不会复制。如果插件中的符号链接指向插件目录之外，构建会失败，而不会将宿主机文件复制到镜像；请改用副本。构建宿主机上已经失效的链接会保持原样。

插件的环境钩子（`EnvKeys` 或 `BackendExecEnv`）会在构建宿主机上运行。宿主机安装目录下的路径会重写为镜像中的路径，其他值则原样写入。如果某个值指向构建宿主机的主目录，mise 会发出警告，因为容器中通常不存在该目录；请使用 [`[oci.env]`](#oci-section-in-mise-toml) 覆盖此类变量。

插件的 `PostInstall` 或 `BackendInstall` 钩子可以运行任意命令，但只有写入工具安装目录的文件会进入镜像。仅当镜像仓库中的插件内容与构建该镜像层时使用的插件一致，工具层才会被复用；因此，更新插件会重建其工具层。

## 基础镜像 {#registry-base-image-support}

mise 可以从任何 OCI Distribution v2 镜像仓库拉取基础镜像，例如 Docker Hub、ghcr.io、quay.io 或自建仓库。对于公开镜像，mise 会处理匿名令牌；对于私有基础镜像，则会使用 `docker login` 或 `podman login` 凭据。若要在不使用基础镜像的情况下构建，请为 `--from` 传入 `scratch`。

使用摘要可以固定基础镜像；可变标签在后续构建时可能解析到新的基础镜像：

```sh
mise oci build --from "REGISTRY/IMAGE@sha256:FULL_DIGEST"
```

请将占位符替换为镜像引用及其完整的 SHA256 摘要。

请选择 libc 和共享库适合已打包二进制文件的基础镜像。默认镜像 `debian:bookworm-slim` 使用 glibc。Alpine 或其他基于 musl 的镜像需要兼容 musl 的二进制文件或静态链接的二进制文件；更改 `--from` 不会针对另一种 libc 重新构建已安装的工具。工具运行时所需的系统库必须包含在镜像中。

各项标志的详情请参阅 [`mise oci build`](/cli/oci/build.html)、[`mise oci run`](/cli/oci/run.html) 和 [`mise oci push`](/cli/oci/push.html)。镜像格式由 [OCI 镜像规范](https://github.com/opencontainers/image-spec)和[分发规范](https://github.com/opencontainers/distribution-spec)定义。
