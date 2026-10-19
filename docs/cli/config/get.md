---
description: "从一个 mise TOML 文件中读取值"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise config get`

- **用法：** `mise config get [FLAGS] [KEY]`
- **效果：** 只读
- **源代码：** [`src/cli/config/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/config/get.rs)

Print a value from one mise TOML file

默认读取优先级最高的已加载 TOML 文件。使用 `--file`、`--global` 或 `--system` 选择其他文件。此命令读取存储的值，而不是合并或模板展开后的环境；如需获取解析后的环境，请使用 `mise env`

## Arguments
- **`[KEY]`** — Dotted key path to print, such as `tools.python`; omit to print the whole file

  名称中包含点的键需像 TOML 一样加引号，并将表达式放在 shell 引号中：`'tasks."build.sh"'`。不加引号时，如果不存在名为 `build` 的键，`tasks.build.sh` 仍会匹配 `build.sh` 任务。

## Flags
- **`-f --file <FILE>`** — Config file to read, or a directory whose config file to read

  对于目录，mise 会读取其中已有的 TOML 配置文件，例如 `.mise.toml`；如果没有，则读取 `mise.toml`。默认读取当前已加载且优先级最高的 TOML 文件，全局 override 文件除外。

  **Aliases:** `--path`
- **`-g --global`** — Read the global config file
- **`--system`** — Read the system config file
- **`--override`** — 读取全局 override 文件 `config.override.toml`
- **`-h --help`** — Print help

## 示例

Print the python request

```
mise config get tools.python
3.13
```

Print the whole file

```
mise config get
```

<!-- 生成的参考文档导航 -->

## 相关文档

- [配置](/configuration.html)。
- [`mise config [FLAGS] [SUBCOMMAND]`](/cli/config.html)。
- [全局标志和参数语法](/cli/#global-flags)。
