---
description: "获取有关任务的信息"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise tasks info`

- **用法：** `mise tasks info [-J --json] <TASK>`
- **效果：** 只读
- **源代码：** [`src/cli/tasks/info.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/info.rs)

获取有关任务的信息。

## 参数
- **`<TASK>`** — 要获取信息的任务名称

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`-h --help`** — 输出帮助

## 示例

检查选定的定义及其源文件

```
mise tasks info test
```

获取完整的结构化任务定义

```
mise tasks info test --json
```

<!-- 生成的参考导航 -->

## 相关文档

- [任务配置](/tasks/task-configuration.html)。
- [`mise tasks [FLAGS] [TASK] [SUBCOMMAND]`](/cli/tasks.html)。
- [全局标志和参数语法](/cli/#global-flags)。
