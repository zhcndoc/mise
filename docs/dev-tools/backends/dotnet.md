# Dotnet 后端

此功能的代码位于 mise 仓库中的 [`./src/backend/dotnet.rs`](https://github.com/jdx/mise/blob/main/src/backend/dotnet.rs)。

::: tip 重要
dotnet 后端需要已安装 .NET 运行时。你可以使用 mise 来安装它：

```sh
# 安装最新版本
mise use dotnet

# 或安装指定版本（8、9 等）
mise use dotnet@8
mise use dotnet@9
```

这将安装 .NET 运行时，这是 dotnet 工具正常工作的必需组件。
:::

## 用法

以下命令会安装 [GitVersion.Tool](https://gitversion.net/) 的最新版本，并
将其设为 PATH 上的活动版本：

```sh
$ mise use dotnet:GitVersion.Tool@5.12.0
$ dotnet-gitversion /version
5.12.0+Branch.support-5.x.Sha.3f75764963eb3d7956dcd5a40488c074dd9faf9e
```

版本将以以下格式设置到 `~/.config/mise/config.toml` 中：

```toml
[tools]
"dotnet:GitVersion.Tool" = "5.12.0"
```

```sh
$ mise use dotnet:GitVersion.Tool
$ dotnet-gitversion /version
6.1.0+Branch.main.Sha.8856e3041dbb768118a55a31ad4e465ae70c6767
```

版本将以以下格式设置到 `~/.config/mise/config.toml` 中：

```toml
[tools]
"dotnet:GitVersion.Tool" = "latest"
```

### 支持的 Dotnet 语法

| 描述                           | 用法                           |
| ------------------------------------- | ------------------------------- |
| Dotnet 简写最新版本       | `dotnet:GitVersion.Tool`        |
| Dotnet 指定版本的简写 | `dotnet:GitVersion.Tool@5.12.0` |

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

旧的 `dotnet.package_flags = ["prerelease"]` 设置已被弃用。请优先使用按工具配置的 `prerelease = true` 选项，或者在所有工具都应包含预发布版本时使用全局 `prereleases` 设置。由于 `dotnet.package_flags` 是全局配置，在依赖每个工具的 `prerelease = false` 排除选项之前，请先移除它。
