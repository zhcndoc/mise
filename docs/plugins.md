---
description: "插件为 mise 添加安装逻辑、环境指令或引导包管理器"
---

# 插件

插件为 mise 添加安装逻辑、环境指令或引导包管理器。大多数工具都可以直接使用内置的[后端](/dev-tools/backends/)，即使它们没有[注册表](/registry.html)简写。安装插件前请先从这里开始。

对于发布二进制文件，如果发布者提供了签名清单，优先使用 [packslip](/dev-tools/backends/packslip.html)，然后是 [aqua](/dev-tools/backends/aqua.html)、[github](/dev-tools/backends/github.html) 或 [gitlab](/dev-tools/backends/gitlab.html)。当集成需要这些后端无法提供的自定义行为时，请使用插件。

插件代码可以使用你的权限读取文件、发起请求和运行进程。Lua 的跨平台运行时并不会让插件成为操作系统沙箱。请检查源代码及其更新；新的 asdf 和 vfox 工具插件不会被接受加入 mise 注册表。

## 选择插件类型

| 类型        | 用途                                                   | 配置                                | 作者指南                                             |
| ----------- | ------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------- |
| 后端        | 由一个集成管理的多个版本化工具                         | `[tools]`、`my-backend:tool`        | [后端开发](/backend-plugin-development.html)         |
| 工具        | 带有下载／安装钩子的单个版本化工具                     | `[tools]`、已安装的插件名称         | [工具开发](/tool-plugin-development.html)            |
| 环境        | 不安装工具的变量或 PATH 条目                           | `[env]`、`_.my-plugin`              | [环境开发](/env-plugin-development.html)             |
| 软件包      | 用于机器引导的主机管理软件包                           | `[bootstrap.packages]`              | [软件包开发](/package-plugin-development.html)       |
| asdf        | 现有的基于 shell 的工具集成                            | `[tools]`、一个 asdf 后端            | [旧版插件](/asdf-legacy-plugins.html)                |

在 `[bootstrap.plugins]` 中注册包管理器，或将其安装为 `package:<name>`，然后再在 `[bootstrap.packages]` 中声明其请求。完整配置请参阅[软件包插件设置](/bootstrap/packages/plugins.html)。

Lua 运行时可在 Windows、macOS 和 Linux 上使用。每个插件仍必须支持所选平台以及它调用的任何外部程序。asdf 插件使用 shell 脚本，在 Windows 上默认处于禁用状态。

## 后端插件

后端插件实现 `BackendListVersions`、`BackendInstall` 和 `BackendExecEnv`。前缀就是你安装插件时使用的名称：

```sh
# Replace this example repository and tool with your plugin's values.
mise plugin install my-backend https://github.com/your-org/my-backend
mise use my-backend:some-tool@1.0.0
mise exec -- some-tool --version
```

安装、本地开发和更新请参阅[使用插件](/plugin-usage.html)。[后端模板](https://github.com/jdx/mise-backend-plugin-template)提供了一个起点。

## 工具插件

工具插件通过 `Available`、`PreInstall` 和 `EnvKeys` 等钩子管理一个工具。使用其已安装的名称作为工具名称：

```sh
mise plugin install my-tool https://github.com/your-org/my-tool-plugin
mise use my-tool@1.0.0
mise exec -- my-tool --version
```

这些仓库名和可执行文件名都是占位符。编写自己的插件时，请从[工具模板](https://github.com/jdx/mise-tool-plugin-template)开始。

## 环境插件

环境插件实现 `MiseEnv`，并可选择实现 `MisePath`。在使用其指令前先安装它：

```sh
mise plugin install my-env-plugin https://github.com/your-org/my-env-plugin
```

```toml
[env]
_.my-env-plugin = {
  api_url = "https://api.example.com",
  debug = true,
}
```

字段由插件定义。有关返回值、缓存行为以及[环境模板](https://github.com/jdx/mise-env-plugin-template)，请参阅[环境插件开发](/env-plugin-development.html)。

## 软件包插件

软件包插件为[引导软件包](/bootstrap/packages/plugins.html)实现主机软件包管理器。它们以软件包请求批次为单位运行，并报告已安装状态。与存储在 mise 数据目录下的版本化工具不同，它们的安装归主机管理器所有。有关钩子契约，请参阅[软件包插件开发](/package-plugin-development.html)。

## 通用插件使用

[使用插件](/plugin-usage.html)介绍仓库 URL、归档安装、本地链接、固定插件修订版本和诊断。使用以下命令列出已安装的内容：

```sh
mise plugins ls --urls
```

## asdf（旧版）插件

mise 可以通过 `bin/list-all`、`bin/install` 和 `bin/exec-env` 等脚本运行现有的 asdf 插件。请使用[旧版指南](/asdf-legacy-plugins.html)维护插件，或使用[钩子迁移表](/dev-tools/backends/asdf.html#hook-migration-asdf-to-vfox)将其移植到 Lua。

## 插件作者

[mise-plugins 组织](https://github.com/mise-plugins)托管社区插件。请通过 [GitHub 讨论](https://github.com/jdx/mise/discussions)联系维护者，讨论托管事宜。托管插件与添加注册表简写是两个独立的决定；请参阅[发布指南](/plugin-publishing.html)。

## 工具选项

插件在其工具配置中定义自定义选项。例如，支持 `mirror` 选项的插件可以接受：

```toml
[tools]
my-tool = {
  version = "1.0.0",
  mirror = "https://mirror.example.com",
}
```

对于 asdf 和特定版本的 vfox 生命周期钩子，该选项会公开为 `MISE_TOOL_OPTS__MIRROR`。这些变量仅限于钩子执行期间，不会导出到你的 shell 中。由 mise 管理的字段，例如 `depends`、`install_env` 和 `os`，则由 mise 处理。后端插件钩子通过 `ctx.options` 接收包括数组和嵌套表在内的类型化选项；请参阅[后端上下文](/backend-plugin-development.html#context-variables)。

## 模板

`[plugins]` 中的仓库值支持[模板](/templates.html)。对于私有仓库，优先使用普通的 SSH 或 HTTPS 仓库 URL 以及你的 Git 凭据设置；将凭据嵌入 URL 可能会将其暴露在配置或日志中。

```toml
[plugins]
my-backend = "git@github.com:your-org/my-backend.git"
```
