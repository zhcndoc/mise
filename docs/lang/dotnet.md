---
description: "核心 .NET 插件使用 Microsoft 的官方安装脚本安装 .NET SDK。"
---

# .NET

核心 .NET 插件使用 Microsoft 的官方安装脚本安装 .NET SDK。所有 SDK 版本都会并行安装在共享的 `DOTNET_ROOT` 目录下，这与 .NET 原生的多版本模型一致。这意味着 `dotnet --list-sdks` 会显示你通过 mise 安装的每个版本。

与大多数工具不同，SDK 不会存放在 `~/.local/share/mise/installs` 中，因为它们共享一个公共根目录。mise 会将其跟踪路径符号链接到 `DOTNET_ROOT`，并将这个共享安装目录添加到 `PATH` 中。然后，.NET SDK 解析器会选择一个 SDK；如果存在 `global.json`，则会使用其中的配置。没有该文件时，.NET 通常会使用已安装的最高版本 SDK；仅声明 mise 版本并不能在共享模式下隔离 SDK 的选择。

::: info
此插件管理的是 **.NET SDK** 本身。要安装 .NET 全局工具（例如 `dotnet-ef`），请使用带有 `dotnet:ToolName` 语法的 [`dotnet` 后端](/dev-tools/backends/dotnet.html)。
:::

## 用法

为当前项目安装最新的 SDK，并检查共享安装目录：

```sh
mise use dotnet@latest
mise exec -- dotnet --list-sdks
mise exec -- dotnet --version
```

使用 `mise use -g dotnet@latest` 设置个人默认版本。要在不替换项目版本请求的情况下安装另一个 SDK，请使用 `mise install`：

```sh
mise install dotnet@8.0.400
mise exec -- dotnet --list-sdks
```

对于必须使用特定 SDK 构建的项目，请配置下面的 `global.json`，或在安装前启用[隔离模式](#isolated-mode)。

## `global.json` 支持

启用发现功能，使 mise 安装项目声明的 SDK，同时保留其他已经通过惯用版本文件启用的工具：

```sh
mise settings add idiomatic_version_file_enable_tools dotnet
```

例如，以下文件请求一个确切的 SDK，并禁用 .NET 的版本前滚行为：

```json
{
  "sdk": {
    "version": "8.0.400",
    "rollForward": "disable"
  }
}
```

运行 `mise install`，然后在项目目录中运行 `mise exec -- dotnet --version`。mise 会读取 `sdk.version` 以安装所请求的 SDK。.NET 本身会解释 `rollForward` 和其他 SDK 选择策略；请参阅 Microsoft 的 [`global.json` 参考](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)。如果 `global.json` 是项目的版本来源，请不要在 `mise.toml` 中保留冲突的 `dotnet` 版本。

## 隔离模式

默认情况下，所有 SDK 版本共享一个 `DOTNET_ROOT` 目录。这与 .NET 的原生并行安装模型一致，这意味着 `dotnet --list-sdks` 会显示所有已安装的版本。

如果你更喜欢传统的 mise 方式，即每个版本都有自己的目录，请启用隔离模式：

```sh
mise settings set dotnet.isolated=true
```

请在安装所需版本之前选择此模式。仅更改设置不会将现有的共享安装移动到隔离目录中。

在隔离模式下，每个 SDK 版本都会安装在 `~/.local/share/mise/installs/dotnet/<version>/` 下，就像大多数其他由 mise 管理的工具一样。`dotnet --list-sdks` 只会报告当前激活的版本。

|                      | 共享（默认）             | 隔离                         |
| -------------------- | ---------------------- | ---------------------------- |
| `dotnet --list-sdks` | 所有已安装的版本         | 仅当前激活的版本              |
| 安装位置             | `DOTNET_ROOT`          | `installs/dotnet/<version>/` |
| 多目标编译           | 开箱即用               | 需要切换版本                  |

## 仅运行时安装

默认情况下，mise 会安装完整的 .NET SDK。如果你只需要_运行_ .NET 应用，而不需要构建应用或承担 SDK 的额外开销，可以使用 `runtime` 内联选项仅安装运行时：

```sh
mise use "dotnet[runtime=dotnet]@8.0.14"
mise exec -- dotnet --list-runtimes
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

以下 [tool-options](/dev-tools/#tool-options) 适用于 `dotnet` 后端。这些选项放在 `mise.toml` 的 `[tools]` 部分中。

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
