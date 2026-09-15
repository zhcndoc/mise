---
description: "使用 dotnet 后端从 NuGet 安装 .NET 命令行工具"
---

# .NET 工具后端

`dotnet:` 后端使用 `dotnet tool install` 从 NuGet 安装命令行工具包。未加前缀的 `dotnet` 工具用于安装 SDK；有关 SDK 选择和 `global.json`，请参阅 [.NET 语言指南](/lang/dotnet.html)。

## 依赖项

安装 .NET SDK 以及所选工具包所需的运行时。仅使用较新的 SDK 并不能保证旧版工具可以运行：仍需遵循 .NET 的运行时选择规则。使用 `mise exec -- dotnet --list-runtimes` 检查已安装的内容。

## 用法

此示例将 .NET 8 与包含 .NET 8 工具的 GitVersion 版本配对：

```sh
mise use dotnet@8 dotnet:GitVersion.Tool@6.0.5
mise exec -- dotnet-gitversion /version
```

两个条目都会写入**项目的** `mise.toml`：

```toml
[tools]
dotnet = "8"
"dotnet:GitVersion.Tool" = "6.0.5"
```

为 `mise use` 添加 `-g` 可使用全局配置。要选择其他版本，请运行 `mise ls-remote dotnet:GitVersion.Tool` 并检查该版本的运行时要求。运行 `mise use dotnet:GitVersion.Tool` 会记录一个 `latest` 请求。

mise 使用 `--tool-path` 将每个工具安装到其自己的目录中；它不会创建或更新项目的 `.config/dotnet-tools.json` 清单。

## 私有源

`dotnet.registry_url` 选择用于版本发现的 NuGet 服务索引。`dotnet` CLI 会单独处理安装，使用其 NuGet 配置和凭据。同时在 `NuGet.Config` 中配置安装源；仅更改发现端点不会向 CLI 添加源。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列出的环境变量来配置这些项。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="dotnet" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `dotnet` 后端——这些内容放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `dotnet tool install` 命令设置环境变量：

```toml
[tools]
"dotnet:GitVersion.Tool" = { version = "latest", install_env = { DOTNET_CLI_TELEMETRY_OPTOUT = "1" } }
```

### `prerelease`

默认情况下，NuGet 预发布版本会被排除在 `mise ls-remote` 和 `latest` 解析之外。将 `prerelease = true` 设为包含它们：

```toml
[tools]
"dotnet:GitVersion.Tool" = { version = "latest", prerelease = true }
```

旧版 `dotnet.package_flags = ["prerelease"]` 设置已弃用。优先使用每个工具的 `prerelease = true` 选项，或者在所有工具都应包含预发布版本时使用全局 `prereleases` 设置。由于 `dotnet.package_flags` 是全局设置，因此在依赖每个工具的 `prerelease = false` 退出选项之前，请先移除它。

## 故障排除

- **未找到 SDK：** 检查 `mise exec -- dotnet --info` 以及限制 SDK 选择的任何 `global.json`
- **缺少所需框架：** 安装兼容的运行时／SDK，或选择面向当前运行时的工具版本
- **未找到包：** 确认该包是 .NET 工具，并且发现和安装过程都可以访问其源

实现：[`src/backend/dotnet.rs`](https://github.com/jdx/mise/blob/main/src/backend/dotnet.rs)。
