---
description: 从经过签名的 packslip 发行版安装工具，验证发布者和校验和，并获取与工具版本匹配的补全和技能。
socialDescription: 从经过签名验证的 packslip 发行版安装工具。
---

# packslip 后端

`packslip:` 后端会安装发布者使用 [packslip](https://packslip.dev) 签名的发行版清单中的工具。mise 会验证发布者和下载内容、选择适用于当前平台的构建，并安装其中的可执行文件。mise 已内置此功能，因此不需要安装 `packslip` CLI。

发布者会为一份 **manifest（清单）** 签名，其中列出每个可下载的构建产物（**artifact**）及其摘要。清单及其签名证据会一起组成 **bundle**。发行版还可以声明该工具的 man 手册页、shell 补全和智能体技能。

当工具发布者使用 packslip 为其发行版签名时，请使用此后端；注册表已为这些工具优先选择 packslip。其他工具可以使用 [aqua](/dev-tools/backends/aqua.html)、[GitHub](/dev-tools/backends/github.html) 或其他[后端](/dev-tools/backends/)。背景介绍参见 [packslip 简介](https://jdx.dev/posts/2026-09-05-introducing-packslip/)。

## 快速开始 {#usage}

在项目中安装 [hk](https://hk.jdx.dev)，这是一个 Git 钩子和 lint 管理工具：

```sh
mise use packslip:github.com/jdx/hk
mise exec -- hk --version
```

`mise use` 会安装 hk 并将其添加到项目的 `mise.toml` 中：

```toml
[tools]
"packslip:github.com/jdx/hk" = "latest"
```

如果你直接编辑 `mise.toml`，请运行 `mise install`。要在所有目录中安装 hk，请使用 `mise use -g packslip:github.com/jdx/hk`。对于 hk 1.58.1 及更新版本，注册表简写 `mise use hk` 会选择此后端。

## 项目标识符 {#project-names-and-discovery}

在 `packslip:` 后写入项目的主机名和路径，不需要 `https://`。GitHub 项目可以省略主机名：`packslip:jdx/hk` 与 `packslip:github.com/jdx/hk` 指向同一项目。

| 标识符                                       | 来源                              |
| -------------------------------------------- | --------------------------------- |
| `packslip:github.com/owner/repo`             | GitHub 仓库的发布内容             |
| `packslip:github.com/owner/repo/tools/mytool` | GitHub monorepo 中的一个工具       |
| `packslip:tool.example.com`                  | 发布者托管的签名发布列表           |
| `packslip:example.com/tools/mytool`          | 发布者域名上的一个工具             |

项目必须发布 packslip 清单。此后端不会根据发行版文件名猜测安装方式。GitHub 项目有内置的发行版发现机制和签名者身份规则；其他主机需要已签名的发行版列表和明确的[签名者配置](#pubkey)。bundle 文件名、发现 URL 和 monorepo 身份规则参见[项目发现](/dev-tools/packslip-verification.html#project-discovery)。

### 私有 GitHub 仓库 {#private-repositories}

私有仓库可以使用与 `github:` 后端相同的 [GitHub 凭据](/dev-tools/github-tokens.html)，例如 `MISE_GITHUB_TOKEN`、`github.credential_command`，或 gh 的 `hosts.yml` 中的令牌。无需额外配置：

```toml [mise.toml]
[tools]
"packslip:github.com/my-org/internal-cli" = "latest"
```

GitHub 只通过 API 提供私有仓库的发行版资源，不会提供清单中记录的 `github.com/.../releases/download/...` URL。因此，如果下载失败，mise 会使用你的令牌通过 API 重试。令牌只用于传输文件。签名、项目身份、签名者连续性和构建产物摘要检查都不会改变；mise 也绝不会从已签名清单中读取凭据。

## 版本

列出可用版本或指定一个版本：

```sh
mise ls-remote packslip:github.com/jdx/hk
mise use packslip:github.com/jdx/hk@2.5.0
```

只有包含 packslip 清单的发行版才会列出。hk 1.58.1 之前的版本会由注册表简写使用 aqua 后端，因此 `mise use hk@1.57.0` 仍然有效；也可以通过 `mise use aqua:jdx/hk@1.57.0` 直接指定 aqua。

packslip 格式要求使用语义化版本，其中也包括 `2026.9.1` 这样的日期版本。除非启用 [`prerelease`](#prerelease) 工具选项或全局 [`prereleases`](/configuration/settings.html#prereleases) 设置，否则不会包含预发布版本。

[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 同样适用，因此在指定时间窗口内发布的版本暂不会提供。等待期间仍可安装精确指定的版本（例如 `hk@2.5.0`）或已记录在 `mise.lock` 中的版本；只有 `latest` 或 `2` 等请求会被暂缓。参见[最低发行版等待时间](/security.html#minimum-release-age)。

### 如何选择 `latest` {#latest}

如果发布者提供了已签名的版本推荐，`latest` 会优先采用该推荐；其次使用 GitHub 的最新发行版；最后选择符合条件的最高版本。每个候选版本都必须通过验证和策略检查。关于撤回、回退和离线行为，参见[版本解析](/dev-tools/packslip-verification.html#version-resolution)。

### 复现安装

一旦发布者推荐了新版本，`latest` 请求就可能解析到该版本。要确保团队使用相同发行版，请生成锁定文件并与 `mise.toml` 一起提交：

```sh
mise lock
git add mise.toml mise.lock
```

[`mise lock`](/cli/lock.html) 会验证发行版，并为每个目标平台记录版本、构建产物 URL 和校验和、签名者以及代码托管服务的仓库 ID，但不会安装任何内容。使用 `mise lock --platform` 选择平台。请用此命令创建锁定文件：除非 [`lockfile`](/configuration/settings.html#lockfile) 设置为 `true`，否则 `mise install` 只会更新已有的 `mise.lock`，不会创建该文件。

之后，团队成员和 CI 会精确安装锁定文件中记录的版本：

```sh
mise install --locked
```

安装时仍需要获取构建产物或可用的缓存副本，并且必须通过当前验证策略。目标平台和更新方法参见[锁定文件（mise.lock）](/dev-tools/mise-lock.html)。

## 补全、man 手册页和技能 {#completions}

<span id="skills"></span><span id="resource-selection-and-command-execution"></span>

发行版可以声明 shell 补全、man 手册页和智能体技能；这些资源会随每个项目中启用的工具版本切换。启用 [mise](/shell-setup.html) 后，输入 `hk` 并按 Tab 键即可补全其命令。工具附带 man 手册页时，运行 `man <tool>` 会打开当前版本对应的页面。要将工具技能链接到智能体读取的位置，请运行 `mise skills sync --dir .agents/skills`。关于无需激活 shell 的配置方式、自动技能链接以及 mise 何时运行发布者命令，参见 [man 手册页、补全和技能](/dev-tools/packslip-resources.html)。

## 验证 {#what-is-verified}

解压发行版前，mise 会验证发布者的签名、所请求的项目和版本，以及所选下载文件的摘要和大小。签名者必须符合项目名称隐含的身份，或你配置的公钥。mise 还会检查此前接受的签名者、`mise.lock` 中的约束，以及适用的发行版等待时间和盖章策略。经过验证的清单会以 `.mise-packslip.json` 的名称保存在安装目录中。

验证可以确认发行版的发布者身份，以及下载的字节与其签名内容相符，但无法确认软件本身安全。mise 会记录清单是否链接到构建来源证明，但不会获取或验证该证明。参见[验证检查](/dev-tools/packslip-verification.html#verification-checks)。

### 签名者变更 {#pinned-signers}

mise 会在本地状态中记住每个项目已接受的签名者，与 SSH 记住主机的方式类似；[`mise.lock`](/dev-tools/mise-lock.html) 也可以将相同约束传递到其他机器。若发行版由不同签名者签署，mise 会拒绝安装。要查看此机器记住的签名者：

```sh
mise packslip pins
mise packslip pins --json
```

项目宣布新的签名密钥或工作流时：

1. 在发布者的发行说明或公告中确认此项变更。
2. 如果为该工具设置了 `pubkey`、`identity`、`identity_prefix`、`workflow` 或 `list_identity_prefix`，请相应更新。
3. 重置此机器上的固定记录：

   ```sh
   mise packslip forget github.com/jdx/hk
   ```

4. 如果 `mise.lock` 记录了旧签名者，请删除该工具的条目并运行 `mise lock` 记录新签名者。
5. 检查并提交锁定文件更改。

`mise packslip forget` 也会重置项目记住的发行版列表状态，但不会更改盖章者列表状态。关于会被拒绝的更改，参见[签名者连续性](/dev-tools/packslip-verification.html#signer-continuity)。

### 重命名的仓库 {#renamed-repositories}

mise 会根据 GitHub 和 GitLab 项目的托管服务仓库 ID 固定项目身份，而不仅仅依赖名称。仓库重命名或转移后仍可继续安装，包括由新名称下的身份签署的发行版；mise 会使用新名称发出一次警告，请在方便时更新配置。固定记录和 `mise.lock` 中的约束会随仓库转移，因此无需运行 `mise packslip forget`。

若另一个仓库占用了旧名称，mise 会拒绝安装，因为被删除后由他人抢注的仓库看起来正是如此。错误消息会指出固定原仓库身份的记录：此机器上的固定记录、`mise.lock` 条目或两者。只有在项目确认由原项目重新创建了仓库后，才应清除错误消息中指出的记录（运行 `mise packslip forget` 或删除锁定文件条目）。

在没有固定记录和锁定文件条目的机器上首次安装时，mise 会信任当时拥有该名称的仓库，因此请提交 `mise.lock`。详情及限制参见[已重命名、已转移和重新创建的仓库](/dev-tools/packslip-verification.html#renamed-transferred-and-re-created-repositories)。

<a id="tool-options"></a>

## 工具选项

这些[工具选项](/dev-tools/#tool-options)适用于 `[tools]` 中的单个条目。`packslip.exec`、`packslip.stampers` 和 `skills.*` 设置则应放在 `[settings]` 中。

| 选项                                                                      | 默认值                         | 用途                                                         |
| ------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| [`variant`](#variant)                                                     | 无变体                         | 选择发布者声明的替代构建版本                                  |
| [`pubkey`](#pubkey)                                                       | 未设置                         | 固定 minisign 格式的公钥或公钥文件                            |
| [`identity`, `identity_prefix`, `issuer`](#identity-identity-prefix-issuer) | 从已识别的 forge 派生           | 设置预期的无密钥签名者和 OIDC 颁发者                         |
| [`workflow`](#workflow)                                                     | 仓库的任意工作流               | 固定在标签上为发布签名的仓库工作流                           |
| [`list_identity_prefix`](#list-identity-prefix)                           | 发布签名者策略                 | 为供应商发布列表固定不同的工作流                              |
| [`prerelease`](#prerelease)                                               | `false`                        | 包含预发布版本                                               |
| [`trust`](#trust)                                                         | 应用已配置的盖章者             | 使用 `"vendor"` 使此工具免于盖章要求                         |
| [`allow_unlogged`](#allow-unlogged)                                       | `false`                        | 接受没有透明度日志证据的密钥签名 bundle                       |
| [`ignore_requirements`](#ignore-requirements)                             | `false`                        | 即使已确认主机要求失败，也继续安装                            |

### `variant`

选择一个命名的替代构建版本，例如 `fips` 或 `baseline`。如果不设置此选项，mise 只会考虑没有变体的构建产物。发布者必须提供你请求的变体。

```toml
[tools]
"packslip:github.com/example/tool" = { version = "latest", variant = "fips" }
```

### `pubkey`

对于使用密钥签名的项目，请通过可信渠道获取发布者的公钥。将 `pubkey` 设置为 minisign 格式的公钥行，或其 `.pub` 文件的路径。发行版列表和 bundle 都必须通过该公钥验证。

```toml
[tools]
"packslip:tool.example.com" = { version = "latest", pubkey = "/path/to/vendor.pub" }
```

### `identity`、`identity_prefix`、`issuer` {#identity-identity-prefix-issuer}

使用无密钥签名时，请设置证书的完整 `identity` 或 `identity_prefix`，并同时设置其 OIDC `issuer`。这些选项会覆盖根据代码托管服务名称推导出的策略。仓库前缀末尾的斜杠不可省略。由 GitHub 工作流签名的域名项目可以这样设置：

```toml
[tools]
"packslip:tool.example.com" = { version = "latest", identity_prefix = "https://github.com/example/tool/", issuer = "https://token.actions.githubusercontent.com" }
```

请将示例身份替换为发布者确认的身份。识别签名颁发者并不会自动启用发行版发现：该域名仍需提供[已签名的发行版列表](/dev-tools/packslip-verification.html#project-discovery)。

### `workflow`

默认情况下，mise 会接受由 `github.com` 项目仓库中的任意工作流签署的发行版。要仅接受在标签上运行的特定工作流，请指定工作流文件名：

```toml
[tools]
"packslip:github.com/example/tool" = { version = "latest", workflow = "release.yaml" }
```

此设置会在 GitHub 的 OIDC 颁发者下展开为身份前缀 `https://github.com/example/tool/.github/workflows/release.yaml@refs/tags/`，因此在分支上运行的工作流无法签署发行版。它不能与 `pubkey`、`identity`、`identity_prefix` 或 `issuer` 同时使用；这些选项可用于固定其他 ref 或代码托管服务。注册表为简写提供 `workflow` 默认值时，如果在简写上设置了这些选项之一，你的设置会替换默认值。与这些选项相同，`workflow` 会按名称固定签名者，因此仓库重命名后需要在此处更新名称。

如果你要安装的项目发行版曾由不同工作流签署，可以指定多个工作流；其中任一个签署的发行版都会被接受：

```toml
[tools]
"packslip:github.com/example/tool" = { version = "latest", workflow = ["release-plz.yml", "release.yml"] }
```

此列表也会告知 mise 的[签名者固定记录](#pinned-signers)：项目曾在这些工作流之间切换。因此，已接受其中一个工作流签名发行版的机器，也可以接受另一个工作流签署的下一个版本，而无需运行 `mise packslip forget`。

对于从分支而不是标签执行签名的项目，名称可以包含工作流运行所在的 ref：`workflow = "release.yml@refs/heads/main"` 只接受该分支。以 `/` 结尾的 ref（例如 `@refs/tags/`）会接受整个命名空间。分支比标签更容易被更改，因此请做好保护。

相同前缀也会应用到项目的已签名发行版列表。如果供应商从另一个工作流或 ref 对列表签名，请使用 [`list_identity_prefix`](/dev-tools/backends/packslip.html#list-identity-prefix) 固定其身份。

### `list_identity_prefix` {#list-identity-prefix}

如果供应商的发行版列表由另一个工作流签名，请单独固定该工作流的证书身份前缀。此设置只会替换供应商列表所用的 `identity` 和 `identity_prefix`；发行版 bundle 仍然需要原签名者。OIDC `issuer` 是共用的，包括从代码托管服务项目推导出的颁发者。如果不设置此选项，列表会沿用发行版 bundle 的策略。

该值必须为非空字符串，且必须同时配置颁发者。它不能与 `pubkey` 同时使用，也不会影响已配置的盖章者；盖章者列表使用各自的固定记录。

### `prerelease`

列出或选择版本时包含预发布版本：

```toml
[tools]
"packslip:github.com/jdx/hk" = { version = "latest", prerelease = true }
```

### `trust`

设置 `trust = "vendor"` 可让某个工具免于已配置的[盖章者](/dev-tools/packslip-verification.html#stamps)要求。发布者的签名仍会验证，mise 也会在锁定文件选项中记录此选择。

```toml
[tools]
"packslip:github.com/jdx/hk" = { version = "latest", trust = "vendor" }
```

### `allow_unlogged` {#allow-unlogged}

仅当你的策略接受没有透明度日志证据的密钥签名 bundle 时，才将其设置为 `true`。签名和构件验证仍会执行。

### `ignore_requirements` {#ignore-requirements}

设置为 `true` 后，即使已确认[主机要求](/dev-tools/packslip-verification.html#host-requirements)不满足，仍会继续安装。此时 mise 会保留选定的 GNU 构建，而不是回退到 musl。此选项不会补齐缺失的库，也不能让不兼容的可执行文件运行；其他验证检查仍会执行。

## 策略 {#advanced-policies}

<span id="signed-release-lists"></span><span id="release-list-continuity-and-minimum-age"></span><span id="stamps"></span><span id="artifact-selection"></span><span id="host-requirements"></span>

发布者可以在已签名的发行版列表中推荐或撤回版本；你也可以要求版本通过可信盖章者的批准。[验证与策略参考](/dev-tools/packslip-verification.html)涵盖[已签名的发行版列表](/dev-tools/packslip-verification.html#signed-release-lists)、[发行版列表连续性](/dev-tools/packslip-verification.html#release-list-continuity-and-minimum-age)、[盖章](/dev-tools/packslip-verification.html#stamps)、[构建产物选择](/dev-tools/packslip-verification.html#artifact-selection)和[主机要求](/dev-tools/packslip-verification.html#host-requirements)。

<a id="troubleshooting"></a>

## 故障排除

更改任何配置前，请先检查当前使用的后端和版本，以及 mise 记住的签名者；然后启用调试输出，重新运行失败的命令：

```sh
mise tool hk
mise ls --current
mise packslip pins
MISE_DEBUG=1 mise install packslip:github.com/jdx/hk
```

将 `hk` 替换为遇到问题的工具。`mise packslip pins` 会列出 mise 之前接受的身份；它不会重新验证已安装的可执行文件，也不会信任新的签名者。

| 现象                                          | 下一步                                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 找不到版本或 bundle                            | 检查项目标识符并运行 `mise ls-remote`。确认发行版包含 packslip 清单，且发布时间早于 `minimum_release_age` 限制。缺少清单时只能由发布者补充。                                                    |
| 没有固定签名者的配置                           | 根据发布者确认的信息配置 `pubkey`，或配置 `identity` / `identity_prefix` 和 `issuer`。                                                                                                                  |
| 拒绝签名者变更或信任级别降级                   | 将 `mise packslip pins`、工具选项和 `mise.lock` 条目与发布者公告进行比较，然后按照[签名者变更](#pinned-signers)中的步骤处理。                                                                                |
| 同名但不同的仓库                                | 将其视为可能的仓库劫持。参见[重命名的仓库](#renamed-repositories)；只有在项目确认由原项目重新创建仓库后，才清除错误消息指出的固定记录或锁定文件条目。                                               |
| 已签名列表过期、回滚或缺失                      | 联系列表发布者或盖章者获取最新列表。删除本地状态只会丢弃连续性检查。                                                                                                                                      |
| 发行版已撤回或缺少必要的盖章                    | 选择盖章者批准且供应商尚未撤回的版本。参见[盖章](/dev-tools/packslip-verification.html#stamps)。                                                                                                          |
| bundle 或构建产物摘要、大小不匹配                | 向发布者报告发行版和构建产物，或检查镜像。下载内容必须与已签名清单相符；不要通过接受新字节来消除错误。                                                                                                    |
| 没有符合条件的构建产物                          | 检查当前平台和请求的 `variant`。发布者必须提供匹配的构建。                                                                                                                                               |
| 构建产物存在歧义                                | 发布者必须在清单中区分各个构建；本地选项无法从描述完全相同的构建产物中选择一个。                                                                                                                         |
| 主机要求检查失败                                | 安装报告的依赖或改用兼容主机。覆盖失败前请阅读[主机要求](/dev-tools/packslip-verification.html#host-requirements)。                                                                                        |
| 私有仓库发行版返回 404                          | 运行 `mise token github` 查看 mise 选择的令牌，并确认其可以读取仓库。参见[私有仓库](#private-repositories)。                                                                                            |

每条错误都会指出失败阶段。更改构建产物选项无法修复无效签名；忘记签名者固定记录也无法修复摘要不匹配。补全和技能问题参见[资源故障排查](/dev-tools/packslip-resources.html#troubleshooting)。

## 为 mise 发布工具 {#why-publish-one}

packslip 清单可以让 mise 安装你的发行版，无需新增注册表简写或根据文件名编写匹配规则。你可以保留现有发行版目录结构，并添加按版本提供的补全、CLI 规范或智能体技能。

要支持 mise，请执行以下步骤：

1. 发布可安装的构建产物，并提供准确的平台元数据和可执行文件路径。
2. 为包含构建产物摘要的清单签名，并随发行版一同发布其 bundle。
3. 如果使用域名托管，请发布已签名的发行版列表，并告知用户如何固定你的签名者身份。
4. 可以选择声明[补全、man 手册页和技能](/dev-tools/packslip-resources.html)。

如需使用 GitHub Actions，请遵循 [packslip 发布指南](https://packslip.dev/docs/publishing/)，了解 action 版本、权限、输入参数和 monorepo 设置，并在构建和上传最终构建产物后运行 action。如需域名托管，请参见[已签名的发行版列表](https://packslip.dev/docs/release-lists/)。格式定义参见 [packslip 规范](https://packslip.dev/release/v1/)。
