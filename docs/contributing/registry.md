---
description: "向 mise 注册表添加常用工具的简写名称：了解受欢迎度门槛、支持的后端、条目格式和测试方法。"
outline: [2, 3]
---

# 向注册表添加工具

注册表条目为广泛使用的工具提供简短名称，因此无需指定后端即可运行 `mise use ripgrep`。大多数新增条目提案会被拒绝；提交前请先查看[受欢迎程度门槛](#popularity-bar)和[后端分级](#backend-acceptance-tiers)。

使用工具并不需要注册表条目。`mise use github:owner/repo`、`mise use aqua:owner/repo` 和 `mise use cargo:name` 无需条目即可安装工具；对于没有后端能够安装的工具，可以编写[工具插件](/tool-plugin-development.html)。注册表只负责添加简写。

这些规则适用于新增工具和简写。修复现有条目无需提供受欢迎程度的证据。

## 快速开始 {#quick-start}

1. 根据[受欢迎程度门槛](#popularity-bar)检查该工具是否符合要求。
2. 从[后端分级](#backend-acceptance-tiers)中选择后端：项目发布了签名发行清单时使用 `packslip`；否则，若工具已列入 aqua 注册表则使用 `aqua`；其他情况使用 `github` 或 `gitlab`。
3. 确认后端能够列出可安装的版本：

   ```sh
   mise ls-remote aqua:owner/repo
   ```

   仅能安装你显式指定的某个版本还不够。

4. 按照[条目格式](#registry-format)创建 `registry/<name>.toml`，并添加[测试](#tool-testing)。
5. 构建 mise，并使用该构建测试条目。注册表会编译进二进制文件，因此已安装的 mise 看不到你创建的文件：

   ```sh
   mise run build
   target/debug/mise test-tool your-tool
   ```

6. 创建标题为 `registry: add your-tool (aqua:owner/repo)` 的拉取请求，并在说明中添加 `## Popularity` 部分。

## 受欢迎程度门槛 {#popularity-bar}

<span id="guidelines-and-requirements"></span>

注册表只收录已经广泛使用的工具。通常需要数千个 GitHub Star、持续维护，以及作者自己项目之外的实际使用案例。个人、内部、小众或人气较低的工具，以及分叉项目，都不符合门槛。安装器可用或测试通过还不够。@jdx 不会逐一解释某个工具未获收录的原因。

提交条目前，请查找当前数据并将其写入拉取请求说明：

```md
## Popularity

- GitHub: 12.3k stars, 480 forks, last release 2026-04-12
- crates.io: 1.2M downloads
- Used by: <project A>, <project B>
```

有用的证据包括 Star 和分叉数量、近期发行版、工具包注册表中的下载量，以及其他项目使用该工具的文档或工具。

## 后端分级 {#backend-acceptance-tiers}

为条目选择的后端与工具本身同样重要。以下分级仅适用于注册表条目；你可以在自己的配置中使用任意后端。

| 级别                  | 后端                                          | 收录条件                                                                            |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1，优先                | `packslip`                                    | 项目发布经过签名的发行清单                                                          |
| 2，通常可接受          | `aqua`、`github`、`gitlab`                    | 项目未发布 packslip 清单                                                            |
| 3，门槛较高            | `conda`                                       | 第 1 或第 2 级后端都无法合理地安装该工具                                            |
| 4，门槛极高            | `npm`、`pypi`、`gem`、`cargo`、`go`、`dotnet` | 第 1 或第 2 级后端都无法安装；工具广泛使用，且事先获得 jdx 同意                     |
| 不收录                | `asdf`、`vfox`、`ubi`                         | 新条目一律不接受                                                                    |

[`packslip`](/dev-tools/backends/packslip.html) 无需插件或独立包管理器，即可验证签名者和产物摘要。

项目未发布 packslip 清单时，如果该工具已列入 [aqua 注册表](https://github.com/aquaproj/aqua-registry)，请使用 [`aqua`](/dev-tools/backends/aqua.html)：其配方包含逐版本逻辑、SLSA 和其他验证元数据。如果工具未收录在 aqua 注册表中，但通过 GitHub 发行，请使用 [`github`](/dev-tools/backends/github.html)；若通过 GitLab 发行，则使用 [`gitlab`](/dev-tools/backends/gitlab.html)。

[`conda`](/dev-tools/backends/conda.html) 的门槛低于第 4 级，因为它不需要单独安装包管理器：mise 无需 `conda`、`mamba` 或 `micromamba`，就能直接从 anaconda.org 下载并解压软件包。工具仍必须广泛使用且维护良好。

第 4 级后端依赖用户机器上的语言运行时或工具链。[npm](/dev-tools/backends/npm.html) 工具需要 Node.js 才能运行，[gems](/dev-tools/backends/gem.html) 依赖安装它们时使用的 Ruby，[pypi](/dev-tools/backends/pypi.html) 需要 uv 或 pipx，[cargo](/dev-tools/backends/cargo.html) 和 [go](/dev-tools/backends/go.html) 会使用各自的工具链构建工具，[dotnet](/dev-tools/backends/dotnet.html) 则需要 .NET SDK。Go 和 Rust 工具通常以单个二进制文件发布，因此应优先使用第 1 或第 2 级后端。提交使用第 4 级后端的条目前，必须先获得 @jdx 明确同意。旧条目可能写作 `pipx:`，mise 会将其读取为 `pypi:`。

出于供应链安全原因，新的 `asdf` 和 `vfox` 条目会被拒绝。[`ubi`](/dev-tools/backends/ubi.html) 后端已弃用：mise 使用它时会发出警告，并将在 mise 2027.1.0 中移除。

[`http`](/dev-tools/backends/http.html) 不属于任何级别。对于广泛使用、提供稳定下载 URL，但没有 packslip 清单或 GitHub/GitLab 发行版的工具，只要 [`version_list_url`](/dev-tools/backends/http.html#version-list-url) 能让 `mise ls-remote` 列出版本，就可以使用此后端。分级不涵盖 `forgejo`、`s3`、`spm` 或 `spinel`；提交使用这些后端的条目前，请先在 [Discussion](https://github.com/jdx/mise/discussions) 中询问。`core:` 条目指向内置于 mise 的[核心工具](/core-tools.html)，不通过注册表贡献。

## 条目格式 {#registry-format}

每个工具对应一个 `registry/<name>.toml` 文件，文件名就是简写。键名按字母顺序排列，因为 taplo 会按此顺序排序：

<!-- schema: skip -->

```toml
aliases = ["your-tool-cli"]
backends = [
  "packslip:github.com/owner/repo",
  "aqua:owner/repo",
  "github:owner/repo",
]
bins = ["your-tool"]
description = "One line about the tool"
os = ["linux", "macos"]
test = { cmd = "your-tool --version", expected = "{{version}}" }
url = "https://your-tool.dev"
version_order = "semver"
```

| 键                | 必填            | 含义                                                                                                 |
| ----------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `backends`        | 是              | 按优先级排列的后端；参阅[后端条目](#backend-entries)                                                |
| `version_order`   | 是              | `semver` 或 `source`；参阅[版本排序](#version-order)                                                  |
| `description`     | 建议填写        | 一行说明，显示在 `mise search` 和[注册表页面](/registry.html)                                       |
| `test`            | 新条目必填      | 安装检查；参阅[工具测试](#tool-testing)                                                              |
| `bins`            | 通常需要        | 可执行文件名称，用于在工具安装前创建 shims；参阅[可执行文件](#executables)                           |
| `aliases`         | 否              | 解析到此条目的其他名称                                                                             |
| `os`              | 否              | 工具支持的操作系统（`linux`、`macos`、`windows`）；mise 会在其他系统上跳过该工具                    |
| `url`             | 否              | 后端无法推断链接或推断错误时使用的项目主页                                                         |
| `deprecated`      | 否              | 不应继续使用此工具的原因及替代方案；mise 安装工具时会发出警告                                       |
| `idiomatic_files` | 否              | 工具读取的版本文件；参阅[惯用版本文件](#idiomatic-version-files)                                     |
| `detect`          | 否              | 当前目录存在这些文件时，交互式 `mise edit` 会自动添加该工具                                          |
| `overrides`       | 否              | 该工具的可执行文件在 `PATH` 上会覆盖的其他工具，例如 `npm` 会覆盖随 `node` 捆绑的 npm              |

`mise run lint` 会根据 [`schema/mise-registry-tool.json`](https://github.com/jdx/mise/blob/main/schema/mise-registry-tool.json) 检查文件；无法读取条目时，构建会失败。

### Backend entries {#backend-entries}

只列出支持该工具的后端：`packslip` 需要签名发行清单，`aqua` 则要求该工具已列入 aqua 注册表。mise 会使用列表中第一个已启用、适用于当前平台且支持所请求版本的后端；用户仍可通过 `aqua:owner/repo` 这样的显式标识符选择其他后端。参阅[后端选择方式](/dev-tools/backends/#how-backend-selection-works)。

<span id="backend-priority"></span>

后端也可以写成表格，而不是字符串。`full` 是后端标识符，其余键用于缩小适用范围或配置选项：

- `platforms`：该后端适用的平台。可使用操作系统（`linux`、`macos`、`windows`）、架构（`x64`、`arm64`），或两者组合（`linux-x64`、`macos-arm64`）。Windows arm64 也会匹配 `x64` 和 `windows-x64`。
- `options`：后端的[工具选项](/dev-tools/#tool-options)，例如 npm 的 `allow_builds`，或 http 的 `version_list_url` 和按平台设置的 `url`。运行 `mise tool <name>` 可查看简写所应用的选项。
- `min_version` 和 `max_version`：后端提供的版本范围；参阅[后端最低版本](#minimum-backend-versions)。
- `attestations_since`：GitHub 发行版资源文件开始全部带有证明的首个版本；参阅[要求产物证明](#required-attestations)。

较长的表格使用 `[[backends]]` 分段更易阅读。以下是 `registry/twg.toml`：

<!-- schema: skip -->

```toml
description = "Command line interface to the Atlassian Teamwork Graph and Cloud services"
os = ["linux", "macos", "windows"]
test = { cmd = "twg --version", expected = "{{version}}" }
version_order = "source"

bins = ["twg"]
[[backends]]
full = "http:twg"

[backends.options]
bin = "twg"
checksum_url = "https://teamwork-graph.atlassian.com/cli/SHA256SUMS-v{{ version }}"
url = 'https://teamwork-graph.atlassian.com/cli/twg-{{ os(macos="darwin") }}-{{ arch() }}-v{{ version }}'
# 与二进制文件一同发布的逐版本清单；.version 跟踪最新稳定发行版
version_json_path = ".version"
version_list_url = "https://teamwork-graph.atlassian.com/cli/manifest.json"

[backends.options.platforms.windows-arm64]
bin = "twg.exe"
url = "https://teamwork-graph.atlassian.com/cli/twg-windows-arm64-v{{ version }}.exe"

[backends.options.platforms.windows-x64]
bin = "twg.exe"
url = "https://teamwork-graph.atlassian.com/cli/twg-windows-x64-v{{ version }}.exe"
```

只有当软件包在关闭依赖项构建脚本时仍可安装，或像 `registry/nub.toml` 一样在 `allow_builds` 中列出所需脚本的软件包时，才可将 `npm` 作为非 npm 后端之后的后备方案。参阅[构建脚本](/dev-tools/backends/npm.html#build-scripts-and-supply-chain-checks)。

### 版本排序 {#version-order}

每个条目都必须设置 `version_order`。只有当工具的稳定发行版始终采用严格的 `MAJOR.MINOR.PATCH` 格式时，才使用 `semver`。对于日期版本、两段式版本、渠道、引用、工具专属格式、混合版本历史或无法确定的情况，请使用 `source`。`aqua`、`github`、`gitlab`、`forgejo` 和 `http` 后端会根据此设置排列版本；其他后端自行排序，但此字段仍记录工具采用的排序规则。

### 可执行文件 {#executables}

将 `bins` 设为工具的可执行文件名称，以便 mise 在下载工具之前为[延迟安装工具](/dev-tools/shims.html#lazy-tools)创建 shims。如果 `packslip` 或其他非 aqua 后端排在首位，mise 无法推断可执行文件名称，因此必须列出它们。

如果 `aqua` 排在首位，构建过程会从 aqua 注册表的文件元数据中获取命令名称。列表正确时无需设置 `bins`。如果该简写需要不同的命令集合（例如只有后备后端才提供的命令），则应设置此项。

### 项目 URL {#project-url}

注册表页面会将工具名称链接到从首个可推断 URL 的后端获取的项目地址：对于 `aqua`、`github` 等后端，链接指向代码仓库；对于 `npm`、`cargo` 等包注册表，链接指向软件包页面。`http` 和 `packslip` 无法推断 URL。如果没有后端能提供链接，或推断出的链接错误（例如工具从 monorepo 发布），请设置 `url`。此值必须是主页或仓库地址，不能是下载 URL。`mise tool` 和 `mise registry --json` 也会显示此值。

### 已弃用工具 {#deprecated-tools}

将 `deprecated` 设为不应继续使用该工具的原因及替代方案，例如上游已替换其 CLI。该条目仍可用，但 mise 每次安装工具时都会显示此消息作为警告。

## 后端最低版本 {#minimum-backend-versions}

如果后端仅支持较新的发行版，可为其设置 `min_version`。hk 从 1.58.1 开始发布 packslip 清单：

<!-- schema: skip -->

```toml
backends = [
  { full = "packslip:github.com/jdx/hk", min_version = "1.58.1" },
  "aqua:jdx/hk",
]
bins = ["hk"]
version_order = "semver"
```

最低版本包含在范围内，且必须是完整的语义化版本；条目还必须使用 `version_order = "semver"`。`mise use hk@1.57` 和 `mise use hk@1.58.0` 会选择 aqua，而 `mise use hk@1.58.1` 会选择 packslip。跨越边界的版本前缀（例如 `1.58`）仍使用优先级较高的后端。`latest`、渠道和未解析的别名遵循常规后端顺序；别名解析后会再次检查。

后端选择仍会考虑平台支持和已禁用的后端。显式后端标识符、后端覆盖项以及匹配锁文件条目中记录的后端都具有更高优先级。下载或签名检查失败时，不会回退到下一个后端。未设置 `min_version` 的后端没有最低版本限制。

### 后端最高版本 {#maximum-backend-versions}

当某个后端只提供较旧的发行版（例如将停止更新的 1.x 系列与后续主版本分开发布）时，可为其设置 `max_version`：

<!-- schema: skip -->

```toml
backends = [
  { full = "aqua:example/tool-next", min_version = "2.0.0" },
  { full = "aqua:example/tool-legacy", max_version = "2.0.0" },
]
bins = ["tool"]
version_order = "semver"
```

最高版本不包含在范围内，其规则与 `min_version` 相同。只要 `min_version` 更低，同一后端可以同时设置两者。在此示例中，`tool@1` 和 `tool@1.9.9` 会选择 `tool-legacy`，而 `tool@2` 和 `tool@2.0.0` 会选择 `tool-next`。完全处于边界版本及以上的前缀（例如 `2`）会跳过此后端；跨越边界的前缀则继续使用优先级较高的后端。边界版本的预发行版排序低于该版本，因此精确请求 `tool@2.0.0-rc.1` 会选择 `tool-legacy`，而前缀 `2` 仍会选择 `tool-next`。

`mise ls-remote tool` 会列出每个版本范围，并从对应后端获取版本：1.x 来自 `tool-legacy`，2.x 及更高版本来自 `tool-next`。如果某个后端列出的版本超出自身范围，该版本会被排除，因为安装时会选择另一个后端。仅设置 `min_version` 时也遵循相同规则：hk 的 1.58.1 及更高版本来自 packslip，更早的版本来自 aqua。指定某个范围内的版本前缀（例如 `mise ls-remote tool 1`）时，只会列出该范围对应后端提供的版本。

锁文件中记录的后端只会继续用于其支持的版本。如果锁文件记录了 `tool-legacy`，而配置改为 `tool@2`，mise 会选择 `tool-next`，不会向旧版后端请求其并未发布的发行版。

### 随版本变化的选项 {#version-ranged-options}

当某个发行版改变了后端查找文件的方式（例如资源文件改名或发布流程变化）时，可为每个版本范围分别列出后端，并为每个条目设置自己的选项：

<!-- schema: skip -->

```toml
backends = [
  { full = "github:example/tool", min_version = "2.0.0", options = { asset_pattern = "tool-v2-*" } },
  { full = "github:example/tool", max_version = "2.0.0", options = { asset_pattern = "tool-*" } },
]
bins = ["tool"]
version_order = "semver"
```

`tool@1.4.0` 会使用 `tool-*` 安装，`tool@2.1.0` 则使用 `tool-v2-*`。未按版本范围分流的请求（例如 `latest`）会使用第一个条目的选项。同一后端的条目不能为同一版本指定不同选项，除非它们通过 `platforms` 区分。旧版 mise 会将第一个条目的选项应用于所有版本，因此只有在需要修复旧版已有错误行为时才添加版本范围。

## 要求产物证明 {#required-attestations}

如果项目为发行版资源文件发布 [GitHub 产物证明](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations)，请在其 `github:` 后端设置 `attestations_since`，并指定资源文件全部带有证明的首个版本：

<!-- schema: skip -->

```toml
backends = [
  { full = "github:aubepkg/aube", attestations_since = "2.2.5" },
]
version_order = "semver"
```

从该版本开始，除非相应 GitHub 产物证明验证成功，否则 mise 不会安装或锁定资源文件，包括 `additional_asset_patterns` 中的资源文件。如果未找到证明，安装会因可能发生降级而失败，不会跳过验证；即使共享 mise-versions 缓存或锁文件报告缺少证明，也同样如此。SLSA 等其他来源证明不计入此项。

更早的版本、非语义化版本（`nightly`、`1.0`、`2024.01.15`），以及关闭了 [`github_attestations`](/configuration/settings.html#github_attestations) 或 [`github.github_attestations`](/configuration/settings.html#github.github_attestations) 的用户不受影响。

此值必须是完整的语义化版本。工具的 `version_order` 可以是任意值：mise 只会将待安装版本与边界进行比较。

只要证明中指明了工具所在仓库，以下任意一种 GitHub 证明都符合要求：

- 项目工作流生成的构建来源证明（`actions/attest-build-provenance`）。使用 `gh attestation verify <file> --repo owner/repo` 检查。
- GitHub 为不可变发行版中的每个资源文件生成的发行版证明。使用 `gh release verify-asset <tag> <file> --repo owner/repo` 检查。

请检查边界发行版及其前一个发行版中的每个资源文件。边界应是所有资源文件均验证通过的首个发行版，此后每个语义化版本也都必须通过验证。留意以乱序方式发布回移版本的项目：如果某个旧版本分支的补丁是首个带证明的发行版，那么在它之前发布的较新分支发行版也会被错误地要求提供证明。

## 惯用版本文件 {#idiomatic-version-files}

注册表条目可以让用户从该工具已有的[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)中读取版本。对于文件名，使用 mise 的纯文本解析器：

<!-- schema: skip -->

```toml
backends = ["aqua:owner/repo"]
idiomatic_files = [".your-tool-version"]
```

对于结构化文件或工具专属文件，请使用表格形式，并填写 [http 后端版本列表](/dev-tools/backends/http.html#version-list-url)支持的解析器字段：

<!-- schema: skip -->

```toml
idiomatic_files = [
  { path = "your-tool.json", version_json_path = ".toolchain.version" },
  { path = "your-tool.conf", version_regex = 'version\s*=\s*"([^"]+)"' },
]
```

- `version_regex`：提取所有匹配项；存在捕获组时使用第一个捕获组。
- `version_json_path`：使用 mise 类似 jq 的 JSON 路径语法提取值。
- `version_expr`：使用 [expr-lang](https://expr-lang.org/) 表达式提取或后处理版本。文件内容位于 `body` 中，`version_regex` 或 `version_json_path` 找到的版本位于 `versions` 中。

这些解析器由 mise 自行运行，不能执行 Shell 命令。

只提取能表明项目使用的工具版本的值，例如确切版本，或特意与 CLI 主版本绑定的配置格式主版本。不要提取最低兼容版本：`cmake_minimum_required` 或 `package.json` 中的 `engines` 等下限描述的是使用者所需的版本，解析后会将用户固定在最旧的受支持发行版（参阅[mise 会读取哪些字段](/dev-tools/versions.html#which-fields-mise-reads)）。不要提取无关的项目版本、依赖项版本、锁文件架构修订号，或不会限制工具版本的通用 `version` 字段。

要停用一个用于读取版本下限的现有文件，请在对应表格中添加 `deprecated = "<reason>"`。该文件仍会被解析，mise 会警告用户将版本移到 `mise.toml` 中。

请列出工具官方读取的所有文件名，包括 `.config/tool.yml` 这样的文档化嵌套路径。后缀重叠时，mise 会采用匹配最具体的路径。用户仍需为工具启用惯用版本文件：

```sh
mise settings add idiomatic_version_file_enable_tools your-tool
```

## aqua 注册表配方 {#aqua-registry-recipes}

`aqua:` 后端会从 [aqua 注册表](https://github.com/aquaproj/aqua-registry)中的配方安装，不会读取 mise 的 `registry/`。配方有误时，请在上游修复。每个 mise 发行版都会附带 aqua 注册表最新的 `main`，因此上游修复会随下一个 mise 版本提供；启用 [`registry_floating`](/configuration/settings.html#registry_floating) 后则可能更早可用。若要在合并前试用配方修改，可将 [`aqua.registries`](/dev-tools/backends/aqua.html#custom-registry) 指向本地 `registry.yaml`。

以下两类配方问题较常见：

- `supported_envs` 缺少某个平台。请将配方中的 `supported_envs` 与发布者提供的发行版资源文件进行比较。如果存在匹配的资源文件，可将该平台加入配方。仅添加平台名称并不能让不兼容的二进制文件运行。
- 显示的版本带有标签前缀，例如 `atlascli/1.2.3`。如果配方使用 `Version startsWith "atlascli/"` 这样的 `version_filter` 表达式筛选标签，就会出现此情况。应将前缀改为 `version_prefix`：mise 会在显示版本时移除前缀，并在需要标签时重新加上。`version_filter` 只应用于排除无关发行版。版本号不必包含三段。

## 工具测试 {#tool-testing}

每个新条目都必须设置 `test`。注册表工作流中的
[`validate-new-tools` 作业](https://github.com/jdx/mise/blob/main/.github/workflows/registry-impl.yml)
会拒绝未设置该项的新增工具拉取请求。

<!-- schema: skip -->

```toml
test = { cmd = "your-tool --version", expected = "your-tool {{version}}" }
```

[`mise test-tool`](/cli/test-tool.html) 会在关闭[最低发行间隔](/configuration/settings.html#minimum_release_age)的情况下安装该工具的最新版本。它会在工具的可执行文件中查找 `cmd` 的第一个词，并使用 `sh -c`（Windows 上使用 `cmd /C`）运行命令，同时将标准错误合并到标准输出。命令以 0 状态退出且输出包含 `expected` 时，测试通过。

`expected` 是普通子字符串，不是模式。mise 会先将其作为模板渲染，<code v-pre>{{version}}</code> 会被替换为已安装的版本，而不是通配符。如果命令会输出该版本，请使用 <code v-pre>{{version}}</code>；否则应选取输出中的其他稳定内容。

如果 `cmd` 需要将其他由 mise 管理的工具加入 `PATH`，请在 `tools` 中列出它们。这些工具仅供 `mise test-tool` 使用，不会改变目标工具的安装方式。

<!-- schema: skip -->

```toml
test = { cmd = "gradle -V", expected = "Gradle", tools = ["java"] }
```

请使用自己的构建版本进行测试，因为注册表已编译进二进制文件。`mise test-tool` 会先删除该工具的已安装版本、缓存和下载文件；如果你有想保留的版本，请为测试指定临时目录：

```sh
mise run build
MISE_DATA_DIR=/tmp/mise-test/data MISE_CACHE_DIR=/tmp/mise-test/cache \
  target/debug/mise test-tool your-tool
```

传入多个名称可测试多个工具，添加 `--raw` 可直接查看安装器输出。`--all-config` 会测试配置文件中使用的注册表工具。`--all` 会测试整个注册表，耗时数小时。对于拉取请求新增或修改的每个条目，CI 都会使用该拉取请求的构建版本在 Linux 上运行 `mise test-tool`。
