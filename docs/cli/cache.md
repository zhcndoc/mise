---
description: "管理 mise 缓存"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise cache`

- **用法：** `mise cache [SUBCOMMAND]`
- **效果：** 只读
- **源代码：** [`src/cli/cache/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/mod.rs)

管理 mise 缓存

运行 `mise cache` 时不带任何参数，可查看当前缓存目录。

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise cache clear [--task <TASK>] [TOOL]…`](/cli/cache/clear.html)
- [`mise cache path`](/cli/cache/path.html)
- [`mise cache prune [-v --verbose] [--dry-run] [TOOL]…`](/cli/cache/prune.html)
- [`mise cache task [-J --json] <TASK>`](/cli/cache/task.html)

<!-- 生成的参考导航 -->

## 相关文档

- [缓存行为](/cache-behavior.html)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
