---
description: "管理来自 `[bootstrap.mise_shell_activate]`"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap mise-shell-activate`

- **用法：** `mise bootstrap mise-shell-activate <SUBCOMMAND>`
- **别名：** `shell`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理来自 `[bootstrap.mise_shell_activate]` 的 mise shell 激活。

Writes a managed activation block into each configured shell startup file.
It does not activate mise in the shell you run it from; open a new shell
afterward.

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap mise-shell-activate apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/mise-shell-activate/apply.html)
- [`mise bootstrap mise-shell-activate status [-J --json] [--missing]`](/cli/bootstrap/mise-shell-activate/status.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Shell activation and login shell](/bootstrap/shell.html).
- [`mise bootstrap [FLAGS] [SUBCOMMAND]`](/cli/bootstrap.html).
- [Global flags and argument syntax](/cli/#global-flags).
