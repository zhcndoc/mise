---
description: "应用已配置的 Linux 用户和组"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap accounts apply`

- **用法：** `mise bootstrap accounts apply [-n --dry-run] [-y --yes]`
- **影响：** 具有破坏性 — 可能删除或不可逆地覆盖
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

应用已配置的 Linux 用户和组

## 标志
- **`-n --dry-run`** — 输出将发生的更改，但不进行任何更改
- **`-y --yes`** — 跳过确认提示
- **`-h --help`** — 输出帮助信息

<!-- 生成的参考文档导航 -->

## 相关文档

- [用户和组](/bootstrap/accounts.html)。
- [`mise bootstrap accounts <SUBCOMMAND>`](/cli/bootstrap/accounts.html)。
- [全局标志和参数语法](/cli/#global-flags)。
