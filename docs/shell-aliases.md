---
description: "使用 mise activate 为交互式 Bash、Zsh 或 Fish Shell 定义项目快捷方式。"
---

# Shell 别名

使用 [`mise activate`](/getting-started.html#activate-mise) 为交互式 Bash、Zsh 或 Fish Shell 定义项目快捷方式。mise 会在你进入目录时设置别名，并在别名不再配置时将其移除。

对于还需要在脚本和 CI 中运行的命令，请定义[任务](/tasks/)。Shell 别名在任务内部或通过 `mise exec` 不可用。

## 配置

Shell 别名在 `mise.toml` 的 `[shell_alias]` 部分中定义：

```toml
[shell_alias]
ll = "ls -la"
la = "ls -A"
gs = "git status"
gc = "git commit"
```

When you enter a directory with this configuration, these aliases are automatically set in your shell. When you leave the directory (and the new directory doesn't define the same aliases), they are unset.

## 支持的 Shell

当前支持以下 Shell 中的别名：

- **bash** - 使用 `alias`/`unalias` 命令
- **zsh** - 使用 `alias`/`unalias` 命令
- **fish** - 使用 `alias`/`functions -e` 命令

其他 Shell（nushell、elvish、xonsh、powershell）目前不支持 Shell 别名。

## 动态行为

Shell 别名的工作方式与 mise 管理的环境变量类似：

1. **进入时设置**：当你 `cd` 进入包含 `[shell_alias]` 配置的目录时，别名会被设置
2. **更改时更新**：如果配置中的别名值发生变化，别名会被更新
3. **退出时取消设置**：当你离开目录（或从配置中移除别名）时，别名会被取消设置

```bash
$ cd ~/myproject
# mise 设置：alias ll='ls -la'

$ ll
# 运行：ls -la

$ cd ~
# mise 运行：unalias ll
```

## 层级

与其他 mise 配置一样，来自父目录的 Shell 别名在子目录中也可用。子目录可以覆盖父目录的别名：

```toml [~/projects/mise.toml]
[shell_alias]
build = "make build"
```

```toml [~/projects/myapp/mise.toml]
[shell_alias]
build = "npm run build"  # 覆盖父级
```

## 模板

别名值支持[模板](/templates)。此 Bash/Zsh 示例会为 Shell 引用项目路径，并在你调用别名时运行 `node --version`：

```toml
[shell_alias]
proj = "cd {{config_root | quote}}"
node_version = "node --version"
```

## 使用场景

### 项目特定快捷方式

定义只在特定项目中有意义的快捷方式：

```toml
[shell_alias]
dev = "npm run dev"
test = "npm test"
build = "npm run build"
deploy = "./scripts/deploy.sh"
```

### 工具包装器

创建使用项目特定默认值封装工具的别名：

```toml
[shell_alias]
docker-compose = "docker compose -f docker-compose.dev.yml"
terraform = "terraform -chdir=./infrastructure"
```

### 快速导航

引用项目路径，以便在 Bash 和 Zsh 中使用包含空格的目录：

```toml
[shell_alias]
src = "cd {{config_root | quote}}/src"
tests = "cd {{config_root | quote}}/tests"
docs = "cd {{config_root | quote}}/docs"
```

## 限制

- **任务中不可用**：Shell 别名仅在运行 `mise activate` 的交互式 Shell 中处于活动状态。它们在 TOML 任务的 `run` 代码块或文件任务中**不可用**，因为任务在非交互式子 Shell 中运行。在任务中直接使用底层命令，或者通过 [`env._.path`](/environments/#env-path) 将包装脚本添加到你的 `PATH` 中。
- **Shell 支持**：仅支持 bash、zsh 和 fish。详情请参阅 [Shell 功能兼容性矩阵](/getting-started.html#shell-feature-compatibility)。

## 与工具别名的比较

mise 有两个用途不同的别名功能：

| 功能              | 用途                                                        | 配置键          |
| ----------------- | ----------------------------------------------------------- | --------------- |
| **Shell 别名**    | 定义 Shell 命令快捷方式（`alias ll='ls -la'`）              | `[shell_alias]` |
| **工具别名**      | 定义工具的版本别名（`node@my-version` → `24`）              | `[tool_alias]`  |

请参阅 [工具别名](/dev-tools/aliases) 以获取有关工具版本别名的文档。
