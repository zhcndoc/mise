---
description: "将任务编写为任务目录中的可执行脚本，并通过 #MISE 注释进行配置。"
---

# 文件任务

文件任务是任务目录中的可执行脚本。脚本路径就是任务名称，文件开头的 `#MISE` 注释用于配置任务。脚本较长、需要借助编辑器的语法高亮和 lint 检查时，适合使用文件任务。

将以下内容保存为 `mise-tasks/build`：

```bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE description="构建 CLI"
cargo build
```

在 Linux 和 macOS 上，请将脚本设为可执行：

```sh
chmod +x mise-tasks/build
```

现在运行 `mise run build` 会使用配置中的工具和环境执行该脚本。mise 只会将可执行脚本列为任务。如果运行的脚本不可执行，mise 会询问是否将其设为可执行；若拒绝，命令会失败。Windows 没有执行权限位，详见 [Windows](#windows)。

不通过 mise 也可以运行该脚本，但此时 `#MISE` 和 `#USAGE` 注释不会生效，因此调用方必须自行提供所需工具、环境以及 `usage_*` 变量。

`mise-tasks/` 是多个[默认任务目录](/tasks/task-discovery.html#default-task-directories)之一。设置 [`task_config.includes`](/tasks/task-configuration.html#task_config.includes) 后，默认目录会被你列出的路径替换。

## 命名和分组文件任务 {#task-grouping}

任务目录下的文件路径就是任务名称，其中 `/` 会替换为 `:`。例如，`mise-tasks/db/migrate.sh` 对应 `db:migrate`，可以通过 `mise run db:migrate` 或 `mise run db:migrate.sh` 运行。除非已有其他同名任务，mise 显示名称时会移除 `.sh`、`.py`、`.js` 或 `.ps1` 等脚本扩展名。其他扩展名会保留在名称中，因此 `mise-tasks/gen.proto` 对应任务 `gen.proto`。名为 `_default` 的文件会使用其目录名作为任务名，所以 `mise-tasks/test/_default` 对应 `test`。

例如，以下目录结构：

```text
mise-tasks
├── build
├── db
│   └── migrate.sh
└── test
    ├── _default
    ├── integration
    └── units
```

`mise tasks --extended` 会列出：

```text
Name              Aliases  Source                         Description
build                      ./mise-tasks/build
db:migrate                 ./mise-tasks/db/migrate.sh
test                       ./mise-tasks/test/_default
test:integration           ./mise-tasks/test/integration
test:units                 ./mise-tasks/test/units
```

`mise run 'test:*'` 会运行 `test:integration` 和 `test:units`；详见[通配符](/tasks/running-tasks.html#wildcards)。

## 使用 `#MISE` 注释配置

在脚本开头附近添加 `#MISE` 注释来设置[任务属性](/tasks/task-configuration.html)：

```bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE description="构建 CLI"
#MISE alias="b"
#MISE sources=["Cargo.toml", "src/**/*.rs"]
#MISE outputs=["target/debug/mycli"]
#MISE env={RUST_BACKTRACE = "1"}
#MISE depends=["lint", "test"]
#MISE tools={rust="1.90"}
cargo build
```

运行 `mise run build` 或它的别名 `mise run b` 都会执行此文件。

注释符可以是 `#`、`//`（用于 JavaScript、TypeScript 或 Go）或 `::`（用于批处理文件），后面也可以有空格。关键字还可以加方括号。`#MISE`、`# MISE`、`// MISE` 和 `# [MISE]` 均有效，因此格式化工具在 `#` 后添加空格不会破坏文件头。若要禁用某行文件头，将关键字改掉即可，例如改为 `# NOMISE`。

每条 `#MISE` 行都包含 TOML。文件头支持与 `[tasks.<name>]` 表相同的[任务属性](/tasks/task-configuration.html)，但不包括 `run`、`run_windows`、`file` 和 `usage`：前几项由脚本本身提供，参数则通过 `#USAGE` 行定义。若要配置无法编辑的脚本，请在 `mise.toml` 中为其添加 `[tasks.<name>]` 配置块，详见
[从 TOML 配置文件任务](/tasks/task-discovery.html#configuring-file-tasks-from-toml)。

### 多行值

数组或内联表格可以跨多行编写，只要每一行都保留 `#MISE` 前缀即可。这种写法能让较长的 `depends` 和 `sources` 列表更易阅读：

```bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE description="构建 CLI"
#MISE depends=[
#MISE   "lint",
#MISE   "test",
#MISE ]
#MISE sources=[
#MISE   "Cargo.toml",
#MISE   "src/**/*.rs",
#MISE ]
cargo build
```

点分键可以逐行构建表格，无需花括号：

```bash
#MISE tools.node="24"
#MISE tools.python="3.13"
```

### 扩展任务模板

`extends` 用于指定[任务模板](/tasks/templates.html)，这样多个文件任务就能共享同一组工具、环境变量和参数：

~~~toml [mise.toml]
[task_templates.rust]
tools = { rust = "1.90" }
env = { RUST_BACKTRACE = "1" }
~~~

~~~bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE extends="rust"
#MISE description="构建 CLI"
cargo build
~~~

脚本本身就是任务命令，因此文件任务会忽略模板中的 `run`。其他设置均按照模板的[合并规则](/tasks/templates.html#merge-semantics)继承。

## Shebang

Shebang 用于选择解释器。在 Linux 和 macOS 上它是可选的；但 Windows 上没有可执行扩展名的文件需要 shebang（见 [Windows](#windows)）。可用它以任意语言编写任务：

::: code-group

```js [node]
#!/usr/bin/env node
//MISE description="Node.js 中的你好，世界"

console.log("你好，世界！");
```

```python [python]
#!/usr/bin/env python
#MISE description="Python 中的你好，世界"

print('你好，世界！')
```

```ts [deno]
#!/usr/bin/env -S deno run
//MISE description="Deno 中的你好，世界"

console.log("你好，世界！");
```

```powershell [powershell]
#!/usr/bin/env pwsh
#MISE description="PowerShell 中的你好，世界"

$current_directory = Get-Location
Write-Host "你好，当前目录为 $current_directory"
```

:::

## Windows

Windows 没有执行权限位。文件扩展名列入 [`windows_executable_extensions`](/configuration/settings.html#windows_executable_extensions)（例如 `.cmd` 或 `.ps1`）或以 shebang 开头时，该文件才会被识别为任务。Windows 本身不支持 shebang；mise 会读取该行并启动解释器。两者都不满足的文件在 Windows 上不会被识别为任务，即使它能在 Linux 和 macOS 上运行：

```bash [mise-tasks/build]
# 没有 shebang 或扩展名：在 Windows 上不是任务
cargo build
```

请为要共享的脚本添加 `#!/usr/bin/env bash`。它不会影响其他平台。

### 没有 `.ps1` 扩展名的 PowerShell 脚本

Windows PowerShell 只会运行以 `.ps1` 结尾的文件，因此 mise 会将 `#!/usr/bin/env pwsh` 任务复制到临时 `.ps1` 文件中执行，并在任务结束后删除副本。`$PSScriptRoot` 和 `$PSCommandPath` 指向该副本；工作目录、`$args` 和环境保持不变。

如需查找任务旁边的文件，请读取 `$env:MISE_TASK_DIR`；它在所有平台上都表示任务文件所在目录（参见[任务环境](/tasks/running-tasks.html#task-environment)）。也可以给任务添加 `.ps1` 扩展名，以便直接运行原文件。

### 一个任务对应两个脚本

文件任务没有对应于 TOML 任务 [`run_windows`](/tasks/task-configuration.html#run-windows) 的设置。可以将文件名主体相同的 POSIX 脚本和 Windows 脚本放在同一目录中：

```text
mise-tasks/
  build.sh       #!/usr/bin/env bash
  build.ps1      # Windows 版本
```

在 Windows 上，mise 会将 `build.ps1` 作为 `build` 运行，并忽略 POSIX 脚本。在 Linux 和 macOS 上，`.ps1` 没有执行权限位，因此只有 `build.sh` 是任务。`mise run build` 会在各平台选择正确的脚本。POSIX 脚本指扩展名不属于 `windows_executable_extensions` 的任何文件，因此不带扩展名的 `build` 脚本也可以使用相同方式配对。

请确保 `.ps1` 在 Linux 和 macOS 上不可执行。如果它可执行，在这些平台上也会成为任务：它与 `build.sh` 并存时也会响应 `build`，因此 `mise run build` 会运行两个脚本。如果 Windows 上有多个候选文件，例如 `build.ps1` 和 `build.cmd`，mise 不会在 Windows 上从中选择一个，而会将三个文件都保留为任务；请使用完整名称运行其中一个，例如 `mise run build.cmd`。

如果脚本名称不同，或需要明确指定脚本，请创建一个调用它们的 [TOML 任务](/tasks/toml-tasks.html)：

```mise-toml [mise.toml]
[tasks.build]
run = "./scripts/build.sh"
run_windows = "pwsh -File ./scripts/windows-build.ps1"
```

Windows 命令会显式调用 `pwsh`，因为 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 默认为 `cmd /c`，而 cmd 不会自行启动 `.ps1` 文件。

## 创建或编辑文件任务

`mise tasks edit build` 会通过 `$EDITOR` 打开 `build`。如果任务不存在，mise 会在第一个已存在的任务目录中创建带 Bash shebang 的可执行脚本；如果没有任务目录，则在 `mise-tasks/` 中创建。[`mise tasks add --file`](/cli/tasks/add.html) 可以根据命令创建文件任务：

```sh
mise tasks add --file hello -- echo hello
```

## 参数 {#arguments}

使用 `#USAGE` 注释声明参数。mise 会解析这些定义，将每个值作为 `usage_*` 环境变量传给脚本，并提供 `--help` 和 shell 补全：

```bash [mise-tasks/build]
#!/usr/bin/env bash
set -e

#USAGE flag "-c --clean" help="构建前清理构建目录"
#USAGE flag "-p --profile <profile>" help="使用指定的配置构建" default="dev" {
#USAGE   choices "dev" "release"
#USAGE }
#USAGE flag "-u --user <user>" help="为其构建的用户"
#USAGE complete "user" run="mycli users"
#USAGE arg "<target>" help="要构建的目标"

if [ "${usage_clean:-false}" = "true" ]; then
  cargo clean
fi

cargo build --profile "${usage_profile?}" --target "${usage_target?}"
```

启用 mise 的 [shell 补全](/shell-setup.html)后，输入 `mise run build --profile <Tab>` 会显示 `dev` 和 `release`，输入 `mise run build --user <Tab>` 会显示 `mycli users` 的输出。无需单独使用 `usage` CLI。运行 `mise run build --help` 可查看任务帮助信息；[`mise generate task-docs`](/cli/generate/task-docs.html) 则会根据同一规范生成 Markdown 文档。

mise 自身的选项应放在任务名称之前，例如 `mise run --dry-run build --profile release x86_64-unknown-linux-gnu`。任务名称之后的所有内容都会传给任务。

[任务参数](/tasks/task-arguments.html)一节介绍规范语法、[在 Bash 中读取参数值](/tasks/task-arguments.html#bash-variable-expansion)以及[从环境变量读取参数](/tasks/task-arguments.html#environment-variable-backing)。

如果补全或 `--help` 没有反映你的规范，请运行 `mise tasks validate` 或直接运行任务。规范无效时会出现类似 `invalid usage spec in task file mise-tasks/build` 的警告，后面会显示解析失败的行。

### 带参数的 Node.js 任务

JavaScript 中使用 `//USAGE` 注释声明参数；mise 对其解析方式与 `#USAGE` 行相同：

```js [mise-tasks/greet]
#!/usr/bin/env node
//MISE description="向文件写入问候语"
//USAGE flag "-f --force" help="覆盖已有的 <file>"
//USAGE flag "-u --user <user>" help="要以其身份运行的用户"
//USAGE arg "<output_file>" help="要写入的文件" default="file.txt" {
//USAGE   choices "greeting.txt" "file.txt"
//USAGE }

const fs = require("fs");

const { usage_user, usage_force, usage_output_file } = process.env;

if (usage_force === "true") {
  fs.rmSync(usage_output_file, { force: true });
}

const user = usage_user ?? "world";
fs.appendFileSync(usage_output_file, `你好，${user}\n`);
console.log(`问候语已写入 ${usage_output_file}`);
```

```sh
mise run greet greeting.txt --user Alice
# 问候语已写入 greeting.txt
```

参数值不在可选范围内时，mise 会在脚本启动前拒绝该值：

```sh
mise run greet invalid.txt --user Alice
```

```text
mise ERROR failed to validate task greet
mise ERROR Invalid choice for arg output_file: invalid.txt, expected one of greeting.txt, file.txt
```

启用补全后，输入 `mise run greet <Tab>` 会显示 `greeting.txt` 和 `file.txt`。

## 工作目录

文件任务会从[配置根目录](/configuration.html#config-root)（即项目目录）运行。例如，`~/proj/mise.toml` 和 `~/proj/.config/mise.toml` 的项目目录都是 `~/proj`。如需从调用 mise 时所在目录运行，请添加 <span v-pre>`#MISE dir="{{cwd}}"`</span>：

```bash
#!/usr/bin/env bash
#MISE dir="{{cwd}}"
```

调用 mise 时所在目录也会存放在 `MISE_ORIGINAL_CWD` 中；从任何目录运行时，都可以通过 `MISE_PROJECT_ROOT` 和其他[任务变量](/tasks/running-tasks.html#task-environment)定位项目：

```bash
#!/usr/bin/env bash
cd "$MISE_ORIGINAL_CWD"
```

## 按路径运行脚本

即使不在任务目录中，运行 `mise run ./scripts/build.sh` 也会将任意可执行脚本作为任务执行，并读取其中的 `#MISE` 和 `#USAGE` 文件头：

```sh
mise run ./path/to/script.sh
```

脚本路径必须以 `/`、`./` 或 `../` 开头；Windows 上也支持 `.\`、`..\` 和 `C:\` 等反斜杠路径。文件必须存在，否则 mise 会将该参数作为任务名称查找。在 Linux 和 macOS 上，文件还必须具有可执行权限。mise 会在终端中提示你授予该权限；若拒绝，会显示以下错误并停止：
`` `./build.sh` is not executable. Run: chmod +x ./build.sh ``。

相对路径与 shell 一样，以当前目录为基准解析，因此在子目录中运行 `mise run ./build.sh` 会执行该子目录中的 `build.sh`。与其他任务一样，脚本本身仍会在配置根目录中运行。
