<!-- @由 usage-cli 根据用法规范生成 -->
# `mise tool-alias`

- **用法：** `mise tool-alias [-p --tool <TOOL>] [--no-header] <SUBCOMMAND>`
- **别名：** `alias`、`aliases`
- **效果：** 只读
- **源代码：** [`src/cli/tool_alias/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool_alias/mod.rs)

管理工具版本别名。

## 标志
- **`-p --tool <TOOL>`** — 按工具筛选别名
- **`--no-header`** — 不显示表头
- **`-h --help`** — 打印帮助

## 子命令

- [`mise tool-alias get <TOOL> <ALIAS>`](/cli/tool-alias/get.md)
- [`mise tool-alias ls [--no-header] [TOOL]`](/cli/tool-alias/ls.md)
- [`mise tool-alias set <ARGS>…`](/cli/tool-alias/set.md)
- [`mise tool-alias unset <TOOL> [ALIAS]`](/cli/tool-alias/unset.md)
