# GitHub 后端

您可以使用 `github` 后端直接安装 GitHub 发布资产。该后端会从 GitHub 仓库下载发布资产，非常适合通过 GitHub Releases 分发预构建二进制文件的工具。

这部分代码位于 mise 仓库中的 [`./src/backend/github.rs`](https://github.com/jdx/mise/blob/main/src/backend/github.rs)。

## 用法

以下命令会从 GitHub releases 安装最新版本的 ripgrep，
并将其设置为 PATH 上的活动版本：

```sh
$ mise use -g github:BurntSushi/ripgrep
$ rg --version
ripgrep 14.1.1
```

版本将以以下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"github:BurntSushi/ripgrep" = "latest"
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `github` 后端——这些
内容放在 `mise.toml` 中的 `[tools]` 里。

### 资产自动检测

当未指定 `asset_pattern` 时，mise 会自动为你的平台选择最佳的资产。系统会根据以下因素对资产进行评分：

- **操作系统兼容性**（linux、macos、windows）
- **架构兼容性**（x64、arm64、x86、arm）
- **libc 变体**（Linux 使用 gnu 或 musl，Windows 使用 msvc）
- **压缩包格式偏好**（tar.gz、zip 等）
- **构建类型**（避免调试/测试构建）

对于大多数工具，你只需在安装时不指定模式即可：

```sh
mise install github:user/repo
```

::: tip
自动检测逻辑实现于 [`src/backend/asset_matcher.rs`](https://github.com/jdx/mise/blob/main/src/backend/asset_matcher.rs)，GitHub、GitLab 和 Forgejo 后端都会共享这部分逻辑。
:::

### `asset_pattern`

指定用于匹配发布资产名称的模式。当你的操作系统/架构组合有多个资产，或者需要覆盖自动检测时，这会很有用。

```toml
[tools]
"github:cli/cli" = { version = "latest", asset_pattern = "gh_*_linux_x64.tar.gz" }
```

::: v-pre
支持与 [`bin_path`](#bin_path) 相同的模板：`{{ version }}` 以及
`{{ os() }}` / `{{ arch() }}` 函数（可选的重映射关键字参数）。
:::

### `additional_asset_patterns`

从同一版本下载其他归档，并按照列出的顺序将其解压到主要资源的安装目录中。当上游项目将一个安装包分发为一个基础归档和一个或多个补充归档时，请使用此选项。

例如，Ollama 将其 Linux AMD64 ROCm 支持发布为一个归档，该归档必须覆盖到常规 Ollama 归档之上：

```toml
[tools."github:ollama/ollama"]
version = "latest"

[tools."github:ollama/ollama".platforms]
linux-x64 = {
  additional_asset_patterns = ["ollama-linux-amd64-rocm.tar.zst"],
}
```

每个模式必须恰好选择一个归档。模式支持与
[`asset_pattern`](#asset_pattern) 相同的模板语法。补充资源必须是归档；不支持裸二进制文件。解压补充归档时，不会应用主要资源的
`strip_components`、`bin` 或 `rename_exe` 选项。如果补充归档包含与较早归档相同的路径，则后续归档中的文件会覆盖之前的文件。

启用锁定文件时，mise 会记录每个补充构件的 URL 和校验和，以及任何可用的来源元数据。对于当前平台，来源信息会经过加密验证；跨平台的锁定条目会记录检测到的来源信息，以便在安装时进行验证。`--locked` 安装只会使用已记录的构件列表，如果该列表不完整则会失败。

### `matching`

将资产选择缩小到名称中包含给定子字符串的项，**同时保留平台自动检测**。不同于 [`asset_pattern`](#asset_pattern)（它会完全替换自动检测），`matching` 只是缩小候选集——自动检测仍会从缩小后的列表中选择正确的 OS/arch，因此同一份配置可以在各个平台上保持可移植性。

当某个仓库以**按平台分别提供的多个二进制文件**形式发布资源，而自动检测无法判断你想要哪一个时，就应使用这个选项（参见 [同一发布中的多个资源](#multiple-assets-from-the-same-release)）。

```toml
[tools]
# oxc-project/oxc 每个平台都同时提供 oxlint 和 oxfmt；matching 会选择 oxlint
# 在所有 OS/arch 上都无需硬编码 platform-specific 的 asset_pattern。
# `apps_v1.69.0` 是原始的 release tag；这些 assets 是按平台划分的
# archives，而 rename_exe 会将解压后的 `oxlint-<triple>` 二进制重命名为 `oxlint`。
"github:oxc-project/oxc" = { version = "apps_v1.69.0", matching = "oxlint", rename_exe = "oxlint" }
```

工具选项也可以通过命令行使用 `[key=value]` 语法内联传递：

```sh
mise use "github:oxc-project/oxc[matching=oxlint,rename_exe=oxlint]@apps_v1.69.0"
```

`matching` 是区分大小写的子字符串测试，因此如果某个值也是另一个资源名称的一部分（例如同时发布了 `tool-*` 和 `tool-extras-*` 时使用 `matching = "tool"`），就不能唯一地选中你的二进制文件。在需要精确匹配时，请使用带锚点的 [`matching_regex`](#matching_regex)。

如果也设置了 [`asset_pattern`](#asset_pattern)，则以它为准，`matching`/`matching_regex` 会被忽略——`asset_pattern` 会完全替换自动检测，因此不再有可供它们缩小的候选集。它们会被静默忽略：当设置了 `asset_pattern` 时，`matching_regex` 根本不会被查询，且无效值也不会被报告，因为 mise 不会因为一个被覆盖的选项而报错。

该过滤器也会作用于验证：会为所选资源查找校验和，SLSA 溯源发现也会以同样方式缩小范围，因此多二进制发布不会把一个二进制文件与另一个二进制文件的溯源相互验证。若没有任何按二进制匹配的溯源文件，一个覆盖发布中所有制品的共享溯源文件（例如 `multiple.intoto.jsonl`）仍会作为回退使用。

### `matching_regex`

类似于 [`matching`](#matching)，但资源名称必须匹配给定的正则表达式。当子字符串不够精确时使用此项。匹配区分大小写；如需不区分大小写匹配，请使用内联 `(?i)` 标志。

```toml
[tools]
"github:oxc-project/oxc" = { version = "apps_v1.69.0", matching_regex = "^oxlint-", rename_exe = "oxlint" }
```

如果同时设置了 `matching` 和 `matching_regex`，则资源必须同时满足**两者**（逻辑 AND）
才能保留为候选项。

### `version_prefix`

指定用于发布标签的自定义版本前缀。默认情况下，mise 会处理常见的 `v` 前缀（例如 `v1.0.0`），但有些仓库使用不同的前缀，比如 `release-`、`version-`，或者根本不使用前缀。

配置了 `version_prefix` 后，mise 将会：

- 过滤带有该前缀的可用版本，并去除该前缀
- 在搜索发布版本时添加该前缀
- 在安装期间同时尝试带前缀和不带前缀的版本

```toml
[tools]
"github:user/repo" = { version = "latest", version_prefix = "release-" }
```

**示例：**

- 当 `version_prefix = "release-"` 时：
  - 用户指定 `1.0.0` → mise 搜索 `release-1.0.0` 标签
  - 可用版本显示为 `1.0.0`（已去除前缀）
- 当 `version_prefix = ""`（空字符串）时：
  - 用户指定 `1.0.0` → mise 搜索 `1.0.0` 标签（无前缀）
  - 适用于不使用任何前缀的仓库。

### 按平台的特定资源模式

对于不同平台的资源模式：

```toml
[tools."github:cli/cli"]
version = "latest"

[tools."github:cli/cli".platforms]
linux-x64 = { asset_pattern = "gh_*_linux_x64.tar.gz" }
macos-arm64 = { asset_pattern = "gh_*_macOS_arm64.tar.gz" }
```

### 同一发布中的多个资产

存在两种不同的情况：

- 如果这些资产属于同一个安装包，请使用
  [`additional_asset_patterns`](#additional_asset_patterns)。补充归档文件会被叠加到同一个安装目录中。
- 如果这些资产是应拥有独立安装目录的独立工具，请为每个二进制文件定义一个工具别名，并将每个别名指向同一个
  `github:owner/repo` 后端。

优先使用 [`matching`](#matching)（或 [`matching_regex`](#matching_regex)）：它会缩小候选集合，同时**保留平台自动检测**，因此一份配置可在所有操作系统/架构上工作。当按平台区分的资产名称无法以可移植的方式模板化时，这是正确的选择（例如 Rust 的 target triple，如 `oxlint-aarch64-apple-darwin.tar.gz`）。

下面的示例从单个 `oxc-project/oxc` 发布中同时安装 `oxlint` 和 `oxfmt`。请注意，每个 `matching` 值都必须足够具体，以便只选择**预期的**二进制文件——如果一个二进制文件的名称是另一个名称的子字符串，则应改用带锚点的 [`matching_regex`](#matching_regex)（例如 `"^oxlint-"`）（参见 [`matching`](#matching) 的注意事项）。

```toml
[tool_alias]
oxlint = "github:oxc-project/oxc"
oxfmt = "github:oxc-project/oxc"

[tools.oxlint]
version = "apps_v1.69.0"
matching = "oxlint"
rename_exe = "oxlint"

[tools.oxfmt]
version = "apps_v1.69.0"
matching = "oxfmt"
rename_exe = "oxfmt"
```

::: warning
别名不是叠加机制。每个别名都会创建一个独立的安装目录。
请将它们用于 `oxlint` 和 `oxfmt` 等独立二进制文件；当两个归档文件必须组合成一个可运行的工具时，请使用
`additional_asset_patterns`。
:::

如果二进制文件的名称不是你想要的调用名称，可以添加 [`rename_exe`](#rename_exe)（重命名从压缩包中提取出的可执行文件）或 [`bin`](#bin)（选择/重命名二进制文件，包括单个裸露的非压缩包二进制文件）。

仅当你需要完全的手动控制，并且能够以可移植的方式命名资产时，才使用 [`asset_pattern`](#asset_pattern)；它会替代自动检测，因此任何 <code v-pre>{{ os() }}</code>/<code v-pre>{{ arch() }}</code>
模板化都必须覆盖你所针对的每个平台：

```toml
[tools.tool-a]
version = "latest"
asset_pattern = "tool-a-*"

[tools.tool-b]
version = "latest"
asset_pattern = "tool-b-*"
```

### `checksum`

使用校验和验证下载的文件：

```toml
[tools."github:owner/repo"]
version = "1.0.0"
asset_pattern = "tool-1.0.0-x64.tar.gz"
checksum = "sha256:a1b2c3d4e5f6789..."
```

_你也可以使用 [mise.lock](/dev-tools/mise-lock) 来管理校验和，而不是在这里指定校验和。_

### 平台特定校验和

```toml
[tools."github:cli/cli"]
version = "latest"

[tools."github:cli/cli".platforms]
linux-x64 = {
  asset_pattern = "gh_*_linux_x64.tar.gz",
  checksum = "sha256:a1b2c3d4e5f6789...",
}
macos-arm64 = {
  asset_pattern = "gh_*_macOS_arm64.tar.gz",
  checksum = "sha256:b2c3d4e5f6789...",
}
```

### `size`

验证下载的资源大小：

```toml
[tools]
"github:cli/cli" = { version = "latest", size = "12345678" }
```

### `strip_components`

解压归档时要剥离的目录层级数：

```toml
[tools]
"github:cli/cli" = { version = "latest", strip_components = 1 }
```

::: info
如果未显式设置 `strip_components`，mise 将自动检测何时应用 `strip_components = 1`。当解压后的归档在根目录下恰好只包含一个目录且没有文件时，就会发生这种情况。这在像 ripgrep 这样的工具中很常见，它们会将二进制文件打包在一个带版本号的目录中（例如，`ripgrep-14.1.0-x86_64-unknown-linux-musl/rg`）。自动检测可确保二进制文件直接放置在 mise 预期的安装路径中。
:::

### `bin`

将下载的二进制文件重命名为特定名称。当下载具有平台特定名称的单个二进制文件时，这很有用：

```toml
[tools."github:docker/compose"]
version = "2.29.1"
bin = "docker-compose"  # 将下载的二进制文件重命名为 docker-compose
```

::: info
当下载单个二进制文件（不是压缩包）时，mise 会自动从文件名中移除操作系统/架构后缀。例如，`docker-compose-linux-x86_64` 会自动变为 `docker-compose`。仅当你需要特定的自定义名称时才使用 `bin` 选项。
:::

### `rename_exe`

从压缩包中解压后重命名可执行文件。当压缩包中包含一个带有平台特定名称的二进制文件，而你希望将其重命名时，这很有用：

```toml
[tools."github:yt-dlp/yt-dlp"]
version = "latest"
asset_pattern = "yt-dlp_linux.zip"
rename_exe = "yt-dlp"  # 将解压后的二进制文件重命名为 yt-dlp
```

字符串形式会重命名工具的主要二进制文件（根据仓库名称匹配）。当压缩包中包含**多个**你希望以简洁名称提供的二进制文件时，请改用表格形式——每个键是源文件名（精确文件名或 glob），每个值是新名称：

```toml
[tools."github:DanielGavin/ols"]
version = "latest"
# 压缩包包含 ols-x86_64-unknown-linux-gnu 和 odinfmt-x86_64-unknown-linux-gnu
rename_exe = { "ols-*" = "ols", "odinfmt-*" = "odinfmt" }
```

两个二进制文件都会被重命名，并可通过 PATH 使用。如果找不到源文件，将跳过该文件并显示警告；对于丢失可执行位的压缩包（例如 ZIP），系统会恢复其可执行位。

::: tip
对于压缩包中内部二进制文件名称与期望名称不同的情况，请使用 `rename_exe`。对于单个二进制文件下载（非压缩包），请使用 `bin`。
:::

### `no_app`

在自动检测期间跳过 macOS .app bundle 资源，并优先选择独立的 CLI 二进制文件。当一个仓库同时提供 macOS .app bundle（通常是 Xcode 扩展或 GUI 应用）和独立的命令行工具时，这个选项很有用：

```toml
[tools."github:nicklockwood/SwiftFormat"]
version = "latest"
rename_exe = "swiftformat"
no_app = true  # 跳过 SwiftFormat.for.Xcode.app.zip，改用 swiftformat.zip
```

当 `no_app = true` 时：

- 包含 `.app.` 的资源（例如 `Tool.app.zip`、`Tool.for.Xcode.app.zip`）在自动检测期间会被降权
- 独立归档（例如 `tool.zip`、`tool-macos.tar.gz`）会被优先选择
- 这主要对 macOS 资源选择有用；非 macOS 的 `.app.` 资源已经会因为平台匹配而被降权
- 只影响自动检测；显式指定的 `asset_pattern` 值会按原样使用

::: info
如果没有这个选项，mise 的自动检测可能会在 macOS 上选择 .app bundles；如果该 bundle 中包含的是 GUI 应用或 Xcode 扩展，而不是独立的 CLI 工具，这可能会带来问题。
:::

### `bin_path`

::: v-pre
指定提取归档文件中包含二进制文件的目录，或存放下载文件的位置。此项支持使用 `{{ version }}` 进行 Tera 模板化，以及使用 `{{ os() }}` / `{{ arch() }}` 函数：
:::

```toml
[tools."github:cli/cli"]
version = "latest"
bin_path = "cli-{{ version }}/bin" # 展开为 cli-1.0.0/bin
```

这两个函数都接受关键字参数，用于重新映射 mise 将输出的值（`os()` 使用 `linux`、`macos`、`windows`；`arch()` 使用 `x64`、`arm64`），以适应上游项目使用不同目录名称的情况：

```toml
[tools."github:pizlonator/fil-c"]
version = "latest"
# 展开为 filc-0.681-linux-x86_64/build/bin
bin_path = 'filc-{{ version }}-{{ os() }}-{{ arch(x64="x86_64", arm64="aarch64") }}/build/bin'
```

::: tip
当模板包含双引号时，请像上面一样使用单引号包裹的 TOML 字符串。
:::

::: v-pre
不存在单独的 `{{ os }}` / `{{ arch }}` 变量，也不存在 `{{ x86_64_arch }}` 风格的别名——如需获取这些名称，应使用 `{{ arch(x64="x86_64", arm64="aarch64") }}`。
:::

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果安装路径根目录包含可执行文件，则使用安装路径根目录
4. 如果不存在 `bin/` 目录，则在子目录中搜索 `bin/` 目录
5. 如果未找到任何 `bin/` 目录，则搜索直接子目录中的任意可执行文件。如果在某个子目录中直接找到可执行文件，则整个子目录都被视为二进制路径。
6. 如果未找到可执行文件，则使用解压目录的根目录。

### `filter_bins`

要链接到经过筛选的 `.mise-bins` 目录中的二进制文件列表。当工具包含你不希望暴露在 PATH 中的额外二进制文件时，此选项非常有用。

```toml
[tools]
"github:jgm/pandoc" = { version = "latest", filter_bins = "pandoc" }
"github:owner/repo" = { version = "latest", filter_bins = ["tool", "helper"] }
```

启用后：

- 会创建一个 `.mise-bins` 子目录，其中仅包含指向指定二进制文件的符号链接
- 其他二进制文件（如 `pandoc-lua` 或 `pandoc-server`）不会暴露在 PATH 上

### `api_url`

对于 GitHub Enterprise 或自托管的 GitHub 实例，请指定 API URL。mise 会使用此 URL 进行发布列表和发布资源查找；当浏览器下载 URL 无法访问，或使用自定义/私有实例时，也可能使用它来下载资源：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", api_url = "https://github.mycompany.com/api/v3" }
```

### `github_attestations`

默认情况下，当 GitHub Release 资源可用时，mise 会检查 GitHub Artifact Attestations。可以在单个工具上设置 `github_attestations = false` 来跳过该检查，同时保持全局启用 GitHub 证明验证：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", github_attestations = false }
```

如果 GitHub 的证明服务或可信根数据导致安装失败，可将其作为某个特定工具的临时退出方案。其他验证路径，例如校验和和 SLSA 证明，在已配置且可用时仍会运行。如果 `mise.lock` 已经为该工具记录了 `github-attestations` 证明，在禁用此选项后请重新运行 `mise lock`，这样锁文件就不会再要求一个已被工具配置关闭的验证器。

### `prerelease`

默认情况下，在 GitHub 上标记为 `prerelease: true` 的发布会被排除在 `mise ls-remote` 和 `latest` 解析之外。设置 `prerelease = true` 以包含它们：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", prerelease = true }
```

设置后：

- 预发布标签（例如 `v1.0.0-rc1`、`v0.1.2-dev.86`）会显示在 `mise ls-remote` 中。
- `latest` 会解析为稳定版和预发布版中的最新版本，而不是使用 GitHub 的 `/releases/latest` 快捷方式（后者返回仓库所有者标记为“Latest”的发布——通常是最新的非预发布版本，但也可能是他们通过 API 固定的任意发布）。
- 模糊版本查询（例如 `1.2`）会匹配该前缀下的预发布标签。

这对于那些活跃发布都属于预发布版本的仓库（例如持续发布开发构建的内部工具），或者当你需要跟踪某个项目的候选发布版本时很有用。草稿发布始终会被排除。对 GitLab 没有影响。

## 自托管 GitHub

如果您使用的是自托管的 GitHub 实例，请设置 `api_url` 工具选项。有关身份验证，请参阅 [GitHub 令牌](/dev-tools/github-tokens.html#github-enterprise)。

## 支持的 GitHub 语法

- **GitHub 最新发布版本的简写：** `github:cli/cli`
- **GitHub 指定发布版本的简写：** `github:cli/cli@2.40.1`

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>

<Settings child="github" :level="3" />
