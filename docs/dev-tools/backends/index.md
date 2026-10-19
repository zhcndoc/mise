---
description: "选择工具后端、编写后端标识，并控制工具简称使用哪个后端。"
---

# 后端

后端是 mise 安装工具时使用的来源。它会列出工具版本、下载或构建你指定的版本，并告知 mise 可执行文件的位置。注册表中的简称（如 `ripgrep`）会替你选择后端；也可以写出 `github:BurntSushi/ripgrep` 这样的标识符来指定后端。

## 后端标识符 {#identifiers}

<span id="what-are-backends"></span>
<span id="backend-specific-settings"></span>

标识符由后端名称、冒号以及该后端中的工具名称组成。可以在末尾加上 `@` 和版本请求：

```sh
mise ls-remote github:BurntSushi/ripgrep
mise use github:BurntSushi/ripgrep@15
mise exec -- rg --version
```

在 `github:BurntSushi/ripgrep@15` 中，`github` 是后端，`BurntSushi/ripgrep` 是项目，`15` 是版本请求。`mise use` 会从该项目的 GitHub Releases 安装 ripgrep，并将标识符写入 `mise.toml`：

```toml
[tools]
"github:BurntSushi/ripgrep" = "15"
```

冒号后面的部分由后端用来查找工具，例如 `github:` 使用 `owner/repo`，`npm:` 使用包名，`go:` 使用模块路径。各后端的文档会列出可用格式。工具名称后还可以用方括号指定选项，例如 `'pypi:black[extras=jupyter]'`。选项因后端而异：`pypi:` 支持的选项对 `aqua:` 没有意义，添加前请查看对应后端的文档。

任何标识符都可以直接写入 `mise.toml`，不需要注册表条目；[注册表](/registry.html)只负责提供简称。运行 `mise backends ls` 可查看当前 mise 支持的后端。Node.js、Python 等内置支持的工具使用 `core` 后端（例如 `core:node`），详见[核心工具](/core-tools.html)。

版本不一定遵循语义化版本规范。每个后端会自行定义 `latest` 和 `20` 这样的版本前缀分别表示什么，详见[版本请求](/dev-tools/versions.html)。

## 选择哪个后端 {#which-backend-to-use}

<span id="choose-an-installation-source"></span>
<span id="backend-types"></span>
<span id="when-to-use-each-backend"></span>
<span id="backend-capabilities-comparison"></span>

优先使用工具在注册表中的简称。如果要自行选择后端，优先选择能直接安装发布方预构建版本的后端：

1. 发布方使用 packslip 清单签署发行包时，选择 `packslip:`。mise 会检查签名者和每个制品的摘要。
2. 工具已收录在 aqua 注册表中时选择 `aqua:`；也可以为托管在相应代码托管平台的发行资源选择 `github:`、`gitlab:` 或 `forgejo:`。
3. 自行托管归档文件时选择 `http:` 或 `s3:`。
4. 工具只以语言包形式发布，或需要 Cargo features、Python extras 等包选项时，选择对应的语言包后端。此时还需要提供该语言的运行时。
5. 只有安装工具确实需要自定义逻辑时才使用插件。

| 后端                                                                                                                              | 安装内容                                       | 示例                               | 依赖条件                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- | ------------------------------------------------ |
| [packslip](/dev-tools/backends/packslip.html)                                                                                     | 带签名清单的发行包                             | `packslip:github.com/jdx/hk`       | 发布方提供 packslip 清单                           |
| [aqua](/dev-tools/backends/aqua.html)                                                                                             | aqua 注册表描述的发行资源                      | `aqua:BurntSushi/ripgrep`          | 注册表中有该工具的条目                              |
| [github](/dev-tools/backends/github.html)、[gitlab](/dev-tools/backends/gitlab.html)、[forgejo](/dev-tools/backends/forgejo.html) | 代码托管平台上的发行资源                         | `github:BurntSushi/ripgrep`        | 有适用于当前操作系统和架构的发行资源                  |
| [http](/dev-tools/backends/http.html)、[s3](/dev-tools/backends/s3.html)                                                          | 指定 URL 上的归档文件                           | 使用 `url` 选项的 `http:my-tool`   | 下载 URL；S3 还需要 AWS 凭据                        |
| [cargo](/dev-tools/backends/cargo.html)                                                                                           | Rust crate                                    | `cargo:eza`                        | Rust；预构建二进制需要 cargo-binstall                |
| [go](/dev-tools/backends/go.html)                                                                                                 | Go 模块                                       | `go:github.com/DarthSim/hivemind`  | Go                                               |
| [npm](/dev-tools/backends/npm.html)                                                                                               | npm 包                                        | `npm:prettier`                     | 运行大多数包需要 Node.js                            |
| [pypi](/dev-tools/backends/pypi.html)（也支持 `pipx:`）                                                                           | Python 包                                     | `pypi:black`                       | uv 或 pipx，以及 Python                            |
| [gem](/dev-tools/backends/gem.html)                                                                                               | Ruby gem                                      | `gem:rubocop`                      | Ruby                                             |
| [dotnet](/dev-tools/backends/dotnet.html)                                                                                         | NuGet 上的 .NET 工具                          | `dotnet:GitVersion.Tool`           | .NET SDK 和工具的运行时                            |
| [spm](/dev-tools/backends/spm.html)                                                                                               | Swift 包中的可执行文件                         | `spm:nicklockwood/SwiftFormat`     | Swift                                            |
| [conda](/dev-tools/backends/conda.html)                                                                                           | Conda 包及其依赖                              | `conda:ffmpeg`                     | 无其他依赖                                        |
| [spinel](/dev-tools/backends/spinel.html)（实验性）                                                                               | 编译为原生可执行文件的 Ruby 程序                | `spinel:tobi/try`                  | `experimental = true`、Spinel、Git、C 编译器      |
| [vfox](/dev-tools/backends/vfox.html)                                                                                             | 由 Lua 插件安装的工具                           | `vfox:version-fox/vfox-cmake`      | 信任插件代码                                      |
| [asdf](/dev-tools/backends/asdf.html)（旧版）                                                                                    | 由 shell 脚本插件安装的工具                     | `asdf:MetricMike/asdf-awscli`      | Bash 和 Unix 工具；Windows 不支持                  |
| [ubi](/dev-tools/backends/ubi.html)（已弃用）                                                                                     | GitHub 和 GitLab 发行资源                      | `ubi:BurntSushi/ripgrep`           | 请迁移到 `github:`                                |
| core                                                                                                                              | mise 内置工具                                  | `core:node`                        | 参见[核心工具](/core-tools.html)                   |

语言包后端（cargo、go、npm、pypi、gem、dotnet）会将命令行工具分别安装到独立目录。它们不管理项目依赖；请继续在 `package.json`、`Cargo.toml`、`go.mod`、`Gemfile` 或 `pyproject.toml` 中管理依赖，或参阅[项目依赖](/dev-tools/deps.html)。

验证方式因后端和工具而异。只有发布方提供签名或来源证明时，后端才能进行相应检查。依赖某项检查前，请阅读[安全说明](/security.html)。

`ubi:` 已弃用：mise 使用它时会发出警告，并将在 mise 2027.1.0 中移除。请改用 `github:` 后端（其他托管服务可使用 `gitlab:` 或 `http:`），详见 [ubi 迁移指南](/dev-tools/backends/ubi.html)。

[后端插件](/backend-plugin-development.html)可以添加自定义后端，并用专属前缀管理一类工具。注册表对新简称可使用的后端有更严格的规定，详见[后端准入等级](/contributing/registry.html#backend-acceptance-tiers)。

## mise 如何选择后端 {#how-backend-selection-works}

带有后端前缀的标识符（如 `aqua:BurntSushi/ripgrep`）始终使用指定后端。对于 `ripgrep` 这样的简称，mise 会按以下顺序使用第一个适用的来源：

1. A [`MISE_BACKENDS_<TOOL>`](#environment-variable-overrides) environment
   variable.
2. A [`[tool_alias]`](/dev-tools/aliases.html) entry that names a backend, such
   as `node = "core:node"`.
3. 配置文件 `[plugins]` 中为该工具指定的插件 URL。
4. [`mise.lock`](/dev-tools/mise-lock.html) 中记录的工具后端，前提是该后端支持所请求的版本。
5. 同名的已安装插件，除非其后端已禁用。
6. 工具注册表条目中第一个满足以下条件的后端：可在当前平台运行、未列入 [`disable_backends`](#disable-backends)，并支持所请求的版本。实验性后端只有在设置 [`experimental = true`](/configuration/settings.html#experimental) 后才会参与选择。

`mise tool` 会显示最终结果，`mise registry` 会按顺序显示注册表中的后端列表：

```sh
mise tool ripgrep --backend
# aqua:BurntSushi/ripgrep
mise registry ripgrep
# aqua:BurntSushi/ripgrep asdf:https://gitlab.com/wt0f/asdf-ripgrep cargo:ripgrep
```

注册表将工具切换到另一个后端时，锁文件会让工具继续使用其中记录的后端，同时 mise 会提示注册表已有更新的后端。运行 [`mise backends switch`](/cli/backends/switch.html) 可将这些锁定条目切换到注册表当前使用的后端，并重新安装受影响的版本。

### 按版本选择后端 {#version-specific-backends}

注册表条目可以限制某个后端适用的工具版本范围。hk 的条目规定从 1.58.1 起使用 packslip，因此 `mise use hk@1.58.0` 会从 aqua 安装，而 `mise use hk@1.58.1` 会从 packslip 安装。完全低于边界的前缀（如 `hk@1.57`）也会使用 aqua。`latest` 以及跨越边界的前缀（如 `hk@1.58`）仍按常规顺序选择。

后端还可以设置不包含在内的 `max_version`：低于该版本的请求使用此后端，更新的版本则使用列表中的下一个后端。这些边界只适用于简称：显式标识符会忽略边界，匹配的锁文件条目则继续使用其中记录的后端。注册表格式详见[后端最低版本](/contributing/registry.html#minimum-backend-versions)。

## 手动选择后端 {#choose-a-backend-yourself}

<span id="configuration-and-overrides"></span>
<span id="force-backend-for-tool"></span>
<span id="registry-system"></span>

要在某个项目中使用指定来源，请将它的标识符写作键名：

```toml [mise.toml]
[tools]
"aqua:BurntSushi/ripgrep" = "15"
```

如果希望在 `[tools]` 中保留简称、只切换后端，可以添加[工具别名](/dev-tools/aliases.html)。别名与工具配置位于同一文件，团队成员也会使用相同的后端：

```toml [mise.toml]
[tool_alias]
node = "core:node"

[tools]
node = "24"
```

### 环境变量覆盖 {#environment-variable-overrides}

`MISE_BACKENDS_<TOOL>` 可以为某个简称指定后端，其优先级高于别名、锁文件和注册表。可在单条命令或 CI 任务中使用：

```sh
# 从 GitHub Releases 安装 ripgrep，而不是使用 aqua
MISE_BACKENDS_RIPGREP='github:BurntSushi/ripgrep' mise install ripgrep@15
```

将工具名称转成大写，并把 `-` 替换为 `_`：`my-tool` 对应 `MISE_BACKENDS_MY_TOOL`。导出的覆盖变量会影响该 shell 中之后运行的所有命令；如果两台机器对同一简称的解析结果不同，请检查环境变量。

### 禁用后端 {#disable-backends}

设置 [`disable_backends`](/configuration/settings.html#disable_backends)，即可阻止 mise 通过指定后端解析或安装工具。若要全局生效，请将它写入全局配置：

```toml [~/.config/mise/config.toml]
[settings]
disable_backends = ["asdf", "vfox"]
```

运行 `mise settings disable_backends=asdf,vfox` 也会将相同设置写入全局配置。该命令会替换整个列表，因此要列出所有想禁用的后端。

之后解析简称时会跳过注册表中的这些后端；安装 `asdf:owner/asdf-tool` 这样的显式标识符则会失败。已安装的版本会保留在磁盘上，重新启用后端即可继续使用。无论此设置如何，mise 在 Windows 上都不会使用 asdf 后端。

## 故障排查 {#troubleshooting}

<span id="verify-the-result"></span>
<span id="troubleshooting-backend-issues"></span>
<span id="debug-backend-selection"></span>

运行以下命令可以查看简称的解析原因：

```sh
mise tool node --backend   # the backend mise uses
mise registry node         # the registry's backends, in order
mise plugins ls            # installed plugins, which can replace the registry choice
mise config ls             # config files that apply in this directory
mise ls --current          # selected versions and where each was set
```

`mise ls-remote` 列出的版本仍可能没有适用于当前操作系统和架构的构建产物。运行 `mise use` 后，可用 `mise exec -- <command> --version` 启动工具。如果 mise 找不到匹配的资源，请查看对应后端文档中的平台和资源选项。如果后端选择正确但安装失败，请检查依赖条件和身份验证。设置 `MISE_DEBUG=1 mise install <tool>` 可输出诊断信息；分享之前请移除其中的凭据。

为确保安装结果可复现，请将解析后的版本和校验和记录在 [`mise.lock`](/dev-tools/mise-lock.html) 中。
