# Forgejo 后端

您可以直接使用 `forgejo` 后端安装 Codeberg 和其他兼容 Forgejo 的发布资源。此后端会从 Forgejo 仓库下载发布资源，非常适合通过 Forgejo 发布分发预编译二进制文件的工具。

默认情况下，Forgejo 后端使用 Codeberg 的公共实例 [https://codeberg.org](https://codeberg.org)。对于其他或自托管的 Forgejo 实例，您可以使用 `api_url` 工具选项指定自定义 API URL。

相关代码位于 mise 仓库中的 [`src/backend/github.rs`](https://github.com/jdx/mise/blob/main/src/backend/github.rs)。

## 用法

以下命令会从 Forgejo 发行版中安装某个工具的最新版本，并将其设为 PATH 中当前可用的版本：

```sh
$ mise use -g forgejo:forgejo/runner[api_url=https://code.forgejo.org/api/v1,bin=forgejo-runner,bin=forgejo-runner]
$ forgejo-runner -v
forgejo-runner version v12.4.0
```

该版本将按以下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"forgejo:forgejo/runner" = {
  version = "latest",
  api_url = "https://code.forgejo.org/api/v1",
  bin = "forgejo-runner",
}
```

## 认证

对于私有仓库或更高的 API 限额，mise 支持多种 Forgejo 令牌来源。

### 令牌优先级

mise 按以下顺序检查这些来源，并使用找到的第一个令牌：

1. `MISE_FORGEJO_ENTERPRISE_TOKEN`（用于非 `codeberg.org` 主机）
2. `MISE_FORGEJO_TOKEN`
3. `FORGEJO_TOKEN`
4. `credential_command`（如果已设置）
5. `forgejo_tokens.toml`（按主机）
6. `fj` CLI 配置（`keys.json`，如果已启用）
7. `git credential fill`（如果 `forgejo.use_git_credentials=true`）

### 环境变量

```sh
export MISE_FORGEJO_TOKEN="forgejo-token"
```

对于自托管 Forgejo 实例：

```sh
export MISE_FORGEJO_ENTERPRISE_TOKEN="forgejo-enterprise-token"
```

### 令牌文件（`forgejo_tokens.toml`）

```toml
# ~/.config/mise/forgejo_tokens.toml
[tokens."codeberg.org"]
token = "forgejo-public-token"

[tokens."forgejo.mycompany.com"]
token = "forgejo-enterprise-token"
```

### `credential_command`

你可以提供一个将令牌打印到 stdout 的 shell 命令：

```toml
[settings.forgejo]
credential_command = "op read 'op://Private/Forgejo Token/credential'"
```

mise 会使用已配置的默认内联 shell 执行此命令。目标主机名可通过 `MISE_CREDENTIAL_HOST` 获取，提供者名称（`forgejo`）可通过 `MISE_CREDENTIAL_PROVIDER` 获取。为兼容起见，受支持的 sh 兼容 shell（`ash`、`bash`、`dash`、`ksh`、`sh` 和 `zsh`）也会将主机名作为 `$1`/`${1}` 传入。

:::: warning 计划弃用
旧的 `$1`/`${1}` 主机名参数已被弃用。请改用 `MISE_CREDENTIAL_HOST`。mise 将在 `2026.11.0` 开始发出警告，并将在 `2027.11.0` 移除对 `$1` 的兼容性。
::::

### `fj` CLI 集成

mise 可以从 [`fj` CLI](https://codeberg.org/forgejo-contrib/forgejo-cli)（`keys.json`）中读取令牌作为后备方案。它会检查：

1. `$XDG_DATA_HOME/forgejo-cli/keys.json`（默认为 `~/.local/share/forgejo-cli/keys.json`）
2. `~/Library/Application Support/forgejo-cli.forgejo-cli/keys.json`（macOS）
3. `~/Library/Application Support/Cyborus.forgejo-cli/keys.json`（旧版 macOS 位置）

可通过以下方式禁用此后备方案：

```toml
[settings.forgejo]
fj_cli_tokens = false
```

### `git credential fill` 后备方案

作为最后的手段，mise 可以查询 git 凭据助手：

```toml
[settings.forgejo]
use_git_credentials = true
```

这会使用 `git credential fill`，并支持由 macOS 钥匙串等助手存储的凭据。

### 调试令牌解析

使用 `mise token forgejo` 查看 mise 在给定主机下会使用哪个令牌：

```sh
mise token forgejo
mise token forgejo --unmask
mise token forgejo forgejo.mycompany.com
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `forgejo` 后端——这些内容应放在 `mise.toml` 的 `[tools]` 中。

### 资产自动检测

当未指定 `asset_pattern` 时，mise 会自动为你的平台选择最佳资产。系统会根据以下因素对资产进行评分：

- **操作系统兼容性**（linux、macos、windows）
- **架构兼容性**（x64、arm64、x86、arm）
- **Libc 变体**（Linux 使用 gnu 或 musl，Windows 使用 msvc）
- **归档格式偏好**（tar.gz、zip 等）
- **构建类型**（避免调试/测试构建）

对于大多数工具，你只需直接安装，无需指定模式：

```sh
mise install forgejo:user/repo
```

::: tip
自动检测逻辑实现于 [`src/backend/asset_matcher.rs`](https://github.com/jdx/mise/blob/main/src/backend/asset_matcher.rs)，该逻辑被 GitHub、GitLab 和 Forgejo 后端共享。
:::

### `asset_pattern`

指定用于匹配发布资源名称的模式。当你的操作系统/架构组合存在多个资源，或者需要覆盖自动检测时，这会很有用。

```toml
[tools]
"forgejo:user/repo" = { version = "latest", asset_pattern = "tool_*_linux_x64.tar.gz" }
```

### `matching`

将资产选择缩小到包含给定子串的名称，**同时保留平台自动检测**。不同于 [`asset_pattern`](#asset_pattern)（它会完全替代自动检测），`matching` 只会细化候选集合——自动检测仍会从缩小后的列表中选择正确的 OS/架构，因此同一份配置可以跨平台使用。

当某个仓库将 **多个二进制文件作为按平台分别提供的资产** 发布，而自动检测无法判断你想要哪一个时，就应使用这个选项。

```toml
[tools]
# 当某个发布版本为每个平台提供多个二进制文件（例如 `mytool-cli` 和
# `mytool-server`）时，matching 可以在每个 OS/arch 上选择其一，而无需
# 硬编码一个特定于平台的 asset_pattern。
"forgejo:user/repo" = { version = "latest", matching = "mytool-cli" }
```

工具选项也可以通过命令行使用 `[key=value]` 语法内联传入：

```sh
mise use "forgejo:user/repo[matching=mytool-cli]"
```

`matching` 是区分大小写的子串匹配，因此如果某个值同时也是另一个资产名称的子串（例如当同时发布了 `tool-*` 和 `tool-extras-*` 时，`matching = "tool"`），就无法唯一选中你的二进制文件。需要精确匹配时，请使用带锚点的 [`matching_regex`](#matching_regex)。

如果也设置了 [`asset_pattern`](#asset_pattern)，它将优先生效，而 `matching`/`matching_regex` 会被忽略——`asset_pattern` 会完全替代自动检测，因此不再有可供它们缩小的候选集合。它们会被静默忽略：当设置了 `asset_pattern` 时，`matching_regex` 根本不会被查询，且无效值也不会被报告，因为 mise 不会对被覆盖的选项报错。

### `matching_regex`

类似于 [`matching`](#matching)，但资产名称必须匹配给定的正则表达式。当子字符串不够有选择性时，请使用此项。匹配区分大小写；如需不区分大小写的匹配，请使用内联 `(?i)` 标志。

```toml
[tools]
"forgejo:user/repo" = { version = "latest", matching_regex = "^mytool-cli-" }
```

如果同时设置了 `matching` 和 `matching_regex`，则资产必须同时满足**两者**（逻辑与）才能继续作为候选项。

::: warning
`matching`/`matching_regex` **不**属于安装路径的一部分——它由工具名称（`user/repo` 或 `tool_alias`）和版本作为键。要从同一个发布版本安装两个二进制文件，请为每个文件分别指定一个 [`tool_alias`](/dev-tools/backends/github.html#multiple-assets-from-the-same-release)，这样它们就会获得不同的安装目录；如果对同一个 `forgejo:user/repo` 字符串使用不同的 `matching` 值，它们会解析到同一个目录，而第二次安装会覆盖第一次。
:::

### `version_prefix`

指定一个自定义版本前缀用于发布标签。默认情况下，mise 会处理常见的 `v` 前缀（例如 `v1.0.0`），但某些仓库会使用不同的前缀，比如 `release-`、`version-`，或者根本不使用前缀。

配置 `version_prefix` 后，mise 将会：

- 过滤带有该前缀的可用版本，并去除该前缀
- 在查找发布版本时添加该前缀
- 在安装期间同时尝试带前缀和不带前缀的版本

```toml
[tools]
"forgejo:user/repo" = { version = "latest", version_prefix = "release-" }
```

**示例：**

- 当 `version_prefix = "release-"` 时：
  - 用户指定 `1.0.0` → mise 搜索 `release-1.0.0` 标签
  - 可用版本显示为 `1.0.0`（已去除前缀）
- 当 `version_prefix = ""`（空字符串）时：
  - 用户指定 `1.0.0` → mise 搜索 `1.0.0` 标签（无前缀）
  - 适用于不使用任何前缀的仓库

### `prerelease`

默认情况下，Forgejo 上标记为 `prerelease: true` 的发布会被排除在 `mise ls-remote` 和 `latest` 解析之外。将 `prerelease = true` 设置为包含它们：

```toml
[tools]
"forgejo:user/repo" = { version = "latest", prerelease = true }
```

设置后：

- 预发布标签（例如 `v1.0.0-rc1`、`v0.1.2-dev.86`）会出现在 `mise ls-remote` 中。
- `latest` 会解析为稳定版和预发布版中的最新版本，而不是使用 Forgejo 的 `/repos/{owner}/{repo}/releases/latest` 快捷方式。
- 模糊版本查询（例如 `1.2`）会匹配该前缀下的预发布标签。

草稿发布始终会被排除。

### 按平台区分的资产模式

针对不同平台的资产模式：

```toml
[tools."forgejo:user/repo"]
version = "latest"

[tools."forgejo:user/repo".platforms]
linux-x64 = { asset_pattern = "tool_*_linux_x64.tar.gz" }
macos-arm64 = { asset_pattern = "tool_*_macOS_arm64.tar.gz" }
```

### `checksum`

使用校验和验证已下载的文件：

```toml
[tools."forgejo:owner/repo"]
version = "1.0.0"
asset_pattern = "tool-1.0.0-x64.tar.gz"
checksum = "sha256:a1b2c3d4e5f6789..."
```

_你也可以使用 [mise.lock](/dev-tools/mise-lock) 来管理校验和，而不是在这里指定校验和。_

### 特定平台校验和

```toml
[tools."forgejo:user/repo"]
version = "latest"

[tools."forgejo:user/repo".platforms]
linux-x64 = {
  asset_pattern = "tool_*_linux_x64.tar.gz",
  checksum = "sha256:a1b2c3d4e5f6789...",
}
macos-arm64 = {
  asset_pattern = "tool_*_macOS_arm64.tar.gz",
  checksum = "sha256:b2c3d4e5f6789...",
}
```

### `size`

验证下载的资源大小：

```toml
[tools]
"forgejo:user/repo" = { version = "latest", size = "12345678" }
```

### `strip_components`

解压归档时要剥离的目录层级数：

```toml
[tools]
"forgejo:user/repo" = { version = "latest", strip_components = 1 }
```

::: info
如果未显式设置 `strip_components`，mise 会自动检测何时应用 `strip_components = 1`。当解压后的归档在根级别恰好只包含一个目录且没有文件时，就会发生这种情况。这在像 ripgrep 这类工具中很常见，它们会将二进制文件打包在一个带版本号的目录中（例如，`mytool-14.1.0-x86_64-unknown-linux-musl/mytool`）。这种自动检测可确保二进制文件被直接放置到 mise 预期的安装路径中。
:::

### `bin`

将下载的二进制文件重命名为特定名称。当下载具有平台特定名称的单个二进制文件时，这很有用：

```toml
[tools."forgejo:user/repo"]
version = "2.29.1"
bin = "my-tool"  # 将下载的二进制文件重命名为 my-tool
```

::: info
当下载单个二进制文件（不是压缩包）时，mise 会自动从文件名中移除操作系统/架构后缀。例如，`docker-compose-linux-x86_64` 会自动变为 `docker-compose`。只有在你需要特定的自定义名称时，才使用 `bin` 选项。
:::

### `rename_exe`

在从压缩包中解压后重命名可执行文件。当压缩包中包含一个带有平台特定名称的二进制文件，而你希望将其重命名时，这很有用：

```toml
[tools."forgejo:user/repo"]
version = "latest"
asset_pattern = "tool_linux.zip"
rename_exe = "tool"  # 将解压出的二进制文件重命名为 tool
```

::: tip
对于压缩包中二进制文件的名称与期望名称不同的情况，请使用 `rename_exe`。对于单个二进制文件下载（非压缩包），请使用 `bin`。
:::

### `no_app`

在自动检测期间跳过 macOS .app 捆绑包资源，改为优先选择独立的 CLI 二进制文件。当一个仓库同时提供 macOS .app 捆绑包（通常是 Xcode 扩展或图形界面应用）和独立的命令行工具时，这会很有用：

```toml
[tools."forgejo:user/repo"]
version = "latest"
no_app = true
```

当 `no_app = true` 时：

- 包含 `.app.` 的资源（例如 `Tool.app.zip`、`Tool.for.Xcode.app.zip`）在自动检测期间会被降权
- 会优先选择独立压缩包
- 这主要适用于 macOS 资源的选择；非 macOS 的 `.app.` 资源已经会因平台匹配而被降权
- 仅影响自动检测；显式的 `asset_pattern` 值会按原样使用

### `bin_path`

::: v-pre
指定已解压归档中包含二进制文件的目录，或指定下载文件的存放位置。此选项支持使用 `{{ version }}` 以及 `{{ os() }}` / `{{ arch() }}` 函数进行 Tera 模板化：
:::

```toml
[tools."forgejo:user/repo"]
version = "latest"
bin_path = "tool-{{ version }}/bin" # 展开为 tool-1.0.0/bin
```

两者都接受用于重新映射 mise 将输出的值的关键字参数（`os()` 使用 `linux`、`macos`、`windows`；`arch()` 使用 `x64`、`arm64`），以便处理上游项目使用不同目录名称的情况：

```toml
[tools."forgejo:user/repo"]
version = "latest"
# 展开为 tool-1.0.0-linux-x86_64/bin
bin_path = 'tool-{{ version }}-{{ os() }}-{{ arch(x64="x86_64", arm64="aarch64") }}/bin'
```

::: tip
当模板包含双引号时，请像上面一样使用单引号括起来的 TOML 字符串。
:::

::: v-pre
不存在单独的 `{{ os }}` / `{{ arch }}` 变量，也不存在 `{{ x86_64_arch }}` 形式的别名——要获取这些名称，应使用 `{{ arch(x64="x86_64", arm64="aarch64") }}`。
:::

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果安装路径根目录包含可执行文件，则使用安装路径根目录
4. 如果不存在 `bin/` 目录，则搜索子目录中的 `bin/` 目录
5. 如果未找到任何 `bin/` 目录，则搜索直接子目录中是否有可执行文件。如果在子目录中直接找到可执行文件，则将该整个子目录视为二进制路径。
6. 如果未找到可执行文件，则使用解压目录的根目录

### `filter_bins`

列出要链接到经过筛选的 `.mise-bins` 目录中的二进制文件。当工具附带不希望暴露在 PATH 中的额外二进制文件时，这会很有用。

```toml
[tools]
"forgejo:user/repo" = { version = "latest", filter_bins = "tool" }
"forgejo:user/other-repo" = { version = "latest", filter_bins = ["tool", "helper"] }
```

启用后：

- 会创建一个 `.mise-bins` 子目录，其中只包含指向指定二进制文件的符号链接
- 其他二进制文件（例如 `tool-helper` 或 `tool-server`）不会暴露在 PATH 上

### `api_url`

对于其他 Forgejo 兼容实例或自托管实例，请指定 API URL。mise 会使用此 URL 进行发布列表和发布资产查找，并且在浏览器下载 URL 无法访问或使用自定义/私有实例时，也可能用它来下载资产：

```toml
[tools]
"forgejo:user/repo" = { version = "latest", api_url = "https://forgejo.mycompany.com/api/v1" }
```

## 自托管 Forgejo

如果你正在使用自托管的 Forgejo 实例，请设置 `api_url` 工具选项，并可选择设置 `MISE_FORGEJO_ENTERPRISE_TOKEN` 环境变量进行身份验证：

```sh
export MISE_FORGEJO_ENTERPRISE_TOKEN="your-token"
```

## 支持的 Forgejo 语法

- **Forgejo 最新发布版本的简写：** `forgejo:user/repo`
- **Forgejo 特定发布版本的简写：** `forgejo:user/repo@2.40.1`

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>

<Settings child="forgejo" :level="3" />
