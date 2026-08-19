# HTTP 后端

您可以使用 `http` 后端直接从 HTTP URL 安装工具。此后端会从任何 HTTP/HTTPS URL 下载文件，非常适合通过直接下载链接分发预构建二进制文件或归档文件的工具。

这部分代码位于 mise 仓库中的 [`./src/backend/http.rs`](https://github.com/jdx/mise/blob/main/src/backend/http.rs)。

## 用法

以下命令从直接的 HTTP URL 安装一个工具：

```sh
mise use -g http:my-tool[url=https://example.com/releases/my-tool-v1.0.0.tar.gz]@1.0.0
```

版本将以以下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v1.0.0.tar.gz" }
```

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
  version = "latest",
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

如果你弄错了并使用了类似 `darwin-aarch64` 这样的值，mise 会尝试推断你的意思，并照样正确处理。
:::

### `checksum`

使用校验和验证下载的文件：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
checksum = "sha256:a1b2c3d4e5f6789..."
```

_与其在这里指定校验和，不如使用 [mise.lock](/dev-tools/mise-lock) 来管理校验和。_

### 平台特定校验和

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-x64.tar.gz",
  checksum = "sha256:a1b2c3d4e5f6789...",
}
macos-arm64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64.tar.gz",
  checksum = "sha256:b2c3d4e5f6789...",
}
linux-x64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-linux-x64.tar.gz",
  checksum = "sha256:c3d4e5f6789...",
}
```

### `checksum_url`

已发布的校验和源的 URL。设置后，[`mise lock`](/dev-tools/mise-lock) 会为每个目标平台解析校验和——包括你当前运行平台之外的平台——**而无需下载制品**。这使得单台机器也能生成完整的跨平台锁定文件。

`checksum_url` 是一个模板（支持 <code v-pre>{{ version }}</code>、<code v-pre>{{ os() }}</code>、<code v-pre>{{ arch() }}</code>，并且可通过 `platforms.<key>.checksum_url` 针对不同平台进行设置）。它可以指向以下任意一种：

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

验证下载文件的大小：

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
如果未显式设置 `strip_components`，mise 将自动检测何时应用 `strip_components = 1`。当解压后的归档在根级别恰好只包含一个目录且没有文件时，就会发生这种情况。这在像 ripgrep 这样的工具中很常见，它们会将二进制文件打包在一个带版本号的目录中（例如，`ripgrep-14.1.0-x86_64-unknown-linux-musl/rg`）。自动检测可确保二进制文件直接放置在 mise 预期的安装路径中。
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
当下载单个二进制文件（而不是压缩包）时，mise 会自动从文件名中移除操作系统/架构后缀。例如，`docker-compose-linux-x86_64` 会自动变为 `docker-compose`。只有在你需要特定的自定义名称时才使用 `bin` 选项。
:::

### `rename_exe`

将已解压归档中的可执行文件重命名为指定名称。当归档中包含带有平台特定名称的二进制文件，或者在安装需要特定命名的 kubectl 插件时，这会非常有用：

```toml
[tools."http:openunison-cli"]
version = "1.0.0"
url = "https://nexus.tremolo.io/repository/openunison-cli/openunison-cli-v{{version}}-linux.zip"
rename_exe = "kubectl-openunison-cli"  # 重命名解压后的二进制文件，用于 kubectl 插件
```

其工作方式是：在解压后的目录中（如果指定了 `bin_path`，则在其中）查找第一个可执行文件，并将其重命名为指定名称。

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

从远程 URL 获取可用版本。这使得 `mise ls-remote` 能够列出基于 HTTP 的工具可用版本：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v{{version}}.tar.gz"
version_list_url = "https://example.com/releases/versions.txt"
```

版本列表 URL 可以返回多种格式的数据：

- **纯文本**：单个版本号（例如，`2.0.53`）
- **按行分隔**：每行一个版本
- **字符串的 JSON 数组**：`["1.0.0", "1.1.0", "2.0.0"]`
- **对象的 JSON 数组**：`[{"version": "1.0.0"}, {"tag_name": "v2.0.0"}]`
- **带有 versions 数组的 JSON 对象**：`{"versions": ["1.0.0", "2.0.0"]}`

像 `v` 这样的版本前缀会自动去除。

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

# 嵌套的 versions 数组
version_json_path = ".data.versions[]"

# Release 信息对象
version_json_path = ".releases[].info.version"

# 仅过滤稳定版发布（例如 Flutter）
version_json_path = ".releases[?channel=stable].version"
```

过滤语法 `[?field=value]` 允许在提取前过滤 JSON 数组。这对于返回多个发布通道（stable、beta、dev）并且你只想要特定通道的 API 很有用。

### `version_expr`

使用 [expr-lang](https://expr-lang.org/) 表达式提取版本。这为复杂的版本提取逻辑提供了最大的灵活性：

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/versions.txt"
version_expr = 'split(body, "\n")'
```

该表达式接收 HTTP 响应正文作为 `body` 变量，并应返回一个版本字符串数组。

示例表达式：

```toml
# 按换行符分割版本
version_expr = 'split(body, "\n")'

# 分割并过滤空行
version_expr = 'filter(split(body, "\n"), # != "")'

# 解析 JSON 并提取对象键（适用于 HashiCorp 风格的 JSON）
# 例如，{"versions": {"1.0.0": {}, "2.0.0": {}}}
version_expr = 'keys(fromJSON(body).versions)'
```

[expr-lang](https://expr-lang.org/) 库提供了内置函数，包括：

- **`fromJSON(string)`**：将 JSON 字符串解析为一个值
- **`toJSON(value)`**：将一个值转换为 JSON 字符串
- **`keys(map)`**：获取对象/映射的键，并作为数组返回
- **`values(map)`**：获取对象/映射的值，并作为数组返回
- **`len(value)`**：获取字符串、数组或映射的长度

::: tip
如果同时指定了多个选项，`version_expr` 的优先级高于 `version_regex` 和 `version_json_path`。当其他选项不足以满足你的使用场景时，请使用它。
:::

### `bin_path`

指定解压后的归档中包含二进制文件的目录，或下载文件的放置位置。此项支持使用 <code v-pre>{{version}}</code> 进行模板化：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
bin_path = "my-tool-{{version}}/bin" # 展开为 my-tool-1.0.0/bin
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
3. 如果不存在 `bin/` 目录，则在子目录中搜索 `bin/` 目录
4. 如果未找到任何 `bin/` 目录，则使用解压目录的根目录。

## 缓存行为

HTTP 后端实现了一个智能缓存系统，以优化磁盘使用和安装速度：

### 缓存位置

对于普通用户安装，下载和解压的文件会缓存在 `$MISE_DATA_DIR/http-tarballs/` 中，而不是为每个工具安装单独存储。默认位置：

- **Linux**：`~/.local/share/mise/http-tarballs/`
- **macOS**：`~/.local/share/mise/http-tarballs/`

显式使用 `mise install --system`、`mise install --shared` 和 `mise install-into` 的安装会直接解压到目标位置。它们不会使用此持久化解压缓存，因此生成的安装是自包含的，不会链接到安装用户的主目录。

### 缓存键生成

缓存键根据文件内容生成，以确保相同的下载在各工具之间共享：

1. **文件内容的 Blake3 哈希**：当未提供校验和时，mise 会计算下载文件的 Blake3 哈希
2. **解压选项**：`strip_components` 会包含在缓存键中，因为它会影响解压后的结构

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

普通用户安装是指向缓存解压内容的符号链接：

```bash
~/.local/share/mise/installs/http-my-tool/1.0.0 → ~/.local/share/mise/http-tarballs/71f774...
```

这种方式带来了几个好处：

- **节省空间**：普通用户安装会在各工具之间共享相同的 tarball
- **安装更快**：命中缓存后无需重新下载和解压文件
- **一致性**：相同的文件内容始终使用相同的缓存条目

系统、共享和 install-into 目标位置包含真实文件，而不是这些符号链接。这样可以避免卸载后留下隐藏的缓存条目，并使共享安装不依赖于特定用户的数据目录。

### 缓存元数据

每个缓存条目都包含一个 `metadata.json` 文件，其中包含有关缓存内容的信息：

```json
{
  "url": "https://example.com/releases/my-tool-v1.0.0.tar.gz",
  "checksum": "sha256:a1b2c3d4e5f6789...",
  "size": 1024000,
  "extracted_at": 1703001234,
  "platform": "macos-arm64"
}
```

### 缓存管理

普通 HTTP 安装会将缓存存储在 `$MISE_DATA_DIR/http-tarballs/` 中。它有意位于 `MISE_CACHE_DIR` 之外，因此 `mise cache clear` 不会删除仍被已安装符号链接引用的内容。

系统、共享和 install-into 目标位置不会创建持久化的 HTTP 解压缓存。
