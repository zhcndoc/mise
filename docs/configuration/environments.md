---
description: "通过 -E 或 MISE_ENV 选择配置环境，加载 mise.production.toml 等额外配置文件。"
socialDescription: "通过 -E 或 MISE_ENV 加载 mise.production.toml 等额外配置文件。"
---

# 配置环境

配置环境会在 `mise.toml` 的基础上额外加载配置文件，例如 `mise.development.toml` 或 `mise.production.toml`。可使用 `-E` 或 `MISE_ENV` 选择环境；基础配置 `mise.toml` 仍会加载，同一目录中的环境文件则会覆盖其中的设置。

选择配置环境不会为应用设置 `NODE_ENV` 等变量。请在环境文件的[`[env]`](/environments/) 中自行定义这些变量。

## 尝试使用环境

::: code-group

```toml [mise.toml]
[env]
APP_MODE = "development"
```

```toml [mise.production.toml]
[env]
APP_MODE = "production"
```

:::

```sh
mise exec -- sh -c 'echo "$APP_MODE"'               # development
mise -E production exec -- sh -c 'echo "$APP_MODE"' # production
mise -E production config                           # list the loaded files
```

## 选择环境

由于环境选择会决定要加载哪些配置文件，因此不能在 `mise.toml` 中选择环境。请使用以下方式之一，优先级从高到低排列：

| 方式                 | 示例                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| CLI flag             | `mise -E production run deploy` or `--env production`                 |
| Environment variable | `MISE_ENV=production`                                                 |
| `.miserc.toml`       | `env = ["production"]`; see [below](#setting-mise-env-in-miserc-toml) |

如需选择多个环境，请用逗号分隔：`mise -E ci,test run build` 或 `MISE_ENV=ci,test`。在同一目录中，若两个所选环境设置了相同的值，同类文件中后选的环境优先；但本地文件始终会覆盖共享文件（详见[文件名和优先级](#file-names-and-precedence)）。例如，选择 `ci,test` 时，`mise.ci.local.toml` 会覆盖 `mise.test.toml`。运行 `mise -E ci,test config` 可查看合并后的环境选择。

### 在 .miserc.toml 中设置默认环境 {#setting-mise-env-in-miserc-toml}

可将默认环境选择提交到 `.miserc.toml`。mise 会先于其他配置文件读取此文件：

```toml [.miserc.toml]
env = ["development"]
```

个人选择可写入不提交的 `.miserc.local.toml`；仅供单台机器使用的设置可写入 `~/.config/mise/miserc.local.toml`。所有文件位置及其合并方式请参阅[`.miserc.toml`](/configuration.html#miserc)。

## 文件名和优先级 {#file-names-and-precedence}

在项目目录中，此表中位置较高的文件会覆盖位置较低的文件：

| 文件                    | 用途                                                   |
| ----------------------- | ----------------------------------------------------- |
| `mise.<env>.local.toml` | 单个环境的个人覆盖设置，不提交                        |
| `mise.local.toml`       | 个人覆盖设置，不提交                                   |
| `mise.<env>.toml`       | 单个环境的共享配置                                     |
| `mise.toml`             | 共享配置                                               |

因此，选择 `production` 环境时，你的 `mise.local.toml` 会覆盖已提交的 `mise.production.toml`。如果只想覆盖某个环境的值，请将其写入 `mise.production.local.toml`。请将 `mise.local.toml` 和 `mise.*.local.toml` 加入 `.gitignore`。

其他项目配置位置也使用相同的环境命名方式，例如 `mise/config.<env>.toml`、`.mise/config.<env>.toml` 和 `.config/mise.<env>.toml`；详见[配置文件位置](/configuration.html#mise-toml)。在同一目录中，`mise/config.<env>.toml` 等环境文件会覆盖所有不带环境名的共享文件；`mise/config.local.toml` 等本地文件会覆盖这两类文件；`mise/config.<env>.local.toml` 等环境本地文件则会覆盖所有其他文件。在每一层中，后选的环境优先。

全局配置目录（`~/.config/mise`）中的 `config.<env>.toml` 和 `config.<env>.local.toml` 也遵循相同顺序，因此 `config.local.toml` 会覆盖 `config.<env>.toml`。

如果设置了[`override_config_filenames`](/configuration/settings.html#override_config_filenames)，其中的文件名会替代 `mise.toml`、`mise.local.toml` 等默认名称。`mise.<env>.toml` 和 `mise.<env>.local.toml` 等环境文件仍会加载。

## 写入环境文件

除非使用子命令自身的 `--env` 标志指定环境，否则 `mise use` 和 `mise set` 都会写入共享文件：

```sh
mise use --env staging node@24                             # writes mise.staging.toml
mise set --env staging API_URL=https://staging.example.com # writes mise.staging.toml
```

放在子命令前的全局 `-E`（例如 `mise -E staging set ...`）只用于选择要加载的文件；写入目标仍是共享配置 `mise.toml`。如果环境文件不存在，两个命令都会创建该文件。完整规则请参阅[mise 写入哪个文件](/configuration.html#target-file-for-write-operations)。

## 在任务和模板中使用环境

mise 会将所选环境以逗号分隔后作为 `MISE_ENV` 导出给任务和其他子命令。模板可通过 <code v-pre>{{ mise_env }}</code> 读取相同的列表：

```mise-toml [mise.toml]
[tasks.deploy]
run = """
{% if mise_env is not defined %}echo "select an environment with -E" >&2; exit 1{% endif %}
echo deploying to {{ mise_env | first }}
"""
```

`mise -E staging run deploy` 会输出 `deploying to staging`；`mise run deploy` 则会因 `select an environment with -E` 而失败。未选择环境时，`mise_env` 未定义。此时直接使用 <code v-pre>{{ mise_env }}</code> 或 `join` 等过滤器都会导致渲染失败，但 `first` 会返回空值而不报错。使用前请检查 `mise_env is defined`。[平台环境](#platform-environments)不会包含在 `MISE_ENV` 或 `mise_env` 中。

<a id="conf-d-environments"></a>

## conf.d 环境

::: warning 迁移进行中
在 mise 2027.8.10 之前，按环境区分的 `conf.d` 文件名需要手动启用。默认情况下仍会加载所有非隐藏的 TOML 片段，包括 `node.tools.toml`。

片段名称中的点号即将弃用。请在 mise 2027.8.10 发布前将点号改为连字符，例如改为 `node-tools.toml`。从该版本开始，第一个点号后的后缀将用于选择环境。
:::

如需现在启用此功能，请在 `miserc.toml` 文件中设置 `env_conf_d = true`，或设置 `MISE_ENV_CONF_D=true`。之后，`mise/conf.d`、`.mise/conf.d` 和 `.config/mise/conf.d` 中的片段会像其他配置文件一样使用环境后缀：

```text
mise/conf.d/tools.toml                    # always loaded
mise/conf.d/tools.local.toml              # always loaded, usually gitignored
mise/conf.d/tools.development.toml        # MISE_ENV=development
mise/conf.d/tools.development.local.toml  # MISE_ENV=development, usually gitignored
```

由于此设置会控制配置文件的发现过程，必须写入 `miserc.toml` 或环境变量；设置在 `mise.toml` 中就太迟了。迁移期间如需保留旧行为并消除弃用警告，请显式设置 `env_conf_d = false`。

<a id="platform-environments"></a>

## 平台环境

启用[`auto_env`](/configuration/settings.html#auto_env) 后，mise 还会根据当前平台将以下环境视为生效的配置环境：

| 环境           | 值                                                   |
| ------------- | ---------------------------------------------------- |
| `{os_family}` | `unix` (not defined on Windows; use `windows`)       |
| `{os}`        | `linux`, `macos`, `windows`                          |
| `{os}-{arch}` | such as `linux-x64`, `macos-arm64`, or `windows-x64` |

体系结构使用 mise 中的名称：`x86_64` 会映射为 `x64`，`aarch64` 会映射为 `arm64`。

之后，所有配置位置中的 `mise.windows.toml`、`mise.macos-arm64.toml` 和 `mise.unix.toml` 等文件及其 `.local.toml` 变体都会自动加载；mise 还会选择对应的锁文件，例如 `mise.windows.lock`。

平台环境的优先级低于手动选择的环境。从低到高依次为：`unix`、`{os}`、`{os}-{arch}`，然后是 `-E` 或 `MISE_ENV` 选中的环境。与同时选择多个环境时相同，此顺序适用于同一类文件，因此 `mise.linux.local.toml` 仍会覆盖 `mise.ci.toml`。平台环境只影响配置文件发现和锁文件选择，因此 <code v-pre>{{ mise_env }}</code> 及传给任务的 `MISE_ENV` 只会列出你手动选择的环境。

### 推出

`auto_env` 默认关闭。mise 2027.6.0 起会默认启用；从 2026.12.0 到该版本发布前，如果发现新默认值会加载的平台配置文件，mise 会发出警告。如需现在选择行为，请在 `.miserc.toml` 中设置：

```toml [.miserc.toml]
auto_env = false # keep the old behavior and silence the warning
```

设置 `auto_env = true` 可启用新行为，也可以使用 `MISE_AUTO_ENV=true` 或 `MISE_AUTO_ENV=false`。与 `env` 一样，此设置会控制配置发现，因此在 `mise.toml` 中设置无效。

## 相关内容

- [Bootstrap 模块](/bootstrap/modules.html)：为每种机器角色提供一个环境文件，并在每台机器上分别选择
