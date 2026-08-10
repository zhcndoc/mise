# 任务配置

这是 `mise.toml` 中或作为文件任务可用的所有任务配置选项的完整列表。

## 任务属性

所有示例均采用 toml-task 格式而不是文件格式，不过在两者中都适用，除非另有说明。

### `run`

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key: string]: string } } | { tasks: string[] })[]`

要运行的命令。对于一个任务来说，这是唯一必需的属性。

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

简单形式仍然适用，并且等价：

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

`run` 的 Windows 特定变体，支持相同的结构化语法：

```mise-toml
[tasks.build]
run = "cargo build"
run_windows = "cargo build --features windows"
```

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

必须在此任务之前运行的任务。这是一个任务名称或别名列表。参数可以传递给任务，例如：`depends = ["build --release"]`。如果多个任务具有相同的依赖项，该依赖项只会运行一次。mise 会通过使用 `depends` 和相关属性，尽可能并行地运行它能够运行的内容（最多到 [`--jobs`](/cli/run)）。

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
  { task = "build", args = ["--release"],
    env = { RUSTFLAGS = "-C opt-level=3" } }
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

注意：这些环境变量只会传递给指定的依赖项，不会传递给当前任务或其他依赖项。

#### 可选依赖项

在结构化依赖项上设置 `optional = true`，即可在匹配的任务存在时运行它们；当任务名称或模式没有匹配项时，也不会导致失败。无效的任务模式仍会产生错误。

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

与 `depends` 类似，但这些任务会在此任务及其依赖完成后运行。例如，你
可能希望有一个 `postlint` 任务，可以单独运行，而不会同时运行 `lint`：

```mise-toml
[tasks.lint]
run = "eslint ."
depends_post = ["postlint"]
[tasks.postlint]
run = "echo 'linting complete'"
```

支持与 `depends` 相同的参数、环境变量和可选依赖语法。

`depends_post` 任务的依赖项也会等到父任务完成后再运行，因此整个清理链都会在主要工作完成后运行。如果父任务已经启动，即使父任务失败，Mise 也会运行完整的子树；但如果常规依赖项在父任务能够启动之前失败，则会跳过该子树。同一个任务可以同时被 `depends` 和 `depends_post` 引用；在这种情况下，它会在父任务之前运行一次，并在父任务之后再次运行一次。

### `wait_for`

- **类型**：`string | (string | string[] | { task: string, args?: string[], env?: { [key: string]: string }, optional?: bool })[]`

类似于 `depends`，它会在运行前等待这些任务完成。不同于 `depends`，
`wait_for` 不会将匹配的任务添加到运行中；只有当这些任务已经被调度时，它才会等待它们。
要允许任务名称或模式没有任何配置的匹配项，请使用 `optional = true`。

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

特定于此任务的环境变量。这些不会传递给 `depends` 任务。

```mise-toml
[tasks.test]
env.TEST_ENV_VAR = "ABC"
run = [
    "echo $TEST_ENV_VAR",
    "mise run some-other-task", # 以这种方式运行任务时，当然也会设置 TEST_ENV_VAR
]
```

### `tools`

- **类型**: `{ [key]: string }`

在运行任务之前要安装并激活的工具。这适用于需要安装特定工具或使用不同版本工具的任务。它只会用于该任务，不会用于依赖项。

```mise-toml
[tasks.build]
tools.rust = "1.50.0"
run = "cargo build"
```

### `dir`

- **类型**: `string`
- **默认值**: <code v-pre>"{{ config_root }}"</code> - 包含 `mise.toml` 的目录，或者像 `~/src/myproj/.config/mise.toml` 这样的情况，它将是 `~/src/myproj`。

运行任务的目录。最常见的用法是当你希望任务在用户当前目录中执行时：

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

在运行任务之前显示的一条消息。这对于具有破坏性或运行时间较长的任务很有用。用户将在任务自身的 `run` 命令执行之前被提示进行确认。

::: warning
`confirm` 只能保护任务自身的 `run` 命令。依赖项（`depends`）会在确认提示出现之前**先**执行。如果你需要在依赖项运行之前进行确认，请将 `confirm` 添加到依赖任务本身，或者使用 `run = [{ task = "..." }]` 代替 `depends`。
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

将任务直接连接到 shell 的 stdin/stdout/stderr。这对于需要以 mise 的正常任务处理方式不支持的方式接受输入或输出的任务很有用。不建议使用，因为当 mise 并行运行任务时，这会严重干扰输出。使用此功能时，请确保没有其他任务同时运行。

将来我们可能会有一个类似 `single = true` 的属性，或者其他能防止多个任务同时运行的东西。如果这听起来有用，请搜索/提交一个工单。

### `raw_args`

- **类型**: `bool`
- **默认值**: `false`

当 `true` 时，mise 完全不会解析传递给任务的参数——每个参数都会原样传递给底层命令，包括 `--help`/`-h`。当任务只是某个工具的薄封装，而该工具本身已经有自己的参数解析器时，请使用此选项（例如 `next build`、Django 的 `manage.py`、使用 `argparse` 的 Python 脚本）：

```toml
[tasks.manage]
raw_args = true
run = 'python manage.py'
```

```sh
mise run manage --help          # 转发给 manage.py，而不是被 mise 拦截
mise run manage migrate --fake  # 所有标志都保持不变并传递给 manage.py
```

如果没有 `raw_args`，mise 会拦截 `--help` 并打印它自己的任务帮助信息。作为单次调用的临时替代方案，你也可以使用
`mise run task -- --help` —— 现在 `--` 分隔符会绕过 mise 的用法解析器，专门针对 `--help`/`-h`。该分隔符之后的参数属于任务本身，因此 `mise run task -- -- --help` 会将 `-- --help` 转发给任务。

### `interactive`

- **类型**: `bool`
- **默认值**: `false`

将任务直接连接到 shell 的 stdin/stdout/stderr。交互式任务会获得独占锁，
确保对标准 I/O 的唯一访问权限——当交互式任务运行时，所有其他任务（包括交互式
和非交互式）都会被阻塞。非交互式任务仍然可以彼此并行运行。这比更宽泛的 `raw` 设置更有针对性，
后者会通过设置 `jobs = 1` 强制全局单线程执行。

### `sources`

- **类型**: `string | string[]`

此任务用作输入的文件或目录；如果同时定义了此项和 `outputs`，mise 会跳过执行那些“最旧的输出文件”的修改时间比“最新的源文件”的修改时间更新的任务。这对于运行成本较高、只需要在输入发生变化时才执行的任务很有用。

任务本身会被自动添加为一个源，因此如果你修改了任务定义，也会导致任务重新执行。

这也用于 `mise watch`，以确定需要监视哪些文件/目录。

可以使用相对于配置文件的路径和/或 glob 模式指定此项，例如：
`src/**/*.rs`。`src/**/*.{js,ts}` 这样的花括号替代模式受新鲜度检查、
`mise watch` 和 `task_source_files()` 支持。
不过，请确保不要在 glob 中添加过多文件——mise 必须逐一扫描每个文件来检查
时间戳。

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = ["target/debug/mycli"]
```

运行上述命令时，只有当 `mise.toml`、`Cargo.toml`，或者 `src` 目录中任何一个 ".rs" 文件自上次构建以来发生变化时，才会执行 `cargo build`。

可以在模板上下文中使用 [`task_source_files`](../templates.md#task-source-files) 函数来遍历任务的 `sources`。

#### 监视被 VCS 忽略的源

默认情况下，即使某个被忽略的路径列在 `sources` 中，`mise watch` 也会遵循 `.gitignore` 等 VCS 忽略文件。对于需要监视那些有意排除在版本控制之外的生成文件或中间文件的任务，请设置 `watch.no_vcs_ignore`：

```mise-toml
[tasks.generate]
run = "process generated/output.json"
sources = ["generated/output.json"]
watch = { no_vcs_ignore = true }
```

这等价于向 watchexec 传递 `--no-vcs-ignore`。由于 watchexec 会将忽略选项应用于整个监视进程，
当同时监视多个任务时，只要其中任意一个选定的任务启用此选项，所有任务的 VCS 忽略规则都会被禁用。请让 `sources` 保持较小的范围：对于宽泛的
构建、分发或依赖目录禁用 VCS 忽略，可能会显著增加文件系统扫描量。

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

当一个任务依赖于另一个也定义了 `sources` 的任务，并且该依赖任务因为其 sources 发生变化而运行时，依赖任务也会重新运行——即使依赖任务自身的 sources 没有变化。这对于单仓库（monorepo）工作流很有用，因为下游任务应当随着上游变化而失效：

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

如果 `packages/core/src/` 中的某个文件发生变化，`core:build` 和 `frontend:build` 都会运行。如果没有任何变化，则两者都会被跳过。

请注意，没有 `sources` 的依赖项（它们总是运行）不会触发这种失效——否则，依赖任务上的 `sources` 实际上就会变得毫无用处。

### `outputs`

- **类型**: `string | string[] | { auto = true }`
- **默认值**: `{ auto = true }`

与 `sources` 对应，这些是任务在执行后将创建/修改的文件或目录。

以 `!` 开头的条目会排除匹配的输出。与 `sources` 一样，条目按顺序求值，后面的条目可以重新包含某个路径，而 `\!` 则会转义字面意义上的开头感叹号。输出 glob 同样支持花括号替代项，例如
`dist/{client,server}/**`。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["src/**"]
outputs = ["dist", "!dist/**/*.map", "!dist/.vite/**"]
```

被排除的文件不会参与输出新鲜度检查，也不会存储在任务缓存产物中。如果恢复缓存产物时，被排除的文件已经存在于输出目录下，mise 会保留这些文件。

`auto = true` 可以替代手动指定输出文件。在这种情况下，mise 会根据任务定义的哈希值触碰一个内部跟踪文件（如果你感兴趣，该文件存储在 `~/.local/state/mise/task-outputs/<hash>` 中）。
如果你希望在源文件发生变化时执行 `mise run`，但又不想为了让 `sources` 生效而手动执行 `touch`，这会很有用。

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = { auto = true } # 当定义了 sources 时，这就是默认值
```

### `cache` <Badge type="warning" text="实验性" />

- **类型**: `{ enabled = bool, audit = bool, env = string[], command_inputs = string[] }`
- **默认值**: `{ enabled = false, audit = false, env = [], command_inputs = [] }`

将成功的任务结果存储在基于内容寻址的本地缓存中，并在再次看到相同的任务输入时重用这些结果。声明的文件系统输出会在删除后恢复。`outputs = []` 的任务会缓存其成功结果和日志，但不会存储文件系统产物，这对于代码检查、测试和类型检查等检查很有用。
声明 `outputs = []` 表示该任务没有缓存命中时需要重现的文件系统副作用。

产物缓存要求启用 [`experimental`](/configuration/settings.html#experimental)、至少一个匹配的
`source`，以及显式输出路径或 `outputs = []`。
不支持 `outputs = { auto = true }`、绝对路径输出，以及逃出任务目录的输出模式（包括排除项的主体）。

```mise-toml
[settings]
experimental = true

[tasks.build]
run = "npm run build"
sources = ["package.json", "src/**"]
outputs = ["dist"]
cache = { enabled = true, env = ["NODE_ENV"] }
```

`cache.command_inputs` 中列出的命令会在缓存查找前运行。命令文本、标准输出和标准错误都会包含在缓存键中。命令使用与任务相同的内联 shell（包括 CLI 的 `--shell` 覆盖项）、解析后的环境和工具、工作目录以及沙箱策略。当编译器版本或生成的配置等输入无法仅通过源文件表示时，此功能非常有用。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["package.json", "src/**"]
outputs = ["dist"]
cache = { enabled = true, command_inputs = ["node --version", "npm config get registry"] }
```

命令输入必须非空且成功退出。其输出会经过哈希处理，不会被打印或保留。命令输入继承任务超时时间；如果任务没有超时，则使用 30 秒超时；其标准输出和标准错误合计最多可产生 16 MiB。由于每当 mise 计算任务缓存键时都会运行命令输入，因此它们应当快速、确定且无副作用。试运行或原始执行、交互式执行禁用缓存时，不会运行命令输入。

在 Linux 上设置 `cache.audit = true` 可诊断不完整的缓存声明。任务执行时，mise 使用 `strace` 报告工作区根目录下与 `sources` 不匹配的读取，以及任务目录下与 `outputs` 不匹配的写入。审计仅提供建议，不会阻止任务，也不会阻止成功结果被缓存。工作区根目录和任务目录之外的访问，以及目录元数据读取会被忽略，以避免系统库、可执行文件和路径遍历出现在报告中。

审计模式要求 `PATH` 中存在 `strace`。跟踪功能不可用时，mise 会发出警告并正常运行任务；目前不支持其他平台。缓存任务不会执行，因此不会生成审计报告；检查已有缓存条目时，请使用 `mise run --force <task>`。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["package.json", "src/**"]
outputs = ["dist"]
cache = { enabled = true, audit = true }
```

#### 外部依赖和锁文件

将依赖清单和锁文件声明为文件系统输入，以便依赖更新使缓存失效。它们可以直接列在任务的 `sources` 中，通过输入组共享，或使用 `task_config.global_inputs` 应用于配置作用域中的每个任务。

```mise-toml
[settings]
experimental = true

[task_config]
global_inputs = ["@group:node-dependencies"]

[task_config.input_groups]
node-dependencies = ["package.json", "pnpm-lock.yaml"]

[tasks.build]
run = "pnpm build"
sources = ["src/**"]
outputs = ["dist"]
cache = { enabled = true }
```

锁文件内容表示已解析的外部依赖图，因此通常不应包含 `node_modules` 等已安装的依赖目录。已解析的 mise 工具已经参与缓存键计算。对于提交文件中未捕获的相关外部状态，例如软件包注册表选择或编译器包装器版本，请使用 `cache.command_inputs`：

```mise-toml
[tasks.build]
run = "pnpm build"
sources = ["package.json", "pnpm-lock.yaml", "src/**"]
outputs = ["dist"]
cache = { enabled = true, command_inputs = ["pnpm config get registry"] }
```

只声明可能影响任务输出的确定性外部状态。机密和凭据应改用透传环境变量，以免其值包含在缓存键中。

#### 每次运行时的缓存访问

使用 `mise run --task-cache <mode>` 或 `MISE_TASK_CACHE` 控制单次运行中的任务输出缓存读取和写入：

- `read-write` 使用缓存结果并发布新结果。这是默认值。
- `read-only` 使用缓存结果，但不会发布未命中的结果。
- `write-only` 发布结果，但始终执行任务而不是恢复结果。
- `off` 禁用任务输出缓存，并使用普通的源文件/输出新鲜度检查。
- `local-only` 仅读写本地缓存，绕过任何已配置的远程服务。

```bash
# 防止不受信任的拉取请求发布缓存条目
mise run --task-cache read-only test

# 不使用已有条目，为本地缓存预热
mise run --task-cache write-only build

# 不读取或写入任务输出产物，诊断任务
mise run --task-cache off build
```

这些模式只影响任务 `cache` 属性配置的实验性任务输出缓存。现有的 `--no-cache` 选项则控制远程任务定义的获取。

#### 远程缓存和敏感数据

使用 `task.cache.remote_url` 和非空的 `task.cache.remote_namespace` 配置实验性的远程构建缓存服务。命名空间是不透明的仓库或组织标识符；服务器必须同时根据命名空间和缓存键隔离条目。它是路由元数据，不是身份验证机制或机密。对于不应相互影响缓存条目的写入者，应使用不同的命名空间。

```mise-toml
[settings]
experimental = true
task.cache.remote_url = "https://cache.example.com/mise/"
task.cache.remote_namespace = "acme/widgets"
task.cache.remote_mode = "read-write"
```

在进程环境中设置 `MISE_TASK_CACHE_REMOTE_TOKEN`，即可发送 bearer 凭据。等效的 `task.cache.remote_token` 设置仅适用于全局配置，但更推荐使用环境变量，这样就无需将令牌写入磁盘。mise 会在设置跟踪输出中隐藏令牌，并将其 HTTP 标头标记为敏感信息。对于非回环服务，它要求使用 HTTPS；仅允许本地开发服务器使用普通 HTTP。服务器仍应使用短期、最小权限的凭据，限制命名空间访问，避免记录授权标头，并根据缓存对象的敏感性和保留要求对其进行加密或采取其他保护措施。

如需轮换凭据，可将 `MISE_TASK_CACHE_REMOTE_TOKEN_FILE` 设置为一个仅包含 bearer 令牌的文件。mise 会在每次请求前重新读取该文件，这支持 Kubernetes 投射的服务账户令牌，而无需重启长时间运行的进程。等效的 `task.cache.remote_token_file` 设置仅适用于全局配置。

在 GitHub Actions 中，mise 可以自行获取并刷新短期 OIDC 令牌。授予工作流请求身份令牌的权限，并明确设置其受众：

```yaml
permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      MISE_TASK_CACHE_REMOTE_OIDC_AUDIENCE: https://cache.example.com
    steps:
      - uses: actions/checkout@v5
      - run: mise run test
```

缓存服务必须信任 GitHub 的签发者，接受配置的受众，并根据所选命名空间授权工作流的身份声明。mise 从 GitHub 的作业 OIDC 端点获取令牌，仅将其保存在内存中，并在令牌过期前刷新。受众设置仅适用于全局配置；如果工作流缺少 `id-token: write` 权限，获取过程会明确失败。

凭据优先级依次为显式令牌、令牌文件，然后是自动 OIDC。这样无需更改项目配置，即可使用紧急静态凭据覆盖工作负载身份。其他 CI 提供商可以通过 `MISE_TASK_CACHE_REMOTE_TOKEN` 直接提供其签发的 OIDC 令牌，无需协议专用的集成。

任务缓存条目并非不含机密的元数据。它们包含捕获的标准输出和标准错误，以及每个声明的输出文件。mise 会在存储日志前应用已配置的输出脱敏规则，但这不是通用的机密扫描器：任务可能打印未知凭据，或将凭据写入输出产物。除非这些值适合保留并与本地和远程缓存的所有读取者共享，否则不要缓存此类任务。清除本地条目不会删除已经上传到远程服务的副本；同样请使用远程服务的保留和删除控制。

产物校验和可以检测损坏，HTTPS 可以在传输过程中验证已配置服务器的身份，但校验和不是原始任务运行器签发的签名。任何获准向某个命名空间写入的主体都可以发布其读取者会信任的条目。为不受信任的拉取请求作业提供只读凭据或不提供远程凭据，使用 `--task-cache read-only` 防止发布，并将信任度较低的写入者隔离到单独的命名空间中。

#### 缓存正确性和确定性任务

启用 `cache` 是一种正确性声明：相同的缓存键材料必须产生等效的捕获日志和声明输出。所有可能改变结果的值都必须通过源文件或输入组、已解析的 mise 工具、`cache.env`、`cache.command_inputs` 或可缓存依赖的产物键来表示。这包括配置和锁文件、区域设置或功能标志、编译器包装器、生成的输入以及相关外部服务状态。操作系统和架构会自动包含在内；其他机器状态不会。

启用缓存的任务应当是确定性的，不应依赖未声明的文件、墙上时钟时间、随机性、可变的网络响应或环境中的环境变量。如果无法可靠捕获这类输入，请为任务禁用缓存。透传环境变量会有意地排除在缓存键之外，因此不得影响缓存的日志或输出。仅使用凭据获取内容的任务，应以该内容的稳定摘要或锁文件作为缓存键，而不是凭据本身。

声明的输出必须完整描述缓存命中时需要重现的文件系统状态。那些路径之外的副作用——数据库写入、部署、通知以及工作区其他位置的更改——不会被重放。只有在无需重现任何文件系统副作用时，`outputs = []` 才是正确的。在 Linux 上，`cache.audit = true` 可以发现许多未声明的工作区读取和写入，但审计仅提供建议，无法证明确定性，也无法观察每个外部依赖。

如果无法确定正确性，请在诊断期间使用 `--task-cache off`，补充缺失的键输入，并在信任新条目之前强制执行一次未缓存的运行。如果任务语义或未声明的外部状态发生变化可能导致不同信任策略下生成的条目发生冲突，请使用不同的远程命名空间。

```mise-toml
[tasks.lint]
run = "eslint ."
sources = ["package.json", "src/**"]
outputs = []
cache = { enabled = true }
```

要在配置作用域中为每个符合条件的任务默认启用缓存，请设置 `task_config.cache`。只有至少包含一个源文件，并且具有显式输出路径或 `outputs = []` 的任务才会继承此默认值；其他任务仍不会缓存。任务本地的 `cache` 值会覆盖作用域默认值。

```mise-toml
[settings]
experimental = true

[task_config.cache]
enabled = true
env = ["NODE_ENV"]
command_inputs = ["node --version"]

[tasks.build]
run = "npm run build"
sources = ["package.json", "src/**"]
outputs = ["dist"]

[tasks.deploy]
run = "./deploy.sh"
cache = { enabled = false }
```

缓存键包含源文件内容、任务定义和参数、已解析的任务环境、`cache.env` 中列出的变量的值（或不存在状态）、命令输入输出、已解析的工具版本、依赖产物键，以及操作系统和架构。除非列在 `cache.env` 中，否则从环境中继承的变量会被忽略。

使用 `mise run --task-cache-explain <task>` 打印生成缓存键的输入的确定性分解，但不会打印聚合键本身。环境变量只通过名称及其是否已设置来标识；mise 变量也只通过名称来标识，因此解释不会公开其内容或逐值摘要。其他可能源自机密的输入——包括源文件内容、依赖键、命令输出、任务定义和已解析的工具版本——只会按类别和数量报告。匹配的源路径、声明的输出模式、当前解析的输出根目录以及目标平台会直接列出。

将该标志与 `--dry-run` 结合使用，可在不执行、恢复或存储任务的情况下检查键输入。由于命令输入的输出哈希是缓存键的一部分，因此显式请求解释时仍会运行缓存命令输入。

使用 `mise run --dry-run --task-cache-explain-json <task>` 获取机器可读的诊断信息。该命令会向标准输出写入每个选定任务对应的一个紧凑 JSON 对象，并使用与人类可读解释相同的脱敏规则。每个对象都包含不透明的 `cache_key`，使消费者能够区分同一任务的不同调用，而不会暴露其参数或依赖环境值。这种 JSON Lines 格式在模式选择多个任务时仍可流式处理。缓存命令输入仍会运行，以便准确报告其存在，但不会包含其输出和哈希。

使用 `mise run --task-cache-stats <task>` 打印运行摘要，其中包括产物缓存命中的数量和百分比、恢复的未压缩输出和日志字节数，以及每个恢复条目创建时记录的执行时间。在添加这些元数据之前写入的条目仍可读取，恢复时其字节数和时间计为零。不执行缓存查找的新鲜度跳过不会计为命中或未命中。

使用 `mise cache task <task>` 检查与已配置任务关联的每个本地输出缓存条目。表格会显示每个键、它是否为当前新鲜度条目、其存储大小和可恢复大小、记录的执行时间、最后访问时间以及输出根目录。添加 `--json` 可获得结构化数组输出，即使只有一个任务匹配也是如此。在添加任务身份元数据之前创建的条目，如果是任务的当前条目，仍可进行检查；较早的历史条目会在被重写后变得可发现。

使用 `mise cache clear --task <task>` 仅删除该任务的本地输出缓存条目和新鲜度指针。不会删除工作目录中的声明输出，也不会删除属于其他任务的条目。没有身份元数据的旧当前条目会被分离但保留，因为无法验证其所有权；发生这种情况时 mise 会发出警告，而 `mise cache clear` 会将其删除。

`task_config.global_env` 会将环境变量名添加到配置作用域中每个启用的任务缓存，包括具有任务本地 `cache` 值的任务。与 `task_config.cache` 下的默认值不同，这些名称始终会与任务本地的 `cache.env` 组合。

```mise-toml
[task_config]
global_env = ["CI", "NODE_ENV"]
```

对于启用缓存的任务，即使拒绝继承环境，`cache.env` 或 `task_config.global_env` 中列出的变量仍可用。禁用缓存的任务和非缓存任务不会通过缓存配置继承变量。对于任务运行时需要、但不得影响缓存键的变量（例如短期凭据），请使用 `pass_through_env`。作用域级别的等效配置 `task_config.global_pass_through_env` 适用于每个任务。在 mise 默认的非沙箱环境模式下，环境中的变量已经会透传；当启用 `deny_env`、`deny_all` 或对应的 CLI 选项时，这些选项才会生效。

```mise-toml
[task_config]
global_pass_through_env = ["CI_JOB_TOKEN"]

[tasks.build]
pass_through_env = ["NPM_TOKEN"]
```

透传变量可能改变任务行为，却不会使缓存结果失效。任务不应将它们用于影响生成输出的值。它们的值不会添加到缓存键中，也不会作为缓存元数据持久化，但任务仍可能通过将其写入缓存输出文件或日志来暴露这些值。

缓存条目默认存储在 `MISE_CACHE_DIR/task-artifacts/v2` 下。设置实验性的 [`task.cache_dir`](/configuration/settings.html#task-cache-dir) 或 `MISE_TASK_CACHE_DIR`，可选择不同的父目录；mise 会将产物格式保留在其 `v2` 子目录中。默认位置和自定义位置都会包含在 `mise cache clear` 以及手动和自动缓存清理中。只有成功的任务运行才会被缓存。缓存读写失败会被视为未命中，且永远不会使成功的任务运行变为失败。

新的缓存条目包含独立于缓存查找键的 BLAKE3 产物校验和。它覆盖归档的输出和捕获的任务结果元数据，mise 会在提取文件或重放输出前验证它。校验和引入前写入的条目仍可读取。`mise cache task <task> --json` 会包含校验和，供缓存检查工具使用。

读取者、写入者、检查操作和任务范围的删除操作，会通过每个缓存键对应的跨进程锁进行协调。因此，并发进程看到的是完整的归档和清单对，不会将进行中的替换误判为损坏；不相关键的写入者仍彼此独立。写入失败时，临时归档和清单文件通常会被删除。在之后使用缓存时，mise 还会在获取关联的缓存键锁后删除被中断进程遗留的部分文件，因此绝不会删除活动写入者仍在发布的文件。

设置 [`task.cache_max_size`](/configuration/settings.html#task-cache-max-size) 可限制产物缓存的总大小，或设置 [`task.cache_max_age`](/configuration/settings.html#task-cache-max-age) 根据最后访问时间使条目过期。两个限制都是可选的，并在缓存成功写入后生效。当超过大小限制时，mise 会优先删除最近最少访问的条目。

当启用缓存的任务没有恢复结果而是执行时，mise 会报告原因：没有匹配条目、条目损坏、强制执行、读取已禁用，或某个依赖在没有稳定缓存键的情况下完成。原始执行和试运行的缓存绕过会保留现有的警告或预览行为，不会报告为缓存未命中。

标准输出和标准错误会作为有序、经过脱敏的流存储，并使用缓存命中时选定的输出模式重放。因此，前缀、交错、保持顺序、计时、替换、安静、静默以及按流静默同样适用于重放输出，就像适用于实时输出一样。原始任务和交互式任务会保留继承的终端 I/O，并保守地绕过产物缓存。

可缓存的依赖会将其产物键贡献给依赖任务的键，因此依赖任务执行、跳过或恢复后，依赖它的任务可以恢复匹配的产物。如果某个依赖在没有稳定产物键的情况下执行，其依赖任务会采取保守策略继续执行。

### `rust_cache` <Badge type="warning" text="实验性" />

- **类型**：`boolean | table`
- **默认值**：`false`

仅对本次任务运行启用 Rust 编译器操作缓存。`true` 和 `{}` 都会启用默认配置；`false` 和 `{ enabled = false }` 会禁用缓存。表格形式从一开始就可用，因此未来新增 Rust 专用选项时无需重命名该字段。

```mise-toml
[tasks.build]
run = "cargo build"
rust_cache = true
```

mise 只会将编译器集成注入任务子进程的环境中。Shell 激活、直接运行的 `cargo build`、编辑器进程和发布构建都不会被拦截。顶层的 `mise run` 会管理缓存会话，在成功之前刷新待上传内容，并报告命中次数、未命中次数和传输字节数。编译器操作键收集和预取功能会随编译器适配器一起提供，而不会作为未使用的任务清单字段存在。

Rust 操作缓存会在本次任务运行中禁用增量编译，因为两种缓存模型彼此不兼容。这可能会使本地快速编辑并构建的循环变慢。在 CI、冷克隆、工作树和分支切换场景中使用 `rust_cache`；本地增量开发循环则使用直接运行的 `cargo build`。在 CI 之外，操作缓存会话会读取本地和远程结果，但不会上传结果。

`rust_cache` 独立于任务结果缓存 `cache`：操作缓存可以复用单个编译器操作，同时任务仍会继续执行；而无需拦截编译器，也可以使用任务结果缓存。设置 `task_config.rust_cache` 可提供作用域内的默认值；任务本地的 `false` 会禁用该继承的默认值。

### `shell`

- **类型**: `string`
- **默认值**: 设置了 [`task_config.shell`](#task-config-shell) 时使用该值（配置作用域）；否则使用
  [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)/[`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)（仅全局）。
- **注意**: 仅适用于 toml-tasks。

用于运行任务的 shell。如果你想使用与默认不同的 shell 来运行任务，这很有用，例如 `fish`、`zsh` 或 `pwsh`。不过通常更建议使用 [shebang](./toml-tasks#shell-shebang)，因为这会让支持 mise 的 IDE 显示脚本的语法高亮和 lint 提示。

当 shell 为 PowerShell（`pwsh` 或 `powershell`）时，mise 会传递 `-NoProfile`，因此不会加载你的 PowerShell
配置文件，这与 `sh -c`/`zsh -c` 的非交互行为一致。这样可以避免配置文件修改
`PATH`（例如 mise 激活代码片段）后覆盖任务自身安装的工具。如果你的任务依赖配置文件中的副作用，请将
[`windows_powershell_no_profile`](/configuration/settings.html#windows_powershell_no_profile) 设置为 `false`。

```mise-toml
[tasks.hello]
run = '''
#!/usr/bin/env node
console.log('hello world')
'''
```

### `quiet`

- **类型**: `bool`
- **默认值**: `false`

抑制 mise 的任务输出，例如显示正在运行的命令，比如：`[build] $ cargo build`。
设置此项后，mise 除了脚本自身输出的内容外，不会显示任何其他输出。如果你还想隐藏任务本身产生的输出，请使用 [`silent`](#silent)。

`quiet` 是一个_详细程度_设置，与 [`output`](#output) _样式_相互独立：它不再强制使用无前缀输出，因此将 `output = "prefix"` 与 `quiet = true` 一起使用时，会保留任务名称前缀，同时隐藏 mise 自身的消息。

### `silent`

- **类型**: `bool | "stdout" | "stderr"`
- **默认值**: `false`

抑制任务的所有输出。如果设置为 `"stdout"` 或 `"stderr"`，则只会抑制对应的流。

### `output`

- **类型**: `string`
- **默认值**: 未设置（继承全局 [`task.output`](/configuration/settings.html#task-output) 设置）

此任务的输出 _样式_：`prefix`、`interleave`、`keep-order`、`replacing`、`timed`、`quiet` 或
`silent`。这是全局 `task.output` 设置在单个任务中的等效设置，并且与
[`quiet`](#quiet)/[`silent`](#silent) 详细程度字段相互独立，因此样式和静默程度可以自由组合
（例如，`output = "prefix"` + `quiet = true`）。`quiet`/`silent` _值_ 仅为向后兼容而保留，并将样式与该详细程度绑定。

### `usage`

- **类型**: `string`

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

usage 规范中的参数和标志都可以指定一个环境变量作为其值的替代来源。这允许在命令行未指定时，通过环境变量提供任务参数。

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

变量是可以在 TOML 任务和其他由 Tera 渲染的配置中共享的值，例如工具版本/选项。它们类似于环境变量，但不会导出到任务进程中。使用 <span v-pre>`{{vars.NAME}}`</span> 引用它们。

```mise-toml
[vars]
e2e_args = '--headless'

[tasks.test]
run = './scripts/test-e2e.sh {{vars.e2e_args}}'
```

变量也可以使用来自 `[env]` 的产生值指令形式：

```mise-toml
[vars]
e2e_args = { default = "--headless" }
api_token = { required = "在 mise.local.toml 中设置 api_token" }
secret_arg = { value = "--token=abc123", redact = true }
_.file = ".env"
```

`default` 形式会在同名进程环境变量已设置且非空时从中读取；不会使用 `[env]` 中的值来进行此查找。`required` 形式必须由进程环境或后续配置文件（如 `mise.local.toml`）满足。标记为 `redact = true` 的值会在任务输出中隐藏。也支持将[密钥](/environments/secrets/)作为变量。

任务也可以定义仅对任务本地生效的变量，从而覆盖该任务的配置变量：

```mise-toml
[tasks.test]
vars = { e2e_args = "--headed" }
run = './scripts/test-e2e.sh {{vars.e2e_args}}'
```

和 mise 中的大多数配置一样，变量可以分散定义在多个文件中。例如，你可以把一些变量放在全局 mise 配置 `~/.config/mise/config.toml` 中，并在 `~/src/work/myproject/mise.toml` 的任务里使用它们。你也可以在“更后面”的配置文件中覆盖这些变量，例如 `~/src/work/myproject/mise.local.toml`，并且它们会在任何配置文件的任务中被使用。

截至本文撰写时，变量仅支持 TOML 任务。我想为文件任务添加支持，但我不想仅仅为了这个功能就把所有文件任务都变成 Tera 模板。

## `[task_config]` 选项

顶层 `mise.toml` `[task_config]` 部分中可用的选项。这些选项适用于由该配置文件包含的所有任务，或使用相同根目录的所有任务，例如：`~/src/myproject/mise.toml` 的 `[task_config]`
适用于文件任务，如 `~/src/myproject/mise-tasks/mytask`。设置 `cascade = true`，还可将该部分应用于由后代配置根目录拥有的任务。

### `task_config.cascade`

将此配置的 `[task_config]` 值级联到后代配置根目录。后代值会覆盖单独的继承字段。后代可以设置 `cascade = false` 来停止继承该部分。

```toml
[task_config]
cascade = true
shell = "bash -c"
```

这适用于 `dir`、`shell`、`cache`、`rust_cache` 和 `includes`。继承的 include 路径仍然相对于其定义所在的配置根目录，因此单仓库根目录可以提供一组共享任务。

### `task_config.dir`

更改任务运行时使用的默认目录。

```toml
[task_config]
dir = "{{cwd}}"
```

### `task_config.shell` {#task-config-shell}

设置此配置作用域中任务的默认 shell。任务显式设置的 `shell` 优先级更高，包括从任务模板继承的 `shell`。当 `task_config.cascade = true` 时，后代配置根目录会继承此默认值，并可以使用自己的 `task_config.shell` 覆盖它。

```toml
[task_config]
shell = "bash -c"
```

不同于仅适用于全局的
[`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 和
[`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)
设置，此默认值仅作用于项目任务，不能更改钩子、工具安装或来自其他配置根目录的任务所使用的解释器。

### `task_config.cache` <Badge type="warning" text="实验性" />

设置此配置作用域中任务的默认构件缓存配置。该默认配置只会被具有源且拥有显式输出路径或设置了 `outputs = []` 的、符合缓存条件的任务继承。
任务本地和任务模板中的缓存配置优先级更高，包括
`cache = { enabled = false }`。

```toml
[task_config.cache]
enabled = true
env = ["NODE_ENV", "CI"]
command_inputs = ["node --version"]
```

### `task_config.rust_cache` <Badge type="warning" text="实验性" />

设置 Rust 操作缓存的作用域默认值。任务本地或任务模板中的值优先级更高；显式设置为 `false` 会禁用继承的默认值。

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

### `task_config.includes` {#task-config-includes}

设置 mise 在查找任务时应搜索的 toml 文件和文件任务目录。

```toml
[task_config]
includes = [
    "tasks.toml", # 一个任务 toml 文件
    "mytasks"     # 一个包含文件任务的目录
]
```

当设置了 `task_config.includes` 时，它会替换该配置作用域的默认文件任务目录，而不是在其基础上追加。
Include 条目会作为 Tera 模板进行渲染，因此可以引用诸如 `config_root`、
`env` 和已解析的 `vars` 等值。

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

对于本地任务和单仓库任务发现，mise 使用最近的、定义了
`task_config.includes` 的配置文件。当父级设置了 `task_config.cascade = true` 时，其 includes 会被继承，
直到某个子级定义自己的 includes。子配置的 `includes` 会替换该目录的默认 includes 以及任何
继承的 `includes`。

全局配置文件会被独立加载，因此每个全局配置文件使用自身的 `task_config.includes`；如果未设置 `includes`，则使用默认目录。

条目会按顺序进行求值，当多个 include 定义了同名任务时，列表中的**最后**一个条目获胜。
这一规则同样适用于目录、toml 文件和 `git::` include，因此若要用本地任务覆盖来自 `git::` include 的任务，请将本地目录放在 `git::` 条目之后：

来自选择该 include 的配置或优先级更高配置的内联 `[tasks.<name>]` 命令，其优先级高于包含的 TOML 文件中的同名任务。不包含 `run`、`run_windows` 或
`file` 的内联块则会覆盖描述、环境和依赖关系等元数据。对于可执行文件任务，脚本仍然是该任务的命令，而内联定义会覆盖其元数据。

相同的覆盖规则也适用于分层的内联任务定义。例如，`mise.local.toml` 中仅包含元数据的任务，会覆盖 `mise.toml` 中最近的、优先级较低的带命令定义。具有自身命令的更高优先级定义仍会替换较低层级的任务。所选的、包含命令的基础定义之上的所有仅包含元数据的定义，都会按照优先级顺序贡献元数据；其下方的定义则不会贡献元数据。

```toml
[task_config]
includes = [
    "git::https://github.com/myorg/shared-tasks.git//tasks", # 远程任务……
    ".mise/tasks",                                           # ……会被同名的本地任务覆盖
]
```

如果使用包含进来的 task toml 文件，请注意它们的格式与 `mise.toml` 文件不同。它们只是一个任务列表。
该文件应与 `mise.toml` 的 `[tasks]` 部分格式相同，但不包含 `[task]` 前缀：

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

如果你希望在包含的 toml 任务文件中使用自动补全和验证，可以使用以下 JSON schema：<https://mise.jdx.dev/schema/mise-task.json>

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

包含的 `.toml` 文件使用 [task toml 文件格式](#task-config-includes)（键是任务名称——没有 `[tasks.…]` 前缀）。仓库会被克隆并缓存到 `MISE_CACHE_DIR/remote-git-tasks-cache`。来自该 include 的任务会像本地任务一样被加载。你可以使用 `MISE_TASK_REMOTE_NO_CACHE=true` 或 `--no-cache` 标志来禁用缓存。

## 单体仓库支持

mise 通过目标路径语法支持单体仓库风格的任务组织。通过在根目录的 `mise.toml` 中设置 `monorepo_root = true` 来启用它。

有关单体仓库任务的完整文档，包括：

- 任务路径语法和通配符
- 来自父级配置的工具分层
- 性能调优
- 最佳实践和故障排除

请参阅专门的 [单体仓库任务](/tasks/monorepo) 文档。

## `redactions` <Badge type="warning" text="实验性" />

- **类型**: `string[]`

Redactions 是一种从任务输出中隐藏敏感信息的方式。这对于诸如
API 密钥、密码或其他你不想意外泄露到日志或
其他输出中的敏感信息很有用。

要从输出中遮蔽的环境变量列表。

```toml
redactions = ["API_KEY", "PASSWORD"]
```

运行上述任务时，输出将改为 `echo [redacted]`。

你也可以将其指定为 glob 模式，例如：`redactions = ["SECRETS_*"]`。

## `[vars]` 选项

参见 [Vars](#vars)。

## 任务配置设置

<script setup>
import Settings from '/components/settings.vue';
</script>

以下设置控制任务行为。这些设置可以在全局的 `~/.config/mise/config.toml` 中设置，或在每个项目的 `mise.toml` 中设置：

<Settings :level="3" prefix="task" />
