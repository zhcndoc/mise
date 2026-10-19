---
description: "设置 GitHub、GitLab 和 Forgejo 令牌，以访问私有发行版、自托管实例并提高 API 速率限制。"
socialDescription: "设置 GitHub、GitLab 和 Forgejo 令牌，以访问私有发行版并提高 API 速率限制。"
---

# GitHub、GitLab 和 Forgejo 令牌

mise 会通过 [mise-versions](https://mise-versions.jdx.dev) 读取公开的 GitHub 发行版元数据，因此大多数安装不需要令牌。以下情况需要设置令牌：mise 直接调用代码托管服务的 API，例如访问私有仓库、GitHub Enterprise、自托管的 GitLab 和 Forgejo 主机，或 GitHub 匿名请求达到速率限制并返回 `403 Forbidden`。

当 mise-versions 无法响应（例如超时、连接中断，或返回 `429`、`5xx`）时，mise 也会直接调用 GitHub API；[`use_versions_host`](/configuration/settings.html#use_versions_host) 为 `false` 时也一样。没有令牌时，这些调用会共享 GitHub 较低的[匿名速率限制](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)。

## 设置令牌

在运行 mise 的环境中导出令牌：

```sh
export MISE_GITHUB_TOKEN="ghp_xxxxxxxxxxxx"     # GitHub
export MISE_GITLAB_TOKEN="glpat-xxxxxxxxxxxx"   # GitLab
export MISE_FORGEJO_TOKEN="xxxxxxxxxxxx"        # Forgejo and Codeberg
```

GitHub 令牌可以在此处创建：[个人访问令牌](https://github.com/settings/tokens)。经典令牌访问公开发行版时无需任何 scope。访问私有仓库时，请授予令牌该仓库的访问权限；细粒度令牌还需要 Contents: read 权限，才能[下载发行版资源](https://docs.github.com/en/rest/releases/assets#get-a-release-asset)。除非存在优先级更高的来源，已有的 `GITHUB_TOKEN` 也可使用；参见[令牌优先级](#token-priority)。

请将真实令牌保存在密钥管理器或 CI 的密钥存储中。如果已经通过 `gh`、`glab` 或 `fj` 登录，mise 可以读取这些工具保存的令牌，可能无需额外设置；参见 [CLI 登录](#cli-logins)。

## 检查 mise 使用的令牌

[`mise token`](/cli/token.html) 会显示 mise 将发送给某个主机的令牌及其来源，并隐藏令牌内容：

```sh
mise token github
mise token gitlab gitlab.mycompany.com
mise token forgejo
```

```text
github.com: ghp_…1234 (source: GITHUB_TOKEN)
```

如果不指定主机名，这些命令会检查 `github.com`、`gitlab.com` 和 `codeberg.org`。`(none)` 表示没有来源为该主机提供令牌。找到令牌不代表它一定有权访问目标仓库；如果安装仍然失败，请检查令牌的访问权限、有效期和组织授权。

`--unmask` 和 `mise token github` 的 `--raw` 会输出密钥本身。查找令牌来源时不需要使用它们，因此请勿将输出写入共享日志。

## 令牌来源

### 环境变量

每种代码托管服务都会按[优先级表](#token-priority)中第 1、2 行的顺序读取变量。Enterprise 变量仅适用于 `github.com`、`gitlab.com` 和 `codeberg.org` 以外的主机；其他变量适用于所有主机，包括未设置 Enterprise 变量时的 Enterprise 主机。mise 本身不会读取 `GH_TOKEN`，但可以通过 `gh auth token` [凭据命令](#credential-command)读取。工具安装时，也可以通过该工具的 `install_env` 设置这些变量。

### 令牌文件

仅供 mise 读取的逐主机令牌可以放在 mise 配置目录（`~/.config/mise` 或 `MISE_CONFIG_DIR`）下的 `github_tokens.toml`、`gitlab_tokens.toml` 或 `forgejo_tokens.toml` 文件中：

```toml [~/.config/mise/github_tokens.toml]
[tokens."github.com"]
token = "ghp_xxxxxxxxxxxx"

[tokens."github.mycompany.com"]
token = "ghp_yyyyyyyyyyyy"
```

GitLab 和 Forgejo 文件使用相同结构，以 `gitlab.com` 和 `codeberg.org` 等主机名作为键。以下情况可以使用令牌文件：不使用服务提供方的 CLI；CLI 令牌对 mise 的权限范围太窄（例如云开发环境中的组织级令牌）；或者希望令牌只供 mise 读取。这些文件以明文保存凭据，因此请勿将其放入共享配置，并确保只有你本人可以读取：

```sh
chmod 600 "${MISE_CONFIG_DIR:-$HOME/.config/mise}/github_tokens.toml"
```

### CLI 登录

mise 可以直接读取代码托管服务 CLI 保存的令牌，而不会运行这些 CLI：

| CLI                                                    | 文件         | 关闭此功能的设置                                                                       |
| ------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------- |
| [gh](https://cli.github.com/)                          | `hosts.yml`  | [`github.gh_cli_tokens = false`](/configuration/settings.html#github.gh_cli_tokens)     |
| [glab](https://gitlab.com/gitlab-org/cli)              | `config.yml` | [`gitlab.glab_cli_tokens = false`](/configuration/settings.html#gitlab.glab_cli_tokens) |
| [fj](https://codeberg.org/forgejo-contrib/forgejo-cli) | `keys.json`  | [`forgejo.fj_cli_tokens = false`](/configuration/settings.html#forgejo.fj_cli_tokens)   |

这些 CLI 会按主机分别保存令牌，因此只需对每个 GitHub Enterprise 主机各运行一次 `gh auth login --hostname <host>`，mise 就能通过它们进行身份验证。

mise 会在 CLI 保存文件的位置查找，并使用找到的第一个文件：

- `gh`：先查找 `$GH_CONFIG_DIR/hosts.yml`，然后查找 `$XDG_CONFIG_HOME/gh/hosts.yml`（如果设置了该变量），再查找 macOS 上的 `~/Library/Application Support/gh/hosts.yml` 或 Windows 上的 `%APPDATA%\GitHub CLI\hosts.yml`，最后查找 `~/.config/gh/hosts.yml`。
- `glab`：先查找 `$GLAB_CONFIG_DIR/config.yml`，然后查找 `~/.config/glab-cli/config.yml`（glab 的旧路径；如果此文件存在，glab 仍会优先使用它），再查找 `$XDG_CONFIG_HOME/glab-cli/config.yml`，最后查找 macOS 上的 `~/Library/Application Support/glab-cli/config.yml` 或 Windows 上的 `%LOCALAPPDATA%\glab-cli\config.yml`。
- `fj`：先查找 `$XDG_DATA_HOME/forgejo-cli/keys.json`（默认路径为 `~/.local/share/forgejo-cli/keys.json`），然后查找 macOS 上的 `~/Library/Application Support/forgejo-cli.forgejo-cli/keys.json` 和旧路径 `~/Library/Application Support/Cyborus.forgejo-cli/keys.json`。

#### 如果 gh 将令牌保存在系统钥匙串中 {#gh-keyring}

在 macOS 和 Windows 上，`gh auth login` 通常会将令牌保存在系统钥匙串（macOS Keychain、Windows Credential Manager）中，而不是 `hosts.yml`，因此 mise 无法从文件读取令牌。这时 `gh auth status` 虽然成功，`mise token github` 却会显示 `(none)`。可以在全局配置中设置[凭据命令](#credential-command)，让 mise 向 gh 获取令牌：

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = 'gh auth token --hostname "$MISE_CREDENTIAL_HOST"'
```

在 Windows 上，默认的内联 shell 是 `cmd`，不会展开 `$VAR`：

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = 'gh auth token --hostname %MISE_CREDENTIAL_HOST%'
```

如果登录了多个主机，必须传入主机名；直接运行 `gh auth token` 只会返回 gh 当前活动主机的令牌。如果只使用一个 github.com 账户，设置 `credential_command = "gh auth token"` 即可。另一种方式是使用 [Git 凭据助手](#git-credential-helpers)。

### 凭据命令

凭据命令会将令牌打印到标准输出，供 mise 读取，因此可以从密码管理器或其他工具获取令牌。请在全局配置中设置；`credential_command` 仅能用于全局配置，项目不能指定读取你凭据的命令：

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = "op read 'op://Private/GitHub Token/credential'"

[settings.gitlab]
credential_command = "op read 'op://Private/GitLab Token/credential'"
```

Forgejo 对应的设置是 [`forgejo.credential_command`](/configuration/settings.html#forgejo.credential_command)。mise 会使用默认的内联 shell 运行命令（[`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)，Windows 上则使用 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)），并将去掉首尾空白的输出作为令牌。命令会收到 `MISE_CREDENTIAL_HOST`（主机名）和 `MISE_CREDENTIAL_PROVIDER`（`github`、`gitlab` 或 `forgejo`）环境变量。运行时，mise 会从 `PATH` 中移除自己的 shims、设置 `GIT_TERMINAL_PROMPT=0`，并关闭标准输入；每条 mise 命令对每台主机最多调用一次。如果命令出错或没有输出，mise 会继续查找下一个来源。

::: warning 计划弃用
兼容 sh 的 shell（`ash`、`bash`、`dash`、`ksh`、`sh` 和 `zsh`）还会将主机名作为 `$1` 传入。该参数已弃用，请改用 `MISE_CREDENTIAL_HOST`。mise 将从 2026.11.0 开始发出警告，并在 2027.11.0 中移除 `$1`。
:::

#### 使用 ghtkn

[ghtkn](https://github.com/suzuki-shunsuke/ghtkn) 会创建短期有效的 GitHub App 用户访问令牌并打印到标准输出，因此可以作为 GitHub 凭据命令使用。请先手动运行一次 `ghtkn get`，以便在合适的时间完成浏览器设备授权流程。之后，ghtkn 会从操作系统的密钥存储中重用令牌，直到令牌需要续期。

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = "ghtkn get -m 1h"
```

由于运行命令时 mise 的 shims 不在 `PATH` 中，如果 ghtkn 是由 mise 安装的，就需要使用它的真实路径。通过 `mise which ghtkn` 查看路径，并填入命令：

```toml [~/.config/mise/config.toml]
[settings.github]
credential_command = "/path/printed/by/mise-which/ghtkn get -m 1h"
```

`mise which` 返回某个已安装版本目录中的路径，因此升级 ghtkn 后需要更新该设置；也可以在 mise 之外安装 ghtkn。不要让该命令运行 `mise exec` 或其他可能需要 GitHub 访问权限才能安装 ghtkn 的操作，否则 mise 获取令牌时可能陷入循环。请使用 `mise token github` 检查结果。

### 原生 GitHub OAuth

mise 可以直接通过 GitHub OAuth 设备流程创建短期有效的 GitHub App 用户访问令牌，无需个人访问令牌、应用私钥或密钥，也无需外部命令。创建一个启用了设备流程的 GitHub App，然后配置其 client ID 并授权一次：

```sh
mise settings github.oauth_client_id=Iv1.yourgithubappclientid
mise token github --oauth
```

mise 会将令牌缓存在状态目录中，用于自身的 GitHub API 调用；如果 GitHub 同时签发了刷新令牌，mise 也会据此刷新访问令牌。修改 GitHub App 的权限或安装访问权限后，请重新申请令牌：

```sh
mise token github --oauth --refresh
```

只要缓存中存在可用或可刷新的令牌，mise 也会通过 `mise activate`、`mise hook-env`、`mise env` 和 `mise exec` 将其导出为 `GITHUB_TOKEN`，供 `gh` 等工具使用：

```sh
mise exec -- gh pr list
```

该 shell 中运行的每个程序，包括项目任务和脚本，都可以读取导出的令牌。mise 的 `[env]` 中设置的值优先，但 shell 中已有的值（例如个人 `GITHUB_TOKEN`）会被替换。可将 [`github.oauth_export_env`](/configuration/settings.html#github.oauth_export_env) 设置为其他变量名（例如 `GH_TOKEN`），或设为 `""`，以保留 shell 中原有的值并仅将令牌用于 mise。导出令牌不会配置 Git 凭据助手或 Cargo registry 身份验证。

`mise token github --oauth --raw` 会输出令牌，供需要令牌值的命令使用。如果将令牌复制到 `MISE_GITHUB_TOKEN`，此后该变量的优先级会高于 OAuth。

以下 OAuth 设置示例使用了非默认值：

```toml [~/.config/mise/config.toml]
[settings.github]
oauth_client_id = "Iv1.yourgithubappclientid"
oauth_open_browser = false       # do not open a browser; use the printed URL
oauth_copy_code = true          # always copy the device code (unset: ask in a terminal)
oauth_export_env = "GH_TOKEN"    # or "" to turn off the export
```

使用 GitHub App 时，请将 [`github.oauth_scopes`](/configuration/settings.html#github.oauth_scopes) 留空：用户令牌的访问权限来自应用自身的权限和安装范围。

#### 避免将刷新令牌写入缓存文件

缓存文件中包含有效期为 8 小时的访问令牌和有效期为 6 个月的刷新令牌。文件权限为 `0600`，可以阻止其他用户读取，但不能阻止以你身份运行的其他程序访问。若要将刷新令牌改存在密码管理器或钥匙串中，请为 mise 分别配置读取和写入命令：

```toml [~/.config/mise/config.toml]
[settings.github]
oauth_cache_get = "pass show mise/github-oauth"
oauth_cache_set = "pass insert -m -f mise/github-oauth"
```

`oauth_cache_set` 会从标准输入接收值，`oauth_cache_get` 则将其打印出来；mise 不会解析该值，因此任何支持保存多行密钥的工具都可用，包括 `op`、`bw` 和 fnox。GitHub 每次刷新时都会轮换刷新令牌，因此这两个命令都必须设置。这两项只能配置为全局设置，项目的 `mise.toml` 无法设置它们。

你授权时以及刷新令牌轮换时，mise 会通过 `oauth_cache_set` 写入刷新令牌；大约每 8 小时访问令牌需要刷新时，会通过 `oauth_cache_get` 读取令牌。它们不会在每次 mise 调用时运行。如果 mise 需要刷新时 `oauth_cache_get` 失败（例如密码库已锁定），mise 会跳过刷新并保留缓存的令牌；首次保存令牌时，如果条目尚不存在，该命令也可能失败。每条命令最多运行 60 秒。如果 `oauth_cache_set` 失败，mise 会发出警告，并将新的刷新令牌保留在缓存文件中，以免丢失。缓存文件中已有的刷新令牌会在下一次刷新时移入存储。

##### 在 macOS 上使用 Touch ID

在配备 Touch ID 的 Mac 上，mise 可以直接将刷新令牌保存在 Secure Enclave 中：

```toml [~/.config/mise/config.toml]
[settings.github]
oauth_cache_secure_enclave = true
```

刷新令牌随后会密封在安全区域中，每次刷新都需要通过指纹解封。此功能要求使用官方发行版二进制文件；Homebrew 和源码构建会显示警告，并将令牌留在缓存文件中。如果取消提示，或在不支持 Touch ID 的 SSH 会话中运行，mise 会跳过刷新并保留缓存的令牌。其他平台（包括 Linux、WSL 和 Windows）可通过 `oauth_cache_get` 和 `oauth_cache_set` 配合 `pass`、`secret-tool`、1Password、`cmdkey` 或平台提供的其他存储工具使用。

### Git 凭据助手

启用 `use_git_credentials` 后，mise 会将 `git credential fill` 作为最后一个令牌来源，并在该命令的剩余执行期间按主机缓存结果。适用于 devcontainer 等 Git 已经有凭据的环境，例如凭据由钥匙串助手管理：

```toml [~/.config/mise/config.toml]
[settings.github]
use_git_credentials = true

[settings.gitlab]
use_git_credentials = true

[settings.forgejo]
use_git_credentials = true
```

mise 会以 `GIT_TERMINAL_PROMPT=0` 运行 Git，因此 Git 不会暂停并在终端中询问密码。

## 令牌优先级

mise 会按以下顺序检查来源，并使用找到的第一个令牌：

| 顺序  | GitHub                                                            | GitLab                                                       | Forgejo                                                         |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| 1     | `MISE_GITHUB_ENTERPRISE_TOKEN`（除 github.com 外的主机）          | `MISE_GITLAB_ENTERPRISE_TOKEN`（除 gitlab.com 外的主机）      | `MISE_FORGEJO_ENTERPRISE_TOKEN`（除 codeberg.org 外的主机）      |
| 2     | 依次为 `MISE_GITHUB_TOKEN`、`GITHUB_API_TOKEN`、`GITHUB_TOKEN`   | 依次为 `MISE_GITLAB_TOKEN`、`GITLAB_TOKEN`                   | 依次为 `MISE_FORGEJO_TOKEN`、`FORGEJO_TOKEN`                    |
| 3     | `github.credential_command`                                       | `gitlab.credential_command`                                  | `forgejo.credential_command`                                    |
| 4     | 原生 OAuth，适用于 `github.oauth_api_url` 的主机                  |                                                              |                                                                 |
| 5     | `github_tokens.toml`                                              | `gitlab_tokens.toml`                                         | `forgejo_tokens.toml`                                           |
| 6     | gh 的 `hosts.yml`                                                 | glab 的 `config.yml`                                         | fj 的 `keys.json`                                               |
| 7     | 启用时使用 `git credential fill`                                  | 启用时使用 `git credential fill`                             | 启用时使用 `git credential fill`                                |

如果优先级较高的来源提供了错误或过期的令牌，后续来源中可用的令牌也会被遮蔽，因为 mise 找到第一个令牌后就会停止查找。

令牌按主机查找。`api.github.com` 和 `raw.githubusercontent.com` 使用 `github.com` 的令牌，因此令牌文件和 CLI 登录都应使用 `github.com` 作为键。GitLab 和 Forgejo 令牌只会发送到工具 `api_url` 的源站。

## GitHub Enterprise 和自托管主机 {#github-enterprise}

使用 [`api_url`](/dev-tools/backends/github.html#api-url) 工具选项，指定实例的 API 地址：

```toml [mise.toml]
[tools]
"github:myorg/mytool" = { version = "latest", api_url = "https://github.mycompany.com/api/v3" }
"gitlab:myorg/mytool" = { version = "latest", api_url = "https://gitlab.mycompany.com/api/v4" }
"forgejo:myorg/mytool" = { version = "latest", api_url = "https://forgejo.mycompany.com/api/v1" }
```

mise 会根据 `api_url` 的主机查找令牌，本例中分别为 `github.mycompany.com`、`gitlab.mycompany.com` 和 `forgejo.mycompany.com`。未设置 `api_url` 时，Forgejo 后端会使用 Codeberg。对于具有数据驻留功能的 GitHub Enterprise Cloud（`api.<name>.ghe.com`），令牌文件中应使用 `<name>.ghe.com` 作为键。

`MISE_GITHUB_TOKEN` 和其他通用变量也适用于 Enterprise 主机。若要为 github.com 和 Enterprise 主机使用不同令牌，请设置 `MISE_GITHUB_ENTERPRISE_TOKEN` 或使用按主机配置的来源。单个 Enterprise 变量不能用于多个需要不同令牌的实例；这种情况请改用令牌文件、CLI 登录、凭据命令或 Git 凭据助手：

```sh
gh auth login --hostname github.mycompany.com
gh auth login --hostname github.other-company.com
```

对于支持设备流程的 Enterprise 实例，如需使用原生 OAuth，还要设置 [`github.oauth_auth_url`](/configuration/settings.html#github.oauth_auth_url) 和 [`github.oauth_api_url`](/configuration/settings.html#github.oauth_api_url)。其他选项参见 [github](/dev-tools/backends/github.html)、[gitlab](/dev-tools/backends/gitlab.html) 和 [forgejo](/dev-tools/backends/forgejo.html) 后端文档。

## GitHub Actions 和其他 CI {#ci-github-actions}

GitHub Actions 会通过 `secrets.GITHUB_TOKEN` 提供工作流令牌。[`jdx/mise-action`](https://github.com/jdx/mise-action) 默认通过 `github_token` 输入将其传给 mise，并且只在该 action 中使用，除非设置 `persist_github_token`。如果后续步骤也要运行 mise，请通过环境变量传入令牌：

```yaml
- uses: jdx/mise-action@v5
- name: Run tests
  run: mise run test
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

工作流令牌仍受其权限和仓库范围限制。若要安装另一个仓库中的私有工具，需要使用有权访问该仓库的 GitHub App 令牌或个人访问令牌，并将其保存在 Actions 密钥中；传给 action 时使用 `github_token`，传给后续步骤时使用 `MISE_GITHUB_TOKEN`。参见 GitHub 的[工作流身份验证指南](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)。

在其他 CI 系统中，请将令牌保存为密钥，并通过 `MISE_GITHUB_TOKEN`、`MISE_GITLAB_TOKEN` 或 `MISE_FORGEJO_TOKEN` 暴露给 mise。

## 故障排查

先运行 [`mise token`](#check-which-token-mise-uses)，查看 mise 选择了哪个令牌来源。

| 现象                                                       | 检查内容                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 令牌来源是意料之外的环境变量                               | 在运行 mise 的环境中移除或修复该变量；找到令牌后，mise 不会再检查优先级较低的来源                                       |
| `gh auth status` 成功，但显示 `(none)`                     | gh 将令牌保存在系统钥匙串中；参见[钥匙串说明](#gh-keyring)                                                             |
| 找到了令牌，但无法访问仓库                                 | 检查令牌的仓库访问权限、有效期、组织授权和 API 主机                                                                     |
| GitHub 返回 `403` 或 `429`                                 | 查看响应中的速率限制详情；`403` 也可能表示权限不足。参见[错误说明](/errors.html#http-403)                              |
| 自托管 GitLab 或 Forgejo 主机未使用令牌                    | 检查工具的 `api_url`；mise 按其主机查找令牌，并且只会将令牌发送到对应源站                                               |
| OAuth 刷新被拒绝                                           | 检查 GitHub App client ID；修复后运行 `mise token github --oauth --refresh`                                              |

## 使用锁定文件减少 API 请求 {#avoiding-tokens-entirely-with-lockfiles}

记录了制品 URL 和校验和的[锁定文件](/dev-tools/mise-lock.html)可让后续安装跳过发行版查找：

```sh
mise lock
mise install --locked
```

这会减少 mise 为下载公开制品而使用令牌的次数，但不会将私有制品变成公开制品，也不能保证离线安装：平台条目缺失、来源证明验证和 packslip 策略检查仍可能需要网络或令牌。即使使用锁定文件，也请确保 CI 所需的凭据仍然可用。

## netrc 凭据 {#netrc}

mise 也会从 `~/.netrc` 中读取 HTTP Basic 身份验证凭据（Windows 上优先读取 `%USERPROFILE%\_netrc`），例如用于 Artifactory 镜像。它是备用凭据来源：mise 已附加到请求中的令牌优先。例外情况是[替换 URL](/url-replacements.html) 将请求发送到了另一个主机；此时 mise 会丢弃原主机的凭据，并使用与新主机匹配的 netrc 凭据。可通过 [`netrc`](/configuration/settings.html#netrc) 关闭此功能，或通过 [`netrc_file`](/configuration/settings.html#netrc_file) 选择其他文件。
