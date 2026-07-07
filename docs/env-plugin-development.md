# 环境插件开发

环境插件是一种特殊类型的 mise 插件，它提供环境变量和 PATH 修改，而不管理工具版本。它们非常适合用于集成外部服务、管理密钥以及在团队之间标准化环境配置。

与[工具插件](tool-plugin-development.md)和[后端插件](backend-plugin-development.md)不同，环境插件：

- 不实现版本管理（`Available`、`PreInstall`、`PostInstall` 钩子）
- 只实现环境钩子（`MiseEnv`、`MisePath`）
- 通过 `env._.<plugin-name>` 语法进行配置
- 可以接受作为 TOML 值的配置选项
- 在每次环境激活时执行

## 快速开始

创建环境插件最快的方法是使用 [mise-env-plugin-template](https://github.com/jdx/mise-env-plugin-template)。

::: tip
[mise-env-plugin-template](https://github.com/jdx/mise-env-plugin-template) 提供了一个可直接使用的起点，预先配置了 LuaCATS 类型定义、stylua 格式化以及 hk 代码检查。
:::

开始使用：

```bash
# 克隆模板
git clone https://github.com/jdx/mise-env-plugin-template my-env-plugin
cd my-env-plugin

# 根据你的使用场景进行自定义
# 编辑 metadata.lua、hooks/mise_env.lua、hooks/mise_path.lua
```

## 插件结构

环境插件使用 Lua（目前版本 5.1）实现。一个最小的环境插件具有以下结构：

```
my-env-plugin/
├── metadata.lua           # 插件元数据
└── hooks/
    ├── mise_env.lua      # 返回环境变量（必需）
    └── mise_path.lua     # 返回 PATH 条目（可选）
```

### metadata.lua

`metadata.lua` 文件定义插件的基本信息：

```lua
PLUGIN = {}

--- 插件名称（必需）
PLUGIN.name = "my-env-plugin"

--- 插件版本（必需）
PLUGIN.version = "1.0.0"

--- 插件描述（必需）
PLUGIN.description = "为我的服务提供环境变量"

--- 插件主页（可选）
PLUGIN.homepage = "https://github.com/username/my-env-plugin"

--- 插件许可证（可选）
PLUGIN.license = "MIT"

--- 所需的 mise/vfox 最低版本（可选）
PLUGIN.minRuntimeVersion = "0.3.0"
```

### hooks/mise_env.lua

`MiseEnv` 钩子返回要设置的环境变量：

```lua
function PLUGIN:MiseEnv(ctx)
    -- 通过 ctx.options 从 mise.toml 访问配置
    local api_url = ctx.options.api_url or "https://api.example.com"
    local debug = ctx.options.debug or false

    -- 返回环境变量数组
    return {
        {
            key = "API_URL",
            value = api_url
        },
        {
            key = "DEBUG",
            value = tostring(debug)
        },
        {
            key = "SERVICE_TOKEN",
            value = get_token_from_somewhere()  -- 你的自定义逻辑
        }
    }
end
```

::: tip
当从 `MiseEnv` 或 `MisePath` 钩子中调用 `cmd.exec()` 时，它会继承 mise 构造的环境——包括 `_.path` 条目以及来自前序指令的环境变量。如果模块指令配置了 `tools = true`（例如 `_.my-plugin = { tools = true }`），工具安装的 bin 路径也会被包含在内，因此可直接调用由 mise 管理的工具（例如 `cmd.exec("node --version")`）。
:::

**返回值**：可以是一个简单的 env 键数组，或者一个带缓存元数据的表。

简单格式 - 表数组，每个表包含：

- `key`（字符串，必需）：环境变量名
- `value`（字符串，必需）：环境变量值

扩展格式 - 表，包含：

- `env`（数组，必需）：`{key, value}` 表的数组（与简单格式相同）
- `cacheable`（布尔值，可选）：如果为 `true`，mise 可以缓存此插件的输出。默认值：`false`
- `watch_files`（字符串数组，可选）：需要监视变化的文件路径。如果任一文件的 mtime 发生变化，缓存将失效。

使用带缓存的扩展格式示例：

```lua
function PLUGIN:MiseEnv(ctx)
    local config_path = ctx.options.config_file or "config.json"
    local config = load_config(config_path)

    return {
        cacheable = true,
        watch_files = {config_path},
        env = {
            {key = "API_URL", value = config.api_url},
            {key = "API_KEY", value = config.api_key}
        }
    }
end
```

当 `cacheable = true` 时，mise 将缓存环境变量，并且只会在以下情况下重新执行插件：

- `watch_files` 中的任何文件发生变化
- mise 配置发生变化
- 缓存 TTL 过期（通过 `env_cache_ttl` 设置配置）

::: tip
要使缓存生效，用户必须启用 `env_cache` 设置：

```toml
# ~/.config/mise/config.toml
[settings]
env_cache = true
```

:::

### hooks/mise_path.lua

`MisePath` 钩子返回要添加到 PATH 的目录（可选）：

```lua
function PLUGIN:MisePath(ctx)
    -- 返回要前置到 PATH 的路径数组
    local paths = {
        "/opt/my-service/bin"
    }

    -- 可选地添加用户配置的路径
    if ctx.options.custom_bin_path then
        table.insert(paths, ctx.options.custom_bin_path)
    end

    return paths
end
```

**返回值**：字符串数组（目录路径）

## 上下文对象

两个钩子都会接收一个 `ctx` 参数，其中包含：

- **`ctx.options`**：来自 `mise.toml` 的用户配置 TOML 表

对于环境插件，`ctx.options` 是接受用户配置的主要方式。

## mise.toml 中的配置

用户使用 `env._` 指令来配置环境插件：

无需选项的简单激活：

```toml
[env]
_.my-env-plugin = {}
```

带配置选项：

```toml
[env]
_.my-env-plugin = {
  api_url = "https://prod.api.example.com",
  debug = false,
  custom_bin_path = "/custom/path/bin",
}
```

TOML 表中的所有字段都会作为 `ctx.options` 传递给你的钩子。

## 完整示例：Secret Manager 插件

下面是一个从外部服务获取密钥的插件完整示例：

**metadata.lua**:

```lua
PLUGIN = {}
PLUGIN.name = "vault-secrets"
PLUGIN.version = "1.0.0"
PLUGIN.description = "从 HashiCorp Vault 获取密钥"
PLUGIN.minRuntimeVersion = "0.3.0"
```

**hooks/mise_env.lua**:

```lua
local http = require("http")
local json = require("json")

function PLUGIN:MiseEnv(ctx)
    local vault_url = ctx.options.vault_url or error("vault_url required")
    local secrets_path = ctx.options.secrets_path or error("secrets_path required")
    local vault_token = os.getenv("VAULT_TOKEN") or error("VAULT_TOKEN not set")

    -- 从 Vault 获取密钥
    local url = vault_url .. "/v1/" .. secrets_path
    local response = http.get({
        url = url,
        headers = {
            ["X-Vault-Token"] = vault_token
        }
    })

    if response.status_code ~= 200 then
        error("获取密钥失败: " .. response.status_code)
    end

    local data = json.decode(response.body)
    local env_vars = {}

    -- 将 Vault 密钥转换为环境变量
    for key, value in pairs(data.data.data) do
        table.insert(env_vars, {
            key = key,
            value = value
        })
    end

    return env_vars
end
```

**在 mise.toml 中的用法**:

```toml
[env]
_.vault-secrets = {
  vault_url = "https://vault.example.com",
  secrets_path = "secret/data/myapp/production",
}
```

## 可用的 Lua 模块

环境插件可以访问 mise 内置的 Lua 模块：

- **`http`**：发起 HTTP 请求
- **`json`**：编码/解码 JSON
- **`file`**：读写文件
- **`cmd`**：执行 shell 命令
- **`strings`**：字符串处理工具
- **`env`**：访问环境变量

有关完整文档，请参见 [插件 Lua 模块](/plugin-lua-modules.html)。

## 最佳实践

### 1. 提供合理的默认值

```lua
function PLUGIN:MiseEnv(ctx)
    local api_url = ctx.options.api_url or "https://api.example.com"
    local timeout = ctx.options.timeout or 30

    -- ...
end
```

### 2. 验证必需的选项

```lua
function PLUGIN:MiseEnv(ctx)
    if not ctx.options.api_key then
        error("api_key 在 mise.toml 配置中是必需的")
    end

    -- ...
end
```

### 3. 优雅地处理错误

```lua
function PLUGIN:MiseEnv(ctx)
    local response = http.get({url = ctx.options.api_url})

    if response.status_code ~= 200 then
        error("API 请求失败: " .. response.status_code .. " - " .. response.body)
    end

    -- ...
end
```

### 4. 对于耗时操作使用内置缓存

对于从外部服务获取数据的插件，请通过返回带有 `cacheable = true` 的扩展格式来使用 mise 的内置缓存：

```lua
function PLUGIN:MiseEnv(ctx)
    local config_file = ctx.options.config_file or "secrets.json"

    -- 获取密钥（mise 将缓存结果）
    local secrets = fetch_secrets(ctx.options)

    return {
        cacheable = true,
        watch_files = {config_file},  -- 如果配置发生变化则重新获取
        env = secrets
    }
end
```

相比手动缓存，更推荐这种方式，因为：

- mise 会自动处理缓存失效
- 缓存使用会话范围的密钥进行加密
- 可与 `mise cache clear` 和 `mise cache prune` 集成
- 遵循 `env_cache_ttl` 设置

注意：用户必须在其设置中启用 `env_cache = true`，缓存才能生效。

### 5. 支持多个环境

```lua
function PLUGIN:MiseEnv(ctx)
    local env_name = ctx.options.environment or "development"

    -- 根据环境加载不同的配置
    local config = load_config(env_name)

    return {
        {key = "ENV", value = env_name},
        {key = "API_URL", value = config.api_url},
        -- ...
    }
end
```

## 测试你的插件

### 本地测试

1. 为开发链接你的插件：

```bash
mise plugin link my-env-plugin /path/to/my-env-plugin
```

2. 在 `mise.toml` 中配置它：

```toml
[env]
_.my-env-plugin = { test_option = "value" }
```

3. 测试环境：

```bash
# 查看环境变量
mise env | grep MY_

# 使用该环境运行命令
mise exec -- env | grep MY_

# 使用 MISE_DEBUG 调试
MISE_DEBUG=1 mise env
```

### 常见问题

**未找到插件**：确保你已经安装/链接了该插件：

```bash
mise plugin ls
```

**Hook 未执行**：启用调试日志：

```bash
MISE_DEBUG=1 mise env
```

**选项未传递**：检查 `mise.toml` 中的 TOML 语法：

```toml
[env]
# 正确：TOML 表
_.my-plugin = { key = "value" }

# 错误：字符串值
_.my-plugin = "value"  # 这不会起作用
```

## 发布你的插件

当你的环境插件准备就绪后：

1. **为你的插件创建一个 GitHub 仓库**
2. **添加一个 README**，包含使用说明
3. **按照语义化版本控制** 标记发布版本
4. （可选）分享仓库 URL，以便其他人可以直接使用 `mise plugin install` 安装它

有关详细说明，请参阅 [插件发布](/plugin-publishing.html)。

## 示例

- [mise-env-sample](https://github.com/jdx/mise-env-plugin-template) - 展示基本用法的简单示例
- [mise-plugins](https://github.com/mise-plugins) 组织目前仅托管工具插件——请将你的环境插件添加到那里（或与社区分享），这样其他人就可以从更多示例中学习

## 从工具插件迁移

如果你有一个现有的仅设置环境变量的工具插件，你可以将其简化为仅环境插件：

**之前**（带有未使用钩子的工具插件）：

```
my-plugin/
├── metadata.lua
└── hooks/
    ├── available.lua        # 返回空列表
    ├── pre_install.lua      # 未使用
    ├── post_install.lua     # 未使用
    └── env_keys.lua         # 实际设置环境变量
```

**之后**（环境插件）：

```
my-plugin/
├── metadata.lua
└── hooks/
    └── mise_env.lua         # 干净且聚焦
```

## 相关文档

- [插件概述](/plugins.html) - 所有插件类型的概述
- [工具插件开发](/tool-plugin-development.html) - 用于管理工具版本的插件
- [后端插件开发](/backend-plugin-development.html) - 用于多工具后端
- [插件 Lua 模块](/plugin-lua-modules.html) - 可用的 Lua API
- [插件发布](/plugin-publishing.html) - 发布你的插件
- [环境变量](/environments/) - mise 如何管理环境
