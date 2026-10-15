---
description: "显示工具的可执行文件解析到的路径"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise which`

- **用法：** `mise which [FLAGS] [BIN_NAME]`
- **效果：** 只读
- **源代码：** [`src/cli/which.rs`](https://github.com/jdx/mise/blob/main/src/cli/which.rs)

显示工具的可执行文件解析到的路径

Prints the real path of the executable mise would run for BIN_NAME in the
current directory, bypassing shims. Use `--version` or `--plugin` to see
which tool version provides it.

## 参数
- **`[BIN_NAME]`** — 要查找的可执行文件

## Flags
- **`-t --tool <TOOL@VERSION>`** — Look in a specific tool version, such as `mise which npm --tool=node@20`
- **`--plugin`** — Show the name of the tool that provides the executable
- **`--version`** — Show the version instead of the path
- **`-h --help`** — Print help

## 示例

Show the path of the node executable

```
mise which node
~/.local/share/mise/installs/node/20.0.0/bin/node
```

Show the tool that provides it

```
mise which node --plugin
node
```

Show the version that provides it

```
mise which node --version
20.0.0
```

<!-- 生成的参考导航 -->

## 相关文档

- [Shim 和可执行文件查找](/dev-tools/shims.html)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
