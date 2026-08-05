# mise.lock 锁定文件

`mise.lock` 是一个锁定文件，用于固定工具的精确版本和校验和，以实现可复现的环境。锁定文件不会自动创建——你必须运行 `mise lock` 来生成它们。一旦锁定文件存在，mise 会在工具安装或升级时保持其更新。

## 概述

锁文件的作用与 npm 中的 `package-lock.json` 或 Rust 中的 `Cargo.lock` 类似：

- **可复现构建**：确保团队中的每个人都使用完全相同的工具版本
- **安全性**：在后端支持时，通过校验和验证工具完整性
- **版本固定**：将工具锁定到特定版本，同时仍允许在 `mise.toml` 中保持灵活性
- **避免 API 速率限制**：通过存储下载 URL，未来的安装会使用锁文件，而不需要调用 GitHub（或其他提供商），从而避免速率限制，并且在大多数情况下无需 `GITHUB_TOKEN`。

## 启用锁文件

锁文件由 `lockfile` 设置控制：

```sh
# 全局启用锁文件
mise settings lockfile=true

# 或在 mise.toml 中设置
[settings]
lockfile = true
```

## 工作原理

1. **锁文件更新**：一旦存在 `mise.lock` 文件，运行 `mise install` 或 `mise use` 会用已安装的确切版本更新它
2. **版本解析**：如果存在 `mise.lock`，mise 会优先使用锁定的版本，而不是 `mise.toml` 中的版本范围
3. **校验和验证**：对于受支持的后端，mise 会存储并验证已下载工具的校验和。

## 文件格式

`mise.lock` 是一个 TOML 文件，采用基于平台的格式，按平台组织资产信息：

```toml
# 示例 mise.lock
[[tools.node]]
version = "20.11.0"
backend = "core:node"

[tools.node.platforms.linux-x64]
checksum = "sha256:a6c213b7a2c3b8b9c0aaf8d7f5b3a5c8d4e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7"
size = 23456789
url = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz"

[[tools.python]]
version = "3.11.7"
backend = "core:python"

[tools.python.platforms.linux-x64]
checksum = "sha256:def456..."
size = 12345678

# 带有特定后端选项的工具
[[tools.ripgrep]]
version = "14.1.1"
backend = "aqua:BurntSushi/ripgrep"
options = { exe = "rg" }

[tools.ripgrep.platforms.linux-x64]
checksum = "sha256:4cf9f2741e6c465ffdb7c26f38056a59e2a2544b51f7cc128ef28337eeae4d8e"
size = 1234567

```

### 平台信息

工具的 `[tools.name.platforms]` 部分中的每个平台都使用类似 `"os-arch"` 的键格式（例如 `"linux-x64"`、`"macos-arm64"`），并且可以包含：

- **`checksum`**（可选）：用于完整性验证的 SHA256 或 Blake3 哈希
- **`size`**（可选）：用于下载校验的文件大小（字节）
- **`url`**（可选）：原始下载 URL，用于参考或重新下载

### 工具条目字段

每个工具条目（`[[tools.name]]`）可以包含：

- **`version`**（必需）：工具的精确版本
- **`backend`**（可选）：用于安装该工具的后端（例如 `core:node`、`aqua:BurntSushi/ripgrep`）
- **`options`**（可选）：用于标识制品的后端特定选项（例如 `{exe = "rg", matching = "musl"}`）
- **`platforms`**（可选）：特定于平台的元数据（校验和、URL、大小）

当工具的制品标识不仅取决于平台键时，同一版本可以有多个条目。例如，Swift 会针对不同发行版发布不同的 Linux tarball，因此其条目会记录各自对应的发行版：

```toml
[[tools.swift]]
version = "6.3.1"
backend = "core:swift"
options = { swift_platform = "ubuntu24.04" }

[[tools.swift]]
version = "6.3.1"
backend = "core:swift"
options = { swift_platform = "fedora39" }
```

条目会根据选项进行精确匹配，因此机器只会根据为其自身发行版编写的条目进行验证。设置 `swift.platform`，可以让每台 Linux 机器解析到相同的制品，并提交它生成的条目。如果某个平台的制品并未由工具发布——例如 `ubi9` 没有 arm64 构建版本——则该平台会被报告为已跳过，而不是被锁定。

### 平台键

平台键的格式通常为 `os-arch`，但可以由后端自定义：

- **标准格式**：`linux-x64`、`macos-arm64`、`windows-x64`
- **后端特定**：某些后端（如 Java）可能使用更具体的平台标识符
- **工具特定**：像 `ubi` 这样的后端可能会在平台键中包含额外的工具特定信息。

## 环境特定锁文件

当使用[环境特定配置文件](/configuration/environments)（例如 `mise.test.toml`）时，每个环境都有自己的锁文件：

| 配置文件               | 锁文件                  |
| ---------------------- | ---------------------- |
| `mise.toml`            | `mise.lock`            |
| `mise.test.toml`       | `mise.test.lock`       |
| `mise.staging.toml`    | `mise.staging.lock`    |
| `mise.local.toml`      | `mise.local.lock`      |
| `mise.test.local.toml` | `mise.test.local.lock` |

例如，在 `MISE_ENV=test` 时：

```sh
MISE_ENV=test mise lock  # 创建 mise.lock 和 mise.test.lock
```

`mise.toml` 中的工具会进入 `mise.lock`，`mise.test.toml` 中的工具会进入 `mise.test.lock`。

**解析**：当 `MISE_ENV=test` 时，mise 会为在 `mise.test.toml` 中定义的工具读取 `mise.test.lock`，并为 `mise.toml` 中的工具读取 `mise.lock`。环境特定锁文件严格限定于其对应的配置——它们只包含该配置中定义的工具。

这种设计意味着未设置 `MISE_ENV` 的 CI 环境只依赖 `mise.lock`，因此 `mise.dev.lock` 中的开发工具版本升级不会使 CI 缓存失效。

`mise.lock` 和 `mise.<env>.lock` 文件都应提交到版本控制。`mise.local.lock` 和 `mise.<env>.local.lock` 应与其对应的配置文件一起加入 gitignore。

## 本地锁文件

在 `mise.local.toml` 中定义的工具（通常会被 gitignore）会使用单独的 `mise.local.lock` 文件。这使本地工具配置与已提交的锁文件分离开来。

```sh
# mise.local.toml 中的工具会写入 mise.local.lock
mise use --path mise.local.toml node@22

# 常规的 mise.toml 中的工具会写入 mise.lock
mise use --path mise.toml node@20
```

使用 `mise lock --local` 来为所有平台更新本地锁文件：

```sh
mise lock --local              # 更新 mise.local.lock
mise lock --local node python  # 更新 mise.local.lock 中的特定工具
```

## 单仓库

当 `monorepo_root = true` 时，mise 可以在单仓库根目录使用单个锁文件。设置 `[monorepo] lockfile = true` 可启用根锁文件变体，例如 `mise.lock`、`mise.ci.lock` 和 `mise.local.lock`。

现有的子项目锁文件会在下一次感知锁文件的命令中迁移到根锁文件中。将其取消设置（unset）会在迁移期间保留每个子项目各自的锁文件。使用 `mise*.lock` 文件的单仓库将在 mise `2026.12.0` 中开始出现警告，并且取消设置会在 mise `2027.6.0` 中默认改为根锁文件。较旧版本的 mise 无法理解子项目拥有工具的这种布局，因此需要兼容多版本的项目可以固定为旧行为：

```toml
[monorepo]
lockfile = false
```

详情请参见 [单仓库任务](/tasks/monorepo.html#lockfiles)。

## 严格锁文件模式

`locked` 设置会强制要求所有工具在安装前都已在锁文件中预先解析好 URL。这可以阻止对 GitHub、aqua registry 等的 API 调用，从而确保安装过程完全可复现。

```sh
# 启用严格模式
mise settings locked=true

# 或通过环境变量
MISE_LOCKED=1 mise install
```

::: warning
所有 mise 设置的作用域都是全局的。在项目的 `mise.toml` 中设置 `locked = true` 会应用于**所有**工具解析，包括来自全局 `~/.config/mise/config.toml` 的工具。如果你看到有关全局工具缺少锁文件条目的警告，请运行 `mise lock -g` 来生成全局锁文件。
:::

启用后，如果某个工具在锁文件中没有当前平台对应的 URL，`mise install` 将失败。要修复这一点，首先用 URL 填充锁文件：

```sh
mise lock                    # 为所有平台生成 URL
mise lock --platform linux-x64,macos-arm64  # 或指定平台
```

这对于 CI 环境很有用，你可以在其中确保可复现构建，而不依赖任何外部 API。

## 工作流

### 初始设置

```sh
# 生成锁文件
mise lock

# 使用锁定的版本安装工具
mise install
```

### 日常使用

```sh
# 从锁文件安装精确版本
mise install

# 更新工具和锁文件
mise upgrade
```

### 更新版本

当你想更新工具版本时：

```sh
# 在 mise.toml 中更新工具版本
mise use node@26

# 这将同时更新安装和 mise.lock
```

### 更新锁定版本

`mise lock --bump` 会根据最新的匹配版本重新解析模糊版本选择器（如 `latest`、`lts` 或 `"22"` 这样的前缀），并更新锁文件——不会安装任何内容，也不会修改 `mise.toml`。精确固定的版本保持不变（使用 [`mise upgrade --bump`](/cli/upgrade.html) 可重写 `mise.toml` 中的固定版本）。

```sh
# mise.toml 中的 node = "22" 锁定为 22.14.0；此后发布了 22.15.0
mise lock --bump             # 锁文件现在固定为 22.15.0，mise.toml 仍为 "22"
mise lock --bump node        # 仅更新 node
mise lock --bump --dry-run   # 显示将发生的更改，但不写入文件
```

此功能专为自动化依赖更新而设计：按计划在 CI 中运行，并在锁文件发生更改时创建 PR。`--json` 会以机器可读的格式输出更改（并抑制人类可读的消息）。只会报告版本级别的更改——未变化版本的校验和/URL 刷新不会生成条目——版本列表会保留配置文件/锁文件中的顺序，而不会进行排序。从配置中移除的工具会以空的 `new_versions` 报告：

```sh
mise lock --bump --dry-run --json
```

```json
[
  {
    "name": "node",
    "backend": "core:node",
    "lockfile": "~/src/myproj/mise.lock",
    "old_versions": ["22.14.0"],
    "new_versions": ["22.15.0"]
  }
]
```

::: tip 在安全模式下运行更新自动化
当任务针对你无法控制的配置运行时——最常见的情况是机器人在拉取请求分支上更新
`mise.lock`——请设置 [`MISE_SAFE=1`](/security.html#safe-mode)，以防止项目配置执行代码。安全模式会拒绝模板 `exec()`、`_.source` 脚本、钩子、任务、asdf 插件脚本和插件安装，而基于 HTTP 的后端仍可正常进行 `--bump` 版本解析：

```sh
MISE_SAFE=1 mise lock --bump --json
```

:::

### 固定锁定版本

你可以在保持 `mise.toml` 中模糊版本说明的同时，在锁文件中固定某个特定版本：

```sh
# mise.toml 中有 node = "latest" 或 node = "22"
mise upgrade node@22.15.0   # 安装 22.15.0 并更新 mise.lock
mise lock node@22.15.0      # 仅更新 mise.lock，不重新安装
```

如果该版本与当前配置前缀不匹配，配置会自动更新。例如，如果 `mise.toml` 中有 `node = "20"`，而你运行 `mise upgrade node@22.15.0`，配置会升级为 `node = "22"`（保留相同的精度级别），并且锁文件会设置为 `22.15.0`。

## 带锁文件的命令行为

下表显示了每个命令如何与 `mise.toml` 和 `mise.lock` 交互：

| 命令                        | 安装   | 更新 `mise.toml`                    | 更新 `mise.lock`                         |
| --------------------------- | ------ | ----------------------------------- | ---------------------------------------- |
| `mise use node@22`          | 是     | 是（设置 `node = "22"`）            | 是                                       |
| `mise install`              | 是     | 否                                  | 是                                       |
| `mise install node`         | 是     | 否                                  | 是（安装 node 的配置版本）              |
| `mise install node@22.15.0` | 是     | 否                                  | 否（一次性安装，不由配置驱动）           |
| `mise upgrade`              | 是     | 否                                  | 是                                       |
| `mise upgrade node`         | 是     | 否                                  | 是（在其版本范围内升级 node）            |
| `mise upgrade node@22.15.0` | 是     | 仅当版本不匹配前缀时                | 是                                       |
| `mise upgrade --bump`       | 是     | 是（更新前缀以匹配）                 | 是                                       |
| `mise lock`                 | 否     | 否                                  | 是（为所有工具重新生成）                 |
| `mise lock --bump`          | 否     | 否                                  | 是（将选择器重新解析为最新版本）         |
| `mise lock node@22.15.0`    | 否     | 仅当版本不匹配前缀时                | 是                                       |

**要点：**

- **`mise use`** 用于更改配置中所需的版本——它总是会写入 `mise.toml`
- **`mise install`** 安装配置中的内容，但不会修改配置——`mise install node` 安装配置中的 node 版本并更新锁文件，而 `mise install node@22.15.0` 是一次性安装，不会更新锁文件
- **`mise upgrade`** 在配置的版本范围内升级工具并更新锁文件——传入 `tool@version` 可指定目标版本
- **`mise lock`** 重新生成锁文件条目，但不会进行安装——传入 `tool@version` 可固定特定版本，而 `--bump` 会将模糊选择器推进到最新匹配版本

## 后端支持

锁文件功能的后端支持情况各不相同：

- ✅ **完全支持**（版本 + 校验和 + 大小 + URL）：`aqua`、`http`、`github`、`gitlab`
  - _来源支持_：`aqua`、`github`、`core:python`（预编译二进制文件）、`core:ruby`（预编译二进制文件）、`core:zig`（安装时）
- ⚠️ **部分支持**（版本 + URL + 来源）：`vfox`（仅工具插件）
- ⚠️ **部分支持**（版本 + 校验和 + 大小）：`ubi`
- 📝 **基础支持**（版本 + 校验和）：`core`（部分工具）
- 📝 **仅版本**：`asdf`、`npm`、`cargo`、`pipx`
- 📝 **计划中**：随着时间推移，更多后端将添加完整的资产跟踪支持。

## 最佳实践

### 版本控制

```sh
# 始终提交 lockfile
git add mise.lock
git commit -m "更新工具版本"
```

### 团队工作流程

1. **团队负责人**：使用新的版本范围更新 `mise.toml`
2. **团队负责人**：运行 `mise install` 以更新 `mise.lock`
3. **团队负责人**：提交这两个文件
4. **团队成员**：拉取更改并运行 `mise install` 以获取精确版本

### CI/CD

```yaml
# GitHub Actions 示例
- name: 安装工具
  run: |
    mise install  # 使用来自 mise.lock 的精确版本

- name: 缓存 lockfile
  uses: actions/cache@v5
  with:
    key: mise-lock-${{ hashFiles('mise.lock') }}
```

## 故障排查

### 重新生成校验和

如果校验和失效，或者你需要重新生成它们：

```sh
# 移除所有工具并重新安装
mise uninstall --all
mise install
```

### Ruby 预编译构建修订版发布

同一个 Ruby 版本的预编译 Ruby 二进制文件可能会有构建修订版发布。锁文件保留 `version = "3.3.11"`，但会在平台 `url` 中固定所选的构建修订版：

```toml
url = "https://github.com/jdx/ruby/releases/download/3.3.11-1/ruby-3.3.11.x86_64_linux.tar.gz"
```

这里 `3.3.11-1` 是构建修订版 `1`。有关修订版存在的原因、未锁定安装的行为，以及如何更新较旧的锁文件，请参见 [Ruby 预编译构建修订版](/lang/ruby.html#precompiled-build-revisions) 了解详情。

### 锁文件冲突

在合并具有不同锁文件的分支时：

1. 解决 `mise.lock` 中的冲突
2. 运行 `mise install` 验证一切是否正常
3. 提交已解决的锁文件

### 为特定项目禁用

```toml
# 在项目的 mise.toml 中
[settings]
lockfile = false
```

## 从其他工具迁移

### 从 asdf

```sh
# 将 .tool-versions 转换为 mise.toml
mise config generate

# 启用锁文件并生成锁文件
mise settings lockfile=true
mise lock
mise install
```

### 从 package.json engines

```sh
# 根据 package.json 设置版本
mise use node@$(jq -r '.engines.node' package.json)
```

## 溯源与安全

当 `mise lock` 生成锁文件时，如果可用，它会为每个工具记录一种已验证的溯源类型（例如 `slsa`、`cosign`、`minisign`、`github-attestations`）。对于**当前平台**，mise 会下载制品，并在锁定时执行完整的加密验证——确保锁文件中的溯源条目基于实际验证，而不仅仅是注册表元数据。这同时适用于 aqua 和 github 两种后端。对于跨平台条目，溯源会从注册表元数据中检测出来，但不会进行验证（因为该制品在当前机器上可能无法运行）。

默认情况下，当 `mise install` 看到一个同时包含校验和和已验证溯源条目的锁文件时，它会信任该锁文件并跳过重新验证。这样可以避免重复的 API 调用（例如 GitHub 证明查询），这些调用在 CI 中可能导致速率限制问题。由于当前平台的溯源已经在 `mise lock` 期间完成了验证，因此这是安全的。

如果启用了 GitHub Artifact Attestations，但 GitHub API 确认对于某个带校验和的制品不存在任何证明，mise 可能会记录 `github_attestations = "unavailable"`。这是一条负缓存条目，不是溯源：它只会在之后从该锁文件安装时跳过重复的 GitHub 证明探测。其他验证路径，例如 SLSA、Cosign、Minisign 和校验和验证，仍会像往常一样运行。

GitHub 的文档展示了如何使用 [`actions/attest`](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations#generating-build-provenance-for-binaries) 从已有的制品路径生成二进制证明，而 REST API 则会按[主体摘要](https://docs.github.com/en/rest/orgs/attestations#list-attestations)列出证明。这意味着证明可能会在发布资产上传之后才出现。之后再运行一次 `mise lock`，或者执行 `MISE_LOCKED_VERIFY_PROVENANCE=1 mise install`，就可以发现那些在锁文件记录为不可用之后才添加的证明。

为了增强安全性，你可以在每次安装时强制重新验证溯源：

```toml
[settings]
locked_verify_provenance = true
```

或者通过环境变量：

```sh
MISE_LOCKED_VERIFY_PROVENANCE=1 mise install
```

这也会在[偏执模式](/paranoid.html)中自动启用：

```toml
[settings]
paranoid = true
```

启用后，每次 `mise install` 都会进行加密溯源验证，而不管锁文件中包含什么，从而确保该制品是由受信任的 CI 流水线构建的。

## 最小发布年龄

除了锁定文件之外，mise 还使用 [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 设置，通过仅安装已发布达到最短时间的版本来降低供应链风险。其默认值为 `24h`：

```toml
[settings]
minimum_release_age = "7d"  # 覆盖默认的 24h 延迟
```

这与锁定文件配合得很好——使用 `minimum_release_age` 来避免获取全新的发布版本，并使用锁定文件来固定你已经审核过的确切版本。

此设置会对提供发布时戳的后端的顶层模糊版本解析进行过滤。
默认情况下，不带时戳的版本也会被包含。

目前只有 `npm:` 和 `pipx:` 会在安装期间将相同的截止时间传递到传递依赖解析中。
其他后端可能会选择较旧的顶层工具版本，但它们不会约束由工具的安装器/编译器获取的依赖项。

## 另请参阅

- [配置设置](/configuration/settings) - 所有可用设置
- [工具版本管理](/dev-tools/) - 工具版本的工作原理
- [后端](/dev-tools/backends/) - 特定后端的校验和支持。
