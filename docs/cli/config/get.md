---
description: "Print a value from one mise TOML file"
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

## Flags
- **`-f --file <FILE>`** — Config file to read, or a directory whose config file to read

  For a directory, mise reads the TOML config file already there, such as `.mise.toml`, or `mise.toml` when there is none. Defaults to the highest-precedence loaded TOML file.

  **Aliases:** `--path`
- **`-g --global`** — Read the global config file
- **`--system`** — Read the system config file
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
