<!-- 由 usage-cli 根据用法规范生成 -->
# `mise use`

- **用法**：`mise use [FLAGS] [TOOL@VERSION]…`
- **别名**：`u`
- **效果**：修改状态
- **源代码**：[`src/cli/use.rs`](https://github.com/jdx/mise/blob/main/src/cli/use.rs)

安装一个工具并将版本添加到 mise.toml 中。

如果尚未安装该工具版本，将会安装它。
默认情况下，将使用当前目录中的 `mise.toml` 文件。
如果存在多个配置文件（例如同时存在 `mise.toml` 和 `mise.local.toml`），
将使用优先级最低的文件（`mise.toml`）。
参见 <https://mise.jdx.dev/configuration.html#target-file-for-write-operations>

按以下顺序：
- 如果设置了 `--global`，将使用全局配置文件。
- 如果设置了 `--path`，将使用指定路径下的配置文件。
- 如果设置了 `--env`，将使用 `mise.<env>.toml`。
- 如果设置了 [`MISE_DEFAULT_CONFIG_FILENAME`](https://mise.jdx.dev/configuration.html#mise_default_config_filename)，将改用该文件。
- 如果设置了 `MISE_OVERRIDE_CONFIG_FILENAMES`，将使用列表中的第一个文件。
- 否则使用 `mise.toml`；如果当前工作目录是主目录，则使用全局配置文件。

使用 [`MISE_GLOBAL_CONFIG_FILE`](https://mise.jdx.dev/configuration.html#mise_global_config_file) 来选择其他全局配置路径。

使用 `--global` 标志来改用全局配置文件。

## 参数

### `[TOOL@VERSION]…`

要添加到配置文件中的工具

例如：node@20、cargo:ripgrep@latest、npm:prettier@3  
如果未指定版本，则默认为 @latest

工具选项可以使用以下语法设置：

```
mise use ubi:BurntSushi/ripgrep[exe=rg]
```

## 标志

### `-e --env <ENV>`

创建/修改一个特定于环境的配置文件，例如 .mise.&lt;env>.toml

### `-f --force`

即使已经安装，也强制重新安装

### `-g --global`

使用全局配置文件（`~/.config/mise/config.toml`），而不是本地配置文件

### `-j --jobs <JOBS>`

并行运行的任务数  
小于 1 的值将按 1 处理  
[默认值：4]

### `-n --dry-run`

执行一次试运行，显示将会安装和修改的内容，但不进行任何更改

### `-p --path <PATH>`

指定配置文件或目录的路径

如果指定的是目录，它会按照上面的规则在该目录中查找配置文件。

### `--dry-run-code`

与 --dry-run 类似，但如果有需要进行的更改，则以代码 1 退出

这对于脚本检查是否需要添加或移除工具很有用。

### `--fuzzy`

将模糊版本保存到配置文件

例如：`mise use --fuzzy node@20` 会将 20 保存为版本
这是默认行为，除非设置 `MISE_PIN=1`

### `--minimum-release-age <MINIMUM_RELEASE_AGE>`

只安装在此日期之前发布或比此持续时间更早的版本

支持像 "2024-06-01" 这样的绝对日期，以及像 "90d" 或 "1y" 这样的相对持续时间。

### `--pin`

将解析出的具体版本保存到配置文件

如果请求与可用版本完全匹配，则优先选择该版本，而不是已安装的模糊匹配版本。使用 `prefix:` 可显式请求递归前缀匹配。
例如：`mise use --pin node@20` 会保存解析出的 `20.x.y` 版本
设置 `MISE_PIN=1` 可使其成为默认行为

考虑使用 mise.lock 作为在 mise.toml 中固定版本的更好替代方案：
<https://mise.jdx.dev/configuration/settings.html#lockfile>

### `--raw`

将后端安装命令的 stdin/stdout/stderr 直接连接到终端，隐含 `--jobs=1`

### `--remove… <TOOL>`

从配置文件中移除该工具

示例：

```
# 不带参数运行以使用交互式选择器
$ mise use

# 将当前目录 mise.toml 中的 node 当前版本设置为 20.x
# 会写入模糊版本（例如：20）
$ mise use node@20

# 将 ~/.config/mise/config.toml 中的 node 当前版本设置为 20.x
# 会写入精确版本（例如：20.0.0）
$ mise use -g --pin node@20

# 设置 .mise.local.toml（其目的不是提交到项目中）
$ mise use --env local node@20

# 设置 .mise.staging.toml（当 MISE_ENV=staging 时使用）
$ mise use --env staging node@20
```
