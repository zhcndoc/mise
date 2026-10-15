---
description: "Add a task"
---

<!-- @由 usage-cli 根据用法规范生成 -->
# `mise tasks add`

- **用法：** `mise tasks add [FLAGS] <TASK> [-- RUN]…`
- **效果：** 修改状态
- **源代码：** [`src/cli/tasks/add.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/add.rs)

Add a task

Writes a `[tasks.<name>]` table to the nearest project config file and marks that file as trusted. See <https://mise.jdx.dev/configuration.html#target-file-for-write-operations> for how the file is chosen.

With `--file`, creates an executable script in the project's task directory (for example `mise-tasks/`) instead, and does not change any config file.

## 参数
- **`<TASK>`** — 要添加的任务名称
- **`[-- RUN]…`** — 要运行的命令，在 `--` 后给出

## Flags
- **`-a --alias <ALIAS>`** — Other names for the task
- **`-d --depends <TASK>`** — Tasks to run before this one
- **`-D --dir <DIR>`** — Run the task in a specific directory
- **`-f --file`** — Create a file task instead of a TOML task
- **`-H --hide`** — Hide the task from `mise tasks` and completions
- **`-q --quiet`** — Do not print the command before running
- **`-r --raw`** — Connect the task directly to the terminal's stdin, stdout, and stderr
- **`-s --sources <GLOB>`** — Glob patterns of files this task uses as input
- **`-w --wait-for <TASK>`** — Wait for these tasks to finish if they are also being run
- **`--depends-post <TASK>`** — Tasks to run after this one
- **`--description <DESCRIPTION>`** — Description of the task
- **`--outputs <GLOB>`** — Glob patterns of files this task creates, used to skip it when they are up to date
- **`--run-windows <COMMAND>`** — Command to run on Windows (TOML tasks only; ignored with `--file`)
- **`--shell <SHELL>`** — Run the task in a specific shell
- **`--silent`** — Do not print the command or its output
- **`-h --help`** — Print help

## 示例

Add a TOML task that is skipped while its outputs are up to date

```
mise tasks add build --description "Build the app" --sources 'src/**/*.ts' --outputs 'dist/**' -- npm run build
```

Create an executable lint script in the task directory

```
mise tasks add --file lint -- eslint .
```

Add a task that runs after lint and test

```
mise tasks add ci --depends lint --depends test -- echo done
```

<!-- 生成的参考导航 -->

## 相关文档

- [TOML 任务](/tasks/toml-tasks.html)。
- [`mise tasks [FLAGS] [TASK] [SUBCOMMAND]`](/cli/tasks.html)。
- [全局标志和参数语法](/cli/#global-flags)。
