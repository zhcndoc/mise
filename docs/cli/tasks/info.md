---
description: "Show a task's definition"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise tasks info`

- **用法：** `mise tasks info [-J --json] <TASK>`
- **效果：** 只读
- **源代码：** [`src/cli/tasks/info.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/info.rs)

Show a task's definition

Prints the task's description, source file, dependencies, sources, outputs, run commands, environment, and usage spec. `--json` prints the full definition.

## 参数
- **`<TASK>`** — 要获取信息的任务名称

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`-h --help`** — 输出帮助

## 示例

Show the test task and the file that defines it

```
mise tasks info test
```

获取完整的结构化任务定义

```
mise tasks info test --json
```

<!-- 生成的参考导航 -->

## 相关文档

- [Task configuration reference](/tasks/task-configuration.html).
- [`mise tasks [FLAGS] [TASK] [SUBCOMMAND]`](/cli/tasks.html).
- [Global flags and argument syntax](/cli/#global-flags).
