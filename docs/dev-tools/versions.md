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
| Exact version                     | `"24.11.1"`                        | That release.                                                                                             |
| Prefix                            | `"24"`, `"3.14"`                   | A release that starts with the prefix. If a release is named exactly the prefix, that release is chosen.  |
| `latest`                          | `"latest"`                         | The release the tool's backend considers newest.                                                          |
| Alias                             | `"lts"`, `"project-lts"`           | The request an alias stands for, such as Node.js `lts` (`24`) or a [tool alias](/dev-tools/aliases.html). |
| `prefix:`                         | `"prefix:1.20"`                    | A release that starts with the prefix, even when a release has exactly that name.                         |
| `ref:`, `tag:`, `branch:`, `rev:` | `"ref:main"`                       | A build from a version-control reference, on backends that build from source.                             |
| `path:`                           | `"path:/opt/homebrew/opt/node@24"` | An existing directory, used as the installation.                                                          |
| `system`                          | `"system"`                         | No mise installation. mise adds nothing to `PATH` for the tool, so the copy already on `PATH` runs.       |
| `sub-`                            | `"sub-1:latest"`                   | The result of subtracting from another request's resolved version.                                        |

A prefix matches at separators: `1.2` matches `1.2.3` and `1.2+build`, but not
`1.20`. Prefixes and `latest` skip prereleases such as `1.0.0-rc1` unless you
request one exactly or set the `prerelease` [tool option](/dev-tools/#tool-options).

The same requests work on the command line (`mise use node@24`,
`mise exec go@prefix:1.20 -- go version`) and in `.tool-versions`. mise does not
accept npm-style ranges such as `^24` or `>=20` outside `package.json`: it warns
and then treats the range as a literal version, which fails to install.

`mise use node` without a version writes `latest`. `mise install node` and
`mise exec node` use the version the config selects, or `latest` when no config
declares the tool.

### Prefix, reference, path, and subtraction requests {#scopes}

`prefix:<PREFIX>` exists for tools that publish a release named like a prefix.
Go releases before 1.21 were named `1.20`, then `1.20.1`, so `go = "1.20"`
selects the `1.20` release itself. `go = "prefix:1.20"` selects the newest
1.20.x release instead.

`ref:<REF>` builds from a branch, tag, or commit. `tag:`, `branch:`, and `rev:`
name the kind of reference explicitly. Support depends on the backend: npm
packages from Git accept all four, cargo packages from Git accept `tag:`,
`branch:`, and `rev:` but not `ref:`, `spm` packages accept `ref:` and `rev:`,
and plugins accept the references they implement. The Python and Erlang core
tools do not build from references.

`path:<PATH>` uses a directory you built or installed elsewhere, such as a
Homebrew keg (`path:/opt/homebrew/opt/node@24`). `~/` expands to your home
directory, and a relative path resolves from the declaring config's
[config root](/configuration.html#config-root), or from the current directory on
the command line. On Windows, both separators work and mise stores the
forward-slash form. In TOML, a backslash starts an escape inside a
double-quoted string, so write a Windows path as a literal string
(`{ path = 'C:\tools\node' }`) or double the backslashes (`"C:\\tools\\node"`).
`"C:\tools\node"` is not rejected: TOML reads `\t` as a tab, so the path
silently changes. On Windows, mise rejects a path that contains a `cmd.exe`
metacharacter (`& | < > ^ %`), because the path is passed to plugins that build
shell commands with it. 该目录会在未安装工具的情况下直接使用，因此项目配置中指定此类路径时[需要信任](/security.html#what-needs-trust)，而[安全模式](/security.html#safe-mode)会忽略它。

`sub-<PARTIAL>:<REQUEST>` resolves `REQUEST`, subtracts `PARTIAL` from the
matching components of the result, and resolves what remains as a prefix.
`sub-2:lts` turns Node.js `24` into `22`, and `sub-0.1:latest` turns Python
`3.14.8` into a request for `3.13`. This is arithmetic on version numbers, not a
request for the Nth previous release.

In `mise.toml`, a table can name the request kind instead of a prefix:

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

`.tool-versions` 或惯用版本文件可以是符号链接，指向其他位置同名的版本文件，例如 monorepo 中共享的文件。如果链接指向不同名称的文件，mise 不会读取该文件，并会警告 `not reading <path>: it is a symlink to a file of another name`：否则，项目可能将它指向 `~/.netrc` 等文件，并让其内容作为工具名称和版本显示。你自己的文件不受此限制：全局配置中的 `~/.tool-versions` 以及直接位于主目录中的版本文件可以链接到任意名称的文件。目标文件仍会以自身名称读取：如果 `.nvmrc` 链接到旁边的 `.node-version`，mise 会跳过 `.nvmrc` 且不发出警告，并读取 `.node-version`。

### Enable idiomatic version files {#enabling-idiomatic-version-files}

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

asdf and vfox plugins can declare more files of their own. Registry entries can
describe how to extract a version from a structured file with the same
`version_regex`, `version_json_path`, and `version_expr` parsers as the
[HTTP backend](/dev-tools/backends/http.html), so tools installed through
backends such as `aqua:` and `github:` can read JSON manifests and other
tool-specific files without a plugin. For `.bazelversion` values, see the
[Bazel cookbook](/mise-cookbook/bazel.html).

asdf calls these files "legacy version files". mise calls them idiomatic
version files to separate an ecosystem's own conventions from mise's
configuration.

### Which fields mise reads {#which-fields-mise-reads}

mise reads only fields that declare the version a project is built with. It
ignores fields that declare a minimum compatible version, which is a floor for
the project's consumers. A library that still supports Node.js 18 or CMake 3.25
is almost certainly not developed with it, so resolving the floor would pin
everyone to the oldest supported release or, read as a range, to the newest.

A configuration-format major is different. A GoReleaser config's `version: 2`
selects a schema that is tied to the CLI major, so mise reads it and selects the
newest GoReleaser 2.x.

::: tip 最低版本字段已移除
mise 不再将两个最低版本字段作为版本请求读取：`go.mod` 中的 `go X.Y` 指令和 `CMakeLists.txt` 中的 `cmake_minimum_required`。对于 Go，请在 `go.mod` 中添加 `toolchain goX.Y.Z` 行，或使用 `.go-version`、`mise.toml`。对于 CMake，请使用 `mise.toml`。

:::

在 `package.json` 中，mise 读取开发环境运行时和包管理器的声明，不读取 `engines` 兼容范围。
具体字段请参阅 [Node.js 指南](/lang/node.html#package-json)，Bun 和 Deno 的字段则见
[Bun 指南](/lang/bun.html)和 [Deno 指南](/lang/deno.html)。

对于 Go，mise 会从 `go.mod` 或 `go.work` 中读取 `toolchain goX.Y.Z` 指令；如果没有
`toolchain` 行，则读取精确的 `go X.Y.Z` 指令。Go 会将两者都视为最低版本，但 `go` 命令会
把自身运行的版本写入这些指令，因此 mise 将它们视为项目实际使用的构建版本。当前生效的工作区
优先于其下的模块。示例和 `GOWORK` 的行为请参阅 [Go 指南](/lang/go.html)。
