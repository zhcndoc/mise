# GitLab 后端

你可以使用 `gitlab` 后端直接安装 GitLab 发布资产。此后端会从 GitLab 仓库下载发布资产，非常适合通过 GitLab 发布分发预构建二进制文件的工具。

其代码位于 mise 仓库中的 [`./src/backend/github.rs`](https://github.com/jdx/mise/blob/main/src/backend/github.rs)。

## 用法

以下命令会从 GitLab releases 安装最新版本的 gitlab-runner，
并将其设置为 PATH 中的活动版本：

```sh
$ mise use -g gitlab:gitlab-org/gitlab-runner
$ gitlab-runner --version
gitlab-runner 16.8.0
```

该版本将以如下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"gitlab:gitlab-org/gitlab-runner" = { version = "latest", asset_pattern = "gitlab-runner-linux-x64" }
```

## 身份验证

对于私有仓库或更高的 API 限额，mise 支持多种 GitLab 令牌来源。

### 令牌优先级

mise 按以下顺序检查这些来源，并使用找到的第一个令牌：

1. `MISE_GITLAB_ENTERPRISE_TOKEN`（适用于非 `gitlab.com` 主机）
2. `MISE_GITLAB_TOKEN`
3. `GITLAB_TOKEN`
4. `credential_command`（如果已设置）
5. `gitlab_tokens.toml`（按主机）
6. glab CLI 配置（`config.yml`，如果启用）
7. `git credential fill`（如果 `gitlab.use_git_credentials=true`）

### 环境变量

```sh
export MISE_GITLAB_TOKEN="glpat-xxxxxxxx"
```

对于自托管的 GitLab 实例：

```sh
export MISE_GITLAB_ENTERPRISE_TOKEN="glpat-yyyyyyyy"
```

### 令牌文件（`gitlab_tokens.toml`）

```toml
# ~/.config/mise/gitlab_tokens.toml
[tokens."gitlab.com"]
token = "glpat-xxxxxxxx"

[tokens."gitlab.mycompany.com"]
token = "glpat-yyyyyyyy"
```

### `credential_command`

你可以提供一个 shell 命令，将令牌打印到 stdout：

```toml
[settings.gitlab]
credential_command = "op read 'op://Private/GitLab Token/credential'"
```

mise 使用已配置的默认内联 shell 执行此命令。目标主机名可通过 `MISE_CREDENTIAL_HOST` 获取，提供程序名称（`gitlab`）可通过 `MISE_CREDENTIAL_PROVIDER` 获取。为兼容起见，支持 `sh` 兼容的 shell（`ash`、`bash`、`dash`、`ksh`、`sh` 和 `zsh`）也会将主机名作为 `$1`/`${1}` 传递。

:::: warning 计划弃用
旧的 `$1`/`${1}` 主机名参数已被弃用。请改用 `MISE_CREDENTIAL_HOST`。mise 将在 `2026.11.0` 开始发出警告，并且 `$1` 兼容性将在 `2027.11.0` 中移除。
::::

### glab CLI 集成

mise 可以从 [glab](https://gitlab.com/gitlab-org/cli) 配置中读取令牌作为回退方案。它会检查：

1. `$GLAB_CONFIG_DIR/config.yml`
2. `$XDG_CONFIG_HOME/glab-cli/config.yml`（默认为 `~/.config/glab-cli/config.yml`）
3. `~/Library/Application Support/glab-cli/config.yml`（macOS）

使用以下配置禁用此回退方案：

```toml
[settings.gitlab]
glab_cli_tokens = false
```

### `git credential fill` 回退

作为最后的手段，mise 可以查询 git 凭据 helper：

```toml
[settings.gitlab]
use_git_credentials = true
```

这会使用 `git credential fill`，并支持由诸如 macOS 钥匙串之类的 helper 存储的凭据。

### 调试令牌解析

使用 `mise token gitlab` 查看 mise 在给定主机上会使用哪个令牌：

```sh
mise token gitlab
mise token gitlab --unmask
mise token gitlab gitlab.mycompany.com
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `gitlab` 后端——这些选项应放在 `mise.toml` 中的 `[tools]` 里。

### 资产自动检测

当未指定 `asset_pattern` 时，mise 会自动为你的平台选择最佳的资产。系统会根据以下因素对资产进行评分：

- **操作系统兼容性**（linux、macos、windows）
- **架构兼容性**（x64、arm64、x86、arm）
- **Libc 变体**（Linux 使用 gnu 或 musl，Windows 使用 msvc）
- **归档格式偏好**（tar.gz、zip 等）
- **构建类型**（避免调试/测试构建）

对于大多数工具，你可以直接安装，而无需指定模式：

```sh
mise install gitlab:user/repo
```

::: tip
自动检测逻辑实现在 [`src/backend/asset_matcher.rs`](https://github.com/jdx/mise/blob/main/src/backend/asset_matcher.rs) 中，它被 GitHub、GitLab 和 Forgejo 后端共享。
:::

### `asset_pattern`

指定用于匹配发布资源名称的模式。当你的操作系统/架构组合有多个资源，或者需要覆盖自动检测时，这很有用。

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "latest"
asset_pattern = "gitlab-runner-linux-x64"
```

### `matching`

将资产选择范围缩小到包含给定子字符串的名称，**同时保留平台自动检测**。不同于 [`asset_pattern`](#asset_pattern)（它会完全替换自动检测），`matching` 只会缩小候选集——自动检测仍会从缩小后的列表中选择正确的操作系统/架构，因此同一份配置可以在各个平台上保持可移植性。

当仓库发布了**多个二进制文件，作为按平台分别提供的资产**，而自动检测无法判断你想要哪一个时，就应使用这个选项。

```toml
[tools]
# 当一次发布为每个平台提供了多个二进制文件（例如 `mytool-cli` 和
# `mytool-server`），matching 会在所有操作系统/架构上选择一个，
# 而无需硬编码平台专属的 asset_pattern。
"gitlab:owner/repo" = { version = "latest", matching = "mytool-cli" }
```

也可以使用 `[key=value]` 语法在命令行中内联传入工具选项：

```sh
mise use "gitlab:owner/repo[matching=mytool-cli]"
```

`matching` 是区分大小写的子字符串测试，因此如果某个值也恰好是另一个资产名称的子字符串（例如当同时发布了 `tool-*` 和 `tool-extras-*` 时设置 `matching = "tool"`），它不会唯一地选中你的二进制文件。在需要精确匹配时，请使用带锚点的 [`matching_regex`](#matching_regex)。

如果同时设置了 [`asset_pattern`](#asset_pattern)，则它会优先，`matching`/`matching_regex` 会被忽略——`asset_pattern` 会完全替换自动检测，因此不再有候选集可供它们缩小。它们会被静默忽略：当设置了 `asset_pattern` 时，不会再查询 `matching_regex`，无效值也不会被报告，因为 mise 不会因为被覆盖的选项而报错。

### `matching_regex`

类似于 [`matching`](#matching)，但资产名称必须匹配给定的正则表达式。当子字符串不够精确时，请使用此选项。匹配区分大小写；如需不区分大小写的匹配，请使用内联 `(?i)` 标志。

```toml
[tools]
"gitlab:owner/repo" = { version = "latest", matching_regex = "^mytool-cli-" }
```

如果同时设置了 `matching` 和 `matching_regex`，那么资产必须同时满足**两者**（逻辑 AND）
才能保持为候选项。

::: warning
`matching`/`matching_regex` **不是**安装路径的一部分——它由工具
名称（`owner/repo` 或 `tool_alias`）和版本作为键。若要从同一个
发布版本安装两个二进制文件，请为每个文件分别提供一个 [`tool_alias`](/dev-tools/backends/github.html#multiple-assets-from-the-same-release)，
这样它们就会获得不同的安装目录；如果重复使用相同的 `gitlab:owner/repo` 字符串并搭配
不同的 `matching` 值，它们会解析到同一个目录，第二次安装会覆盖
第一次。
:::

### `version_prefix`

指定发布标签的自定义版本前缀。默认情况下，mise 会处理常见的 `v` 前缀（例如 `v1.0.0`），但有些仓库使用不同的前缀，比如 `release-`、`version-`，或者根本不使用前缀。

当配置了 `version_prefix` 时，mise 将会：

- 过滤带有该前缀的可用版本，并去除该前缀
- 在搜索发布版本时添加该前缀
- 在安装期间同时尝试带前缀和不带前缀的版本

```toml
[tools]
"gitlab:user/repo" = { version = "latest", version_prefix = "release-" }
```

**示例：**

- 使用 `version_prefix = "release-"` 时：
  - 用户指定 `1.0.0` → mise 搜索 `release-1.0.0` 标签
  - 可用版本显示为 `1.0.0`（去除了前缀）
- 使用 `version_prefix = ""`（空字符串）时：
  - 用户指定 `1.0.0` → mise 搜索 `1.0.0` 标签（无前缀）
  - 适用于不使用任何前缀的仓库

### 各平台特定的资源模式

对于每个平台不同的资源模式：

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "latest"

[tools."gitlab:gitlab-org/gitlab-runner".platforms]
linux-x64 = { asset_pattern = "gitlab-runner-linux-x64" }
macos-arm64 = { asset_pattern = "gitlab-runner-macos-arm64" }
```

### `checksum`

使用校验和验证下载的文件：

```toml
[tools."gitlab:owner/repo"]
version = "1.0.0"
asset_pattern = "tool-1.0.0-x64.tar.gz"
checksum = "sha256:a1b2c3d4e5f6789..."
```

_与其在这里指定校验和，不如使用 [mise.lock](/dev-tools/mise-lock) 来管理校验和。_

### 特定平台校验和

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "latest"

[tools."gitlab:gitlab-org/gitlab-runner".platforms]
linux-x64 = {
  asset_pattern = "gitlab-runner-linux-x64",
  checksum = "sha256:a1b2c3d4e5f6789...",
}
macos-arm64 = {
  asset_pattern = "gitlab-runner-macos-arm64",
  checksum = "sha256:b2c3d4e5f6789...",
}
```

### `size`

验证下载的资产大小：

```toml
[tools]
"gitlab:gitlab-org/gitlab-runner" = { version = "latest", size = "12345678" }
```

### 特定平台大小

你可以为不同平台指定不同的大小：

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "latest"

[tools."gitlab:gitlab-org/gitlab-runner".platforms]
linux-x64 = { size = "12345678" }
macos-arm64 = { size = "9876543" }
```

### `strip_components`

提取归档时要剥离的目录组件数：

```toml
[tools]
"gitlab:gitlab-org/gitlab-runner" = { version = "latest", strip_components = 1 }
```

::: info
如果未显式设置 `strip_components`，mise 会自动检测何时应用 `strip_components = 1`。当解压后的归档在根级别仅包含一个目录且没有文件时，就会发生这种情况。这在像 ripgrep 这样将其二进制文件打包在版本化目录中的工具里很常见（例如，`ripgrep-14.1.0-x86_64-unknown-linux-musl/rg`）。自动检测可确保二进制文件直接放置在 mise 预期的安装路径中。
:::

### `bin`

将下载的二进制文件重命名为特定名称。当下载带有平台特定名称的单个二进制文件时，这很有用：

```toml
[tools."gitlab:myorg/mytool"]
version = "1.0.0"
asset_pattern = "mytool-linux-x86_64"
bin = "mytool"  # 将 mytool-linux-x86_64 重命名为 mytool
```

::: info
当下载单个二进制文件（而不是压缩包）时，mise 会自动从文件名中移除 OS/架构后缀。例如，`mytool-linux-x86_64` 会自动变为 `mytool`。只有在你需要特定的自定义名称时才使用 `bin` 选项。
:::

### `rename_exe`

在从压缩包中解压后重命名可执行文件。当压缩包中包含一个带有特定平台名称的二进制文件，而你希望将其重命名时，这很有用：

```toml
[tools."gitlab:myorg/mytool"]
version = "latest"
asset_pattern = "mytool_linux.zip"
rename_exe = "mytool"  # 将解压后的二进制文件重命名为 mytool
```

::: tip
对于压缩包中二进制文件名称与期望名称不同的情况，请使用 `rename_exe`。对于单个二进制文件下载（非压缩包），请使用 `bin`。
:::

### `no_app`

在自动检测期间跳过 macOS 的 .app bundle 资源，改为优先选择独立的 CLI 二进制文件。当某个仓库同时提供 macOS .app bundle（通常是 Xcode 扩展或 GUI 应用）以及独立的命令行工具时，这会很有用：

```toml
[tools."gitlab:myorg/mytool"]
version = "latest"
no_app = true
```

当 `no_app = true` 时：

- 包含 `.app.` 的资源（例如 `Tool.app.zip`、`Tool.for.Xcode.app.zip`）在自动检测期间会被降权
- 会优先选择独立归档文件
- 这主要用于 macOS 资源选择；非 macOS 的 `.app.` 资源已经会因平台匹配而被降权
- 仅影响自动检测；显式的 `asset_pattern` 值会按原样使用

### `bin_path`

::: v-pre
指定解压后的归档中包含二进制文件的目录，或下载文件的放置位置。这支持使用 Tera 模板变量，例如 `{{ version }}`、`{{ os }}`、`{{ arch }}` 以及架构别名（`{{ darwin_os }}`、`{{ amd64_arch }}`、`{{ x86_64_arch }}`、`{{ gnu_arch }}`）：
:::

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "latest"
bin_path = "gitlab-runner-{{ version }}/bin" # expands to gitlab-runner-1.0.0/bin
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果安装路径根目录包含可执行文件，则使用安装路径根目录
4. 如果不存在 `bin/` 目录，则在子目录中搜索 `bin/` 目录
5. 如果未找到任何 `bin/` 目录，则搜索直接子目录中的任何可执行文件。如果在某个子目录中直接找到可执行文件，则整个子目录都将被视为二进制路径。
6. 如果未找到任何可执行文件，则使用解压目录的根目录

### `filter_bins`

以逗号分隔的二进制文件列表，将它们符号链接到一个经过过滤的 `.mise-bins` 目录中。当工具自带一些你不想暴露在 PATH 中的额外二进制文件时，这很有用。

```toml
[tools]
"gitlab:myorg/mytool" = { version = "1.0.0", filter_bins = "mybin" }
```

启用后：

- 会创建一个 `.mise-bins` 子目录，其中只包含指向指定二进制文件的符号链接
- 其他二进制文件不会暴露在 PATH 中

### `api_url`

对于自托管的 GitLab 实例，请指定 API URL。mise 会使用该 URL 进行发布列表和发布资产查找，并且在浏览器下载 URL 无法访问时，或在使用自定义/私有实例时，也可能使用它来下载资产：

```toml
[tools]
"gitlab:myorg/mytool" = { version = "latest", api_url = "https://gitlab.mycompany.com/api/v4" }
```

## 私有 GitLab 仓库

如果你想从 `gitlab.com` 上的私有仓库安装工具，请设置 `MISE_GITLAB_TOKEN` 环境变量进行身份验证：

```sh
export MISE_GITLAB_TOKEN="your-token"
```

## 自托管 GitLab

如果你正在使用自托管的 GitLab 实例，请设置 `api_url` 工具选项，并可选地设置 `MISE_GITLAB_ENTERPRISE_TOKEN` 环境变量用于身份验证：

```sh
export MISE_GITLAB_ENTERPRISE_TOKEN="your-token"
```

## 支持的 GitLab 语法

- **最新发布版本的 GitLab 简写：** `gitlab:gitlab-org/gitlab-runner`
- **特定发布版本的 GitLab 简写：** `gitlab:gitlab-org/gitlab-runner@16.8.0`

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>

<Settings child="gitlab" :level="3" />
