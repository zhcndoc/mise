---
description: "恢复中断的点文件操作"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise dotfiles recover`

- **用法：** `mise dotfiles recover [--keep-current] [-y --yes] [OPERATION]`
- **效果：** 具有破坏性——可能删除或不可逆地覆盖内容
- **源代码：** [`src/cli/dotfiles/recover.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/recover.rs)

恢复中断的点文件操作

在不覆盖后续编辑的情况下重试安全恢复。如果恢复无法确定哪些内容是安全的，请先检查列出的文件。`--keep-current` 会明确接受这些文件的当前内容，并仅丢弃所选操作的临时恢复副本；它不会删除 Git 历史记录。

## 参数
- **`[OPERATION]`** — 待处理的数字 ID 或无歧义的操作 UUID 前缀

## 标志
- **`--keep-current`** — 接受当前文件，而不是恢复临时恢复副本
- **`-y --yes`** — 确认丢弃所选操作的临时恢复副本
- **`-h --help`** — 显示帮助

<!-- 生成的参考导航 -->

## 相关文档

- [入门](/getting-started.html)。
- [`mise dotfiles <SUBCOMMAND>`](/cli/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
