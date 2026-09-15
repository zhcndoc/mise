---
description: 使用 mise 从签名的发布清单安装工具，包括发布者验证、构件完整性检查，以及版本匹配的补全和代理技能。
socialDescription: 签名发布、已验证的下载，以及版本匹配的补全和代理技能。
---

# Packslip 后端

[Packslip](https://packslip.dev) 后端使用其维护者发布的签名发布清单安装工具。mise 会验证发布内容，为你的平台选择构建版本，并安装其中的可执行文件。发布内容还可以包含 shell 补全和代理技能。

对于发布者提供这些清单的工具，Packslip 是首选的 [Tier 1 后端](/registry.html#backends)。对于其他工具，请使用 [aqua](/dev-tools/backends/aqua.html)、[GitHub](/dev-tools/backends/github.html) 或其他受支持的后端。你不需要安装 Packslip CLI。

有关版本匹配的补全和代理技能的背景与示例，请阅读 [Introducing packslip](https://jdx.dev/posts/2026-09-05-introducing-packslip/)。

## 快速开始 {#usage}

在你的项目中安装 [hk](https://hk.jdx.dev)，一个 git hook 和 lint 管理器：

```sh
mise use packslip:github.com/jdx/hk
mise exec -- hk --version
```

这会将 hk 记录在项目的 `mise.toml` 中。等效配置为：

```toml
[tools]
"packslip:github.com/jdx/hk" = "latest"
```

手动添加该配置后运行 `mise install`。若要让 hk 在项目外也可用，请使用 `mise use -g packslip:github.com/jdx/hk`。注册表简写 `mise use hk` 也会默认选择 Packslip。

## 支持的项目标识符 {#project-names-and-discovery}

使用 `packslip:`，后跟项目的主机和路径，不要包含 `https://`。对于 GitHub，可以省略主机：`packslip:jdx/hk` 等价于 `packslip:github.com/jdx/hk`。

| 标识符                                       | 来源                              |
| -------------------------------------------- | --------------------------------- |
| `packslip:github.com/owner/repo`             | GitHub 仓库的发布内容             |
| `packslip:github.com/owner/repo/tools/mytool` | GitHub monorepo 中的一个工具       |
| `packslip:tool.example.com`                  | 发布者托管的签名发布列表           |
| `packslip:example.com/tools/mytool`          | 发布者域名上的一个工具             |

项目必须发布 Packslip 清单；此后端不会从任意发布文件名中推断安装说明。GitHub 项目具有内置的发布发现和签名者身份规则。其他主机需要签名发布列表和明确的[签名者配置](#pubkey)。

有关 bundle 文件名、发现 URL 和 monorepo 身份规则，请参阅[项目发现](/dev-tools/packslip-verification.html#project-discovery)。

### 私有 GitHub 仓库 {#private-repositories}

私有仓库使用与 [`github:` 后端](/dev-tools/github-tokens.html)相同的凭据——`MISE_GITHUB_TOKEN`、`GITHUB_API_TOKEN` 或 `GITHUB_TOKEN`——并且无需在配置中添加任何内容：

```toml [mise.toml]
[tools]
"packslip:github.com/my-org/internal-cli" = "latest"
```

GitHub 只会通过其 API 提供私有仓库的发布资源，而不会通过清单记录的 `github.com/.../releases/download/...` URL 提供，因此当下载失败时，mise 会使用你的令牌重试 API。令牌仅用于传输：签名、项目身份、签名者连续性和构件摘要检查均不变，且不会从签名清单中读取任何凭据。

## 版本

列出可用版本或选择特定发布版本：

```sh
mise ls-remote packslip:github.com/jdx/hk
mise use packslip:github.com/jdx/hk@1.58.1
```

只有包含 Packslip 清单的发布版本可通过此后端使用。注册表简写会为 1.58.1 之前的 hk 版本选择 Aqua，因此 `mise use hk@1.57.0` 仍然有效。你也可以使用 `mise use aqua:jdx/hk@VERSION` 显式选择 Aqua。

Packslip 使用语义化版本，包括 `2026.9.1` 等兼容的日期版本。除非启用 [`prerelease`](#prerelease) 工具选项，否则会排除预发布版本。mise 还会应用 [`minimum_release_age`](/configuration/settings.html#minimum_release_age)，默认值为 24 小时。因此，最近发布的版本可能会在达到该时间前不出现在列表中。

### 如何选择 `latest` {#latest}

当发布者的推荐版本符合条件时，`latest` 会遵循该推荐：

1. 签名发布列表中发布者的 `latest` 指针
2. 如果没有签名指针，则使用 GitHub 的最新发布版本
3. 如果没有符合条件的推荐，则使用最高的符合条件的语义化版本

即使存在更新的主要版本，发布者也可以推荐较旧的受支持版本。前缀和渠道请求会继续使用其正常的匹配规则。每个候选版本都必须符合配置的验证和安装策略。

离线时，版本列表和 `latest` 会使用缓存结果；如果缓存为空，则不返回任何版本。安装仍会执行验证。请参阅[版本解析](/dev-tools/packslip-verification.html#version-resolution)，了解签名列表、撤回和回退行为。

### 复现安装

在发布者推荐新版本后，`latest` 请求可能会解析到不同版本。当团队需要安装相同版本时，请将请求保存在 `mise.toml` 中，并提交生成的锁定文件：

```sh
mise install
git add mise.toml mise.lock
```

首次安装会将版本、签名者和构件承诺记录到 `mise.lock` 中；请将该文件与 `mise.toml` 一起提交。队友和 CI 在检出项目后即可强制执行这些承诺：

```sh
mise install --locked
```

`mise lock` 可以在不安装的情况下解析 Packslip 版本，但在首次安装前无法记录所选构件的承诺。安装仍需要构件或可用的缓存副本，并且必须符合当前的验证策略。有关目标平台和更新，请参阅 [mise.lock](/dev-tools/mise-lock.html)。

## 补全和技能 {#completions}

启用 [mise](/getting-started.html#activate-mise) 后，安装 hk 也会使其补全可用：

```sh
mise use packslip:github.com/jdx/hk
```

输入 `hk` 并按 Tab。mise 会加载 hk 发布内容声明的补全脚本，并遵循每个项目中处于活动状态的 hk 版本。不需要单独安装补全，也不需要 `usage` 依赖。支持 Bash、zsh、fish 和 PowerShell。详情以及不启用 shell 的手动设置，请参阅 [Packslip 补全](/dev-tools/packslip-resources.html#completions)。

<span id="skills"></span>

工具也可以发布代理技能。使用 `mise skills ls` 查看活动工具提供的技能，并使用 `mise skills sync --dir .agents/skills` 将其链接到代理目录中。工具必须声明技能，该技能才会显示。

<span id="resource-selection-and-command-execution"></span>

有关设置、自动技能同步，以及资源生成运行发布者可执行文件的时机，请参阅 [Packslip 补全和技能](/dev-tools/packslip-resources.html)。

## 验证 {#what-is-verified}

mise 会在解包前验证发布者签名、请求的项目和版本，以及所选下载内容的摘要和大小。签名者必须与预期的仓库身份或你配置的公钥匹配。mise 还会检查现有的签名者固定、锁定文件承诺，以及适用的发布年龄或盖章者策略。

**清单**描述发布内容。**bundle** 包含清单及其签名证据。**构件**是由清单命名的可下载构建版本。mise 会将经过验证的清单以 `.mise-packslip.json` 的形式保留在安装目录中。

验证可以认证发布者和下载的字节，但不能证明软件是安全的。mise 会记录是否存在构建来源链接，但不会获取和验证该链接的来源证明。请参阅[验证详情](/dev-tools/packslip-verification.html#verification-checks)。

### 签名者变更 {#pinned-signers}

mise 会在本地状态中记住之前接受的签名者。[`mise.lock`](/dev-tools/mise-lock.html) 还可以记录项目的签名者和构件校验和，将这些承诺带到另一台机器上。

如果发布版本更换了签名者，请检查已记住的身份：

```sh
mise packslip pins
mise packslip pins --json
```

确认发布者已宣布签名密钥或工作流发生变化后，重置该项目的本地固定：

```sh
mise packslip forget github.com/jdx/hk
```

这也会重置已记住的供应商发布列表连续性。它不会更改显式签名者选项、擦除盖章者列表状态，或从 `mise.lock` 中移除签名者承诺。请先配置新的签名者策略；如果锁定文件条目发生冲突，请移除该条目并使用 `mise install` 重新生成。检查并提交生成的锁定文件变更。有关需要进行此检查的变更，请参阅[签名者连续性](/dev-tools/packslip-verification.html#signer-continuity)。

## 工具选项

这些[工具选项](/dev-tools/#tool-options)适用于 `[tools]` 中的一个条目。设置 `packslip.exec`、`packslip.stampers` 和 `skills.*` 应放在 `[settings]` 下。

| 选项                                                                      | 默认值                         | 用途                                                         |
| ------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| [`variant`](#variant)                                                     | 无变体                         | 选择发布者声明的替代构建版本                                  |
| [`pubkey`](#pubkey)                                                       | 未设置                         | 固定 minisign 格式的公钥或公钥文件                            |
| [`identity`, `identity_prefix`, `issuer`](#identity-identity-prefix-issuer) | 从已识别的 forge 派生           | 设置预期的无密钥签名者和 OIDC 颁发者                         |
| [`list_identity_prefix`](#list-identity-prefix)                           | 发布签名者策略                 | 为供应商发布列表固定不同的工作流                              |
| [`prerelease`](#prerelease)                                               | `false`                        | 包含预发布版本                                               |
| [`trust`](#trust)                                                         | 应用已配置的盖章者             | 使用 `"vendor"` 使此工具免于盖章要求                         |
| [`allow_unlogged`](#allow-unlogged)                                       | `false`                        | 接受没有透明度日志证据的密钥签名 bundle                       |
| [`ignore_requirements`](#ignore-requirements)                             | `false`                        | 即使已确认主机要求失败，也继续安装                            |

### `variant`

选择命名的替代构建版本，例如 `fips` 或 `baseline`。没有此选项时，mise 只会考虑没有变体的构件。发布者必须提供所请求的变体。

```toml
[tools]
"packslip:github.com/example/tool" = { version = "latest", variant = "fips" }
```

### `pubkey`

对于密钥签名的项目，请通过可信渠道获取发布者的公钥。将 `pubkey` 设置为 minisign 格式的公钥行，或设置为其 `.pub` 文件的路径。发布列表和 bundle 必须使用该密钥验证。

```toml
[tools]
"packslip:tool.example.com" = { version = "latest", pubkey = "/path/to/vendor.pub" }
```

### `identity`、`identity_prefix`、`issuer` {#identity-identity-prefix-issuer}

对于无密钥签名，请指定确切的证书 `identity` 或 `identity_prefix`，以及其 OIDC `issuer`。这些选项会覆盖根据 forge 名称派生的策略。请保留仓库前缀末尾的斜杠。例如，由 GitHub 工作流签名的域名项目可以使用：

```toml
[tools]
"packslip:tool.example.com" = { version = "latest", identity_prefix = "https://github.com/example/tool/", issuer = "https://token.actions.githubusercontent.com" }
```

将示例身份替换为发布者经过验证的身份。识别签名颁发者不会添加发布发现功能：该域名仍然需要[签名发布列表](/dev-tools/packslip-verification.html#project-discovery)。

### `list_identity_prefix` {#list-identity-prefix}

当不同的工作流为供应商的发布列表签名时，请单独固定其证书身份前缀。它只会针对供应商列表替换 `identity` 和 `identity_prefix`；发布 bundle 仍然需要其原始签名者。OIDC `issuer` 是共享的（包括从 forge 项目派生的颁发者）。没有此选项时，列表使用与发布 bundle 相同的策略。

该值必须是非空字符串，并且需要颁发者。它不能与 `pubkey` 结合使用。它不会影响已配置的盖章者，盖章者列表使用其自己的固定值。

### `prerelease`

列出或选择版本时包含预发布版本：

```toml
[tools]
"packslip:github.com/jdx/hk" = { version = "latest", prerelease = true }
```

### `trust`

使用 `trust = "vendor"` 使一个工具免于配置的[盖章者](#stamps)要求。供应商签名验证仍会执行，mise 会将此选择记录在锁定文件选项中。

```toml
[tools]
"packslip:github.com/jdx/hk" = { version = "latest", trust = "vendor" }
```

### `allow_unlogged` {#allow-unlogged}

仅当你的策略接受没有透明度日志证据的密钥签名 bundle 时，才将其设置为 `true`。签名和构件验证仍会执行。

### `ignore_requirements` {#ignore-requirements}

将其设置为 `true`，即可在已确认的[主机要求](#host-requirements)失败时继续安装。这不会提供缺失的库，也不会让不兼容的可执行文件运行。它还会绕过 glibc 到 musl 的回退，为主机保留所选的 GNU 构件。其他验证检查仍会执行。

## 高级策略

### 签名发布列表

发布者可以使用签名列表来推荐或撤回版本，并提供 bundle 位置。对于域名项目，列表是必需的；对于 GitHub，列表会补充发布发现功能。请参阅[签名发布列表](/dev-tools/packslip-verification.html#signed-release-lists)。

<span id="release-list-continuity-and-minimum-age"></span>

接受的列表必须保持可用且为最新状态。有关过期、回滚保护和时间戳检查，请参阅[列表连续性和发布年龄](/dev-tools/packslip-verification.html#release-list-continuity-and-minimum-age)。

### 盖章

盖章者是你配置的服务，用于在发布者签名之外批准发布版本。默认不要求盖章。请参阅[盖章者配置和镜像](/dev-tools/packslip-verification.html#stamps)。

### 构件选择和主机要求 {#artifact-selection}

<span id="host-requirements"></span>

mise 使用签名的操作系统、架构、libc 和变体元数据选择构建版本，然后检查其声明的主机要求。当 GNU 构建版本声明的 `glibc_min` 比主机版本更新时，如果存在匹配的静态 musl 构建版本，mise 会选择该版本。设置 `ignore_requirements = true` 会绕过此回退，并保留所选的 GNU 构件。构建版本含义不明确或存在其他已确认的不兼容情况时，安装可能会被阻止。请参阅[构件选择](/dev-tools/packslip-verification.html#artifact-selection)和[主机要求](/dev-tools/packslip-verification.html#host-requirements)。

## 故障排除

从失败命令的调试输出开始，例如：

```sh
MISE_DEBUG=1 mise install packslip:github.com/jdx/hk
```

| 症状                                         | 后续步骤                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 找不到版本或 bundle                          | 检查项目标识符和 `mise ls-remote`。确认发布版本包含 Packslip 清单，并且已达到 `minimum_release_age`。缺少的清单必须由发布者提供。 |
| 没有任何内容固定签名者                       | 使用已与发布者确认的详细信息配置 `pubkey`，或配置证书身份／前缀和颁发者。                                                                                                                   |
| 拒绝签名者变更或信任降级                     | 检查 `mise packslip pins`、显式工具选项和 `mise.lock`。确认发布者的变更后，遵循[签名者变更](#pinned-signers)的步骤。                                                                        |
| 没有符合条件的构件                           | 检查你的平台和所请求的变体。发布者必须提供匹配的构建版本。                                                                                                                                   |
| 构件含义不明确                               | 发布者必须在清单中区分这些构建版本；更改本地选项无法修复相同的元数据。                                                                                                                       |
| 主机要求失败                                 | 安装报告的依赖项或使用兼容的主机。覆盖失败前请参阅[主机要求](#host-requirements)。                                                                                                          |
| 签名列表已过期、已回滚或缺失                 | 向列表发布者索要当前有效的列表。移除已接受的列表不会重置其策略。                                                                                                                            |
| 版本被盖章策略排除                           | 检查已配置的盖章者。受信任的盖章者必须批准该版本，并且供应商不得已撤回该版本。                                                                                                               |
| 摘要或大小不匹配                             | 向发布者报告受影响的发布版本和构件；下载内容必须与签名清单匹配。                                                                                                                            |
| 私有仓库发布版本返回 404                     | 确认 `MISE_GITHUB_TOKEN`、`GITHUB_API_TOKEN` 或 `GITHUB_TOKEN` 中的令牌可以读取该仓库。请参阅[私有 GitHub 仓库](#private-repositories)。                                                    |

有关补全和技能错误，请参阅[资源故障排除](/dev-tools/packslip-resources.html#troubleshooting)。

## 为 mise 发布工具 {#why-publish-one}

Packslip 清单让 mise 无需新增注册表简写或单独的文件名匹配配方即可安装你的发布内容。你可以保留现有的发布布局，并添加版本化的补全、CLI 规范或代理技能。

要支持 mise：

1. 发布带有准确平台元数据和可执行文件路径的可安装构件
2. 为包含这些构件摘要的清单签名，并随发布内容发布其 bundle
3. 对于域名托管，发布签名发布列表，并告知用户如何固定你的签名者
4. 可选地声明[补全和技能](/dev-tools/packslip-resources.html)

对于 GitHub Actions，请遵循 [Packslip 发布指南](https://packslip.dev/docs/publishing/)，了解 action 版本、权限、输入参数和 monorepo 设置。在构建并上传最终构件后运行该 action。对于域名托管，请参阅[签名发布列表](https://packslip.dev/docs/release-lists/)。

[Packslip 规范](https://packslip.dev/release/v1/)定义了格式。有关 mise 的实现细节，请参阅 [`src/backend/packslip.rs`](https://github.com/jdx/mise/blob/main/src/backend/packslip.rs)。
