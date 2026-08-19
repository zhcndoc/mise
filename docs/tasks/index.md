# 任务

> 定义并运行项目 _任务_，用于构建、测试、lint、部署以及
> 日常开发工作流。

你可以在 `mise.toml` 文件中定义任务，也可以作为独立的 shell 脚本。它们对于
运行 lint、测试、构建器、服务器以及其他特定于
项目的任务都很有用。当然，通过 mise 启动的任务会包含 mise 环境——即你在
`mise.toml` 中定义的工具和环境变量。

以下是我最喜欢的 mise 任务运行器特性：

- 并行构建依赖——默认开启，无需任何配置
- 通过最后修改时间检查来避免在没有更改时重新构建——只需最少配置
- [mise watch](./running-tasks.html#watching-files) 可在文件更改时自动重新构建——无需配置，但很有帮助
- 可以将任务编写为真正的 bash 脚本文件，而不是写在缺少
  语法高亮和 lint/检查支持的 yml/json/toml 字符串中

定义任务有两种方式：[在 `mise.toml` 文件中](./toml-tasks.html) 或者作为 [独立的 shell 脚本](./file-tasks.html)。你也可以使用 [任务模板](./templates.html) 来创建可复用的任务定义。

## `mise.toml` 文件中的任务

任务定义在 `mise.toml` 文件的 `[tasks]` 部分中。

```toml [mise.toml]
[tasks.build]
description = "构建 CLI"
run = "cargo build"
```

然后你可以使用 `mise run build` 运行该任务（如果不与现有命令冲突，也可以使用 `mise build`）。

- 查看 [TOML 任务](./toml-tasks.html) 以了解更多信息。
- 查看 [运行任务](./running-tasks.html) 以了解如何运行任务。

## 文件任务

你也可以将任务定义为独立的 shell 脚本。你所需要做的就是在一个特定目录（如 `mise-tasks`）中创建一个 `executable` 文件。

```sh [mise-tasks/build]
#!/usr/bin/env bash
#MISE description="构建 CLI"
cargo build
```

然后你就可以像运行 TOML 任务一样，使用 `mise run build` 来运行该任务。
有关更多信息，请参阅 [文件任务参考](./file-tasks.html)。

## 传递给任务的环境变量

以下环境变量会传递给任务：

- `MISE_ORIGINAL_CWD`：运行任务时所在的原始工作目录。
- `MISE_CONFIG_ROOT`：包含定义任务的 `mise.toml` 文件的目录；如果配置路径类似于 `~/src/myproj/.config/mise.toml`，则它将是 `~/src/myproj`。
- `MISE_PROJECT_ROOT`：定义任务的项目根目录。对于 monorepo 子项目任务，这是子项目的目录，并且无论从哪个目录调用任务都保持不变。
- `MISE_MONOREPO_ROOT`：monorepo 的根目录（包含 `monorepo_root = true` 配置的目录）。仅在 monorepo 中设置。
- `MISE_TASK_NAME`：正在运行的任务名称。
- `MISE_TASK_COLOR`：用于开始任务前缀颜色和强调效果的 ANSI 序列。当禁用颜色或选定的输出模式不显示任务前缀时，该值为空字符串。请在文本后添加 ANSI 重置序列，例如
  `printf '%smessage\033[0m\n' "$MISE_TASK_COLOR"`。替换输出在使用文本回退时也会提供该值；它描述的是任务标签样式，并不意味着每一行都会自动添加前缀。
- `MISE_TASK_DIR`：包含任务脚本的目录。
- `MISE_TASK_FILE`：任务脚本的完整路径。
