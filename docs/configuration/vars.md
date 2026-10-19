---
description: "在 mise.toml 的 vars 中定义可复用值，并在 Tera 模板中引用，而不将其导出给命令。"
socialDescription: "在 mise.toml 的 vars 中定义可复用值，并在模板中使用，而不导出给命令。"
---

# 配置变量

在 `[vars]` 中定义共用值，并在 [Tera 模板](/templates.html)中通过 <span v-pre>`{{ vars.NAME }}`</span> 引用。mise 需要用于渲染配置的值应放在 vars 中；命令需要作为环境变量读取的值则应放在 [`[env]`](/environments/) 中。mise 不会将 vars 导出到子进程。

```mise-toml
[vars]
node_version = "24"
test_mode = "headless"

[tools]
node = "{{ vars.node_version }}"

[tasks.test]
run = "echo {{ vars.test_mode | quote }}"
```

`mise run test` 会输出 `headless`。任务通过模板映射 `vars` 读取 `test_mode`；系统中不会存在名为 `$test_mode` 的环境变量。`quote` 过滤器会按 POSIX Shell 规则添加引号；详见[模板转义](/templates.html#string-manipulation)。

mise 在配置中渲染模板的任何位置都可以使用 vars，例如工具版本和选项、任务定义、[钩子](/hooks.html)、[`watch_files`](/hooks.html#watch-files-hook)、[任务引入](/tasks/task-discovery.html)和 [dotfile 模板](/dotfiles.html)。

可用的文件、来源和插件提供的指令形式请参阅 [`env._` 指令参考](/environments/#env-directives)。在 `[vars]` 下使用时，这些指令会填充 `vars`，而不是将值导出为环境变量。

Vars 遵循[配置文件层级](/configuration.html#configuration-hierarchy)：优先级更高的文件会覆盖同名变量。可在全局配置中定义默认值：

```mise-toml [~/.config/mise/config.toml]
[vars]
test_mode = "headless"
```

然后为自己的检出目录覆盖该值：

```mise-toml [mise.local.toml]
[vars]
test_mode = "headed"
```

## 值指令

Vars 支持与 [`[env]`](/environments/) 相同的值指令，包括默认值、必填值、脱敏、文件、来源和[密钥](/environments/secrets/)：

```mise-toml
[vars]
test_mode = { default = "headless" }
api_token = { required = "Set api_token in mise.local.toml" }
_.file = { path = ".env.secret", redact = true }
```

- `default` 会优先使用同名且非空的进程环境变量，否则使用指定值。此处不会读取 `[env]` 中的值。
- 如果进程环境或优先级更高的配置文件（例如 `mise.local.toml`）都未提供值，`required` 会使配置失败。该字符串会作为错误提示显示。
- `redact = true` 会在任务输出中隐藏值；此例中，它会应用于从 `.env.secret` 读取的所有值。

文件、来源和插件指令的形式请参阅 [`env._` 指令参考](/environments/#env-directives)。在 `[vars]` 下使用时，这些指令会填充 `vars`，而不是导出环境变量。

## 提示一次并记住答案 {#prompt}

`prompt` 会将变量设为每台机器单独填写的答案。可将它与 `default` 搭配以提供建议值；没有默认值时则与 `required` 搭配：

```mise-toml
[vars.git_name]
default = "Ada Lovelace"
prompt = "Git author name"

[vars.git_email]
required = "Run mise vars prompt to set git_email"
prompt = "Git email"
```

运行 `mise vars prompt` 会提示填写尚未设置答案的变量；也可指定变量名，只提示相应变量（`mise vars prompt git_name`）。按 Enter 可接受默认值。mise 会将所有答案（包括接受的默认值）保存到 `$MISE_STATE_DIR/vars.toml`，因此之后不会再次询问，也不会写入配置或 dotfiles 历史记录，并且此后所有读取 vars 的命令都可使用这些答案。

```sh
mise vars                       # list every var and where it comes from
mise vars git_name=Ada          # save a value on this machine, no terminal needed
mise vars git_name              # print the value templates see
mise vars prompt                # ask for every unanswered prompt var
mise vars unset git_name        # forget a saved value, to be asked again
```

`mise bootstrap --prompt-vars` 会在 bootstrap 运行过程中执行相同操作。这让新机器可以通过 `mise bootstrap --adopt owner/dotfiles` 填写答案：只有检出配置仓库后，声明这些变量的配置才会出现。即使使用 `--dry-run`，提示输入的答案仍会保存。

只有 `mise vars prompt` 和 `--prompt-vars` 会提示输入。其他所有操作（包括 Shell 激活、任务以及无终端的运行）都会使用已保存的答案；如果没有答案，则回退到 `default`，或像其他 `required` 变量一样报错。

A var resolves in this order, highest first: the process environment, a value
in a higher-precedence config file such as `mise.local.toml`, the saved answer,
the `default`. Answers are keyed by var name alone, so projects that use the same
name share one answer on a machine. A value saved with `mise vars NAME=VALUE`
works for any var name, with or without a `prompt`, and replaces that var's
`default` on this machine. `prompt` works only in `[vars]`, not `[env]`.

## 任务局部变量

TOML 任务可以定义自己的 vars。渲染该任务时，任务局部值会覆盖配置变量，但不会改变其他位置的值：

```mise-toml
[vars]
test_mode = "headless"

[tasks.test]
vars = { test_mode = "headed" }
run = "echo {{ vars.test_mode | quote }}"
```

`mise run test` 会输出 `headed`；除非其他任务定义自己的值，否则仍会读取 `headless`。详见[任务的 `vars`](/tasks/task-configuration.html#task-vars)。

## 变量的解析时机

mise 加载配置时会解析顶层 `[vars]` 条目，此时任务局部 vars 尚未生效。每个条目都可以引用此前已解析的条目。结果会以字符串保存，因此后续引用不会再次计算模板：

```mise-toml
[vars]
mode = "headless"
args = "--mode={{ vars.mode }}"
```

`args` 会解析为 `--mode=headless`。如果优先级更高的文件（例如 `mise.local.toml`）将 `mode` 设为 `"headed"`，<span v-pre>`{{ vars.mode }}`</span> 会渲染为 `headed`，但 `args` 仍为 `--mode=headless`。若要更改 `args`，请直接覆盖 `args`，或在使用该值的任务中构造字符串。

### 任务局部变量可以更改的内容

任务局部覆盖会更改任务模板字段中对此变量的直接引用，包括从任务模板继承的字段。但它不会重新计算使用了原始值的顶层 vars：

```mise-toml
[vars]
mode = "headless"
args = "--mode={{ vars.mode }}"

[tasks.test]
vars = { mode = "headed" }
run = "echo {{ vars.args }} / {{ vars.mode }}"
```

`mise run test` 会输出：

```text
--mode=headless / headed
```

若要让参数随任务模式变化，请在 `run` 中构造它：

```mise-toml
[tasks.test]
vars = { mode = "headed" }
run = "echo --mode={{ vars.mode }}"
```

此配置会输出 `--mode=headed`。如果多个任务共用同一条命令，可将 `run` 放进[任务模板](/tasks/templates.html#parameterizing-a-template-with-vars)，再由每个任务提供自己的 vars。

### 缺少变量时使用默认值

顶层变量不能引用仅存在于任务 `vars` 中的值。若没有备用值，mise 加载配置时就会因引用失败。Tera 的 `default` 过滤器可在渲染表达式的位置提供备用值：

```mise-toml
[vars]
args = "--mode={{ vars.mode | default(value='headless') }}"

[tasks.test]
vars = { mode = "headed" }
run = "echo {{ vars.args }} / {{ vars.mode }}"
```

此配置同样会输出 `--mode=headless / headed`：过滤器会在加载 `[vars]` 时提供 `headless`，不会等到任务提供 `mode`。依赖任务局部值的表达式应放在任务或其模板中。
