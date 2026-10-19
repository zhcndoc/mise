---
description: "使用 Tera 模板渲染配置值，了解 mise.toml、任务和 .miserc.toml 中可用的变量、函数、过滤器和测试。"
socialDescription: "在 mise 配置中使用 Tera 模板提供的变量、函数、过滤器和测试。"
---

# Tera 模板

mise 会在配置值中渲染 [Tera](https://keats.github.io/tera/) 模板，因此值可以来自项目目录、环境变量、[`[vars]`](/configuration/vars.html) 或命令输出。这类字符串模板不同于通过 `extends` 共享任务定义的[任务模板](/tasks/templates.html)。

## 模板渲染位置

| 文件或配置段                                                  | 渲染内容                                                                                                                                                        | 额外上下文                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `mise.toml`                                                 | 大多数配置段中的字符串值，例如 `[env]`、`[tools]`、`[vars]`、`[hooks]` 和 `[plugins]`。键不会渲染，且文件必须先是有效的 TOML。 | `config_source`                                               |
| `[bootstrap]`                                               | 仅渲染部分值；参见 [bootstrap 模板](/bootstrap.html#templates)                                                                                                  | 无                                                            |
| 任务字段（例如 `run`）                                        | 任务运行时                                                                                                                                                      | `usage`、`tools`、[`task_source_files()`](#task-source-files) |
| `mode = "template"` 的[点文件](/dotfiles/managed.html)          | 源文件内容                                                                                                                                                      | 参见点文件页面                                                   |
| `.tool-versions`                                            | 整个文件                                                                                                                                                        | `config_source`                                               |
| `.miserc.toml`                                              | 解析前的整个文件                                                                                                                                                 | 有限支持；参见[下文](#miserc-template-support)                    |

## 示例

```toml [mise.toml]
[env]
PROJECT_NAME = "{{ config_root | basename }}"
TERRAFORM_VERSION = "1.9"

[tools]
# an [env] value defined above
terraform = "{{ env.TERRAFORM_VERSION }}"
# NODE_VERSION from your shell, or 24 when it is unset
node = "{{ env.NODE_VERSION | default(value='24') }}"
```

在名为 `myproj` 的项目目录中，`mise env` 会包含 `export PROJECT_NAME=myproj`。在项目内构造路径时请使用 `config_root`：即使从子目录运行 mise，它仍指向项目根目录；`cwd` 则指向运行 mise 时所在的目录。

## 语法

模板使用 Tera v2 语法，有三种定界符：

- <span v-pre>`{{ ... }}`</span> 表达式
- <span v-pre>`{% ... %}`</span> 语句，例如 `if` 和 `for`
- <span v-pre>`{# ... #}`</span> 注释

使用 `raw` 块可避免定界符被渲染：

<div v-pre>

```text
{% raw %}
  Hello {{ name }}
{% endraw %}
```

</div>

渲染结果为 <span v-pre>`Hello {{ name }}`</span>。

| 类型             | 语法                                                                      | 示例                                                  |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| 字面量           | `''`、`""` 或反引号括起的字符串；数字；`true`、`false`；`[lists]` | <span v-pre>`{{ ["a", "b"] }}`</span>                 |
| 属性访问         | `a.b`、`a["b"]`                                                         | <span v-pre>`{{ env.HOME }}`</span>                   |
| 数学运算         | `+ - * / %`                                                              | <span v-pre>`{{ (num_cpus() \| int) * 2 }}`</span>    |
| 比较             | `== != < <= > >=`                                                        | <span v-pre>`{{ os() == "linux" }}`</span>            |
| 逻辑             | `and or not`                                                             | <span v-pre>`{{ a and not b }}`</span>                |
| 拼接             | `~`                                                                      | <span v-pre>`{{ config_root ~ "/bin" }}`</span>       |
| 成员判断         | `in`                                                                     | <span v-pre>`{{ os() in ["linux", "macos"] }}`</span> |

使用 `|` 应用过滤器，例如 <span v-pre>`{{ name | lower }}`</span>。函数可以使用命名参数调用，例如 <span v-pre>`{{ exec(command="date") }}`</span>。使用 `is` 检查值，例如 <span v-pre>`{% if path is dir %}`</span>。过滤器可以串联使用。完整语法请参阅 Tera 的[表达式](https://keats.github.io/tera/#expressions)和[控制结构](https://keats.github.io/tera/#control-structures)文档。

Tera v2 还支持切片（`parts[0:2]`、`parts[-1]`）、展开（`[first, ...rest]`、`{...base, "key": value}`）、列表推导式（`[t.name for t in tools if t.active]`）、可选链（`env?.NODE_ENV or "development"`）和条件表达式（`"prod" if release else "dev"`）。

## 变量 {#variables}

| 变量                                                                     | 值                                                                                                                                                                                                             | 可用位置                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `env`                                                                  | 环境变量：mise 启动时的环境，以及目前已解析的 `[env]` 值                                                                                                                                                        | 所有位置                                                                         |
| `vars`                                                                 | [配置变量](/configuration/vars.html)                                                                                                                                                                           | `mise.toml` 和任务                                                               |
| `cwd`                                                                  | mise 运行时所在目录                                                                                                                                                                                            | 所有位置                                                                         |
| `config_root`                                                          | 文件的[配置根目录](/configuration.html#config-root)，即项目目录；即使配置文件是 `.config/mise.toml` 也一样。在 `[bootstrap.files]` 内容模板中，它指声明该条目的文件所在目录 | 所有位置                                                                         |
| `config_source`                                                        | 模板所在配置文件的绝对路径，使用文件被访问时的路径，不解析符号链接                                                                                                                                              | `mise.toml` 值、`.tool-versions`、`[env]` 指令和任务自己的 `env`                    |
| `mise_bin`                                                             | 当前 mise 可执行文件的路径                                                                                                                                                                                     | 除 `.miserc.toml` 外的所有位置                                                    |
| `mise_pid`                                                             | 当前 mise 进程的进程 ID                                                                                                                                                                                        | 除 `.miserc.toml` 外的所有位置                                                    |
| `mise_env`                                                             | 所选[配置环境](/configuration/environments.html)列表。未选择环境时该变量未定义，因此应使用 <span v-pre>`{% if mise_env is defined %}`</span> 检查 | 除 `.miserc.toml` 外的所有位置                                                    |
| `xdg_cache_home`、`xdg_config_home`、`xdg_data_home`、`xdg_state_home` | XDG 基目录                                                                                                                                                                                                     | 所有位置                                                                         |
| `system_brew_prefix`                                                   | mise 内置 [Homebrew 支持](/bootstrap/packages/brew.html)使用的前缀：macOS 上为 `/opt/homebrew`，其他平台为 `/home/linuxbrew/.linuxbrew`                                                                           | 所有位置                                                                         |
| `tools`                                                                | 已安装且当前启用的工具（见下文）                                                                                                                                                                                | 任务，以及设置了 `tools = true` 的 `[env]` 指令                                    |
| `usage`                                                                | 已解析的任务参数；参见[任务参数](#task-arguments)                                                                                                                                                                | 任务的 `run` 脚本                                                                |

除 `env` 以外的任务字段（例如 `run` 和 `dir`）以及文件任务头部可以使用 `config_root`，但不能使用 `config_source`。

`config_source` 可让链接到 `conf.d` 中的共享配置将自身的 `bin` 目录加入 `PATH`：

```toml
[env]
_.path = "{{ config_source | canonicalize | dirname }}/bin"
```

省略 `canonicalize` 后，得到的是访问该文件时经过的目录，而不是文件实际所在目录。

`tools` 会将每个当前启用的工具映射到其已安装的活动版本。映射键既包含配置中使用的名称（例如 `npm:prettier`），也包含该工具在后端中的名称（例如 `prettier`）。已安装但未选中，或已选中但尚未安装的版本都不会列入其中。

- 只有一个活动版本时：`tools.node.version` 是解析后的版本，例如 `"24.1.0"`；`tools.node.path` 是安装路径。
- 同时启用多个版本时，例如 `python = ["3.14", "3.13"]`，值是一个列表，可通过 `tools.python[0].version`、`tools.python[1].path` 等访问。

## 函数 {#functions}

`[]` 表示可选参数。

| 函数                                                      | 返回值  | 说明                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exec(command, [cache_key], [cache_duration])`            | 字符串  | 使用默认内联 shell 运行 `command`，并返回去掉末尾换行符的输出。参见 [`exec()`](#exec)。                                                                                                                                                                   |
| `read_file(path)`                                         | 字符串  | 返回文件内容。相对路径以模板所在目录为基准，而不是 `cwd`；参见 [`exec()`](#exec)。                                                                                                                                                                      |
| `get_env(name, [default])`                                | 字符串  | 返回 mise 启动时环境中的变量；若变量未设置，则返回 `default`。空值会原样返回。此函数看不到 `[env]` 的值；建议使用 <span v-pre>`{{ env.NAME \| default(value="...") }}`</span>。 |
| `arch([x64=...], [arm64=...])`                            | 字符串  | 返回 CPU 架构：`x64`、`arm64` 或其他 Rust 架构名称。可传入以架构命名的关键字来重命名，例如 <span v-pre>`{{ arch(x64="amd64", arm64="aarch64") }}`</span>。                                                                                          |
| `os([linux=...], [macos=...], [windows=...])`             | 字符串  | 返回操作系统：`linux`、`macos` 或 `windows`。可用关键字重命名，例如 <span v-pre>`{{ os(macos="darwin") }}`</span>。                                                                                                                                     |
| `os_family()`                                             | 字符串  | 返回 `unix` 或 `windows`。                                                                                                                                                                                                                             |
| `libc([gnu=...], [musl=...])`                             | 字符串  | 返回宿主机的 C 库：`musl` 或 `gnu`。只有 Linux 提供 musl 构建；[`libc`](/configuration/settings.html#libc) 设置会覆盖自动检测。可用关键字重命名，例如 <span v-pre>`{{ libc(gnu="", musl="-musl") }}`</span>。 |
| `avx2([yes=...], [no=...])`                               | 字符串  | 返回宿主机 CPU 是否支持 AVX2：`yes` 或 `no`。除 x86-64 外的 CPU 都返回 `yes`。可用关键字重命名，例如 <span v-pre>`{{ avx2(yes="", no="-baseline") }}`</span>。                                                                         |
| `num_cpus()`                                              | 字符串  | 返回 CPU 数量。需要进行算术运算时可使用 <span v-pre>`{{ (num_cpus() \| int) * 2 }}`</span>。                                                                                                                                                           |
| `choice(n, alphabet)`                                     | 字符串  | 从 `alphabet` 中随机选取 `n` 个字符。`choice(n=64, alphabet="0123456789abcdef")` 会生成随机的 64 位十六进制字符串。                                                                                                                                    |
| `haiku([words], [separator], [digits])`                   | 字符串  | 生成易读的随机名称，例如 `blazing-shadow-46`。默认使用 2 个单词、`-` 分隔符和 2 位数字。                                                                                                                                                                |
| `now([timezone])`                                         | 字符串  | 返回当前日期和时间。默认时区为 UTC，也可使用 `America/New_York` 等 IANA 时区名称。使用 `date` 格式化：<span v-pre>`{{ now() \| date(format="%Y") }}`</span>。                                                                                          |
| `get_random(start, end, [seed])`                          | 数值    | 返回指定范围内的随机整数。设置 `seed` 后结果可重复。                                                                                                                                                                                                     |
| `range(end, [start], [step_by])`                          | 列表    | 返回从 `start`（默认为 0）开始、到 `end` 之前为止的整数，可指定步长。                                                                                                                                                                                |
| `throw(message)`                                          | 无      | 停止渲染并报错。                                                                                                                                                                                                                                      |
| [`task_source_files([only_changed])`](#task-source-files) | 列表    | 返回任务的源文件。仅限任务中使用。                                                                                                                                                                                                                    |

### exec() 与 read_file() {#exec}

`exec()` 的运行目录以及 `read_file()` 相对路径的解析目录，都是包含该模板的配置文件所在目录。对于 `.config/mise.toml`，该目录是 `.config/`，而不是项目根目录。在任务运行脚本中，它们使用任务的工作目录（即 `dir`；默认是配置根目录）。这两者都不会使用你运行 mise 时所在的目录。在 `[env]` 中，`exec()` 还能读取之前 `[env]` 条目设置的变量；其他位置则只能读取 mise 启动时已有的环境变量。

```toml
[env]
GIT_SHA = "{{ exec(command='git rev-parse --short HEAD') }}"
VERSION = "{{ read_file(path='VERSION') | trim }}"
```

传入 `cache_key` 或 `cache_duration` 可将输出缓存在 `MISE_CACHE_DIR` 下。缓存键由命令、命令目录和 `cache_key` 组成，因此更改 `cache_key` 会重新运行命令。设置 `cache_duration`（例如 `"1h"` 或 `"1d"`）后，缓存输出会在指定时长后过期；不设置时，mise 会一直复用输出，直到缓存被清除：

```toml
[env]
AWS_ACCOUNT_ID = "{{ exec(command='aws sts get-caller-identity --query Account --output text', cache_key='aws-account', cache_duration='1d') }}"
```

这两个函数都要求配置文件已[受信任](/security.html#configuration-trust)。在[安全模式](/security.html#safe-mode)（`MISE_SAFE=1`）下，它们会报错而不会运行；`.miserc.toml` 中也不能使用这两个函数。

::: warning
每次渲染模板时都会运行 `exec()`，包括使用 `--dry-run` 时。因此只能用它运行没有副作用的命令。
`mise bootstrap --dry-run` 会禁用 `[bootstrap.hooks]` 命令中的 `exec()`；如果钩子命令调用了 `exec()`，预览会因 `exec() is disabled during dry run` 而中止。配置加载时仍会渲染 `[vars]` 和 `[env]`，因此其中的 `exec()` 即使在 `--dry-run` 下也会运行。
:::

## 过滤器 {#filters}

`[]` 表示可选参数。Tera 自带的过滤器也可用；参见 [Tera 文档](https://keats.github.io/tera/#built-in-filters)。

### 字符串 {#string-manipulation}

| 过滤器                                                                                               | 说明                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `quote`                                                                                            | 为 POSIX shell 中的字符串添加引号。字符串中的单引号使用 `'\''` 形式，因此 `it's` 会变成 `'it'\''s'`。                                                                                                  |
| `lower`、`upper`                                                                                   | 转换为小写或大写                                                                                                                                                                                       |
| `capitalize`                                                                                       | 首字母大写，其余字母小写                                                                                                                                                                               |
| `title`                                                                                            | 将每个单词首字母大写：`"foo bar"` 会变成 `Foo Bar`                                                                                                                                                     |
| `replace(from, to)`                                                                                | 将所有 `from` 替换为 `to`                                                                                                                                                                              |
| `trim`、`trim_start([pat])`、`trim_end([pat])`                                                      | 删除两端、开头或末尾的空白字符或 `pat`：<span v-pre>`{{ "v1.2.3" \| trim_start(pat="v") }}`</span> 会得到 `1.2.3`                                                                                 |
| `truncate(length, [end])`                                                                          | 将字符串截断至 `length` 个字符，并在末尾添加 `end`（默认为 `…`）                                                                                                                                       |
| `split(pat)`                                                                                       | 按 `pat` 将字符串拆分为列表                                                                                                                                                                            |
| `regex_replace(pattern, rep)`                                                                      | 替换匹配正则表达式的内容                                                                                                                                                                               |
| `default(value, [boolean])`                                                                        | 输入未定义时返回 `value`。输入已定义但为空或为 false 时会保留原值；传入 `boolean=true` 后除外，例如 <span v-pre>`{{ env.NAME \| default(value="x", boolean=true) }}`</span>。 |
| `kebabcase`、`lowercamelcase`、`uppercamelcase`、`snakecase`、`shoutysnakecase`、`shoutykebabcase` | 转换命名格式：`kebab-case`、`lowerCamelCase`、`UpperCamelCase`、`snake_case`、`SHOUTY_SNAKE_CASE`、`SHOUTY-KEBAB-CASE`                                                                                |
| `slug`、`slugify`                                                                                  | 将字符串转换为适合 URL 的 slug                                                                                                                                                                         |
| `urlencode`、`urlencode_strict`                                                                    | 对字符串进行 URL 百分号编码；`urlencode_strict` 会编码所有非字母数字字符                                                                                                                                 |
| `b64_encode([url_safe], [padded])`、`b64_decode([url_safe])`                                        | 编码或解码 Base64                                                                                                                                                                                      |
| `striptags`、`spaceless`                                                                            | 删除 HTML 标签，或删除 HTML 标签之间的空白字符                                                                                                                                                         |

`quote` 始终针对 POSIX shell 添加引号，不适用于 PowerShell 或 cmd。唯一例外是在 Windows 上运行的[守护进程](/daemons.html) `run` 命令：pitchfork 使用 `cmd /C` 运行它，因此此处的 `quote` 会按 cmd 规则添加引号。

将模板值插入 shell 命令时请使用 `quote`。同一个参数中，已加引号的值可以与未加引号的文本拼接：

```mise-toml
[tasks.create-config]
run = "touch {{ config_root | quote }}/generated.toml"
```

### 路径 {#path-manipulation}

| 过滤器          | 返回值  | 说明                                                                                         |
| --------------- | ------- | -------------------------------------------------------------------------------------------- |
| `absolute`      | 字符串  | 将路径转换为绝对路径。目标路径无需存在。                                                   |
| `canonicalize`  | 字符串  | 将路径转换为绝对路径并解析符号链接。目标路径不存在时会失败。                               |
| `dirname`       | 字符串  | 将 `/foo/bar/baz.txt` 转换为 `/foo/bar`。                                                   |
| `basename`      | 字符串  | 将 `/foo/bar/baz.txt` 转换为 `baz.txt`。                                                    |
| `extname`       | 字符串  | 将 `/foo/bar/baz.txt` 转换为 `txt`，不包含前导点号。                                        |
| `file_stem`     | 字符串  | 将 `/foo/bar/baz.txt` 转换为 `baz`。                                                        |
| `file_size`     | 数值    | 文件大小，单位为字节。                                                                     |
| `last_modified` | 数值    | 文件修改时间，以 Unix 纪元起算的秒数表示。                                                 |
| `join_path`     | 字符串  | 拼接路径片段列表：<span v-pre>`{{ [config_root, "bar.txt"] \| join_path }}`</span>。      |

### 哈希 {#hash}

| 过滤器                     | 说明                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `hash([algorithm], [len])` | 使用 `sha256`（默认）或 `blake3` 计算字符串哈希。`len` 可截短结果：<span v-pre>`{{ "foo" \| hash(len=8) }}`</span>。 |
| `hash_file([len])`         | 计算指定路径中文件的 BLAKE3 哈希。`len` 可截短结果。                                                                      |

### 列表、数字和格式化 {#collections}

| 过滤器                              | 说明                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first`、`last`                      | 列表中的第一项或最后一项                                                                                                                                                   |
| `join(sep)`                         | 将列表拼接为字符串：<span v-pre>`{{ ["a", "b"] \| join(sep=", ") }}`</span> 会得到 `a, b`。                                                                           |
| `length`                            | 字符串或列表的长度                                                                                                                                                         |
| `reverse`                           | 反转字符串或列表                                                                                                                                                           |
| `shuffle([seed])`                   | 随机打乱列表顺序                                                                                                                                                           |
| `int`、`float`                      | 将值转换为数字                                                                                                                                                             |
| `abs`                               | 数字的绝对值                                                                                                                                                               |
| `filesize_format`、`filesizeformat`  | 将字节数格式化为易读的文件大小                                                                                                                                             |
| `date(format, [timezone])`          | 格式化时间戳：<span v-pre>`{{ ts \| date(format="%Y-%m-%d") }}`</span>。参见 [`jiff` 格式参考](https://docs.rs/jiff/latest/jiff/fmt/strtime/index.html)。 |
| `format(spec)`                      | 使用 Rust 风格的格式化语法格式化值                                                                                                                                         |
| `json_encode([pretty])`             | 将值编码为 JSON                                                                                                                                                            |

## 测试条件 {#tests}

使用 `is` 调用测试条件，例如 <span v-pre>`{% if os() is starting_with(pat="mac") %}`</span>。测试条件使用命名参数。Tera 自带的测试条件也可用；参见 [Tera 文档](https://keats.github.io/tera/#built-in-tests)。

| 测试条件                                                    | 满足条件时为 true                                                                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defined`                                                   | 变量已定义                                                                                                                                                            |
| `string`、`number`                                          | 值是字符串或数字                                                                                                                                                      |
| `starting_with(pat)`、`ending_with(pat)`、`containing(pat)` | 值以 `pat` 开头、以 `pat` 结尾或包含 `pat`                                                                                                                             |
| `divisible_by(divisor)`                                     | 数字可以被 `divisor` 整除                                                                                                                                              |
| `matching(pat)`                                             | 字符串匹配正则表达式 `pat`                                                                                                                                              |
| `dir`、`file`、`exists`                                     | 路径是目录、是文件或存在                                                                                                                                               |
| `before(other, [inclusive])`、`after(other, [inclusive])`   | 日期早于或晚于 `other`：<span v-pre>`{% if release_date is after(other="2026-01-01") %}`</span>                                                                        |
| `semver_matching(requirement)`                              | 版本符合语义化版本要求，例如 <span v-pre>`{% if v is semver_matching(requirement=">=1.2") %}`</span>。仅适用于符合语义化版本格式的版本。                                |

<div v-pre>

```toml
[env]
VENV_STATUS = "{% if config_root ~ '/.venv' is dir %}present{% else %}missing{% endif %}"
```

</div>

## 任务中的模板

任务运行时才会渲染其 `run` 脚本，因此脚本可以使用 [`tools`](#variables) 映射和下文介绍的辅助函数。

### 任务参数 {#task-arguments}

任务定义了 [usage 规范](/tasks/task-arguments.html)后，其 `run` 脚本可以从 `usage` 读取已解析的参数。键采用参数和标志名称的 snake_case 形式，因此 `--dry-run` 对应 <span v-pre>`{{ usage.dry_run }}`</span>，也与 `$usage_dry_run` 环境变量同名。标志的值为布尔值，普通参数为字符串，计数标志为整数（`count=#true` 时，`-vvv` 得到 `3`），可变参数则为列表。

值不会自动按 shell 规则加引号。即使模板表达式外加了双引号，也无法阻止其值被当作 shell 语法解析，因此请对字符串使用 `quote` 过滤器：

```mise-toml
[tasks.deploy]
usage = '''
arg "<environment>" help="目标环境"
flag "-v --verbose" help="启用详细输出"
arg "[tags]" var=#true
'''
run = '''
printf 'env=%s\n' {{ usage.environment | quote }}
printf 'verbose=%s\n' {{ usage.verbose | str | quote }}
printf 'tag count=%s\n' {{ usage.tags | length | str | quote }}
{% for tag in usage.tags %}
printf 'tag=%s\n' {{ tag | quote }}
{% endfor %}
'''
```

运行 `mise run deploy prod -v a b` 会输出：

```text
env=prod
verbose=true
tag count=2
tag=a
tag=b
```

### task_source_files() {#task-source-files}

`task_source_files([only_changed])` 会返回任务的 [`sources`](/tasks/task-configuration.html#sources) 所匹配的文件，并展开 glob 和模板。未匹配任何文件的模式会被忽略；未声明 sources 的任务会得到空列表。

```mise-toml
[tasks.list-sources]
sources = ["src/**/*.ts", "package.json"]
run = '''
{% for file in task_source_files() %}
printf 'Processing: %s\n' {{ file | quote }}
{% endfor %}
'''
```

设置 `only_changed=true` 后，它只会返回任务上次成功以来发生修改的 sources，从而加快 lint 和格式化工具的运行：

```mise-toml
[tasks.lint]
sources = ["src/**/*.ts"]
run = "eslint{% for file in task_source_files(only_changed=true) %} {{ file | quote }}{% endfor %}"
```

任务从未成功运行时会返回所有 source。如果 source 均未更改，但任务仍然运行（例如传入 `--force` 或某项依赖任务执行过），也会返回所有 source。运行失败不会重置基准，因此这些文件会继续保留在列表中，直到任务成功为止。变更根据修改时间检测，因此 `touch` 和恢复缓存都会影响结果，与[任务缓存](/tasks/caching.html)的情况相同。

### 任务 env 中的密钥 <Badge type="warning" text="实验性" /> {#secrets}

::: warning 实验性功能
mise 密钥功能仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true` 启用。
:::

在任务自身的 `env` 值中，<span v-pre>`{{ secrets.NAME }}`</span> 会在任务启动时渲染 mise 密钥，并将对应键授予该任务。`secrets` 不能在其他位置使用。参见[组合值](/environments/secrets/fnox.html#compose-values)。

<a id="使用组件生成带参数的代码片段"></a>

### 使用组件生成带参数的代码片段 {#parameterized-snippets-with-components}

[Tera 组件](https://keats.github.io/tera/#components)可以在一个任务脚本中使用不同参数多次展开同一代码片段：

```mise-toml
[tasks.restart]
run = """
{% component restart(service, region="us-east-1") %}
aws ecs update-service --region {{ region | quote }} --cluster prod --service {{ service | quote }} --force-new-deployment
{% endcomponent %}
{{ <restart service="api" /> }}
{{ <restart service="worker" /> }}
{{ <restart service="api" region="eu-west-1" /> }}
"""
```

每次调用会展开为一条命令，并使用该任务的工具、环境、工作目录和 shell 运行。`service` 是必填参数，`region` 默认为 `us-east-1`。字符串参数使用引号；表达式则放在花括号中传入，例如 `region={vars.region}`。

组件必须定义在调用它的同一个模板字符串中；mise 没有共享组件库。在 `[vars]` 中定义的组件会在配置加载时渲染，而不是等到任务运行时渲染（参见[变量的解析时机](/configuration/vars.html#when-vars-are-resolved)）。要共享整个任务，请使用[任务模板](/tasks/templates.html)；要在多个脚本间共享 shell 逻辑，请加载 shell 文件。组件要求使用默认的 Tera v2 引擎，不能与 `tera_v1` 配合使用。

## .miserc.toml 中的模板 {#miserc-template-support}

mise 会先渲染 [`.miserc.toml`](/configuration.html#miserc)，再读取 `mise.toml` 或设置，因此此处只能使用操作系统提供的信息：

- `env`：mise 启动时的环境变量
- `config_root`：包含 `.miserc.toml` 文件的目录
- `cwd`
- `xdg_cache_home`, `xdg_config_home`, `xdg_data_home`, `xdg_state_home`
- `system_brew_prefix`
- 无需项目上下文的函数，例如 `arch()`、`os()`、`os_family()`、`libc()`、`avx2()`、`num_cpus()`、`choice()` 和 `get_env()`
- 所有[过滤器](#filters)和[测试条件](#tests)

以下内容不可用：`mise_env`（由 `.miserc.toml` 自身设置）、`exec()`、`read_file()`、`mise_bin`、`mise_pid`、`vars` 和 `tools`。

<div v-pre>

```toml [~/.config/mise/miserc.toml]
# Stop the config search at your home directory
ceiling_paths = ["{{ env.HOME }}"]

# Ignore a config file under your XDG config directory
ignored_config_paths = ["{{ xdg_config_home }}/mise/shared.toml"]
```

</div>

渲染为空的块会留下空行，而 TOML 会忽略空行，因此可以使用条件语句：

<div v-pre>

```text [~/.config/mise/miserc.toml]
{% if os() == "linux" %}
ceiling_paths = ["{{ env.HOME }}/work"]
{% endif %}
```

</div>

如果模板渲染失败（例如遇到未定义变量或调用 `exec()`），mise 会静默地使用文件未经渲染的原始内容。由于 mise 读取 `.miserc.toml` 时日志系统尚未启动，因此不会打印警告。若要保留字面量 <span v-pre>`{{`</span>，请使用 [`raw` 块](#syntax)。

## 从 Tera v1 迁移 {#tera-v2-migration}

mise 使用 Tera v2 渲染模板。目前仍接受大多数 Tera v1 辅助语法，但从 mise 2026.10.0 起，使用这些语法时会发出警告；mise 2027.4.0 将移除它们。请按下表替换：

| Tera v1 写法                                                                                   | Tera v2 替代写法                                                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `value \| trim_start_matches(pat="v")`                                                        | 使用 `value \| trim_start(pat="v")` 替代                                      |
| `value \| trim_end_matches(pat="-beta")`                                                      | 使用 `value \| trim_end(pat="-beta")` 替代                                    |
| `items \| slice(start=0, end=2)`                                                              | 改用 `items[0:2]`                                                             |
| `[base] \| concat(with="file.txt")`                                                           | 改用 `[base, "file.txt"]`                                                     |
| `[...items] \| concat(with=extra_items)`                                                      | 改用 `[...items, ...extra_items]`                                             |
| `items \| map(attribute="name")`                                                              | 改用 `[item.name for item in items]`                                          |
| `items \| filter(attribute="active")`                                                         | 改用 `[item for item in items if item.active]`                                |
| `value \| as_str`                                                                             | `value \| str`                                                                |
| `value \| escape`                                                                             | `value \| escape_html`                                                        |
| `value \| linebreaksbr`                                                                       | `value \| newlines_to_br`                                                     |
| `value \| addslashes`                                                                         | 显式调用 `replace(from=..., to=...)`                                           |
| `value is divisibleby(divisor=3)`                                                             | 改用 `value is divisible_by(divisor=3)`                                       |
| `value is object`                                                                             | 改用 `value is map`                                                           |
| `value \| indent(prefix=">")`                                                                 | 改用 `value \| indent(width=1)`；仅适用于空格缩进                              |
| `value \| truncate`                                                                           | 改用 `value \| truncate(length=255)`                                          |
| `value \| int(default=0)`、`float(default=0)`，或对非数字输入使用 `int`/`float`                     | 先验证输入；Tera 2 会报错，而不是返回默认值或 0                                |
| 对空列表或元素不足的列表使用 `items \| first`、`last` 或 `nth(n=...)`                             | 先检查 `items \| length`；Tera 2 会返回 null，而不是 `""`                    |

在 mise 2027.4.0 之前，`unique` 过滤器仍会像 Tera v1 一样忽略大小写；之后将改为 Tera 2 的区分大小写行为。`unique(case_sensitive=...)` 会发出警告，且没有能继续忽略大小写的替代写法。

Tera v2 中的 `now()` 接受 `[timezone]` 参数。使用 `tera_v1` 时，则仍采用原来的 `now([timestamp], [utc])` 签名。

部分 Tera v1 行为在 v2 中没有对应功能：v2 遇到未定义变量会报错，也不支持宏（请改用[组件](#parameterized-snippets-with-components)）。更新模板前，可设置 [`tera_v1`](/configuration/settings.html#tera_v1)，让所有模板暂时使用 Tera v1 渲染。在共享的 `mise.toml` 中，建议将它设为环境变量；较旧版本的 mise 会忽略此变量，而不会因未知设置报错：

```toml
[env]
MISE_TERA_V1 = true
```

启用 `tera_v1` 会显示弃用警告，mise 2027.4.0 将移除该选项。它不适用于 `.miserc.toml`，因为 mise 会在读取设置前渲染该文件。
