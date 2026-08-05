# 持续集成

你可以在持续集成环境中使用 Mise 来为项目所需的工具提供环境。
我们建议你的项目将工具固定到特定版本，以确保环境可复现。

## 任何 CI 提供商

持续集成流水线允许运行任意命令。你可以利用这一点安装 Mise，并运行 `mise install` 来安装工具：

```yaml
script: |
  curl https://mise.run | sh
  mise install
```

为了确保你运行的是由 Mise 安装的工具版本，请务必通过 `mise x` 命令来执行它们：

```yaml
script: |
  mise x -- npm test
```

或者，如果 CI 提供商允许，你可以将 [shims](/dev-tools/shims.md) 目录添加到你的 `PATH` 中。

### 引导

除了调用 `curl https://mise.run | sh` 之外，还可以使用 [`mise generate bootstrap`](/cli/generate/bootstrap.html) 生成一个用于运行并安装 `mise` 的脚本。

```shell
mise generate bootstrap -l -w
```

将 `.mise/` 添加到你的 `.gitignore` 中，并提交生成的 `./bin/mise` 文件。现在你可以直接在 CI 中使用 `./bin/mise` 来安装和运行 `mise`。

```yaml
script: |
  ./bin/mise install
  ./bin/mise x -- npm test
```

默认情况下，生成的脚本会安装生成该脚本时所使用的版本，但它也遵循与[安装脚本](/installing-mise.html)相同的
`MISE_VERSION` 和 `MISE_INSTALL_PATH` 变量。
如果显式指定了 `MISE_INSTALL_PATH`，则始终按原样使用；否则，`MISE_VERSION` 也会选择
默认缓存路径，因此在 CI 中更新该变量会安装所请求的版本，而不是重新使用最先缓存的版本。

## 针对不受信任的配置运行（安全模式）

当作业从其无法控制的配置中解析工具版本时——最常见的情况是，某个机器人在拉取请求分支上刷新 `mise.lock`——请设置 `MISE_SAFE=1`，这样项目配置就无法执行代码。在安全模式下，mise 会拒绝（报错，绝不会静默回退）运行模板 `exec()`/`read_file()`、`_.source` 脚本、钩子、任务、asdf 插件脚本或安装插件，同时基于 HTTP 的后端仍可继续进行版本解析。

```yaml
script: |
  MISE_SAFE=1 mise lock --bump --json
```

请参阅[安全模式](/security.html#safe-mode)，了解完整的允许和不允许操作列表。

## GitHub Actions

如果你使用 GitHub Actions，我们提供了一个 [mise-action](https://github.com/jdx/mise-action)，用于封装 Mise 以及各工具的安装。你只需要将该 action 添加到你的工作流中：

```yaml
name: test
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: jdx/mise-action@v3
        with:
          version: 2024.12.14 # [default: latest] 要安装的 mise 版本
          install: true # [default: true] 运行 `mise install`
          cache: true # [default: true] 使用 GitHub 的缓存缓存 mise
          experimental: true # [default: false] 启用实验性功能
          # 自动写入这个 mise.toml 文件
          mise_toml: |
            [tools]
            shellcheck = "0.9.0"
          # 或者，如果你更喜欢 .tool-versions：
          tool_versions: |
            shellcheck 0.9.0
      - run: shellcheck scripts/*.sh
```

## GitLab CI

你可以使用任何安装了 `mise` 的 Docker 镜像来运行你的 CI 作业。
下面是一个使用 `debian-slim` 作为基础镜像的示例：
::: details 示例 Dockerfile

```dockerfile
FROM debian:12-slim

RUN apt-get update  \
    && apt-get -y --no-install-recommends install  \
      # 安装你需要的任何工具
      sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://mise.run | MISE_VERSION=v... MISE_INSTALL_PATH=/usr/local/bin/mise sh
```

:::

在配置作业时，你可以缓存一些 [Mise 目录](/directories)。

```yaml
build-job:
  stage: build
  image: mise-debian-slim # 使用你创建的镜像
  variables:
    MISE_DATA_DIR: $CI_PROJECT_DIR/.mise/mise-data
  cache:
    - key:
        prefix: mise-
        files: ["mise.toml", "mise.lock"] # mise.lock 是可选的，仅当使用 `lockfile = true` 时需要
      paths:
        - $MISE_DATA_DIR
  script:
    - mise install
    - mise exec --command 'npm build'
```

### 使用 bootstrap 脚本的示例

另一种方法是使用 [`mise generate bootstrap`](/cli/generate/bootstrap.html) 来在 GitLab CI 上轻松 [引导](#bootstrapping) `mise`。

```
mise generate bootstrap -l -w
```

你现在可以使用一个通用的 Docker 镜像，例如下面这个，在 CI 中运行并安装 `mise`。

::: details 示例 Dockerfile

```dockerfile
FROM debian:12-slim

RUN apt-get update  \
    && apt-get -y --no-install-recommends install sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*
```

:::

下面是一个 `.gitlab-ci.yml` 文件示例：

```yaml
.mise-cache: &mise-cache
  key:
    prefix: mise-
    files: ["mise.toml", "./bin/mise"]
  paths:
    - .mise/installs
    - .mise/mise-2025.1.3

build-job:
  stage: build
  image: my-debian-slim-image # 使用你创建的镜像
  cache:
    - <<: *mise-cache
      policy: pull-push
  script:
    - ./bin/mise install
    - ./bin/mise exec --command 'npm build'
```

## Xcode Cloud

如果你正在使用 Xcode Cloud，你可以使用自定义的 `ci_post_clone.sh` [构建脚本](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts) 来安装 Mise。下面是一个示例：

```bash
#!/bin/sh
curl https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"

mise install # 安装 mise.toml 中的工具
eval "$(mise activate bash --shims)" # 将已激活的工具添加到 $PATH
swiftlint {args}
```
