---
description: "在全局配置中设置后端别名或版本别名"
---

<!-- 由 usage-cli 生成 -->
# `mise tool-alias set`

- **用法：** `mise tool-alias set <ARGS>…`
- **别名：** `add`、`create`
- **效果：** 修改状态
- **源代码：** [`src/cli/tool_alias/set.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool_alias/set.rs)

Set a backend alias or a version alias in the global config

`mise tool-alias set TOOL BACKEND` makes TOOL install from BACKEND, written as
`[tool_alias] TOOL = "BACKEND"`. `mise tool-alias set TOOL ALIAS VERSION` makes
`TOOL@ALIAS` mean VERSION, written under `[tool_alias.TOOL.versions]`. Writes
the global config (~/.config/mise/config.toml by default); add aliases to a
project's mise.toml to share them.

## Arguments
- **`<TOOL>`** — The tool to alias
- **`<ALIAS>`** — The version alias to set, or the backend when VALUE is omitted
- **`[VALUE]`** — The version request the alias stands for

## 标志
- **`-h --help`** — 打印帮助

## 示例

Install ripgrep from its aqua backend

```
mise tool-alias set ripgrep aqua:BurntSushi/ripgrep
```

Make node@project mean node@20

```
mise tool-alias set node project 20
```

<!-- 生成的参考导航 -->

## 相关文档

- [工具版本别名](/dev-tools/aliases.html)。
- [`mise tool-alias [-p --tool <TOOL>] [--no-header] [SUBCOMMAND]`](/cli/tool-alias.html)。
- [全局标志和参数语法](/cli/#global-flags)。
