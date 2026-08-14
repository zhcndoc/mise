# 钩子

你可以让 mise 在 `mise activate` 会话期间自动执行脚本。除了 `preinstall` 和 `postinstall` 钩子之外，  
如果你的 shell 中没有安装 `mise activate` shell 钩子，就不能使用这些功能。  
配置写入 `mise.toml`。

## CD 钩子

只要目录发生更改，就会运行此钩子。

```toml
[hooks]
cd = "echo 'I changed directories'"
```

## 进入钩子

当进入项目时运行此钩子。在项目中更改目录不会再次触发此钩子。

```toml
[hooks]
enter = "echo 'I entered the project'"
```

## 离开钩子

当项目被离开时运行此钩子。在项目中切换目录不会触发此钩子。

```toml
[hooks]
leave = "echo '我离开了项目'"
```

## 预安装/后安装钩子

这些钩子分别在工具安装前后运行。与其他钩子不同，这些钩子不需要 `mise activate`。
它们以项目根目录作为工作目录，即使从子目录调用 `mise install` 也是如此。调用目录仍可通过
`MISE_ORIGINAL_CWD` 获取。

```toml
[hooks]
preinstall = "echo '我即将安装工具'"
postinstall = "echo '我刚刚安装了工具'"
```

字符串形式的钩子是 `run` 钩子的简写。当你需要选择内联 shell 命令时，请使用钩子表：

```toml
[hooks]
postinstall = { run = "echo '已安装'", shell = "bash -c" }
```

与任务一样，内联钩子表可以通过 `run_windows` 定义 Windows 特定命令。
在 Windows 上，mise 会在设置了 `run_windows` 时使用它；否则使用 `run`。在其他
平台上，只有 `run_windows` 的钩子会被跳过。

```toml
[hooks]
postinstall = { run = "echo installed", run_windows = "Write-Output installed" }
```

对于 `preinstall` 和 `postinstall`，`script = ...` 和 `scripts = ...` 是 `run = ...` 的旧版别名。如果在 `script`/`scripts` 钩子上同时设置了 `shell`，mise 会发出警告，说明该 shell 设置会被忽略，并仍然使用默认的内联 shell 运行脚本。要选择内联 shell 命令，请使用带有 `shell = "bash -c"` 的 `run = ...`。安装钩子中的 `script` 和 `scripts` 别名已弃用。

即使 `mise install` 没有发现任何需要安装的内容（所有已配置的工具都已存在），它仍然会运行 `postinstall` 钩子——在无操作安装时它不会被跳过。

`postinstall` 钩子会接收一个名为 `MISE_INSTALLED_TOOLS` 的环境变量，其中包含一个 JSON 数组，表示刚刚安装的工具；如果没有安装任何内容，则为 `[]`（例如无操作安装）。只应在真实安装时执行的钩子可以通过检查 `MISE_INSTALLED_TOOLS != "[]"` 来进行保护：

```toml
[hooks]
postinstall = '''
echo "已安装：$MISE_INSTALLED_TOOLS"
# 示例输出：[{"name":"node","version":"20.10.0"},{"name":"python","version":"3.12.0"}]
'''
```

## 工具级 postinstall

单个工具可以使用 `postinstall` 选项定义自己的 postinstall 脚本。这些脚本会在每个工具安装后立即运行（在同一会话中的其他工具安装之前）：

```toml
[tools]
node = { version = "20", postinstall = "npm install -g pnpm" }
python = { version = "3.12", postinstall = "pip install pipx" }
```

工具级 postinstall 脚本会接收以下环境变量：

- `MISE_TOOL_NAME`: 工具的简称（例如 "node"、"python"）
- `MISE_TOOL_VERSION`: 已安装的版本（例如 "20.10.0"、"3.12.0"）
- `MISE_TOOL_INSTALL_PATH`: 工具的安装路径
- 来自该工具 `install_env` 选项中的变量。

## 任务 hooks

hooks 可以引用 mise 任务，而不是内联脚本。任务会通过 `mise run` 作为子进程执行，因此它会复用完整的任务系统，包括依赖、环境变量以及基于文件的任务定义。

```toml
[tasks.setup]
run = "echo 'setting up project'"
depends = ["install-deps"]

[hooks]
enter = { task = "setup" }
```

你可以在数组中混合使用任务引用和内联脚本：

```toml
[hooks]
enter = ["echo 'entering project'", { task = "setup" }]
```

任务 hooks 适用于所有 hook 类型（`enter`、`leave`、`cd`、`preinstall`、`postinstall`）。

用作 `preinstall` hooks 的任务引用不会自动安装缺失的项目级或任务级工具。这样可以让该 hook 保持在它所准备的安装操作之前。`preinstall` 任务所需的命令必须已经可从系统或现有安装中获得。其他由任务支持的 hook 类型仍会保留正常的任务工具安装行为。

## 监视文件钩子

在使用 `mise activate` 时，你可以让 mise 监视文件变化，并在文件发生变化时执行脚本或任务。

```toml
[[watch_files]]
patterns = ["src/**/*.rs"]
run = "cargo fmt"
```

默认情况下，`run` 使用已配置的内联 shell：
[`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)
或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)。
为文件监视钩子添加 `shell = "bash -c"` 以选择不同的内联 shell 命令：

```toml
[[watch_files]]
patterns = ["*.js"]
run = "eslint --fix ."
shell = "bash -c"
```

`shell` 仅适用于 `run` 钩子。你也可以引用一个 mise 任务，而不是内联脚本：

```toml
[[watch_files]]
patterns = ["uv.lock"]
task = "sync-deps"
```

每个 `[[watch_files]]` 条目应当包含 `run` 或 `task` 之一，但不能同时包含两者。

此钩子会设置以下环境变量：

- `MISE_WATCH_FILES_MODIFIED`：一个以冒号分隔的已修改文件列表。冒号使用反斜杠进行转义。

## 钩子执行

钩子会在设置了以下环境变量的情况下执行：

- `MISE_ORIGINAL_CWD`：用户所在的目录。
- `MISE_PROJECT_ROOT`：项目的根目录。
- `MISE_PREVIOUS_DIR`：目录更改之前用户所在的目录（仅在发生目录更改时）。
- `MISE_INSTALLED_TOOLS`：已安装工具的 JSON 数组（仅用于 `postinstall` 钩子）。

内联 `run` 钩子可以针对任何钩子类型写成 `{ run = "..." }`。字符串简写
（`enter = "echo hi"`）等同于 `{ run = "echo hi" }`。

`run` 和 `run_windows` 必须是字符串。`run = ["echo one", "echo two"]` 不受支持。

要运行彼此独立启动的内联命令，请定义多个钩子。每个钩子条目都是一次单独的
执行，因此 mise 会为每个 `run` 条目启动一个子进程：

```toml
[hooks]
enter = [
  { run = "echo one" },
  { run = "echo two" },
]
```

要在一个启动的命令中运行多行 shell 命令，请使用一个多行 `run` 字符串。这是一次钩子
执行和一个子进程：

```toml
[hooks.enter]
run = """
echo one
echo two
"""
```

`run` 钩子会在子进程中使用默认的内联 shell 执行：
[`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args)
或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)。
向 `run` 钩子表添加 `shell = "bash -c"` 以选择不同的内联 shell 命令。与任务的
`shell` 类似，该值应同时包含程序以及用于求值内联命令的参数，
例如 `bash -c`、`zsh -c` 或 `pwsh -Command`。

## Shell 钩子

`enter`、`leave` 和 `cd` 钩子可以在当前 shell 中执行，例如，如果你想在进入某个目录时添加 bash 补全：

```toml
[hooks.enter]
shell = "bash"
script = "source completions.sh"
```

当前 shell 钩子可以使用 `script`/`scripts` 数组：

```toml
[hooks.enter]
shell = "bash"
script = [
  "source completions.sh",
  "export PROJECT_READY=1",
]

[hooks.leave]
shell = "bash"
scripts = [
  "unset PROJECT_READY",
]
```

带有 `shell` 的 `script` 用于当前 shell 钩子。这里的 `shell` 是一个 shell 名称选择器，例如
`bash`、`zsh` 或 `fish`，而不是像 `bash -c` 这样的内联 shell 命令。只有当当前激活的 `mise activate` shell 匹配时，mise 才会打印该脚本。

当钩子应在子进程中作为内联命令执行时，请使用 `run`。`preinstall` 和
`postinstall` 没有当前 shell，因此其中的 `script`/`scripts` 仅作为
`run` 的旧版别名保留；如果在这些钩子中通过 `script`/`scripts` 设置了 `shell`，则该设置会被忽略。

::: warning
我觉得这应该是不言自明的，但万一不是的话，这并不会像 `mise.toml` 中的 `[env]` 那样在你 _离开_ 目录时执行任何清理操作。你实际上只是
在进入目录时执行 shell 代码，而 mise 完全没有办法跟踪这一点。
我认为这个问题没有解决方案，这很可能也是 direnv 从未实现类似功能的原因。

不过我认为在大多数情况下这可能没问题，只是值得记住这一点。

:::

## 多个钩子语法

你可以使用数组在同一个文件中定义多个钩子：

```toml
[hooks]
enter = [
  "echo 'I entered the project'",
  { run = "echo 'I am in the project'" }
]

[[hooks.cd]]
run = "echo 'I changed directories'"
[[hooks.cd]]
run = "echo 'I also changed directories'"
]```
