# 后端插件开发

::: tip
[mise-backend-plugin-template](https://github.com/jdx/mise-backend-plugin-template) 提供了一个可直接使用的起点，预配置了 LuaCATS 类型定义、stylua 格式化和 hk 代码检查。
:::

mise 中的后端插件使用增强的后端方法，通过 `plugin:tool` 格式来管理多个工具。这些插件非常适合包管理器、工具族以及需要管理多个相关工具的自定义安装。

## 什么是后端插件？

后端插件通过增强的后端方法扩展了标准的 vfox 插件系统。它们支持：

- **多个工具**：一个插件可以管理多个工具。例如，`vfox-npm` 是一个插件，它可以安装不同类型的工具，如 `prettier`、`eslint` 和其他 npm 包
- **跨平台支持**：可在 Windows、macOS 和 Linux 上运行
- **灵活的架构**：采用具有专用后端方法的现代插件系统，以增强功能

## 插件架构

后端插件通常是一个 git 仓库，但也可以是一个目录（通过 `mise link`）。

后端插件使用 Lua（目前版本为 5.1）实现。它们使用三个主要的后端方法，这些方法分别由单独的文件实现：

- `hooks/backend_list_versions.lua` - 列出某个工具可用的版本
- `hooks/backend_install.lua` - 安装某个工具的特定版本
- `hooks/backend_exec_env.lua` - 为某个工具设置环境变量

## 后端方法

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
> **版本排序**：`BackendListVersions` 返回的版本应按升序（从旧到新）排列，并按语义版本排序（版本 `3.10.0` 不应排在 `3.2.0` 之前）。Mise 不会对该方法返回的版本进行任何额外排序。

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

为工具设置环境变量：

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

使用专门的 [mise-backend-plugin-template](https://github.com/jdx/mise-backend-plugin-template) 来创建后端插件：

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
│   └── backend_exec_env.lua        # BackendExecEnv hook
└── Injection.lua                   # 运行时注入（自动生成）
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

以下是管理 npm 包的 vfox-npm 插件完整实现：

### metadata.lua

```lua
PLUGIN = {
    name = "vfox-npm",
    version = "1.0.0",
    description = "npm 包的后端插件",
    author = "jdx"
}
```

### hooks/backend_list_versions.lua

```lua
function PLUGIN:BackendListVersions(ctx)
    local cmd = require("cmd")
    local json = require("json")

    local result = cmd.exec("npm view " .. ctx.tool .. " versions --json")
    local versions = json.decode(result)

    return {versions = versions}
end
```

### hooks/backend_install.lua

```lua
function PLUGIN:BackendInstall(ctx)
    local tool = ctx.tool
    local version = ctx.version
    local install_path = ctx.install_path

    -- 使用 npm install 直接安装该包
    local cmd = require("cmd")
    local npm_cmd = "npm install " .. tool .. "@" .. version .. " --no-package-lock --no-save --silent"
    local result = cmd.exec(npm_cmd, {cwd = install_path})

    -- 如果执行到这里，说明命令已成功
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

插件名称不必与仓库名称匹配。后端前缀将匹配后端插件安装时使用的名称。

```bash
# 安装插件
mise plugin install vfox-npm https://github.com/jdx/vfox-npm

# 列出可用版本
mise ls-remote vfox-npm:prettier

# 安装特定版本
mise install vfox-npm:prettier@3.0.0

# 在项目中使用
mise use vfox-npm:prettier@latest

# 执行工具
mise exec -- prettier --help
```

> **提示**：这种命名灵活性可能会被用来创建一个非常复杂的插件后端，并且它会根据自己的名称表现出不同的行为。例如，你可以使用不同的名称安装同一个插件，以配置不同的行为或访问不同的工具仓库。

## 上下文变量

后端插件通过传递给每个钩子函数的 `ctx` 参数接收上下文：

### BackendListVersions 上下文

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
| `ctx.version`      | 请求的版本         | `"3.0.0"`                                                        |
| `ctx.install_path` | 安装目录           | `"/home/user/.local/share/mise/installs/vfox-npm-prettier/3.0.0"` |
| `ctx.options`     | 来自 mise.toml 的工具选项 | `{exe = "rg"}`                                                    |

> [!TIP]
> 选项值会将其 TOML 类型保留为原生 Lua 等价类型。字符串仍然是字符串，
> 数组会变成 Lua 序列表，而嵌套表会变成 Lua 映射表。例如，
> `mise.toml` 中的 `channels = ["conda-forge", "robostack"]` 会变成一个 Lua 表，你可以
> 使用 `ipairs(ctx.options.channels)` 进行迭代。

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

提供更有意义的错误消息：

```lua
function PLUGIN:BackendListVersions(ctx)
    local tool = ctx.tool

    -- 验证工具名称
    if not tool or tool == "" then
        error("工具名称不能为空")
    end

    -- 执行命令并进行错误检查
    local cmd = require("cmd")
    local result = cmd.exec("npm view " .. tool .. " versions --json 2>/dev/null")
    if not result or result:match("npm ERR!") then
        error("获取 " .. tool .. " 的版本失败: " .. (result or "no output"))
    end

    -- 解析 JSON 响应
    local json = require("json")
    local success, npm_versions = pcall(json.decode, result)
    if not success or not npm_versions then
        error("解析 " .. tool .. " 的版本失败")
    end

    -- 返回版本列表，如果没有找到则报错
    local versions = {}
    if type(npm_versions) == "table" then
        for i = #npm_versions, 1, -1 do
            table.insert(versions, npm_versions[i])
        end
    end

    if #versions == 0 then
        error("未找到 " .. tool .. " 的版本")
    end

    return {versions = versions}
end
```

### 正则解析

使用正则解析版本：

```lua
local function parse_version(version_string)
    -- 移除像 'v' 或 'release-' 这样的前缀
    return version_string:gsub("^v", ""):gsub("^release%-", "")
end
```

### 路径处理

使用跨平台路径处理：

```lua
local function join_path(...)
    local sep = package.config:sub(1,1) -- 获取操作系统路径分隔符
    return table.concat({...}, sep)
end

local bin_path = join_path(install_path, "bin")
```

### 跨平台命令

处理不同操作系统：

```lua
local function create_dir(path)
    local cmd = RUNTIME.osType == "windows" and "mkdir" or "mkdir -p"
    os.execute(cmd .. " " .. path)
end
```

## 高级功能

### 条件安装

根据工具或版本使用不同的安装逻辑：

```lua
function PLUGIN:BackendInstall(ctx)
    local tool = ctx.tool
    local version = ctx.version
    local install_path = ctx.install_path

    -- 创建安装目录
    os.execute("mkdir -p " .. install_path)

    if tool == "special-tool" then
        -- 特殊安装逻辑
        local cmd = require("cmd")
        local npm_cmd = "cd " .. install_path .. " && npm install " .. tool .. "@" .. version .. " --no-package-lock --no-save --silent 2>/dev/null"
        local result = cmd.exec(npm_cmd)
        if result:match("npm ERR!") then
            error("Failed to install " .. tool .. "@" .. version)
        end
    else
        -- 默认安装逻辑
        local cmd = require("cmd")
        local npm_cmd = "cd " .. install_path .. " && npm install " .. tool .. "@" .. version .. " --no-package-lock --no-save --silent 2>/dev/null"
        local result = cmd.exec(npm_cmd)
        if result:match("npm ERR!") then
            error("Failed to install " .. tool .. "@" .. version)
        end
    end

    return {}
end
```

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
- `RUNTIME.envType`：libc 环境类型（glibc Linux 上为 `"gnu"`，musl Linux 上为 `"musl"`，Windows/macOS 及未检测到的系统上为 `nil`）
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
            {key = ctx.tool:upper() .. "_HOME", value = ctx.install_path},
            {key = ctx.tool:upper() .. "_VERSION", value = ctx.version}
        }
    }
end
```

## 性能优化

### 缓存

TODO：我们需要为 [共享 Lua 模块](plugin-lua-modules.md) 提供缓存支持。

## 下一步

- [从后端插件模板开始](https://github.com/jdx/mise-backend-plugin-template)
- [了解工具插件开发](tool-plugin-development.md)
- [探索可用的 Lua 模块](plugin-lua-modules.md)
- [发布你的插件](plugin-publishing.md)
- [查看 vfox-npm 插件源码](https://github.com/jdx/vfox-npm)
