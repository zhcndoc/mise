---
description: "Manage tool backend and version aliases"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise tool-alias`

- **用法：** `mise tool-alias [-p --tool <TOOL>] [--no-header] [SUBCOMMAND]`
- **别名：** `alias`、`aliases`
- **作用：** 只读
- **源代码：** [`src/cli/tool_alias/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool_alias/mod.rs)

Manage tool backend and version aliases

A backend alias makes a tool name install from another backend:
`[tool_alias] ripgrep = "aqua:BurntSushi/ripgrep"`. A version alias names a
version request: `[tool_alias.node.versions] project = "20"` lets you write
`node@project`.

With no subcommand, lists version aliases (same as `mise tool-alias ls`; the
flags below are passed to it). See <https://mise.jdx.dev/dev-tools/aliases.html>

## Flags
- **`-p --tool <TOOL>`** — Filter aliases by tool
- **`--no-header`** — Do not print the table header
- **`-h --help`** — Print help

## 子命令

- [`mise tool-alias get <TOOL> <ALIAS>`](/cli/tool-alias/get.html)
- [`mise tool-alias ls [--no-header] [TOOL]`](/cli/tool-alias/ls.html)
- [`mise tool-alias set <ARGS>…`](/cli/tool-alias/set.html)
- [`mise tool-alias unset <TOOL> [ALIAS]`](/cli/tool-alias/unset.html)

<!-- 生成的参考导航 -->

## 相关文档

- [工具版本别名](/dev-tools/aliases.html)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
