---
description: "当任务需要命名输入、验证、帮助或补全时定义参数。"
---

# 任务参数

当任务需要命名输入、验证、帮助或补全时定义参数。
如果没有 usage 规范，mise 会将额外的命令行参数转发给底层命令；请参见[参数转发](./running-tasks.html)。

## 推荐方法

### 1. usage 字段（首选） {#usage-field}

在 TOML 任务中使用 `usage`，在文件任务中使用 `#USAGE` 注释。两者定义相同的参数规范，mise 使用该规范进行解析、帮助和补全。

更多详情请参见 [完整的 Usage 规范参考](#complete-usage-specification-reference)。

#### 快速示例

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
  echo "Verbose mode enabled"
fi
printf 'Selected environment: %s; region: %s\n' "${usage_environment?}" "${usage_region?}"
'''
```

在 usage 字段中定义的参数会自动作为以 `usage_` 为前缀的环境变量可用：

```shell
# 使用参数执行
$ mise run deploy staging --verbose --region us-west-2

# 在任务内部，这些变量可用为：
# $usage_environment = "staging"
# $usage_verbose = "true"
# $usage_region = "us-west-2"
```

对于普通任务执行，包括没有 usage 规范的任务，继承的 `usage_*` 值会被清除。使用 `raw_args = true` 的任务会保留继承的 `usage_*` 值。若要在正常解析的任务中有意继承某个值，请使用单独命名的环境变量，也可以通过 `env=` 指定：

```mise-toml [mise.toml]
[tasks.deploy]
usage = 'arg "[environment]" env="DEPLOY_ENV"'
run = 'echo "Deploying to ${usage_environment:-default}"'
```

```shell
DEPLOY_ENV=staging mise run deploy
```

除了环境变量之外，**usage 值还可以通过 `usage` 映射在任务运行脚本的 Tera
模板中使用**：

```mise-toml [mise.toml]
[tasks.deploy]
description = "部署应用程序"
usage = '''
arg "<environment>" help="目标环境"
flag "-v --verbose" help="启用详细输出"
flag "--region <region>" help="AWS 区域" default="us-east-1"
'''
run = '''
echo "正在部署到 {{ usage.environment }}，位于 {{ usage.region }}"
{% if usage.verbose %}
  echo "已启用详细模式"
{% endif %}
'''
```

`usage` 映射使用 **snake_case 格式的参数/标志名称作为键**（类似
`usage_` 环境变量）。包含 `-` 的名称会转换为 `_`，因此像 `--dry-run` 这样的标志可以通过 <span v-pre>`{{ usage.dry_run }}`</span>
和 `$usage_dry_run` 使用。可变参数/标志会以数组形式公开，可以与 Tera 的 `for` 循环和 `length` 等过滤器一起使用。`usage` 映射**独立于**本页面后文介绍的已弃用 Tera 模板函数（`arg()`、`option()`、`flag()`）。不要在同一个任务中混用这两种方法。

<span v-pre>`{{usage.*}}`</span> 模板也可用于 `depends`、`depends_post` 和
`wait_for` 中，将参数传递给依赖任务。详情请参见
[将父任务参数传递给依赖项](/tasks/task-configuration#passing-parent-task-arguments-to-dependencies)。

**帮助输出示例：**

```shellsession
$ mise run deploy --help
部署应用程序

Usage: deploy <environment> [OPTIONS]

Arguments:
  <environment>  目标环境 [possible values: dev, staging, prod]

Options:
  -v, --verbose          启用详细输出
      --region <region>  AWS 区域 [env: AWS_REGION] [default: us-east-1]
  -h, --help            打印帮助信息
```

### 2. 文件任务头部 {#file-task-headers}

对于文件任务，请在 `#USAGE` 注释中放置参数声明。`#MISE` 注释将任务属性配置为 TOML。此示例假定使用 Bash，并且项目中已有 `scripts/deploy.sh`：

```bash [.mise/tasks/deploy]
#!/usr/bin/env bash
#MISE description="Deploy application"
#USAGE arg "<environment>" help="Deployment environment" {
#USAGE   choices "dev" "staging" "prod"
#USAGE }
#USAGE flag "--dry-run" help="预览更改而不部署"
#USAGE flag "--region <region>" help="AWS 区域" default="us-east-1" env="AWS_REGION"

ENVIRONMENT="${usage_environment?}"
REGION="${usage_region?}"
DRY_RUN="${usage_dry_run:-false}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN: 将会部署到 $ENVIRONMENT，位于 $REGION"
else
  echo "正在部署到 $ENVIRONMENT，位于 $REGION..."
  ./scripts/deploy.sh "$ENVIRONMENT" "$REGION"
fi
```

::: tip 语法选项
对于任务属性，使用 `#MISE key=value`；对于 usage 规范，使用 `#USAGE`。
作为格式化工具的兼容方案，也接受 `# [MISE]` 和 `# [USAGE]`。
:::

#### 挂载生成的规范

包装另一个 CLI 的文件任务可以挂载由该 CLI 生成的 usage 规范：

```bash [.mise/tasks/run-release]
#!/usr/bin/env bash
#USAGE mount "mise run run-release -- --usage-spec"

exec ./target/release/mycli "$@"
```

当 shell 补全请求任务规范时，mount 命令会运行，因此它必须能在任务最终进程之外工作。像上面这样调用任务本身，可以让 mise 在转发 `--usage-spec` 之前先应用任务配置。

## 完整使用规范参考

### 位置参数（`arg`）

位置参数使用 `arg` 定义，且必须按顺序提供。

#### 基本语法

```kdl
arg "<name>" help="描述"               // 必需的位置参数
arg "[name]" help="描述"               // 可选的位置参数
arg "<file>"                                  // 自动补全为文件名
arg "<dir>"                                   // 自动补全为目录
```

#### 带默认值

```kdl
arg "<file>" default="config.toml"            // 未提供时的默认值
arg "[output]" default="out.txt"              // 带默认值的可选参数
```

#### 可变参数

```kdl
arg "[files]" var=#true                        // 0 个或多个文件
arg "<files>" var=#true                        // 1 个或多个文件（必需）
arg "<files>" var=#true var_min=2              // 至少需要 2 个文件
arg "<files>" var=#true var_max=5              // 最多允许 5 个文件
arg "<files>" var=#true var_min=1 var_max=3    // 1 到 3 个文件
```

::: tip 在 Bash 中处理带空格的可变参数
可变参数会作为经过 shell 转义的字符串传递。若要将包含空格的参数作为 bash 数组处理，请将变量括在括号中：

```bash
# 转换为 bash 数组：
eval "files=($usage_files)"

# 作为数组使用：
for f in "${files[@]}"; do
  echo "正在处理：$f"
done

# 或传递给命令：
touch "${files[@]}"
```

:::

#### 环境变量支持

```kdl
arg "<token>" env="API_TOKEN"                 // 可通过 $API_TOKEN 设置
arg "<host>" env="API_HOST" default="localhost"
```

优先级顺序：CLI 参数 > 环境变量 > 默认值

#### 选项（枚举值）

```kdl
arg "<level>" {
  choices "debug" "info" "warn" "error"
}
arg "<shell>" {
  choices "bash" "zsh" "fish"
  help "Shell 类型"
}
```

#### 高级功能

```kdl
arg "<file>" long_help="使用 --help 时显示的扩展帮助文本"

// 在帮助输出中隐藏
arg "<file>" hide=#true
```

#### 双破折号行为

```kdl
// 必须使用：mycli -- file.txt
arg "<file>" double_dash="required"

// 两种都可以：mycli file.txt 或 mycli -- file.txt
arg "<file>" double_dash="optional"

// 第一个参数之后，行为等同于使用了 --
arg "<files>" double_dash="automatic"

// 在可变参数中将双破折号保留为值
arg "<args>..." double_dash="preserve"
```

### 标志（`flag`）

标志可以是布尔值，也可以接受值。

#### 布尔标志

```kdl
flag "-f --force"
flag "-v --verbose" help="启用详细模式"
flag "--dry-run" help="执行前预览"
```

#### 仅短选项或仅长选项

```kdl
flag "-f"                                     // 仅短标志
flag "--force"                                // 仅长标志
```

#### 带值的标志

```kdl
flag "-o --output <file>" help="输出文件"
flag "--port <port>" help="服务器端口"
flag "--color <when>" {
  choices "auto" "always" "never"
}
```

#### 带默认值的标志

```kdl
flag "--force" default=#true
flag "--format <format>" help="输出格式" default="json"
flag "--port <port>" help="服务器端口" default="8080"
flag "--color <when>" {
  choices "auto" "always" "never"
  default "auto"
}
```

#### 计数标志

```kdl
// 可重复：-vvv
// $usage_verbose = 使用次数（例如：3）
flag "-v --verbose" count=#true
```

#### 取反

```kdl
flag "--color" negate="--no-color" default=#true
// 默认：$usage_color = "true"
// 使用 --no-color 时：$usage_color = "false"
```

#### 全局标志

```kdl
// 可用于所有子命令（如果使用 cmd 结构）
flag "-v --verbose" global=#true
```

#### 标志高级功能

```kdl
flag "--verbose" long_help="扩展帮助文本"
flag "--debug" hide=#true                      // 在帮助中隐藏
```

### 补全（`complete`）

可以通过名称为任意参数或标志定义自定义补全：

```kdl
arg "<plugin>"
complete "plugin" run="mise plugins ls"       // 使用命令输出进行补全
```

#### 带描述

```kdl
complete "plugin" run="mycli plugins list" descriptions=#true
```

输出格式（使用 `:` 分隔值和描述）：

```
nodejs:JavaScript 运行时
python:Python 语言
ruby:Ruby 语言
```

### 长帮助文本

对于详细的帮助文本，请使用多行格式：

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

### 隐藏参数

从帮助输出中隐藏参数（适用于已弃用或内部选项）：

```kdl
arg "<legacy_arg>" hide=#true
flag "--internal-debug" hide=#true
```

### 组合功能示例

这是一个特定于应用程序的示例：它假设 `npm test`、`mycli` 以及名为 `deploy_service` 和 `deploy_all` 的 shell 函数可用。较小的[快速示例](#quick-example)无需这些应用程序组件即可运行。

```mise-toml [mise.toml]
[tasks.deploy]
description = "将应用部署到云端"
usage = '''
// 位置参数
arg "<environment>" {
  help "部署环境"
  choices "dev" "staging" "prod"
}

arg "[services]" {
  help "要部署的服务（默认：全部）"
  var #true
  var_min 0
}

// 标志
flag "-v --verbose" {
  help "启用详细日志"
  count #true
  default 0
}

flag "--dry-run" help="显示将要部署的内容而不实际执行"

flag "--region <region>" {
  help "云区域"
  env "AWS_REGION"
  default "us-east-1"
  choices "us-east-1" "us-west-2" "eu-west-1"
}

flag "--skip-tests" help="部署前跳过运行测试"

flag "--force" help="即使有警告也强制部署"

// 自定义补全
complete "services" run="mycli list-services"
'''

run = '''
#!/usr/bin/env bash
set -euo pipefail

# 处理详细程度
if [[ "${usage_verbose?}" -ge 2 ]]; then
  set -x
elif [[ "${usage_verbose?}" -ge 1 ]]; then
  export VERBOSE=1
fi

# 校验环境
ENVIRONMENT="${usage_environment?}"
REGION="${usage_region?}"
DRY_RUN="${usage_dry_run:-false}"
SKIP_TESTS="${usage_skip_tests:-false}"
FORCE="${usage_force:-false}"

echo "正在部署到 $ENVIRONMENT，区域为 $REGION"

# 除非跳过，否则运行测试
if [[ "$SKIP_TESTS" != "true" ]]; then
  echo "正在运行测试..."
  npm test
fi

# 部署服务
if [[ -n "${usage_services?}" ]]; then
  echo "Deploying services: ${usage_services?}"
  eval "services=(${usage_services?})"
  for service in "${services[@]}"; do
    deploy_service "$service" "$ENVIRONMENT" "$REGION" "$DRY_RUN"
  done
else
  echo "正在部署所有服务"
  deploy_all "$ENVIRONMENT" "$REGION" "$DRY_RUN"
fi
'''
```

## Bash 变量展开用于 Usage 变量 {#bash-variable-expansion}

在 bash 脚本中访问 usage 定义的变量时，请使用参数展开语法，以帮助 [shellcheck](https://www.shellcheck.net/) 理解这些变量，并为布尔标志提供默认值。

### 常见模式

| 语法              | 行为                              | 使用场景                                           | 示例                          |
| ----------------- | --------------------------------- | -------------------------------------------------- | ----------------------------- |
| `${var?}`         | 未设置时出错                      | 必需参数或 usage 规范中带默认值的标志             | `${usage_profile?}`           |
| `${var:?}`        | 未设置或为空时出错                | 需要确保值非空时                                   | `${usage_target:?}`           |
| `${var:-default}` | 未设置或为空时使用默认值          | usage 规范中未设置 `default=` 的布尔标志          | `${usage_clean:-false}`       |
| `${var:=default}` | 未设置或为空时设置并使用默认值    | 希望设置变量以供后续使用时                         | `${usage_dir:=.}`             |
| `${var:+value}`   | 已设置且非空时使用该值            | 可选字符串值                                       | `${usage_output:+has-output}` |

### Usage 变量的指南

#### 带默认值的参数和标志

使用 `${usage_var?}`，因为 usage 会保证它们已设置：

```bash
# --profile has default="dev" in usage spec
cargo build --profile "${usage_profile?}"
```

#### 没有默认值的布尔标志

使用 `${usage_var:-false}` 来提供默认值：

```bash
# --clean 标志在 usage 规范中没有默认值
if [ "${usage_clean:-false}" = "true" ]; then
  cargo clean
fi
```

#### 必需参数

使用 `${usage_var:?}` 以确保值非空：

```bash
# <target> 是必需的位置参数
cargo build --target "${usage_target:?}"
```

#### 条件性标志

显式比较布尔值。非空字符串 `"false"` 仍会满足
`${var:+value}`，因此该展开方式不能用于测试标志是否已启用：

```bash
args=()
if [ "${usage_verbose:-false}" = "true" ]; then
  args+=(--verbose)
fi
mycli deploy "${args[@]}"
```

此示例需要 Bash。`${var:+value}` 适用于可选字符串值，不适用于解释 `true` 和 `false`。

这些展开方式有助于 [shellcheck](https://www.shellcheck.net/) 理解你的脚本，并避免有关变量可能未设置的警告，同时保持正确的错误处理。

## 已弃用的方法

### Tera 模板函数 <Badge type="danger" text="已弃用" /> {#tera-templates}

::: danger 已弃用 - 将于 2027.5.0 移除
用于定义任务参数的 Tera 模板方法**已弃用**，并将于 mise 2027.5.0 中**移除**。

**移除原因：**

- **两遍解析问题**：模板函数在规范收集期间返回空字符串，当它们被用作普通模板值时会导致意外行为
- **复杂的转义规则**：Shell 转义规则令人困惑且容易出错
- **行为不一致**：在 TOML 任务和文件任务中的行为不同
- **用户体验较差**：将参数定义与脚本逻辑混在一起

**需要迁移：** 请在 2027.5.0 之前迁移到 [usage 字段](#usage-field)方法。

**退出设置：** 若要在移除前立即禁用两遍解析行为，请设置：

```toml
# ~/.config/mise/config.toml
[settings]
task.disable_spec_from_run_scripts = true
```

或者通过环境变量：`MISE_TASK_DISABLE_SPEC_FROM_RUN_SCRIPTS=1`

启用后，mise 仅使用 `usage` 字段生成规范，并忽略运行脚本中的任何 `arg()`、`option()` 或 `flag()` 函数。详情请参见[设置](/configuration/settings)。
:::

<details>
<summary>点击查看已弃用的 Tera 模板语法（不推荐）</summary>

此前，你可以在运行脚本中使用 Tera 模板函数内联定义参数：

```mise-toml [mise.toml]
# ❌ 已弃用 - 请勿使用
[tasks.test]
run = 'cargo test {{arg(name="file", default="all")}}'
```

```mise-toml [mise.toml]
# ❌ 已弃用 - 请勿使用
[tasks.build]
run = [
    'cargo build {{option(name="profile", default="dev")}}',
    './scripts/package.sh {{flag(name="verbose")}}'
]
```

**这种方式的问题：**

1. **解析期间为空字符串**：在规范收集（第一遍）期间，模板函数会返回空字符串，因此你不能像这样在模板中使用它们：

   ```toml
   # 这不会按预期工作！
   run = 'echo "文件：{{arg(name="file")}}" > {{arg(name="file")}}.log'
   # 第一遍：'echo "文件：" > .log'（无效！）
   ```

2. **转义复杂**：不同的 shell 类型需要不同的转义方式：

   ```toml
   # 转义行为因 shell 而异
   run = 'cmd {{arg(name="file")}}' # 可能已正确转义，也可能没有
   ```

3. **无法生成帮助信息**：不会生成正确的 `--help` 输出

</details>

### 迁移指南

以下是从 Tera 模板迁移到 usage 字段的方法：

#### 示例 1：简单参数

::: code-group

```mise-toml [Usage]
[tasks.test]
usage = 'arg "<file>" help="Test file" default="all"'
run = 'cargo test "${usage_file?}"'
```

```mise-toml [Deprecated]
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

#### 示例 2：带标志的多个参数

::: code-group

```mise-toml [Usage]
[tasks.build]
usage = '''
arg "<profile>" default="dev"
flag "-v --verbose"
'''
run = '''
args=()
if [ "${usage_verbose:-false}" = "true" ]; then
  args+=(--verbose)
fi
cargo build --profile "${usage_profile?}"
./package.sh "${args[@]}"
'''
```

```mise-toml [Deprecated]
[tasks.build]
run = [
  'cargo build --profile {{arg(name="profile", default="dev")}}',
  './package.sh {{flag(name="verbose")}}'
]
```

:::

#### 示例 3：带选项的选择

::: code-group

```mise-toml [Usage]
[tasks.deploy]
usage = '''
flag "--env <env>" {
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

```mise-toml [Deprecated]
[tasks.deploy]
run = '''
deploy {{option(
  name="env",
  choices=["dev", "prod"]
)}} {{flag(name="force")}}
'''
```

:::

#### 示例 4：可变参数

::: code-group

```mise-toml [Usage]
[tasks.lint]
usage = 'arg "<files>" var=#true'
run = '''
#!/usr/bin/env bash
eval "files=(${usage_files?})"
eslint "${files[@]}"
'''
```

```mise-toml [Deprecated]
[tasks.lint]
run = 'eslint {{arg(name="files", var=true)}}'
```

:::

::: tip 处理包含空格的参数
如果你的可变参数可能包含空格，请将变量转换为 bash 数组：

```mise-toml
[tasks.process]
usage = 'arg "<files>" var=#true'
run = '''
#!/usr/bin/env bash
eval "files=($usage_files)"
for f in "${files[@]}"; do
  process "$f"
done
'''
```

:::

## 另请参见

- [任务配置](/tasks/task-configuration) - 完整的任务配置参考
- [TOML 任务](/tasks/toml-tasks) - TOML 任务语法
- [文件任务](/tasks/file-tasks) - 基于文件的任务语法
- [运行任务](/tasks/running-tasks) - 如何执行任务
- [用法规范文档](https://usage.jdx.dev/spec/) - 完整的用法规范参考。
