---
description: "从 Codeberg 或其他 Forgejo 服务器的发行版资源安装预编译工具。"
---

# forgejo 后端

`forgejo` 后端从 Forgejo 仓库的发行版资源中安装工具。除非通过 `api_url` 指定其他 Forgejo 或 Gitea 服务器，否则它使用 [Codeberg](https://codeberg.org)。该后端与 [github 后端](/dev-tools/backends/github.html)共用实现，并接受相同的[工具选项](/dev-tools/backends/github.html#tool-options)；本页仅介绍两者的差异。

<a id="usage"></a>

## 用法

Forgejo Runner 在 code.forgejo.org 而非 Codeberg 发布 Linux 二进制文件，因此此示例需要设置 `api_url`。在 Linux 上，可将它安装到当前项目并运行：

```sh
mise use 'forgejo:forgejo/runner[api_url=https://code.forgejo.org/api/v1,bin=forgejo-runner]'
mise exec -- forgejo-runner --version
```

请为参数加引号，避免 shell 展开方括号。上述命令会向 `mise.toml` 添加以下条目。若要将工具设为全局工具，请在 `mise use` 后添加 `-g`。

```toml
[tools]
"forgejo:forgejo/runner" = { version = "latest", api_url = "https://code.forgejo.org/api/v1", bin = "forgejo-runner" }
```

此命令只会安装 runner 可执行文件；向服务器注册并将它作为服务运行是另外的步骤。若仓库位于 Codeberg，请省略 `api_url`。

## 与 github 后端的差异

| 行为                                               | github                                                       | forgejo                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 默认 `api_url`                                    | `https://api.github.com`                                     | `https://codeberg.org/api/v1`                                                          |
| 自动查找的校验和                                   | GitHub 报告的摘要或发行版中的校验和文件                       | 发行版中的校验和文件                                                                   |
| GitHub 制品证明和 SLSA 来源信息                   | 会检查                                                     | 不支持；请使用 `checksum` 或 [mise.lock](/dev-tools/mise-lock.html) 固定制品            |

其他行为与 GitHub 相同。版本列表会读取相同数量的发行版；[`prerelease`](/dev-tools/backends/github.html#prerelease) 使用 Forgejo 的预发行标记：除非设置 `prerelease = true`，否则 `latest` 会解析为 Forgejo 标记的最新发行版。

## 身份验证

公开仓库无需令牌。对于私有仓库、其他服务器或速率限制问题，请设置 `MISE_FORGEJO_TOKEN` 或使用其他令牌来源；参见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。运行 `mise token forgejo` 可查看 mise 使用的令牌。

## 其他 Forgejo 服务器

将 `api_url` 设为服务器的 API 地址，并提供该主机对应的令牌，例如设置 `MISE_FORGEJO_ENTERPRISE_TOKEN`；参见[自托管主机](/dev-tools/github-tokens.html#github-enterprise)。mise 会通过该服务器下载发行版资源。

### `api_url` {#api-url}

Forgejo API 的基础 URL，默认为 `https://codeberg.org/api/v1`。

```toml
[tools]
"forgejo:user/repo" = { version = "latest", api_url = "https://forgejo.mycompany.com/api/v1" }
```

## 工具选项

`forgejo` 后端接受 [github 后端的工具选项](/dev-tools/backends/github.html#tool-options)，用于选择资源、指定版本、解压文件和验证下载；两者的差异如上所述。仅适用于 GitHub 的选项 `github_attestations`、`slsa_signer_identity` 和 `slsa_signer_issuer` 在此处无效。

## 设置

[`forgejo` 设置](/configuration/settings.html#forgejo)用于选择 mise 发送的令牌；参见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。
