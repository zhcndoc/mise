---
description: "在镜像中安装 mise，使用它运行项目命令，或在用户主目录之外预安装工具，以用于共享开发容器。"
---

# Docker 指南

在镜像中安装 mise，使用它运行项目命令，或在用户主目录之外预安装工具，以用于共享开发容器。构建这些示例需要 Docker 和正在运行的容器引擎。

## 使用 mise 的 Docker 镜像

下面是一个示例 Dockerfile，展示如何在 Docker 镜像中安装 mise。

```Dockerfile [Dockerfile]
FROM debian:13-slim

RUN apt-get update  \
    && apt-get -y --no-install-recommends install  \
        # install any other dependencies you might need
        curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
# ENV MISE_VERSION="..."

RUN curl --proto '=https' --proto-redir '=https' \
    --fail --show-error --silent --location https://mise.run | sh
```

构建前，从构建上下文中排除本地凭据：

```gitignore [.dockerignore]
.env
.env.*
*.tfvars
*.tfvars.json
```

构建并运行 Docker 镜像：

```shell
docker build -t debian-mise .
docker run -it --rm debian-mise
```

上面的镜像只安装了 mise 本身。要将项目工具作为构建层安装，请在源文件之前复制项目配置：

```Dockerfile
WORKDIR /app
COPY mise.toml ./
RUN mise install
COPY . .
```

如果项目使用锁文件，也请复制 `mise.lock`，以及配置读取的所有文件。如果安装钩子需要应用程序文件，请在 `mise install` 之前复制这些文件。不要将凭据放入构建上下文，而不是依赖后续镜像层将其删除。在 `RUN` 和 `CMD` 指令中使用 `mise exec -- <command>` 或 `mise run <task>`；Docker 构建 shell 不会运行交互式激活钩子。

## 多用户容器中的共享工具

对于工具箱容器或应为所有用户预安装工具的堡垒主机，请使用 `mise install --system` 将工具安装到 `/usr/local/share/mise/installs`。每个用户的 mise 都会自动找到这些系统级工具，无需任何配置。

`--system` 会在用户之间共享安装位置；它不会将二进制文件放到 `PATH` 中，因此无法在不使用 mise 的情况下使用这些工具。如果你希望其他用户无需涉及 mise 即可运行这些工具，请参阅[如何安装其他用户无需使用 mise 即可运行的工具？](/faq.html#how-do-i-install-tools-other-users-can-run-without-mise)

下面的示例还展示了如何在 Debian/Ubuntu 镜像上使用 `extrepo` 安装 mise。使用此方法时，无法指定 `MISE_VERSION` 或 `MISE_INSTALL_PATH`。

```Dockerfile [Dockerfile]
# syntax=docker/dockerfile:1
FROM debian:13-slim

RUN <<EOF
  set -ex
  apt-get update
  apt-get install -y extrepo
  extrepo enable mise
  apt-get remove -y --auto-remove extrepo # extrepo 及其依赖在启用 extrepo 后就不再需要
  apt-get update
  apt-get install -y mise build-essential
  rm -fr /var/lib/apt/lists/*
EOF

# 将工具预安装到系统范围的共享目录
RUN mise install --system node@26 python@3.15
```

用户可以使用 `mise ls --installed` 查看共享安装。下面的版本展示了输出示例；补丁版本取决于镜像的构建时间：

```shell
$ mise ls --installed
node    26.0.0 (system)
python  3.15.0 (system)
```

用户可以在自己的目录中安装其他版本——这些版本的优先级高于系统版本。要自定义系统目录，请设置 `MISE_SYSTEM_DATA_DIR`。

你还可以通过 `MISE_SHARED_INSTALL_DIRS` 配置其他共享目录（在 Unix 上路径以 `:` 分隔，在 Windows 上以 `;` 分隔），或者使用 `shared_install_dirs` 设置。

### 带有主目录挂载的 Devcontainer

Devcontainer 通常会挂载用户的主目录，这意味着 `~/.local/share/mise/installs` 来自挂载而不是 Docker 镜像。构建 `docker build` 时预先安装到 `~/.local/share/mise/installs` 的工具会被挂载内容隐藏。

请改用 `mise install --system` 将工具安装到 `/usr/local/share/mise/installs` — 这个路径不在 `~` 下，并且不会受到主目录挂载的影响：

```Dockerfile [Dockerfile]
FROM debian:13-slim
# ... install mise ...
RUN mise install --system node@26 python@3.15
```

当容器在挂载了 `~` 的情况下启动时，用户仍然会自动看到系统工具。他们正常安装的任何工具都会进入 `~/.local/share/mise/installs`（位于挂载中）并优先于系统版本。

## 覆盖 libc 检测

在最小化 Docker 镜像（scratch、busybox、distroless）中，由于不存在动态链接器文件，mise 可能无法检测系统使用的是 musl 还是 glibc。设置 `libc` 或 `MISE_LIBC` 可以覆盖检测结果：

```Dockerfile
ENV MISE_LIBC=musl
RUN mise install
```

有效值为 `musl`、`glibc` 和 `gnu`（不区分大小写，其中 `gnu` 会被视为 glibc）。无效值会被静默忽略，mise 会回退到运行时检测。当 mise 二进制文件针对 musl 编译时（Linux 发行版的默认情况），如果未检测到链接器，它也会自动回退到 musl。

## 在 Docker 容器中运行 mise 的任务

这对于在干净环境中复现 mise 问题很有用。

```toml [mise.toml]
[tasks.docker]
interactive = true
run = "docker run -it --rm debian-mise"
```

先构建镜像（见上文），然后：

```shell
mise run docker
```

在这个一次性容器中，运行 `mise doctor`，或创建一个能够复现问题的小型 `mise.toml`。只有在测试交互式 shell 行为时，才使用 `eval "$(mise activate bash)"` 激活 mise。退出 shell 后，容器会因为任务使用了 `--rm` 而被删除。
