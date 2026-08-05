# 工具插件开发

::: tip
[mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) 提供了一个可直接使用的起点，已预配置 LuaCATS 类型定义、stylua 格式化和 hk lint 检查。
:::

工具插件使用基于 hook 的架构来管理单个工具。它们与标准的 vfox 生态系统兼容，非常适合需要复杂安装逻辑、环境配置或旧版文件解析的工具。

## 什么是工具插件？

工具插件使用传统的钩子函数来管理单个工具。它们提供：

- **标准 vfox 兼容性**：同时适用于 mise 和 vfox
- **复杂安装逻辑**：处理源码编译、自定义构建和复杂的设置
- **环境配置**：设置除 PATH 之外的复杂环境变量
- **旧版文件支持**：解析其他工具的版本文件（`.nvmrc`、`.tool-version` 等）
- **跨平台支持**：可在 Windows、macOS 和 Linux 上运行。

## 插件架构

工具插件使用 Lua（当前版本为 5.1）实现。它们采用基于钩子的架构，并为不同的生命周期事件提供特定函数：

```mermaid
graph TD
    A[用户请求] --> B[mise CLI]
    B --> C[工具插件]

    C --> D[可用钩子<br/>列出版本]
    C --> E[预安装钩子<br/>下载]
    C --> F[后安装钩子<br/>设置]
    C --> G[环境键钩子<br/>配置]

    subgraph "插件文件"
        H[metadata.lua]
        I[hooks/available.lua]
        J[hooks/pre_install.lua]
        K[hooks/env_keys.lua]
        L[hooks/post_install.lua]
    end

    style C fill:#e1f5fe
    style D fill:#e8f5e8
    style E fill:#e8f5e8
    style F fill:#e8f5e8
    style G fill:#e8f5e8
```

## Hook 函数

### 必需的 Hook

功能性插件必须实现这些 Hook：

#### 可用 Hook

列出工具的所有可用版本：

```lua
-- hooks/available.lua
function PLUGIN:Available(ctx)
    local args = ctx.args  -- 用户参数

    -- 返回可用版本数组
    return {
        {
            version = "20.0.0",
            note = "最新"
        },
        {
            version = "18.18.0",
            note = "LTS",
            addition = {
                {
                    name = "npm",
                    version = "9.8.1"
                }
            }
        }
    }
end
```

##### 滚动发布

对于具有“nightly”或“stable”这类滚动发布的工具，版本字符串保持不变但内容会变化，你可以将版本标记为滚动版本，并提供校验和用于更新检测：

```lua
function PLUGIN:Available(ctx)
    return {
        {
            version = "nightly",
            note = "最新开发构建",
            rolling = true,  -- 标记为滚动发布
            checksum = "abc123..."  -- 发布资源的 SHA256
        },
        {
            version = "stable",
            note = "最新稳定版",
            rolling = true,
            checksum = "def456..."
        },
        {
            version = "1.0.0",
            note = "固定发布"
            -- 固定版本不需要 rolling 或 checksum
        }
    end
end
```

当设置 `rolling = true` 时：

- `mise upgrade` 会检查校验和是否发生变化以检测更新
- `mise upgrade --bump` 会保留版本名称（例如 "nightly"），而不是将其转换为 semver

校验和应为用户平台对应发布资源的 SHA256 哈希。完整示例请参见 [vfox-neovim 插件](https://github.com/mise-plugins/vfox-neovim)。

#### PreInstall Hook

处理预安装逻辑并返回下载信息：

```lua
-- hooks/pre_install.lua
function PLUGIN:PreInstall(ctx)
    local version = ctx.version
    local runtimeVersion = ctx.runtimeVersion

    -- 确定下载 URL 和校验和
    local url = "https://nodejs.org/dist/v" .. version .. "/node-v" .. version .. "-linux-x64.tar.gz"

    return {
        version = version,
        url = url,
        sha256 = "abc123...",  -- 可选校验和
        note = "正在安装 Node.js " .. version,
        -- 可选的证明元数据，选择一种验证类型
        attestation = {
            -- GitHub
            github_owner = "ownername"
            github_repo = "reponame"
            -- Cosign
            cosign_sig_or_bundle_path = "/path/to/sig/or/bundle/file"
            -- SLSA
            slsa_provenance_path = "/path/to/provenance/file"
        },
        -- 可以指定额外文件
        addition = {
            {
                name = "npm",
                url = "https://registry.npmjs.org/npm/-/npm-" .. npm_version .. ".tgz"
            }
        }
    }
end
```

#### EnvKeys Hook

为已安装的工具配置环境变量：

```lua
-- hooks/env_keys.lua
function PLUGIN:EnvKeys(ctx)
    local mainPath = ctx.path
    local runtimeVersion = ctx.runtimeVersion
    local sdkInfo = ctx.sdkInfo['nodejs']
    local path = sdkInfo.path
    local version = sdkInfo.version
    local name = sdkInfo.name

    return {
        {
            key = "NODE_HOME",
            value = mainPath
        },
        {
            key = "PATH",
            value = mainPath .. "/bin"
        },
        -- 多个 PATH 条目会自动合并
        {
            key = "PATH",
            value = mainPath .. "/lib/node_modules/.bin"
        }
    end
end
```

### 可选 Hook

这些 Hook 提供额外功能：

#### PostInstall Hook

在安装后执行额外设置：

```lua
-- hooks/post_install.lua
function PLUGIN:PostInstall(ctx)
    local rootPath = ctx.rootPath
    local runtimeVersion = ctx.runtimeVersion
    local sdkInfo = ctx.sdkInfo['nodejs']
    local path = sdkInfo.path
    local version = sdkInfo.version

    -- 编译原生模块、设置权限等
    local result = os.execute("chmod +x " .. path .. "/bin/*")
    if result ~= 0 then
        error("Failed to set permissions")
    end

    -- 不需要返回值
end
```

#### PreUse Hook

在使用前修改版本：

```lua
-- hooks/pre_use.lua
function PLUGIN:PreUse(ctx)
    local version = ctx.version
    local previousVersion = ctx.previousVersion
    local installedSdks = ctx.installedSdks
    local cwd = ctx.cwd
    local scope = ctx.scope  -- 全局/项目/会话

    -- 可选地修改版本
    if version == "latest" then
        version = "20.0.0"  -- 解析为具体版本
    end

    return {
        version = version
    }
end
```

#### ParseLegacyFile Hook

解析来自其他工具的版本文件：

```lua
-- hooks/parse_legacy_file.lua
function PLUGIN:ParseLegacyFile(ctx)
    local filename = ctx.filename
    local filepath = ctx.filepath
    local versions = ctx:getInstalledVersions()

    -- 读取并解析文件
    local file = require("file")
    local content = file.read(filepath)
    local version = content:match("v?([%d%.]+)")

    return {
        version = version
    }
end
```

## 创建工具插件

### 使用模板仓库

创建新工具插件最简单的方法，是以 [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) 仓库作为起点：

```bash
# 克隆模板
git clone https://github.com/jdx/mise-tool-plugin-template my-tool-plugin
cd my-tool-plugin

# 移除模板的 git 历史并重新开始
rm -rf .git
git init

# 为你的工具自定义插件
# 编辑 metadata.lua、hooks/*.lua 文件等
```

该模板包含：

- 预先配置好的插件结构，包含所有必需的 hooks
- 带注释的示例实现
- 代码检查配置（`.luacheckrc`、`stylua.toml`）
- 使用 mise 任务的测试设置
- 用于 CI 的 GitHub Actions 工作流

### 1. 插件结构

创建一个具有以下结构的目录（或使用上面的模板）：

```
my-tool-plugin/
├── metadata.lua          # 插件元数据和配置
├── hooks/               # Hook 函数目录
│   ├── available.lua    # 列出可用版本 [required]
│   ├── pre_install.lua  # 安装前 hook [required]
│   ├── env_keys.lua     # 环境配置 [required]
│   ├── post_install.lua # 安装后 hook [optional]
│   ├── pre_use.lua      # 使用前 hook [optional]
│   └── parse_legacy_file.lua # 旧格式文件解析器 [optional]
├── lib/                 # 共享库代码 [optional]
│   └── helper.lua       # 辅助函数
└── test/               # 测试脚本 [optional]
    └── test.sh
```

### 2. metadata.lua

配置插件元数据和旧文件支持：

```lua
-- metadata.lua
PLUGIN = {
    name = "nodejs",
    version = "1.0.0",
    description = "Node.js 运行时环境",
    author = "插件作者",

    -- 此插件可以解析的旧版本文件
    legacyFilenames = {
        '.nvmrc',
        '.node-version'
    },

    -- 在安装 hooks 期间，其 bin 路径应可用的工具
    depends = { "node" },
}
```

当安装 hooks 需要 PATH 上的其他由 mise 管理的工具时，将 `depends` 添加到 `PLUGIN` 表中。使用它们在 `mise.toml` 中出现的工具名，例如 `depends = { "go", "make" }`。如果 hooks 不需要调用其他工具，则省略它。

这与 `[tools]` 中的 `depends` 是分开的，后者只会让一个已配置的工具在安装图中等待另一个已配置的工具。vfox `metadata.lua` 中的 `depends` 是插件元数据；当匹配的工具被配置时，mise 会使用它来对当前安装任务排序，并构建 hook 环境。

#### 系统依赖

从源代码编译（或以其他方式依赖系统库和构建工具）的插件，可以通过 `systemDependencies` 声明这些前置条件。在安装工具之前，mise 会检查每一项，并根据 [`system_deps`](/configuration/settings.html#system_deps) 设置，报告缺失项、提供安装选项或自动安装缺失项。

```lua
PLUGIN = {
    name = "php",
    version = "1.0.0",

    systemDependencies = {
        -- PATH 上的可执行文件，可附带版本约束
        { bin = "bison", version = ">=3.0",
          packages = { brew = "bison", apt = "bison", dnf = "bison" } },
        { bin = "re2c",
          packages = { brew = "re2c", apt = "re2c", dnf = "re2c" } },

        -- 可通过 pkg-config 发现的库
        { pkgconfig = "libxml-2.0",
          packages = { brew = "libxml2", apt = "libxml2-dev", dnf = "libxml2-devel" } },
        { pkgconfig = "openssl",
          packages = { brew = "openssl@3", apt = "libssl-dev", dnf = "openssl-devel" } },

        -- 运行时共享库，通过 soname 指定（仅限 Linux）
        { sharedlib = "libaio.so.1",
          packages = { apt = "libaio1", dnf = "libaio" } },

        -- 备用方案：任何退出状态为 0 即表示“满足”的 shell 命令
        { command = "xcode-select -p", optional = "macOS 命令行工具" },
    },
}
```

每个条目必须设置**且只能设置一项**检查：

| 检查       | 检测方式                                             | 用途                                       |
| ----------- | -------------------------------------------------- | ------------------------------------------ |
| `bin`       | 可在 `PATH` 上解析的可执行文件                       | 编译器、构建工具、`*-config` 脚本          |
| `pkgconfig` | `pkg-config --exists <name>`                       | 提供 `.pc` 文件的 C 库                     |
| `sharedlib` | 动态链接器能够解析 soname（仅限 Linux）              | 预编译二进制文件所需的运行时库              |
| `command`   | shell 命令退出状态为 `0`                            | 上述方式无法表达的任何依赖                  |

可选字段：

- **`version`** — 适用于 `bin` 和 `pkgconfig` 的约束（`>=3.0`、`>3`、`<=1.2`、`=3.0`，或单独的 `3.0`，表示 `>=3.0`）。mise 会运行 `<bin> --version` / `pkg-config --modversion` 并进行比较。如果无法提取版本，则会将该依赖视为满足（存在即可），而不会阻止安装。
- **`optional`** — 简短的原因说明。缺少可选依赖时不会提示或失败；mise 会显示一行信息，让用户可以在不需要某些功能时继续构建（例如 Erlang 的 `wxWidgets` GUI）。
- **`packages`** — 将包管理器名称（`brew`、`brew-cask`、`apt`、`dnf`、`pacman`、`apk`、`flatpak`、`mas`）映射到提供相应功能的包。

**检测结果是唯一依据。** 无论某项功能是通过 Homebrew、apt、nix、MacPorts 还是从源代码安装的，只要检查通过，就视为满足；mise 不会询问它是如何安装的。只有在**提供安装缺失项的选项**时，才会查询 `packages` 映射；它只是补救提示，并不声明该工具必须来自相应的包管理器。

这些声明在较旧版本的 mise 和上游 vfox 中不会产生作用（两者都会忽略未知的 `PLUGIN` 字段），因此添加它们具有向后兼容性。

### 3. 辅助库

在 `lib/` 目录中创建共享函数：

```lua
-- lib/helper.lua
local M = {}

function M.get_arch()
    -- 使用 vfox/mise 提供的 RUNTIME 对象
    return (RUNTIME.archType == "amd64") and "x64" or RUNTIME.archType  -- 对其他架构保持原样返回
end

function M.get_os()
    -- 使用 vfox/mise 提供的 RUNTIME 对象
    return (RUNTIME.osType == "windows") and "win" or RUNTIME.osType
end

function M.get_platform()
    return M.get_os() .. "-" .. M.get_arch()
end

return M
```

## 真实世界示例：vfox-nodejs

以下是基于 vfox-nodejs 插件的完整示例，展示了所有概念：

### 可用 Hook 示例

```lua
-- hooks/available.lua
function PLUGIN:Available(ctx)
    local http = require("http")
    local json = require("json")

    -- 从 Node.js API 获取版本
    local resp, err = http.get({
        url = "https://nodejs.org/dist/index.json"
    })

    if err ~= nil then
        error("获取版本失败: " .. err)
    end

    local versions = json.decode(resp.body)
    local result = {}

    for i, v in ipairs(versions) do
        local version = v.version:gsub("^v", "")  -- 移除 'v' 前缀
        local note = nil

        if v.lts then
            note = "LTS"
        end

        table.insert(result, {
            version = version,
            note = note,
            addition = {
                {
                    name = "npm",
                    version = v.npm
                }
            }
        })
    end

    return result
end
```

### PreInstall Hook 示例

```lua
-- hooks/pre_install.lua
function PLUGIN:PreInstall(ctx)
    local version = ctx.version

    -- 使用 RUNTIME 对象确定平台
    local arch_token = (RUNTIME.archType == "amd64") and "x64" or RUNTIME.archType
    local os_token = (RUNTIME.osType == "windows") and "win" or RUNTIME.osType
    local platform = os_token .. "-" .. arch_token
    local extension = (RUNTIME.osType == "windows") and "zip" or "tar.gz"

    -- 构建下载 URL
    local filename = "node-v" .. version .. "-" .. platform .. "." .. extension
    local url = "https://nodejs.org/dist/v" .. version .. "/" .. filename

    -- 获取校验和
    local http = require("http")
    local shasums_url = "https://nodejs.org/dist/v" .. version .. "/SHASUMS256.txt"
    local resp, err = http.get({ url = shasums_url })

    local sha256 = nil
    if err == nil then
        -- 为我们的文件提取 SHA256
        for line in resp.body:gmatch("[^\n]+") do
            if line:match(filename) then
                sha256 = line:match("^(%w+)")
                break
            end
        end
    end

    return {
        version = version,
        url = url,
        sha256 = sha256,
        note = "Installing Node.js " .. version .. " (" .. platform .. ")"
    }
end
```

### EnvKeys Hook 示例

```lua
-- hooks/env_keys.lua
function PLUGIN:EnvKeys(ctx)
    local mainPath = ctx.path
    local os_type = RUNTIME.osType

    local env_vars = {
        {
            key = "NODE_HOME",
            value = mainPath
        },
        {
            key = "PATH",
            value = mainPath .. "/bin"
        }
    }

    -- 将 npm 全局模块添加到 PATH
    local npm_global_path = mainPath .. "/lib/node_modules/.bin"
    if os_type == "windows" then
        npm_global_path = mainPath .. "/node_modules/.bin"
    end

    table.insert(env_vars, {
        key = "PATH",
        value = npm_global_path
    })

    return env_vars
end
```

### PostInstall Hook 示例

```lua
-- hooks/post_install.lua
function PLUGIN:PostInstall(ctx)
    local sdkInfo = ctx.sdkInfo['nodejs']
    local path = sdkInfo.path
    -- 在 Unix 系统上设置可执行权限
    if RUNTIME.osType ~= "windows" then
        os.execute("chmod +x " .. path .. "/bin/*")
    end

    -- 创建 npm 缓存目录
    local npm_cache_dir = path .. "/.npm"
    os.execute("mkdir -p " .. npm_cache_dir)

    -- 配置 npm 使用本地缓存
    local npm_cmd = path .. "/bin/npm"
    if RUNTIME.osType == "windows" then
        npm_cmd = path .. "/npm.cmd"
    end

    os.execute(npm_cmd .. " config set cache " .. npm_cache_dir)
    os.execute(npm_cmd .. " config set prefix " .. path)
end
```

### 旧文件支持

```lua
-- hooks/parse_legacy_file.lua
function PLUGIN:ParseLegacyFile(ctx)
    local filename = ctx.filename
    local filepath = ctx.filepath
    local file = require("file")

    -- 读取文件内容
    local content = file.read(filepath)
    if not content then
        error("读取 " .. filepath .. " 失败")
    end

    -- 从不同文件格式中解析版本
    local version = nil

    if filename == ".nvmrc" then
        -- .nvmrc 可能包含带或不带 'v' 前缀的版本
        version = content:match("v?([%d%.]+)")
    elseif filename == ".node-version" then
        -- .node-version 通常只包含版本号
        version = content:match("([%d%.]+)")
    end

    -- 移除所有空白字符
    if version then
        version = version:gsub("%s+", "")
    end

    return {
        version = version
    }
end
```

## 测试你的插件

### 本地开发

```bash
# 为开发链接你的插件
mise plugin link my-tool /path/to/my-tool-plugin

# 测试版本列表
mise ls-remote my-tool

# 测试安装
mise install my-tool@1.0.0

# 测试环境设置
mise use my-tool@1.0.0
my-tool --version

# 测试旧版文件解析（如果适用）
echo "2.0.0" > .my-tool-version
mise use my-tool
```

如果你使用的是模板仓库，可以运行包含的测试：

```bash
# 运行 lint 检查
mise run lint

# 运行测试
mise run test
```

### 调试模式

使用调试模式查看详细的插件执行过程：

```bash
mise --debug install nodejs@20.0.0
```

### 插件测试脚本

创建一个完整的测试脚本：

```bash
#!/bin/bash
# test/test.sh
set -e

echo "正在测试 nodejs 插件..."

# 安装插件
mise plugin install nodejs .

# 测试基本功能
mise install nodejs@18.18.0
mise use nodejs@18.18.0

# 验证安装
node --version | grep "18.18.0"
npm --version

# 测试旧版文件支持
echo "20.0.0" > .nvmrc
mise use nodejs
node --version | grep "20.0.0"

# 清理
rm -f .nvmrc
mise plugin remove nodejs

echo "所有测试已通过！"
```

## 最佳实践

### 错误处理

始终提供有意义的错误消息：

```lua
function PLUGIN:Available(ctx)
    local http = require("http")
    local resp, err = http.get({
        url = "https://api.example.com/versions"
    })

    if err ~= nil then
        error("无法从 API 获取版本： " .. err)
    end

    if resp.status_code ~= 200 then
        error("API 返回状态 " .. resp.status_code .. "： " .. resp.body)
    end

    -- 处理响应...
end
```

### 平台检测

使用 RUNTIME 对象正确处理不同的操作系统：

```lua
-- lib/platform.lua
local M = {}

function M.is_windows()
    return RUNTIME.osType == "windows"
end

function M.get_exe_extension()
    return M.is_windows() and ".exe" or ""
end

function M.get_path_separator()
    return M.is_windows() and "\\" or "/"
end

return M
```

**注意：** `RUNTIME` 对象会自动在所有插件钩子中可用，并提供：

- `RUNTIME.osType`：操作系统类型（"windows"、"linux"、"darwin"）
- `RUNTIME.archType`：架构（"amd64"、"arm64"、"x86" 等）
- `RUNTIME.envType`：libc 环境类型（glibc Linux 上为 `"gnu"`，musl Linux 上为 `"musl"`，Windows/macOS 和未检测系统上为 `nil`）
- `RUNTIME.version`：vfox 运行时版本
- `RUNTIME.pluginDirPath`：插件目录路径

### 版本规范化

始终一致地规范化版本：

```lua
local function normalize_version(version)
    -- 如果存在，移除 'v' 前缀
    version = version:gsub("^v", "")

    -- 移除预发布后缀
    version = version:gsub("%-.*", "")

    return version
end
```

### 缓存

缓存代价高的操作：

```lua
-- 缓存版本 12 小时
local cache = {}
local cache_ttl = 12 * 60 * 60  -- 12 小时（秒）

function PLUGIN:Available(ctx)
    local now = os.time()

    -- 先检查缓存
    if cache.versions and cache.timestamp and (now - cache.timestamp) < cache_ttl then
        return cache.versions
    end

    -- 获取最新数据
    local versions = fetch_versions_from_api()

    -- 更新缓存
    cache.versions = versions
    cache.timestamp = now

    return versions
end
```

## 高级特性

### 条件安装

根据平台或版本使用不同的安装逻辑：

```lua
function PLUGIN:PreInstall(ctx)
    local version = ctx.version

    -- 针对不同平台使用不同逻辑
    if RUNTIME.osType == "windows" then
        -- Windows 特定安装
        return install_windows(version)
    elseif RUNTIME.osType == "darwin" then
        -- macOS 特定安装
        return install_macos(version)
    else
        -- Linux 安装
        return install_linux(version)
    end
end
```

### 源码编译

适用于需要从源码编译的插件：

```lua
-- hooks/post_install.lua
function PLUGIN:PostInstall(ctx)
    local sdkInfo = ctx.sdkInfo['tool-name']
    local path = sdkInfo.path
    local version = sdkInfo.version

    -- 切换到源码目录
    local build_dir = path .. "/src"

    -- 配置构建
    local configure_result = os.execute("cd " .. build_dir .. " && ./configure --prefix=" .. path)
    if configure_result ~= 0 then
        error("配置失败")
    end

    -- 编译
    local make_result = os.execute("cd " .. build_dir .. " && make -j$(nproc)")
    if make_result ~= 0 then
        error("编译失败")
    end

    -- 安装
    local install_result = os.execute("cd " .. build_dir .. " && make install")
    if install_result ~= 0 then
        error("安装失败")
    end
end
```

### 环境配置

复杂的环境变量设置：

```lua
function PLUGIN:EnvKeys(ctx)
    local mainPath = ctx.path
    local version = ctx.sdkInfo['tool-name'].version

    local env_vars = {
        -- 标准环境变量
        {
            key = "TOOL_HOME",
            value = mainPath
        },
        {
            key = "TOOL_VERSION",
            value = version
        },

        -- PATH 条目
        {
            key = "PATH",
            value = mainPath .. "/bin"
        },
        {
            key = "PATH",
            value = mainPath .. "/scripts"
        },

        -- 库路径
        {
            key = "LD_LIBRARY_PATH",
            value = mainPath .. "/lib"
        },
        {
            key = "PKG_CONFIG_PATH",
            value = mainPath .. "/lib/pkgconfig"
        }
    }

    -- 平台特定添加项
    if RUNTIME.osType == "darwin" then
        table.insert(env_vars, {
            key = "DYLD_LIBRARY_PATH",
            value = mainPath .. "/lib"
        })
    end

    return env_vars
end
```

## 后续步骤

- [从插件模板开始](https://github.com/jdx/mise-tool-plugin-template)
- [了解后端插件开发](backend-plugin-development.md)
- [探索可用的 Lua 模块](plugin-lua-modules.md)
- [发布你的插件](plugin-publishing.md)
- [查看 vfox-nodejs 插件源代码](https://github.com/version-fox/vfox-nodejs)。
