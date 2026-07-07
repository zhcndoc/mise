# URL 替换

mise 不包含用于下载制品的内置注册表。
相反，它会检索远程注册表清单，其中指定了用于下载工具的 URL。

在某些环境中——例如企业网络或 DMZ——这些 URL 可能无法直接访问，必须通过代理或内部镜像来访问。

URL 替换允许你修改或重定向 mise 尝试访问的任何 URL，从而可以根据需要使用内部代理、镜像或其他替代来源。

## 配置示例

在 mise.toml 中（单行）：

```toml
[settings]
url_replacements = { "example.com" = "mirror.example.com" }
```

在 mise.toml 中（多行）：

```toml
[settings.url_replacements]
"example.com" = "mirror.example.com"
"releases.hashicorp.com" = "hashicorp.example.com"
```

正则表达式示例：

```toml
[settings.url_replacements]
"regex:^http://(.+)" = "https://$1"
"regex:^https://github\\.com/([^/]+)/([^/]+)/releases/download/(.+)" = "https://hub.example.com/artifactory/github/$1/$2/$3"
```

## 简单主机名替换

对于基于主机名的简单镜像，关键是要替换的原始主机名/域名，
以及替换字符串。替换是通过在完整 URL 字符串中的任何位置（包括协议、主机名、路径和查询参数）进行搜索和替换来完成的。

示例：

- `github.com` -> `mirror.example.com` 会替换 GitHub 主机名
- `https://github.com` -> `https://mirror.example.com`，同时协议排除例如 'api.github.com'
- `https://github.com` -> `https://proxy.example.com/github-mirror` 用企业代理替换 GitHub
- `http://example.net` -> `https://example.net` 将协议从 HTTP 替换为 HTTPS

有关凭据处理的重要警告，请参见 [安全注意事项](#security-considerations)。

## 高级正则替换

对于更复杂的 URL 转换，你可以使用正则表达式模式。当某个键以 `regex:` 开头时，
它会被视为一个正则表达式模式，可以匹配并转换 URL 的任意部分。
值可以使用正则表达式模式中的捕获组。

### 正则示例

#### 1. 协议转换（HTTP 到 HTTPS）

```toml
[settings]
url_replacements = {
  "regex:^http://(.+)" = "https://$1"
}
```

这会通过捕获 "http://" 之后的所有内容，并将其替换为 "https://"，从而把任何 HTTP URL 转换为 HTTPS。

#### 2. 带路径重组的 GitHub Release 镜像

```toml
[settings]
url_replacements = {
  "regex:^https://github\\.com/([^/]+)/([^/]+)/releases/download/(.+)" =
    "https://hub.example.com/artifactory/github/$1/$2/$3"
}
```

将 `https://github.com/owner/repo/releases/download/v1.0.0/file.tar.gz`
转换为 `https://hub.example.com/artifactory/github/owner/repo/v1.0.0/file.tar.gz`

#### 3. 从子域名转换为路径

```toml
[settings]
url_replacements = {
  "regex:^https://([^.]+)\\.cdn\\.example\\.com/(.+)" =
    "https://unified-cdn.example.com/$1/$2"
}
```

将基于子域名的 URL 转换为统一 CDN 上基于路径的 URL。

#### 4. 多个替换模式（按顺序处理）

```toml
[settings]
url_replacements = {
  "regex:^https://github\\.com/microsoft/(.+)" =
    "https://internal.example.org/microsoft/$1",
  "regex:^https://github\\.com/(.+)" =
    "https://public.example.org/github/$1",
  "releases.hashicorp.com" = "hashicorp.example.net"
}
```

第一个正则专门匹配 Microsoft 仓库，第二个匹配所有其他 GitHub URL，
简单替换则处理 HashiCorp。

## 用例

1. **企业镜像**：将公共下载 URL 替换为内部企业镜像
2. **自定义仓库**：将包下载重定向到自定义或私有仓库
3. **地理优化**：将下载路由到地理位置更近的镜像
4. **协议更改**：将 HTTP URL 转换为 HTTPS，或反之亦然

## 正则语法

mise 使用 Rust 正则引擎，支持：

- `^` 和 `$` 作为锚点（字符串开头/结尾）
- `(.+)` 用于捕获组（在替换中使用 `$1`、`$2` 等）
- `[^/]+` 用于字符类（匹配除 `/` 之外的任意字符）
- `\\.` 用于转义特殊字符（注意：在 TOML 中需要双反斜杠）
- `*`、`+`、`?` 用于量词
- `|` 用于或运算

如果你的正则有效，可以在 regex101.com 上进行检查（见 [示例](https://regex101.com/r/rmcIE1/1)）。
完整的正则语法文档：<https://docs.rs/regex/latest/regex/#syntax>

## 优先级与匹配

- URL 替换按它们在配置中出现的顺序处理（IndexMap 插入顺序）
- 正则表达式模式（以 `regex:` 开头的键）和简单字符串替换都按相同顺序处理
- 使用第一个匹配的模式；该 URL 的后续模式将被忽略
- 如果没有任何模式匹配，则原始 URL 保持不变

## 安全注意事项

在使用正则表达式模式时，请确保你的替换 URL 指向受信任的来源，
因为此功能可能会将工具下载重定向到任意位置。

> [!WARNING]
> **凭据泄露**：使用 `url_replacements` 时，为原始 URL（例如 `api.github.com`）生成的任何身份验证头（如 `Authorization: Bearer <TOKEN>`）都会被**保留**并发送到替换后的 URL。
>
> 这是有意为之，旨在支持对内部代理进行身份验证，这些代理会将请求转发到上游服务（GitHub、GitLab、Forgejo 等）。但是，这也意味着你必须**仅**将 URL 替换为受信任的服务器。将其重定向到不受信任的服务器会将你的凭据泄露给该服务器。
>
> **最佳实践**：在正则表达式模式中使用 `^` 锚点，以确保匹配的是 URL 的开头。
>
> **错误**：`"regex:github\\.com"`（会匹配 `evil-github.com`）
>
> **正确**：`"regex:^https://github\\.com"`（仅匹配实际的 GitHub URL）

## 身份验证

可以使用 `~/.netrc`（在 Windows 上为 `~/_netrc`）配合 URL 替换来对替换后的 URL 进行身份验证。
替换会在 netrc 查找 _之前_ 应用，因此你应在 netrc 文件中使用 _替换后_ URL 的主机名。

例如，如果你在 `mise.toml` 中有如下内容：

```toml
[settings]
url_replacements = { "regex:^https://github\\.com" = "https://nexus.example.com" }
```

> [!NOTE]
> 来自 `.netrc` 的凭据优先级更高，并且会 **覆盖** 任何默认的身份验证头（例如来自 `MISE_GITHUB_TOKEN` 或其他环境变量的凭据）。

你应该在 `~/.netrc` 中包含以下内容：

```netrc
machine nexus.example.com
  login myusername
  password mypassword
```
