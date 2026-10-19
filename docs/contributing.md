---
description: "从首次检出到 CLI 帮助、设置和文档，了解如何为 mise 提议、实现、测试并提交更改。"
outline: [2, 3]
---

# 贡献指南

mise 欢迎修复缺陷、改进文档，以及为广泛使用的工具添加注册表条目。较大的改动应先确认方向，再开始编写代码。请在 [Issues](https://github.com/jdx/mise/issues) 报告缺陷，并在 [Discussions](https://github.com/jdx/mise/discussions) 分享问题和想法。

## 参与社区 {#community-participation}

::: danger AI replies to Discussions and Issues are restricted
违反此规则会导致你**立即被 jdx 的所有项目封禁**。

只有在以下情况下，才可以使用 AI 回复 [Discussion](https://github.com/jdx/mise/discussions) 或 [Issue](https://github.com/jdx/mise/issues)：该主题由你创建；你提交了修复该问题的 PR；或你此前已有署名归属于自己 GitHub 账号的贡献合并进 mise 默认分支。其他人不得使用 AI 回复。随意发布的 AI 回复属于垃圾信息，而且问题正在加剧。

这包括原始、轻度编辑、经审阅以及已披露的模型输出。添加“AI 辅助”页脚本身并不能让 AI 回复变得
合规。如果你正在运行代理，请确保它不会向你无权回复的主题发帖，也绝不要让它一次处理大量主题。
:::

可以使用 AI 协助撰写并提交自己的 Discussion、Issue 或 pull request。发布前请先审阅内容，并在末尾添加以下格式的说明：

```text
*AI-assisted — Tool: <tool>; model: <provider>/<model>; version: <version-or-unavailable>.*
```

如果你符合使用 AI 回复主题的条件，发布前也必须审阅并核实回复内容，并以相同方式注明。

## 提交 pull request 前 {#before-you-open-a-pull-request}

mise 有明确的项目范围和设计取向。除非改动显而易见，否则请先在 [Discussion](https://github.com/jdx/mise/discussions) 或 [Discord](https://discord.gg/mABnUDvP57) 提出方案，再开始编写。跳过这一步的 PR 往往会被拒绝，或需要大幅修改。

如果我对某项贡献犹豫不决，很可能仅因此就会拒绝它，否则 mise 会陷入功能膨胀。如果 PR 的质量不足以让我相信贡献者能够将其完成，我也可能拒绝。我没有时间指导每位贡献者，而且我维护的项目每周会收到数百个 PR，因此拒绝说明可能很简短。

请求评审前，请确认以下事项：

1. 除非改动显而易见，否则已在 Discussion 或 Discord 中就方案达成一致。
2. CI 全部通过，包括 `mise run lint` 不会运行的 [Clippy](#clippy)。
3. 标题符合 [PR 标题格式](#pull-request-titles-and-descriptions)。
4. 描述说明了用户可见的变化；发布说明会使用这段描述。
5. 已处理所有自动化 AI 评审意见。
6. 生成文件和快照已与生成它们的改动一并提交。详见[生成文件](/architecture.html#generated-files)。
7. 面向用户的改动附带了文档。

如果 CI 失败、标题不符合格式，或仍有未处理的 AI 评审意见，请不要期待我会立即查看 PR。

## 设置代码检出目录 {#set-up-a-checkout}

### 构建依赖 {#build-dependencies}

- Rust 版本不低于 `Cargo.toml` 中的 `rust-version`，并通过 rustup 安装。项目的 `mise.toml` 不会安装 Rust。
- mise 版本不低于 `mise.toml` 中的 `min_version`。
- Git 和 C 工具链。
- clang 和 libclang。`mise run build` 会使用 `--all-features` 构建，并通过 bindgen 生成 `aws-lc-sys` 绑定。
- Linux 和 macOS 需要 OpenSSL 及其头文件；Linux 还需要 `pkg-config`。`--all-features` 也会启用可选的 `openssl` 依赖，并链接系统 OpenSSL。
- 运行 E2E 测试需要 Bash；测试用到的 zsh、fish、python3 和 jq 也需安装。

在 Debian 和 Ubuntu 上：

```sh
sudo apt-get install -y build-essential pkg-config libssl-dev clang libclang-dev
```

在 macOS 上，使用 `xcode-select --install` 安装 Xcode Command Line Tools，并使用 `brew install openssl@3` 安装 OpenSSL。在 Windows 上，`mise run build` 只会启用默认功能。

### 克隆并构建 {#clone-and-build}

```sh
git clone https://github.com/jdx/mise.git
cd mise
mise trust
mise install                     # the project's tools: mbx, hk, usage, oxfmt, shellcheck, ...
mise exec -- hk install --mise   # optional: run the linters as a Git pre-commit hook
mise run build
target/debug/mise --version
```

`mise trust` 会允许 mise 加载仓库的 `mise.toml`，而 `mise install` 需要读取该文件。

### 运行自己的构建版本 {#run-your-build}

对于 mise 在检出目录中启动的任务、`mise exec` 和已激活的 Shell，`mise.toml` 都会将 `target/debug` 和 `node_modules/.bin` 放到 `PATH` 最前面。因此，本地构建完成后，任务调用的 `mise` 命令会使用你的开发版本。`mise activate` 提供的 `mise` Shell 函数仍会调用激活 Shell 时所用的二进制文件。若要确定正在测试哪个二进制文件，请直接运行 `target/debug/mise`。`target/debug` 中的旧构建可能无法通过仓库的 `min_version` 检查；请重新构建或删除它。

若要从任意目录运行检出版本，并在源码更改时重新构建，我会在 `~/.local/bin/@mise` 使用以下包装脚本。请将清单路径改为你的克隆目录：

```sh
#!/bin/sh
exec cargo run -q --all-features --manifest-path "$HOME/src/mise/Cargo.toml" -- "$@"
```

请将脚本设为可执行，并把它所在目录加入 `PATH`。在一次性 Shell 中测试激活改动，避免错误的 hook 影响你正在使用的 Shell：

```sh
@mise --help
eval "$(@mise activate zsh)"
@mise activate fish | source
```

设置 `MISE_DEBUG=1` 或 `MISE_TRACE=1` 可输出调试信息。`RUST_LOG` 不会影响 mise 的日志。

### Cargo 构建缓存 {#cargo-build-cache}

`mise.toml` 使用 [mbx](https://mr-boxington.jdx.dev) 包装 `cargo`，让多个检出目录共用已编译的构建产物。`mise run` 任务和 `mise exec -- cargo …` 会使用该包装器；在 [Shell 中激活 mise](/shell-setup.html) 后，直接运行的 `cargo` 也会使用它。设置 `MBX_DISABLE=1` 可禁用缓存构建，大多数 CI 任务都采用这种方式。

### 项目结构 {#project-structure}

| 路径                       | 内容                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `src/`                     | mise 库，以及 `src/cli/` 下的命令行程序                                |
| `crates/`                  | `vfox`、`mise-util`、`mise-settings` 等工作区 crate                   |
| `registry/`                | 每个工具简称对应一个 TOML 文件                                        |
| `settings.toml`            | 设置定义，用于生成代码、schema 和文档                                 |
| `schema/`                  | 配置文件的 JSON schema                                                |
| `e2e/`、`e2e-win/`        | 使用 Bash 和 Pester 编写的端到端测试                                  |
| `docs/`                    | 本文档站点                                                            |
| `tasks.toml`、`xtasks/`    | 项目任务                                                              |
| `hk.pkl`                   | Linter 配置                                                           |
| `packaging/`、`scripts/`   | 发布打包和构建脚本                                                    |

[代码库架构](/architecture.html)介绍了 `src/` 和 `crates/` 中各项行为对应的代码位置。

## 项目任务 {#project-tasks}

运行 `mise tasks ls` 可列出任务，运行 `mise tasks info <name>` 可查看任务定义位置。任务来自 `tasks.toml`、`xtasks/` 下的文件任务，以及存放性能基准任务的 `mise.toml` 中的 `[tasks]` 条目。

| 任务                          | 别名            | 说明                                                                  |
| ----------------------------- | --------------- | -------------------------------------------------------------------- |
| `mise run build`              | `b`             | Debug 构建；Windows 上不启用全部功能                                  |
| `mise run lint`               |                 | 运行 hk 检查；不运行 Clippy                                           |
| `mise run lint-fix`           | `fix`、`format`  | 应用 hk 自动修复                                                      |
| `mise run test:unit`          |                 | `cargo test --all-features`                                          |
| `mise run test:e2e <pattern>` | `e`、`e2e`      | 构建后运行所选的 [E2E 测试](#e2e-tests)                              |
| `mise run snapshots`          |                 | 接受所有已更改的 insta 快照并删除不再引用的快照                       |
| `mise run render`              |                 | 重新生成所有[生成文件](/architecture.html#generated-files)             |
| `mise run docs`                |                 | 启动文档开发服务器                                                    |
| `mise run docs:build`          |                 | 构建文档站点并检查链接                                                |
| `mise run perf`                |                 | Release 构建并运行指令数基准测试                                      |
| `mise run clean`               |                 | `cargo clean`                                                        |

`mise run test`（别名 `t`）会先运行单元测试，再不带参数运行 `test:e2e`；此时不会选中任何 E2E 测试。运行 `mise run test:e2e --all` 可执行整套测试。`mise run ci` 会运行 `lint-fix`、`build` 和 `test`，与 CI 实际执行的流程不同。`mise run release-plz` 在 GitHub Actions 之外会拒绝运行。

## Lint 和格式化 {#linting-and-formatting}

[`hk.pkl`](https://github.com/jdx/mise/blob/main/hk.pkl) configures oxfmt,
markdownlint, taplo, ShellCheck, shfmt, stylua, lua-language-server,
`cargo fmt`, `cargo check`, and JSON schema validation.

```sh
mise run lint               # check every file
mise run lint-fix           # apply the fixes that can be automated
mise exec -- hk check --pr  # check only the files your branch changed
```

`hk install --mise` 会安装 Git pre-commit hook，运行相同的自动修复，并在运行期间暂存工作区中未暂存的改动。在 Windows 上，`lint-fix` 只运行 Clippy、oxfmt 和 `cargo fmt`。

### Clippy {#clippy}

CI 会运行 Clippy 并将警告视为错误，而 `mise run lint` 不会运行它。推送 Rust 改动前，请运行：

```sh
cargo clippy --workspace --all-features --all-targets -- -D warnings
```

CI 还会使用默认功能并在 Windows 上运行 Clippy。请通过修改代码修复警告，不要添加 `#[allow(clippy::...)]`、`#[expect(clippy::...)]`、设为 `allow` 的 Cargo lint 级别或 `-A clippy::...`。如果修复需要预先重构，请先单独提交该重构的 PR。`clippy.toml` 禁止使用 `std::env::vars`、`std::env::args` 和 `std::process::exit`，并会在提示中说明应改用什么。

## 测试 {#testing}

解析和解析结果使用单元测试，命令和 Shell 行为使用 E2E 测试，需要保持稳定的输出使用快照测试。优先使用本地 fixture，不要依赖实时下载。

### 单元测试 {#unit-tests}

```sh
mise run test:unit
cargo test --all-features test_name
cargo test --all-features module_name -- --nocapture
mise --cd crates/vfox run test   # the vfox crate
```

单元测试在同一进程中逐个运行：`.cargo/config.toml` 将 `RUST_TEST_THREADS=1`。`src/testing.rs` 中的 `mise::testing::init` 会设置 `test/` 下共用的 fixture 目录和进程环境。库测试从 `src/test.rs` 调用它，二进制测试则从 `src/main.rs` 的 `test` 模块调用。测试更改设置或环境变量时，请使用现有 guard（例如 `SettingsGuard` 和 `EnvVarGuard`），避免改动泄漏到后续测试。

`mise run test:shuffle` 会随机打乱单元测试顺序，以发现依赖执行顺序的测试。该任务需要 nightly 工具链（`cargo +nightly`），不必更改默认工具链。

### Schema 一致性 {#schema-conformance}

`schema/mise.json` 根据 `crates/mise-config` 中的声明类型生成，而不是由解析器生成，因此单元测试会检查它是否与解析器一致：`cargo test schema_matches_parser` 会解析 `docs/` 中的每个 `toml` 代码块，以及 E2E 测试通过 heredoc 写入的每个 mise 配置，并逐一对照 schema 验证；两者不一致时测试会失败。修复后运行 `mise run render:schema`。如果某个 E2E 配置按设计就应被 mise 拒绝，请在 heredoc 上方一行添加 `# schema: invalid` 注释；测试也会检查 schema 是否拒绝该配置。`# schema: skip` 则会让测试跳过该 heredoc。确需保留差异时，请将其原因写入 `src/config/config_file/mise_toml/schema_conformance.rs` 中的 `GAPS` 列表。

### E2E 测试 {#e2e-tests}

`mise run test:e2e` 会先构建 mise，再运行你选择的测试。每个参数都是与测试文件名匹配的正则表达式：

```sh
mise run test:e2e '^test_version$'   # one test
mise run test:e2e '^test_task_'      # every test whose name starts with test_task_
mise run test:e2e --list             # list the test files
mise run test:e2e --all              # every test except *_slow ones
TEST_ALL=1 mise run test:e2e --all   # including *_slow tests
```

包装器会将每个参数缩减为文件名，并且不会固定匹配模式的开头或结尾。因此，`e2e/cli/test_version` 也会运行 `test_version_order`、`test_version_range` 和 `test_version_update_hint`；`e2e/tasks` 会运行名称中含有 `tasks` 的所有测试，而不只是该目录中的测试。不带参数时不会运行任何测试。请查看 `Running test:` 行确认实际运行的测试。

`--all` 最多同时运行四项测试；设置 `E2E_JOBS` 可更改并发数，也可让选定测试并行运行。和 CI 一样，可使用 `TEST_TRANCHE` 和 `TEST_TRANCHE_COUNT` 将整套测试拆分为多个批次。

每项测试都会在新的工作目录中运行，并使用独立的 `HOME`、mise 目录和受信任配置路径；环境中会设置 `MISE_EXPERIMENTAL=1`，且 `target/debug` 位于 `PATH` 最前面。测试所需的 Shell、编译器和服务仍须由主机提供。设置 `MISE_E2E_DOCKER=1` 后，每项测试会在 `ghcr.io/jdx/mise:e2e` 容器镜像中运行；这是 CI 执行 E2E 测试所用的镜像，已包含这些软件包，但要求使用 Linux 构建的 mise。运行会调用 GitHub API 的测试时，请设置 `MISE_GITHUB_TOKEN` 或 `GITHUB_TOKEN`；测试 harness 会传递这些变量。测试失败时，harness 会保留其工作目录并打印路径。

不要直接运行 `e2e/` 下的文件，也不要将它们设为可执行。

### 编写 E2E 测试 {#writing-an-e2e-test}

新建 `e2e/<area>/test_<name>` 文件，例如 `e2e/env/test_env_greeting`。harness 会加载 `e2e/assert.sh`，并在启用 `set -euo pipefail` 的情况下使用 Bash 运行文件。若首行为 `#!/usr/bin/env zsh`，则使用 zsh 运行，同时仍会加载 `assert.sh` 并启用 `-euo pipefail`。首行为 `#!/usr/bin/env fish` 的测试则使用 `fish --no-config` 运行，不会加载 `assert.sh`，也不会启用上述选项。不要在测试中清理文件；harness 会删除测试目录。

```sh
#!/usr/bin/env bash

cat >mise.toml <<'EOF'
[env]
GREETING = "hello"
EOF
assert "mise exec -- printenv GREETING" "hello"
```

若测试会编译或下载大型工具，请将其命名为 `test_<name>_slow`。测试耗时超过 20 秒却没有该后缀时，会显示警告。

<span id="test-assertions"></span>

大多数辅助函数都接受字符串形式的命令：

| 辅助函数                                                    | 成功条件                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `assert "cmd" "text"`                                       | `cmd` 成功且输出与 `text` 完全一致；若省略 `text`，则只检查成功状态       |
| `assert_contains`、`assert_not_contains`                    | `cmd` 成功，且输出包含或不包含 `text`                                  |
| `assert_matches "cmd" "regex"`                              | `cmd` 成功，且输出匹配 Bash 正则表达式                                  |
| `assert_empty`、`assert_not_empty`                          | `cmd` 成功，且输出为空或非空                                           |
| `assert_json "cmd" "json"`                                  | `cmd` 输出与 `json` 相等的 JSON                                        |
| `assert_fail "cmd" "text"`                                  | `cmd` 失败；传入 `text` 时，输出还必须包含它                             |
| `assert_fail_contains`、`assert_fail_matches`               | `cmd` 失败，且输出包含 `text` 或匹配 `regex`                            |
| `assert_directory_exists`、`assert_directory_not_exists`    | 目录存在或不存在                                                       |

### Windows E2E 测试 {#windows-e2e-tests}

`e2e-win/` 中的 Windows 测试使用 Pester 5。请先安装 Pester 并构建 mise，再运行测试套件。runner 会将 `target\debug` 放到 `PATH` 最前面：

```powershell
Install-Module Pester -Force -SkipPublisherCheck
mise run build
pwsh -File e2e-win/run.ps1
pwsh -File e2e-win/run.ps1 -TestName '*task*'
```

`-TestName` 会按 Pester 测试的完整名称筛选，并支持通配符。测试激活或 `PATH` 时，必须通过 mise 输出的 `PATH` 运行命令，并确认原生 Windows 子进程收到有效的分号分隔 `PATH`；只比较输出字符串并不足够。可参考 `e2e-win/activate_posix_path.Tests.ps1`。

### 注册表工具测试 {#registry-tool-tests}

`mise test-tool` 会安装注册表中的工具，并运行各条目定义的测试。其工作方式以及为何要使用你构建的 mise 运行，请参阅[工具测试](/contributing/registry.html#tool-testing)。插件作者还应阅读[发布插件](/plugin-publishing.html#testing-before-publication)。

### 快照测试 {#snapshot-testing}

`insta` 快照用于记录必须保持稳定的输出。有意更改输出后，运行 `mise run snapshots`，接受所有已更改的快照并删除不再引用的快照。提交前请检查 `.snap` 差异，包括删除项。

### 性能测试 {#performance-testing}

`mise run perf` 会构建 Release 二进制文件，并使用 tak 测量指令数。它需要 valgrind；未安装时，tak 只报告实际耗时。`mise run test:perf` 会在生成的工作区中运行耗时基准测试，需要 Bash 4 或更新版本，而 macOS 自带的 Bash 不满足此要求。只比较在同一台机器上以相同方式构建所得的结果。

## 修改 CLI 命令 {#changing-a-cli-command}

命令位于 `src/cli/`，通过 `usage_rs` derive 声明：使用 `#[derive(usage_rs::Args)]` 和 `#[usage(...)]` 属性。同一份定义会生成 `--help`、Shell 补全、man 页面和 [CLI 参考](/cli/)，因此请修改源文件并重新生成。不要手动编辑 `docs/cli/`、`mise.usage.kdl` 或 `man/`。

- 命令结构体上的文档注释就是帮助文本。第一行是 `mise --help` 和 CLI 索引中的简短说明，其余内容则是 `mise <command> --help` 和参考页显示的详细帮助。在 `#[usage(...)]` 中添加 `verbatim_doc_comment` 可保留换行。
- 字段上的文档注释会成为参数和标志的帮助文本。
- 像 `src/cli/where.rs` 一样，在 `#[usage(...)]` 中使用 `example(...)` 添加示例。示例会显示在 `--help` 和参考页中。
- `hide = true` 会隐藏命令或标志。隐藏的命令不会生成参考页。
- 无论命令是否隐藏，都要在 `src/cli/command_effects.rs` 中归类：将其添加到 `EFFECTS`，标记为 `Read`、`Write` 或 `Destructive`；如果命令会运行用户提供的代码，则添加到 `UNCLASSIFIED` 并说明原因。否则 `every_visible_command_is_classified` 单元测试会失败。
- 参数值（例如工具、任务和设置名称）的补全，以及每个参考页上的源代码链接，来自 `src/assets/mise-extra.usage.kdl`。
- 参考页末尾的“相关文档”链接来自 `docs/.vitepress/cli-reference.ts` 中的 `guides` 映射；顶层命令在 [CLI 索引](/cli/)中的分组来自同一文件的 `categories`。添加新命令时，两处都要更新。如果 guide 指向不存在的页面，生成过程会失败。

A command definition, trimmed from `src/cli/where.rs`:

```rust
/// Show the install directory of a tool version
///
/// Fails if no matching version is installed.
#[derive(Debug, usage_rs::Args)]
#[usage(
    verbatim_doc_comment,
    example(
        r###"mise where node@20
~/.local/share/mise/installs/node/20.0.0"###,
        help = r###"Show the newest installed node 20.x"###
    )
)]
pub(crate) struct Where {
    /// Tool to look up, such as ruby@3
    #[usage(value_name = "TOOL@VERSION")]
    tool: ToolArg,
}
```

然后重新生成相关文件并运行单元测试：

```sh
mise run render:usage        # mise.usage.kdl, docs/cli/, tasks.md
mise run render:completions  # completions/
mise run render:mangen       # man/man1/mise.1
mise run render:help         # docs/.vitepress/cli_commands.ts
mise run test:unit
```

`render:usage` 会先删除 `docs/cli/` 再重新生成。如果任务中途失败，请先运行 `git restore docs/cli`，再重试。

### 编写 CLI 帮助文本 {#writing-cli-help}

- 第一行以祈使动词开头（例如 “Remove stale cache files”），不超过 70 个字符，且末尾不加句号。写 “tools”，不要写 “tool(s)”。
- 详细帮助应说明命令的作用、会更改什么，以及何时应改用其他方式。每行不超过 80 列；使用完整的 `https://mise.jdx.dev/…` URL，不要使用 Markdown 链接，参考页会自行添加相关文档链接。
- 标志和参数的帮助写成首字母大写且不带句号的短语。网页会合并这些行，因此额外的每一行都应是完整句子。注明默认值来源，例如 “Defaults to the `jobs` setting”。
- 每个示例都应展示不同用途；帮助文本首字母大写，末尾不加冒号。

## 添加设置 {#adding-a-setting}

设置定义在 [`settings.toml`](https://github.com/jdx/mise/blob/main/settings.toml) 中。每个条目会生成三项内容：Rust `Settings` 类型中的字段（由 `crates/mise-settings/build.rs` 在构建时生成）、`schema/mise.json` 中的属性，以及[设置参考](/configuration/settings.html)中的条目；站点构建时会渲染 `settings.toml`。

<!-- schema: skip -->
```toml
[http_timeout]
default = "30s"
description = "Timeout for connecting or waiting between reads during HTTP requests."
docs = """
This timeout applies to the connection phase and to each individual response
read. The read timer resets whenever data is received, so long-running artifact
downloads are bounded separately by `http_download_timeout`.
"""
env = "MISE_HTTP_TIMEOUT"
type = "Duration"
```

A dotted 名称（例如 `[task.output]`）会嵌套设置，Rust 字段也采用相同层级：`Settings::get().task.output`。条目包含以下键：

- `type`：`Bool`、`String`、`Integer`、`Duration`、`Path`、`Url`、`ListString`、`ListPath`、`SetString`、`BoolOrString` 或 `BoolOrList`。
- `description`：一句简短说明，会显示在 `mise settings ls --json-extended`、编辑器补全和 schema 中。对于布尔设置，应说明 `true` 时的行为。
- `docs`：Markdown 文本，在设置页面上替代 `description`。
- `env`：环境变量名称，通常为设置名转大写并加上 `MISE_` 前缀，同时将 `.` 替换为 `_`。
- `default`，或者对没有默认值的设置使用 `optional = true`。`default_docs` 用于说明因平台而异的默认值。
- `rust_type`、`parse_env` 和 `enum`：分别表示不同于 `type` 所隐含类型的 Rust 类型、环境变量解析器和允许值。
- `deserialize_with`：来自 `crates/mise-settings` 的自定义反序列化器，例如 `bool_string`。
- `merge = "append_unique"`：用于 `ListString`，合并所有配置文件中的值并去重，而非采用最近配置文件的值。
- `global_only = true`：项目配置不能设置此项。`env_only = true`：只能通过环境变量设置。`rc = true`：`.miserc.toml` 可以设置此项。
- `hide = true`：不在设置页面中显示此项。
- `deprecated`、`deprecated_warn_at` 和 `deprecated_remove_at`：用于弃用设置；详见[弃用与破坏性更改](#deprecations-and-breaking-changes)。

在 Rust 中使用 `Settings::get()` 读取设置值，例如 `Settings::get().jobs`。加载、信任和命令行标志由 `src/config/settings.rs` 处理。随后运行 `mise run render:schema`，更新 `schema/mise.json`、`schema/miserc.json` 和 `schema/mise-task.json`，并通过 `mise run docs` 预览页面。条目中的键应按字母顺序排列；`mise run lint-fix` 会调用 taplo 排序。

## 编写文档 {#writing-documentation}

站点使用 `docs/` 下的 VitePress 项目。修改页面前请阅读[编写 mise 文档](https://github.com/jdx/mise/blob/main/docs/README.md)，了解内容归属、页面移动、示例、文风和生成内容的规则。

```sh
mise run docs        # dev server that reloads on save
mise run docs:build  # production build that checks every internal link and anchor
```

在 `docs/.vitepress/sidebar.ts` 中添加新页面。移动页面时，需要在 `docs/.vitepress/redirects.mjs` 中添加 `pageRedirects` 条目；将章节移到其他页面时，需要在 `docs/.vitepress/anchor-redirects.mjs` 中添加 `anchorRedirects` 条目。指南中的[移动或重命名页面](https://github.com/jdx/mise/blob/main/docs/README.md#move-or-rename-a-page)一节介绍了标题和标签的处理方式。

修改页面标题、导语或页面列表后，以及 rebase 后，都要运行 `mise run render:llms`。该命令会构建 mise 并先渲染 CLI 页面；若只有 Markdown 页面发生变化，则运行 `mise exec node -- node docs/.vitepress/llms.ts`，只重新生成索引。

## Pull request 标题与描述 {#pull-request-titles-and-descriptions}

PR 标题遵循 [Conventional Commits](https://www.conventionalcommits.org/)。`conventional-commits` workflow 会在 PR 创建、编辑、重新打开或更新时检查标题。PR 使用 squash 合并，因此 CI 不会检查中间提交说明，但它们也应采用相同格式。

```text
<type>[(scope)][!]: <description>
```

| 类型       | 用途                                                            |
| ---------- | --------------------------------------------------------------- |
| `feat`     | 新增面向用户的功能                                              |
| `fix`      | 修复 mise 行为缺陷，不用于 CI、文档或基础设施问题               |
| `perf`     | 性能改进                                                        |
| `refactor` | 不改变行为的代码调整                                            |
| `docs`     | 仅修改文档                                                      |
| `test`     | 仅修改测试                                                      |
| `style`    | 仅调整格式                                                      |
| `security` | 安全修复或加固                                                  |
| `registry` | 修改 `registry/` 下的内容；不能添加 scope                        |
| `chore`    | 维护、依赖更新和发布                                            |
| `ci`       | CI 和自动化                                                     |
| `revert`   | 撤销先前的更改                                                  |

scope 应按受影响的命令（`install`、`use`、`exec`、`activate`）或子系统（`config`、`backend`、`env`、`task`、`vfox`、`python`、`github`、`schema`、`doctor`、`shim`、`deps`、`ci`）填写。任务运行器应使用 `task`，不要用 `run`。

描述以小写字母或 `CLI`、`PGO` 这样的缩写开头，并使用祈使语气，例如写 `add`，不要写 `added`。破坏性更改应在类型或 scope 后添加 `!`。

```text
fix(install): resolve version mismatch for previously installed tools
feat(vfox): add semver Lua module for version sorting
docs(contributing): update hk usages
chore(deps): update rust crate demand to v2.4.0
registry: add twg (http:twg)
```

标题会成为 `CHANGELOG.md` 条目，并由 git-cliff 按类型分组。Communique 会根据已合并 PR 的标题和描述生成 GitHub 发布说明。编写时要考虑没看过差异的 mise 用户：先说明问题和用户现在可以做什么；新功能应附上简短配置或命令示例；缺陷修复应说明修复前后的行为。如果评审导致 PR 内容改变，也要同步更新标题和描述。

## 弃用与破坏性更改 {#deprecations-and-breaking-changes}

通常不接受破坏性更改，只有不存在更好的替代方案时才会考虑。移除功能、后端或行为前，应先将其弃用：

1. 在弃用该功能的 PR 中，为文档添加警告横幅，并使用 `src/output.rs` 中的 `deprecated_at!` 添加 CLI 警告；`warn_at` 使用当前版本：

   ```rust
   deprecated_at!("2026.10.0", "2027.10.0", "old-flag", "Use --new-flag instead.");
   ```

   到达 `warn_at` 版本后，mise 会针对每个 ID 打印一次警告，并附上功能移除版本。到达 `remove_at` 后（通常在 12 个月后），会触发 `debug_assert!`，提醒删除代码。部分弃用会刻意采用更短的期限，不要延长已有期限。

2. 只有替代方案需要使用旧版受支持 mise 不接受的设置或语法时，才将警告最多延后 6 个月。移除期限仍从开始警告时计算。
3. 说明迁移方式。

对于不涉及面向用户弃用的临时代码（例如迁移代码，或用于读取旧版 mise 写入内容的回退逻辑），使用 `remove_by!("2027.1.0", "id")`。mise 达到指定版本后，如果代码尚未移除，构建就会失败。

## 依赖 {#dependencies}

在 `Cargo.toml` 中使用满足需求的最宽松版本约束：例如使用 `"1"` 而不是 `"1.2.3"`；对于尚未达到 1.0 的 crate，使用 `"0.12"`。常规依赖更新只应修改 `Cargo.lock`。运行 `cargo update -p <crate> --precise <version>`，并从 lockfile 中移除无关改动。

CI 会使用以下工具检查依赖，而项目的 `mise.toml` 不会安装它们。具体参数见 [test-impl.yml](https://github.com/jdx/mise/blob/main/.github/workflows/test-impl.yml)。

```sh
cargo deny check               # advisories, licenses, and allowed sources
cargo machete --with-metadata  # unused dependencies
cargo msrv verify              # the minimum supported Rust version
```

`deny.toml` 允许同一 crate 存在多个版本。

## 将工具添加到注册表 {#adding-tools}

新简称仅面向已经广泛使用的工具，通常要求拥有数千个 GitHub stars；大多数提案都会被拒绝。提交 PR 前请阅读[将工具添加到注册表](/contributing/registry.html)，其中介绍了受欢迎程度门槛、[后端接纳等级](/contributing/registry.html#backend-acceptance-tiers)、条目格式和[工具测试](/contributing/registry.html#tool-testing)。

## 添加后端 {#adding-backends}

大多数贡献者想要的是[添加工具](/contributing/registry.html)，而非新增后端。核心项目很少接纳新后端，因为每个后端都意味着长期维护；不过，能够显著增强 mise 的主流包管理器后端仍可能被接纳。请先确认现有后端（例如 `github`、`aqua`、`npm` 或 `pypi`）是否已能安装目标工具。若要在不修改 mise 的情况下支持新来源，可基于 [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) 编写[后端插件](/backend-plugin-development.html)或[工具插件](/tool-plugin-development.html)。如果认为某个后端应加入核心项目，请先在 [Discussion](https://github.com/jdx/mise/discussions) 或 [Discord](https://discord.gg/mABnUDvP57) 提出想法。

实现后端的步骤如下：

1. 新建 `src/backend/my_backend.rs` 并实现
   [`Backend` trait](https://github.com/jdx/mise/blob/main/src/backend/mod.rs),
   ，并参考安装模型相同的后端。trait 的包装方法会处理缓存和策略；请实现 `_list_remote_versions`（返回 `VersionInfo` 条目）、`install_version_` 等 hook，不要重复实现这些逻辑。版本应视为不透明值，解析工作交给后端。
2. 在 `src/backend/mod.rs` 中声明模块（`pub(crate) mod my_backend;`）。
3. 在 `src/backend/backend_type.rs` 的 `BackendType` 中添加变体，并在 `BackendType::guess` 中映射其前缀；未匹配时会回退到 `Unknown`，不会产生编译错误。若后端初期处于实验阶段，还要将它添加到 `is_experimental`；该方法未匹配时会回退到 `false`。
4. 在 `src/backend/mod.rs` 的工厂 match 中构造后端。之后编译器会指出还需更新的其他穷尽匹配，例如安装时选项键。
5. 如果该标识符需要特殊解析，请在 `src/args/backend_arg.rs` 中添加参数解析逻辑。

在 `e2e/backend/test_my_backend` 中添加 E2E 测试，验证该后端可以安装并运行工具；若后端支持 Windows，还要添加相应的 Windows 测试。在 `docs/dev-tools/backends/` 下添加后端页面和安装示例，并在 `docs/.vitepress/sidebar.ts` 以及 `docs/dev-tools/backends/index.md` 的表格中添加链接。如果注册表条目会使用此后端，还需在 `docs/registry.data.ts` 中为其前缀添加 URL 构造器，让注册表页面能生成对应链接。

建议先阅读以下后端：

- `src/backend/dotnet.rs`：精简的包管理器后端
- `src/backend/packslip.rs`：带验证功能的发布清单后端
- `src/plugins/core/node.rs`：完整的语言运行时

mise 如何选择后端，请参阅[后端](/dev-tools/backends/)。

## CI 与发布 {#ci-and-releases}

CI 会在 Linux、macOS 和 Windows 上构建并测试，在 Linux 上按批次并行运行完整 E2E 套件，同时检查 Clippy、依赖、最低 Rust 版本和 PR 标题。`registry/` 下的改动还会针对新增或修改的条目运行 `mise test-tool`。

mise 版本采用 CalVer（`YYYY.M.PATCH`），发布流程由自动化完成。每次推送到 `main` 以及每天一次，release-plz workflow 都会创建发布 PR；该 PR 合并后即发布新版本。不要在本地运行 `mise run release-plz`。

## 打包与自我更新说明 {#packaging-and-self-update-instructions}

发行版打包者可以关闭 `mise self-update`，并引导用户改用对应的软件包管理器。详见[mise 打包](/packaging.html)。
