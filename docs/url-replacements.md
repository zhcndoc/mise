---
description: "使用 url_replacements 将 mise 的 HTTP 客户端发出的请求路由到内部镜像或代理。"
---

# URL 替换

使用 `url_replacements` 将 mise 的 HTTP 客户端发出的请求路由到内部镜像或代理。这可以涵盖发布元数据和构件下载，包括 Conda 频道元数据。它不会重写由插件脚本、Git 或外部包管理器独立发出的请求；请分别配置这些客户端。

替换会更改请求发送的位置。它不会更改后端选择的资源、创建镜像或生成新的校验和。对于 Conda，锁定文件会保留逻辑上的上游 URL，并在发送请求时应用替换。

## 配置示例

将特定于机器的镜像设置放在全局配置中，或者在每个项目用户都能访问该镜像时，将其共享在 `mise.toml` 中。对于精确的 URL 前缀：

```toml
[settings]
url_replacements = { "https://example.com/" = "https://mirror.example.com/" }
```

表格形式便于配置多条规则：

```toml
[settings.url_replacements]
"https://example.com/" = "https://mirror.example.com/"
"https://releases.hashicorp.com/" = "https://hashicorp.example.com/"
```

将示例镜像主机替换为你运营或信任的服务器。它们必须提供原始后端所需的路径和元数据。检查 `mise settings ls` 以确认生效的设置；在失败的命令上启用调试日志，以检查其请求 URL。

## 简单主机名替换

尽管通常用于主机名，但普通键是对完整 URL 的**子字符串匹配**。它既可以匹配路径或查询字符串，也可以匹配主机名。诸如 `github.com` 的键也会匹配 `api.github.com` 和 `github.com.example.org`。

包含协议和末尾 `/`，例如 `https://github.com/`，可以避免匹配这些主机名。对于必须仅在 URL 开头匹配的规则，请使用带锚点的正则表达式。

## 高级正则替换

为键添加 `regex:` 前缀即可使用 Rust 正则表达式引擎。替换值中的捕获组使用 `$1`、`$2` 或命名捕获。以下示例对正则键使用 TOML 字面字符串，因此反斜杠不需要加倍。

### 正则示例

#### 1. 协议转换（HTTP 到 HTTPS）

```toml
[settings]
url_replacements = {
  'regex:^http://(.+)' = "https://$1",
}
```

仅当目标支持 HTTPS 时才使用此方式。更改协议并不会使不受信任的服务器变得可信。

#### 2. 带路径重组的 GitHub Release 镜像

```toml
[settings]
url_replacements = {
  'regex:^https://github\.com/([^/]+)/([^/]+)/releases/download/(.+)' = "https://hub.example.com/artifactory/github/$1/$2/$3",
}
```

这会将 `https://github.com/owner/repo/releases/download/v1.0.0/file.tar.gz` 映射到 `https://hub.example.com/artifactory/github/owner/repo/v1.0.0/file.tar.gz`。它不会重写 `api.github.com` 请求；如果发布元数据也必须通过镜像传输，请添加单独的规则。

#### 3. 从子域名转换为路径

```toml
[settings]
url_replacements = {
  'regex:^https://([^./]+)\.cdn\.example\.com/(.+)' = "https://unified-cdn.example.com/$1/$2",
}
```

例如，`https://eu.cdn.example.com/tool.tar.gz` 会变为 `https://unified-cdn.example.com/eu/tool.tar.gz`。

#### 4. 多个替换模式（按顺序处理）

```toml
[settings]
url_replacements = {
  # Put the specific rule before the general GitHub rule.
  'regex:^https://github\.com/microsoft/(.+)' = "https://internal.example.org/microsoft/$1",
  'regex:^https://github\.com/(.+)' = "https://public.example.org/github/$1",
  "https://releases.hashicorp.com/" = "https://hashicorp.example.net/",
}
```

这些示例使用 TOML 1.1 多行内联表，其中包含注释和末尾逗号。第一条规则处理 Microsoft 代码库，第二条处理其他 GitHub 路径，最后一条处理 HashiCorp 下载。

## 正则语法

使用 `^` 锚定开头，使用 `(.+)` 进行捕获，使用 `[^/]+` 表示路径组件。在 TOML 字面字符串中，使用 `\.` 转义字面点。在双引号 TOML 字符串中，应改为写成 `\\.`，因为 TOML 也会处理反斜杠转义。

[Rust regex documentation](https://docs.rs/regex/latest/regex/#syntax) 描述了受支持的语法。不支持模式内的反向引用和环视。当捕获后面紧跟字母或数字时，请使用花括号分隔其名称，例如 `${1}suffix`。

## 优先级与匹配

规则按照配置插入顺序运行。mise 使用第一条能将 URL 更改为另一个有效 URL 的规则，然后停止；替换不会链式执行。请将具体规则放在宽泛规则之前。如果匹配的规则未更改 URL 或生成了无效 URL，mise 会继续处理后续规则。无效的正则模式会产生警告并被跳过。

如果没有规则生成有效且发生变化的 URL，则使用原始请求。因此，URL 替换是路由规则，而不是出站主机允许列表。当流量绝不能到达上游主机时，请在 mise 之外使用网络策略。

## 安全注意事项

为原始 URL 准备的身份验证标头可能会发送到替换服务器。仅将请求路由到受信任、能够接收构件和这些凭据的服务器。更改主机的重写会移除作用域限定为原始主机的凭据——包括授权标头、Cookie、API 密钥、其他受识别的凭据标头，或从原始 URL 携带过来的用户信息——然后可以添加下文所述的来自 netrc 的镜像凭据。同主机重写会保留现有凭据。

当 HTTPS 到 HTTP 的重写在该作用域下仍会发送凭据时，mise 会拒绝请求，而不是在没有传输加密的情况下暴露凭据。这涵盖同主机降级，以及写入替换规则本身的凭据。未进行身份验证的降级仍然允许，凭据来自替换主机的 netrc 条目的降级也允许：mise 会将这些凭据发送到普通的 `http://` URL，且不涉及重写，因此重写并不会更加严格。

这两条规则适用于 mise 的 HTTP 客户端、GitHub 证明请求和 Conda 频道流量。对于 Sigstore TUF 元数据，不安全的携带凭据的降级会被忽略，并继续使用安全的默认 TUF URL。

要精确匹配主机，请同时使用起始锚点和主机名边界：

```toml
[settings.url_replacements]
'regex:^https://github\.com/' = "https://mirror.example.com/"
```

末尾的斜杠很重要：`^https://github\.com` 本身也会匹配 `https://github.com.example.org/`。避免直接将凭据放入替换 URL，因为它们可能出现在日志中。

## 身份验证

mise 会在重写 URL **之后**查找 netrc 凭据。在 `~/.netrc` 中使用替换后的主机名；在 Windows 上使用 `~/_netrc`（`~/.netrc` 是其备用文件）。[`netrc_file`](/configuration/settings.html#netrc_file) 设置可以选择其他文件。

```netrc
machine mirror.example.com
  login myusername
  password mypassword
```

使用你的镜像凭据，并限制文件在 Unix 上的权限，例如 `chmod 600 ~/.netrc`。

Netrc 通常是备用方式：现有的 Authorization 标头优先。当替换更改主机名时，与新主机匹配的 netrc 凭据可以覆盖该标头。仅更改同一主机上的路径或查询的重写会保留现有 Authorization。有关上游令牌来源，请参阅 [GitHub Tokens](/dev-tools/github-tokens.html)。
