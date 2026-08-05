# 环境

> 为每个项目目录自动加载正确的 _环境变量_

使用 mise 为不同项目指定环境变量。

要开始使用，请在项目目录根目录下创建一个 `mise.toml` 文件：

```toml [mise.toml]
[env]
NODE_ENV = 'production'
```

要清除环境变量，请将其设置为 `false`：

```toml [mise.toml]
[env]
NODE_ENV = false # 取消之前设置的 NODE_ENV
```

要在保留现有非空值的同时设置回退值，请使用 `default`：

```toml [mise.toml]
[env]
NODE_ENV = { default = "development" }
```

如果 `NODE_ENV` 在 mise 运行之前或由更早的配置文件已设置，此设置会保留它。若它未设置或为空，mise 会将其设为 `"development"`。
默认值可以是字符串或整数。

你也可以使用 CLI 来获取/设置环境变量：

```sh
mise set NODE_ENV=development
# mise set NODE_ENV
# development

mise set
# key       value        source
# NODE_ENV  development  mise.toml

cat mise.toml
# [env]
# NODE_ENV = 'development'

mise unset NODE_ENV
```

此外，`[mise env [--json] [--dotenv]](/cli/env.html)` 命令可用于以多种格式导出环境变量（包括 `PATH` 以及由工具或插件设置的环境变量）。

## 使用环境变量

在使用 [`mise x|exec`](/cli/exec.html) 时，或者在使用 [`mise r|run`](/cli/run.html)（即使用 [任务](/tasks/)）时，环境变量可用：

```shell
mise set MY_VAR=123
mise exec -- bash -c 'echo $MY_VAR'
# 123
```

当然，你也可以将它们与 [工具](/dev-tools/) 结合使用：

```sh
mise use node@26
mise set MY_VAR=123
cat mise.toml
# [tools]
# node = '24'
# [env]
# MY_VAR = '123'
mise exec -- node --eval 'console.log(process.env.MY_VAR)'
# 123
```

如果 [mise 已激活](/getting-started.html#activate-mise)，当你 `cd` 进入某个目录时，它会自动在当前 shell 会话中设置环境变量。

```shell
cd /path/to/project
mise set NODE_ENV=production
cat mise.toml
# [env]
# NODE_ENV = 'production'

echo $NODE_ENV
# production
```

如果你正在使用 [`shims`](/dev-tools/shims.html)，那么在使用 shim 时环境变量将可用：

```shell
mise set NODE_ENV=production
mise use node@26
# 使用绝对路径作为示例
~/.local/share/mise/shims/node --eval 'console.log(process.env.NODE_ENV)'
```

最后，你也可以使用 [`mise en`](/cli/en.html) 来启动一个新的 shell 会话，并设置好环境变量。

```shell
mise set FOO=bar
mise en
> echo $FOO
# bar
```

## 任务中的环境

也可以在任务中定义环境

```toml [mise.toml]
[tasks.print]
run = "echo $MY_VAR"
env = { _.file = '/path/to/file.env', "MY_VAR" = "my variable" }
```

## 延迟求值

环境变量通常会在工具之前解析——这样你就可以使用环境变量配置工具安装
子进程。这不适用于配置 mise 本身的变量，例如 `MISE_DATA_DIR` 或 `MISE_INSTALLS_DIR`。这些变量会在进程启动时读取，
因此应在调用 mise 之前在 shell 或 CI 环境中设置它们，而不是在 `[env]` 中设置。

有时你可能希望访问工具生成的环境变量。为此，请使用 `tools = true` 将值转换为
映射：

```toml
[env]
MY_VAR = { value = "tools path: {{env.PATH}}", tools = true }
_.path = { path = ["{{env.GEM_HOME}}/bin"], tools = true } # 指令也可以设置 tools = true
NODE_VERSION = { value = "{{ tools.node.version }}", tools = true }
```

## 脱敏

可以通过设置 `redact = true` 将变量从输出中脱敏：

```toml
[env]
SECRET = { value = "my_secret", redact = true }
_.file = { path = ".env.json", redact = true }
```

你也可以使用 `redactions` 数组将多个环境变量标记为敏感：

```toml
redactions = ["SECRET_*", "*_TOKEN", "PASSWORD"]
[env]
SECRET_KEY = "sensitive_value"
API_TOKEN = "token_123"
PASSWORD = "my_password"
```

在单个变量上设置 `redact = false`，可以将其排除在 `redactions` 模式的匹配范围之外，
包括从全局配置继承的模式：

```toml
[env]
TEST_TOKEN = { value = "not-sensitive", redact = false }
```

### 查看已脱敏的环境变量

`mise env` 命令提供了用于处理已脱敏变量的标志：

```bash
# 仅显示已脱敏的环境变量
mise env --redacted

# 仅显示值（适合用于管道）
mise env --values

# 仅显示已脱敏变量的值
mise env --redacted --values
```

::: warning
脱敏是通过逐行拦截任务输出实现的，因此它们需要非 `raw` 的输出模式。
`raw = true` 的任务会绕过这种拦截（stdout/stderr 会直接传递到终端），因此无法应用脱敏。

默认情况下，`mise run` 使用 `replacing` 输出模式，它显示进度旋转器而不是完整输出。
在 CI 环境中，你可能希望改用 `prefix` 或 `interleave` 输出，这样你就可以在仍然应用脱敏的同时看到完整的任务日志：

```bash
MISE_TASK_OUTPUT=prefix mise run mytask
```

或者在你的配置中全局设置它：

```toml
[settings]
task.output = "prefix"
```

:::

::: danger
由于 mise 可能会输出敏感值，而这些值可能会出现在 CI 日志中，因此你需要配置你的 CI 环境
以识别哪些值是敏感的。

例如，在使用 GitHub Actions 时，你应该使用 `::add-mask::` 来防止密钥出现在日志中：

```bash
# 在 GitHub Actions 工作流中
for value in $(mise env --redacted --values); do
  echo "::add-mask::$value"
done
```

注意：如果你使用的是 [mise-action](https://github.com/jdx/mise-action)，它会自动对标记为 `redact = true` 或匹配 `redactions` 数组中模式的值进行脱敏。
:::

## 必需变量

你可以通过设置 `required = true` 将环境变量标记为必需变量。这确保该变量要么在 mise 运行之前已定义，要么在后续配置文件中定义（例如 `mise.local.toml`）：

```toml
[env]
DATABASE_URL = { required = true }
API_KEY = { required = true }
```

你还可以提供帮助文本，指导用户如何设置该变量：

```toml
[env]
DATABASE_URL = {
  required = "将 DATABASE_URL 设置为你的 PostgreSQL 连接字符串（例如，postgres://user:pass@localhost/dbname）",
}
API_KEY = {
  required = "从 https://example.com/api-keys 获取你的 API 密钥",
}
AWS_REGION = {
  required = "设置为你的 AWS 区域（例如，us-east-1、eu-west-1）",
}
```

当必需变量缺失时，mise 会在错误消息中显示帮助文本，以帮助用户。

### 必需变量行为

当变量被标记为 `required = true` 时，mise 会验证它是否通过以下任一来源定义：

1. **预先存在的环境变量** - 在运行 mise 之前该变量已被设置
2. **后续配置文件** - 该变量在处理完当前声明其为必需变量的配置文件之后的某个配置文件中定义

```toml
# 在 mise.toml 中
[env]
DATABASE_URL = { required = true }
```

```toml
# 在 mise.local.toml 中（稍后处理）
[env]
DATABASE_URL = "postgres://prod.example.com/db"  # 这满足了该要求
```

### 验证行为

- **常规命令**（如 `mise env`）：当缺少必需变量时，会以清晰的错误消息失败
- **Shell 激活**（`hook-env`）：会警告缺少必需变量，但会继续执行以避免破坏 shell 设置

```bash
# 如果 DATABASE_URL 未预定义或未在后续配置中定义，这将失败
$ mise env
Error: 必需环境变量 'DATABASE_URL' 未定义...

# 这将警告但继续执行（供 shell 激活使用）
$ mise hook-env --shell bash
mise WARN 必需环境变量 'DATABASE_URL' 未定义...
# Shell 激活继续成功
```

### 使用场景

必需变量适用于：

- **数据库连接** - 确保关键连接字符串被显式设置
- **API 密钥** - 要求对敏感凭据进行显式配置
- **环境特定设置** - 强制针对每个环境进行显式配置
- **团队协作** - 记录团队成员必须配置哪些变量

```toml
[env]
# API 密钥（必须在环境变量或 mise.local.toml 中设置）
STRIPE_API_KEY = { required = true }
SENTRY_DSN = { required = true }

# 数据库连接（必须在环境变量或 mise.local.toml 中设置）
DATABASE_URL = { required = true }

# 功能开关（必须显式配置）
ENABLE_BETA_FEATURES = { required = true }
```

## `config_root`

`config_root` 是 mise 在解析配置文件中的相对路径时使用的规范项目根目录。通常，当你在 mise 中使用相对路径时，指的就是这个目录。

- 当你的配置位于嵌套路径中，比如 `.config/mise/config.toml` 或 `.mise/config.toml`，`config_root` 指向包含这些文件的项目目录（例如 `/path/to/project`）。
- 当你的配置位于项目根目录时（例如 `mise.toml`），`config_root` 就是当前目录。
- 环境指令中的相对路径会相对于 `config_root` 解析，因此无论配置文件本身位于何处，它们的行为都保持一致。

下面是一些示例配置文件及其对应的 `config_root`：

| 配置文件                                    | `config_root` |
| ------------------------------------------- | ------------- |
| `~/src/foo/.config/mise/conf.d/config.toml` | `~/src/foo`   |
| `~/src/foo/.config/mise/config.toml`        | `~/src/foo`   |
| `~/src/foo/.mise/config.toml`               | `~/src/foo`   |
| `~/src/foo/mise.toml`                       | `~/src/foo`   |

你可以在 [config_root.rs](https://github.com/jdx/mise/blob/main/src/config/config_file/config_root.rs) 中查看实现。

示例：

```toml
[env]
# 这些写法等价，并且都会相对于项目根目录解析
_.path = ["tools/bin", "{{config_root}}/tools/bin"]

# 同样地，相对 source 路径会相对于项目根目录解析
_.source = "scripts/env.sh"          # == "{{config_root}}/scripts/env.sh"
```

## `env._` 指令

`env._.*` 用于定义设置环境变量时的特殊行为。（例如：从文件中读取 env 变量）。由于嵌套的环境变量没有意义，
我们利用这一点创建一个名为 “\_” 的键，它是一个
用于配置这些指令的 TOML 表。

::: warning
`env._` 或 `vars._` 下内置的 `file`、`path` 和 `source` 指令对象中的 `value` 和 `values` 键已被弃用。请改用
`path`，它接受单个字符串或字符串数组。这些键将在 mise 2026.12.0 中移除。这不影响普通环境变量
对象中的 `value`，也不影响插件提供的指令选项。

旧版的 `env.mise.*` 写法已被弃用。请改用 `env._.*`。它将在 mise 2026.12.0 中移除。
:::

### `env._.file`

在 `mise.toml` 中：`env._.file` 可用于指定要加载的 [dotenv](https://dotenv.org) 文件。

::: warning
顶层的 `env_file`、`dotenv` 和 `env_path` 已被弃用。请改用 `env._.file` 和
`env._.path`。这些键将在 mise 2027.4.0 中移除。
:::

```toml
[env]
_.file = '.env'
```

::: info
只有 dotenv 格式的文件会在内部使用 [dotenvy](https://crates.io/crates/dotenvy)。如果你在 dotenv 解析方面遇到
问题，通常需要去那里提交 issue，而不是到 mise，因为 mise 对那个 crate 的工作方式
能做的并不多。JSON、YAML 和 TOML 文件使用各自独立的解析器。
:::

`env._.file` 指令支持：

- 单个文件，可以是字符串或对象
- 多个文件，可以是字符串和对象数组
- 使用相对路径或绝对路径
- 使用 `dotenv`、`json`、`yaml` 或 `toml` 文件格式
- `redact`、`tools` 和 `expand` 选项

```toml
[env]
_.file = '.env.yaml'
```

```toml
[env]
_.file = '.env.toml'
```

```toml
[env]
# 在 tools 定义环境变量后，再从 dotenv 文件加载 env
_.file = { path = ".env", tools = true }
```

结构化 JSON、YAML 和 TOML 文件中的 Shell 风格展开默认处于禁用状态，因此包含字面量 `$` 字符的值会被保留。设置
`expand = true` 可允许文件中的值引用同一文件中较早定义的变量、较早文件中的变量，或较早的 `[env]` 块中的变量：

```toml
[env]
BASE = "/opt/project"
_.file = { path = ".env.json", expand = true }
```

`env_shell_expand` 设置仍是全局开关，即使文件设置了 `expand = true`，它也可以禁用展开。无论如何，dotenv 文件都会保留 dotenvy
正常的同文件展开行为；对于 dotenv 文件，`expand = true` 还会额外启用对之前加载的值的引用。

```toml
[env]
_.file = [
    # 从相对于此配置文件的 json 文件加载 env
    '.env.json',
    # 从绝对路径的 dotenv 文件加载 env
    '/User/bob/.env',
    # 从相对于此配置文件的 yaml 文件加载 env，并隐藏其值
    { path = ".secrets.yaml", redact = true }
]
```

若要自动从当前目录及其父目录加载 dotenv 文件，请在 `~/.config/mise/config.toml` 的 `[settings]` 下设置
[`MISE_ENV_FILE=.env`](/configuration#mise-env-file) 或 `env_file = ".env"`。
这与 `env._.file` 不同，后者会相对于声明它的配置文件来解析路径。

有关使用 `env._.file` 读取加密文件的方法，请参阅 [secrets](/environments/secrets/)。

### `env._.path`

`PATH` 会被特殊处理。使用 `env._.path` 可以向 `PATH` 中添加额外目录，使这些目录中的任何可执行文件都能在 shell 中直接使用，而无需输入完整路径：

```toml
[env]
_.path = './bin'
```

`env._.path` 指令支持：

- 单个路径，可以是字符串或对象
- 多个路径，可以是字符串和对象数组
- 使用相对路径或绝对路径
- `tools` 选项

```toml
[env]
_.path = 'scripts'
```

```toml
[env]
# 在 tools 定义环境变量后，再定义此路径目录
_.path = { path = ["{{env.GEM_HOME}}/bin"], tools = true }
```

```toml
[env]
_.path = [
    # 添加一个绝对路径
    "~/.local/share/bin",
    # 添加一个相对于项目根目录（config_root）的路径
    "{{config_root}}/node_modules/.bin",
    # 添加一个相对路径（等同于 "{{config_root}}/tools/bin"）
    "tools/bin",
]
```

像 `tools/bin` 或 `./tools/bin` 这样的相对路径会相对于 <span v-pre>`{{config_root}}`</span> 进行解析。例如，若配置文件位于 `/path/to/project/.config/mise/config.toml`，则 `tools/bin` 会解析为 `/path/to/project/tools/bin`。

### `env._.source`

来源于一个外部 bash 脚本，并从中提取导出的环境变量：

```toml
[env]
_.source = "./script.sh"
```

::: info
这**必须**是一个能在 bash 中运行的脚本，就像这样执行：

```sh
source ./script.sh
```

shebang 会被**忽略**。请参阅 [#1448](https://github.com/jdx/mise/discussions/6734)
了解一种可能的替代方案，它可用于二进制文件或其他脚本语言。
:::

::: info Windows
在 Windows 上，source 操作需要真正的 POSIX bash，例如 [Git for Windows](https://gitforwindows.org/)
或 MSYS2。mise 会以与 bash 任务相同的方式自动检测它（即使 bash 不在 `PATH` 中，也会探测常见的安装位置；设置
`MISE_BASH_PATH` 可指向特定的 bash；由于 WSL 无法读取 Windows 脚本路径，位于 `C:\Windows\System32\bash.exe` 的 WSL 启动器绝不会被自动选中）。脚本添加到开头的 `PATH`
条目（以 `/c/...` 或 `/cygdrive/c/...` 形式表示）会被转换回 Windows 格式。
:::

`env._.source` 指令支持：

- 单个 source，可以是字符串或对象
- 多个 source，可以是字符串和对象数组
- 使用相对路径或绝对路径
- `redact` 和 `tools` 选项

```toml
[env]
_.source = 'source.sh'
```

```toml
[env]
# 在 tools 定义环境变量后，再 source 此文件
_.source = { path = "my/env.sh", tools = true }
```

```toml
[env]
_.source = [
    # 以相对于配置根目录的路径 source 该文件
    './scripts/base.sh',
    # source 一个绝对路径下的文件
    '/User/bob/env.sh',
    # 以相对于配置根目录的路径 source 该文件，并隐藏其值
    { path = ".secrets.sh", redact = true }
]
```

## 插件提供的 `env._` 指令

插件可以提供自己的 `env._` 指令，用于动态设置环境变量并修改你的 PATH。这在以下场景中特别有用：

- 与外部密钥管理系统集成
- 根据动态条件设置环境变量
- 管理复杂的 PATH 配置
- 提供团队范围内的环境标准化

### 基本用法

简单的插件激活：

```toml
[env]
_.my-plugin = {}
```

带配置选项的插件：

```toml
[env]
_.my-plugin = { option1 = "value1", option2 = "value2" }
```

### 工作原理

当你使用 `env._.<plugin-name>` 时，mise 会：

1. 从你已安装的插件中加载该插件
2. 调用插件的 `MiseEnv` 钩子以获取环境变量
3. 调用插件的 `MisePath` 钩子以获取 PATH 条目（如果已定义）
4. 在运行 `mise env` 或使用 shell 集成时，将这些内容应用到你的环境中

你提供的配置选项（`=` 后面的 TOML 表）会通过 `ctx.options` 传递给插件的钩子，从而允许按项目或按环境配置插件。

### 示例：密钥管理插件

```toml
[env]
# 从 vault 获取密钥
_.vault-secrets = {
  vault_url = "https://vault.example.com",
  secrets_path = "secret/myapp"
}
```

然后，该插件可以从 HashiCorp Vault 中获取密钥，并将其作为环境变量暴露出来。

### 示例：动态环境插件

```toml
[env]
# 根据 git 分支设置环境
_.git-env = { production_branch = "main" }
```

该插件可以检测当前的 git 分支，并在处于 `main` 分支时设置 `ENVIRONMENT=production`，否则设置 `ENVIRONMENT=development`。

### 创建环境插件

有关创建你自己的环境插件的完整指南，请参阅插件文档中的 [环境插件](/plugins#environment-plugins)。

如需可运行的示例，请查看 [mise-env-plugin-template](https://github.com/jdx/mise-env-plugin-template) 仓库。

## 多个 `env._` 指令

某些指令在需要多次应用时接受数组。例如，可以使用单个 `_.source` 键按顺序加载多个脚本：

```toml
[env]
_.source = ["./script_1.sh", "./script_2.sh"]
```

## 模板

环境变量值可以是模板，详情请参见 [模板](/templates)。

```toml
[env]
LD_LIBRARY_PATH = "/some/path:{{env.LD_LIBRARY_PATH}}"
```

## 在其他环境变量中使用 env 变量

你可以在后续的环境变量中使用某个环境变量的值：

```toml
[env]
MY_PROJ_LIB = "{{config_root}}/lib"
LD_LIBRARY_PATH = "/some/path:{{env.MY_PROJ_LIB}}"
```

当然，在这样做时，顺序很重要。

## Shell 风格变量展开

作为引用环境变量的 Tera 模板的一种更简单替代方案，你可以使用 Shell 风格的 `$VAR` 语法：

```toml
[env]
MY_PROJ_LIB = "{{config_root}}/lib"
LD_LIBRARY_PATH = "$MY_PROJ_LIB:$LD_LIBRARY_PATH"
```

支持的语法：

| 语法              | 描述                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| `$VAR`            | 展开为 `VAR` 的值                                                                     |
| `${VAR}`          | 同上，当后面跟着字母数字字符时很有用（例如，`${VAR}_suffix`）                          |
| `${VAR:-default}` | 如果 `VAR` 未设置或为空，则使用 `default`                                             |
| `${VAR:-}`        | 如果 `VAR` 未设置，则展开为空字符串（抑制未定义变量警告）                              |

展开会在 Tera 模板渲染之后运行，因此两种语法可以混合使用。  
没有默认值的未定义变量会保持不展开，并产生警告。

`env_shell_expand` 设置控制 Shell 展开：

- **`true`** 或 **未设置**（默认）— 启用 Shell 展开
- **`false`** — 禁用 Shell 展开
