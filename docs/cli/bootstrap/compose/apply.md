---
description: "应用配置的 Docker Compose 项目状态"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap compose apply`

- **用法：** `mise bootstrap compose apply [-n --dry-run] [-y --yes]`
- **效果：** 具有破坏性 — 可能会删除或不可逆地覆盖
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

应用配置的 Docker Compose 项目状态

## Flags
- **`-n --dry-run`** — 打印将要发生的更改，但不进行任何更改
- **`-y --yes`** — 跳过确认提示
- **`-h --help`** — 打印帮助

<!-- 生成的参考文档导航 -->

## 相关文档

- [Compose 项目](/bootstrap/compose.html)。
- [`mise bootstrap compose <SUBCOMMAND>`](/cli/bootstrap/compose.html)。
- [全局标志和参数语法](/cli/#global-flags)。
