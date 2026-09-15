---
description: "配置 GitHub 身份验证以发现发布版本和下载工具"
socialDescription: "配置 GitHub 身份验证以发现发布版本和下载工具"
---

# GitHub 令牌

mise 中的许多工具都托管在 GitHub 上。对于公开发布，mise 默认使用 [mise-versions](https://mise-versions.jdx.dev) 作为共享缓存，用于版本列表、发布元数据和 GitHub 制品证明。这避免了在正常安装期间（包括 CI 和 Docker 构建）的大多数未认证 GitHub API 调用。

当 mise 需要回退到 GitHub 的 API、设置了 `MISE_USE_VERSIONS_HOST=0`，或者从私有仓库、GitHub Enterprise 或自定义 GitHub API 主机安装工具时，GitHub 令牌仍然很有用。未认证请求会受到较低的 [速率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)，这可能导致 `403 Forbidden` 错误。本页解释了如何在 mise 中配置 GitHub 身份验证。

## 从令牌诊断开始

检查 mise 选择的来源，但不打印完整凭据：

```sh
mise token github
mise token github github.mycompany.com
```

第二个命令用于 Enterprise 主机；请替换主机名。选中的令牌并不能证明它有权访问特定仓库。如果安装失败，请检查其权限和有效期，以及此处显示的来源。

如果你已经使用带有系统密钥环的 `gh auth login`，请配置[凭据命令](#git-credential-helpers)。mise 的直接 `hosts.yml` 读取器无法获取仅存储在该密钥环中的令牌。

## 令牌优先级

mise 按顺序检查以下来源。第一个可用的令牌会获胜；错误或已过期的高优先级令牌可能会隐藏可用的低优先级来源。`GH_TOKEN` 不是 mise 的直接令牌来源，不过已配置的 `gh auth token` 凭据命令可以使用它。

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

对于公开发布访问，经典个人访问令牌不需要私有仓库作用域。对于私有仓库，请授予令牌访问该仓库以及 API 所需的权限；细粒度令牌需要 **Contents: read** 才能[下载发布资产](https://docs.github.com/en/rest/releases/assets#get-a-release-asset)。创建一个[个人访问令牌](https://github.com/settings/tokens)，并将其提供给运行 mise 的进程：

```sh
export MISE_GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

上面的值只是占位符。实际值应优先使用密钥管理器或 CI 密钥存储。现有的 `GITHUB_TOKEN` 在没有更高优先级来源覆盖它时也可以使用；请参阅 [GitHub Actions](/dev-tools/github-tokens.html#ci-github-actions)。

## 令牌文件（`github_tokens.toml`）

你可以在 mise 特定的配置文件中为每个主机存储 GitHub token：

```toml
# ~/.config/mise/github_tokens.toml
[tokens."github.com"]
token = "ghp_xxxxxxxxxxxx"

[tokens."github.mycompany.com"]
token = "ghp_yyyyyyyyyyyy"
```

此文件会在环境变量、`credential_command` 和原生 OAuth 之后、gh CLI 文件之前进行检查。它适用于以下情况：

- 你不使用 gh CLI，或者
- gh CLI token 的作用域受限（例如，Coder 提供的 token 仅限于特定组织），而你需要一个更宽泛的 token 供 mise 使用，或者
- 你希望使用仅针对 mise 的 token，而不影响其他工具。

文件位置遵循 `MISE_CONFIG_DIR`（默认为 `~/.config/mise`）。无需其他设置。该文件包含明文凭据；请将其保存在共享项目配置之外，并仅允许你的用户读取。在 Unix 上：

```sh
chmod 600 "${MISE_CONFIG_DIR:-$HOME/.config/mise}/github_tokens.toml"
```

## gh CLI 集成

如果你使用 [GitHub CLI](https://cli.github.com/)（`gh`），mise 可以直接从其 `hosts.yml` 配置文件中读取令牌。此功能默认启用，并在没有更高优先级来源解析出令牌时使用。

mise 会在以下位置查找 `hosts.yml`（按顺序匹配，先找到先使用）：

1. `$GH_CONFIG_DIR/hosts.yml`
2. `$XDG_CONFIG_HOME/gh/hosts.yml`（设置该变量时）
3. `~/Library/Application Support/gh/hosts.yml`（仅限 macOS）
4. `%APPDATA%\GitHub CLI\hosts.yml`（仅限 Windows——这是 gh 在 Windows 上的默认位置）
5. `~/.config/gh/hosts.yml`

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

在你的**全局**设置中配置自定义命令以获取 GitHub 令牌。`github.credential_command` 仅限全局设置；项目不能选择用于读取凭据的命令。例如：

```toml [~/.config/mise/config.toml]
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
mise settings set github.credential_command="\"$(mise which ghtkn)\" get -m 1h"
```

不要让凭据命令运行 `mise x`、`mise exec`，或其他可能需要 GitHub 访问权限来解析或安装 `ghtkn` 的命令，因为这可能会在 mise 尝试获取 GitHub token 时形成循环。

如果 `ghtkn` 已经可以在不依赖 mise shim 的情况下直接使用，你也可以直接这样设置：

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = "ghtkn get -m 1h"
```

使用 `mise token github` 来确认 mise 能够解析该 token：

```sh
mise token github
```

## 原生 GitHub OAuth

mise 可以通过 GitHub 的 OAuth 设备流直接创建短期有效的 GitHub App 用户访问令牌。这不需要个人访问令牌、GitHub App 私钥、应用客户端密钥、`gh`、`ghtkn` 或任何其他外部凭据命令。

该设计受 [ghtkn](https://github.com/suzuki-shunsuke/ghtkn) 启发——如果你更愿意运行一个独立进程，并让 mise 通过 `credential_command` 获取其令牌，请参阅上方的[使用 ghtkn](#using-ghtkn)。

创建一个启用了设备流的 GitHub App，然后配置其客户端 ID：

```sh
mise settings set github.oauth_client_id=Iv1.yourgithubappclientid
```

授权一次：

```sh
mise token github --oauth
```

之后，mise 会重用缓存的令牌进行自身的 GitHub API 调用，并在 GitHub 返回刷新令牌时刷新它。在缓存的令牌有效期间，mise 还会将其作为 `GITHUB_TOKEN` 导出到 shell（通过 `mise activate` / `mise hook-env` / `mise env` / `mise exec`），这样读取 `GITHUB_TOKEN` 的工具（例如 `gh`）就可以使用它：

```sh
mise exec -- gh pr list
```

mise 不会替换导出变量的现有值。Git 凭据助手和 Cargo registry 身份验证各自有独立的配置；导出 `GITHUB_TOKEN` 不会自动配置它们。

要使用其他变量名（例如 `gh` 偏好的 `GH_TOKEN`），请设置 `github.oauth_export_env`。将其设置为空字符串可禁用自动导出。

在需要将原始令牌直接传递到某处时，你仍然可以显式输出原始令牌：

```sh
mise token github --oauth --raw
```

原始形式会打印机密信息。仅当其他命令需要令牌值时才使用它；普通诊断会对令牌进行遮罩。将该值复制到 `MISE_GITHUB_TOKEN` 也会使这个环境值优先于未来的 OAuth 解析。

更改 GitHub App 的权限或安装访问权限后，请请求一个新令牌：

```sh
mise token github --oauth --refresh
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
- **macOS/Windows**，其中 `gh auth login` 会将令牌存储在系统钥匙串中（macOS 钥匙串、Windows 凭据管理器），而不是存储在 `hosts.yml` 中。在这种情况下，`hosts.yml` 虽然存在，但没有 `oauth_token` 键，因此读取它无法提供帮助。运行 `mise token github` 可以帮助区分这两种情况：如果它输出 `(none)`，而 `gh auth status` 可以正常工作，那么你需要启用此设置，或者使用一个调用 gh 的 `github.credential_command`。

  如果只有一个账户，`credential_command = "gh auth token"` 就足够了。如果你登录了多个主机（GitHub Enterprise），请传入 mise 当前请求的主机，因为直接运行 `gh auth token` 会返回 gh 自身当前活动主机的令牌。mise 会将其导出为 `MISE_CREDENTIAL_HOST`，并通过平台的内联 shell 运行该命令，因此插值方式有所不同：

  在 macOS 和 Linux 上：

  ```toml [~/.config/mise/config.toml]
  [settings.github]
  credential_command = 'gh auth token --hostname "$MISE_CREDENTIAL_HOST"'
  ```

  在 Windows 上，`cmd` 是默认的内联 shell，不会展开 `$VAR`：

  ```toml [~/.config/mise/config.toml]
  [settings.github]
  credential_command = 'gh auth token --hostname %MISE_CREDENTIAL_HOST%'
  ```

- 任何已经配置好 git 凭据的环境

mise 会使用 `GIT_TERMINAL_PROMPT=0` 运行 `git credential fill`（以防止交互式提示），并在会话期间按主机缓存结果。

要启用此行为：

```toml
[settings.github]
use_git_credentials = true
```

## 调试 Token 解析

使用遮罩后的输出来区分配置问题和 API 故障：

```sh
mise token github
mise token github github.mycompany.com
```

| 结果或症状                                           | 检查事项                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 选择了意外的环境变量                                 | 在进程环境中删除或更正该覆盖值；不会查询低优先级来源                                                      |
| `(none)`，但 `gh auth status` 正常工作                | gh 可能使用系统密钥环；配置按主机区分的凭据命令，或选择启用 git 凭据助手                                 |
| 选中了令牌，但无法访问仓库                            | 检查仓库访问权限、令牌有效期、组织授权和 API 主机                                                          |
| GitHub 返回 `403` 或 `429`                            | 检查响应中的速率限制详情；`403` 也可能是权限失败                                                           |
| OAuth 刷新被拒绝                                      | 检查已配置的 GitHub App 客户端 ID，并在更正后请求 `mise token github --oauth --refresh`                     |

`mise token github --unmask` 和 `--raw` 会显示凭据。识别凭据来源不需要使用它们，也不应将其包含在共享的诊断日志中。

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

如果不同的 GHE 实例需要不同的令牌，则一个 `MISE_GITHUB_ENTERPRISE_TOKEN` 值无法表示它们。请改用 `github_tokens.toml`、gh CLI 集成、`credential_command` 或 git 凭据助手：

```sh
gh auth login --hostname github.mycompany.com
gh auth login --hostname github.other-company.com
```

## 使用锁定文件减少 API 请求 {#avoiding-tokens-entirely-with-lockfiles}

当[锁定文件](/dev-tools/mise-lock.html)记录了所需的制品 URL 和校验和时，可以避免发布发现请求：

```sh
mise lock
mise install
```

这会减少公开下载对令牌的要求。但它不会使私有制品公开，也不能保证离线安装。缺少的平台元数据、来源验证和 Packslip 策略检查仍然可能需要网络访问或身份验证。即使使用锁定文件，也请确保 CI 中提供所需的凭据。

## CI / GitHub Actions

GitHub 通过 `secrets.GITHUB_TOKEN` 和 `github.token` 上下文提供工作流令牌。要使其可用于运行 mise 的 shell 命令，请将其作为环境变量传入：

```yaml
# Step after checkout and mise setup
- name: Install development tools
  run: mise install
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

[`jdx/mise-action`](https://github.com/jdx/mise-action) 有自己的令牌输入和安装步骤。使用它而不是单独的 `run` 步骤时，请检查该 action 的配置。

工作流令牌的权限和仓库范围仍然适用。访问另一个仓库中的私有工具可能需要 GitHub App 令牌或有权访问该仓库的个人访问令牌，并将其存储为 Actions secret。请参阅 [GitHub 的工作流身份验证指南](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)。

## .netrc

mise 也支持用于 HTTP Basic 认证的 `.netrc`。来自 `.netrc` 的凭据优先于基于 token 的认证头。有关详细信息，请参见 [URL 替换](/url-replacements.html)。
