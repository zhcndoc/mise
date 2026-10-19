---
description: "在 mise.toml 中定义 Shell 别名；进入项目时由 mise 设置，离开时自动移除。"
---

# Shell 别名

在 `mise.toml` 中定义 shell 别名。在已[激活 mise](/shell-setup.html) 的 Bash、Zsh 或 Fish shell 中，进入目录时 mise 会设置这些别名，离开时则会移除。其他 shell 会忽略 `[shell_alias]`；详见 [shell 功能支持情况](/shell-setup.html#shell-feature-compatibility)。

```toml [mise.toml]
[shell_alias]
ll = "ls -la"
gs = "git status"
```

```sh
cd ~/myproject
ll       # runs ls -la
cd ~     # mise removes ll
```

别名只存在于交互式 shell 中。任务、`mise exec` 和脚本无法使用它们；若某个命令还要在脚本和 CI 中运行，请定义一个[任务](/tasks/)，或使用 [`env._.path`](/environments/#env-path) 将包装脚本加入 `PATH`。

这与用于为工具版本设置名称的[工具别名](/dev-tools/aliases.html)（`[tool_alias]`）不同。

## 从 CLI 管理别名 {#cli}

[`mise shell-alias`](/cli/shell-alias.html) 可列出和编辑别名：

```sh
mise shell-alias ls               # aliases active in the current directory
mise shell-alias get ll           # prints ls -la
mise shell-alias set ll "ls -la"  # adds or updates ll in the global config
mise shell-alias unset ll         # removes ll from the global config
```

`set` 和 `unset` 只会编辑全局配置 `~/.config/mise/config.toml`。若要添加项目别名，请编辑项目 `mise.toml` 中的 `[shell_alias]`。

## 父目录与子目录 {#hierarchy}

父目录配置中的别名也会应用于其子目录，子目录配置则可以覆盖这些别名：

```toml [~/projects/mise.toml]
[shell_alias]
build = "make build"
```

```toml [~/projects/myapp/mise.toml]
[shell_alias]
build = "npm run build"  # overrides the parent's build
```

在配置中修改别名后，mise 会在 shell 下次显示提示符时更新它。

## 模板 {#templates}

别名值支持 [Tera 模板](/templates.html)。请使用 `quote` 过滤器引用路径，确保包含空格的目录也能在 Bash 和 Zsh 中正常使用：

```toml [mise.toml]
[shell_alias]
proj = "cd {{config_root | quote}}"
src = "cd {{config_root | quote}}/src"
```

## 示例 {#use-cases}

```toml [mise.toml]
[shell_alias]
dev = "npm run dev"
t = "npm test"
dc = "docker compose -f docker-compose.dev.yml"
tf = "terraform -chdir=./infrastructure"
```

请避免使用 `test` 等 shell 内置命令的名称，否则别名会遮蔽交互式 shell 中的内置命令。

## 限制 {#limitations}

- mise 会替换 shell 中已有的同名别名，离开目录后不会恢复原别名。
- 在[安全模式](/security.html#safe-mode)（`MISE_SAFE=1`）下，mise 会忽略项目配置中的 `[shell_alias]`。全局配置中的别名仍会生效。
