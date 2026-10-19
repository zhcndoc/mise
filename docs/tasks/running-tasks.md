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
| `-j`、`--jobs <N>`             | 同时运行最多 N 个任务。默认值来自 [`jobs`](/configuration/settings.html#jobs) 设置（`MISE_JOBS`）。                                                                                                                  |
| `-f`、`--force`               | 即使[输出已是最新状态](#skip-tasks-that-are-up-to-date)，仍运行任务。                                                                                                                                                |
| `-n`、`--dry-run`             | 按执行顺序打印每个任务的命令，但不实际运行。                                                                                                                                                                         |
| `-c`、`--continue-on-error`   | 任务失败后仍继续运行。参阅[任务失败时](#when-a-task-fails)。                                                                                                                                                          |
| `--skip-deps`                 | 仅运行指定任务，不运行其依赖项。                                                                                                                                                                                    |
| `--timeout <DURATION>`        | 在指定时长后（例如 `30s` 或 `5m`）停止整个运行过程。覆盖 [`task.timeout`](/configuration/settings.html#task.timeout) 设置。                                                                                        |
| `-C`、`--cd <DIR>`            | 将指定目录视为 mise 启动时所在的目录。                                                                                                                                                                               |
| `-t`、`--tool <TOOL@VERSION>` | 为本次运行添加工具，例如 `--tool node@24`。                                                                                                                                                                          |
| `--skip-tools`                | 任务开始前不安装缺失的工具。                                                                                                                                                                                        |
| `-r`、`--raw`                 | 将 stdin、stdout 和 stderr 直接连接到各任务，并一次运行一个任务。不进行敏感信息隐藏；接收[机密信息](/tasks/task-configuration.html#secrets)的任务除外，这些任务会忽略 `--raw`。 |

传入 `--timeout` 时，任务自身的 [`timeout`](/tasks/task-configuration.html#timeout) 仍会限制其命令。

### 任务失败时

默认情况下，任务失败会终止本次运行。mise 会停止仍在运行的任务（在 Unix 上发送 SIGTERM），并且不再
启动新任务；已经开始的任务所对应的 [`depends_post`](/tasks/architecture.html#depends-post) 任务除外。
进程会以失败任务的状态码退出。

使用 `--continue-on-error` 后，正在运行的任务会完成，其余任务也会继续启动，包括依赖失败任务的任务。
最后，mise 会列出失败任务并以非零状态码退出。

## 输出

任务并行运行时，mise 会在每行输出前标注任务名称（`prefix`）。当一次只能运行一个任务时（只有一个任务、
依赖链，或使用 `--jobs 1`），mise 会直接输出内容（`interleave`）。可通过 `--output`、`MISE_TASK_OUTPUT`、
[`task.output`](/configuration/settings.html#task.output) 设置或任务的 [`output`](/tasks/task-configuration.html#output) 属性选择样式：

| 样式         | 输出行为                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `prefix`     | 每行前面都标注任务名称。                                                                                                  |
| `interleave` | 按到达顺序直接输出，不添加标注。                                                                                          |
| `keep-order` | 为每行添加标注；一个任务实时输出，其他任务的输出则缓冲后按顺序打印。                                                      |
| `replacing`  | 每一行新的 stdout 会替换上一行；stderr 原样输出。                                                                         |
| `timed`      | 标注 stdout 行，并至少将其作为任务的最新输出显示一秒；更早被替换的行会丢弃。stderr 原样输出。                            |
| `silent`     | 除错误外，不显示任务或 mise 的任何输出。                                                                                  |

详细程度与样式是两个独立设置。`--quiet` 会隐藏 mise 自身的消息，例如 `[build] $ cargo build`；
`--silent` 还会隐藏任务输出。例如，`mise run --output prefix --quiet test` 会保留任务名称标注，
但隐藏 mise 的消息。若要让所有任务都保持安静，而不影响其他 mise 命令，请在 `[settings]` 下设置
[`task.quiet`](/configuration/settings.html#task.quiet)。任务也可以设置自己的 `quiet` 或 `silent` 属性。
`quiet` 输出样式已弃用，请改用 `--output interleave --quiet`。

## 交互式输入

除非任务设为 `interactive` 或 `raw`，否则只有在输出样式为 `interleave` 时才会连接 stdin。单个任务、
顺序执行的依赖链、`--jobs 1` 默认使用此样式，也可通过 `--output interleave` 显式指定。其他输出样式
不会连接 stdin；任务并行运行时默认使用的 `prefix` 也是如此。如果输出必须隐藏敏感信息，也不会连接
stdin：例如任务接收了[机密信息](/tasks/task-configuration.html#secrets)，或配置使用 `redact = true` 或
`redactions` 将值标记为[需隐藏内容](/environments/secrets/#redaction)。

需要终端的任务（例如会提示用户输入的任务）应设置 `interactive = true`。运行期间，该任务会独占终端。
设置 `raw = true` 则会让每条命令分别独占终端。这两种方式都会绕过输出敏感信息隐藏和制品缓存。
参阅 [`interactive`](/tasks/task-configuration.html#interactive) 和
[`raw`](/tasks/task-configuration.html#raw)。

## 跳过已是最新状态的任务

为任务指定 `sources` 和 `outputs` 后，只要输出仍为最新状态，mise 就会跳过该任务：

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

和 `mise run` 一样，可用 `:::` 分隔多个任务。不指定任务名称时，`mise watch` 会运行 `default` 任务。
`mise watch` 使用 [watchexec](https://github.com/watchexec/watchexec)；请通过 `mise use watchexec` 安装它，
或自行将其加入 `PATH`。

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
| `MISE_ORIGINAL_CWD`         | 运行 mise 时所在的目录。                                                                                                                                                                                |
| `MISE_CONFIG_ROOT`          | 定义任务的配置文件所对应的[配置根目录](/configuration.html#config-root)，例如 `~/proj/mise.toml` 和 `~/proj/.config/mise.toml` 的配置根目录都是 `~/proj`。                                         |
| `MISE_PROJECT_ROOT`         | 定义任务的项目根目录，与从哪个目录运行无关。单体仓库中为子项目目录。对于全局或远程任务，则为运行该任务的项目。                                                                                        |
| `MISE_MONOREPO_ROOT`        | 配置中设置了 `monorepo_root = true` 的目录。仅在[单体仓库](/tasks/monorepo.html)中设置。                                                                                                               |
| `MISE_TASK_NAME`            | `mise tasks ls` 显示的任务名称。文件任务名称通常不带脚本扩展名；若已有另一个任务使用较短名称，则除外。参阅[文件任务名称](/tasks/file-tasks.html#task-grouping)。                                  |
| `MISE_TASK_FILE`            | 任务脚本：文件任务本身，或 TOML 任务的 `file` 指定的文件。对于使用内联 `run` 的 TOML 任务，则为定义该任务的配置文件。                                                                                |
| `MISE_TASK_DIR`             | 包含 `MISE_TASK_FILE` 的目录。                                                                                                                                                                          |
| `MISE_TASK_COLOR`           | 任务名称标签的 ANSI 颜色序列。关闭颜色、任务处于安静模式，或输出样式不显示标签（`interleave`、`silent`）时为空。                                                                                      |
| `MISE_ENV`                  | 当前启用的[配置环境](/configuration/environments.html)，多个环境以逗号分隔；未设置时为空。                                                                                                             |
| `TRACEPARENT`、`TRACESTATE` | 启用 [OpenTelemetry](/tasks/opentelemetry.html#trace-propagation) 导出时，任务的追踪上下文。                                                                                                           |
| `usage_*`                   | 任务[参数和标志](/tasks/task-arguments.html)对应的值。                                                                                                                                                  |

对于 `~/proj/.config/mise.toml` 中的 TOML 任务，`MISE_TASK_DIR` 为 `~/proj/.config`，而
`MISE_CONFIG_ROOT` 为 `~/proj`。使用 `MISE_TASK_COLOR` 打印时，请在文本后重置颜色：

```sh
printf '%smessage\033[0m\n' "$MISE_TASK_COLOR"
```
