---
description: "通过 mise run 运行任务，按名称或模式选择任务、传入参数，并控制并行度和输出。"
socialDescription: "通过 mise run 运行并按模式选择任务，同时控制并行度和输出。"
---

# 运行任务

使用 [`mise run`](/cli/run.html) 运行任务。mise 会加载任务所需的工具和环境，先运行其依赖项，再并行
运行互不依赖的任务。[依赖关系与执行顺序](/tasks/architecture.html)介绍了 mise 如何安排任务。

## 查找并运行任务

`mise tasks` 会列出当前目录中的任务。添加 `--hidden` 可显示设置了 `hide = true` 的任务；添加
`--extended` 可查看每个任务的定义位置。按名称运行任务：

```sh
mise run build
```

### `mise run` 简写形式 {#mise-run-shorthand}

`mise run build`、`mise r build`、`mise tasks run build` 和 `mise build` 都会运行 `build` 任务。
最后一种形式仅在任务名称未与 mise 命令重名时有效；后续 mise 版本也可能添加同名命令。因此，脚本和
文档中请使用 `mise run build`。交互使用时，可设置 `alias mr='mise run'` 等 Shell 别名来减少输入。

### 运行默认任务

不指定任务名称时，`mise run` 会运行名称或别名为 `default` 的任务：

```mise-toml [mise.toml]
[tasks.dev]
alias = "default"
run = "npm run dev"
```

使用此配置时，`mise run` 会运行 `dev`。如果不存在 `default` 任务，交互式终端会打开任务选择器；
非交互式运行则会报错 `no task default found`。

### 运行多个任务

使用 `:::` 分隔任务，并分别为各任务传入参数：

```sh
mise run build arg1 arg2 ::: test arg3 arg4
```

除非任务之间存在依赖关系，否则它们会并行运行。

## 按名称选择任务

可使用冒号分隔的组名为相关任务命名，例如 `test:unit` 和 `test:e2e`，这样就能用同一个模式选择它们。
包含 `:` 的 TOML 键必须加引号：

```mise-toml [mise.toml]
[tasks."test:unit"]
run = "cargo test --lib"
```

文件任务会根据所在子目录确定组名；参阅[文件任务](/tasks/file-tasks.html#task-grouping)。

### 通配符

`mise run` 和 `depends` 等任务依赖项都接受 glob 模式：

| 模式             | 匹配内容                              |
| ---------------- | ------------------------------------- |
| `?`              | 一个字符                              |
| `*`              | 一个冒号分组内的任意字符              |
| `**`             | 任意数量的完整分组                    |
| `{a,b}`          | 两种模式中的任一种                    |
| `[abc]`、`[a-z]` | 集合或范围内的一个字符                |
| `[!abc]`         | 集合或范围之外的一个字符              |

请为模式加引号，避免 Shell 对其进行展开：

```sh
mise run 'test:*:local'                   # test:units:local, not test:e2e:happy:local
mise run 'test:**:local'                  # test:units:local and test:e2e:happy:local
mise run 'generate:{completions,docs:*}'  # generate:completions and every generate:docs:* task
```

模式也可以用于 `depends`：

```mise-toml [mise.toml]
[tasks."lint:eslint"]
run = "eslint ."

[tasks."lint:prettier"]
run = "prettier --check ."

[tasks.lint]
depends = ["lint:*"]
```

在单体仓库中，模式也可用于选择项目，例如 `//...:test`；参阅[单体仓库任务](/tasks/monorepo.html)。

## 传递参数

任务名称后面的参数会传给该任务：

```sh
mise run build --release
```

若要为任务定义经过验证的参数接口，请使用 [usage 规范](/tasks/task-arguments.html)。该规范还会为任务
提供 `--help`、[Shell 补全](/shell-setup.html)和[生成的文档](/cli/generate/task-docs.html)。未定义规范时，
mise 会根据任务类型转发额外参数：

- 如果 `run` 是数组，参数只会传给最后一个元素。
- 对于内联命令，mise 会将参数追加到命令末尾，并按 Shell 语法加引号。
- [shebang 脚本](/tasks/toml-tasks.html#shell-shebang)或文件任务会将参数作为脚本参数接收，例如 Bash 中的 `$1` 和 `$@`。

请将 mise 自身的标志放在任务名称之前，例如 `mise run --silent build`。任务名称之后的所有内容都属于
任务。未定义 usage 规范的任务会将 `--silent` 当作参数接收；定义了规范的任务则会报错
`unexpected word: --silent`，除非规范声明了此标志。任务可以定义与 mise 标志同名的标志，例如 `--env`。

## 控制任务运行

以下 [`mise run`](/cli/run.html) 标志会改变任务运行方式：

| 标志                          | 作用                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-j`, `--jobs <N>`            | Run up to N tasks at once. Defaults to the [`jobs`](/configuration/settings.html#jobs) setting (`MISE_JOBS`).                                                                                                       |
| `-f`, `--force`               | Run tasks even when their [outputs are up to date](#skip-tasks-that-are-up-to-date).                                                                                                                                |
| `-n`, `--dry-run`             | Print each task's command in execution order without running anything.                                                                                                                                              |
| `-c`, `--continue-on-error`   | Keep running after a task fails. See [When a task fails](#when-a-task-fails).                                                                                                                                       |
| `--skip-deps`                 | Run only the named tasks, without their dependencies.                                                                                                                                                               |
| `--timeout <DURATION>`        | Stop the whole run after a duration such as `30s` or `5m`. Overrides the [`task.timeout`](/configuration/settings.html#task.timeout) setting.                                                                       |
| `-C`, `--cd <DIR>`            | Run as if mise started in another directory.                                                                                                                                                                        |
| `-t`, `--tool <TOOL@VERSION>` | Add a tool to the run, such as `--tool node@24`.                                                                                                                                                                    |
| `--skip-tools`                | Do not install missing tools before the tasks start.                                                                                                                                                                |
| `-r`, `--raw`                 | Connect stdin, stdout, and stderr directly to each task and run one task at a time. Redaction does not apply, except to tasks that receive [secrets](/tasks/task-configuration.html#secrets), which ignore `--raw`. |

A task's own [`timeout`](/tasks/task-configuration.html#timeout) still limits
its commands when you pass `--timeout`.

### When a task fails

By default, a failing task stops the run. mise stops the tasks that are still
running (with SIGTERM on Unix) and starts no new tasks, except the
[`depends_post`](/tasks/architecture.html#depends-post) tasks of tasks that
already started. The run exits with the failed task's status.

With `--continue-on-error`, running tasks finish and the remaining tasks still
start, including tasks that depend on the failed one. At the end, mise lists the
failed tasks and exits with a non-zero status.

## Output

When tasks run in parallel, mise labels each output line with the task name
(`prefix`). When only one task can run at a time (a single task, a chain of
dependencies, or `--jobs 1`), it prints output directly (`interleave`). Choose a
style with `--output`, `MISE_TASK_OUTPUT`, the
[`task.output`](/configuration/settings.html#task.output) setting, or a task's
[`output`](/tasks/task-configuration.html#output) property:

| Style        | Output                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `prefix`     | Each line, labelled with the task name.                                                                                                   |
| `interleave` | Output as it arrives, without labels.                                                                                                     |
| `keep-order` | Labelled lines; one task streams live while the others are buffered and printed in order.                                                 |
| `replacing`  | Each new stdout line replaces the previous one; stderr is printed as is.                                                                  |
| `summary`    | 任务运行时不输出内容；结束后若成功则显示 `[test] passed in 2.1s`，若失败则显示其全部带标签的输出。                   |
| `timed`      | Labelled stdout lines that stay the task's latest line for at least a second; lines replaced sooner are dropped. Stderr is printed as is. |
| `silent`     | Nothing from tasks or mise except errors.                                                                                                 |

Verbosity is separate from style. `--quiet` hides mise's own messages, such as
`[build] $ cargo build`, and `--silent` also hides the tasks' output. For
example, `mise run --output prefix --quiet test` keeps the labels and hides
mise's messages. To make every task quiet without changing other mise commands,
set [`task.quiet`](/configuration/settings.html#task.quiet) under `[settings]`.
A task can also set its own `quiet` or `silent` property. The `quiet` output
style is deprecated; use `--output interleave --quiet` instead.

### 仅显示失败内容 {#summary-output}

`summary` 会暂存每个任务的输出，直到任务结束。测试套件通过时，每个任务只输出一行，而不是显示每项测试的输出；失败时则会显示失败任务的全部输出。此模式适合 CI 日志和会读取命令所有输出行的编程代理；可在代理环境中设置 `MISE_TASK_OUTPUT=summary`。

```console
$ mise run --output summary test
[test:lint] $ cargo clippy -- -D warnings
[test:lint] error: unused variable: `x`
[test:lint]  --> src/main.rs:12:9
[test:unit] passed in 4.2s
[test:lint] ERROR task failed
```

mise 因其他任务失败而停止的任务会显示 `[name] cancelled`，试运行则会显示将要执行的命令。mise 会保留每个任务最后 64 KiB 的输出；运行被中断或达到 `--timeout` 时，会打印仍在运行任务的已保留输出。`raw` 和 `interactive` 任务仍会直接使用终端。

持续运行的任务（例如开发服务器或文件监视器）在 `summary` 模式下不会输出内容，直到任务退出或运行被中断。若要实时查看输出，请为其设置 `output = "interleave"`。

## Interactive input

Unless a task is `interactive` or `raw`, stdin is connected only with
`interleave` output: the default for a single task, a sequential chain, or
`--jobs 1`, or when you pass `--output interleave`. With other output styles,
including `prefix`, the default when tasks run in parallel, stdin is not
connected. It is also not connected when output must be redacted: when the task
receives [secrets](/tasks/task-configuration.html#secrets), or when the config
marks a value for [redaction](/environments/secrets/#redaction) with
`redact = true` or `redactions`.

Set `interactive = true` on a task that needs the terminal, such as one that
prompts. It has exclusive terminal access while it runs. `raw = true` takes
exclusive access for each command instead. Both bypass output redaction and the
artifact cache. See [`interactive`](/tasks/task-configuration.html#interactive)
and [`raw`](/tasks/task-configuration.html#raw).

## Skip tasks that are up to date

Give a task `sources` and `outputs`, and mise skips it while its outputs are up
to date:

```mise-toml [mise.toml]
[tasks.build]
description = "Build the CLI"
run = "cargo build"
sources = ["Cargo.toml", "src/**/*.rs"]
outputs = ["target/debug/mycli"]
```

只要输出比源文件新，且自上次成功运行后没有任何更改，mise 就会打印 `[build] sources up-to-date, skipping`，
而不会运行任务。[任务过期判定条件](/tasks/caching.html#what-makes-a-task-stale)列出了具体检查项。若仍要运行，
请使用 `mise run --force build`。[任务缓存](/tasks/caching.html)还介绍了可恢复已删除输出的制品缓存。

## 文件更改时重新运行任务

[`mise watch`](/cli/watch.html) 会运行任务，并在其源文件更改时重新运行：

```sh
mise watch build
```

mise 会监视任务及其依赖项的 `sources`。未指定 `sources` 的任务会监视当前目录。对于会持续运行的进程
（如开发服务器），可在每次更改时重启：

```sh
mise watch --restart dev
```

需要阻塞等待文件更改的脚本或编程代理可以使用 `--once`，无需自行循环休眠和轮询。mise 启动时不会运行任务，而是等待任务的某个 source 发生变化，再运行一次任务并以任务的退出状态结束：

```sh
mise watch test --once && echo "tests pass after the change"
```

`--once` 会隐含 `--postpone`。如果 watchexec 在任何文件更改前停止，mise 会以 1 退出。若要继续监视，但在第一次运行失败时停止，请在不带 `--once` 的情况下传入 `--exit-on-error`。

Separate several tasks with `:::`, as with `mise run`. Without a task name,
`mise watch` runs the `default` task. `mise watch` uses
[watchexec](https://github.com/watchexec/watchexec); install it with
`mise use watchexec` or put it on `PATH` yourself.

`mise watch` 会将 `--debounce`、`--clear` 和 `--shell` 等 watchexec 标志继续传给 watchexec。
watchexec 的 `--env` 和 `--quiet` 在此命令中写作 `--watchexec-env` 和 `--watchexec-quiet`，因为
`-E` 和 `-q` 保留为 mise 自身的 `--env` 和 `--quiet`：

```sh
mise watch -E dev --watchexec-env LOG_LEVEL=debug build
```

## Task environment {#task-environment}

任务会使用项目的[环境变量](/environments/)和工具，并额外获得以下变量：

| 变量                          | 值                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MISE_ORIGINAL_CWD`         | The directory where you ran mise.                                                                                                                                                                      |
| `MISE_CONFIG_ROOT`          | The [config root](/configuration.html#config-root) of the file that defines the task, such as `~/proj` for both `~/proj/mise.toml` and `~/proj/.config/mise.toml`.                                     |
| `MISE_PROJECT_ROOT`         | The root of the project that defines the task, whichever directory you run it from. In a monorepo, the subproject's directory. For a global or remote task, the project you run it in.                 |
| `MISE_MONOREPO_ROOT`        | The directory whose config sets `monorepo_root = true`. Set only in a [monorepo](/tasks/monorepo.html).                                                                                                |
| `MISE_TASK_NAME`            | The task's name as `mise tasks ls` shows it. A file task's name has no script extension unless another task already has the shorter name; see [file task names](/tasks/file-tasks.html#task-grouping). |
| `MISE_TASK_FILE`            | The task's script: the file task itself, or the file named by a TOML task's `file`. For a TOML task with an inline `run`, the config file that defines it.                                             |
| `MISE_TASK_DIR`             | The directory that contains `MISE_TASK_FILE`.                                                                                                                                                          |
| `MISE_TASK_COLOR`           | The ANSI sequence for the task's label color. Empty when colors are off, the task is quiet, or the output style shows no label (`interleave`, `silent`).                                               |
| `MISE_TASK_LOCKS`           | 任务持有的[锁](/tasks/task-configuration.html#lock)，以逗号分隔；也包括从父任务继承的锁。仅在任务持有或继承锁时设置。                       |
| `MISE_ENV`                  | The active [config environments](/configuration/environments.html), comma-separated, when any are set.                                                                                                 |
| `TRACEPARENT`, `TRACESTATE` | The task's trace context, when [OpenTelemetry](/tasks/opentelemetry.html#trace-propagation) export is on.                                                                                              |
| `usage_*`                   | The values of the task's [arguments and flags](/tasks/task-arguments.html).                                                                                                                            |

For a TOML task in `~/proj/.config/mise.toml`, `MISE_TASK_DIR` is
`~/proj/.config`, while `MISE_CONFIG_ROOT` is `~/proj`. When you print with
`MISE_TASK_COLOR`, reset the color after your text:

```sh
printf '%smessage\033[0m\n' "$MISE_TASK_COLOR"
```
