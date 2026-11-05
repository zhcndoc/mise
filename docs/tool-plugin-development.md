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

mise downloads `url`, checks every checksum and attestation you return, and
extracts the file into the install directory. It extracts `.tar.gz`, `.tgz`,
`.tar.xz`, `.txz`, `.tar.bz2`, `.tbz2`, `.tbz` and `.zip` archives, and when an
如果归档中只有一个顶层目录，该目录的内容会成为安装目录。若归档包含指向安装目录之外的符号链接，则会被拒绝。其他文件会被移动到安装目录并标记为可执行。若未设置 `url`，mise 不会下载任何内容，而 `PostInstall`
does the install, as in a build from source.

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
| `github_owner`, `github_repo`, optional `github_signer_workflow`                                                                              | A GitHub artifact attestation. Users need `MISE_GITHUB_TOKEN` or `GITHUB_TOKEN` in the environment; without one the install fails.                    |
| `cosign_sig_or_bundle_path`, `cosign_public_key_path`                                                                                         | A cosign signature made with a key.                                                                                                                   |
| `cosign_sig_or_bundle_path`, `cosign_certificate_identity` or `cosign_certificate_identity_regexp`, optional `cosign_certificate_oidc_issuer` | A keyless cosign signature. The identity is required, because any GitHub Actions workflow can get a valid Fulcio certificate.                         |
| `slsa_provenance_path`, `slsa_signer_identity`, `slsa_signer_issuer`, optional `slsa_min_level`, `slsa_source_repository`, `slsa_source_tag`  | SLSA provenance. `slsa_signer_identity` is the exact certificate subject URI, including the workflow ref. mise skips SLSA without both signer fields. |

生成 SLSA 来源证明的工作流运行，必须属于存放 `slsa_signer_identity` 工作流的仓库。如果发布者使用其他仓库中的可复用工作流（例如 `slsa-framework/slsa-github-generator`）进行签名，请将 `slsa_source_repository` 设为发布者的 `owner/repo`：该工作流在所有调用它的仓库中都具有相同身份。

将 `slsa_source_tag` 设为构建此版本发布所用的 Git 标签，例如 `v1.2.3`。这样 mise 会拒绝由其他 ref 构建的来源证明，避免旧版本的来源证明被错误用于当前版本。未设置时，mise 不会检查 ref。

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

#### 缓存 {#envkeys-caching}

mise 会为每个已安装版本和选项组合缓存 `EnvKeys` 的结果，因为每次 Shell 提示符出现时都需要构建环境。以下情况会重新运行此 hook：

- 安装目录、插件或 mise 数据目录发生变化；
- hook 通过 `os.getenv` 读取的变量值发生变化；
- hook 通过 [`mise.cache.watch_files`](/plugin-lua-modules.html#cache-module) 指定的文件发生更改、新建或删除。

mise 不会检测 hook 读取的文件或运行的命令，因此请明确列出结果所依赖的文件。若 hook 每次都必须运行，请调用 [`mise.cache.disable`](/plugin-lua-modules.html#cache-module)。以下 hook 会在当前目录存在 `Pipfile` 时启用虚拟环境，并在 `Pipfile.lock` 更改后重新运行：

```lua [hooks/env_keys.lua]
function PLUGIN:EnvKeys(ctx)
    local file = require("file")
    local keys = { { key = "PATH", value = file.join_path(ctx.path, "bin") } }
    local cwd = os.getenv("PWD")
    local lock = file.join_path(cwd, "Pipfile.lock")
    local ok, cache = pcall(require, "mise.cache")
    if ok then
        cache.watch_files({ lock })
    end
    if file.exists(lock) then
        table.insert(keys, { key = "VIRTUAL_ENV", value = file.join_path(cwd, ".venv") })
    end
    return keys
end
```

`mise.cache` 是 mise 扩展的模块，因此如果插件也要在 vfox CLI 或较旧版本的 mise 中运行，请使用 `pcall` 加载它。

### PostInstall {#postinstall-hook}

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
| `bin`       | the executable is on `PATH`                    | compilers, build tools, `*-config` scripts |
| `pkgconfig` | `pkg-config --exists <name>` succeeds          | C libraries that ship a `.pc` file         |
| `sharedlib` | the dynamic linker can find the soname (Linux) | runtime libraries for prebuilt binaries    |
| `command`   | the shell command exits `0`                    | anything the other checks cannot express   |

- `version`: a constraint for `bin` and `pkgconfig`, such as `>=3.0`, `>3`,
  `<=1.2` or `=3.0`; a bare `3.0` means `>=3.0`. mise reads the version from
  `<bin> --version` or `pkg-config --modversion`, and treats the dependency as
  satisfied when it cannot read one.
- `optional`: a short reason, such as `"wxWidgets GUI"`. A missing optional
  dependency prints one line and never prompts or fails the install.
- `packages`: the package that provides the dependency, for each package
  manager that has one. Keys are any package manager mise knows, such as
  `brew`, `brew-cask`, `apt`, `dnf`, `zypper`, `pacman`, `aur`, `apk`, `nix`,
  `choco`, `flatpak`, `flatpak-user`, `mas`, `scoop`, `snap`, `winget`, or an installed package
  manager plugin's name. mise uses the first available manager that has an
  entry. For a list of names, `apt` installs the first one it offers, and the
  other managers use the first entry.

A passing check is enough: mise does not care how the dependency was installed,
and uses `packages` only to install what is missing. Older mise versions ignore
`systemDependencies`.

## Tool options {#tool-options}

`ctx.options` holds the tool's options from `mise.toml` in `PreInstall`,
`PostInstall`, `EnvKeys` and `MiseInstallSatisfied`. `Available` and
`PreUninstall` do not receive them. mise keeps `os`, `depends`, `install_env`,
`lazy`, `lazy_bins` and `auto_update` to itself; every other option reaches the
hooks, including `postinstall` and `minimum_release_age`, which mise also acts
on.

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

Before you publish, test version listing, an install, the executable and the
environment on every OS you support, plus an unsupported platform, a missing
checksum, a path with spaces and, if you support them, version files. See
[Publishing plugins](/plugin-publishing.html#testing-before-publication) for an
isolated test setup.

## Common mistakes {#common-mistakes}

- Matching a file name with `line:match(filename)`. `.` and `-` are pattern
  characters; compare strings with `==`, as `find_checksum` does.
- Continuing with `sha256 = nil` after a checksum request fails. Raise an error
  instead.
- Reading a boolean option with `if ctx.options.flag then`. Top-level booleans
  arrive as strings, so `"false"` is true; compare with `== "true"`.
- Stripping more than a documented prefix from versions. Removing `-beta.1` or
  turning `lts/*` into digits changes the request; treat versions as opaque
  strings and do not sort them with a SemVer parser.
- Changing user-wide configuration from `PostInstall`, such as
  `npm config set`. Return environment variables from `EnvKeys` instead.
- Expecting a Lua table to cache data between commands. Each mise command
  starts a new Lua runtime; mise caches version lists and environments itself.
  See [cache behavior](/cache-behavior.html).
- Logging tokens or a response body that contains secrets to explain a failed
  request.

## Differences from vfox {#differences-from-vfox}

- mise never calls `PreUse`. Return environment variables from `EnvKeys`, and
  resolve version requests in `Available`.
- mise installs only the main download from `PreInstall` and ignores
  `addition` entries. Install extra components in `PostInstall`, or declare
  them as tool dependencies.
- mise ignores `headers` in `PreInstall`'s result. It applies its own
  [`url_replacements`](/url-replacements.html) and
  [`netrc`](/configuration/settings.html#netrc) settings to the download.
- mise does not read `minRuntimeVersion`.
- mise ignores `note` in the results of `Available` and `PreInstall`.
- `ctx.args` is always empty.
- `ctx:getInstalledVersions()` in `ParseLegacyFile` calls `Available` instead
  of listing installed versions.
- `rolling` and `checksum` in `Available`, `attestation` in `PreInstall`,
  `ctx.options`, `MiseInstallSatisfied`, `PLUGIN.depends` and
  `systemDependencies` are mise additions that the vfox CLI ignores.
- [`mise.cache`](/plugin-lua-modules.html#cache-module) 模块是 mise 扩展的功能，vfox CLI 不提供。

To publish the plugin, see [Publishing plugins](/plugin-publishing.html).
