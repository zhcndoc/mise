# 任务配置

这是 `mise.toml` 中或作为文件任务可用的所有任务配置选项的完整列表。

## 任务属性

所有示例均采用 toml-task 格式而不是文件格式，不过在两者中都适用，除非另有说明。

### `run`

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key]: string } } | { tasks: string[] })[]`

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

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key]: string } } | { tasks: string[] })[]`

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

- **类型**: `string | string[] | { task: string, args?: string[], env?: { [key]: string } }[]`

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

注意：这些环境变量只会传递给指定的依赖项，不会传递给当前任务或其他依赖项。

#### 向依赖项传递父任务参数

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

- **类型**: `string | string[] | { task: string, args?: string[], env?: { [key]: string } }[]`

与 `depends` 类似，但这些任务会在此任务及其依赖完成后运行。例如，你
可能希望有一个 `postlint` 任务，可以单独运行，而不会同时运行 `lint`：

```mise-toml
[tasks.lint]
run = "eslint ."
depends_post = ["postlint"]
[tasks.postlint]
run = "echo 'linting complete'"
```

支持与 `depends` 相同的参数和环境变量语法。

### `wait_for`

- **类型**: `string | string[] | { task: string, args?: string[], env?: { [key]: string } }[]`

类似于 `depends`，它会在运行前等待这些任务完成，不过它们不会
被添加到要运行的任务列表中。本质上这是可选依赖。

```mise-toml
[tasks.lint]
wait_for = ["render"] # 会生成一些 js 文件，所以如果它正在运行，就等待它完成
run = "eslint ."
```

支持与 `depends` 相同的参数和环境变量语法。

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

- **Type**: `string` | `{ message: string, default: string }`

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

可以使用相对于配置文件的路径和/或 glob 模式来指定，例如：`src/**/*.rs`。不过请注意，不要在 glob 中加入过多文件——mise 必须逐个扫描它们来检查时间戳。

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = ["target/debug/mycli"]
```

运行上述命令时，只有当 `mise.toml`、`Cargo.toml`，或者 `src` 目录中任何一个 ".rs" 文件自上次构建以来发生变化时，才会执行 `cargo build`。

可以在模板上下文中使用 [`task_source_files`](../templates.md#task-source-files) 函数来遍历任务的 `sources`。

#### 排除 sources

`/sources` 中以 `!` 为前缀的条目会被排除，这与 gitignore、watchexec 和 rsync 使用的约定一致。排除规则会影响新鲜度检查、`task_source_files` 模板函数，以及 `mise watch` 监视哪些文件发生变化。

```mise-toml
[tasks.build]
sources = ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts", "tsconfig.json"]
run = "npm run build"
```

条目会按顺序求值，最后一个匹配的条目生效。后面的非否定条目可以重新包含一个更早被 `!` 排除的文件——例如，`["src/**/*.ts", "!src/**/*.test.ts", "src/keep.test.ts"]` 会排除所有 `*.test.ts` 文件，除了 `src/keep.test.ts`。

如果要包含一个以 `!` 开头的字面路径，请将前缀转义为 `\!`（例如，在 TOML 中写成 `"\\!important.txt"`）。

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

`auto = true` 是手动指定输出文件的替代方案。在这种情况下，mise 会基于任务定义的哈希值触碰一个内部跟踪的文件（如果你感兴趣，它存储在 `~/.local/state/mise/task-outputs/<hash>`）。
如果你希望 `mise run` 在源文件发生变化时执行，但又不想为了让 `sources` 生效而手动 `touch` 一个文件，这会很有用。

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = { auto = true } # 当定义了 sources 时，这就是默认值
```

### `shell`

- **类型**: `string`
- **默认值**: [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)
- **注意**: 仅适用于 toml-tasks。

用于运行任务的 shell。如果你想使用与默认不同的 shell 来运行任务，这很有用，例如 `fish`、`zsh` 或 `pwsh`。不过通常更建议使用 [shebang](./toml-tasks#shell-shebang)，因为这会让支持 mise 的 IDE 显示脚本的语法高亮和 lint 提示。

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

### `silent`

- **类型**: `bool | "stdout" | "stderr"`
- **默认值**: `false`

抑制任务的所有输出。如果设置为 `"stdout"` 或 `"stderr"`，则只会抑制对应的流。

### `usage`

- **类型**: `string`

::: tip
有关任务参数和 usage 字段的完整信息，请参阅专门的 [Task Arguments](/tasks/task-arguments) 页面。
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

`default` 形式会在同名进程环境变量已设置且非空时从中读取；不会使用 `[env]` 中的值来进行此查找。`required` 形式必须由进程环境或后续配置文件（如 `mise.local.toml`）满足。标记为 `redact = true` 的值会在任务输出中隐藏。也支持将 [Secrets](/environments/secrets/) 作为变量。

任务也可以定义仅对任务本地生效的变量，从而覆盖该任务的配置变量：

```mise-toml
[tasks.test]
vars = { e2e_args = "--headed" }
run = './scripts/test-e2e.sh {{vars.e2e_args}}'
```

和 mise 中的大多数配置一样，变量可以分散定义在多个文件中。例如，你可以把一些变量放在全局 mise 配置 `~/.config/mise/config.toml` 中，并在 `~/src/work/myproject/mise.toml` 的任务里使用它们。你也可以在“更后面”的配置文件中覆盖这些变量，例如 `~/src/work/myproject/mise.local.toml`，并且它们会在任何配置文件的任务中被使用。

截至本文撰写时，变量仅支持 TOML 任务。我想为文件任务添加支持，但我不想仅仅为了这个功能就把所有文件任务都变成 tera 模板。

## `[task_config]` 选项

可在顶层 `mise.toml` 的 `[task_config]` 部分使用的选项。这些选项会应用于该配置文件所包含的所有任务，或使用相同根目录的所有任务，例如：`~/src/myproject/mise.toml` 的 `[task_config]`
会应用于诸如 `~/src/myproject/mise-tasks/mytask` 这样的文件任务，但不会应用于 `~/src/myproject/subproj/mise.toml` 中的任务。

### `task_config.dir`

更改任务运行时使用的默认目录。

```toml
[task_config]
dir = "{{cwd}}"
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

对于本地和 monorepo 的任务发现，mise 会使用定义了 `task_config.includes` 的最近配置文件。
这意味着子配置的 `includes` 会替换该目录下的默认值以及父配置定义的任何 `includes`。
全局配置文件是独立加载的，因此每个全局配置文件都会使用各自的 `task_config.includes`，如果未设置 `includes` 则使用默认目录。

条目会按顺序进行求值，当多个 include 定义了同名任务时，列表中的**最后**一个条目获胜。
这一规则同样适用于目录、toml 文件和 `git::` include，因此若要用本地任务覆盖来自 `git::` include 的任务，请将本地目录放在 `git::` 条目之后：

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

如果你希望在包含的 toml 任务文件中获得自动补全/验证，可以使用以下 JSON schema：<https://mise.en.dev/schema/mise-task.json>

#### 远程 Git Includes <Badge type="warning" text="experimental" />

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

## Monorepo 支持

mise 通过目标路径语法支持 monorepo 风格的任务组织。通过在根目录的 `mise.toml` 中设置 `monorepo_root = true` 来启用它。

有关 monorepo 任务的完整文档，包括：

- 任务路径语法和通配符
- 来自父级配置的工具分层
- 性能调优
- 最佳实践和故障排除

请参阅专门的 [Monorepo Tasks](/tasks/monorepo) 文档。

## `redactions` <Badge type="warning" text="experimental" />

- **类型**: `string[]`

Redactions 是一种从任务输出中隐藏敏感信息的方式。这对于诸如
API 密钥、密码或其他你不想意外泄露到日志或
其他输出中的敏感信息很有用。

要从输出中遮蔽的环境变量列表。

```toml
redactions = ["API_KEY", "PASSWORD"]
```

运行上述任务时，输出将改为 `echo [redacted]`。

你也可以将其指定为 glob 模式，例如：`redactions.env = ["SECRETS_*"]`。

## `[vars]` 选项

参见 [Vars](#vars)。

## 任务配置设置

<script setup>
import Settings from '/components/settings.vue';
</script>

以下设置控制任务行为。这些设置可以在全局的 `~/.config/mise/config.toml` 中设置，或在每个项目的 `mise.toml` 中设置：

<Settings :level="3" prefix="task" />
