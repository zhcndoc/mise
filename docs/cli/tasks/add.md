---
description: "创建一个新任务"
---

<!-- @由 usage-cli 根据用法规范生成 -->
# `mise tasks add`

- **用法：** `mise tasks add [FLAGS] <TASK> [-- RUN]…`
- **效果：** 修改状态
- **源代码：** [`src/cli/tasks/add.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/add.rs)

创建一个新任务

将任务添加到本地 mise.toml 文件中。
参见 <https://mise.jdx.dev/configuration.html#target-file-for-write-operations>。

## 参数
- **`<TASK>`** — 要添加的任务名称
- **`[-- RUN]…`** — 要运行的命令，在 `--` 后给出

## 标志
- **`-a --alias <ALIAS>`** — 任务的其他名称
- **`-d --depends <DEPENDS>`** — 向任务添加依赖项
- **`-D --dir <DIR>`** — 在特定目录中运行任务
- **`-f --file`** — 创建文件任务而不是 toml 任务
- **`-H --hide`** — 在 `mise tasks` 和补全中隐藏任务
- **`-q --quiet`** — 运行前不打印命令
- **`-r --raw`** — 直接连接 stdin/stdout/stderr
- **`-s --sources <SOURCES>`** — 此任务用作输入的文件的 Glob 模式
- **`-w --wait-for <WAIT_FOR>`** — 如果这些任务也正在运行，则等待它们完成
- **`--depends-post <DEPENDS_POST>`** — 在任务运行后运行的依赖项
- **`--description <DESCRIPTION>`** — 任务的描述
- **`--outputs <OUTPUTS>`** — 此任务创建的文件的 Glob 模式，用于在这些文件为最新时跳过任务
- **`--run-windows <RUN_WINDOWS>`** — 在 Windows 上运行的命令
- **`--shell <SHELL>`** — 在特定 shell 中运行任务
- **`--silent`** — 不打印命令或其输出
- **`-h --help`** — 打印帮助

## 示例

```
mise tasks add pre-commit --depends "test" --depends "render" -- echo pre-commit
```

<!-- 生成的参考导航 -->

## 相关文档

- [TOML 任务](/tasks/toml-tasks.html)。
- [`mise tasks [FLAGS] [TASK] [SUBCOMMAND]`](/cli/tasks.html)。
- [全局标志和参数语法](/cli/#global-flags)。
