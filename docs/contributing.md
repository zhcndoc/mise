---
outline: [1, 3]
---

# 贡献指南

## 贡献预期

mise 有明确的范围和设计理念。在提交 PR 之前，除非是显而易见的事情，否则请先发起
[讨论](https://github.com/jdx/mise/discussions)，或在
[Discord](https://discord.gg/UBa7pJUN7Z) 中说明你计划做什么。重要的是在进行大量实现或评审之前确定方向。PR 提交后通常会被拒绝，或需要进行重大修改，因此请确保这个想法符合要求，再投入过多时间。

在我评审 PR 之前，CI 必须通过，PR 标题必须遵循
[约定式提交](#conventional-commits)，并且所有自动化 AI 评审评论都必须得到处理。如果其中任何一项仍未完成，请假设我会等到完成后再查看 PR。

如果我对某项贡献犹豫不决，我很可能会仅因此拒绝它。如果不这样做，mise 就会受到功能膨胀的影响。如果代码质量差到让我无法相信贡献者能够将其完成，我也可能会拒绝 PR。我没有时间指导贡献者。

我每周会在各个项目中收到数百个 PR，因此没有时间为每个 PR 都提供详细背景说明。拒绝理由可能会很简短。

## 拉取请求检查清单

1. **先进行讨论**：对于不明显的更改，请使用 GitHub Discussions 或 Discord
2. **使用规范的标题**：PR 标题会自动进行验证
   - 对于注册表中的新工具：使用 `registry: add tool-name (backend:full/name)`
3. **运行本地检查**：在适用的情况下，提交 PR 前运行 `mise run render` 和 `mise run lint-fix`
4. **进行全面测试**：确保相关的单元测试和端到端测试通过
5. **更新文档**：为面向用户的更改添加或更新文档
6. **保持依赖项健康**：新依赖项会通过 cargo-deny 进行验证

### 开发提示

1. **开发期间禁用 mise**：如果你在 shell 中使用 mise，请在运行测试时禁用它，以避免冲突
2. **测试特定功能**：使用 `cargo test test_name` 进行定向测试
3. **更新快照**：更改测试输出时使用 `mise run snapshots`
4. **速率限制**：设置 `MISE_GITHUB_TOKEN` 以避免开发期间受到 GitHub API 速率限制。

## 打包与自更新说明

当通过包管理器安装 mise 时，`mise self-update` 不应替换由包管理器管理的二进制文件；用户应改用包管理器进行更新。这是可选行为：未执行以下任何操作的软件包会保持自更新功能完全启用。打包者有三种方式可以关闭自更新，任何一种方式都会使 `mise doctor` 报告 `self_update_available: no`。

以下路径均相对于安装前缀，该前缀由 mise 根据自身二进制文件推导：路径会先进行规范化（解析符号链接），然后向上取两级，因此 `/usr/bin/mise` 会得到 `/usr`。

### 在构建时禁用

在不启用 `self_update` Cargo 特性的情况下进行构建，Arch Linux 软件包就是这样做的：

```bash
cargo build --release --no-default-features --features native-tls
```

子命令仍然存在，因此调用它的脚本会收到明确的错误，而不是“未知命令”，但它始终会失败并显示 `mise's self-update feature has been disabled at build time, cannot update`。

### 使用标记文件禁用

在以下任一路径安装一个空的 `.disable-self-update` 文件：

- `lib/.disable-self-update`（Homebrew 使用）
- `lib/mise/.disable-self-update`（AUR 的 `mise-bin` 软件包使用）
- `lib64/mise/.disable-self-update`

### 提供更新说明

安装包含特定平台说明的 TOML 文件也会禁用自更新；运行 `mise self-update` 或检测到新版本时，mise 会打印其中的消息。将文件安装到以下任一路径：

- `lib/mise-self-update-instructions.toml`
- `lib/mise/mise-self-update-instructions.toml`
- `lib64/mise/mise-self-update-instructions.toml`

示例内容：

```toml
# Debian/Ubuntu（APT）
message = "To update mise from the APT repository, run:\n\n  sudo apt update && sudo apt install --only-upgrade mise\n"
```

```toml
# Fedora/CentOS Stream（DNF）
message = "To update mise from COPR, run:\n\n  sudo dnf upgrade mise\n"
```

将 `MISE_SELF_UPDATE_INSTRUCTIONS` 设置为文件路径可以覆盖搜索路径。

### 覆盖结果

`MISE_SELF_UPDATE_AVAILABLE=false` 无需安装任何文件即可禁用自更新；即使存在标记文件或说明文件，设置为 `MISE_SELF_UPDATE_AVAILABLE=true` 也会重新启用自更新。这两个设置都适用于测试软件包构建。对于未启用 `self_update` 特性构建的二进制文件，两者均不起作用，因为此时自更新始终不可用。

`mise self-update --force` 同样会绕过可用性检查，因此即使标记文件、说明文件或 `MISE_SELF_UPDATE_AVAILABLE=false` 生效，传入该参数的用户仍会直接更新二进制文件。应将这些运行时机制理解为“默认不更新”，而不是硬性阻止。未启用 `self_update` 特性的构建版本是唯一无法通过 `--force` 绕过的版本。

## 测试

mise 拥有一套全面的测试套件，包含多种类型的测试，以确保其在不同平台和场景下的可靠性与功能性。

### 单元测试

单元测试是针对单个组件和函数的快速、专注的测试：

```bash
# 运行所有单元测试
cargo test --all-features

# 运行指定的单元测试
cargo test <test_name>
```

**单元测试结构：**

- 位于 `src/` 目录中，与源代码一起存放
- 使用 Rust 内置的测试框架
- 测试单个函数和模块
- 执行速度快（用于开发期间快速获得反馈）

### E2E 测试

端到端测试在真实场景中验证 mise 的完整功能：

```bash
# 运行所有 E2E 测试
mise run test:e2e

# Run specific E2E tests (preferred; always use this mise task)
mise run test:e2e e2e/cli/test_version

# Run E2E tests under a feature directory
mise run test:e2e e2e/tasks

# Run all tests including slow ones (`*_slow`)
TEST_ALL=1 mise run test:e2e
```

**E2E 测试结构：**

- 位于 `e2e/` 目录中
- 按功能组织：
  - `e2e/cli/` - 命令行界面测试
  - `e2e/core/` - 核心功能测试
  - `e2e/env/` - 环境变量测试
  - `e2e/tasks/` - 任务运行器测试
  - `e2e/config/` - 配置测试
  - `e2e/tools/` - 工具管理测试
  - `e2e/shell/` - Shell 集成测试
  - `e2e/backend/` - 后端测试
  - `e2e/plugins/` - 插件测试

**E2E 测试类别：**

- **快速测试**（`test_*`）：在常规测试套件中运行
- **慢速测试**（`test_*_slow`）：仅在设置 `TEST_ALL=1` 时运行
- **隔离环境**：每个测试都在干净、隔离的环境中运行

不要直接执行 `e2e/` 下的文件；`mise run test:e2e` 是受支持的入口点（它依赖于 `build` 并使用 `e2e/run_all_tests`）。设置 `MISE_GITHUB_TOKEN`（或 `GITHUB_TOKEN`）以避免 GitHub API 速率限制。

### Coverage Tests

覆盖率测试用于衡量代码库中有多少代码被测试覆盖：

```bash
# 运行覆盖率测试
mise run test:coverage

# 覆盖率测试在 CI 中以并行分片方式运行
TEST_TRANCHE=0 TEST_TRANCHE_COUNT=8 mise run test:coverage
```

### Windows E2E 测试

Windows 拥有一套使用 PowerShell 编写的独立测试套件：

```powershell
# 运行所有 Windows E2E 测试
pwsh e2e-win\run.ps1

# 运行指定的 Windows 测试
pwsh e2e-win\run.ps1 task  # 运行匹配 *task* 的测试
```

### 插件测试

测试不同后端中的插件功能：

```bash
# 测试指定插件
mise test-tool ripgrep

# 测试注册表中的所有插件
mise test-tool --all

# 测试配置文件中的所有插件
mise test-tool --all-config

# 使用并行任务
mise test-tool --all --jobs 4
```

### 测试环境设置

测试在隔离环境中运行，以避免冲突：

```bash
# 在开发测试期间禁用 mise
export MISE_DISABLE_TOOLS=1

# 使用指定环境运行测试
MISE_TRUSTED_CONFIG_PATHS=$PWD cargo test
```

### 测试断言

E2E 测试使用自定义断言框架（`e2e/assert.sh`）：

```bash
# 基本断言
assert "command" "expected_output"
assert_contains "command" "substring"
assert_fail "command" "expected_error"

# JSON 断言
assert_json "command" '{"key": "value"}'
assert_json_partial_array "command" "fields" '[{...}]'

# 文件/目录断言
assert_directory_exists "/path/to/dir"
assert_directory_not_exists "/path/to/dir"
assert_empty "command"
```

### 运行指定的测试类别

```bash
# 运行所有测试（单元测试 + E2E）
mise run test

# 仅运行单元测试
mise run test:unit

# 仅运行 E2E 测试
mise run test:e2e

# 使用随机顺序运行测试（用于检测顺序依赖）
mise run test:shuffle

# 运行 nightly 测试（使用最新的 Rust）
rustup default nightly && mise run test
```

### 运行单个测试

#### 运行单个单元测试

```bash
# 按名称运行指定的单元测试
cargo test test_name

# 运行匹配某个模式的测试
cargo test pattern

# 运行指定模块中的测试
cargo test module_name

# 运行单个测试并输出结果
cargo test test_name -- --nocapture
```

#### 运行单个 E2E 测试

```bash
# 按名称运行指定的 E2E 测试
./e2e/run_test test_name

# 运行匹配某个模式的 E2E 测试
mise run test:e2e pattern

# 示例：
./e2e/run_test test_use                    # 运行指定测试
./e2e/run_test test_config_set            # 运行与配置相关的测试
mise run test:e2e task                     # 运行所有匹配 "task" 的测试
```

#### 测试单个插件

```bash
# 测试指定插件
mise test-tool ripgrep

# 以详细输出模式测试插件
mise test-tool ripgrep --raw

# 测试多个插件
mise test-tool ripgrep jq terraform
```

### 性能测试

```bash
# 运行性能基准测试
mise run test:perf

# 构建性能测试工作区
mise run test:build-perf-workspace
```

### 快照测试

用于测试输出的一致性：

```bash
# 输出发生变化时更新测试快照
mise run snapshots

# 使用 cargo-insta 进行快照测试
cargo insta test --accept --unreferenced delete
```

## 开发环境设置

### 前置条件

- [Rust](https://www.rust-lang.org/)（最新稳定版，我们不使用 mise
  管理 Rust）
- mise

### 开始使用

```bash
# 克隆仓库
git clone https://github.com/jdx/mise.git
cd mise

# 安装依赖
mise install

# 构建项目
mise run build
```

### 开发 Shim

创建一个开发 Shim，以便在开发期间轻松运行 mise：

```bash
# 创建 ~/.local/bin/@mise
#!/bin/sh
exec cargo run -q --all-features --manifest-path ~/src/mise/Cargo.toml -- "$@"
```

然后使用 `@mise` 运行开发版本：

```bash
@mise --help
eval "$(@mise activate zsh)"
```

## 项目结构

```text
mise/
├── src/           # 主要 Rust 源代码
├── e2e/           # 端到端测试
├── docs/          # 文档
├── tasks.toml     # 开发任务
├── mise.toml      # 项目配置
├── Cargo.toml     # Rust 项目配置
└── xtasks/        # 其他构建脚本
```

## 可用的开发任务

使用 `mise tasks` 查看所有可用的开发任务：

### 常见任务

- `mise run build` - 构建项目
- `mise run test` - 运行所有测试（单元测试 + E2E）
- `mise run test:unit` - 仅运行单元测试
- `mise run test:e2e` - 仅运行 E2E 测试
- `mise run lint` - 运行代码检查
- `mise run lint-fix` - 运行并修复代码检查问题
- `mise run format` - 格式化代码
- `mise run clean` - 清理构建产物
- `mise run snapshots` - 更新测试快照
- `mise run render` - 生成文档和补全文件

### 文档任务

- `mise run docs` - 启动文档开发服务器
- `mise run docs:build` - 构建文档
- `mise run render:help` - 生成帮助文档
- `mise run render:completions` - 生成 Shell 补全

### 发布任务

- `mise run release-plz` - 创建发布版本
- `mise run ci` - 运行 CI 任务（格式化、构建、测试）

## 设置

据我所知不需要任何特殊配置，但运行 `mise run build` 是一个很好的检查方法，可以确保一切正常运行。

## 预提交钩子与代码质量

mise 使用 [hk](https://hk.jdx.dev) 作为其 Git 钩子管理器，用于
代码检查和质量检查。hk 是 lefthook 的现代替代方案，由与 mise 相同的作者编写。

### hk 配置

项目使用 `hk.pkl`（以 Pkl 配置语言编写）来定义
代码检查规则：

```bash
# 运行所有代码检查
hk check --all

# 运行并修复代码检查问题
hk fix --all

# 运行指定的代码检查工具
hk check --step shellcheck
```

### hk 中可用的代码检查工具

- **prettier**：适用于多种语言的代码格式化工具
- **clippy**：使用 `cargo clippy` 进行 Rust 代码检查
- **shellcheck**：Shell 脚本代码检查工具
- **shfmt**：Shell 脚本格式化工具
- **pkl**：Pkl 配置文件验证工具

### 在开发中使用 hk

`hk.pkl` 目前仅定义了 `check` 和 `fix` 步骤（没有 git `pre-commit` 钩子）。
`hk install --mise` 可能会报告没有安装任何内容，这是正常的。请使用
mise 任务：

```bash
# 运行代码检查（CI 中使用）
mise run lint  # This runs hk check --all

# 运行并修复代码检查问题
mise run lint-fix

# 检查特定文件类型
hk check --step prettier
hk check --step shellcheck
```

### 手动运行检查

```bash
# 运行所有检查
hk check --all

# 运行并修复检查问题
hk fix --all

# 检查特定文件
hk check --files="src/**/*.rs"
```

## 运行 CLI

我在 `~/.local/bin/@mise` 中使用以下 shim：

```sh
#!/bin/sh
exec cargo run -q --all-features --manifest-path ~/src/mise/Cargo.toml -- "$@"
```

::: info
别忘了将 manifest 路径修改为适合你设置的正确路径。
:::

然后，如果它位于 PATH 中，只需使用 `@mise`，即可通过即时编译来运行 mise。

```sh
@mise --help
eval "$(@mise activate zsh)"
@mise activate fish | source
```

## 发布

发布由 `release-plz` GitHub Actions 工作流自动创建
（CI 中的 `mise run release-plz`）。请勿在本地运行该任务。

## 代码检查

- 检查代码库：`mise run lint`
- 检查并修复代码库：`mise run lint-fix`

## 生成 readme 和 shell 补全文件

```sh
mise run render
```

## 依赖管理

mise 使用多个工具来验证依赖项和代码质量：

- **cargo-deny**：验证许可证、安全公告和重复依赖项
- **cargo-msrv**：验证最低支持的 Rust 版本兼容性
- **cargo-machete**：检测 Cargo.toml 中未使用的依赖项

这些检查会在 CI 中自动运行，也可以在本地运行：

```bash
# 运行检查（工具通过 mise.toml 自动提供）
cargo deny check
cargo msrv verify
cargo machete --with-metadata
```

## 约定式提交

mise 使用 [约定式提交](https://www.conventionalcommits.org/) 来确保提交消息的一致性并自动生成变更日志。所有提交都应遵循以下格式：

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型

- **feat**：新功能（🚀 功能）
- **fix**：错误修复（🐛 错误修复）
- **refactor**：代码重构（🚜 重构）
- **docs**：文档变更（📚 文档）
- **style**：代码风格变更（🎨 样式）
- **perf**：性能改进（⚡ 性能）
- **test**：测试变更（🧪 测试）
- **chore**：维护任务、依赖更新
- **revert**：还原之前的变更（◀️ 还原）

### 示例

```bash
feat(cli): add new command for listing plugins
fix(parser): handle edge case in version parsing
refactor(config): simplify configuration loading logic
docs(readme): update installation instructions
test(e2e): add tests for new plugin functionality
chore(deps): update dependencies to latest versions
```

### 作用域

mise 中常用的作用域：

- `cli` - 命令行界面变更
- `config` - 配置系统变更
- `task` - 任务运行器变更（使用 `task`，而不是 `run`）
- `backend` - 工具后端变更
- `ci` - CI / Cloud Agent / 基础设施
- `deps` - 依赖项更新
- `security` - 安全相关变更
- `registry` - 注册表条目（通常用作**类型**，而不是作用域）

### 破坏性变更

#### 破坏性变更政策

mise 很少接受破坏性变更，只有在没有更好替代方案的特殊情况下才会实施。当确实需要进行破坏性变更时，流程包括：

1. **CLI 警告**：用户将在 CLI 中收到弃用警告
2. **迁移期**：为用户提供数个月的迁移时间
3. **文档**：提供清晰的迁移指南
4. **社区通知**：在 Discord 和 GitHub 讨论区发布公告

对于破坏性变更，请在类型后添加 `!`，或在页脚中加入 `BREAKING CHANGE:`：

```bash
feat(api)!: remove deprecated configuration options
# 或
feat(api): remove deprecated configuration options

BREAKING CHANGE: The old configuration format is no longer supported
```

## CI/CD 与拉取请求自动化

mise 使用多个自动化工作流来维护代码质量并简化开发流程：

### 格式化与代码检查

- 在创建 PR 前运行 `mise run render` 和 `mise run lint-fix`
- 生成的文档、补全文件和快照应与触发生成的更改一同提交
- 存在格式化或代码检查失败的 PR 应由贡献者修复

### PR 标题验证

- **semantic-pr-lint**：验证 PR 标题是否遵循约定式提交格式
- PR 标题必须匹配：`<type>[optional scope]: <description>`
- 示例：`feat(cli): add new command for listing plugins`

### 持续集成

- **跨平台测试**：Ubuntu、macOS 和 Windows
- **单元测试**：快速的组件级测试
- **E2E 测试**：包含多个测试批次的完整集成测试
- **依赖验证**：`cargo deny`、`cargo msrv`、`cargo machete`

### 发布自动化

- **release-plz**：基于约定式提交的自动化发布管理
- 自动创建发布 PR 并发布版本
- 通过定时工作流每日运行
- 处理版本号更新和变更日志生成。

## 添加新设置

要添加新设置，请将其添加到项目根目录中的
[`settings.toml`](https://github.com/jdx/mise/blob/main/settings.toml)，然后运行
`mise run render` 以更新代码库。

## 添加工具

向 mise 添加工具需要向
[registry/](https://github.com/jdx/mise/blob/main/registry/) 文件添加条目。这样用户就可以使用
`mise use ripgrep` 这样的简短名称安装工具，而不必使用完整的后端规范。

### 快速开始

1. **为工具选择正确的后端**：

   - **[aqua](dev-tools/backends/aqua.md)** - 适用于具有安全功能的 GitHub 发布版本，优先选择
   - **[github](dev-tools/backends/github.md)** - 遵循标准约定的简单 GitHub 发布版本
   - **语言包管理器** - `npm`、`pipx`、`cargo`、`gem` 等，用于特定生态系统的工具
   - **[核心工具](core-tools.md)** - 对主要语言的内置支持
     （非用户贡献）

2. **添加到 registry/**：

   ```toml
   version_order = "semver"
   description = "Brief description of the tool"
   backends = ["aqua:owner/repo", "github:owner/repo"]
   test = { cmd = "your-tool --version", expected = "{{version}}" }
   ```

3. 使用 `mise test-tool your-tool` **测试工具**是否正常工作

### 指南和要求

添加新工具时，需要满足以下要求：

- **必须在 `registry/` 中包含测试** - 必须包含 `test` 字段来
  验证安装。注册表工作流中的
  [`validate-new-tools` 作业](https://github.com/jdx/mise/blob/main/.github/workflows/registry.yml)
  会自动强制执行此要求。
- **如果工具不够知名，可能会被拒绝** - 工具应当具有相当的知名度且维护良好。知名度由维护者审核决定（而非 CI）。对此没有具体指南，并且会综合考虑许多因素。@jdx 不会解释某个工具未被接受的原因。在 PR 描述中简要说明其受欢迎程度（star 数、下载量、最近发布日期），这样无需重新进行调研即可执行此政策。

#### 后端接受等级

为注册表条目选择哪个后端，与添加哪个工具同样重要。后端分为以下等级：

**第 1 级——首选，通常接受：** [`aqua`](/dev-tools/backends/aqua.html)、
[`github`](/dev-tools/backends/github.html) 和 [`gitlab`](/dev-tools/backends/gitlab.html)。

- 如果工具位于 [aqua 注册表](https://github.com/aquaproj/aqua-registry) 中，优先使用 `aqua` —
  它具有更好的用户体验、SLSA 验证和逐版本逻辑。
- 如果工具不在 aqua 中但发布 GitHub 版本，请使用 `github`。
- 对于通过 GitLab 发布的工具，请使用 `gitlab`。

**第 2 级——门槛较高，但低于第 3 级：** [`conda`](/dev-tools/backends/conda.html)。

对于无法合理通过 aqua/github 支持的工具，可以考虑接受。其门槛低于第 3 级，因为
**mise 的 conda 后端不要求单独安装包管理器** — 软件包会直接从 anaconda.org 下载并提取，
用户的 PATH 中无需存在 `conda`/`mamba`/`micromamba`。但工具仍然需要具有知名度且维护良好。

**第 3 级——门槛非常高，很少接受：** `npm`、`pipx`、`gem`、`cargo`、`go`、`dotnet`。

这些后端都依赖于用户 PATH 中存在单独安装的运行时或工具链（`node`、`python`、`ruby`、`cargo`、`go`、`dotnet`），这很脆弱 — 尤其是
`npm`/`pipx`/`gem` 会默默地将工具绑定到安装时恰好位于 PATH 中的
`node`/`python`/`ruby`，当版本发生变化或运行时未安装时就会失效。只有在不存在 aqua/github
选项且工具被广泛使用时才会接受。提交前请与 @jdx 讨论。

**不接受：** `asdf`、`vfox`、`ubi`。

- **新的 `asdf` 插件** — 供应链安全问题。请改用 [aqua](/dev-tools/backends/aqua.html) 或 [github](/dev-tools/backends/github.html)。
- **新的 `vfox` 插件** — 原因相同。请改用 aqua/github。
- **`ubi`** 已被弃用，新注册表条目不接受。

用户仍然可以通过显式语法自行使用任何后端安装
（`mise use vfox:owner/repo`、`mise use cargo:name` 等）— 只是无法获得相应的注册表简写。

### 注册表格式

`registry/` 文件使用以下格式：

```toml
# 工具名称 "your-tool"（将成为 `mise use` 的简短名称）
version_order = "semver"
description = "Tool description"
backends = [
    "aqua:owner/repo",           # 优先使用的后端
    "github:owner/repo",         # 后备后端
]
test = { cmd = "your-tool --version", expected = "{{version}}" }
aliases = ["alt-name"] # 可选的替代名称
os = ["linux", "macos"] # 可选的操作系统限制
```

每个注册表条目都必须明确将 `version_order` 设置为 `semver` 或
`source`。仅当工具的稳定版本始终使用严格的 `MAJOR.MINOR.PATCH` 语义版本时，才使用
`semver`。对于日期版本、两段式版本、渠道、引用、工具特定格式、版本历史混杂的情况，
或无法确定约定时，使用 `source`。语义排序目前会影响 Aqua、GitHub、GitLab、Forgejo
和 HTTP 后端；对于当前由后端自行负责版本排序的工具，该字段仍用于记录相关策略。

#### 约定式版本文件

注册表工具可以通过 `idiomatic_files` 选择使用
[约定式版本文件](/configuration.html#idiomatic-version-files)。文件名字符串使用 mise 默认的纯文本解析器：

```toml
backends = ["aqua:owner/repo"]
idiomatic_files = [".your-tool-version"]
```

对于结构化或特定工具的文件，可以使用与
[HTTP 后端的版本列表](/dev-tools/backends/http.html#version-listing)
支持的相同解析选项的表：

```toml
idiomatic_files = [
  { path = "your-tool.json", version_json_path = ".toolchain.version" },
  { path = "your-tool.conf", version_regex = 'version\s*=\s*"([^"]+)"' },
]
```

支持的解析器字段包括：

- `version_regex`：提取每个正则表达式匹配项；如果存在第一个捕获组，则使用该捕获组。
- `version_json_path`：使用类似 mise jq 的 JSON 路径语法提取值。
- `version_expr`：使用
  [expr-lang](https://expr-lang.org/) 表达式提取或后处理版本。原始内容可通过 `body` 获取，
  而由 `version_regex` 或 `version_json_path` 生成的版本可通过 `versions` 获取。

这些解析器在进程内执行，无法运行 shell 命令。纯字符串条目仍与现有注册表条目和后端原生解析器兼容。

只提取决定工具二进制兼容性的值。合适的候选值包括确切版本、最低/所需版本，
或有意与 CLI 主版本绑定的配置格式主版本。不要提取不相关的项目版本、依赖版本、
锁文件架构版本，或不限制工具本身的通用 `version` 字段。

包含工具官方搜索的所有文件名，包括 `.config/tool.yml` 等文档记录的嵌套路径。当后缀重叠时，mise 会使用最具体的匹配路径。

约定式文件默认处于禁用状态。用户可以使用以下命令为注册表简写启用它们：

```sh
mise settings add idiomatic_version_file_enable_tools your-tool
```

### 后端优先级

按偏好顺序列出后端。用户将获得第一个可用的后端，但可以使用
`mise use aqua:owner/repo` 等显式语法覆盖。

仅当工具已有非 npm 主后端且 npm 软件包在禁用生命周期脚本的情况下也能正常工作时，才将
`npm` 作为后备选项。

### 工具测试

所有工具都必须包含测试，以验证安装是否正确：

```toml
test = { cmd = "command-to-run", expected = "expected-output-pattern" }
```

测试命令应当可靠，输出模式应使用
<code v-pre>{{version}}</code> 来匹配任意版本号。

如果 `test.cmd` 需要 PATH 中存在由 mise 管理的其他工具，请通过
`test.tools` 声明。这仅由 `mise test-tool` 使用，不会影响工具的正常安装。

```toml
test = { cmd = "gradle -V", expected = "Gradle", tools = ["java"] }
```

### 注册表示例

近期添加的工具：

- **DuckDB**：简单的 github 后端（[#4248](https://github.com/jdx/mise/pull/4248)）

  ```toml
  [tools.duckdb]
  backends = ["github:duckdb/duckdb"]
  test = ["duckdb --version", "{{version}}"]
  ```

- **Biome**：多个后端（[#4283](https://github.com/jdx/mise/pull/4283)）

  ```toml
  [tools.biome]
  backends = ["aqua:biomejs/biome", "github:biomejs/biome"]
  test = ["biome --version", "Version: {{version}}"]
  ```

## 添加后端

:::warning 后端与工具混淆
**大多数贡献者想要添加的是工具，而不是后端。** 在阅读本节之前，请确认你确实需要一个新的后端。工具是独立的软件包（如 `node` 或 `ripgrep`），而后端是安装机制（如 `aqua` 或 `github`）。如果你想要向 mise 添加特定工具，请参阅[添加工具](#adding-tools)。
:::

:::warning 核心后端接纳政策
**新后端不太可能被 mise 核心接受。** 后端需要大量维护，因此通常更好的做法是使用[后端插件系统](backend-plugin-development.md)，在不修改核心代码的情况下添加后端。只有对于能够显著增强 mise 功能的主要包管理器或工具，才会考虑接受新的后端。

如果你需要自定义后端：

1. **先与 jdx 讨论**，可在 [Discord](https://discord.gg/UBa7pJUN7Z) 中进行，或创建一个[讨论](https://github.com/jdx/mise/discussions)
2. **考虑现有后端**（github、aqua、npm、pipx 等）是否能够满足你的需求
3. **创建插件** —— 使用[插件系统](tool-plugin-development.md)，无需修改核心代码即可为私有/自定义工具创建插件。可以从[mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template)开始快速设置

大多数工具安装需求都可以通过现有后端满足，尤其是用于 GitHub 发布版本的 [github](dev-tools/backends/github.md)，以及用于全面包管理的 [aqua](dev-tools/backends/aqua.md)。
:::

后端是 mise 对不同工具安装方式的抽象。每个后端都实现 `Backend` trait，从而为不同的安装系统提供一致的功能。

### 后端类型

- **核心后端**（`src/backend/core/`）——内置的语言运行时，如
  Node.js、Python、Ruby
- **包管理器后端**（`src/backend/`）——npm、pipx、cargo、gem、go
  模块
- **通用安装器**（`src/backend/`）——用于 GitHub 发布版本和包管理的 github、aqua
- **插件后端**（`src/backend/`）——插件可以提供自定义后端或独立工具

### 实现步骤

1. **在 `src/backend/` 中创建后端模块**（例如 `my_backend.rs`）

2. **实现 Backend trait**：

   ```rust
   use crate::backend::{Backend, BackendType};
   use crate::install_context::InstallContext;

   #[derive(Debug)]
   pub struct MyBackend {
       // 后端特定字段
   }

   impl Backend for MyBackend {
       fn get_type(&self) -> BackendType { BackendType::MyBackend }

       async fn list_remote_versions(&self) -> Result<Vec<String>> {
           // 列出可用版本的实现
       }

       async fn install_version(&self, ctx: &InstallContext,
                                 tv: &ToolVersion) -> Result<()> {
           // 安装特定版本的实现
       }

       async fn uninstall_version(&self, tv: &ToolVersion) -> Result<()> {
           // 卸载版本的实现
       }

       // ... 其他必需方法
   }
   ```

3. **在 `src/backend/mod.rs` 中注册后端**：

   - 将你的后端添加到导入项中
   - 将其添加到后端注册表/工厂函数中
   - 添加 `BackendType` 枚举变体

4. **在 `src/cli/args/backend_arg.rs` 中添加 CLI 参数解析**（如有需要）

5. **更新 `registry/` 中的注册表**（如果应该支持将其作为简写）

### 测试要求

- 在 `e2e/backend/test_my_backend` 中添加**集成测试**
- **测试**从你的后端安装工具以及使用这些工具
- 如果后端支持 Windows，则进行 **Windows 测试**

### 文档

- **更新 `docs/dev-tools/backends/` 中的后端文档**
- **添加使用示例**，展示如何使用你的后端安装工具
- 如果添加了新的简写工具，则**更新注册表文档**

### 实现示例

参考现有后端的实现模式：

- `src/backend/github.rs` —— 简单的 GitHub 发布版本安装器
- `src/backend/npm.rs` —— 包管理器集成
- `src/backend/core/node.rs` —— 完整的语言运行时实现

如需详细了解架构信息，请参阅
[后端架构](dev-tools/backend_architecture.md)。

## 测试打包

只有在实际修改打包设置时才需要进行此操作。

### Ubuntu（apt）

这是针对 arm64 的，但如果需要，也可以将架构更改为 amd64。

```sh
docker run -ti --rm ubuntu
apt update -y
apt install -y curl
install -dm 755 /etc/apt/keyrings
curl -fSso /etc/apt/keyrings/mise-archive-keyring.pub https://mise.jdx.dev/gpg-key.pub
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.pub arch=arm64] \
https://mise.jdx.dev/deb stable main" >/etc/apt/sources.list.d/mise.list
apt update -y
apt install -y mise
mise -V
```

### Fedora（dnf）

```sh
docker run -ti --rm fedora
dnf copr enable -y jdxcode/mise && dnf install -y mise && mise -v
```

### RHEL（dnf）

```sh
docker run -ti --rm registry.access.redhat.com/ubi9/ubi:latest
dnf copr enable -y jdxcode/mise && dnf install -y mise && mise -v
```
