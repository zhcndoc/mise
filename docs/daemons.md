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
[daemons]
postgres = "18"
redis = "8"

[daemons.api]
run = "npm run dev"
ready_port = 3000
auto = ["start", "stop"]

[daemons.analytics]
preset = "postgres"
version = "18"
port = 5433
```

字符串会选择与条目名称匹配的预设。带有 `run` 的表定义自定义进程。带有 `preset` 和 `version` 的表会为任意实例名称选择预设，其余字段会覆盖其 pitchfork 守护进程定义。对于预设，`port` 是整数。自定义守护进程接受相同的整数简写或 pitchfork 的结构化 `port` 配置。用户提供的字符串会保留 pitchfork 模板语法；mise 只渲染其中嵌入的预设模板。

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
