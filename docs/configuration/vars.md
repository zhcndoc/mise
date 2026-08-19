# 变量

`[vars]` 定义了可在 mise 配置模板中重复使用的值。变量类似于环境变量，但 mise 不会将其导出到子进程。在 Tera 模板中使用 <span v-pre>`{{ vars.NAME }}`</span> 引用变量。

```mise-toml
[vars]
node_version = "24"
test_mode = "headless"

[tools]
node = "{{ vars.node_version }}"

[tasks.test]
run = "./scripts/test-e2e.sh --{{ vars.test_mode }}"
```

变量可用于由 Tera 渲染的配置，例如工具版本和选项、任务定义、钩子、任务包含项、监视配置和点文件模板。有关完整的模板语法和上下文，请参阅[模板](/templates)。

## 值指令

变量支持与 [`[env]`](/environments/) 相同的值生成指令，包括默认值、必需值、脱敏、文件、来源和[机密](/environments/secrets/)。

```mise-toml
[vars]
test_mode = { default = "headless" }
api_token = { required = "Set api_token in mise.local.toml" }
secret_arg = { value = "--token=abc123", redact = true }
_.file = ".env"
```

`default` 形式会在同名的进程环境变量已设置且非空时使用该变量；查找时不会使用 `[env]` 中的值。`required` 变量必须由进程环境或后续配置文件提供。标记为 `redact = true` 的值会在任务输出中隐藏。

有关可用的文件、来源和插件提供的指令形式，请参阅 [`env._` 指令参考](/environments/#env-directives)。在 `[vars]` 下使用时，这些指令会填充 `vars`，而不是将值导出为环境变量。

## 配置层级

变量遵循 mise 的[配置层级](/configuration.html#configuration-hierarchy)。它们可以在全局配置中定义，并由项目或特定环境的配置文件覆盖。

例如，可以在全局范围内定义默认值：

```mise-toml [~/.config/mise/config.toml]
[vars]
test_mode = "headless"
```

然后为项目覆盖该值：

```mise-toml [mise.local.toml]
[vars]
test_mode = "headed"
```

## 任务本地变量

TOML 任务可以定义自己的变量。任务本地值会在渲染该任务时覆盖配置变量，但不会改变配置其他位置可用的变量。

```mise-toml
[vars]
test_mode = "headless"

[tasks.test]
vars = { test_mode = "headed" }
run = "./scripts/test-e2e.sh --{{ vars.test_mode }}"
```

有关任务本地变量，请参阅[任务配置](/tasks/task-configuration.html#task-vars)。
