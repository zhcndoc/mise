# Mise + Python 食谱

这里有一些使用 mise 管理 [Python](/lang/python.html) 项目的技巧。

## 一个使用 virtualenv 的 Python 项目

这里有一个带有 `requirements.txt` 文件的 Python 项目示例。

```toml [mise.toml]
min_version = "2024.9.5"

[env]
# 使用从当前目录派生的项目名称
PROJECT_NAME = "{{ config_root | basename }}"

# 自动激活 virtualenv
_.python.venv = { path = ".venv", create = true }

[tools]
python = "{{ get_env(name='PYTHON_VERSION', default='3.11') }}"
ruff = "latest"

[tasks.install]
description = "安装依赖"
alias = "i"
run = "uv pip install -r requirements.txt"

[tasks.run]
description = "运行应用程序"
run = "python app.py"

[tasks.test]
description = "运行测试"
run = "pytest tests/"

[tasks.lint]
description = "检查代码"
run = "ruff src/"

[tasks.info]
description = "打印项目信息"
run = '''
echo "项目: $PROJECT_NAME"
echo "虚拟环境: $VIRTUAL_ENV"
'''
```

## mise + uv

如果你使用的是通过 `uv init .` 初始化的 `uv` 项目，这里介绍如何将它与 mise 一起使用。

下面是 `uv` 项目的结构示例：

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

如果你在 `uv` 项目中运行 `uv run main.py`，`uv` 会使用 `.python-version` 文件中指定的 Python 版本自动为你创建一个虚拟环境。这还会创建一个 `uv.lock` 文件。

`mise` 会检测 `.python-version` 中的 Python 版本，不过默认情况下它不会使用 `uv` 创建的虚拟环境。所以，执行 `which python` 时会显示来自 `mise` 的全局 Python 安装。

```shell
mise i
which python
# ~/.local/share/mise/installs/python/3.12.4/bin/python
```

如果你希望 `mise` 使用 `uv` 创建的虚拟环境，可以在你的 `mise.toml` 文件中设置 [`python.uv_venv_auto`](/lang/python.html#python.uv_venv_auto) 配置。
使用 `"source"` 可仅加载现有的 `.venv`，或使用 `"create|source"` 在缺失时创建它，然后再加载。
如果你更希望由 `mise deps` 来创建虚拟环境，请保持为 `"source"`，启用 `[deps.uv]`，然后运行 `mise deps`。

```toml [mise.toml]
[settings]
python.uv_venv_auto = "source"
# 或者，在缺失时创建
# python.uv_venv_auto = "create|source"
```

此时执行 `which python` 将会显示来自 `uv` 创建的虚拟环境中的 Python 版本。

```shell
which python
# ./uv-project/.venv/bin/python
```

另一种方法是在你的 `mise.toml` 文件中使用 `_.python.venv` 来指定 `uv` 创建的虚拟环境路径。

```toml [mise.toml]
[env]
_.python.venv = { path = ".venv" }
```

### 同步由 mise 和 uv 安装的 Python 版本

你可以使用 [mise sync python --uv](/cli/sync/python.html#uv) 来同步 `mise` 安装的 Python 版本与 `uv` 项目中 `.python-version` 文件指定的 Python 版本。

### uv 脚本

你可以在 toml 或文件任务的 [`shebang`](/tasks/toml-tasks.html#shell-shebang) 中利用 `uv run`。
注意：如果文件名不是以 `.py` 结尾，则需要使用 `--script`。

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

resp = requests.get("https://peps.python.org/api/peps.json")
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

resp = requests.get("https://peps.python.org/api/peps.json")
data = resp.json()
pprint([(k, v["title"]) for k, v in data.items()][:10])
```

然后你可以通过 `mise run print_peps` 来运行它：

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
