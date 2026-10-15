---
description: "Apply Docker Compose projects from `[bootstrap.compose]`"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap compose apply`

- **用法：** `mise bootstrap compose apply [-n --dry-run] [-y --yes]`
- **效果：** 具有破坏性 — 可能会删除或不可逆地覆盖
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

Apply Docker Compose projects from `[bootstrap.compose]`

## Flags
- **`-n --dry-run`** — Show what would change without changing anything
- **`-y --yes`** — Skip the confirmation prompt
- **`-h --help`** — Print help

<!-- 生成的参考文档导航 -->

## 相关文档

- [Docker Compose projects](/bootstrap/compose.html).
- [`mise bootstrap compose <SUBCOMMAND>`](/cli/bootstrap/compose.html).
- [Global flags and argument syntax](/cli/#global-flags).
