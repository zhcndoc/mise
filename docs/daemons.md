---
description: 使用 pitchfork 管理项目守护进程以及持久化 PostgreSQL 和 Redis 数据库
---

# 守护进程

::: warning Experimental
守护进程管理需要 `experimental = true`。外部配置支持需要
[pitchfork 2.25.0](https://github.com/jdx/pitchfork/releases/tag/v2.25.0) 或更高版本
:::

在一个部分中声明自定义后台进程和受管理的数据库：

```toml
[settings]
experimental = true

[tools]
node = "24"

[daemons]
postgres = "18"

[tasks.dev]
daemons = "postgres"
run = "npm run dev"
```

Run `mise run dev` to install missing tools, start PostgreSQL, wait for it to be
ready, and then run your application's `dev` script. The preset supplies connection
variables, including `DATABASE_URL`, and keeps database data between runs.

PostgreSQL stays running when the task exits. Later invocations reuse it.
Run `mise daemons stop postgres` when you no longer need it, or configure
[automatic start and stop](#automatic-start-and-stop) for shell sessions.

## Declare a daemon

Choose a declaration based on what you want to run:

| Declaration                                | Use                                                    |
| ------------------------------------------ | ------------------------------------------------------ |
| `postgres = "18"` under `[daemons]`        | A service preset whose name matches the entry.         |
| `preset = "postgres"` and `version = "18"` | A named instance of a preset, with optional overrides. |
| `run = "exec npm run dev"`                 | A custom shell command.                                |
| `task = "dev:core"`                        | An existing mise task, with optional `args`.           |

For example, declare a development server and a second PostgreSQL instance:

```toml
[daemons.api]
run = "exec npm run dev"
ready_port = 3000

[daemons.analytics]
preset = "postgres"
version = "18"
port = 5433
```

自定义命令默认使用项目的 mise 工具环境。在 `[tools]` 中声明其工具；预设会添加自身所需的工具。
使用 `task` 声明的守护进程是例外：mise 是其中的入口，因此除非它同时具有
[`init`](#setup-before-the-process-starts)，否则不会再次包装。任务仍会从 mise 自身获得工具环境。
使用 `exec` 作为最终的长时间运行命令，以便它直接接收停止信号。

`ready_port`、`ready_cmd` 和 `auto` 等字段用于配置 pitchfork 的守护进程行为。设置一个能反映服务
何时可以接受工作的就绪检查；上面的示例会等待 3000 端口。使用整数 `port` 指定固定端口，或使用
[自动端口](#ports-across-git-worktrees) 在多个工作树中运行服务。使用 [`ports`](#ports) 配置预设的
其他监听器。自定义守护进程也接受 pitchfork 的结构化 `port` 表；预设只接受整数或 mise 的自动端口语法。

::: v-pre
用户提供的字符串会保留 pitchfork 模板语法，mise 会渲染其中嵌入的预设模板。`run` 命令还可以使用
项目 [`[env]`](/environments/) 和 [`[vars]`](/configuration/vars) 中的 `{{ env.NAME }}` 和
`{{ vars.NAME }}`，以及 mise 的其他模板过滤器（例如 `quote`）。Pitchfork 会渲染它定义的变量
（`{{ port }}`、`{{ url }}` 等），并将命令传递给 `mise x`；守护进程启动时，mise 会渲染其余部分。
`[env]` 中的值绝不会写入生成的 pitchfork 文件。此功能需要高于 2.29.0 的 pitchfork 版本，且仅适用于 `run`。
:::

现在 mise 会在 `mise x` 中运行 `ready_cmd` 和 `health_cmd`，因此它们可以看到项目工具和 `[env]`，除非守护进程设置 `mise = false`。
它们也可以是参数数组，pitchfork 2.30.0 及更高版本会在不使用 shell 的情况下运行数组。

```toml
[env]
AUDIENCE = "world"

[vars]
greeting = "hello"

[daemons.hello]
run = "exec echo {{ vars.greeting | quote }} {{ env.AUDIENCE | quote }}"
```

## Tasks that require daemons

Add `daemons` to a task to start its services before any task body runs:

```toml
[daemons]
postgres = "18"
redis = "8"

[tasks.test]
daemons = ["postgres", "redis"]
run = "npm test"
```

`mise run test` starts the requested daemons and waits for pitchfork to report them
ready. Already-running daemons are reused. This replaces prerequisite tasks that
launch background processes and poll for readiness.

Use a string for one daemon, a list for several, or `true` for every daemon in the
task's project configuration. Each name must match a `[daemons]` entry.
In a monorepo, each task resolves daemon names in its own project's configuration
hierarchy, including inherited declarations.

A task can name a daemon imported from another project, by the name this project
gave it or by its full ID. `true` covers only this project's own daemons, so a
task asking for everything never reaches into a referenced project.

Daemon startup is part of dependency handling: `--skip-deps` and the
`task.skip_depends` setting skip it. `--dry-run` validates daemon names and the
experimental setting, and reports what would start without starting anything.
Safe mode blocks task daemon startup. A task that lists
[`secrets`](/tasks/task-configuration.html#secrets) does not run as a task daemon in this version.

See the [`daemons` task option](/tasks/task-configuration.html#daemons) for all
accepted values. Use `mise tasks info <task>` to inspect a task's daemon requirements.

## Daemons that run a task

Use `task` when the long-running command is already defined as a mise task:

```toml
[tasks."dev:core"]
run = "cargo run --bin core --"

[daemons.core]
task = "dev:core"
args = ["--verbose"]
ready_port = 8080
```

Start it with `mise daemons start core`. The `args` array passes arguments to the
task; in this example, Cargo forwards `--verbose` to the `core` application.
The daemon's readiness check is configured on `[daemons.core]`, not on the task.

A daemon's `task` cannot be combined with `run` or `preset`, and `args` requires
`task`. The referenced task must exist when daemons are registered.

mise 不通过 shell 启动任务，因此参数在 Windows 和 Unix 上都会按原样传递给任务。这需要 pitchfork 2.28.0
或更高版本。带有 [`init`](#setup-before-the-process-starts) 的任务守护进程是例外：它的设置步骤和任务共享
同一个 shell。在 Windows 上，这是 pitchfork 的默认 `cmd /C`，因此请将 `init` 步骤写成 cmd 命令。

::: warning Subtasks do not start daemons
A task requirement is honored for the tasks a run resolves up front, including
their `depends`. A subtask reached through a `run = [{ task = "..." }]` entry is
resolved once the run is already executing, and its own `daemons` are not started.
Declare the requirement on the task you invoke.
:::

A daemon invokes its task with `mise run`, so that task's `depends` tasks run
before it, as they would on the command line. Its own `daemons` requirements are
the one exception: starting those would start this daemon again, so mise skips
them. Arrange services a supervised task needs through pitchfork's daemon
`depends` configuration, or start them separately.

## Setup before the process starts

Use `init` for setup that must finish before the daemon starts. It accepts one
command or an ordered list, and works with `run`, `task`, and database presets:

```toml
[daemons.api]
init = ["npm ci", "npm run migrate"]
run = "exec npm start"
ready_port = 3000
```

Each command must succeed before the next runs. The setup commands and the
long-running command share a shell, so an exported variable or directory change
carries through to subsequent commands. For task daemons, the task still applies
its own environment and working-directory configuration. By default, setup runs
in the project's mise tool environment, including for task daemons. Setting
`mise = false` on the daemon disables that environment wrapper for both setup and
the long-running command.

**Write setup commands that are safe to repeat.** `init` runs on every start and
restart, including automatic restarts. Use commands such as `npm ci` or a migration
tool that can handle an already-initialized project.

Readiness checks apply after setup, so tasks and other daemons waiting for this
daemon also wait for `init`. For a database preset, the preset's database
initialization runs before your `init` commands. A preset may also override `run`;
both initialization steps still precede that command.

## Manage running daemons

```sh
mise daemons start
mise daemons ls --json
mise daemons logs api
mise daemons status api
mise daemons restart api
mise daemons stop
mise daemons tui
```

启动和重启会安装缺失的工具。不指定名称时，start、stop 和 restart 的目标是由 mise 管理的守护进程。列出和查看状态不会注册配置或启动监管器。TUI 会打开 pitchfork 的控制面板。生命周期命令接受项目守护进程名称；由于 pitchfork 组可能包含项目外的守护进程，因此不接受 `--group`。请直接使用 pitchfork 执行组操作。

## 数据库预设

| 预设       | 工具       | 默认端口 | 环境默认值                                               |
| ---------- | ---------- | -------- | ---------------------------------------------------------- |
| `postgres` | `postgres` | 5432     | `PGHOST`、`PGPORT`、`PGUSER`、`PGDATABASE`、`DATABASE_URL` |
| `redis`    | `redis`    | 6379     | `REDIS_URL`                                                |

两者都绑定到回环地址，并要求其配置的端口空闲；端口不会自动递增。PostgreSQL 使用 `postgres` 用户和本地信任身份验证。任何能够访问其回环端口的进程都可以无需密码连接。这些预设适用于受信任的本地计算机上的开发；对于共享或不受信任的环境，请使用带身份验证的自定义守护进程。这些预设会启用仅追加持久化。目前这些预设仅适用于 Unix。

在 Windows 上，除没有 Windows 构建的 `redis` 外，每个预设都使用 pitchfork 默认的 `cmd /C` shell；不支持其他 `windows_shell`。
PostgreSQL 只有在 pitchfork 2.29.0 或更高版本中才能干净停止，该版本会向它发送 Ctrl+C；旧版本会终止它，并在下次启动时恢复。
PostgreSQL 也拒绝以管理员权限运行，因此不要从提升权限的提示符或以管理员身份运行的监管器启动它。Windows 还会为 Hyper-V 和 WSL 保留某些端口范围（参见 `netsh interface ipv4 show excludedportrange protocol=tcp`）。如果预设端口落入其中，请将 `port` 或 `ports` 设置为其他端口。

使用 `options.database` 可以在首次初始化期间创建不同的 PostgreSQL 数据库。名称可以包含字母、数字和下划线。在现有集群中更改此选项不会再创建另一个数据库。

显式的 `[env]` 值会覆盖导出的默认值。当多个实例导出同一个变量时，最后一个声明生效；请使用显式的 `[env]` 值来选择应用程序使用的实例。显式的 `[tools]` 声明必须与预设请求的版本匹配（例如，已安装的 `18.1` 可以满足 `18`）。共享同一工具的多个实例必须使用相同的版本请求。

## 数据和配置

Mise 会在 `$MISE_STATE_DIR/daemons/<project-hash>/` 下生成配置，并将其注册到 pitchfork。项目目录中不会写入任何内容。已注册的文件会覆盖具有相同守护进程 ID 的普通 pitchfork 定义。请编辑源 `[daemons]` 声明，而不是生成的文件。

数据位于生成配置旁边的 `data/<daemon-name>/` 中。它会在版本请求更改和守护进程移除后保留。初始化过程会被串行化，并且仅在成功后发布。现有数据永远不会被自动删除。主版本更改需要显式迁移或重置；不兼容的数据会在启动前导致失败。

要重置数据库，请停止其守护进程，找到其数据目录，然后显式删除该实例的数据。请先备份任何想要保留的内容。要在不兼容的升级中保留数据，请使用数据库自身的迁移工具。

优先级更高的声明会完全替换同名守护进程。继承的守护进程会保留其声明所在的项目范围。每个项目只能有一个环境配置处于活动状态：在切换 `MISE_ENV` 前，停止其守护进程并退出其 shell 会话。更改后的定义会在下一次启动或显式重启时生效。

预设的 `run` 覆盖仍会在数据库初始化后运行。它遵循 pitchfork shell 命令语义：对于最终的长时间运行进程，请使用 `exec`（例如 `setup-command && exec server`），这样它可以直接接收停止信号。

## 自动启动和停止

在自定义表或预设表上设置 `auto = ["start", "stop"]`，并在 Bash、Zsh 或 Fish 中激活 mise。自动生命周期管理是选择性启用的；简写的数据库声明不会自动启动。必须已经安装 pitchfork——钩子不会安装工具。

Shell 钩子会注册已更改的配置，并发出后台 pitchfork 会话命令，因此等待就绪不会阻塞提示符。Pitchfork 负责会话存活和自动停止；mise 不会保留每个 PID 的会话文件或工作进程。当离开并进入不相关的目录时，即使新目录中没有守护进程，也会释放旧项目会话。当项目中仍有另一个 shell 会话时，共享进程会继续运行。

失败会报告诊断信息，但不会禁用提示符的快速路径。目录或配置发生更改时会重试会话更新；也可以通过 shell 的 eval 运行 `mise hook-env --force`。强制钩子或 `mise daemons start` 会恢复通过 pitchfork 脱离的生成配置。

禁用钩子和安全模式会阻止生命周期命令。升级后请重新运行 `mise activate` 以获得 shell PID 跟踪；旧的激活脚本会显示提示。

项目会话也适用于配置为自动生命周期管理的原生 pitchfork 守护进程。请参阅 [pitchfork 的 shell 会话](https://pitchfork.jdx.dev/guides/shell-hook.html)。
