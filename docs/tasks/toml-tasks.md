# 基于 TOML 的任务

任务可以通过不同方式在 `mise.toml` 文件中定义。简单的任务可以写在 `[tasks]` 部分中，而更详细的任务则分别拥有自己的独立部分。

## 简单任务示例

```mise-toml [mise.toml]
build = "cargo build"
test = "cargo test"
lint = "cargo clippy"
```

## 详细任务示例

```mise-toml [mise.toml]
[tasks.cleancache]
run = "rm -rf .cache"
hide = true # 从列表中隐藏此任务

[tasks.clean]
depends = ['cleancache']
run = "cargo clean" # 作为 shell 命令运行

[tasks.build]
description = '构建 CLI'
run = "cargo build"
alias = 'b' # `mise run b`

[tasks.test]
description = '运行自动化测试'
# 按顺序运行多个命令
run = [
    'cargo test',
    './scripts/test-e2e.sh',
]
dir = "{{cwd}}" # 在用户的 cwd 中运行，默认为项目的基础目录

[tasks.lint]
description = '使用 clippy 进行 lint'
env = { RUST_BACKTRACE = '1' } # 脚本的环境变量
# 你可以指定多行脚本，而不是单独的命令
run = '''
#!/usr/bin/env bash
cargo clippy
'''

[tasks.ci] # 仅运行依赖项
description = '运行 CI 任务'
depends = ['build', 'lint', 'test']

[tasks.release]
confirm = '确定要发布一个新版本吗？'
description = '发布一个新版本'
file = 'scripts/release.sh' # 执行外部脚本
```

你可以使用[环境变量](/environments/)或 [`vars`](/configuration/vars) 来定义通用参数：

```mise-toml [mise.toml]
[env]
VERBOSE_ARGS = '--verbose'

# 变量可以在任务之间像环境变量一样共享，
# 但它们不会作为环境变量传递给脚本
[vars]
e2e_args = '--headless'

[tasks.test]
run = './scripts/test-e2e.sh {{vars.e2e_args}} $VERBOSE_ARGS'
```

## 添加任务

你可以直接编辑 `mise.toml` 文件，或者使用 [`mise tasks add`](/cli/tasks/add)

```shell
mise tasks add pre-commit --depends "test" --depends "render" -- echo pre-commit
```

这将把以下内容添加到 `mise.toml` 中：

```shell
[tasks.pre-commit]
depends = ["test", "render"]
run = "echo pre-commit"
```

## 常用选项

完整列表请参见[任务配置](/tasks/task-configuration)。

### 运行命令

提供要运行的脚本。可以是单个命令，也可以是命令数组：

```mise-toml
[tasks.test]
run = 'cargo test'
```

命令按顺序执行。如果某个命令失败，任务将停止，剩余命令不会运行。

```mise-toml
[tasks.test]
run = [
    'cargo test',
    './scripts/test-e2e.sh',
]
```

你可以通过使用 `run_windows` 键来指定在 Windows 上运行的替代命令：

```mise-toml
[tasks.test]
run = 'cargo test'
run_windows = 'cargo test --features windows'
```

### 指定使用哪个目录

[`dir`](/tasks/task-configuration.html#dir) 属性决定任务执行时的 `cwd`。你可以使用任务运行时所在的目录，通过 <span v-pre>`dir = "{{cwd}}"`</span>：

```mise-toml
[tasks.test]
run = 'cargo test'
dir = "{{cwd}}"
```

此外，`MISE_ORIGINAL_CWD` 会被设置为原始工作目录，并传递给该任务。

### 添加描述和别名

你可以为任务添加描述和别名。

```mise-toml
[tasks.build]
description = '构建 CLI'
run = "cargo build"
alias = 'b' # `mise run b`
```

- 该别名可用于运行此任务
- 在不带参数运行 [`mise tasks ls`](/cli/tasks/ls.html) 或 [`mise run`](/cli/run.html) 时，会显示该描述。

```shell
❯ mise run
Tasks
# Select a task to run
# > build  构建 CLI
#   test   运行测试
```

### 依赖项

你可以为任务指定依赖项。依赖项会在任务本身之前运行。如果某个依赖失败，任务将不会运行。

```mise-toml
[tasks.build]
run = 'cargo build'

[tasks.test]
depends = ['build']
```

还有其他指定依赖项的方法，参见 [wait_for](/tasks/task-configuration.html#wait-for) 和 [depends_post](/tasks/task-configuration.html#depends-post)

### 环境变量

你可以为任务指定环境变量：

```mise-toml
[tasks.lint]
description = '使用 clippy 进行 lint'
env = { RUST_BACKTRACE = '1' } # 脚本的环境变量
# 你可以指定多行脚本，而不是单独的命令
run = '''
#!/usr/bin/env bash
cargo clippy
'''
```

### 源文件 / 输出文件

如果你想在某些文件没有变化时跳过执行任务（即已是最新），应指定 `sources` 和 `outputs`：

```mise-toml
[tasks.build]
description = '构建 CLI'
run = "cargo build"
sources = ['Cargo.toml', 'src/**/*.rs'] # 如果这些文件没有变化，则跳过运行
outputs = ['target/debug/mycli']
```

如果与 [`mise watch`](/cli/watch.html) 一起使用，你也可以只使用 `sources` 来在源文件变化时运行任务。
你可以在任务的[模板](../templates.md)中使用 [`task_source_files()`](../templates.md#task-source-files) 函数来获取其 `sources` 的解析路径。

### 确认

运行任务前显示的一条消息。任务运行前会提示用户确认。

```mise-toml
[tasks.release]
confirm = '你确定要发布一个新版本吗？'
description = '发布一个新版本'
file = 'scripts/release.sh'
```

## 指定 shell 或解释器 {#shell-shebang}

如果 shell 是 `sh`、`bash` 或 `zsh`，任务会使用 `set -e`（`set -o erropt`）执行。这意味着只要有任何命令失败，脚本就会退出。你可以在脚本中运行 `set +e` 来禁用这一行为。

```mise-toml
[tasks.echo]
run = '''
set +e
cd /nonexistent
echo "This will not fail the task"
'''
```

你可以指定一个 `shell` 命令来运行脚本（默认是 [`sh -c`](/configuration/settings.html#unix_default_inline_shell_args) 或 [`cmd /c`](/configuration/settings.html#windows_default_inline_shell_args)）：

```mise-toml
[tasks.lint]
shell = 'bash -c'
run = "cargo clippy"
```

或者使用 shebang：

```mise-toml
[tasks.lint]
run = '''
#!/usr/bin/env bash
cargo clippy
'''
```

Shebang 任务会作为脚本文件执行。未在 [`usage` 规范](/tasks/task-arguments#usage-field)中定义的额外参数会作为普通脚本参数传递，例如 Bash 中的 `$1` 和 `$@`：

```mise-toml
[tasks.greet]
run = '''
#!/usr/bin/env bash
echo "hello $1"
'''
```

```shell
$ mise run greet world
hello world
```

通过使用 `shebang`（或 `shell`），你可以使用不同的语言运行任务（例如 Python、Node.js、Ruby 等）：

::: code-group

```mise-toml [python]
[tools]
python = 'latest'

[tasks.python_task]
run = '''
#!/usr/bin/env python
for i in range(10):
    print(i)
'''
```

```mise-toml [python + uv]
[tools]
uv = 'latest'

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
node = 'lts'

[tasks.node_task]
shell = 'node -e'
run = [
  "console.log('First line')",
  "console.log('Second line')",
]
```

```mise-toml [bun]
[tools]
bun = 'latest'

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
deno = 'latest'

[tasks.deno_task]
description = "使用 Deno 导入的更复杂任务"
run = '''
#!/usr/bin/env -S deno run
import ProgressBar from "jsr:@deno-library/progress";
import { delay } from "jsr:@std/async";

if (!confirm('开始下载？')) {
    Deno.exit(1);
}

const progress = new ProgressBar({ title:  "正在下载：", total: 100 });
let completed = 0;
async function download() {
  while (completed <= 100) {
    await progress.render(completed++);
    await delay(10);
  }
}
await download();
'''
# ❯ mise run deno_task
# [download_task] $ import ProgressBar from "jsr:@deno-library/progress";
# 开始下载？ [y/N] y
# 正在下载： ...
```

```mise-toml [ruby]
[tools]
ruby = 'latest'

[tasks.ruby_task]
run = '''
#!/usr/bin/env ruby
puts 'Hello, ruby!'
'''
```

:::

::: details 什么是 shebang？`#!/usr/bin/env` 和 `#!/usr/bin/env -S` 有什么区别

shebang 是脚本文件开头的字符序列 `#!`，它告诉系统应该使用哪个程序来解释/执行该脚本。
[env 命令](https://manpages.ubuntu.com/manpages/jammy/man1/env.1.html) 来自 GNU Coreutils。`mise` 不使用 `env`，但行为会类似。

例如，`#!/usr/bin/env python` 会使用 `PATH` 中找到的 Python 解释器来运行脚本。

`-S` 标志允许向解释器传递多个参数。
它会把该行剩余部分视为一个需要拆分的参数字符串。

当你需要指定解释器标志或选项时，这很有用。
例如：`#!/usr/bin/env -S python -u` 会以无缓冲输出模式运行 Python。

:::

## 使用文件或远程脚本

你可以指定一个文件作为任务运行：

```mise-toml
[tasks.release]
description = '创建一个新发布'
file = 'scripts/release.sh' # 执行外部脚本
```

### 远程任务

任务文件可以通过多种协议从远程获取：

#### HTTP

```mise-toml
[tasks.build]
file = "https://example.com/build.sh"
```

请注意，该文件将被下载并执行。请确保你信任该来源。

#### Git <Badge type="warning" text="实验性" />

::: code-group

```mise-toml [ssh]
[tasks.build]
file = "git::ssh://git@github.com/myorg/example.git//myfile?ref=v1.0.0"
```

```mise-toml [https]
[tasks.build]
file = "git::https://github.com/myorg/example.git//myfile?ref=v1.0.0"
```

:::

URL 格式必须遵循以下模式 `git::<protocol>://<url>//<path>?<ref>`

必填字段：

- `protocol`：Git 仓库 URL。
- `url`：Git 仓库 URL。
- `path`：仓库中文件的路径。

可选字段：

- `ref`：Git 引用（分支、标签、提交）。

#### 缓存

每个任务文件都会缓存在 `MISE_CACHE_DIR` 目录中。如果文件已更新，除非清除缓存，否则不会重新下载。

:::tip
你可以通过运行 `mise cache clear` 来重置缓存。
:::

你可以使用 `MISE_TASK_REMOTE_NO_CACHE` 环境变量来禁用远程任务的缓存。

## 参数

::: tip
有关任务参数的完整信息，请参阅专门的[任务参数](/tasks/task-arguments)页面。
:::

默认情况下，参数会传递给 `run` 数组中的最后一个脚本。因此，如果一个任务定义为：

```mise-toml
[tasks.test]
run = ['cargo test', './scripts/test-e2e.sh']
```

那么运行 `mise run test foo bar` 会把 `foo bar` 传递给 `./scripts/test-e2e.sh`，但不会传递给
`cargo test`。

### 推荐：使用 Usage 字段

定义参数的推荐方式是使用 `usage` 字段：

```mise-toml
[tasks.test]
usage = '''
arg "<file>" help="要运行的测试文件" default="all"
flag "--format <format>" help="输出格式" default="text"
flag "-v --verbose" help="启用详细输出"
'''
run = 'cargo test ${usage_file?} --format ${usage_format?}'
```

在 usage 字段中定义的参数可作为以 `usage_` 为前缀的环境变量使用。

完整文档请参阅[任务参数](/tasks/task-arguments#usage-field)页面。

### Tera 模板函数 <Badge type="danger" text="已弃用" />

::: danger 已弃用 - 将于 2027.5.0 移除
在运行脚本中使用 Tera 模板函数（`arg()`、`option()`、`flag()`）**已弃用**，并且将于 **mise 2027.5.0** 中**移除**。版本 >= 2026.5.0 将显示弃用警告。

**移除原因：**

- 在规格收集期间模板函数会返回空字符串（两遍解析问题）
- Shell 转义规则复杂且不可预测
- 在 TOML/文件任务之间无法稳定一致地工作

**请迁移到改用 `usage` 字段。** 参见[迁移指南](/tasks/task-arguments#tera-templates)。
:::

<details>
<summary>点击查看已弃用的 Tera 模板语法（不推荐）</summary>

你可以使用 Tera 模板函数定义参数（已弃用）：

```mise-toml
[tasks.test]
run = [
    'cargo test {{arg(name="cargo_test_args", var=true)}}',
    './scripts/test-e2e.sh {{option(name="e2e_args")}}',
]
```

那么运行 `mise run test foo bar` 会把 `foo bar` 传递给 `cargo test`。
`mise run test --e2e-args baz` 会把 `baz` 传递给 `./scripts/test-e2e.sh`。

#### 位置参数

这些参数在脚本中使用 <span v-pre>`{{arg()}}`</span> 定义。它们用于顺序很重要的位置参数。

示例：

```mise-toml
[tasks.test]
run = 'cargo test {{arg(name="file")}}'
# 执行：mise run test my-test-file
# 运行：cargo test my-test-file
```

- `i`：参数的索引。可用于指定参数顺序。默认值为它们在脚本中的定义顺序。
- `name`：参数的名称。用于帮助/错误消息。
- `var`：如果为 `true`，可以传递多个参数。
- `default`：如果未提供该参数，则使用默认值。

#### 选项

这些参数在脚本中使用 <span v-pre>`{{option()}}`</span> 定义。它们用于有名称的参数，顺序不重要。

示例：

```mise-toml
[tasks.test]
run = 'cargo test {{option(name="file")}}'
# 执行：mise run test --file my-test-file
# 运行：cargo test my-test-file
```

- `name`：参数的名称。用于帮助/错误消息。
- `var`：如果为 `true`，可以传递多个值。
- `default`：如果未提供该选项，则使用默认值。

#### 标志

标志类似于选项，只是它们不接受值。它们在脚本中使用 <span v-pre>
`{{flag()}}`</span> 定义。

示例：

```mise-toml
[tasks.echo]
run = 'echo {{flag(name="myflag")}}'
# 执行：mise run echo --myflag
# 运行：echo true
```

```mise-toml
[tasks.maybeClean]
run = '''
if [ '{{flag(name='clean')}}' = 'true' ]; then
  echo 'cleaning'
fi
'''
# 执行：mise run maybeClean --clean
# 运行：echo cleaning
```

- `name`：标志的名称。用于帮助/错误消息。

如果传递了该标志，则值为 `true`，否则为 `false`。

</details>
