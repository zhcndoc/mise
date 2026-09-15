---
description: "Explore task options for commands, dependencies, arguments, and execution."
socialDescription: "Explore task options for commands, dependencies, arguments, and execution."
---

# Task Configuration

This is an exhaustive list of the configuration options available for tasks in `mise.toml` or as
file tasks.

## 任务属性

All examples use the toml-task format rather than file tasks, but they apply to both except where otherwise noted.

### `run`

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key: string]: string } } | { tasks: string[] })[]`

The commands or execution steps to run. A task may instead use [`file`](#file),
inherit its command through `extends`, or contain only dependencies to group other
tasks. Each `run` entry finishes before the next starts; a `{ tasks = [...] }`
entry runs its listed tasks in parallel.

你可以将脚本与任务引用混合使用，并向被引用的任务传递可选的 `args` 和 `env`：

```mise-toml
[tasks.grouped]
run = [
  { task = "t1" },          # 运行 t1（连同它的依赖）
  { task = "build", args = ["--release"], env = { RUSTFLAGS = "-C opt-level=3" } },
  { tasks = ["t2", "t3"] }, # 并行运行 t2 和 t3（连同它们的依赖）
  "echo end",               # 然后运行一个脚本
]
```

`{ task }` 和 `{ tasks }` 是此任务的执行步骤，而不是
[`depends`](#depends)。它们仍会携带各自的依赖运行。
`mise tasks deps` 不会将它们作为图边包含在内。
请参阅 [`mise tasks deps`](/cli/tasks/deps.html)。

简单形式仍然有效，并且与以下形式等价：

```mise-toml
tasks.a = "echo hello"
tasks.b = ["echo hello"]
tasks.c.run = "echo hello"
[tasks.d]
run = "echo hello"
[tasks.e]
run = ["echo hello"]
```

### `run_windows`

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key: string]: string } } | { tasks: string[] })[]`

A Windows-specific variant of `run` that supports the same structured syntax:

```mise-toml
[tasks.build]
run = "cargo build"
run_windows = "cargo build --features windows"
```

### `file`

- **类型**: `string`

执行外部脚本，而不是内联的 `run` 命令。相对路径相对于任务配置文件所在的目录解析。该路径支持 Tera 模板。

```mise-toml
[tasks.release]
description = "Cut a new release"
file = "scripts/release.sh"
```

`file` 还接受 HTTP(S) URL 和 `git::` 源。有关支持的格式和安全注意事项，请参阅[使用文件或远程脚本](/tasks/toml-tasks.html#using-a-file-or-remote-script)。

### `description`

- **类型**: `string`

任务的描述。这用于（除其他用途外）
帮助输出、补全、`mise run`（不带参数）以及 `mise tasks`。

```mise-toml
[tasks.build]
description = "构建 CLI"
run = "cargo build"
```

### `alias`

- **类型**: `string | string[]`

任务的别名，这样你就可以使用 `mise run <alias>` 而不是完整的任务名称来运行它。

```mise-toml
[tasks.build]
alias = "b" # 使用 `mise run b` 运行
run = "cargo build"
```

### `depends`

- **类型**：`string | (string | string[] | { task: string, args?: string[], env?: { [key: string]: string }, optional?: bool })[]`

Tasks that must run before this task, given as a list of task names or aliases. Arguments can be
passed to a dependency, e.g.: `depends = ["build --release"]`. If multiple tasks share a dependency,
that dependency runs only once. mise runs whatever it can in parallel (up to [`--jobs`](/cli/run))
based on `depends` and related properties.

[`mise tasks deps`](/cli/tasks/deps.html) 可视化此声明的图
（`depends`、`wait_for`、`depends_post`），而不是 `run` 内部的任务引用。

```mise-toml
[tasks.build]
run = "cargo build"
[tasks.test]
depends = ["build"]
run = "cargo test"
```

#### 向依赖项传递环境变量

你可以使用两种语法向特定依赖项传递环境变量：

**Shell 风格内联：**

```mise-toml
[tasks.test]
depends = ["NODE_ENV=test setup"]
run = "npm test"

[tasks.setup]
run = 'echo "Setting up for $NODE_ENV"'
```

**结构化对象格式：**

```mise-toml
[tasks.test]
depends = [
  { task = "setup", env = { NODE_ENV = "test", DEBUG = "true" } }
]
run = "npm test"
```

结构化格式也支持将环境变量与参数结合使用：

```mise-toml
[tasks.deploy]
depends = [
  { task = "build", args = ["--release"], env = { RUSTFLAGS = "-C opt-level=3" } }
]
run = "./deploy.sh"
```

字符串依赖项和结构化依赖项可以在同一个数组中混用：

```mise-toml
[tasks.check]
depends = [
  "lint",
  { task = "test", env = { CI = "true" } },
]
run = "echo checks complete"
```

These environment variables are passed only to the specified dependency, not to the current task or other dependencies.

#### 可选依赖项

Set `optional = true` on a structured dependency to run matching tasks when they exist, without
failing when the task name or pattern matches nothing. Invalid task patterns still produce an error.

```mise-toml
[tasks.test]
depends = [
  { task = "//...:test", optional = true },
  { task = "//...:test:*", optional = true },
]
```

#### 将父任务参数传递给依赖项

你可以使用 <span v-pre>`{{usage.*}}`</span> 模板，将父任务的参数转发给它的依赖项。
父任务和子任务都必须为它们接受的参数定义 `usage` 规范：

```mise-toml
[tasks.build]
usage = 'arg "<app>"'
run = 'echo "building {{usage.app}}"'

[tasks.deploy]
usage = 'arg "<app>"'
depends = [{ task = "build", args = ["{{usage.app}}"] }]
run = 'echo "deploying {{usage.app}}"'
```

运行 `mise run deploy myapp` 会将 `"myapp"` 同时传递给 `deploy` 及其 `build` 依赖项。

这也适用于字符串语法：

```mise-toml
[tasks.deploy]
usage = 'arg "<app>"'
depends = ["build {{usage.app}}"]
run = 'echo "deploying {{usage.app}}"'
```

以及标志：

```mise-toml
[tasks.compile]
usage = 'flag "--target <target>"'
run = 'echo "compiling for $usage_target"'

[tasks.package]
usage = 'flag "--target <target>"'
depends = [{ task = "compile", args = ["--target", "{{usage.target}}"] }]
run = 'echo "packaging for $usage_target"'
```

参数会沿着依赖链传递——如果 A 依赖于 B，而 B 又依赖于 C，那么每个任务都可以将其解析后的参数转发给自己的依赖项。

### `depends_post`

- **类型**: `string | (string | string[] | { task: string, args?: string[], env?: { [key: string]: string }, optional?: bool })[]`

Like `depends`, but these tasks run _after_ this task and its dependencies complete. For example, you
may want a `postlint` task that you can run individually without also running `lint`:

```mise-toml
[tasks.lint]
run = "eslint ."
depends_post = ["postlint"]
[tasks.postlint]
run = "echo 'linting complete'"
```

Supports the same argument, environment variable, and optional dependency syntax as `depends`.
Dependencies of a `depends_post` task also wait until the parent task finishes, so an entire cleanup
chain runs after the main work. mise runs the full subtree if the parent started, even when the
parent fails, but skips it when a regular dependency fails before the parent can start. The same
task may be referenced by both `depends` and `depends_post`; in that case it runs once before the
parent and once afterward.

### `wait_for`

- **类型**：`string | (string | string[] | { task: string, args?: string[], env?: { [key: string]: string }, optional?: bool })[]`

Like `depends`, this waits for the listed tasks to complete before running. Unlike `depends`,
`wait_for` does not add matching tasks to the run; it only waits for them when they are already
scheduled. To allow a task name or pattern to have no configured matches, use `optional = true`.

```mise-toml
[tasks.lint]
wait_for = ["render"] # 会生成一些 js 文件，所以如果它正在运行，就等待它完成
run = "eslint ."
```

支持与 `depends` 相同的参数、环境变量和可选依赖语法。

`wait_for` 根据是否指定了 args 或 env 变量，以不同方式匹配任务：

- `wait_for = ["setup"]` — 按名称匹配，不管 args 或 env 覆盖如何。即使另一个任务运行 `depends = ["DEBUG=1 setup"]`，这里仍然会匹配并等待它。
- `wait_for = ["setup arg1"]` 或 `wait_for = ["DEBUG=1 setup"]` — 只匹配使用完全相同 args/env 配置运行的任务。

### `env`

- **类型**: `{ [key]: string | int | bool }`

Environment variables specific to this task. These are not passed to `depends` tasks.

```mise-toml
[tasks.test]
env.TEST_ENV_VAR = "ABC"
run = [
    "echo $TEST_ENV_VAR",
    "mise run some-other-task", # 以这种方式运行任务时，当然也会设置 TEST_ENV_VAR
]
```

### `vars` {#task-vars}

- **类型**: `{ [key]: string | int | bool | directive }`

特定于此任务的变量。渲染任务时，任务本地变量会覆盖配置变量，但不会作为环境变量导出到任务进程。

```mise-toml
[vars]
mode = "headless"

[tasks.test]
vars = { mode = "headed" }
run = "./scripts/test-e2e.sh --{{ vars.mode }}"
```

See [configuration variables](/configuration/vars.html) for supported directives,
precedence, and redaction.

### `tools`

- **类型**: `{ [key]: string }`

Tools to install and activate before running the task. This is useful for tasks that require a specific tool
or a different version of a tool. These tools apply only to that task, not to its dependencies.

```mise-toml
[tasks.build]
tools.rust = "1.50.0"
run = "cargo build"
```

运行 [`mise lock`](/dev-tools/mise-lock.html)，在运行任务之前将任务专用工具解析到所属配置的锁文件中。此操作会读取任务定义，但不会执行任务或安装其工具。

运行 `mise install --include-task-tools`，即可在不执行任务命令或依赖项的情况下，为当前作用域中的每个任务安装工具。这对于准备 CI 缓存或容器镜像很有用；将其与 `--monorepo` 结合使用，可包含所有已配置的单仓库根目录。

### `dir`

- **Type**: `string`
- **Default**: <code v-pre>"{{ config_root }}"</code> - the directory containing `mise.toml`, or for a path like `~/src/myproj/.config/mise.toml`, `~/src/myproj`.

The directory to run the task from. Most commonly, this is used to run the task in the user's current
directory:

```mise-toml
[tasks.test]
dir = "{{cwd}}"
run = "cargo test"
```

### `hide`

- **类型**: `bool`
- **默认值**: `false`

将任务从帮助、补全以及其他输出（如 `mise tasks`）中隐藏。适用于你不希望他人轻易看到的已弃用或内部任务。

```mise-toml
[tasks.internal]
hide = true
run = "echo my internal task"
```

### `confirm`

- **类型**: `string` | `{ message: string, default: string }`

A message to show before running the task. This is useful for tasks that are destructive or take a long
time to run. The user is prompted to confirm before the task's own `run` command executes.

::: warning
`confirm` only guards the task's own `run` command. Dependencies (`depends`) execute **before** the confirmation prompt appears. If you need confirmation before dependencies run, add `confirm` to the dependency tasks themselves, or use `run = [{ task = "..." }]` instead of `depends`.
:::

```mise-toml
[tasks.release]
confirm = { message = "你确定要发布一个版本吗？", default = "no" }
description = '发布一个新版本'
file = 'scripts/release.sh'
```

confirm 消息支持 Tera 模板，并且可以引用 usage 参数：

```mise-toml
[tasks.deploy]
usage = '''
arg "<environment>" help="要部署到的环境"
flag "--force" help="强制部署"
'''
confirm = "部署到 {{ usage.environment }}？{% if usage.force %}（强制）{% endif %}"
run = "deploy.sh ${usage_environment}"
```

### `raw`

- **类型**: `bool`
- **默认值**: `false`

将任务直接连接到 shell 的 stdin/stdout/stderr。这对于需要以 mise 的常规任务处理不支持的方式接受输入或输出的任务很有用。

A raw command holds an exclusive lock for as long as it runs, so mise will not run another command
alongside it and you do not have to keep other tasks out of the way yourself. The lock is taken per
command rather than per task, so two raw tasks can still take turns between their individual
commands. If you need a whole task to run without interruption, search for or file a ticket requesting a
property like `single = true`.

### `raw_args`

- **类型**: `bool`
- **默认值**: `false`

When `true`, mise does not parse arguments to the task at all — every argument
is passed through verbatim to the underlying command, including `--help`/`-h`.
Use this for tasks that act as a thin proxy for a tool that already has its
own argument parser (e.g. `next build`, Django `manage.py`, Python scripts
using `argparse`):

```toml
[tasks.manage]
raw_args = true
run = 'python manage.py'
```

```sh
mise run manage --help          # 转发给 manage.py，而不是被 mise 拦截
mise run manage migrate --fake  # 所有标志都保持不变并传递给 manage.py
```

Without `raw_args`, mise intercepts `--help` and prints its own task help. As
an ad-hoc alternative for individual invocations, you can also use
`mise run task -- --help` — the `--` separator bypasses mise's usage
parser for `--help`/`-h`. Arguments after that separator belong
to the task, so `mise run task -- -- --help` forwards `-- --help` to the task.

### `interactive`

- **类型**: `bool`
- **默认值**: `false`

Connects the task directly to the shell's stdin/stdout/stderr. Interactive tasks acquire an exclusive lock,
ensuring sole access to standard I/O — while an interactive task is running, all other tasks (both interactive
and non-interactive) are blocked. Non-interactive tasks can still run in parallel with each other. This is more
targeted than [`raw`](#raw), which takes its exclusive lock per command, and than `mise run --raw`, which goes further
and forces single-threaded execution globally (by setting `jobs = 1`).

### `sources`

- **类型**: `string | string[]`

Files or directories that this task uses as input. If both this and `outputs` are defined, mise skips
the task when the modification time of the oldest output file is newer than the modification time of
the newest source file. This is useful for tasks that are expensive to run and only need to run when
their inputs change.

The task definition itself is automatically added as a source, so editing the definition also causes
the task to run.

`mise watch` also uses `sources` to know which files and directories to watch.

Entries can be relative paths and/or glob patterns, e.g.: `src/**/*.rs`. Brace
alternatives such as `src/**/*.{js,ts}` are supported by freshness checks, `mise watch`, and
`task_source_files()`.
Don't go overboard with globs that match a huge number of files, though—mise has to scan each and every one
to check its timestamp.

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = ["target/debug/mycli"]
```

Running the above executes `cargo build` only if `mise.toml`, `Cargo.toml`, or any ".rs" file in the `src` directory
has changed since the last build.

Both `sources` and `outputs` can use parsed [usage](#usage) arguments and flags. mise resolves these
templates separately for each task invocation before checking freshness or the task cache:

```mise-toml
[tasks.compile]
usage = 'arg "<target>"'
run = "compile {{usage.target}} --output dist/{{usage.target}}"
sources = ["src/{{usage.target}}/**"]
outputs = ["dist/{{usage.target}}"]
```

Relative entries are resolved from the task directory (the task's `dir`, or the project root when it
has none) and may use `..` to reach files above it, such as a `node_modules` directory shared at the
root of a monorepo:

```mise-toml
[tasks.build]
dir = "packages/web"
run = "npm run build"
sources = ["src/**/*.ts", "../../node_modules/**"]
outputs = ["dist"]
```

Use the [`task_source_files`](../templates.md#task-source-files) function to iterate over a task's
`sources` within its template context.

#### 排除源

`/sources` 中以 `!` 为前缀的条目会被排除，这与 gitignore、watchexec 和 rsync 使用的约定一致。排除规则会影响新鲜度检查、`task_source_files` 模板函数，以及 `mise watch` 监视哪些文件发生变化。

```mise-toml
[tasks.build]
sources = ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts", "tsconfig.json"]
run = "npm run build"
```

条目会按顺序求值，最后一个匹配的条目生效。后面的非否定条目可以重新包含一个更早被 `!` 排除的文件——例如，`["src/**/*.ts", "!src/**/*.test.ts", "src/keep.test.ts"]` 会排除所有 `*.test.ts` 文件，除了 `src/keep.test.ts`。

如果要包含一个以 `!` 开头的字面路径，请将前缀转义为 `\!`（例如，在 TOML 中写成 `"\\!important.txt"`）。

#### 可复用的全局输入 <Badge type="warning" text="实验性" />

使用 `[task_config.input_groups]` 只定义一次源模式，并在多个任务之间复用。通过在 `sources` 中使用 `@group:<name>` 来引用一个组。组可以引用其他组；未定义的引用和循环引用都会导致配置错误。

组条目会相对于定义它们的配置文件解析，即使任务使用了不同的 `dir`。直接写在 `sources` 中的普通条目仍然相对于任务目录。

```mise-toml
[settings]
experimental = true

[task_config.input_groups]
toolchain = ["rust-toolchain.toml", "Cargo.lock"]
rust = ["Cargo.toml", "src/**/*.rs", "@group:toolchain"]

[tasks.build]
run = "cargo build"
sources = ["@group:rust"]
outputs = ["target/debug/mycli"]

[tasks.test]
run = "cargo test"
sources = ["@group:rust"]
outputs = []
```

`task_config.global_inputs` 会将源模式添加到配置作用域内的每个任务中。这对于整个仓库范围的配置和锁定文件很有用：这些文件的变化应使所有可缓存任务失效，而无需在每个任务的 `sources` 中重复列出。全局输入也可以引用命名组。

```mise-toml
[task_config]
global_inputs = ["mise.toml", ".github/tool-versions", "@group:lockfiles"]

[task_config.input_groups]
lockfiles = ["Cargo.lock", "pnpm-lock.yaml"]
```

#### 依赖失效

When a task depends on another task that also has `sources` defined, and the dependency runs because
its sources changed, the dependent task also re-runs — even if the dependent's own sources haven't
changed. This is useful for monorepo workflows where downstream tasks should be invalidated by upstream
changes:

```mise-toml
[tasks."core:build"]
run = "tsc -p packages/core"
sources = ["packages/core/src/**/*.ts"]
outputs = ["packages/core/dist/**/*.js"]

[tasks."frontend:build"]
run = "tsc -p packages/frontend"
sources = ["packages/frontend/src/**/*.ts"]
outputs = ["packages/frontend/dist/**/*.js"]
depends = ["core:build"]
```

If a file in `packages/core/src/` changes, both `core:build` and `frontend:build` run. If nothing
changes, both are skipped.

Dependencies **without** `sources` (which always run) do not trigger this invalidation —
otherwise `sources` on the dependent task would be effectively useless.

### `watch`

- **类型**: `{ no_vcs_ignore = bool }`
- **默认值**: `{ no_vcs_ignore = false }`

Options used when the task runs through [`mise watch`](/cli/watch.html). By default, `mise watch`
respects VCS ignore files such as `.gitignore`, even when an ignored path is listed in `sources`. Set
`watch.no_vcs_ignore` for tasks that need to watch generated or intermediary files that are
intentionally excluded from version control:

```mise-toml
[tasks.generate]
run = "process generated/output.json"
sources = ["generated/output.json"]
watch = { no_vcs_ignore = true }
```

这等同于向 watchexec 传递 `--no-vcs-ignore`。由于 watchexec 会将忽略选项应用于整个监视进程，因此一起监视多个任务时，只要其中任意选定任务启用了此选项，所有任务的 VCS 忽略都会被禁用。请保持 `sources` 的范围足够小：对广泛的构建、分发或依赖目录禁用 VCS 忽略，可能会显著增加文件系统扫描量。

### `outputs`

- **类型**: `string | string[] | { auto = true }`
- **默认值**: `{ auto = true }`

The counterpart to `sources`: the files or directories that the task creates or modifies when it
runs.

以 `!` 开头的条目会排除匹配的输出。与 `sources` 一样，条目按顺序求值，后面的条目可以重新包含某个路径，而 `\!` 则会转义字面意义上的开头感叹号。输出 glob 同样支持花括号替代项，例如
`dist/{client,server}/**`。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["src/**"]
outputs = ["dist", "!dist/**/*.map", "!dist/.vite/**"]
```

被排除的文件不会参与输出新鲜度检查，也不会存储在任务缓存产物中。如果恢复缓存产物时，被排除的文件已经存在于输出目录下，mise 会保留这些文件。

`auto = true` is an alternative to specifying output files manually. In that case, mise touches
an internally tracked file based on the hash of the task definition (stored in `~/.local/state/mise/task-outputs/<hash>` if you're curious).
This is useful if you want `mise run` to execute when sources change but don't want to `touch` a file
manually for `sources` to work.

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = { auto = true } # 当定义了 sources 时，这就是默认值
```

### `cache` <Badge type="warning" text="实验性" />

- **类型**: `{ enabled = bool, audit = bool, env = string[], command_inputs = string[] }`
- **默认值**: `{ enabled = false, audit = false, env = [], command_inputs = [] }`

Cache a successful task result by its declared inputs. A cache hit restores
explicit outputs and replays captured logs. Requires experimental features,
matching sources, and explicit output paths or `outputs = []`.

See [Task caching](./caching.html) for setup, input declarations, debugging,
remote service configuration, and cache retention. `outputs = { auto = true }`
supports freshness checks but cannot store artifacts.

#### 外部依赖和锁文件

See [external dependencies and lockfiles](./caching.html#external-dependencies-and-lockfiles).

#### 每次运行时的缓存访问

See [per-run cache access](./caching.html#per-run-cache-access).

#### 远程缓存和敏感数据

See [remote cache and sensitive data](./caching.html#remote-cache-and-sensitive-data).

#### 缓存正确性和确定性任务

See [cache correctness and deterministic tasks](./caching.html#cache-correctness-and-deterministic-tasks).

### `rust_cache` <Badge type="danger" text="deprecated" />

- **类型**：`boolean | table`
- **默认值**：`false`

此设置不再启用 Rust 编译器操作缓存。mise 暂时接受它作为已弃用的无操作设置，以便现有任务配置继续运行。启用的值会打印迁移警告；禁用的值不会打印任何信息。

Use [mbx](https://mr-boxington.jdx.dev/getting-started) for Rust action caching instead. Install it
globally with `mise use -g mr-boxington`, or add it to the project tools. To keep existing task commands unchanged,
configure mise's [`cargo` command wrapper](/dev-tools/shims.html#command-wrappers):

```mise-toml
[tools]
mr-boxington = "latest"

[wrappers.cargo]
command = "mbx"
env = { MBX_CARGO_SHIM_MODE = "1" }

[tasks.build]
run = "cargo build"
```

Run `mise reshim` after adding the wrapper, then remove `rust_cache`. The compatibility field is scheduled for removal in
mise 2027.8.14.

### `shell`

- **类型**：`string`
- **默认值**：如果已设置，则为 [`task_config.shell`](#task_config.shell)（配置作用域）；否则为 [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)/[`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)（仅全局）。
- **注意**：仅适用于 toml-tasks。

The shell used to run the task. This is useful if you want a task to use a shell other than the
default, such as `fish`, `zsh`, or `pwsh`. Generally, though, a [shebang](./toml-tasks#shell-shebang) is recommended instead
because it lets IDEs with mise support show syntax highlighting and linting for the script.

When the shell is PowerShell (`pwsh` or `powershell`), mise passes `-NoProfile` so your PowerShell
profile is not loaded, matching the non-interactive behavior of `sh -c`/`zsh -c`. This prevents profiles
that mutate `PATH` (for example, a mise activation snippet) from shadowing a task's own installed tools. Set
[`windows_powershell_no_profile`](/configuration/settings.html#windows_powershell_no_profile) to `false`
if your tasks depend on side effects from your profile.

```mise-toml
[tasks.hello]
run = '''
#!/usr/bin/env node
console.log('hello world')
'''
```

### `timeout`

- **类型**：`string`
- **默认值**：未设置

此任务的最大执行时间。该值接受 `30s`、`5m` 或 `1h` 等时长，并支持 Tera 模板。如果任务未能在配置的时长内完成，则任务失败。

```mise-toml
[tasks.integration-test]
run = "./scripts/integration-test.sh"
timeout = "10m"
```

这会限制单个任务。使用 [`mise run --timeout`](/cli/run.html) 或 [`task.timeout`](/configuration/settings.html#task.timeout) 设置来限制整个任务运行。当同时设置全局超时和单个任务超时时，以两者中较短的时间为准：单个任务超时不能超过全局超时。`--timeout` CLI 标志会覆盖全局设置。

### `deny_all`

- **类型**：`bool`
- **默认值**：`false`

阻止此任务读取文件系统、写入文件系统、访问网络以及继承环境变量。具体的 `allow_*` 属性可以添加例外。

```mise-toml
[tasks.lint]
run = "eslint ."
deny_all = true
allow_read = ["."]
allow_write = ["./node_modules/.cache"]
allow_env = ["NODE_*"]
```

沙箱支持和隐式系统访问因平台而异。有关完整的行为和限制，请参阅[沙箱](/sandboxing.html)。

### `deny_read`

- **类型**：`bool`
- **默认值**：`false`

阻止文件系统读取，但执行任务所需的系统路径和 mise 路径除外。使用 `allow_read` 添加任务专用例外。

### `deny_write`

- **类型**：`bool`
- **默认值**：`false`

阻止文件系统写入，但临时目录等隐式可写的系统路径除外。使用 `allow_write` 添加任务专用例外。

### `deny_net`

- **类型**：`bool`
- **默认值**：`false`

阻止此任务访问网络。在支持的平台上，使用 `allow_net` 添加特定主机例外。

### `deny_env`

- **类型**：`bool`
- **默认值**：`false`

阻止继承的环境变量，但 `PATH`、`HOME`、`USER`、`SHELL`、`TERM` 和 `LANG` 等必要变量除外。使用 `allow_env` 或 `pass_through_env` 保留其他变量。

### `allow_read`

- **类型**：`string[]`
- **默认值**：`[]`

允许读取列出的路径，并阻止其他文件系统读取。相对路径从任务的有效工作目录解析。

### `allow_write`

- **类型**：`string[]`
- **默认值**：`[]`

允许写入列出的路径，并阻止其他文件系统写入。允许写入的路径也可读取。相对路径从任务的有效工作目录解析。

### `allow_net`

- **类型**：`string[]`
- **默认值**：`[]`

允许访问列出的主机，并阻止其他网络访问。按主机进行的网络过滤取决于平台；请参阅[平台支持](/sandboxing.html#platform-support)。

### `allow_env`

- **类型**：`string[]`
- **默认值**：`[]`

允许列出的环境变量名称，并阻止其他继承的环境变量。条目支持 `*` 通配符，例如 `MYAPP_*`。

### `pass_through_env` <Badge type="warning" text="实验性" />

- **类型**：`string[]`
- **默认值**：`[]`

当禁止继承环境时保留列出的环境变量，但不会将其值包含在任务缓存键中。条目支持 `*` 通配符。此属性本身不会启用环境沙箱，只有在环境沙箱处于活动状态时才有效，包括通过 `allow_env`、`deny_env`、`deny_all` 或等效的 CLI 或全局沙箱选项启用时。

对于必须不影响缓存键的短期凭据等值，请使用 `pass_through_env`。不要将其用于会影响生成输出或日志的值。当变量发生变化时应使任务缓存失效，请改用 `cache.env`。

### `quiet`

- **类型**：`bool`
- **默认值**：`false`

Suppress mise's own output for the task, such as the command being run, e.g.: `[build] $ cargo build`.
When this is set, mise shows nothing other than what the script itself outputs. To hide the task's
own output as well, use [`silent`](#silent).

`quiet` is a _verbosity_ setting and is independent of the [`output`](#output) _style_: it does not
force un-prefixed output, so `output = "prefix"` together with `quiet = true` keeps the task-name
prefixes while hiding mise's own messages.

### `silent`

- **类型**：`bool | "stdout" | "stderr"`
- **默认值**：`false`

Suppress all output from the task. If set to `"stdout"` or `"stderr"`, only that stream is suppressed.

### `output`

- **类型**：`string`
- **默认值**：未设置（继承全局 [`task.output`](/configuration/settings.html#task.output) 设置）

此任务的输出 _样式_：`prefix`、`interleave`、`keep-order`、`replacing`、`timed`、`quiet` 或 `silent`。这是全局 `task.output` 设置在单个任务中的等效设置，并且与 [`quiet`](#quiet)/[`silent`](#silent) 详细程度字段相互独立，因此样式和静默程度可以自由组合（例如，`output = "prefix"` + `quiet = true`）。`quiet`/`silent` _值_ 仅为向后兼容而保留，并将样式与该详细程度绑定。

::: warning Deprecated
The `quiet` output value is deprecated. Warnings begin in mise `2026.9.3`, and support will be
removed in `2027.9.3`. Use `output = "interleave"` with `quiet = true` instead. For a global task
default, use `task.output = "interleave"` with `task.quiet = true` under `[settings]`.
:::

### `usage`

- **类型**：`string`

::: tip
有关任务参数和 usage 字段的完整信息，请参阅专门的 [任务参数](/tasks/task-arguments) 页面。
:::

可以将更高级的 usage 规范添加到任务的 `usage` 字段中。这仅适用于 toml-tasks。

```mise-toml
[tasks.test]
usage = '''
arg "<file>" help="要测试的文件" default="src/main.rs"
'''
run = 'cargo test ${usage_file?}'
```

#### 参数和标志的环境变量支持

Both args and flags in usage specs can specify an environment variable as an alternative source for their value. This lets task arguments be provided through environment variables when they are not specified on the command line.

优先级顺序如下：

1. CLI 参数/标志（最高优先级）
2. 环境变量（中等优先级）
3. 默认值（最低优先级）

**对于位置参数：**

```mise-toml
[tasks.deploy]
usage = '''
arg "<environment>" env="DEPLOY_ENV" help="目标环境" default="staging"
arg "<region>" env="AWS_REGION" help="AWS 区域" default="us-east-1"
'''

run = '''
echo "Deploying to ${usage_environment?} in ${usage_region?}"
'''
```

使用示例：

```bash
# 使用 CLI 参数（最高优先级）
mise run deploy production us-west-2

# 使用环境变量
export DEPLOY_ENV=production
export AWS_REGION=us-west-2
mise run deploy

# 使用默认值（最低优先级）
mise run deploy  # 部署到 us-east-1 的 staging

# CLI 覆盖环境变量
export DEPLOY_ENV=staging
mise run deploy production  # 部署到 production
```

**对于标志：**

```mise-toml
[tasks.build]
usage = '''
flag "-p --profile <profile>" env="BUILD_PROFILE" help="构建配置" default="dev"
flag "-v --verbose" env="VERBOSE" help="详细输出"
'''

run = '''
echo "Building with profile: ${usage_profile?}"
echo "Verbose: ${usage_verbose:-false}"
'''
```

使用示例：

```bash
# 使用 CLI 标志
mise run build --profile release --verbose

# 使用环境变量
export BUILD_PROFILE=release
export VERBOSE=true
mise run build

# 混合使用 - 环境变量提供一个，CLI 提供另一个
export BUILD_PROFILE=release
mise run build --verbose
```

**文件任务**（定义为 `mise-tasks/` 或 `.mise/tasks/` 中可执行文件的任务）也支持 `env` 属性：

```bash
#!/usr/bin/env bash
#USAGE arg "<input>" env="INPUT_FILE" help="要处理的输入文件"
#USAGE flag "-o --output <file>" env="OUTPUT_FILE" help="输出文件" default="out.txt"

echo "Processing ${usage_input?} -> ${usage_output?}"
```

**必需参数：**

环境变量可以满足必需参数检查。如果某个参数被标记为必需（使用尖括号 `<arg>`），则通过 `env` 属性中指定的环境变量提供其值即可满足该要求：

```mise-toml
[tasks.deploy]
usage = '''
arg "<api-key>" env="API_KEY" help="部署用 API 密钥"
'''
run = 'deploy --api-key ${usage_api_key?}'
```

```bash
# 这会失败 - 未提供 API_KEY
mise run deploy

# 这会成功 - 通过环境变量提供了 API_KEY
export API_KEY=secret123
mise run deploy

# 这也会成功 - 通过 CLI 提供
mise run deploy secret123
```

## 变量

顶层[配置变量](/configuration/vars)在渲染 TOML 任务时可用。任务还可以定义任务本地变量，这些变量会覆盖该任务的配置变量：

```mise-toml
[tasks.test]
vars = { e2e_args = "--headed" }
run = './scripts/test-e2e.sh {{vars.e2e_args}}'
```

## `[task_config]` 选项

Options available in the top-level `mise.toml` `[task_config]` section. These apply to all tasks that
are included by that config file or share the same root directory, e.g.: `~/src/myproject/mise.toml`'s `[task_config]`
applies to file tasks like `~/src/myproject/mise-tasks/mytask`. Set `cascade = true` to also apply the
section to tasks owned by descendant config roots.

### `task_config.cascade`

将此配置的 `[task_config]` 值级联到后代配置根目录。后代值会覆盖单独的继承字段。后代可以设置 `cascade = false` 来停止继承该部分。

```toml
[task_config]
cascade = true
shell = "bash -c"
```

这适用于 `dir`、`shell`、`cache`、`rust_cache`、`global_inputs`、`input_groups` 和 `includes`。继承的 include 路径和任务输入仍相对于其定义所在的配置根目录。

后代的非空 `global_inputs` 会替换继承的值。后代的 `input_groups` 会按名称与继承的组进行合并；当同一名称出现多次时，最近的定义优先。这同样适用于继承的 `global_inputs` 中的组引用。每个组仍相对于其定义所在的配置根目录。

### `task_config.dir`

更改任务运行时使用的默认目录。

```toml
[task_config]
dir = "{{cwd}}"
```

### `task_config.shell` {#task_config.shell}

设置此配置作用域中任务的默认 shell。任务显式设置的 `shell` 优先级更高，包括从任务模板继承的 `shell`。当 `task_config.cascade = true` 时，后代配置根目录会继承此默认值，并可以使用自己的 `task_config.shell` 覆盖它。

```toml
[task_config]
shell = "bash -c"
```

不同于仅适用于全局的 [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 和 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 设置，此默认值仅作用于项目任务，不能更改钩子、工具安装或来自其他配置根目录的任务所使用的解释器。

### `task_config.cache` <Badge type="warning" text="实验性" />

设置此配置作用域中任务的默认构件缓存配置。该默认配置只会被具有源且拥有显式输出路径或设置了 `outputs = []` 的、符合缓存条件的任务继承。任务本地和任务模板中的缓存配置优先级更高，包括 `cache = { enabled = false }`。

```toml
[task_config.cache]
enabled = true
env = ["NODE_ENV", "CI"]
command_inputs = ["node --version"]
```

### `task_config.rust_cache` <Badge type="danger" text="deprecated" />

This deprecated compatibility setting no longer enables Rust action caching. An effective enabled
value warns once while tasks continue normally. Remove it and run Rust build commands through
[mbx](https://mr-boxington.jdx.dev/getting-started) instead. The
[`wrappers.cargo` configuration](/lang/rust.html#share-cargo-builds-with-mr-boxington) lets existing tasks keep
invoking `cargo` without modification.

```toml
[task_config]
rust_cache = true
```

### `task_config.global_env` <Badge type="warning" text="实验性" />

将环境变量名称添加到此配置作用域中每个启用缓存的任务的缓存键中。这些值会与任务本地的 `cache.env` 组合，而不是作为默认值使用。

```toml
[task_config]
global_env = ["CI", "NODE_ENV"]
```

### `task_config.global_pass_through_env` <Badge type="warning" text="实验性" />

当禁止继承环境时保留环境变量，但不会将其值添加到任务缓存键中。

```toml
[task_config]
global_pass_through_env = ["CI_JOB_TOKEN"]
```

### `task_config.global_inputs` <Badge type="warning" text="实验性" />

将相对于配置根目录的源路径和 glob 模式添加到此配置作用域中的每个任务。条目可以引用命名的输入组，例如 `@group:<name>`。

```toml
[task_config]
global_inputs = ["mise.toml", "@group:lockfiles"]
```

### `task_config.input_groups` <Badge type="warning" text="实验性" />

定义可复用且相对于配置根目录的源组。任务可以在 `sources` 中使用 `@group:<name>` 引用这些组。组可以引用其他组。

```toml
[task_config.input_groups]
lockfiles = ["Cargo.lock", "pnpm-lock.yaml"]
rust = ["Cargo.toml", "src/**/*.rs", "@group:lockfiles"]
```

### `task_config.includes` {#task_config.includes}

设置 mise 在查找任务时应搜索的 toml 文件和文件任务目录。

```toml
[task_config]
includes = [
    "tasks.toml", # 一个任务 toml 文件
    "mytasks"     # 一个包含文件任务的目录
]
```

当设置了 `task_config.includes` 时，它会替换该配置作用域的默认文件任务目录，而不是在其基础上追加。Include 条目会作为 Tera 模板进行渲染，因此可以引用诸如 `config_root`、`env` 和已解析的 `vars` 等值。

默认的文件任务目录为：

- `mise-tasks`
- `.mise-tasks`
- `.mise/tasks`
- `.config/mise/tasks`
- `mise/tasks`

如果你想保留默认目录并额外添加一个目录，请显式包含默认目录：

```toml
[task_config]
includes = [
    "mise-tasks",
    ".mise-tasks",
    ".mise/tasks",
    ".config/mise/tasks",
    "mise/tasks",
    "mytasks",
    "tasks.toml",
]
```

对于本地任务和单体仓库任务发现，mise 使用最近的、定义了 `task_config.includes` 的配置文件。当父级设置了 `task_config.cascade = true` 时，其 includes 会被继承，直到某个子级定义自己的 includes。子级配置的 `includes` 会替换该目录的默认值和所有继承的 `includes`。

Entries are evaluated in order, and when more than one include defines a task with the same name the **last** entry in the list wins.
This applies uniformly to directory, toml-file, and `git::` includes, so to override a task coming from a `git::` include with a local one, list the local directory after the `git::` entry (see the example below).

```toml
[task_config]
includes = [
    "git::https://github.com/myorg/shared-tasks.git//tasks", # remote task…
    ".mise/tasks",                                           # …is overridden by the local one with the same name
]
```

全局配置文件会被独立加载，因此每个全局配置文件使用自身的 `task_config.includes`；如果未设置 `includes`，则使用默认目录。

条目会按顺序进行求值，当多个 include 定义了同名任务时，列表中的**最后**一个条目获胜。这一规则同样适用于目录、toml 文件和 `git::` include，因此若要用本地任务覆盖来自 `git::` include 的任务，请将本地目录放在 `git::` 条目之后：

来自选择该 include 的配置或优先级更高配置的内联 `[tasks.<name>]` 命令，其优先级高于包含的 TOML 文件中的同名任务。不包含 `run`、`run_windows` 或 `file` 的内联块则会覆盖描述、环境和依赖关系等元数据。对于可执行文件任务，脚本仍然是该任务的命令，而内联定义会覆盖其元数据。

相同的覆盖规则也适用于分层的内联任务定义。例如，`mise.local.toml` 中仅包含元数据的任务，会覆盖 `mise.toml` 中最近的、优先级较低的带命令定义。具有自身命令的更高优先级定义仍会替换较低层级的任务。所选的、包含命令的基础定义之上的所有仅包含元数据的定义，都会按照优先级顺序贡献元数据；其下方的定义则不会贡献元数据。

Included task toml files have a different format than `mise.toml`: they are simply a list of tasks.
The file uses the same format as the `[tasks]` section of `mise.toml` but without the `[tasks]` prefix:

::: code-group

```mise-toml [tasks.toml]
task1 = "echo task1"
task2 = "echo task2"
task3 = "echo task3"

[task4]
run = "echo task4"
vars = { target = "linux" }
```

:::

For auto-completion and validation in included toml task files, use the following JSON schema: <https://mise.jdx.dev/schema/mise-task.json>

#### 远程 Git Includes <Badge type="warning" text="实验性" />

你可以使用 `git::` URL 语法从 git 仓库中包含目录或单独的 task toml 文件：

::: code-group

```mise-toml [ssh]
[task_config]
includes = [
    "git::ssh://git@github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
    "git::ssh://git@github.com/myorg/shared-tasks.git//tasks/release.toml?ref=v1.0.0",
]
```

```mise-toml [https]
[task_config]
includes = [
    "git::https://github.com/myorg/shared-tasks.git//tasks?ref=main",
    "git::https://github.com/myorg/shared-tasks.git//tasks/release.toml?ref=main",
]
```

:::

URL 格式：`git::<protocol>://<url>//<path>?ref=<ref>`

必填字段：

- `protocol`：git 协议（ssh 或 https）。
- `url`：git 仓库 URL。
- `path`：仓库中目录或 `.toml` 任务文件的路径。

可选字段：

- `ref`：git 引用（分支、标签、提交）。默认为仓库的默认分支。

当 `path` 指向目录时，mise 会加载该目录中的可执行文件任务以及所有 `.toml` 任务文件。当 `path` 指向单个 `.toml` 文件时，只会加载该文件。

Included `.toml` files use the [task toml file format](#task_config.includes) (the keys are task names — there is no `[tasks.…]` prefix). The repository is cloned and cached in `MISE_CACHE_DIR/remote-git-tasks-cache`. Tasks from the include are loaded as if they were local. You can disable caching with `MISE_TASK_REMOTE_NO_CACHE=true` or the `--no-cache` flag.

### `task_config.excludes` {#task_config.excludes}

设置要从文件任务发现中排除的路径或 glob 模式。相对条目从配置根目录解析，可以排除单个文件、整个目录，或 glob 匹配的文件：

```toml
[task_config]
excludes = [
    ".mise/tasks/python/pyproject.toml",
    ".mise/tasks/generated",
    ".mise/tasks/**/fixtures/*.toml",
]
```

定义了 `task_config.excludes` 的最近配置会替换继承的排除项。将其设置为空数组，可以清除通过 `task_config.cascade = true` 继承的排除项。排除项同时适用于默认任务目录和通过 `task_config.includes` 选定的路径。

任务目录会递归搜索。可执行文件会作为文件任务加载，所有不是 mise 配置文件的 `.toml` 文件都会使用[包含的任务 TOML 格式](#task_config.includes)加载。当其他 TOML 文件（例如 `pyproject.toml` 或 `Cargo.toml`）必须位于任务目录中时，请使用 `task_config.excludes`。

## 单体仓库支持

mise 通过目标路径语法支持单体仓库风格的任务组织。通过在根目录的 `mise.toml` 中设置 `monorepo_root = true` 来启用它。

有关单体仓库任务的完整文档，包括：

- 任务路径语法和通配符
- 来自父级配置的工具分层
- 性能调优
- 最佳实践和故障排除

请参阅专门的 [单体仓库任务](/tasks/monorepo) 文档。

## `redactions` <Badge type="warning" text="实验性" />

- **类型**：`string[]`

Redactions hide sensitive information from task output. This is useful for API keys, passwords, and
other secrets that you don't want to leak accidentally in logs or other output.

要从输出中遮蔽的环境变量列表。

```toml
redactions = ["API_KEY", "PASSWORD"]

[env]
API_KEY = "s3cr3t"

[tasks.show-key]
run = 'echo "key: $API_KEY"'
```

Running `mise run show-key` will output `key: [redacted]` instead of the value of `API_KEY`.

你也可以将其指定为 glob 模式，例如：`redactions = ["SECRETS_*"]`。

## `[vars]` 选项

请参阅[变量](/configuration/vars)。

## 任务配置设置

<script setup>
import Settings from '/components/settings.vue';
</script>

The following settings control task behavior. Set them under `[settings]` in
`~/.config/mise/config.toml`. Settings that are not marked global-only can also be
set per project in `mise.toml`:

<Settings :level="3" prefix="task" />
