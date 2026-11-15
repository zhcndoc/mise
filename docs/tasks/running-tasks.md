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

若要从菜单中选择任务，而不是逐个输入，请使用 `--multi`。任务选择器会以清单形式显示任务：按 Space 选中任务，按 `/` 筛选，再按 Enter 运行所选任务，效果等同于使用 `:::` 指定这些任务。此功能需要交互式终端。

```sh
mise run --multi
```

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

## 按标签选择任务

为任务设置 [`tags`](/tasks/task-configuration.html#tags)，说明每项任务的类别：

```mise-toml [mise.toml]
[tasks.clippy]
tags = "lint"
run = "cargo clippy"

[tasks.shellcheck]
tags = "lint"
run = "shellcheck scripts/*.sh"

[tasks."test:e2e"]
tags = ["test", "slow"]
run = "./e2e/run"
```

`--tag` 会运行带有该标签的任务，无论任务名称是什么：

```sh
mise run --tag lint                # clippy and shellcheck
mise run --tag lint --tag test     # every task tagged lint or test
mise run --tag slow 'test:*'      # test:e2e, the only test:* task tagged slow
mise tasks ls --tag lint           # list them instead
```

未指定任务名称时，`--tag` 会从所有任务中筛选，效果等同于任务名称为 `**`。指定名称或模式时，只会保留匹配且带有该标签的任务；如果没有匹配项则会失败。依赖项仍会运行，无论它们是否带有所选标签。请将 `--tag` 放在任务名称之前；放在名称之后时，该选项会传给任务。在单体仓库中，可添加模式以选择其他项目，例如 `mise run --tag lint '//...:**'`。

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
| `--report-file <PATH>`        | 运行结束时将每项任务的结果写入 JSON 报告；见[运行报告](#run-report)。                                                                                                                                                |
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

### 运行报告

无论任务运行成功、失败、因 Ctrl-C 中断还是因 `--timeout` 停止，`mise run --report-file <PATH>` 都会在运行结束时写入 JSON 报告。CI 面板和代理工具可以读取运行了哪些任务以及运行结果，而无需解析终端输出。设置 `MISE_TASK_REPORT_FILE` 也有相同效果，无需更改命令行。运行启动的任务不会继承 `MISE_TASK_REPORT_FILE`，因此任务内部运行的 `mise run` 不会覆盖报告。即使尚无任务启动（例如正在安装工具时按下 Ctrl-C），也会写入 `cancelled` 报告。此选项和环境变量都不能与 `--dry-run` 同时使用。

```json
{
  "version": 1,
  "status": "failed",
  "started_at": "2026-11-04T12:00:00.000Z",
  "ended_at": "2026-11-04T12:00:01.500Z",
  "duration_ms": 1500,
  "tasks": [
    {
      "name": "lint",
      "args": [],
      "status": "skipped",
      "exit_code": null,
      "duration_ms": 2,
      "started_at": "2026-11-04T12:00:00.100Z",
      "ended_at": "2026-11-04T12:00:00.102Z"
    },
    {
      "name": "test",
      "args": ["--quick"],
      "status": "failed",
      "exit_code": 3,
      "duration_ms": 1300,
      "started_at": "2026-11-04T12:00:00.110Z",
      "ended_at": "2026-11-04T12:00:01.410Z"
    },
    {
      "name": "deploy",
      "args": [],
      "status": "not_run",
      "exit_code": null,
      "duration_ms": null,
      "started_at": null,
      "ended_at": null
    }
  ]
}
```

`tasks` 会按启动顺序列出运行计划中的所有任务，包括依赖项，随后列出尚未启动的任务。任务的 `status` 为以下值之一：

| 状态          | 含义                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `passed`     | 已运行并以状态码 0 退出。                                                                                  |
| `failed`     | 已运行但未成功，或启动失败。`exit_code` 为其退出状态；没有退出状态时为 `null`。                               |
| `cancelled`  | mise 停止了任务：因为 Ctrl-C、`--timeout` 或其他任务失败。                                                 |
| `skipped`    | 无需运行：其[输出已是最新](#skip-tasks-that-are-up-to-date)，或满足了 `skip_if` 条件。                      |
| `cached`     | 结果已从[制品缓存](/tasks/caching.html)恢复。                                                              |
| `not_run`    | 运行在任务启动前结束。                                                                                     |

顶层的 `status` 为 `passed`、`failed`、`cancelled` 或 `timed_out`。参数会像终端输出一样脱敏，包括设置了 `redact = true` 的环境变量值和 URL 中的凭据。只有字段含义发生变化时才会提升 `version`；新增字段不需要更改该值。

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

### 查看最近一次运行的输出

启用 [`task.logs`](/configuration/settings.html#task.logs) 后，mise 会保存各任务最近一次运行的标准输出和标准错误合并内容。这样即使输出被 `replacing`、`timed`、`silent` 或 `summary` 隐藏，也无需重新运行任务即可查看。任务日志默认关闭；可在 `mise.toml` 中启用：

```toml
[settings]
task.logs = true
```

也可以通过 `export MISE_TASK_LOGS=1` 为当前 shell 启用，然后运行：

```sh
mise run --output replacing test
mise tasks log test          # print the output of the last run
mise tasks log test --path   # print where the log is kept
```

每次运行都会替换该任务之前的日志，每个日志仅保留末尾 4 MiB。日志位于 mise 状态目录（`~/.local/state/mise/task-logs`）下，每个项目中的每项任务各有一个文件，只有当前用户可读取。全局任务会在其运行过的每个项目中分别保存日志；在任何项目之外运行时则共用一个日志。mise 在终端中脱敏的值也会在日志中脱敏。如果命令尚未启动就结束（例如任务先被取消，或程序不存在、不可执行），则会保留之前的日志。

如果任务在 `replacing` 或 `timed` 模式下失败，或在 `summary` 模式下输出超过其保留的 64 KiB，mise 会在错误信息后显示日志路径。

mise 只会记录它读取的输出。`raw` 或 `interactive` 任务会直接使用终端；当没有内容需要脱敏，且制品缓存与 OpenTelemetry 日志导出都没有读取输出时，`interleave` 任务也会直接使用终端。这些任务不会留下日志，并会移除之前运行留下的日志。

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

## 运行受变更影响的任务 {#affected-tasks}

`mise run --affected` 只会运行匹配的任务，且任务的 `sources` 中至少包含一个 Git 变更文件：

```mise-toml [mise.toml]
[tasks."test:unit"]
sources = ["src/**"]
run = "cargo test"

[tasks."test:docs"]
sources = ["docs/**"]
run = "vale docs"
```

```sh
# After a commit that touches src/lib.rs, runs test:unit but not test:docs
mise run --affected 'test:*'

# Show why each task was or was not selected, without running anything
mise run --affected --affected-explain --dry-run 'test:*'
```

如果任务的配置文件或 `file` 指定的脚本发生变更，任务也会被视为受影响。任务目录及其 `sources` 前置目录中的符号链接会跟随解析，因为 Git 会以各文件自身的路径报告变更。字面列出的 source 若是符号链接，也会匹配其目标；但匹配到链接的 glob 只会匹配链接名称。要捕获目标内容的变化，请列出目标路径或直接列出该链接。发生变更的子模块会被视为一组位于子模块路径下的变更文件，因此 `sources` 会像匹配普通目录一样匹配子模块内部内容。mise 只能检查已初始化的子模块：未检出的子模块在 Git 中只会显示其路径，因此请将该路径本身（例如 `sub`）加入 `sources`，以捕获子模块变更。mise 会比较父仓库在 merge base 和 head 所记录的子模块提交；只有子模块已检出到该 head 时，才会将其工作区变更加入比较；即使子模块记录的提交未改变，其中未跟踪的文件也会计入。从子模块内部运行时，`--affected` 会比较该子模块自身的历史记录。嵌套在项目中的独立检出目录（例如被忽略的克隆）会根据自身变更计算。

没有 `sources` 的任务可能读取任何文件，因此只要发生任何变更，mise 就会运行该任务。没有变更时，`--affected` 不会运行任何任务。所选任务的依赖项仍会运行，且所有任务仍会执行常规的[最新状态检查](#skip-tasks-that-are-up-to-date)；添加 `--force` 可强制运行。

mise 会像单体仓库中一样计算变更：比较 `--affected-base`（默认为 `HEAD~1`）与 `--affected-head`（默认为 `HEAD`）之间的提交，并在 head 已检出的情况下纳入未提交和未跟踪文件。`--affected-committed`、`--affected-uncommitted` 和 `--affected-untracked` 可缩小比较范围；`--affected-json` 会输出所选任务及原因（`changed-source`、`task-config`、`task-file`、`no-sources`，或适用于使用 <span v-pre>`{{ usage.* }}`</span> 的 source 的 `argument-sources`）。CI 中修订版的选择方式详见[运行受影响任务](/tasks/workspace-graph.html#affected-tasks)。

在单体仓库根目录（`monorepo_root = true`）下，`--affected` 会改为选择[项目](/tasks/workspace-graph.html#affected-tasks)，并在每个受影响项目中运行匹配的任务。

## 查看任务耗时

mise 会记录此项目中每次任务运行的参数、开始时间、耗时，以及任务是成功、失败、从制品缓存恢复、跳过还是取消。[`mise tasks history`](/cli/tasks/history.html) 会按时间顺序列出运行记录；`--summary` 会为每项任务显示一行：

```sh
$ mise tasks history --summary
Task   Runs  Failed  Median  Last    Last status
build  12    1       41.20s  38.91s  ok
lint   8     0       6.05s   5.87s   ok
test   10    2       62.04s  58.30s  failed
```

中位数只统计已执行且成功的运行记录。它代表任务的典型成本，便于用户或代理在决定运行哪些检查前，了解各项检查是否耗时。`--json` 会为脚本输出相同数据：

```sh
mise tasks history --summary --json | jq -r '.[] | "\(.task) \(.median_ms)"'
```

相同摘要也会出现在 [`mise tasks info <task> --json`](/cli/tasks/info.html) 的 `history` 字段，以及 [`mise tasks ls --json`](/cli/tasks/ls.html) 所列每项任务的数据中。这样，已在读取任务定义的工具无需再运行一条命令，就能获知任务耗时。任务尚未运行时，该字段为 `null`：

```sh
mise tasks info test --json | jq '.history | {median_ms, last_status}'
```

耗时指任务从就绪到结束的墙上时间，包括解析环境和等待 [`lock`](/tasks/task-configuration.html#lock) 的时间，但不包括依赖项；依赖项会作为独立运行记录。没有实际运行内容的任务（例如只列出 `depends` 的任务）不会被记录。

运行记录按项目保存（单体仓库中使用仓库根目录），路径为 `$MISE_STATE_DIR/task-history/`。每项任务最多保留 [`task.history_limit`](/configuration/settings.html#task.history_limit) 条记录（默认为 20 条）。将 [`task.history`](/configuration/settings.html#task.history) 设为 `false` 可停止记录。记录过程不会导致任务运行失败，`mise run --dry-run` 也不会写入记录。

参数会像终端输出一样脱敏，并移除 URL 凭据。如果任务在解析其环境前就结束，例如因 source 未过期而跳过，日志会不包含参数，因为 mise 尚不知道该环境会登记哪些密钥。

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

## 在其他修订版运行任务

`--at REV` 会在另一个 Git 提交中的状态下运行任务，不会更改当前检出目录。你可以用它回答“在 `main` 上运行这个测试也会失败吗？”之类的问题：

```sh
mise run --at main test
mise run --at HEAD~1 bench > before.txt
```

mise 会在临时目录中将 REV 检出为分离的 [`git worktree`](https://git-scm.com/docs/git-worktree)，使用该修订版自身的配置、任务和工具运行任务，之后删除此 worktree。即使任务失败、因 `--timeout` 超时或你按下 Ctrl-C，也会清理 worktree。命令以任务的退出状态结束。当前检出目录中的未提交更改不会参与运行：REV 必须是一个提交。

- 任务会在仓库根目录下与当前 mise 工作目录相同的相对目录中运行。worktree 目录使用当前检出目录的名称。
- 子模块会初始化到 REV，并使用现有克隆作为参考，因此只会获取缺少的对象。Git 钩子不会运行，包括当前检出目录中的钩子和 REV 仓库中的钩子。
- 忽略的文件不会出现在新 worktree 中，例如 `target/`、`node_modules/` 或 `.env`。传入 `--at-setup CMD` 可进行准备。该命令会在任务启动前，以普通 shell 命令形式在 worktree 中与 mise 工作目录相对应的位置运行（不是任务的 `dir`），不会使用 mise 环境。`MISE_RUN_AT_SOURCE` 会设为当前检出目录，`MISE_RUN_AT_REV` 会设为该提交；任务运行时也会获得这两个变量：

  ```sh
  mise run --at main --at-setup 'cp -R "$MISE_RUN_AT_SOURCE/node_modules" .' test
  ```

  使用 `--dry-run` 时，mise 会打印准备命令而不执行。`--timeout` 只限制任务，不限制准备命令。

- 如果在一次 `--at` 运行中（即设置了 `MISE_RUN_AT_REV` 时）再次运行 `mise run --at`，命令会被拒绝。

- 配置会从 worktree 中查找，因此当前检出目录上层（全局配置除外）的 `mise.toml` 不会生效。

- 任务所需的[守护进程](/daemons.html)会像普通 `mise run` 一样在运行结束后继续运行，但其项目目录会随 worktree 一起删除。`mise daemons prune` 会停止这些守护进程并删除其状态。

REV 中的配置属于同一项目的另一个提交，因此它与仓库主检出目录共享[信任状态](/cli/trust.html)，和其他链接 worktree 一样。如果主检出目录未受信任，`--at` 会在任何内容启动前拒绝运行。mise 不会单独信任 REV 中的配置：不会通过提示、`--yes` 或 `mise run` 对当前运行目录配置采用的方式来信任。在[安全模式](/paranoid.html)中，信任与文件路径和内容绑定；由于每次运行都会创建新路径，REV 中的配置始终不受信任。

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
