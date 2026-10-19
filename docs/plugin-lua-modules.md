---
description: "查阅 mise 为插件钩子提供的全局对象、元数据字段、钩子文件和 Lua 模块。"
---

# 插件 Lua 参考

mise 会在嵌入式 Lua 5.1 解释器中运行所有 Lua 插件钩子（工具、后端、环境和软件包插件）。它提供全局变量、`metadata.lua` 字段、钩子文件，以及通过 `require` 加载的模块。

```lua
local http = require("http")
```

这些模块由 mise 实现；上游 vfox 中同名模块的行为可能不同。相较于调用 Shell 命令，优先使用 `http`、`file` 和 `archiver` 模块：`cmd.exec` 会运行 Shell 代码，因此引号处理方式及所需程序因平台而异。

## Globals

| 全局对象               | 说明                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLUGIN`               | `metadata.lua` 定义的表。钩子是该表上的方法，例如 `function PLUGIN:PreInstall(ctx)`。                                                                                                                          |
| `RUNTIME`              | 钩子所针对的平台。参见 [`RUNTIME`](#runtime)。                                                                                                                                                                 |
| `print(...)`           | 与 `log.info` 相同的函数。它会将日志行写入标准错误，而非标准输出。参见 [`print`](#print-override)。                                                                                                            |
| `os.execute(command)`  | 在[钩子环境](#hook-environment)中运行 Shell 代码并返回退出码。参见 [cmd](#command-module)。                                                                                                                   |
| `os.getenv(name)`      | 对于具有[钩子环境](#hook-environment)的钩子，读取该环境；其他钩子则读取 mise 进程的环境。                                                                                                                      |
| `OS_TYPE`、`ARCH_TYPE` | 操作系统和体系结构，与 `RUNTIME.osType` 和 `RUNTIME.archType` 的取值相同。运行 `mise lock` 时，它们与 `RUNTIME` 一样描述目标平台。建议使用 `RUNTIME`，它还提供 `envType`。                                     |

除未加载 `debug` 库，且 `require` 只会搜索插件目录（参见[加载自己的代码](#loading-your-own-code)）外，Lua 5.1 标准库的其他部分均按常规方式运行。`io.popen` 始终使用 mise 进程的环境，而非钩子环境，因此应改用 `cmd.exec` 运行命令。

### `RUNTIME` {#runtime}

| 字段                    | 值                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `RUNTIME.osType`        | `linux`、`darwin` 或 `windows`                                                                                              |
| `RUNTIME.archType`      | `amd64`、`arm64` 或其他体系结构名称，例如 `x86` 或 `riscv64`                                                                |
| `RUNTIME.envType`       | Linux 上的 `gnu` 或 `musl`，取自 [`libc`](/configuration/settings.html#libc) 设置或检测结果；其他系统上为 `nil`             |
| `RUNTIME.version`       | mise 实现的 vfox API 版本（`0.6.0`），并非 mise 版本                                                                        |
| `RUNTIME.pluginDirPath` | 插件的安装目录                                                                                                              |

```lua
local platform = {
    os = RUNTIME.osType,
    arch = RUNTIME.archType,
    libc = RUNTIME.envType,
}
```

当 [`mise lock`](/cli/lock.html) 记录其他平台时，会针对每个平台运行 `PreInstall`，并由 `RUNTIME` 描述相应平台，此时 `envType` 为 `nil`。请使用 `RUNTIME` 选择制品。在钩子中运行 `uname` 得到的是宿主机信息，可能会为正在锁定的平台选错下载文件。

### 加载自己的代码

`require` 会先在插件根目录中查找 `NAME.lua`，再依次查找 `hooks/` 和 `lib/`，因此 `require("util")` 会加载 `lib/util.lua`。请将共用辅助函数放在 `lib/` 中。

内置模块也可以使用其上游 vfox 名称加载：
`require("vfox.cmd")`、`require("vfox.env")`、`require("vfox.semver")`、
`require("vfox.strings")` 和 `require("vfox").log`。

### 钩子环境 {#hook-environment}

mise 会结合当前环境和项目的 `[env]` 值，为每个钩子构建环境。安装期间会加入工具的 `install_env` 值，以及插件[依赖项](/tool-plugin-development.html#depends)的 `PATH` 条目。安装、卸载和环境钩子还会将每个[工具选项](#tool-options)作为 `MISE_TOOL_OPTS__<KEY>` 变量加入环境；这些变量不会传递到用户的 Shell。`Available` 和 `BackendListVersions` 钩子不会收到这些变量。在工具和后端钩子中，mise 会从 `PATH` 中移除自己的 shims 目录，避免钩子通过 shim 调用其他工具。软件包管理器插件钩子会保留该目录；参见[软件包管理器插件](/package-plugin-development.html#mise-plugin-toml)。

`os.getenv`、`os.execute`、`cmd.exec` 和 `cmd.stream` 都使用此环境。通过 `cmd.exec` 或 `cmd.stream` 的 `env` 选项传入的值会与此环境合并，并覆盖其中同名的值。

`ParseLegacyFile`、`BackendListTools` 和 `BackendSearchTools` 不会获得钩子环境：在这些钩子中，`os.getenv` 和命令读取的是 mise 进程环境，包括通过 [`env.setenv`](#environment-module) 设置的值。

## metadata.lua {#metadata}

`metadata.lua` 位于插件根目录，并负责赋值给 `PLUGIN` 表：

```lua
PLUGIN = {
    name = "my-tool",
    version = "1.2.0",
    description = "Install Example Tool",
    homepage = "https://github.com/your-org/my-tool-plugin",
    license = "MIT",
    legacyFilenames = { ".my-tool-version" },
}
```

| 字段                                           | 必需     | mise 对该字段的处理                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                         | 是       | 成为 `PostInstall`、`EnvKeys` 和 `PreUninstall` 中 `ctx.sdkInfo` 的键。命令和日志行使用安装插件时采用的名称。                                                                                                                                                                            |
| `version`                                      | 是       | 除检查是否设置外不会使用。用户通过 Git ref 选择发行版本；参见[发布插件](/plugin-publishing.html#tag-a-release)。                                                                                                                                                                         |
| `description`、`author`、`license`、`homepage` | 否       | mise 不会处理；这些字段用于向文件读者介绍插件。                                                                                                                                                                                                                                           |
| `legacyFilenames`                              | 否       | 列出工具插件通过 `ParseLegacyFile` 读取的[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。mise 只会为列入 [`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 的工具读取这些文件。                               |
| `depends`                                      | 否       | 列出需要先于此工具安装、并加入其安装钩子 `PATH` 的工具。参见 [`PLUGIN.depends`](/tool-plugin-development.html#depends)。                                                                                                                                                                   |
| `systemDependencies`                           | 否       | 列出安装前由 mise 检查是否存在的系统程序和库。参见[系统依赖项](/tool-plugin-development.html#system-dependencies)。                                                                                                                                                                     |

缺少 `name` 或 `version` 时，mise 会报错并停止。每次加载插件时都会执行整个文件，因此其中只应包含赋值操作，不要运行命令或读取宿主机信息。

## 钩子文件

每个钩子都单独保存在 `hooks/` 目录下的文件中，文件名使用钩子名称的蛇形命名法，并在 `PLUGIN` 上定义对应方法：例如 `hooks/pre_install.lua` 定义 `PLUGIN:PreInstall`。加载插件时 mise 会执行每个钩子文件，因此文件顶层应只包含函数定义。

| 插件类型                                             | 必需的钩子文件                                                             | 可选的钩子文件                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [工具插件](/tool-plugin-development.html)           | `available.lua`、`pre_install.lua`、`env_keys.lua`                         | `post_install.lua`、`pre_uninstall.lua`、`parse_legacy_file.lua`、`mise_install_satisfied.lua` |
| [后端插件](/backend-plugin-development.html)         | `backend_list_versions.lua`、`backend_install.lua`、`backend_exec_env.lua` | `backend_uninstall.lua`、`backend_list_tools.lua`、`backend_search_tools.lua`                  |
| [环境插件](/env-plugin-development.html)             | `mise_env.lua`、`mise_path.lua` 或两者                                     | 无                                                                                             |
| [软件包管理器插件](/package-plugin-development.html) | `package_installed.lua`、`package_install.lua`                            | `package_upgrade.lua`、`package_uninstall.lua`                                                 |

mise 会根据这些文件判断插件类型。包含 `hooks/backend_install.lua` 的插件是后端插件；同时包含 `hooks/package_install.lua` 和 `hooks/package_installed.lua` 的插件是软件包管理器插件。其他包含 `metadata.lua` 的插件则是工具插件或环境插件。软件包管理器插件也可以在 `mise.plugin.toml` 文件中声明其功能。mise 不会调用上游 vfox 的 `PreUse` 钩子。

## 钩子中的工具选项 {#tool-options}

工具和后端钩子通过 `ctx.options` 读取 `mise.toml` 中对应工具项的选项。顶层布尔值和数字会以字符串形式传入：例如 `bundled = false` 会成为 `"false"`，而在 Lua 中该字符串仍为真值。关于接收这些选项的钩子、mise 保留的选项以及 `MISE_TOOL_OPTS__` 环境变量，参见[工具选项](/tool-plugin-development.html#tool-options)；后端钩子详见[后端插件](/backend-plugin-development.html#tool-options)。环境插件的 `MiseEnv` 和 `MisePath` 钩子收到的 `[env]` 指令选项会保留 TOML 类型；参见[环境插件](/env-plugin-development.html)。

## 模块索引

| 模块                           | 函数                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------- |
| [`http`](#http-module)         | `get`, `head`, `download_file`, `try_get`, `try_head`, `try_download_file`    |
| [`json`](#json-module)         | `encode`, `decode`                                                            |
| [`file`](#file-module)         | `read`, `exists`, `stat`, `list`, `glob`, `join_path`, `move`, `symlink`      |
| [`archiver`](#archiver-module) | `decompress`                                                                  |
| [`cmd`](#command-module)       | `exec`, `stream`                                                              |
| [`strings`](#strings-module)   | `split`, `join`, `trim`, `trim_space`, `has_prefix`, `has_suffix`, `contains` |
| [`semver`](#semver-module)     | `compare`, `parse`, `sort`, `sort_by`                                         |
| [`html`](#html-module)         | `parse`                                                                       |
| [`env`](#environment-module)   | `setenv`                                                                      |
| [`log`](#log-module)           | `trace`, `debug`, `info`, `warn`, `error`                                     |

## 错误处理

Lua 错误会终止钩子，mise 会将其报告为触发该钩子的操作（例如安装操作）失败。可使用 `error("message")` 抛出错误。

`pcall` 可以捕获 `json`、`file`、`archiver`、`cmd`、`strings` 和 `semver` 函数抛出的错误，但不适用于 `http` 函数：即使请求本身能够成功，直接在 `pcall` 中调用这些函数，或通过传给 `pcall` 的函数间接调用，也会报错 `attempt to yield across metamethod/C-call boundary`。如果请求可能失败且有备用方案，请调用 `http.try_get`、`http.try_head` 或 `http.try_download_file`；这些函数会返回错误，而不会抛出错误。

```lua
local json = require("json")

local ok, data = pcall(json.decode, body)
if not ok then
    error("unexpected response: " .. tostring(data))
end
```

## `http` {#http-module}

| 函数                                         | 返回值                                                | 失败时的行为                                                                     |
| -------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `http.get({ url, headers })`                 | `{ status_code, headers, body }`                      | 网络错误时抛出错误。任何 HTTP 状态码都会作为返回值，因此请检查 `status_code`。 |
| `http.head({ url, headers })`                | `{ status_code, headers }`，不含响应正文              | 与 `get` 相同                                                                    |
| `http.download_file({ url, headers }, path)` | 无返回值                                               | 网络错误或 HTTP 错误状态时抛出错误                                               |
| `http.try_get(...)`、`http.try_head(...)`    | `response, nil`，或网络错误时返回 `nil, message`      | 不会抛出错误                                                                     |
| `http.try_download_file(...)`                | `true, nil`，或 `nil, message`                        | 不会抛出错误                                                                     |

`headers` 为可选项。响应头名称均为小写，例如 `resp.headers["content-length"]`。如果 `path` 的上级目录不存在，`download_file` 会自动创建。

```lua
local http = require("http")
local json = require("json")

local resp = http.get({
    url = "https://api.github.com/repos/owner/repo/releases",
    headers = { ["Accept"] = "application/json" },
})
if resp.status_code ~= 200 then
    error("GET releases returned " .. resp.status_code)
end
local releases = json.decode(resp.body)

-- Raises on failure; use http.try_download_file to handle errors without stopping the hook.
http.download_file({
    url = "https://github.com/owner/repo/archive/v1.0.0.tar.gz",
}, "/path/to/download.tar.gz")

-- Fall back to a mirror when the primary host cannot be reached.
local index, err = http.try_get({ url = "https://primary.example.com/index.json" })
if err ~= nil then
    index, err = http.try_get({ url = "https://mirror.example.com/index.json" })
end
```

请求遇到暂时性故障（连接错误、超时，以及 HTTP 408、429 和 5xx 响应）时，最多会重试 `MISE_HTTP_RETRIES` 次，默认 3 次。插件的 HTTP 客户端只读取此环境变量，不会读取配置文件中的 [`http_retries`](/configuration/settings.html#http_retries) 值。请求会遵循 mise 的 [`url_replacements`](/url-replacements.html)，并为目标主机添加来自 [`netrc`](/configuration/settings.html#netrc) 的凭据。若请求发往 `api.github.com` 或 GitHub Enterprise Cloud 的 `api.*.ghe.com` 主机，且未设置 `Authorization` 请求头，mise 会添加其为 `github.com` 解析出的 [GitHub 令牌](/dev-tools/github-tokens.html)（即使目标是 `ghe.com` 主机），以及 `X-GitHub-Api-Version` 请求头。若某个 GitHub Enterprise Cloud 主机需要专属令牌，请自行设置 `Authorization`。因此，调用 `api.github.com` 的插件无需自行处理令牌，任何插件也都不需要实现重试循环。不要在 `github.com` 的发行版下载 URL 中附加 GitHub 令牌：GitHub 随后会将请求重定向到拒绝该请求的主机。

`download_file` 不会验证下载内容。在工具插件中，应由 `PreInstall` 返回 `sha256` 或 `sha512`，而不是自行下载；这样 mise 会负责下载、验证并解压文件。在 `BackendInstall` 中下载文件的后端插件必须自行检查摘要。Lua 模块没有哈希函数，因此请通过 `cmd.exec` 调用平台的校验和工具，例如 Linux 上的 `sha256sum` 或 macOS 上的 `shasum -a 256`。

## `json` {#json-module}

| 函数                 | 返回值      | 失败时的行为                                                              |
| -------------------- | ----------- | ------------------------------------------------------------------------- |
| `json.encode(value)` | JSON 字符串 | 值包含函数，或包含下文 `null` 哨兵值以外的 userdata 时抛出错误            |
| `json.decode(text)`  | Lua 值      | JSON 无效时抛出错误；可由 `pcall` 捕获                                     |

```lua
local json = require("json")

local text = json.encode({ name = "mise-plugin", tools = { "prettier", "eslint" } })
-- {"tools":["prettier","eslint"],"name":"mise-plugin"}; key order is not guaranteed

local data = json.decode(text)
print(data.tools[1]) -- prettier
```

JSON `null` 会解码为一个哨兵值，而不是 `nil`，且该哨兵值为真值。请显式与其比较；对该哨兵值编码会得到 `null`：

```lua
local NULL = json.decode("null")
local release = json.decode(resp.body)
if release.body == nil or release.body == NULL then
    -- the field is missing or null
end
```

空 Lua 表会编码为 `{}`，而不是 `[]`。

## `file` {#file-module}

| 函数                     | 返回值                                            | 失败时的行为                         |
| ------------------------ | ------------------------------------------------- | ------------------------------------ |
| `file.join_path(...)`    | 用宿主机的分隔符连接所有非空参数                  | 不会失败                             |
| `file.read(path)`        | 文件内容文本                                      | 文件不存在或不是 UTF-8 时抛出错误    |
| `file.exists(path)`      | `true` 或 `false`                                 | 无法检查路径时抛出错误               |
| `file.stat(path)`        | 下文所述的表；路径不存在时为 `nil`                | 其他错误时抛出错误                   |
| `file.list(dir)`         | 目录中直接子项的完整路径，按顺序排列              | 目录不存在时抛出错误                 |
| `file.glob(pattern)`     | 与模式匹配的路径，按顺序排列                      | 模式无效时抛出错误                   |
| `file.move(from, to)`    | 无返回值；移动文件或目录，并创建 `to` 的父目录    | 抛出错误                             |
| `file.symlink(src, dst)` | 无返回值；创建指向 `src` 的链接 `dst`             | 抛出错误                             |

相对路径会以 mise 的运行目录为基准解析，而不是以插件目录或安装目录为基准。请使用 `ctx` 中的绝对路径构造路径：

```lua
local file = require("file")

-- In BackendInstall. Tool plugin hooks call this path ctx.rootPath or ctx.path.
local install_path = ctx.install_path
local bin = file.join_path(install_path, "bin", "mytool")

local matches = file.glob(file.join_path(install_path, "bin", "mytool-*"))
if #matches == 1 then
    file.move(matches[1], bin)
end
if not file.exists(bin) then
    error("mytool was not installed to " .. bin)
end
```

`file.move` 会重命名路径，因此源和目标必须位于同一文件系统中。

`file.join_path` 不会规范化分隔符、解析 `..`、展开 `~`，也不会确保不可信路径安全。请在基准目录之后传入相对路径片段。在环境插件中，对于来自项目的路径，请使用 `ctx.config_root` 作为基准目录。

`file.stat` 检查的是链接本身，而不是链接目标。返回的表包含 `size`、`is_file`、`is_dir`、`is_symlink`，以及系统支持时提供的 Unix 时间戳 `modified`、`accessed` 和 `created`。在 Unix 上，`mode` 是八进制权限字符串，例如 `"644"`；其他系统上则为 `nil`。

## `archiver` {#archiver-module}

`archiver.decompress(archive, destination[, options])` 会解压归档文件。它根据文件名判断格式，支持 `.tar.gz`、`.tar.xz`、`.tar.bz2` 和 `.zip`。其他扩展名（包括 `.tgz`）都会导致错误。此函数不会下载或验证归档文件。

```lua
local archiver = require("archiver")

archiver.decompress("/path/to/tool.tar.gz", "/path/to/destination") -- raises on failure

-- Move the contents of the archive's top-level directory into the destination.
archiver.decompress("/path/to/node-v24.18.1-linux-x64.tar.gz", "/path/to/destination", {
    strip_components = 1,
})
```

与 mise 自身的归档解压行为相同，`strip_components = 1` 会保留归档根目录中的文件。该选项只接受 `0` 和 `1`。

## `cmd` {#command-module}

`cmd.exec` 会运行命令并返回其输出：

```lua
local cmd = require("cmd")
local log = require("log")

-- src_dir and install_path are directories your hook has worked out.

-- Returns stdout, including the trailing newline; raises with stderr on a non-zero exit.
local tag = cmd.exec("git describe --tags", { cwd = src_dir })

-- Catch the error when you have a fallback.
local ok, err = pcall(cmd.exec, "example --version")
if not ok then
    log.debug("example not available:", err)
end

-- Extra variables for this command only.
cmd.exec("make install", { cwd = src_dir, env = { PREFIX = install_path } })
```

命令是 Shell 代码，而不是参数列表。mise 会在[钩子环境](#hook-environment)中使用 [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 指定的 Shell 运行命令。插入 Shell 的任何值都应加引号：直接拼入命令的工具选项可能会执行非预期命令。

### 选项 {#available-options}

`cmd.exec` 和 `cmd.stream` 接受选项表。`os.execute` 不接受选项。

| 选项      | 类型   | 说明                                                                                                    |
| --------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `cwd`     | string | 命令的工作目录                                                                                          |
| `env`     | table  | 与[钩子环境](#hook-environment)合并的变量                                                                |
| `timeout` | number | 命令可运行的秒数，必须大于 0（允许小数）；超时后 mise 会终止命令并抛出错误                               |

### 输出、stdin 与终端

mise 会并行安装工具，因此运行命令的三种方式在终端共享方式上有所不同：

| 函数                           | 输出                                     | stdin                           | 返回值                                                    | 终端锁         |
| ------------------------------ | ---------------------------------------- | ------------------------------- | --------------------------------------------------------- | ------------- |
| `cmd.exec(command, options)`   | 捕获输出；成功时丢弃标准错误             | 除非设置 `raw`，否则为 `/dev/null` | 标准输出字符串；非零退出时会携带标准错误抛出异常          | 无            |
| `os.execute(command)`          | 写入终端                                 | 除非设置 `raw`，否则为 `/dev/null` | 退出码（成功时为 `0`）                                    | 共享          |
| `cmd.stream(command, options)` | 写入终端                                 | 连接到终端                       | 退出码                                                     | 独占          |

只有独占锁会让其他工作等待。`cmd.stream` 子进程（或通过 `--raw` 运行的命令）执行期间，mise 为其他安装启动的所有命令（例如核心工具的构建、asdf 插件脚本或其他插件中的 `os.execute`）都要等它退出；`cmd.stream` 还会暂停进度显示。`os.execute` 与 mise 自身命令一样使用共享锁，不会阻塞其他安装，但等待中的 `cmd.stream` 会等它结束。`cmd.exec` 不获取锁。

除非用户必须实时查看输出（使用 `os.execute`）或响应提示（使用 `cmd.stream`），否则请使用 `cmd.exec`。仅为了显示输出而使用流式方式并不合适：应通过 `print()` 或 `log.info()` 报告进度；mise 会在进度显示上方输出这些信息（参见 [`print`](#print-override)）。

<a id="hooks-and-stdin"></a>

### 钩子和 stdin

编写不会向用户提问的钩子。从工具选项、环境或锁文件中读取所需信息；如果子进程支持非交互标志，请传入 `--yes`、`--non-interactive` 或 `-n`。除非用户设置了 `raw`，否则在 `cmd.exec` 或 `os.execute` 中读取 stdin 的子进程会立即收到文件结束标志，不会挂起，也不会误读原本属于其他安装任务的输入。

如果钩子必须与用户交互，例如输入凭据或接受许可证，请使用 `cmd.stream`：

~~~lua
local cmd = require("cmd")

local code = cmd.stream("some-tool login")
if code ~= 0 then
    error("login failed with status " .. tostring(code))
end
~~~

子进程运行期间，其他安装会继续进行，但不能启动自己的命令，因此耗时较长的 `cmd.stream` 调用会阻塞它们。如果工具提供非交互方式，请优先使用。

[`raw`](/configuration/settings.html#raw) 设置（`mise install --raw`、`MISE_RAW=1`）会为每个子进程连接 stdin，并串行运行安装任务。这是供用户临时绕过限制的选项。若钩子只有在设置 `raw` 后才能正常工作，就会导致其他用户无法使用；请改用 `cmd.stream`。

### 超时

除非传入 `timeout`，否则命令会一直运行到退出。如果命令可能挂起，例如请求的网络服务可能不响应，请设置超时时间：

```lua
local cmd = require("cmd")

local ok, err = pcall(cmd.exec, "some-tool sync", { timeout = 30 })
if not ok then
    error("sync did not finish: " .. tostring(err))
end
```

超时后，mise 会终止命令，并抛出可由 `pcall` 捕获的错误；`cmd.exec` 会丢弃此前收集的输出。mise 只会终止它启动的 Shell，因此该 Shell 启动的后台进程仍会继续运行。如果工具自身提供超时标志，请优先使用。

### 环境钩子中的命令 {#environment-inheritance-in-env-module-hooks}

在环境插件的 `MiseEnv` 和 `MisePath` 钩子中，命令会使用 mise 当前已构建的环境运行；当指令设置了 `tools = true` 时，其中也会包含工具。参见[环境插件](/env-plugin-development.html)。

## `strings` {#strings-module}

| 函数                                                                         | 返回值                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `strings.split(s, sep)`                                                      | `s` 中每个 `sep` 之间的片段列表                |
| `strings.join(list, sep)`                                                    | 将 `list` 中的值转换为字符串，并用 `sep` 拼接  |
| `strings.trim(s, suffix)`                                                    | 删除 `s` 末尾所有重复的 `suffix`               |
| `strings.trim_space(s)`                                                      | 删除 `s` 开头和末尾的空白字符                  |
| `strings.has_prefix(s, prefix)`、`has_suffix(s, suffix)`、`contains(s, sub)` | `true` 或 `false`                              |

`strings.trim` 会将 `suffix` 视为字面字符串，而非字符集合，并且不会修改字符串开头。

```lua
local strings = require("strings")

strings.split("a,b,c", ",")            --> { "a", "b", "c" }
strings.join({ "a", "b", "c" }, " - ") --> "a - b - c"
strings.trim("hello worldworld", "world") --> "hello "
strings.trim_space("  1.2.3\n")         --> "1.2.3"
```

## `semver` {#semver-module}

`semver` 只比较版本字符串中的数字，忽略其他内容，因此 `1.0.0-beta` 等于 `1.0.0`，`v2` 等于 `2.0.0`。缺失的版本段按 `0` 处理，因此 `1.0.0-beta.1` 大于 `1.0.0`。这并非 SemVer 优先级规则。只有工具版本为普通点分数字时才使用它；其他情况应保留发布者提供的版本列表顺序。

| 函数                          | 返回值                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `semver.compare(a, b)`        | `-1`、`0` 或 `1`                                           |
| `semver.parse(v)`             | `v` 中的数字：`"v1.2.3-beta"` 会得到 `{ 1, 2, 3 }`          |
| `semver.sort(list)`           | 按升序排列版本字符串后得到的新列表                         |
| `semver.sort_by(list, field)` | 按 `field` 中的版本升序排列后得到的新表列表                |

```lua
local semver = require("semver")

semver.compare("1.2.3", "1.2.4")  --> -1
semver.compare("2.0.0", "1.9.9")  --> 1
semver.compare("9.6.9", "9.6.24") --> -1 (numeric, not string, comparison)
semver.sort({ "1.10.0", "1.2.0" }) --> { "1.2.0", "1.10.0" }
```

`Available` 必须按从新到旧的顺序返回版本，但 `sort` 和 `sort_by` 会按升序排序。请改用比较函数进行排序：

```lua
table.sort(versions, function(a, b)
    return semver.compare(a.version, b.version) > 0
end)
```

## `html` {#html-module}

`html.parse(text)` 会返回一个文档。`find` 接受 CSS 选择器，包括后代选择器和属性选择器，例如 `ul.downloads a[href$='.tar.gz']`。

| 方法                                       | 返回值                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `doc:find(selector)`、`sel:find(selector)` | 匹配元素的选择结果                                                                               |
| `sel:each(function(index, el) ... end)`    | 无返回值；为每个元素调用函数，索引从 0 开始                                                      |
| `sel:first()`、`sel:eq(n)`                 | 第一个元素或索引从 0 开始的位置 `n` 对应元素的选择结果                                           |
| `sel:text()`                               | 第一个元素的内部内容，可能包含标记；内容为空时返回 `""`                                         |
| `sel:attr(name)`                           | 第一个元素的属性；该元素没有属性时为 `nil`，选择结果为空时为 `""`                               |

`sel:find()` 只会在所选结果的第一个元素下搜索，因此 `doc:find("ul"):find("a")` 会漏掉第二个 `ul` 中的链接。若要搜索所有元素，请使用一个后代选择器，例如 `doc:find("ul a")`；或者在 `:each()` 中对每个元素调用 `:find()`。对空选择结果调用 `:find()` 会报错。

### 从下载页面收集链接

```lua
local http = require("http")
local html = require("html")

-- Lists versions linked from a page such as https://example.com/downloads/
-- whose links look like example-1.2.3.tar.gz.
local function list_versions(index_url)
    local resp = http.get({ url = index_url })
    if resp.status_code ~= 200 then
        error("GET " .. index_url .. " returned " .. resp.status_code)
    end
    local seen, versions = {}, {}
    html.parse(resp.body):find("a[href$='.tar.gz']"):each(function(_, a)
        local v = a:attr("href"):match("example%-(.+)%.tar%.gz$")
        if v and not seen[v] then
            seen[v] = true
            table.insert(versions, v)
        end
    end)
    return versions
end
```

如果发布者提供发行版 API 或 JSON 索引，请优先使用：HTML 布局可能变化，而且分页的发行版页面通常只列出较新的版本。

## `env` {#environment-module}

`env.setenv(key, value)` 会在 mise 进程中设置变量，但不会将其传递给用户的 Shell。在具有[钩子环境](#hook-environment)的钩子中，`os.getenv`、`os.execute` 和 `cmd` 函数都使用该钩子环境，因此看不到此变量。若要向用户提供变量，请从 `MiseEnv`、`EnvKeys` 或 `BackendExecEnv` 返回它。若只需向某条命令提供变量，请通过 `cmd.exec` 的 `env` 选项传入：

```lua
local cmd = require("cmd")

cmd.exec("make", { env = { CC = "clang" } })
```

若要向用户的 `PATH` 添加目录，请在 `MisePath` 中将每个目录作为独立条目返回，并使用 `file.join_path` 构造路径；也可以从 `EnvKeys` 或 `BackendExecEnv` 返回 `PATH` 键。mise 会使用宿主机对应的分隔符拼接这些路径，因此要兼容 Windows 的插件不要构造以冒号分隔的字符串。

## `log` {#log-module}

`log` 会将日志写入 mise 的标准错误输出，并在前面加上插件名称。默认显示 `info`、`warn` 和 `error` 级别；设置 `MISE_DEBUG=1` 后显示 `debug`，设置 `MISE_TRACE=1` 后显示 `trace`。[`MISE_LOG_LEVEL`](/configuration/environment-variables.html#mise-log-level) 可更改默认级别，而 `--quiet` 会隐藏低于 `error` 的所有日志。

```lua
local log = require("log")

log.debug("resolved download URL", url)
log.info("version", version, "installed to", path)
log.warn("no checksum published for", version)
```

这些函数可以接受任意数量的参数，会分别通过 `tostring` 转换，再以制表符连接。上面的 `log.info` 调用会输出：

```text
mise [my-plugin] version  1.0.0  installed to  /path/to/install
```

### `print` {#print-override}

`print()` 等同于 `log.info()`。它会将内容作为 `info` 级别日志写入标准错误，前缀为插件名称，并显示在进度信息上方；日志级别高于 `info` 时则会隐藏。可用它报告进度。

## 缓存

mise 会缓存版本列表和工具钩子返回的环境，因此钩子通常无需自行实现缓存；参见[缓存](/cache-behavior.html)。Lua 表只在单次 mise 命令期间有效。环境插件可以随变量一并返回缓存设置；参见[环境插件](/env-plugin-development.html)。

## 相关页面

- [Tool plugins](/tool-plugin-development.html)
- [Backend plugins](/backend-plugin-development.html)
- [Environment plugins](/env-plugin-development.html)
- [软件包管理器插件](/package-plugin-development.html)
- [Publishing plugins](/plugin-publishing.html)
