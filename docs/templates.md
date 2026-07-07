# 模板

mise 中的模板提供了一种强大的方式来配置环境和项目设置的不同方面。

模板是一个包含变量、表达式和控制结构的字符串。渲染时，模板引擎（`tera`）会用它们的值替换这些变量。

你可以在以下位置定义和使用模板：

- 大多数 `mise.toml` 配置值
  - `mise.toml` 文件本身不支持模板，且必须是有效的 toml
- `.tool-versions` 文件
- `.miserc.toml` 文件（上下文有限——参见 [Template Support in .miserc.toml](#miserc-template-support)）

## 示例

这是一个使用模板的 `mise.toml` 文件示例：

```toml
[env]
PROJECT_NAME = "{{ cwd | basename }}"
TERRAFORM_VERSION = "1.0.0"

[tools]
# 引用在此文件中定义的 env 变量
terraform = "{{ env.TERRAFORM_VERSION }}"
# 引用外部 env 变量
node = "{{ get_env(name='NODE_VERSION', default='20') }}"
```

你可以在 [食谱](./mise-cookbook/index.md) 中找到更多示例。

## 模板渲染

Mise 使用 [tera](https://keats.github.io/tera/docs/) 来提供模板功能。
在模板中，有 3 种分隔符：

- <span v-pre>`{{`</span> 和 <span v-pre>`}}`</span> 用于表达式
- <span v-pre>`{%`</span> 和 <span v-pre>`%}`</span> 用于语句
- <span v-pre>`{#`</span> 和 <span v-pre>`#}`</span> 用于注释

此外，使用 `raw` 块来跳过 tera 分隔符的渲染：

<div v-pre>

```
{% raw %}
  Hello {{ name }}
{% endraw %}
```

</div>

这将变成 <span v-pre>`Hello {{name}}`</span>。

Tera 支持 [字面量](https://keats.github.io/tera/docs/#literals)，包括：

- 布尔值：`true`（或 `True`）和 `false`（或 `False`）
- 整数
- 浮点数
- 字符串：由 `""`、`''` 或 <code>\`\`</code> 包围的文本
- 数组：由 `[` 和 `]` 包围的，以逗号分隔的字面量和/或标识符列表（允许末尾逗号）

你可以使用 <span v-pre>`{{ name }}`</span> 来渲染变量。
对于复杂属性，使用：

- 点号 `.`，例如 <span v-pre>`{{ product.name }}`</span>
- 方括号 `[]`，例如 <span v-pre>`{{ product["name"] }}`</span>

Tera 还支持强大的 [表达式](https://keats.github.io/tera/docs/#expressions)：

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
- 连接 `~`，例如 <code v-pre>{{ "hello " ~ 'world' ~ \`!\` }}</code>
- in 检查，例如 <span v-pre>`{{ some_var in [1, 2, 3] }}`</span>

Tera 还支持 [控制结构，例如 <span v-pre>`if`</span> 和
<span v-pre>`for`</span>](https://keats.github.io/tera/docs/#control-structures)。

### Tera 过滤器

你可以使用 [过滤器](https://keats.github.io/tera/docs/#filters) 来修改变量。
你可以通过管道符（`|`）过滤变量，并且可以在括号中使用命名参数。
你还可以串联多个过滤器。
例如 <span v-pre>`{{ "Doctor Who" | lower | replace(from="doctor", to="Dr.") }}`</span>
将输出 `Dr. who`。

### Tera 函数

[函数](https://keats.github.io/tera/docs/#functions) 为模板提供额外功能。

### Tera 测试

你也可以使用 [测试](https://keats.github.io/tera/docs/#tests) 来检查变量。

```
{% if my_number is not odd %}
  偶数
{% endif %}
```

## Mise 模板功能

Mise 在 tera 功能的基础上提供了额外的变量、函数、过滤器和测试。

### 变量

Mise 暴露了若干 [变量](https://keats.github.io/tera/docs/#variables)。
这些变量提供了当前环境的关键信息：

- `env: HashMap<String, String>` – 以键值对映射的形式访问当前环境变量。
- `cwd: PathBuf` – 指向当前工作目录。
- `config_root: PathBuf` – 定位包含你的 `mise.toml` 文件的目录，或者在类似 `~/src/myproj/.config/mise.toml` 的情况下，它会指向 `~/src/myproj`。
- `mise_bin: String` - 指向当前 mise 可执行文件的路径
- `mise_pid: String` - 指向当前 mise 进程的 pid
- `mise_env: Vec<String>` - 由 `MISE_ENV`、`-E` 或 `--env` 指定的配置环境。如果未设置配置环境，则该变量未定义。
- `xdg_cache_home: PathBuf` - 指向 XDG 缓存主目录
- `xdg_config_home: PathBuf` - 指向 XDG 配置主目录
- `xdg_data_home: PathBuf` - 指向 XDG 数据主目录
- `xdg_state_home: PathBuf` - 指向 XDG 状态主目录
- `tools: HashMap<String, ToolInfo | ToolInfo[]>` – 将已安装的工具名称映射到其信息。
  在任务模板和 `tools = true` 的环境指令中可用。
  - 当安装了单个版本时：
    - `tools.<name>.version: String` – 解析后的版本（例如，`"22.1.0"`）
    - `tools.<name>.path: String` – 安装路径
  - 当安装了多个版本时，它会变成数组：
    - `tools.<name>[0].version: String` – 第一个版本
    - `tools.<name>[0].path: String` – 第一个安装路径
    - `tools.<name>[1].version: String` – 第二个版本，等等。

在 **任务运行脚本** 中，当任务有 usage 规范时，mise 还会暴露一个 `usage` 映射（参见 [任务参数](/tasks/task-arguments#usage-field)）：

- `usage: HashMap<String, Value>` – 已解析的任务参数和标志，以其名称为键。值**不会经过 shell 转义或加引号**，并且可能是：
  - 布尔值（用于标志和布尔参数）
  - 字符串
  - 布尔值/字符串数组（用于可变参数/标志）

这些键就是 usage 规范中写入的参数/标志名称。如果名称包含 `-`，请使用方括号访问，例如 <span v-pre>`{{ usage["dry-run"] }}`</span>。
示例：

```mise-toml
[tasks.deploy]
usage = '''
arg "<environment>" help="目标环境"
flag "-v --verbose" help="启用详细输出"
arg "[tags]" var=#true
'''
run = '''
echo "env={{ usage.environment }}"
echo "verbose={{ usage.verbose }}"
echo "tag count={{ usage.tags | length }}"
{% for tag in usage.tags %}
  echo "tag={{ tag }}"
{% endfor %}
'''
```

### 函数

#### Tera 内置函数

Tera 提供了许多[内置函数](https://keats.github.io/tera/docs/#built-in-functions)。
`[]` 表示可选的函数参数。
一些函数：

- `range(end, [start], [step_by])` - 返回一个使用所给参数创建的整数数组。
  - `end: usize`：在 `end` 之前停止，必填
  - `start: usize`：从哪里开始，默认为 `0`
  - `step_by: usize`：每次递增多少，默认为 `1`
- `now([timestamp], [utc])` - 返回本地日期时间字符串或时间戳整数。
  - `timestamp: bool`：是否返回时间戳而不是日期时间
  - `utc: bool`：是否返回 UTC 日期时间而不是本地时间
  - 提示：使用 date 过滤器来格式化日期字符串。
    例如，<span v-pre>`{{ now() | date(format="%Y") }}`</span> 获取当前年份。
- `throw(message)` - 抛出带有该消息的错误。
- `get_random(end, [start])` - 返回范围内的随机整数。
  - `end: usize`：范围的上限
  - `start: usize`：默认为 0
- `get_env(name, [default])`：按名称返回环境变量值。
  建议优先使用 `env` 变量而不是此函数。
  - `name: String`：环境变量的名称
  - `default: String`：当找不到环境变量时使用的默认值。
    当无法找到环境变量且未设置 `default` 时会抛出错误。

Tera 提供了更多函数。更多内容请参阅[Tera 文档](https://keats.github.io/tera/docs/#functions)。

#### 其他 Mise 函数

除了 tera 的内置函数外，Mise 还提供了许多有用的函数。

##### 通用函数

这些函数在所有任务中都可用，并且无论它们用于什么任务定义，其行为始终相同。换句话说，它们的返回值在不同任务定义之间是一致的。

- `exec(command) -> String` – 运行一个 shell 命令并将其输出作为字符串返回。
- `arch() -> String` – 获取系统架构，例如 `x64` 或 `arm64`。
- `os() -> String` – 返回操作系统名称，
  例如 linux、macos、windows。
- `os_family() -> String` – 返回操作系统家族，例如 `unix`、`windows`。
- `num_cpus() -> usize` – 获取系统可用的 CPU 数量。
- `choice(n, alphabet)` - 使用 `alphabet` 有放回随机抽样生成一个长度为 `n` 的字符串。例如，`choice(n=64, alphabet='0123456789abcdef')` 将生成一个随机的 64 字符小写十六进制字符串。
- `read_file(path) -> String` – 读取给定路径下文件的内容并以字符串形式返回。

##### 任务特定函数

这些函数是任务特定的，并且会根据所使用的任务而表现不同。换句话说，它们的返回值**_可能_**（但不保证）在任何给定 _任务_ 的多次执行之间保持一致，并且应当预期在不同任务定义之间不一致。

例如，`task_source_files()` 会根据调用它的任务的[`sources`](https://mise.en.dev/tasks/task-configuration.html#sources)返回不同的文件路径集合。

- <span id="task-source-files">`task_source_files() -> Vec<String>`</span> – 返回任务的[`sources`](https://mise.en.dev/tasks/task-configuration.html#sources)
  作为解析后的文件路径数组。此函数会处理任务 sources 中定义的 glob 模式和 Tera 模板字符串，
  将它们展开为实际文件路径。如果某个模式未匹配到任何文件，它将从结果中省略。如果未配置 sources，或
  没有文件匹配这些模式，则返回空数组。

#### 示例

```toml
# 使用 exec 获取命令输出
[alias.node.versions]
current = "{{ exec(command='node --version') }}"

# 使用 read_file 引入文件内容
[env]
VERSION = "{{ read_file(path='VERSION') | trim }}"

# 在任务脚本中访问已解析的源文件
[tasks.example]
sources = ["src/**/*.ts", "package.json"]
run = '''
{% for file in task_source_files() %}
  echo "Processing: {{ file }}"
{% endfor %}
'''
```

### Exec 选项

`exec` 函数支持以下选项：

- `command: String` – [必需] 要运行的命令。
- `cache_key: String` – 用于存储结果的缓存键。
  如果提供了缓存键，结果将被缓存并在后续调用中复用。
- `cache_duration: String` – 缓存结果的时长。
  时长单位可以是秒、分钟、小时、天或周。
  例如，`cache_duration="1d"` 将把结果缓存 1 天。

### 过滤器

Tera 提供了许多[内置过滤器](https://keats.github.io/tera/docs/#built-in-filters)。
`[]` 表示可选的过滤器参数。
一些过滤器：

- `str | lower -> String` – 将字符串转换为小写。
- `str | upper -> String` – 将字符串转换为大写。
- `str | capitalize -> String` – 将字符串转换为首字母大写，
  其余字符小写。
- `str | replace(from, to) -> String` – 将字符串中所有 `from` 替换为
  `to`。例如，<span v-pre>`{{ name | replace(from="Robert", to="Bob")}}`</span>
- `str | title -> String` – 将句子中的每个单词首字母大写。
  例如，<span v-pre>`{{ "foo bar" | title }}`</span> 变为 `Foo Bar`。
- `str | trim -> String` – 移除首尾空白字符。
- `str | trim_start -> String` – 移除前导空白字符。
- `str | trim_end -> String` – 移除尾随空白字符。
- `str | truncate -> String` – 将字符串截断为指定长度。
- `str | first -> String` – 返回数组或字符串中的第一个元素。
- `str | last -> String` – 返回数组或字符串中的最后一个元素。
- `str | join(sep) -> String` – 使用分隔符连接字符串数组，
  例如 <span v-pre>`{{ ["a", "b", "c"] | join(sep=", ") }}`</span>
  生成 `a, b, c`。
- `str | length -> usize` – 返回字符串或数组的长度。
- `str | reverse -> String` – 反转字符串中字符的顺序，或
  数组中元素的顺序。
- `str | urlencode -> String` – 对字符串进行编码，以便安全地用于 URL，
  将特殊字符转换为百分号编码值。
- `arr | map(attribute) -> Array` – 从数组中的每个对象提取一个属性。
- `arr | concat(with) -> Array` – 向数组追加值。
- `num | abs -> Number` – 返回数字的绝对值。
- `num | filesizeformat -> String` – 将整数转换为
  人类可读的文件大小（例如，110 MB）。
- `str | date(format) -> String` – 使用提供的格式将时间戳转换为
  格式化的日期字符串，例如 <span v-pre>`{{ ts | date(format="%Y-%m-%d") }}`</span>。
  时间格式列表可参考[`chrono` 文档](https://docs.rs/chrono/latest/chrono/format/strftime/index.html)。
- `str | split(pat) -> Array` – 按给定模式拆分字符串，并
  返回子字符串数组。
- `str | default(value) -> String` – 如果变量未定义或为空，
  则返回默认值。

Tera 提供了更多过滤器。更多内容请参阅 [tera 文档](https://keats.github.io/tera/docs/#built-in-filters)。

#### Hash

- `str | hash([algorithm], [len]) -> String` – 为输入字符串生成哈希。
  - `algorithm: "sha256" | "blake3"`：要使用的哈希算法（默认：`"sha256"`）
  - `len: usize`：将哈希字符串截断为给定长度
  - 示例：
    - <span v-pre>`{{ "foo" | hash }}`</span> – SHA256 哈希（默认）
    - <span v-pre>`{{ "foo" | hash(algorithm="blake3") }}`</span> – BLAKE3 哈希
    - <span v-pre>`{{ "foo" | hash(len=8) }}`</span> – 将 SHA256 哈希截断为 8 个字符
- `path | hash_file([len]) -> String` – 返回给定路径下文件的 BLAKE3 哈希值。
  - `len: usize`：将哈希字符串截断为给定长度

#### 路径操作

- `path | absolute -> String` – 将输入路径转换为
  绝对路径。不要求路径存在。
- `path | canonicalize -> String` – 将输入路径转换为
  绝对输入路径版本。如果路径不存在则抛出错误。
- `path | basename -> String` – 从路径中提取文件名，
  例如 `/foo/bar/baz.txt` 变为 `baz.txt`。
- `path | file_size -> String` – 返回文件的字节大小。
- `path | dirname -> String` – 返回文件的目录路径，
  例如 `/foo/bar/baz.txt` 变为 `/foo/bar`。
- `path | basename -> String` – 返回文件的基本名称，
  例如 `/foo/bar/baz.txt` 变为 `baz.txt`。
- `path | extname -> String` – 返回文件的扩展名，
  例如 `/foo/bar/baz.txt` 变为 `.txt`。
- `path | file_stem -> String` – 返回不含扩展名的文件名，
  例如 `/foo/bar/baz.txt` 变为 `baz`。
- `path | file_size -> String` – 返回文件的字节大小。
- `path | last_modified -> String` – 返回文件的最后修改时间。
- `path[] | join_path -> String` – 将路径数组连接为单一路径。

例如，你可以使用 `split()`、`concat()` 和 `join_path` 过滤器来
构造文件路径：

```toml
[env]
PROJECT_CONFIG = "{{ [config_root] | concat(with='bar.txt') | join_path }}"
```

#### 字符串操作

- `str | quote -> String` – 给字符串加引号。将 `'` 转换为 `\'`，然后
  为字符串加引号，例如 `'it\'s str'`。
- `str | kebabcase -> String` – 将字符串转换为 kebab-case
- `str | lowercamelcase -> String` – 将字符串转换为 lowerCamelCase
- `str | uppercamelcase -> String` – 将字符串转换为 UpperCamelCase
- `str | snakecase -> String` – 将字符串转换为 snake_case
- `str | shoutysnakecase -> String` – 将字符串转换为 SHOUTY_SNAKE_CASE

### 测试

Tera 提供了许多 [内置测试](https://keats.github.io/tera/docs/#built-in-tests)。
一些测试如下：

- `defined` - 如果给定变量已定义，则返回 `true`。
- `string` - 如果给定变量是字符串，则返回 `true`。
- `number` - 如果给定变量是数字，则返回 `true`。
- `starting_with` - 如果给定变量是字符串且以
  所给参数开头，则返回 `true`。
- `ending_with` - 如果给定变量是字符串且以
  所给参数结尾，则返回 `true`。
- `containing` - 如果给定变量包含所给参数，则返回 `true`。
- `matching` - 如果给定变量是字符串且与参数中的正则表达式
  匹配，则返回 `true`。

Tera 提供了更多测试。更多内容请参阅 [tera 文档](https://keats.github.io/tera/docs/#built-in-tests)。

Mise 提供了额外的测试：

- `if path is dir` – 检查提供的路径是否是一个目录。
- `if path is file` – 检查路径是否指向一个文件。
- `if path is exists` – 检查路径是否存在。

## .miserc.toml 中的模板支持 {#miserc-template-support}

`.miserc.toml` 文件支持 Tera 模板，但仅限于**受限上下文**。这是因为
`.miserc.toml` 加载得非常早——早于 `mise.toml`、Settings 和主配置被解析——因此只能使用操作系统级别可用的信息。

### 可用上下文

- `env: HashMap<String, String>` – 操作系统环境变量（与 `mise.toml` 中相同）
- `config_root: PathBuf` – 包含 `.miserc.toml` 文件的目录
- `cwd: PathBuf` – 当前工作目录
- `xdg_cache_home`, `xdg_config_home`, `xdg_data_home`, `xdg_state_home` – XDG 基础目录
- 所有 [函数](#functions)：`arch()`、`os()`、`os_family()`、`num_cpus()`、`choice()` 等
- 所有 [过滤器](#filters)：`absolute`、`dirname`、`basename`、`hash` 等

### 不可用内容

- `mise_env` – 这是 `.miserc.toml` 定义的内容；它不能引用自身
- `exec()` – 需要 Settings，但此时它们尚未加载
- `read_file()` – 未在早期初始化上下文中注册（在此阶段尚未设置按文件目录解析）
- `mise_bin`、`mise_pid` – 在此阶段没有意义

### miserc.toml 示例

<div v-pre>

```toml
# ~/.config/mise/miserc.toml

# 使用 $HOME 设置一个上限路径（在 home 目录处停止配置搜索）
ceiling_paths = ["{{ env.HOME }}"]

# 忽略一个相对于 home 的配置路径
ignored_config_paths = ["{{ env.HOME }}/shared"]
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
如果模板渲染失败（例如由于变量未定义），mise 会记录一条警告并回退到原始内容。
:::

::: warning
如果你的 `.miserc.toml` 值中包含字面量的 <span v-pre>`{{`</span>、`{%` 或 `{#` 字符
（并非用于模板），请将它们放入 `{% raw %}...{% endraw %}` 块中，以防止 Tera
将其解释为模板。
:::
