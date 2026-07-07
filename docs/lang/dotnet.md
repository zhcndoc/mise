# .NET

核心 .NET 插件使用 Microsoft 的官方安装脚本安装 .NET SDK。所有 SDK 版本都会按照 .NET 的原生多版本模型，共同安装在一个共享的 `DOTNET_ROOT` 目录下并并排共存。这意味着 `dotnet --list-sdks` 会显示你通过 mise 安装的每一个版本。

与大多数工具不同，这些 SDK 不会存放在 `~/.local/share/mise/installs` 中，因为它们共享一个公共根目录。mise 会将安装路径符号链接到 `DOTNET_ROOT`，并设置环境变量，以便正确获取对应的 SDK。

::: info
此插件管理的是 **.NET SDK** 本身。要安装 .NET 全局工具（例如 `dotnet-ef`），请使用带有 `dotnet:ToolName` 语法的 [`dotnet` 后端](/dev-tools/backends/dotnet.html)。
:::

## 用法

使用最新的 .NET SDK：

```sh
mise use -g dotnet@latest
dotnet --version
```

使用特定版本：

```sh
mise use -g dotnet@8.0.400
dotnet --version
```

并排安装多个 SDK 以支持多目标编译：

```sh
mise use dotnet@8
mise use dotnet@9
dotnet --list-sdks
```

## `global.json` 支持

mise 将 `global.json` 识别为一种惯用的版本文件。如果你的项目包含一个带有 SDK 版本的 `global.json`，
mise 会自动使用它：

```json
{
  "sdk": {
    "version": "8.0.100"
  }
}
```

启用惯用版本文件支持：

```sh
mise settings set idiomatic_version_file_enable_tools=dotnet
```

## 隔离模式

默认情况下，所有 SDK 版本共享一个 `DOTNET_ROOT` 目录。这与 .NET 的原生
并行安装模型一致，这意味着 `dotnet --list-sdks` 会显示所有已安装的版本。

如果你更喜欢传统的 mise 方式，即每个版本都有自己的目录，请启用
隔离模式：

```sh
mise settings set dotnet.isolated=true
```

在隔离模式下，每个 SDK 版本都会安装到 `~/.local/share/mise/installs/dotnet/<version>/`，
就像大多数其他由 mise 管理的工具一样。`dotnet --list-sdks` 只会报告当前激活的
版本。

|                      | 共享（默认）             | 隔离                         |
| -------------------- | ---------------------- | ---------------------------- |
| `dotnet --list-sdks` | 所有已安装的版本         | 仅当前激活的版本              |
| 安装位置             | `DOTNET_ROOT`          | `installs/dotnet/<version>/` |
| 多目标编译           | 开箱即用               | 需要切换版本                  |

## 仅运行时安装

默认情况下，mise 会安装完整的 .NET SDK。如果你只需要 _运行_ .NET 应用程序，而不需要构建它们，也不需要 SDK 带来的额外开销，你可以使用 `runtime` 内联选项只安装运行时：

```sh
mise use dotnet[runtime=dotnet]@8.0.14
dotnet --list-runtimes
```

### 有效的运行时值

| 值             | 框架                          | 使用场景                   |
| -------------- | ----------------------------- | -------------------------- |
| dotnet         | Microsoft.NETCore.App         | 控制台应用、库             |
| aspnetcore     | Microsoft.AspNetCore.App      | ASP.NET Core Web 应用      |
| windowsdesktop | Microsoft.WindowsDesktop.App  | WPF / WinForms（Windows） |

### 示例：混合使用 SDK 和运行时

你可以为开发安装完整的 SDK，同时安装一个运行时以获得类似生产环境的配置：

```toml
[tools]
dotnet = ["9", { version = "8.0.14", runtime = "dotnet" }]
```

::: warning

- **版本号是运行时版本**，不是 SDK 版本。例如，`8.0.14` 指的是 .NET Runtime 8.0.14，而不是 SDK 8.0.14。可查看 [.NET 发行说明](https://github.com/dotnet/core/tree/main/release-notes) 了解可用的运行时版本。
- 仅运行时安装**不包含** SDK 构建工具。像 `dotnet build` 和 `dotnet publish` 这样的命令将不可用，并且 `dotnet --version` 不会报告 SDK 版本。

:::

::: tip
仅支持精确的运行时版本（例如，`dotnet[runtime=dotnet]@8.0.14`）。像 `@8` 这样的通道语法目前不支持用于运行时安装，因为它解析的是 SDK 版本，而不是运行时版本。
:::

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `dotnet` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 .NET 安装脚本和安装时验证命令设置环境变量：

```toml
[tools]
dotnet = { version = "latest", install_env = { DOTNET_CLI_TELEMETRY_OPTOUT = "1" } }
```

## 环境变量

该插件会设置以下环境变量：

| 变量                          | 值                                                         |
| ----------------------------- | ---------------------------------------------------------- |
| `DOTNET_ROOT`                 | 共享 SDK 安装目录（如果是隔离安装，则为安装路径） |
| `DOTNET_MULTILEVEL_LOOKUP`    | `0`                                                        |
| `DOTNET_CLI_TELEMETRY_OPTOUT` | 仅在配置了 `dotnet.cli_telemetry_optout` 时设置  |

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="dotnet" :level="3" />
