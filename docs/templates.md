---
description: "Use Tera expressions to derive configuration values from the project directory, environment, or [vars]."
---

# Templates

Use Tera expressions to derive configuration values from the project directory,
environment, or [`[vars]`](/configuration/vars.html). mise renders those expressions
when it resolves configuration or prepares a task.

This page covers string templates. For reusable task definitions with `extends`,
see [Task Templates](/tasks/templates.html).

你可以在以下位置定义和使用模板：

- Most `mise.toml` configuration values
  - The `mise.toml` file itself is not templated and must be valid TOML
- `.tool-versions` files
- `.miserc.toml` files (limited context — see [Template Support in .miserc.toml](#miserc-template-support))

## 示例

这是一个使用模板的 `mise.toml` 文件示例：

```toml
[env]
PROJECT_NAME = "{{ config_root | basename }}"
TERRAFORM_VERSION = "1.0.0"

[tools]
# 引用在此文件中定义的 env 变量
terraform = "{{ env.TERRAFORM_VERSION }}"
# 引用外部 env 变量
node = "{{ get_env(name='NODE_VERSION', default='20') }}"
```

`config_root` stays at the project root when you run mise from a subdirectory;
`cwd` follows the invocation directory. Use the former for project-relative paths.
See the [cookbook](./mise-cookbook/index.md) for recipes.

## 模板渲染

mise uses [tera](https://keats.github.io/tera/) to provide the template feature.
Templates use three kinds of delimiters:

- <span v-pre>`{{`</span> 和 <span v-pre>`}}`</span> 用于表达式
- <span v-pre>`{%`</span> 和 <span v-pre>`%}`</span> 用于语句
- <span v-pre>`{#`</span> 和 <span v-pre>`#}`</span> 用于注释

Use a `raw` block to keep tera delimiters from being rendered:

<div v-pre>

```
{% raw %}
  Hello {{ name }}
{% endraw %}
```

</div>

This renders as <span v-pre>`Hello {{ name }}`</span>.

Tera 支持 [字面量](https://keats.github.io/tera/#literals)，包括：

- booleans: `true` (or `True`) and `false` (or `False`)
- integers
- floats
- strings: text delimited by `""`, `''` or <code>\`\`</code>
- arrays: a comma-separated list of literals and/or identifiers surrounded by
  `[` and `]` (trailing comma allowed)

Render a variable with <span v-pre>`{{ name }}`</span>.
For nested attributes, use:

- 点号 `.`，例如 <span v-pre>`{{ product.name }}`</span>
- 方括号 `[]`，例如 <span v-pre>`{{ product["name"] }}`</span>

Tera 还支持强大的[表达式](https://keats.github.io/tera/#expressions)：

- 数学表达式
  - `+`
  - `-`
  - `/`
  - `*`
  - `%`
- 比较
  - `==`
  - `!=`
  - `>=`
  - `<=`
  - `<`
  - `>`
- 逻辑
  - `and`
  - `or`
  - `not`
- concatenation `~`, e.g. <code v-pre>{{ "hello " ~ 'world' ~ \`!\` }}</code>
- `in` membership checks, e.g. <span v-pre>`{{ some_var in [1, 2, 3] }}`</span>

Tera 还支持[控制结构，例如 <span v-pre>`if`</span> 和
<span v-pre>`for`</span>](https://keats.github.io/tera/#control-structures)。

### Tera v2 迁移

mise 使用 Tera v2。Tera v1 的部分语法和内置功能在 Tera v2 中发生了变化。mise
仍然可以出于兼容性考虑渲染许多旧模板。Tera v1 兼容性辅助功能将于
mise 2026.10.0 开始发出警告，并计划在 mise 2027.4.0 中移除。

在新模板中，建议优先使用以下 Tera v2 形式：

| Tera v1 模式                            | Tera v2 替代形式                           |
| ---------------------------------------- | ------------------------------------------ |
| `value \| trim_start_matches(pat="v")`   | `value \| trim_start(pat="v")`             |
| `value \| trim_end_matches(pat="-beta")` | `value \| trim_end(pat="-beta")`           |
| `items \| slice(start=0, end=2)`         | `items[0:2]`                               |
| `[base] \| concat(with="file.txt")`      | `[base, "file.txt"]`                       |
| `[...items] \| concat(with=extra_items)` | `[...items, ...extra_items]`               |
| `items \| map(attribute="name")`         | `[item.name for item in items]`            |
| `items \| filter(attribute="active")`    | `[item for item in items if item.active]`  |
| `value \| as_str`                        | `value \| str`                             |
| `value \| escape`                        | `value \| escape_html`                     |
| `value \| linebreaksbr`                  | `value \| newlines_to_br`                  |
| `value is divisibleby(divisor=3)`        | `value is divisible_by(divisor=3)`         |
| `value is object`                        | `value is map`                             |
| `value \| indent(prefix=">")`            | 仅处理空格时使用 `value \| indent(width=1)` |
| `value \| truncate`                      | `value \| truncate(length=255)`            |

Tera v2 还增加了有用的语法，可以替代许多旧的辅助过滤器：

- 数组和字符串切片，例如 `parts[0:2]`、`parts[-1]` 和 `name[::-1]`
- 数组和映射展开，例如 `[first, ...rest]` 和 `{...base, key: value}`
- 列表推导式，例如 `[tool.name for tool in tools if tool.active]`
- 可选链，例如 `env?.NODE_ENV or "development"`
- 三元表达式，例如 `"prod" if release else "dev"`

并非所有 Tera v1 的行为都能实现兼容。Tera v2 中对未定义变量的访问更加严格，
并且 mise 模板不支持 Tera v1 宏。作为临时的退出方案，在运行 mise 前设置
`MISE_TERA_V1=1`，即可使用 Tera v1 渲染模板。在共享的 `mise.toml` 文件中，
建议使用向后兼容的环境变量形式，因为较旧版本的 mise 会将其视为普通环境变量，
而不会因未知设置而失败：

```toml
[env]
MISE_TERA_V1 = true
```

较新的 `[settings] tera_v1 = true` 形式也适用于支持该设置的 mise 版本，
但与旧版本的兼容性较差。启用后，所有常规配置和任务模板都会使用实际的
Tera v1 引擎及其原始语法和内置功能。不启用时，模板将使用 Tera v2 以及下文所述的
辅助功能。该退出方案计划在 mise 2027.4.0 中移除。由于 miserc 文件会在加载设置前
进行渲染，因此加载 miserc 本身时不适用。

### Tera 过滤器

You can modify variables with [filters](https://keats.github.io/tera/#filters).
Apply a filter with a pipe symbol (`|`); filters may take named arguments
in parentheses, and multiple filters can be chained.
For example, <span v-pre>`{{ "Doctor Who" | lower | replace(from="doctor", to="Dr.") }}`</span>
outputs `Dr. who`.

### Tera 函数

[函数](https://keats.github.io/tera/#functions)为模板提供
额外功能。

### Tera 测试

You can also use [tests](https://keats.github.io/tera/#tests) to examine variables.

```
{% if my_number is not odd %}
  偶数
{% endif %}
```

## Mise 模板功能

mise provides additional variables, functions, filters, and tests on top of tera's.

### 变量

mise exposes several [variables](https://keats.github.io/tera/#variables)
with information about the current environment:

- `env: HashMap<String, String>` – Accesses current environment variables as
  a key-value map.
- `vars: HashMap<String, String>` – Accesses user-defined [configuration variables](/configuration/vars).
- `cwd: PathBuf` – Points to the current working directory.
- `config_root: PathBuf` – Points to the directory containing your `mise.toml` file; for a config such as `~/src/myproj/.config/mise.toml`, it points to `~/src/myproj`.
- `config_source: String` – The config file the template itself is written in, as an absolute path. Unlike `config_root` this is the file, not the project it belongs to, and it is **not** resolved through symlinks — pipe it through `canonicalize` when you want the location of the real file. Available in `mise.toml`, `.tool-versions`, `[env]` directives and `[settings.age]`; task file templates and `.miserc.toml` only carry `config_root`.

  With it, a shared config symlinked into `conf.d` can add its own `bin` directory
  to the path:

  ```toml
  [env]
  _.path = "{{ config_source | canonicalize | dirname }}/bin"
  ```

  省略 `canonicalize` 可获取访问该文件所经过的目录，而不是文件实际所在的目录

- `mise_bin: String` - Points to the current mise executable
- `mise_pid: String` - The PID of the current mise process
- `mise_env: Vec<String>` - The configuration environment as specified by `MISE_ENV`, `-E`, or `--env`. Undefined if no configuration environment is set.
- `xdg_cache_home: PathBuf` - Points to the XDG cache home directory
- `xdg_config_home: PathBuf` - Points to the XDG config home directory
- `xdg_data_home: PathBuf` - Points to the XDG data home directory
- `xdg_state_home: PathBuf` - Points to the XDG state home directory
- `tools: HashMap<String, ToolInfo | ToolInfo[]>` – Maps installed tool names to their info.
  Available in task templates and env directives with `tools = true`.
  - When a single version is installed:
    - `tools.<name>.version: String` – The resolved version (e.g., `"22.1.0"`)
    - `tools.<name>.path: String` – The install path
  - When multiple versions are installed, it becomes an array:
    - `tools.<name>[0].version: String` – The first version
    - `tools.<name>[0].path: String` – The first install path
    - `tools.<name>[1].version: String` – The second version, etc.

在 **任务运行脚本** 中，当任务有 usage 规范时，mise 还会暴露一个 `usage` 映射（参见 [任务参数](/tasks/task-arguments#usage-field)）：

- `usage: HashMap<String, Value>` – 已解析的任务参数和标志，以其名称为键。值**不会经过 shell 转义或加引号**，并且可能是：
  - 布尔值（用于标志和布尔参数）
  - 字符串
  - 布尔值/字符串数组（用于可变参数/标志）

The keys are the argument/flag names as written in the usage spec. If the name
contains `-`, use bracket access, e.g. <span v-pre>`{{ usage["dry-run"] }}`</span>.
For a POSIX shell, quote string values before inserting them into a command.
Double quotes around an unescaped template expression do not prevent its value
from becoming shell syntax. This example uses `quote` and converts booleans to
strings explicitly:

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

### 函数

#### Tera 内置函数

Tera 提供了许多[内置函数](https://keats.github.io/tera/#built-in-functions)。
`[]` 表示可选的函数参数。
部分函数如下：

- `range(end, [start], [step_by])` - Returns an array of integers created
  using the arguments given.
  - `end: usize`: stop before `end`, mandatory
  - `start: usize`: the starting value, defaults to `0`
  - `step_by: usize`: the increment, defaults to `1`
- `now([timezone])` - In the default Tera v2 mode, returns the current datetime
  as a string. The timezone defaults to UTC and accepts IANA names such as
  `America/New_York`.
  - Tip: use the date filter to format the result,
    e.g. <span v-pre>`{{ now() | date(format="%Y") }}`</span> gets the current year.
  - With `tera_v1 = true`, the original `now([timestamp], [utc])` signature remains
    available instead.
- `throw(message)` - Throws an error with the given message.
- `get_random(start, end, [seed])` - Returns a random integer in a range.
  Providing `seed` makes the result reproducible.

`before` 和 `after` 测试用于比较日期，并接受 `other` 和可选的 `inclusive` 参数：

<span v-pre>`{% if release_date is after(other="2026-01-01") %}...{% endif %}`</span>

Tera offers more functions. Read more in the [tera documentation](https://keats.github.io/tera/#functions).

#### 其他 Mise 函数

mise offers many useful functions in addition to tera's built-ins.

##### 通用函数

These helpers are available in regular configuration and task templates. Their
results depend on the rendering context: `exec()` observes the process environment
and working directory, and `read_file()` observes the file's current contents.
See the [early-init limitations](#miserc-template-support) for `.miserc.toml`.

- `exec(command) -> String` – Runs a shell command and returns its output as a string.
- `get_env(name, [default]) -> String` – Returns the original process environment
  variable value by name. This helper is provided by mise for compatibility with
  older Tera templates. Prefer the `env` variable in new templates when possible.
  The `default` value is used when the environment variable is not present; empty
  environment variables are returned as-is.
- `arch() -> String` – Returns the system architecture, such as `x64` or `arm64`.
- `os() -> String` – Returns the name of the operating system,
  e.g. linux, macos, windows.
- `os_family() -> String` – Returns the operating system family, e.g. `unix`, `windows`.
- `num_cpus() -> usize` – Returns the number of CPUs available on the system.
- `choice(n, alphabet)` - Generates a string of `n` characters sampled with replacement
  from `alphabet`. For example, `choice(n=64, alphabet='0123456789abcdef')` generates a random
  64-character lowercase hex string.
- `read_file(path) -> String` – Reads the contents of a file at the given path and returns
  it as a string.

::: warning
`exec()` 会在模板每次渲染时运行，包括评估配置模板的 `--dry-run` 操作。试运行模式会抑制计划执行的 mise 操作，但不会对模板函数执行的命令进行沙箱隔离或抑制。请确保传递给 `exec()` 的命令不会产生副作用。
:::

##### 特定任务函数

These helpers use the current task's configuration and execution state.

For example, `task_source_files()` returns a different set of file paths depending on the [`sources`](https://mise.jdx.dev/tasks/task-configuration.html#sources) of the task it's called from.

- <span id="task-source-files">`task_source_files() -> Vec<String>`</span> – Returns the task's [`sources`](https://mise.jdx.dev/tasks/task-configuration.html#sources)
  as an array of resolved file paths. Glob patterns and Tera template strings in the task's sources
  are expanded into actual file paths. Patterns that match no files are omitted from the result.
  Returns an empty array if no sources are configured or no files match.

  传递 `only_changed=true` 可将结果限制为自 mise 上次认为该任务已是最新状态以来写入的源文件。这对于代码检查器和格式化工具很有用，因为向它们提供少量文件时速度会快得多。mise 从未将其视为最新状态的任务没有可供比较的基线，因此会返回每个源文件。运行失败不会推进基线，因此相同的文件会一直保留在列表中，直到任务成功。与 mise 自身的源文件新鲜度检查一样，这里比较的是修改时间，因此同样会受到 `touch` 和已恢复缓存相关问题的影响。

  过滤不会将结果缩减为空：如果没有源文件发生变化但任务仍在运行——使用了 `--force`、某个确实执行了操作的依赖项、或源文件保持不变时某个输出被删除——则会返回所有源文件，因为不给任务传递文件，就无法完成它被运行来执行的工作。

#### 示例

```toml
# Using exec to get command output
[tool_alias.node.versions]
current = "{{ exec(command='node --version') }}"

# 使用 read_file 引入文件内容
[env]
VERSION = "{{ read_file(path='VERSION') | trim }}"

# 在任务脚本中访问已解析的源文件
[tasks.example]
sources = ["src/**/*.ts", "package.json"]
run = '''
{% for file in task_source_files() %}
  printf 'Processing: %s\n' {{ file | quote }}
{% endfor %}
'''

# Only lint what changed since this task last succeeded. Each path goes through
# `quote`, so a filename containing a space or a shell metacharacter stays one
# argument (POSIX shells — see the quote filter's note).
[tasks.lint]
sources = ["src/**/*.ts"]
run = "eslint{% for file in task_source_files(only_changed=true) %} {{ file | quote }}{% endfor %}"
```

### Exec 选项

`exec` 函数支持以下选项：

- `command: String` – [required] The command to run.
- `cache_key: String` – The cache key under which to store the result.
  When provided, the result is cached and reused for subsequent calls.
- `cache_duration: String` – How long to cache the result, in seconds,
  minutes, hours, days, or weeks.
  e.g. `cache_duration="1d"` caches the result for 1 day.

### 过滤器

Tera 提供了许多[内置过滤器](https://keats.github.io/tera/#built-in-filters)。
`[]` 表示可选的过滤器参数。
一些在 Tera v2 中被移除或重命名的 Tera v1 过滤器仍受支持，
以确保兼容性，直到 mise 2027.4.0。mise 将从 mise 2026.10.0 开始针对这些过滤器发出弃用警告。
`tera-contrib` 提供的辅助工具支持使用，且不会发出弃用警告。
部分过滤器如下：

- `str | lower -> String` – Converts a string to lowercase.
- `str | upper -> String` – Converts a string to uppercase.
- `str | capitalize -> String` – Lowercases a string except for its first character,
  which is uppercased.
- `str | replace(from, to) -> String` – Replaces all instances of `from` with `to`,
  e.g., <span v-pre>`{{ name | replace(from="Robert", to="Bob")}}`</span>
- `str | title -> String` – Capitalizes each word inside a sentence.
  e.g., <span v-pre>`{{ "foo bar" | title }}`</span> becomes `Foo Bar`.
- `str | trim -> String` – Removes leading and trailing whitespace.
- `str | trim_start -> String` – Removes leading whitespace.
- `str | trim_end -> String` – Removes trailing whitespace.
- `str | truncate -> String` – Truncates a string to the indicated length.
- `array | first -> Value` – Returns the first element in an array.
- `array | last -> Value` – Returns the last element in an array.
- `array | join(sep) -> String` – Joins an array of strings with a separator,
  such as <span v-pre>`{{ ["a", "b", "c"] | join(sep=", ") }}`</span>
  to produce `a, b, c`.
- `str | length -> usize` – Returns the length of a string or array.
- `str | reverse -> String` – Reverses the order of characters in a string or
  elements in an array.
- `str | urlencode -> String` – Encodes a
  string to be safely used in URLs,
  converting special characters to percent-encoded values.
- `arr | map(attribute) -> Array` – Deprecated compatibility filter. Extracts
  an attribute from each object in an array.
- `arr | concat(with) -> Array` – Deprecated compatibility filter. Appends
  values to an array. Prefer array literals and spread syntax.
- `num | abs -> Number` – Returns the absolute value of a number.
- `num | filesize_format -> String` – Converts
  an integer into
  a human-readable file size. `filesizeformat` is also available as an alias.
- `str | date(format, [timezone]) -> String` – Converts a timestamp to
  a formatted date string using the provided format,
  such as <span v-pre>`{{ ts | date(format="%Y-%m-%d") }}`</span>.
  Find a list of time formats in the
  [`jiff` documentation](https://docs.rs/jiff/latest/jiff/fmt/strtime/index.html).
- `str | b64_encode([url_safe], [padded]) -> String` – Encodes a string as base64.
- `str | b64_decode([url_safe]) -> String` – Decodes a base64 string.
- `value | format(spec) -> String` – Formats a value with Rust-style formatting.
- `value | json_encode([pretty]) -> String` – Encodes a value as JSON.
- `array | shuffle([seed]) -> Array` – Randomly shuffles an array.
- `str | regex_replace(pattern, rep) -> String` – Replaces regex matches.
- `str | striptags -> String` – Removes HTML tags.
- `str | spaceless -> String` – Removes whitespace between HTML tags.
- `str | slug -> String` – Converts a string to a URL-friendly slug.
  `slugify` is also available as an alias.
- `str | urlencode_strict -> String` – Percent-encodes all non-alphanumeric characters.
- `str | split(pat) -> Array` – Splits a string by the given pattern and
  returns an array of substrings.
- `str | default(value) -> String` – Returns the default value
  if the variable is not defined or is empty.

Tera offers more filters. Read more in the [tera documentation](https://keats.github.io/tera/#built-in-filters).

#### 哈希

- `str | hash([algorithm], [len]) -> String` – 为输入字符串生成哈希
  - `algorithm: "sha256" | "blake3"`：要使用的哈希算法（默认：`"sha256"`）
  - `len: usize`：将哈希字符串截断为给定长度
  - 示例：
    - <span v-pre>`{{ "foo" | hash }}`</span> – SHA256 哈希（默认）
    - <span v-pre>`{{ "foo" | hash(algorithm="blake3") }}`</span> – BLAKE3 哈希
    - <span v-pre>`{{ "foo" | hash(len=8) }}`</span> – 将 SHA256 哈希截断为 8 个字符
- `path | hash_file([len]) -> String` – 返回给定路径下文件的 BLAKE3 哈希值
  - `len: usize`：将哈希字符串截断为给定长度

#### 路径操作

- `path | absolute -> String` – Converts the input path into
  an absolute path. Does not require the path to exist.
- `path | canonicalize -> String` – Converts the input path into its
  canonical absolute form. Throws if the path doesn't exist.
- `path | dirname -> String` – Returns the directory path for a file,
  e.g. `/foo/bar/baz.txt` becomes `/foo/bar`.
- `path | basename -> String` – Returns the base name of a file,
  e.g. `/foo/bar/baz.txt` becomes `baz.txt`.
- `path | extname -> String` – Returns the extension of a file,
  e.g. `/foo/bar/baz.txt` becomes `.txt`.
- `path | file_stem -> String` – Returns the file name without the extension,
  e.g. `/foo/bar/baz.txt` becomes `baz`.
- `path | file_size -> String` – Returns the size of a file in bytes.
- `path | last_modified -> String` – Returns the last modified time of a file.
- `path[] | join_path -> String` – Joins an array of paths into a single path.

例如，你可以使用数组字面量和 `join_path` 来构造文件路径：

```toml
[env]
PROJECT_CONFIG = "{{ [config_root, 'bar.txt'] | join_path }}"
```

#### 字符串操作

- `str | quote -> String` – 为 POSIX shell 中的字符串加引号。嵌入的单引号使用 POSIX 安全的 `'\''` 形式，例如 `'it'\''s str'`。此过滤器不会针对 PowerShell、cmd 或其他非 POSIX shell 调整其输出
- `str | kebabcase -> String` – 将字符串转换为 kebab-case
- `str | lowercamelcase -> String` – 将字符串转换为 lowerCamelCase
- `str | uppercamelcase -> String` – 将字符串转换为 UpperCamelCase
- `str | snakecase -> String` – 将字符串转换为 snake_case
- `str | shoutysnakecase -> String` – 将字符串转换为 SHOUTY_SNAKE_CASE

将模板值插入 POSIX shell 命令时，请使用 `quote`。带引号和不带引号的片段可以连接到同一个参数中：

```toml
[tasks.create-config]
run = "touch {{ config_root | quote }}/generated.toml"
```

### 测试

Tera 提供了许多[内置测试](https://keats.github.io/tera/#built-in-tests)。
一些测试：

- `defined` - Returns `true` if the given variable is defined.
- `string` - Returns `true` if the given variable is a string.
- `number` - Returns `true` if the given variable is a number.
- `starting_with` - Returns `true` if the given variable is a string and starts with
  the given argument.
- `ending_with` - Returns `true` if the given variable is a string and ends with
  the given argument.
- `containing` - Returns `true` if the given variable contains the given argument.
- `matching` - Returns `true` if the given variable is a string and matches the regex
  in the argument.

Tera offers more tests. Read more in the [tera documentation](https://keats.github.io/tera/#built-in-tests).

mise offers additional tests:

- `if path is dir` – Checks whether the path is a directory.
- `if path is file` – Checks whether the path is a file.
- `if path is exists` – Checks whether the path exists.

## .miserc.toml 中的模板支持 {#miserc-template-support}

`.miserc.toml` files support Tera templates, but with a **limited context**: `.miserc.toml`
is loaded very early — before `mise.toml`, settings, and the main config are parsed — so
only information available at the OS level can be used.

### 可用上下文

- `env: HashMap<String, String>` – OS environment variables (same as in `mise.toml`)
- `config_root: PathBuf` – Directory containing the `.miserc.toml` file
- `cwd: PathBuf` – Current working directory
- `xdg_cache_home`, `xdg_config_home`, `xdg_data_home`, `xdg_state_home` – XDG base directories
- Context-independent [functions](#functions), including `arch()`, `os()`, `os_family()`, `num_cpus()`, and `choice()`; exclusions are listed below.
- All [filters](#filters): `absolute`, `dirname`, `basename`, `hash`, etc.

### 不可用内容

- `mise_env` – This is what `.miserc.toml` defines; it cannot reference itself
- `exec()` – Requires settings, which are not yet loaded
- `read_file()` – Not registered in the early-init context (needs per-file directory resolution that is not set up at this stage)
- `mise_bin`, `mise_pid` – Not meaningful at this stage

### miserc.toml 示例

<div v-pre>

```toml
# /workspaces/vcs/.config/miserc.toml

# 使用 $HOME 设置一个上限路径（在 home 目录处停止配置搜索）
ceiling_paths = ["{{ env.HOME }}"]

# Paths are relative to the directory containing this miserc file.
# Recursive glob patterns are supported.
ignored_config_paths = ["../vendor/**/mise.toml"]
```

</div>

条件判断也可以——顶层的 `{% if %}` 块在条件为 false 时会产生空行，而 TOML 会忽略这些空行：

<div v-pre>

```toml
# ~/.config/mise/miserc.toml
{% if os() == "linux" %}
ceiling_paths = ["{{ env.HOME }}/work"]
{% endif %}
```

</div>

::: tip
If a template fails to render (e.g. due to an undefined variable), mise logs a warning
and falls back to the raw content.
:::

::: warning
如果你的 `.miserc.toml` 值中包含字面量的 <span v-pre>`{{`</span>、`{%` 或 `{#` 字符
（并非用于模板），请将它们放入 `{% raw %}...{% endraw %}` 块中，以防止 Tera
将其解释为模板。
:::
