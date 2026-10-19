---
description: "在已激活 shell 切换目录、检测到受监视文件变化或 mise 安装工具时运行命令。"
---

# 钩子

钩子会在特定事件发生时运行命令：启用了 `mise activate` 的 Shell 切换目录（包括进入或离开项目）、
检测到受监视文件发生变化，或 mise 安装工具时。请在 `mise.toml` 的 `[hooks]` 下定义；文件变更钩子
使用单独的 `[[watch_files]]` 表。

```toml [mise.toml]
[hooks]
enter = "echo 'entered the project'"
postinstall = "npm install"
```

| 事件              | 触发时机                           | 是否需要 `mise activate` |
| ----------------- | ---------------------------------- | ------------------------ |
| `enter`           | Shell 从项目外进入项目            | 是                       |
| `leave`           | Shell 离开项目                     | 是                       |
| `cd`              | Shell 切换到项目内的目录           | 是                       |
| `preinstall`      | mise 即将安装工具                  | 否                       |
| `postinstall`     | mise 已安装工具                    | 否                       |
| `[[watch_files]]` | Shell 检测到匹配模式的文件发生变化 | 是                       |

需要按需运行的命令请使用[任务](/tasks/)；编辑期间要重新运行任务，请使用 [`mise watch`](/cli/watch.html)。
`watch_files` 钩子会在已激活 Shell 显示提示符时检查，不由后台监视器检查。

## 定义钩子 {#define-a-hook}

钩子可以是命令字符串、表、任务引用，或这些内容组成的数组：

```mise-toml [mise.toml]
[hooks]
enter = "echo hi"                                 # short for { run = "echo hi" }
leave = { run = "echo bye", shell = "bash -c" }
cd = { task = "check-tools" }
postinstall = ["npm install", { task = "codegen" }]
```

- `run` 使用默认的内联 Shell 在新进程中运行命令，Shell 参数由
  [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)
  或
  [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args).
  设置。若要使用其他程序，请将 `shell` 设为程序名及执行内联命令所需的参数，例如 `bash -c`、`zsh -c` 或 `pwsh -Command`。
- `run_windows` 在 Windows 上替代 `run`。在其他平台上，若钩子只定义了 `run_windows`，则会跳过。
- `task` 用于运行 mise 任务；参阅[运行任务](#task-hooks)。

钩子命令是 [Tera 模板](/templates.html)，因此
<span v-pre>`enter = "echo {{config_root}}"`</span> 会打印项目目录。新建进程运行的钩子会使用项目环境、
`[env]` 值以及 `PATH` 中的工具，输出会写到 stderr。钩子失败时，mise 会发出警告并继续运行其余钩子。

`run` 必须是单个字符串。若要在一个进程中运行多行命令，请使用多行字符串：

```mise-toml [mise.toml]
[hooks.enter]
run = """
echo one
echo two
"""
```

若要在独立进程中运行这些命令，请使用数组或表数组定义多个钩子：

```mise-toml [mise.toml]
[[hooks.cd]]
run = "echo 'I changed directories'"

[[hooks.cd]]
run = "echo 'I also changed directories'"
```

### 运行任务 {#task-hooks}

钩子可以运行 mise 任务，而不是内联命令：

```mise-toml [mise.toml]
[tasks.install-deps]
run = "echo 'install project dependencies here'"

[tasks.setup]
run = "echo 'setting up project'"
depends = ["install-deps"]

[hooks]
enter = { task = "setup" }
```

mise 会在子进程中通过 `mise run` 运行任务，因此依赖项、任务环境和文件任务都照常生效。任务钩子适用于
所有事件。

作为 `preinstall` 钩子运行时，任务不会先安装其缺失工具，因为它所准备的安装过程尚未开始。任务所需的
命令必须已由系统或先前的安装提供。

声明了 `secrets` 的任务不会从钩子中运行；参阅
[fnox](/environments/secrets/fnox.html#launchers-that-refuse-grants)。

## 目录钩子 {#directory-hooks}

在[激活 mise](/shell-setup.html)后，Shell 切换目录时会运行以下钩子，包括激活后的第一个提示符：

```toml [mise.toml]
[hooks]
enter = "echo 'I entered the project'"
leave = "echo 'I left the project'"
cd = "echo 'I changed directories'"
```

- `enter` 在从项目外进入项目时运行。在项目内切换目录不会再次运行。
- `leave` 在离开项目时运行。
- `cd` 在每次切换目录后仍位于项目内时运行，包括进入项目的那次切换。

项目是定义该钩子的配置文件所在项目根目录：即包含 `mise.toml` 的目录，或 `.config/mise/`、`.mise/`
的父目录。一次目录切换触发多个此类钩子时，依次运行 `leave`、`cd`、`enter`。首次加载项目配置时，
即使目录没有变化，`enter` 也会运行；例如在当前目录创建或信任 `mise.toml` 后。

全局配置（`~/.config/mise/config.toml`）中的钩子没有所属项目，因此全局 `enter`、`leave` 和 `cd` 钩子
会在每次目录切换时运行。

## 在当前 Shell 中运行 {#shell-hooks}

`enter`、`leave` 和 `cd` 钩子可以在当前 Shell 中运行，而不是新建进程，例如用于加载补全或设置 Shell
选项。不同形式下 `shell` 的含义不同：

| 形式                                  | 运行位置                                  |
| ------------------------------------- | ----------------------------------------- |
| `{ run = "...", shell = "bash -c" }` | 通过 `bash -c` 启动的新进程               |
| `{ script = "...", shell = "bash" }` | 当前 Shell，且仅当该 Shell 为 bash 时运行 |

使用 `script` 时，`shell` 指定 Shell 名称，例如 `bash`、`zsh` 或 `fish`。mise 会将脚本加入已激活 Shell
在提示符处求值的代码中；如果当前使用的是其他 Shell，则会跳过此钩子：

```toml [mise.toml]
[hooks.enter]
shell = "bash"
script = "source completions.sh"
```

`script` 接受字符串或行数组。`scripts` 只接受数组形式：

```toml [mise.toml]
[hooks.enter]
shell = "bash"
script = [
  "source completions.sh",
  "export PROJECT_READY=1",
]

[hooks.leave]
shell = "bash"
scripts = ["unset PROJECT_READY"]
```

mise 不会跟踪或撤销脚本所做的更改。若 `enter` 脚本导出了变量，则应在 `leave` 脚本中取消设置。若要由
mise 管理某个值的生命周期，请改用 [`[env]`](/environments/)。

## 安装钩子 {#preinstall-postinstall-hook}

mise 安装工具时会运行 `preinstall` 和 `postinstall`，例如执行 `mise install`、`mise use`，或在
`mise exec` 前自动安装时。它们不需要 `mise activate`：

```toml [mise.toml]
[hooks]
preinstall = "echo 'about to install tools'"
postinstall = "echo 'installed tools'"
```

- 即使从子目录运行 `mise install`，钩子也会以项目根目录为工作目录。`MISE_ORIGINAL_CWD` 保存运行命令时
  所在的目录。
- 仅当当前目录位于项目内时，才会运行该项目的安装钩子。
- 即使所有工具都已安装，`mise install` 仍会运行 `postinstall`；此时
  [`MISE_INSTALLED_TOOLS`](#mise-installed-tools) 的值为 `[]`。
- `preinstall` 使用的环境中不包含设置了 [`tools = true`](/environments/#lazy-eval) 的 `[env]` 条目，因为
  这些工具尚未安装。
- `mise install --dry-run` 会打印将要运行的安装钩子，但不实际运行。
- `postinstall` 可能会在启动安装的命令完成其自身操作（例如写入配置）之前运行。不要用它在
  `mise upgrade` 后重启服务；请在升级命令完成后再执行该步骤。

若要在某个特定工具安装完成后运行命令，请使用该工具的
[`postinstall` 选项](/dev-tools/#tool-postinstall-commands)。该选项会在工具安装完成后立即运行，而
`[hooks].postinstall` 则会在整个安装过程中运行一次。

## 监视文件 {#watch-files-hook}

激活 mise 后，`[[watch_files]]` 条目会在符合其某个模式的文件发生变化时运行命令或任务：

```mise-toml [mise.toml]
[[watch_files]]
patterns = ["src/**/*.rs"]
run = "cargo fmt"
```

- 模式是相对于项目根目录的 glob。`*` 不匹配 `/`；跨目录匹配请使用 `**`。
- `run` 使用默认的内联 Shell。添加 `shell = "bash -c"` 可选择其他 Shell；`shell` 仅适用于 `run`。
- 设置 `task = "sync-deps"` 可改为运行 mise 任务。请只设置 `run` 或 `task` 其中之一；两者都设置时，
  mise 会发出警告并运行任务。
- mise 只会从项目配置中读取 `[[watch_files]]`。全局配置中的条目会被忽略。

```toml [mise.toml]
[[watch_files]]
patterns = ["uv.lock"]
task = "sync-deps"
```

checkout、pull 或 rebase 会在你没有编辑文件的情况下重写文件，mise 也会将这些文件报告为已更改。如果所有已更改文件的最后写入时间都早于 git 上次移动 HEAD 的时间，mise 就会设置 `MISE_WATCH_FILES_GIT_REWRITTEN=1`，使命令可以跳过格式化未改动文件等操作：

```toml [mise.toml]
[[watch_files]]
patterns = ["**/*.go"]
run = '[ -n "$MISE_WATCH_FILES_GIT_REWRITTEN" ] || { IFS=:; hk fix $MISE_WATCH_FILES_MODIFIED; }'
```

只要有任一已更改文件的修改时间晚于上次 HEAD 移动时间，该变量就不会设置，因此 rebase 同时发生真实编辑时仍会运行命令。如果上次 HEAD 移动是由提交造成的，该变量也不会设置，因为提交不会重写你编辑的文件。`git checkout -b`、`git reset` 和 `git branch -m` 等不改变 HEAD 指向的提交的操作会被忽略。`git stash pop` 和 `git stash apply` 不会移动 HEAD；不伴随提交的 `git reset --hard` 也不会改变 HEAD，因此这些操作都无法检测到。

## 环境变量 {#hook-execution}

| 变量                             | 适用范围                                                    | 值                                                                          |
| -------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `MISE_PROJECT_ROOT`              | 所有钩子和 `watch_files`                                     | 项目根目录                                                                  |
| `MISE_CONFIG_ROOT`               | `[hooks]`                                                   | 定义该钩子的配置文件根目录                                                  |
| `MISE_ORIGINAL_CWD`              | 所有钩子和 `watch_files`                                     | 运行 mise 时所在的目录                                                     |
| `MISE_PREVIOUS_DIR`              | `enter`、`leave`、`cd`                                      | 切换前所在的目录                                                            |
| `MISE_INSTALLED_TOOLS`           | `postinstall`                                               | 已安装工具的 JSON 数组；参阅[下文](#mise-installed-tools)                 |
| `MISE_WATCH_FILES_MODIFIED`      | `watch_files`                                               | 发生变化的文件，以 `:` 分隔；名称中的 `:` 会转义为 `\:`                    |
| `MISE_WATCH_FILES_GIT_REWRITTEN` | `watch_files`                                               | 若 git 重写了所有已更改文件则为 `1`；否则未设置                            |
| `MISE_NO_HOOKS`                  | 新建进程运行的 `[hooks]` 命令、任务钩子、`watch_files` 任务 | 值为 `1`；钩子中运行的 `mise` 命令不会再次运行钩子                      |

全局钩子的 `MISE_PROJECT_ROOT` 为当前项目根目录；若没有活动项目，则为全局配置根目录。`MISE_CONFIG_ROOT`
始终为全局配置根目录。对于仅操作全局配置的命令（例如 `mise use --global`），两个变量都会指向全局
配置根目录，并且不会运行项目钩子。

## 多个配置文件中的钩子 {#several-config-files}

同一事件在多个已加载的配置文件中定义时，mise 会运行所有匹配的钩子，不会让某个文件覆盖其他文件。
钩子按配置文件的优先级从高到低运行。同一文件中的钩子数组则按列出的顺序运行。

例如，`conf.d/a.toml`、`conf.d/b.toml` 和 `conf.d/c.toml` 中的钩子依次按 `c`、`b`、`a` 运行，因为
字母顺序靠后的配置片段具有更高优先级。若钩子之间有顺序依赖，请将它们放在同一数组中。

## 关闭钩子 {#disable-hooks}

传入 `--no-hooks`、设置 `MISE_NO_HOOKS=1`，或设置
[`no_hooks = true`](/configuration/settings.html#no_hooks)，即可跳过 `[hooks]` 条目（`enter`、`leave`、
`cd`、`preinstall` 和 `postinstall`）以及 `[[watch_files]]` 条目中的命令和任务。
[安全模式](/security.html#safe-mode)（`MISE_SAFE=1`）也会跳过这些钩子。钩子关闭期间发生的文件变化，
之后不会触发相应条目。

此标志、环境变量和设置不会影响工具自身的 `postinstall` 选项。

## `MISE_INSTALLED_TOOLS` {#mise-installed-tools}

`postinstall` 钩子会收到 `MISE_INSTALLED_TOOLS`，这是包含 mise 所安装工具的 JSON 数组，每个工具对应
一个条目：

```toml [mise.toml]
[hooks]
postinstall = '''
echo "Installed: $MISE_INSTALLED_TOOLS"
'''
```

```text
Installed: [{"name":"node","version":"24.4.1","requested_version":"24","backend":"core:node","install_path":"/home/user/.local/share/mise/installs/node/24.4.1"}]
```

| 字段                 | 含义                                                           | 示例                                      |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `name`              | 工具的短名称                                                   | `node`                                    |
| `version`           | 已安装的版本                                                   | `24.4.1`                                  |
| `requested_version` | 解析前请求的版本；若请求固定到完整版本，则与 `version` 相同    | `latest`、`24`、`lts`、`ref:main`          |
| `backend`           | 安装该工具的后端，不含选项或 URL 凭据                          | `core:node`、`npm:prettier`                |
| `install_path`      | 此安装的目录，不会是 `latest` 等浮动链接                        | `~/.local/share/mise/installs/node/24.4.1` |

通常，`requested_version` 是配置文件或命令行中的版本字符串。ref 选择器会规范化为 `:` 形式，因此
`ref-main` 会报告为 `ref:main`。钩子可以根据此值执行不同操作，无需读取配置文件；而对于刚完成的安装，
`postinstall` 钩子无法可靠地读取配置文件获取这些信息：

```toml [mise.toml]
[hooks]
postinstall = '''
echo "$MISE_INSTALLED_TOOLS" | jq -r '
  .[] | select(.requested_version == "latest") | "\(.name) floats on latest, got \(.version)"'
'''
```

若只想对实际安装执行操作，请先检查数组是否为 `[]`。部分安装失败时，数组会列出成功安装的工具，
mise 会在钩子运行后报告失败。

## 已弃用语法 {#deprecated-syntax}

在 `preinstall` 和 `postinstall` 中，`script` 或 `scripts` 表会像 `run` 一样以新建进程运行；在未设置
`shell` 的 `enter`、`leave` 或 `cd` 钩子中也如此。此形式已弃用，请改用 `run`，并将在 mise 2027.3.0
中移除。

在 `preinstall` 和 `postinstall` 中，与 `script` 或 `scripts` 一同设置的 `shell` 会被忽略，mise 也会发出
警告。在 `enter`、`leave` 或 `cd` 中使用 `script` 或 `scripts` 并设置 `shell`（例如 `shell = "bash"`），
则属于[当前 Shell 形式](#shell-hooks)，并未弃用。
