---
description: "查找并运行项目任务、传递参数以及控制执行"
---

# 运行任务

## 查找并运行任务

使用 `mise tasks` 列出可用任务。要包含使用 `hide=true` 隐藏的任务，请传递
`--hidden`。

### `mise run` 简写形式 {#mise-run-shorthand}

使用 `mise tasks run <task>`、`mise run <task>`、`mise r <task>` 或
`mise <task>` 运行命名任务。在脚本和文档中使用 `mise run <task>`。未来的
mise 命令可能会遮蔽直接形式。

对于交互式使用，可以使用类似 `alias mr='mise run'` 的别名来减少输入。

## 传递参数和选择任务

在任务名称后传递参数：

```bash
mise run build --release
```

如需精确且经过验证的任务接口，请使用
[`usage` 字段](/tasks/task-arguments#usage-field)定义参数和标志。如果没有
`usage` 规范，mise 会根据任务的形式转发额外参数：

- 如果 `run` 是数组，参数只会传递给其最后一个条目
- 对于常规内联命令，参数会作为字面参数追加（使用 shell 时会进行 shell 引号处理）
- [shebang 任务](/tasks/toml-tasks#shell-shebang)作为脚本文件运行，因此其解释器会像通常一样提供参数——例如，在 Bash 中使用 `$1` 和 `$@`

将 mise 标志放在任务名称之前：`mise run --silent build`。任务名称后的标志属于任务，因此 `mise run build --silent` 会因
`unexpected word: --silent` 而失败，除非任务定义了该标志。任务可以定义与 mise 标志同名的标志，例如 `--env`。

::: tip
任务参数和标志提供验证、解析、自动补全和文档。

- [文件任务中的参数](/tasks/file-tasks#arguments)
- [TOML 任务中的参数](/tasks/toml-tasks#arguments)

当 mise 的 shell 补全已安装并启用时，自动补全即可使用。
使用 [`mise generate task-docs`](/cli/generate/task-docs) 生成 Markdown 文档。
:::

### 运行多个任务

使用 `:::` 分隔任务及其参数：

```bash
mise run build arg1 arg2 ::: test arg3 arg4
```

### 运行默认任务

未指定任务时，如果定义了 `default` 任务，mise 会运行该任务。
否则，会打开交互式终端中的任务选择器。你也可以将其他任务别名为
`default`：

```bash
mise run
```

## 控制执行

### 并行度和输出

默认情况下，任务最多并行运行四个作业。设置 `--jobs`、`jobs` 设置项或
`MISE_JOBS` 来选择其他限制。输出通常会逐行打印，并带有任务标签，从而使
并行输出更易读。使用 `--jobs 1` 时，mise 会使用 `interleave` 输出。

要直接打印 stdout 和 stderr，请使用 `--output interleave`、`task.output`
设置项或 `MISE_TASK_OUTPUT=interleave`。

输出 _样式_（`prefix`、`interleave`、`keep-order` 等）与
_详细程度_（`--quiet`／`--silent`、`quiet`／`silent` 设置项或每个任务的
`quiet`／`silent` 字段）是分开的。例如，`MISE_TASK_OUTPUT=prefix` 配合
`--quiet` 会保留任务名称前缀并隐藏 mise 的消息。使用
`--output interleave --quiet` 可获得无前缀的安静输出。要让每个任务都保持安静，
而不改变其他 mise 命令，请在 `[settings]` 下设置
`task.output = "interleave"` 和 `task.quiet = true`。

::: warning 已弃用
`quiet` 输出值已弃用。mise `2026.9.3` 开始发出警告，并将在
`2027.9.3` 中移除支持。请将 `interleave` 与任务范围或命令行的 quiet 选项结合使用
:::

### 交互式输入

默认情况下不会连接 stdin。对于需要终端的任务，请设置 `interactive = true`；
在任务持续期间，该任务会独占终端。`raw = true` 则改为让每个命令独占终端。
两者都会绕过输出脱敏和构建产物缓存。请参阅[终端 I/O 选项](./task-configuration.html#interactive)。

### Shell 执行

在 Unix 上，mise 可以直接执行诸如 `node build.js` 这样的简单内联命令，而无需启动默认的 `sh`。
Shell 语法、引号、展开、内置命令、含糊的可执行文件查找，以及包含 `ENV` 或 `BASH_ENV`
的环境仍会使用 shell。沙盒化和经过审计的任务也会保留其 shell。
Windows 的执行方式不变。

:::warning 自定义 shell 包装器
显式任务 `shell`、`mise run --shell` 或 `unix_default_inline_shell_args`
设置始终会强制使用 shell 执行，即使它指定的是默认 shell。
名为 `sh` 且位于 `PATH` 中的包装器可能会被绕过；如果必须运行它，请显式配置。
:::

相同的优化也适用于 mise 管理的内联钩子、模板、依赖项命令、安装命令、凭据和任务缓存输入。

## 任务分组

可以使用由 `:` 分隔的名称前缀对任务进行语义分组。
例如，所有与测试相关的任务都可以以 `test:` 开头。嵌套组可以进一步细化分组并简化模式匹配。
例如，`mise run test:**:local` 会匹配 `test:units:local`、
`test:integration:local` 和 `test:e2e:happy:local`
（更多信息请参阅[通配符](#wildcards)）。

::: tip
由于 TOML 键在不加引号的情况下不能包含冒号，因此在 `mise.toml` 中使用带引号的键：

```toml
[tasks."test:unit"]
run = 'cargo test --lib'
```

:::

## 通配符

运行任务或指定任务依赖项时支持 Glob 风格的通配符。

可用的通配符模式：

- `?` 匹配任意单个字符
- `*` 匹配单个以 `:` 分隔的组中的 0 个或多个字符
- `**` 匹配 0 个或多个完整的以 `:` 分隔的组
- `{glob1,glob2,...}` 匹配逗号分隔的 glob 模式中的任意一个
- `[ab,...]` 匹配指定字符或范围 `[a-z]` 中的任意字符
- `[!ab,...]` 匹配不在字符集中的任意字符

### 示例

`mise run 'generate:{completions,docs:*}'`

对于分组任务，当只有一个组可能发生变化时使用 `*`，当匹配可能跨越多个组时使用 `**`：

```bash
# 匹配 test:units:local，但不匹配 test:e2e:happy:local
mise run 'test:*:local'

# 同时匹配 test:units:local 和 test:e2e:happy:local
mise run 'test:**:local'
```

如果某个模式依赖于旧版本 mise 中 `*` 匹配嵌套任务组的行为，请将其替换为 `**` 以保留递归行为。

对于依赖项也是如此：

```toml
[tasks."lint:eslint"] # 使用 ":" 时，我们需要加上引号
run = "eslint ."
[tasks."lint:prettier"]
run = "prettier --check ."
[tasks.lint]
depends = ["lint:*"]
wait_for = ["render"] # 不会添加为依赖项，但如果它已经在运行，则等待它完成
```

## 在文件变更时运行

通常，只有任务所使用的文件发生变化时才执行任务会很方便。例如，你可能只希望在 `.rs` 文件发生变化时运行
`cargo build`。可以使用以下配置实现：

```toml
[tasks.build]
description = '构建 CLI'
run = "cargo build"
sources = ['Cargo.toml', 'src/**/*.rs'] # 如果这些文件没有变化则跳过运行
outputs = ['target/debug/mycli']
```

现在，如果 `target/debug/mycli` 存在且比 `Cargo.toml` 以及每个匹配的 `.rs` 文件更新，则会跳过该任务。这使用最后修改时间戳。
任务定义本身也是一个输入。缺失已声明的输出会导致任务再次运行。有关可以恢复已删除输出的基于内容的复用，请参阅
[任务缓存](./caching.html)。

## 监视文件

使用 [`mise watch`](/cli/watch.html) 在源文件发生变化时运行任务：

```bash
mise watch build
```

`mise watch` 使用 `watchexec`。使用 `mise use watchexec` 将其添加到项目中，
或单独将其安装到 `PATH` 中。声明任务的 `sources` 以限制监视的文件。
不指定任务名称时，mise 会监视 `default` 任务。

## 执行顺序

你可以使用 [depends](/tasks/task-configuration.html#depends)、[wait_for](/tasks/task-configuration.html#wait-for) 和 [depends_post](/tasks/task-configuration.html#depends-post) 来控制执行顺序。

使用 `mise tasks deps [tasks]...` 列出已声明的图。它包含
`depends`、`wait_for` 和 `depends_post`。`run` 数组中的任务引用
（`{ task = "..." }`／`{ tasks = [...] }`）是执行步骤，因此不会出现在图中。

```toml
[tasks.build]
run = "echo 'build'"

[tasks.test]
run = "echo 'test'"
depends = ["build"]
```

这可以确保 `build` 任务在 `test` 任务之前运行。

你也可以定义一个 mise 任务，以并行或串行方式运行其他任务：

```toml
[tasks.example1]
run = "echo 'example1'"

[tasks.example2]
run = "echo 'example2'"

[tasks.example3]
run = "echo 'example3'"

[tasks.one_by_one]
run = [
    { task = "example1" }, # 将等待 example1 完成后再运行下一步
    { tasks = ["example2", "example3"] }, # 这两个任务并行运行
]
```

`mise run one_by_one` 会运行该流水线，但 `mise tasks deps one_by_one` 仍会将其显示为叶节点。这些
`{ task }`／`{ tasks }` 条目是此任务自身的 `run` 步骤，而不是图边。嵌套任务仍会运行，包括它们自己的
`depends`。如果将它们重写为 `depends = ["example1", "example2", "example3"]`，就会把它们放入图中，但也会丢失上述串行／并行顺序：
`depends` 只要求这些任务先完成，而不规定它们之间的顺序。
