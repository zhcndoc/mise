---
description: "为工具/后端添加或更新别名"
---

<!-- 由 usage-cli 生成 -->
# `mise tool-alias set`

- **用法：** `mise tool-alias set <ARGS>…`
- **别名：** `add`、`create`
- **效果：** 修改状态
- **源代码：** [`src/cli/tool_alias/set.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool_alias/set.rs)

为工具/后端添加或更新别名

这会修改 `~/.config/mise/config.toml` 的内容

## 参数
- **`<TOOL>`** — 要为其设置别名的工具/后端
- **`<ALIAS>`** — 要设置的别名
- **`[VALUE]`** — 要为别名设置的值

## 标志
- **`-h --help`** — 打印帮助

## 示例

```
mise tool-alias set ripgrep aqua:BurntSushi/ripgrep
mise tool-alias set node project 20
```

<!-- 生成的参考导航 -->

## 相关文档

- [工具版本别名](/dev-tools/aliases.html)。
- [`mise tool-alias [-p --tool <TOOL>] [--no-header] [SUBCOMMAND]`](/cli/tool-alias.html)。
- [全局标志和参数语法](/cli/#global-flags)。
