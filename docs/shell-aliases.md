# Shell 别名

mise 可以管理 shell 别名，这些别名会在你进入某个目录时动态设置，在离开时取消设置，类似于环境变量的工作方式。

## 配置

Shell 别名在 `mise.toml` 的 `[shell_alias]` 部分中定义：

```toml
[shell_alias]
ll = "ls -la"
la = "ls -A"
gs = "git status"
gc = "git commit"
```

当你进入具有此配置的目录时，这些别名会自动在你的 shell 中设置。当你离开该目录时（并且新目录没有相同的别名），它们将被取消设置。

## 支持的 Shell

当前支持以下 Shell 中的别名：

- **bash** - 使用 `alias`/`unalias` 命令
- **zsh** - 使用 `alias`/`unalias` 命令
- **fish** - 使用 `alias`/`functions -e` 命令

其他 Shell（nushell、elvish、xonsh、powershell）目前不支持 Shell 别名。

## 动态行为

Shell 别名的工作方式与 mise 管理的环境变量类似：

1. **进入时设置**：当你 `cd` 进入一个带有 `[shell_alias]` 配置的目录时，别名会被设置
2. **变更时更新**：如果你在配置中更改了某个别名的值，它会被更新
3. **退出时取消设置**：当你离开该目录（或从配置中移除了该别名）时，它会被取消设置

```bash
$ cd ~/myproject
# mise 设置：alias ll='ls -la'

$ ll
# 运行：ls -la

$ cd ~
# mise 运行：unalias ll
```

## 层级

与其他 mise 配置一样，来自父目录的 shell 别名在子目录中也可用。子目录可以覆盖父目录的别名：

```toml
# ~/projects/mise.toml
[shell_alias]
build = "make build"

# ~/projects/myapp/mise.toml
[shell_alias]
build = "npm run build"  # 覆盖父级
```

## 模板

别名值支持 [模板](/templates)，允许动态值：

```toml
[shell_alias]
proj = "cd {{config_root}}"
node_version = "echo {{exec(command='node --version')}}"
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

```toml
[shell_alias]
src = "cd {{config_root}}/src"
tests = "cd {{config_root}}/tests"
docs = "cd {{config_root}}/docs"
```

## 限制

- **任务中不可用**：Shell 别名仅在运行 `mise activate` 的交互式 shell 中处于活动状态。它们在 TOML 任务的 `run` 块或文件任务中**不可用**，因为任务在非交互式子 shell 中运行。在任务中直接使用底层命令，或通过 [`env._.path`](/environments/#env-path) 将包装脚本添加到你的 `PATH` 中。
- **Shell 支持**：仅支持 bash、zsh、fish 和 xonsh。详情请参阅 [Shell 功能兼容性矩阵](/getting-started.html#shell-feature-compatibility)。

## 与工具别名的比较

mise 有两种不同的别名功能，它们用于不同的目的：

| 功能              | 目的                                                   | 配置键          |
| ----------------- | ------------------------------------------------------ | --------------- |
| **Shell 别名**    | 定义 shell 命令快捷方式 (`alias ll='ls -la'`)         | `[shell_alias]` |
| **工具别名**      | 为工具定义版本别名（`node@lts` → `20.x`）              | `[tool_alias]`  |

请参阅 [工具别名](/dev-tools/aliases) 以获取有关工具版本别名的文档。
