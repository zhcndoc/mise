---
description: "在 mise.toml 的 [tasks] 表中定义简短命令和任务组。"
---

# TOML 任务

如果任务命令只有一两行，或主要负责运行其他任务，可以在 `mise.toml` 中定义。较长的脚本应移到[文件任务](/tasks/file-tasks.html)，以便编辑器为其提供语法高亮和 lint 检查。

## 定义任务

最简写法是将任务名称映射到命令：

```toml [mise.toml]
[tasks]
build = "cargo build"
test = "cargo test"
lint = "cargo clippy"
```

如需添加属性，请为任务单独创建一个表：

```mise-toml [mise.toml]
[tasks.build]
description = "Build the CLI"
run = "cargo build"
```

下文通过示例介绍各项属性。完整列表请参阅[任务配置参考](/tasks/task-configuration.html)。

### 从命令行添加任务

[`mise tasks add`](/cli/tasks/add.html) 会将任务写入 `mise.toml`：

```sh
mise tasks add pre-commit --depends "test" --depends "render" -- echo pre-commit
```

执行后会添加：

```mise-toml [mise.toml]
[tasks.pre-commit]
depends = ["test", "render"]
run = "echo pre-commit"
```

## 常用属性

### 运行命令

`run` 可以是单条命令，也可以是命令数组：

```mise-toml
[tasks.test]
run = "cargo test"
```

```mise-toml
[tasks.test]
run = [
  "cargo test",
  "./scripts/test-e2e.sh",
]
```

数组中的命令会按顺序运行。任一命令失败时，任务会停止，后续命令不会运行。额外的命令行参数会传给最后一条命令。数组元素也可以运行其他任务；详见[按顺序运行步骤](/tasks/architecture.html#run-steps-in-order)。

在 Windows 上，`run_windows` 会替代 `run`：

```mise-toml
[tasks.test]
run = "cargo test"
run_windows = "cargo test --features windows"
```

### 工作目录

任务默认从[配置根目录](/configuration.html#config-root)运行。设置 <span v-pre>`dir = "{{cwd}}"`</span> 可改为从调用 mise 时所在的目录运行：

```mise-toml
[tasks.test]
run = "cargo test"
dir = "{{cwd}}"
```

`MISE_ORIGINAL_CWD` 也保存了该目录。其他可用值请参阅[`dir`](/tasks/task-configuration.html#dir)。

### 描述和别名

```mise-toml
[tasks.build]
description = "Build the CLI"
run = "cargo build"
alias = "b"
```

现在，`mise run b` 会运行 `build`。描述会显示在[`mise tasks ls`](/cli/tasks/ls.html) 中，也会显示在不带任务名称运行[`mise run`](/cli/run.html)时打开的选择器中。

为辅助任务设置 `hide = true`，即可让它不出现在 `mise tasks ls` 中。你仍然可以按名称运行它；`mise tasks ls --hidden` 会将其列出。

### 依赖项

依赖项会先于任务运行。任一依赖失败时，任务不会运行：

```mise-toml
[tasks.build]
run = "cargo build"

[tasks.test]
depends = ["build"]
run = "cargo test"
```

`depends` 与 `wait_for`、`depends_post` 和运行步骤的对比，请参阅[依赖项与执行顺序](/tasks/architecture.html)。

### 环境变量

`env` 只为当前任务设置变量，不会影响其依赖项：

```mise-toml
[tasks.test]
env = { RUST_BACKTRACE = "1" }
run = "cargo test"
```

`[env]` 中的项目级[环境变量](/environments/)会传给每个任务。如果命令需要某个值，但不应将其导出到环境中，请使用[`[vars]`](/configuration/vars.html)：

```mise-toml [mise.toml]
[env]
VERBOSE_ARGS = "--verbose"

[vars]
e2e_args = "--headless"

[tasks.test]
run = "./scripts/test-e2e.sh {{vars.e2e_args}} $VERBOSE_ARGS"
```

### 源文件和输出文件

设置[`sources`](/tasks/task-configuration.html#sources) 和[`outputs`](/tasks/task-configuration.html#outputs)后，只要输出文件仍是最新状态，mise 就会跳过任务。示例请参阅[跳过已是最新状态的任务](/tasks/running-tasks.html#skip-tasks-that-are-up-to-date)，检查方式请参阅[任务缓存](/tasks/caching.html)。单独设置 `sources` 也会告知[`mise watch`](/cli/watch.html)要监视哪些文件。在运行脚本中，模板函数[`task_source_files()`](/templates.html#task-source-files)会返回与 `sources` 匹配的文件。

### 确认

`confirm` 会在任务自身的命令运行前提示确认：

```toml
[tasks.release]
confirm = "Are you sure you want to cut a new release?"
description = "Cut a new release"
file = "scripts/release.sh"
```

提示出现时，任务的 `depends` 已经运行。如需在这些依赖工作开始前确认，请在依赖任务上设置确认提示，或将它们作为[运行步骤](/tasks/architecture.html#run-steps-in-order)调用。详见[`confirm`](/tasks/task-configuration.html#confirm)。

### 守护进程 <Badge type="warning" text="实验性" />

::: warning 实验性功能
守护进程要求在 `[settings]` 下设置 `experimental = true`。
:::

设置 `daemons = "postgres"` 可启动[项目守护进程](/daemons.html#tasks-that-require-daemons)，并在任务运行前等待守护进程就绪。任务完成后，守护进程会继续运行。可用值请参阅[`daemons`](/tasks/task-configuration.html#daemons)。

## 指定 Shell 或解释器 {#shell-shebang}

在 Unix 上，内联命令默认通过[`sh -o errexit -c`](/configuration/settings.html#unix_default_inline_shell_args)运行，因此遇到首条失败命令时脚本就会停止。添加 `set +e` 可让脚本继续执行：

```mise-toml
[tasks.cleanup]
run = '''
set +e
cd /nonexistent
echo "This does not fail the task"
'''
```

Windows 上默认使用[`cmd /c`](/configuration/settings.html#windows_default_inline_shell_args)。设置 `shell` 可使用其他 Shell 运行任务命令：

```mise-toml
[tasks.lint]
shell = "bash -c"
run = "cargo clippy"
```

也可以在脚本开头添加 shebang：

```mise-toml
[tasks.lint]
run = '''
#!/usr/bin/env bash
cargo clippy
'''
```

使用自定义 `shell`（包括 `sh -c` 或 `bash -c`）、shebang 脚本或 Windows 默认的 `cmd /c` 时，脚本不会在首条失败命令处停止。请自行在脚本中添加 `set -e`（或 `set -euo pipefail`）：

```mise-toml
[tasks.lint]
run = '''
#!/usr/bin/env bash
set -euo pipefail
cargo clippy
'''
```

mise 会将带 shebang 的任务作为脚本文件运行。未在[用法规范](/tasks/task-arguments.html)中定义的额外参数会作为普通参数传给脚本，例如 Bash 中的 `$1` 和 `$@`：

```mise-toml
[tasks.greet]
run = '''
#!/usr/bin/env bash
echo "hello $1"
'''
```

```sh
mise run greet world
# hello world
```

如果没有 shebang，mise 会将参数追加到最后一条命令中，因此 `$1` 为空。

### 其他语言

shebang 或 `shell` 可让任务使用任意解释器运行，例如 Python、Node.js 或 Ruby：

::: code-group

```mise-toml [python]
[tools]
python = "latest"

[tasks.python_task]
run = '''
#!/usr/bin/env python
for i in range(10):
    print(i)
'''
```

```mise-toml [python + uv]
[tools]
uv = "latest"

[tasks.python_uv_task]
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

```mise-toml [node]
[tools]
node = "24"

[tasks.node_task]
shell = "node -e"
run = [
  "console.log('First line')",
  "console.log('Second line')",
]
```

```mise-toml [bun]
[tools]
bun = "latest"

[tasks.bun_shell]
description = "https://bun.sh/docs/runtime/shell"
run = '''
#!/usr/bin/env bun

import { $ } from "bun";
const response = await fetch("https://example.com");
await $`cat < ${response} | wc -c`; // 1256
'''
```

```mise-toml [deno]
[tools]
deno = "latest"

[tasks.deno_task]
run = '''
#!/usr/bin/env -S deno run
console.log(`Hello from Deno ${Deno.version.deno}`)
'''
```

```mise-toml [ruby]
[tools]
ruby = "latest"

[tasks.ruby_task]
run = '''
#!/usr/bin/env ruby
puts 'Hello, ruby!'
'''
```

:::

::: details 什么是 shebang？`-S` 有什么作用？

shebang 是脚本开头的 `#!` 字符序列，用于指定解释脚本的程序。`#!/usr/bin/env python` 会使用 `PATH` 中找到的 `python` 运行脚本。在 Linux 和 macOS 上，系统会执行 shebang 行，因此 [`env`](https://manpages.ubuntu.com/manpages/jammy/man1/env.1.html) 会从 `PATH` 中查找 `python`。Windows 不支持 shebang：mise 会读取该行，去掉开头的 `/usr/bin/env` 或 `/usr/bin/env -S`，然后自行启动指定的解释器。

`-S` 会将该行的其余部分拆分为多个参数，因此可以向解释器传递选项。例如，`#!/usr/bin/env -S python -u` 会以无缓冲模式运行 Python。

:::

### 简单命令无需 Shell 即可运行

在 Unix 上，任务使用默认 Shell 时，mise 可以直接启动 `node build.js` 这样的简单内联命令，而无需经过 `sh`。使用 Shell 语法（引号、展开、运算符或内建命令）的命令，或运行时设置了 `ENV`、`BASH_ENV` 的命令，仍会经过 Shell；沙箱任务和设置了 `cache.audit = true` 的任务也一样。任务的 `shell`、`mise run --shell` 或 `unix_default_inline_shell_args` 设置始终会使用 Shell，即使指定的是默认 Shell。因此，如果必须运行 `PATH` 中名为 `sh` 的包装器，请显式设置该项。

## 使用本地文件或远程脚本 {#using-a-file-or-remote-script}

`file` 用于运行脚本文件，而不是内联命令：

```toml
[tasks.release]
description = "Cut a new release"
file = "scripts/release.sh"
```

<a id="remote-tasks"></a>

### 远程任务

`file` 也可以从 URL 获取脚本。mise 会下载并运行该脚本，因此只能使用可信来源。

#### HTTP

```toml
[tasks.build]
file = "https://example.com/build.sh"
```

#### Git

::: code-group

```toml [ssh]
[tasks.build]
file = "git::ssh://git@github.com/myorg/example.git//myfile?ref=v1.0.0"
```

```toml [https]
[tasks.build]
file = "git::https://github.com/myorg/example.git//myfile?ref=v1.0.0"
```

:::

URL 格式为 `git::<protocol>://<repository>.git//<path>?ref=<ref>`，其中 `ref` 是可选的分支、标签或提交。各字段说明请参阅 [Git URL 语法](/tasks/task-discovery.html#git-url-syntax)。

#### 缓存

mise 会将每个远程任务文件缓存到 `MISE_CACHE_DIR`，在运行 `mise cache clear` 前不会重新下载。如需获取最新副本，请传入 `mise run --no-cache`，或设置 [`task.remote_no_cache`](/configuration/settings.html#task.remote_no_cache)（`MISE_TASK_REMOTE_NO_CACHE=1`）。

## 参数 {#arguments}

使用 `usage` 规范定义参数。mise 会解析规范，并将每个值作为 `usage_*` 环境变量传给命令：

```mise-toml
[tasks.test]
usage = '''
arg "<file>" help="Test file to run" default="all"
flag "--format <format>" help="Output format" default="text"
'''
run = 'echo "Testing ${usage_file?} with format ${usage_format?}"'
```

规范语法请参阅[任务参数](/tasks/task-arguments.html)。未定义规范时，额外参数会[转发](/tasks/running-tasks.html#pass-arguments)给命令。`run` 中仍使用 `arg()`、`option()` 或 `flag()` 的任务应参考[迁移指南](/tasks/task-arguments.html#tera-templates)。
