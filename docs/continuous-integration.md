---
description: "在 CI 和开发环境中使用相同的 mise.toml，以便两个环境选择相同的工具。"
---

# 持续集成

在 CI 和开发环境中使用相同的 `mise.toml`，以便两个环境选择相同的工具。使用 `mise exec` 或 [`mise run`](/tasks/) 运行命令，以加载这些工具和项目的[环境变量](/environments/)。在 CI 中不需要启用交互式 shell。

为了实现可复现安装，请提交一个[锁文件](/dev-tools/mise-lock.html)，并运行 `mise install --locked`。如果你的流水线还需要控制 mise 自身的更新，请单独固定 mise 版本。

## 任何 CI 提供商

以下 shell 命令使用[已提交的包装器](#bootstrapping)，并从已检出的仓库中运行。它们假定这是一个在 `mise.toml` 中声明了 Node.js、提交了 `package-lock.json`，并且在 `package.json` 中包含 `test` 脚本的 Node.js 项目。将 npm 命令替换为项目的构建或测试命令。运行器需要 `curl`、CA 证书、`tar`，以及 `sha256sum` 或 `shasum`，以便下载、验证和解压 mise。

```sh
set -eu
./bin/mise install
./bin/mise exec -- npm ci
./bin/mise exec -- npm test
```

运行包装器时设置 `MISE_VERSION`，以选择 mise 版本。如果仓库包含锁文件，请使用 `./bin/mise install --locked` 替代 `./bin/mise install`。

### 引导

提交一个包装器可以按需安装 mise，避免在每条流水线中单独执行安装步骤。使用 [`mise generate install-script`](/cli/generate/install-script.html) 在本地生成它：

```sh
mise generate install-script -l -w
```

提交生成的 `bin/mise` 文件，并将 `.mise/` 添加到 `.gitignore`。本地化包装器会将其 mise 二进制文件、已安装的工具、缓存和状态保存在 `.mise/` 下。安装和执行都使用该包装器，以便两个命令使用这些目录：

```sh
./bin/mise install
./bin/mise exec -- npm ci
./bin/mise exec -- npm test
```

包装器默认使用生成它的 mise 版本。重新生成并提交包装器即可更新该默认版本，或者在 CI 中设置 `MISE_VERSION`。`MISE_INSTALL_PATH` 会覆盖二进制文件的位置。不使用 `-l` 时，包装器会使用正常的 mise 目录，并将其二进制文件保存在数据目录的 `bootstrap/` 子目录下。较旧的包装器可能会复用之前缓存目录位置中的二进制文件；重新生成它们即可采用当前的安装行为。

### 缓存

缓存已安装的工具，以避免在每个作业中重复下载。缓存键应包含运行器的操作系统和架构、mise 配置以及锁文件。对于使用不同[环境](/configuration/environments.html)或安装选项的作业，应使用单独的缓存。恢复缓存后仍需运行 `mise install`：它会补齐缺失的工具。

请参阅[目录](/directories.html)，了解安装和元数据的位置。缓存是一种优化手段；即使缓存为空，作业也应能够成功运行。

## 针对不受信任的配置运行（安全模式）

从拉取请求分支解析版本的机器人可以使用 `MISE_SAFE=1`，以防止项目配置执行代码或注入环境变量。例如：

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json
```

当机器人应更新 `mise.lock` 时，移除 `--dry-run`。安全模式会拒绝任务、模板 `exec()` 和插件安装等操作；它会忽略项目环境和设置，并禁止钩子。某些后端需要执行代码，因此无法在此模式下解析版本。操作员拥有的全局配置仍然适用。请参阅[安全模式](/security.html#safe-mode)，了解确切的边界和后端限制。

## GitHub Actions

[mise-action](https://github.com/jdx/mise-action) 会安装 mise 以及已检出仓库中声明的工具。默认情况下，它还会缓存工具、将 shims 添加到 `PATH`，并为后续步骤导出 mise 环境变量。

```yaml
name: test
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: jdx/mise-action@v4
      - run: mise exec -- npm ci
      - run: mise exec -- npm test
```

对于包含 `mise.lock` 的仓库，请在操作的 `with` 块下添加 `install_args: --locked`。使用 `version` 输入固定 mise 版本，并使用 `working_directory` 选择子项目。在仓库配置中维护工具版本；当工作流有意提供自己的配置时，`mise_toml` 和 `tool_versions` 输入会很有用。请参阅[action inputs](https://github.com/jdx/mise-action/tree/v4#inputs)，了解缓存和身份验证选项。

## GitLab CI

此 `.gitlab-ci.yml` 使用 Debian 镜像和[已提交的包装器](#bootstrapping)。它假定与上方通用示例相同的 Node.js 项目。将工具所需的任何操作系统软件包添加到 `before_script` 中，或者构建一个已经安装这些软件包的 CI 镜像。

```yaml
build-job:
  stage: build
  image: debian:13-slim
  cache:
    key:
      prefix: mise-debian13-amd64
      files: [bin/mise, mise.toml, mise.lock]
    paths:
      - .mise/installs/
      - .mise/cache/
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends curl ca-certificates tar
  script:
    - ./bin/mise install
    - ./bin/mise exec -- npm ci
    - ./bin/mise exec -- npm run build
```

此示例的缓存前缀假定运行器使用 amd64 架构；对于其他架构，请选择不同的前缀。如果项目没有 `mise.lock`，请从键中移除 `mise.lock`；如果有该文件，则将安装命令切换为 `mise install --locked`。此示例还要求 `package.json` 中包含 `build` 脚本。本地化包装器会设置缓存使用的 mise 目录。

## Xcode Cloud

使用 Xcode Cloud 的[克隆后脚本](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts) `ci_scripts/ci_post_clone.sh`，在构建前安装并运行工具。将[生成的包装器](#bootstrapping)提交到 `bin/mise`。此示例假定仓库的 `mise.toml` 中声明了 SwiftLint：

```sh
#!/bin/sh
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
./bin/mise install
./bin/mise exec -- swiftlint lint
```

提交前请使脚本可执行。此脚本中的环境更改不会配置后续的每个构建阶段；其他需要 mise 工具的阶段也应使用 `mise exec`。对于本地 Xcode 构建，请参阅 [IDE 集成](/ide-integration.html#xcode)。
