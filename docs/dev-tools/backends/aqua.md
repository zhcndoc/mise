---
description: "使用 Aqua 注册表配方和受支持的验证检查安装发布二进制文件"
---

# Aqua 后端

[Aqua](https://aquaproj.github.io/) 工具可以在 mise 中原生使用。对于没有 [packslip manifests](/dev-tools/backends/packslip.html) 的工具，aqua 是 Tier 2 后端：它不需要插件，可以在 Windows 上运行，并且提供超出校验和的安全功能。验证取决于每个软件包提供的元数据。

你不需要单独安装 aqua。mise 完全不使用 aqua CLI；它使用 [aqua registry](https://github.com/aquaproj/aqua-registry)，该注册表会在发布时编译到 mise 二进制文件中。下面是一个软件包条目示例：[`aqua:hashicorp/terraform`](https://github.com/aquaproj/aqua-registry/blob/main/pkgs/hashicorp/terraform/registry.yaml)。mise 自己重新实现了 aqua，会读取这些文件来安装工具。

默认情况下，使用内置的快照。启用
[`registry_floating`](/configuration/settings.html#registry_floating) 设置后，会先检查当前的
官方 aqua registry，同时保留内置快照作为备用。它还会让 mise 的简写 registry 跟随更新；
有关其中的权衡和缓存行为，请参阅[浮动 registry](/registry.html#floating-registries)。

如果某个条目包含错误的平台名称、URL 或验证元数据，请向 aqua registry 报告，或贡献修正内容。mise 发布版本包含一个快照，因此上游修复可能需要更新的 mise 发布版本或自定义注册表。

Aqua 配方主要用于下载和提取已发布的构件。需要自定义安装步骤或环境设置的工具可能需要使用其他后端。

此后端的代码位于 mise 仓库中的 [`./src/backend/aqua.rs`](https://github.com/jdx/mise/blob/main/src/backend/aqua.rs)。

## 自定义注册表

设置 [`aqua.registries`](/configuration/settings.html#aqua.registries)，以便在内置注册表之前检查自定义 aqua
注册表源：

```toml
[settings]
aqua.registries = ["https://github.com/my-org/aqua-registry"]
```

要在内置注册表之前检查多个注册表，请按顺序列出它们：

```toml
[settings]
aqua.registries = [
  "https://github.com/my-org/internal-aqua-registry",
  "https://github.com/partner/aqua-registry",
]
```

每个源可以是仓库 URL、直接指向 `registry.yaml` 或 `registry.yml` 文件的 URL，或者使用绝对路径
`file://` URL 指定的本地目录或注册表文件：

```toml
[settings]
aqua.registries = [
  "file:///absolute/path/to/aqua-registry",
  "file:///absolute/path/to/registry.yaml",
  "https://example.com/registry.yaml",
]
```

对于仓库和目录源，mise 会从源根目录加载 `registry.yaml`，必要时回退到 `registry.yml`。远程注册表源会在
`MISE_CACHE_DIR` 下缓存，缓存时间由 [`aqua.registry_cache_ttl`](/configuration/settings.html#aqua.registry_cache_ttl) 指定，默认
为一周。本地 `file://` 源会绕过下载源缓存，因此下次加载注册表时会读取更改。在 `MISE_AQUA_REGISTRIES` 中，使用
逗号分隔多个注册表 URL。

当刷新后的注册表源被下载后，mise 会对该源进行哈希处理，并使用该哈希作为编译后注册表缓存路径的一部分。
当新的编译缓存成功加载或写入时，会清理同一注册表 URL 的旧编译缓存。

包的解析会按配置的注册表顺序进行检查。当启用 `aqua.baked_registry` 时，内置注册表仍会作为所有已配置注册表中缺失包的回退。
Aqua 注册表别名仅在定义它们的注册表内有效；当你希望 mise 的简写或别名指向来自其他注册表的 aqua
包时，请使用 [`[tool_alias]`](/dev-tools/aliases)。

旧版 [`aqua.registry_url`](/configuration/settings.html#aqua.registry_url) 设置仍支持单个注册表 URL，但当两者同时设置时，
`aqua.registries` 优先。

## 使用

在项目中安装 ripgrep，并在不需要 shell 激活的情况下验证可执行文件：

```sh
mise use aqua:BurntSushi/ripgrep
mise exec -- rg --version
```

这会将以下内容写入 `mise.toml`。为 `mise use` 添加 `-g` 可安装全局工具。

```toml
[tools]
"aqua:BurntSushi/ripgrep" = "latest"
```

使用 `mise ls-remote aqua:BurntSushi/ripgrep` 查看可用版本。
`mise registry ripgrep` 显示为其简写配置的后端。

## 工具选项

### `symlink_bins`

有些工具会捆绑额外的可执行文件，这些文件你可能不希望暴露在 PATH 上。例如，`aws-cli` 会捆绑
Python，这可能会与你期望使用的 Python 版本冲突。

设置 `symlink_bins = true` 会创建经过筛选的 `.mise-bins` 目录，并且只暴露属于该 aqua 软件包的二进制文件，
而不是安装中发现的所有可执行文件。

```toml
[tools]
aws-cli = { version = "latest", symlink_bins = true }
```

启用后：

- 如果 aqua registry 定义了 `files` 字段，则只会暴露那些二进制文件（例如 aws-cli 的 `aws` 和 `aws_completer`）
- 否则，mise 会回退为暴露该包推断出的主二进制文件
- 会创建一个 `.mise-bins` 子目录，并为暴露的二进制文件创建符号链接
- 捆绑的依赖项和其他额外可执行文件，例如 `aws-cli` 中的 Python，不会被添加到 PATH

### `vars`

某些 aqua registry 条目定义了模板变量（例如 <span v-pre>`{{.Vars.channel}}`</span>）。
可通过工具选项来设置它们，既可以使用顶层键，也可以使用嵌套的 `vars` 表：

```toml
[tools]
"aqua:flutter/flutter" = { version = "3.32.8", channel = "stable" }
"aqua:scenarigo/scenarigo" = { version = "0.21.0", vars = { go_version = "1.24" } }
```

带默认值的变量会自动填充。aqua registry 中标记为必需的变量必须设置，
除非该 registry 也提供了默认值。

### `prerelease`

默认情况下，GitHub 上标记为 `prerelease: true` 的发布不会被包含在 `mise ls-remote` 和 `latest` 解析中。设置 `prerelease = true` 以包含它们：

```toml
[tools]
"aqua:owner/tool" = { version = "latest", prerelease = true }
```

设置后，预发布标签（例如 `v1.0.0-rc1`、`v0.1.2-dev.86`）会出现在 `mise ls-remote` 中，`latest` 会根据包含预发布版本的完整列表进行解析，并且模糊版本查询会匹配预发布标签。当软件包使用 `github_tag` 版本源时，此选项不起作用（git 标签不携带预发布标志）。草稿发布始终会被排除。有关更多详细信息，请参阅 [github backend docs](/dev-tools/backends/github.html#prerelease)。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="aqua" :level="3" />

## 安全验证

<span id="github-artifact-attestations"></span>
<span id="cosign-verification"></span>
<span id="slsa-provenance-verification"></span>
<span id="other-security-methods"></span>
<span id="verification-process"></span>

mise 原生实现了校验和、GitHub 构件证明、Cosign、SLSA 和 Minisign 验证。你不需要单独安装它们的 CLI 工具。**后端支持这些验证方式，并不意味着每个软件包都提供所有这些检查。**

| 方法                         | 所需的发布者或注册表元数据                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 校验和                       | 注册表元数据、校验和文件、发布 API 或锁定文件中的预期摘要。                |
| GitHub 构件证明              | 用于标识预期工作流的注册表证明配置。                                    |
| Cosign                       | 受支持的公钥或签名包配置；不会执行任意 Cosign CLI 参数。 |
| SLSA                         | 注册表来源证明配置和发布者的来源证明构件。                               |
| Minisign                     | 签名和预期公钥。                                                                   |

相应的 `aqua.*` 验证设置默认处于启用状态。某些检查还具有全局设置，例如
`github_attestations` 或 `slsa`。完整配置请参阅[设置](#settings)。

经过验证的[锁定文件](/dev-tools/mise-lock.html)可以在检查构件摘要时复用之前的来源证明结果。设置
[`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance)，可要求在锁定安装期间再次进行来源证明验证。

### 故障排查

从失败的命令及其验证错误开始：

```sh
MISE_DEBUG=1 mise install aqua:cli/cli
```

检查发布是否提供了预期的签名或证明，注册表是否列出了正确的构件和签名者，以及你的时钟和网络是否允许进行证书和透明日志验证。对于私有资产或 API 限制，请检查 [GitHub authentication](/dev-tools/github-tokens.html)。

摘要不匹配需要调查构件或预期摘要。缺少或无效的签名需要检查发布者和注册表元数据。禁用验证会改变你信任的构件；它无法修复上述任一问题。报告受影响的版本、平台和验证器错误时，请删除凭据。

## 常见 aqua 问题

这些问题通常需要修正 aqua registry 中的软件包条目。

### 缺少受支持的环境

将注册表条目的 `supported_envs` 与发布者的发布资产进行比较。如果存在匹配的构件，但其平台不在注册表中，请更新该条目。仅添加平台名称无法让不兼容的二进制文件运行。

### 使用 `version_filter` 而不是 `version_prefix`

使用 `version_prefix` 从展示给用户的版本中移除已知的标签前缀，使用 `version_filter` 排除无关发布。保留发布者有意义的版本标识符；版本不必是三段式语义版本。

例如，某个条目可能使用类似 `Version startsWith "atlascli/"` 的 `version_filter` 表达式。

这会使版本变成 `atlascli/1.2.3`，而这不是我们想要的结果。修复方法是使用
`version_prefix` 而不是 `version_filter`，并将前缀（本例中的 `atlascli/`）放入
`version_prefix` 字段。mise 会自动移除前缀，并在需要时将其加回；使用 `version_filter` 时无法做到这一点。
