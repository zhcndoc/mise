---
description: "任务模板让你能够定义可复用的任务定义，多个任务可以对其进行扩展。"
---

# 任务模板

任务模板让你能够定义可复用的任务定义，多个任务可以对其进行扩展。它们对于单仓库或各组件间具有相似任务模式的项目尤其有用。

下面的 Python 示例假设使用一个 uv 项目，其开发依赖包括 `pytest`，以及用于覆盖率的 `pytest-cov`。将 Python 声明为工具并不会安装这些项目包。

## 定义模板

模板在你的 `mise.toml` 的 `[task_templates.*]` 部分中定义：

```toml
[task_templates."python:build"]
description = "构建 Python 项目"
run = "uv build"
tools = { python = "3.12", uv = "latest" }
env = { PYTHONPATH = "src" }

[task_templates."python:test"]
description = "Run Python tests"
run = "uv run pytest"
tools = { python = "3.12", uv = "latest" }
depends = ["build"]
```

## 扩展模板

任务可以使用 `extends` 字段来扩展模板：

```toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "uv run pytest --cov"  # Override run while keeping tools, depends
```

## 模板命名

模板使用冒号（`:`）分隔符进行命名空间划分，类似于单体仓库中的任务命名约定：

- `python:build`
- `python:test`
- `rust:cargo:build`
- `node:npm:test`

## 合并语义

当一个任务扩展一个模板时，字段会按照以下规则进行合并：

| 字段                                               | 行为                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `run`, `run_windows`                              | 本地设置完全覆盖                                                  |
| `tools`                                           | 深度合并（本地工具会添加到模板的值中，或覆盖模板的值）            |
| `env`                                             | 深度合并（本地环境变量会添加到模板的值中，或覆盖模板的值）        |
| `depends`, `depends_post`, `wait_for`             | 本地设置完全覆盖（不合并）                                        |
| `dir`                                             | 本地设置覆盖；如果模板中没有设置，则默认为 config_root            |
| `sources`, `outputs`, `cache`                     | 本地设置完全覆盖                                                  |
| `output`                                          | 本地设置覆盖模板（如果已设置）                                    |
| Sandbox deny fields                               | 与任务本地设置组合                                                |
| Sandbox allow fields                              | 模板值和任务本地值合并                                            |
| `description`, `shell`, `timeout`, etc.           | 本地设置覆盖模板（如果已设置）                                    |
| `quiet`, `hide`, `raw`, `interactive`, `raw_args` | 模板不支持（在每个任务上单独显式设置）                            |

对于 `run`、`run_windows`、`depends`、`depends_post`、`wait_for` 和 `sources`，空的本地列表目前会继承模板的值。特别是，`depends = []` 不会清除模板依赖项。如果任务必须省略这些前置条件，请使用单独的模板。`outputs = []` 是显式的无文件输出声明；`cache = { enabled = false }` 会显式禁用继承的缓存。

### 示例：Tools 的深度合并

```toml
[task_templates."fullstack:build"]
tools = { python = "3.12", node = "18" }

[tasks.build]
extends = "fullstack:build"
tools = { node = "20" }  # 覆盖 node，保留模板中的 python
# 结果：tools = { python = "3.12", node = "20" }
```

### 示例：Env 的深度合并

```toml
[task_templates."python:build"]
env = { PYTHONPATH = "src", DEBUG = "0" }

[tasks.build]
extends = "python:build"
env = { DEBUG = "1" }  # 覆盖 DEBUG，保留模板中的 PYTHONPATH
# 结果：env = { PYTHONPATH = "src", DEBUG = "1" }
```

### 示例：Depends 的完全覆盖

```toml
[task_templates."python:test"]
depends = ["lint", "typecheck"]

[tasks.test]
extends = "python:test"
depends = ["build"]  # 完全替换模板中的 depends
# 结果：depends = ["build"]（不包含 lint 和 typecheck）
```

## Tera 模板

模板支持 Tera 模板化，并在**使用它们的项目上下文中**进行渲染：

```toml
[task_templates."python:build"]
description = "构建 Python 项目"
dir = "{{ config_root }}"  # 解析为 PROJECT 的目录
run = "uv build"
env = { PROJECT = "{{ config_root | basename }}" }
```

可用变量（与普通任务相同）：

- <code v-pre>{{ config_root }}</code> - 使用该模板的项目（而不是定义模板的位置）
- <code v-pre>{{ env.VAR }}</code> - 环境变量
- <code v-pre>{{ cwd }}</code> - 当前工作目录
- <code v-pre>{{ vars.* }}</code> - 配置中的用户定义变量

## 单仓库使用

任务模板在多个包共享类似构建模式的单仓库中尤其有用：

```toml
# Root mise.toml
monorepo_root = true

[monorepo]
config_roots = ["packages/api", "packages/worker"]

[task_templates."python:build"]
run = "uv build"
tools = { python = "3.12", uv = "latest" }

[task_templates."python:test"]
run = "uv run pytest"
tools = { python = "3.12", uv = "latest" }
depends = ["build"]

[task_templates."python:lint"]
run = "ruff check ."
tools = { python = "3.12", ruff = "latest" }
```

```toml
# packages/api/mise.toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "uv run pytest --cov"  # Add coverage

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

## 模板作用域

模板来自活动配置层级，包括全局配置和父级配置。任务使用 `extends` 按名称选择模板；声明模板不会创建可运行的任务。使用 `mise tasks info <task>` 检查继承后的任务。

对于团队成员和 CI 需要共享的行为，优先使用由仓库维护的模板。全局模板适用于个人任务，但其他机器需要具有相同的模板定义才能解析 `extends`。
