---
description: "管理来自 `[bootstrap.compose]` 的 Docker Compose 项目"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap compose`

- **用法：** `mise bootstrap compose <SUBCOMMAND>`
- **效果：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理来自 `[bootstrap.compose]` 的 Docker Compose 项目

Needs a running Docker engine and the Docker Compose command on this
machine.

## 标志
- **`-h --help`** — 显示帮助

## Examples

Show the state of every declared project

```
mise bootstrap compose status
```

Show what would change

```
mise bootstrap compose apply --dry-run
```

## Subcommands

- [`mise bootstrap compose apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/compose/apply.html)
- [`mise bootstrap compose status [-J --json] [--missing]`](/cli/bootstrap/compose/status.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Docker Compose projects](/bootstrap/compose.html).
- [`mise bootstrap [FLAGS] [SUBCOMMAND]`](/cli/bootstrap.html).
- [Global flags and argument syntax](/cli/#global-flags).
