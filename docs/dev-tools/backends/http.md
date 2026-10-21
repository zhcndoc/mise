---
description: "从 URL 安装二进制文件、脚本或归档，支持 URL 模板、版本列表和校验和。"
---

# http 后端

`http` 后端可从下载 URL 安装二进制文件、脚本或归档。工具没有专用发行版后端，或
制品由你自行托管时，可以使用它。[s3 后端](/dev-tools/backends/s3.html)也支持相同的
下载、验证和解压选项。

<a id="usage"></a>

## 用法

将示例 URL 替换为适用于你平台的制品，然后在当前项目中安装：

```sh
mise use 'http:my-tool[url=https://example.com/releases/my-tool-v1.0.0.tar.gz]@1.0.0'
mise exec -- my-tool --version
```

请给参数加上引号，避免 Shell 展开方括号。此命令会将 URL 和版本写入
`mise.toml`。添加 `-g` 可将工具设为全局工具。

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v1.0.0.tar.gz" }
```

`http:` 后的名称由你决定，同时也是工具名称和安装目录名称。请使用 `https://` URL，
并通过锁文件或[校验和](#verification)固定制品。

::: v-pre
使用固定 URL 时，版本号只是标签；修改版本号不会改变下载内容。若要跟随上游发行版，
请在 URL 中加入 `{{ version }}`（参见[URL 模板](#template-variables)）。mise 无法
从下载 URL 中发现版本，因此只有同时设置
[`version_list_url`](#version-list-url)，`latest` 和 `mise ls-remote` 才能使用。
:::

## URL 模板 {#template-variables}

### `url` {#url-required}

下载 URL，支持 `https://`、`http://` 或 `file://`。可以在顶层设置，也可以按平台设置
`platforms.<os>-<arch>.url`；工具必须配置其中一项。URL 支持 [Tera 模板](/templates.html)，
变量要写在双花括号中：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz" }
```

::: v-pre

- `{{ version }}`：正在安装的版本
- `{{ os() }}`：`linux`、`macos` 或 `windows`
- `{{ arch() }}`：`x64` 或 `arm64`
- `{{ os_family() }}`：`unix` 或 `windows`
- `{{ libc() }}`：`gnu` 或 `musl`
- `{{ avx2() }}`：`yes` 或 `no`

:::

对于使用其他平台名称的项目，可以给 `os()`、`arch()`、`libc()` 和 `avx2()` 传入关键字参数，
为值指定别名。例如，HashiCorp 将 macOS 称为 `darwin`，将 x64 称为 `amd64`：

```toml
[tools]
"http:sentinel" = {
  version = "0.26.3",
  url = 'https://releases.hashicorp.com/sentinel/{{ version }}/sentinel_{{ version }}_{{ os(macos="darwin") }}_{{ arch(x64="amd64") }}.zip',
}
```

在 macOS arm64 上，这会下载 `sentinel_0.26.3_darwin_arm64.zip`；在 macOS x64 上下载
`sentinel_0.26.3_darwin_amd64.zip`；在 Linux x64 上下载
`sentinel_0.26.3_linux_amd64.zip`。像此例一样，当模板中包含双引号时，请使用单引号
括起 TOML 字符串。

::: v-pre
单花括号占位符 `{version}` 已弃用：mise 从 2026.3.0 起发出警告，并将于 2027.3.0
停止接受此写法。请改用 `{{ version }}`。
:::

### 本地文件 {#local-files}

`file://` URL 可安装磁盘上已有的归档，例如在网络受限时手动下载的文件。mise 会复制
该文件而非重新下载，之后仍会按相同流程验证、解压并创建链接。添加 `checksum` 也能
验证本地文件：

```toml
[tools]
"http:my-tool" = { version = "1.0.0", url = "file:///opt/archives/my-tool-v1.0.0-linux-x64.tar.gz", checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST" }
```

`mise.lock` 会按原样记录 URL，因此引用本地路径的锁文件只能在该路径存在相应文件的机器上使用。

## 按平台下载 {#platform-specific-urls}

如果不同平台需要下载不同文件，请在 `platforms.<os>-<arch>` 下分别设置 URL：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = { url = "https://example.com/releases/my-tool-v1.0.0-macos-x64.tar.gz" }
macos-arm64 = { url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64.tar.gz" }
linux-x64 = { url = "https://example.com/releases/my-tool-v1.0.0-linux-x64.tar.gz" }
```

平台键的格式为 `<os>-<arch>`，使用 mise 的平台名称：操作系统为 `linux`、`macos` 或
`windows`，架构为 `x64` 或 `arm64`。mise 也接受 `darwin`、`amd64`、`x86_64` 和
`aarch64` 等别名，因此 `darwin-aarch64` 表示 `macos-arm64`。如果当前平台未配置 URL，
安装会失败，并列出已配置 URL 的平台。

其他下载选项也可以按平台设置，例如 `checksum`、
`checksum_url`, `size`, `headers`, `format`, `strip_components`, `bin_path`,
`bin`、`rename_exe` 和 `windows_script_interpreter`。平台级设置会覆盖顶层设置：

```toml
[tools."http:my-tool".platforms]
macos-arm64 = {
  url = "https://example.com/releases/my-tool-v1.0.0-macos-arm64",
  checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST",
  format = "tar.xz",
}
```

## 发现版本

设置 `version_list_url` 后，`mise ls-remote`、`latest` 和版本前缀才能发现可用版本。
mise 会保留列表中的顺序，并将最后一项视为最新版本。除非工具设置
`prerelease = true`，否则 `2.0.0-rc1` 这类预发行版本会被忽略。

### `version_list_url` {#version-list-url}

返回版本列表的 URL。请求会使用该工具的
[`headers`](#headers).

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/releases/versions.txt"
```

如果未设置 [`version_regex`](#version-regex) 或
[`version_json_path`](#version-json-path)，mise 会读取以下格式，并从每个版本号开头移除 `v`：

- 纯文本，每行一个版本；空行和以 `#` 开头的行会被跳过
- 字符串 JSON 数组：`["1.0.0", "1.1.0", "2.0.0"]`
- 对象 JSON 数组，每个对象包含 `version`、`tag_name`、`name`、`tag` 或 `v` 字段：
  `[{"version": "1.0.0"}, {"tag_name": "v2.0.0"}]`
- 包含 `versions`、`releases` 或 `tags` 数组的 JSON 对象：
  `{"versions": ["1.0.0", "2.0.0"]}`

如果发行版托管在 GitHub，请改用 [github 后端](/dev-tools/backends/github.html)。

### `version_regex` {#version-regex}

从响应中提取版本的正则表达式，例如从 HTML 索引页中提取。mise 使用第一个捕获组；
如果没有捕获组，则使用整个匹配结果：

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/releases/"
version_regex = 'my-tool-v(\d+\.\d+\.\d+)\.tar\.gz'
```

如果同时设置了 `version_json_path`，mise 会使用 JSON 路径并忽略正则表达式。

### `version_json_path` {#version-json-path}

用于从 JSON 响应中提取版本的 jq 风格路径：

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/api/releases"
version_json_path = ".[].tag_name"
```

| 路径              | 选取的值                                      |
| ----------------- | --------------------------------------------- |
| `.`               | 根值                                          |
| `.[]`             | 数组中的每个元素                              |
| `.[].field`       | 数组每个元素中的指定字段                      |
| `.field`          | 对象中的指定字段                              |
| `.field[]`        | 字段数组中的每个元素                          |
| `.field.subfield` | 嵌套字段，例如 `.data.versions[]`             |
| `.[?field=value]` | 字段值与指定值相等的数组元素                  |

API 如果返回多个发布渠道，筛选器可以只保留其中一个，例如 Flutter 的稳定版：

<!-- schema: skip -->

```toml
version_json_path = ".releases[?channel=stable].version"
```

### `version_expr` {#version-expr}

当正则表达式或 JSON 路径无法表达版本提取规则时，可以使用
[expr-lang](https://expr-lang.org/) 表达式。响应会作为 `body` 传入，`version_regex` 或
`version_json_path` 提取出的值会作为 `versions` 传入。表达式须返回一个字符串数组，
结果会成为版本列表。

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/versions.txt"
version_expr = 'filter(split(body, "\n"), # != "")'
```

其他示例：

<!-- schema: skip -->

```toml
# 获取 JSON 对象的键，例如 {"versions": {"1.0.0": {}, "2.0.0": {}}}
version_expr = 'keys(fromJSON(body).versions)'
```

<!-- schema: skip -->

```toml
# 使用 mise 的版本比较器排序
version_expr = 'fromJSON(body) | map({ trimPrefix(#.tag_name, "v") }) | sortVersions()'
```

所有 [expr-lang 内置函数](https://expr-lang.org/docs/language-definition)都可用，例如
`fromJSON`、`keys`、`filter`、`map` 和 `split`。mise 另提供 `sortVersions(array)`，
用于按版本规则排序。版本遵循语义化版本规范时，优先使用
[`version_order = "semver"`](#version-order)；如果表达式中途需要已排序的值，则使用
`sortVersions()`。

### `version_date_expr` 和 `version_date_url` {#version-date-expr}

没有发布日期的版本列表无法应用[`minimum_release_age`](/configuration/settings.html#minimum_release_age)：没有发布日期的版本不会受到冷却期限制。上游提供日期时，可用 `version_date_expr` 读取。它是一个 [expr-lang](https://expr-lang.org/) 表达式，接收 `body`（`version_list_url` 的响应）、`bodies`（见下文）和 `versions`（由 `version_expr` 生成的列表），并返回 `[version, date]` 配对列表或版本到日期的映射表。日期可以是 RFC 3339 时间戳、HTTP 日期（例如 `Last-Modified` 的值）或 `YYYY-MM-DD` 日期；其他格式会被 mise 跳过并发出警告。

```toml
[tools."http:my-tool"]
version = "latest"
url = "https://example.com/releases/my-tool-v{{ version }}.tar.gz"
version_list_url = "https://example.com/releases.json"
version_expr = 'map(fromJSON(body).releases, { #.version })'
version_date_expr = 'map(fromJSON(body).releases, { [#.version, #.published_at] })'
```

表达式未列出的版本仍视为无日期版本；表达式返回但不在版本列表中的版本会被忽略。表达式格式错误会导致版本列表获取失败。

日期与版本列表分开提供时，请设置 `version_date_url`。此时 `body` 是日期接口的响应，而不是版本列表的响应。上游列表采用分页时，还需设置 `version_date_next_expr`。该表达式会将每页内容作为 `body`、页面地址作为 `url`，并返回下一页地址；最后一页后返回 `nil`。`bodies` 按顺序保存所有页面。由于每次请求都会发送 `headers`，下一页必须位于同一主机；mise 最多读取 100 页。

<!-- schema: skip -->

```toml
# GCS object listing: 1000 objects a page, with a token for the next one
version_date_url = "https://storage.googleapis.com/storage/v1/b/my-bucket/o?prefix=releases/"
version_date_next_expr = 'fromJSON(body).nextPageToken != nil ? split(url, "&pageToken=")[0] + "&pageToken=" + fromJSON(body).nextPageToken : nil'
version_date_expr = 'map(flatten(map(bodies, { fromJSON(#).items })), { [split(#.name, "/")[1], #.timeCreated] })'
```

`version_date_url` 和 `version_date_next_expr` 都必须与 `version_date_expr` 一起使用，三者发出的请求都会携带与 `version_list_url` 相同的 `headers`。

### `version_order` {#version-order}

许多 JSON 索引按从新到旧的顺序列出版本，因此列表末项，也就是 `latest`，反而是最旧版本。
设置 `version_order = "semver"` 后，mise 会按语义化版本的优先级排序：

```toml
[tools."http:my-tool"]
version = "latest"
version_order = "semver"
url = "https://example.com/my-tool-{{ version }}.tar.gz"
version_list_url = "https://example.com/my-tool/releases.json"
version_json_path = ".[].version"
```

另见[版本排序](/dev-tools/versions.html#version-ordering)。

## 验证

启用[锁文件](/dev-tools/mise-lock.html)后，mise 会在首次安装时记录校验和与文件大小，
并在之后每次安装时检查。即使不使用锁文件，也可以通过 `checksum` 和 `size` 固定这些值；
`checksum_url` 则让 `mise lock` 记录所有平台已发布的校验和。

### `checksum`

下载内容的预期摘要，格式为 `<algorithm>:<hash>`；算法可以是 `sha256`、`sha512` 或
`blake3`。请从可信来源获取：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
checksum = "sha256:REPLACE_WITH_THE_64_HEX_DIGIT_DIGEST"
```

一个校验和对应一个制品，因此不同平台下载不同文件时，请[按平台](#platform-specific-urls)
分别设置校验和。

### `checksum_url` {#checksum-url}

已发布校验和文件的 URL。配置后，[`mise lock`](/dev-tools/mise-lock.html) 无需下载制品，
就能记录所有目标平台（包括当前机器未运行的平台）的校验和。因此，可以在一台机器上
生成完整的跨平台锁文件。

::: v-pre
`checksum_url` 与 `url` 一样支持模板，也可以按平台分别设置。它可以指向单个校验和文件，
例如 `<artifact>.sha256`；文件内容可以只有哈希值，也可以是 `<hash>  <filename>`。
它也可以指向每个平台各含一行 `<hash>  <filename>` 的 `SHASUMS` 文件，mise 会据此
匹配制品文件名；还可以指向 JSON 等清单，再通过 [`checksum_expr`](#checksum-expr) 解析。
对于校验和文件，mise 会从文件名推断算法（`*.sha512`、`SHA512SUMS`、`*.md5`、`*.b3`）；
无法推断时则使用 sha256。
:::

```toml
# 每个制品对应一个校验和文件
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

### `checksum_expr` {#checksum-expr}

通过 [expr-lang](https://expr-lang.org) 表达式，从 `checksum_url` 获取的清单中提取校验和。
表达式可使用 `body`（清单内容）、`version`、`os`、`arch`、`url`（目标平台的制品 URL）
和 `filename`。它必须返回 `<algorithm>:<hash>` 字符串，因此需在表达式中构造前缀：
算法固定时可直接添加字面值（`"sha256:" + entry.hash`）；算法不固定时则从清单读取
（`entry.algo + ":" + entry.hash`）。

```toml
[tools."http:my-tool"]
version = "1.10.0"
checksum_url = "https://example.com/versions.json"
# 找出 URL 与制品 URL 相同的文件，并返回 sha256:<hash>
checksum_expr = '"sha256:" + filter(fromJSON(body)[version + ""].files, { #.url == url })[0].sha256'

[tools."http:my-tool".platforms]
linux-x64 = { url = "https://example.com/my-tool-{{ version }}-linux-x86_64.tar.gz" }
macos-arm64 = { url = "https://example.com/my-tool-{{ version }}-macos-arm64.tar.gz" }
```

::: tip expr-lang 注意事项
谓词应写成 `{ #... }`，即 `{` 后要有空格，因为 `{#` 会被识别为 Tera 注释。若要使用
运行时才确定的值作为映射键，请用 `[version + ""]` 强制求值；单独写 `[version]` 会被
当成字面键 `"version"`。
:::

### `size`

下载文件的预期大小，单位为字节。实际大小不符时，安装会失败。此设置可以发现下载截断，
但不能替代校验和。

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
size = "12345678"
```

## 身份验证

若要使用 HTTP Basic 身份验证，请将主机添加到 netrc 文件；参见
[`netrc`](/configuration/settings.html#netrc) 设置。令牌或 API 密钥则通过 `headers` 配置。

### `headers`

下载请求，以及 [`version_list_url`](#version-list-url) 和
[`checksum_url`](#checksum-url) 请求所需的额外标头。服务器要求 Bearer 令牌
（例如 `ghcr.io` 上的 OCI blob）或 API 密钥标头
（例如 Artifactory）时可使用此选项。标头值支持模板，因此可以从环境变量中读取密钥：

```toml
[tools."http:polaris"]
version = "0.9.2"
# ghcr.io 接受经过 Base64 编码的 GitHub 令牌作为 Bearer 令牌
headers = { Authorization = "Bearer {{ env.GHCR_TOKEN | b64_encode }}" }

[tools."http:polaris".platforms]
linux-x64 = { url = "https://ghcr.io/v2/acme/polaris/blobs/sha256:...", format = "tar.gz" }
macos-arm64 = { url = "https://ghcr.io/v2/acme/polaris/blobs/sha256:...", format = "tar.gz" }
```

mise 会在调试输出中隐藏标头值；标头设置不会改变工具的安装位置。`headers` 中的条目会
替换 mise 原本可能发送到同一主机的令牌。

mise 只会向 `url` 中的主机发送标头。如果服务器重定向到其他主机、端口或协议，mise 会在
重定向链的后续请求中移除所有标头；GHCR 的签名 blob URL 需要这种行为。同源重定向则会
保留标头。

### `headers_forward` {#headers-forward}

指定各个标头在重定向时还可以发送到哪些主机。当服务器跳转到另一个也需要该凭据的主机
（例如 CDN）时，可使用此选项。未列出的标头绝不会转发，因此每个密钥只会发送到为它
指定的主机：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://releases.example.com/my-tool-{{ version }}.tar.gz"
headers = { X-Api-Key = "{{ env.RELEASES_KEY }}", Authorization = "Bearer {{ env.RELEASES_TOKEN }}" }
headers_forward = { X-Api-Key = ["cdn.example.com", "*.assets.example.com"] }
```

此例中，`X-Api-Key` 也会发送到 `cdn.example.com` 和 `assets.example.com` 的任意子域名，
而 `Authorization` 只会发送到 `releases.example.com`。

- 每个值可以是单个主机，也可以是主机列表：可以填写完整主机名，也可以使用 `*.` 和
  子域名后缀（`*.example.com` 会匹配 `a.example.com`，但不匹配 `example.com`）。不接受
  单独的 `*`，也不接受端口。
- 转发时不会从 HTTPS 降级到普通 HTTP。如果 URL 本身就是 `http://`，整条重定向链可以继续使用 HTTP。
- 标头在某一跳被移除后，后续跳转不会恢复它，即使目标主机已列入允许列表也一样。
- 每个名称都必须同时出现在 `headers` 中；拼写错误会报错，而不会被静默忽略。

## 解压并命名可执行文件

### `format`

归档格式，例如 `tar.gz`、`tar.xz` 或 `zip`。未设置时，mise 会先根据重定向后的最终 URL
判断格式，再根据配置的 URL 判断。因此，即使下载地址本身没有扩展名，只要它重定向到
`.tar.gz` 文件，仍然可以正常识别。如果两个 URL 都没有可用扩展名，或你要覆盖自动识别
的格式，请设置此选项：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0"
format = "tar.xz"
```

### `strip_components` {#strip-components}

解压归档时要移除的开头目录层数：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
strip_components = 1
```

未设置 `strip_components` 和 `bin_path` 时，如果归档只含一个顶层目录且不含文件，mise
会自动移除一层目录。ripgrep 归档就是这种结构：
`ripgrep-14.1.1-x86_64-unknown-linux-musl/rg`。

### `bin_path` {#bin-path}

相对于安装目录的路径，指定可执行文件所在目录，或 mise 放置单个下载文件的位置。此值支持
模板；设置后会关闭自动移除目录层级的功能。

::: v-pre
如果归档的目录结构为 `my-tool-1.0.0/bin/my-tool`，可以像下方示例那样移除最外层目录；
也可以通过 `bin_path = "my-tool-{{ version }}/bin"` 保留该目录。
:::

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
strip_components = 1
bin_path = "bin"
```

未设置 `bin_path` 时，如果安装目录中存在 `bin/`，mise 会将它加入 `PATH`；否则会加入
每个直属子目录中存在的 `bin/`；如果这些目录都不存在，则将安装目录本身加入 `PATH`。

### `bin`

为下载的单个文件指定名称，无论文件是原始格式还是 `.gz`、`.xz` 等压缩格式。名称可以
包含目录，例如 `bin/my-tool`。mise 会自动从单文件下载名称中移除操作系统和架构后缀，
因此无需额外设置，`docker-compose-linux-x86_64` 就会以 `docker-compose` 的名称安装。
对于归档，http 后端会忽略 `bin`；请改用 [`rename_exe`](#rename-exe)。

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/{{ version }}/my-tool-linux-x86_64"
bin = "mt" # 将文件安装为 mt，而不是 my-tool
```

### `rename_exe` {#rename-exe}

在归档解压后重命名可执行文件，例如将 kubectl 插件改成 kubectl 所需的名称。使用字符串
形式时，会重命名工具的主可执行文件：优先选择与工具同名的文件，其次选择名称包含工具名的
文件，最后选择 mise 在 `bin_path`、`bin/` 或安装目录中找到的第一个可执行文件。

```toml
[tools."http:openunison-cli"]
version = "1.0.0"
url = "https://nexus.tremolo.io/repository/openunison-cli/openunison-cli-v{{ version }}-linux.zip"
rename_exe = "kubectl-openunison-cli"
```

要重命名同一归档中的多个可执行文件，请使用表格形式。每个键是精确文件名或 glob 模式，
对应的值是新名称：

```toml
[tools."http:mytool"]
version = "1.0.0"
url = "https://example.com/mytool-v{{ version }}-linux.zip"
rename_exe = { "mytool-*" = "mytool", "myhelper-*" = "myhelper" }
```

### `windows_script_interpreter` {#windows-script-interpreter}

在 Windows 上，如果下载的是脚本等原始文件，mise 会在旁边生成 `<file>.cmd`。该启动器
会用指定的解释器运行脚本，因此可以直接按名称调用脚本。此值必须是 `PATH` 中的可执行文件
名称，例如 `node` 或 `python`。其他平台不受此选项影响，脚本需要自带 shebang 行；归档和
压缩文件也不受影响。

```toml
[tools."http:my-script"]
version = "1.0.0"
url = "https://example.com/my-script-{{ version }}.js"
bin = "my-script"
windows_script_interpreter = "node" # Windows 上会生成 my-script.cmd
```

## 共享解压后的文件 {#shared-extraction}

默认情况下，每次安装都会保存一份解压后的文件副本；运行 `mise uninstall` 和
`mise prune` 移除版本时，副本也会一并删除。设置 `shared_extraction = true` 后，每个
不同的制品只会解压一次，存放在 `$MISE_DATA_DIR/http-tarballs/`（默认路径为
`~/.local/share/mise/http-tarballs/`），各安装目录再链接到该副本：

```toml
[tools."http:my-tool"]
version = "1.0.0"
url = "https://example.com/releases/my-tool-v1.0.0.tar.gz"
shared_extraction = true
```

多个工具或版本使用同一制品时，共用解压文件可以节省磁盘空间和解压时间；mise 仍会下载制品，
以确定其内容。对共享文件所做的修改（包括 `postinstall` 钩子的修改）会影响所有使用该副本的
安装。通过 `mise install --system`、`mise install --shared` 和 `mise install-into` 指定的
目标位置始终会获得独立副本。

::: warning 共享存储中的文件会被直接信任
mise 不会根据锁文件中的校验和重新检查 `http-tarballs` 中已有的文件。不要允许不可信的任务
或用户写入共享存储或恢复的存储。另见[恢复缓存与已安装工具](/dev-tools/mise-lock.html#restored-caches)。
:::

由于安装目录可能仍链接到 `http-tarballs`，`mise prune`、`mise cache prune` 和
`mise cache clear` 都不会清理该目录。旧版 mise 创建的安装也可能链接到这里。若要让某个
安装使用独立副本，请移除 `shared_extraction` 并运行
`mise install --force <tool>@<version>`。只修改选项不会改变已安装版本。

要回收磁盘空间，请为所有相关安装创建独立副本或卸载它们，确认没有任何路径链接到该目录，
然后再删除目录：

```sh
find ~/.local/share/mise/installs -lname '*http-tarballs*' # 应当没有输出
rm -rf ~/.local/share/mise/http-tarballs
```

如果使用的不是默认路径，请按需替换为你的[数据目录](/directories.html)。

实现代码：[`src/backend/http.rs`](https://github.com/jdx/mise/blob/main/src/backend/http.rs)。
