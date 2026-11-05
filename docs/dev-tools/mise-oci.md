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

- A Linux host with the image's architecture. mise copies the tools installed on
  the host into the image and does not cross-compile them, so an image built on
  macOS or Windows contains host binaries that fail with `Exec format error`, and
  mise warns when you build there. On another OS, run mise inside a Linux
  container that has its own tool installations; a stock `debian` image does not
  contain mise, and mounting your macOS or Windows installations into it does
  not work.
- The tools installed on the host. Run `mise install` before building: the build
  fails for a configured version that is not installed. The exception is a tool
  layer that [`mise oci push` reuses from the registry](#reuse-layers-from-the-registry).
  rust 也不例外：每次都会根据主机安装内容构建其[工具链层](#rust)。
- Docker or Podman, for `mise oci run` only. Building and pushing use mise's own
  registry client.
- A base image with a compatible libc. See [Base images](#registry-base-image-support).

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

`mise oci build` writes an OCI image layout to `./mise-oci`; add `mise-oci/` to
`.gitignore`. The image holds your tools on top of the base image set by
[`oci.default_from`](/configuration/settings.html#oci.default_from), but not your
application or its packages. Mount the project with `--volume` for development,
or [copy files into the image](#copy-files-into-the-image).

To inspect the layout without a container engine, run
`skopeo inspect oci:./mise-oci`. To publish the image, see
[Push to a registry](#mise-oci-push).

## What goes into the image

By default the image contains only what the project's config files declare: the
project's `mise.toml` and config files in its parent directories, such as a
monorepo root, but not a `mise.toml` directly in your home directory. Tools,
`[oci]` settings, `[bootstrap.packages]`, and `[dotfiles]` from your global
config (`~/.config/mise/config.toml`) and the system config are left out, as are
`MISE_<TOOL>_VERSION` overrides in the environment, so your personal tools stay
out of a project image. Pass `--include-global` to `build`, `run`, or `push` to
include them. Without any project config, the commands fail unless you pass
`--include-global`.

`[env]` is the exception: it is read from every loaded config, including your
global config. See [Environment variables in the image](#environment-variables-in-the-image).

### Layers {#how-layering-works}

`mise oci build` produces these layers, in order:

1. The base image's layers, copied from the registry unchanged so the registry
   can deduplicate them.
2. The running mise binary at `/usr/local/bin/mise`, unless you pass `--no-mise`.
3. One layer for the apt or apk [system packages](#bootstrap-and-dotfiles-in-oci-images),
   if any.
4. One layer per [vfox plugin](#vfox-plugins) that installed a tool, at
   `/mise/plugins/<name>/`, annotated with `dev.mise.plugin`.
5. One layer per tool at `/mise/installs/<tool>/<version>/`, annotated with
   `dev.mise.tool.short` and `dev.mise.tool.version`.
6. 如果工具集包含 rust，则为位于 `/mise/rust/` 的 [rust 工具链](#rust)构建一个图层，并添加 `dev.mise.rust.homes` 标注。
7. One layer per [copied file or directory](#copy-files-into-the-image),
   annotated with `dev.mise.copy`.
8. One layer for the [dotfiles](#bootstrap-and-dotfiles-in-oci-images), if any.
9. `/etc/mise/config.toml`, which pins each packaged tool to its exact version.
   The image's `MISE_DATA_DIR` and `MISE_CONFIG_DIR=/etc/mise` environment
   variables point the embedded mise at these files.

The paths above use the default mount point, `/mise`; change it with
`--mount-point` or `[oci].mount_point`.

Changing the Node.js version rebuilds only Node.js's layer. The other tool
layers are reused, while the config layer, image config, and manifest change to
record the new version. A tool layer is also rebuilt when its in-image path,
file owner, or contents change, and a Python change can rebuild the layers of
`pypi:` tools that link to that Python.

## Configure the image {#oci-section-in-mise-toml}

Set image options in an `[oci]` section of the project's `mise.toml`:

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

- `symlink` and `symlink-each` entries are copied as file contents, because a
  link to the build host's checkout would be broken in the container.
- Targets that start with `~/` are written under `/root/`.
- An `absent` entry, or a `remove_empty` template that renders empty, adds an
  OCI whiteout, so a file the base image has at that path is hidden.
- Templates that call `secret()` fail the build. Templates render without the
  `env` context, and calling `get_env()`, `exec()`, `read_file()`, `read_json()`, `read_yaml()`, or
  `read_toml()` fails the
  build, because those values could be recovered from an image layer.
- Tracked files and permissions-only entries are left out.
- `create_if_missing` 条目总会写入，因为构建时没有机器状态；它不会检查基础镜像中是否已有该文件。例外是渲染结果为空的 `remove_empty` 模板：它会像上文所述添加 whiteout，而不会写入内容。

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

## Supported backends

`mise oci build` packages tools from every backend except asdf, including
vfox plugins. It copies each tool's install directory into its layer and rewrites
executable paths and shebangs that point at the host install directory. That
does not make a tool self-contained: it can still need system libraries, other
runtimes, or files outside its install directory. Declare the runtimes a tool
needs alongside it, and test the image with the commands your project runs.

[asdf plugins](/dev-tools/backends/asdf.html) are rejected. Their install
scripts can write outside the version's directory, which a per-tool layer cannot
capture, and their `exec-env` scripts expect bash at runtime.

### rust

[rust](/lang/rust.html) 通过 rustup 安装到 `~/.cargo` 和 `~/.rustup`，而不是 mise 的安装目录。`mise oci build` 会在 `/mise/rust/` 下额外创建一个图层，复制 rustup 所需内容（挂载点下的 `cargo/` 和 `rustup/`）：rustup 代理、rustup 的 `settings.toml`，以及工具集中使用的每个工具链目录。主机 home 目录中的其他内容不会复制，例如注册表缓存、其他工具链和 `cargo install` 安装的二进制文件。镜像会将 `CARGO_HOME` 和 `RUSTUP_HOME` 设置为这些目录，因此 `cargo` 和 `rustc` 无需 rustup 下载内容即可运行。

如果 rust 来自 mise 未管理的 rustup（例如 `PATH` 上由系统软件包提供的 rustup），构建会失败。请使用 mise 安装 rust，或设置 `CARGO_HOME` 和 `RUSTUP_HOME`，然后再次运行 `mise install`。

### vfox plugins

Tools installed by [vfox plugins](/dev-tools/backends/vfox.html), including
custom [backend plugins](/backend-plugin-development.html) (`my-plugin:tool`),
are packaged like any other tool. mise also copies each plugin, without `.git`,
into its own layer at `/mise/plugins/<name>/`, so the embedded mise can use those
tools without cloning the plugin, and logs each plugin directory it copies.
Plugins built into the mise binary are not copied. A symlink inside a plugin
that resolves outside the plugin directory fails the build instead of copying a
host file into the image; replace it with a copy. Links that are already broken
on the build host are kept as they are.

The plugin's environment hook (`EnvKeys` or `BackendExecEnv`) runs on the build
host. Paths under the host install directory are rewritten to the image path,
and other values are written as they are. mise warns when a value points under
the build host's home directory, which usually does not exist in the container;
override such variables with [`[oci.env]`](#oci-section-in-mise-toml).

A plugin's `PostInstall` or `BackendInstall` hook can run any command, but only
files written to the tool's install directory end up in the image. A tool layer
is reused from the registry only when the plugin's contents match the plugin
that built it, so updating a plugin rebuilds its tools' layers.

## Base images {#registry-base-image-support}

mise pulls base images from any OCI Distribution v2 registry, such as Docker
Hub, ghcr.io, quay.io, or a self-hosted one. It handles anonymous tokens for
public images and uses your `docker login` or `podman login` credentials, so
private base images work too. Pass `scratch` to `--from` to build without a base
image.

A digest pins the base image; a mutable tag can resolve to a new base on a later
build:

```sh
mise oci build --from "REGISTRY/IMAGE@sha256:FULL_DIGEST"
```

请将占位符替换为镜像引用及其完整的 SHA256 摘要。

请选择 libc 和共享库适合已打包二进制文件的基础镜像。默认镜像 `debian:bookworm-slim` 使用 glibc。Alpine 或其他基于 musl 的镜像需要兼容 musl 的二进制文件或静态链接的二进制文件；更改 `--from` 不会针对另一种 libc 重新构建已安装的工具。工具运行时所需的系统库必须包含在镜像中。

各项标志的详情请参阅 [`mise oci build`](/cli/oci/build.html)、[`mise oci run`](/cli/oci/run.html) 和 [`mise oci push`](/cli/oci/push.html)。镜像格式由 [OCI 镜像规范](https://github.com/opencontainers/image-spec)和[分发规范](https://github.com/opencontainers/distribution-spec)定义。
