---
description: "管理 `[bootstrap.services]` 中的服务"
---

<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap services`

- **用法：** `mise bootstrap services <SUBCOMMAND>`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理 `[bootstrap.services]` 中的服务

系统范围的条目（默认）会使现有的 Linux systemd 系统单元达到一致状态。`scope = "user"` 条目是 mise 为当前用户定义的服务，支持所有平台：Linux 上的 systemd 用户单元、macOS 上的 LaunchAgent、Windows 上的计划任务。

## 选项
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap services apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/services/apply.html)
- [`mise bootstrap services remove [-n --dry-run] <NAME>`](/cli/bootstrap/services/remove.html)
- [`mise bootstrap services status [-J --json] [--missing]`](/cli/bootstrap/services/status.html)

<!-- 生成的参考导航 -->

## 相关文档

- [系统服务](/bootstrap/services.html)。
- [`mise bootstrap [FLAGS] [SUBCOMMAND]`](/cli/bootstrap.html)。
- [全局标志和参数语法](/cli/#global-flags)。
