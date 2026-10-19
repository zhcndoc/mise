---
description: "从 gitlab.com 或自托管实例的 GitLab 发行版链接安装预编译工具。"
---

# gitlab 后端

`gitlab` 后端会从 gitlab.com 或自托管 GitLab 实例上的项目发行版链接中安装工具。它与 [github 后端](/dev-tools/backends/github.html)共用实现，并接受相同的[工具选项](/dev-tools/backends/github.html#tool-options)；本页介绍两者的差异。

<a id="usage"></a>

## 用法

列出项目版本：

```sh
mise ls-remote gitlab:gitlab-org/gitlab-runner
```

GitLab Runner 的发行版链接使用平台名称，例如 `binary: Linux amd64`，而不是文件名。以下配置会按链接名称匹配平台，并为下载的可执行文件命名：

```toml
[tools."gitlab:gitlab-org/gitlab-runner"]
version = "19.3.1"
bin = "gitlab-runner"

[tools."gitlab:gitlab-org/gitlab-runner".platforms]
linux-x64 = { asset_pattern = "binary: Linux amd64" }
macos-arm64 = { asset_pattern = "binary: macOS arm64" }
```

安装并运行：

```sh
mise install
mise exec -- gitlab-runner --version
```

这只会安装可执行文件，不会注册 runner 或启动服务。若要支持其他平台，请在项目的 Releases 页面查看链接名称，并添加对应的 `platforms` 条目。

## 与 github 后端的差异

| 行为                                                                            | github                                                       | gitlab                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `asset_pattern`、`matching`、`matching_regex` 和自动检测使用的名称                | 资源文件名                                                   | 发行版链接的显示名称，例如 `binary: Linux amd64`                                           |
| `mise ls-remote` 列出的发行版                                                   | 含资源的发行版，最多读取 3 页、每页 100 个                    | 最新的 100 个发行版中至少包含一个链接的发行版                                              |
| `latest`                                                                       | GitHub 标记为 Latest 的发行版                                | 列表中最新的发行版                                                                         |
| `prerelease`                                                                   | 使用 GitHub 的预发行标记                                      | GitLab 没有预发行标记，因此会列出所有发行版；参见[预发行版](#prereleases)                    |
| 自动查找的校验和                                                                | GitHub 报告的摘要或发行版中的校验和文件                       | 发行版链接中的校验和文件                                                                   |
| GitHub 制品证明和 SLSA 来源信息                                                  | 会检查                                                     | 不支持；请使用 `checksum` 或 [mise.lock](/dev-tools/mise-lock.html) 固定制品                |
| 默认 `api_url`                                                                 | `https://api.github.com`                                     | `https://gitlab.com/api/v4`                                                                |

### 链接名称

由于 mise 根据显示名称匹配发行版链接，`asset_pattern` 和 `matching` 应使用 Releases 页面上显示的名称。下载文件也会使用链接名称，因此链接名没有文件扩展名时，单个二进制文件请设置 [`bin`](/dev-tools/backends/github.html#bin)，归档文件请设置 [`format`](/dev-tools/backends/github.html#format)。

### 版本列表

mise 只会读取最新的 100 个发行版，因此 `mise ls-remote` 和版本前缀看不到更旧的发行版。设置 `MISE_LIST_ALL_VERSIONS=1` 可列出所有发行版。即使列表中没有某个确切版本（例如 `@16.8.0`），仍可安装该版本。mise 只列出至少包含一个链接的发行版，不会列出 Git 标签或 GitLab 自动生成的源码归档。

### 预发行版

GitLab 发行版没有预发行标记，因此 `mise ls-remote` 会列出所有发行版。不过，`latest` 和版本前缀仍会跳过名称看起来像预发行版的版本，例如 `2.0.0-rc1`。在工具条目中设置 [`prerelease = true`](/dev-tools/backends/github.html#prerelease) 可将其纳入。

<a id="authentication"></a>

## 身份验证

公开项目无需令牌。对于私有项目、自托管实例或速率限制问题，请设置 `MISE_GITLAB_TOKEN` 或使用其他令牌来源；参见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。运行 `mise token gitlab` 可查看 mise 使用的令牌。

## 自托管 GitLab

将 `api_url` 设为实例的 API 地址，并提供该主机对应的令牌，例如设置 `MISE_GITLAB_ENTERPRISE_TOKEN`；参见[自托管主机](/dev-tools/github-tokens.html#github-enterprise)。mise 会通过该 API 列出发行版，并从发行版链接所指向的 URL 下载文件。

### `api_url` {#api-url}

GitLab API 的基础 URL，默认为 `https://gitlab.com/api/v4`。

```toml
[tools]
"gitlab:myorg/mytool" = { version = "latest", api_url = "https://gitlab.mycompany.com/api/v4" }
```

## 工具选项

`gitlab` 后端接受 [github 后端的工具选项](/dev-tools/backends/github.html#tool-options)，用于选择资源、指定版本、解压文件和验证下载；两者的差异如上所述。仅适用于 GitHub 的选项 `github_attestations`、`slsa_signer_identity` 和 `slsa_signer_issuer` 在此处无效。

## 设置

[`gitlab` 设置](/configuration/settings.html#gitlab)用于选择 mise 发送的令牌；参见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。
