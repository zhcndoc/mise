---
description: "显示一个 mise TOML 文件中的值"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise config get`

- **用法：** `mise config get [FLAGS] [KEY]`
- **效果：** 只读
- **源代码：** [`src/cli/config/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/config/get.rs)

显示一个 mise TOML 文件中的值

默认读取优先级最高的已加载 TOML 文件。使用 `--file`、`--global` 或 `--system` 选择其他文件。此命令读取存储的值，而不是合并或模板展开后的环境；如需获取解析后的环境，请使用 `mise env`

## 参数
- **`[KEY]`** — 要显示的点分隔键路径，例如 `tools.python`；省略则打印整个文件

## 选项
- **`-f --file <FILE>`** — 要读取的 mise.toml 文件路径

  可以是文件路径或目录。如果提供的是目录，则使用该目录中的配置文件。

  如果未提供，则使用优先级最高的已加载 TOML 文件

  **别名：** `--path`
- **`-g --global`** — 读取全局配置文件。
- **`--system`** — 读取系统配置文件。
- **`-h --help`** — 显示帮助

## 示例

```
mise config get tools.python
3.12
```

<!-- 生成的参考文档导航 -->

## 相关文档

- [配置](/configuration.html)。
- [`mise config [FLAGS] [SUBCOMMAND]`](/cli/config.html)。
- [全局标志和参数语法](/cli/#global-flags)。
