---
description: "将 fnox 用作项目密钥源：任务只接收列出的密钥，mise run --secrets 和 mise x --secrets 提供一次性密钥，mise secrets ls 显示可用信息。"
---

# 使用 fnox 的 mise secrets

<Badge type="warning" text="experimental" />

[fnox](https://fnox.jdx.dev) 可以作为项目的密钥源。任务只会在运行期间，以环境变量形式接收 `secrets = [...]` 中列出的密钥。mise 仅在即将运行列出该密钥的任务时向 fnox 请求值，并只在该进程内存中保留，同时从任务输出中脱敏。`mise run --secrets` 和 `mise x --secrets` 可为单个命令提供一次性密钥（见[为单个命令授予密钥](#grant-for-one-command)）。`mise secrets ls` 会显示存在的键及列出它们的任务，但绝不显示值。

mise secrets 为实验性功能，可使用以下命令启用：

```sh
mise settings experimental=true
```

## 快速开始

将 fnox 添加到项目，并将其指定为密钥源：

```toml [mise.toml]
[tools]
fnox = "latest"

[secrets.fnox]          # this project's secrets come from fnox, discovered from this directory
profile = "dev"         # optional; passed as fnox -P
```

```sh
mise use fnox
mise secrets ls
```

```
fnox · profile dev · ~/src/app (mise.toml) · fnox 1.39.0 · daemon: running (protocol 6)
KEY                ENV    FILE  SCOPES     TASKS   DESCRIPTION
AWS_ACCESS_KEY_ID  -      no    run, exec          (lease aws)
DATABASE_URL       true   no    run, exec  deploy  app database
DEPLOY_KEY         exec   no    run, exec  deploy
GCP_SA_JSON        exec   yes   run
SIGNING_KEY        false  no    -                  release signing key
```

表头输出到 stderr，表格输出到 stdout。mise 需要 fnox 1.39.0 或更高版本。表头末尾会显示 fnox 守护进程状态（见[使用 fnox 守护进程缓存](#caching-with-the-fnox-daemon)）：`daemon: running (protocol N)`、`daemon: not running`、`daemon: disabled`、`daemon: not responding`、`daemon: socket <path> is not owned by you`，或者 fnox 版本过旧无法报告时的 `daemon: not used (...)`。mise 只会查询已启用的守护进程，并且不会因此启动守护进程。

## 向任务授予密钥

```toml [mise.toml]
min_version = "2026.10.4"   # older mise rejects `secrets` on a task

[secrets.fnox]
profile = "prod"

[tasks.build]
run = "cargo build"                         # receives nothing; fnox never runs for it

[tasks.deploy]
depends = ["build"]
secrets = ["DEPLOY_KEY", "DATABASE_URL"]    # only these keys, only this task
run = './deploy.sh'                          # reads $DEPLOY_KEY
```

`mise run deploy` 会执行以下步骤：

1. 先通过一次 `fnox env --json --describe` 调用验证所有授予。如果键未知或无法注入，不会运行任何内容。
2. 不提供密钥地运行 `build`。
3. 为两个键调用一次 fnox。
4. 在包含这两个键的环境中启动 `deploy`。
5. 任务输出中出现值的位置都会打印 `[redacted]`。

没有授予密钥的任务、因 sources 是最新而跳过的任务、用户拒绝确认的任务、`mise run -n`、`mise env`、hook-env 或 shim 都不会运行 fnox。

文件任务的头部也支持 `secrets` 字段（`#MISE secrets=["DEPLOY_KEY"]`）。在 `[tasks.<name>]` 块中设置 `secrets = []` 会清空文件任务的列表。`secrets` 不能用于 `[task_templates.*]` 或 `monorepo.task_defaults`：每个授予都必须写在实际接收它的任务上。

### 谁会获得什么

| 进程                                                   | 是否接收密钥                    |
| ----------------------------------------------------- | ------------------------------ |
| 列出该键的任务                                         | 是                             |
| 它的依赖项和后置依赖项                                 | 否，只接收各自列表中的密钥       |
| 由 `run = [{ task = "..." }]` 启动的任务               | 否，只接收各自列表中的密钥       |
| 任务内部嵌套的 `mise run`                              | 只有列出该键的任务               |
| shim、`mise x` 以及任务调用的工具                      | 是，会继承该变量                 |
| 通过 `mise run --secrets KEY` 指定的任务                | 是，仅对本次运行                 |
| 不带 `--secrets` 的 `mise x`                           | 否                             |
| 钩子、`mise env`、hook-env、`mise activate`、守护进程    | 否                             |

继承的值与普通环境变量一样传播：自行获得某个键的脚本可以将它传递给启动的每个程序。只列出任务实际需要的密钥。

### 为单个命令授予密钥 {#grant-for-one-command}

命令行的一次性授予遵循与 `secrets` 列表相同的规则：只有你指定的进程会收到该值。

```sh
mise run --secrets STRIPE_KEY deploy        # deploy gets it; its dependencies do not
mise run --secrets-all deploy ::: smoke     # every injectable key, to those two tasks only
mise x --secrets GH_TOKEN -- gh release list
mise x -- gh release list                   # nothing; fnox never runs
```

- `mise run --secrets KEY[,KEY...]` 会将密钥提供给命令行指定的任务，包括 glob、`default` 或 `--all` 选中的任务，但不会提供给其依赖项、后置依赖项或由 `run` 条目启动的任务。任务自身的 `secrets` 列表仍然生效。
- `--secrets-all` 会将项目可以注入的所有键（fnox 中 `env = true` 或 `"exec"`，不包括 `env = false`）提供给同一批任务，也包括动态租约生成的键。如果某个键由 mise 自行设置，或任务沙箱会丢弃该键，则会警告并跳过，而不是让运行失败。
- `mise run` 使用 `unknown_flags = "value"`，因此任务名后的标志会传给任务：`mise run deploy --secrets X` 会把 `--secrets` 传给 `deploy` 并打印警告。mise 标志应放在任务名前；`--` 后的参数始终属于任务。
- `mise x --secrets` 和 `--secrets-all` 只将值提供给命令；普通 `mise x` 永远不会启动 fnox。没有设置或环境变量可以自动开启这些标志，shim、`mise en` 和 pitchfork 守护进程探测也不会传递它们。
- `mise x` 不能提供文件密钥（`as_file = true`），因为 mise 会通过 `exec` 交出进程，之后无法删除文件。`--secrets GCP_SA_JSON` 会失败，`--secrets-all` 会跳过文件键（请使用任务或 `fnox exec -- <command>`）。`mise x` 的 `--secrets-all` 还会按名称逐个向 fnox 请求，因此不会包含只能由动态租约产生的键。
- `mise x` 不会脱敏输出，因为 `exec` 会替换 mise；这与 `fnox exec` 相同。
- 这些标志要求项目存在 `[secrets.fnox]` 密钥源，属于实验性功能，并且在安全模式下会被拒绝。

### 组合值 {#compose-values}

任务自身的 `env` 值可以使用 <span v-pre>`{{ secrets.NAME }}`</span> 引用密钥。该引用本身就是授予，不需要再将键列在 `secrets` 中。

```toml
[tasks.migrate]
env.PGURL = "postgres://app:{{ secrets.DB_PASSWORD }}@db.internal/app"
run = 'psql "$PGURL" -f schema.sql'
```

`PGURL` 会在任务启动前组合，并在输出中脱敏。除非任务也在 `secrets` 中列出 `DB_PASSWORD`（`secrets = ["DB_PASSWORD"]` 会将它与 `PGURL` 一起导出），否则不会导出 `DB_PASSWORD` 本身。环境值不能使用任务导出的键名：`secrets = ["DB_PASSWORD"]` 与 <span v-pre>`env.DB_PASSWORD = "{{ secrets.DB_PASSWORD }}x"`</span> 会报错，因为两者都声明了同一个名称。`--secrets-all` 仍会按键名为任务提供所有可注入键（包括 `DB_PASSWORD`）；引用只会使键跳过列表键检查，因此 mise 设置或沙箱丢弃的名称会警告并跳过，而不会让运行失败。

- 这类值只能包含字面文本和 <span v-pre>`{{ secrets.NAME }}`</span>（大括号内的空格可选）。过滤器、其他变量、<span v-pre>`{{-`</span>、`secrets["NAME"]` 和 `{% raw %}` 都会报错；复杂组合请在 fnox 或任务脚本中完成。
- 启用 `env_shell_expand`（默认值）时，这类值的字面文本中出现 `$NAME`、`${...}` 或 `$$` 都会报错，因为 mise 不会对由密钥组合的值执行 shell 展开。引用前紧邻的 `$`（<span v-pre>`${{ secrets.X }}`</span>）始终报错。
- fnox 以文件形式提供的密钥（`as_file = true`）不能组合进值。
- 只能用于任务自身的 `env` 值（以及文件任务的 `#MISE env=` 头部）。不能用于 `run`（它会变成 `sh -c` 参数，其他本地用户可以通过 `ps` 读取；请改为读取 `$NAME`）、`[env]`、`[vars]`、`depends`、依赖项的 `env`、run 条目的 `env`、`[task_templates]`、`task_defaults`、钩子或 `[tools]`。
- 组合值遵循普通环境优先级。它会覆盖父任务的 env（通过 run 条目传入）、模板或较低配置块的值以及默认值。依赖项或 run 条目的 env 会替换任务自身定义的值，但叠加到任务上的 `[tasks.<name>]` 配置块仍按普通值规则优先。更高配置块的值或 `env.NAME = false` 会替换它，此时不会获取密钥。依赖项或 run 条目传入任务的 env 永远不是授予，因此不能偷偷带入引用。`[env]`、工具和设置不能设置同名变量。
- 其他环境值不能通过 <span v-pre>`{{ env.PGURL }}`</span> 或 `$PGURL` 读取组合变量；请直接由密钥构造它们。mise 会检查配置中的环境值、默认值和 path 指令，也会检查它解密的值（age）。指令渲染时才读取的内容（例如 `_.file` dotenv 文件或 `_.source` 脚本）不会被检查，并会看到密钥解析前的值。
- 远程任务和非项目任务不能使用引用，沙箱也必须保留该变量；其余规则与列出密钥相同。

`mise tasks info` 会显示模板而不显示值，`mise secrets ls` 会将任务列为 `migrate (env.PGURL)`。

### 值会去哪里，以及不会去哪里

这些值只会进入 mise 为任务启动的进程环境，并且是在 mise 渲染所有模板之后加入。它们在计算 `__MISE_DIFF` 后才添加，永远不会进入 `__MISE_DIFF`、`__MISE_SESSION`、环境缓存、模板上下文、hook-env、shim、`mise env` 输出、任务缓存或 `sh -c` 命令行。mise 会在任务环境中设置只包含名称的 `__MISE_SECRET_KEYS`，让嵌套 mise 知道不要继续传递它们。fnox 以文件提供的键（`as_file = true`）会写入权限为 0700 的目录，文件权限为 0600，`KEY` 设置为文件路径，任务结束时删除文件。

任务与 mise 使用同一个操作系统用户运行。授予机制可以阻止未获授予的任务得到密钥，但不能隔离同一用户的其他进程：其他进程可以在任务运行期间读取获授予任务的环境和密钥文件。

`run` 中的 <span v-pre>`{{ env.DEPLOY_KEY }}`</span> 无法看到已授予的密钥，因为密钥是在渲染 `run` 后才添加。请改为从环境读取（`"$DEPLOY_KEY"`）。mise 会在运行前报告这一点。

如果 mise 也为任务设置了某个键（来自 `[env]`、任务的 `env`、工具或设置），就会报错：通过 shim 启动的工具会重新计算该变量并覆盖密钥。任务沙箱会丢弃的键也会报错；请将其加入 `allow_env`。

### 登录、CI 与 fnox 守护进程

当 mise 在终端中运行时，fnox 可能会提示登录（例如密码管理器登录）。mise 会将终端交给 fnox，并像处理 `interactive = true` 任务一样，先等待其他运行中的任务结束。fnox 遵循自身的 `[daemon]` 设置并可能启动守护进程；mise 永远不会启动它。

在 CI、没有 TTY 或 stdin 不是终端时，mise 会以 `--non-interactive --no-daemon` 运行 fnox。fnox 无法在此处提示，因此请提前登录（例如 `op signin`），或向 CI 提供程序凭据。

### 使用 fnox 守护进程缓存

当 fnox 守护进程正在运行且已缓存值时，mise 会直接从守护进程套接字读取。命中缓存时会跳过解析用的 `fnox env --json` 调用，不会访问提供程序，也不会提示。mise 仍会在每次运行中调用一次 `fnox env --json --describe` 来检查授予。

```toml
# fnox.toml
root = true

[daemon]
enabled = true
```

| fnox 状态                                                                                              | mise 的处理                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目 fnox 配置中 `[daemon] enabled = true`，守护进程正在运行且所有键已缓存 | 使用一次套接字往返代替解析用的 fnox 调用。调试输出（`MISE_DEBUG=1`）会显示 `secrets: fnox daemon hit`。 |
| 键未缓存，或需要租约                                                                                    | 在终端运行 `fnox env --json`。fnox 会解析、按需提示并将值存入守护进程，下一次运行即可命中。 |
| `[daemon] enabled = false` 或 `FNOX_DAEMON=0`                                                       | 运行 fnox CLI，从不联系守护进程。mise 会从 `fnox env --json --describe` 读取 fnox 自身的决定；旧版 fnox 无法报告时也只使用 CLI。 |
| 没有运行守护进程                                                                                       | 运行 fnox CLI。如果 fnox 配置启用了守护进程，fnox 可能会启动它；mise 不会运行 `fnox daemon start`。 |
| 守护进程使用其他协议，或其套接字不属于当前用户                                                            | 运行 fnox CLI。 |
| 守护进程接受连接但未及时响应                                                                              | 本次运行剩余时间跳过它：fnox CLI 会以 `--no-daemon` 运行（仍为交互模式，因此可以提示）。 |
| CI、没有 TTY 或 stdin 不是终端                                                                           | 运行 `fnox env --json --non-interactive --no-daemon`。CI 永远不会通过守护进程解析。只有 `mise secrets ls` 表格会在 fnox 报告启用守护进程时查询运行中守护进程的协议。 |

解析为空的可选键以及需要租约的键始终通过 CLI。Windows 没有 fnox 守护进程，因此 mise 在那里始终使用 CLI。fnox 协议 6 更改了守护进程套接字位置，旧版 fnox 的守护进程会被忽略，直到它退出。这要求 fnox 支持守护进程协议 6；使用旧版 fnox 时 mise 会继续使用 CLI。

### 脱敏、原始输出与 stdin

接收密钥的任务始终会脱敏输出，因此 mise 会忽略其 `--raw` 和 `raw` 设置，也不会连接 stdin。为任务设置 `raw = true` 或 `interactive = true` 可将终端交给它；此时输出不会脱敏。相关提示和警告会说明这一点。

### 构件缓存

接收密钥的任务不会使用[任务构件缓存](/tasks/task-configuration.html)，因为缓存输出可能包含密钥。普通的 `sources`/`outputs` 新鲜度检查仍然生效。

### 拒绝授予密钥的启动方式

列出密钥的任务如果由 mise 钩子、`watch_files`、pitchfork 守护进程或 `mise bootstrap` 启动，则不会运行。请直接使用 `mise run`。

带 `shell = ...` 的钩子会在你的 shell 中运行，因此 mise 会在脚本运行期间为该 shell 标记 `__MISE_SECRETS_DENIED`。如果脚本提前返回或被中断，标记会保留，`mise run` 会拒绝在该 shell 中使用密钥，直到打开新 shell 或执行 `unset __MISE_SECRETS_DENIED`。这能防止任务获得无人请求的密钥；脚本也可以自行取消该变量。来自远程源（`git::`、`oci::` 或 URL 包含）的任务，以及在全局或系统配置中定义的任务，也不能列出密钥。列出密钥的任务文件或 `[tasks]` 条目还要求配置已受信任，即使普通任务定义不要求信任。

### 信任

在 CI 和 `paranoid` 模式之外，`mise run` 会隐式信任活动配置，因此克隆仓库并运行其中任务时，也会运行列出密钥的任务。在经常使用 AI 代理或不受信任仓库的机器上，请设置 `paranoid = true`，让每个配置都必须显式信任。

### 故障排查

| 消息                                                          | 处理方式                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `unknown secret X`                                            | 该键不在 fnox profile 中。检查 `mise secrets ls`、拼写和 profile。                                                            |
| `--secrets after the task name ...`                           | 将 mise 标志放在任务名之前：`mise run --secrets X deploy`。                                                                  |
| `X is a file secret` (`mise x`)                               | `mise x` 不能提供文件。请使用任务（`mise run`）或 `fnox exec -- <command>`。                                                 |
| `X cannot be injected`                                        | fnox 为其设置了 `env = false`。使用 `fnox get X` 读取，或在 `fnox.toml` 中设置 `env = "exec"`。                              |
| `"x y" is not a valid environment variable`                   | 使用符合 `[A-Za-z_][A-Za-z0-9_]*` 的名称。                                                                                   |
| `secrets = true is not supported`                             | 列出键名：`secrets = ["DEPLOY_KEY"]`。                                                                                        |
| per-task source options                                       | 尚不支持 `secrets = { fnox = ... }`；请列出键名。                                                                             |
| wildcards are not supported                                   | 逐个列出键。                                                                                                                  |
| `secrets is not allowed in [task_templates]`                  | 将 `secrets` 移到每个任务。                                                                                                  |
| comes from a remote source                                    | 远程任务不能列出密钥。将任务复制到项目中。                                                                                     |
| not project config                                            | 全局和系统配置不能列出密钥。将任务移到项目配置中。                                                                             |
| started by a mise hook, shell hook, watch_files, ...          | 直接运行任务：`mise run <task>`。shell 钩子中断后，打开新 shell 或执行 `unset __MISE_SECRETS_DENIED`。                         |
| `X is both a secret and a mise env var`                       | 只保留一个：将默认值移到 `fnox.toml`，或重命名 mise 变量。                                                                    |
| secret name `PATH` is reserved                                | mise 自己使用的名称不能被授予。                                                                                               |
| its sandbox denies env vars                                   | 将 `allow_env = ["X"]` 加入任务，或传入 `--allow-env X`。                                                                     |
| `fnox could not resolve X`                                    | fnox 提供程序失败。请登录，或向 CI 提供提供程序凭据。消息来自 fnox。                                                          |
| `not retrying X`                                              | fnox 在本次运行早些时候解析它时失败；请先修复最初的错误。                                                                     |
| <span v-pre>`{{ env.X }} in run cannot see the secret`</span> | 改为从环境读取 `"$X"`。                                                                                                     |

## 密钥源声明位置

`[secrets.fnox]` 只从项目的 `mise.toml` 文件读取。

- 每个字段以最近的文件为准。`mise.local.toml` 和 `mise.<env>.toml` 可以覆盖 `profile`。fnox 会在声明 `[secrets.fnox]` 的最近文件所在目录运行，并从那里查找 `fnox.toml`。
- 全局配置、系统配置以及主目录或其上层的文件会被忽略，因为它们适用于每个项目。`mise secrets ls` 和 `mise doctor` 会指出被忽略的文件。
- 该文件必须像其他项目配置一样[受信任](/cli/trust.html)。
- 安全模式（`MISE_SAFE=1`）拒绝使用密钥源。

## `mise secrets ls`

| 列          | 含义                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| KEY         | 密钥或租约键的名称                                                       |
| ENV         | fnox 的 `env` 设置：`true`、`exec`、`false`；租约键为 `-`                 |
| FILE        | fnox 以文件提供值时为 `yes`                                             |
| SCOPES      | `run`、`exec`：可以授予键的范围；fnox 不注入时为 `-`                     |
| TASKS       | `secrets` 列出该键且密钥源为当前源的任务                                  |
| DESCRIPTION | fnox 描述，或 `(lease <name>)`                                          |

授予问题（例如任务列出了 fnox 不存在的键）会作为带建议的警告打印到 stderr；退出码仍为 0。

`-J`/`--json` 以 JSON 输出相同信息：

```json
{
  "source": {
    "kind": "fnox",
    "root": "/home/me/src/app",
    "declared_in": ["/home/me/src/app/mise.toml"],
    "profile": "dev",
    "tool": {
      "path": "/home/me/.local/share/mise/installs/fnox/1.39.0/fnox",
      "version": "1.39.0"
    }
  },
  "keys": [
    {
      "key": "DEPLOY_KEY",
      "kind": "secret",
      "env": "exec",
      "as_file": false,
      "lease": null,
      "description": null,
      "scopes": ["run", "exec"],
      "tasks": [
        {
          "task": "deploy",
          "via": "list",
          "file": "/home/me/src/app/mise.toml"
        }
      ]
    }
  ],
  "dynamic_leases": [],
  "ignored": [],
  "problems": []
}
```

`env` 可以是 `true`、`"exec"`、`false`；租约键为 `null`。任务和 `mise x` 可以接收的键，其 `scopes` 为 `["run", "exec"]`；文件键（仅任务可用）为 `["run"]`；fnox 永远不注入的键为 `[]`。`problems` 列出引用未知或不可注入键的授予，每项包含 `task`、`key`、`kind` 和可选的 `suggestion`。`profile` 是 fnox 使用的 profile；当 `mise.toml` 未设置时，也可能来自 `FNOX_PROFILE` 或 `default`。

mise 会先在项目工具中查找 fnox CLI，然后在 `PATH` 中查找。

## 从 mise-env-fnox 迁移 {#migrating}

`mise-env-fnox` 和 `_.fnox-env` 会将所有 fnox 密钥放入 mise 环境，因此每个任务、钩子、shim 和 `mise env` 都能看到它们。要迁移到 mise secrets：

1. 从 `mise.toml` 移除 `_.fnox-env` 和 `mise-env-fnox` 插件。
2. 添加 `[secrets.fnox]`（如果使用过 profile，也添加 `profile`）。
3. 在需要密钥的每个任务中添加 `secrets = [...]`，只列出该任务需要的键，并在脚本中从环境读取（`$DEPLOY_KEY`）。
4. 使用 `mise secrets ls` 和 `mise tasks validate` 检查结果。

密钥不再出现在 shell 和 `mise env` 中，这正是目的；如果在 `mise run` 外运行的工具需要密钥，请使用 `fnox exec -- <command>`。`mise doctor` 会将该插件标记为已弃用。对于一次性命令，请使用 `mise x --secrets KEY -- <command>`。
