---
description: "通过 usage 规范定义任务参数和选项，以支持解析、校验、--help 和补全。"
socialDescription: "通过 usage 规范定义任务参数和选项，以支持校验、--help 和补全。"
---

# 任务参数

当任务需要命名输入、参数校验、`--help` 帮助信息或 shell 补全时，可以为它定义参数。mise 会根据任务的 [usage](https://usage.jdx.dev) 规范解析命令行，并将每个值作为 `usage_*` 环境变量传给脚本。如果没有定义规范，mise 会将[额外参数](/tasks/running-tasks.html#pass-arguments)原样传给命令。

## 定义参数 {#usage-field}

可以在 TOML 任务的 `usage` 字段或[文件任务](/tasks/file-tasks.html)的 `#USAGE` 注释中编写规范。两种写法定义的是同一套规范：

::: code-group

```mise-toml [mise.toml]
[tasks.deploy]
description = "部署应用程序"
usage = '''
arg "<environment>" help="目标环境" {
  choices "dev" "staging" "prod"
}
flag "-v --verbose" help="启用详细输出"
flag "--region <region>" help="AWS 区域" default="us-east-1" env="AWS_REGION"
'''
run = '''
#!/usr/bin/env bash
if [ "${usage_verbose:-false}" = "true" ]; then
  echo "已启用详细模式"
fi
echo "正在将应用部署到 ${usage_environment?}（${usage_region?}）"
'''
```

```bash [mise-tasks/deploy]
#!/usr/bin/env bash
#MISE description="部署应用程序"
#USAGE arg "<environment>" help="目标环境" {
#USAGE   choices "dev" "staging" "prod"
#USAGE }
#USAGE flag "-v --verbose" help="启用详细输出"
#USAGE flag "--region <region>" help="AWS 区域" default="us-east-1" env="AWS_REGION"

if [ "${usage_verbose:-false}" = "true" ]; then
  echo "已启用详细模式"
fi
echo "正在将应用部署到 ${usage_environment?}（${usage_region?}）"
```

:::

每个值都会作为 `usage_*` 变量传给脚本：

```sh
mise run deploy staging --verbose --region us-west-2
```

```text
已启用详细模式
正在将应用部署到 staging（us-west-2）
```

`mise run deploy --help` 会根据规范生成并显示帮助信息：

```text
部署应用程序

Usage: deploy [-v --verbose] [--region <region>] <environment>

Arguments:
  <environment>  目标环境
                 [possible values: dev, staging, prod]

Flags:
  -v, --verbose          启用详细输出
      --region <region>  AWS 区域
                         [env: AWS_REGION]
                         (default: us-east-1)
  -h, --help             Print help
```

缺少必需参数或指定了选项之外的值时，任务会在脚本启动前失败：

```sh
mise run deploy qa
```

```text
mise ERROR failed to validate task deploy
mise ERROR Invalid choice for arg environment: qa, expected one of dev, staging, prod
```

启用 mise 的 [shell 补全](/shell-setup.html)后，输入 `mise run deploy <Tab>` 就会显示可选值。无需单独使用 `usage` CLI。运行 [`mise generate task-docs`](/cli/generate/task-docs.html) 可根据同一规范生成 Markdown 文档。

### 文件任务中的注释语法 {#file-task-headers}

在文件任务中，`#USAGE` 行用于编写 usage 规范，`#MISE` 行以 TOML 格式设置任务属性。注释符可以是 `#`、`//` 或 `::`，后面允许有空格。关键字也可以加方括号：`#USAGE`、`# USAGE`、`// USAGE` 和 `# [USAGE]` 均有效，因此格式化工具插入空格也不会导致失效。[文件任务](/tasks/file-tasks.html#configure-with-mise-comments)一节介绍了 `#MISE` 行。

## 规范速查

| 规范                                               | 含义                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `arg "<file>"`                                     | 必需的位置参数                                                                             |
| `arg "[file]"`                                     | 可选的位置参数                                                                             |
| `default="config.toml"`                            | 未提供参数或选项时使用的值                                                                  |
| `arg "[files]" var=#true`                          | 零个或多个值；`arg "<files>" var=#true` 至少需要一个值                                      |
| `var_min=2`、`var_max=5`                            | 限制可变参数的值数量                                                                        |
| `arg "<level>" { choices "debug" "info" "warn" }`  | 只接受列出的值                                                                             |
| `env="API_TOKEN"`                                  | 从环境变量读取值；参见[环境变量回退](#environment-variable-backing)                         |
| `flag "-f --force"`                                | 布尔选项；也可以只写 `flag "-f"` 或 `flag "--force"`                                      |
| `flag "-o --output <file>"`                        | 需要提供值的选项                                                                            |
| `required=#true`                                   | 未传入该选项时任务失败                                                                      |
| `flag "-v --verbose" count=#true`                  | 可重复传入的选项，其值为传入次数，例如 `-vvv` 对应 `3`                                      |
| `flag "--color" negate="--no-color" default=#true` | 布尔选项；传入 `--no-color` 可将其关闭                                                      |
| `help="…"`                                         | 单行帮助文本                                                                               |
| `long_help="…"`                                    | 较长的帮助文本，在 `--help` 输出中取代 `help`                                               |
| `hide=#true`                                       | 在帮助信息中隐藏该参数或选项                                                                |
| `double_dash="required"`                           | 仅接受 `--` 后面的参数值                                                                    |
| `arg "<file>"`、`arg "<dir>"`                      | 参数名为 `file` 或 `path` 时补全文件名；参数名为 `dir` 时补全目录名                         |
| `complete "user" run="mycli users"`                | 根据命令输出补全 `user` 参数或选项；每行一个候选值                                          |

属性也可以像下一例中的 `choices` 和 `long_help` 一样，每行一个写在代码块中。所有选项详见 [usage 规范](https://usage.jdx.dev/spec/)。

### 长帮助文本

```mise-toml
[tasks.complex]
usage = '''
arg "<input>" {
  help "要处理的输入文件"
  long_help """
  输入文件应为 JSON 或 YAML 格式。

  支持的模式：
  - schema-v1：旧格式
  - schema-v2：当前格式（推荐）
  - schema-v3：实验性格式

  示例：
    mise run complex data.json
  """
}
flag "--format <fmt>" {
  help "输出格式"
  long_help """
  支持的输出格式：
  - json：JSON 输出（默认）
  - yaml：YAML 输出
  - toml：TOML 输出
  """
  choices "json" "yaml" "toml"
  default "json"
}
'''
run = 'process-data "${usage_input?}" --format "${usage_format?}"'
```

### 双连字符

`double_dash` 用于控制参数与 `--` 的关系：

```kdl
// 仅接受 -- 后的值：mycli -- file.txt
arg "<file>" double_dash="required"

// 两种写法均有效：mycli file.txt 或 mycli -- file.txt
arg "<file>" double_dash="optional"

// 第一个值之后的内容都按 -- 后的参数处理
arg "<files>" double_dash="automatic"

// 在可变参数中将 -- 保留为一个值
arg "<args>..." double_dash="preserve"
```

### 带说明的补全

设置 `descriptions=#true` 后，命令输出的每一行会在第一个 `:` 处分成值和说明：

```kdl
arg "<plugin>"
complete "plugin" run="mycli plugins list" descriptions=#true
```

```text
nodejs:JavaScript runtime
python:Python language
ruby:Ruby language
```

## 读取参数值

### 环境变量

每个参数和选项都会生成一个 `usage_<name>` 变量，名称中的 `-` 会替换为 `_`：`--dry-run` 会生成 `usage_dry_run`，`<api-key>` 会生成 `usage_api_key`。

- 传入布尔选项时，其值为 `true`；如果没有设置 `default`，未传入时该变量未设置。
- 计数选项的值为传入次数，未传入时变量未设置。
- 未设置 `default` 的可选参数在未提供时变量未设置。
- 可变参数会作为一个经过 shell 引用的字符串传入，例如 `a 'b c'`。

如需将可变参数作为 Bash 数组使用，请通过 `eval` 解析，然后为每个元素加引号：

```mise-toml
[tasks.process]
usage = 'arg "<files>" var=#true'
run = '''
#!/usr/bin/env bash
eval "files=($usage_files)"
for f in "${files[@]}"; do
  echo "Processing: $f"
done
'''
```

### 模板中的 `usage` 映射

运行脚本也可以通过 [Tera 模板](/templates.html)中的 `usage` 映射读取参数值。键名同样使用 snake_case，因此 `--dry-run` 对应 <span v-pre>`{{ usage.dry_run }}`</span>。可变参数和选项会作为数组传入，可用于 Tera 的 `for` 循环以及 `length` 等过滤器：

```mise-toml [mise.toml]
[tasks.deploy]
description = "部署应用程序"
usage = '''
arg "<environment>" help="目标环境"
flag "-v --verbose" help="启用详细输出"
flag "--region <region>" help="AWS 区域" default="us-east-1"
'''
run = '''
echo "正在将应用部署到 {{ usage.environment }}（{{ usage.region }}）"
{% if usage.verbose %}
  echo "已启用详细模式"
{% endif %}
'''
```

`usage` 映射与[迁移指南](#tera-templates)中介绍的已弃用 `arg()`、`option()` 和 `flag()` 函数相互独立。请勿在同一个任务中混用两种方式。

在 `depends`、`depends_post` 和 `wait_for` 中也可以使用 <span v-pre>`{{ usage.* }}`</span>，将任务参数传给依赖任务。详见[向依赖任务传递父任务参数](/tasks/task-configuration.html#passing-parent-task-arguments-to-dependencies)。

### 继承的 `usage_*` 变量

mise 会清除从调用环境继承的 `usage_*` 变量，即使任务没有 usage 规范也是如此。设置 [`raw_args = true`](/tasks/task-configuration.html#raw-args) 的任务会保留这些变量。如需主动传入值，请使用其他名称的变量，例如通过 `env=` 传递：

```mise-toml [mise.toml]
[tasks.deploy]
usage = 'arg "[environment]" env="DEPLOY_ENV"'
run = 'echo "正在部署到 ${usage_environment:-默认环境}"'
```

```sh
DEPLOY_ENV=staging mise run deploy
# 正在部署到 staging
```

## Bash 变量展开 {#bash-variable-expansion}

参数展开可以让 [shellcheck](https://www.shellcheck.net/) 知道 `usage_*` 变量可能未设置，也可以为选项提供默认值：

| 语法               | 行为                                   | 适用情况                                                    | 示例                          |
| ----------------- | ------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| `${var?}`         | 未设置时出错                           | 必需参数以及设有 `default` 的参数或选项                      | `${usage_profile?}`           |
| `${var:?}`        | 未设置或为空时出错                      | 不能为空的值                                                  | `${usage_target:?}`           |
| `${var:-default}` | 未设置或为空时使用默认值                 | 布尔选项和未设置 `default` 的可选参数                         | `${usage_clean:-false}`       |
| `${var:=default}` | 未设置或为空时赋值并使用默认值            | 需要在脚本后续部分复用的默认值                                 | `${usage_dir:=.}`             |
| `${var:+value}`   | 已设置且非空时使用指定值                  | 可选字符串值                                                  | `${usage_output:+has-output}` |

请遵循以下三条规则：

- 对于必需参数或设置了 `default` 的参数，使用 `${usage_x?}`；mise 已经完成相应检查。
- 对于未设置 `default` 的布尔选项，使用 `${usage_x:-false}`；对于未设置 `default` 的可选参数，使用 `${usage_x:-}`。
- 使用 `= "true"` 比较布尔值。`${usage_x:+…}` 在变量值为字符串 `false` 时也会展开，因此不能用它判断选项是否启用。

```bash
#!/usr/bin/env bash
# --profile 默认值为 "dev"；--clean 没有默认值
cargo build --profile "${usage_profile?}"
if [ "${usage_clean:-false}" = "true" ]; then
  cargo clean
fi
```

## 环境变量回退 {#environment-variable-backing}

带有 `env="NAME"` 的参数或选项在命令行未提供值时，会从指定环境变量读取。优先级依次为命令行、环境变量、`default`：

```mise-toml [mise.toml]
[tasks.deploy]
usage = '''
arg "[environment]" env="DEPLOY_ENV" default="development"
flag "-p --profile <profile>" env="BUILD_PROFILE" default="dev"
flag "-v --verbose" env="VERBOSE"
'''
run = 'echo "env=${usage_environment?} profile=${usage_profile?} verbose=${usage_verbose:-false}"'
```

```sh
mise run deploy
# env=development profile=dev verbose=false

DEPLOY_ENV=staging BUILD_PROFILE=release VERBOSE=true mise run deploy
# env=staging profile=release verbose=true

DEPLOY_ENV=staging mise run deploy production
# env=production profile=dev verbose=false
```

布尔选项对应的环境变量为 `true` 或 `1` 时，mise 会将该选项视为已传入。环境变量也可以满足必需参数：

```mise-toml [mise.toml]
[tasks.publish]
usage = 'arg "<api-key>" env="API_KEY" help="发布用 API 密钥"'
run = 'publish --api-key "${usage_api_key?}"'
```

除非设置了 `API_KEY` 或在命令行传入密钥，否则 `mise run publish` 会因 `Missing required arg: <api-key>` 而失败。运行 `mise run publish --help` 时，参数旁会显示 `[env: API_KEY]`。文件任务的 `#USAGE` 行也使用相同语法。

## 在任务间共享选项 {#shared-flags}

在 `.usage.kdl` 文件中定义一次共享选项，使多个任务使用相同的名称、帮助文本和校验规则。`include` 用于加载文件，`use` 会将具名的 `flagset` 添加到任务参数中。

例如，在项目根目录中保存以下 `flagset`：

~~~kdl [shared.usage.kdl]
flagset "common" {
  flag "--env <env>" help="目标环境" {
    arg "<env>" {
      choices "dev" "staging" "prod"
    }
  }
  flag "--dry-run" help="只显示将要执行的操作"
}
~~~

### 在任务中引入共享选项

在文件任务的 `#USAGE` 注释中引入该文件。使用 `$MISE_CONFIG_ROOT` 从任务的配置根目录定位文件：

~~~bash [mise-tasks/deploy]
#!/usr/bin/env bash
#USAGE include file="$MISE_CONFIG_ROOT/shared.usage.kdl"
#USAGE use "common"
#USAGE flag "--replicas <n>" help="要运行的副本数"
echo "env=$usage_env replicas=$usage_replicas"
~~~

对于 TOML 任务，请改用 <span v-pre>{{ config_root }}</span> 模板变量构造 include 路径：

```mise-toml [mise.toml]
[tasks.deploy]
usage = """
include file="{{ config_root }}/shared.usage.kdl"
use "common"
flag "--replicas <n>" help="要运行的副本数"
"""
run = 'echo "env=$usage_env replicas=$usage_replicas"'
```

选择任一写法都可以。两者都会接受 `--env`、`--dry-run` 和 `--replicas`，并拒绝 `--env` 可选值范围之外的输入：

```sh
mise run deploy --env staging --replicas 3
mise run deploy --help
```

共享选项会显示在 `use` 节点所在位置的 `--help` 输出中。引入选项只定义了任务接口，任务脚本仍需实现相应行为。此处的示例只会打印所选环境和副本数。

### 文件任务中的引入路径

相对路径始终以任务文件所在目录为基准，与运行 mise 时所在的目录无关。对于 `mise-tasks/deploy`，下面的写法会从项目根目录引入 `shared.usage.kdl`：

~~~bash
#USAGE include file="../shared.usage.kdl"
~~~

引入路径还会展开 `$NAME` 和 `${NAME}` 环境变量引用，使用 `$$` 表示字面量美元符号。mise 解析文件任务的 usage 规范时，可以使用以下变量：

- mise 启动时继承的变量。
- 对应根目录可用时的 `MISE_CONFIG_ROOT` 和 `MISE_PROJECT_ROOT`。
- 表示任务目录和任务文件路径的 `MISE_TASK_DIR` 和 `MISE_TASK_FILE`。

这些路径在任务执行、帮助信息、任务列表和校验中都以相同方式解析。文件任务的 `#USAGE` 注释不会作为 Tera 模板渲染，因此应使用 `$MISE_CONFIG_ROOT`，而不是 <span v-pre>`{{ config_root }}`</span>。

mise 解析 usage 规范后才会应用任务和项目的 `env` 指令，因此这些指令不能为引入路径提供变量。如果引入路径引用了未定义的变量，mise 会报告 usage 规范无效。任务仍会加载，但不再解析参数、显示帮助或校验输入。

如需在同一项目的多个任务间共享工具、环境变量或依赖，请使用[任务模板](/tasks/templates.html)。

## 挂载其他 CLI 生成的规范

封装其他 CLI 的文件任务可以挂载该 CLI 生成的 usage 规范：

```bash [mise-tasks/run-release]
#!/usr/bin/env bash
#USAGE mount "mise run run-release -- --usage-spec"

exec ./target/release/mycli "$@"
```

shell 补全请求任务规范时会运行挂载命令，因此该命令必须能在任务进程之外独立运行。如示例所示，调用任务本身可以让 mise 先应用任务配置，再转发 `--usage-spec`。

## 从 Tera 参数函数迁移 <Badge type="danger" text="已弃用" /> {#tera-templates}

运行脚本中的 `arg()`、`option()` 和 `flag()` 已弃用，任务使用这些函数时 mise 会发出警告。它们将在 mise 2027.5.0 中移除。mise 收集规范时，这些函数会渲染为空字符串，而且不同 shell 的引用规则也不相同。请参照以下示例，将它们改写为 `usage` 规范。

如需现在就阻止 mise 读取这些函数，请设置 [`task.disable_spec_from_run_scripts`](/configuration/settings.html#task.disable_spec_from_run_scripts)（`MISE_TASK_DISABLE_SPEC_FROM_RUN_SCRIPTS=1`）。之后 mise 只会根据 `usage` 字段构建规范：

```toml
# ~/.config/mise/config.toml
[settings]
task.disable_spec_from_run_scripts = true
```

### 示例 1：简单参数

::: code-group

```mise-toml [新写法]
[tasks.test]
usage = 'arg "<file>" help="测试文件" default="all"'
run = 'cargo test "${usage_file?}"'
```

```mise-toml [旧写法]
[tasks.test]
run = '''
cargo test {{arg(
  name="file",
  default="all",
  help="测试文件"
)}}
'''
```

:::

### 示例 2：带选项的多个参数

::: code-group

```mise-toml [新写法]
[tasks.build]
usage = '''
arg "<profile>" default="dev"
flag "-v --verbose"
'''
run = '''
#!/usr/bin/env bash
args=()
if [ "${usage_verbose:-false}" = "true" ]; then
  args+=(--verbose)
fi
cargo build --profile "${usage_profile?}"
./package.sh "${args[@]}"
'''
```

```mise-toml [旧写法]
[tasks.build]
run = [
  'cargo build --profile {{arg(name="profile", default="dev")}}',
  './package.sh {{flag(name="verbose")}}'
]
```

:::

### 示例 3：带可选值的选项

::: code-group

```mise-toml [新写法]
[tasks.deploy]
usage = '''
flag "--env <env>" required=#true {
  choices "dev" "prod"
}
flag "--force"
'''
run = '''
#!/usr/bin/env bash
args=(--env "${usage_env?}")
if [ "${usage_force:-false}" = "true" ]; then
  args+=(--force)
fi
deploy "${args[@]}"
'''
```

```mise-toml [旧写法]
[tasks.deploy]
run = '''
deploy {{option(
  name="env",
  choices=["dev", "prod"]
)}} {{flag(name="force")}}
'''
```

:::

### 示例 4：可变参数

::: code-group

```mise-toml [新写法]
[tasks.lint]
usage = 'arg "<files>" var=#true'
run = '''
#!/usr/bin/env bash
eval "files=(${usage_files?})"
eslint "${files[@]}"
'''
```

```mise-toml [旧写法]
[tasks.lint]
run = 'eslint {{arg(name="files", var=true)}}'
```

:::
