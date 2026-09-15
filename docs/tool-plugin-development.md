---
description: "一个工具插件使用 Lua 生命周期 Hook 管理一个版本化工具。"
---

# 工具插件开发

工具插件使用 Lua 生命周期 Hook 管理一个版本化工具。对于管理多个工具的集成，请使用
[后端插件](/backend-plugin-development.html)；对于不涉及安装的变量，请使用
[环境插件](/env-plugin-development.html)。在编写安装器之前，请先查看内置的
[后端](/dev-tools/backends/)。

[工具插件模板](https://github.com/jdx/mise-tool-plugin-template)提供了一个起始布局和开发工具。mise 嵌入了
Lua 5.1；其支持的 vfox Hook 和扩展在此处说明。与上游 vfox 共享插件时，还需要在那里进行测试，尤其是在使用 mise 专用模块或元数据时。

## 什么是工具插件？

工具插件可以下载归档文件、编译源代码、返回环境条目，并解析惯用的版本文件。Lua 运行时可在 Windows、macOS 和 Linux 上运行；每个插件都必须实现这些目标平台所需的构件选择和外部命令。

插件以用户权限运行。保持元数据不包含主机探测，并避免在安装 Hook 中更改全局包管理器配置。

## 插件架构

```mermaid
flowchart LR
    A[Available: list versions] --> B[Resolve a version]
    B --> C[PreInstall: describe artifact]
    C --> D[mise: download, verify, extract]
    D --> E[PostInstall: optional setup]
    E --> F[EnvKeys: return environment]
```

固定版本或已安装的版本可以跳过此流程中的某些部分。环境构建可能会在后续调用中再次发生；它不是一次性的安装回调。

## Hook 函数

### 必需的 Hook

#### Available Hook

返回一个按发布者发布策略排序的数组，**最新版本在前**。mise 会反转此列表，以用于其内部按最旧版本优先的版本列表。这与已经按最旧版本优先返回的
`BackendListVersions` 不同。

```lua
-- hooks/available.lua
function PLUGIN:Available(ctx)
    return {
        {version = "1.10.0", note = "Current stable release"},
        {version = "1.2.0"},
    }
end
```

不要丢弃预发布后缀，也不要使用共享的 SemVer 解析器对任意版本进行排序。这里可以使用
`ctx.args`，但 mise 不会在此处提供交互式 vfox 参数。

##### 滚动发布

对于内容会发生变化但名称不变的频道，返回 `rolling = true`，以及一个会随频道构件变化而变化的构件校验和：

```lua
function PLUGIN:Available(ctx)
    return {
        {
            version = "nightly",
            rolling = true,
            checksum = "REPLACE_WITH_CURRENT_PLATFORM_ASSET_SHA256",
        },
    }
end
```

上面的校验和是占位符。请获取所选平台的实际校验和。
`mise upgrade` 会比较滚动校验和，而 `mise upgrade --bump` 会保留频道名称。此更新标记与
`PreInstall` 返回的构件校验和是分开的。

#### PreInstall Hook

返回 `ctx.version` 对应的 URL 和验证元数据。mise 会下载并提取主要构件。`ctx.options` 包含类型化的工具选项；使用
`RUNTIME` 获取平台信息，包括 mise 请求其他平台的锁文件条目时的平台信息。

```lua
-- hooks/pre_install.lua: 一个示例性的 Linux x64 发布布局
function PLUGIN:PreInstall(ctx)
    if RUNTIME.osType ~= "linux" or RUNTIME.archType ~= "amd64" then
        error("This example artifact supports Linux x64 only")
    end
    local filename = "example-" .. ctx.version .. "-linux-x64.tar.gz"
    return {
        version = ctx.version,
        url = "https://downloads.example.com/" .. filename,
        sha256 = ctx.options.sha256 or error("sha256 option is required"),
    }
end
```

替换发布者 URL，并提供其受信任的 SHA-256 摘要。工作中的安装器绝不能包含省略号或虚假的校验和。没有强校验和或受支持证明的 URL，无法确保构件完整性。支持 SHA-256 和 SHA-512；旧版 SHA-1/MD5 不满足强验证要求。

对于受支持的证明，请返回一个 `attestation` 表。例如：

```lua
local attestation = {
    github_owner = "your-org",
    github_repo = "your-tool",
    -- 可选：限制发布工作流。
    github_signer_workflow = "your-org/your-tool/.github/workflows/release.yml",
}
```

将此表赋值给 `PreInstall` 响应中的 `attestation` 字段。其他受支持的字段包括带有可选
`cosign_public_key_path` 的 `cosign_sig_or_bundle_path`，以及带有可选 `slsa_min_level` 的
`slsa_provenance_path`。为所选方法提供真实的验证输入。不要在一个示例中组合无关的占位方法。

mise 的生命周期会处理主要构件；不要依赖上游 vfox 的 `addition` 条目来安装第二个 SDK。需要时，请使用工具依赖，或明确实现额外工作。

#### EnvKeys Hook

返回 `{key, value}` 条目。`ctx.path` 是安装路径，`ctx.version` 是所选版本。`ctx.main`、`ctx.sdkInfo` 和类型化的
`ctx.options` 也可用；`ctx.runtimeVersion` 不属于此 Hook 的上下文。

```lua
-- hooks/env_keys.lua
function PLUGIN:EnvKeys(ctx)
    local file = require("file")
    return {
        {key = "EXAMPLE_HOME", value = ctx.path},
        {key = "PATH", value = file.join_path(ctx.path, "bin")},
    }
end
```

多个 PATH 条目会被合并。返回目录，而不是包含完整继承 PATH 的替换值。在此 Hook 中避免网络访问或其他开销较大的工作。

### 可选 Hook

#### PostInstall Hook

使用 `ctx.rootPath` 作为提取后的安装目录。`ctx.sdkInfo` 描述主要 SDK，`ctx.options` 包含工具选项。兼容性字段
`ctx.runtimeVersion` 保存请求的工具版本，而不是 mise 应用程序版本。

```lua
-- hooks/post_install.lua
function PLUGIN:PostInstall(ctx)
    local file = require("file")
    if not file.exists(file.join_path(ctx.rootPath, "bin", "example")) then
        error("Expected bin/example in the extracted archive")
    end
end
```

上面的检查假设采用 Unix 可执行文件布局。归档文件通常会携带可执行权限；只有在实际发行版需要时才修改权限。

#### PreUse Hook

mise 不实现上游 vfox 的 `PreUse` Hook。不要依赖它来重写版本、观察 Shell 更改或执行激活工作。使用受支持的版本列表/别名解析版本请求，并通过
`EnvKeys` 返回环境条目。

#### ParseLegacyFile Hook

在 `metadata.lua` 中声明文件名，实现解析器，并要求用户为插件的安装名称启用
[`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools)。返回版本请求，但不要改变其含义：

```lua
-- hooks/parse_legacy_file.lua
function PLUGIN:ParseLegacyFile(ctx)
    local file = require("file")
    local contents = file.read(ctx.filepath)
    local version = contents:match("^%s*([^\r\n]+)")
    if version then
        version = version:match("^%s*(.-)%s*$")
    end
    return {version = version}
end
```

此解析器支持单行版本请求，包括频道和预发布版本。请根据文件的实际格式进行调整。`ctx.filename` 是基本名称，`ctx.filepath` 是完整路径。尽管名称如此，兼容性方法
`ctx:getInstalledVersions()` 调用的是 `Available`；它不是已安装版本的清单，并且可能会执行网络请求。

## 创建工具插件

### 使用模板仓库

从[工具模板](https://github.com/jdx/mise-tool-plugin-template)创建仓库，或克隆它以查看并自定义其文件。在测试期间，请选择一个不会与核心工具或现有插件冲突的插件名称。

### 1. 插件结构

```text
my-tool-plugin/
├── metadata.lua
├── hooks/
│   ├── available.lua
│   ├── pre_install.lua
│   ├── env_keys.lua
│   ├── post_install.lua       # optional
│   └── parse_legacy_file.lua  # optional
└── lib/
    └── helper.lua            # optional shared code
```

### 2. metadata.lua

```lua
PLUGIN = {
    name = "my-tool",
    version = "1.0.0", -- plugin release, separate from the tool version
    description = "Install Example Tool",
    author = "Plugin Author",
    legacyFilenames = {".example-version"},
    -- Add only real installation prerequisites, if any:
    -- depends = {"go", "make"},
}
```

`depends` 会向安装 Hook 暴露匹配的已配置工具，并对其安装任务进行排序。用户必须配置这些工具；元数据不会选择它们的版本。避免自依赖。这与工具的 `[tools]` `depends` 选项不同，后者会对已配置的安装图进行排序。

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

        -- a runtime shared library, by soname (Linux). apt renamed this
        -- package in the 64-bit time_t transition, so list both names and
        -- let mise pick the one that exists.
        { sharedlib = "libaio.so.1",
          packages = { apt = { "libaio1t64", "libaio1" }, dnf = "libaio" } },

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

- **`version`** — `bin` 和 `pkgconfig` 的约束（`>=3.0`、`>3`、`<=1.2`、`=3.0`，或表示 `>=3.0` 的裸版本号 `3.0`）。mise 会运行 `<bin> --version` / `pkg-config --modversion` 并进行比较。如果无法提取版本，则将依赖视为满足（存在即可），而不是阻止安装
- **`optional`** — 简短的原因字符串。缺失的可选依赖不会提示或失败；它们会显示为一行信息，让用户可以在不需要某些功能时进行构建（例如 Erlang 的 `wxWidgets` GUI）
- **`packages`** — 将包管理器名称（`brew`、`brew-cask`、`apt`、`dnf`、`pacman`、`apk`、`flatpak`、`flatpak-user`、`mas`、`winget`）映射到提供该功能的包。值可以是单个包名称（`apt = "bison"`），也可以是候选项列表（`apt = { "libaio1t64", "libaio1" }`），用于同一功能在不同发行版版本中使用不同包名称的情况。候选项按新名称优先的顺序排列：mise 会选择包管理器实际拥有的第一个候选项；如果无法判断，则回退到列表中的第一个候选项。只有可以查询包可用性的管理器（目前为 `apt`）会执行此选择；其他管理器始终使用第一个候选项，因此对它们而言，使用单个名称仍然是正确选择

**绝不要从 `metadata.lua` 探测主机。** 每次 mise 加载插件元数据时都会运行其顶层代码，因此在那里执行 Shell 命令（检查哪个包名称存在、读取发行版版本）会在许多 mise 调用中产生开销，并且其结果会与元数据一同缓存——当用户升级操作系统后，这个针对特定机器的答案会过时。请声明候选项并让 mise 解析它们；mise 会延迟执行此操作：只有实际未通过检查的依赖，在即将安装包时才会进行解析。

**检测结果是唯一依据。** 无论某项功能是通过 Homebrew、apt、nix、MacPorts 还是从源代码安装的，只要检查通过，就视为满足；mise 不会询问它是如何安装的。只有在**提供安装缺失项的选项**时，才会查询 `packages` 映射；它只是补救提示，并不声明该工具必须来自相应的包管理器。

这些声明在较旧版本的 mise 和上游 vfox 中不会产生作用（两者都会忽略未知的 `PLUGIN` 字段），因此添加它们具有向后兼容性。

### 3. 辅助库

使用 Lua 辅助函数处理发布者特定的平台命名。运行时对 macOS 报告 `darwin`，对 x64 报告 `amd64`；上游归档文件可能使用不同的拼写。仅映射发布者实际支持的平台，并明确拒绝其他平台。

```lua
-- lib/platform.lua
local M = {}
function M.archive_platform()
    local os_names = {darwin = "macos", linux = "linux", windows = "windows"}
    local arches = {amd64 = "x64", arm64 = "arm64"}
    local os_name = os_names[RUNTIME.osType] or error("Unsupported OS: " .. RUNTIME.osType)
    local arch = arches[RUNTIME.archType] or error("Unsupported architecture: " .. RUNTIME.archType)
    return os_name .. "-" .. arch
end
return M
```

## 真实世界示例：vfox-nodejs

请研究 [vfox-nodejs](https://github.com/version-fox/vfox-nodejs) 以了解上游实现。对于常规 Node 使用，优先使用 mise 的
[核心 Node 后端](/lang/node.html)。Node 插件必须处理以下细节，而不是复制固定的 Linux 归档 URL。

### 可用 Hook 示例

Node 的发布索引包含版本字符串和发布元数据。解码之前请检查 HTTP 状态，保留索引的发布顺序，并仅移除已知的前导
`v`。 [HTTP 和 JSON 模块](/plugin-lua-modules.html)提供请求和解码 API。

### PreInstall Hook 示例

为目标操作系统/架构选择准确的归档文件，然后在 `SHASUMS256.txt` 中精确匹配其文件名。文件名包含 `.` 和 `-` 等 Lua 模式字符，因此
`line:match(filename)` 并不是精确的文件名检查。例如：

```lua
local function find_checksum(body, filename)
    for line in body:gmatch("[^\r\n]+") do
        local digest, name = line:match("^(%x+)%s+%*?(.+)$")
        if name == filename and #digest == 64 then
            return digest
        end
    end
    error("No SHA-256 entry for " .. filename)
end
```

如果缺少校验和则失败。请求失败后，不要默默地继续使用 `sha256 = nil`。从同一服务器获取校验和是一项完整性检查，但这与验证 Node 的签名校验和清单并不具有相同的保证。

### EnvKeys Hook 示例

Node 归档文件在 Unix 上将可执行文件放置在 `bin` 中，在 Windows 上则放置于安装根目录。请使用正确的目录：

```lua
function PLUGIN:EnvKeys(ctx)
    local file = require("file")
    local bin = RUNTIME.osType == "windows" and ctx.path or file.join_path(ctx.path, "bin")
    return {
        {key = "NODE_HOME", value = ctx.path},
        {key = "PATH", value = bin},
    }
end
```

### PostInstall Hook 示例

不要在没有明确配置范围的情况下运行 `npm config set`：它可能会更改工具安装目录之外的用户 npm 配置。如果插件需要特定的 npm 前缀或缓存，请优先返回环境条目。在添加权限更改或设置命令之前，请测试实际的归档布局。

### 旧文件支持

Node 版本文件可以包含 `lts/*` 等别名、前缀和预发布版本。不要只提取数字和点号。解析器必须保留请求，插件也必须支持解析该请求；否则应报告不受支持的值，而不是选择其他发布版本。

## 测试你的插件

### 本地开发

使用单独的测试项目和不会替换常用工具的插件名称：

```sh
mise plugin link my-tool /path/to/my-tool-plugin
mise ls-remote my-tool
mise use my-tool@1.0.0
mise exec -- example --version
```

将 `1.0.0` 替换为已发布的测试版本，将 `example` 替换为它提供的可执行文件。对于版本文件测试，请使用另一个没有竞争性 `[tools]` 固定版本的空项目：

```toml
[settings]
idiomatic_version_file_enable_tools = ["my-tool"]
```

将受支持的请求写入 `.example-version`，运行 `mise install`，并验证
`mise exec -- example --version`。`mise use my-tool` 会写入工具选择，因此它不能用于测试版本文件是否控制了解析。

### 调试模式

```sh
MISE_DEBUG=1 mise install my-tool@1.0.0
mise cache clear my-tool
```

当缓存的元数据或版本结果掩盖了本地 Hook 编辑时，请清除工具的缓存。

### 插件测试脚本

使用独立的[发布测试工作流](/plugin-publishing.html#testing-before-publication)。测试版本列表、具体安装、可执行文件查找和环境值。还要测试不受支持的平台、缺少校验和、格式错误的元数据、包含空格的路径，以及受支持时的惯用文件。在 CI 中运行每个声明支持的操作系统。

## 最佳实践

### 错误处理

对于可恢复的传输失败，请使用 `http.try_get`，并在解析之前检查 HTTP 状态。`json.decode` 和
`cmd.exec` 等同步操作会抛出可捕获的 Lua 错误。绝不要仅为了解释请求失败而记录令牌或包含密钥的响应正文。

### 平台检测

使用注入的运行时，而不是生成 `uname`：

| 字段                    | 值或含义                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `RUNTIME.osType`        | `windows`、`linux`、`darwin`                               |
| `RUNTIME.archType`      | `amd64`、`arm64`、`x86` 及其他受支持的架构 |
| `RUNTIME.envType`       | 在检测到的 Linux 系统上为 `gnu` 或 `musl`；否则为 `nil` |
| `RUNTIME.version`       | 嵌入式 vfox 运行时版本                                      |
| `RUNTIME.pluginDirPath` | 插件源目录                                                  |

### 版本规范化

仅规范化有文档说明的发布者约定，例如前导 `v`。将版本的其余部分视为不透明内容。移除
`-beta.1` 会将预发布版本改成不同的请求。

### 缓存

mise 会缓存远程版本列表和环境结果。模块级 Lua 表只在该运行时持续存在，无法提供跨独立 mise 调用共享的缓存。保持元数据为声明式，并参阅[缓存行为](/cache-behavior.html)了解刷新控制。

## 高级特性

### 条件安装

使用 `RUNTIME` 和准确的请求版本选择归档文件。在为其他目标平台生成锁文件时也可能调用
`PreInstall`；不要为了计算构件 URL 而探测主机或安装依赖。

### 源码编译

仅在安装阶段进行编译。声明前置条件，使用带有 `cwd` 选项的 `cmd.exec`，并通过正确引用的参数或环境变量传递路径。说明构建是否需要 POSIX Shell。`nproc`、`chmod` 和
`./configure` 等命令无法构成可移植的 Windows 构建方案。

### 环境配置

仅返回工具所需的变量。PATH 条目是目录；设置 `LD_LIBRARY_PATH` 等不相关变量可能会影响环境中启动的每个进程。对于与工具版本无关的变量，请使用[环境插件](/env-plugin-development.html)。

## 后续步骤

- [后端插件开发](/backend-plugin-development.html)
- [插件 Lua 模块](/plugin-lua-modules.html)
- [插件发布](/plugin-publishing.html)
