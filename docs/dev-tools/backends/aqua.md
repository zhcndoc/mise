# Aqua 后端

[Aqua](https://aquaproj.github.io/) 工具可以在 mise 中原生使用。aqua 是新工具的理想后端，
因为它们不需要插件，支持 Windows，并且除了校验和之外还提供安全
功能。aqua 的安装过程还会显示更多进度条，这一点很不错。

你不需要单独安装 aqua。mise 中完全不会使用 aqua CLI。实际使用的是
[aqua registry](https://github.com/aquaproj/aqua-registry)，它会在发布时编译进 mise 可执行文件中。
这里有一个包条目的示例：[`aqua:hashicorp/terraform`](https://github.com/aquaproj/aqua-registry/blob/main/pkgs/hashicorp/terraform/registry.yaml)。
mise 内置了一个 aqua 的重新实现，它知道如何处理这些文件来安装工具。

截至本文撰写时，aqua 对 mise 来说还相对较新，而且由于许多工具正从
asdf 转换到 aqua，aqua 工具中可能还有一些需要进一步收紧的配置。
我在下面列出了一些常见问题；如果你发现问题，非常强烈建议你把修改贡献回 aqua registry。
维护者响应非常迅速，也很容易合作。

如果其他方法都失败了，你可以通过 [`MISE_DISABLE_BACKENDS=aqua`](/configuration/settings.html#disable_backends) 完全禁用 aqua。

目前，aqua 工具不支持设置环境变量，也不支持除了简单下载
二进制文件之外的更多功能（而且我也不确定这一功能将来是否会被加入），因此某些工具很可能
始终需要像 asdf/vfox 这样的插件。

这段代码位于 mise 仓库中的 [`./src/backend/aqua.rs`](https://github.com/jdx/mise/blob/main/src/backend/aqua.rs)。

## 自定义注册表

将 [`aqua.registries`](/configuration/settings.html#aqua-registries) 设置为在内置注册表之前检查自定义 aqua
注册表仓库：

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

mise 会从每个仓库根目录下载 `registry.yaml`，如有需要则回退到 `registry.yml`。
下载的注册表源会根据 [`aqua.registry_cache_ttl`](/configuration/settings.html#aqua-registry_cache_ttl) 缓存到
`MISE_CACHE_DIR` 下，默认值为一周。在 `MISE_AQUA_REGISTRIES` 中，多个注册表 URL 之间用逗号分隔。

当刷新后的注册表源被下载后，mise 会对该源进行哈希处理，并使用该哈希作为编译后注册表缓存路径的一部分。
当新的编译缓存成功加载或写入时，会清理同一注册表 URL 的旧编译缓存。

包的解析会按配置的注册表顺序进行检查。当启用 `aqua.baked_registry` 时，内置注册表仍会作为所有已配置注册表中缺失包的回退。
Aqua 注册表别名仅在定义它们的注册表内有效；当你希望 mise 的简写或别名指向来自其他注册表的 aqua
包时，请使用 [`[tool_alias]`](/dev-tools/aliases)。

旧版的 [`aqua.registry_url`](/configuration/settings.html#aqua-registry_url) 设置仍然支持单个注册表 URL，但当两者都设置时，`aqua.registries` 优先。

## 使用

下面的命令会安装 ripgrep 的最新版本，并将其设置为 PATH 上的活动版本：

```sh
$ mise use -g aqua:BurntSushi/ripgrep
$ rg --version
ripgrep 14.1.1
```

该版本将以以下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"aqua:BurntSushi/ripgrep" = "latest"
```

如果某些工具在 [registry/](https://github.com/jdx/mise/blob/main/registry/) 中被指定为使用 aqua 后端，它们将默认使用 aqua。要查看这些工具，请运行 `mise registry | grep aqua:`。

## 工具选项

### `symlink_bins`

有些工具会捆绑额外的可执行文件，这些文件你可能不希望暴露在 PATH 上。例如，`aws-cli` 会捆绑
Python，这可能会与你期望使用的 Python 版本冲突。

设置 `symlink_bins = true` 会创建一个经过筛选的 `.mise-bins` 目录，只暴露 mise
打算为该 Aqua 包公开的二进制文件，而不是从安装中发现的所有可执行文件。

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

设置后，预发布标签（例如 `v1.0.0-rc1`、`v0.1.2-dev.86`）会出现在 `mise ls-remote` 中，`latest` 会基于包含预发布版本的完整列表进行解析，模糊版本查询也会匹配预发布标签。当包使用 `github_tag` 版本源时无效（git 标签不携带 prerelease 标记）。草稿发布始终被排除。更多细节请参见 [github 后端文档](/dev-tools/backends/github.html#prerelease)。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="aqua" :level="3" />

## 安全验证

Aqua 后端支持多种安全验证方法，以确保下载工具的完整性和真实性。mise 为所有验证方法提供了**原生 Rust 实现**，无需依赖 `cosign`、`slsa-verifier` 或 `gh` 等外部 CLI 工具。

### GitHub Artifact Attestations

GitHub Artifact Attestations 提供加密证明，表明制品是由特定的 GitHub Actions 工作流构建的。mise 原生验证这些证明，以确保下载工具的真实性和完整性。

**要求：**

- 工具必须在 aqua 注册表中配置 `github_artifact_attestations`，才能验证证明
- 不需要外部工具——验证由 mise 原生处理

**配置：**

```bash
# 启用/禁用 GitHub artifact attestations 验证（默认：true）
export MISE_AQUA_GITHUB_ATTESTATIONS=true
```

**注册表配置示例：**

```yaml
packages:
  - type: github_release
    repo_owner: cli
    repo_name: cli
    github_artifact_attestations:
      signer_workflow: cli/cli/.github/workflows/deployment.yml
```

### Cosign 验证

mise 原生验证 Cosign 签名，无需安装 `cosign` CLI 工具。

**配置：**

```bash
# 启用/禁用 Cosign 验证（默认：true）
export MISE_AQUA_COSIGN=true

# 向验证过程传递额外参数
export MISE_AQUA_COSIGN_EXTRA_ARGS="--key /path/to/key.pub"
```

### SLSA 溯源验证

mise 原生验证 SLSA（软件制品供应链级别）溯源，无需安装 `slsa-verifier` CLI 工具。

**配置：**

```bash
# 启用/禁用 SLSA 验证（默认：true）
export MISE_AQUA_SLSA=true
```

### 其他安全方法

Aqua 还支持：

- **Minisign 验证**：使用 minisign 进行签名验证
- **校验和验证**：验证 SHA256/SHA512/SHA1/MD5 校验和（始终启用）

### 验证流程

在安装工具期间，mise 将：

1. 下载工具及其签名/证明文件
2. 使用配置的方法进行原生验证
3. 通过进度指示器显示验证状态
4. 如果任何验证失败，则中止安装

**安装期间的示例输出：**

```
✓ 已下载 cli/cli v2.50.0
✓ GitHub artifact attestations 已验证
✓ 工具安装成功
```

### 故障排查

如果验证失败：

1. **检查网络连接**：验证需要下载证明数据
2. **验证工具配置**：确保 aqua 注册表具有正确的验证设置
3. **禁用特定验证**：临时禁用有问题的验证方法
4. **启用调试日志**：使用 `MISE_DEBUG=1` 查看详细的验证日志

**常见问题：**

- **未找到证明**：该工具可能未在注册表中配置证明
- **验证超时**：网络问题或证明服务响应缓慢
- **证书验证**：时钟偏差或证书链问题

要临时禁用所有验证：

```bash
export MISE_AQUA_GITHUB_ATTESTATIONS=false
export MISE_AQUA_COSIGN=false
export MISE_AQUA_SLSA=false
export MISE_AQUA_MINISIGN=false
```

## Common aqua issues

以下是我在使用 aqua 工具时见过的一些常见问题。

### Supported env missing

aqua 注册表为每个工具定义了 os/arch 的支持环境。我注意到其中一些
只是缺少实际上受支持的 os/arch 组合——这可能是因为该工具的注册表创建之后才加入的。

修复很简单，只需编辑相关工具 `registry.yaml` 中的 `supported_envs` 部分即可。

### Using `version_filter` instead of `version_prefix`

这是一个很奇怪的问题，会在 mise 中引发奇怪的故障。一般来说，在 mise 里我们喜欢像
`1.2.3` 这样的版本号，不带 `v1.2.3` 或 `cli-v1.2.3` 之类的装饰。这种一致性不仅让 `mise.toml`
更简洁，也有助于像 `mise up` 这样的功能正常工作，因为它能够把它解析为
semver，而不用处理一堆边缘情况。

实际上，如果你注意到 aqua 工具给出的版本号不是简单的三段式，那么值得修正。

我见过的一个常见情况是，注册表使用了像 `Version startsWith "Version startsWith "atlascli/""` 这样的 `version_filter` 表达式。

这最终会导致版本变成 `atlascli/1.2.3`，而这不是我们想要的。修复方法是使用
`version_prefix` 而不是 `version_filter`，并且只把前缀放到 `version_prefix` 字段里。
在这个例子中，它应该是 `atlascli/`。mise 会自动把它去掉并在需要时再加回去，
而这对 `version_filter` 做不到。
