---
description: "在 mise.toml 中设置项目环境变量，从文件和脚本载入，并向 PATH 添加目录。"
---

# 环境变量

在 `mise.toml` 的 `[env]` 下设置项目环境变量。mise 会将这些变量应用于通过 `mise exec`
运行的命令、任务、shim，以及已激活 mise 的 Shell。

若要为不同部署使用独立配置文件，例如 `mise.production.toml`，请参阅
[配置环境](/configuration/environments.html)。只供模板使用的值应放在 [`[vars]`](/configuration/vars.html)。
若要避免机密以明文形式写入配置，请参阅[机密](/environments/secrets/)。

## 设置和取消设置变量 {#set-and-unset}

```toml [mise.toml]
[env]
NODE_ENV = "production"
```

在不更改 shell 的情况下，检查子进程中的值：

```sh
mise exec -- sh -c 'echo "$NODE_ENV"'
# production
```

值可以是字符串或整数；`true` 会转换为字符串 `"true"`。将变量设为 `false` 可取消设置，
例如取消 Shell 或父目录配置中设置的变量：

```toml [mise.toml]
[env]
NODE_ENV = false
```

[`mise set`](/cli/set.html) 和 [`mise unset`](/cli/unset.html) 可在命令行中编辑 `[env]`：

```sh
mise set NODE_ENV=development   # 在 [env] 下写入 NODE_ENV = "development"
mise set NODE_ENV               # 打印 development
mise set                        # 列出各变量、取值及其来源文件
mise unset NODE_ENV             # 移除变量
```

`mise set` 会写入最近的配置目录。如果该目录同时有 `mise.toml` 和 `mise.local.toml`，则
写入 `mise.toml`；参见[写入操作使用哪个文件](/configuration.html#target-file-for-write-operations)。
传入 `-E staging` 可写入 `mise.staging.toml`，传入 `-g` 可写入全局配置；传入 `--prompt`
或 `--stdin` 可避免将值留在 Shell 历史记录中。

要打印解析后的环境，包括 `PATH` 条目和工具设置的变量，请运行 [`mise env`](/cli/env.html)。
添加 `--json` 或 `--dotenv` 可选择其他格式。

## 变量的生效范围 {#using-environment-variables}

| 命令的运行方式                                      | 是否接收 `[env]`                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `mise exec -- <command>`                            | 是                                                                     |
| `mise run <task>`                                   | 是，并叠加任务自身的 `env`                                             |
| [已激活 mise](/shell-setup.html) 的 Shell           | 是；每次切换目录时都会更新                                             |
| [shim](/dev-tools/shims.html)                       | 是，应用于 shim 启动的程序                                             |
| [`mise en`](/cli/en.html)                           | 是；在新 Shell 中生效，但切换目录时不会更新                            |

同一文件中的变量和[工具](/dev-tools/)配置会共同生效：

```sh
mise use node@24
mise set MY_VAR=123
mise exec -- node -p process.env.MY_VAR
# 123
```

### 任务专属变量 {#environment-in-tasks}

任务自身的 `env` 只应用于该任务，并接受与 `[env]` 相同的值和指令：

```mise-toml [mise.toml]
[tasks.print]
env = { MY_VAR = "my variable", _.file = ".env.print" }
run = "echo $MY_VAR"
```

参见[任务的 `env`](/tasks/task-configuration.html#env)。

## 默认值与必需变量 {#defaults-and-required}

### 默认值 {#defaults}

`default` 用于设置回退值；如果变量已有值，则予以保留：

```toml [mise.toml]
[env]
NODE_ENV = { default = "development" }
```

如果 `NODE_ENV` 已在 mise 启动时继承的环境或优先级较低的配置文件（例如全局配置）中设为
非空值，mise 会保留该值。否则会将 `NODE_ENV` 设为 `development`。默认值必须是字符串或整数。

### 必需变量 {#required-variables}

`required = true` 用于声明必须由其他来源设置的变量。mise 会检查它是否已设置，但不会为其
赋值。如果该变量存在于 mise 启动时继承的环境，或由其他配置文件设置（例如 `mise.local.toml`、
父目录配置或全局配置），检查就会通过：

```toml [mise.toml]
[env]
DATABASE_URL = { required = true }
```

```toml [mise.local.toml]
[env]
DATABASE_URL = "postgres://localhost/app"
```

如果将字符串而非 `true` 赋给 `required`，变量缺失时会显示相应的提示文本：

```toml [mise.toml]
[env]
DATABASE_URL = { required = "请将 DATABASE_URL 设置为 PostgreSQL 连接字符串" }
```

缺少必需变量时，`mise exec`、`mise run`、`mise env` 和 `mise set` 会报错并附上提示文本。
已激活的 Shell 则会发出警告并继续运行，避免缺失值影响提示符：

```text
mise WARN  Required environment variable 'DATABASE_URL' is not defined. It must be set before mise runs or in a later config file. (Required in: ~/src/app/mise.toml)
Help: 请将 DATABASE_URL 设置为 PostgreSQL 连接字符串
```

`required` 不能与 `value` 或 `default` 同时使用。

若要在任务输出中隐藏变量值（包括调用方为必需变量提供的值），请设置 `redact = true`；参见
[隐藏值与 CI 脱敏](/environments/secrets/#redaction)。

## 引用其他值 {#reference-other-values}

值支持 [Tera 模板](/templates.html)和 Shell 风格的 `$VAR` 展开：

```toml [mise.toml]
[env]
PROJECT_LIB = "{{config_root}}/lib"
LD_LIBRARY_PATH = "{{env.PROJECT_LIB}}:${LD_LIBRARY_PATH:-}"
```

一个值只能引用同一文件中位于其上方的变量、优先级较低的配置文件中的变量，或 mise 启动时
继承的环境变量。

### 模板 {#templates}

<span v-pre>`{{config_root}}`</span> 表示项目目录，<span v-pre>`{{env.NAME}}`</span>
用于读取变量。完整的上下文和过滤器列表请参阅 [Tera 模板](/templates.html)。

### Shell 风格的变量展开 {#shell-style-variable-expansion}

| 语法              | 结果                                                             |
| ----------------- | ---------------------------------------------------------------- |
| `$VAR`            | `VAR` 的值                                                       |
| `${VAR}`          | 与上者相同；当变量后紧跟字母或数字时使用，例如 `${VAR}_suffix`    |
| `${VAR:-default}` | `VAR` 未设置或为空时使用 `default`                                |
| `${VAR:-}`        | `VAR` 未设置时展开为空字符串，且不发出警告                       |

模板渲染后才会展开变量，因此一个值中可以同时使用两种形式。变量未定义且没有默认值时，会保留
原样并由 mise 发出警告。若要关闭展开，请将 [`env_shell_expand`](/configuration/settings.html#env_shell_expand)
设为 `false`。

## 使用工具提供的值 {#lazy-eval}

mise 会先解析 `[env]`，再加载工具，因此变量可用于配置工具安装，例如源码构建时使用的
`CFLAGS`。若要引用工具提供的值（例如版本或 `PATH` 条目），请添加 `tools = true`。mise
随后会在工具加载完成后再解析该条目：

```toml [mise.toml]
[env]
NODE_VERSION = { value = "{{ tools.node.version }}", tools = true }
_.path = { path = "{{env.GEM_HOME}}/bin", tools = true }
```

`tools = true` 可用于变量、`_.file`、`_.path`、`_.source` 和[插件指令](#plugin-directives)。
`_.python.venv` 总是在工具加载后解析，因此不接受此选项。

## 优先级 {#precedence}

多个配置文件设置同一变量时，较具体的文件优先：

- `mise.local.toml` 优先于 `mise.toml`。
- 设置 `MISE_ENV=dev` 时，`mise.dev.toml` 优先于 `mise.toml`，`mise.local.toml` 优先于
  `mise.dev.toml`，而 `mise.dev.local.toml` 优先级最高。
- 项目配置优先于父目录配置。
- 任意项目配置都优先于全局配置（`~/.config/mise/config.toml`）。

完整的配置文件位置列表请参阅[配置文件](/configuration.html#mise-toml)。

mise 会从优先级最低的配置文件开始解析，再处理优先级较高的文件；每个文件中的条目则按书写
顺序解析，因此每个值都可以引用之前设置的值。`[env]` 中的值会覆盖 mise 启动时继承环境中
同名的变量；上文所述的 `default` 和 `required` 是例外。

## 环境指令 {#env-directives}

指令可从文件和脚本载入变量，也可添加 `PATH` 条目。由于变量不能包含嵌套表格，这些指令
放在名为 `_` 的表格中。`_.file`、`_.path` 和 `_.source` 的值可以是路径、包含 `path` 和
选项的表格，或上述两种值组成的数组：

```toml [mise.toml]
[env]
_.file = ".env"
_.path = ["bin", "node_modules/.bin"]
_.source = { path = "scripts/env.sh", redact = true }
```

相对路径始终相对于项目目录解析，即使配置文件位于 `.config/mise/` 或 `.mise/` 中也是如此
（参见[`config_root`](/configuration.html#config-root)）。路径支持模板、`$VAR` 和 `~`。
各指令按书写顺序执行，因此 `_.path` 可以使用前面的
`_.source` 设置的变量；`_.python.venv` 始终最后执行。

| 选项      | `_.file` | `_.source` | `_.path` | 作用                                                                    |
| --------- | -------- | ---------- | -------- | ----------------------------------------------------------------------- |
| `path`    | 是       | 是         | 是       | 一个路径或路径列表                                                      |
| `tools`   | 是       | 是         | 是       | 在工具加载后解析（[详情](#lazy-eval)）                                  |
| `redact`  | 是       | 是         | 否       | 将所有载入的值标记为[敏感信息](/environments/secrets/#redaction)       |
| `expand`  | 是       | 否         | 否       | 允许文件引用此前载入的值                                                |
| `find_up` | 是       | 否         | 否       | 从当前目录及其父目录中搜索相对路径                                      |

### `env._.file` {#env-file}

从文件载入变量：

```toml [mise.toml]
[env]
_.file = ".env"
```

- 文件扩展名决定解析格式。`.json`、`.yaml` 和 `.toml` 文件会按结构化格式解析，其顶层键会
  成为环境变量。其他名称（包括 `.yml` 和 `.env`）则按 dotenv 格式解析。
- YAML 值会按原样读取：`VERSION: 1.10` 会设置为 `1.10`，`ZIP: 02134` 会保留开头的零。
- 路径可以是 glob 模式，例如 `.env.*`；所有匹配的文件都会载入。
- 没有匹配文件时会跳过而不报错，因此 `_.file` 可以指向可选且未跟踪的 `.env` 文件。
- 文件中的值会覆盖环境中已有的同名变量。

```toml [mise.toml]
[env]
_.file = [
  ".env.json",
  "~/.config/myapp/.env",
  { path = ".secrets.yaml", redact = true },
]
```

dotenv 文件使用 `KEY=value` 格式的行，支持 `#` 注释和带引号的值。引号规则与 Shell 类似：
单引号中的文本按字面值处理；相邻的带引号和未加引号部分会去掉引号后拼接，因此
`'it'\''s'` 会得到 `it's`。如果一行中没有配对的后续引号，例如 `O'Brien`，则会保留原样。
行尾注释中的引号也会参与配对，因此可以写成 `NAME="O'Brien" # owner's name`。若值本身
必须保留引号（例如 JSON），请使用单引号：`CONFIG='{"debug": true}'`。dotenv 值可以引用
同一文件中更早赋值的变量，以及 mise 启动时继承环境中的变量。JSON、YAML 和 TOML 的值会
按字面值读取，因此 `$` 仍是 `$`。设置 `expand = true` 后，任何格式的文件都可以引用此前
载入的值，包括更早载入的文件或更早出现的 `[env]` 条目：

```toml [mise.toml]
[env]
BASE = "/opt/project"
_.file = { path = ".env.json", expand = true }
```

如果 [`env_shell_expand`](/configuration/settings.html#env_shell_expand) 设为 `false`，
则 `expand = true` 不会生效。

mise 会在载入文件时解密通过 SOPS 加密的 JSON、YAML 和 TOML 文件；参见
[SOPS 文件](/environments/secrets/sops.html)。

`_.file` 会相对于配置根目录（通常是项目目录）解析相对路径。若要改为从当前目录及其所有父目录加载文件，请设置 `find_up = true`。此选项也适用于全局配置，因此一个条目即可覆盖所有项目：

```toml [~/.config/mise/config.toml]
[env]
_.file = [
  { path = ".env", find_up = true },
  { path = ".env.local", find_up = true },
]
```

每个条目会单独搜索，并按列出的顺序应用，因此后面的条目优先级更高，无论其文件位于何处。在下面的例子中，父目录中的 `.env.local` 会覆盖项目中的 `.env`。若要让多个文件名一起搜索，请将它们放进同一个条目的 `path` 列表：

```toml [~/.config/mise/config.toml]
[env]
_.file = { path = [".env", ".env.local"], find_up = true }
```

此时距离当前目录最近的文件优先；如果文件位于同一目录，则后列出的文件优先，因此项目中的 `.env` 会覆盖父目录中的 `.env.local`。只有普通相对路径名会一起搜索。包含模板、`$VAR` 或 `~` 的名称以及绝对路径，会按列表顺序单独搜索。

[`env_file`](/configuration/settings.html#env_file) 设置也会沿目录树向上查找 dotenv 文件，但它是独立功能。它会在所有配置文件的 `[env]` 应用后生效并覆盖其中的值，但不会覆盖已由 `_.file` 加载的文件。它会跳过这些文件，因此这些文件仍遵循 `[env]` 的优先级。`_.file` 则是普通条目，可被项目自身的 `[env]` 覆盖。

### `env._.path` {#env-path}

将目录添加到 `PATH` 开头，排在已有目录之前：

```toml [mise.toml]
[env]
_.path = [
  "bin",
  "{{config_root}}/node_modules/.bin",
  "~/.local/share/mytool/bin",
]
```

请使用 `_.path` 修改 `PATH`。`[env]` 中的 `PATH` 键会被 `mise exec`、`mise env` 和已激活的
Shell 忽略。

### `env._.source` {#env-source}

运行 bash 脚本，并读取脚本导出的变量：

```toml [mise.toml]
[env]
_.source = "scripts/env.sh"
```

mise 会使用 bash 运行脚本，效果相当于执行 `source scripts/env.sh`，并忽略脚本中的 shebang。
若要使用其他语言，请改用任务或[环境插件](/env-plugin-development.html)。

- 脚本导出或更改的变量会被加入环境；脚本取消设置的变量则会被移除。
- 路径可以是 glob 模式；与 `_.file` 一样，没有匹配文件时会跳过。
- 每次 mise 计算环境时都会运行脚本，因此应确保脚本执行迅速且可重复运行。
- [安全模式](/security.html#safe-mode)下绝不会运行此脚本，即使它来自全局配置也一样。

脚本可以将目录添加到 `PATH` 开头：

```sh
export PATH="/new/bin:$PATH"
```

mise 会忽略其他 `PATH` 更改，例如追加、移除或重新排列条目，因为 mise 会自行管理 `PATH`
条目，以便离开目录时可以彻底移除它们。添加的相对路径会以项目目录为基准解析，空条目则会
被忽略。

在 Windows 上，`_.source` 需要 POSIX bash，例如
[Git for Windows](https://gitforwindows.org/) 或 MSYS2。mise 会像查找 bash 任务所用的 bash
一样查找它，也会搜索常见的非 `PATH` 安装位置；设置 `MISE_BASH_PATH` 可指定使用的 bash。
mise 不会使用 WSL 启动器 `C:\Windows\System32\bash.exe`，因为 WSL 无法读取 Windows 脚本路径。
脚本以 `/c/...` 或 `/cygdrive/c/...` 形式添加到 `PATH` 的条目会转换为 Windows 路径格式。

### `env._.python.venv` {#env-python-venv}

创建并激活 Python 虚拟环境：

```toml [mise.toml]
[env]
_.python.venv = { path = ".venv", create = true }
```

所有选项请参阅[自动激活虚拟环境](/lang/python.html#automatic-virtualenv-activation)。

### 插件提供的指令 {#plugin-directives}

环境插件可以添加自己的指令。先[安装插件](/plugins.html#environment-plugins)，再在
`_` 下使用插件记录的名称及选项：

```toml [mise.toml]
[env]
_.my-env-plugin = { api_url = "https://api.example.com" }
```

`tools` 和 `redact` 也适用于插件指令。如果插件尚未安装，且 mise 没有可用于安装它的
来源，mise 会发出警告并跳过该指令。编写环境插件的方法请参阅
[环境插件](/env-plugin-development.html)。

## 用于配置 mise 的变量 {#mise-variables}

mise 会在启动时、载入 `[env]` 之前读取 `MISE_DATA_DIR` 等 `MISE_*` 变量，因此在 `[env]`
中设置这些变量不会改变该 mise 进程的行为。请在 Shell 或 CI 环境中设置，或使用
[`[settings]`](/configuration/settings.html) 和
[`MISE_*` 变量](/configuration/environment-variables.html)。

SOPS 密钥变量是例外：mise 会从 `[env]` 中读取 `MISE_SOPS_AGE_KEY` 和
`MISE_SOPS_AGE_KEY_FILE`，用于解密在这些条目之后列出的加密文件；参见
[SOPS 文件](/environments/secrets/sops.html#environment-variables)。

## 关闭配置环境变量 {#no-env}

使用 `mise --no-env`、`MISE_NO_ENV=1`，或将
[`no_env`](/configuration/settings.html#no_env) 设为启用状态，即可跳过所有配置文件中的
`[env]` 和环境指令。

在[安全模式](/security.html#safe-mode)（`MISE_SAFE=1`）下，mise 会忽略项目配置中的 `[env]`
和环境指令，并且绝不会运行 `_.source`。

## 后续阅读 {#next-steps}

- [机密](/environments/secrets/)：加密变量、从机密管理器获取变量，并在输出中隐藏变量值。
- [配置环境](/configuration/environments.html)：通过 `MISE_ENV` 切换不同的变量组。
- [钩子](/hooks.html)：在进入或离开项目时运行命令。
- [Tera 模板](/templates.html)：查看变量值可用的函数和过滤器。

## 已弃用语法 {#deprecated-syntax}

| 已弃用语法                                                       | 替代写法     | 移除版本   |
| --------------------------------------------------------------- | ------------ | ---------- |
| `env.mise.*`                                                    | `env._.*`    | 2026.12.0  |
| `_.file`、`_.path` 或 `_.source` 表中的 `value` 或 `values`       | `path`       | 2026.12.0  |
| 顶层 `env_file` 或 `dotenv`                                     | `env._.file` | 2027.4.0   |
| 顶层 `env_path`                                                 | `env._.path` | 2027.4.0   |

`value` 和 `values` 规则也适用于 `vars._` 下的指令，但不会影响普通变量表中的 `value`
（例如 `SECRET = { value = "...", redact = true }`），也不会影响插件指令的选项。
