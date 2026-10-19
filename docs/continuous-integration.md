---
description: "在 CI 和开发环境中使用相同的 mise.toml，以便两个环境选择相同的工具。"
---

# 持续集成

在 CI 和开发环境中使用相同的 `mise.toml`，确保两个环境选择相同的工具。使用 `mise exec` 或 [`mise run`](/tasks/) 运行命令，即可加载这些工具和项目的[环境变量](/environments/)。CI 无需启用 shell 集成。

提交一份[锁文件](/dev-tools/mise-lock.html)，并使用 `mise install --locked` 安装。这样每个作业都会安装相同的版本，mise 也会直接从 `mise.lock` 读取版本，而不必像在全新运行器上那样每次运行都获取各工具的可用版本列表。创建锁文件时，为每种运行器平台都添加条目：

```sh
mise lock --platform linux-x64,linux-arm64,macos-arm64
```

如果工具没有对应的锁文件条目，`--locked` 会直接失败，而不会查询其版本。对于会记录下载 URL 的后端，条目还必须包含当前平台对应的 URL；详见[严格锁文件模式](/dev-tools/mise-lock.html#strict-lockfile-mode)。如果流水线还需要控制 mise 自身的更新，请单独固定 mise 版本。

## GitHub Actions {#github-actions}

[mise-action](https://github.com/jdx/mise-action) 会安装 mise 和检出仓库中声明的工具。默认情况下，它还会缓存工具、将 shims 目录加入 `PATH`，并将项目环境变量导出给后续步骤：

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
      - uses: actions/checkout@v7
      - uses: jdx/mise-action@v5
      - run: mise run test
```

::: warning
恢复的工具缓存会直接信任：mise 不会将已安装文件与 `mise.lock` 进行比对。若要改为缓存下载文件并由 mise 校验，请参阅[缓存下载文件，而非安装结果](#trusted-cache)。
:::

此示例假设 `mise.toml` 中定义了 `test` 任务，例如在 `[tasks]` 下设置 `test = "npm ci && npm test"`。也可以使用 `mise exec -- npm test`。

如果仓库中有 `mise.lock`，该 action 会自动运行 `mise install --locked`。使用 `version` 输入固定 mise 版本，使用 `working_directory` 选择子项目。请将工具版本保留在仓库配置中；`mise_toml` 和 `tool_versions` 输入适用于自行提供配置的工作流。缓存和令牌选项请参阅 [action 输入项](https://github.com/jdx/mise-action/blob/v5/action.yml)。

Action 在安装工具时会将工作流的 GitHub token 提供给 mise，但不会将其导出到后续步骤。如果后续步骤需要安装工具或遇到 GitHub API 速率限制，请按照 [GitHub token](/dev-tools/github-tokens.html#ci-github-actions) 中的说明传入 token。

### 缓存下载文件，而非安装结果 {#trusted-cache}

使用 `mise.lock` 时，应缓存下载存储目录，而不是已安装的工具。mise 使用存储文件前会将其哈希值与锁文件中的校验和进行比对，因此遭篡改或过期的缓存不会影响安装内容，同时会关闭 action 自身的工具缓存：

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: actions/cache@v6
    with:
      # Linux 默认路径；macOS 和 Windows 请使用下文对应的平台路径。
      path: ~/.cache/mise/downloads-cas
      key: mise-downloads-${{ runner.os }}-${{ hashFiles('mise.lock') }}
  - uses: jdx/mise-action@v5
    with:
      cache: false
```

上方路径是 mise 在 Linux 上的默认缓存目录。在 macOS 上，缓存 `~/Library/Caches/mise/downloads-cas`。在 Windows 上，使用运行器的临时目录上下文，让 GitHub Actions 在将路径传给缓存 action 前完成解析：<code v-pre>${{ runner.temp }}\mise\downloads-cas</code>。如果设置了 `MISE_CACHE_DIR`，则在该目录下缓存 `downloads-cas`。详情请参阅 [`mise directories`](/directories.html)。

安装时会运行 `mise install --locked`，只复用带有校验和可供比对的下载文件。每次运行都会重新解压工具，因此比恢复安装结果更慢；从源码编译的工具也仍需编译。下载存储最多占用 [`download_cache_max_size`](/configuration/settings.html#download_cache_max_size) 指定的空间（默认 2 GiB）。详见 [`download_cache`](/configuration/settings.html#download_cache) 和[恢复的缓存与已安装工具](/dev-tools/mise-lock.html#restored-caches)。

若要创建工作流，请运行 [`mise generate github-action`](/cli/generate/github-action.html)，它会生成一个在 pull request、标签和推送到当前分支时运行 `mise run ci` 的工作流。添加 `--write` 可将其保存为 `.github/workflows/ci.yml`。提交前请检查触发条件和 action 版本：

```sh
mise generate github-action --write --task=ci
```

## GitLab CI {#gitlab-ci}

以下示例假设使用 amd64 运行器（arm64 请更改缓存前缀）、`package.json` 中包含 `build` 脚本的 Node.js 项目，且已提交
`mise.lock`。如果没有锁文件，请从缓存键中移除 `mise.lock`，并从安装命令中移除 `--locked`。GitLab 默认最多允许在
`cache:key:files` 中指定两个路径。工具需要的系统软件包应添加到 `before_script`，也可以预先构建包含这些软件包的 CI 镜像。

### 使用已提交的包装脚本 {#use-a-committed-wrapper}

此作业在 Debian 镜像中运行[已提交的包装脚本](#bootstrapping)。本地化包装脚本会将 mise 的目录保存在 `.mise/` 下，供作业缓存：

```yaml
build-job:
  stage: build
  image: debian:13-slim
  cache:
    key:
      prefix: mise-debian13-amd64
      files: [mise.toml, mise.lock]
    paths:
      - .mise/installs/
      - .mise/cache/
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends curl ca-certificates tar
  script:
    - ./bin/mise install --locked
    - ./bin/mise exec -- npm ci
    - ./bin/mise exec -- npm run build
```

为更新到较新 mise 版本而重新生成包装脚本时，请更改前缀以创建新缓存，例如使用 `mise-debian13-amd64-2026.10.4`。

### 使用官方镜像 {#use-the-official-image}

[官方 `-debian` 镜像](/mise-cookbook/docker.html#official-images)已包含 mise、`curl`、`git` 和 CA 证书，因此作业可以直接使用，无需包装脚本或覆盖 `ENTRYPOINT`。请将 mise 数据目录和缓存目录设在项目内部，以便 GitLab 缓存：

```yaml
build-job:
  stage: build
  image: ghcr.io/jdx/mise:2026.10.4-debian
  variables:
    MISE_DATA_DIR: $CI_PROJECT_DIR/.mise
    MISE_CACHE_DIR: $CI_PROJECT_DIR/.mise/cache
  cache:
    key:
      prefix: mise-image-amd64
      files: [mise.toml, mise.lock]
    paths:
      - .mise/installs/
      - .mise/cache/
  script:
    - mise install --locked
    - mise exec -- npm ci
    - mise exec -- npm run build
```

将镜像标签中的版本替换为你要固定使用的 mise 发行版本。

## 其他 CI 服务 {#any-ci-provider}

在其他 CI 服务中，提交一个包装脚本，在首次使用时下载固定版本的 mise，并在每条 mise 命令中调用它。运行器需要 `bash`、`curl`、CA 证书、`tar`，以及 `sha256sum` 或 `shasum`，以下载、验证并解压 mise。

### 生成包装脚本 {#bootstrapping}

在本地使用 [`mise generate install-script`](/cli/generate/install-script.html) 生成：

```sh
mise generate install-script --localize --write
```

此命令会写入 `bin/mise`。请将其提交，并将 `.mise/` 加入 `.gitignore`。本地化包装脚本会将 mise 二进制文件、已安装工具、缓存和状态保存在 `.mise/` 下，信任项目配置文件，并忽略用户的全局配置。添加 `--windows` 可同时生成供 Windows 运行器和贡献者使用的 `bin/mise.cmd`；该选项必须与 `--write` 一起使用。

安装和运行时都请使用包装脚本，以确保两者使用这些目录。以下示例假设 Node.js 项目已提交 `package-lock.json`，并定义了 `test` 脚本：

```sh
set -eu
./bin/mise install
./bin/mise exec -- npm ci
./bin/mise exec -- npm test
```

仓库有锁文件时，请运行 `./bin/mise install --locked`。在 Windows 运行器上改为运行 `.\bin\mise.cmd`。

包装脚本会固定生成时 `mise self-update` 所选择的发行版（早于 [`self_update.minimum_release_age`](/configuration/settings.html#self_update.minimum_release_age) 的最新稳定发行版，默认间隔为 24 小时），或通过 `--version` 指定的发行版。若要升级到更新版本，请重新生成并提交包装脚本；运行时也可设置 `MISE_VERSION`。`MISE_INSTALL_PATH` 可覆盖二进制文件的存放位置。不使用 `--localize` 时，包装脚本会使用 mise 的常规目录，并将二进制文件保存在数据目录的 `bootstrap/` 子目录下。

旧版 mise 生成的包装脚本会将二进制文件保存在缓存目录中，因此 `mise cache clear` 或缓存清理可能会将其删除；请重新生成包装脚本。重新生成后，如果缓存目录中已有相同版本的二进制文件，包装脚本会复用它，而不会再次下载。

如果作业需要从私有 GitHub 仓库安装工具或遇到 API 速率限制，请为 mise 提供 token；详见 [GitHub token](/dev-tools/github-tokens.html)。

## Xcode Cloud {#xcode-cloud}

使用 Xcode Cloud 的[克隆后脚本](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts) `ci_scripts/ci_post_clone.sh`，在构建前安装并运行工具。请将[生成的包装脚本](#bootstrapping)提交到 `bin/mise`。以下示例假设仓库的 `mise.toml` 中声明了 SwiftLint：

```sh
#!/bin/sh
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
./bin/mise install
./bin/mise exec -- swiftlint lint
```

提交前请将脚本设为可执行。此脚本中的环境变量变更不会传递到后续构建阶段，因此其他需要 mise 工具的阶段也应使用 `mise exec`。本地 Xcode 构建请参阅[编辑器与 IDE](/ide-integration.html#xcode)。

## 缓存 {#caching}

缓存已安装的工具，以免每个作业都重新下载。请缓存 `$MISE_DATA_DIR/installs`（默认值为 `~/.local/share/mise/installs`）和 `$MISE_CACHE_DIR`；使用本地化包装脚本时，对应路径为 `.mise/installs` 和 `.mise/cache`。缓存键应包含运行器的操作系统和架构、`mise.toml` 及锁文件；使用不同[配置环境](/configuration/environments.html)或安装选项的作业应使用独立缓存。

恢复缓存后仍要运行 `mise install`：它会安装缺少的工具，而且作业也必须能在空缓存下成功。当缓存版本列表的年龄超过工具的
[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 减去 1 小时时（默认 23 小时，且至少为 1 小时；参阅[mise 何时刷新版本列表](/cache-behavior.html#version-list-refresh)），`mise install` 会将其视为过期并重新获取。因此，恢复缓存不像使用锁文件那样能避免版本查询。安装目录和元数据位置见[目录](/directories.html)。

## 信任与不受信任的分支 {#safe-mode}

当 mise 检测到 CI 环境时，除非启用了[偏执模式](/paranoid.html)，否则会自动信任所有配置文件，因此检出分支中的任务、hook 和 `[env]` 都会正常运行。如果作业持有密钥且会读取你未编写的分支（例如从 pull request 解析版本的机器人），应设置 `MISE_SAFE=1`，以避免项目配置运行代码或注入环境变量：

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json
```

需要机器人更新 `mise.lock` 时，请移除 `--dry-run`。安全模式会拒绝任务、模板 `exec()` 和插件安装，忽略项目环境变量及设置，并跳过 hook。某些后端需要运行代码，因此无法在此模式下解析版本。运维人员管理的全局配置仍会生效。完整限制列表和后端限制请参阅[安全模式](/security.html#safe-mode)。
