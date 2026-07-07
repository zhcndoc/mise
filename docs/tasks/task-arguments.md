# 任务参数

任务参数允许你向任务传递参数，使其更灵活且可复用。在 mise 中有三种定义任务参数的方式，但目前仅推荐其中两种。

## 推荐方法

### 1. usage 字段（首选） {#usage-field}

**usage 字段** 是定义任务参数的推荐方式。它提供了一种简洁、声明式的语法，既适用于 TOML 任务，也适用于文件任务。

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
echo "正在部署到 ${usage_environment?}，位于 ${usage_region?}"
[[ "${usage_verbose?}" == "true" ]] && set -x
./deploy.sh "${usage_environment?}" "${usage_region?}"
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

除了环境变量之外，**usage 值还可以通过 `usage` 映射在任务运行脚本中的 Tera
模板里使用**：

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

`usage` 映射使用 **snake_case 的参数/标志名称作为键**（与
`usage_` 环境变量的方式相同）。带有 `-` 的名称会转换为 `_`，因此像
`--dry-run` 这样的标志将可通过 <span v-pre>`{{ usage.dry_run }}`</span>
和 `$usage_dry_run` 访问。可变参数/标志会以数组形式暴露，并可与 Tera 的
`for` 循环以及 `length` 等过滤器一起使用。`usage` 映射与本文后面所述的已弃用 Tera
模板函数（`arg()`、`option()`、`flag()`）是**分开的**——你不应在同一个任务中混用这两种方式。

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

对于文件任务，你可以使用特殊的 `#MISE` 或 `#USAGE` 注释语法直接在文件中定义参数：

```bash [.mise/tasks/deploy]
#!/usr/bin/env bash
#MISE description "部署应用程序"
#USAGE arg "<environment>" help="部署环境" {
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
在文件任务中定义参数时，请使用 `#MISE`（大写，推荐）或 `#USAGE`。作为格式化工具的兼容替代，`# [MISE]` 或 `# [USAGE]` 也被接受。
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
可变参数会作为经过 shell 转义的字符串传递。为了将包含空格的参数正确处理为 bash 数组，请将变量用括号包裹：

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
```

### 标志（`flag`）

标志可以定义为布尔值，也可以接受值。

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

输出格式（用 `:` 分隔值和描述）：

```
nodejs:JavaScript 运行时
python:Python 语言
ruby:Ruby 语言
```

### 长帮助文本

如需详细帮助文本，请使用多行格式：

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
  echo "正在部署服务：${usage_services?}"
  for service in ${usage_services?}; do
    deploy_service "$service" "$ENVIRONMENT" "$REGION" "$DRY_RUN"
  done
else
  echo "正在部署所有服务"
  deploy_all "$ENVIRONMENT" "$REGION" "$DRY_RUN"
fi
'''
```

## Bash 变量展开用于 Usage 变量 {#bash-variable-expansion}

在 bash 脚本中访问由 usage 定义的变量时，请使用参数展开语法，以帮助 [shellcheck](https://www.shellcheck.net/) 理解这些变量，并为布尔标志提供默认值。

### 常见模式

| 语法              | 行为                         | 使用场景                                           | 示例                          |
| ----------------- | ---------------------------- | -------------------------------------------------- | ----------------------------- |
| `${var?}`         | 未设置时出错                 | usage 规范中带默认值的必需参数或标志               | `${usage_profile?}`           |
| `${var:?}`        | 未设置或为空时出错           | 当你需要确保值非空时                               | `${usage_target:?}`           |
| `${var:-default}` | 未设置时使用默认值           | usage 规范中没有 `default=` 的布尔标志             | `${usage_clean:-false}`       |
| `${var:=default}` | 未设置时设置并使用默认值     | 当你希望为后续使用设置变量时                       | `${usage_dir:=.}`             |
| `${var:+value}`   | 已设置时使用该值             | 条件性传递标志                                   | `${usage_verbose:+--verbose}` |

### Usage 变量的指南

#### 带默认值的参数和标志

使用 `${usage_var?}`，因为 usage 会保证它们已被设置：

```bash
# --profile 在 usage 规范中有 default="debug"
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

使用 `${usage_var:+value}` 仅在设置时传递标志：

```bash
# 仅在提供了该标志时添加 --verbose
mycli deploy ${usage_verbose:+--verbose}
```

这些展开方式有助于 [shellcheck](https://www.shellcheck.net/) 理解你的脚本，并在保持正确错误处理的同时，避免关于变量可能未设置的警告。

## 已弃用的方法

### Tera 模板函数 <Badge type="danger" text="已弃用" /> {#tera-templates}

::: danger 已弃用 - 将于 2026.11.0 移除
用于定义任务参数的 Tera 模板方法**已弃用**，并将于 **mise 2026.11.0** 中**移除**。

**移除原因：**

- **两遍解析问题**：在规范收集期间，模板函数会返回空字符串，导致将其作为普通模板值使用时出现意外行为
- **复杂的转义规则**：Shell 转义规则令人困惑且容易出错
- **行为不一致**：在 TOML 和文件任务之间的行为不相同
- **用户体验差**：将参数定义与脚本逻辑混杂在一起

**需要迁移：** 请在 2026.11.0 之前迁移到 [usage 字段](#usage-field) 方法。

**可关闭设置：** 如果你想立即禁用两遍解析行为（在移除之前），可以设置：

```toml
# ~/.config/mise/config.toml
[settings]
task.disable_spec_from_run_scripts = true
```

或者通过环境变量：`MISE_TASK_DISABLE_SPEC_FROM_RUN_SCRIPTS=1`

启用后，mise 仅会使用 `usage` 字段生成规范，忽略运行脚本中的任何 `arg()`、`option()` 或 `flag()` 函数。更多详情请参见 [设置](/configuration/settings)。
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
   run = 'echo "File: {{arg(name="file")}}" > {{arg(name="file")}}.log'
   # 第一遍：'echo "File: " > .log'（无效！）
   ```

2. **转义复杂**：不同的 shell 类型需要不同的转义方式：

   ```toml
   # 转义行为因 shell 而异
   run = 'cmd {{arg(name="file")}}' # 可能已正确转义，也可能没有
   ```

3. **不会生成帮助信息**：不会生成正确的 `--help` 输出

</details>

### 迁移指南

以下是从 Tera 模板迁移到 usage 字段的方法：

#### 示例 1：简单参数

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div>

**旧版（已弃用）：**

```mise-toml
[tasks.test]
run = '''
cargo test {{arg(
  name="file",
  default="all",
  help="Test file"
)}}
'''
```

</div>

<div>

**新版（推荐）：**

```mise-toml
[tasks.test]
usage = 'arg "<file>" help="Test file" default="all"'
run = 'cargo test ${usage_file?}'
```

</div>

</div>

#### 示例 2：带标志的多个参数

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div>

**旧版（已弃用）：**

```mise-toml
[tasks.build]
run = [
  'cargo build {{arg(name="target", default="debug")}}',
  './package.sh {{flag(name="verbose")}}'
]
```

</div>

<div>

**新版（推荐）：**

```mise-toml
[tasks.build]
usage = '''
arg "<target>" default="debug"
flag "-v --verbose"
'''
run = [
  'cargo build ${usage_target?}',
  './package.sh ${usage_verbose?}'
]
```

</div>

</div>

#### 示例 3：带选项的选择

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div>

**旧版（已弃用）：**

```mise-toml
[tasks.deploy]
run = '''
deploy {{option(
  name="env",
  choices=["dev", "prod"]
)}} {{flag(name="force")}}
'''
```

</div>

<div>

**新版（推荐）：**

```mise-toml
[tasks.deploy]
usage = '''
flag "--env <env>" {
  choices "dev" "prod"
}
flag "--force"
'''
run = 'deploy --env ${usage_env?} ${usage_force?}'
```

</div>

</div>

#### 示例 4：可变参数

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div>

**旧版（已弃用）：**

```mise-toml
[tasks.lint]
run = 'eslint {{arg(name="files", var=true)}}'
```

</div>

<div>

**新版（推荐）：**

```mise-toml
[tasks.lint]
usage = 'arg "<files>" var=#true'
run = 'eslint ${usage_files?}'
```

</div>

</div>

::: tip 处理包含空格的参数
如果你的可变参数可能包含空格，请将变量转换为 bash 数组：

```mise-toml
[tasks.process]
usage = 'arg "<files>" var=#true'
run = '''
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
- [Usage 规范文档](https://usage.jdx.dev/spec/) - 完整的 usage 规范参考
