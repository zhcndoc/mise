---
description: 使用 mise 和 pitchfork 为项目运行数据库、消息代理和开发服务器。
---

# Daemon <Badge type="warning" text="实验性" />

Daemon 是会在多条命令之间持续运行的进程，例如数据库、消息代理或开发服务器。在 `mise.toml` 中声明 daemon 后，mise 会安装所需工具并提供项目环境；[pitchfork](https://pitchfork.jdx.dev/) 则负责监管进程和检查其就绪状态。

::: warning 实验性功能
Daemon 功能可能在任何版本中发生变化。请在 `[settings]` 下设置 `experimental = true` 启用。
:::

## 要求 {#requirements}

- 在 `[settings]` 下设置 `experimental = true`，或设置环境变量 `MISE_EXPERIMENTAL=1`。若要使用[随 shell 自动启动和停止](#automatic-start-and-stop)，请在全局配置中启用。
- 安装 pitchfork。运行 `mise daemons start`、`restart`、`register`，或运行带有 `daemons` 的任务时，如果缺少 pitchfork，mise 会自动安装 `[tools]` 请求的版本；若未指定，则安装最新版本。Shell hook 不会安装工具，因此要启用自动启动和停止，请先安装 pitchfork，例如运行 `mise use -g pitchfork`。
- 项目配置文件。`mise daemons` 命令必须在项目目录中运行。
- 关闭[安全模式](/security.html#safe-mode)。安全模式会忽略项目 daemon 声明，并阻止运行 `mise daemons` 命令。

mise 要求 pitchfork 2.25.0 或更高版本。部分功能需要更新的版本：

| 功能                                                                                                          | pitchfork 最低版本 |
| ------------------------------------------------------------------------------------------------------------- | ----------------- |
| Daemon、服务预设及设置 `daemons` 的任务                                                                         | 2.25.0            |
| [稳定 URL](/daemons/worktrees.html#stable-urls-per-worktree)（`proxy`、`proxy_tls`）                           | 2.26.0            |
| [`proxy_idle_timeout`](/daemons/worktrees.html#stop-idle-daemons)                                             | 2.27.0            |
| [以任务运行的 daemon](#daemons-that-run-a-task)                                                                  | 2.28.0            |
| 在 [Windows](/daemons/presets.html#windows) 上正常停止 PostgreSQL                                                | 2.29.0            |
| 在 [`run`](#use-env-and-vars-in-run) 中使用 <code v-pre>{{ env.NAME }}</code> 和 <code v-pre>{{ vars.NAME }}</code> | 2.30.0            |

## 快速开始 {#quick-start}

以下示例为 Node.js 项目配置持久化 PostgreSQL 数据库。将其添加到项目的 `mise.toml`：

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

运行 `mise run dev`。mise 会安装缺失的工具、启动 PostgreSQL、等待其就绪，然后运行应用程序的 `dev` 脚本。预设会导出连接变量（包括 `DATABASE_URL`），并在多次运行之间保留数据库数据。

任务退出后 PostgreSQL 会继续运行，后续运行会复用它。不再需要时，运行 `mise daemons stop postgres` 停止；也可以[随 shell 自动启动和停止](#automatic-start-and-stop)。

## 声明 daemon {#declare-a-daemon}

`[daemons]` 下的每个条目都会声明一个 daemon。根据要运行的服务选择对应写法：

| 声明                                         | 运行内容                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `[daemons]` 下的 `postgres = "18"`           | 与条目同名并使用该版本的[服务预设](/daemons/presets.html)                                           |
| `preset = "postgres"` 和 `version = "18"`  | 预设的命名实例，可选覆盖设置                                                                        |
| `run = "exec npm run dev"`                 | Shell 命令                                                                                       |
| `task = "dev:core"`                        | [mise 任务](#daemons-that-run-a-task)，可选传入 `args`                                             |
| `project = "../services"`                  | [其他项目](/daemons/sharing.html#use-a-daemon-from-another-project)中声明的 daemon                 |
| `provider = "local-postgres"`              | [共享服务器](/daemons/sharing.html#shared-server-providers)上的数据库                              |

例如，声明一个开发服务器和第二个 PostgreSQL 实例：

```toml
[daemons.api]
run = "exec npm run dev"
ready_port = 3000

[daemons.analytics]
preset = "postgres"
version = "18"
port = 5433
```

`run` 命令会在项目工具环境中运行，因此请在 `[tools]` 中声明它所需的工具；预设会自行安装其工具。请用 `exec` 启动长时间运行的命令，使其能直接接收停止信号。

请设置就绪检查（例如 `ready_port` 或 `ready_cmd`），并在服务可以接收请求时通过检查；上例会等待 3000 端口就绪。任务和依赖该服务的 daemon 都会等待检查通过。将 `port` 设为数字可使用固定端口。若要[为每个 worktree 分配独立端口](/daemons/worktrees.html#automatic-ports)，自定义 daemon 请设置 `port = { auto = true, base = 3000 }`；单独设置 `port = "auto"` 只适用于会提供基准端口的预设。

Daemon 名称可以包含 ASCII 字母、数字、`.`、`_` 和 `-`，但不能以 `-` 开头或结尾，也不能包含 `..` 或 `--`。

### 覆盖 daemon {#override-a-daemon}

在优先级更高的文件（例如 `mise.local.toml`）中声明 daemon 会替换整个定义，因此请重复写出所需的每个键。父目录配置中声明的 daemon 也会应用于子项目，并继续使用父项目的根目录和命名空间。

### 在 `run` 中使用 `[env]` 和 `[vars]` {#use-env-and-vars-in-run}

::: v-pre
`run` 命令可以读取 [`[env]`](/environments/) 中的 `{{ env.NAME }}` 和 [`[vars]`](/configuration/vars.html) 中的 `{{ vars.NAME }}`，并使用 mise [模板](/templates.html)过滤器（例如 `quote`）。pitchfork 自身的变量（例如 `{{ port }}` 和 `{{ url }}`）也可使用。这些值会在 daemon 启动时渲染，因此 `[env]` 的值不会写入生成的 pitchfork 文件。只有 `run` 会以此方式渲染。
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

## Daemon 配置键 {#daemon-keys}

| 配置键                 | 形式                 | 含义                                                                                                                                                                                  |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run`                  | custom, preset       | 长时间运行进程的 shell 命令。用于预设时，会替换预设命令。                                                                                                                            |
| `task`, `args`         | task                 | 作为进程运行的 mise 任务及传入参数。详见[将任务作为 daemon 运行](#daemons-that-run-a-task)。                                                                                           |
| `preset`, `version`    | preset               | [服务预设](/daemons/presets.html)及其工具所需版本。                                                                                                                                   |
| `tool`                 | preset               | 使用不同于预设默认值的工具安装服务器。                                                                                                                                               |
| `options`              | preset               | [预设选项](/daemons/presets.html#preset-options)，例如 `options.database`。                                                                                                           |
| `port`                 | custom, task, preset | 固定端口、`"auto"` 或 `{ auto = true, base = 3000 }`。单独设置 `"auto"` 只适用于预设；自定义 daemon 或任务型 daemon 需要 `base`。详见[端口](/daemons/worktrees.html#ports)。         |
| `ports`                | preset               | 覆盖预设的[命名端口](/daemons/worktrees.html#named-ports)。                                                                                                                           |
| `init`                 | custom, task, preset | 在进程启动前运行的[初始化命令](#setup-before-the-process-starts)。                                                                                                                     |
| `mise`                 | custom, task         | 设置为 `false` 时，进程及其初始化命令不会使用项目工具环境。                                                                                                                          |
| `data_dir`             | preset               | 预设数据的存放位置。详见[将数据保存在检出目录中](/daemons/data.html#keep-data-in-the-checkout)。                                                                                      |
| `proxy`                | custom, task, preset | Daemon 的主机名标签；设为 `false` 时不分配主机名。详见[单个 daemon 的代理设置](/daemons/worktrees.html#per-daemon-proxy-settings)。                                                 |
| `proxy_tls`            | custom, task, preset | `"terminate"` 或 `"passthrough"`：由代理还是 daemon 处理 TLS。                                                                                                                     |
| `proxy_idle_timeout`   | custom, task, preset | 由代理启动的 daemon 可空闲运行多久才会停止。详见[停止空闲 daemon](/daemons/worktrees.html#stop-idle-daemons)。                                                                         |
| `project`, `name`      | reference            | 其他项目的目录及其中 daemon 的名称。详见[使用其他项目的 daemon](/daemons/sharing.html#use-a-daemon-from-another-project)。                                                           |
| `provider`, `resource` | provider             | 共享服务器以及要使用的数据库或账户。详见[共享服务器 provider](/daemons/sharing.html#shared-server-providers)。                                                                         |

其他键（例如 `ready_port`、`ready_cmd`、`depends`、`auto` 或 `boot_start`）会传递给 pitchfork。mise 会调整其中两类内容：将 `depends` 中指向 [`project` 引用](/daemons/sharing.html#use-a-daemon-from-another-project)的条目改写为被引用 daemon 的完整 ID；并通过 `mise x` 运行 `ready_cmd` 和 `health_cmd`，使其可以使用项目工具和 `[env]`，除非 daemon 设置了 `mise = false`。这两个命令也可以写成参数数组，pitchfork 2.30.0 及更高版本会在不启动 shell 的情况下运行数组。详见 pitchfork 的[配置参考](https://pitchfork.jdx.dev/reference/configuration)。`project` 引用只接受 `project` 和 `name`；`provider` 引用只接受 `provider` 和 `resource`。

## 在任务运行前启动 daemon {#tasks-that-require-daemons}

在任务中添加 `daemons`，即可在任务主体运行前启动所需服务：

```toml
[daemons]
postgres = "18"
redis = "8"

[tasks.test]
daemons = ["postgres", "redis"]
run = "npm test"
```

`mise run test` 会启动所需的 daemon，并等待 pitchfork 报告它们已就绪。已运行的 daemon 会被复用，并在任务退出后继续运行。这可以替代启动后台进程并不断轮询其状态的前置任务。

单个 daemon 使用字符串，多个 daemon 使用列表；设置为 `true` 则启动任务所属项目声明的所有 daemon。任务也可以按本地名称或完整 ID 指定[其他项目中的 daemon](/daemons/sharing.html#use-a-daemon-from-another-project)；`true` 不包含这些 daemon。启动 daemon 会被视为依赖项，因此 `--skip-deps` 会跳过启动。

只有运行开始前解析出的任务（即你指定的任务及其 `depends`）会启动对应 daemon。通过 `run = [{ task = "..." }]` 调用的任务不会启动 daemon。关于 monorepo 中的名称解析、`--dry-run` 和安全模式，请参阅 [`daemons` 任务选项](/tasks/task-configuration.html#daemons)；运行 `mise tasks info <task>` 可查看任务关联的 daemon。

## 将任务作为 daemon 运行 {#daemons-that-run-a-task}

如果长时间运行的命令已经定义为 mise 任务，请使用 `task`：

```toml
[tasks."dev:core"]
run = "cargo run --bin core --"

[daemons.core]
task = "dev:core"
args = ["--verbose"]
ready_port = 8080
```

使用 `mise daemons start core` 启动。`args` 用于向任务传递参数；此处 Cargo 会将 `--verbose` 转发给 `core` 程序。请在 `[daemons.core]` 中配置就绪检查，而不是写在任务上。

`task` 不能与 `run` 或 `preset` 同时使用，且只有设置 `task` 时才能使用 `args`。注册 daemon 时，该任务必须已经存在。

Daemon 会通过 `mise run` 运行任务，因此任务可以使用工具环境，并像从命令行运行时一样先执行其 `depends`。mise 不通过 shell 启动任务，因此所有平台都会将 `args` 原样传递给任务。如果 daemon 还设置了 [`init`](#setup-before-the-process-starts)，初始化命令和任务会共用一个 shell。

任务自身的 `daemons` 要求会被跳过，因为处理它会再次启动此 daemon。请通过 daemon 的 `depends` 启动任务所需服务，或单独启动这些服务。

Daemon 任务不会使用 mise [密钥](/tasks/task-configuration.html#secrets)。如果该任务或其依赖任务声明了 `secrets`，或使用了 <code v-pre>{{ secrets.* }}</code>，daemon 启动时会报错。请直接使用 `mise run` 运行此类任务。

## 先运行初始化命令 {#setup-before-the-process-starts}

如果启动进程前必须完成初始化，请使用 `init`。它接受单条命令或命令列表，并适用于 `run`、`task` 和预设：

```toml
[daemons.api]
init = ["npm ci", "npm run migrate"]
run = "exec npm start"
ready_port = 3000
```

每条命令都必须成功，下一条才会运行。初始化命令与长时间运行的命令共用一个 shell，因此导出的变量或 `cd` 目录切换会影响后续命令。任务型 daemon 仍会应用任务自己的环境和工作目录。初始化命令会在项目工具环境中运行；设置 `mise = false` 会同时为初始化和进程关闭该环境。

每次启动和重启时都会运行 `init`，包括自动重启，因此每条命令都应可安全重复执行，例如 `npm ci` 或会跳过已应用迁移的迁移工具。

就绪检查会在初始化之后开始，因此等待此 daemon 的任务和其他 daemon 也会等待 `init` 完成。对于预设，即使覆盖了 `run`，预设自身的数据初始化仍会先于你的 `init` 命令运行。

## 管理 daemon {#manage-running-daemons}

这些命令中的 daemon 名称可以是简写（`api`）或完整 ID（`shop/api`）。其他标志会传递给 pitchfork。

| 命令                                                        | 功能                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`mise daemons start [NAME…]`](/cli/daemons/start.html)     | 安装缺失工具、向 pitchfork 注册项目、启动 daemon 及其 `depends` 依赖项，并等待它们就绪。不指定名称时，如果项目声明了 [`default` 组](#groups)则启动该组，否则启动项目中的所有 daemon。 |
| [`mise daemons stop [NAME…]`](/cli/daemons/stop.html)       | 停止 daemon。不指定名称时，停止项目注册的所有 daemon。                                                                                                                                                                                                 |
| [`mise daemons restart [NAME…]`](/cli/daemons/restart.html) | 重启 daemon；选择范围与 `start` 相同。                                                                                                                                                                                                                  |
| [`mise daemons ls [--json]`](/cli/daemons/ls.html)          | 列出 daemon 及其状态，不注册任何内容，也不启动 supervisor。单独运行 `mise daemons` 的效果相同。                                                                                                                                                         |
| [`mise daemons status [NAME…]`](/cli/daemons/status.html)   | 显示 pitchfork 中每个 daemon 的状态。                                                                                                                                                                                                                  |
| [`mise daemons logs [NAME…]`](/cli/daemons/logs.html)       | 显示 daemon 输出。                                                                                                                                                                                                                                      |
| [`mise daemons urls [--json]`](/cli/daemons/urls.html)      | [列出主机名和端口](/daemons/worktrees.html#list-urls)。                                                                                                                                                                                                |
| [`mise daemons register`](/cli/daemons/register.html)       | 注册所有 daemon 但不启动，以便[按需启动](/daemons/worktrees.html#register-for-on-demand-startup)。                                                                                                                                                      |
| [`mise daemons prune`](/cli/daemons/prune.html)             | [删除已移除项目遗留的状态](/daemons/data.html#clean-up-deleted-projects)。                                                                                                                                                                              |
| [`mise daemons tui`](/cli/daemons/tui.html)                 | 打开 pitchfork 控制面板。                                                                                                                                                                                                                              |
| [`mise daemons providers`](/cli/daemons/providers.html)     | 管理[共享服务器](/daemons/sharing.html#shared-server-providers)。                                                                                                                                                                                      |

`logs` 和 `tui` 需要已运行的 supervisor，否则会失败；请先启动 daemon。修改 daemon 声明后，下次启动或重启时才会生效。

### 环境配置档案 {#environment-profiles}

同一时间只能使用一个 [`MISE_ENV`](/configuration/environments.html) 配置档案运行项目的 daemon。切换配置档案前，请先停止项目 daemon 并退出其 shell 会话。

## 随 shell 自动启动和停止 {#automatic-start-and-stop}

要在 `cd` 进入项目时启动 daemon，并在最后一个 shell 离开时停止它，请设置 pitchfork 的 `auto` 键：

```toml
[daemons.postgres]
preset = "postgres"
version = "18"
auto = ["start", "stop"]
```

使用此功能需要：

- Bash、Zsh 或 Fish 中已启用 [shell 集成](/shell-setup.html)。
- 已安装 pitchfork，例如运行 `mise use -g pitchfork`。Shell hook 不会安装工具。
- 在全局配置中设置 `experimental = true`，例如运行 `mise settings experimental=true`。在关闭 `experimental` 的目录中，mise 不会再更新 daemon 会话。如果只在项目的 `mise.toml` 中设置此项，离开项目时不会结束 shell 会话，因此直到 shell 进入启用了该设置的目录或退出前，`auto = ["stop"]` 都不会触发。

`postgres = "18"` 简写形式无法设置 `auto`；请改用表格形式。Hook 会在后台启动 daemon，因此命令提示符不会等待它们。只要还有 shell 位于项目中，daemon 就会继续运行。离开项目进入其他目录时，该 shell 会释放自己的会话，即使新目录没有 daemon 也是如此。此方式只会启动当前项目自己的 daemon；请使用 `mise daemons start` 启动[其他项目中的 daemon](/daemons/sharing.html#use-a-daemon-from-another-project)。

如果启动失败，hook 会输出错误，并在下次目录或配置发生变化时重试。若要立即重试，请使用当前 shell 的 PID 运行 hook：

```sh
eval "$(mise hook-env --force --shell-pid $$ -s zsh)"   # use -s bash in Bash
mise hook-env --force --shell-pid $fish_pid -s fish | source   # Fish
```

强制执行 hook 与 `mise daemons start` 一样，也会重新挂接已由 pitchfork 分离的生成配置。安全模式或禁用 hook 时不会启动任何内容。如果 mise 提示自动启动和停止功能需要更新 shell 集成，请重启 shell。

拥有自身 `auto` 设置的 pitchfork daemon 也会共用这些 shell 会话。详见 pitchfork 的 [shell hook 指南](https://pitchfork.jdx.dev/guides/shell-hook)。

## 对 daemon 分组 {#groups}

在 `[daemon_groups]` 中为一组 daemon 命名，然后在所有接受 daemon 名称的位置使用组名。不带名称运行 `mise daemons start` 或 `restart` 时，会启动名为 `default` 的组。

```toml
[daemon_groups]
default = ["postgres", "api"]
full = ["default", "worker", "search"]
```

```sh
mise daemons start           # postgres and api
mise daemons start full      # all four
mise daemons start --all     # every daemon in this project
mise daemons stop            # every daemon this project has registered
mise daemons stop --group full
```

成员必须是在同一项目中声明的 daemon 或组；嵌套组会在原位置展开。mise 加载配置时会检查成员，因此组不会选择项目外的 daemon，包括父项目或子项目中同名的 daemon。每个组至少需要一个成员，且不能与同一项目中的 daemon 同名。也可以使用与 pitchfork 语法一致的表格形式：

```toml
[daemon_groups.full]
daemons = ["default", "worker", "search"]
```

`--group NAME` selects only a `[daemon_groups]` group, never a daemon of that
name, and rejects a group defined only in pitchfork's own config, because such
a group can include daemons outside the project. Use pitchfork directly for
those. `--all` on `start`, `stop`, or `restart` covers every daemon in this
project, including those a `default` group leaves out. Unlike pitchfork's own
`--all`, it never reaches other projects' daemons, and it cannot be combined
with names or `--group`.

从配置中删除组不会停止该组启动的 daemon。`mise daemons ls` 仍会列出它们；不带名称运行 `mise daemons stop` 则会将其停止。

### 嵌套项目中的组 {#groups-in-nested-projects}

在嵌套项目中，每个项目会自行解析名称：若存在同名组则使用该组，否则使用同名 daemon。每个项目也会单独应用自己的 `default` 组，因此一个项目中的 `default` 组不会限制其他项目启动的内容。

如果子项目[重新定义](#override-a-daemon)了父级组中列出的 daemon，该组会启动子项目中的定义，因此仍只会运行一个进程。例如，父项目声明 `default = ["postgres", "api"]`，子项目重新定义 `postgres` 时，从子项目启动会运行子项目的 `postgres` 和父项目的 `api`。

### pitchfork 中的组 {#groups-in-pitchfork}

mise 会将组及其完整 daemon ID 写入生成的 pitchfork 配置，因此 `pitchfork start --group full` 也能正常工作。pitchfork 组名在整个配置中全局有效，因此直接运行 pitchfork 时，请为不同项目使用不同的组名。

## Windows {#windows}

在 Windows 上，pitchfork 使用 `cmd /C` 运行 `run` 和 `init` 命令。请按 cmd 语法编写：省略 cmd 不支持的 `exec`，并注意 `quote` 过滤器会按 cmd 而非 POSIX shell 的规则处理引号。没有 `init` 的[任务型 daemon](#daemons-that-run-a-task)无需 shell，因此其 `args` 无需改动；使用 `init` 时，请将初始化步骤写成 cmd 命令。

[服务预设](/daemons/presets.html#windows)和[共享服务器 provider](/daemons/sharing.html#shared-server-providers)各有其 Windows 限制。随 shell 自动启动和停止则需要 Bash、Zsh 或 Fish。

## 后续步骤 {#next-steps}

- [搭建开发环境](/daemons/development-stack.html)：运行多项服务，为每个 worktree 分配 URL，并配置登录时启动的 supervisor。
- [服务预设](/daemons/presets.html)：PostgreSQL、Redis、CockroachDB、NATS 和 SpiceDB 及其选项。
- [端口、URL 与 worktree](/daemons/worktrees.html)：在多个 Git worktree 中同时运行相同的 daemon。
- [在项目间共享 daemon](/daemons/sharing.html)：启动其他仓库的 daemon，或共用一台数据库服务器。
- [数据与清理](/daemons/data.html)：查找、重置和清理 daemon 数据。
