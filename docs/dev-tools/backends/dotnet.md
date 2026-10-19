---
description: "通过 dotnet tool install 从 NuGet 安装 .NET 命令行工具，每个工具使用独立目录。"
---

# dotnet 后端

`dotnet` 后端使用 `dotnet tool install` 从 [NuGet](https://www.nuget.org/) 安装 .NET 命令行工具包。不带前缀的 `dotnet` 工具安装的是 SDK 本身；有关 SDK 版本和 `global.json`，请参阅 [.NET 指南](/lang/dotnet.html)。

## 要求

<span id="dependencies"></span>

请安装 .NET SDK，以及工具包面向的运行时。较新的 SDK 不一定能运行面向旧版运行时的工具，因为 .NET 仍会按照运行时选择规则工作。运行 `mise exec -- dotnet --list-runtimes` 可查看已安装的运行时。配置中包含 `dotnet` 时，mise 会先安装它，再安装 .NET 工具。

## 用法

安装 .NET 8 和面向该版本构建的 GitVersion 发行版：

```sh
mise use dotnet@8 dotnet:GitVersion.Tool@6.0.5
mise exec -- dotnet-gitversion /version
```

这会将两个条目写入 `mise.toml`。若要写入全局配置，请在 `mise use` 后添加 `-g`。

```toml
[tools]
dotnet = "8"
"dotnet:GitVersion.Tool" = "6.0.5"
```

若要选择其他发行版，请运行 `mise ls-remote dotnet:GitVersion.Tool`，并检查该发行版的运行时要求。不带版本运行 `mise use dotnet:GitVersion.Tool` 会记录 `latest`。

mise 会使用 `--tool-path` 将每个工具安装到独立目录。它不会创建或更新项目的 `.config/dotnet-tools.json` 清单。

## 私有软件源

mise 会从 [`dotnet.registry_url`](/configuration/settings.html#dotnet.registry_url) 指定的 NuGet 服务索引列出版本，但 `dotnet tool install` 使用自己的 `NuGet.Config` 和凭据下载软件包。使用私有源时，请将其添加到 `NuGet.Config`，并将 `dotnet.registry_url` 指向对应的服务索引；仅更改此设置不会添加安装源。

这两个步骤分别进行身份验证。mise 列出版本时会通过 HTTP Basic 身份验证，将 [netrc](/configuration/settings.html#netrc) 凭据发送到匹配的主机，因此受密码保护的 Nexus 或 Artifactory 软件源需要在 `~/.netrc` 中添加对应条目：

```text
machine nexus.example.com
  login myuser
  password mytoken
```

`dotnet tool install` 不会读取 netrc。请在 `NuGet.Config` 中向 NuGet 提供软件源凭据，可以添加 `packageSourceCredentials` 条目，也可以使用 `dotnet nuget add source`。

## 工具选项

请在 `[tools]` 中的工具条目下设置这些选项，也可以内联指定，例如 `'dotnet:GitVersion.Tool[prerelease=true]'`。所有后端均接受的选项见[工具选项](/dev-tools/#tool-options)。

### `install_env`

为 `dotnet tool install` 设置环境变量：

```toml
[tools]
"dotnet:GitVersion.Tool" = { version = "latest", install_env = { DOTNET_NOLOGO = "1" } }
```

### `prerelease`

默认情况下，`mise ls-remote` 和 `latest` 不会包含 NuGet 预发行版本。设置 `prerelease = true` 可将其纳入：

```toml
[tools]
"dotnet:GitVersion.Tool" = { version = "latest", prerelease = true }
```

若要为所有工具包含预发行版本，请改为设置 [`prereleases`](/configuration/settings.html#prereleases)。

## 设置

有两个设置适用于 `dotnet:` 工具。其他 `dotnet.*` 设置用于配置 .NET SDK；参见 [.NET 指南](/lang/dotnet.html#settings)。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="dotnet" :keys="['registry_url', 'package_flags']" :level="3" />

从 mise 2026.11.0 起，设置 `dotnet.package_flags` 时会显示警告；mise 2027.11.0 将移除此设置。

## 故障排除

| 现象                       | 检查内容                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| 找不到 SDK                  | 运行 `mise exec -- dotnet --info`，并检查是否有 `global.json` 限制 SDK 选择。                              |
| 缺少所需框架                | 安装工具支持的运行时或 SDK，或选择面向现有运行时构建的工具发行版。                                       |
| 找不到软件包                | 确认该软件包是 .NET 工具，并且版本列表和安装操作都能访问其软件源。                                       |

实现：[`src/backend/dotnet.rs`](https://github.com/jdx/mise/blob/main/src/backend/dotnet.rs)。
