---
description: "为现有的基于 requirements 的项目、uv 项目或独立 Python 脚本选择配方"
---

# Python Cookbook

为现有的基于 requirements 的项目、uv 项目或独立 Python 脚本选择配方。有关运行时安装和 virtualenv 设置，请参阅 [Python 配置](/lang/python.html)。

## 一个使用 virtualenv 的 Python 项目

此配方要求存在 `requirements.txt`、`app.py` 和 `tests/` 目录。在用于开发的 requirements 中包含 `pytest`。mise 会创建 `.venv`；安装任务会将项目依赖填充到其中。

```toml [mise.toml]
min_version = "2024.9.5"

[env]
# 使用从当前目录派生的项目名称
PROJECT_NAME = "{{ config_root | basename }}"

# 自动激活 virtualenv
_.python.venv = { path = ".venv", create = true }

[tools]
python = "3.12"
uv = "latest"
ruff = "latest"

[tasks.install]
description = "安装依赖"
alias = "i"
run = "uv pip install -r requirements.txt"

[tasks.run]
description = "运行应用程序"
run = "python app.py"

[tasks.test]
description = "Run tests"
run = "python -m pytest tests/"

[tasks.lint]
description = "Lint the code"
run = "ruff check ."

[tasks.info]
description = "打印项目信息"
run = '''
echo "项目: $PROJECT_NAME"
echo "虚拟环境: $VIRTUAL_ENV"
'''
```

运行 `mise run install`，然后运行 `mise run test`、`mise run lint` 或 `mise run run`。将 `.venv/` 添加到 `.gitignore`。

## mise + uv

如果你使用的是通过 `uv init .` 初始化的 `uv` 项目，这里介绍如何将它与 mise 一起使用。

以下是 `uv` 项目的结构：

```shell [uv-project]
.
├── .gitignore
├── .python-version
├── main.py
├── pyproject.toml
└── README.md

cat .python-version
# 3.12
```

如果你在 `uv` 项目中运行 `uv run main.py`，`uv` 会使用 `.python-version` 文件中指定的 Python 版本自动为你创建虚拟环境。它还会创建 `uv.lock` 文件。

如果希望 mise 选择相同的 Python 版本，请启用 `.python-version` 发现功能。同时将 uv 声明为工具：

```toml [mise.toml]
[tools]
uv = "latest"

[settings]
idiomatic_version_file_enable_tools = ["python"]
```

运行 `mise install`，然后运行 `mise exec -- uv sync` 来创建锁文件、虚拟环境和项目依赖。默认情况下，当你运行 `mise exec -- python` 时，mise 仍会选择其管理的 Python；`uv run` 则会选择 uv 的项目环境。

要让 `mise` 使用由 `uv` 创建的虚拟环境，请在 `mise.toml` 文件中设置 [`python.uv_venv_auto`](/lang/python.html#python.uv_venv_auto) 设置。使用 `"source"` 仅加载现有的 `.venv`，或使用 `"create|source"` 在 `.venv` 缺失时创建它，然后加载它。如果你更希望由 `mise deps` 创建虚拟环境，请将其保持为 `"source"`，启用 `[deps.uv]`，然后运行 `mise deps`。

::: tip
`mise` 会在目录树中向上查找 `uv.lock` 文件来定位 uv 项目——该锁文件是 `mise` 判断项目使用 uv 的依据。因此必须存在 `uv.lock`：如果找不到该文件（例如，在尚未执行 `uv sync` 的新项目中），此设置不会生效。运行 `uv sync`（或 `uv lock`）来生成该文件。
:::

```toml [mise.toml]
[settings]
python.uv_venv_auto = "source"
# 或者，在缺失时创建
# python.uv_venv_auto = "create|source"
```

激活刷新后，`python` 会解析到虚拟环境。你也可以直接通过 mise 进行检查：

```shell
mise exec -- python -c 'import sys; print(sys.executable)'
# /path/to/uv-project/.venv/bin/python
```

另一种方法是在你的 `mise.toml` 文件中使用 `_.python.venv` 来指定 `uv` 创建的虚拟环境路径。

```toml [mise.toml]
[env]
_.python.venv = { path = ".venv" }
```

### 同步由 mise 和 uv 安装的 Python 版本

使用 [`mise sync python --uv`](/cli/sync/python.html) 让现有的 Python 安装可以在 mise 和 uv 之间使用。这会共享已安装的运行时；不会更新 `.python-version`、选择项目版本或同步软件包。使用 `uv sync` 来处理项目依赖。

### uv 脚本

你可以在 toml 或文件任务的 [`shebang`](/tasks/toml-tasks.html#shell-shebang) 中使用 `uv run`。如果文件名不以 `.py` 结尾，则必须使用 `--script` 标志。

下面是一个 toml 任务示例：

```toml [mise.toml]
[tools]
uv = 'latest'

[tasks.print_peps]
run = '''
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["requests<3", "rich"]
# ///

import requests
from rich.pretty import pprint

resp = requests.get("https://peps.python.org/api/peps.json", timeout=30)
resp.raise_for_status()
data = resp.json()
pprint([(k, v["title"]) for k, v in data.items()][:10])
'''
```

或者作为文件任务：

```python [mise-tasks/print_peps.py]
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["requests<3", "rich"]
# ///

import requests
from rich.pretty import pprint

resp = requests.get("https://peps.python.org/api/peps.json", timeout=30)
resp.raise_for_status()
data = resp.json()
pprint([(k, v["title"]) for k, v in data.items()][:10])
```

对于文件任务，在 Unix 上使用 `chmod +x mise-tasks/print_peps.py` 使其可执行。按照 TOML 示例在项目中声明 uv。随后，两种形式都可以使用 `mise run print_peps` 运行：

```shell
❯ mise run print_peps
[print_peps] $ ~/uv-project/mise-tasks/print_peps.py
Installed 9 packages in 8ms
[
│   ('1', 'PEP Purpose and Guidelines'),
│   ('2', 'Procedure for Adding New Modules'),
    #...
]
```
