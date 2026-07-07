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
  - 适用于不使用任何前缀的仓库

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

GitHub 后端为每个工具安装一个 release 资产。如果某个仓库在同一个发布中将多个二进制文件作为单独的资产发布，请为每个二进制文件定义一个工具别名，并将每个别名指向同一个 `github:owner/repo` 后端，然后将每个别名限定到各自的二进制文件。

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
每个二进制文件都**必须**有一个独立的别名，这不只是为了整洁。`matching`/`matching_regex` **不属于**安装路径的一部分——安装路径是以工具名称（别名，或者未设置别名时的 `owner/repo`）和版本为键的。用不同的 `matching` 值两次安装同一个 `github:owner/repo` 后端字符串（例如先执行 `mise use "github:owner/repo[matching=tool-a]"`，再执行 `mise use "github:owner/repo[matching=tool-b]"`）会解析到**同一个**目录，因此第二次安装会覆盖第一次。为每个二进制文件提供各自的别名，能让它们拥有各自的安装目录，因此可以共存。
:::

如果二进制文件的名称不是你想要的调用名称，可以添加 [`rename_exe`](#rename_exe)（重命名从压缩包中提取出的可执行文件）或 [`bin`](#bin)（选择/重命名二进制文件，包括单个裸露的非压缩包二进制文件）。

只有在你需要完全手动控制且能够以可移植的方式命名资产时，才使用 [`asset_pattern`](#asset_pattern)（它会替换自动检测，因此任何 `{{os}}`/`{{arch}}` 模板都必须覆盖你目标的所有平台）：

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
指定解压后的归档包中包含二进制文件的目录，或下载文件应放置的位置。这支持使用 Tera 模板，并可使用诸如 `{{ version }}`、`{{ os }}`、`{{ arch }}` 以及架构别名（`{{ darwin_os }}`、`{{ amd64_arch }}`、`{{ x86_64_arch }}`、`{{ gnu_arch }}`）等变量：
:::

```toml
[tools."github:cli/cli"]
version = "latest"
bin_path = "cli-{{ version }}/bin" # expands to cli-1.0.0/bin
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果安装路径根目录包含可执行文件，则使用安装路径根目录
4. 如果不存在 `bin/` 目录，则在子目录中搜索 `bin/` 目录
5. 如果未找到任何 `bin/` 目录，则搜索直接子目录中的任意可执行文件。如果在某个子目录中直接找到可执行文件，则整个子目录都被视为二进制路径。
6. 如果未找到可执行文件，则使用解压目录的根目录

### `filter_bins`

以逗号分隔的二进制文件列表，这些文件将被符号链接到一个经过过滤的 `.mise-bins` 目录中。当工具附带你不想暴露在 PATH 上的额外二进制文件时，这很有用。

```toml
[tools]
"github:jgm/pandoc" = { version = "latest", filter_bins = "pandoc" }
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
