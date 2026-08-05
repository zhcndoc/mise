# 使用插件

mise 支持可扩展其功能的插件，使你能够安装标准注册表中不可用的工具。这对于以下场景尤其有用：

- 从私有仓库安装工具
- 使用实验性或小众工具
- 为你的团队创建自定义工具安装。

## 什么是插件？

插件是可以安装和管理不包含在 mise 内置注册表中的工具的扩展。它们使用 Lua 编写，并且主要分为两种类型：

### 后端插件

后端插件使用增强的后端方法，并支持 `plugin:tool` 格式：

- **多个工具**：单个插件可以管理多个工具
- **增强方法**：用于列出、安装和环境设置的后端方法
- **格式**：使用 `plugin:tool` 格式（例如，`vfox-npm:prettier`）

### 工具插件

工具插件使用传统的基于钩子的方式：

- **单个工具**：每个插件管理一个工具
- **基于钩子**：使用 `PreInstall`、`PostInstall`、`Available` 等钩子
- **格式**：直接使用工具名称（例如，`my-tool`）

两种类型都支持：

- 从任何来源安装工具（npm 包、GitHub releases、自定义构建）
- 设置环境变量和 PATH 条目
- 处理版本管理和列表
- 可在所有平台上运行（Windows、macOS、Linux）。

## 安装插件

### 从 Git 仓库安装

```bash
# 从仓库安装插件
mise plugin install <plugin-name> <repository-url>

# 示例：安装 vfox-npm 插件
mise plugin install vfox-npm https://github.com/jdx/vfox-npm
```

### 从 Zip 文件安装

```bash
# 通过 HTTPS 从 zip 文件安装插件
mise plugin install <plugin-name> <zip-url>

# 示例：从 zip 文件安装插件
mise plugin install tiny https://github.com/mise-plugins/mise-tiny.git
```

### 从本地目录安装

```bash
# 链接一个本地插件用于开发
mise plugin link <plugin-name> /path/to/plugin/directory
```

本地插件也可以在 `mise.toml` 中声明：

```toml
[plugins]
my-plugin = "./plugins/my-plugin"
```

支持绝对路径和 `~/...` 路径。以 `./` 或 `../` 开头的显式相对路径，将从包含该声明的文件的配置根目录解析。Mise 会像执行 `mise plugins link` 一样为该目录创建符号链接，因此本地编辑会立即生效。现有插件安装不会自动替换；将已有安装切换为本地源时，请使用 `mise plugins install --force my-plugin`。

## 使用插件（高级）

一旦安装了插件，你就可以使用 `plugin:tool` 格式来使用它：

```bash
# 使用插件安装特定工具
mise install vfox-npm:prettier@latest

# 使用该工具
mise use vfox-npm:prettier@3.0.0

# 执行该工具
mise exec vfox-npm:prettier -- --version

# 列出可用版本
mise ls-remote vfox-npm:prettier
```

## 插件：工具格式

`plugin:tool` 格式允许单个插件管理多个工具。这在以下场景中特别有用：

- **包管理器**：安装不同的 npm 包、Python 包等。
- **工具家族**：管理来自同一生态系统的相关工具
- **自定义构建**：安装同一工具的不同变体

### 示例：npm 包

```bash
# 使用同一个插件安装不同的 npm 包
mise install vfox-npm:prettier@latest
mise install vfox-npm:eslint@8.0.0
mise install vfox-npm:typescript@latest

# 在你的项目中使用它们
mise use vfox-npm:prettier@latest vfox-npm:eslint@8.0.0
```

## 管理插件

### 列出已安装的插件

```bash
# 显示所有插件
mise plugins ls

# 显示插件 URL
mise plugins ls --urls
```

### 更新插件

```bash
# 更新特定插件
mise plugin update vfox-npm

# 更新所有插件
mise plugin update --all
```

### 移除插件

```bash
# 移除一个插件
mise plugin remove vfox-npm

# 这也会移除该插件安装的所有工具
```

## 配置

可以在你的 `mise.toml` 文件中配置插件：

```toml
[plugins]
vfox-npm = "https://github.com/jdx/vfox-npm"

[tools]
"vfox-npm:prettier" = "latest"
"vfox-npm:eslint" = "8.0.0"
```

## 查找插件

虽然 mise 没有用于社区插件的集中式注册表，但你可以在以下地方找到它们：

- **GitHub**：搜索带有 “vfox-” 前缀的仓库
- **社区**：查看 mise 社区讨论和 Discord
- **公司内部**：你的组织可能有私有插件。

## 插件示例

### vfox-npm（示例插件）

`vfox-npm` 插件演示了如何创建一个用于安装 npm 包的插件：

```bash
# 安装插件
mise plugin install vfox-npm https://github.com/jdx/vfox-npm

# 安装工具
mise install vfox-npm:prettier@latest
mise install vfox-npm:eslint@latest

# 使用它们
mise use vfox-npm:prettier@latest
mise exec vfox-npm:prettier -- --check .
```

::: info
这只是一个用于测试的示例插件。mise 已经内置了 npm 支持，你应该改用它：`mise install npm:prettier@latest`
:::

## 后端插件（高级）

后端插件使用增强的后端方法，这些方法为 `plugin:tool` 格式提供更好的性能和支持：

- **BackendListVersions**：列出工具的可用版本
- **BackendInstall**：安装特定版本
- **BackendExecEnv**：设置环境变量

这种架构使插件能够高效管理多个工具，同时提供一致的接口。

## 工具插件（高级）

工具插件使用传统的基于钩子的方式：

- **可用**：列出可用版本
- **PreInstall/PostInstall**：安装钩子
- **EnvKeys**：环境变量设置
- **Parse**：版本解析和验证

这两种架构都提供了灵活的插件系统，能够处理多样化的安装和管理需求。

## 安全注意事项

::: danger
使用插件时，请注意：

- **插件会在安装和使用过程中执行任意代码**
- **仅从可信来源安装插件**
- **尽可能在安装前审查插件代码**
- **使用版本固定**以避免类似 [`mise.lock`](/dev-tools/mise-lock.md) 的意外更新
:::

## 故障排查

### 插件安装失败

```bash
# 检查仓库 URL 是否正确
mise plugin install vfox-npm https://github.com/jdx/vfox-npm

# 检查插件目录
ls ~/.local/share/mise/plugins/
```

### 工具安装失败

```bash
# 检查插件日志
mise install vfox-npm:prettier@latest --verbose

# 验证插件是否已安装
mise plugins ls
```

### 环境问题

```bash
# 检查 PATH 是否设置正确
mise exec vfox-npm:prettier env | grep PATH

# 验证工具是否已安装
ls ~/.local/share/mise/installs/vfox-npm/prettier/
```

## 下一步

- [了解如何创建后端插件](backend-plugin-development.md)
- [了解如何创建工具插件](tool-plugin-development.md)
- [探索内置后端](dev-tools/backends/)
- [查看社区注册表](registry.md)
