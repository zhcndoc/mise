---
description: "使用 url_replacements 重写 mise 请求的 URL，通过镜像或代理获取下载文件和发行版本元数据。"
socialDescription: "重写 mise 请求的 URL，通过镜像或代理获取下载文件和元数据。"
---

# URL 替换

`[url_replacements](/configuration/settings.html#url_replacements) 设置会重写 mise HTTP 客户端发出的请求 URL，使发行版元数据和制品下载可以通过内部镜像或代理。它也适用于 Conda channel 元数据，以及 vfox 插件通过 `http` 模块发出的 HTTP 请求。它不会重写 asdf 插件脚本、插件运行的命令（如 `curl`）、Git 或外部软件包管理器发出的请求；这些客户端需要单独配置。

替换规则会更改请求的目标位置，但不会更改后端选择的制品，不会创建镜像，也不会生成新的校验和。对于 Conda，锁文件仍保留上游 URL；请求发送时才应用替换规则。

```toml [~/.config/mise/config.toml]
[settings.url_replacements]
"https://releases.hashicorp.com/" = "https://hashicorp-mirror.example.com/"
```

仅供单台机器使用的镜像请写入全局配置；如果项目中的所有人都能访问镜像，也可以写入 `mise.toml`。请将示例主机名替换为你运营或信任的服务器；这些服务器必须提供与原始地址相同的路径和元数据。

## 通过代理转发 GitHub 请求

普通匹配键会保留 URL 的其余部分，因此通过路径前缀镜像 GitHub 的代理无需使用正则表达式：

```toml
[settings.url_replacements]
"https://github.com/" = "http://pkgproxy.internal:8080/generic/github/"
"https://api.github.com/" = "http://pkgproxy.internal:8080/generic/github-api/"
```

| 原始请求                                                               | 替换后的地址                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `https://github.com/owner/repo/releases/download/v1.0.0/file.tar.gz`   | `http://pkgproxy.internal:8080/generic/github/owner/repo/releases/download/v1.0.0/file.tar.gz` |
| `https://api.github.com/repos/owner/repo/releases`                     | `http://pkgproxy.internal:8080/generic/github-api/repos/owner/repo/releases`             |

`https://github.com/` 不会匹配 `https://api.github.com/`，因此这两条规则不会重叠。只有代理也提供 GitHub API 时才应重定向 API 请求；重定向后，mise 也不会再通过 [mise-versions](/configuration/settings.html#use_versions_host) 获取 GitHub 发行版和证明元数据。如果代理只镜像发行版下载，请只保留第一条规则。

## 规则匹配方式

普通匹配键可以匹配 URL 中的任意位置，包括路径和查询字符串，并替换所有匹配项。`github.com` 也会匹配 `api.github.com` 和 `github.com.example.org`。如需只匹配一个主机，请包含协议和末尾斜杠，例如 `https://github.com/`。

以 `regex:` 开头的键会被视为正则表达式；详见[正则规则](#regex-rules)。

规则按照配置中的顺序执行。mise 使用第一条能将 URL 改写为另一个有效 URL 的规则，然后停止，因此替换不会级联。若规则未改变 URL 或生成了无效 URL，mise 会跳过该规则；无效正则表达式会产生警告并被跳过。没有规则改写 URL 时，mise 会发送原始请求。请将具体规则放在宽泛规则之前。

URL 替换是路由规则，不是允许列表。如果必须禁止流量访问某个上游主机，请在 mise 之外配置网络策略。

## 正则规则

下方示例中的正则匹配键使用 TOML 字面字符串（单引号），因此反斜杠无需重复。在双引号 TOML 字符串中，应写作 `\\.` 而不是 `\.`。

使用 `^` 锚定开头、`(.+)` 捕获内容，并使用 `[^/]+` 匹配一个路径部分。替换字符串中可通过 `$1`、`$2` 或名称引用捕获内容。如果捕获内容后面紧跟字母或数字，请加上花括号，例如 `${1}suffix`。语法详见 [Rust regex 文档](https://docs.rs/regex/latest/regex/#syntax)；不支持在模式中使用反向引用和环视。

如需精确匹配一个主机，请锚定 URL 开头，并在主机名后添加斜杠：

```toml
[settings.url_replacements]
'regex:^https://github\.com/' = "https://mirror.example.com/"
```

省略末尾斜杠后，`^https://github\.com` 也会匹配 `https://github.com.example.org/`。

### 重组 GitHub 发行版路径

此规则会将 `https://github.com/owner/repo/releases/download/v1.0.0/file.tar.gz` 转发到 `https://hub.example.com/artifactory/github/owner/repo/v1.0.0/file.tar.gz`：

```toml
[settings.url_replacements]
'regex:^https://github\.com/([^/]+)/([^/]+)/releases/download/(.+)' = "https://hub.example.com/artifactory/github/$1/$2/$3"
```

它不会重写 `api.github.com` 请求；如果发行版元数据也必须通过镜像获取，请另行添加规则。

### 将子域名改为路径

此规则会将 `https://eu.cdn.example.com/tool.tar.gz` 转发到 `https://unified-cdn.example.com/eu/tool.tar.gz`：

```toml
[settings.url_replacements]
'regex:^https://([^./]+)\.cdn\.example\.com/(.+)' = "https://unified-cdn.example.com/$1/$2"
```

### 将具体规则放在通用规则之前

第一条规则处理 Microsoft 仓库，第二条处理其他所有 GitHub 路径，第三条处理 HashiCorp 下载：

```toml
[settings.url_replacements]
'regex:^https://github\.com/microsoft/(.+)' = "https://internal.example.org/microsoft/$1"
'regex:^https://github\.com/(.+)' = "https://public.example.org/github/$1"
"https://releases.hashicorp.com/" = "https://hashicorp.example.net/"
```

### 将 HTTP 改为 HTTPS

```toml
[settings.url_replacements]
'regex:^http://(.+)' = "https://$1"
```

只有目标服务器支持 HTTPS 时才能使用此规则。更改协议并不会让不受信任的服务器变得可信。

## 凭据

规则将请求发送到其他主机时，mise 会移除原主机对应的凭据：`Authorization` 标头、Cookie、API key 标头，以及 URL 中的 `user:password`。如果新主机有对应的 [netrc](#netrc) 凭据，mise 随后会添加这些凭据。主机不变的规则会保留原凭据。

通过规则将 HTTPS 请求改写为普通 HTTP 后，mise 会拒绝发送凭据，无论凭据来自原始请求还是写在规则中。不携带凭据的降级请求可以发送；从新主机对应的 netrc 条目获取凭据时也可以发送。这些规则同样适用于 GitHub 证明请求和 Conda channel。对于 Sigstore TUF 元数据，mise 会忽略此类改写并保留默认 HTTPS URL。

请勿将凭据写入替换 URL，以免它们出现在日志中。请求只能转发到同时受信任且可安全交付制品和凭据的服务器。

### netrc 文件 {#netrc}

mise 会在重写 URL 后查找 netrc 凭据，因此请在 `~/.netrc` 中填写替换后的主机名（Windows 使用 `~/_netrc`，并以 `~/.netrc` 作为回退）。[`netrc_file`](/configuration/settings.html#netrc_file) 设置可指定其他文件。

```netrc
machine mirror.example.com
  login myusername
  password mypassword
```

在 Unix 上，请使用 `chmod 600 ~/.netrc` 限制该文件的权限。

netrc 凭据是备用凭据：如果已有 `Authorization` 标头，则优先使用该标头。规则更改主机后，新主机的 netrc 凭据会替换该标头。规则只更改路径或查询字符串时，则会保留现有 `Authorization`。上游令牌的来源请参阅 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。

## 通过环境变量设置规则

`MISE_URL_REPLACEMENTS` 接受相同规则组成的 JSON 对象，适合用于单条命令或 CI 作业：

```sh
MISE_URL_REPLACEMENTS='{"https://github.com/":"https://mirror.example.com/github/"}' mise install
```

## 检查规则

设置 `MISE_LOG_HTTP=1` 可打印 mise 重写后发送的每个请求及其响应状态。使用上一示例中的规则安装 jq 时，会输出类似以下日志：

```sh
export MISE_URL_REPLACEMENTS='{"https://github.com/":"https://mirror.example.com/github/"}'
MISE_LOG_HTTP=1 mise install jq@1.8.1
```

```text
GET https://mirror.example.com/github/jqlang/jq/releases/download/jq-1.8.1/jq-linux-amd64 200 OK
```

版本列表会被缓存；测试元数据请求规则时，请先运行 `mise cache clear <tool>`。
