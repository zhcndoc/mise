---
description: "将 fnox 用作项目密钥来源：任务只会收到其声明的密钥，而 --secrets 可将密钥仅授予单条命令。"
---

# fnox <Badge type="warning" text="实验性" />

[fnox](https://fnox.jdx.dev) 可为项目提供密钥。任务通过 `secrets = [...]` 列出所需密钥。任务启动前，mise 会从 fnox 获取这些值，只将它们作为环境变量传给该任务，并在任务输出中隐藏密钥。你的 Shell、其他任务和 `mise env` 都无法读取这些值。

```mise-toml [mise.toml]
[secrets.fnox]

[tasks.deploy]
secrets = ["DEPLOY_KEY"]    # 仅 deploy 可获得 $DEPLOY_KEY，其他进程均不可见
run = './deploy.sh'
```

fnox 决定密钥的来源（1Password、AWS Secrets Manager、`fnox.toml` 中使用 age 加密的值，以及[更多来源](https://fnox.jdx.dev/providers/overview.html)），mise 则决定哪些进程可以接收密钥。

::: warning 实验性功能
mise secrets 仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true`，或运行 `mise settings experimental=true` 启用。
:::

## 为什么不用 `[env]`？ {#why-not-env}

mise 每次加载配置时都会读取所有 `[env]` 值，并解密 [SOPS](/environments/secrets/sops.html) 和 [age](/environments/secrets/age.html) 值。因此，所有加载该配置的进程都会获得这些值：

|                                     | `[env]` 值       | fnox 授权                                               |
| ----------------------------------- | ---------------- | ------------------------------------------------------ |
| 你激活的 Shell 和 `mise env`         | 是               | 否                                                     |
| 每个任务及其依赖                     | 是               | 仅列出该密钥的任务                                     |
| 在 Shell 中运行的 `mise x`           | 是               | 仅使用 `--secrets` 时                                  |
| 你手动运行的钩子和 shim              | 是               | 否                                                     |
| 获取值的时机                         | 每次加载配置     | 获准任务启动时                                         |
| 在任务输出中隐藏                     | 标记后隐藏       | 是，详见[原始输出](#redaction-raw-output-and-stdin)   |
| 无密码管理器时是否可用               | 是               | 是，需使用 fnox 的 age 提供程序                        |

如果密钥只应提供给某个任务（例如部署密钥），而不应提供给项目中的所有工具，请使用授权机制。

## 设置 {#quick-start}

### 1. 添加 fnox

```sh
mise use fnox
```

mise 需要 fnox 1.39.0 或更新版本。它会先在项目工具中查找 fnox CLI，再从 `PATH` 中查找。

### 2. 将 fnox 设为密钥来源并授权密钥

```mise-toml [mise.toml]
min_version = "2026.10.4"   # 旧版 mise 不支持任务中的 `secrets`

[settings]
experimental = true         # mise secrets 仍处于实验阶段

[secrets.fnox]

[tasks.deploy]
secrets = ["DATABASE_URL"]
run = './deploy.sh'         # 读取 $DATABASE_URL
```

若要使用 fnox 配置方案，请在 `[secrets.fnox]` 下添加 `profile = "dev"`；mise 会将其作为 `-P dev` 传给 fnox。

### 3. 在 fnox 中定义密钥

```toml [fnox.toml]
[secrets]
DATABASE_URL = { default = "postgres://localhost/app" }
```

`default` 是明文值，适合先试用整个流程。实际使用时，应将密钥指向 fnox 提供程序。使用 1Password 时，`fnox.toml` 只保存引用，密钥值仍保留在你的保险库中：

```toml [fnox.toml]
[providers.op]
type = "1password"
vault = "Engineering"

[secrets]
DATABASE_URL = { provider = "op", value = "Database/url" }
```

如果不使用密码管理器但希望提交加密值，请使用 fnox 的 [age 提供程序](https://fnox.jdx.dev/providers/age.html)：运行 `fnox set DATABASE_URL --provider age` 会将密文写入 `fnox.toml`。可运行 `fnox provider test op` 检查 fnox 是否能访问提供程序。其他用法请参阅 [fnox 快速入门](https://fnox.jdx.dev/guide/quick-start.html)和[提供程序列表](https://fnox.jdx.dev/providers/overview.html)。

### 4. 检查 mise 识别到的内容

```sh
mise secrets ls
```

```text
KEY           ENV   FILE  SCOPES     TASKS   DESCRIPTION
DATABASE_URL  true  no    run, exec  deploy
```

stderr 中的标题行会显示密钥来源、配置方案、fnox 版本和守护进程状态。所有列的说明见 [`mise secrets ls`](#mise-secrets-ls)。

### 5. 运行任务

```sh
mise run deploy
```

`deploy` 会收到 `DATABASE_URL`，该值在任务输出中的任何位置都会显示为 `[redacted]`。

### 密钥来源配置位置 {#where-the-source-is-declared}

mise 只会从项目的 `mise.toml` 文件读取 `[secrets.fnox]`。

- 每个字段都采用最近文件中的值。`mise.local.toml` 和 `mise.<env>.toml` 可以覆盖 `profile`。fnox 会在最近一个声明了 `[secrets.fnox]` 的文件所在目录运行，并从该目录查找 `fnox.toml`。
- 全局配置、系统配置以及主目录或其上级目录中的文件都会被忽略，因为这些配置会应用于所有项目。`mise secrets ls` 和 `mise doctor` 会列出被忽略的文件。
- 与其他项目配置一样，该文件必须先[受信任](/cli/trust.html)。
- 安全模式（`MISE_SAFE=1`）不会使用密钥来源。

### 为不同环境使用不同配置方案 {#profiles}

[fnox 配置方案](https://fnox.jdx.dev/guide/profiles.html)可为同一密钥保存不同值，例如开发和生产数据库的连接信息。可将它们与[配置环境](/configuration/environments.html)配合使用，由 `MISE_ENV` 选择配置方案：

```mise-toml [mise.toml]
min_version = "2026.10.4"

[secrets.fnox]
profile = "dev"

[tasks.deploy]
secrets = ["DATABASE_URL"]
run = './deploy.sh'
```

```mise-toml [mise.prod.toml]
[secrets.fnox]
profile = "prod"
```

```sh
mise run deploy                  # 使用 fnox dev 配置方案中的 DATABASE_URL
MISE_ENV=prod mise run deploy    # 使用 fnox prod 配置方案中的 DATABASE_URL
```

如果所有文件中都没有设置 `profile`，fnox 会使用 `FNOX_PROFILE` 指定的配置方案，或使用 `default`。

## 向任务授予密钥 {#granting-secrets-to-tasks}

```mise-toml [mise.toml]
min_version = "2026.10.4"

[secrets.fnox]
profile = "prod"

[tasks.build]
run = "cargo build"                         # 不接收密钥；fnox 不会为此任务运行

[tasks.deploy]
depends = ["build"]
secrets = ["DEPLOY_KEY", "DATABASE_URL"]    # 仅此任务可接收这两个密钥
run = './deploy.sh'                          # 读取 $DEPLOY_KEY
```

`mise run deploy` 会执行以下步骤：

1. 检查本次运行所需的每个密钥。若密钥不存在或无法注入，则不会运行任何任务。
2. 不向 `build` 传入密钥并运行它。
3. 调用一次 fnox 获取这两个密钥。
4. 在 `deploy` 的环境中注入密钥并启动任务。
5. 任务输出中的密钥值均显示为 `[redacted]`。

没有密钥授权的任务、因源文件未变化而跳过的任务、被用户取消的任务、`mise run -n`、`mise env`、已激活的 Shell 或 shim 都不会触发 fnox。

文件任务也可在文件头中使用相同字段：`#MISE secrets=["DEPLOY_KEY"]`。在 `[tasks.<name>]` 配置块中设置 `secrets = []` 会清空文件任务的密钥列表。`[task_templates.*]` 和 `monorepo.task_defaults` 中不允许设置 `secrets`，因此必须在接收密钥的任务上逐一声明授权。

### 哪些进程可以获得密钥 {#who-gets-what}

| 进程                                                            | 是否接收密钥                   |
| --------------------------------------------------------------- | ------------------------------ |
| 列出了该密钥的任务                                                | 是                              |
| 该任务的依赖项和后置依赖                                          | 否，仅按各自的列表接收           |
| 通过 `run = [{ task = "..." }]` 启动的任务                      | 否，仅按各自的列表接收           |
| 任务内部嵌套调用的 `mise run`                                     | 仅列出了该密钥的任务             |
| 任务启动的程序，包括 shim 和嵌套调用的 `mise x`                   | 是，会继承该环境变量             |
| 通过 `mise run --secrets KEY` 指定密钥的任务                      | 是，仅限本次运行                 |
| 未使用 `--secrets` 时从 Shell 调用的 `mise x`                     | 否                              |
| 钩子、`mise env`、`mise activate` 和守护进程                      | 否                              |

继承的值与其他环境变量相同：收到密钥的脚本可以将它传给启动的任何程序。每个任务只应列出实际所需的密钥。

## 为单条命令授予密钥 {#grant-for-one-command}

在命令行中临时授予密钥时，规则与 `secrets` 列表相同：只有你指定的进程会收到密钥值。

```sh
mise run --secrets STRIPE_KEY deploy        # 仅 deploy 获得密钥，其依赖项不会获得
mise run --secrets-all deploy ::: smoke     # 仅这两个任务获得所有可注入密钥
mise x --secrets GH_TOKEN -- gh release list
mise x -- gh release list                   # 不会获取密钥；fnox 不会运行
```

- `mise run --secrets KEY[,KEY...]` 会将密钥授予命令行中指定的任务，包括通过 glob、`default` 或 `--all` 选择的任务；但不会授予其依赖、后置依赖或由 `run` 条目启动的任务。任务自己的 `secrets` 列表仍然有效。
- `--secrets-all` 会将项目中所有可注入的密钥（fnox 的 `env = true` 或 `"exec"`，不包括 `env = false`）授予同一命令中指定的任务，也包括动态租约生成的密钥。若密钥由 mise 本身设置，或会被任务沙箱丢弃，则会跳过并警告，而不会导致本次运行失败。
- `mise run` 会将任务名之后的参数传给任务，因此 `mise run deploy --secrets X` 会把 `--secrets` 传给 `deploy` 并显示警告。mise 的选项应放在任务名之前。`--` 后的参数始终传给任务。
- `mise x --secrets` 和 `--secrets-all` 只会将密钥值传给指定命令。没有任何设置或环境变量会自动启用这些选项；shim、`mise en` 和 pitchfork 守护进程探测也不会传递这些选项。
- `mise x` 不能授予文件密钥（`as_file = true`），因为 mise 会通过 `exec` 将进程控制权交出，之后无法删除该文件。`--secrets GCP_SA_JSON` 会报错，`--secrets-all` 会跳过文件密钥；请改用任务或 `fnox exec -- <command>`。`mise x` 的 `--secrets-all` 也会按名称向 fnox 请求各密钥，因此不会包括仅由动态租约生成的密钥。
- mise 不会隐藏 `mise x` 的输出，因为 `exec` 会替换 mise。`fnox exec` 的行为相同。
- 这些选项要求项目中存在 `[secrets.fnox]` 来源，且安全模式下不可使用。

## 组合密钥值 {#compose-values}

任务自身的 `env` 值可以通过 <span v-pre>`{{ secrets.NAME }}`</span> 引用密钥。该引用本身即表示授权，无需再将密钥列入 `secrets`。

```mise-toml [mise.toml]
[tasks.migrate]
env.PGURL = "postgres://app:{{ secrets.DB_PASSWORD }}@db.internal/app"
run = 'psql "$PGURL" -f schema.sql'
```

mise 会在任务启动前组合出 `PGURL`，并在任务输出中隐藏它。除非任务也在 `secrets` 中列出 `DB_PASSWORD`，否则不会导出该密钥本身。`mise tasks info` 只显示模板，不显示密钥值；`mise secrets ls` 会将该任务列为 `migrate (env.PGURL)`。

- 值中只能包含字面文本和 <span v-pre>`{{ secrets.NAME }}`</span> 引用。过滤器、其他变量、<span v-pre>`{{-`</span>、`secrets["NAME"]` 和 `{% raw %}` 都会导致错误；更复杂的值应在 fnox 或任务脚本中组合。
- 只能在任务自身的 `env` 值中使用引用，文件任务的 `#MISE env=` 文件头也适用。不能在 `run` 中使用（它会成为 `sh -c` 参数，其他本机用户可通过 `ps` 读取；请改为从 `$NAME` 环境变量读取），也不能用于 `[env]`、`[vars]`、`depends`、依赖项或 run 条目的 `env`、`[task_templates]`、`task_defaults`、钩子或 `[tools]`。
- 其他环境变量不能通过 <span v-pre>`{{ env.PGURL }}`</span> 或 `$PGURL` 读取组合后的变量；应直接从密钥组合它们。
- fnox 以文件形式提供的密钥（`as_file = true`）不能用于组合。
- 远程任务和非项目任务不能使用引用；与单独列出密钥一样，任务沙箱也必须保留该变量。

### 组合规则 {#composition-rules}

- 当 `env_shell_expand`（默认启用）打开时，组合值的字面文本中任何位置出现 `$NAME`、`${...}` 或 `$$` 都会报错，因为 mise 不会对由密钥构造的值执行 Shell 展开。引用前紧邻的 `$`（<span v-pre>`${{ secrets.X }}`</span>）也始终会报错。
- 环境变量值不能占用任务导出的密钥名称：例如同时设置 `secrets = ["DB_PASSWORD"]` 和 <span v-pre>`env.DB_PASSWORD = "{{ secrets.DB_PASSWORD }}x"`</span> 会报错，因为两者使用了相同名称。
- `--secrets-all` 仍会以密钥原名向任务提供所有可注入密钥，包括 `DB_PASSWORD`。引用仅会让该密钥不参与已列出密钥的检查；若名称已由 mise 使用或被沙箱丢弃，则会跳过并警告，而不会导致任务失败。
- 组合值遵循常规环境变量优先级。它会覆盖父任务（通过 run 条目传入）的环境变量、模板或较低配置块中的值以及默认值。依赖项或 run 条目的环境变量会覆盖任务自身定义中的值，但叠加在任务上的 `[tasks.<name>]` 配置块仍按普通值的规则优先。更高优先级配置块中的值或 `env.NAME = false` 会覆盖该值，此时不会获取密钥。从依赖项或 run 条目传入任务的环境变量不会被视为授权，因此不能传递密钥引用。`[env]`、工具和设置不能使用同一名称。
- mise 会检查配置中的环境变量值、默认值和路径指令，以及解密后的 age 值，确认它们不会读取组合变量。指令仅在渲染时读取的内容不会检查，例如 `_.file` dotenv 文件内容或 `_.source` 脚本读取的值；它们看到的是密钥注入前的值。

## 登录、CI 与 fnox 守护进程 {#signing-in-ci-and-the-fnox-daemon}

fnox 会使用项目中已激活 Shell 的环境运行：包括进程变量、项目工具和 `[env]`。提供程序的凭据（例如 `OP_SERVICE_ACCOUNT_TOKEN` 或 `AWS_PROFILE`）会以与 `fnox exec` 相同的方式传给 fnox。

当 mise 在终端中运行时，fnox 可能会提示你登录，例如登录密码管理器。mise 会将终端交给 fnox，并等待其他运行中的任务结束，行为与 `interactive = true` 任务相同。fnox 会遵循自己的 `[daemon]` 设置，也可能启动自己的守护进程；mise 不会启动它。

在 CI、没有 TTY 或 stdin 不是终端时，mise 会使用 `--non-interactive --no-daemon` 运行 fnox。此时 fnox 无法提示你登录，因此需要预先登录（例如运行 `op signin`），或向 CI 提供程序凭据。

### 在 CI 中运行 {#run-in-ci}

向执行器提供一个 fnox 可用于读取其他密钥的凭据，然后像在本地一样运行任务。以下示例使用 GitHub Actions 和 1Password：

```yaml [.github/workflows/deploy.yml]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: jdx/mise-action@v5
      - run: mise run deploy
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
```

- `experimental = true` 必须在 CI 中生效。可在提交的 `mise.toml` 的 `[settings]` 下设置，或在工作流中设置 `MISE_EXPERIMENTAL=1`；全局配置或 `mise.local.toml` 中的设置不会自动传入。
- 如果提供程序需要 CLI，请将其加入项目工具，例如通过 `mise use 1password` 安装 `op`，以便 mise-action 与 fnox 一同安装它。
- 凭据是普通环境变量，因此该步骤中的每个进程都能读取。请只在需要凭据的步骤中设置，不要放在整个 job 上。
- 任务输出中的密钥会被隐藏。CI 没有终端，因此任务的 `raw = true` 或 `interactive = true` 不会关闭隐藏功能。`mise x --secrets` 的输出始终不会隐藏；mise-action 的掩码只覆盖标记为敏感值的 `[env]` 变量，这类步骤需要自行配置掩码。

每个提供程序都使用自己的凭据，例如 age 加密值使用 `FNOX_AGE_KEY`，AWS 使用 OIDC；fnox 的 [CI 指南](https://fnox.jdx.dev/guide/ci.html)列出了相关说明。

### 使用 fnox 守护进程缓存 {#caching-with-the-fnox-daemon}

如果 fnox 守护进程正在运行且已缓存密钥值，mise 会直接从其 socket 读取：

```toml [fnox.toml]
root = true

[daemon]
enabled = true
```

- 命中缓存时，mise 会通过一次 socket 往返读取密钥，取代解析密钥时的 `fnox env --json` 调用：不访问提供程序，也不会提示登录。设置 `MISE_DEBUG=1` 后会显示 `secrets: fnox daemon hit`。mise 仍会在每次运行时调用一次 `fnox env --json --describe`，以检查授权。
- 缓存未命中时（密钥尚未缓存或需要租约），mise 会在终端中运行 `fnox env --json`。fnox 会解析密钥、在需要时提示登录，并将值存入守护进程；因此，下次运行时无需租约的密钥都会命中缓存。
- 当 fnox 配置中设置 `[daemon] enabled = false`、设置了 `FNOX_DAEMON=0`、守护进程未运行、协议版本不匹配、socket 不属于当前用户、处于 CI 或无终端环境，以及在 Windows 上（fnox 没有 Windows 守护进程）时，mise 会改用 fnox CLI。mise 会通过 `fnox env --json --describe` 读取 fnox 自身的判断，因此过旧的 fnox 若无法报告该信息，也只会使用 CLI。
- 如果守护进程接受连接但未及时响应，本次运行的后续操作会跳过它；之后 fnox CLI 会以 `--no-daemon` 运行，但仍可交互。
- 解析结果为空的可选密钥以及需要租约的密钥始终通过 CLI 获取。

## mise 如何保护密钥 {#where-values-go-and-where-they-never-go}

### 密钥值的去向 {#where-values-go}

mise 会在渲染完所有模板后，将密钥值加入任务进程。它们不会传到你的 Shell、`mise env`、你手动运行的 shim、任务缓存、mise 环境缓存或任务命令行中。fnox 以文件形式提供密钥（`as_file = true`）时，mise 会将文件写入仅所有者可访问的目录，把 `KEY` 设为文件路径，并在任务结束时删除文件。

任务与 mise 以相同的操作系统用户身份运行。授权机制可以阻止未获授权的任务读取密钥，但不能隔离同一用户的其他进程：任务运行期间，这些进程仍可读取获授权任务的环境变量和密钥文件。

由于 mise 会在渲染 `run` 后才注入密钥，因此其中的 <span v-pre>`{{ env.DEPLOY_KEY }}`</span> 无法读取已授权密钥。请改为从环境变量读取（`"$DEPLOY_KEY"`）。mise 会在运行任何任务前报告此问题。

如果 mise 也通过 `[env]`、任务的 `env`、工具或设置为任务设置了同名变量，就会报错：通过 shim 启动的工具会重新计算该变量，从而覆盖密钥。若任务沙箱会丢弃该变量，也会报错；请将它加入 `allow_env`。

### 密钥隐藏、原始输出与 stdin {#redaction-raw-output-and-stdin}

接收密钥的任务始终会隐藏输出，因此 mise 会忽略其 `--raw` 和 `raw` 设置，也不会连接 stdin。若在任务中设置 `raw = true` 或 `interactive = true`，mise 会将终端交给任务，此时不再隐藏其输出。此行为仅在 mise 于终端中运行时适用：像 CI 这样的无终端环境中，mise 会发出警告，但仍会隐藏任务输出。

### 任务缓存 {#artifact-cache}

接收密钥的任务不会使用[任务制品缓存](/tasks/caching.html)，因为缓存的输出可能包含密钥。普通的 `sources`/`outputs` 新鲜度检查仍然有效。

### 不支持密钥授权的调用方式 {#launchers-that-refuse-grants}

- 由 mise 钩子、`watch_files`、pitchfork 守护进程或 `mise bootstrap` 启动时，声明了密钥的任务不会运行。请直接使用 `mise run` 启动。
- 来自远程来源（`git::`、`oci::` 或 URL include）的任务，以及在全局或系统配置中定义的任务，不能声明密钥。
- 文件任务或 `[tasks]` 条目只要声明了密钥，其配置就必须受信任；普通任务定义则没有此要求。

带有 `shell = ...` 的钩子会在你自己的 Shell 中运行，因此脚本运行期间，mise 会用 `__MISE_SECRETS_DENIED` 标记该 Shell。如果脚本提前返回或被中断，该标记会保留，`mise run` 在此 Shell 中就不会授予密钥；请打开新的 Shell，或运行 `unset __MISE_SECRETS_DENIED`。该标记可避免任务意外收到无人授权的密钥；脚本本身也可以将其清除。

### 信任 {#trust}

在 [`paranoid`](/paranoid.html) 模式以外，`mise run` 会隐式信任当前配置；在 CI 中，mise 会信任所有配置文件。因此，克隆仓库并在其中运行任务时，该仓库的所有任务都会运行，包括声明了密钥的任务。在常运行 AI 智能体或处理不受信任仓库的机器上，请设置 `paranoid = true`，要求显式信任每个配置文件。

## 故障排查 {#troubleshooting}

可以先运行以下命令，逐步定位问题：

```sh
mise secrets ls                       # 检查密钥来源、密钥和授权状态
mise tasks validate                   # 检查授权是否包含未知密钥或与 [env] 冲突
mise x -- fnox check --all            # 检查 fnox 能否解析所有密钥
MISE_DEBUG=1 mise run deploy          # 查看 mise 如何调用 fnox 以及守护进程是否响应
```

| 错误信息包含                                                   | 处理方式                                                                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `unknown secret X`                                            | fnox 配置方案中没有此密钥。请检查 `mise secrets ls`、密钥拼写和配置方案。                                                      |
| `--secrets after the task name`                               | 将 mise 选项放在任务名前：`mise run --secrets X deploy`。                                                                      |
| `X is a file secret (as_file = true)`                         | `mise x` 无法传递文件。请使用任务（`mise run`）或 `fnox exec -- <command>`。                                                   |
| `X cannot be injected`                                        | fnox 为该密钥设置了 `env = false`。请通过 `fnox get X` 读取，或在 `fnox.toml` 中将 `env` 设为 `"exec"`。                       |
| `is not a valid environment variable name`                    | 使用符合 `[A-Za-z_][A-Za-z0-9_]*` 的名称。                                                                                    |
| `secrets = true is not supported`                             | 列出密钥名称，例如 `secrets = ["DEPLOY_KEY"]`。                                                                               |
| `per-task source options`                                     | 目前不支持 `secrets = { fnox = ... }`；请改为列出密钥名称。                                                                    |
| `wildcards are not supported`                                 | 逐一列出密钥。                                                                                                                |
| `secrets is not allowed in [task_templates.<t>]`              | 在每个任务中分别设置 `secrets`。                                                                                               |
| `comes from a remote source`                                  | 远程任务不能声明密钥。请将任务复制到项目中。                                                                                  |
| `which is not project config`                                 | 全局和系统配置不能声明密钥。请将任务移到项目配置中。                                                                          |
| `but it was started by`                                       | 直接运行任务：`mise run <task>`。Shell 钩子被中断后，请打开新 Shell 或运行 `unset __MISE_SECRETS_DENIED`。                     |
| `X is both a secret and a mise env var`                       | 只保留一个定义：将默认值移到 `fnox.toml`，或重命名 mise 环境变量。                                                             |
| `secret name PATH is reserved by mise`                        | 不能授权 mise 自身使用的名称。                                                                                                |
| `but its sandbox denies env vars`                             | 在任务中添加 `allow_env = ["X"]`，或传入 `--allow-env X`。                                                                    |
| `fnox could not resolve X`                                    | fnox 提供程序解析失败。请登录或向 CI 提供程序凭据。其余错误信息来自 fnox。                                                     |
| `not retrying X`                                              | fnox 在本次运行中较早时已解析该密钥失败；请先修复最初的错误。                                                                 |
| <span v-pre>`{{ env.X }} in run cannot see the secret`</span> | 请改为从环境变量读取：`"$X"`。                                                                                                |

## `mise secrets ls` {#mise-secrets-ls}

[`mise secrets ls`](/cli/secrets/ls.html) 会显示现有密钥以及列出它们的任务，但不会显示密钥值。

```text
fnox · profile dev · ~/src/app (mise.toml) · fnox 1.39.0 · daemon: running (protocol 6)
KEY                ENV    FILE  SCOPES     TASKS   DESCRIPTION
AWS_ACCESS_KEY_ID  -      no    run, exec          (lease aws)
DATABASE_URL       true   no    run, exec  deploy  app database
DEPLOY_KEY         exec   no    run, exec  deploy
GCP_SA_JSON        exec   yes   run
SIGNING_KEY        false  no    -                  release signing key
```

标题行写入 stderr，表格写入 stdout。标题行末尾会显示 fnox 守护进程状态：`daemon: running (protocol N)`、`daemon: not running`、`daemon: disabled`、`daemon: not responding`、`daemon: socket <path> is not owned by you`，或 fnox 版本过旧而无法报告时的 `daemon: not used (...)`。只有 fnox 报告已启用守护进程时，mise 才会向其请求数据；mise 不会启动守护进程。

| 列          | 含义                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| KEY         | 密钥或租约键的名称                                                       |
| ENV         | fnox 的 `env` 设置：`true`、`exec`、`false`；租约键为 `-`                 |
| FILE        | fnox 以文件提供值时为 `yes`                                             |
| SCOPES      | `run`、`exec`：可以授予键的范围；fnox 不注入时为 `-`                     |
| TASKS       | `secrets` 列出该键且密钥源为当前源的任务                                  |
| DESCRIPTION | fnox 描述，或 `(lease <name>)`                                          |

授权问题（例如任务列出了 fnox 中不存在的密钥）会作为警告及建议写入 stderr；退出码仍为 0。

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

- `env` 为 `true`、`"exec"`、`false`；租约密钥对应的值为 `null`。
- 任务和 `mise x` 均可接收的密钥，其 `scopes` 为 `["run", "exec"]`；文件密钥（仅任务可用）为 `["run"]`；fnox 永不注入的密钥为 `[]`。
- `problems` 会列出引用未知或不可注入密钥的授权项，每项包含 `task`、`key`、`kind` 和可选的 `suggestion`。
- `profile` 是 fnox 实际使用的配置方案；如果 `mise.toml` 未设置，则显示 `FNOX_PROFILE` 或 `default`。

## 从 mise-env-fnox 迁移 {#migrating}

`mise-env-fnox` 和 `_.fnox-env` 会将所有 fnox 密钥放入 mise 环境中，因此每个任务、钩子、shim 和 `mise env` 都能读取它们。若要改用 mise secrets：

1. 从 `mise.toml` 中移除 `_.fnox-env` 和 `mise-env-fnox` 插件。
2. 添加 `[secrets.fnox]`，如果之前使用了 `profile`，也请添加该字段。
3. 在每个需要密钥的任务中添加 `secrets = [...]`，且只列出所需密钥。在脚本中从环境变量读取它（`$DEPLOY_KEY`）。
4. 使用 `mise secrets ls` 和 `mise tasks validate` 检查结果。

迁移前：

```mise-toml [mise.toml]
[tools]
fnox = "latest"

[plugins]
fnox-env = "https://github.com/jdx/mise-env-fnox"

[env]
_.fnox-env = { tools = true }

[tasks.deploy]
run = './deploy.sh'
```

迁移后：

```mise-toml [mise.toml]
min_version = "2026.10.4"

[settings]
experimental = true

[tools]
fnox = "latest"

[secrets.fnox]

[tasks.deploy]
secrets = ["DEPLOY_KEY"]
run = './deploy.sh'
```

使用 `fnox exec -- ...` 包装命令的任务仍可继续使用。移除包装器并改用 `secrets` 列表后，任务只会获得指定的密钥，而不是 fnox 注入的所有密钥；输出中的密钥也会被隐藏。

密钥值不会再出现在 Shell 或 `mise env` 中，这正是此迁移的目的。如果在 `mise run` 之外运行的工具需要密钥，请使用 `mise x --secrets KEY -- <command>` 或 `fnox exec -- <command>`。`mise doctor` 会提示该插件已弃用。
