# 文件任务

除了通过配置来定义任务之外，它们也可以作为独立的脚本文件定义在以下目录之一中：

- `mise-tasks/:task_name`
- `.mise-tasks/:task_name`
- `mise/tasks/:task_name`
- `.mise/tasks/:task_name`
- `.config/mise/tasks/:task_name`

这些是默认的文件任务目录。如果为当前配置作用域设置了 [`task_config.includes`](/tasks/task-configuration.html#task-config-includes)，mise 将只会搜索其中列出的路径。

下面是一个构建 Rust CLI 的文件任务示例：

```bash [mise-tasks/build]
#!/usr/bin/env bash
#MISE description="构建 CLI"
cargo build
```

::: tip 重要
确保该文件是可执行的，否则 mise 将无法检测到它。

```shell
chmod +x mise-tasks/build
```

:::

将代码放在 bash 文件中而不是 TOML 中，有助于在编辑器中更好地工作，因为编辑器可以更轻松地进行语法高亮和 lint 检查。

它们对于非 mise 用户也同样很有用——不过
当然，他们需要用别的方法来安装这些任务可能会用到的开发工具。

## 任务配置

所有配置选项都可以在这里找到 [任务配置](/tasks/task-configuration)
你可以通过在文件顶部添加 `#MISE` 注释来为文件任务提供额外配置。

```bash
#MISE description="构建 CLI"
#MISE alias="b"
#MISE sources=["Cargo.toml", "src/**/*.rs"]
#MISE outputs=["target/debug/mycli"]
#MISE env={RUST_BACKTRACE = "1"}
#MISE depends=["lint", "test"]
#MISE tools={rust="1.50.0"}
```

假设该文件位于 `mise-tasks/build`，那么可以使用 `mise run build`（或其别名：`mise run b`）来运行。

### 多行值

每个 `#MISE` 行都是 TOML。只要每一行都保留 `#MISE` 前缀，数组或内联表就可以拆分到多行，这样可以让较长的
`depends`/`sources` 列表更易于阅读：

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

还可以通过使用带点号的键重复此前缀来逐步构建表，这样可以完全省略外层大括号：

```bash
#MISE tools.node="20"
#MISE tools.python="3.11"
```

Mise 为文件任务提供了项目上下文变量，例如
`MISE_PROJECT_ROOT`，无论从哪个目录调用任务，它都可以标识项目根目录。完整的变量列表请参阅[任务](/tasks/#environment-variables-passed-to-tasks)。

:::tip
注意格式化工具可能会将 `#MISE` 改为 `# MISE`。
mise 会故意忽略这种写法，以避免意外配置。
要解决这个问题，可以使用替代写法：`# [MISE]`。
:::

## Shebang

shebang 行是可选的，但如果存在，它将用于确定运行脚本时使用的 shell。
你也可以用它来使用各种编程语言运行脚本。

::: code-group

```js [node]
#!/usr/bin/env node
//MISE description="Node.js 中的你好，世界"

console.log("Hello, World!");
```

```python
#!/usr/bin/env python
#MISE description="Python 中的你好，世界"

print('Hello, World!')
```

```ts [deno]
#!/usr/bin/env -S deno run --allow-env
//MISE description="Deno 中的你好，世界"

console.log(`PATH, ${Deno.env.get("PATH")}`);
```

```powershell [powershell]
#!/usr/bin/env pwsh
#MISE description="PowerShell 中的你好，世界"

$current_directory = Get-Location
Write-Host "Hello from PowerShell, current directory is $current_directory"
```

:::

## 编辑任务

可以通过运行 `mise tasks edit build`（使用 `$EDITOR`）来编辑此脚本。如果它不存在，将会被创建。  
这对于快速编辑或创建新脚本很方便。

## 任务分组

位于 `mise-tasks`、`.mise/tasks`、`mise/tasks` 或 `.config/mise/tasks` 中的文件任务可以分组到
子目录中，在加载时会自动为其名称添加前缀。

**示例**：使用如下所示的文件夹结构：

```text
mise-tasks
├── build
└── test
    ├── _default
    ├── integration
    └── units
```

运行 `mise tasks` 将得到如下输出：

```shellsession
$ mise tasks
Name              Description Source
build                         ./mise-tasks/build
test                          ./mise-tasks/test/_default
test:integration              ./mise-tasks/test/integration
test:units                    ./mise-tasks/test/units
```

## 参数

::: tip
有关任务参数的全面信息，请参阅专门的 [Task Arguments](/tasks/task-arguments) 页面。
:::

[usage](https://usage.jdx.dev) 规范可用于这些文件中，以提供参数解析、自动补全、
在运行 mise 时的文档，并且可以导出为 markdown。本质上，这会把任务变成
功能完备的 CLI。

:::tip
执行 mise 任务时，不需要安装 `usage` CLI 也能使用 usage 规范。
但是，要让补全功能正常工作，必须安装 `usage` CLI，并且它需要在 PATH 中可用。
:::

### 带参数的文件任务示例

下面是一个文件任务示例，它使用 usage 的一些特性来构建一个 Rust CLI：

```bash [mise-tasks/build]
#!/usr/bin/env bash
set -e

#USAGE flag "-c --clean" help="在构建前清理构建目录"
#USAGE flag "-p --profile <profile>" help="使用指定的 profile 构建" default="debug" {
#USAGE   choices "debug" "release"
#USAGE }
#USAGE flag "-u --user <user>" help="为其构建的用户"
#USAGE complete "user" run="mycli users"
#USAGE arg "<target>" help="要构建的目标"

if [ "${usage_clean:-false}" = "true" ]; then
  cargo clean
fi

cargo build --profile "${usage_profile?}" --target "${usage_target?}"
```

::: tip
有关 Bash 参数展开模式（如 `${var?}`、`${var:-default}` 和 `${var:+value}`）的详细信息，请参阅 [Bash Variable Expansion for Usage Variables](/tasks/task-arguments#bash-variable-expansion)。
:::

如果你安装了 `usage`，你的任务就会启用补全功能。在这个示例中，

- `mise run -- build --profile <tab><tab>`
  会将 `debug` 和 `release` 显示为可选项。
- `--user` 标志也会显示由 `mycli users` 输出生成的补全结果。
- 注意：使用 `--` 将 mise 标志与任务参数分隔开：`mise run -- build --profile release <target>`

（请注意，截至本文撰写时，mise 还尚未实现任务的 cli 和 markdown 帮助，但这是计划中的功能。）

:::tip
如果你没有获得任何自动补全建议，请使用 `-v`（verbose）标志查看发生了什么。
例如，如果你使用 `mise run build -v` 且 `usage` 规范无效，你会看到类似 `DEBUG failed to parse task file with usage` 的错误消息
:::

### 环境变量支持

参数和标志可以通过 `env="..."` 使用环境变量提供值。
优先级顺序为 CLI 参数、环境变量，然后是默认值：

```bash [.mise/tasks/deploy]
#!/usr/bin/env bash
#MISE description="Deploy application"
#USAGE arg "[environment]" env="DEPLOY_ENV" default="development"
#USAGE flag "--region <region>" env="AWS_REGION" default="us-east-1"

echo "Deploying to ${usage_environment} in ${usage_region}"
```

这样，同一个文件任务既可以使用显式参数，也可以使用调用该任务的 shell 环境：

```shell
DEPLOY_ENV=staging AWS_REGION=us-west-2 mise run deploy
```

有关更多详细信息，请参阅[环境变量支持](https://mise.jdx.dev/tasks/task-arguments.html#environment-variable-backing)。

### 带参数的 Node.js 文件任务示例

下面是如何在 Node.js 脚本中使用 [usage](https://usage.jdx.dev/cli/scripts#usage-scripts) 来解析参数：

```js [mise-tasks/greet]
#!/usr/bin/env -S node
//MISE description="将问候写入文件"
//USAGE flag "-f --force" help="覆盖现有的 <file>"
//USAGE flag "-u --user <user>" help="以该用户身份运行"
//USAGE arg "<output_file>" help="要写入的文件" default="file.txt" {
//USAGE   choices "greeting.txt" "file.txt"
//USAGE }

const fs = require("fs");

const { usage_user, usage_force, usage_output_file } = process.env;

if (usage_force === "true") {
  fs.rmSync(usage_output_file, { force: true });
}

const user = usage_user ?? "world";
fs.appendFileSync(usage_output_file, `Hello, ${user}\n`);
console.log(`Greeting written to ${usage_output_file}`);
```

运行方式：

```shell
mise run greet greeting.txt --user Alice
# Greeting written to greeting.txt
```

如果你传入了无效参数，你会收到一条错误消息：

```shell
mise run greet invalid.txt --user Alice
# [greet] ERROR
#   0: Invalid choice for arg output_file: invalid.txt, expected one of greeting.txt, file.txt
```

如果安装了 `usage`，自动补全会显示 `output_file` 参数可用的选项。

```shell
mise run greet <TAB>
# > greeting.txt
#   file.txt
```

## CWD

mise 会在运行任务之前将当前工作目录设置为 `mise.toml` 所在的目录。
可以通过在任务头部设置 <span v-pre>`dir="{{cwd}}"`</span> 来覆盖这一行为：

```bash
#!/usr/bin/env bash
#MISE dir="{{cwd}}"
```

另外，原始工作目录也可以通过 `MISE_ORIGINAL_CWD` 环境变量获取：

```bash
#!/usr/bin/env bash
cd "$MISE_ORIGINAL_CWD"
```

## 直接运行任务

任务不需要作为配置的一部分进行配置，你可以通过传递脚本路径直接运行它们：

```bash
mise run ./path/to/script.sh
```

请注意，路径必须以 `/` 或 `./` 开头才会被视为文件路径。（在 Windows 上，它可以是 `C:\` 或 `.\`）
