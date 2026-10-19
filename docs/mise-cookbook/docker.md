---
description: "在 Docker 中运行 mise：选择官方镜像、在构建期间安装项目工具，并在用户间共享工具。"
socialDescription: "通过官方镜像、构建时安装和共享工具，在 Docker 中运行 mise。"
---

# Docker

在容器中运行 mise 有两种方式：基于 `-debian` 镜像构建，该镜像已包含 mise、`curl` 和 `git`，适用于 CI 任务和开发容器；或者将 scratch 镜像中的静态二进制文件复制到现有镜像中。无论采用哪种方式，构建期间都可以通过 `mise install` 安装项目工具。

## 官方镜像 {#official-images}

从 2026.9.11 版本开始，每个稳定版本都会为 `linux/amd64` 和 `linux/arm64` 发布镜像，地址为 `ghcr.io/jdx/mise` 和 Docker Hub 上的 `jdxcode/mise`。两个镜像仓库使用相同的标签。

| 镜像        | 标签示例                                         | 用途                                               |
| ----------- | ---------------------------------------------- | -------------------------------------------------- |
| Scratch     | `2026.10.4`、`2026.10`、`latest`               | 将静态 musl 二进制文件复制到自定义镜像             |
| Debian slim | `2026.10.4-debian`、`2026.10-debian`、`debian` | 在 CI 任务和开发容器中运行 mise                   |

请将示例版本替换为要固定使用的[发行版本](https://github.com/jdx/mise/releases)。

Scratch 镜像包含作为入口点的 `/usr/local/bin/mise` 和 CA 证书，不含 Shell 或包管理器。Debian 镜像基于 Debian 13 (trixie) slim，包含 glibc 版 mise 二进制文件、`ca-certificates`、`curl`、`git` 和 Node.js 26 及更新版本所需的 `libatomic1`。该镜像没有设置 `ENTRYPOINT`，因此可以作为基础镜像使用，CI 执行器也可以提供自己的 Shell 命令。两个镜像都不会预装工具。

两个镜像都设置 `MISE_DATA_DIR=/mise`、`MISE_CONFIG_DIR=/mise` 和 `MISE_CACHE_DIR=/mise/cache`，并将 `/mise/shims` 加入 `PATH`。发行工作流会先使用 minisign 签名的校验和验证二进制文件，再将其复制到镜像中。

请使用完整版本标签选择发行版。`2026.10` 这样的月份标签以及 `latest`、`debian` 这样的浮动标签会随新版本发布而移动。早于 2026.9.11 的版本标签和截至 `2026.8` 的月份标签仍指向[旧镜像](#migrating-from-the-previous-image)，且没有 `-debian` 变体。

### 按摘要固定镜像 {#pin-an-image-by-digest}

版本标签用于选择发行版，但镜像重新构建后，该标签指向的内容可能改变。若要选择精确镜像，请先查看其摘要：

```sh
docker buildx imagetools inspect ghcr.io/jdx/mise:2026.10.4
```

将下面的 `<digest>` 替换为命令输出中的摘要：

```Dockerfile
COPY --from=ghcr.io/jdx/mise@sha256:<digest> /usr/local/bin/mise /usr/local/bin/mise
```

`FROM` 指令和 CI 镜像引用也使用相同语法。要获取 Debian 镜像的摘要，请检查 `-debian` 标签。

## 在镜像中安装项目工具 {#installing-project-tools}

先于源文件复制项目配置，并在单独的镜像层中运行 `mise install`。这样只有配置发生变化时，Docker 才需要重新构建工具。

### 基于 Debian 镜像构建 {#use-the-debian-image-as-a-base}

此示例假设 `mise.toml` 中声明了 Node.js，应用通过 `node server.js` 启动，且项目提交了 `mise.lock`：

```Dockerfile [Dockerfile]
FROM ghcr.io/jdx/mise:2026.10.4-debian

WORKDIR /app
COPY mise.toml mise.lock ./
RUN mise trust && mise install --locked
COPY . .
CMD ["mise", "exec", "--", "node", "server.js"]
```

使用锁文件时，构建会安装其中记录的版本，而不会获取各工具的可用版本列表；Docker 层没有缓存列表，因此不使用锁文件时，每次重建都会查询所有工具。请为镜像所用的平台创建锁定条目，例如运行 `mise lock --platform linux-x64,linux-arm64`；详见 [CI 和 Docker 中的锁文件](/dev-tools/mise-lock.html#ci-cd)。如果项目使用了 npm 或 PyPI 工具，且其[依赖关系图](/dev-tools/mise-lock.html#dependency-graphs)锁定在 `.mise/locks/` 中，也请在安装前添加 `COPY .mise/locks .mise/locks`。不使用锁文件时，请从 `COPY` 中移除 `mise.lock`，并从安装命令中移除 `--locked`。

使用 `apt-get` 添加工具所需的系统软件包。GitLab CI 的示例请参阅 [CI 镜像示例](/continuous-integration.html#use-the-official-image)。

### 将二进制文件复制到自定义镜像 {#copy-the-binary-into-your-own-image}

将 scratch 镜像中的 `/usr/local/bin/mise` 复制到 Linux 镜像。这个静态链接的二进制文件可在 glibc 和 musl 系统上运行，包括 Debian 和 Alpine。`COPY --from` 只会复制二进制文件，不会复制源镜像中的证书或环境变量，因此需要自行安装 CA 证书、设置 mise 目录，并安装工具所需的系统软件包：

```Dockerfile [Dockerfile]
FROM debian:13-slim

COPY --from=ghcr.io/jdx/mise:2026.10.4 /usr/local/bin/mise /usr/local/bin/mise

RUN apt-get update \
    && apt-get -y --no-install-recommends install ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV PATH="/mise/shims:$PATH"

WORKDIR /app
COPY mise.toml ./
RUN mise trust && mise install
COPY . .
```

### 构建时需要复制的文件 {#build-context}

如果项目使用锁文件，请将 `mise.lock` 与 `mise.toml` 一起复制；若存在 `.mise/locks/` 目录，也一并复制，并复制配置读取的其他文件。如果安装钩子需要应用文件，请在运行 `mise install` 前复制这些文件。

使用 `.dockerignore` 将本机凭据和 mise 个人配置文件排除在构建上下文之外，避免 `COPY . .` 将它们打包进镜像。`.local.toml` 文件用于保存个人覆盖项，其中可能包含密钥。请根据项目调整以下规则：

```gitignore [.dockerignore]
.env
.env.*
*.tfvars
*.tfvars.json
# mise.local.toml, mise.<env>.local.toml, .mise/config.local.toml and the like
**/*.local.toml
```

Docker 构建所用的 Shell 不会运行交互式激活钩子。在 `RUN` 和 `CMD` 指令中，请使用 `mise exec -- <command>` 或 `mise run <task>`。

## 不使用官方镜像安装 mise {#installing-mise-yourself}

若要自行将 mise 安装到现有基础镜像中，请选择一种方式：

| 方式                                                    | 适用情况                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [packslip](#bootstrap-with-packslip)                    | 按摘要固定安装器，并通过构建参数选择 mise 版本。                                          |
| [发行版软件包](#distribution-packages)                  | 镜像已信任所用发行版的软件包仓库。                                                         |
| [验证后下载发行版](#verified-release-download)           | 只使用 `curl` 和 `minisign` 安装指定的精确版本。                                           |
| [已提交的包装脚本](#committed-wrapper)                   | 仓库已经提交了 `bin/mise`。                                                                |
| [安装脚本](#install-script)                              | 希望使用最简短的 Dockerfile。                                                              |

### 使用 packslip 初始化 {#bootstrap-with-packslip}

[packslip](/installing-mise.html#packslip) 会在解压 mise 前检查发行版的签名和发布者，因此构建期间无需运行安装脚本。按摘要固定 packslip，并通过构建参数选择 mise 版本：安装器保持不变，而 mise 可以升级到新版本。

此示例通过多平台镜像摘要固定 packslip 1.5.1，并复制其 CA 证书以支持 HTTPS。packslip 会自行下载并解压归档文件，因此此步骤无需在镜像中安装 `curl`、`tar` 或包管理器：

```Dockerfile [Dockerfile]
FROM ghcr.io/jdx/packslip:1.5.1@sha256:fcbbcb85ab02d433d6108c212ffc7eaeda0bbafca4b82111c452568ac680b9c4 AS bootstrap
FROM debian:13-slim

COPY --from=bootstrap /packslip /usr/local/bin/packslip
COPY --from=bootstrap /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

ARG MISE_VERSION=latest
RUN packslip install github.com/jdx/mise --version "$MISE_VERSION" \
      --pin ps1_nlhmwtfeufglxv5myvwvronk7a \
    && mise --version

ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV PATH="/mise/shims:$PATH"

CMD ["mise", "--version"]
```

该摘要会为 `linux/amd64` 和 `linux/arm64` 固定 packslip。packslip 版本、mise 版本和签名者固定值彼此独立：签名者固定值用于标识 mise 的 GitHub 仓库，因此即使 mise 发布新版本，也能持续验证其身份，而无需固定某个发行版。设置 `MISE_VERSION=latest` 可以让 mise 随新版本更新，同时保持 packslip 不变；这适用于基础镜像、CI 初始化或无需随着每个 mise 版本更换安装器的发行版软件包。若也要固定 mise，请传入 `--build-arg MISE_VERSION=2026.10.4`。

请在包含此 Dockerfile 的目录中构建：

```sh
docker build --no-cache -t mise-bootstrap .
docker run --rm mise-bootstrap
```

Docker 会缓存 `RUN` 层，因此即使要求安装 `latest`，也会继续使用缓存中的 mise，直到使用 `--no-cache` 重新构建。packslip 不会自动更新自身或 mise，运行中的容器也不会自行更新 mise；请重新构建镜像或运行 `mise self-update`。不同 mise 发行版可以继续使用相同的 packslip 摘要，但遇到[安全性或格式变更](https://packslip.dev/docs/compatibility/#maintaining-packaged-verifiers)时，可能需要升级 packslip。

以 root 身份运行时，packslip 会将 mise 安装到 `/opt/packslip`，并创建指向它的 `/usr/local/bin/mise` 链接。若要将安装内容复制到另一个构建阶段，请同时复制 `/opt/packslip` 和该链接。接下来请参阅[安装项目工具](#installing-project-tools)。

### 发行版软件包 {#distribution-packages}

[apt](/installing-mise.html#apt)、[dnf](/installing-mise.html#dnf) 和 [apk](/installing-mise.html#apk) 安装方式依赖包管理器的签名检查。下面的 Debian 示例使用 `extrepo` 配置 mise 的 apt 仓库：

```Dockerfile [Dockerfile]
# syntax=docker/dockerfile:1
FROM debian:13-slim

RUN <<EOF
  set -ex
  apt-get update
  apt-get install -y extrepo
  extrepo enable mise
  apt-get remove -y --auto-remove extrepo # extrepo and its deps are not needed after extrepo enable
  apt-get update
  apt-get install -y mise
  rm -fr /var/lib/apt/lists/*
EOF
```

这里的版本不由 `MISE_VERSION` 决定；请改用 apt 版本约束来固定版本。

### 验证后下载发行版 {#verified-release-download}

每个发行版都会提供由 minisign 和 GPG 签名的 `SHASUMS256.txt`。以下 Debian
示例下载适用于 `amd64` 或 `arm64` 的 glibc 二进制文件，先用 minisign 验证校验和文件，再检查二进制文件后安装：

```Dockerfile [Dockerfile]
FROM debian:13-slim

ARG MISE_VERSION=2026.10.4
ARG MISE_MINISIGN_KEY=RWTC3g8W3z4RZK3V3qv7fa1QY4JEWyBtqIHW+85QlJpZc5yG+uNYNBSZ

RUN apt-get update \
    && apt-get -y --no-install-recommends install ca-certificates curl git minisign \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    base="https://github.com/jdx/mise/releases/download/v${MISE_VERSION}"; \
    asset="mise-v${MISE_VERSION}-linux-$(dpkg --print-architecture | sed 's/amd64/x64/')"; \
    cd /tmp; \
    curl -fsSLO "$base/SHASUMS256.txt"; \
    curl -fsSLO "$base/SHASUMS256.txt.minisig"; \
    curl -fsSLO "$base/$asset"; \
    minisign -Vm SHASUMS256.txt -P "$MISE_MINISIGN_KEY"; \
    grep " ./$asset\$" SHASUMS256.txt | sha256sum -c --strict; \
    install -m 755 "$asset" /usr/local/bin/mise; \
    rm -f SHASUMS256.txt SHASUMS256.txt.minisig "$asset"
```

上面的公钥是 mise 在 [`minisign.pub`](https://github.com/jdx/mise/blob/main/minisign.pub) 中发布的发行版签名密钥。对于 Alpine 和其他 musl 基础镜像，请使用 `-musl` 资源文件。

### 已提交的包装脚本 {#committed-wrapper}

[`mise generate install-script --localize --write bin/mise`](/cli/generate/install-script.html) 会根据经过签名验证且内嵌校验和的安装脚本生成 `bin/mise` 包装脚本。将包装脚本提交到版本库、复制到镜像中，然后调用 `./bin/mise`；它会在首次使用时安装固定版本的 mise。详见[持续集成](/continuous-integration.html#bootstrapping)。

### 安装脚本 {#install-script}

`mise.run` 安装脚本会自动选择平台并检查二进制文件的校验和。设置 `MISE_VERSION` 可固定发行版本：

```Dockerfile [Dockerfile]
FROM debian:13-slim

RUN apt-get update \
    && apt-get -y --no-install-recommends install curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
ENV MISE_VERSION="2026.10.4"

RUN curl --proto '=https' --proto-redir '=https' \
    --fail --show-error --silent --location https://mise.run | sh
```

请安装工具所需的系统软件包，例如为需要从源码构建的工具安装 `build-essential`。

## 在多个用户间共享工具 {#shared-tools-in-multi-user-containers}

对于工具箱容器或堡垒主机，如果希望每个用户都能使用一组预装工具，请运行 `mise install --system`。工具会安装到 `/usr/local/share/mise/installs`，所有用户的 mise 都会检查该目录，无需设置 [`shared_install_dirs`](/configuration/settings.html#shared_install_dirs)。[系统级安装](/dev-tools/system-installs.html)详细介绍了此命令。

安装工具并不会选择版本。项目仍需在 `mise.toml`（例如 `node = "26"`）中指定版本，或通过 `mise exec node@26 -- node --version` 请求版本；此时 mise 会使用系统级安装，而不再重复下载。`--system` 只共享安装目录，不会将二进制文件加入 `PATH` 供用户脱离 mise 使用。如需了解无需 mise 即可由其他用户运行的工具，请参阅[常见问题](/faq.html#mise-is-for-dev-tools-not-applications-or-system-packages)。

官方镜像会为所有用户将 `MISE_DATA_DIR`、`MISE_CONFIG_DIR` 和 `MISE_CACHE_DIR` 指向 `/mise`。如果基于这些镜像构建多用户镜像，请为每个用户取消设置或覆盖这些变量。下面的示例将 mise 复制到普通 Debian 镜像中，避免了这个问题；每个用户会保留自己的 `~/.local/share/mise`，而 `/usr/local/share/mise/installs` 则作为共享目录：

```Dockerfile [Dockerfile]
FROM debian:13-slim

COPY --from=ghcr.io/jdx/mise:2026.10.4 /usr/local/bin/mise /usr/local/bin/mise

RUN apt-get update \
    && apt-get -y --no-install-recommends install ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pre-install tools to the system-wide shared directory
RUN mise install --system node@26 python@3.14
```

用户可以通过 `mise ls --installed` 查看共享安装。补丁版本取决于镜像的构建时间：

```text
node    26.x.x (system)
python  3.14.x (system)
```

用户仍可将其他版本安装到自己的数据目录中，个人安装的优先级高于系统版本。若要移动共享目录或添加其他共享目录，请参阅[系统级安装](/dev-tools/system-installs.html#directories)。

### 为开发容器预装工具 {#devcontainers-with-home-directory-mounts}

若要从生成的配置开始，请运行 `mise generate devcontainer --write`。它会创建 `.devcontainer/devcontainer.json`，其中包含 mise 开发容器功能和用于运行 `mise install` 的 `postCreateCommand`；`--mount-mise-data` 会为 mise 数据目录添加挂载卷。详见 [`mise generate devcontainer`](/cli/generate/devcontainer.html)。

开发容器通常会挂载用户的主目录，因此 `~/.local/share/mise/installs` 会来自挂载卷，并遮住 `docker build` 预先安装在该位置的工具。请改用 `mise install --system` 安装工具。它们会放在主目录 `~` 之外的 `/usr/local/share/mise/installs`，因此不会被挂载卷遮挡：

```Dockerfile [Dockerfile]
FROM debian:13-slim
# ... install mise ...
RUN mise install --system node@26 python@3.14
```

容器启动并挂载 `~` 后，配置中指定的版本仍会使用系统级安装。用户之后安装的工具会写入挂载卷中的 `~/.local/share/mise/installs`，其优先级高于系统版本。

## 覆盖 libc 检测结果 {#overriding-libc-detection}

在缺少动态链接器文件的精简镜像（scratch、busybox、distroless）中，mise 可能无法检测系统使用的是 musl 还是 glibc。设置 [`libc`](/configuration/settings.html#libc) 选项或 `MISE_LIBC` 可覆盖检测结果：

```Dockerfile
ENV MISE_LIBC=musl
RUN mise install
```

有效值为 `musl`、`glibc` 和 `gnu`（不区分大小写；`gnu` 会按 glibc 处理）。mise 会忽略无效值并回退到运行时检测。Scratch 镜像提供的静态 `-musl` 版 mise 在检测不到链接器时会回退为 musl。

## 在干净的容器中复现问题 {#task-to-run-mise-in-a-docker-container}

从 Debian 镜像启动一个临时容器，检查问题是否也会在本机之外复现：

```sh
docker run -it --rm ghcr.io/jdx/mise:debian bash
```

在容器中运行 `mise doctor`，或创建一个能够复现问题的精简 `mise.toml`。只有在测试交互式 Shell 行为时才需要通过 `eval "$(mise activate bash)"` 激活 mise。退出 Shell 后，容器会被移除。

如果需要经常执行此操作，可以将其保存为任务：

```toml [mise.toml]
[tasks.docker]
interactive = true
run = "docker run -it --rm ghcr.io/jdx/mise:debian bash"
```

## 从旧版 latest 镜像迁移 {#migrating-from-the-previous-image}

`latest` 指向不含 Shell 的 scratch 镜像。如果 CI 任务或开发容器之前使用旧的源码构建版 `latest` 镜像，请切换到 `debian` 标签，并通过 `mise install` 安装项目工具。旧镜像仍以 `dev` 标签发布，供 mise 自身使用，不支持其他用途。
