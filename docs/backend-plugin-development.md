---
description: "编写 Lua 插件，为一类工具提供独立安装路径，例如 acme:deploy。"
---

# 后端插件

后端插件是一组 Lua 钩子，用于通过同一个前缀安装多种工具。用户使用 `my-backend:some-tool` 格式，其中 `my-backend` 是安装插件时指定的名称。可以为内置[后端](/dev-tools/backends/)不支持的包注册表或制品服务器编写后端插件。

后端插件与[工具插件](/tool-plugin-development.html)类似，是放在 `hooks/` 目录中的 Lua 5.1 脚本，但有专属钩子。插件目录中含有 `hooks/backend_install.lua` 时，mise 会将其识别为后端插件。

## 快速开始 {#quick-start}

使用[后端插件模板](https://github.com/jdx/mise-backend-plugin-template)创建仓库，可以在 GitHub 上点击 **Use this template**，也可以使用 GitHub CLI：

```sh
gh repo create mise-acme --template jdx/mise-backend-plugin-template --public --clone
```

模板包含 LuaCATS 类型定义，可为编辑器提供补全；它还会通过 hk 运行 stylua、lua-language-server 和 actionlint。后端插件的目录结构如下：

```text
mise-acme/
├── metadata.lua                  # 名称和版本
├── hooks/
│   ├── backend_list_versions.lua # 必需
│   ├── backend_install.lua       # 必需
│   ├── backend_exec_env.lua      # 必需
│   ├── backend_uninstall.lua     # 可选
│   ├── backend_list_tools.lua    # 可选
│   └── backend_search_tools.lua  # 可选
└── lib/                          # 可选：供 require() 使用的模块
```

链接工作副本并试用一个工具：

```sh
mise plugins link acme ./mise-acme
mise ls-remote acme:deploy
mise use acme:deploy@2.1.0
mise exec -- deploy --version
```

前缀就是链接或安装插件时使用的名称。请避免与 `npm`、`github` 等内置后端重名。

## 完整示例 {#complete-example}

此插件从内部制品服务器安装工具。服务器在 `index.json` 中按从旧到新的顺序列出各工具的版本，并将每个发行版本的归档文件和 `SHA256SUMS` 文件放入以版本号命名的目录：

```text
https://artifacts.example.com/deploy/index.json
https://artifacts.example.com/deploy/2.1.0/deploy-2.1.0-linux-x64.tar.gz
https://artifacts.example.com/deploy/2.1.0/SHA256SUMS
```

`mirror` 工具选项可替换服务器 URL。

```lua [metadata.lua]
PLUGIN = {
    name = "acme",
    version = "0.1.0",
    description = "从 ACME 制品服务器安装工具",
}
```

```lua [lib/acme.lua]
local M = {}

function M.base_url(options)
    return options.mirror or "https://artifacts.example.com"
end

-- 服务器只提供 Linux 和 macOS 构建。
function M.asset_name(tool, version)
    local os_names = { darwin = "macos", linux = "linux" }
    local arch_names = { amd64 = "x64", arm64 = "arm64" }
    local os_name = os_names[RUNTIME.osType] or error("unsupported OS: " .. RUNTIME.osType)
    local arch = arch_names[RUNTIME.archType] or error("unsupported architecture: " .. RUNTIME.archType)
    return tool .. "-" .. version .. "-" .. os_name .. "-" .. arch .. ".tar.gz"
end

function M.find_checksum(body, filename)
    for line in body:gmatch("[^\r\n]+") do
        local digest, name = line:match("^(%x+)%s+%*?(.+)$")
        if name == filename and #digest == 64 then
            return digest
        end
    end
    error("no SHA-256 for " .. filename)
end

-- Lua 模块没有哈希函数，因此调用系统命令计算哈希值。
function M.sha256(path)
    local cmd = require("cmd")
    local command = RUNTIME.osType == "darwin" and 'shasum -a 256 "$FILE"' or 'sha256sum "$FILE"'
    return cmd.exec(command, { env = { FILE = path } }):match("^(%x+)")
end

return M
```

```lua [hooks/backend_list_versions.lua]
local http = require("http")
local json = require("json")
local acme = require("acme")

function PLUGIN:BackendListVersions(ctx)
    local url = acme.base_url(ctx.options) .. "/" .. ctx.tool .. "/index.json"
    local resp = http.get({ url = url })
    if resp.status_code == 404 then
        error("acme has no tool named " .. ctx.tool)
    elseif resp.status_code ~= 200 then
        error("fetching " .. url .. " failed: HTTP " .. resp.status_code)
    end
    -- index.json lists versions oldest first, the order mise expects
    return { versions = json.decode(resp.body).versions }
end
```

```lua [hooks/backend_install.lua]
local archiver = require("archiver")
local file = require("file")
local http = require("http")
local acme = require("acme")

function PLUGIN:BackendInstall(ctx)
    local dir = acme.base_url(ctx.options) .. "/" .. ctx.tool .. "/" .. ctx.version .. "/"
    local filename = acme.asset_name(ctx.tool, ctx.version)
    local archive = file.join_path(ctx.download_path, filename)

    local sums = http.get({ url = dir .. "SHA256SUMS" })
    if sums.status_code ~= 200 then
        error("fetching SHA256SUMS failed: HTTP " .. sums.status_code)
    end
    local expected = acme.find_checksum(sums.body, filename)

    http.download_file({ url = dir .. filename }, archive)
    if acme.sha256(archive) ~= expected then
        error("checksum mismatch for " .. filename)
    end

    archiver.decompress(archive, ctx.install_path, { strip_components = 1 })
    return {}
end
```

```lua [hooks/backend_exec_env.lua]
local file = require("file")

function PLUGIN:BackendExecEnv(ctx)
    return {
        env_vars = {
            { key = "PATH", value = file.join_path(ctx.install_path, "bin") },
        },
    }
end
```

配置工具及其镜像，然后安装：

```toml [mise.toml]
[tools]
"acme:deploy" = { version = "2.1.0", mirror = "https://artifacts.internal.example.com" }
```

```sh
mise install
mise exec -- deploy --version
```

`mise install` 会调用 `BackendListVersions` 解析 `2.1.0`，再调用 `BackendInstall` 下载、验证归档并将其解压到 `~/.local/share/mise/installs/acme-deploy/2.1.0`。之后，`BackendExecEnv` 会将其 `bin` 目录加入 `PATH`。mise 不会检查 `BackendInstall` 下载的内容，因此钩子需要在解压前自行验证校验和。

## 钩子 {#backend-methods}

| 钩子                   | 文件                               | 必需     | mise 调用时机                                                     |
| --------------------- | --------------------------------- | -------- | ---------------------------------------------------------------- |
| `BackendListVersions` | `hooks/backend_list_versions.lua` | 是       | 列出工具版本时（`mise ls-remote`、解析 `latest`）                  |
| `BackendInstall`      | `hooks/backend_install.lua`       | 是       | 安装工具版本时                                                    |
| `BackendExecEnv`      | `hooks/backend_exec_env.lua`      | 是       | 为已安装版本构建环境时                                            |
| `BackendUninstall`    | `hooks/backend_uninstall.lua`     | 否       | mise 移除已安装版本前                                             |
| `BackendListTools`    | `hooks/backend_list_tools.lua`    | 否       | 执行 `mise search`、shell 补全和 `mise use` 选择器时               |
| `BackendSearchTools`  | `hooks/backend_search_tools.lua`  | 否       | 带查询词执行 `mise search` 和 shell 补全时                         |

钩子可以通过 `error()` 抛出错误；mise 会停止运行并显示错误信息。钩子可以使用 [Lua 插件参考](/plugin-lua-modules.html)中的 `http`、`json`、`file`、`archiver`、`cmd` 等模块，以及用于描述平台的全局变量 [`RUNTIME`](/plugin-lua-modules.html#runtime)。

### BackendListVersions

| `ctx` 字段  | 含义                                                    | 示例                           |
| ----------- | ----------------------------------------------------- | ---------------------------- |
| `tool`      | 前缀后的工具名称                                         | `"deploy"`                   |
| `options`   | 工具选项，参见[工具选项](#tool-options)                  | `{ mirror = "https://..." }` |

返回 `{ versions = { ... } }`，其中是按照工具发行策略从旧到新排列的版本字符串。mise 会保留此顺序。版本不一定遵循 SemVer，也可以是日期、预发行版或通道名称。工具插件的 `Available` 钩子则相反，需要按从新到旧排列。

条目也可以是表格，例如 `{ version = "2.1.0", created_at = "2026-01-31T12:00:00Z" }`；同一个列表中可以混合字符串和表格。`created_at` 是 RFC 3339 格式的发布日期。mise 会将其用于[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 和 `--before`。没有日期或无法解析的版本会视为无日期版本，截止时间不会隐藏这类版本。只要注册表提供发布日期，就请返回该字段。

如果注册表包含会变动的名称（例如 GHCup 的 `recommended` GHC），请通过 `aliases` 返回名称到对应版本的映射表：

```lua
return {
  versions = { "9.8.4", "9.10.3", "9.14.1" },
  aliases = { recommended = "9.10.3" },
}
```

之后，mise 会将 `tool@recommended` 解析为 `9.10.3`，安装到 `9.10.3/` 并在锁文件中记录 `9.10.3`，因此名称指向的版本变动时，工具也会随之更新。配置中的别名优先级更高。以数字开头的版本请求，以及 `latest`、`system` 或包含 `:` 的请求，都不会作为别名查询。在支持 `aliases` 的版本发布之前，mise 会忽略此字段，因此插件可以立即返回它。

### BackendInstall

| `ctx` 字段      | 含义                                                    | 示例                                                           |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `tool`          | 工具名称                                               | `"deploy"`                                                   |
| `version`       | 要安装的解析后版本                                     | `"2.1.0"`                                                    |
| `install_path`  | 安装目标目录                                           | `"/home/user/.local/share/mise/installs/acme-deploy/2.1.0"`  |
| `download_path` | 下载文件的目录                                         | `"/home/user/.local/share/mise/downloads/acme-deploy/2.1.0"` |
| `options`       | 工具选项，参见[工具选项](#tool-options)                 | `{ mirror = "https://..." }`                                 |

请将版本安装到 `install_path` 并返回一个表，即使是空表也可以；不返回内容会导致安装失败。`http.download_file` 和 `archiver.decompress` 会创建写入所需的目录。

mise 不会验证 `BackendInstall` 下载的内容，也不会在 `mise.lock` 中记录后端插件工具的下载 URL 或校验和，并且此处不支持来源证明。请像完整示例一样，在解压前检查校验和。

### BackendExecEnv

| `ctx` 字段     | 含义                                                    | 示例                                                          |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `tool`         | 工具名称                                               | `"deploy"`                                                  |
| `version`      | 已安装的版本                                           | `"2.1.0"`                                                   |
| `install_path` | 安装目录                                               | `"/home/user/.local/share/mise/installs/acme-deploy/2.1.0"` |
| `options`      | 工具选项，参见[工具选项](#tool-options)                 | `{ mirror = "https://..." }`                                |

请返回 `{ env_vars = { { key = ..., value = ... }, ... } }`。即使没有要添加的内容，也必须实现此钩子并返回 `{ env_vars = {} }`。每个 `PATH` 目录都应单独作为一项返回；mise 会使用当前平台的路径分隔符拼接重复键。如果没有返回 `PATH` 项，mise 会将 `install_path` 下的 `bin` 加入其中。mise 会按版本和选项缓存结果，因此钩子应尽可能快速。

### BackendUninstall

| `ctx` 字段      | 含义                                         |
| --------------- | ------------------------------------------ |
| `tool`          | 工具名称                                     |
| `version`       | 已安装的版本                                 |
| `install_path`  | 仍然存在的安装目录                           |
| `download_path` | 下载目录                                     |
| `options`       | 当前配置中的工具选项                         |

如果清理工作无法通过删除安装目录完成（例如运行供应商提供的卸载程序，或移除在 `install_path` 外创建的条目），请使用此钩子：

```lua [hooks/backend_uninstall.lua]
function PLUGIN:BackendUninstall(ctx)
    -- 撤销在 ctx.install_path 之外所做的更改；目录中的文件此时仍可读取
end
```

mise 在移除已安装版本时都会调用此钩子，包括 `mise uninstall`、`mise upgrade`、`mise prune` 以及延迟清理旧版本。`--dry-run` 不会运行此钩子。如果钩子抛出错误，mise 会停止并保留安装目录，以便重试卸载。

`ctx.options` 来自当前配置。如果工具已不再配置（例如运行 `mise prune` 时），它只包含默认值。请在 `BackendInstall` 时将卸载程序需要的内容保存在 `install_path` 中，不要依赖 `ctx.options`。

### BackendListTools

由于尚未选择工具，`BackendListTools` 收到的 `ctx` 为空。返回此后端所管理的工具列表：

```lua [hooks/backend_list_tools.lua]
function PLUGIN:BackendListTools(ctx)
    return {
        tools = {
            { name = "deploy", description = "部署服务" },
            { name = "lint", description = "检查配置文件" },
        },
    }
end
```

`name` 是必需字段，`description` 是可选字段。mise 会在每个名称前加上插件的安装名称，并在 [`mise search`](/cli/search.html)、shell 补全和交互式 `mise use` 选择器中显示生成的 `acme:deploy` 标识符。请返回简短且有限的目录；包管理器后端不应列出整个生态系统。mise 会按 [`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 的时长缓存结果，刷新失败时会使用过期结果。

### BackendSearchTools

| `ctx` 字段  | 含义                                       | 示例     |
| ----------- | ---------------------------------------- | ------- |
| `query`     | 去除前缀后要搜索的文本                       | `"dep"` |

返回与 `BackendListTools` 相同的结构。`mise search` 或 shell 补全带有非空查询词时，mise 会调用此钩子，因此后端无需列出全部工具，也能搜索庞大或经常变化的目录。`mise search acme:dep` 会传入 `dep`。插件可以实现此钩子、`BackendListTools` 或两者，例如同时提供精简的精选工具列表和注册表搜索。mise 会单独缓存每个查询的结果。

## 工具选项 {#tool-options}

除 `BackendListTools` 和 `BackendSearchTools` 外，所有钩子都可通过 `ctx.options` 获取 `mise.toml` 中工具条目的选项，例如 `"acme:deploy" = { version = "2.1.0", verify = false }`。后端插件接收选项的方式与工具插件相同，因此 `verify = false` 会作为字符串 `"false"` 传入，而该字符串在 Lua 中为真值。有关转换规则、mise 保留的选项以及 `MISE_TOOL_OPTS__` 环境变量，参见[工具选项](/tool-plugin-development.html#tool-options)。

## metadata.lua {#metadata-lua}

`metadata.lua` 会设置全局 `PLUGIN` 表，其中至少需要包含 `name` 和 `version`；Lua 参考文档列出了[所有字段](/plugin-lua-modules.html#metadata)。如果后端插件安装时需要其他工具（例如基于 npm 的后端需要 `node`），请将其列在 `depends` 中：

```lua [metadata.lua]
PLUGIN = {
    name = "my-npm",
    version = "0.1.0",
    depends = { "node" },
}
```

如果用户配置了 `node`，mise 会先于此插件管理的工具安装它，并将其加入钩子所运行命令的 `PATH`；详见 [depends](/tool-plugin-development.html#depends)。

## 测试 {#testing-your-plugin}

```sh
mise plugins link acme ./mise-acme
mise ls-remote acme:deploy
mise use acme:deploy@2.1.0
mise exec -- deploy --version
```

通过调试输出运行失败的命令，可以查看钩子的错误和输出；如果缓存的版本列表或环境导致钩子修改未生效，请清除该工具的缓存：

```sh
MISE_DEBUG=1 mise install acme:deploy@2.1.0
mise cache clear acme:deploy
```

请在所有支持的平台上测试，包括路径中带空格的情况。模板中的 `mise run test` 任务会执行相同检查。隔离测试环境的设置方法参见[发布插件](/plugin-publishing.html#testing-before-publication)。

## 常见错误 {#common-mistakes}

- 辅助函数返回了两个值。`gsub` 会同时返回新字符串和替换次数，因此 `return s:gsub("^v", "")` 会导致 `table.insert(versions, normalize(tag))` 报错 `bad argument #2 to 'insert'`。请用括号包住调用：

  ```lua
  local function normalize(tag)
      return (tag:gsub("^v", "")) -- 加括号会丢弃 gsub 返回的替换次数
  end
  ```

- 擅自删去发布方未注明为前缀的内容。版本其余部分应视为不透明字符串，不要用 SemVer 解析器排序。
- 在 `cmd.exec` 输出中搜索 `error` 一词。命令以非零状态退出时，`cmd.exec` 会将命令的 stderr 作为错误抛出。
- 根据工具名称、版本或选项拼接 shell 命令。应像完整示例一样，通过 `cmd.exec` 的 `env` 选项传递并引用这些值。
- 调用 `mv`、`mkdir` 或 `cp` 等外部命令。移动文件应使用 `file.move`。`file.move`、`http.download_file` 和 `archiver.decompress` 会自动创建写入目录，因此大多数插件不需要 `mkdir`。file 模块没有复制或创建目录的函数；若要调用外部命令完成这些操作，请引用所有路径，并注意 Windows 上的命令有所不同。
- 使用 `..` 和 `"/"` 拼接路径。请使用 `file.join_path`。
- 期望 Lua 表格能在不同命令间缓存数据。每次 mise 命令都会启动新的 Lua 运行时；mise 会自行缓存版本列表和环境。详见[缓存行为](/cache-behavior.html)及 [Lua 参考](/plugin-lua-modules.html#caching)。

发布插件的方法参见[发布插件](/plugin-publishing.html)。另一个实际后端插件示例是 [vfox-npm](https://github.com/jdx/vfox-npm)，它使用 `PATH` 中的 `npm` 安装 npm 包。
