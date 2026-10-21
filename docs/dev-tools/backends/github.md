---
description: "从 GitHub Releases 安装预编译工具，并了解与 GitLab、Forgejo 后端共享的资源选项。"
---

# GitHub 后端

`github` 后端会从 GitHub 仓库发行版附带的文件中安装工具。mise 会根据你的操作系统和架构选择资源文件、验证并解压。[gitlab](/dev-tools/backends/gitlab.html) 和 [forgejo](/dev-tools/backends/forgejo.html) 后端共用此实现，也接受本页介绍的选项。

如果工具在[注册表](/registry.html)中有 `ripgrep` 这样的简写，建议优先使用：注册表条目已经指定后端和工具所需的选项。对于没有简写的工具，或你希望自行选择此后端时，请使用 `github:owner/repo`。

<a id="usage"></a>

## 用法

在当前项目中安装 ripgrep，然后运行：

```sh
mise use github:BurntSushi/ripgrep
mise exec -- rg --version
```

这会将以下内容写入 `mise.toml`。若要全局安装工具，可给 `mise use` 添加 `-g`。

```toml
[tools]
"github:BurntSushi/ripgrep" = "latest"
```

列出可用版本并固定其中一个：

```sh
mise ls-remote github:BurntSushi/ripgrep
mise use github:BurntSushi/ripgrep@14.1.1
```

版本号是去掉开头 `v` 的发行版标签；其他标签格式请参阅 [`version_prefix`](#version-prefix)。

要在命令行传入[工具选项](#tool-options)，请将其附加在方括号中。将参数括起来，避免 Shell 展开方括号：

```sh
mise use 'github:oxc-project/oxc[matching=oxlint,rename_exe=oxlint]@apps_v1.69.0'
```

mise 会将选项写入 `mise.toml` 中该工具的条目。公开发行版无需令牌。有关私有仓库、GitHub Enterprise Server 或速率限制错误，请参阅 [GitHub 令牌](/dev-tools/github-tokens.html)。

## mise 如何选择资源文件 {#asset-autodetection}

每次安装时，mise 会下载一个发行版资源文件：

1. 如果为该平台设置了 [`url`](#platform-specific-urls)，mise 会下载此 URL，不再选择资源文件。
2. 如果设置了 [`asset_pattern`](#asset-pattern)，mise 会下载名称匹配该模式的资源文件。
3. 否则，mise 会保留通过 [`matching`](#matching) 和（如果已设置）[`matching_regex`](#matching-regex) 筛选的资源文件，并为每个文件评分。与操作系统、CPU 架构和 C 库（Linux 上的 glibc 或 musl，Windows 上的 MSVC）相符、便于解压的归档格式，以及以仓库名称开头的文件名会获得较高分。调试版和测试版、校验和与签名文件，以及其他系统上的 macOS `.app` 包或启用 [`no_app`](#no-app) 时的 `.app` 包会被扣分。分数最高者胜出；若平分，则选择名称较短的文件。

大多数工具无需任何选项即可安装：

```sh
mise install github:user/repo
```

如果 mise 选错了资源文件，可用 [`matching`](#matching) 缩小候选范围，或用 [`asset_pattern`](#asset-pattern) 指定资源文件名称。没有任何匹配项时，错误消息会列出该发行版的所有资源文件。

随后，mise 会验证下载内容：检查 GitHub 为资源文件报告的摘要，或同一发行版中发布的校验和文件；如果公开 GitHub 上的发行版附带 [GitHub 产物证明](#github-attestations)，mise 也会进行检查。参阅[验证](#verification)。

## 工具选项 {#tool-options}

可在 `[tools]` 中该工具的条目设置这些选项，也可直接写成 `github:owner/repo[key=value]`。`gitlab` 和 `forgejo` 后端接受这些选项，但不接受仅适用于 GitHub 的验证选项；两者的差异分别列于 [gitlab](/dev-tools/backends/gitlab.html#differences-from-the-github-backend) 和 [forgejo](/dev-tools/backends/forgejo.html#differences-from-the-github-backend)。所有后端都接受的选项（例如 `postinstall` 和 `os`）见[工具选项](/dev-tools/#tool-options)。

| 选项                                                                                         | 用途                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`asset_pattern`](#asset-pattern)                                                            | 指定要下载的资源文件名称                                           |
| [`matching`](#matching), [`matching_regex`](#matching-regex)                                 | 缩小自动检测的候选范围                                             |
| [`no_app`](#no-app)                                                                          | 优先使用命令行归档，而非 macOS `.app` 包                            |
| [`additional_asset_patterns`](#additional-asset-patterns)                                    | 从同一发行版解压其他归档到安装目录                                 |
| [`version_prefix`](#version-prefix)                                                          | 读取前缀不是 `v` 的标签版本                                        |
| [`prerelease`](#prerelease)                                                                  | 包含预发行版                                                       |
| [`version_order`](#version-order)                                                            | 按语义化版本排序                                                   |
| [`url`](#platform-specific-urls)                                                             | 在某个平台下载指定 URL，而非发行版资源文件                         |
| [`format`](#format)                                                                          | 指定归档格式                                                       |
| [`strip_components`](#strip-components)                                                      | 解压时移除开头的目录                                               |
| [`bin_path`](#bin-path)                                                                      | 指定可执行文件所在目录                                             |
| [`bin`](#bin)                                                                                | 指定单文件下载的名称                                               |
| [`rename_exe`](#rename-exe)                                                                  | 重命名从归档中解压出的可执行文件                                   |
| [`filter_bins`](#filter-bins)                                                                | 仅将部分可执行文件加入 `PATH`                                      |
| [`checksum`](#checksum), [`size`](#size)                                                     | 固定产物的摘要和大小                                               |
| [`github_attestations`](#github-attestations)                                                | 对单个工具跳过 GitHub 产物证明检查（仅 GitHub）                    |
| [`slsa_signer_identity`, `slsa_signer_issuer`](#slsa-signer-identity-and-slsa-signer-issuer) | 验证 SLSA 来源信息（仅 GitHub）                                    |
| [`api_url`](#api-url)                                                                        | 使用 GitHub Enterprise Server 或其他 Forge 主机                   |

### 选择资源文件 {#selecting-assets}

#### `asset_pattern` {#asset-pattern}

要下载的资源文件名称；`*` 匹配任意长度的字符，`?` 匹配单个字符。模式必须匹配完整名称。若匹配多个资源文件，mise 会选择名称最短的一个。此选项会取代自动检测，因此像下面这样指定某个平台的模式后，只能在该平台上使用：

```toml
[tools]
"github:cli/cli" = { version = "latest", asset_pattern = "gh_*_linux_amd64.tar.gz" }
```

要让配置适用于所有平台，请[按平台](#per-platform-options)设置模式，或使用 [`matching`](#matching)。模式支持[模板](#templates)，因此可以包含版本、操作系统和架构。

#### `matching`

仅保留名称包含指定文本的资源文件，然后由自动检测从中选择适用于当前操作系统和架构的文件。如果某个发行版为每个平台提供多个工具（例如 `oxlint-*` 和 `oxfmt-*` 归档），可使用此选项，让同一份配置适用于所有平台。

```toml
[tools]
"github:oxc-project/oxc" = { version = "apps_v1.69.0", matching = "oxlint", rename_exe = "oxlint" }
```

此选项按区分大小写的子字符串匹配，因此 `matching = "tool"` 也会保留 `tool-extras-*` 资源文件。若要精确匹配前缀，可在 [`matching_regex`](#matching-regex) 中使用锚点。如果当前平台没有资源文件通过筛选，安装会失败，并在错误中指出该筛选条件。同时设置 `asset_pattern` 时，mise 会使用它并静默忽略 `matching` 和 `matching_regex`。查询 SLSA 来源信息时也会使用相同筛选条件，因此多二进制发行版中的每个二进制文件都会针对自己的来源文件进行验证。

#### `matching_regex` {#matching-regex}

与 [`matching`](#matching) 类似，但资源文件名称必须匹配正则表达式。匹配区分大小写；在表达式开头添加 `(?i)` 可忽略大小写。同时设置两个选项时，资源文件必须通过两项筛选。表达式无效会导致安装失败。

```toml
[tools]
"github:oxc-project/oxc" = { version = "apps_v1.69.0", matching_regex = "^oxlint-", rename_exe = "oxlint" }
```

#### `no_app` {#no-app}

在 macOS 上自动检测时，优先选择独立归档，而不是 Xcode 扩展等 `.app` 包。mise 在其他系统上本来就会避开 `.app` 包。设置 `asset_pattern` 后，此选项无效。

```toml
[tools."github:nicklockwood/SwiftFormat"]
version = "latest"
rename_exe = "swiftformat"
no_app = true # use swiftformat.zip, not SwiftFormat.for.Xcode.app.zip
```

#### `additional_asset_patterns` {#additional-asset-patterns}

从同一发行版下载更多归档，并按列出的顺序解压到主资源文件的安装目录中。如果项目将一次安装拆分为基础归档和附加归档，可使用此选项。例如，Ollama 在 Linux x64 上的 ROCm 支持以单独归档的形式叠加到常规 Ollama 归档之上：

```toml
[tools."github:ollama/ollama"]
version = "latest"

[tools."github:ollama/ollama".platforms]
linux-x64 = {
  additional_asset_patterns = ["ollama-linux-amd64-rocm.tar.zst"],
}
```

每个模式都使用与 `asset_pattern` 相同的通配符和[模板](#templates)。若一个模式匹配多个资源文件，mise 会选择名称最短的文件，因此每个模式都应精确对应一个归档。此值可以是数组或逗号分隔的字符串。

附加资源文件必须是归档。mise 解压它们时不会应用主资源文件的 `strip_components`、`bin` 和 `rename_exe`；后续归档中的文件会覆盖较早归档中的同一路径。`mise lock` 会记录每个附加归档的 URL 和校验和；如果锁文件缺少其中任一项，`mise install --locked` 就会失败。

### 选择版本 {#choosing-versions}

#### `version_prefix` {#version-prefix}

发行版标签中位于版本号前面的文本。未设置时，mise 会移除每个标签开头的 `v`；在 GitHub 上，还会移除重复仓库名称的前缀，例如标签 `tectonic@0.15.0`。如果仓库使用其他前缀，请设置此选项：

```toml
[tools]
"github:user/repo" = { version = "latest", version_prefix = "release-" }
```

设置 `version_prefix = "release-"` 后，mise 只会列出以 `release-` 开头的标签，将 `release-1.0.0` 显示为 `1.0.0`，并在运行 `mise use github:user/repo@1.0.0` 时安装对应标签。设置 `version_prefix = ""` 可保留标签发布时的原样内容，包括开头的 `v`。

#### `prerelease`

默认情况下，mise 会在 `mise ls-remote`、`latest` 和版本前缀解析中排除 GitHub 标记为预发行版的发行版。设置 `prerelease = true` 可将其纳入：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", prerelease = true }
```

此时，`latest` 会解析为最新发行版（包括预发行版），而不是 GitHub 标记为 Latest 的发行版；`1.2` 这样的前缀也会匹配其下的预发行版标签。可用于活跃发行版全是预发行版的仓库，或跟踪候选发行版。草稿发行版永远不会列出。

若要对所有工具包含预发行版，请设置 [`prereleases`](/configuration/settings.html#prereleases)（`MISE_PRERELEASES=1`）。只需在单次查询中包含时，可运行 `mise ls-remote --prerelease`。

#### `version_order` {#version-order}

默认情况下，`mise ls-remote` 按发行版发布时间列出版本。如果仓库在发布较新版本后又发布了旧版本分支的回移修复，可设置 `version_order = "semver"`，让列表和 `1.2` 这样的前缀按语义化版本排序：

```toml
[tools]
"github:owner/tool" = { version = "1.2", version_order = "semver" }
```

如果 GitHub 或 Forgejo 标记了 Latest，`latest` 仍会解析到该发行版。参阅[版本排序](/dev-tools/versions.html#version-ordering)。

### 按平台设置选项 {#per-platform-options}

要仅在特定平台使用某个选项，请将其设在 `platforms.<os>-<arch>` 下。平台级的值会覆盖顶层值。键名使用 mise 的命名方式：操作系统为 `linux`、`macos` 或 `windows`，架构为 `x64` 或 `arm64`；mise 也接受 `darwin`、`amd64`、`x86_64` 和 `aarch64`。

```toml
[tools."github:cli/cli"]
version = "2.100.0"

[tools."github:cli/cli".platforms]
linux-x64 = {
  asset_pattern = "gh_*_linux_amd64.tar.gz",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
}
macos-arm64 = {
  asset_pattern = "gh_*_macOS_arm64.zip",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
}
```

以下选项可以按平台分别设置：`asset_pattern`、`additional_asset_patterns`、`url`、`no_app`、`format`、`strip_components`、`bin_path`、`bin`、`rename_exe`、`filter_bins`、`checksum` 和 `size`。其他选项适用于所有平台。

#### `url` {#platform-specific-urls}

设置 `platforms.<os>-<arch>.url` 可直接下载该 URL，而不从发行版中选择资源文件。URL 支持[模板](#templates)：

::: v-pre
`{{ version }}` 表示解析后的版本，即使你请求的是 `latest` 也是如此。
:::

~~~toml
[tools."github:owner/repo"]
version = "latest"
platforms.macos-arm64.url = "https://downloads.example.com/tool/{{ version }}/tool-macos-arm64.tar.gz"
~~~

URL 中必须自行包含 `v` 等标签前缀。此后端会忽略顶层的 `url`，因此应在每个平台下分别设置。mise 只解压下载内容，不会构建，因此 URL 必须指向预编译归档或二进制文件。你可以使用 [`additional_asset_patterns`](#additional-asset-patterns) 在其上叠加发行版资源文件。如果所有受支持的平台都设置了 `url`，即使发行版没有资源文件，mise 也会列出这些版本；参阅[版本列表的生成方式](#version-listing)。

### 解压和命名可执行文件 {#extracting-and-naming-executables}

#### `format`

归档格式，例如 `tar.gz`、`tar.xz` 或 `zip`。如果资源文件没有扩展名，或扩展名不正确，请设置此选项；否则 mise 会根据文件名检测格式。对于非归档文件，请使用 `raw`。

```toml
[tools]
"github:owner/repo" = { version = "1.0.0", asset_pattern = "tool-linux-x64", format = "tar.gz" }
```

#### `strip_components` {#strip-components}

解压归档时要移除的开头目录层数：

```toml
[tools]
"github:cli/cli" = { version = "latest", strip_components = 1 }
```

未设置 `strip_components` 和 `bin_path` 时，如果归档只包含一个顶层目录且没有其他文件（例如 ripgrep 归档中的 `ripgrep-14.1.1-x86_64-unknown-linux-musl/rg`），mise 会自动移除这一层目录。

#### `bin_path` {#bin-path}

相对于安装目录、用于存放可执行文件的目录。如果 mise 没有找到可执行文件，请设置此选项。mise 会在应用 `strip_components` 后再应用该路径；设置此选项后会关闭自动移除目录。

::: v-pre
对于目录结构为 `tool-1.0.0/bin/tool` 的归档，可像下面这样设置 `strip_components = 1` 和 `bin_path = "bin"`，也可以通过 `bin_path = "tool-{{ version }}/bin"` 保留外层目录。
:::

```toml
[tools."github:cli/cli"]
version = "latest"
strip_components = 1
bin_path = "bin" # 移除归档最外层目录后
```

`bin_path` 支持[模板](#templates)，以便在目录名中包含版本、操作系统或架构时使用：

```toml
[tools."github:pizlonator/fil-c"]
version = "latest"
# 例如 filc-0.681-linux-x86_64/build/bin
strip_components = 0
bin_path = 'filc-{{ version }}-{{ os() }}-{{ arch(x64="x86_64", arm64="aarch64") }}/build/bin'
```

未设置 `bin_path` 时，mise 会按以下规则中第一个适用的规则将相应目录加入 `PATH`：

1. 如果存在，则使用安装目录中的 `bin/`。
2. 对于已移除外层目录的 `.app` 包，使用安装目录中的 `Contents/MacOS`。
3. 如果安装目录直接包含可执行文件，则使用安装目录本身。
4. 使用符合条件的所有直接子目录：`*.app` 目录对应其 `Contents/MacOS`；其他子目录对应其 `bin/`，若目录直接包含可执行文件则使用该目录本身。
5. 使用安装目录本身。

设置 [`filter_bins`](#filter-bins) 后，只会将其 `.mise-bins` 目录加入 `PATH`。

#### 命名可执行文件

| 下载内容                            | 选项                        | 示例                                                        |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------- |
| 单个二进制文件                      | [`bin`](#bin)               | `bin = "mytool"`                                            |
| 仅包含一个可执行文件的归档          | [`rename_exe`](#rename-exe) | `rename_exe = "yt-dlp"`                                     |
| 包含多个可执行文件的归档            | 使用表格形式的 `rename_exe` | `rename_exe = { "ols-*" = "ols", "odinfmt-*" = "odinfmt" }` |

#### `bin`

为下载的单文件二进制指定名称。名称可以包含目录，例如 `bin/mytool`。mise 会自动移除单文件下载名称中的操作系统和架构后缀，因此 `docker-compose-linux-x86_64` 无需设置选项即可安装为 `docker-compose`。只有想使用其他名称时才设置 `bin`：

```toml
[tools."github:owner/repo"]
version = "1.0.0"
bin = "mytool" # 将下载的文件安装为 mytool
```

#### `rename_exe` {#rename-exe}

解压归档后重命名可执行文件。字符串形式会重命名工具的主可执行文件：优先选择与仓库同名的文件，其次选择名称中包含仓库名的文件，最后选择 mise 找到的第一个可执行文件。

```toml
[tools."github:yt-dlp/yt-dlp"]
version = "latest"
asset_pattern = "yt-dlp_linux.zip"
rename_exe = "yt-dlp"
```

如果归档中包含多个可执行文件，并且你希望将它们改为简单名称，请使用表格形式。每个键可以是准确的文件名或 glob 模式，每个值是新名称：

```toml
[tools."github:DanielGavin/ols"]
version = "latest"
# 归档中包含 ols-x86_64-unknown-linux-gnu 和 odinfmt-x86_64-unknown-linux-gnu
rename_exe = { "ols-*" = "ols", "odinfmt-*" = "odinfmt" }
```

如果某个键没有匹配任何文件，mise 会发出警告；mise 还会恢复 ZIP 等某些归档可能移除的可执行权限位。

#### `filter_bins` {#filter-bins}

仅将指定的可执行文件加入 `PATH`。mise 会在安装目录中创建 `.mise-bins` 目录并在其中创建链接，随后只将该目录加入 `PATH`，这样归档中的其他可执行文件（例如 `pandoc-lua` 和 `pandoc-server`）就不会暴露。此值可以是数组或逗号分隔的字符串；如果找不到指定名称，mise 会发出警告。

```toml
[tools]
"github:jgm/pandoc" = { version = "latest", filter_bins = "pandoc" }
"github:owner/repo" = { version = "latest", filter_bins = ["tool", "helper"] }
```

在 Windows 上，名称需包含扩展名（`filter_bins = "pandoc.exe"`）。`.mise-bins` 中的条目是文件副本，因此 `mise x` 和 shims 会启动副本，而副本仍能找到旁边的 DLL 和数据文件。通过 `mise activate` 等方式直接从 `PATH` 找到副本的 Shell 也会运行该副本。每个副本会在安装时记录其源文件，因此要让旧版 mise 安装的工具采用此行为，请重新安装（`mise install --force`）。

### 验证

如果 GitHub 为资源文件报告了摘要，或发行版发布了列出该文件校验和的文件，mise 会据此检查下载内容。启用锁文件时，mise 会将校验和记录到 [mise.lock](/dev-tools/mise-lock.html)，并在之后的安装中进行核对。对于公开 GitHub，mise 还会检查 GitHub 产物证明。以下选项可手动固定值、添加 SLSA 来源信息检查，或关闭证明检查。

#### `checksum`

通常无需设置此项：[`mise lock`](/dev-tools/mise-lock.html) 会记录每个平台的 URL 和校验和。若要手动固定某个产物，可将 `checksum` 设为 `<algorithm>:<hash>`，其中算法可以是 `sha256`、`sha512` 或 `blake3`。校验和对应单个版本和单个资源文件，因此应固定版本；若支持多个平台，还应[按平台分别设置](#per-platform-options)：

```toml
[tools."github:owner/repo"]
version = "1.0.0"
asset_pattern = "tool-1.0.0-x64.tar.gz"
checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST"
```

#### `size`

资源文件预期的字节数。如果下载大小不符，安装会失败。大小检查可以发现下载截断，但不能代替校验和。

```toml
[tools]
"github:owner/repo" = { version = "1.0.0", checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST", size = "12345678" }
```

#### `github_attestations` {#github-attestations}

默认情况下，如果发行版资源文件带有 GitHub 产物证明，mise 就会检查。设置 `github_attestations = false` 可对单个工具跳过检查，同时仍为其他工具启用：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", github_attestations = false }
```

如果 GitHub 证明服务或受信任根数据导致安装失败，可将此选项作为临时解决办法。校验和以及已配置的 SLSA 来源信息仍会检查。如果 `mise.lock` 为该工具记录了 `github-attestations` 来源信息，设置此选项后请重新运行 `mise lock`；否则安装会失败，因为锁文件要求执行已关闭的检查。设置 [`github.github_attestations`](/configuration/settings.html#github.github_attestations) 可对所有工具关闭检查。此选项仅适用于 GitHub。

#### `slsa_signer_identity` 与 `slsa_signer_issuer` {#slsa-signer-identity-and-slsa-signer-issuer}

若要验证随发行版发布的 SLSA 来源信息，请设置你预期的发行工作流证书身份和 OIDC 颁发者：

```toml
[tools."github:myorg/mytool"]
version = "latest"
slsa_signer_identity = "https://github.com/myorg/mytool/.github/workflows/release.yml@refs/tags/v{{ version }}"
slsa_signer_issuer = "https://token.actions.githubusercontent.com"
```

::: v-pre
身份必须与证书中的工作流引用完全一致。此值支持[模板](#templates)，其中 `{{ version }}` 表示解析后的版本。
:::

如果没有同时设置这两个选项，mise 会跳过 SLSA 来源信息验证，并使用其他检查。锁文件条目同时记录校验和与 SLSA 来源信息时，安装会跳过重复验证；设置 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 后则会重新验证，且未设置签名者选项也会报错。这些选项仅适用于 GitHub。

### 模板

`asset_pattern`、`additional_asset_patterns`、`url`、`bin_path` 和 `slsa_signer_identity` 都支持 [Tera 模板](/templates.html)。请用双花括号书写变量：

::: v-pre

- `{{ version }}`：解析后的版本，不带标签前缀
- `{{ os() }}`：`linux`、`macos` 或 `windows`
- `{{ arch() }}`：`x64` 或 `arm64`

`os` 和 `arch` 是函数，因此必须包含括号。对于采用其他命名方式的项目，可以通过关键字参数重命名其值，例如 `{{ os(macos="darwin") }}` 或 `{{ arch(x64="x86_64", arm64="aarch64") }}`。如果模板中包含双引号，请使用单引号括起 TOML 字符串，如上面的 `bin_path` 示例。

:::

#### 单花括号占位符 <Badge type="danger" text="已弃用" />

::: v-pre
`{version}` 和 `{x86_64_arch}` 这样的单花括号占位符已弃用。mise 从 2026.3.0 开始对此发出警告，并将在 2027.3.0 停止接受。请按下表替换：

| 已弃用写法      | 替代写法                                    |
| --------------- | ------------------------------------------- |
| `{version}`     | `{{ version }}`                             |
| `{os}`          | `{{ os() }}`                                |
| `{arch}`        | `{{ arch() }}`                              |
| `{darwin_os}`   | `{{ os(macos="darwin") }}`                  |
| `{amd64_arch}`  | `{{ arch(x64="amd64") }}`                   |
| `{x86_64_arch}` | `{{ arch(x64="x86_64", arm64="aarch64") }}` |
| `{gnu_arch}`    | `{{ arch(x64="x86_64") }}`                  |

:::

## 从同一发行版安装多个工具 {#multiple-assets-from-the-same-release}

如果多个资源文件共同组成一次安装（例如基础归档和附加组件），请使用 [`additional_asset_patterns`](#additional-asset-patterns)。如果它们是彼此独立的工具，请为每个工具设置指向同一仓库的[工具别名](/dev-tools/aliases.html)，并使用 `matching` 选择其资源文件：

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

每个别名都是独立工具，拥有自己的版本和安装目录。如果一个二进制文件的名称是另一个名称的子串，请使用带锚点的 `matching_regex`（例如 `^oxlint-`），而不要使用 `matching`。

不要为同一个 `github:owner/repo` 创建带不同 `matching` 值的两个条目：mise 会将它们视为一个工具，只使用第一个条目的选项，而不会安装另一个二进制文件。

## GitHub Enterprise Server {#self-hosted-github}

将 `api_url` 设为服务器的 API 地址，并按照 [GitHub 令牌](/dev-tools/github-tokens.html#github-enterprise)中的说明为该主机提供令牌。mise 会通过此 API 列出发行版、查找资源文件并下载。自定义 `api_url` 时不会检查 GitHub 产物证明，因为 GitHub Enterprise Server 不提供此类证明。

### `api_url` {#api-url}

API 的基础 URL。此处默认值为 `https://api.github.com`；`gitlab` 后端的默认值为 `https://gitlab.com/api/v4`，`forgejo` 后端的默认值为 `https://codeberg.org/api/v1`。

```toml
[tools]
"github:myorg/mytool" = { version = "latest", api_url = "https://github.mycompany.com/api/v3" }
```

## 版本列表的生成方式 {#version-listing}

`mise ls-remote` 会列出仓库中至少附带一个资源文件的发行版。mise 从发行版资源文件安装，绝不会使用 GitHub 自动生成的源代码归档，因此没有资源文件的发行版无法安装。即使某个发行版的资源文件不支持你的平台，它仍会列出，这样所有机器上的版本列表一致，跨平台锁文件也能正常工作。草稿发行版永远不会列出；预发行版仅在设置 [`prerelease`](#prerelease) 后列出。

如果所有受支持的平台都设置了 [`url`](#platform-specific-urls)，那么无论发行版是否附带资源文件，mise 都会列出它们。如果只为部分平台设置 `url`，mise 也会在所有平台上列出没有资源文件的发行版；在没有设置 `url` 的平台上安装此类发行版会失败。

mise 每次读取一页（100 个）发行版。只有尚未找到带有资源文件的稳定发行版时，它才会继续读取，最多读取三页。设置 `MISE_LIST_ALL_VERSIONS=1` 可读取所有页面。对于公开仓库，mise 会从 [mise-versions](https://mise-versions.jdx.dev) 读取发行版列表；只有 mise-versions 无法响应时，才会查询 GitHub API，但 [`use_versions_host`](/configuration/settings.html#use_versions_host) 关闭时除外。mise-versions 为每个仓库提供最新的 1,000 个发行版；若要列出更早的发行版，请关闭 `use_versions_host`。

## 设置

`github` 组中的其他设置用于选择和创建令牌；参阅 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。

<script setup>
import Settings from '/components/settings.vue';
</script>

<Settings child="github" :keys="['github_attestations', 'slsa']" :level="3" />

实现位置：[`src/backend/github.rs`](https://github.com/jdx/mise/blob/main/src/backend/github.rs)。
