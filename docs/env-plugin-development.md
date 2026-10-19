---
description: "编写 Lua 插件，根据 [env] 指令设置环境变量和 PATH 条目。"
---

# 环境插件

环境插件会向 `[env]` 添加一个指令，其 Lua 钩子可返回环境变量和 `PATH` 条目。可用它从服务或 mise 不支持的文件格式中加载配置；环境插件不会安装任何工具。

每次构建环境时，mise 都会调用这些钩子；在一个 Shell 会话中可能会调用多次，因此钩子应保持快速，且不得要求用户交互。若要管理带版本的工具，请改写[工具插件](/tool-plugin-development.html)或[后端插件](/backend-plugin-development.html)。

## 快速开始 {#quick-start}

你可以在 GitHub 上点击 **Use this template**，或使用 GitHub CLI，从[环境插件模板](https://github.com/jdx/mise-env-plugin-template)创建仓库：

```sh
gh repo create mise-my-env-plugin --template jdx/mise-env-plugin-template --public --clone
```

环境插件的目录结构如下：

```text
mise-my-env-plugin/
├── metadata.lua
└── hooks/
    ├── mise_env.lua    # environment variables
    └── mise_path.lua   # PATH entries
```

最简插件只需包含 `metadata.lua` 和一个钩子：

```lua [metadata.lua]
PLUGIN = {
    name = "my-env-plugin",
    version = "0.1.0",
    description = "Set the API URL for this project",
}
```

```lua [hooks/mise_env.lua]
function PLUGIN:MiseEnv(ctx)
    return {
        { key = "API_URL", value = ctx.options.api_url or "https://api.example.com" },
    }
end
```

添加插件指令前，请先链接插件。如果指令所指定的插件尚未安装，且 mise 没有可用于安装它的来源（注册表条目、`[plugins]` URL，或 `owner/repo`、URL 格式的名称），mise 会显示警告、跳过该指令并继续加载其余 `[env]` 设置，同时在 `mise doctor` 中报告此问题。链接或安装插件后，后续命令便会使用它：

```sh
mise plugins link my-env-plugin ./mise-my-env-plugin
```

然后添加指令并检查结果：

```toml [mise.toml]
[env]
_.my-env-plugin = { api_url = "https://api.staging.example.com" }
```

```sh
mise exec -- printenv API_URL
# https://api.staging.example.com
```

## 完整示例：Vault 秘密信息插件 {#complete-example}

编写秘密信息插件前，请先检查 [mise secrets](/environments/secrets/) 是否已支持你的存储服务。

此插件从 [HashiCorp Vault KV v2](https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2#read-secret-version) 路径中读取字符串类型的秘密信息。它需要一个有权限读取该路径的 `VAULT_TOKEN`。插件不会执行登录或续期，也不支持命名空间和其他秘密引擎。

```lua [metadata.lua]
PLUGIN = {
    name = "vault-secrets",
    version = "1.0.0",
    description = "Read Vault KV v2 secrets",
}
```

```lua [hooks/mise_env.lua]
local http = require("http")
local json = require("json")

function PLUGIN:MiseEnv(ctx)
    local vault_url = ctx.options.vault_url or error("vault_url is required")
    assert(vault_url:match("^https://"), "vault_url must use HTTPS")
    local secrets_path = ctx.options.secrets_path or error("secrets_path is required")
    local token = os.getenv("VAULT_TOKEN") or error("VAULT_TOKEN is not set")
    local response = http.get({
        url = vault_url:gsub("/+$", "") .. "/v1/" .. secrets_path,
        headers = { ["X-Vault-Token"] = token },
    })
    if response.status_code ~= 200 then
        error("Vault request failed with HTTP " .. response.status_code)
    end
    local payload = json.decode(response.body)
    local data = payload.data and payload.data.data
    assert(type(data) == "table", "expected a Vault KV v2 data response")
    local variables = {}
    for key, value in pairs(data) do
        assert(key:match("^[%a_][%w_]*$"), "secret key is not an environment variable name")
        assert(type(value) == "string", "secret values must be strings")
        table.insert(variables, { key = key, value = value })
    end
    return { env = variables, cacheable = false, redact = true }
end
```

将插件链接为 `vault-secrets`，然后配置 Vault 地址。请使用可信的 HTTPS 端点并提供 token：

```toml [mise.toml]
[env]
_.vault-secrets = { vault_url = "https://vault.example.com", secrets_path = "secret/data/myapp/production" }
```

该钩子返回 `redact = true`，因此 mise 会对任务输出和日志中的值进行脱敏；返回 `cacheable = false`，则表示 mise 每次构建环境时都向 Vault 重新请求。程序仍会收到真实值。

## Hooks {#hooks}

| 钩子       | 文件                  | 返回内容                     |
| ---------- | --------------------- | ---------------------------- |
| `MiseEnv`  | `hooks/mise_env.lua`  | 环境变量                      |
| `MisePath` | `hooks/mise_path.lua` | 要加入 `PATH` 的目录           |

可以实现其中一个或两个钩子。钩子通过调用 `error()` 报错时，mise 会停止并显示错误信息。不要在错误信息中包含凭据或秘密值。钩子可以使用 [Plugin Lua 参考](/plugin-lua-modules.html)中介绍的 `http`、`json`、`file`、`cmd` 等模块。

### Hook context {#context-object}

两个钩子接收相同的 `ctx`：

| `ctx` 字段    | 值                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------- |
| `options`     | 指令对应的表，保留 TOML 类型：`debug = false` 会作为布尔值 `false` 传入                    |
| `config_root` | 声明该指令的文件所在的[配置根目录](/configuration.html#config-root)                           |

相对路径应以 `ctx.config_root` 而非当前目录为基准解析，这样从子目录运行 mise 时结果也保持一致。与工具和后端钩子不同，环境钩子接收到的布尔值和数字会保留 TOML 中的类型。

`os.getenv` 和 `cmd.exec` 可以访问 mise 当前已构建的环境，包括较早处理的指令和 `_.path` 条目。`cmd.exec` 会运行 Shell，因此应通过它的 `env` 选项传递参数值，而不要将参数拼接进命令字符串。若要让钩子也能访问已配置的工具，可添加 `tools = true`，使该指令在工具加入 `PATH` 后运行：

```toml [mise.toml]
[tools]
node = "24"

[env]
_.my-env-plugin = { tools = true }
```

`tools = true` 不会安装插件所运行的程序；请在 README 中列出这些程序。

### MiseEnv {#miseenv-hook}

返回由 `{ key = ..., value = ... }` 表组成的列表，或返回包含以下字段的表以控制缓存和脱敏：

| 字段          | 值                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `env`         | `{ key, value }` 表组成的列表；省略时不设置变量                                                   |
| `cacheable`   | `true` 表示允许 mise 缓存结果；默认值为 `false`。详见[缓存](#caching)                              |
| `watch_files` | 文件发生变化时会使缓存结果失效；相对路径以 `ctx.config_root` 为基准解析                           |
| `redact`      | `true` 表示将变量值标记为秘密信息并进行脱敏；默认值为 `false`。详见[脱敏](#redaction)               |

键和值都必须是字符串。不返回任何内容时不会设置变量。以下钩子会读取配置文件旁边的 JSON 文件，并允许 mise 缓存结果，直到该文件发生变化：

```lua [hooks/mise_env.lua]
function PLUGIN:MiseEnv(ctx)
    local file = require("file")
    local json = require("json")
    local path = file.join_path(ctx.config_root, ctx.options.config_file or "service.json")
    local config = json.decode(file.read(path))
    assert(type(config.api_url) == "string", "service.json must contain a string api_url")
    return {
        cacheable = true,
        watch_files = { path },
        env = { { key = "API_URL", value = config.api_url } },
    }
end
```

请从钩子返回变量。`env.setenv` 修改的是运行钩子的 mise 进程环境，而不是 mise 返回的环境。

### MisePath {#misepath-hook}

返回要加入 `PATH` 的目录列表，而不是完整的 `PATH` 字符串：

```lua [hooks/mise_path.lua]
function PLUGIN:MisePath(ctx)
    local file = require("file")
    if not ctx.options.bin_dir then
        return {}
    end
    local path = file.join_path(ctx.config_root, ctx.options.bin_dir)
    local info = file.stat(path)
    if not info or not info.is_dir then
        return {}
    end
    return { path }
end
```

只返回确实存在且此集成需要的目录。

## Options {#options}

用户通过指令表传入选项。空表表示不带任何选项运行插件：

```toml [mise.toml]
[env]
_.my-env-plugin = {}
```

调用钩子前，mise 会从表中移除 `tools` 和 `redact`，因此不要将它们用作自定义选项名称。插件也不要命名为 `path`、`file`、`source` 或 `python`：这些名称属于内置 `_.` 指令，不会传递给插件。`_.my-env-plugin = "value"` 这样的字符串会以字符串而非表的形式传给插件，因此文档中应说明表格式的写法。

## 缓存 <Badge type="warning" text="实验性" /> {#caching}

只有用户启用实验性 [`env_cache`](/configuration/settings.html#env_cache) 设置（`MISE_ENV_CACHE=1`）后才会缓存；默认关闭。之后，mise 会复用缓存结果，直到 [`env_cache_ttl`](/configuration/settings.html#env_cache_ttl) 到期、配置文件或插件发生变化，或 `watch_files` 中的文件发生变化。

mise 无法感知远程服务中的变化，因此只有当最多一个 TTL 之前的结果仍可接受时，才应返回 `cacheable = true`。无论 `cacheable` 的值如何，包含脱敏值的指令都不会被缓存。需要获取最新值的用户可以设置 `MISE_ENV_CACHE=0`。详见[环境缓存](/cache-behavior.html#environment-caching)。

## 脱敏 {#redaction}

值属于秘密信息时，请返回 `redact = true`。之后，mise 会在捕获的输出中将它们替换为 `[redacted]`，例如任务输出和 mise 自身的日志。用户指令中的 `redact` 键会覆盖插件的选择。程序仍会收到真实值，而 `mise env` 会有意显示这些值；详见[脱敏说明](/environments/secrets/#redaction)。

## 测试 {#testing-your-plugin}

请使用隔离的配置和数据目录进行测试，具体方式见[发布插件](/plugin-publishing.html#testing-before-publication)。测试内容应包括：

- 最简指令，以及插件支持的每个选项
- 从子目录运行 mise 时的文件和 `PATH` 解析
- 凭据缺失、HTTP 错误和格式错误的响应
- 如果插件会运行已配置的工具，测试 `tools = true` 的情况
- 如果钩子返回 `cacheable = true`，测试全新环境和缓存环境

运行 `MISE_DEBUG=1 mise env` 可查看钩子错误。输出可能包含秘密信息，因此不要直接粘贴到问题报告中。

## 常见问题 {#common-mistakes}

| 现象                                                                       | 原因和解决方法                                                                                                                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skipping env plugin my-env-plugin: it is not installed and has no source` | 插件尚未以指令指定的名称安装。请链接插件、使用 `mise plugins install my-env-plugin <git-url>` 安装，或在 `[plugins]` 下列出插件。                              |
| 钩子未运行                                                                 | [安全模式](/security.html#safe-mode)会跳过项目的 `[env]` 指令；环境缓存也可能导致钩子不运行。                                                                  |
| 钩子要运行的程序未找到                                                     | 请安装该程序；如果它是已配置的工具，请添加 `tools = true`。                                                                                                   |
| 从子目录运行时相对路径解析结果不同                                         | 请使用 `ctx.config_root` 拼接路径。                                                                                                                           |
| 服务变更后仍返回旧值                                                       | 结果已被缓存。请返回 `cacheable = false`，或告知用户设置 `MISE_ENV_CACHE=0`。                                                                                 |

请在 README 中注明插件所需的 mise 版本。`MiseEnv` 和 `MisePath` 是 mise 专属钩子，vfox CLI 不会运行它们；mise 也不会从 `metadata.lua` 中读取最低版本字段。

## 从工具插件迁移 {#migration-from-tool-plugins}

如果某个工具插件只用于设置环境变量，请将相关逻辑从 `EnvKeys` 移到 `MiseEnv`，从 `MisePath` 返回 `PATH` 条目，并移除版本和安装钩子。用户随后需要将 `[tools]` 条目改为 `[env]` 下的指令，请在文档中说明此变更。

发布插件请参阅[发布插件](/plugin-publishing.html)，并说明插件选项、所需凭据以及缓存和脱敏行为。
