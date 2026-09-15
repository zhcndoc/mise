---
description: "当集成需要自定义安装逻辑、环境指令或主机包管理器时，请使用插件。"
---

# 使用插件

当集成需要自定义安装逻辑、环境指令或主机包管理器时，请使用插件。工具不需要注册表简写或插件即可安装：首先检查是否有内置的[后端](/dev-tools/backends/)可以直接接受它。例如，`mise use npm:prettier` 使用内置的 npm 后端。

## 什么是插件？

Lua 插件支持多个接口。[插件概览](/plugins.html#choose-a-plugin-type)比较了后端、工具、环境和包插件。本页面介绍如何安装和维护它们；[asdf 插件](/asdf-legacy-plugins.html)有单独的兼容性指南。

### 后端插件

后端插件使用 `plugin-name:tool` 管理一个或多个工具。例如，`vfox-npm:prettier` 通过安装为 `vfox-npm` 的插件选择 `prettier`。

### 工具插件

工具插件管理一个工具。使用其安装时所用的名称，例如 `my-tool`。Lua 可在 Windows、macOS 和 Linux 上运行，但插件自身的依赖项和安装逻辑决定了它支持哪些平台。

## 安装插件

### 从 Git 仓库安装

```sh
# Substitute your plugin's name and repository URL.
mise plugin install my-plugin https://github.com/your-org/my-plugin
```

如需指定 Git 修订版本，请在 URL 后追加 `#<ref>`：

```sh
mise plugin install my-plugin 'https://github.com/your-org/my-plugin#v1.0.0'
```

当需要不可变的源修订版本时，请使用提交 ID。标签或分支可能会移动。更改修订版本前请先检查更新；工具版本固定是另一项选择。

### 从 Zip 文件安装

对于 HTTPS 压缩包，请提供其 URL，而不是 Git URL：

```sh
mise plugin install my-plugin https://github.com/your-org/my-plugin/archive/refs/tags/v1.0.0.zip
```

压缩包必须包含有效的插件。解压后的压缩包没有 Git 检出内容，无法用于 `mise plugin update`；更新时请明确安装新的压缩包。

### 从本地目录安装

```sh
mise plugin link my-plugin /path/to/plugin/directory
```

本地插件也可以在 `mise.toml` 中声明：

```toml
[plugins]
my-plugin = "./plugins/my-plugin"
```

支持绝对路径和 `~/...`。以 `./` 或 `../` 开头的显式相对路径会从声明文件的配置根目录解析。mise 会为该目录创建符号链接，因此本地编辑会立即生效。现有安装不会自动替换：使用 `mise plugins install --force my-plugin` 应用更改后的本地源，或在显式链接时使用 `mise plugins link --force my-plugin /path/to/plugin`。

## 使用插件（高级）

安装后端插件后，选择一个工具，然后调用其可执行文件：

```sh
mise ls-remote my-backend:some-tool
mise use my-backend:some-tool@1.0.0
mise exec -- some-tool --version
```

如需仅为一条命令使用某个版本而不写入配置：

```sh
mise exec my-backend:some-tool@1.0.0 -- some-tool --version
```

请将名称替换为插件文档中说明的标识符。`--` 后的参数是一个可执行文件，可能与工具名称不同：例如，TypeScript 包提供的是 `tsc`。单独使用 `mise install` 会安装版本；`mise use` 还会在配置中选择该版本。

## 插件：工具格式

前缀是已安装的后端插件名称，后缀标识该后端中的工具。这不是普通单工具插件的语法。请使用：

```toml
[plugins]
my-backend = "https://github.com/your-org/my-backend"
my-tool = "https://github.com/your-org/my-tool-plugin"

[tools]
"my-backend:some-tool" = "1.0.0"
my-tool = "2.0.0"
```

仓库和版本值仅用于示例；请选择插件返回的版本。

## 管理插件

### 列出已安装的插件

```sh
mise plugins ls
mise plugins ls --urls
```

### 更新插件

```sh
mise plugin update my-plugin
mise plugin update my-plugin#v1.1.0
mise plugin update  # all installed Git plugins
```

这会更新插件代码，而不会更新其已安装的工具版本。本地链接会被跳过。使用 `mise plugins ls --urls` 检查生成的修订版本。

### 移除插件

```sh
mise plugin remove my-plugin
```

默认情况下，这会移除插件代码并保留已安装的工具。这些工具可能仍需要插件来解析其可执行文件路径或环境。在移除插件前，请使用 `mise uninstall` 移除不再需要的工具版本。对于单工具插件，`mise plugin remove --purge my-plugin` 还会移除其安装内容、下载内容和缓存。如果不再需要该集成，请移除相应的 `[plugins]` 和 `[tools]` 条目。

## 配置

如上所示，在 `[plugins]` 中声明插件源，在 `[tools]` 中声明工具版本。环境插件使用 `[env]`。在 `[bootstrap.plugins]` 中注册包管理器，或将其安装为 `package:<name>`，然后在 `[bootstrap.packages]` 中声明包请求；请参阅[包插件设置](/bootstrap/packages/plugins.html)。配置选项属于插件自身的接口，因此在从其他插件复制选项前，请先查阅其 README。

## 查找插件

请查看 [mise-plugins 组织](https://github.com/mise-plugins)、[mise 讨论区](https://github.com/jdx/mise/discussions)或你所在组织的仓库。[注册表](/registry.html)包含一些现有的、由插件支持的工具简写，但它不是通用的插件目录，也不接受新的 asdf 或 vfox 工具条目。

## 插件示例

### vfox-npm（示例插件）

[vfox-npm](https://github.com/jdx/vfox-npm)演示了一个多工具后端。它是插件开发示例；对于普通的 npm 工具安装，请使用 mise 内置的 [npm 后端](/dev-tools/backends/npm.html)：

```sh
mise use npm:prettier
mise exec -- prettier --check .
```

## 后端插件（高级）

后端插件实现 `BackendListVersions`、`BackendInstall` 和 `BackendExecEnv`。有关上下文字段和类型化工具选项，请参阅[后端插件开发](/backend-plugin-development.html)。

## 工具插件（高级）

工具插件使用 `Available`、`PreInstall`、`PostInstall` 和 `EnvKeys` 等钩子。有关生命周期顺序和惯用的版本文件支持，请参阅[工具插件开发](/tool-plugin-development.html)。

## 安全注意事项

插件代码在安装和使用期间会以你的权限运行。安装或更新前请检查其源代码和修订版本。插件可以调用外部命令；Lua 不会为这些操作提供操作系统沙箱。

`mise.toml` 或 `mise.lock` 中的工具固定不会固定插件代码。请单独固定插件仓库的修订版本，并检查其后端支持哪些[锁文件保证](/dev-tools/mise-lock.html)。有关安全模式和信任边界，请参阅[安全性](/security.html)。

## 故障排查

### 插件安装失败

检查仓库 URL、修订版本、Git 凭据以及 `mise plugins ls --urls` 的输出。本地目录必须包含插件所需的文件和钩子。要替换现有插件，请仅在检查预期源之后使用 `--force`。

### 工具安装失败

```sh
mise ls-remote my-backend:some-tool
mise install --verbose my-backend:some-tool@1.0.0
```

确认插件支持主机平台，并且所需的外部程序可用。详细输出会显示底层错误；请避免从日志中公开凭据。

### 环境问题

```sh
mise ls --current
mise where my-backend:some-tool
mise exec my-backend:some-tool@1.0.0 -- some-tool --version
```

使用 `mise where`，而不是猜测安装路径。对于环境插件，请在本地检查 `mise env --json`；其输出可能包含机密信息。仅成功安装并不会在当前 shell 中激活工具。

## 后续步骤

- [创建后端插件](/backend-plugin-development.html)。
- [创建工具插件](/tool-plugin-development.html)。
- [创建环境插件](/env-plugin-development.html)。
- [创建包插件](/package-plugin-development.html)。
- [发布插件](/plugin-publishing.html)。
