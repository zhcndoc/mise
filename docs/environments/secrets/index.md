---
description: "选择向项目提供密钥值的方式，并在任务输出与 CI 日志中遮蔽敏感值。"
---

# 密钥

不要将机密值直接写入明文配置。mise 可以通过 fnox 从密钥管理器获取机密，也可以解密提交到仓库
中的文件和数值；对于标记为敏感的信息，mise 会在捕获的输出中将其遮蔽。

| 方式                                                                | 提交到仓库的内容                                               | 可以获取这些值的对象                                           | 所需条件                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| [fnox](/environments/secrets/fnox.html)（实验性，推荐）              | `fnox.toml` 中的机密引用或加密值                                | 仅列出该键的任务，以及使用 `--secrets` 运行的命令                | fnox 1.39.0 或更高版本，且可访问相应密钥提供方            |
| [SOPS 文件](/environments/secrets/sops.html)                       | 加密的 `.env.json`、`.env.yaml` 或 `.env.toml` 文件             | 所有加载 `[env]` 的对象：shell、任务、`mise env`                 | age 身份，或用于 KMS、Vault、PGP 的 `sops` CLI          |
| [age 值](/environments/secrets/age.html)（实验性）                  | `mise.toml` 中的加密值                                           | 所有加载 `[env]` 的对象                                        | age 身份或 SSH 密钥                                      |
| 未跟踪文件                                                          | 无；`mise.local.toml` 或 `.env` 已列入 `.gitignore`             | 所有加载 `[env]` 的对象                                        | 无                                                       |

## 使用密钥管理器 {#use-a-secret-manager}

Add fnox to the project:

```sh
mise use fnox
```

接着启用仍处于实验阶段的 mise secrets，将 fnox 指定为项目的密钥来源，并列出每项任务需要的键：

```mise-toml [mise.toml]
min_version = "2026.10.4"

[settings]
experimental = true

[secrets.fnox]

[tasks.deploy]
secrets = ["DEPLOY_KEY", "DATABASE_URL"]
run = "./deploy.sh"
```

`mise run deploy` 只会将这两个键提供给 `deploy`，并在任务输出中遮蔽它们。该任务的依赖项、你的
shell、钩子和 `mise env` 都无法获取这些值；`deploy` 启动的程序则会像继承其他环境变量一样继承
它们。fnox 可从 1Password、AWS Secrets Manager 和 AWS KMS 等提供方读取机密。mise 侧的配置请
参见 [fnox](/environments/secrets/fnox.html)，提供方的设置方式请参见
[fnox 文档](https://fnox.jdx.dev)。

若要声明由 `mise bootstrap` 写入受管理文件的机密（例如服务凭据），请参见
[Bootstrap 密钥输入](/bootstrap/secrets.html)。

## 加密仓库文件或配置值 {#encrypt-repository-files-or-values}

如果机密应保存在单独文件中，请使用 [SOPS 文件](/environments/secrets/sops.html)；如果只需在
`mise.toml` 中保存少量加密变量，请使用 [age 值](/environments/secrets/age.html)。可以将密文
提交到仓库，但请在仓库之外共享解密身份。

SOPS 和 age 值都是普通的 `[env]` 值。每次加载配置时，mise 都会对它们解密，因此已激活的
shell、任务和 `mise env` 都能读取明文。将 SOPS 值标记为 `redact = true`，即可避免其出现在
任务输出中；age 值默认会被遮蔽。

## 遮蔽与 CI 日志屏蔽 {#redaction}

遮蔽会在 mise 捕获的输出中用 `[redacted]` 替换敏感值。它不会加密任何内容，mise 启动的程序仍会
收到真实值。

### 将值标记为敏感信息 {#mark-values-as-sensitive}

在变量或指令上设置 `redact = true`，即可将变量或指令加载的所有值标记为敏感信息：

```toml [mise.toml]
[env]
SECRET = { value = "my_secret", redact = true }
_.file = { path = ".env.json", redact = true }
```

也可以在顶层 `redactions` 数组中列出变量名，并使用 `*` 通配符：

```toml [mise.toml]
redactions = ["SECRET_*", "*_TOKEN", "PASSWORD"]

[env]
API_TOKEN = "token_123"
```

将变量的 `redact` 设为 `false`，可使其不受 `redactions` 模式（包括全局配置中的模式）影响：

```toml [mise.toml]
[env]
TEST_TOKEN = { value = "not-sensitive", redact = false }
```

如果变量设置了 `redact = false`，`mise env --redacted` 就不会列出它；使用该列表的
[CI 屏蔽](#ci-masking)也不会屏蔽它。

调用方为 `required` 变量提供的值，或覆盖 `default` 的值，如果对应条目设置了 `redact = true`
或变量名匹配 `redactions` 模式，mise 也会对其进行遮蔽：

```mise-toml [mise.toml]
[tasks.deploy]
env = { ASC_KEY_ID = { required = true, redact = true } }
run = "./deploy.sh"
```

mise 会匹配具体的值，而不是变量名：标记某个值后，mise 会在处理的输出中将该文本全部替换。

### 遮蔽范围 {#what-redaction-covers}

mise 会遮蔽：

- 使用 `mise run` 运行的任务输出，以及 mise 打印的任务命令行
- mise 自身的日志消息
- `mise set` 输出中的值列（传入 `--no-redact` 可查看原始值）

mise 不会遮蔽：

- 使用 [`raw = true`](/tasks/task-configuration.html#raw) 或
  [`interactive = true`](/tasks/task-configuration.html#interactive) 的任务，以及传入 `--raw`
  或启用 `raw` 设置的运行；这类输出会直接写入终端。配置了遮蔽规则时，mise 会显示提示。
- `mise exec` 的输出，因为 mise 会将进程控制权交给命令
- `mise env` 的输出，因为它会有意打印真实值（参见[导出敏感值](#export-redacted-values)）

The [`task.output`](/configuration/settings.html#task.output) modes `replacing`
and `timed` do not print every line. In CI, use `prefix` or `interleave`, for
example `MISE_TASK_OUTPUT=prefix mise run build`, to keep complete, redacted
logs.

### Export sensitive values {#export-redacted-values}

`mise env` prints real values, including values marked as sensitive.
`--redacted` selects only the sensitive variables and still prints their values.
Use these flags to hand secrets to another program on purpose:

```sh
mise env --redacted            # only sensitive variables, as shell code
mise env --values              # only values, one per line
mise env --redacted --values   # only the values of sensitive variables
```

### CI masking {#ci-masking}

[mise-action](https://github.com/jdx/mise-action) registers GitHub Actions masks
for values marked with `redact = true` or matching `redactions`. When you resolve
secrets outside that action, register masks before running commands that might
print them.

In a custom GitHub Actions step with Bash and `jq`, export JSON so whitespace is
preserved, and escape each value the way workflow commands require:

```sh
set -o pipefail
mise env --redacted --json | jq -r '
  .[] | select(length > 0) |
  "::add-mask::" + (gsub("%"; "%25") | gsub("\r"; "%0D") | gsub("\n"; "%0A"))
'
```

This follows the
[workflow-command escaping in the Actions toolkit](https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts).
Do not loop over values with word splitting, such as `for value in $(...)`,
which breaks values that contain spaces or newlines.
