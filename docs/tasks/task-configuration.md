---
description: "查阅 mise 任务的所有属性、task_config 选项、任务环境变量和相关设置。"
socialDescription: "查阅 mise 任务的所有属性、task_config 选项和相关设置。"
---

# 任务配置参考

在此查找任务支持的所有属性、为配置根目录设置默认值的 `[task_config]` 选项、mise 提供给每个任务的环境变量，以及会改变任务运行方式的设置。
如果刚开始使用任务，请先阅读 [TOML 任务](/tasks/toml-tasks.html)或[文件任务](/tasks/file-tasks.html)。

你可以在 `mise.toml` 的 `[tasks.<name>]` 表、[TOML 任务文件](/tasks/task-discovery.html#included-toml-files)或文件任务开头的 `#MISE` 注释中设置属性。文件任务头支持相同的属性和值，但不包括 `run`、`run_windows` 和 `file`（脚本本身就是命令），也不包括 `usage`（参数由 `#USAGE` 行定义）。mise 会对这四项发出警告并忽略它们。若属性值的类型不正确，mise 会发出警告并忽略该属性，因此单个脚本配置错误不会阻止其他任务加载。相反，错误的 `confirm` 或 `deny_*` 值会导致报错，以免拼写错误意外移除确认提示或沙箱限制。
若要在多个任务间共享属性，请使用[任务模板](/tasks/templates.html)。

::: warning 实验性功能
标记为实验性的属性和选项需要启用以下设置。否则任务使用它们时，mise 会报错。

```toml
[settings]
experimental = true
```

:::

## 任务属性

| 类别                                                      | 属性                                                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [命令](#command)                                          | [`run`](#run), [`run_windows`](/tasks/task-configuration.html#run-windows), [`file`](#file), [`shell`](#shell), [`dir`](#dir), [`usage`](#usage), [`raw_args`](/tasks/task-configuration.html#raw-args), [`extends`](#extends) |
| [说明与可见性](#description-and-visibility)               | [`description`](#description), [`alias`](#alias), [`hide`](#hide), [`confirm`](#confirm)                                                                                                                                       |
| [执行顺序](#ordering)                                     | [`depends`](#depends), [`depends_post`](/tasks/task-configuration.html#depends-post), [`wait_for`](/tasks/task-configuration.html#wait-for), [`daemons`](/tasks/task-configuration.html#daemons)                               |
| [环境与工具](#environment-and-tools)                     | [`env`](#env), [`vars`](#task-vars), [`secrets`](/tasks/task-configuration.html#secrets), [`tools`](#tools)                                                                                                                    |
| [跳过工作](#skipping-work)                               | [`skip_if`](/tasks/task-configuration.html#skip-if), [`sources`](#sources), [`outputs`](#outputs), [`watch`](#watch), [`cache`](/tasks/task-configuration.html#cache)                                                          |
| [执行](#execution)                                       | [`timeout`](#timeout), [`raw`](#raw), [`interactive`](#interactive)                                                                                                                                                            |
| [输出](#output-properties)                                | [`output`](#output), [`quiet`](#quiet), [`silent`](#silent)                                                                                                                                                                    |
| [沙箱](#sandbox)                                          | `deny_all`, `deny_read`, `deny_write`, `deny_net`, `deny_env`, `allow_read`, `allow_write`, `allow_net`, `allow_env`, `pass_through_env`                                                                                       |
| [已弃用](#deprecated)                                    | [`rust_cache`](/tasks/task-configuration.html#rust-cache)                                                                                                                                                                      |

本页其余部分介绍 [`[task_config]` 选项](#task-config-options)、[mise 设置的环境变量](#environment-variables-mise-sets)和[相关设置](#settings)。

## 命令

### `run`

- **类型**: `string | (string | { task: string, args?: string[], env?: { [key: string]: string } } | { tasks: string[] })[]`

要运行的命令。字符串表示运行一个脚本；数组中的条目按顺序运行，遇到第一个失败项时停止。

```mise-toml
[tasks.test]
run = "cargo test"

[tasks.ci]
run = ["cargo fmt --check", "cargo clippy", "cargo test"]
```

数组中的条目也可以运行其他任务。`{ task = "name" }` 会运行一个任务，并可指定 `args` 和 `env`；`{ tasks = [...] }` 会并行运行多个任务。
每个被引用的任务都会运行自己的依赖项。

```mise-toml
[tasks.release]
run = [
  { task = "build", args = ["--release"], env = { RUSTFLAGS = "-C opt-level=3" } },
  { tasks = ["test", "lint"] }, # 并行运行
  "./scripts/publish.sh",
]
```

这些步骤不是 [`depends`](#depends) 依赖边，因此 [`mise tasks deps`](/cli/tasks/deps.html) 不会显示它们。

任务可以使用 [`file`](#file) 代替 `run`，通过 [`extends`](#extends) 从模板继承 `run`，也可以只设置 `depends` 来组合其他任务。
如果任务只需要 `run`，可以用一行定义，例如 `tasks.lint = "eslint ."` 或
`tasks.ci = ["cargo fmt --check", "cargo test"]`。

### `run_windows`

- **类型**：与 [`run`](#run) 相同

在 Windows 上，mise 会运行此项，而不是 `run`。它接受与 `run` 相同的格式；未设置时，Windows 会运行 `run`。

```mise-toml
[tasks.build]
run = "cargo build"
run_windows = "cargo build --features windows"
```

文件任务不支持 `run_windows`；如何为脚本提供 Windows 版本，请参阅 [Windows](/tasks/file-tasks.html#windows)。

### `file`

- **类型**: `string`

运行脚本文件，而不是内联的 `run` 命令。mise 会以任务的配置根目录为基准解析相对路径；对于
`~/src/myproj/.config/mise.toml`，该目录为 `~/src/myproj`，也是默认的 [`dir`](#dir)。路径支持 Tera 模板。

```toml
[tasks.release]
description = "Cut a new release"
file = "scripts/release.sh"
```

`file` 也接受 HTTP(S) URL 和 [`git::` URL](/tasks/task-discovery.html#git-url-syntax)。缓存与安全说明见[远程任务](/tasks/toml-tasks.html#remote-tasks)。

### `shell`

- **类型**：`string`
- **默认值**：如果设置了 [`task_config.shell`](#task_config.shell)，则使用该值；否则使用
  [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)
  或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 设置值

运行任务 `run` 脚本的解释器命令及其参数：

```mise-toml
[tasks.lint]
shell = "bash -c"
run = "[[ -f Cargo.lock ]] && cargo clippy"
```

`run` 脚本首行的 [shebang](/tasks/toml-tasks.html#shell-shebang) 也可选择解释器，并让编辑器正确高亮脚本。

当 Shell 为 PowerShell（`pwsh` 或 `powershell`）时，mise 会传入 `-NoProfile`，不加载 PowerShell 配置文件，与 `sh -c` 的非交互行为一致。
这样可以避免修改 `PATH` 的配置（例如 mise 激活片段）覆盖任务所用的工具。如果任务依赖配置文件，请将
[`windows_powershell_no_profile`](/configuration/settings.html#windows_powershell_no_profile)
设为 `false`。

mise 会直接运行可执行文件，因此只有在 mise 自行启动解释器时，`shell` 才适用于文件任务或 `file` 脚本，例如 Windows 上的脚本，
或设置了
[`use_file_shell_for_executable_tasks`](/configuration/settings.html#use_file_shell_for_executable_tasks)
为 `true` 时。

### `dir`

- **类型**：`string`
- **默认值**：如果设置了 [`task_config.dir`](#task_config.dir)，则使用该值；否则为
  <code v-pre>{{ config_root }}</code>，即项目目录（对于 `~/src/myproj/.config/mise.toml`，为 `~/src/myproj`）

任务运行的目录。此值支持 Tera 模板。将它设为
<code v-pre>{{ cwd }}</code>，即可在运行 mise 时所在的目录中执行任务：

```mise-toml
[tasks.test]
dir = "{{ cwd }}"
run = "cargo test"
```

运行 mise 时所在的目录也会通过 `MISE_ORIGINAL_CWD` 提供给每个任务。

### `usage`

- **类型**：`string`

用于声明任务参数和标志的 [usage 规范](/tasks/task-arguments.html)。mise 会解析这些声明，在 `--help` 和补全中显示它们，
并将每个值作为 `$usage_<name>` 和 <code v-pre>{{ usage.name }}</code> 提供。文件任务则通过 `#USAGE` 注释行声明参数。

```mise-toml
[tasks.test]
usage = '''
arg "<file>" help="要测试的文件" default="src/main.rs"
'''
run = 'cargo test ${usage_file?}'
```

参数或标志可以通过 `env="..."` 从环境变量获取值；详见[环境变量绑定](/tasks/task-arguments.html#environment-variable-backing)。

### `raw_args`

- **类型**：`bool`
- **默认值**：`false`

设为 `true` 时，mise 完全不解析任务参数。所有参数（包括 `--help` 和 `-h`）都会原样传给命令。适用于包装了自带参数解析器的工具，
例如 `next build`、Django 的 `manage.py`，或使用 `argparse` 的 Python 脚本：

```mise-toml
[tasks.manage]
raw_args = true
run = "python manage.py"
```

```sh
mise run manage --help          # forwarded to manage.py
mise run manage migrate --fake  # every flag reaches manage.py unchanged
```

未启用 `raw_args` 时，mise 会用任务自身的帮助信息响应 `--help`。单次运行时，也可使用 `mise run task -- --help`，让 `--help` 和 `-h` 跳过
mise 的参数解析器。分隔符后的参数属于任务，因此 `mise run task -- -- --help` 会转发 `-- --help`。

### `extends`

- **类型**：`string`

要继承属性的[任务模板](/tasks/templates.html)名称。任务中设置的属性会依照[合并规则](/tasks/templates.html#merge-semantics)覆盖模板中的属性。

```mise-toml
[task_templates."python:test"]
run = "uv run pytest"
tools = { python = "3.14", uv = "latest" }

[tasks.test]
extends = "python:test"
env = { PYTHONPATH = "src" }
```

文件任务通过 `#MISE extends="python:test"` 指定模板。

## 说明与可见性

### `description`

- **类型**: `string`

会显示在 `mise tasks ls`、`mise run` 选择器、任务的 `--help` 和 Shell 补全中。

```mise-toml
[tasks.build]
description = "构建 CLI"
run = "cargo build"
```

### `alias`

- **类型**: `string | string[]`

运行该任务的其他名称：

```mise-toml
[tasks.build]
alias = "b" # mise run b
run = "cargo build"
```

任务名称优先于别名。因此，如果存在名为 `b` 的任务，`mise run b` 会运行该任务，即使别名来自父目录的配置也是如此。

### `hide`

- **类型**：`bool`
- **默认值**：`false`

从帮助输出、补全和 `mise tasks ls` 中隐藏任务，例如用于内部任务或已弃用的任务。`mise tasks ls --hidden` 会列出隐藏任务，
`mise run` 仍可运行它们。

```mise-toml
[tasks.internal]
hide = true
run = "echo my internal task"
```

### `confirm`

- **类型**：`string | { message: string, default?: "yes" | "no", yes?: string, no?: string }`

在任务自身命令运行前显示的确认提示，适用于具有破坏性或运行时间较长的任务。此时任务的 [`depends`](#depends) 已运行。
若要先询问再运行依赖项，请在依赖任务本身设置 `confirm`，或将它们作为 `run = [{ task = "..." }]` 步骤运行，这些步骤会在提示之后执行。

```mise-toml
[tasks.deploy]
confirm = { message = "Deploy to production?", yes = "Deploy", no = "Cancel", default = "no" }
run = "./deploy.sh"
```

`yes` 和 `no` 可更改两个选项的标签，`default` 设置默认选项（未指定时为 `yes`）。通过管道输入的回答
（`echo y | mise run deploy`）仍接受 `y` 和 `n`。设置 `mise --yes` 或 `MISE_YES=1` 可跳过确认。没有可供提问的终端且未通过管道提供答案时，任务会失败。

提示内容和选项标签支持 Tera 模板，也可以使用任务参数：

```mise-toml
[tasks.deploy]
usage = '''
arg "<environment>" help="Environment to deploy to"
flag "--force" help="Force deployment"
'''
confirm = "Deploy to {{ usage.environment }}?{% if usage.force %} (forced){% endif %}"
run = "./deploy.sh ${usage_environment}"
```

## 执行顺序

这些属性如何影响任务调度，请参阅[依赖关系与执行顺序](/tasks/architecture.html)。

### `depends`

- **类型**：`string | (string | string[] | { task: string, args?: string[], env?: { [key: string]: string }, optional?: bool })[]`

此任务运行前必须完成的任务。多个任务共享同一依赖项时，该依赖只运行一次。mise 会尽可能并行运行任务，
并发数最多为 [`jobs`](/configuration/settings.html#jobs) 指定的数量。

每个条目可以是任务名、别名或[模式](/tasks/running-tasks.html#wildcards)（例如 `lint:*`），并可附带参数。
条目可以写成单个字符串（`"build --release"`）、数组（`["build", "--release"]`）或表
（`{ task = "build", args = ["--release"] }`）。在 monorepo 中，请使用 `//path:task` 格式的名称；详见
[Monorepo 任务](/tasks/monorepo.html)。

```mise-toml
[tasks.build]
run = "cargo build"

[tasks.test]
depends = ["build", "lint:*"]
run = "cargo test"
```

[`mise tasks deps`](/cli/tasks/deps.html) 会显示由 `depends`、`depends_post` 和 `wait_for` 声明的依赖关系图。

#### 向依赖任务传递环境变量

可通过 `VAR=value` 前缀或 `env` 表为单个依赖任务设置变量。这些变量只对该依赖生效，不会传递给当前任务或其他依赖：

```mise-toml
[tasks.test]
depends = [
  "NODE_ENV=test setup",
  { task = "build", args = ["--release"], env = { RUSTFLAGS = "-C opt-level=3" } },
]
run = "npm test"
```

#### 向依赖任务传递父任务参数

使用 <code v-pre>{{ usage.name }}</code> 模板将当前任务的参数转发给依赖任务。两个任务都需要用 `usage` 规范声明各自接受的参数：

```mise-toml
[tasks.build]
usage = 'arg "<app>"'
run = 'echo "building {{ usage.app }}"'

[tasks.deploy]
usage = 'arg "<app>"'
depends = [{ task = "build", args = ["{{ usage.app }}"] }]
run = 'echo "deploying {{ usage.app }}"'
```

`mise run deploy myapp` 会将 `myapp` 同时传给 `deploy` 和它的 `build` 依赖。字符串格式
（<code v-pre>depends = ["build {{ usage.app }}"]</code>）也可使用，标志参数同理
（<code v-pre>args = ["--target", "{{ usage.target }}"]</code>）。调用链中的每个任务都可以将自己解析后的参数转发给依赖任务。

#### 可选依赖项

在表条目中设置 `optional = true` 后，匹配到的任务存在时会运行；名称或模式未匹配到任务时不会失败。但无效模式仍会报错。

```toml
[tasks.test]
depends = [
  { task = "//...:test", optional = true },
  { task = "//...:test:*", optional = true },
]
```

### `depends_post`

- **类型**：与 [`depends`](#depends) 相同

与 `depends` 类似，但这些任务会在当前任务结束后运行。可用于必须在任务结束后执行的清理或报告：

```mise-toml
[tasks.test]
run = "npm test"
depends_post = ["stop-services"]
```

只要当前任务已经启动，后置依赖会在任务成功或失败后运行。如果某个 `depends` 先失败，则不会运行后置依赖。后置依赖自身的依赖也会等待当前任务，
因此整条清理链会在主要工作结束后运行。同一任务同时列在 `depends` 和 `depends_post` 中时，会分别在前后各运行一次。条目接受与 `depends` 相同的参数、
环境变量和 `optional` 标志。

### `wait_for`

- **类型**：与 [`depends`](#depends) 相同

与 `depends` 类似，它会等待所列任务完成后再运行。不同之处在于，它不会将这些任务加入本次运行；只有它们已被安排运行时才会等待。

```mise-toml
[tasks.lint]
wait_for = ["render"] # render 会写入 JS 文件；如果它正在运行，就等待它完成
run = "eslint ."
```

条目接受与 `depends` 相同的参数、环境变量和 `optional` 标志。设置 `optional = true` 后，名称或模式未匹配到已配置任务也不会失败。
匹配规则取决于条目指定的内容：

- `wait_for = ["setup"]` 按名称匹配 `setup`，不考虑其参数或环境变量。因此它会等待由 `depends = ["DEBUG=1 setup"]` 启动的 `setup`。
- `wait_for = ["setup arg1"]` 或 `wait_for = ["DEBUG=1 setup"]` 只会匹配使用完全相同参数或环境变量运行的 `setup`。

### `daemons` <Badge type="warning" text="experimental" />

- **类型**：`bool | string | string[]`

任务运行前必须启动并就绪的[项目 daemon](/daemons.html)。需要 pitchfork 2.25.0 或更新版本。

| 值                      | 要求                                             |
| ----------------------- | ------------------------------------------------ |
| `"postgres"`            | 一个命名 daemon。                                |
| `["postgres", "redis"]` | 每个指定的 daemon。                              |
| `true`                  | 任务项目配置中的所有 daemon。                    |
| `false` 或未设置        | 不要求 daemon。                                  |

```mise-toml
[daemons]
postgres = "18"

[tasks.test]
daemons = "postgres"
run = "npm test"
```

mise 会启动尚未运行的 daemon，并等待它们就绪后再运行任务。任务结束后 daemon 会继续运行；可使用
[`mise daemons stop`](/cli/daemons/stop.html) 将其停止。

名称必须匹配任务自身项目配置层级中的 `[daemons]` 条目，包括继承的声明。在 monorepo 中，来自其他项目的依赖任务会在其所属项目中解析名称，
而不是在调用任务的项目配置中解析。未知名称会导致运行失败。

`--skip-deps` 和 `task.skip_depends` 设置会跳过 daemon 要求。`--dry-run` 仍会检查名称和实验性设置，但不会启动任何服务。
安全模式会阻止任务启动 daemon。

通过 `run = [{ task = "..." }]` 条目调用的子任务会在本次运行启动后才解析，因此不会启动它自身声明的 `daemons`。
请在被调用的任务上声明要求。设置和就绪检查见 [daemon 指南](/daemons.html#tasks-that-require-daemons)。

## 环境与工具

### `env`

- **类型**：`{ [key]: string | int | bool | directive }`，值格式与顶层 [`[env]`](/environments/) 相同，
  包括 `{ required = true }` 这样的指令表以及 `_.file` 或 `_.path` 指令。

此任务命令使用的环境变量。它们不会传给 `depends` 任务。通过 `run` 启动的任务（例如下例中的 `mise run other-task`）
会像任何子进程一样继承这些变量。

```mise-toml
[tasks.test]
env.TEST_ENV_VAR = "ABC"
run = [
  "echo $TEST_ENV_VAR",
  "mise run other-task",
]
```

值可以通过 <code v-pre>{{ secrets.NAME }}</code> 引用密钥
<Badge type="warning" text="experimental" />。任务启动时 mise 会合成该值，并将此引用视为授予当前任务访问该密钥的权限。详见
[组合值](/environments/secrets/fnox.html#compose-values)。如需在任务输出中隐藏值，请参阅[隐藏敏感值](/environments/secrets/#redaction)。

### `vars` {#task-vars}

- **类型**: `{ [key]: string | int | bool | directive }`

mise 渲染此任务时，可通过 <code v-pre>{{ vars.NAME }}</code> 使用这些值。顶层 [`[vars]`](/configuration/vars.html) 对所有任务可用；
任务本地值会覆盖顶层值以及从任务模板继承的变量。vars 不会导出为环境变量；若要让任务进程读取某个值，请使用 [`env`](#env)。

```mise-toml
[vars]
mode = "headless"

[tasks.test]
vars = { mode = "headed" }
run = "echo --mode={{ vars.mode }}"
```

`mise run test` 会输出 `--mode=headed`。除非其他任务另行覆盖，否则仍使用配置值 `headless`。

覆盖值会应用于任务模板字段中的引用，包括继承的字段，但不会重新计算加载配置时已经解析的顶层 vars。示例见
[变量解析](/configuration/vars.html#what-a-task-local-var-can-change)；若要让不同任务使用不同值来共享命令，请参阅
[任务模板变量](/tasks/templates.html#parameterizing-a-template-with-vars)。值指令见[配置变量](/configuration/vars.html#value-directives)。

### `secrets` <Badge type="warning" text="experimental" />

- **类型**：`string | string[]`

此任务启动时可从项目的[密钥来源](/environments/secrets/fnox.html)（`[secrets.fnox]`）获取的密钥键。只有此任务能获取它们；依赖、后置依赖以及
`run = [{ task = "..." }]` 子任务只会收到各自列表中指定的密钥。

```mise-toml
[secrets.fnox]

[tasks.deploy]
secrets = ["DEPLOY_KEY", "DATABASE_URL"]
run = "./deploy.sh"
```

早于 2026.10.4 的 mise 版本不接受此字段。如果仍有旧版本客户端读取该配置，请设置 `min_version = "2026.10.4"`。

mise 会从任务输出中隐藏这些值，并对该任务忽略 `--raw`。如果 mise 在终端中运行，且希望任务直接使用该终端，可在任务本身设置
[`raw`](#raw) 或 [`interactive`](#interactive)；此时任务输出不会被隐藏。接收密钥的任务会跳过[制品缓存](/tasks/caching.html)，
因为缓存日志或输出可能包含密钥，但新鲜度检查仍会进行。

任务模板和 `monorepo.task_defaults` 不允许使用 `secrets`。全局或系统配置中的任务、位于主目录或其父目录的配置文件中的任务、远程任务，
以及由 hook、`watch_files`、daemon 或 `mise bootstrap` 启动的任务都无法使用它。若只需在单次运行中向全局或远程任务授予密钥，请使用
`mise run --secrets KEY` 或 `mise run --secrets-all`。

### `tools`

- **类型**：`{ [key]: string | { version | path | prefix | ref: string, ...tool options } }`

仅为此任务安装并启用的工具，不会应用于其依赖任务。

```mise-toml
[tasks.build]
tools.rust = "1.95"
run = "cargo build"
```

表中必须且只能设置 `version`、`path`、`prefix` 或 `ref` 之一，并可像 [`[tools]`](/dev-tools/) 一样添加工具选项。

运行 [`mise lock`](/dev-tools/mise-lock.html) 可解析任务工具并将结果写入所属配置的锁文件。该命令只读取任务定义，不会运行任务或安装工具。

运行 `mise install --include-task-tools` 可安装当前范围内所有任务所需的工具，而不运行任何任务。可用它准备 CI 缓存或容器镜像；添加 `--monorepo` 可包含所有已配置的 monorepo 根目录。

## 跳过工作

### `skip_if`

- **类型**：`string`

mise 会在任务运行前执行的 Shell 命令。如果命令以 0 退出，mise 会跳过任务、打印 `skip_if condition met, skipping`，并将任务视为成功；
其他退出状态则会继续运行任务。可用于依赖文件未记录状态的操作，例如检查另一项工具是否已配置：

```mise-toml
[tasks.setup]
skip_if = "examplectl workspace show"
run = "examplectl workspace init"
```

该命令会在任务目录中使用任务的 Shell、环境和沙箱运行，时间在 [`depends`](#depends) 之后、[`confirm`](#confirm) 之前。
其输出会被丢弃，也不会接收 stdin，因此无法进行交互提示。它不会获得任务的 [`secrets`](/tasks/task-configuration.html#secrets)，因为 mise 只会为实际运行的任务解析密钥。
命令无法启动、超时（与任务共用 [`timeout`](#timeout)）或被信号终止时，任务会失败。与 `confirm` 一样，它支持 Tera 模板和任务参数；文件任务可使用
`#MISE skip_if="..."`。`mise run --force` 会跳过此检查直接运行任务，`mise run --dry-run` 则只打印命令而不执行。

被跳过的任务不算已完成工作，因此其依赖任务即使 [`sources`](#sources) 仍是最新状态也会跳过。若缺少某项内容时应让任务失败而非跳过，
请在 `run` 中检查，例如
`examplectl auth status || { echo "run examplectl login first" >&2; exit 1; }`.

### `sources`

- **类型**: `string | string[]`

任务读取的文件。设置 `sources` 后，如果最新源文件早于最新输出（输出默认为 `{ auto = true }`），且源文件集合及其大小和时间戳与 mise 上次成功运行后记录的一致，
mise 就会跳过任务。只要输出缺失，或运行 `mise run --force`，任务就会运行。若要比较文件内容而不是时间戳，请设置
[`task.source_freshness_hash_contents`](/configuration/settings.html#task.source_freshness_hash_contents).
若要将相同时间戳视为最新状态，请设置
[`task.source_freshness_equal_mtime_is_fresh`](/configuration/settings.html#task.source_freshness_equal_mtime_is_fresh).
完整规则见[任务何时会过期](/tasks/caching.html#what-makes-a-task-stale)。

```mise-toml
[tasks.build]
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = ["target/debug/mycli"]
```

只有自上次构建以来 `mise.toml`、`Cargo.toml` 或 `src` 下的 `.rs` 文件发生变更时，才会运行 `cargo build`。
定义任务的文件（例如配置文件或脚本）始终属于源文件，因此编辑任务定义也会触发运行。

条目可以是路径或 glob 模式，例如 `src/**/*.rs`。`src/**/*.{js,ts}` 这样的花括号备选模式可用于新鲜度检查、
[`mise watch`](/cli/watch.html)（它根据 `sources` 决定监视内容）以及 [`task_source_files()`](/templates.html#task-source-files)。
mise 会检查所有匹配文件的时间戳，因此范围过大的 glob 会拖慢每次运行。模式没有匹配文件时，mise 会警告任务虽定义了 sources，
却没有找到匹配文件；通常是模式中存在拼写错误。

相对条目以任务目录（即 [`dir`](#dir)，或未设置时的项目根目录）为基准解析，也可以使用 `..` 指向其上层文件，
例如 monorepo 根目录中的 `node_modules`：

```mise-toml
[tasks.build]
dir = "packages/web"
run = "npm run build"
sources = ["src/**/*.ts", "../../node_modules/**"]
outputs = ["dist"]
```

`sources` 和 `outputs` 可以使用任务解析后的 [usage](#usage) 参数。mise 会在每次调用时渲染这些值，然后检查新鲜度或制品缓存：

```mise-toml
[tasks.compile]
usage = 'arg "<target>"'
run = "compile {{ usage.target }} --output dist/{{ usage.target }}"
sources = ["src/{{ usage.target }}/**"]
outputs = ["dist/{{ usage.target }}"]
```

条目也可以通过 `@group:<name>` 引用命名分组；详见
[`task_config.input_groups`](#task_config.input_groups).
[`task_config.global_inputs`](#task_config.global_inputs) 会为配置根目录下的每个任务添加源文件。

#### 排除源

`sources` 中以 `!` 开头的条目会被排除，遵循 gitignore、watchexec 和 rsync 的惯例。排除项会影响新鲜度检查、
`task_source_files()` 的结果以及 `mise watch` 监视的文件。

```mise-toml
[tasks.build]
sources = ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts", "tsconfig.json"]
run = "npm run build"
```

mise 会按顺序检查条目，以最后一个匹配项为准，因此后续条目可以重新包含先前由 `!` 排除的文件。例如，
`["src/**/*.ts", "!src/**/*.test.ts", "src/keep.test.ts"]` 会排除除 `src/keep.test.ts` 以外的所有 `*.test.ts` 文件。
若要匹配以 `!` 开头的字面路径，请将其转义为 `\!`（在 TOML 基本字符串中写作 `"\\!important.txt"`）。

#### 依赖失效

带有 `sources` 的依赖任务运行或恢复其输出时，所有依赖它的任务也会运行；详见[依赖关系](/tasks/caching.html#dependencies)。

### `outputs`

- **类型**：`string | string[] | { auto: true }`
- **默认值**：`{ auto = true }`

任务创建的文件或目录。它们与 [`sources`](#sources) 共同构成新鲜度检查，也会由[制品缓存](/tasks/caching.html)保存和恢复。

以 `!` 开头的条目会排除匹配的输出。和 `sources` 一样，mise 按顺序检查条目，后续条目可以重新包含某个路径，`\!` 可转义字面开头的 `!`。
输出 glob 支持花括号备选模式，例如 `dist/{client,server}/**`。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["src/**"]
outputs = ["dist", "!dist/**/*.map", "!dist/.vite/**"]
```

排除的文件不参与新鲜度检查，也不会存入制品缓存条目。mise 恢复缓存制品时，会保留输出目录中已经存在的排除文件。

使用默认值 `outputs = { auto = true }` 时，无需指定输出文件也可使用 `sources`；`outputs = []` 则表示任务不会写入文件。
各形式对新鲜度检查的影响见[输出](/tasks/caching.html#outputs)，制品缓存对输出的要求见[要求](/tasks/caching.html#requirements)。

### `watch`

- **类型**：`{ no_vcs_ignore: bool }`
- **默认值**：`{ no_vcs_ignore = false }`

通过 [`mise watch`](/cli/watch.html) 运行任务的选项。默认情况下，即使 `sources` 中列出了被忽略的路径，`mise watch` 也会遵守
`.gitignore` 等版本控制系统的忽略文件。如果任务需要监视有意不纳入版本控制的生成文件，请设置 `watch.no_vcs_ignore`：

```mise-toml
[tasks.generate]
run = "process generated/output.json"
sources = ["generated/output.json"]
watch = { no_vcs_ignore = true }
```

这相当于向 watchexec 传入 `--no-vcs-ignore`。watchexec 会将忽略选项应用于整个监视进程，因此同时监视多个任务时，只要有一个任务设置此选项，
所有任务都会忽略 VCS 规则。请将 `sources` 范围控制得较小；关闭 VCS 忽略后监视大型构建、发布或依赖目录会增加大量文件系统扫描。

### `cache` <Badge type="warning" text="experimental" />

- **类型**：`{ enabled?: bool, audit?: bool, env?: string[], command_inputs?: string[] }`
- **默认值**：如果设置了 [`task_config.cache`](#task_config.cache)，则使用该值；否则为
  `{ enabled = false, audit = false, env = [], command_inputs = [] }`

缓存成功运行任务的输出和日志，并在相同输入再次出现时恢复。缓存要求、设置和调试方法见[任务缓存](/tasks/caching.html)；
若要在机器间共享结果，请参阅[远程任务缓存](/tasks/remote-cache.html)。

- `enabled`：存储并恢复此任务的结果。
- `env`：将其值纳入缓存键的继承环境变量名称。
- `command_inputs`：将命令输出纳入缓存键。
- `audit`：在 Linux 上搭配 `strace` 使用时，报告任务读取或写入但未列入 sources 和 outputs 的项目文件。

```mise-toml
[tasks.build]
run = "npm run build"
sources = ["src/**", "package.json", "pnpm-lock.yaml"]
outputs = ["dist"]
cache = { enabled = true, env = ["NODE_ENV"], command_inputs = ["node --version"] }
```

## 执行

### `timeout`

- **类型**：`string`
- **默认值**：未设置

任务中每条命令的最长运行时间，使用 `30s`、`5m` 或 `1h` 等时长表示。此值支持 Tera 模板。任何命令超过时限仍未结束时，任务都会失败，
即使命令被停止后以成功状态退出也一样。时限会分别应用于 `run` 中的每个脚本条目（以及文件任务的脚本），因此包含多条命令的任务总耗时可以更长。
`{ task = ... }` 和 `{ tasks = [...] }` 步骤使用被引用任务自己的超时设置。

```mise-toml
[tasks.integration-test]
run = "./scripts/integration-test.sh"
timeout = "10m"
```

若要限制整次运行，请使用 [`mise run --timeout`](/cli/run.html) 或 [`task.timeout`](/configuration/settings.html#task.timeout) 设置。
同时设置整次运行和单个任务的时限时，取较短者；`--timeout` 优先于设置值。在 Unix 上，超时会先向任务进程发送 SIGTERM，5 秒后再发送 SIGKILL。
在 Windows 上，单任务超时会发送 Ctrl+C，并在 5 秒后结束整个进程树；这也能停止忽略 Ctrl+C 的程序，例如停在
`Terminate batch job (Y/N)?` 提示处的批处理文件。整次运行的超时会立即结束 Windows 上的进程树，但不会停止 [`raw`](#raw) 任务的进程。

### `raw`

- **类型**：`bool`
- **默认值**：`false`

将任务的每条命令直接连接到终端的 stdin、stdout 和 stderr。mise 不会为输出添加前缀、捕获输出或[隐藏敏感值](/environments/secrets/#redaction)，
且此任务会跳过[制品缓存](/tasks/caching.html)。

raw 命令运行期间，mise 不会启动其他命令，因此无需担心其他任务干扰。锁按单条命令持有，所以当前任务的不同命令之间仍可运行其他任务。
若要让整个任务不被打断，请使用 [`interactive = true`](#interactive)，它会在任务脚本命令执行期间持有独占锁。运行
`{ task = ... }` 或 `{ tasks = [...] }` 步骤时会释放此锁。

### `interactive`

- **类型**：`bool`
- **默认值**：`false`

在整个任务运行期间将终端交给任务。与 [`raw`](#raw) 一样，它会直接连接 stdin、stdout 和 stderr；不同之处在于，mise 会从任务的第一条脚本命令到最后一条命令
一直持有独占锁，因此期间不会运行其他任务的命令。其他任务仍可在此任务之前或之后并行运行。与 `raw` 一样，mise 不会[隐藏敏感值](/environments/secrets/#redaction)，
且此任务会跳过[制品缓存](/tasks/caching.html)。`mise run --raw` 的范围更广：它会让所有任务都以 raw 方式运行，并一次只运行一个任务。

## 输出 {#output-properties}

### `output`

- **类型**：`"prefix" | "interleave" | "keep-order" | "replacing" | "timed" | "quiet" | "silent"`
- **默认值**：[`task.output`](/configuration/settings.html#task.output) 设置值

此任务的输出样式，即 `task.output` 的单任务形式。样式可与 [`quiet`](#quiet) 和 [`silent`](#silent) 属性自由组合，这两个属性控制显示内容的多少：
例如，`output = "prefix"` 与 `quiet = true` 会保留任务名称前缀并隐藏 mise 自身的消息。`quiet` 和 `silent` 值将输出样式与相应的详细程度绑定在一起，
目前仅为兼容旧配置而保留。

::: warning 已弃用
`quiet` 输出值已弃用。mise 从 `2026.9.3` 开始发出警告，并将在 `2027.9.3` 移除支持。请改用 `output = "interleave"` 和 `quiet = true`。
若要设置全局默认值，请在 `[settings]` 下设置 `task.output = "interleave"` 和 `task.quiet = true`。
:::

### `quiet`

- **类型**：`bool`
- **默认值**：`false`

隐藏 mise 为任务输出的内容，例如命令行提示（`[build] $ cargo build`），只显示任务自身的输出。若也要隐藏任务的输出，请使用 [`silent`](#silent)。
`quiet` 不会更改 [`output`](#output) 样式。

### `silent`

- **类型**：`bool | "stdout" | "stderr"`
- **默认值**：`false`

隐藏任务的所有输出。设为 `"stdout"` 或 `"stderr"` 时，只隐藏对应的数据流。

## 沙箱

这些属性限制任务命令可读取、写入、访问的网络内容，以及可从环境继承的变量。设置 `allow_*` 列表也会启用对应的限制。
相对路径以任务工作目录为基准解析。各平台支持情况及默认例外不同，详见[沙箱](/sandboxing.html)。

| 属性                                                            | 类型       | 效果                                                                                                                                                      |
| --------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deny_all`                                                      | `bool`     | 禁止文件系统读写、网络访问和继承环境变量。`allow_*` 条目可添加例外。                                                                                      |
| `deny_read`                                                     | `bool`     | 禁止读取文件系统，但保留任务运行所需的系统路径和 mise 路径。                                                                                               |
| `deny_write`                                                    | `bool`     | 禁止写入文件系统，但保留临时目录等默认可写路径。                                                                                                           |
| `deny_net`                                                      | `bool`     | 禁止网络访问。                                                                                                                                            |
| `deny_env`                                                      | `bool`     | 丢弃继承的环境变量，仅保留 `PATH`、`HOME`、`USER`、`SHELL`、`TERM`、`COLORTERM` 和 `LANG`。                                                               |
| `allow_read`                                                    | `string[]` | 允许读取这些路径，并禁止读取其他路径。                                                                                                                    |
| `allow_write`                                                   | `string[]` | 允许写入这些路径（它们也会变为可读），并禁止写入其他路径。                                                                                                 |
| `allow_net`                                                     | `string[]` | 尚不支持：Linux 和 macOS 上设置此项会导致任务在运行前失败。详见[访问特定主机](/sandboxing.html#access-to-particular-hosts)。                              |
| `allow_env`                                                     | `string[]` | 保留这些继承变量（支持 `MYAPP_*` 等 `*` 通配符），并丢弃其他变量。                                                                                        |
| `pass_through_env` <Badge type="warning" text="experimental" /> | `string[]` | 禁止继承环境变量时，仍保留这些继承变量（支持 `*` 通配符），但不会将其值加入任务缓存键。                                                                  |

`deny_*` 属性的默认值为 `false`，列表的默认值为 `[]`。

```mise-toml
[tasks.lint]
run = "eslint ."
deny_all = true
allow_read = ["."]
allow_write = ["./node_modules/.cache"]
allow_env = ["NODE_*"]
```

只有通过 `deny_env`、`deny_all`、`allow_env` 或相应的 CLI 标志或设置启用了环境沙箱，`pass_through_env` 才会生效。
适合用它传递不应影响缓存键的短期凭据；不要用于会改变生成结果或日志的值。若变量变化应使缓存失效，请改用
[`cache.env`](/tasks/task-configuration.html#cache)。详见[环境变量与缓存键](/tasks/caching.html#environment-variables-and-cache-keys)。

## 已弃用

### `rust_cache` <Badge type="danger" text="deprecated" />

- **类型**：`bool | { enabled?: bool }`
- **默认值**：`false`

此项已不起作用。启用时会打印迁移警告，mise 2027.8.14 将移除此字段。请删除它，并改用
[Mr Boxington](https://mr-boxington.jdx.dev/getting-started) (`mbx`) 运行 Cargo。如果由 mise 管理 Rust，请运行
`mise use --tool-option mr_boxington=true rust mr-boxington`；详见[使用 Mr Boxington 共享 Cargo 构建](/lang/rust.html#share-cargo-builds-with-mr-boxington)。
否则，请配置 [`cargo` 命令包装器](/dev-tools/shims.html#command-wrappers)。

## `[task_config]` 选项 {#task-config-options}

顶层 `[task_config]` 表中的选项为同一配置根目录下的任务设置默认值，包括配置文件中定义的任务、包含的任务文件，以及默认任务目录中的文件任务。
例如，`~/src/myproject/mise.toml` 中的 `[task_config]` 也适用于文件任务 `~/src/myproject/mise-tasks/build`。
设置 `cascade = true` 后，此表也会应用于下级配置根目录。

### `task_config.cascade` {#task_config.cascade}

- **类型**：`bool`
- **默认值**：`false`

将此配置的 `[task_config]` 值应用于下级配置根目录。下级值会覆盖继承的单个字段；下级配置也可以设置 `cascade = false`，停止继承此表。

```toml
[task_config]
cascade = true
shell = "bash -c"
```

级联适用于 `dir`、`shell`、`cache`、`global_env`、`global_pass_through_env`、`global_inputs`、`input_groups`、`includes`、`excludes` 和已弃用的
`rust_cache`。继承的 include 路径和任务输入仍以定义它们的配置根目录为基准。

下级配置中非空的 `global_inputs` 会替换继承值。下级 `input_groups` 会按名称与继承分组合并；同名时采用最近一层的定义。
继承的 `global_inputs` 中引用分组时也遵循此规则。每个分组仍以定义它的配置根目录为基准。

### `task_config.dir` {#task_config.dir}

- **类型**：`string`
- **默认值**：<code v-pre>{{ config_root }}</code>

此配置根目录下任务的默认 [`dir`](#dir)。任务自身设置的 `dir` 或从模板继承的 `dir` 优先级更高。

```toml
[task_config]
dir = "{{ cwd }}"
```

### `task_config.shell` {#task_config.shell}

- **类型**：`string`
- **默认值**：
  [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)
  或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 设置值

此配置根目录下任务的默认 [`shell`](#shell)。任务自身设置的 `shell`（包括从任务模板继承的值）优先级更高。

```toml
[task_config]
shell = "bash -c"
```

与仅限全局使用的内联 Shell 设置不同，此默认值仅适用于项目任务，不会更改 hook、工具安装或其他配置根目录中任务所用的解释器。

### `task_config.includes` {#task_config.includes}

- **类型**：`string[]`
- **默认值**：
[默认任务目录](/tasks/task-discovery.html#default-task-directories)

此配置根目录要加载的 TOML 任务文件和任务目录。该列表会替换默认任务目录，而不是在其基础上追加。条目可以是路径、glob 模式、`git::` URL 或
`oci::` 引用；mise 会将它们作为 Tera 模板渲染。

```toml
[task_config]
includes = [
  "tasks.toml", # TOML 任务文件
  "mytasks",    # 任务文件目录
]
```

哪些列表会生效、如何覆盖包含的任务，以及远程 [Git](/tasks/task-discovery.html#remote-git-includes) 和
[OCI](/tasks/task-discovery.html#remote-oci-includes) include 的说明见[任务发现与优先级](/tasks/task-discovery.html#include-task-files-and-directories)。

### `task_config.excludes` {#task_config.excludes}

- **类型**：`string[]`
- **默认值**：`[]`

相对于配置根目录、在任务发现时跳过的路径或 glob 模式。排除规则适用于默认任务目录，也适用于 `includes` 选中的路径。

```toml
[task_config]
excludes = [".mise/tasks/python/pyproject.toml", ".mise/tasks/generated"]
```

最近一层设置 `excludes` 的配置会替换继承的排除规则。详见[从发现结果中排除路径](/tasks/task-discovery.html#exclude-paths-from-discovery)。

### `task_config.cache` <Badge type="warning" text="experimental" /> {#task_config.cache}

- **类型**：与 [`cache`](/tasks/task-configuration.html#cache) 相同
- **默认值**：未设置

此配置根目录下任务的默认制品缓存配置。只有符合缓存条件的任务会继承它：即设置了 sources，且指定了输出路径或 `outputs = []` 的任务。
任务自身或模板中的 `cache`（包括 `cache = { enabled = false }`）优先级更高。

```toml
[task_config.cache]
enabled = true
env = ["NODE_ENV", "CI"]
command_inputs = ["node --version"]
```

### `task_config.global_inputs` <Badge type="warning" text="experimental" /> {#task_config.global_inputs}

- **类型**：`string[]`
- **默认值**：`[]`

mise 会将这些源路径和 glob 模式（均相对于配置根目录）添加到此配置根目录下的每个任务。可用它指定会使所有任务缓存失效的仓库级配置和锁文件，
无需在每个任务的 `sources` 中重复声明。条目可通过 `@group:<name>` 引用[输入分组](#task_config.input_groups)。

```toml
[task_config]
global_inputs = ["mise.toml", ".github/tool-versions", "@group:lockfiles"]

[task_config.input_groups]
lockfiles = ["Cargo.lock", "pnpm-lock.yaml"]
```

没有自行设置 `sources` 的任务也会使用这些输入，并将 `outputs` 设为 `{ auto = true }`；全局输入未变时，mise 会跳过该任务。
运行 `mise run --force` 可强制执行。

### `task_config.input_groups` <Badge type="warning" text="experimental" /> {#task_config.input_groups}

- **类型**：`{ [name]: string[] }`
- **默认值**：`{}`

命名的源模式列表，任务可在 `sources` 或 `global_inputs` 中通过 `@group:<name>` 引用。分组可以引用其他分组；引用不存在的分组或形成循环都会导致配置错误。

```mise-toml
[task_config.input_groups]
toolchain = ["rust-toolchain.toml", "Cargo.lock"]
rust = ["Cargo.toml", "src/**/*.rs", "@group:toolchain"]

[tasks.build]
run = "cargo build"
sources = ["@group:rust"]
outputs = ["target/debug/mycli"]
```

分组条目以定义它们的文件所在配置根目录为基准解析，即使任务设置了不同的 `dir` 也如此。直接写在任务 `sources` 中的条目仍以任务目录为基准。

### `task_config.global_env` <Badge type="warning" text="experimental" /> {#task_config.global_env}

- **类型**：`string[]`
- **默认值**：`[]`

mise 会将这些继承环境变量的名称添加到此配置根目录下所有设置了 [`cache`](/tasks/task-configuration.html#cache) 的任务缓存键中。
它们会追加到每个任务的 `cache.env`，而不是替换该值。

```toml
[task_config]
global_env = ["CI", "NODE_ENV"]
```

### `task_config.global_pass_through_env` <Badge type="warning" text="experimental" /> {#task_config.global_pass_through_env}

- **类型**：`string[]`
- **默认值**：`[]`

禁止继承环境变量时，为此配置根目录下每个任务保留的继承变量；这些变量值不会加入缓存键。它们会追加到各任务的 [`pass_through_env`](#sandbox) 中。

```toml
[task_config]
global_pass_through_env = ["CI_JOB_TOKEN"]
```

### `task_config.rust_cache` <Badge type="danger" text="deprecated" /> {#task_config.rust_cache}

此项已不起作用。请删除它，改用 [Mr Boxington 共享 Cargo 构建](/lang/rust.html#share-cargo-builds-with-mr-boxington)；
详见 [`rust_cache`](/tasks/task-configuration.html#rust-cache)。

## Monorepo 任务 {#monorepo-support}

`//projects/frontend:build` 这类任务名称需要 monorepo 根目录：在根目录的 `mise.toml` 中设置 `monorepo_root = true`，
并在 `[monorepo].config_roots` 中列出项目目录。详见 [Monorepo 任务](/tasks/monorepo.html)。

## mise 设置的环境变量

除 [`[env]`](/environments/) 和任务自身的 [`env`](#env) 外，mise 还会为每个任务设置 `MISE_TASK_NAME`、`MISE_CONFIG_ROOT` 和
`MISE_TASK_COLOR` 等变量。完整列表见[任务环境](/tasks/running-tasks.html#task-environment)。启用 [OpenTelemetry](/tasks/opentelemetry.html)
导出后，任务还会通过 `TRACEPARENT` 和 `TRACESTATE` 接收跟踪上下文，详见[跟踪传播](/tasks/opentelemetry.html#trace-propagation)。

## 设置

以下设置会改变任务的运行方式。将它们放在 `~/.config/mise/config.toml` 的 `[settings]` 下；并非仅限全局的设置也可放入项目的 `mise.toml`。
类型、默认值和对应的环境变量见[设置](/configuration/settings.html)。

| 设置                                                                                                                                                                                                                                                                  | 效果                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`jobs`](/configuration/settings.html#jobs)                                                                                                                                                                                                                           | 并行运行的任务数量。                                                                     |
| [`task.output`](/configuration/settings.html#task.output)                                                                                                                                                                                                             | 默认输出样式。                                                                          |
| [`task.quiet`](/configuration/settings.html#task.quiet)                                                                                                                                                                                                               | 隐藏每个任务中 mise 自身的输出。                                                         |
| [`task.timings`](/configuration/settings.html#task.timings)                                                                                                                                                                                                           | 每个任务结束时打印其耗时。                                                               |
| [`task.show_full_cmd`](/configuration/settings.html#task.show_full_cmd)                                                                                                                                                                                               | 打印完整命令行，而不截断。                                                               |
| [`task.timeout`](/configuration/settings.html#task.timeout)                                                                                                                                                                                                           | 限制整次 `mise run` 的运行时间。                                                        |
| [`task.skip`](/configuration/settings.html#task.skip)                                                                                                                                                                                                                 | `mise run` 要跳过的任务。                                                               |
| [`task.skip_depends`](/configuration/settings.html#task.skip_depends)                                                                                                                                                                                                 | 只运行指定任务，不运行其依赖项。                                                         |
| [`task.run_auto_install`](/configuration/settings.html#task.run_auto_install)                                                                                                                                                                                         | 任务运行前安装缺失的工具。                                                               |
| [`task.source_freshness_hash_contents`](/configuration/settings.html#task.source_freshness_hash_contents)                                                                                                                                                             | 比较源文件内容而非时间戳。                                                               |
| [`task.source_freshness_equal_mtime_is_fresh`](/configuration/settings.html#task.source_freshness_equal_mtime_is_fresh)                                                                                                                                               | 将源文件与输出的相同时间戳视为最新状态。                                                 |
| [`task.disable_paths`](/configuration/settings.html#task.disable_paths)                                                                                                                                                                                               | mise 不会在其中查找任务的路径。                                                         |
| [`task.remote_no_cache`](/configuration/settings.html#task.remote_no_cache)                                                                                                                                                                                           | 每次运行都获取远程任务文件和 include。                                                  |
| [`task.disable_spec_from_run_scripts`](/configuration/settings.html#task.disable_spec_from_run_scripts)                                                                                                                                                               | 仅从 `usage` 读取参数，不从 `run` 脚本推断。                                             |
| [`raw`](/configuration/settings.html#raw)                                                                                                                                                                                                                             | 如同 `mise run --raw`，将每个任务直接连接到终端。                                        |
| [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args), [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)                                                                | `run` 脚本所用的 Shell。                                                                |
| [`unix_default_file_shell_args`](/configuration/settings.html#unix_default_file_shell_args), [`windows_default_file_shell_args`](/configuration/settings.html#windows_default_file_shell_args)                                                                        | mise 自行启动文件任务时所用的 Shell。                                                   |
| [`use_file_shell_for_executable_tasks`](/configuration/settings.html#use_file_shell_for_executable_tasks)                                                                                                                                                             | 通过 Shell 启动可执行文件任务，而不是直接运行。                                         |
| [`windows_executable_extensions`](/configuration/settings.html#windows_executable_extensions)                                                                                                                                                                         | 在 Windows 上将文件识别为任务的扩展名。                                                |
| [`windows_powershell_no_profile`](/configuration/settings.html#windows_powershell_no_profile)                                                                                                                                                                         | mise 启动 PowerShell 时不加载其配置文件。                                              |
| [`task.cache_dir`](/configuration/settings.html#task.cache_dir), [`task.cache_max_age`](/configuration/settings.html#task.cache_max_age), [`task.cache_max_size`](/configuration/settings.html#task.cache_max_size)                                                   | 制品缓存的位置和条目保留期限（实验性）。                                                |
| [`task.cache.remote_url`](/configuration/settings.html#task.cache.remote_url) 和其他 `task.cache.*` 设置                                                                                                                                                              | [远程任务缓存](/tasks/remote-cache.html)（实验性）。                                   |
| [`task.monorepo_depth`](/configuration/settings.html#task.monorepo_depth), [`task.monorepo_exclude_dirs`](/configuration/settings.html#task.monorepo_exclude_dirs), [`task.monorepo_respect_gitignore`](/configuration/settings.html#task.monorepo_respect_gitignore) | 已弃用的自动 monorepo 发现；仅在未设置 `[monorepo].config_roots` 时使用。              |
| [`task.auto_infer`](/configuration/settings.html#task.auto_infer)                                                                                                                                                                                                     | mise 推断任务时使用的 workspace 提供方。                                                |
| [`otel.enabled`](/configuration/settings.html#otel.enabled), [`otel.logs`](/configuration/settings.html#otel.logs)                                                                                                                                                    | [OpenTelemetry](/tasks/opentelemetry.html) 导出（实验性）。                            |
