---
description: "使用项目的工具和环境运行构建、测试和部署。"
---

# Tasks

任务是使用项目的工具和环境变量运行的命名命令或脚本。使用任务来运行构建、测试、代码检查工具、开发服务器，以及其他希望团队成员和 CI 一致运行的命令。

## 运行你的第一个任务

在项目目录中创建此文件：

```toml [mise.toml]
[tasks.hello]
description = "Check that task execution works"
run = "echo hello from mise"
```

```sh
mise run hello
# hello from mise
```

不需要激活 Shell。mise 会加载任务的配置，并且默认会在启动任务前安装任何缺失的已配置工具。使用 `mise tasks ls` 列出任务，并使用 `mise tasks info hello` 查看某个任务。

## 选择任务格式

| 格式                             | 适用场景                                                          | 配置                                       |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| [TOML 任务](./toml-tasks.html)    | 命令较短，或主要用于配置依赖项和选项。     | `mise.toml` 中的 `[tasks.<name>]`                     |
| [文件任务](./file-tasks.html)    | 脚本可以受益于其语言的编辑器支持和代码检查工具。 | `mise-tasks/` 或其他任务目录中的脚本 |
| [任务模板](./templates.html) | 多个任务共享配置。                                   | `[task_templates.<name>]`，使用 `extends` 选择  |

这些格式使用相同的任务运行器。从 TOML 开始，并在较长的脚本不断增长时将其移入文件。

## `mise.toml` 文件中的任务

仅依赖其他任务的任务可以将其他任务分组。前置任务可能会并行运行；它们在 `depends` 中的顺序并不代表执行顺序：

```toml [mise.toml]
[tasks.check]
depends = ["format", "test"]

[tasks.format]
run = "echo checking formatting"

[tasks.test]
run = "echo running tests"
```

`mise run check` 会运行两个前置任务。将 `echo` 命令替换为项目的检查命令。当某一步必须在下一步开始前完成时，使用 [运行数组](./running-tasks.html#execution-order)。

## 文件任务

将脚本保存为 `mise-tasks/hello`：

```sh [mise-tasks/hello]
#!/usr/bin/env bash
#MISE description="Check that task execution works"
echo "hello from a file task"
```

在 macOS 和 Linux 上，使用 `chmod +x mise-tasks/hello` 使其可执行，然后运行 `mise run hello`。这是上述 TOML 任务的替代方案。[文件任务指南](./file-tasks.html#windows)介绍了 Windows 检测和解释器。

## 构建任务工作流

- [运行任务](./running-tasks.html)：参数、通配符、并行执行和执行顺序。
- [任务参数](./task-arguments.html)：定义带有验证、帮助和补全功能的 CLI。
- [任务配置](./task-configuration.html)：查找特定属性及其作用域。
- [任务缓存](./caching.html)：选择新鲜度检查或缓存输出，并声明其输入。
- [Monorepo 任务](./monorepo.html)：在已配置的项目根目录中运行任务。
- [任务架构](./architecture.html)：了解发现、调度和失败。

## 传递给任务的环境变量

以下环境变量会传递给任务：

- `MISE_ORIGINAL_CWD`：运行任务时所在的原始工作目录。
- `MISE_CONFIG_ROOT`：包含定义任务的 `mise.toml` 文件的目录。如果配置路径类似于 `~/src/myproj/.config/mise.toml`，则该值为 `~/src/myproj`。
- `MISE_PROJECT_ROOT`：定义任务的项目根目录。对于 Monorepo 子项目任务，这是子项目的目录，并且无论从哪个目录调用任务，该值都保持不变。
- `MISE_MONOREPO_ROOT`：Monorepo 的根目录（包含 `monorepo_root = true` 配置的目录）。仅在 Monorepo 内设置。
- `MISE_TASK_NAME`：正在运行的任务名称。
- `MISE_TASK_COLOR`：用于开始任务前缀颜色和强调样式的 ANSI 序列。当禁用颜色或所选输出模式不显示任务前缀时，该值为空字符串。请在文本后添加 ANSI 重置序列，例如 `printf '%smessage\033[0m\n' "$MISE_TASK_COLOR"`。替换式输出样式在使用文本回退时也会提供该值。此变量描述任务标签的样式，并不意味着每一行都会自动添加前缀。
- `MISE_TASK_DIR`：包含任务脚本的目录。
- `MISE_TASK_FILE`：任务脚本的完整路径。
