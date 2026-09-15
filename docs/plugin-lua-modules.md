---
description: "mise's embedded Lua 5.1 runtime provides modules for plugin hooks, including backend, tool, environment, and package plugins."
---

# Plugin Lua Modules

mise's embedded Lua 5.1 runtime provides modules for plugin hooks, including backend, tool,
environment, and package plugins. This reference describes mise's implementations; upstream
vfox may differ. Load modules with `require` and use `RUNTIME` for the target platform.

Use direct HTTP and file operations when possible. `cmd.exec` runs a shell, so command
quoting and external prerequisites still depend on the selected platform.

## 可用模块

### 核心模块

- **`cmd`** - Execute shell commands
- **`json`** - Parse and generate JSON
- **`http`** - Make HTTP requests and downloads
- **`file`** - File system operations
- **`env`** - Environment variable operations
- **`strings`** - String manipulation utilities
- **`semver`** - Numeric-component comparison and sorting (not full SemVer precedence)
- **`html`** - HTML parsing and manipulation
- **`archiver`** - Archive extraction
- **`log`** - Structured logging

## HTTP 模块

The HTTP module makes web requests and downloads files. `get` and `head` return a response
or raise on a transport failure; a non-2xx HTTP response is still a response, so check
`status_code`. `download_file` raises on transport and HTTP error status and returns no
value on success. Use the non-raising `try_*` variants for fallback logic.

### 基本 HTTP 请求

```lua
local http = require("http")

-- GET request
local resp = http.get({
    url = "https://api.github.com/repos/owner/repo/releases",
    headers = {
        ['User-Agent'] = "mise-plugin",
        ['Accept'] = "application/json"
    }
})


if resp.status_code ~= 200 then
    error("HTTP 错误: " .. resp.status_code)
end

local body = resp.body
```

### HEAD 请求

```lua
local http = require("http")

-- HEAD request to check file info
local resp = http.head({
    url = "https://example.com/file.tar.gz"
})


local content_length = resp.headers['content-length']
local content_type = resp.headers['content-type']
```

### 文件下载

```lua
local http = require("http")

-- 下载文件
local err = http.download_file({
    url = "https://github.com/owner/repo/archive/v1.0.0.tar.gz",
    headers = {
        ['User-Agent'] = "mise-plugin"
    }
}, "/path/to/download.tar.gz")

if err ~= nil then
    error("下载失败: " .. err)
end
```

### 不抛出错误的变体（`try_*`）

标准的 `http.get`、`http.head` 和 `http.download_file` 方法在传输失败（超时、DNS 错误、连接被拒绝等）时会抛出 Lua 错误。由于在此环境中 `pcall()` 无法捕获异步函数的错误，因此提供了不抛出错误的变体：

```lua
local http = require("http")

-- try_get: 成功时返回 (resp, nil)，失败时返回 (nil, err_string)
local resp, err = http.try_get({
    url = "https://primary.example.com/index"
})
if err ~= nil then
    -- 回退到另一个来源
    resp, err = http.try_get({ url = "https://fallback.example.com/index" })
end

-- try_head: 返回值约定与 try_get 相同
local resp, err = http.try_head({ url = "https://example.com/file.tar.gz" })

-- try_download_file: 成功时返回 (true, nil)，失败时返回 (nil, err_string)
local ok, err = http.try_download_file({
    url = "https://example.com/archive.tar.gz"
}, "/path/to/download.tar.gz")
if err ~= nil then
    error("下载失败: " .. err)
end
```

### 响应对象

HTTP 响应包含以下字段：

```lua
{
    status_code = 200,
    headers = {
        ['content-type'] = "application/json",
        ['content-length'] = "1234"
    },
    body = "response content"
}
```

## JSON 模块

The JSON module encodes and decodes JSON.

### 基本用法

```lua
local json = require("json")

-- 将 table 编码为 JSON 字符串
local obj = {
    name = "mise-plugin",
    version = "1.0.0",
    tools = {"prettier", "eslint"}
}
local jsonStr = json.encode(obj)
-- 结果：'{"name":"mise-plugin","version":"1.0.0","tools":["prettier","eslint"]}'

-- 将 JSON 字符串解码为 table
local decoded = json.decode(jsonStr)
print(decoded.name)  -- "mise-plugin"
print(decoded.tools[1])  -- "prettier"
```

### 错误处理（Lua）

```lua
local json = require("json")

-- 安全解析 JSON
local success, result = pcall(json.decode, response_body)
if not success then
    error("解析 JSON 失败: " .. result)
end

-- 使用解析后的数据
for _, item in ipairs(result) do
    print(item.version)
end
```

## 字符串模块

The strings module provides string manipulation utilities.

### 字符串操作

```lua
local strings = require("strings")

-- 将字符串拆分成多个部分
local parts = strings.split("hello,world,test", ",")
print(parts[1])  -- "hello"
print(parts[2])  -- "world"
print(parts[3])  -- "test"

-- 连接字符串
local joined = strings.join({"hello", "world", "test"}, " - ")
print(joined)  -- "hello - world - test"

-- 去除空白字符
local trimmed = strings.trim_space("  hello world  ")
print(trimmed)  -- "hello world"
```

### 字符串检查

```lua
local strings = require("strings")

-- 检查前缀和后缀
local text = "hello world"
print(strings.has_prefix(text, "hello"))  -- true
print(strings.has_suffix(text, "world"))  -- true
print(strings.contains(text, "lo wo"))    -- true

-- Remove repeated exact suffixes (not a character set)
local trimmed = strings.trim("hello world", "world")
print(trimmed)  -- "hello "
```

### 版本字符串工具

Use Lua patterns to remove a known publisher prefix. The module has no `trim_prefix`
function, and stripping a prerelease suffix would change the requested version:

```lua
local function normalize_version(version)
    return (version:gsub("^v", ""))
end
local version = normalize_version("v1.2.3-beta.1") -- "1.2.3-beta.1"
```

## Semver 模块

Despite its name, this module compares **numeric components extracted from strings**, not
full Semantic Versioning precedence. It ignores non-digit text and treats missing numeric
components as zero. For example, `1.0.0-beta` compares equal to `1.0.0`, and `1.0.0-beta.1`
compares greater. Do not use it to choose the newest arbitrary tool version or order channels.

Use it only when a tool's documented version scheme matches this numeric comparison.
Otherwise preserve the publisher's order or implement that tool's actual policy.

### 版本比较

```lua
local semver = require("semver")

-- 比较两个版本
-- 返回：如果 v1 < v2 则为 -1，相等为 0，如果 v1 > v2 则为 1
local result = semver.compare("1.2.3", "1.2.4")  -- -1
local result = semver.compare("2.0.0", "1.9.9")  -- 1
local result = semver.compare("1.0.0", "1.0.0")  -- 0

-- 正确处理数字比较
local result = semver.compare("9.6.9", "9.6.24")   -- -1（不是按字典序！）
local result = semver.compare("10.0.0", "9.6.24") -- 1
```

### 解析版本

```lua
local semver = require("semver")

-- 将版本字符串解析为数字部分
local parts = semver.parse("1.2.3")
print(parts[1])  -- 1
print(parts[2])  -- 2
print(parts[3])  -- 3

-- Non-digit text is discarded; this is not a SemVer parser
local parts = semver.parse("v1.2.3-beta")  -- {1, 2, 3}
```

### 对版本字符串排序

```lua
local semver = require("semver")

-- 对版本字符串数组排序（升序）
local versions = {"1.10.0", "1.2.0", "1.9.0", "2.0.0"}
local sorted = semver.sort(versions)
-- 结果：{"1.2.0", "1.9.0", "1.10.0", "2.0.0"}
```

### 按版本字段对表排序

```lua
local semver = require("semver")

-- 按某个版本字段对表数组排序（升序）
local releases = {
    {version = "1.10.0", url = "..."},
    {version = "1.2.0", url = "..."},
    {version = "1.9.0", url = "..."},
}
local sorted = semver.sort_by(releases, "version")
-- 结果：按版本升序排序
```

### 真实示例：Available 钩子

This sketch applies only to releases made of three numeric components, with no prereleases
or channels. Prefer a structured release API over scraping text when one is available.

```lua
local http = require("http")
local semver = require("semver")

function PLUGIN:Available(ctx)
    local resp = http.get({
        url = "https://example.com/releases/"
    })


    assert(resp.status_code == 200, "Release request failed")
    local result = {}
    -- 从响应中解析版本...
    for version in string.gmatch(resp.body, 'v([0-9]+%.[0-9]+%.[0-9]+)') do
        table.insert(result, {version = version})
    end

    -- Available() must return newest-first. semver.sort_by() sorts ascending,
    -- so reverse that result before returning it.
    local sorted = semver.sort_by(result, "version")
    local newest_first = {}
    for i = #sorted, 1, -1 do
        table.insert(newest_first, sorted[i])
    end
    return newest_first
end
```

### 在自定义排序中使用 Compare

```lua
local semver = require("semver")

-- 使用自定义比较器排序（降序 - 最新的在前）
table.sort(versions, function(a, b)
    return semver.compare(a.version, b.version) > 0
end)

-- Sort ascending (oldest first); reverse this before returning from Available()
table.sort(versions, function(a, b)
    return semver.compare(a.version, b.version) < 0
end)
```

## HTML 模块

The HTML module returns selection objects, not Lua arrays. Use `:each(function(index,
node) ... end)` to iterate a selection, `:first()` for its first element, and `:eq(0)` for
its zero-based first position. `:text()` reads the first selected node's inner content
(which can include markup); `:attr(name)` reads its attribute.

### 基础 HTML 解析

```lua
local html = require("html")

-- 解析 HTML 文档
local doc = html.parse([[
    <html>
        <body>
            <div id="version" class="info">1.2.3</div>
            <ul class="downloads">
                <li><a href="/download/v1.2.3.tar.gz">源代码</a></li>
                <li><a href="/download/v1.2.3.zip">Windows</a></li>
            </ul>
        </body>
    </html>
]])

-- 提取文本内容
local version = doc:find("#version"):text()  -- "1.2.3"

-- 提取属性
local links = doc:find("a")
links:each(function(index, link)
    local href = link:attr("href")
    print(index, link:text(), href)
end)
```

### CSS 选择器

```lua
local html = require("html")

local doc = html.parse(html_content)

-- 按 ID 查找
local element = doc:find("#version")

-- 按类查找
local elements = doc:find(".download-link")

-- 按标签查找
local links = doc:find("a")

-- 复杂选择器
local specific_links = doc:find("ul.downloads a[href$='.tar.gz']")
```

### 实际示例：抓取发布信息

This illustrates selection traversal. Website HTML and duplicate links can change; prefer
a release API when available and deduplicate identifiers before returning a hook result.

```lua
local html = require("html")
local http = require("http")

function get_github_releases(owner, repo)
    local resp = http.get({
        url = "https://github.com/" .. owner .. "/" .. repo .. "/releases"
    })


    assert(resp.status_code == 200, "Release page request failed")
    local doc = html.parse(resp.body)
    local releases = {}

    -- 查找所有发布标签
    local release_elements = doc:find("a[href*='/releases/tag/']")
    release_elements:each(function(index, element)
        local href = element:attr("href")
        local version = href:match("/releases/tag/(.+)")
        if version then
            table.insert(releases, {
                version = version,
                url = "https://github.com" .. href
            })
        end
    end)

    return releases
end
```

## 归档模块

The archiver module extracts archives based on their filename suffix. It does not download
or authenticate the archive; verify the artifact before extracting it.

### 支持的格式

- **tar.gz** - Gzip 压缩的 tar 归档文件
- **tar.xz** - XZ 压缩的 tar 归档文件
- **tar.bz2** - Bzip2 压缩的 tar 归档文件
- **zip** - ZIP 归档文件

### 基本解压

```lua
local archiver = require("archiver")

-- 将归档文件解压到目录
archiver.decompress("archive.tar.gz", "extracted/")

-- Failures raise Lua errors and stop the hook.
archiver.decompress("package.zip", "destination/")
```

To flatten versioned directories at the root of an archive, pass
`strip_components = 1`. Files already at the archive root are retained, matching
mise's built-in archive backends. Only `0` and `1` are supported; higher values raise an error.

```lua
archiver.decompress("node-v24.18.1-linux-x64.tar.gz", "destination/", {
    strip_components = 1,
})
```

### 实际示例：插件安装

```lua
local archiver = require("archiver")
local http = require("http")

function install_from_archive(download_url, install_path)
    -- 下载归档文件
    local archive_path = install_path .. "/download.tar.gz"
    http.download_file({
        url = download_url
    }, archive_path)

    -- 解压到安装目录
    archiver.decompress(archive_path, install_path)

    -- 清理归档文件
    os.remove(archive_path)
end
```

## 文件模块

文件模块提供文件系统操作。

### 路径拼接

```lua
local file = require("file")

-- 使用操作系统特定的分隔符拼接路径段
local full_path = file.join_path("/foo", "bar", "baz.txt")
print(full_path)  -- On Unix: /foo/bar/baz.txt
```

`file.join_path` joins nonempty segments with the host path separator. It does not normalize
existing separators, resolve `..`, expand `~`, or make an untrusted path safe. Pass relative
segments after the base directory. For environment plugins, use `ctx.config_root` as the
base for project-relative options.

### 读取文件内容

```lua
local file = require("file")
print(file.read("/path/to/file"))
```

`file.read` returns UTF-8 text or raises an error; it does not return `nil` for a missing file.

### Create Symbolic Links

```lua
local file = require("file")
file.symlink("/path/to/source", "/path/to/new-symlink")
```

### 检查文件是否存在

```lua
local file = require("file")
if file.exists("important_file.txt") then
    print("文件存在")
else
    print("文件不存在")
end
```

### 列出和匹配文件

```lua
local file = require("file")

-- 立即返回的条目，按排序顺序排列
local entries = file.list("/path/to/directory")

-- 匹配 glob 的路径，按排序顺序排列
local executables = file.glob(file.join_path("/path/to/bin", "mytool-*"))
```

### 移动文件和目录

`file.move` 可以移动文件或整个目录。目标路径的父目录会自动创建。

```lua
local file = require("file")
file.move(
    file.join_path("/path/to/bin", "mytool-linux-amd64"),
    file.join_path("/path/to/bin", "mytool")
)
```

### File Metadata

`file.stat(path)` returns `nil` when the path is missing. Otherwise it returns `size`,
`is_file`, `is_dir`, `is_symlink`, and available `modified`, `accessed`, and `created` Unix
timestamps. It inspects the link itself. `mode` is an octal permission string on Unix and
`nil` on other platforms.

## Environment Module

`env.setenv` changes the mise process environment. It does not return a variable to the
user's shell, and it does not update an already-constructed hook environment. Prefer
returning values from `MiseEnv`, `EnvKeys`, or `BackendExecEnv`. For one child command, use
`cmd.exec(..., {env = {...}})` to avoid process-wide mutations.

### 设置环境变量

```lua
local env = require("env")

-- 设置环境变量
env.setenv("MY_VAR", "my_value")
```

### 获取环境变量

> 要在 Lua 中读取变量，请使用 `os.getenv("MY_VAR")`。

### 路径操作

Return separate PATH entries from an environment hook. Use `file.join_path` to construct
paths and let mise merge them using the host's PATH separator. Do not prepend a Unix
colon-separated string to PATH in code that also runs on Windows.

## 命令模块

`cmd.exec` runs a command through mise's configured default inline shell. It returns stdout
on success and raises an error containing stderr on failure. Successful stderr is not part
of the returned string. `pcall(cmd.exec, ...)` can intercept the error.

The string is shell code, not an argument array. Use `cwd` for the working directory and
quote external values for that shell; interpolating tool options into shell text can execute
unintended commands. `os.execute` streams output and returns the exit status using Lua 5.1
conventions (`0` for success), with the same mise-constructed environment.

### 基本命令执行

```lua
local cmd = require("cmd")

-- 执行命令并获取输出
local output = cmd.exec("ls -la")
print("目录列表：", output)

-- 执行命令并进行错误处理
local success, output = pcall(cmd.exec, "some-command")
if not success then
    error("命令执行失败: " .. output)
end
```

### 带选项的命令执行

```lua
local cmd = require("cmd")

-- 在指定目录中执行命令
local output = cmd.exec("pwd", {cwd = "/tmp"})
print("当前目录：", output)

-- 使用自定义环境变量执行命令
local result = cmd.exec("echo $TEST_VAR", {
    cwd = "/path/to/project",
    env = {TEST_VAR = "hello", NODE_ENV = "production"}
})

-- 在指定目录中安装包
local result = cmd.exec("npm install package-name", {cwd = "/path/to/project"})
```

### 可用选项

选项表支持以下键：

- **`cwd`** (string): Set the working directory for the command
- **`env`** (table): Set environment variables for the command. These are merged on top of the inherited environment (see below).
- **`timeout`**: Currently ignored. Do not rely on it to terminate a command.

### Env 模块钩子中的环境继承

当从环境模块钩子（`MiseEnv`、`MisePath`）调用 `cmd.exec()` 时，命令会自动继承 mise 构造的环境，而不是进程环境。这包括前置指令设置的环境变量，以及到目前为止累积的 `_.path` 条目。

When the module directive has `tools = true`, the inherited environment also includes the bin paths of installed tools, so mise-managed tools can be called directly:

```toml
[env]
_.my-plugin = { tools = true }
```

```lua
function PLUGIN:MiseEnv(ctx)
    local cmd = require("cmd")
    -- With tools=true, mise-managed tools are on PATH
    local version = cmd.exec("node --version")
    return {
        {key = "NODE_VERSION", value = version:gsub("%s+", "")}
    }
end
```

如果没有 `tools = true`，则只有 `_.path` 指令条目和原始系统 PATH 可供 `cmd.exec()` 使用。

传递给 `cmd.exec()` 的任何显式 `env` 选项都会与继承的环境合并，从而允许进行选择性覆盖。

### 平台相关命令

```lua
local cmd = require("cmd")

-- 跨平台命令执行
local function is_windows()
    return package.config:sub(1,1) == '\\'
end

local function get_os_info()
    if is_windows() then
        return cmd.exec("systeminfo")
    else
        return cmd.exec("uname -a")
    end
end

local os_info = get_os_info()
print("操作系统信息：", os_info)
```

## 实用示例

### 从 API 获取版本

This helper collects version identifiers. An unordered JSON object does not establish
oldest/newest order, and lexicographic sorting misorders `1.10.0` and `1.2.0`.

```lua
local http = require("http")
local json = require("json")

function fetch_npm_versions(package_name)
    local resp = http.get({
        url = "https://registry.npmjs.org/" .. package_name,
        headers = {
            ['User-Agent'] = "mise-plugin"
        }
    })


    assert(resp.status_code == 200, "Package metadata request failed")
    local package_info = json.decode(resp.body)
    local versions = {}

    for version, _ in pairs(package_info.versions) do
        table.insert(versions, version)
    end

    -- The JSON object has no release order. Return the collected identifiers;
    -- callers must apply npm's actual release policy before using this as a hook.
    return versions
end
```

### Download and Verification {#file-download-with-progress}

`http.download_file` downloads bytes; checking that the destination exists is not checksum
verification. A tool plugin should return the trusted digest in `PreInstall.sha256` or
`PreInstall.sha512` so mise verifies before extraction. A backend plugin performing its own
download must implement verification explicitly. Do not accept an `expected_sha256` argument
and then ignore it.

### 配置文件解析

```lua
local file = require("file")
local json = require("json")
local strings = require("strings")

function parse_config_file(config_path)
    if not file.exists(config_path) then
        return {}  -- 返回空配置
    end

    local content = file.read(config_path)
        -- Trim whitespace
    content = strings.trim_space(content)

    -- 解析 JSON
    local success, config = pcall(json.decode, content)
    if not success then
        error("配置文件中的 JSON 无效: " .. config_path)
    end

    return config
end
```

### 用于版本的网页抓取

```lua
local http = require("http")
local html = require("html")
local strings = require("strings")

function scrape_versions_from_releases(base_url)
    local resp = http.get({
        url = base_url .. "/releases"
    })


    assert(resp.status_code == 200, "Release page request failed")
    local doc = html.parse(resp.body)
    local versions = {}

    -- 查找版本标签
    local version_elements = doc:find("h2 a[href*='/releases/tag/']")
    version_elements:each(function(index, element)
        local version_text = element:text()
        local version = strings.trim_space(version_text)

        -- Remove 'v' prefix if present
        version = version:gsub("^v", "")

        if version and version ~= "" then
            table.insert(versions, {
                version = version,
                url = base_url .. element:attr("href")
            })
        end
    end)

    return versions
end
```

## 日志模块

The log module provides structured logging that routes through Rust's `log` crate and respects the `MISE_DEBUG` and `MISE_TRACE` environment variables.

### 日志级别

```lua
local log = require("log")

log.trace("详细跟踪信息")   -- 仅在 MISE_TRACE=1 时可见
log.debug("调试信息")          -- 仅在 MISE_DEBUG=1 时可见
log.info("状态消息")           -- 默认可见
log.warn("警告消息")           -- 默认可见
log.error("错误消息")          -- 默认可见
```

### 可变参数

所有日志函数都接受任意类型的多个参数。参数会通过 `tostring()` 转换为字符串，并使用制表符（`\t`）连接，这与 Lua 的 `print()` 行为一致：

```lua
log.info("版本", version, "安装到", path)
-- 输出: [plugin-name] version<TAB>1.0.0<TAB>installed to<TAB>/path
```

### 插件名后缀

所有日志消息都会自动添加 `[plugin_name]` 前缀：

```
mise [INFO] [my-plugin] Installing version 1.0.0
```

### print 覆盖

`print()` 会被重写为通过 `info!()` 级别日志进行路由。这意味着：

- `print()` 输出到 stderr，而不是 stdout
- 消息会带有 `[plugin_name]` 前缀
- 输出遵循日志级别过滤

```lua
-- 下面两者等价：
print("hello", "world")
log.info("hello", "world")
```

### 通过 vfox 命名空间访问

日志模块也可以通过 `vfox.log` 使用：

```lua
local log = require("vfox").log
log.info("消息")
```

## 最佳实践

### 错误处理

始终优雅地处理错误：

```lua
local http = require("http")
local json = require("json")

function safe_api_call(url)
    local resp = http.get({url = url})


    if resp.status_code ~= 200 then
        error("API returned error: " .. resp.status_code)
    end

    local success, data = pcall(json.decode, resp.body)
    if not success then
        error("Failed to parse JSON response: " .. data)
    end

    return data
end
```

### 缓存

A local Lua table can avoid repeated work within one runtime. It does not persist between
separate mise invocations. mise already caches tool version and environment results;
environment plugins can also return [cache metadata](/env-plugin-development.html#hooks-mise-env-lua).
The example below is only an in-memory cache:

```lua
local cache = {}
local cache_ttl = 3600  -- 1 小时

function cached_http_get(url)
    local now = os.time()
    local cache_key = url

    -- 检查缓存
    if cache[cache_key] and (now - cache[cache_key].timestamp) < cache_ttl then
        return cache[cache_key].data
    end

    -- 获取新鲜数据
    local http = require("http")
    local resp = http.get({url = url})


    assert(resp.status_code == 200, "Request failed")
    -- Cache the result
    cache[cache_key] = {
        data = resp,
        timestamp = now
    }

    return resp
end
```

### 平台检测

Use runtime metadata instead of subprocesses or ambient host variables:

```lua
local platform = {
    os = RUNTIME.osType,
    arch = RUNTIME.archType,
    libc = RUNTIME.envType,
}
```

`RUNTIME` may describe another target during lockfile generation. Shelling out to `uname`
would report the host and can produce the wrong artifact URL for that target.

## Next Steps

- [后端插件开发](backend-plugin-development.md)
- [工具插件开发](tool-plugin-development.md)
- [发布你的插件](plugin-publishing.md)
