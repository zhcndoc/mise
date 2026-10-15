---
description: "管理 `[bootstrap.services]` 中的服务"
---

<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap services`

- **用法：** `mise bootstrap services <SUBCOMMAND>`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理 `[bootstrap.services]` 中的服务

System-scope entries, the default for entries without `builtin`, start,
stop, enable, disable, or mask systemd units that already exist on Linux.
User-scope entries (`scope = "user"`, or any `builtin` service) define a
service for the current user on every platform: a systemd user unit on
Linux, a LaunchAgent on macOS, or a Scheduled Task on Windows. For options
that only one platform has, see `mise bootstrap linux systemd-units` and
`mise bootstrap macos launchd-agents`.

## 选项
- **`-h --help`** — 打印帮助

## Examples

Show the state of every declared service

```
mise bootstrap services status
```

Show what would change

```
mise bootstrap services apply --dry-run
```

Uninstall a user service

```
mise bootstrap services remove mise-history
```

## Subcommands

- [`mise bootstrap services apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/services/apply.html)
- [`mise bootstrap services remove [-n --dry-run] <NAME>`](/cli/bootstrap/services/remove.html)
- [`mise bootstrap services status [-J --json] [--missing]`](/cli/bootstrap/services/status.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Services](/bootstrap/services.html).
- [`mise bootstrap [FLAGS] [SUBCOMMAND]`](/cli/bootstrap.html).
- [Global flags and argument syntax](/cli/#global-flags).
