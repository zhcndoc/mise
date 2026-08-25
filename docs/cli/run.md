<!-- 由 usage-cli 根据用法规范生成 -->
# `mise run`

- **用法：** `mise run [FLAGS]`
- **别名：** `r`
- **源代码：** [`src/cli/run.rs`](https://github.com/jdx/mise/blob/main/src/cli/run.rs)

运行任务

此命令将运行一个任务，或并行运行多个任务。
任务可能依赖于其他任务或源文件。
如果在任务上配置了 source，则只有在源
文件发生变化时才会运行。

任务可以定义在 mise.toml 中，也可以定义为独立脚本。
在 mise.toml 中，任务采用以下形式：

```
[tasks.build]
run = "npm run build"
sources = ["src/**/*.ts"]
outputs = ["dist/**/*.js"]
```

或者，任务可以定义为独立脚本。
这些脚本必须位于 `mise-tasks`、`.mise-tasks`、`.mise/tasks`、`mise/tasks` 或
`.config/mise/tasks` 中。
脚本的名称将作为任务的名称。

```
$ cat .mise/tasks/build<<EOF
#!/usr/bin/env bash
npm run build
EOF
$ mise run build
```

## 标志
- **`--affected`** — 仅对受 Git 更改影响的项目运行匹配的任务
- **`--affected-base <REV>`** — `--affected` 使用的 Git 基准修订版本
  默认使用 MISE_AFFECTED_BASE、CI 元数据或 HEAD~1
- **`--affected-explain`** — 解释 `--affected` 选择项目和任务的原因
- **`--affected-head <REV>`** — `--affected` 使用的 Git 头部修订版本
  默认使用 MISE_AFFECTED_HEAD、CI 元数据或 HEAD
- **`--affected-json`** — 将受影响的项目和任务输出为 JSON，不运行任务
- **`--all`** — 使用整个 monorepo 中的所有任务打开交互式选择器
- **`-c --continue-on-error`** — 即使某个任务失败，也继续运行任务
- **`-C --cd <CD>`** — 执行命令前切换到此目录
- **`-f --force`** — 即使输出已是最新，也强制运行任务
- **`-j --jobs <JOBS>`** — 并行运行的任务数
  小于 1 的值按 1 处理
  [默认值：4]
  使用 `jobs` 配置或 `MISE_JOBS` 环境变量进行配置

  **环境变量：** `MISE_JOBS`
- **`-n --dry-run`** — 不实际运行任务，只按执行顺序打印任务
- **`-o --output <OUTPUT>`** — 更改运行任务时任务信息的输出方式

  - `prefix` - 按行打印 stdout/stderr，并在前面加上任务标签
  - `interleave` - 直接输出到 stdout/stderr，而不是按行输出
  - `replacing` - 每次替换 stdout，stderr 原样打印
  - `timed` - 仅当 stdout 行显示超过 1 秒时才显示
  - `keep-order` - 按行打印 stdout/stderr，并在前面加上任务标签，但保持输出顺序
  - `quiet` - 不显示额外输出
  - `silent` - 不显示任何输出，包括任务的 stdout 和 stderr，但错误除外

  **环境变量：** `MISE_TASK_OUTPUT`
- **`-q --quiet`** — 不显示额外输出

  **环境变量：** `MISE_QUIET`
- **`-r --raw`** — 直接读写 stdin/stdout/stderr，而不是按行读写
  使用此选项时不会应用脱敏
  使用 `raw` 配置或 `MISE_RAW` 环境变量进行配置
- **`-s --shell <SHELL>`** — 用于运行 toml 任务的 Shell

  在 Unix 上默认为 `sh -c -o errexit -o pipefail`，在 Windows 上默认为 `cmd /c`
  也可以通过设置 `MISE_UNIX_DEFAULT_INLINE_SHELL_ARGS` 或 `MISE_WINDOWS_DEFAULT_INLINE_SHELL_ARGS` 进行设置
  或通过任务上的 `shell` 属性覆盖
- **`-S --silent`** — 除错误外不显示任何输出

  **环境变量：** `MISE_SILENT`
- **`-t --tool <TOOL@VERSION>`** — 除 mise.toml 文件中的内容外要运行的工具，例如：node@20 python@3.10
- **`--allow-env <VAR>`** — 允许指定的环境变量通过（隐含对其他所有环境变量使用 --deny-env）
  支持通配符，例如 --allow-env='MYAPP_*'
- **`--allow-net <HOST>`** — 允许访问指定主机的网络（隐含对其他所有主机使用 --deny-net）
- **`--allow-read <PATH>`** — 允许读取指定路径（隐含对其他所有路径使用 --deny-read）
- **`--allow-write <PATH>`** — 允许写入指定路径（隐含对其他所有路径使用 --deny-write）
- **`--deny-all`** — 阻止读取、写入、网络访问和环境变量访问
- **`--deny-env`** — 阻止继承环境变量（仅传递 PATH、HOME、USER、SHELL、TERM、LANG）
- **`--deny-net`** — 阻止所有网络访问
- **`--deny-read`** — 阻止文件系统读取（系统库和工具目录仍可访问）
- **`--deny-write`** — 阻止所有文件系统写入
- **`--fresh-env`** — 绕过环境缓存并重新计算环境
- **`--no-cache`** — 不对远程任务使用缓存

  **环境变量：** `MISE_TASK_REMOTE_NO_CACHE`
- **`--no-deps`** — 跳过自动依赖准备
- **`--no-timings`** — 每个任务完成后隐藏耗时

  默认始终隐藏，使用 `MISE_TASK_TIMINGS=0`
- **`--skip-deps`** — 仅运行指定的任务，跳过所有依赖项

  **环境变量：** `MISE_TASK_SKIP_DEPENDS`
- **`--skip-tools`** — 运行任务前跳过工具安装

  也可以通过 `task.run_auto_install` 设置或 `MISE_TASK_RUN_AUTO_INSTALL=false` 环境变量持久设置
- **`--task-cache <TASK_CACHE>`** — 设置本次运行的任务输出缓存访问方式

  - `read-write` - 读取缓存结果并写入新结果
  - `read-only` - 读取缓存结果，不写入新结果
  - `write-only` - 写入新结果，不读取缓存结果
  - `off` - 禁用任务输出缓存
  - `local-only` - 仅读取和写入本地缓存；目前等同于 `read-write`

  **可选值：** `read-write`、`read-only`、`write-only`、`off`、`local-only`

  **默认值：** `read-write`

  **环境变量：** `MISE_TASK_CACHE`
- **`--task-cache-explain`** — 解释生成每个任务输出缓存键的输入
- **`--task-cache-explain-json`** — 将缓存键输入详情输出为 JSON Lines，不运行任务
- **`--task-cache-stats`** — 报告任务输出缓存命中次数、恢复的字节数和节省的时间
- **`--timeout <TIMEOUT>`** — 任务完成的超时时间
  例如：30s、5m

示例：

```
# 运行 "lint" 任务。这需要在 mise.toml 中定义，
# 或作为独立脚本定义。更多信息请参见项目 README。
$ mise run lint

# 即使 "build" 任务的源已是最新，也强制运行它。
$ mise run --force build

# 运行 "test"，并将 stdin/stdout/stderr 全部连接到当前终端。
# 这会强制设置 `--jobs=1` 以防止输出交错。
$ mise run --raw test

# 并行运行 "lint"、"test" 和 "check" 任务。
$ mise run lint ::: test ::: check

# 执行多个任务，每个任务都有各自的参数。
$ mise run cmd1 arg1 arg2 ::: cmd2 arg1 arg2
```
