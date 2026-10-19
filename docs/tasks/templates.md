---
description: "通过扩展命名任务模板，在多个任务间共享命令、工具、环境变量和依赖。"
socialDescription: "通过任务模板在多个任务间共享命令、工具和依赖。"
---

# 任务模板

多个任务需要共享命令、工具、环境变量或依赖项时，可以定义任务模板。每个任务通过 `extends` 指定模板，只设置与模板不同的部分。模板本身不是任务：声明模板不会创建可运行的任务。

任务模板与 [Tera 模板](/templates.html)不同。任务模板提供任务继承的完整属性；Tera 则负责渲染值中的表达式，包括来自任务模板的值。

下方 Python 示例假定 uv 项目的开发依赖中包含 `pytest` 和 `pytest-cov`。

## 定义模板

在 `mise.toml` 的 `[task_templates.<name>]` 下添加命名模板。模板支持与任务相同的属性，但[合并规则](#merge-semantics)中列出的属性除外：

```mise-toml
[task_templates."python:build"]
description = "构建 Python 项目"
run = "uv build"
tools = { python = "3.14", uv = "latest" }
env = { PYTHONPATH = "src" }

[task_templates."python:test"]
description = "Run Python tests"
run = "uv run pytest"
tools = { python = "3.14", uv = "latest" }
depends = ["build"]
```

模板名称可以自由命名。可以像任务名称一样使用 `:` 分组，例如 `python:build` 或 `rust:cargo:build`。

## 扩展模板

将 `extends` 设置为模板名称。任务未设置的属性会从模板继承；双方都设置的属性则遵循[合并规则](#merge-semantics)：

```mise-toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "uv run pytest --cov" # replaces run, keeps tools and depends
```

[文件任务](/tasks/file-tasks.html)可在 `#MISE` 文件头中扩展模板：

```bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE extends="python:build"
uv build
```

运行[`mise tasks info <task>`](/cli/tasks/info.html)可查看合并后生成的任务。

## 模板作用范围

mise 会从所加载的所有配置文件（包括全局配置和父级配置）中收集模板，并将它们放入同一名称集合。如果多个配置文件定义了同名模板，则优先级最高、也就是最接近当前目录的配置文件生效。所有指定该模板的任务都会使用这个定义，包括父级配置和全局配置中的任务。

团队成员和 CI 需要使用的模板应保存在仓库中。全局配置中的模板适用于个人任务，但其他机器必须有相同定义才能解析 `extends`。

## 使用变量参数化模板

可将共用命令写在模板的 `run` 中，并通过 `vars` 指定不同任务的变量值。mise 会先将模板合并到各任务中，再渲染任务，因此继承的命令可以读取该任务的变量。

```mise-toml
[task_templates.e2e]
vars = { mode = "headless" }
run = "echo --mode={{ vars.mode }}"

[tasks.test]
extends = "e2e"
vars = { mode = "headed" }

[tasks."test:ci"]
extends = "e2e"
```

`mise run test` 会输出 `--mode=headed`。`mise run test:ci` 会继承模板默认值，并输出 `--mode=headless`。

模板变量和任务局部变量会合并；同名变量以任务中的值为准。如果变量是可选的，可在 `run` 中使用 Tera 默认值，例如
<code v-pre>{{ vars.mode | default(value='headless') }}</code>；变量为可选项时可使用默认值。

依赖任务局部变量的表达式应放在任务或其模板中。顶层 `[vars]` 条目会在加载配置时解析，任务局部覆盖不会重新计算已保存的值。详见[变量的解析时机](/configuration/vars.html#when-vars-are-resolved)。

## 合并规则

任务会继承其未设置的所有属性。模板和任务都设置同一属性时，遵循以下规则：

| 属性                                                                                          | 合并结果                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `run`、`run_windows`                                                                          | 任务值替代模板值。任务或模板设置了 `file` 时忽略此项。                                                                            |
| `file`                                                                                        | 使用任务值；未设置时使用模板值。                                                                                                 |
| `tools`、`env`、`vars`                                                                        | 按键合并。任务条目会追加到模板条目中，同名键以任务条目为准。                                                                      |
| `depends`、`depends_post`、`wait_for`                                                         | 任务列表替代模板列表。                                                                                                           |
| `alias`、`sources`、`outputs`                                                                 | 任务值替代模板值。                                                                                                               |
| `dir`                                                                                         | 依次采用任务值、模板值、`task_config.dir`，或任务的配置根目录。                                                                  |
| `usage`                                                                                       | 两份规范都会合并，模板规范在前。                                                                                                 |
| `deny_all`、`deny_read`、`deny_write`、`deny_net`、`deny_env`                                | 任一方设置即启用。任务不能关闭模板设置的限制。                                                                                   |
| `allow_read`、`allow_write`、`allow_net`、`allow_env`、`pass_through_env`                    | 先列出模板条目，再列出任务条目。                                                                                                 |
| `description`、`shell`、`timeout`、`output`、`silent`、`confirm`、`cache`、`watch`、`daemons` | 如果任务已设置，则采用任务值；否则采用模板值。                                                                                   |
| `quiet`、`hide`、`raw`、`interactive`、`raw_args`、`extends`                                 | 模板不接受这些属性；mise 会将其视为未知字段并发出警告。请在每个任务上分别设置。模板不能扩展其他模板。                            |
| `secrets`                                                                                     | 模板不允许设置此项；mise 会报告配置错误。                                                                                         |

### 空列表 {#empty-lists-and-file-tasks}

任务的空列表会继承模板中的 `run`、`run_windows`、`depends`、`depends_post`、`wait_for` 和 `sources` 值，因此 `depends = []` 不会清除模板依赖项。需要移除全部依赖项的任务应使用单独的模板。`outputs = []` 则会声明任务不写入任何文件；`cache = { enabled = false }` 会关闭继承的缓存设置。

### 示例：深度合并工具

```toml
[task_templates."fullstack:build"]
tools = { python = "3.14", node = "22" }

[tasks.build]
extends = "fullstack:build"
tools = { node = "24" } # overrides node, keeps python
# Result: tools = { python = "3.14", node = "24" }
```

### 示例：深度合并环境变量

```toml
[task_templates."python:build"]
env = { PYTHONPATH = "src", DEBUG = "0" }

[tasks.build]
extends = "python:build"
env = { DEBUG = "1" } # overrides DEBUG, keeps PYTHONPATH
# Result: env = { PYTHONPATH = "src", DEBUG = "1" }
```

### 示例：共享参数

模板的 `usage` 规范包含多个任务共用的标志和参数。扩展该模板的任务只需添加自己的参数，无需重复共享部分：

```mise-toml
[task_templates.deploy]
usage = """
flag "--env <env>" help="Target environment"
flag "--dry-run" help="Print what would happen"
"""

[tasks.deploy-api]
extends = "deploy"
usage = 'flag "--replicas <n>" help="How many to run"'
run = 'echo "env=$usage_env replicas=$usage_replicas"'
```

`mise run deploy-api --help` 会按顺序列出 `--env`、`--dry-run` 和 `--replicas`。每个标志只应声明一次：如果在模板和任务中都写了同一个标志，这会被视为两次声明，因此 `--help` 中也会出现两次。

### 示例：完整替换 depends

```toml
[task_templates."python:test"]
depends = ["lint", "typecheck"]

[tasks.test]
extends = "python:test"
depends = ["build"] # replaces the template's depends
# Result: depends = ["build"]; lint and typecheck do not run
```

## Tera 模板表达式

即使模板定义在父级或全局配置中，其中的 Tera 表达式也会在扩展该模板的任务上下文中渲染。<code v-pre>{{ config_root }}</code> 表示该任务的配置根目录，而不是定义模板的文件所在目录：

```mise-toml
[task_templates."python:build"]
run = "uv build --out-dir {{ config_root }}/dist"
env = { PROJECT = "{{ config_root | basename }}" }
```

模板使用与常规任务相同的变量：

- <code v-pre>{{ config_root }}</code>：使用该模板的任务的配置根目录
- <code v-pre>{{ env.VAR }}</code>：环境变量
- <code v-pre>{{ cwd }}</code>：当前工作目录
- <code v-pre>{{ vars.NAME }}</code>：配置变量，包括模板和任务局部覆盖值

任务模板提供完整属性，无法将参数化片段插入任务 `run` 字符串的中间。如果要在单个脚本中重复使用或嵌套片段，请使用 [Tera 组件](/templates.html#parameterized-snippets-with-components)。

## 单体仓库中的用法

在单体仓库根目录定义共享模板，然后在各个项目中扩展模板。此例中，API 项目为测试命令添加覆盖率统计，而 worker 项目使用继承的命令：

```mise-toml
# Root mise.toml
monorepo_root = true

[monorepo]
config_roots = ["packages/api", "packages/worker"]

[task_templates."python:build"]
run = "uv build"
tools = { python = "3.14", uv = "latest" }

[task_templates."python:test"]
run = "uv run pytest"
tools = { python = "3.14", uv = "latest" }
depends = ["build"]

[task_templates."python:lint"]
run = "ruff check ."
tools = { python = "3.14", ruff = "latest" }
```

```mise-toml
# packages/api/mise.toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "uv run pytest --cov" # adds coverage

[tasks.lint]
extends = "python:lint"
```

```toml
# packages/worker/mise.toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"

[tasks.lint]
extends = "python:lint"
```

如需为所有项目的 `build` 任务设置相同默认值，又不想逐个添加 `extends`，可改用[工作区项目图](/tasks/workspace-graph.html#root-task-defaults)中的 `[monorepo.task_defaults.build]`。`extends` 指定的模板优先于根目录默认值。
