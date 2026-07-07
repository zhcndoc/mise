# GitHub 令牌

mise 中的许多工具都托管在 GitHub 上。对于公开发布，mise 默认使用 [mise-versions](https://mise-versions.jdx.dev) 作为共享缓存，用于版本列表、发布元数据和 GitHub 制品证明。这避免了在正常安装期间（包括 CI 和 Docker 构建）的大多数未认证 GitHub API 调用。

当 mise 需要回退到 GitHub 的 API、设置了 `MISE_USE_VERSIONS_HOST=0`，或者从私有仓库、GitHub Enterprise 或自定义 GitHub API 主机安装工具时，GitHub 令牌仍然很有用。未认证请求会受到较低的 [速率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)，这可能导致 `403 Forbidden` 错误。本页解释了如何在 mise 中配置 GitHub 身份验证。

## 令牌优先级

mise 按以下顺序检查来源。找到的第一个令牌即生效：

**github.com：**

| 优先级 | 来源                                 |
| ------ | ------------------------------------ |
| 1      | `MISE_GITHUB_TOKEN` 环境变量         |
| 2      | `GITHUB_API_TOKEN` 环境变量          |
| 3      | `GITHUB_TOKEN` 环境变量              |
| 4      | `credential_command`（如果已设置）    |
| 5      | 原生 GitHub OAuth（如果已配置）       |
| 6      | `github_tokens.toml`（按主机）        |
| 7      | gh CLI 令牌（来自 `hosts.yml`）       |
| 8      | `git credential fill`（如果已启用）   |

**GitHub Enterprise 主机：**

| 优先级 | 来源                                                                |
| ------ | ------------------------------------------------------------------- |
| 1      | `MISE_GITHUB_ENTERPRISE_TOKEN` 环境变量                             |
| 2      | `MISE_GITHUB_TOKEN` / `GITHUB_API_TOKEN` / `GITHUB_TOKEN` 环境变量 |
| 3      | `credential_command`（如果已设置）                                   |
| 4      | 原生 GitHub OAuth（如果已配置）                                      |
| 5      | `github_tokens.toml`（按主机）                                       |
| 6      | gh CLI 令牌（来自 `hosts.yml`，按主机名匹配）                        |
| 7      | `git credential fill`（如果已启用）                                  |

::: tip
github.com 的环境变量（`MISE_GITHUB_TOKEN` 等）在未设置 `MISE_GITHUB_ENTERPRISE_TOKEN` 时，也会作为 GHE 的回退方案。如果你需要为 github.com 和某个 GHE 实例使用不同的令牌，请显式设置 `MISE_GITHUB_ENTERPRISE_TOKEN`，或者使用 gh CLI 集成。
:::

## 通过环境变量设置令牌

创建一个 [个人访问令牌](https://github.com/settings/tokens/new?description=MISE_GITHUB_TOKEN)（不需要任何权限范围）并进行设置：

```sh
export MISE_GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

或者，如果你已经设置了 `GITHUB_TOKEN`（在 GitHub Actions 中很常见），mise 会自动使用它。

## Token 文件（`github_tokens.toml`）

你可以在 mise 特定的配置文件中为每个主机存储 GitHub token：

```toml
# ~/.config/mise/github_tokens.toml
[tokens."github.com"]
token = "ghp_xxxxxxxxxxxx"

[tokens."github.mycompany.com"]
token = "ghp_yyyyyyyyyyyy"
```

该文件的检查顺序在环境变量和 `credential_command` 之后，但在 gh CLI 的 `hosts.yml` 之前，因此在以下情况中很有用：

- 你不使用 gh CLI，或者
- gh CLI token 的作用域受限（例如，Coder 提供的 token 仅限于特定组织），而你需要一个更宽泛的 token 供 mise 使用，或者
- 你希望使用仅针对 mise 的 token，而不影响其他工具。

该文件的位置遵循 `MISE_CONFIG_DIR`（默认为 `~/.config/mise`）。
无需额外设置——如果该文件存在，mise 会自动发现它。

## gh CLI 集成

如果你使用 [GitHub CLI](https://cli.github.com/)（`gh`），mise 可以直接从其 `hosts.yml` 配置文件中读取令牌。此功能默认启用，并且会在未设置令牌环境变量时生效。

mise 会在以下位置查找 `hosts.yml`（按顺序匹配，先找到先使用）：

1. `$GH_CONFIG_DIR/hosts.yml`
2. `$XDG_CONFIG_HOME/gh/hosts.yml`（默认为 `~/.config/gh/hosts.yml`）
3. `~/Library/Application Support/gh/hosts.yml`（仅限 macOS）

这对 **GitHub Enterprise** 尤其有用——gh CLI 会按主机存储令牌，因此 mise 可以对多个 GHE 实例进行身份验证，而无需来回切换环境变量：

```yaml
# ~/.config/gh/hosts.yml（由 `gh auth login` 管理）
github.com:
  oauth_token: ghp_xxxxxxxxxxxx
  user: you
github.mycompany.com:
  oauth_token: ghp_yyyyyyyyyyyy
  user: you
```

::: info
mise 会直接读取配置文件——它不会通过 shell 调用 `gh`。如果你的 gh CLI 使用凭据助手（例如 macOS 钥匙串）而不是将令牌存储在 `hosts.yml` 中，那么通过此方法将无法获取令牌。不过，mise 也支持 `git credential fill`（见下文），它可以从系统密钥环中检索令牌。
:::

要禁用此行为：

```toml
[settings.github]
gh_cli_tokens = false
```

## 凭据命令

你可以配置一个自定义的 shell 命令，让 mise 运行它来获取 GitHub token。这在你想要一个只被 mise 使用、而不影响 git 的凭据来源时非常有用：

```toml
[settings.github]
credential_command = "op read 'op://Private/GitHub Token/credential'"
```

mise 会使用已配置的默认内联 shell（[`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)）执行此命令，并从 stdout 读取 token。主机名可通过 `MISE_CREDENTIAL_HOST` 获取，提供方名称（`github`）可通过 `MISE_CREDENTIAL_PROVIDER` 获取。为兼容起见，识别为 sh 兼容的 shell（`ash`、`bash`、`dash`、`ksh`、`sh` 和 `zsh`）也会将主机名作为 `$1`/`${1}` 传入。此检查优先于 `github_tokens.toml` 和 gh CLI tokens，因此它的优先级高于基于文件的来源。

:::: warning 计划弃用
旧的 `$1`/`${1}` 主机名参数已被弃用。请改用 `MISE_CREDENTIAL_HOST`。mise 将在 `2026.11.0` 开始发出警告，而 `$1` 兼容性将在 `2027.11.0` 被移除。
::::

### 使用 ghtkn

[ghtkn](https://github.com/suzuki-shunsuke/ghtkn) 可以生成短期有效的 GitHub App 用户访问 token 并将其打印到 stdout，这使它与 `credential_command` 兼容。

在依赖 mise 使用它之前，请先手动运行一次 `ghtkn get`，这样任何基于浏览器的设备流都会有意触发。之后，ghtkn 可以从你的操作系统密钥管理器中复用 token，直到需要重新生成。

凭据命令运行时会移除 PATH 中的 mise shims，以避免递归调用 mise。如果你使用 mise 安装了 `ghtkn`，请使用 `mise which` 找到真实可执行文件路径，并将其保存到 `credential_command` 中，而不是依赖 shim：

```sh
mise settings set github.credential_command="$(mise which ghtkn) get -m 1h"
```

不要让凭据命令运行 `mise x`、`mise exec`，或其他可能需要 GitHub 访问权限来解析或安装 `ghtkn` 的命令，因为这可能会在 mise 尝试获取 GitHub token 时形成循环。

如果 `ghtkn` 已经可以在不依赖 mise shim 的情况下直接使用，你也可以直接这样设置：

```toml
[settings.github]
credential_command = "ghtkn get -m 1h"
```

使用 `mise token github` 来确认 mise 能够解析该 token：

```sh
mise token github
```

## 原生 GitHub OAuth

mise 可以通过 GitHub 的 OAuth 设备流直接创建短期有效的 GitHub App 用户访问令牌。这不需要个人访问令牌、GitHub App 私钥、应用客户端密钥、`gh`、`ghtkn` 或任何其他外部凭据命令。

该设计受 [ghtkn](https://github.com/suzuki-shunsuke/ghtkn) 启发——如果你更愿意运行一个独立进程，并让 mise 通过 `credential_command` 获取其令牌，请参阅上方的 [Using ghtkn](#using-ghtkn)。

创建一个启用了设备流的 GitHub App，然后配置其客户端 ID：

```sh
mise settings set github.oauth_client_id=Iv1.yourgithubappclientid
```

授权一次：

```sh
mise token github --oauth
```

之后，mise 会为自己的 GitHub API 调用复用缓存的令牌，并在 GitHub 返回刷新令牌时对其进行刷新。在缓存令牌有效期间，mise 还会通过 `GITHUB_TOKEN` 将其导出到你的 shell（通过 `mise activate` / `mise hook-env` / `mise env` / `mise exec`），因此像 `gh`、`git` 和 `cargo publish` 这样的工具无需额外配置即可使用它：

```sh
gh pr list # 自动使用 OAuth 令牌
```

如果要使用不同的变量名（例如 `gh` 偏好的 `GH_TOKEN`），请设置 `github.oauth_export_env`。将其设置为空字符串可禁用自动导出。

在需要将原始令牌直接传递到某处时，你仍然可以显式输出原始令牌：

```sh
export MISE_GITHUB_TOKEN="$(mise token github --oauth --raw)"
```

可选设置：

```toml
[settings.github]
oauth_client_id = "Iv1.yourgithubappclientid"
oauth_scopes = "" # 对于 GitHub App 用户访问令牌通常为空
oauth_open_browser = true
oauth_export_env = "GITHUB_TOKEN" # 设为 "" 可禁用自动导出
```

## Git 凭据助手

mise 可以使用你现有的 git 凭据助手来获取 GitHub 令牌。这是**可选启用**的，并且会在所有其他令牌来源都失败后作为最后的回退方案。

这在以下场景中特别有用：

- **Devcontainer 环境**，其中令牌通过 git 凭据助手提供
- **macOS/Windows**，其中 `gh auth login` 会将令牌存储在系统密钥串中，而不是 `hosts.yml`
- 任何 git 已经配置了凭据的环境

mise 会使用 `GIT_TERMINAL_PROMPT=0` 运行 `git credential fill`（以防止交互式提示），并在会话期间按主机缓存结果。

要启用此行为：

```toml
[settings.github]
use_git_credentials = true
```

## 调试 Token 解析

使用 `mise token github` 查看 mise 会为给定主机使用哪个 token：

```sh
mise token github                           # 检查 github.com（已隐藏）
mise token github --unmask                  # 显示完整 token
mise token github github.mycompany.com      # 检查 GHE 主机
```

## GitHub Enterprise

对于自托管的 GitHub 实例，请在工具上设置 `api_url` [工具选项](/dev-tools/backends/github.html#api-url)：

```toml
[tools]
"github:myorg/mytool" = { version = "latest", api_url = "https://github.mycompany.com/api/v3" }
```

进行身份验证时，mise 按以下顺序检查：

1. `MISE_GITHUB_ENTERPRISE_TOKEN` 环境变量
2. `MISE_GITHUB_TOKEN` / `GITHUB_API_TOKEN` / `GITHUB_TOKEN` 环境变量
3. 用于该 API 主机名的 `credential_command`
4. 配置的 API 主机名对应的原生 GitHub OAuth
5. 该 API 主机名对应的 `github_tokens.toml`
6. 该 API 主机名对应的 gh CLI token
7. 该 API 主机名对应的 `git credential fill`

如果你有**多个** GHE 实例，`MISE_GITHUB_ENTERPRISE_TOKEN`（单个值）将不起作用。请改用 `github_tokens.toml`、gh CLI 集成、`credential_command` 或 git credential helpers：

```sh
gh auth login --hostname github.mycompany.com
gh auth login --hostname github.other-company.com
```

## 通过 lockfile 完全避免使用 token

如果你使用 [`mise.lock`](/dev-tools/mise-lock.html)，mise 会存储准确的下载 URL 和校验和。后续安装将直接使用 lockfile —— 无需 GitHub API 调用：

```sh
mise settings lockfile=true
mise lock
```

这是 CI 的最佳方案，因为你希望在不配置 token 的情况下获得确定性的构建。详情请参见 [mise.lock Lockfile](/dev-tools/mise-lock.html)。

## CI / GitHub Actions

在 GitHub Actions 中，`GITHUB_TOKEN` 会自动可用。mise 无需额外配置即可获取它：

```yaml
- uses: jdx/mise-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

对于私有仓库或更高的速率限制，请使用存储为仓库密钥的 [细粒度个人访问令牌](https://github.com/settings/tokens?type=beta)。

## .netrc

mise 也支持用于 HTTP Basic 认证的 `.netrc`。来自 `.netrc` 的凭据优先于基于 token 的认证头。有关详细信息，请参见 [URL 替换](/url-replacements.html)。
