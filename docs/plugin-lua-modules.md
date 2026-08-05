# 插件 Lua 模块

mise 插件可以访问一整套内置 Lua 模块，这些模块提供常见功能。这些模块在后端插件和工具插件中都可用，使执行 HTTP 请求、JSON 解析、文件操作等常见任务变得更加容易。

## 可用模块

### 核心模块

- **`cmd`** - 执行 shell 命令
- **`json`** - 解析和生成 JSON
- **`http`** - 发起 HTTP 请求和下载
- **`file`** - 文件系统操作
- **`env`** - 环境变量操作
- **`strings`** - 字符串处理工具
- **`semver`** - 语义化版本比较和排序
- **`html`** - HTML 解析和操作
- **`archiver`** - 压缩包解压
- **`log`** - 结构化日志记录。

## HTTP 模块

HTTP 模块提供用于发起网络请求和下载文件的功能。

### 基本 HTTP 请求

```lua
local http = require("http")

-- GET 请求
local resp, err = http.get({
    url = "https://api.github.com/repos/owner/repo/releases",
    headers = {
        ['User-Agent'] = "mise-plugin",
        ['Accept'] = "application/json"
    }
})

if err ~= nil then
    error("请求失败: " .. err)
end

if resp.status_code ~= 200 then
    error("HTTP 错误: " .. resp.status_code)
end

local body = resp.body
```

### HEAD 请求

```lua
local http = require("http")

-- 用于检查文件信息的 HEAD 请求
local resp, err = http.head({
    url = "https://example.com/file.tar.gz"
})

if err ~= nil then
    error("HEAD 请求失败: " .. err)
end

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

JSON 模块提供编码和解码功能。

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

strings 模块提供了各种字符串操作工具。

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

-- 去除特定字符
local trimmed = strings.trim("hello world", "world")
print(trimmed)  -- "hello "
```

### 版本字符串工具

```lua
local strings = require("strings")

-- 常见的版本字符串操作
local function normalize_version(version)
    -- 如果存在，则移除 'v' 前缀
    version = strings.trim_prefix(version, "v")

    -- 移除预发布后缀
    local parts = strings.split(version, "-")
    return parts[1]
end

local version = normalize_version("v1.2.3-beta.1")  -- "1.2.3"
```

## Semver 模块

semver 模块提供语义化版本比较和排序功能。这对于对 `Available()` 钩子返回的版本列表进行排序非常有用。

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

-- 支持前缀和后缀
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

```lua
local http = require("http")
local semver = require("semver")

function PLUGIN:Available(ctx)
    local resp, err = http.get({
        url = "https://example.com/releases/"
    })

    if err ~= nil then
        error("获取版本失败: " .. err)
    end

    local result = {}
    -- 从响应中解析版本...
    for version in string.gmatch(resp.body, 'v([0-9]+%.[0-9]+%.[0-9]+)') do
        table.insert(result, {version = version})
    end

    -- 按语义化版本排序（升序 - 最旧的在前）
    return semver.sort_by(result, "version")
end
```

### 在自定义排序中使用 Compare

```lua
local semver = require("semver")

-- 使用自定义比较器排序（降序 - 最新的在前）
table.sort(versions, function(a, b)
    return semver.compare(a.version, b.version) > 0
end)

-- 升序排序（最旧的在前）- Available() 的默认顺序
table.sort(versions, function(a, b)
    return semver.compare(a.version, b.version) < 0
end)
```

## HTML 模块

HTML 模块提供 HTML 解析功能。

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
for _, link in ipairs(links) do
    local href = link:attr("href")
    local text = link:text()
    print(text .. ": " .. href)
end
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

```lua
local html = require("html")
local http = require("http")

function get_github_releases(owner, repo)
    local resp, err = http.get({
        url = "https://github.com/" .. owner .. "/" .. repo .. "/releases"
    })

    if err ~= nil then
        error("获取发布信息失败: " .. err)
    end

    local doc = html.parse(resp.body)
    local releases = {}

    -- 查找所有发布标签
    local release_elements = doc:find("a[href*='/releases/tag/']")
    for _, element in ipairs(release_elements) do
        local href = element:attr("href")
        local version = href:match("/releases/tag/(.+)")
        if version then
            table.insert(releases, {
                version = version,
                url = "https://github.com" .. href
            })
        end
    end

    return releases
end
```

## 归档模块

归档模块提供了解压缩归档文件的功能。

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

-- 失败时会引发 Lua 错误。仅当插件需要拦截错误时才使用 pcall。
local ok, err = pcall(archiver.decompress, "package.zip", "destination/")
if not ok then
    error("ZIP extraction failed: " .. err)
end
```

要展平归档文件根目录下的版本目录，请传入
`strip_components = 1`。已位于归档文件根目录中的文件会被保留，这与
mise 内置的归档后端行为一致。

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
print(full_path)  -- 在 Unix 上: /foo/bar/baz.txt，在 Windows 上: \foo\bar\baz.txt
```

`file.join_path(...)` 函数使用当前操作系统的正确分隔符拼接任意数量的路径段。这是在跨平台插件中构造文件路径的推荐方式。

### 读取文件内容

```lua
local file = require("file")
print(file.read("/path/to/file"))
```

### 创建符号链接

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

## 环境模块

env 模块提供环境变量操作。

### 设置环境变量

```lua
local env = require("env")

-- 设置环境变量
env.setenv("MY_VAR", "my_value")
```

### 获取环境变量

> 要在 Lua 中读取变量，请使用 `os.getenv("MY_VAR")`。

### 路径操作

```lua
local env = require("env")

-- 获取当前 PATH
local current_path = os.getenv("PATH")

-- 添加到 PATH
local new_path = "/usr/local/bin:" .. current_path
env.setenv("PATH", new_path)

-- 平台相关的 PATH 分隔符
local separator = package.config:sub(1,1) == '\\' and ";" or ":"
local paths = {"/usr/local/bin", "/opt/bin", current_path}
env.setenv("PATH", table.concat(paths, separator))
```

## 命令模块

cmd 模块提供 shell 命令执行功能。

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

- **`cwd`**（字符串）：为命令设置工作目录
- **`env`**（表）：为命令执行设置环境变量。这些变量会与继承的环境合并（见下文）。
- **`timeout`**（数字）：为命令执行设置超时时间（未来特性）

### Env 模块钩子中的环境继承

当从环境模块钩子（`MiseEnv`、`MisePath`）调用 `cmd.exec()` 时，命令会自动继承 mise 构造的环境，而不是进程环境。这包括前置指令设置的环境变量，以及到目前为止累积的 `_.path` 条目。

当模块指令的 `tools = true` 时，继承的环境还会包含工具安装的 bin 路径。这意味着可以直接调用由 mise 管理的工具：

```toml
[env]
_.my-plugin = { tools = true }
```

```lua
function PLUGIN:MiseEnv(ctx)
    -- 使用 tools=true 时，mise 管理的工具会在 PATH 上
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

```lua
local http = require("http")
local json = require("json")

function fetch_npm_versions(package_name)
    local resp, err = http.get({
        url = "https://registry.npmjs.org/" .. package_name,
        headers = {
            ['User-Agent'] = "mise-plugin"
        }
    })

    if err ~= nil then
        error("获取包信息失败: " .. err)
    end

    local package_info = json.decode(resp.body)
    local versions = {}

    for version, _ in pairs(package_info.versions) do
        table.insert(versions, version)
    end

    -- 对版本进行排序（简单的字符串排序）
    table.sort(versions)

    return versions
end
```

### 带进度的文件下载

```lua
local http = require("http")
local file = require("file")

function download_with_verification(url, dest_path, expected_sha256)
    -- 下载文件
    local err = http.download_file({
        url = url,
        headers = {
            ['User-Agent'] = "mise-plugin"
        }
    }, dest_path)

    if err ~= nil then
        error("下载失败: " .. err)
    end

    -- 验证文件是否存在
    if not file.exists(dest_path) then
        error("未找到已下载的文件")
    end

    -- 注意：SHA256 验证需要额外实现
    -- 这是一个简化示例
    print("成功下载到: " .. dest_path)
end
```

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
    if not content then
        error("读取配置文件失败: " .. config_path)
    end

    -- 去除空白字符
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
    local resp, err = http.get({
        url = base_url .. "/releases"
    })

    if err ~= nil then
        error("获取发布页面失败: " .. err)
    end

    local doc = html.parse(resp.body)
    local versions = {}

    -- 查找版本标签
    local version_elements = doc:find("h2 a[href*='/releases/tag/']")
    for _, element in ipairs(version_elements) do
        local version_text = element:text()
        local version = strings.trim_space(version_text)

        -- 如果存在，移除 'v' 前缀
        version = strings.trim_prefix(version, "v")

        if version and version ~= "" then
            table.insert(versions, {
                version = version,
                url = base_url .. element:attr("href")
            })
        end
    end

    return versions
end
```

## 日志模块

日志模块提供结构化日志记录，通过 Rust 的 `log` crate 进行路由，并遵循 `MISE_DEBUG` 和 `MISE_TRACE` 环境变量。

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
    local resp, err = http.get({url = url})

    if err ~= nil then
        error("HTTP request failed: " .. err)
    end

    if resp.status_code ~= 200 then
        error("API returned error: " .. resp.status_code .. " " .. resp.body)
    end

    local success, data = pcall(json.decode, resp.body)
    if not success then
        error("Failed to parse JSON response: " .. data)
    end

    return data
end
```

### 缓存

为耗时操作实现缓存：

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
    local resp, err = http.get({url = url})

    if err ~= nil then
        error("HTTP request failed: " .. err)
    end

    -- 缓存结果
    cache[cache_key] = {
        data = resp,
        timestamp = now
    }

    return resp
end
```

### 平台检测

处理跨平台差异：

```lua
local function get_platform_info()
    local is_windows = package.config:sub(1,1) == '\\'
    local cmd = require("cmd")

    if is_windows then
        return {
            os = "windows",
            arch = os.getenv("PROCESSOR_ARCHITECTURE") or "x64",
            path_sep = "\\",
            env_sep = ";"
        }
    else
        local uname = cmd.exec("uname -s"):lower()
        local arch = cmd.exec("uname -m")

        return {
            os = uname,
            arch = arch,
            path_sep = "/",
            env_sep = ":"
        }
    end
end
```

## 下一步

- [后端插件开发](backend-plugin-development.md)
- [工具插件开发](tool-plugin-development.md)
- [发布你的插件](plugin-publishing.md)
