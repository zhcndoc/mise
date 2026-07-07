# 运行任务

使用 `mise tasks` 查看可用任务。要显示带有 `hide=true` 属性隐藏的任务，请使用选项 `--hidden`。

使用 `mise tasks deps [tasks]...` 查看任务的依赖项。

使用 `mise tasks run <task>`、`mise run <task>`、`mise r <task>`，或者直接使用 `mise <task>` 来运行任务——不过
最后这种方式你绝不要放进脚本或文档中，因为如果 mise 将来在某个版本中添加了同名命令，那么该任务就会被遮蔽，必须使用其他几种形式之一来运行。

大多数 mise 用户会为 `mise run` 设置一个别名，例如 `alias mr='mise run'`。

默认情况下，任务最多会并行执行 4 个作业。可使用 `--jobs` 选项、
`jobs` 设置或 `MISE_JOBS` 环境变量来自定义。输出通常会按行显示，并带有任务标签作为前缀。
通过逐行输出，我们可以避免并行执行时输出交错。不过，如果
--jobs == 1，输出将设置为 `interleave`。

若只想直接打印 stdout/stderr，请使用 `--interleave`、`task.output` 设置，或 `MISE_TASK_OUTPUT=interleave`。

默认不会读取 stdin。要启用此功能，请在需要它的任务上设置 `raw = true`。这会阻止
它与任何其他任务并行运行——在这种情况下会使用 RWMutex 的写锁。这也会阻止对输出应用脱敏处理。

额外参数会传递给任务，例如，如果我们想以发布模式运行：

```bash
mise run build --release
```

如果有多个命令，参数只会传递给最后一个命令。

:::tip
你可以为任务定义参数/标志，这将提供验证、解析、自动补全和文档。

- [文件任务中的参数](/tasks/file-tasks#arguments)
- [TOML 任务中的参数](/tasks/toml-tasks#arguments)

如果安装了 `usage` CLI 且 mise 补全功能可用，任务的自动补全将自动生效。

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
- `*` 匹配 0 个或多个字符
- `**` 匹配 0 个或多个组
- `{glob1,glob2,...}` 匹配任何以逗号分隔的 glob 模式
- `[ab,...]` 匹配字符集或范围 `[a-z]` 中的任意字符
- `[!ab,...]` 匹配不在字符集中的任意字符

### 示例

`mise run generate:{completions,docs:*}`

以及带依赖项的情况：

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
