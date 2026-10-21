---
description: "编写 Lua 插件，列出、下载、验证并设置某个工具的版本。"
---

# 工具插件

工具插件由一组 Lua 钩子组成，用来告诉 mise 如何列出工具版本、下载并校验版本，以及设置运行环境。当没有可安装该工具的[后端](/dev-tools/backends/)时，可以编写工具插件；如果要支持一组工具，则应编写[后端插件](/backend-plugin-development.html)。

工具插件可以下载归档文件、从源代码构建、设置环境变量，并读取 `.example-version` 等版本文件。工具插件使用与 [vfox](https://vfox.dev) 插件相同的钩子，并运行在 mise 内置的 Lua 5.1 环境中。如果也要发布给 vfox CLI 使用，请同时在 vfox 中测试；参见[与 vfox 的差异](#differences-from-vfox)。

## 快速开始 {#quick-start}

使用 GitHub 上的 **Use this template** 按钮或 GitHub CLI，从[工具插件模板](https://github.com/jdx/mise-tool-plugin-template)创建仓库：

```sh
gh repo create mise-example --template jdx/mise-tool-plugin-template --public --clone
```

工具插件的目录结构如下：

```text
mise-example/
├── metadata.lua                    # name, version, version files, dependencies
├── hooks/
│   ├── available.lua               # required: list versions
│   ├── pre_install.lua             # required: describe the download
│   ├── env_keys.lua                # required: set the environment
│   ├── post_install.lua            # optional: finish the install
│   ├── mise_install_satisfied.lua  # optional: check an install against its options
│   ├── pre_uninstall.lua           # optional: clean up before removal
│   └── parse_legacy_file.lua       # optional: read idiomatic version files
└── lib/                            # optional: modules for require()
```

将工作副本以用户输入的名称链接起来，然后在空项目中试用：

```sh
mise plugins link example ./mise-example
mise ls-remote example
mise use example@1.10.0
mise exec -- example --version
```

## 完整示例 {#complete-example}

此插件安装名为 `example` 的 CLI。发布者在 `releases.json` 中按从新到旧列出版本，并将每个版本的归档文件和 `SHA256SUMS` 文件放在以版本号命名的目录中：

```text
https://downloads.example.com/example/releases.json
https://downloads.example.com/example/1.10.0/example-1.10.0-linux-x64.tar.gz
https://downloads.example.com/example/1.10.0/SHA256SUMS
```

```lua [metadata.lua]
PLUGIN = {
    name = "example",
    version = "0.1.0",
    description = "Install the example CLI",
    legacyFilenames = { ".example-version" },
}
```

```lua [lib/release.lua]
local M = {}

M.base_url = "https://downloads.example.com/example"

        -- 发布者将 macOS 称为 "macos"、将 x86-64 称为 "x64"；RUNTIME 中对应名称为
        -- "darwin" 和 "amd64"。这里只映射发布者实际构建的目标平台。
function M.asset_name(version)
    local os_names = { darwin = "macos", linux = "linux", windows = "windows" }
    local arch_names = { amd64 = "x64", arm64 = "arm64" }
    local os_name = os_names[RUNTIME.osType] or error("unsupported OS: " .. RUNTIME.osType)
    local arch = arch_names[RUNTIME.archType] or error("unsupported architecture: " .. RUNTIME.archType)
    return "example-" .. version .. "-" .. os_name .. "-" .. arch .. ".tar.gz"
end

        -- 在 SHA256SUMS 内容中查找单个文件的 SHA-256。文件名必须精确比较：
        -- "." 和 "-" 都是模式字符，因此 line:match(filename) 无法精确匹配。
function M.find_checksum(body, filename)
    for line in body:gmatch("[^\r\n]+") do
        local digest, name = line:match("^(%x+)%s+%*?(.+)$")
        if name == filename and #digest == 64 then
            return digest
        end
    end
    error("no SHA-256 for " .. filename)
end

return M
```

```lua [hooks/available.lua]
local http = require("http")
local json = require("json")
local release = require("release")

function PLUGIN:Available(ctx)
    local resp = http.get({ url = release.base_url .. "/releases.json" })
    if resp.status_code ~= 200 then
        error("fetching releases.json failed: HTTP " .. resp.status_code)
    end
    local result = {}
    -- releases.json 按从新到旧列出版本；保持此顺序
    for _, r in ipairs(json.decode(resp.body)) do
        table.insert(result, { version = r.version })
    end
    return result
end
```

```lua [hooks/pre_install.lua]
local http = require("http")
local release = require("release")

function PLUGIN:PreInstall(ctx)
    local dir = release.base_url .. "/" .. ctx.version .. "/"
    local filename = release.asset_name(ctx.version)
    local sums = http.get({ url = dir .. "SHA256SUMS" })
    if sums.status_code ~= 200 then
        error("fetching SHA256SUMS failed: HTTP " .. sums.status_code)
    end
    return {
        version = ctx.version,
        url = dir .. filename,
        sha256 = release.find_checksum(sums.body, filename),
    }
end
```

```lua [hooks/env_keys.lua]
function PLUGIN:EnvKeys(ctx)
    local file = require("file")
    return {
        { key = "EXAMPLE_HOME", value = ctx.path },
        { key = "PATH", value = file.join_path(ctx.path, "bin") },
    }
end
```

`mise use example@1.10.0` 会先调用 `Available` 解析版本请求，再调用
`PreInstall`。mise 下载归档文件并根据 SHA-256 校验，然后解压到安装目录，最后调用
`EnvKeys` 将 `bin` 加入 `PATH` 并设置 `EXAMPLE_HOME`。`mise ls-remote example`
会按从旧到新的顺序列出版本。

## mise 如何运行工具插件 {#plugin-architecture}

```mermaid
flowchart LR
    A[Available：列出版本] --> B[解析版本]
    B --> C[PreInstall：描述下载内容]
    C --> D[mise：下载、校验、解压]
    D --> E[PostInstall：可选设置]
    E --> F[EnvKeys：返回环境变量]
```

mise 仅在列出或安装版本时运行 `Available`、`PreInstall` 和 `PostInstall`。构建已安装版本的环境时才会运行 `EnvKeys`。mise 会按版本和选项缓存结果，因此该钩子应保持快速且没有副作用。

钩子可以使用[插件 Lua 参考](/plugin-lua-modules.html)中的 `http`、`json`、`file`、`archiver`、`cmd` 等模块，以及描述当前平台的全局变量 [`RUNTIME`](/plugin-lua-modules.html#runtime)。

## 钩子 {#hook-functions}

| 钩子                   | 文件                               | 必需     | mise 调用时机                                                     |
| ---------------------- | ---------------------------------- | -------- | ----------------------------------------------------------------- |
| `Available`            | `hooks/available.lua`              | 是       | 列出版本时（`mise ls-remote`，或解析 `latest`、`1.10` 等请求）     |
| `PreInstall`           | `hooks/pre_install.lua`            | 是       | 获取某个版本的下载信息时                                           |
| `EnvKeys`              | `hooks/env_keys.lua`               | 是       | 为已安装的版本构建环境时                                           |
| `PostInstall`          | `hooks/post_install.lua`           | 否       | 下载内容解压后                                                     |
| `MiseInstallSatisfied` | `hooks/mise_install_satisfied.lua` | 否       | 检查已安装版本是否满足当前选项时                                   |
| `PreUninstall`         | `hooks/pre_uninstall.lua`          | 否       | mise 移除已安装版本前                                              |
| `ParseLegacyFile`      | `hooks/parse_legacy_file.lua`      | 否       | 读取 `legacyFilenames` 中列出的版本文件时                          |

钩子通过 `error()` 抛出错误表示执行失败。除下文某个钩子另有说明外，mise 会停止执行并显示错误消息。

### Available {#available-hook}

| `ctx` field | Value                        |
| ----------- | ---------------------------- |
| `args`      | 在 mise 中始终为空列表          |

返回一个表列表，按发布者的版本发布规则从新到旧排列：

| 字段         | 必需     | 值                                                                 |
| ------------ | -------- | ------------------------------------------------------------------ |
| `version`    | 是       | 版本字符串；除已说明的前缀外，不要修改                             |
| `rolling`    | 否       | 对 `nightly` 等内容会变化的通道设为 `true`                         |
| `checksum`   | 否       | 对滚动通道，填写当前平台资源文件的 SHA-256                         |
| `created_at` | 否       | 版本发布日期，使用 RFC 3339 时间戳                                 |

mise 会将列表反转为自身使用的从旧到新顺序。后端插件中的 `BackendListVersions` 则应直接按从旧到新返回。`Available` 不会收到工具选项，因此版本列表不能依赖这些选项。

#### 发布日期 {#release-dates}

如果发布者的索引提供版本发布日期，请通过 `created_at` 返回，例如 `created_at = "2026-01-31T12:00:00Z"`。mise 会将其用于[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 和 `--before`：没有日期或无法按 RFC 3339 解析的版本会视为无日期版本，截止时间不会隐藏这类版本。如果发布者提供了日期，请务必返回，否则冷却期将无法拦截新版本。

#### 滚动发布 {#rolling-releases}

如果某个通道名称不变、但内容会更新，请返回 `rolling = true`，并附上该通道当前指向的资源文件校验和：

```lua [hooks/available.lua]
function PLUGIN:Available(ctx)
    return {
        -- nightly_sha256() 是你自己的辅助函数，用于读取发布者为当前平台 nightly 资源文件提供的校验和
        { version = "nightly", rolling = true, checksum = nightly_sha256() },
        { version = "1.10.0" },
    }
end
```

`mise upgrade` 和 `mise outdated` 会将此校验和与安装通道时 `PreInstall` 返回的 `sha256` 比较，因此两个钩子都必须报告当前平台资源文件相同的 SHA-256。如果 `PreInstall` 没有返回 `sha256`，mise 会始终将该通道报告为过期；如果 `Available` 没有返回校验和，mise 就无法判断通道内容是否变化。`mise upgrade --bump` 会保留通道名称。

### 预安装 {#preinstall-hook}

| `ctx` 字段  | 值                                                    |
| ----------- | ----------------------------------------------------- |
| `version`   | 已解析出的待安装版本，例如 `"1.10.0"`                 |
| `options`   | 工具选项；参见[工具选项](#tool-options)                |

返回一个表：

| 字段                 | 必需     | 值                                                                             |
| -------------------- | -------- | ------------------------------------------------------------------------------ |
| `version`            | 是       | 版本号，通常为 `ctx.version`                                                   |
| `url`                | 否       | 要下载的文件                                                                   |
| `sha256` or `sha512` | 否       | 文件校验和；每个 `url` 都应返回其中一个                                         |
| `sha1` or `md5`      | 否       | 较弱的校验和，mise 也会检查                                                     |
| `attestation`        | 否       | 用于校验的签名或来源证明；参见[校验下载内容](#verify-downloads)                 |
| `headers`            | 否       | 下载请求使用的标头，例如 token                                                  |

mise 会下载 `url` 指向的文件，检查返回的所有校验和和来源证明，并将文件解压到安装目录。mise 支持解压 `.tar.gz`、`.tgz`、`.tar.xz`、`.txz`、`.tar.bz2`、`.tbz2`、`.tbz` 和 `.zip` 归档；如果归档中只有一个顶层目录，则该目录的内容会成为安装目录。其他文件会被移入安装目录并设为可执行文件。如果没有 `url`，mise 不会下载内容，而由 `PostInstall` 完成安装，例如从源代码构建。

### 需要身份验证的下载

如果下载文件需要 token，请在 `url` 旁返回一个 `headers` 表：

```lua
function PLUGIN:PreInstall(ctx)
    return {
        version = ctx.version,
        url = "https://api.github.com/repos/acme/dist/releases/assets/12345",
        sha256 = sha256,
        headers = {
            Accept = "application/octet-stream",
            Authorization = "Bearer " .. token,
        },
    }
end
```

mise 只会将这些标头发送到 `url` 的来源地址（协议、主机和端口）。重定向到其他来源地址时，mise 会移除标头，这适用于 GitHub 等服务的签名存储 URL。配置了 [`url_replacements`](/url-replacements) 的镜像不会收到这些标头。`headers` 中的 `Authorization` 优先于 netrc 和自动使用的 GitHub token。标头值不会写入调试输出或 `mise.lock`。mise 会携带这些标头下载文件，因此校验和、重试及 `mise lock` 仍可正常工作。

mise 还会调用 `PreInstall`，为 `mise.lock` 记录其他平台的下载 URL。此时 `RUNTIME` 描述的是目标平台，因此应根据 `RUNTIME` 构造 URL，不要在此钩子中探测主机环境或安装任何内容。

#### 校验下载内容 {#verify-downloads}

每个 URL 都应返回 `sha256` 或 `sha512`。mise 也会检查 `sha1` 和 `md5`，但只有 SHA-256 和 SHA-512 足以替代记录在 `mise.lock` 中的来源证明。同一服务器提供的校验和可以发现文件损坏，却无法发现服务器遭到入侵；签名或来源证明可以弥补这一点。

如果发布者会为版本签名，还应返回 `attestation` 表。mise 会在安装时验证签名，并将验证方式记录到 `mise.lock`；之后如果无法用相同方式验证，安装就会失败，而不会降级为较弱的校验方式：

```lua
return {
    version = ctx.version,
    url = url,
    sha256 = sha256,
    attestation = {
        github_owner = "your-org",
        github_repo = "example",
        -- optional: accept only artifacts built by this workflow
        github_signer_workflow = "your-org/example/.github/workflows/release.yml",
    },
}
```

| 字段                                                                                                                                           | 校验内容                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_owner`、`github_repo`、可选的 `github_signer_workflow`                                                                               | GitHub 制品来源证明。用户必须在环境中设置 `MISE_GITHUB_TOKEN` 或 `GITHUB_TOKEN`，否则安装会失败。                                                     |
| `cosign_sig_or_bundle_path`、`cosign_public_key_path`                                                                                        | 使用密钥生成的 cosign 签名。                                                                                                                          |
| `cosign_sig_or_bundle_path`、`cosign_certificate_identity` 或 `cosign_certificate_identity_regexp`、可选的 `cosign_certificate_oidc_issuer`  | 无密钥的 cosign 签名。必须指定身份，因为任何 GitHub Actions 工作流都可以获取有效的 Fulcio 证书。                                                    |
| `slsa_provenance_path`、`slsa_signer_identity`、`slsa_signer_issuer`、可选的 `slsa_min_level`                                                 | SLSA 来源证明。`slsa_signer_identity` 是精确的证书主题 URI，包含工作流引用。未同时提供两个 signer 字段时，mise 会跳过 SLSA 校验。                       |

### 环境变量 {#envkeys-hook}

| `ctx` 字段  | 值                                                    |
| ----------- | ----------------------------------------------------- |
| `path`      | 安装目录                                              |
| `version`   | 已安装的版本                                          |
| `main`      | 此次安装的 `{ name, version, path }`                  |
| `sdkInfo`   | 以插件名称为键的相同数据表                            |
| `options`   | 工具选项；参见[工具选项](#tool-options)                |

返回由 `{ key = ..., value = ... }` 表组成的列表。每个 `PATH` 目录都应单独作为一项返回，不要返回完整的 `PATH`；mise 会使用当前平台的路径分隔符拼接重复的键。如果没有返回 `PATH` 项，mise 会将安装目录中的 `bin` 加入 `PATH`。

在 Linux 和 macOS 上，可执行文件通常位于 `bin` 目录中；在 Windows 上则通常位于归档文件的顶层：

```lua [hooks/env_keys.lua]
function PLUGIN:EnvKeys(ctx)
    local file = require("file")
    local bin = RUNTIME.osType == "windows" and ctx.path or file.join_path(ctx.path, "bin")
    return {
        { key = "EXAMPLE_HOME", value = ctx.path },
        { key = "PATH", value = bin },
    }
end
```

只返回工具所需的变量。`LD_LIBRARY_PATH` 等变量会影响此环境中启动的所有程序。对于不属于某个工具版本的变量，请编写[环境插件](/env-plugin-development.html)。

### 安装后处理 {#postinstall-hook}

| `ctx` 字段       | 值                                                                        |
| ---------------- | ------------------------------------------------------------------------- |
| `rootPath`       | 安装目录                                                                  |
| `runtimeVersion` | 已解析出的待安装版本，与 `sdkInfo[name].version` 相同                     |
| `sdkInfo`        | 以插件名称为键的此次安装 `{ name, version, path }`                        |
| `options`        | 工具选项；参见[工具选项](#tool-options)                                    |

`PostInstall` 不返回内容。mise 会在解压下载内容后调用它；如果 `PreInstall` 没有返回 `url`，则会由它代替下载流程执行安装：

```lua [hooks/post_install.lua]
function PLUGIN:PostInstall(ctx)
    local file = require("file")
    if not file.exists(file.join_path(ctx.rootPath, "bin", "example")) then
        error("expected bin/example in the archive")
    end
end
```

如果要从源代码构建，应在此处编译，而不是在 `PreInstall` 中编译。请在 [`systemDependencies`](#system-dependencies) 中声明构建所需的编译器和库，使用 `cmd.exec` 及其 `cwd` 选项运行命令，并将路径作为带引号的参数或环境变量传递。请在 README 中说明构建是否需要 POSIX shell：`nproc`、`chmod` 和 `./configure` 无法在 Windows 上运行。

### 安装状态检查 {#miseinstallsatisfied-hook}

| `ctx` 字段  | 值                                                          |
| ----------- | ----------------------------------------------------------- |
| `path`      | 安装目录                                                    |
| `version`   | 已安装的版本                                                |
| `options`   | 当前工具选项；参见[工具选项](#tool-options)                  |

有些工具的安装状态取决于工具选项，例如由 `PostInstall` 安装的附加组件。如果没有此钩子，只要版本目录存在，mise 就会将其视为已安装。因此，选项变更要等到用户运行 `mise install --force` 并重新下载工具后才会生效。

`MiseInstallSatisfied` 用于报告已安装版本是否仍符合请求。每当 mise 判断是否需要安装工具时都会调用它，包括执行 `mise install` 和自动安装时。因此，应检查 `ctx.path` 中的文件，而不是运行工具或发起网络请求：

```lua [hooks/mise_install_satisfied.lua]
function PLUGIN:MiseInstallSatisfied(ctx)
    local file = require("file")
    for _, name in ipairs(ctx.options.components or {}) do
        if not file.exists(file.join_path(ctx.path, "components", name)) then
            return { satisfied = false, reason = "missing component " .. name }
        end
    end
    return { satisfied = true }
end
```

安装需要更新时返回 `{ satisfied = false, reason = "..." }` 或 `false`；否则返回 `{ satisfied = true }`、`true` 或不返回内容。返回 `false` 时，mise 会在现有安装目录上再次运行 `PostInstall`，不会调用 `PreInstall`、重新下载或移除安装目录，因此 `PostInstall` 必须能够安全地重复运行。之后，在运行工具的 `postinstall` 命令后，mise 会再次调用 `MiseInstallSatisfied`；如果安装仍不符合要求，就会使用 `reason` 报错。无论结果如何，现有安装都会保留；`mise install --force` 仍会从头重新安装。

`reason` 会显示在调试输出中（`MISE_DEBUG=1`）。如果钩子抛出错误，mise 会发出警告并将安装视为最新状态，避免失效的检查在每条命令执行时都触发更新。

### 卸载前处理 {#preuninstall-hook}

| `ctx` 字段  | 值                                                      |
| ----------- | ------------------------------------------------------- |
| `main`      | 即将移除的安装 `{ name, version, path }`                |
| `sdkInfo`   | 以插件名称为键的相同数据表                              |

在 `mise uninstall`、`mise upgrade` 和 `mise prune` 中，mise 会在移除已安装版本前调用 `PreUninstall`。可以用它撤销插件在安装目录以外所做的更改；运行此钩子时安装目录仍然存在。该钩子不返回内容，也不会收到工具选项。如果抛出错误，mise 会停止并保留安装目录，以便用户重试。

```lua [hooks/pre_uninstall.lua]
function PLUGIN:PreUninstall(ctx)
    -- PostInstall 将此版本记录在安装目录之外的文件中
    os.remove(os.getenv("HOME") .. "/.example/versions/" .. ctx.main.version)
end
```

### 解析旧式版本文件 {#parselegacyfile-hook}

| `ctx` 字段               | 值                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `filename`               | 文件名，例如 `.example-version`                                                        |
| `filepath`               | 文件的完整路径                                                                         |
| `getInstalledVersions()` | 尽管名称如此，它实际会调用 `Available` 并返回这些版本；该调用可能访问网络               |

vfox 将其称为旧式文件；mise 称为[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。在 `metadata.lua` 的 `legacyFilenames` 中列出文件名，并按文件中的原始版本请求返回 `{ version = ... }`：

```lua [hooks/parse_legacy_file.lua]
function PLUGIN:ParseLegacyFile(ctx)
    local file = require("file")
    local line = file.read(ctx.filepath):match("^%s*([^\r\n]+)")
    return { version = line and line:match("^(.-)%s*$") }
end
```

此解析器会将首行作为版本请求读取，包括通道名和预发布版本，并去掉首尾空格。请根据文件的实际格式调整解析器。mise 会按空白字符拆分返回的字符串，因此 `"1.2.0 1.10.0"` 会同时请求这两个版本。

mise 只会为 [`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 设置项中列出的工具读取惯用版本文件，因此请告知用户将插件名称添加到该设置中。

## metadata.lua {#metadata-lua}

`metadata.lua` 至少要在全局 `PLUGIN` 表中设置 `name` 和 `version`；Lua 参考中列出了[所有字段](/plugin-lua-modules.html#metadata)。mise 会缓存工具插件在此文件中的声明，直到插件的某个 Lua 文件发生变化。不要在 `metadata.lua` 中探测主机环境：调用外部命令会拖慢许多命令，而且操作系统升级后缓存结果可能过期。

### depends {#depends}

`depends` 用工具在 `mise.toml` 中的名称列出插件所需工具：

```lua [metadata.lua]
PLUGIN = {
    name = "example",
    version = "0.1.0",
    depends = { "go" },
}
```

当项目配置了所列工具时，mise 会先于插件本身安装这些工具，并在钩子通过 `cmd.exec` 和 `os.execute` 运行的命令中将其加入 `PATH`，但 `io.popen` 不会获得这些工具。安装工具时，这些命令也可以读取标记为 `tools = true` 的 `[env]` 值。`depends` 不会选择版本，也不会安装项目未配置的工具；未配置的工具仍可能从现有 `PATH` 中找到。不要在此列出插件自身的工具。

用户可以通过 [`depends` 工具选项](/dev-tools/#tool-dependencies)添加更多依赖；mise 会合并两份列表。后端插件也以相同方式声明 `depends`。

### 系统依赖 {#system-dependencies}

从源代码编译的插件可以在 `systemDependencies` 中列出所需库和构建工具。安装前，mise 会逐项检查，并根据 [`system_deps`](/configuration/settings.html#system_deps) 设置处理缺失项：报告缺失、询问是否安装，或直接安装。

```lua [metadata.lua]
PLUGIN = {
    name = "example",
    version = "0.1.0",

    systemDependencies = {
        -- PATH 上的可执行文件，可附带版本约束
        { bin = "bison", version = ">=3.0",
          packages = { brew = "bison", apt = "bison", dnf = "bison" } },
        { bin = "re2c",
          packages = { brew = "re2c", apt = "re2c", dnf = "re2c" } },

        -- 可由 pkg-config 查找的库
        { pkgconfig = "libxml-2.0",
          packages = { brew = "libxml2", apt = "libxml2-dev", dnf = "libxml2-devel" } },

        -- 通过 soname 指定的共享库（Linux）。在 64 位 time_t 迁移期间，apt 重命名了此软件包，
        -- 因此要按新名称优先的顺序列出两个名称。
        { sharedlib = "libaio.so.1",
          packages = { apt = { "libaio1t64", "libaio1" }, dnf = "libaio" } },

        -- 存在依赖时以 0 退出的任意 shell 命令
        { command = "xcode-select -p", optional = "macOS command line tools" },
    },
}
```

每一项只能设置一种检查方式：

| 检查方式    | 满足条件                                       | 适用场景                                    |
| ----------- | ---------------------------------------------- | ------------------------------------------ |
| `bin`       | 可执行文件位于 `PATH` 中                       | 编译器、构建工具、`*-config` 脚本           |
| `pkgconfig` | `pkg-config --exists <name>` 执行成功          | 提供 `.pc` 文件的 C 库                      |
| `sharedlib` | 动态链接器可以找到 soname（Linux）             | 预编译二进制所需的运行时库                  |
| `command`   | shell 命令以 `0` 退出                          | 其他检查方式无法表达的依赖                  |

- `version`：适用于 `bin` 和 `pkgconfig` 的版本约束，例如 `>=3.0`、`>3`、
  `<=1.2` 或 `=3.0`；单独写 `3.0` 表示 `>=3.0`。mise 会从 `<bin> --version` 或 `pkg-config --modversion` 读取版本；如果无法读取，则视为依赖已满足。
- `optional`：简短说明依赖的用途，例如 `"wxWidgets GUI"`。缺少可选依赖时只打印一行信息，不会询问用户或导致安装失败。
- `packages`：为每种受支持的包管理器指定提供该依赖的软件包。键可以是 mise 已知的任何包管理器，例如
  `brew`、`brew-cask`、`apt`、`dnf`、`zypper`、`pacman`、`aur`、`apk`、`nix`、
  `flatpak`、`flatpak-user`、`mas`、`scoop`、`snap`、`winget`，也可以是已安装的包管理器插件名称。mise 会使用第一个可用且配置了对应项的包管理器。对于名称列表，`apt` 会安装它能提供的第一个名称，其他管理器则使用列表中的第一项。

检查通过即可；mise 不关心依赖是如何安装的，并且只会在依赖缺失时使用 `packages` 安装它。较旧版本的 mise 会忽略 `systemDependencies`。

## 工具选项 {#tool-options}

在 `PreInstall`、`PostInstall`、`EnvKeys` 和 `MiseInstallSatisfied` 中，`ctx.options` 会包含 `mise.toml` 中的工具选项。`Available` 和 `PreUninstall` 不会收到这些选项。`os`、`depends`、`install_env`、`lazy`、`lazy_bins` 和 `auto_update` 由 mise 自行处理；其他选项都会传给钩子，其中 `postinstall` 和 `minimum_release_age` 也会由 mise 额外处理。

```toml [mise.toml]
[tools]
example = { version = "1.10.0", bundled = false, channels = ["stable", "beta"] }
```

数组和表会保留结构，其中的值也保留 TOML 类型。顶层布尔值和数字会以字符串形式传入，因此 `bundled = false` 会变成 `"false"`，而该字符串在 Lua 中为真值。请显式比较字符串，并使用 `tonumber` 转换数字：

```lua [hooks/pre_install.lua]
function PLUGIN:PreInstall(ctx)
    local bundled = ctx.options.bundled == "true"
    for _, channel in ipairs(ctx.options.channels or {}) do
        -- channels 是 Lua 列表
    end
    -- ...
end
```

安装、环境和卸载钩子以及它们运行的命令，也可以通过环境变量读取各个选项。变量名由 `MISE_TOOL_OPTS__` 和大写的选项名组成，例如 `MISE_TOOL_OPTS__BUNDLED`。数组和表会以 TOML 语法表示。`ctx.options` 出现以前编写的插件会读取这些变量；新插件应使用 `ctx.options`。用户配置选项的方法参见[插件](/plugins.html#tool-options)。

## 测试 {#testing-your-plugin}

请使用单独的测试项目，并为插件选择一个不会覆盖你日常使用工具的名称：

```sh
mise plugins link example ./mise-example
mise ls-remote example
mise use example@1.10.0
mise exec -- example --version
```

测试版本文件时，请使用另一个空项目，不要在 `[tools]` 中配置该工具，这样版本才会由版本文件决定：

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ["example"]
```

将版本请求写入 `.example-version`，运行 `mise install`，再检查 `mise exec -- example --version` 的输出。`mise use example` 会写入 `[tools]` 项，因此不能用于测试版本文件。

钩子失败时，使用调试输出重新运行命令。如果版本列表或环境缓存导致钩子修改没有生效，请清除该工具的缓存：

```sh
MISE_DEBUG=1 mise install example@1.10.0
mise cache clear example
```

发布前，请在所有支持的操作系统上测试版本列表、安装过程、可执行文件和环境变量；还要测试不支持的平台、缺少校验和的情况、包含空格的路径，以及你支持的版本文件。隔离测试环境的设置方法参见[发布插件](/plugin-publishing.html#testing-before-publication)。

## 常见错误 {#common-mistakes}

- 使用 `line:match(filename)` 匹配文件名。`.` 和 `-` 是模式字符；应像 `find_checksum` 一样使用 `==` 比较字符串。
- 校验和请求失败后仍以 `sha256 = nil` 继续执行。应改为抛出错误。
- 使用 `if ctx.options.flag then` 读取布尔选项。顶层布尔值会以字符串传入，因此 `"false"` 也是真值；应使用 `== "true"` 比较。
- 从版本号中移除超出文档说明范围的前缀。移除 `-beta.1` 或将 `lts/*` 转成数字都会改变版本请求；应将版本视为不透明字符串，不要用 SemVer 解析器排序。
- 在 `PostInstall` 中更改用户级配置，例如运行 `npm config set`。应改为从 `EnvKeys` 返回环境变量。
- 认为 Lua 表可以在不同命令间缓存数据。每条 mise 命令都会启动新的 Lua 运行时；版本列表和环境由 mise 自行缓存。参见[缓存行为](/cache-behavior.html)。
- 为解释请求失败而记录 token 或包含机密的响应正文。

## 与 vfox 的差异 {#differences-from-vfox}

- mise 不会调用 `PreUse`。应从 `EnvKeys` 返回环境变量，并在 `Available` 中解析版本请求。
- mise 只安装 `PreInstall` 返回的主要下载内容，会忽略 `addition` 项。请在 `PostInstall` 中安装额外组件，或将其声明为工具依赖。
- mise 会忽略 `PreInstall` 结果中的 `headers`。下载时会应用自己的 [`url_replacements`](/url-replacements.html) 和 [`netrc`](/configuration/settings.html#netrc) 设置。
- mise 不读取 `minRuntimeVersion`。
- mise 会忽略 `Available` 和 `PreInstall` 结果中的 `note`。
- `ctx.args` 始终为空。
- `ParseLegacyFile` 中的 `ctx:getInstalledVersions()` 会调用 `Available`，而不是列出已安装版本。
- `Available` 中的 `rolling` 和 `checksum`、`PreInstall` 中的 `attestation`、`ctx.options`、`MiseInstallSatisfied`、`PLUGIN.depends` 和 `systemDependencies` 都是 mise 扩展，vfox CLI 会忽略它们。

发布插件的方法参见[发布插件](/plugin-publishing.html)。
