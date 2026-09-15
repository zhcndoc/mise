---
description: "从直接下载 URL 安装二进制文件、脚本和归档文件。"
---

# HTTP 后端

`http` 后端从直接下载 URL 安装二进制文件、脚本或归档文件。当发布者没有受支持的发布后端，或者你托管自己的制品时，可以使用它。优先使用 HTTPS URL，并记录预期校验和。

相关代码位于 mise 仓库的 [`./src/backend/http.rs`](https://github.com/jdx/mise/blob/main/src/backend/http.rs) 中。

## 用法

将示例 URL 替换为适用于你平台的制品，然后在当前项目中安装：

```sh
mise use 'http:my-tool[url=https://example.com/releases/my-tool-v1.0.0.tar.gz]@1.0.0'
mise exec -- my-tool --version
```

这会将 URL 和版本记录到 `mise.toml` 中。添加 `-g` 可安装全局工具：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v1.0.0.tar.gz" }
```

固定 URL 需要具体的版本标签。`latest` 不会从下载 URL 中发现发布版本：添加 [`version_list_url`](/dev-tools/backends/http.html#version-list-url) 以启用 `mise ls-remote` 和自动版本选择。仅更新版本不会改变静态 URL；对于带版本号的制品，请使用 URL 模板。

## 支持的 HTTP 语法

- **带 URL 参数的 HTTP：** `http:my-tool[url=https://example.com/releases/my-tool-v1.0.0.tar.gz]@1.0.0`

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 可用于 `http` 后端——这些内容应放在 `mise.toml` 的 `[tools]` 中。

### `url`（必填）

指定用于下载工具的 HTTP URL。该 URL 支持使用变量进行模板化，例如 `version`、`os()` 和 `arch()`：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v{{version}}.tar.gz" }
```

你也可以使用不带模板的静态 URL：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v1.0.0.tar.gz" }
```

#### 模板变量

URL 中可用以下模板函数（使用双大括号，例如，`version` 会变成 <code v-pre>{{version}}</code>）：

- `version` - 工具版本
- `os()` - 操作系统：`macos`、`linux` 或 `windows`
- `arch()` - 架构：`x64` 或 `arm64`
- `os_family()` - 操作系统家族：`unix` 或 `windows`

`os()` 和 `arch()` 函数支持重映射，适用于使用不同命名约定的工具：

```toml
[tools]
# HashiCorp 工具使用 "darwin" 而不是 "macos"，使用 "amd64" 而不是 "x64"
"http:sentinel" = {
  version = "0.26.3",
  url = 'https://releases.hashicorp.com/sentinel/{{version}}/sentinel_{{version}}_{{os(macos="darwin")}}_{{arch(x64="amd64")}}.zip',
}
```

这会生成如下 URL：

- macOS arm64: `sentinel_0.26.3_darwin_arm64.zip`
- macOS x64: `sentinel_0.26.3_darwin_amd64.zip`
- Linux x64: `sentinel_0.26.3_linux_amd64.zip`

### 平台特定 URL

对于需要按平台分别下载的工具，请使用表格格式：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = { url = "https://example.com/releases/my-tool-v1.0.0-macos-x64.tar.gz" }
macos-arm64 = { url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64.tar.gz" }
linux-x64 = { url = "https://example.com/releases/my-tool-v1.0.0-linux-x64.tar.gz" }
```

::: tip
你可以使用 `macos` 或 `darwin`，以及 `x64` 或 `amd64` 作为平台键。文档和示例中优先使用 `macos` 和 `x64`，但所有变体都被接受。

操作系统/架构值使用 mise 的约定：操作系统使用 `linux`、`macos`、`windows`，架构使用 `x64`、`arm64`。对于平台特定 URL，请使用相应的平台键（例如 `macos-x64`、`linux-arm64`），并为每个平台指定完整 URL。

如果不小心使用了类似 `darwin-aarch64` 的值，mise 会尝试弄清楚你的意图，并照常完成正确的处理。
:::

### `checksum`

从可信来源提供完整的预期摘要值。以下值是占位符，安装前必须替换：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST"
```

_与其在这里指定校验和，不如使用 [mise.lock](/dev-tools/mise-lock) 来管理校验和。_

### 平台特定校验和

将每个占位符替换为对应平台制品的摘要值：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-x64.tar.gz",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
}
macos-arm64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64.tar.gz",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
}
linux-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-linux-x64.tar.gz",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
}
```

### `checksum_url`

已发布的校验和源的 URL。设置后，[`mise lock`](/dev-tools/mise-lock) 会为每个目标平台解析校验和——包括你当前运行平台之外的平台——**而无需下载制品**。这使得单台机器也能生成完整的跨平台锁定文件。

`checksum_url` 是一个模板（支持 <code v-pre>{{ version }}</code>、<code v-pre>{{ os() }}</code> 和 <code v-pre>{{ arch() }}</code>，并且可以通过 `platforms.<key>.checksum_url` 按平台设置）。它可以指向以下任意一种内容：

- 一个**单独的校验和文件**（例如 `<artifact>.sha256`），其中可以只包含哈希值，或 `<hash>  <filename>`；
- 一个类似 **SHASUMS** 的文件，列出多个平台的 `<hash>  <filename>`（该行会根据制品的文件名进行匹配）；
- 一个**清单**（例如 JSON），并配合下面的 `checksum_expr` 使用。

对于单独的校验和文件和 SHASUMS 校验和文件，算法会根据文件名自动检测（`*.sha512`、`SHA512SUMS`、`*.md5`、`*.b3`，默认使用 sha256）。

```toml
# 单独的校验和文件（每个制品一个）
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-{{ version }}-{{ os() }}-{{ arch() }}.tar.gz"
checksum_url = "https://example.com/releases/my-tool-{{ version }}-{{ os() }}-{{ arch() }}.tar.gz.sha256"

# SHASUMS（一个文件列出所有平台）
[tools."http:other-tool"]
version = "1.0.0"
url = 'https://example.com/{{ version }}/other_{{ version }}_{{ os(macos="darwin") }}_{{ arch(x64="amd64") }}.zip'
checksum_url = 'https://example.com/{{ version }}/other_{{ version }}_SHASUMS'
```

### `checksum_expr`

当校验和存在于清单中（而不是普通的校验和文件中）时，使用 `checksum_expr` 来提取它。从 `checksum_url` 获取的清单正文会使用 [expr-lang](https://expr-lang.org) 进行求值。可用的变量有：`body`（原始清单）、`version`、`os`、`arch`、`url`（目标已解析的制品 URL）以及 `filename`。

该表达式必须求值为一个带限定的 `algo:hash` **字符串**（例如 `sha256:<hash>`、`sha512:<hash>`）。请在表达式中构建前缀：如果算法是固定的，就追加一个字面量（`"sha256:" + entry.hash`）；如果算法会变化，就从清单中读取它（`entry.algo + ":" + entry.hash`）。

```toml
[tools."http:my-tool"]
version = "1.10.0"
checksum_url = "https://example.com/versions.json"
# 匹配 url 等于已解析制品 url 的文件，返回 sha256:<hash>
checksum_expr = '"sha256:" + filter(fromJSON(body)[version + ""].files, { #.url == url })[0].sha256'

[tools."http:my-tool".platforms]
linux-x64 = { url = "https://example.com/my-tool-{{ version }}-linux-x86_64.tar.gz" }
macos-arm64 = { url = "https://example.com/my-tool-{{ version }}-macos-arm64.tar.gz" }
```

::: tip expr-lang 注意事项
谓词占位符必须写成 `{ #... }`，并且在 `{` 后面**必须有一个空格**，因为 `{#` 是 Tera 的注释分隔符。要通过运行时值对 map 进行索引，请使用 `[version + ""]` 强制求值——裸写的 `[version]` 会被当作字面量键 `"version"`。
:::

### `size`

检查预期的字节数。这些数字仅用于说明语法；请使用实际的制品大小。大小检查不能替代校验和：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
size = "12345678"
```

### 特定平台大小

你可以为不同平台指定不同的大小：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-x64.tar.gz",
  size = "12345678",
}
macos-arm64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64.tar.gz",
  size = "9876543",
}
linux-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-linux-x64.tar.gz",
  size = "11111111",
}
```

### `strip_components`

提取归档时要剥离的目录组件数：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
strip_components = 1
```

::: info
当 `strip_components` 和 `bin_path` 都未设置时，如果提取后的归档在根级别恰好包含一个目录且不包含文件，mise 会自动应用 `strip_components = 1`。这在 ripgrep 等工具中很常见，它们会将二进制文件打包在带版本号的目录中（例如 `ripgrep-14.1.0-x86_64-unknown-linux-musl/rg`）。自动检测可确保二进制文件直接放置在安装路径中，也就是 mise 预期的位置。
:::

### `bin`

将下载的二进制文件重命名为指定名称。当下载带有平台特定名称的单个二进制文件时，这很有用：

```toml
[tools."http:docker-compose"]
version = "2.29.1"
url = "https://github.com/docker/compose/releases/download/v{{ version }}/docker-compose-linux-x86_64"
bin = "docker-compose"  # 将 docker-compose-linux-x86_64 重命名为 docker-compose
```

::: info
下载单个二进制文件（而不是归档文件）时，mise 会自动从文件名中移除操作系统/架构后缀。例如，`docker-compose-linux-x86_64` 会变成 `docker-compose`。只有在需要特定的自定义名称时，才使用 `bin` 选项。
:::

### `rename_exe`

将已解压归档中的可执行文件重命名为指定名称。当归档中包含带有平台特定名称的二进制文件，或者在安装需要特定命名的 kubectl 插件时，这会非常有用：

```toml
[tools."http:openunison-cli"]
version = "1.0.0"
url = "https://nexus.tremolo.io/repository/openunison-cli/openunison-cli-v{{version}}-linux.zip"
rename_exe = "kubectl-openunison-cli"  # 重命名解压后的二进制文件，用于 kubectl 插件
```

mise 会在解压后的目录中（如果指定了 `bin_path`，则在其中）查找第一个可执行文件，并将其重命名为给定名称。

要从一个归档中重命名**多个**二进制文件，请使用表格形式——每个键都是源文件名（精确文件名或 glob），每个值都是新名称：

```toml
[tools."http:mytool"]
version = "1.0.0"
url = "https://example.com/mytool-v{{version}}-linux.zip"
rename_exe = { "mytool-*" = "mytool", "myhelper-*" = "myhelper" }
```

::: tip
对于重命名单个二进制下载文件，请使用 `bin`；对于重命名归档内的可执行文件，请使用 `rename_exe`。
:::

### `format`

当 URL 缺少文件扩展名或扩展名不正确时，显式指定归档格式：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0"
format = "tar.xz"  # 显式指定格式
```

::: info
如果未指定 `format`，mise 会自动从 HTTP 重定向后的最终 URL 中检测格式；如果检测不到，则回退到配置的 URL。这使得没有扩展名的下载端点可以重定向到 `.tar.gz` 等归档文件。显式指定的 `format` 始终优先，因此当两个 URL 都没有可用的扩展名，或你需要覆盖检测到的格式时，请使用它。
:::

### 平台特定格式

你可以为不同平台指定不同的格式：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-x64",
  format = "tar.xz",
}
linux-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-linux-x64",
  format = "tar.gz",
}
windows-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-windows-x64",
  format = "zip",
}
```

### `version_list_url`

从远程 URL 获取可用版本。这使 `mise ls-remote` 能够列出基于 HTTP 的工具版本：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v{{version}}.tar.gz"
version_list_url = "https://example.com/releases/versions.txt"
```

版本列表 URL 可以返回以下任意格式的数据：

- **纯文本**：单个版本号（例如，`2.0.53`）
- **按行分隔**：每行一个版本
- **字符串的 JSON 数组**：`["1.0.0", "1.1.0", "2.0.0"]`
- **对象的 JSON 数组**：`[{"version": "1.0.0"}, {"tag_name": "v2.0.0"}]`
- **带有 versions 数组的 JSON 对象**：`{"versions": ["1.0.0", "2.0.0"]}`

像 `v` 这样的版本前缀会自动去除。

mise 会保留版本源返回的顺序。默认情况下，版本解析会将最后一个匹配项视为最新版本。如果源以其他顺序返回语义化版本，请设置 `version_order = "semver"`，以便按照语义优先级对 `mise ls-remote` 的结果进行排序并选择版本。完整的排序约定请参阅[版本排序](/dev-tools/#version-ordering)。

例如，GitHub 的 releases API 会按从新到旧的顺序返回发布版本。将其用作 HTTP 版本源时，请启用语义化排序：

```toml
[tools."http:my-tool"]
version = "latest"
version_order = "semver"
url = "https://example.com/my-tool-{{ version }}.tar.gz"
version_list_url = "https://api.github.com/repos/owner/my-tool/releases"
version_json_path = ".[].tag_name"
```

### `version_regex`

使用正则表达式从版本列表 URL 响应中提取版本：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v{{version}}.tar.gz"
version_list_url = "https://example.com/releases/"
version_regex = 'my-tool-v(\d+\.\d+\.\d+)\.tar\.gz'
```

第一个捕获组将用作版本。如果不存在捕获组，则使用整个匹配结果。

### `version_json_path`

使用类似 jq 的路径表达式从 JSON 响应中提取版本：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v{{version}}.tar.gz"
version_list_url = "https://api.example.com/releases"
version_json_path = ".[].tag_name"
```

支持的路径表达式：

- `.` - 根值
- `.[]` - 遍历数组元素
- `.[].field` - 从每个数组元素中提取字段
- `.field` - 从对象中提取字段
- `.field[]` - 遍历字段中的数组
- `.field.subfield` - 嵌套字段访问
- `.data.versions[]` - 复杂的嵌套路径
- `.[?field=value]` - 过滤字段等于某值的数组元素

示例：

```toml
# GitHub releases API 格式
version_json_path = ".[].tag_name"
```

```toml
# Nested versions array
version_json_path = ".data.versions[]"
```

```toml
# Release info objects
version_json_path = ".releases[].info.version"
```

```toml
# Filter for stable releases only (e.g., Flutter)
version_json_path = ".releases[?channel=stable].version"
```

过滤语法 `[?field=value]` 会在提取前过滤 JSON 数组。当 API 返回多个发布渠道（stable、beta、dev），而你只需要其中一个时，这一语法非常有用。

### `version_expr`

使用 [expr-lang](https://expr-lang.org/) 表达式提取版本。这是处理复杂版本提取时最灵活的选项：

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/versions.txt"
version_expr = 'split(body, "\n")'
```

该表达式会接收 HTTP 响应正文作为 `body` 变量，并应返回一个版本字符串数组。它还会接收 `versions`，其中包含已由 `version_regex` 或 `version_json_path` 提取的值；如果之前没有提取器生成值，则该变量为空。

示例表达式：

```toml
# 按换行符分割版本
version_expr = 'split(body, "\n")'
```

```toml
# Split and filter empty lines
version_expr = 'filter(split(body, "\n"), # != "")'
```

```toml
# Parse JSON and extract object keys (useful for HashiCorp-style JSON)
# e.g., {"versions": {"1.0.0": {}, "2.0.0": {}}}
version_expr = 'keys(fromJSON(body).versions)'
```

```toml
# Sort versions with mise's version-aware comparator
version_expr = 'fromJSON(body) | map({ trimPrefix(#.tag_name, "v") }) | sortVersions()'
```

[expr-lang](https://expr-lang.org/) 库提供了包括以下内容在内的内置函数：

- **`fromJSON(string)`**：将 JSON 字符串解析为值
- **`toJSON(value)`**：将值转换为 JSON 字符串
- **`keys(map)`**：获取对象/map 的键并以数组形式返回
- **`values(map)`**：获取对象/map 的值并以数组形式返回
- **`len(value)`**：获取字符串、数组或 map 的长度
- **`filter(array, predicate)`** 和 **`map(array, predicate)`**：过滤或转换数组值
- **`sort(array)`** 和 **`reverse(array)`**：按字典顺序重新排列值
- **`int(value)`**、**`float(value)`** 和 **`string(value)`**：转换兼容的值

mise 添加了用于按版本排序的 **`sortVersions(array)`**。如果发现的版本遵循语义化版本规范，优先使用 `version_order = "semver"`；当表达式本身需要一个已排序的中间值时，请使用 `sortVersions()`。

::: tip
`version_expr` 是最后的提取步骤，因此其结果会成为版本列表。使用 `versions` 变量可以对 `version_regex` 或 `version_json_path` 生成的值进行后处理。
:::

### `bin_path`

使用相对于提取后安装根目录的路径。设置 `bin_path` 会禁用自动根目录剥离。对于形如 `my-tool-1.0.0/bin/my-tool` 的归档，可以像下面这样显式剥离外层目录，或者保留外层目录并使用 `bin_path = "my-tool-{{ version }}/bin"`。

指定提取后归档中包含二进制文件的目录，或指定放置下载文件的位置。该选项支持使用 <code v-pre>{{version}}</code> 进行模板化：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
strip_components = 1
bin_path = "bin"
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果不存在 `bin/` 目录，则在子目录中搜索 `bin/` 目录
4. 如果未找到任何 `bin/` 目录，则使用解压目录的根目录。

### `shared_extraction`

默认情况下，每个 HTTP 安装都包含自己独立的提取文件。设置 `shared_extraction = true` 后，具有相同制品和提取选项的普通用户安装可以共享提取内容：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
shared_extraction = true
```

当多个工具使用同一制品时，共享可以节省磁盘空间并避免重复提取。仍可能需要下载文件来识别其内容。对共享文件所做的更改（包括由 `postinstall` 钩子进行的更改）会影响使用该条目的每个安装。

即使启用了此选项，显式的 `mise install --system`、`mise install --shared` 和 `mise install-into` 目标也始终包含自己的文件。

## 安装和清理

新的 HTTP 安装会像其他工具一样，直接在安装目录中包含其文件。`mise uninstall` 和 `mise prune` 移除版本时会删除这些文件。同一制品的多个安装各自拥有独立副本。

链接到 `http-tarballs` 的现有安装会继续工作。要将其替换为独立安装，请在不使用 `shared_extraction = true` 的情况下，使用 `mise install --force <tool>` 重新安装。仅更改该选项不会替换已经安装的版本。

::: warning 共享提取存储
旧版安装以及使用 `shared_extraction = true` 的工具依赖 `$MISE_DATA_DIR/http-tarballs/` 中的文件。卸载工具后，`mise prune` 和 `mise cache prune` 都不会自动回收这些条目。重新安装也会保留现有条目，因为其他安装可能正在使用它们。只要仍有安装依赖此目录，就不要删除它。
:::

## 缓存行为

### 缓存位置

使用 `shared_extraction = true` 时，提取后的文件会存储在 `$MISE_DATA_DIR/http-tarballs/` 中，而不是分别存储在每个安装目录中：

- **Linux**：`~/.local/share/mise/http-tarballs/`
- **macOS**：`~/.local/share/mise/http-tarballs/`

### 缓存键生成

缓存键根据文件内容派生，因此相同的下载内容可以在不同工具之间共享：

1. **文件内容**：mise 会计算下载文件的 Blake3 哈希，该计算独立于预期的验证校验和。
2. **提取选项**：会改变提取结果的选项也会影响缓存键，包括原始文件和压缩二进制文件的有效文件名、根目录剥离、重命名，以及相关的格式或启动器选项。

示例缓存目录结构：

```
~/.local/share/mise/http-tarballs/
├── 71f774faa03daf1a58cc3339f8c73e6557348c8e0a2f3fb8148cc26e26bad83f/
│   ├── bin/my-tool
│   └── metadata.json
└── 1c2af379bdf1fed266bc44b49271e2df5b0dafae09f1cc744b3505ec50c84719_strip_1/
    ├── my-tool
    └── metadata.json
```

### 符号链接安装

选择共享的安装会链接到缓存的提取内容：

```bash
~/.local/share/mise/installs/http-my-tool/1.0.0 → ~/.local/share/mise/http-tarballs/71f774...
```

对于设置了 `bin_path` 的原始文件，链接位于安装目录内。对于这种布局，Windows 会复制文件，而不是创建符号链接。

### 缓存元数据

每个缓存条目都包含一个 `metadata.json` 文件，其中包含有关缓存内容的信息：

```json
{
  "url": "https://example.com/releases/my-tool-v1.0.0.tar.gz",
  "checksum": "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
  "size": 1024000,
  "extracted_at": 1703001234,
  "platform": "macos-arm64"
}
```

### 缓存管理

共享提取存储有意位于 `MISE_CACHE_DIR` 之外，因此 `mise cache clear` 不会删除已安装符号链接仍在引用的内容。

默认安装以及显式的 system、shared 和 install-into 目标不会创建持久的 HTTP 提取条目。
