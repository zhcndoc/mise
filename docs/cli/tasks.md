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

With no subcommand, lists tasks like `mise tasks ls` and accepts the same flags. With a task name, shows that task like `mise tasks info`. To run a task, use `mise run`.

## Arguments
- **`[TASK]`** — Task to show, as `mise tasks info` does

## Flags
- **`-g --global`** — Only show global tasks
- **`-J --json`** — Output in JSON format
- **`-l --local`** — Only show non-global tasks
- **`-x --extended`** — Show all columns
- **`-a --all`** — Include tasks from every project in the monorepo, not only the current directory's hierarchy
- **`--hidden`** — Show hidden tasks
- **`--name-only`** — Print only task names, one per line (for fzf and similar tools)
- **`--no-header`** — Do not print the table header
- **`--sort <COLUMN>`** — Column to sort by (default: name)

  **Choices:** `name`, `alias`, `description`, `source`
- **`--sort-order <SORT_ORDER>`** — Sort direction (default: asc)

  **可选项：** `asc`、`desc`
- **`-h --help`** — 打印帮助

## Examples

List tasks

```
mise tasks
```

Show the build task

```
mise tasks build
```

Include hidden tasks, sorted by source

```
mise tasks --hidden --sort source
```

## Subcommands

- [`mise tasks add [FLAGS] <TASK> [-- RUN]…`](/cli/tasks/add.html)
- [`mise tasks deps [FLAGS] [TASKS]…`](/cli/tasks/deps.html)
- [`mise tasks edit [-p --path] <TASK>`](/cli/tasks/edit.html)
- [`mise tasks graph [FLAGS]`](/cli/tasks/graph.html)
- [`mise tasks info [-J --json] <TASK>`](/cli/tasks/info.html)
- [`mise tasks ls [FLAGS]`](/cli/tasks/ls.html)
- [`mise tasks validate [--errors-only] [--json] [TASKS]…`](/cli/tasks/validate.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Task configuration reference](/tasks/task-configuration.html).
- [All commands](/cli/).
- [Global flags and argument syntax](/cli/#global-flags).
