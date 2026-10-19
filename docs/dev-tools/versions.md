---
description: "编写 24、latest 或 prefix:1.20 等版本请求，并选择 mise 要读取的版本文件。"
---

# 版本请求与版本文件

版本请求是你在 `mise.toml` 中为工具指定的值，例如 `node = "24"` 中的 `"24"`。mise
运行时会将每个请求解析为一个具体版本；如果所有人都必须使用相同构建版本，请将解析结果
记录在[锁文件](/dev-tools/mise-lock.html)中。

```toml [mise.toml]
[tools]
node = "24"          # 任意 24.x 版本
python = "3.14.8"    # 精确版本 3.14.8
ripgrep = "latest"   # 后端定义的最新版本
```

## 请求语法 {#request-syntax}

| 请求                              | 示例                               | 选择结果                                                                                                |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 精确版本                          | `"24.11.1"`                        | 指定的版本。                                                                                             |
| 前缀                              | `"24"`、`"3.14"`                   | 以该前缀开头的版本。如果恰好有版本号与前缀相同，则选择该版本。                                         |
| `latest`                          | `"latest"`                         | 工具后端认定的最新版本。                                                                                 |
| 别名                              | `"lts"`、`"project-lts"`           | 别名所代表的请求，例如 Node.js 的 `lts`（即 `24`）或[工具别名](/dev-tools/aliases.html)。              |
| `prefix:`                         | `"prefix:1.20"`                    | 选择以前缀开头的版本，即使存在名称恰好等于该前缀的版本。                                                 |
| `ref:`、`tag:`、`branch:`、`rev:` | `"ref:main"`                       | 在支持源码构建的后端中，基于版本控制引用构建。                                                           |
| `path:`                           | `"path:/opt/homebrew/opt/node@24"` | 将现有目录用作安装目录。                                                                                 |
| `system`                          | `"system"`                         | 不通过 mise 安装。mise 不会将该工具的任何目录加入 `PATH`，因此会运行 `PATH` 中已有的版本。               |
| `sub-`                            | `"sub-1:latest"`                   | 将另一请求解析出的版本号减去指定值后得到的版本。                                                         |

前缀匹配会考虑分隔符：`1.2` 可以匹配 `1.2.3` 和 `1.2+build`，但不会匹配 `1.20`。除非
你精确请求某个预发行版本，或设置 `prerelease`[工具选项](/dev-tools/#tool-options)，
否则前缀和 `latest` 都会跳过 `1.0.0-rc1` 这类预发行版本。

相同的请求也适用于命令行（`mise use node@24`、`mise exec go@prefix:1.20 -- go version`）
和 `.tool-versions`。在 `package.json` 以外，mise 不接受 `^24` 或 `>=20` 这类 npm 风格的
版本范围：它会发出警告，并将该范围当成字面版本处理，导致安装失败。

不带版本运行 `mise use node` 会写入 `latest`。`mise install node` 和 `mise exec node` 会
使用配置选定的版本；如果配置中没有声明该工具，则使用 `latest`。

### 前缀、引用、路径和减法请求 {#scopes}

`prefix:<PREFIX>` 适用于发布版本名称本身就是前缀的工具。Go 1.21 之前的版本依次命名为
`1.20`、`1.20.1` 等，因此 `go = "1.20"` 会选择名称恰好为 `1.20` 的版本；而
`go = "prefix:1.20"` 则会选择最新的 1.20.x 版本。

`ref:<REF>` 会基于分支、标签或提交构建。`tag:`、`branch:` 和 `rev:` 可显式指定引用类型。
是否支持取决于后端：来自 Git 的 npm 软件包支持这四种形式；来自 Git 的 cargo 软件包支持
`tag:`、`branch:` 和 `rev:`，但不支持 `ref:`；`spm` 软件包支持 `ref:` 和 `rev:`；插件则
支持各自实现的引用类型。Python 和 Erlang 核心工具不支持基于引用构建。

`path:<PATH>` 会使用你在其他位置构建或安装的目录，例如 Homebrew keg
（`path:/opt/homebrew/opt/node@24`）。`~/` 会展开为主目录；相对路径相对于声明它的配置文件
[配置根目录](/configuration.html#config-root)解析，在命令行中则相对于当前目录解析。在
Windows 上，两种路径分隔符都可用，mise 会以正斜杠形式保存路径。在 TOML 的双引号字符串中，
反斜杠会开始转义序列，因此 Windows 路径应使用字面字符串（`{ path = 'C:\tools\node' }`）
或将反斜杠加倍（`"C:\\tools\\node"`）。`"C:\tools\node"` 不会报错，但 TOML 会将 `\t`
解析为制表符，导致路径被悄悄改写。在 Windows 上，如果路径包含 `cmd.exe` 元字符
（`& | < > ^ %`），mise 会拒绝该路径，因为它会被传给使用该路径构建 Shell 命令的插件。

`sub-<PARTIAL>:<REQUEST>` 会先解析 `REQUEST`，再从结果中对应的版本号部分减去 `PARTIAL`，
最后将剩余部分作为前缀解析。`sub-2:lts` 会将 Node.js `24` 变为 `22`；`sub-0.1:latest`
会将 Python `3.14.8` 变为 `3.13` 请求。这是对版本号做算术运算，并非请求向前数第 N 个发行版。

在 `mise.toml` 中，也可以通过表格形式指定请求类型，而不是使用前缀：

```toml [mise.toml]
[tools]
go = { prefix = "1.20" }
"npm:github:owner/repo" = { ref = "main" }
node = { path = "/opt/homebrew/opt/node@24" }
```

## 请求的解析顺序 {#how-requests-resolve}

mise 按以下顺序解析请求：

1. 如果[锁文件](/dev-tools/mise-lock.html)中有该请求对应的条目，mise 就使用锁定版本。
2. 展开别名，例如 Node.js 的 `lts` 会变为 `24`。
3. 如果已安装版本符合请求，mise 就会使用它。新发布的版本不会自动改变当前环境，必须主动安装或升级。
4. 否则，mise 会向工具后端查询可用版本并选择匹配项。

每个后端自行定义 `latest` 的含义。例如，github 后端会使用 GitHub 标记为 Latest 的发行版，
大多数后端会忽略预发行版本。不要假设 `latest` 一定是语义化版本号最高的版本，也不要假设
工具遵循 semver：有些工具使用日期、`nightly` 这类渠道名称或 `lts-jod` 这类版本名。

`mise install node@24` 会根据可用发行版解析参数，因此即使已安装较旧的 24.x，也会安装最新
的 24.x。`mise use node@24` 和 `mise exec node@24` 等其他命令会复用已安装的匹配版本。在
命令行中请求 `latest` 时，例如 `mise exec node@latest -- node --version`，总会检查最新发行版。

要查看请求解析到的版本：

```sh
mise ls --current node          # 当前目录使用的版本
mise latest --installed node@24 # 已安装的匹配版本
mise latest node@24             # 可用的最新匹配版本
mise outdated                   # 有较新匹配版本的已配置工具
```

要将项目升级到较新发行版，请参阅[升级工具](/dev-tools/#upgrade-tools)。设置
`MISE_NODE_VERSION=22`（或任意工具对应的 `MISE_<TOOL>_VERSION`）后，对能读取该变量的命令，
它会覆盖所有配置文件；参见
[MISE\_\* variables](/configuration/environment-variables.html).

## 版本排序 {#version-ordering}

大多数后端会保留来源返回的版本顺序，mise 会选择该顺序中最后一个匹配项。对于 aqua、github、
gitlab、forgejo 和 http 后端，如果发行版顺序不固定（例如 2.0 发布后又发布 1.x 回移版本），
可设置 `version_order = "semver"`，让 `latest`、前缀请求和 `mise ls-remote` 按语义化版本
优先级排序：

```toml [mise.toml]
[tools]
"github:owner/tool" = { version = "latest", version_order = "semver" }
```

`nightly` 等不符合 semver 的版本会按来源顺序排在语义化版本之前，并且仍可精确匹配。构建元数据
不会影响优先级。对于 `latest`，后端标记为最新的发行版（例如 GitHub 的 Latest release）仍会
胜出；但如果该发行版没有当前工具对应的制品，则不会胜出。这种情况可能出现在同时发布多个产品的仓库中。

注册表条目可以为工具设置 `version_order`，因此 `ripgrep` 这样的简写名称可能已经使用 semver
排序。设置 `version_order = "source"` 可恢复为后端提供的顺序。packslip 后端始终按 semver 排序。

## 同时使用多个工具版本 {#multiple-versions}

一个工具可以同时请求多个版本。mise 会全部安装，并使用第一个版本提供不带版本后缀的命令：

```toml [mise.toml]
[tools]
python = ["3.14", "3.13"]
```

```sh
mise exec -- python --version     # 3.14.x
mise exec -- python3.13 --version # 3.13.x
```

## 固定版本或使用锁文件 {#pin-vs-lockfile}

`"24"` 这样的请求允许每台机器使用任意 24.x 版本。若要让所有机器使用相同发行版，可以
固定版本或使用锁文件：

- `mise use --pin node@24` 会将解析后的版本写入 `mise.toml`，例如
  `node = "24.21.0"`, to `mise.toml`. The [`pin`](/configuration/settings.html#pin)
  setting makes this the default; `--fuzzy` overrides it.
- [锁文件](/dev-tools/mise-lock.html)会在 `mise.toml` 中保留 `node = "24"`，并在
  `mise.lock` 中记录解析后的版本、下载 URL 和校验和。`mise upgrade` 会在请求范围内升级
  锁文件记录的版本。

## `.tool-versions` 文件 {#tool-versions}

mise 会像读取 `mise.toml` 一样，从当前目录及其父目录读取 asdf 的 `.tool-versions` 文件。
如果团队成员仍在使用 asdf，可以使用该文件；否则建议使用 `mise.toml`，它还支持
`.tool-versions` 无法表达的选项、环境变量和任务。

```text [.tool-versions]
node        24.11.1      # 可以添加注释
ruby        3            # 前缀请求
shellcheck  latest
python      3.14 3.13    # 请求多个版本；第一个为默认版本
go          prefix:1.20  # 最新的 1.20.x，而非名称为 1.20 的发行版
shfmt       path:./shfmt # 使用已有目录
deno        sub-1:latest # 比最新版本低一个主版本
```

asdf 要求使用精确版本，因此共享文件中应填写 `mise use --pin` 写入的具体版本。若 asdf 用户也会
读取该文件，请勿使用 `3`、`latest`、`prefix:`、`sub-` 等前缀、`aqua:jqlang/jq` 等后端名称，
以及大多数别名。同一目录中的 `mise.toml` 和 `.tool-versions` 都声明某个工具时，以 `mise.toml`
为准。如何与 asdf 用户共享文件，请参阅[从 asdf 迁移](/dev-tools/comparison-to-asdf.html)；
文件格式则见 [asdf 文档](https://asdf-vm.com/manage/configuration.html#tool-versions)。

## 生态惯用版本文件 {#idiomatic-version-files}

生态惯用版本文件是其他工具已经在使用的版本文件，例如 `.nvmrc` 或 `.python-version`。
项目可借助这些文件声明版本，而不必依赖 mise。mise 只会为你启用的工具读取这些文件：

```sh
mise settings add idiomatic_version_file_enable_tools node
```

这些文件接受与对应工具相同的别名，因此包含 `lts/hydrogen` 的 `.nvmrc` 可同时用于 mise 和 nvm。

### 启用生态惯用版本文件 {#enabling-idiomatic-version-files}

[`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools)
列出 mise 会读取其惯用版本文件的工具。默认列表为空，原因见
[讨论 #4345](https://github.com/jdx/mise/discussions/4345)。若要停止读取某个工具的文件，
例如让 uv 管理 `.python-version`，请从全局配置的列表中移除该工具，或运行
`mise settings unset idiomatic_version_file_enable_tools` 清空列表。

若要关闭某个文件，同时保留该工具的其他文件，请将 `tool:filename` 项添加到
[`idiomatic_version_file_disable_files`](/configuration/settings.html#idiomatic_version_file_disable_files).
例如，这样可以继续为 Node.js 读取 `.nvmrc`，同时让包管理器处理 `package.json`：

```sh
mise settings add idiomatic_version_file_disable_files node:package.json
```

查找和解析这些文件会带来少量开销。注册表解析器在 mise 内部运行；插件提供的文件可能会调用
插件自身的解析器。解析结果会[缓存](/cache-behavior.html)。

### 支持的文件 {#supported-files}

<!-- mise:idiomatic-version-files:start -->

| 插件          | 惯用版本文件                                                                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atmos         | `.atmos-version`                                                                                                                                                                                                                                                                                           |
| bazel         | `.bazelversion`                                                                                                                                                                                                                                                                                            |
| bun           | `.bun-version`, `package.json`                                                                                                                                                                                                                                                                             |
| chezmoi       | `.chezmoiversion`                                                                                                                                                                                                                                                                                          |
| cmake         | `CMakeLists.txt`                                                                                                                                                                                                                                                                                           |
| crystal       | `.crystal-version`                                                                                                                                                                                                                                                                                         |
| dagger        | `dagger.json`                                                                                                                                                                                                                                                                                              |
| deno          | `.deno-version`, `package.json`                                                                                                                                                                                                                                                                            |
| dotnet        | `global.json`                                                                                                                                                                                                                                                                                              |
| earthly       | `Earthfile`                                                                                                                                                                                                                                                                                                |
| elixir        | `.exenv-version`                                                                                                                                                                                                                                                                                           |
| go            | `.go-version`, `go.mod`, `go.work`                                                                                                                                                                                                                                                                         |
| golangci-lint | `.golangci.yml`, `.golangci.yaml`, `.golangci.toml`, `.golangci.json`                                                                                                                                                                                                                                      |
| goreleaser    | `.config/goreleaser.yml`, `.config/goreleaser.yaml`, `.goreleaser.yml`, `.goreleaser.yaml`, `goreleaser.yml`, `goreleaser.yaml`                                                                                                                                                                            |
| java          | `.java-version`, `.sdkmanrc`                                                                                                                                                                                                                                                                               |
| lefthook      | `lefthook.yml`, `lefthook.yaml`, `.lefthook.yml`, `.lefthook.yaml`, `lefthook.toml`, `.lefthook.toml`, `lefthook.json`, `.lefthook.json`, `lefthook.jsonc`, `.lefthook.jsonc`, `.config/lefthook.yml`, `.config/lefthook.yaml`, `.config/lefthook.toml`, `.config/lefthook.json`, `.config/lefthook.jsonc` |
| nim           | `.nim-version`                                                                                                                                                                                                                                                                                             |
| node          | `.nvmrc`, `.node-version`, `package.json`                                                                                                                                                                                                                                                                  |
| npm           | `package.json`                                                                                                                                                                                                                                                                                             |
| opentofu      | `.opentofu-version`                                                                                                                                                                                                                                                                                        |
| packer        | `.packer-version`                                                                                                                                                                                                                                                                                          |
| perl          | `.perl-version`                                                                                                                                                                                                                                                                                            |
| pixi          | `pixi.toml`, `pyproject.toml`                                                                                                                                                                                                                                                                              |
| pnpm          | `package.json`                                                                                                                                                                                                                                                                                             |
| pre-commit    | `.pre-commit-config.yaml`                                                                                                                                                                                                                                                                                  |
| python        | `.python-version`, `.python-versions`                                                                                                                                                                                                                                                                      |
| ruby          | `.ruby-version`, `Gemfile`                                                                                                                                                                                                                                                                                 |
| ruff          | `ruff.toml`, `.ruff.toml`                                                                                                                                                                                                                                                                                  |
| rust          | `rust-toolchain.toml`                                                                                                                                                                                                                                                                                      |
| swift         | `.swift-version`                                                                                                                                                                                                                                                                                           |
| task          | `Taskfile.yml`, `Taskfile.yaml`, `taskfile.yml`, `taskfile.yaml`                                                                                                                                                                                                                                           |
| terraform     | `.terraform-version`                                                                                                                                                                                                                                                                                       |
| terragrunt    | `.terragrunt-version`                                                                                                                                                                                                                                                                                      |
| terramate     | `.terramate-version`                                                                                                                                                                                                                                                                                       |
| yarn          | `.yvmrc`, `package.json`                                                                                                                                                                                                                                                                                   |
| zig           | `.zig-version`                                                                                                                                                                                                                                                                                             |

<!-- mise:idiomatic-version-files:end -->

asdf 和 vfox 插件还可以声明各自支持的文件。注册表条目可以使用与
[HTTP 后端](/dev-tools/backends/http.html)相同的 `version_regex`、`version_json_path` 和
`version_expr` 解析器，从结构化文件中提取版本。因此，通过 `aqua:`、`github:` 等后端安装的
工具，无需插件也可以读取 JSON 清单及其他工具专属文件。`.bazelversion` 的取值方式请参阅
[Bazel 指南](/mise-cookbook/bazel.html)。

asdf 将这些文件称为“旧版版本文件”。mise 称其为“生态惯用版本文件”，以便区分各生态系统
自身的约定和 mise 配置。

### mise 会读取哪些字段 {#which-fields-mise-reads}

mise 只读取声明项目实际使用哪个版本构建的字段，不读取声明最低兼容版本的字段；最低兼容版本
是面向项目使用者的下限。一个仍支持 Node.js 18 或 CMake 3.25 的库，几乎肯定并非用这些版本
开发。若将最低版本下限当作请求解析，就会把所有人固定在最旧的受支持版本；若将其视为范围，
则会选到最新版本。

配置格式的主版本号则不同。GoReleaser 配置中的 `version: 2` 指定了与 CLI 主版本绑定的架构，
因此 mise 会读取它，并选择最新的 GoReleaser 2.x。

::: warning 已弃用的最低版本字段
mise 过去会将两个最低版本下限当作版本请求读取：`go.mod` 中的 `go X.Y` 指令，以及
`CMakeLists.txt` 中的 `cmake_minimum_required`。这两种用法现已弃用；解析版本时会发出警告，
并将从 mise 2026.11.0 起停止读取。对于 Go，请在 `go.mod` 中添加 `toolchain goX.Y.Z` 行，
或使用 `.go-version`、`mise.toml`。对于 CMake，请使用 `mise.toml`。

在此之前，若要忽略这些最低版本下限并关闭警告，请设置
`idiomatic_version_file_ignore_minimum_versions`。此设置及其控制的行为都会在 2026.11.0 中移除：

```sh
mise settings idiomatic_version_file_ignore_minimum_versions=true
```

:::

在 `package.json` 中，mise 读取开发环境运行时和包管理器的声明，不读取 `engines` 兼容范围。
具体字段请参阅 [Node.js 指南](/lang/node.html#package-json)，Bun 和 Deno 的字段则见
[Bun 指南](/lang/bun.html)和 [Deno 指南](/lang/deno.html)。

对于 Go，mise 会从 `go.mod` 或 `go.work` 中读取 `toolchain goX.Y.Z` 指令；如果没有
`toolchain` 行，则读取精确的 `go X.Y.Z` 指令。Go 会将两者都视为最低版本，但 `go` 命令会
把自身运行的版本写入这些指令，因此 mise 将它们视为项目实际使用的构建版本。当前生效的工作区
优先于其下的模块。示例和 `GOWORK` 的行为请参阅 [Go 指南](/lang/go.html)。
