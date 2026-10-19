---
description: "根据 aqua 注册表配方安装预编译发行版，并验证签名和来源证明。"
---

# aqua 后端

`aqua` 后端会根据 [aqua 注册表](https://github.com/aquaproj/aqua-registry)中的软件包配方安装预编译发行版，例如
[`aqua:hashicorp/terraform`](https://github.com/aquaproj/aqua-registry/blob/main/pkgs/hashicorp/terraform/registry.yaml)。
该后端支持 Windows；配方声明校验和、签名、证明或 SLSA 来源证明时，还可以对其进行验证。

## 要求

除 mise 外不需要其他工具。mise 会读取配方并自行执行[安全验证](#security-verification)，因此无需安装 aqua CLI 或签名工具。配方必须在 `supported_envs` 中列出当前平台（参见[当前平台没有可用制品](#no-asset-for-your-platform)），并且下载已发布的制品。如果配方改为从源码构建（类型为 `cargo`、`go_install` 或 `go_build`），则会报错并提示改用 [cargo](/dev-tools/backends/cargo.html) 或 [go](/dev-tools/backends/go.html) 后端。

## 使用方式

在项目中安装 ripgrep，并在不激活 shell 的情况下运行：

```sh
mise use aqua:BurntSushi/ripgrep
mise exec -- rg --version
```

这会将以下内容写入 `mise.toml`。在 `mise use` 中添加 `-g` 可将工具安装到全局配置中。

```toml
[tools]
"aqua:BurntSushi/ripgrep" = "latest"
```

运行 `mise ls-remote aqua:BurntSushi/ripgrep` 可列出可用版本。运行 `mise registry ripgrep` 可查看该短名称使用的后端。

配方会下载并解压已发布的制品。如果工具需要自定义安装步骤或环境设置，请改用其他后端。

## 内置注册表 {#bundled-registry}

每个 mise 发行版都会内置一份 aqua 注册表快照，并默认使用它。启用 [`registry_floating`](/configuration/settings.html#registry_floating) 后，mise 会先检查当前官方 aqua 注册表，并将内置快照用作后备来源。此设置也会让 mise 自己的注册表跟随上游变化；相关权衡和缓存行为请参阅[浮动注册表](/registry.html#floating-registries)。

如果配方中的平台名称、URL 或验证元数据有误，请向 [aqua 注册表](https://github.com/aquaproj/aqua-registry/issues)报告。上游修复会通过之后的 mise 发行版、`registry_floating` 或自定义注册表提供给你。

## 自定义注册表 {#custom-registry}

在 [`aqua.registries`](/dev-tools/backends/aqua.html#aqua.registries) 中列出自己的 aqua 注册表。mise 会按顺序检查这些注册表，然后检查内置注册表：

```toml
[settings]
aqua.registries = [
  "https://github.com/my-org/aqua-registry",
  "registry.yaml",
]
```

每个来源可以是仓库 URL、直接指向 `registry.yaml` 或 `registry.yml` 文件的 URL、绝对 `file://` URL，或者配置文件中的普通路径（相对于该配置文件的根目录解析，如上例中的 `registry.yaml`）。通过 `MISE_AQUA_REGISTRIES` 提供的路径必须是绝对 `file://` URL。对于仓库或目录，mise 会读取其根目录下的 `registry.yaml`；如果不存在，则读取 `registry.yml`。

远程来源会按照 [`aqua.registry_cache_ttl`](/dev-tools/backends/aqua.html#aqua.registry_cache_ttl) 设置缓存。每次 mise 加载注册表时都会重新读取本地来源，因此修改会立即生效。

默认情况下 [`aqua.baked_registry`](/dev-tools/backends/aqua.html#aqua.baked_registry) 已启用；对于所有自定义注册表都未定义的软件包，会回退到内置注册表。aqua 注册表别名只在定义它的注册表内生效。若要将某个 mise 名称指向其他注册表中的软件包，请使用[工具别名](/dev-tools/aliases.html)。

[`aqua.registry_url`](/dev-tools/backends/aqua.html#aqua.registry_url) 已弃用，请改用 `aqua.registries`。mise 2026.12.0 及更高版本会在检测到此设置时发出警告，mise 2027.12.0 将移除该设置。在此之前，如果未设置 `aqua.registries`，mise 会将其作为只有一个条目的 `aqua.registries` 读取。

## 安全验证 {#security-verification}

<span id="github-artifact-attestations"></span>
<span id="cosign-verification"></span>
<span id="slsa-provenance-verification"></span>
<span id="other-security-methods"></span>
<span id="verification-process"></span>

mise 会自行实现校验和、GitHub 构件证明、Cosign、SLSA 和 Minisign 验证，因此不需要安装这些工具的 CLI。具体执行哪些检查，取决于软件包配方中的声明。

| 方法                         | 所需的发布者或注册表元数据                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 校验和                       | 注册表元数据、校验和文件、发布 API 或锁定文件中的预期摘要。                |
| GitHub 构件证明              | 用于标识预期工作流的注册表证明配置。                                    |
| Cosign                       | 受支持的公钥或签名包配置；不会执行任意 Cosign CLI 参数。 |
| SLSA                         | 注册表来源证明配置和发布者的来源证明构件。                               |
| Minisign                     | 签名和预期公钥。                                                                   |
| SLSA                         | 注册表来源证明配置（包含 `signer_identity` 和 `signer_issuer`），以及发布者的来源证明构件。 |

`aqua.*` 验证[设置](#settings)默认均已启用。部分检查还可以通过全局设置控制，例如 [`github_attestations`](/configuration/settings.html#github_attestations) 或 [`slsa`](/configuration/settings.html#slsa)。

SLSA 签名者字段必须填写准确的 Fulcio 证书 URI 主体和 OIDC issuer。配方未指定签名者的软件包会跳过 SLSA 验证，但仍可能通过其他方式检查。如何指定签名者，请参阅 [`slsa_signer_identity` 和 `slsa_signer_issuer`](/dev-tools/backends/aqua.html#slsa-signer-identity-and-slsa-signer-issuer)。

经过验证的[锁文件](/dev-tools/mise-lock.html)会被信任。如果其中记录了校验和和来源证明（包括 SLSA），mise 会检查制品摘要，但不会再次验证来源证明，因此使用该锁文件安装时无需签名者信息。设置 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 可在锁定安装期间再次验证来源证明。

## 工具选项

在 `[tools]` 中该工具的条目下设置以下选项。所有后端通用的选项（例如 `install_env` 和 `depends`）请参阅[工具选项](/dev-tools/#tool-options)。

### `symlink_bins`

有些工具会打包你不希望出现在 `PATH` 中的可执行文件。例如，`aws-cli` 会附带 Python，可能会覆盖你原本要使用的 Python。设置 `symlink_bins = true` 后，mise 会创建 `.mise-bins` 目录，只链接该软件包自带的可执行文件，并将此目录加入 `PATH`，而不是将安装目录中的所有可执行文件都加入：

```toml
[tools]
"aqua:aws/aws-cli" = { version = "latest", symlink_bins = true }
```

注册表中的 `aws-cli` 短名称已默认启用此选项。mise 会链接配方 `files` 字段列出的可执行文件（aws-cli 对应 `aws` 和 `aws_completer`）；如果配方没有列出文件，则链接软件包的主可执行文件。

在 Windows 上，`.mise-bins` 中的条目是副本。如果程序会在自身可执行文件旁查找 DLL 或数据文件，它会转而在 `.mise-bins` 中查找，因此 `mise x` 和通过它运行的 shim 会直接启动已安装的原始文件。像 `mise activate` 这样的 shell 如果自行从 `PATH` 中找到副本，仍会运行该副本。每个副本在安装时都会记录其源文件，因此对于由旧版 mise 安装的工具，请重新安装（`mise install --force`）以应用此行为。

### `vars`

某些配方会使用模板变量，例如 <span v-pre>`{{.Vars.channel}}`</span>。可将变量设为顶层选项，或放在嵌套的 `vars` 表中：

```toml
[tools]
"aqua:flutter/flutter" = { version = "3.32.8", channel = "stable" }
"aqua:scenarigo/scenarigo" = { version = "0.21.0", vars = { go_version = "1.24" } }
```

带有默认值的变量会自动填充。配方标记为必填的变量必须显式设置，除非配方也为其提供了默认值。名为 `libc` 的配方变量必须写作 `vars.libc`，因为顶层 `libc` 键对应的是 [`libc`](#libc) 选项。

### `libc`

在使用 glibc 的 Linux 上，即使配方指定了 musl 构建，mise 仍会优先安装该发行版的 glibc 构建；只有在没有发布 glibc 构建时才会使用 musl 构建。可通过 `libc` 为单个工具选择实现：

```toml
[tools]
"aqua:domcyrus/rustnet" = { version = "latest", libc = "musl" }
```

支持的值为 `glibc`（或 `gnu`）和 `musl`。设置后，mise 不会回退到使用另一种 libc 构建的版本，并且此值会覆盖设置中的 [`libc = "glibc"`](/configuration/settings.html#libc)。在 musl 平台上无法选择 glibc，例如 Alpine 主机、设置了 `libc = "musl"`，或锁文件平台为 `linux-*-musl` 时均如此。

在工具和设置均未指定 musl 的 musl 主机上，mise 会安装配方所指定的制品。如果该制品是 glibc 构建，则需要 glibc 或 gcompat 等兼容层才能运行。

该值会记录在锁文件中，因此修改后会重新解析工具版本。运行 `mise install --force` 可切换已安装版本。`latest` 会根据此选项解析，但 `mise ls-remote` 会列出适用于主机 libc 的版本，因为同一份版本列表会供该工具的所有配置使用。

### `prerelease`

默认情况下，GitHub 上标记为预发布的发行版不会出现在 `mise ls-remote` 和 `latest` 结果中。设置 `prerelease = true` 可将其纳入：

```toml
[tools]
"aqua:owner/tool" = { version = "latest", prerelease = true }
```

启用后，`v1.0.0-rc1` 这类预发布标签会显示在 `mise ls-remote` 中，`latest` 和版本前缀请求也可以匹配它们。草稿发行版始终会被排除。若要对所有工具都包含预发布版本，请设置 [`prereleases`](/configuration/settings.html#prereleases)。

对于使用 `github_tag` 版本来源的软件包，标签本身没有预发布标记。`mise ls-remote` 会列出所有标签；而 `latest` 和版本前缀请求会跳过看起来像预发布版本的标签（例如 `-rc1` 或 `-beta`），除非设置了 `prerelease = true`。

### `slsa_signer_identity` 和 `slsa_signer_issuer`

某些配方配置了 `slsa_provenance`，但没有指定预期签名者。此时 mise 会跳过这些软件包的 SLSA 验证，而要求 SLSA 的现有锁文件则会验证失败。你可以设置预期的 Fulcio 证书 URI 主体和 OIDC issuer，自行提供签名者信息：

```toml
[tools."aqua:google/osv-scanner"]
version = "2.6.0"
slsa_signer_identity = "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@refs/tags/v2.1.0"
slsa_signer_issuer = "https://token.actions.githubusercontent.com"
```

这两个选项必须一并设置，并且必须与证书完全匹配；它们会覆盖配方中已有的签名者信息。两个值都支持 <span v-pre>`{{.Version}}`</span> 模板。请从项目发行版的来源证明中复制签名者信息，不要使用未经审核的来源。这些选项只提供签名者信息；如果软件包的配方没有 `slsa_provenance`，它们不会启用 SLSA。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="aqua" :level="3" />

## 故障排查

<span id="common-aqua-issues"></span>

### 验证失败

从失败的命令及其验证错误开始：

```sh
MISE_DEBUG=1 mise install aqua:cli/cli
```

请确认发行版包含预期签名或证明，配方指定了正确的制品和签名者，并且系统时钟和网络允许执行证书及透明日志检查。对于私有制品或 API 速率限制，请配置 [GitHub 身份验证](/dev-tools/github-tokens.html)。

A 摘要不匹配表示制品或预期摘要有误。缺少签名或签名无效，表示发布者的发行版或配方元数据有误。关闭验证只会改变你信任哪些制品，并不能解决上述问题。配方问题请报告给 [aqua 注册表](https://github.com/aquaproj/aqua-registry/issues)；mise 本身的问题请报告到 [mise issues](https://github.com/jdx/mise/issues)，并先移除凭据。

### 当前平台没有可用制品

<span id="supported-env-missing"></span>

配方的 `supported_envs` 列出了它支持的平台。如果发布者提供了适用于你的操作系统和架构的构建版本，但配方未列出，请向 aqua 注册表报告。在修复合并前，可对此工具改用 [github](/dev-tools/backends/github.html) 后端。

### 版本带有意外前缀

<span id="using-version-filter-instead-of-version-prefix"></span>

如果 `mise ls-remote aqua:...` 显示 `atlascli/1.2.3` 这样的版本，说明配方使用 `version_filter` 筛选标签，而不是通过 `version_prefix` 移除前缀。请向 aqua 注册表报告；mise 会自动处理 `version_prefix` 的移除和还原。配方作者可在 [aqua 注册表配方](/contributing/registry.html#aqua-registry-recipes)中了解相关修复。

实现代码：[`src/backend/aqua.rs`](https://github.com/jdx/mise/blob/main/src/backend/aqua.rs)。
