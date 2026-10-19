---
description: "查阅不属于设置项的 MISE_* 环境变量：目录、日志、按工具覆盖版本及终端输出。"
socialDescription: "查阅非设置项的 MISE_* 环境变量：目录、日志和工具版本覆盖。"
---

# MISE\_\* 环境变量

除了 `write_targets` 表以外，每项[设置](/configuration/settings.html)也都对应一个 `MISE_*` 环境变量，列在设置页面对应条目中。例如，`MISE_JOBS=4` 会设置[`jobs`](/configuration/settings.html#jobs)。本页列出不属于设置项的环境变量，以及少数只适合通过环境变量使用的隐藏设置。

请在启动 mise 的环境中设置这些变量，例如 Shell 启动文件或 CI 作业。

## 目录 {#directories}

以下变量可分别更改 mise 的目录位置。[目录说明](/directories.html)列出了各目录的默认路径及其内容。

| 环境变量                 | 目录                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `MISE_CONFIG_DIR`        | [Global config](/directories.html#config-mise)                                       |
| `MISE_DATA_DIR`          | [Installed tools and plugins](/directories.html#local-share-mise)                    |
| `MISE_CACHE_DIR`         | [Cache](/directories.html#cache-mise)                                                |
| `MISE_STATE_DIR`         | [Local state](/directories.html#local-state-mise)                                    |
| `MISE_TMP_DIR`           | [Temporary files](/directories.html)                                                 |
| `MISE_SYSTEM_CONFIG_DIR` | [System config](/directories.html#system-config); `MISE_SYSTEM_DIR` is an older name |
| `MISE_INSTALLS_DIR`      | [Installed versions](/directories.html#local-share-mise-installs)                    |
| `MISE_INSTALL_STORE_DIR` | [Install store](/directories.html#local-share-mise-installs) for the identity layout |
| `MISE_PLUGINS_DIR`       | [Plugins](/directories.html#local-share-mise-plugins)                                |
| `MISE_DOWNLOADS_DIR`     | [Downloads](/directories.html#local-share-mise-downloads)                            |
| `MISE_SYSTEM_DATA_DIR`   | [System installs and shims](/directories.html#system-installs-and-shims)             |

## 配置文件 {#config-files}

### `MISE_<TOOL>_VERSION` {#mise-tool-version}

选择某个工具的版本，并覆盖能够读取该变量的命令所使用的所有配置文件：

```sh
MISE_NODE_VERSION=22 mise exec -- node --version
# v22.x.x
```

工具名称应使用大写，并将 `-` 替换为 `_`；例如 `ls-lint` 对应 `MISE_LS_LINT_VERSION`。多个版本之间用空格分隔。[`mise shell`](/cli/shell.html) 会为当前 Shell 会话设置此变量。可用版本格式请参阅[版本请求和版本文件](/dev-tools/versions.html)。

### `MISE_NO_CONFIG` {#mise-no-config}

设置为 `1` 可完全不加载配置文件，效果与 `--no-config` 标志相同。

### Settings for config files

mise 会在读取任何 `mise.toml` 前读取这些设置，因为它们会控制要加载的配置文件；`global_config_root` 还会决定全局配置的[配置根目录](/configuration.html#config-root)。其中一些只能通过环境变量设置；最后一列标明其他可用的设置位置。详见[只能在特定位置设置的选项](/configuration/settings.html#settings-with-restricted-locations)。

| 环境变量                                | 对应设置                                                                                                       | 其他可用位置                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `MISE_ENV`                              | [`env`](/configuration/settings.html#env), the [config environments](/configuration/environments.html) to load | [`.miserc.toml`](/configuration.html#miserc) and the `-E` flag |
| `MISE_AUTO_ENV`                         | [`auto_env`](/configuration/settings.html#auto_env)                                                            | `.miserc.toml`                                                 |
| `MISE_ENV_CONF_D`                       | [`env_conf_d`](/configuration/settings.html#env_conf_d)                                                        | `.miserc.toml`                                                 |
| `MISE_CEILING_PATHS`                    | [`ceiling_paths`](/configuration/settings.html#ceiling_paths)                                                  | `.miserc.toml`                                                 |
| `MISE_IGNORED_CONFIG_PATHS`             | [`ignored_config_paths`](/configuration/settings.html#ignored_config_paths)                                    | `.miserc.toml`                                                 |
| `MISE_OVERRIDE_CONFIG_FILENAMES`        | [`override_config_filenames`](/configuration/settings.html#override_config_filenames)                          | `.miserc.toml`                                                 |
| `MISE_OVERRIDE_TOOL_VERSIONS_FILENAMES` | [`override_tool_versions_filenames`](/configuration/settings.html#override_tool_versions_filenames)            | `.miserc.toml`                                                 |
| `MISE_GLOBAL_CONFIG_FILE`               | [`global_config_file`](/configuration/settings.html#global_config_file); `MISE_CONFIG_FILE` is an older name   | Nowhere else                                                   |
| `MISE_GLOBAL_CONFIG_ROOT`               | [`global_config_root`](/configuration/settings.html#global_config_root)                                        | Nowhere else                                                   |
| `MISE_SYSTEM_CONFIG_FILE`               | [`system_config_file`](/configuration/settings.html#system_config_file)                                        | Nowhere else                                                   |
| `MISE_DEFAULT_CONFIG_FILENAME`          | [`default_config_filename`](/configuration/settings.html#default_config_filename)                              | Nowhere else                                                   |
| `MISE_DEFAULT_TOOL_VERSIONS_FILENAME`   | [`default_tool_versions_filename`](/configuration/settings.html#default_tool_versions_filename)                | Nowhere else                                                   |

也可以在配置文件的 `[settings]` 下设置以下变量：

| 环境变量                    | 对应设置                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `MISE_TRUSTED_CONFIG_PATHS` | [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)，仅限全局或系统配置               |
| `MISE_ENV_FILE`             | [`env_file`](/configuration/settings.html#env_file)                                                          |
| `MISE_NO_ENV`               | [`no_env`](/configuration/settings.html#no_env)，等同于 `--no-env`                                          |
| `MISE_NO_HOOKS`             | [`no_hooks`](/configuration/settings.html#no_hooks)，等同于 `--no-hooks`                                    |

## 日志和输出 {#logging}

### `MISE_DEBUG` and `MISE_TRACE` {#mise-debug}

设置 `MISE_DEBUG=1` 可输出调试日志；设置 `MISE_TRACE=1` 可输出更详细的跟踪日志。它们分别等同于 `-v` 和 `-vv` 标志。报告问题时请使用这两个变量，而不要使用 `RUST_LOG`。

### `MISE_LOG_LEVEL` {#mise-log-level}

设置日志级别：`trace`、`debug`、`info`（默认值）、`warn` 或 `error`。[`MISE_QUIET=1`](/configuration/settings.html#quiet) 也会将级别设为 `error`，并隐藏任务标题和进度信息。隐藏的 `--log-level` 标志接受相同的级别。

### `MISE_LOG_FILE` {#mise-log-file}

还会将日志追加写入此文件；必要时会创建其所在目录：

```sh
MISE_LOG_FILE=~/mise.log mise install
```

### `MISE_LOG_FILE_LEVEL` {#mise-log-file-level}

设置日志文件的级别，这样可以保留详细日志而不让终端输出过多内容。可用值与 `MISE_LOG_LEVEL` 相同，默认继承终端日志级别。

### `MISE_LOG_HTTP` {#mise-log-http}

设置为 `1` 可打印 mise 应用 [URL 替换](/url-replacements.html)后发送的每个 HTTP 请求及其响应状态：

```text
GET https://mise-versions.jdx.dev/data/jq.toml 200 OK
```

### `MISE_LOG_VERBOSE_DEPS` {#mise-log-verbose-deps}

对于 `h2`、`hyper`、`reqwest` 和 `rustls` 等日志过多的库，mise 默认会丢弃其调试和跟踪日志，因为这些库会记录每个 HTTP/2 帧或套接字读取操作。设置为 `1` 可显示这些日志；即使启用了 `MISE_TRACE=1` 或 `-vv`，也必须通过此变量才能看到它们。

### `MISE_TIMINGS` {#mise-timings}

设置为 `1` 可打印命令每个步骤的耗时；设置为 `2` 可显示更详细的分解信息和累计耗时。如何分析提示符变慢的问题，请参阅[故障排除](/troubleshooting.html#slow-shell-prompts)。

### `MISE_FRIENDLY_ERROR` {#mise-friendly-error}

除非启用了调试日志，否则 mise 会输出简短的错误信息。设置为 `0` 可打印完整错误报告，包括原因链和源代码位置；设置为 `1` 则即使启用调试日志也保留简短信息。

### `MISE_TERM_WIDTH` {#mise-term-width}

设置 mise 在表格和列表（如 `mise ls`）中使用的终端宽度。未设置时，mise 会先读取 `COLUMNS`，再使用检测到的宽度。在 CI 等非交互环境中，如果检测结果不正确（例如 CircleCI 报告宽度为 `0`），请设置此变量。该值会原样使用，因此也可以强制采用更窄的宽度：

```sh
MISE_TERM_WIDTH=120 mise ls
```

### 输出相关设置

| 环境变量       | 对应设置                                          |
| -------------- | ------------------------------------------------- |
| `MISE_QUIET`   | [`quiet`](/configuration/settings.html#quiet)     |
| `MISE_VERBOSE` | [`verbose`](/configuration/settings.html#verbose) |
| `MISE_COLOR`   | [`color`](/configuration/settings.html#color)     |
| `MISE_RAW`     | [`raw`](/configuration/settings.html#raw)         |
| `MISE_YES`     | [`yes`](/configuration/settings.html#yes)         |

## Shell {#shells}

### `MISE_FISH_AUTO_ACTIVATE` {#mise-fish-auto-activate}

Homebrew 和其他软件包会安装 fish 的 `vendor_conf.d` 脚本，以自动激活 mise。设置为 `0` 可关闭此功能：

```fish
set -Ux MISE_FISH_AUTO_ACTIVATE 0
```

详见 [Shell 设置](/shell-setup.html#fish)。

## 网络 {#networking}

### `MISE_LIST_ALL_VERSIONS` {#mise-list-all-versions}

设置为 `1` 可读取仓库中 GitHub、GitLab 或 Forgejo 的所有发行版或标签页面，而不提前停止。此设置适用于从这些代码托管平台获取版本列表的所有后端和核心工具，例如 github、aqua 后端和 Go。`mise ls-remote` 缺少较旧发行版时可启用此项；代价是列表加载更慢，API 请求也会更多。

### 令牌

`MISE_GITHUB_TOKEN`、`MISE_GITLAB_TOKEN`、`MISE_FORGEJO_TOKEN` 和其他令牌变量的说明请参阅[GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。

### 网络相关设置

| 环境变量                | 对应设置                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| `MISE_OFFLINE`          | [`offline`](/configuration/settings.html#offline)                   |
| `MISE_PREFER_OFFLINE`   | [`prefer_offline`](/configuration/settings.html#prefer_offline)     |
| `MISE_HTTP_TIMEOUT`     | [`http_timeout`](/configuration/settings.html#http_timeout)         |
| `MISE_URL_REPLACEMENTS` | [`url_replacements`](/configuration/settings.html#url_replacements) |

## mise 设置的变量

mise 也会为它运行的命令设置环境变量，例如 `MISE_ENV` 以及任务中的 `MISE_TASK_*` 变量。详见[任务环境](/tasks/running-tasks.html#task-environment)和[钩子](/hooks.html)。
