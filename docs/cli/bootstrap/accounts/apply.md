---
description: "Create, update, or remove the configured Linux users and groups"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap accounts apply`

- **用法：** `mise bootstrap accounts apply [-n --dry-run] [-y --yes]`
- **影响：** 具有破坏性 — 可能删除或不可逆地覆盖
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

Create, update, or remove the configured Linux users and groups

## Flags
- **`-n --dry-run`** — Show what would change without changing anything
- **`-y --yes`** — Skip the confirmation prompt
- **`-h --help`** — Print help

<!-- 生成的参考文档导航 -->

## 相关文档

- [Linux users and groups](/bootstrap/accounts.html).
- [`mise bootstrap accounts <SUBCOMMAND>`](/cli/bootstrap/accounts.html).
- [Global flags and argument syntax](/cli/#global-flags).
