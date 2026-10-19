---
description: "使用 mise 安装 .NET SDK 和运行时，可通过 global.json 选择版本，也可为每个版本单独隔离。"
---

# .NET

mise 使用 Microsoft 的 `dotnet-install` 脚本安装 .NET SDK，也可以只安装 .NET 运行时。默认情况
下，所有 SDK 共用一个 `DOTNET_ROOT`；.NET 会根据项目的 `global.json` 选择 SDK。

## 快速开始

为当前项目安装最新的 .NET 10 SDK，并检查 .NET 实际选择的 SDK：

```sh
mise use dotnet@10
mise exec -- dotnet --version
mise exec -- dotnet --list-sdks
```

使用 `mise use -g dotnet@10` 设置个人默认版本。若要安装其他 SDK，但不修改项目的版本请求，请运行
`mise install`：

```sh
mise install dotnet@8
```

在默认的共享模式下，`dotnet --list-sdks` 会列出通过 mise 安装的所有 SDK，由 .NET 而非
`mise.toml` 决定实际运行哪个 SDK。如果项目必须使用特定 SDK 构建，请在安装前添加
[`global.json`](#version-files)，或启用[隔离模式](#isolated-mode)。

若要安装 `dotnet-ef` 等 .NET 全局工具，请使用
[`dotnet:` 后端](/dev-tools/backends/dotnet.html)，例如 `mise use dotnet:dotnet-ef`。

## 选择版本

| 版本请求                            | 安装内容                             |
| ----------------------------------- | ------------------------------------ |
| `dotnet@10`                         | 最新的 .NET 10 SDK                   |
| `dotnet@lts`                        | 当前 LTS 通道中的最新 SDK            |
| `dotnet@sts`                        | 当前 STS 通道中的最新 SDK            |
| `dotnet@8.0.425`                    | 指定 SDK 发行版                      |
| `dotnet[runtime=dotnet]@8.0.14`     | 仅安装 .NET 8.0.14 运行时            |
| `dotnet[runtime=aspnetcore]@8.0.14` | 仅安装 ASP.NET Core 8.0.14 运行时    |

`lts` 和 `sts` 依据 Microsoft 发布索引解析到相应类型中最新且处于 `active` 或 `maintenance` 支持阶段的通道，因此会跳过预览版、`go-live` 版本和已停止支持的通道。它们会解析为该通道中的 SDK；如果你在 `[tool_alias.dotnet.versions]` 中定义了同名版本，则优先使用该别名。它们不适用于[仅安装运行时](#runtime-only-installs)，此类安装需要指定精确版本。

mise 会从[版本列表主机](/configuration/settings.html#use_versions_host)获取 SDK 版本；关闭
`use_versions_host` 后，则从 Microsoft 的发布元数据获取。运行 `mise ls-remote dotnet` 查看
版本。`dotnet-core` 是 `dotnet` 的别名。运行时请求的写法请参见[仅安装运行时](#runtime-only-installs)。

## 版本文件

mise 可以从 `global.json` 读取 SDK 版本。请为 .NET 启用此功能。`settings add` 会在已启用的工具
列表末尾追加内容：

```sh
mise settings add idiomatic_version_file_enable_tools dotnet
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得相同的
行为。参见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

例如，以下文件请求一个精确 SDK 版本，并关闭 .NET 的滚动前进机制：

```json [global.json]
{
  "sdk": {
    "version": "8.0.425",
    "rollForward": "disable"
  }
}
```

运行 `mise install`，然后在项目目录中运行 `mise exec -- dotnet --version`。mise 会读取
`sdk.version` 并安装对应 SDK。`rollForward` 和其他 SDK 选择策略由 .NET 自行处理；参见
Microsoft 的 [`global.json` 参考文档](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)。
如果项目使用 `global.json` 指定版本，就不要同时在 `mise.toml` 中保留不同的 `dotnet` 版本。

## 共享安装与隔离安装 {#isolated-mode}

默认情况下，mise 会将所有 SDK 安装到同一个共享目录，这是 .NET 管理多个 SDK 的预期方式。mise
会将每个版本自己的安装目录链接到共享根目录，因此 `mise ls` 仍会跟踪这些版本。若没有
`global.json`，无论 `mise.toml` 指定了哪个版本，.NET 都会使用最新安装的 SDK。

若要像 mise 管理大多数工具那样，为每个 SDK 版本分别使用独立目录，请在安装前启用隔离模式：

```sh
mise settings dotnet.isolated=true
```

更改此设置不会移动已安装在共享根目录中的 SDK，因此请在安装所需版本前选好模式。

|                      | 共享（默认）             | 隔离                                            |
| -------------------- | ----------------------- | ----------------------------------------------- |
| `dotnet --list-sdks` | 列出所有已安装的 SDK     | 仅列出当前选择的 SDK                            |
| 安装位置             | 共享根目录              | `~/.local/share/mise/installs/dotnet/<version>` |
| 多目标构建           | 无需切换即可使用        | 需要切换版本                                    |

设置[`dotnet.dotnet_root`](/lang/dotnet.html#dotnet.dotnet_root) 后，它会作为共享根目录。若未设置，
mise 会依次使用环境中已有的 `DOTNET_ROOT` 和 `~/.local/share/mise/dotnet-root`。

## 仅安装运行时

若要运行 .NET 应用而不构建它们，请使用 `runtime` 选项仅安装运行时：

```sh
mise use "dotnet[runtime=dotnet]@8.0.14"
mise exec -- dotnet --list-runtimes
```

| `runtime` 的值   | 框架                           | 适用场景                |
| ---------------- | ------------------------------ | ----------------------- |
| `dotnet`         | `Microsoft.NETCore.App`        | 控制台应用、类库         |
| `aspnetcore`     | `Microsoft.AspNetCore.App`     | ASP.NET Core Web 应用   |
| `windowsdesktop` | `Microsoft.WindowsDesktop.App` | WPF 和 WinForms 应用    |

仅运行时请求中的版本号是 .NET 运行时版本，而非 SDK 版本：`8.0.14` 表示 .NET Runtime 8.0.14
（参见 [.NET 发布说明](https://github.com/dotnet/core/tree/main/release-notes)）。必须指定精确版本。
`dotnet[runtime=dotnet]@8` 无效，因为前缀会按 SDK 版本解析。仅安装运行时不包含 SDK，因此不能使用
`dotnet build`、`dotnet publish` 和 `dotnet --version`。

你可以同时安装供开发使用的 SDK 和用于模拟生产环境的运行时：

```toml [mise.toml]
[tools]
dotnet = ["10", { version = "8.0.14", runtime = "dotnet" }]
```

## 环境变量

mise 会为所选 .NET 设置以下变量，并将 `DOTNET_ROOT` 加入 `PATH`：

| 变量                          | 值                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DOTNET_ROOT`                 | 共享根目录；隔离模式下则为所选版本的安装目录                                                               |
| `DOTNET_MULTILEVEL_LOOKUP`    | `0`，使 .NET 不会在 `DOTNET_ROOT` 之外查找 SDK                                                            |
| `DOTNET_CLI_TELEMETRY_OPTOUT` | 仅在设置[`dotnet.cli_telemetry_optout`](/lang/dotnet.html#dotnet.cli_telemetry_optout) 时为 `1` 或 `0`     |

## mise 如何安装 .NET

每次安装时，mise 都会从 `dot.net` 下载当前版本的 `dotnet-install` 脚本（Windows 上为
`dotnet-install.ps1`，其他平台为 `dotnet-install.sh`），并传入请求的版本和安装目录来运行。SDK
或运行时由该脚本下载。安装 SDK 后，mise 会运行 `dotnet --list-sdks` 并检查列表中是否包含新
SDK。从共享根目录卸载某个版本时，只会删除对应的 SDK 或运行时目录。

如果已安装名为 `dotnet` 的插件，它的优先级高于内置安装器。如果 mise 的行为与本文不符，请检查
[`mise plugins ls`](/cli/plugins/ls.html)，并参见[选择其他实现](/core-tools.html#selecting-another-implementation)。

## 工具选项

### `runtime`

仅安装指定的运行时，不安装 SDK。参见[仅安装运行时](#runtime-only-installs)。

### `install_env`

为 `dotnet-install` 脚本和 `dotnet --list-sdks` 检查设置环境变量。该选项不会影响 mise 自己
下载脚本的过程，因此请在运行 mise 的环境中通过 `https_proxy` 设置代理。mise 下载脚本和脚本自行
下载内容时都会使用该代理（参见[常见问题](/faq.html#how-do-i-use-mise-with-http-proxies)）。

若要关闭 .NET CLI 遥测，请改为设置
[`dotnet.cli_telemetry_optout`](/lang/dotnet.html#dotnet.cli_telemetry_optout)。其他通用选项
参见[工具选项](/dev-tools/#tool-options)。

<a id="settings"></a>

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="dotnet" :level="3" />
