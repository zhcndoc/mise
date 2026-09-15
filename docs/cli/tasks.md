---
description: "管理任务"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise 任务`

- **用法：** `mise tasks [FLAGS] [TASK] [SUBCOMMAND]`
- **别名：** `t`、`task`
- **效果：** 只读
- **源代码：** [`src/cli/tasks/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/mod.rs)

管理任务。

## 参数
- **`[TASK]`** — 要显示信息的任务名称

## 标志
- **`-g --global`** — 仅显示全局任务
- **`-J --json`** — 以 JSON 格式输出
- **`-l --local`** — 仅显示非全局任务
- **`-x --extended`** — 显示所有列
- **`--all`** — 从整个 monorepo 加载所有任务，包括同级目录。
  默认情况下，仅加载当前目录层级中的任务。
- **`--hidden`** — 显示隐藏任务
- **`--name-only`** — 仅显示任务名称，每行一个。适用于传递给 fzf 和类似工具。
- **`--no-header`** — 不打印表头
- **`--sort <COLUMN>`** — 按列排序。默认为名称。

  **可选项：** `name`、`alias`、`description`、`source`
- **`--sort-order <SORT_ORDER>`** — 排序顺序。默认为升序。

  **可选项：** `asc`、`desc`
- **`-h --help`** — 打印帮助

## 子命令

- [`mise tasks add [FLAGS] <TASK> [-- RUN]…`](/cli/tasks/add.html)
- [`mise tasks deps [FLAGS] [TASKS]…`](/cli/tasks/deps.html)
- [`mise tasks edit [-p --path] <TASK>`](/cli/tasks/edit.html)
- [`mise tasks graph [FLAGS]`](/cli/tasks/graph.html)
- [`mise tasks info [-J --json] <TASK>`](/cli/tasks/info.html)
- [`mise tasks ls [FLAGS]`](/cli/tasks/ls.html)
- [`mise tasks run [FLAGS] [TASK] [ARGS]…`](/cli/tasks/run.html)
- [`mise tasks validate [--errors-only] [--json] [TASKS]…`](/cli/tasks/validate.html)

<!-- 生成的参考导航 -->

## 相关文档

- [任务配置](/tasks/task-configuration.html)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
