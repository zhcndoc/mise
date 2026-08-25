<!-- @由 usage-cli 根据用法规范生成 -->
# `mise backends`

- **用法：** `mise backends <SUBCOMMAND>`
- **别名：** `b`、`backend`、`backend-list`
- **效果：** 只读
- **源代码：** [`src/cli/backends/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/backends/mod.rs)

管理后端。

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise backends ls`](/cli/backends/ls.md)

弃用：

`mise b` 别名已被弃用，并将在 mise 2027.4.0 中移除。  
请改用 `mise backends`。
