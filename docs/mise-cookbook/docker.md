# Mise + Docker 食谱

以下是一些使用 Docker 和 mise 的技巧。

## 使用 mise 的 Docker 镜像

下面是一个示例 Dockerfile，展示如何在 Docker 镜像中安装 mise。

```Dockerfile [Dockerfile]
FROM debian:13-slim

RUN apt-get update  \
    && apt-get -y --no-install-recommends install  \
        # 安装你可能需要的任何其他依赖
        sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
# ENV MISE_VERSION="..."

RUN curl https://mise.run | sh
```

构建并运行 Docker 镜像：

```shell
docker build -t debian-mise .
docker run -it --rm debian-mise
```

## 多用户容器中的共享工具

对于工具箱容器或堡垒机主机，如果需要为所有用户预先安装工具，
请使用 `mise install --system` 将工具安装到 `/usr/local/share/mise/installs`。
每个用户的 mise 都会自动找到这些系统级工具，无需任何配置。

下面的示例还演示了在 Debian/Ubuntu 镜像上使用 `extrepo` 进行安装。
采用这种方式时，你不能指定 `MISE_VERSION` 或 `MISE_INSTALL_PATH`。

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

容器中的用户会自动看到这些工具：

```shell
$ mise ls
node    26.0.0 (system)
python  3.15.0 (system)
```

用户可以在自己的目录中安装其他版本——这些版本的优先级高于
系统版本。要自定义系统目录，请设置 `MISE_SYSTEM_DATA_DIR`。

你还可以通过 `MISE_SHARED_INSTALL_DIRS` 配置其他共享目录（在 Unix 上路径以 `:` 分隔，在 Windows 上以 `;` 分隔），或者使用 `shared_install_dirs` 设置。

### 带有主目录挂载的 Devcontainer

Devcontainer 通常会挂载用户的主目录，这意味着 `~/.local/share/mise/installs`
来自挂载而不是 Docker 镜像。构建 `docker build` 时预先安装到
`~/.local/share/mise/installs` 的工具会被挂载内容隐藏。

请改用 `mise install --system` 将工具安装到 `/usr/local/share/mise/installs` —
这个路径不在 `~` 下，并且不会受到主目录挂载的影响：

```Dockerfile [Dockerfile]
FROM debian:13-slim
# ... install mise ...
RUN mise install --system node@26 python@3.15
```

当容器在挂载了 `~` 的情况下启动时，用户仍然会自动看到系统工具。
他们正常安装的任何工具都会进入 `~/.local/share/mise/installs`（位于挂载中）并
优先于系统版本。

## 覆盖 libc 检测

在没有动态链接器文件的最小 Docker 镜像（scratch、busybox、distroless）中，mise 可能无法检测系统使用的是 musl 还是 glibc。设置 `libc` 或 `MISE_LIBC` 可强制检测：

```Dockerfile
ENV MISE_LIBC=musl
RUN mise install
```

有效值为 `musl`、`glibc` 和 `gnu`（不区分大小写，其中 `gnu` 视为 glibc）。无效值会被静默忽略，mise 会回退到运行时检测。当 mise 二进制是按 musl 编译时（Linux 发布版的默认设置），如果未检测到链接器，它也会自动回退到 musl。

## 在 Docker 容器中运行 mise 的任务

当你需要在一个干净的环境中复现你在使用 mise 时遇到的问题，这会很有用。

```toml [mise.toml]
[tasks.docker]
run = "docker run -it --rm debian-mise"
```

先构建镜像（见上文），然后：

```shell
❯ mise docker
[docker] $ docker run -it --rm debian-mise
root@75f179a190a1:/# eval "$(mise activate bash)"
# 覆盖配置并执行 prune，以便给我们一个干净的状态
root@75f179a190a1:/# echo "" > /mise/config.toml
root@75f179a190a1:/# mise prune --yes
# ...
```
