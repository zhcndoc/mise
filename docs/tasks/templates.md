# 任务模板

任务模板允许你定义可复用的任务定义，这些定义可以被多个任务扩展。在单体仓库或跨不同组件具有相似任务模式的项目中，这一点尤其有用。

## 定义模板

模板在你的 `mise.toml` 的 `[task_templates.*]` 部分中定义：

```toml
[task_templates."python:build"]
description = "构建 Python 项目"
run = "uv build"
tools = { python = "3.12", uv = "latest" }
env = { PYTHONPATH = "src" }

[task_templates."python:test"]
description = "运行 Python 测试"
run = "pytest"
tools = { python = "3.12" }
depends = ["build"]
```

## 扩展模板

任务可以使用 `extends` 字段来扩展模板：

```toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "pytest --cov"  # 在保留 tools、depends 的同时覆盖 run
```

## 模板命名

模板使用冒号（`:`）分隔符进行命名空间划分，类似于单体仓库中的任务命名约定：

- `python:build`
- `python:test`
- `rust:cargo:build`
- `node:npm:test`

## 合并语义

当一个任务扩展一个模板时，字段会按照以下规则进行合并：

| 字段                                              | 行为                                                        |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `run`, `run_windows`                              | 本地设置完全覆盖                                            |
| `tools`                                           | 深度合并（添加本地工具，或覆盖模板中的工具）                |
| `env`                                             | 深度合并（添加本地环境变量，或覆盖模板中的环境变量）        |
| `depends`, `depends_post`, `wait_for`             | 本地设置完全覆盖（不合并）                                  |
| `dir`                                             | 本地设置覆盖；如果模板中未设置，则默认为 config_root        |
| `sources`, `outputs`, `cache`                     | 本地设置完全覆盖                                            |
| `output`                                          | 本地设置覆盖模板设置（如果已设置）                          |
| 沙箱拒绝字段                                      | 与任务本地设置组合                                          |
| 沙箱允许字段                                      | 合并模板值和任务本地值                                      |
| `description`, `shell`, `timeout` 等              | 本地设置覆盖模板设置（如果已设置）                          |
| `quiet`, `hide`, `raw`, `interactive`, `raw_args` | 模板不支持（在每个任务上显式设置）                          |

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

模板支持 Tera 模板语法，并使用**项目的上下文**进行渲染：

```toml
[task_templates."python:build"]
description = "构建 Python 项目"
dir = "{{ config_root }}"  # 解析为 PROJECT 的目录
run = "uv build"
env = { PROJECT = "{{ config_root | basename }}" }
```

可用变量（与普通任务相同）：

- <code v-pre>{{ config_root }}</code> - 使用该模板的项目（不是定义模板的位置）
- <code v-pre>{{ env.VAR }}</code> - 环境变量
- <code v-pre>{{ cwd }}</code> - 当前工作目录
- <code v-pre>{{ vars.* }}</code> - 来自配置的用户定义变量。

## 单仓库使用

任务模板在多个包共享类似构建模式的单仓库中尤其有用：

```toml
# 根目录 mise.toml
[settings]
monorepo_root = true

[task_templates."python:build"]
run = "uv build"
tools = { python = "3.12", uv = "latest" }

[task_templates."python:test"]
run = "pytest"
tools = { python = "3.12" }
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
run = "pytest --cov"  # 添加覆盖率

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

## 未来增强

以下功能计划在未来版本中推出：

- **全局模板**：在 `~/.config/mise/config.toml` 中定义模板，以便在所有项目中使用
- **模板包**：从外部来源导入模板
- **模式匹配规则**：根据文件检测自动应用模板（例如，当存在 `pyproject.toml` 时自动应用 `python:*` 模板）
- **文件任务模板**：将模板定义为独立的脚本文件，类似于 [文件任务](/tasks/file-tasks)。
