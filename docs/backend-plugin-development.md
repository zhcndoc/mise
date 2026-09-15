---
description: "mise 中的后端插件使用专用的后端钩子，通过 plugin:tool 格式管理多个工具"
---

# 后端插件开发

::: tip
[mise-backend-plugin-template](https://github.com/jdx/mise-backend-plugin-template) 提供了一个可直接使用的起点，预配置了 LuaCATS 类型定义、stylua 格式化和 hk 代码检查。
:::

mise 中的后端插件使用专用的后端钩子，通过 `plugin:tool` 格式管理多个工具。它们非常适合用于管理多个相关工具的包管理器、工具系列和自定义安装。

## 什么是后端插件？

后端插件通过专用的后端钩子扩展标准的 vfox 插件系统。它们支持：

- **多个工具**：一个插件可以管理多个工具。例如，`vfox-npm` 可以安装 `prettier`、`eslint` 以及其他 npm 包
- **跨平台支持**：Lua 可运行于 Windows、macOS 和 Linux；你的安装器必须支持每个目标平台
- **灵活的架构**：具有专用后端方法的现代插件系统

## 插件架构

后端插件通常是一个 git 仓库，但也可以是一个目录（通过 `mise plugin link`）。

后端插件使用 Lua 编写（当前版本为 5.1）。它们使用三个必需的后端方法，也可以选择性地公开其工具目录。每个方法都在自己的文件中实现：

- `hooks/backend_list_tools.lua` - 可选地列出可发现的工具
- `hooks/backend_search_tools.lua` - 可选地搜索大型工具目录
- `hooks/backend_list_versions.lua` - 列出工具的可用版本
- `hooks/backend_install.lua` - 安装工具的特定版本
- `hooks/backend_exec_env.lua` - 为工具设置环境变量

## 后端方法

### BackendListTools

可选地列出此后端管理的工具。mise 会在每个返回的名称前加上已安装的插件名称，并将生成的 `plugin:tool` 标识符包含在 `mise search`、shell 补全和交互式 `mise use` 选择器中。

```lua
function PLUGIN:BackendListTools(ctx)
    return {
        tools = {
            {name = "formatter", description = "Formats source files"},
            {name = "linter", description = "Checks source files"},
        },
    }
end
```

`name` 是必需的，`description` 是可选的。返回一个有限且有用的目录；包管理器后端不应枚举整个生态系统。mise 会使用远程版本缓存时长缓存响应，并在刷新失败时使用过期的缓存结果。

### BackendSearchTools

可选地搜索大型或不断变化的目录，而无需完整枚举目录。当 `mise search` 或 shell 补全具有非空查询时，mise 会调用此钩子。插件可以实现此钩子、`BackendListTools`，或同时实现两者。

```lua
function PLUGIN:BackendSearchTools(ctx)
    local results = search_registry(ctx.query)
    return {
        tools = results,
    }
end
```

响应格式与 `BackendListTools` 相同。例如，类似 npm 的后端可以使用 `ctx.query` 查询其注册表，同时使用 `BackendListTools` 提供一小组精选工具。搜索响应会针对每个查询单独缓存。

### BackendListVersions

列出工具的可用版本：

```lua
function PLUGIN:BackendListVersions(ctx)
    local tool = ctx.tool
    local options = ctx.options
    local versions = {}

    -- 用于获取该工具版本的逻辑
    -- 示例：查询 API、解析注册表等。
    -- 通过 options["key"] 或 options.key 访问自定义选项

    return {versions = versions}
end
```

> [!WARNING]
> 根据工具的发布策略，按**从旧到新**的顺序返回版本。mise 会保留该顺序。不要假设使用 SemVer：版本可能是日期、预发布版本或频道名称。这与工具插件的 `Available` 钩子相反，后者按从新到旧的顺序返回版本。

### BackendInstall

安装工具的特定版本：

```lua
function PLUGIN:BackendInstall(ctx)
    local tool = ctx.tool
    local version = ctx.version
    local install_path = ctx.install_path
    local download_path = ctx.download_path
    local options = ctx.options

    -- 用于安装该工具的逻辑
    -- 示例：下载文件、解压归档等。
    -- 通过 options["key"] 或 options.key 访问自定义选项

    return {}
end
```

### BackendExecEnv

返回所选安装的环境条目。即使没有要添加的条目，也要实现此钩子；在这种情况下返回 `{env_vars = {}}`：

```lua
function PLUGIN:BackendExecEnv(ctx)
    local install_path = ctx.install_path
    local options = ctx.options

    -- 用于设置环境变量的逻辑
    -- 示例：将 bin 目录添加到 PATH
    -- 通过 options["key"] 或 options.key 访问自定义选项

    return {
        env_vars = {
            {key = "PATH", value = install_path .. "/bin"}
        }
    }
end
```

## 创建后端插件

### 使用模板仓库

使用专用的 [mise-backend-plugin-template](https://github.com/jdx/mise-backend-plugin-template) 创建后端插件：

```bash
# 选项 1：使用 GitHub 的模板功能（推荐）
# 访问 https://github.com/jdx/mise-backend-plugin-template
# 点击 "Use this template" 创建你的仓库

# 选项 2：克隆并修改
git clone https://github.com/jdx/mise-backend-plugin-template my-backend-plugin
cd my-backend-plugin
rm -rf .git
git init
```

该模板包含：

- 完整的后端插件结构，包含所有必需的 hooks
- 现代化开发工具（hk、stylua、luacheck、actionlint）
- 全面的文档和示例
- 基于 GitHub Actions 的 CI/CD 配置
- 针对不同后端类型的多种实现模式

### 1. 插件结构

创建一个具有以下结构的目录：

```
my-backend-plugin/
├── metadata.lua                    # 插件元数据
├── hooks/
│   ├── backend_list_versions.lua   # BackendListVersions hook
│   ├── backend_install.lua         # BackendInstall hook
│   ├── backend_exec_env.lua        # BackendExecEnv hook
│   ├── backend_list_tools.lua      # Optional finite tool catalog
│   └── backend_search_tools.lua    # Optional query-driven tool search

```

### 2. 基本的 metadata.lua

```lua
PLUGIN = {
    name = "vfox-npm",
    version = "1.0.0",
    description = "npm 包的后端插件",
    author = "Your Name"
}
```

## 真实世界示例：vfox-npm

这个小型教学实现使用 npm 安装包。它需要 POSIX shell，并且要求 Node/npm 位于 PATH 中；以下命令不是 Windows 实现。对于日常使用，建议优先使用内置的 [npm 后端](/dev-tools/backends/npm.html)，它可以处理平台集成和其他安装选项。

以下代码片段应放入所示的三个钩子文件中。它们通过带引号的环境变量传递包值，而不是将其拼接到 shell 命令中。

### metadata.lua

```lua
PLUGIN = {
    name = "vfox-npm",
    version = "1.0.0",
    description = "Backend plugin for npm packages",
    author = "Plugin Author",
    depends = { "node" },
}
```

### hooks/backend_list_versions.lua

```lua
function PLUGIN:BackendListVersions(ctx)
    if RUNTIME.osType == "windows" then
        error("This example requires a POSIX shell")
    end
    local cmd = require("cmd")
    local json = require("json")
    local result = cmd.exec('npm view "$MISE_PLUGIN_PACKAGE" versions --json', {
        env = {MISE_PLUGIN_PACKAGE = ctx.tool},
    })
    local versions = json.decode(result)
    -- npm can return a single version as a string.
    if type(versions) == "string" then
        versions = {versions}
    end
    if type(versions) ~= "table" or #versions == 0 then
        error("No versions returned for " .. ctx.tool)
    end
    return {versions = versions}
end
```

### hooks/backend_install.lua

```lua
function PLUGIN:BackendInstall(ctx)
    if RUNTIME.osType == "windows" then
        error("This example requires a POSIX shell")
    end
    local cmd = require("cmd")
    cmd.exec('npm install --no-package-lock --no-save -- "$MISE_PLUGIN_SPEC"', {
        cwd = ctx.install_path,
        env = {MISE_PLUGIN_SPEC = ctx.tool .. "@" .. ctx.version},
    })
    return {}
end
```

### hooks/backend_exec_env.lua

```lua
function PLUGIN:BackendExecEnv(ctx)
    local file = require("file")
    return {
        env_vars = {
            {key = "PATH", value = file.join_path(ctx.install_path, "node_modules", ".bin")}
        }
    }
end
```

## 使用示例

插件名称不必与仓库名称匹配。后端前缀就是插件安装时使用的名称。

```bash
# Link the example you created and configure its prerequisite
mise plugin link vfox-npm /path/to/your/plugin
mise use node@24

# 列出可用版本
mise ls-remote vfox-npm:prettier

# 安装特定版本
mise install vfox-npm:prettier@3.0.0

# 在项目中使用
mise use vfox-npm:prettier@latest

# 执行工具
mise exec -- prettier --help
```

使用一个不会与内置后端冲突的名称。要测试不同的注册表或行为，请定义明确的工具选项并读取 `ctx.options`；已安装的名称不能替代选项契约。

## 上下文变量

后端插件通过传递给每个钩子函数的 `ctx` 参数接收上下文：

### BackendListTools Context

`BackendListTools` 当前接收一个空的上下文表。在选择工具之前，无法使用特定于工具的选项。

### BackendSearchTools Context

| Variable    | Description                     | Example   |
| ----------- | ------------------------------- | --------- |
| `ctx.query` | 要查找的工具名称或前缀 | `"prett"` |

### BackendListVersions Context

| 变量         | 描述               | 示例                     |
| ------------ | ------------------ | ------------------------ |
| `ctx.tool`    | 工具名称           | `"prettier"`             |
| `ctx.options` | 来自 mise.toml 的工具选项 | `{channels = {"a", "b"}}` |

### BackendInstall 上下文

| 变量               | 描述               | 示例                                                             |
| ------------------ | ------------------ | ---------------------------------------------------------------- |
| `ctx.tool`          | 工具名称           | `"prettier"`                                                      |
| `ctx.version`       | 请求的版本         | `"3.0.0"`                                                        |
| `ctx.install_path`  | 安装目录           | `"/home/user/.local/share/mise/installs/vfox-npm-prettier/3.0.0"` |
| `ctx.download_path` | 下载目录           | `"/home/user/.local/share/mise/downloads/vfox-npm-prettier/3.0.0"` |
| `ctx.options`       | 来自 mise.toml 的工具选项 | `{exe = "rg"}`                                                    |

### BackendExecEnv 上下文

| 变量              | 描述               | 示例                                                             |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| `ctx.tool`         | 工具名称           | `"prettier"`                                                      |
| `ctx.version`       | 请求的版本         | `"3.0.0"`                                                        |
| `ctx.install_path` | 安装目录           | `"/home/user/.local/share/mise/installs/vfox-npm-prettier/3.0.0"` |
| `ctx.options`     | 来自 mise.toml 的工具选项 | `{exe = "rg"}`                                                    |

> [!TIP]
> 选项值会将其 TOML 类型保留为原生 Lua 等价类型。字符串仍然是字符串，数组会变成 Lua 序列表，而嵌套表会变成 Lua 映射表。例如，`mise.toml` 中的 `channels = ["conda-forge", "robostack"]` 会变成一个 Lua 表，你可以使用 `ipairs(ctx.options.channels)` 进行迭代。

## 测试你的插件

### 本地开发

```bash
# 为开发链接你的插件
mise plugin link my-plugin /path/to/my-plugin

# 测试版本列表
mise ls-remote my-plugin:some-tool

# 测试安装
mise use my-plugin:some-tool@1.0.0

# 测试执行
mise exec -- some-tool --version
```

### 调试模式

使用调试模式查看插件执行的详细信息：

```bash
mise --debug install my-plugin:some-tool@1.0.0
```

## 最佳实践

### 错误处理

`cmd.exec` 在退出状态非零时会引发错误，并包含 stderr。不要隐藏 stderr，也不要在成功的 stdout 中搜索错误字符串。在解析响应正文之前检查 HTTP 状态码，验证必需的响应字段，并避免在错误信息中包含凭据。

[Lua 模块参考](/plugin-lua-modules.html)解释了同步错误，以及用于可恢复传输失败的 HTTP `try_*` 方法。

### 正则解析

使用 Lua 模式解析版本（Lua 没有正则表达式；`string.match`／`string.gsub` 使用 Lua 自己的模式语法）：

```lua
local function parse_version(version_string)
    -- 移除像 'v' 或 'release-' 这样的前缀
    return version_string:gsub("^v", ""):gsub("^release%-", "")
end
```

### 路径处理

使用 `file.join_path` 构造路径，并使用 `cmd.exec` 的 `cwd` 选项设置命令的工作目录。优先使用文件操作，而不是通过 shell 执行 `mkdir`、`cp` 或 `mv`。如果安装器需要 shell 命令，请说明所使用的 shell，并为每个外部值加引号。

```lua
local file = require("file")
local bin_path = file.join_path(ctx.install_path, "bin")
```

### 跨平台命令

Lua 运行时不会在不同操作系统之间转换 shell 命令。POSIX 的 `mkdir -p`、`$VARIABLE` 或 `chmod` 示例在 Windows 上需要不同的实现。在你声称支持的每个平台上进行测试，包括包含空格的路径。

## 高级功能

### 条件安装

使用 `ctx.tool`、`ctx.version` 和 `RUNTIME` 选择安装逻辑。在下载或运行安装器之前，验证工具和平台是否受支持。将共享逻辑放在 Lua 辅助模块中，而不是在每个分支中重复相同的命令。

### 环境检测

vfox 会自动将运行时信息注入到你的插件中：

```lua
function PLUGIN:BackendInstall(ctx)
    -- 使用注入的 RUNTIME 对象进行平台特定安装
    if RUNTIME.osType == "darwin" then
        -- macOS 安装逻辑
    elseif RUNTIME.osType == "linux" then
        -- Linux 安装逻辑
    elseif RUNTIME.osType == "windows" then
        -- Windows 安装逻辑
    end

    return {}
end
```

`RUNTIME` 对象提供：

- `RUNTIME.osType`：操作系统类型（"windows"、"linux"、"darwin"）
- `RUNTIME.archType`：架构（`"amd64"`、`"arm64"`、`"x86"` 等）
- `RUNTIME.envType`：libc 环境类型（glibc Linux 上为 `"gnu"`，musl Linux 上为 `"musl"`，Windows／macOS 及未检测到的系统上为 `nil`）
- `RUNTIME.version`：vfox 运行时版本
- `RUNTIME.pluginDirPath`：插件目录路径

### 多个环境变量

设置多个环境变量：

```lua
function PLUGIN:BackendExecEnv(ctx)
    -- 将 node_modules/.bin 添加到 PATH，以支持 npm 安装的二进制文件
    local bin_path = ctx.install_path .. "/node_modules/.bin"
    return {
        env_vars = {
            {key = "PATH", value = bin_path},
            {key = "EXAMPLE_TOOL_HOME", value = ctx.install_path},
            {key = "EXAMPLE_TOOL_VERSION", value = ctx.version}
        }
    }
end
```

## 性能优化

### 缓存

mise 会缓存远程版本列表和工具环境结果。在开发期间，如果缓存结果掩盖了钩子更改，请使用 `mise cache clear my-plugin:some-tool`。Lua 表只会在当前 Lua 运行时中缓存；它不会在单独的 mise 调用之间持久化。请参阅[缓存行为](/cache-behavior.html)和 [Lua 模块参考](/plugin-lua-modules.html#caching)。

## 下一步

- [从后端插件模板开始](https://github.com/jdx/mise-backend-plugin-template)
- [了解工具插件开发](tool-plugin-development.md)
- [探索可用的 Lua 模块](plugin-lua-modules.md)
- [发布你的插件](plugin-publishing.md)
- [查看 vfox-npm 插件源代码](https://github.com/jdx/vfox-npm)
