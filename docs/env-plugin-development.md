---
description: "环境插件返回变量和 PATH 条目，而不安装版本化工具。"
---

# 环境插件开发

环境插件返回变量和 PATH 条目，而不安装版本化工具。将它们用于外部配置服务、密钥管理器或团队环境。它们会在 mise 构建环境时运行，因此应保持其钩子快速且非交互式。它们的执行频率取决于环境缓存和所运行的命令。

对于安装生命周期，请改用 [工具](/tool-plugin-development.html) 或 [后端](/backend-plugin-development.html) 插件。

## 快速开始

从[环境插件模板](https://github.com/jdx/mise-env-plugin-template)开始，或创建以下文件。在引用指令前链接该目录：

```sh
mise plugin link my-env-plugin /path/to/my-env-plugin
```

```toml
[env]
_.my-env-plugin = {
  api_url = "https://api.example.com",
  debug = false,
}
```

使用 `mise env --json` 检查结果，或通过 `mise exec` 运行命令。环境输出可能包含密钥，因此请在本地检查，并避免将其粘贴到日志或 issue 中。

## 插件结构

```text
my-env-plugin/
├── metadata.lua
└── hooks/
    ├── mise_env.lua   # variables
    └── mise_path.lua  # optional PATH entries
```

插件使用 mise 内置的 Lua 5.1 运行时。环境钩子是 mise 扩展；不要假设上游 vfox 安装会调用它们。

### metadata.lua

```lua
PLUGIN = {
    name = "my-env-plugin",
    version = "1.0.0",
    description = "Provide service configuration",
    author = "Plugin Author",
}
```

保持元数据为声明式。请在 README 和 CI 中记录并测试所需的 mise 版本；`minRuntimeVersion` 字段不是 mise 版本兼容性检查。

### hooks/mise_env.lua

一个最小可用的钩子会返回一个键值条目数组：

```lua
function PLUGIN:MiseEnv(ctx)
    return {
        {key = "API_URL", value = ctx.options.api_url or "https://api.example.com"},
        {key = "DEBUG", value = tostring(ctx.options.debug or false)},
    }
end
```

键和值必须是字符串。要提供缓存和脱敏元数据，请返回一个表：

```lua
function PLUGIN:MiseEnv(ctx)
    local file = require("file")
    local json = require("json")
    local path = file.join_path(ctx.config_root, ctx.options.config_file or "service.json")
    local config = json.decode(file.read(path))
    assert(type(config.api_url) == "string", "service.json must contain a string api_url")
    return {
        cacheable = true,
        watch_files = {path},
        env = {{key = "API_URL", value = config.api_url}},
    }
end
```

此示例将 `config_file` 视为相对于配置根目录的路径。如果插件也接受绝对路径，请定义并记录单独的策略。

| 字段          | 含义                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `env`         | `{key, value}` 条目数组；省略表示不设置变量                                                                   |
| `cacheable`   | mise 是否可以缓存此输出；默认为 `false`                                                                      |
| `watch_files` | 修改时间参与缓存验证的文件；相对条目将从配置根目录解析                                                       |
| `redact`      | 请求对 mise 处理后输出中的返回值进行脱敏；默认为 `false`                                                     |

用户明确指定的指令级 `redact` 选项会覆盖插件的偏好。脱敏不会从环境中移除值，原始任务输出也不会经过脱敏。请参阅[脱敏](/environments/#redactions)。

缓存需要全局 `env_cache` 设置。缓存按会话标识，并具有 TTL；文件监视无法检测远程服务中的值是否发生变化。当缓存的环境被嵌套的 mise 调用继承时，也存在一些限制。不要仅仅因为存在 `cacheable = false` 或 `watch_files` 就承诺密钥会立即刷新。需要当前值时请使用 `MISE_ENV_CACHE=0`；请参阅[缓存行为](/cache-behavior.html)。

### hooks/mise_path.lua

返回目录路径数组。对于项目相对配置，请根据 `ctx.config_root` 解析路径，而不是根据进程当前工作目录解析：

```lua
function PLUGIN:MisePath(ctx)
    local file = require("file")
    if not ctx.options.bin_dir then
        return {}
    end
    local path = file.join_path(ctx.config_root, ctx.options.bin_dir)
    local metadata = file.stat(path)
    if not metadata or not metadata.is_dir then
        return {}
    end
    return {path}
end
```

此示例接受相对的 `bin_dir`。钩子返回要添加到 PATH 的目录，而不是完整的 PATH 字符串。仅返回集成所需且实际存在的目录。

## 上下文对象

两个钩子都会接收 `ctx.options`，其中包含类型化的 TOML 指令配置，以及 `ctx.config_root`，即与声明配置文件关联的根目录。从该根目录解析本地输入文件，以便从子目录调用 mise 时产生相同的结果。

`os.getenv` 和 `cmd.exec` 会看到 mise 构建的环境，包括前置指令和 `_.path` 条目。要公开已配置工具的二进制文件，请使用 `tools = true`：

```toml
[tools]
node = "24"

[env]
_.my-env-plugin = { tools = true }
```

这会在工具感知阶段运行该指令。它不会声明插件需要哪些外部程序；请为用户记录这些前置条件。

## mise.toml 中的配置

空表会在不使用自定义选项的情况下调用插件：

```toml
[env]
_.my-env-plugin = {}
```

使用 TOML 表传递选项。mise 支持 TOML 1.1 多行内联表、注释和尾随逗号：

```toml
[env]
_.my-env-plugin = {
  # Relative to the file's configuration root.
  config_file = "service.json",
  bin_dir = "bin",
}
```

请保留 mise 的指令控制项（例如 `tools` 和 `redact`）的文档定义含义。不要将它们重新用作无关的插件选项。

## 完整示例：Secret Manager 插件

此钩子从 [HashiCorp Vault KV v2](https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2#read-secret-version) 响应中读取字符串类型的密钥。它需要一个已有的 `VAULT_TOKEN`，并且该令牌有权限读取指定路径。它不实现令牌登录／续期、命名空间或其他 Vault 密钥引擎。

**metadata.lua**：

```lua
PLUGIN = {
    name = "vault-secrets",
    version = "1.0.0",
    description = "Read Vault KV v2 secrets",
}
```

**hooks/mise_env.lua**：

```lua
local http = require("http")
local json = require("json")

function PLUGIN:MiseEnv(ctx)
    local vault_url = ctx.options.vault_url or error("vault_url is required")
    assert(vault_url:match("^https://"), "vault_url must use HTTPS")
    local secrets_path = ctx.options.secrets_path or error("secrets_path is required")
    local token = os.getenv("VAULT_TOKEN") or error("VAULT_TOKEN is not set")
    local response = http.get({
        url = vault_url:gsub("/+$", "") .. "/v1/" .. secrets_path,
        headers = {["X-Vault-Token"] = token},
    })
    if response.status_code ~= 200 then
        error("Vault request failed with HTTP " .. response.status_code)
    end
    local payload = json.decode(response.body)
    local data = payload.data and payload.data.data
    assert(type(data) == "table", "Expected a Vault KV v2 data response")
    local variables = {}
    for key, value in pairs(data) do
        assert(key:match("^[%a_][%w_]*$"), "Secret key is not an environment variable name")
        assert(type(value) == "string", "Secret values must be strings")
        table.insert(variables, {key = key, value = value})
    end
    return {env = variables, cacheable = false, redact = true}
end
```

将此插件安装或链接为 `vault-secrets`，然后配置端点和 KV v2 API 路径。请使用你信任且能够接收令牌的 HTTPS 端点：

```toml
[env]
_.vault-secrets = {
  vault_url = "https://vault.example.com",
  secrets_path = "secret/data/myapp/production",
}
```

该钩子会向子进程返回未掩码的值。脱敏只会影响受支持的 mise 输出处理。定义密钥新鲜度时，请考虑上述缓存限制。

## 可用的 Lua 模块

使用 [Lua 模块参考](/plugin-lua-modules.html)了解 HTTP、JSON、文件、命令、字符串和日志记录。`cmd.exec` 会调用 shell；在可能的情况下优先使用直接的文件／HTTP 操作，并且绝不要将不受信任的选项插值到命令字符串中。

## 最佳实践

在发起请求前验证必需选项，并使用有用的错误信息拒绝格式错误的响应，同时省略凭据和密钥值。仅在默认值具有明确含义时提供默认值。避免在 shell 激活期间进行交互式登录；在插件 README 中说明身份验证设置。

通过钩子返回环境值。`env.setenv` 会修改 mise 进程自身；它不是向用户 shell 返回变量的机制。

### 4. 对于耗时操作使用内置缓存

仅当在配置的 TTL 内允许结果过时时才启用缓存。在 `watch_files` 中列出本地输入，并在继承的 shell 会话和全新进程中测试刷新。本地 Lua 表不会跨 mise 调用持久化缓存。

## 测试你的插件

### 本地测试

从隔离的配置／数据目录进行测试，使用[插件发布](/plugin-publishing.html#testing-before-publication)中的工作流程。至少涵盖：

- 最小指令和每个受支持的选项
- 从子目录调用，包括文件和 PATH 解析
- 缺少凭据、非 200 HTTP 响应和格式错误的负载
- 如果插件调用已配置的工具，测试 `tools = true` 阶段
- 返回缓存元数据时的新鲜环境和缓存环境

### 常见问题

使用 `mise plugins ls` 确认插件名称与指令匹配。检查 TOML 结构：`_.my-plugin = { key = "value" }` 是一个表；字符串值不是相同的接口。在本地使用 `MISE_DEBUG=1 mise env` 检查钩子失败，同时注意其中可能包含密钥的输出。

如果钩子没有运行，请检查安全模式或缓存的环境。如果缺少命令，请确认其前置条件，以及该指令是否需要 `tools = true`。

## 发布你的插件

记录配置字段、所需凭据、API 范围、支持的平台以及缓存／脱敏行为。发布一个 Git 仓库并分享其 URL；不要求使用注册表简写。请参阅[插件发布](/plugin-publishing.html)。

## 示例

从[环境模板](https://github.com/jdx/mise-env-plugin-template)开始，并根据上面的可用钩子进行调整。将第三方示例视为需要审查的代码，而不是其服务或身份验证行为与你的环境相匹配的保证。

## 从工具插件迁移

将仅限环境的行为从 `EnvKeys` 移动到 `MiseEnv`，在 `[env]` 下添加指令，并移除人为设置的工具版本／安装钩子。使用 `MisePath` 处理 PATH 条目。这会将激活方式从选定的工具版本改为显式的环境指令；请为现有用户记录配置迁移方式。

## 相关文档

- [插件概览](/plugins.html)。
- [工具插件开发](/tool-plugin-development.html)。
- [后端插件开发](/backend-plugin-development.html)。
- [插件 Lua 模块](/plugin-lua-modules.html)。
- [环境变量](/environments/)。
