---
description: "管理来自 `[bootstrap.compose]` 的 Docker Compose 项目"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap compose`

- **用法：** `mise bootstrap compose <SUBCOMMAND>`
- **效果：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理来自 `[bootstrap.compose]` 的 Docker Compose 项目

目标主机上需要可正常工作的 Docker 引擎和 Compose 命令。`apply` 使声明的项目状态保持一致；`status` 检查现有项目。

## 标志
- **`-h --help`** — 显示帮助

## 子命令

- [`mise bootstrap compose apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/compose/apply.html)
- [`mise bootstrap compose status [-J --json] [--missing]`](/cli/bootstrap/compose/status.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Compose 项目](/bootstrap/compose.html)。
- [`mise bootstrap [FLAGS] [SUBCOMMAND]`](/cli/bootstrap.html)。
- [全局标志和参数语法](/cli/#global-flags)。
