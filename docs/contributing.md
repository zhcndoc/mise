---
description: "mise has a specific scope and design taste."
outline: [2, 3]
---

# 贡献指南

## Community Participation

AI-assisted responses are welcome, including one-off responses from people trying to help.
This is especially true when you are answering your own question, are directly involved in or
personally connected to the original question, or are an established project contributor. In
all cases, review and verify the response before posting it.

Do not use AI to spam project support channels with drive-by answers across Discussions when
you have no connection to the questions or the project. This includes raw, lightly edited, or
disclosed model output. This policy is intended to prevent discussion spam, not discourage
individual responses. Accounts that engage in this behavior will be blocked from the project.

## Contribution Expectations

mise has a specific scope and design taste. Unless the change is obvious,
start a [discussion](https://github.com/jdx/mise/discussions) or mention what
you plan to do in [Discord](https://discord.gg/mABnUDvP57) before opening a PR.
The important part is to settle the direction before much implementation or
review happens. PRs are often rejected or need to change significantly after
submission, so make sure the idea fits before you invest too much time.

在我评审 PR 之前，CI 必须通过，PR 标题必须遵循
[约定式提交](#conventional-commits)，并且所有自动化 AI 评审评论都必须得到处理。如果其中任何一项仍未完成，请假设我会等到完成后再查看 PR。

如果我对某项贡献犹豫不决，我很可能会仅因此拒绝它。如果不这样做，mise 就会受到功能膨胀的影响。如果代码质量差到让我无法相信贡献者能够将其完成，我也可能会拒绝 PR。我没有时间指导贡献者。

我每周会在各个项目中收到数百个 PR，因此没有时间为每个 PR 都提供详细背景说明。拒绝理由可能会很简短。

## Development Setup

### Prerequisites

- A Rust toolchain meeting the `rust-version` in the root `Cargo.toml`; the project does
  not declare Rust under `[tools]`, so your selected toolchain must already be suitable.
- A working mise installation meeting `min_version` in `mise.toml`.
- Git and the host dependencies required by the checks you plan to run.

### Getting Started

```bash
# Clone the repository
git clone https://github.com/jdx/mise.git
cd mise

# Install dependencies
mise install

# Build and verify the development binary
mise run build
target/debug/mise --version
```

### Development Shim

The repository adds `target/debug` and `node_modules/.bin` to its task environment. Use
`target/debug/mise` directly to check which binary you are testing. For a recompiling wrapper,
see [Running the CLI](#running-the-cli).

### Cargo build cache

`mise install` installs the mbx version selected by the project. `mise run` activates its
transparent Cargo wrapper, so build and lint tasks invoke ordinary Cargo commands through
the cache. Standalone Cargo commands need an activated mise shell.

If the wrapper fails, run the equivalent Cargo check with `MBX_DISABLE=1`; this bypasses
the cache without skipping validation:

```sh
MBX_DISABLE=1 cargo build --all-features
MBX_DISABLE=1 cargo test --all-features
MBX_DISABLE=1 cargo check --all-features
```

If bypassed Cargo succeeds, report the mismatch in a
[mr-boxington discussion](https://github.com/jdx/mr-boxington/discussions) with repository and
commit, OS, `mbx --version`, `mbx doctor`, and both commands/output. Redact secrets, absolute
cache paths, remote URLs, namespaces, and identifying details before posting.

## Pull Request Checklist

1. **先进行讨论**：对于不明显的更改，请使用 GitHub Discussions 或 Discord
2. **使用规范的标题**：PR 标题会自动进行验证
   - 对于注册表中的新工具：使用 `registry: add tool-name (backend:full/name)`
3. **运行本地检查**：在适用的情况下，提交 PR 前运行 `mise run render` 和 `mise run lint-fix`
4. **进行全面测试**：确保相关的单元测试和端到端测试通过
5. **更新文档**：为面向用户的更改添加或更新文档
6. **保持依赖项健康**：新依赖项会通过 cargo-deny 进行验证

### 开发提示

Use the project tasks for the supported environment and the development binary at
`target/debug/mise` when verifying a change. Read [Development Setup](#development-setup)
first, then run focused checks for the feature you changed. Set `MISE_DEBUG=1` or
`MISE_TRACE=1` when diagnosing CLI behavior.

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

Use `mise tasks ls` to list tasks and `mise tasks info <name>` to see their resolved source.
This repository loads both `tasks.toml` and file tasks under `xtasks`; a file task can replace
a same-named TOML task, so inspect the resolved task when behavior is surprising.

### 常见任务

- `mise run build` - Build the project
- `mise run test:unit` followed by `mise run test:e2e --all` - Explicitly run unit and E2E suites
- `mise run test:unit` - Run unit tests only
- `mise run test:e2e <test-pattern>` - Run selected E2E tests
- `mise run lint` - Run linting
- `mise run lint-fix` - Run linting with fixes
- `mise run format` - Format code
- `mise run clean` - Clean build artifacts
- `mise run snapshots` - Update test snapshots
- `mise run render` - Generate documentation and completions

### 文档任务

- `mise run docs` - Start documentation development server
- `mise run docs:build` - Build documentation
- `mise run render:usage` - Generate CLI reference documentation
- `mise run render:completions` - Generate shell completions

### 发布任务

- `mise run release-plz` - CI-only release automation; do not run locally
- `mise run ci` - Run CI tasks (format, build, test)

## 设置

After installing prerequisites, `mise run build` and `target/debug/mise --version` establish
that the selected toolchain can build and run the checkout. Run feature-specific tests next.

## 运行 CLI

我在 `~/.local/bin/@mise` 中使用以下 shim：

```sh
#!/bin/sh
exec cargo run -q --all-features --manifest-path "$HOME/src/mise/Cargo.toml" -- "$@"
```

::: info
别忘了将 manifest 路径修改为适合你设置的正确路径。
:::

Make the wrapper executable and put its directory on PATH. `@mise` recompiles the checkout
when needed. Use a disposable shell when testing development activation so a broken hook
does not interfere with your normal shell.

```sh
@mise --help
eval "$(@mise activate zsh)"
@mise activate fish | source
```

## Pre-commit Hooks & Code Quality

### hk Configuration

[`hk.pkl`](https://github.com/jdx/mise/blob/main/hk.pkl) defines `check` and `fix` workflows.
It currently has no Git `pre-commit` hook, so `hk install --mise` may report that there is
nothing to install. Run the checks explicitly before committing.

### Available Linters in hk

The configured steps include Prettier, Markdown linting, Cargo formatting/checking,
ShellCheck, shfmt, Pkl, TOML/schema validation, and Lua checks. The Clippy block
in `hk.pkl` is disabled; CI runs Clippy separately. Read the current configuration rather
than assuming a successful hk run includes every Rust lint.

### Using hk in Development

```sh
mise run lint
mise run lint-fix
```

Review and stage the fixes before committing. Do not add Clippy exclusions to make a check
pass; refactor the code so the applicable lint succeeds.

### Running Checks Manually

For an effect-aware check scoped to changed files:

```sh
mise exec hk -- hk run check --safe --format json
```

To check an exact file list, pass NUL-delimited paths with `--files0-from`. Check hk's reported
results: a skipped step is not a passed step. The project tasks remain the normal entry point
for the full configured workflows.

## Testing

Choose checks that demonstrate the changed behavior. Use unit tests for local parsing and
resolution, E2E tests for commands and shell boundaries, and snapshots for output that
needs a stable contract. Avoid live downloads when a local fixture can cover the behavior.

### Unit Tests

```sh
mise run test:unit
cargo test --all-features test_name
cargo test --all-features module_name -- --nocapture
```

Standalone Cargo commands need the activated development environment described in
[Cargo build cache](#cargo-build-cache).
The main binary's test initialization sets fixture paths and shared process state;
`.cargo/config.toml` and the task configure `RUST_TEST_THREADS=1`. Use existing environment
and current-directory guards when changing shared state in a test.

For the Lua runtime crate, use `mise --cd crates/vfox run test`. Tests and fixtures there
exercise hook return values and built-in modules independently of the CLI adapter.

### E2E Tests

Always use the mise task, which builds the project and invokes the test wrapper:

```sh
# A concrete test path or a regex matching test basenames
mise run test:e2e e2e/cli/test_version
mise run test:e2e '^test_use$'
mise run test:e2e '^test_task_'

# Inspect available files or run the complete suite
mise run test:e2e --list
mise run test:e2e --all
TEST_ALL=1 mise run test:e2e --all
```

The wrapper matches **basenames** after stripping a supplied path. A directory such as
`e2e/tasks` is not a directory filter. Use a concrete test file or a filename pattern and
check which tests ran. With no arguments, the current wrapper selects no files; use
`--all` explicitly for the full suite. `*_slow` files require `TEST_ALL=1`.

The harness creates isolated mise configuration, data, state, and working directories.
It still needs host prerequisites such as the shell under test, compilers, or a running
service. Let the harness handle cleanup. Do not execute files under `e2e/` directly or
change their executable bit to run them.

Supply `MISE_GITHUB_TOKEN` or `GITHUB_TOKEN` when a test needs GitHub API access. Avoid
printing credentials in debug output or failure reports.

### Coverage Tests

`mise run test:coverage` is the CI-oriented setup/E2E runner in `xtasks/test/coverage`.
Coverage instrumentation is supplied by its environment; running it locally by itself does
not create an instrumented build. The full runner supports `TEST_TRANCHE` and
`TEST_TRANCHE_COUNT` for partitioning tests.

### Windows E2E Tests

Install the Pester module in PowerShell and build the Windows binary first. The runner adds
`target/debug` to PATH:

```powershell
pwsh -File e2e-win/run.ps1
pwsh -File e2e-win/run.ps1 -TestName '*task*'
```

The filter matches Pester test names. Tests for activation and PATH should execute a child
command and verify its behavior, including a native Windows grandchild where relevant.

### Plugin Tests

`mise test-tool` tests **registry tools**, including tools using built-in backends; it is not
limited to plugins. It performs real installations and runs the entry's configured test:

```sh
mise test-tool ripgrep
mise test-tool ripgrep jq
mise test-tool ripgrep --raw
```

Use `--all` only when you intend to test the whole registry, and `--all-config` for configured
tools. These can involve many downloads, host dependencies, and long builds. Plugin authors
should also read [Plugin Publishing](/plugin-publishing.html#testing-before-publication).

### Test Environment Setup

Use the supported task/harness instead of setting `MISE_DISABLE_TOOLS=1` or broad trust
paths in your normal shell. Those settings can hide the very integration the test should
exercise. A test that invokes a host package manager must isolate its host-managed state
separately from mise's directories.

### Test Assertions

`e2e/assert.sh` provides exact-output, substring, failure, JSON, and filesystem helpers.
For example, inside an E2E test:

```sh
assert "mise exec -- printf '%s' hello" "hello"
assert_contains "mise --version" "mise"
assert_fail "mise definitely-not-a-command"
```

`assert_fail "command" "substring"` checks both failure status and an output substring.
`assert_fail_contains` requires a message to check; `assert_fail_matches` checks a regular
expression. Choose the helper that expresses the behavior you need to verify.

### Running Specific Test Categories

Run `mise run test:unit` and a focused E2E selection while developing. For an explicit full
local run, use `mise run test:unit` followed by `mise run test:e2e --all`. The aggregate
`test` task currently invokes the E2E wrapper without a selection, so do not infer E2E
coverage from that task's success alone.

`mise run test:shuffle` requires nightly Rust and tests order sensitivity. Use a command-local
toolchain selection; do not change your global Rust default just to run one check.

### Running Individual Tests

Use Cargo's name filter for a unit test and the E2E basename patterns shown above for a CLI
test. Confirm the output reports the intended test count; a successful command with zero
matching tests has not verified the change.

### Performance Testing

`mise run test:perf` prepares a workspace and runs the performance scripts. Read the script's
host-tool requirements before using it on macOS. The separate `mise run perf` task uses tak;
keep the build profile and runner class consistent when comparing results.

### Snapshot Testing

Run `mise run snapshots` when expected output intentionally changes. Review the resulting
`.snap` diff, including removed snapshots; do not accept snapshots as a substitute for
checking the behavior that produced them.

## 生成 readme 和 shell 补全文件

Edit source inputs, then regenerate the outputs affected by your change:

| Change | Source and generation |
| --- | --- |
| CLI help or arguments | `src/cli` → `mise run render:usage`; regenerate completions when command structure changes |
| Settings | `settings.toml` → `mise run render:schema` |
| All generated docs and completions | `mise run render` |
| Docs website | Edit Markdown/Vue sources; run `mise run docs:build` |
| Documentation index for agents | `mise exec bun -- bun docs/.vitepress/llms.ts` after the final docs changes |

CLI pages under `docs/cli` are generated. Do not patch those files without changing their
source or generator. Docs examples use **TOML 1.1**; multiline inline tables, comments, and
trailing commas are valid. Use a compatible parser when validating examples.

Before opening a docs PR, rebase on the current `main`, resolve source conflicts, and rebuild
`docs/public/llms.txt` from the rebased tree. Build the website to catch Markdown/Vue and
link errors. Commit required generated changes with the source changes that produced them.

## 依赖管理

mise 使用多个工具来验证依赖项和代码质量：

- **cargo-deny**：验证许可证、安全公告和重复依赖项
- **cargo-msrv**：验证最低支持的 Rust 版本兼容性
- **cargo-machete**：检测 Cargo.toml 中未使用的依赖项

CI installs these tools separately; they are not all declared in the project's `mise.toml`.
Install the required tool before running its check locally. Consult the
[test workflow](https://github.com/jdx/mise/blob/main/.github/workflows/test-impl.yml) for
the exact CI environment and flags:

```bash
# Run the installed dependency-check tools
cargo deny check
cargo msrv verify
cargo machete --with-metadata
```

## 约定式提交

mise uses [Conventional Commits](https://www.conventionalcommits.org/) for
PR titles and automated changelog generation. PR titles **must** use this format;
intermediate commit subjects should follow it too:

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型

- **feat**: New features (🚀 Features)
- **fix**: Bug fixes (🐛 Bug Fixes)
- **refactor**: Code refactoring (🚜 Refactor)
- **docs**: Documentation changes (📚 Documentation)
- **style**: Code style changes (🎨 Styling)
- **perf**: Performance improvements (⚡ Performance)
- **test**: Testing changes (🧪 Testing)
- **chore**: Maintenance tasks, dependency updates
- **ci**: CI and automation changes
- **security**: Security-related changes
- **registry**: Registry changes (without a scope)
- **revert**: Reverting previous changes (◀️ Revert)

### 示例

```text
feat(cli): add new command for listing plugins
fix(parser): handle edge case in version parsing
refactor(config): simplify configuration loading logic
docs(readme): update installation instructions
test(e2e): add tests for new plugin functionality
chore(deps): update dependencies to latest versions
```

Start the description with a lowercase character and use an imperative verb. Use `docs:`
for documentation changes and `fix:` for CLI behavior fixes, not CI or infrastructure.

### Scopes

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

1. Mark the feature deprecated in documentation immediately and normally add a CLI warning
   with `deprecated_at!` in the same release.
2. Allow 12 months after the warning before removal.
3. Delay the warning by up to 6 months only when migration requires a new setting, syntax,
   or replacement that older supported clients reject. Removal remains 12 months after
   the warning, not after the initial documentation notice.
4. Provide a working migration path and explain the affected behavior.

对于破坏性变更，请在类型后添加 `!`，或在页脚中加入 `BREAKING CHANGE:`：

```text
feat(api)!: remove deprecated configuration options
# 或
feat(api): remove deprecated configuration options

BREAKING CHANGE: The old configuration format is no longer supported
```

## CI/CD 与拉取请求自动化

mise 使用多个自动化工作流来维护代码质量并简化开发流程：

### 格式化与代码检查

- Run `mise run render` and `mise run lint-fix` before opening a PR
- Generated docs, completions, and snapshots should be committed with the
  change that requires them
- The contributor is responsible for fixing formatting or lint failures

### PR 标题验证

- **semantic-pr-lint**: Validates that PR titles follow the conventional commit format
- PR titles must match: `<type>[optional scope][optional !]: <description>`
- Example: `feat(cli): add new command for listing plugins`

### 持续集成

- **跨平台测试**：Ubuntu、macOS 和 Windows
- **单元测试**：快速的组件级测试
- **E2E 测试**：包含多个测试批次的完整集成测试
- **依赖验证**：`cargo deny`、`cargo msrv`、`cargo machete`

### 发布自动化

- **release-plz**: Automated release management based on conventional commits
- Automatically creates release PRs and publishes releases
- Runs on every push to `main` and daily via scheduled workflow
- Handles version bumping and changelog generation
- The release PR's dry run (`release.yml`) only builds the release tarballs
  once auto-merge is enabled on that PR. Until then its required `release`
  check fails with a message saying so, which keeps the PR from merging
  without a dry run while avoiding a full tarball build on every push to
  `main`.

## 添加新设置

要添加新设置，请将其添加到项目根目录中的
[`settings.toml`](https://github.com/jdx/mise/blob/main/settings.toml)，然后运行
`mise run render` 以更新代码库。

## 添加工具

Adding tools to mise involves adding a TOML file to the
[registry/](https://github.com/jdx/mise/blob/main/registry/) directory. This
allows users to install tools using short names like `mise use ripgrep` instead
of the full backend specification.

### 快速开始

First check the popularity requirements below. A new shorthand is for an already widely
used tool, not a way to make a personal or niche project installable. Explicit backend
syntax works without a registry entry.

1. **Choose the right backend** for your tool:

   - **[packslip](dev-tools/backends/packslip.md)** - Preferred when the project
     publishes signed release manifests
   - **[aqua](dev-tools/backends/aqua.md)** - Curated metadata and security
     features for tools without packslips
   - **[github](dev-tools/backends/github.md)** - Simple GitHub releases following
     standard conventions
   - **[gitlab](dev-tools/backends/gitlab.md)** - Tools released through GitLab
   - **Language package managers** - `npm`, `pipx`, `cargo`, `gem`, etc. for
     ecosystem-specific tools
   - **[Core tools](core-tools.md)** - Built-in support for major languages
     (not user-contributed)

2. **添加到 registry/**：

   ```toml
   version_order = "semver"
   description = "Brief description of the tool"
   backends = ["packslip:github.com/owner/repo", "aqua:owner/repo", "github:owner/repo"]
   bins = ["your-tool"]
   test = { cmd = "your-tool --version", expected = "{{version}}" }
   ```

3. **Verify version listing** with `mise ls-remote <backend:identifier>`. A backend that can
   install only an explicitly pinned version is insufficient.
4. **Test the tool** with `mise test-tool your-tool` to confirm installation and execution.

### 指南和要求

添加新工具时，需要满足以下要求：

- **A test is required in `registry/`** - Must include a `test` field to
  verify installation. This is automatically enforced by the
  [`validate-new-tools` job](https://github.com/jdx/mise/blob/main/.github/workflows/registry.yml)
  in the registry workflow.
- **New tools must already be widely used** - The bar is normally thousands of GitHub stars,
  active maintenance, and real use outside the author's projects. Personal, internal, niche,
  and low-popularity tools do not meet it. A working installer or passing test is not enough.
  @jdx won't explain why a given tool wasn't accepted.
- **Include popularity evidence** - Put current stars/forks, release activity, relevant
  package downloads, and examples of third-party use in the PR description. Check the actual
  numbers before proposing an entry; do not submit speculatively.

#### 后端接受等级

为注册表条目选择哪个后端，与添加哪个工具同样重要。后端分为以下等级：

**Tier 1 — preferred, routinely accepted:** [`packslip`](/dev-tools/backends/packslip.html).

Use `packslip` when the project publishes signed release manifests. mise verifies
the signer and artifact digests without a plugin or separate package manager.

**Tier 2 — routinely accepted:** [`aqua`](/dev-tools/backends/aqua.html),
[`github`](/dev-tools/backends/github.html), and [`gitlab`](/dev-tools/backends/gitlab.html).

- When the project does not publish packslips, prefer `aqua` if the tool is in the [aqua registry](https://github.com/aquaproj/aqua-registry) —
  it has better UX, SLSA verification, and per-version logic.
- Use `github` when the tool isn't in aqua but ships GitHub releases.
- Use `gitlab` for tools released through GitLab.

**Tier 3 — high bar, but lower than tier 4:** [`conda`](/dev-tools/backends/conda.html).

Potentially accepted for tools that can't reasonably be supported via packslip/aqua/github/gitlab.
The bar is lower than tier 4 because **mise's conda backend does not require a
separately-installed package manager** — packages are downloaded and extracted
directly from anaconda.org, with no `conda`/`mamba`/`micromamba` needed on the
user's PATH. The tool still needs to be popular and well-maintained.

**Tier 4 — very high bar, rarely accepted:** `npm`, `pipx`, `gem`, `cargo`, `go`, `dotnet`.

Runtime and toolchain dependencies add setup and reproducibility constraints. For example,
npm requires Node, and gems depend on their Ruby installation. Requirements differ by
backend: pipx's default uv mode can provision Python, so consult the backend's guide rather
than assuming every dependency must already be on PATH. These backends are accepted only
when no packslip/aqua/github/gitlab option exists and the tool is widely used. Get explicit
agreement from @jdx before submitting an entry using one of these backends.

**不接受：** `asdf`、`vfox`、`ubi`。

- **New `asdf` plugins** — rejected for supply-chain security reasons. Use [packslip](/dev-tools/backends/packslip.html), [aqua](/dev-tools/backends/aqua.html), [github](/dev-tools/backends/github.html), or [gitlab](/dev-tools/backends/gitlab.html) instead.
- **New `vfox` plugins** — same reason. Use packslip/aqua/github/gitlab instead.
- **`ubi`** is deprecated and is not accepted for new registry entries.

用户仍然可以通过显式语法自行使用任何后端安装
（`mise use vfox:owner/repo`、`mise use cargo:name` 等）— 只是无法获得相应的注册表简写。

### 注册表格式

Each `registry/<tool>.toml` file uses this format:

```toml
# 工具名称 "your-tool"（将成为 `mise use` 的简短名称）
version_order = "semver"
description = "Tool description"
backends = [
    "packslip:github.com/owner/repo", # Preferred when the project publishes packslips
    "aqua:owner/repo",               # Fallback backend
    "github:owner/repo",             # Fallback backend
]
bins = ["your-tool"]
test = { cmd = "your-tool --version", expected = "{{version}}" }
aliases = ["alt-name"] # 可选的替代名称
os = ["linux", "macos"] # 可选的操作系统限制
```

Only list backends that support the tool: `packslip` requires signed release
manifests, and `aqua` requires an entry in the aqua registry.

Every registry entry must explicitly set `version_order` to `semver` or
`source`. Use `semver` only when the tool's stable releases consistently use
strict `MAJOR.MINOR.PATCH` semantic versions. Use `source` for date versions,
two-component versions, channels, refs, tool-specific formats, mixed histories,
or whenever the convention is uncertain. Semantic ordering currently affects
the Aqua, GitHub, GitLab, Forgejo, and HTTP backends; the field still documents
the policy for tools whose current backend owns version ordering itself.

Set `bins` to the tool's executable names so mise can create shims for
[lazy installation](/dev-tools/shims.html#lazy-tools) before downloading the tool. When
`packslip` or another non-Aqua backend is first, mise cannot infer these names
from the registry entry; list them explicitly as in the examples above.

When `aqua` is the first backend, mise derives the command names from the Aqua
registry's file metadata. Omit `bins` when that inferred list is correct. Set it
explicitly when the shorthand needs a different backend-independent command set,
such as commands bundled by a fallback backend that Aqua does not describe.

#### Minimum backend versions

When a backend supports only newer releases, set `min_version` on that backend.
For example, hk publishes Packslip manifests starting at 1.58.1:

```toml
version_order = "semver"
backends = [
  { full = "packslip:github.com/jdx/hk", min_version = "1.58.1" },
  "aqua:jdx/hk",
]
bins = ["hk"]
```

The minimum is inclusive and must be a complete semantic version. It is only
supported for registry tools with `version_order = "semver"`; do not add it to
tools with opaque or source-ordered versions. `mise use hk@1.57` and
`mise use hk@1.58.0` select Aqua, while `mise use hk@1.58.1` selects Packslip.
A prefix overlapping the boundary, such as `1.58`, keeps the preferred backend.
`latest`, channels, and unresolved aliases retain normal backend priority;
aliases are checked again after resolution.

Selection still respects platform support and disabled backends. Explicit
backend identifiers, backend overrides, and a matching lockfile's recorded
backend remain authoritative. A failed download or signature verification does
not trigger fallback. A backend without `min_version` has no lower bound.

#### Idiomatic version files

注册表工具可以通过 `idiomatic_files` 选择使用
[约定式版本文件](/configuration.html#idiomatic-version-files)。文件名字符串使用 mise 默认的纯文本解析器：

```toml
backends = ["aqua:owner/repo"]
idiomatic_files = [".your-tool-version"]
```

For structured or tool-specific files, use a table with the same parsing options supported by the
[HTTP backend's version listing](/dev-tools/backends/http.html#version-list-url):

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

仅提取说明项目所构建版本的值。合适的候选值包括确切版本，或与 CLI 主版本有意绑定的配置格式主版本。不要提取**最低兼容版本**——诸如 `cmake_minimum_required` 或 `package.json` 的 `engines` 之类的下限描述的是使用者需要什么，而不是项目基于什么进行开发；解析此类值会将用户固定到受支持的最旧版本（参阅[ mise 读取哪些字段](/configuration.html#which-fields-mise-reads)）。也不要提取无关的项目版本、依赖项版本、锁文件架构修订版本，或不会约束工具本身的通用 `version` 字段。

现有的、读取下限版本的条目可以通过在文件中设置 `deprecated = "<reason>"` 来弃用；这样它仍能解析，同时警告用户将版本移入 `mise.toml`。

包含工具官方搜索的所有文件名，包括 `.config/tool.yml` 等文档记录的嵌套路径。当后缀重叠时，mise 会使用最具体的匹配路径。

约定式文件默认处于禁用状态。用户可以使用以下命令为注册表简写启用它们：

```sh
mise settings add idiomatic_version_file_enable_tools your-tool
```

### 后端优先级

List backends in order of preference. Users get the first available backend
but can override it with explicit syntax such as `mise use aqua:owner/repo`.
Only include `npm` as a fallback for a tool that already has a non-npm primary
backend when the npm package works with lifecycle scripts disabled.

仅当工具已有非 npm 主后端且 npm 软件包在禁用生命周期脚本的情况下也能正常工作时，才将
`npm` 作为后备选项。

### 工具测试

所有工具都必须包含测试，以验证安装是否正确：

```toml
test = { cmd = "command-to-run", expected = "expected-output-pattern" }
```

The test command should be reliable and verify the installed executable. The template
<code v-pre>{{version}}</code> expands to the selected tool version; it is not a wildcard
matching any version. Use it when the command prints that version, or choose another stable
output check appropriate for the tool.

如果 `test.cmd` 需要 PATH 中存在由 mise 管理的其他工具，请通过
`test.tools` 声明。这仅由 `mise test-tool` 使用，不会影响工具的正常安装。

```toml
test = { cmd = "gradle -V", expected = "Gradle", tools = ["java"] }
```

### 注册表示例

Examples of registry shapes (consult the current files for all fields):

- **DuckDB**: Aqua backend ([#4248](https://github.com/jdx/mise/pull/4248))

  ```toml
  # registry/duckdb.toml
  version_order = "semver"
  backends = ["aqua:duckdb/duckdb"]
  test = { cmd = "duckdb --version", expected = "{{version}}" }
  ```

- **Biome**：多个后端（[#4283](https://github.com/jdx/mise/pull/4283)）

  ```toml
  # registry/biome.toml
  version_order = "semver"
  backends = ["aqua:biomejs/biome", "npm:@biomejs/biome"]
  test = { cmd = "biome --version", expected = "Version: {{version}}" }
  ```

## 添加后端

:::warning 后端与工具混淆
**大多数贡献者想要添加的是工具，而不是后端。** 在阅读本节之前，请确认你确实需要一个新的后端。工具是独立的软件包（如 `node` 或 `ripgrep`），而后端是安装机制（如 `aqua` 或 `github`）。如果你想要向 mise 添加特定工具，请参阅[添加工具](#adding-tools)。
:::

:::warning Core Backend Acceptance Policy
**New backends are unlikely to be accepted into mise core.** They require
a lot of maintenance, so it's generally better to use the
[backend plugin system](backend-plugin-development.md) to add backends without
core changes. A new backend would be accepted only for a major package manager
or tool that would greatly enhance mise's capabilities.

如果你需要自定义后端：

1. **Discuss with jdx first** in [Discord](https://discord.gg/mABnUDvP57) or by
   creating a [discussion](https://github.com/jdx/mise/discussions)
2. **Consider whether existing backends** (github, aqua, npm, pipx, etc.) can meet
   your needs
3. **Create a plugin** - use the [plugin system](tool-plugin-development.md) to create plugins for private/custom tools without core changes. Start with the [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) for a quick setup

大多数工具安装需求都可以通过现有后端满足，尤其是用于 GitHub 发布版本的 [github](dev-tools/backends/github.md)，以及用于全面包管理的 [aqua](dev-tools/backends/aqua.md)。
:::

后端是 mise 对不同工具安装方式的抽象。每个后端都实现 `Backend` trait，从而为不同的安装系统提供一致的功能。

### 后端类型

- **Core Tools** (`src/plugins/core/`) - Built-in language runtimes like
  Node.js, Python, Ruby
- **Package Manager Backends** (`src/backend/`) - npm, pipx, cargo, gem, go
  modules
- **Universal Installers** (`src/backend/`) - github, aqua for GitHub releases and
  package management
- **Plugin Backends** (`src/backend/`) - plugins can provide custom backends or individual tools

### 实现步骤

1. **在 `src/backend/` 中创建后端模块**（例如 `my_backend.rs`）

2. **Implement the current Backend trait** in
   [`src/backend/mod.rs`](https://github.com/jdx/mise/blob/main/src/backend/mod.rs).
   Follow a nearby backend with the same installation model. Shared wrapper methods handle
   caching and policy; implement the appropriate hooks, such as `_list_remote_versions`
   (which returns `VersionInfo` entries) and `install_version_`, rather than duplicating the
   wrapper logic. Preserve opaque versions and delegate resolution to the backend.

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

- `src/backend/github.rs` - Simple GitHub release installer
- `src/backend/npm.rs` - Package manager integration
- `src/plugins/core/node.rs` - Full language runtime implementation

如需详细了解架构信息，请参阅
[后端架构](dev-tools/backend_architecture.md)。

## Packaging and Self-Update Instructions

When mise is installed via a package manager, `mise self-update` should not replace the binary the package manager owns; users should update through the package manager instead. This is opt-in: a package that does none of the following keeps self-update fully enabled. Packagers have three ways to turn it off, and any of them makes `mise doctor` report `self_update_available: no`.

The paths below are relative to the install prefix, which mise derives from its own binary: the path is canonicalized (symlinks resolved) and then taken two levels up, so `/usr/bin/mise` gives `/usr`.

### Disable at build time

Build without the `self_update` Cargo feature. This example retains native TLS and bundled
Lua; a package using system Lua should choose its features and build dependencies accordingly:

```bash
cargo build --release --no-default-features --features native-tls,vfox/vendored-lua
```

The subcommand still exists, so scripts that call it get a clear error rather than "unknown command", but it always fails with `mise's self-update feature has been disabled at build time, cannot update`.

### Disable with a marker file

Install an empty `.disable-self-update` file at any one of:

- `lib/.disable-self-update` (used by Homebrew)
- `lib/mise/.disable-self-update` (used by the AUR `mise-bin` package)
- `lib64/mise/.disable-self-update`

### Ship update instructions

Installing a TOML file with platform-specific instructions also disables self-update; mise prints the file's message when `mise self-update` runs and when it detects a newer release. Install it at any one of:

- `lib/mise-self-update-instructions.toml`
- `lib/mise/mise-self-update-instructions.toml`
- `lib64/mise/mise-self-update-instructions.toml`

Example contents:

```toml
# Debian/Ubuntu (APT)
message = "To update mise from the APT repository, run:\n\n  sudo apt update && sudo apt install --only-upgrade mise\n"
```

```toml
# Fedora/CentOS Stream (DNF)
message = "To update mise from COPR, run:\n\n  sudo dnf upgrade mise\n"
```

Setting `MISE_SELF_UPDATE_INSTRUCTIONS` to a file path overrides the search.

### Overriding the outcome

`MISE_SELF_UPDATE_AVAILABLE=false` disables self-update without installing anything, and `MISE_SELF_UPDATE_AVAILABLE=true` re-enables it even when a marker or instructions file is present. Both are useful for testing a package build. Neither has any effect on a binary built without the `self_update` feature, where self-update is always unavailable.

`mise self-update --force` also bypasses the availability check, so a user who passes it updates the binary in place even when a marker file, an instructions file, or `MISE_SELF_UPDATE_AVAILABLE=false` is in effect. Treat the runtime mechanisms as "do not update by default" rather than a hard block. A build without the `self_update` feature is the only variant `--force` cannot get past.

## Testing packaging

Test packaging changes in a disposable container or machine for the target distribution.
A running Docker engine is required for the examples below. Start the container from your
host shell, then run the installation commands **inside** it as root. These checks exercise
the published repository; testing an unpublished package also requires copying that artifact
into the container and installing it there.

### Ubuntu（apt）

```sh
docker run -ti --rm ubuntu bash
```

Inside the container:

```sh
apt update -y
apt install -y curl ca-certificates
install -dm 755 /etc/apt/keyrings
curl -fSso /etc/apt/keyrings/mise-archive-keyring.asc https://mise.jdx.dev/gpg-key.pub
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.asc arch=$(dpkg --print-architecture)] \
https://mise.jdx.dev/deb stable main" >/etc/apt/sources.list.d/mise.list
apt update -y
apt install -y mise
mise --version
```

### Fedora（dnf）

```sh
docker run -ti --rm fedora bash
```

Inside the container, follow the [Fedora installation instructions](/installing-mise.html#dnf),
then run `mise --version`. Minimal images may require the distribution's DNF COPR plugin first.

### RHEL (dnf)

```sh
docker run -ti --rm registry.access.redhat.com/ubi9/ubi:latest bash
```

Inside the container, follow the [RHEL installation instructions](/installing-mise.html#dnf),
then run `mise --version`. RHEL 9 uses the `centos-stream+epel-next-9` COPR target; do not
assume that a generic COPR enable command selects an available build for every release.

## Linting

- Lint codebase: `mise run lint`
- Lint and fix codebase: `mise run lint-fix`

## Releasing

Releases are cut automatically by the `release-plz` GitHub Actions workflow
(`mise run release-plz` in CI). Do not run that task locally.
