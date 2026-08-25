# 运行任务

使用 `mise tasks` 查看可用任务。要显示带有 `hide=true` 属性隐藏的任务，请使用选项 `--hidden`。

使用 `mise tasks deps [tasks]...` 列出任务声明的依赖项。该依赖关系图基于 [`depends`](/tasks/task-configuration.html#depends)、[`wait_for`](/tasks/task-configuration.html#wait-for) 和 [`depends_post`](/tasks/task-configuration.html#depends-post) 构建。`run` 数组中的任务引用（`{ task = "..." }` / `{ tasks = [...] }`）是执行步骤，因此不会显示在其中。

使用 `mise tasks run <task>`、`mise run <task>`、`mise r <task>`，或者直接使用 `mise <task>` 来运行任务——不过
最后这种方式你绝不要放进脚本或文档中，因为如果 mise 将来在某个版本中添加了同名命令，那么该任务就会被遮蔽，必须使用其他几种形式之一来运行。

大多数 mise 用户会为 `mise run` 设置一个别名，例如 `alias mr='mise run'`。

默认情况下，任务最多会并行执行 4 个作业。可使用 `--jobs` 选项、
`jobs` 设置或 `MISE_JOBS` 环境变量来自定义。输出通常会按行显示，并带有任务标签作为前缀。
通过逐行输出，我们可以避免并行执行时输出交错。不过，如果
--jobs == 1，输出将设置为 `interleave`。

要直接输出 stdout/stderr，请使用 `--output interleave`、`task.output` 设置或 `MISE_TASK_OUTPUT=interleave`。

输出的 _样式_（`prefix`、`interleave`、`keep-order` 等）独立于输出的 _详细程度_
（`--quiet`/`--silent`、`quiet`/`silent` 设置，或每个任务的 `quiet`/`silent` 字段）。
两者可以组合使用：例如，`MISE_TASK_OUTPUT=prefix` 配合 `--quiet` 会保留任务名称前缀，同时
抑制 mise 自身的消息。`--quiet` 不再强制使用无前缀输出——如果你想要旧版的无前缀行为，请使用
`--output quiet`（或 `-o interleave`）。

默认不会读取 stdin。要启用此功能，请在需要它的任务上设置 `raw = true`。这会阻止
它与任何其他任务并行运行——在这种情况下会使用 RWMutex 的写锁。这也会阻止对输出应用脱敏处理。

额外参数会传递给任务，例如，如果我们想以发布模式运行：

```bash
mise run build --release
```

如需一个精确且经过验证的任务接口，请使用
[`usage` 字段](/tasks/task-arguments#usage-field)定义参数和标志。如果没有 `usage` 规范，
额外参数将根据任务的执行方式进行传递：

- 如果 `run` 是数组，参数只会传递给数组中的最后一项。
- 对于常规的内联 shell 命令，参数会追加到命令文本末尾。
- [shebang 任务](/tasks/toml-tasks#shell-shebang)会作为脚本文件执行，因此其解释器会像通常一样
  提供这些参数——例如，在 Bash 中可以使用 `$1` 和 `$@`。

由于任务名称之后的所有内容都属于任务，mise 自身的标志必须放在任务名称
_之前_——应使用 `mise run --silent build`，而不是 `mise run build --silent`；后者会将
`--silent` 传递给任务，除非任务定义了该标志，否则会因 `unexpected word: --silent` 而失败。
这也意味着任务可以自由定义与 mise 标志同名的标志，例如，任务可以拥有自己的 `--env`。

:::tip
你可以为任务定义参数/标志，这将提供验证、解析、自动补全和文档。

- [文件任务中的参数](/tasks/file-tasks#arguments)
- [TOML 任务中的参数](/tasks/toml-tasks#arguments)

当安装并启用 mise 的 shell 自动补全功能后，任务会自动支持自动补全。

可以使用 [`mise generate task-docs`](/cli/generate/task-docs) 生成 Markdown 文档。
:::

多个任务/参数可以使用这个 `:::` 分隔符分开：

```bash
mise run build arg1 arg2 ::: test arg3 arg4
```

如果未指定任务，mise 将运行名为 "default" 的任务——前提是你已经创建了一个名为 "default" 的任务。你也可以将其他任务别名为 "default"。

```bash
mise run
```

## 任务分组

可以通过使用用 `:` 分隔的名称前缀，对任务进行语义分组。
例如，所有与测试相关的任务都可能以 `test:` 开头。也可以使用嵌套分组
来进一步细化分组并简化模式匹配。
例如，运行 `mise run test:**:local` 将匹配`test:units:local`，
`test:integration:local` 和 `test:e2e:happy:local`
（更多信息请参见 [通配符](#wildcards)）。

::: tip
由于 TOML 键在不加引号的情况下不能包含冒号，因此在 `mise.toml` 中使用带引号的键：

```toml
[tasks."test:unit"]
run = 'cargo test --lib'
```

:::

## 通配符

在运行任务或指定任务依赖项时，支持使用 Glob 风格的通配符。

可用的通配符模式：

- `?` 匹配任意单个字符
- `*` 匹配单个以 `:` 分隔的组中的 0 个或多个字符
- `**` 匹配 0 个或多个完整的以 `:` 分隔的组
- `{glob1,glob2,...}` 匹配逗号分隔的 glob 模式中的任意一个
- `[ab,...]` 匹配指定字符或范围 `[a-z]` 中的任意字符
- `[!ab,...]` 匹配不在字符集中的任意字符

### 示例

`mise run generate:{completions,docs:*}`

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

通常只在其所使用的文件发生变化时才执行某个任务会很方便。例如，我们可能只想在某个 “.rs” 文件发生变化时运行 `cargo build`。这可以通过以下配置实现：

```toml
[tasks.build]
description = '构建 CLI'
run = "cargo build"
sources = ['Cargo.toml', 'src/**/*.rs'] # 如果这些文件没有变化则跳过运行
outputs = ['target/debug/mycli']
```

现在，如果 `target/debug/mycli` 比 `Cargo.toml` 或任何 “.rs” 文件更新，那么该任务将被跳过。这使用的是最后修改时间戳。
添加校验和支持也不会太难。

## 监视文件

当源文件发生变化时运行任务，使用 [`mise watch`](/cli/watch.html)

```bash
mise watch build
```

目前，这只是调用 `watchexec`（你可以通过任意方式安装它，包括使用 mise：`mise use -g watchexec@latest`。
这在未来可能会改变。）

## `mise run` 简写

任务可以通过 `mise run <TASK>` 或 `mise <TASK>` 运行——前提是名称不会与 mise 命令冲突。
由于 mise 之后可能会添加一个同名冲突命令，因此建议在脚本和文档中使用 `mise run <TASK>`。

## 执行顺序

你可以使用 [depends](/tasks/task-configuration.html#depends)、[wait_for](/tasks/task-configuration.html#wait-for) 和 [depends_post](/tasks/task-configuration.html#depends-post) 来控制执行顺序。

```toml
[tasks.build]
run = "echo 'build'"

[tasks.test]
run = "echo 'test'"
depends = ["build"]
```

这将确保 `build` 任务在 `test` 任务之前运行。

你也可以定义一个 mise 任务，以并行或串行方式运行其他任务：

```toml
[tasks.example1]
run = "echo 'example1'"

[tasks.example2]
run = "mise example2"

[tasks.example3]
run = "echo 'example3'"

[tasks.one_by_one]
run = [
    { task = "example1" }, # 将等待 example1 完成后再运行下一步
    { tasks = ["example2", "example3"] }, # 这两个任务并行运行
]
```

`mise run one_by_one` 会运行该流水线，但 `mise tasks deps one_by_one` 仍会显示一个叶节点。这些 `{ task }` / `{ tasks }` 条目是该任务自身的 `run` 步骤，而不是图中的边。嵌套任务仍会运行，包括它们自己的 `depends`。将它们重写为 `depends = ["example1", "example2", "example3"]` 会把它们放入依赖关系图中，但也会丢失上述串行/并行顺序：`depends` 只要求这些任务先完成，而不规定它们之间的顺序。
