---
description: "列出 shell 别名"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise shell-alias ls`

- **用法：** `mise shell-alias ls [--no-header]`
- **别名：** `list`
- **效果：** 只读
- **源代码：** [`src/cli/shell_alias/ls.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell_alias/ls.rs)

列出 shell 别名

Lists the shell aliases configured for the current directory: the
`[shell_alias]` entries of every config file mise loads here.

## Flags
- **`--no-header`** — Do not print the table header
- **`-h --help`** — Print help

## 示例

List the aliases set in this directory

```
mise shell-alias ls
alias    command
ll       ls -la
gs       git status
```

<!-- 生成的参考文档导航 -->

## 相关文档

- [Shell 别名](/shell-aliases.html)。
- [`mise shell-alias [--no-header] [SUBCOMMAND]`](/cli/shell-alias.html)。
- [全局标志和参数语法](/cli/#global-flags)。
