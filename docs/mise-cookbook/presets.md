---
description: "预设是你编写的用于创建项目初始配置的任务。"
---

# 预设

预设是你编写的用于创建项目初始配置的任务。将其存储为[全局文件任务](/tasks/file-tasks.html)，这样它就能在新仓库中使用。若要在现有项目中复用，[任务模板](/tasks/templates.html)可能更合适：它们可以共享任务定义，而不会生成文件。

## Python 预设示例

此 Bash 任务会将 Python 和 uv 配置写入你执行该任务的目录。它拒绝替换现有的 `mise.toml`，并将项目初始化和依赖安装保留为明确的后续步骤。

创建任务目录：

```sh
mkdir -p ~/.config/mise/tasks/preset
```

然后将以下内容保存为 `~/.config/mise/tasks/preset/python`：

```bash [~/.config/mise/tasks/preset/python]
#!/usr/bin/env bash
#MISE description="Create a Python and uv project config"
#MISE dir="{{cwd}}"
set -euo pipefail

if [[ -e mise.toml ]]; then
  echo "mise.toml already exists; merge the preset manually" >&2
  exit 1
fi

cat > mise.toml <<'TOML'
[tools]
python = "3.12"
uv = "latest"

[tasks.sync]
description = "Sync the project's locked dependencies"
run = "uv sync --locked"

[tasks.test]
description = "Run tests from the project environment"
run = "uv run --locked pytest"
TOML

echo "Created mise.toml"
```

在 Unix 上使任务可执行：

```sh
chmod +x ~/.config/mise/tasks/preset/python
```

然后从空项目目录中运行它：

```sh
mkdir my-project
cd my-project
mise run preset:python
mise exec -- uv init --bare
mise exec -- uv add --dev pytest
```

该预设会创建 `mise.toml`；uv 会创建项目清单和锁文件。添加应用程序和测试，然后运行 `mise run test`。队友克隆项目后可以运行 `mise run sync` 来安装已锁定的依赖。提交 `mise.toml`、`pyproject.toml` 和 `uv.lock`，并忽略 `.venv/`。

对于全局任务而言，`#MISE dir="{{cwd}}"` 很重要：它会让任务写入执行任务的目录，而不是全局任务的配置根目录。在配置已存在或使用其他包管理器的仓库中使用此脚本前，请先进行调整。
