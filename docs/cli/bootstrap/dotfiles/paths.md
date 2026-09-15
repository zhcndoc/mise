---
description: "显示历史记录跟踪的内容以及所遵循的策略"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap dotfiles paths`

- **用法：** `mise bootstrap dotfiles paths [FLAGS]`
- **作用：** 只读
- **源代码：** [`src/cli/dotfiles/paths.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/paths.rs)

显示历史记录跟踪的内容以及所遵循的策略

每个条目都会列出声明它的文件、相应的策略，以及当前涵盖的文件数量。历史记录无法遵循的声明会被列为无效、已省略或不完整，因此失败的登记不会被误认为已受到保护。

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--preview <PATH>`** — 显示跟踪此路径时将捕获的内容
- **`--noisy`** — 列出监视器发现持续发生变化的路径
- **`-h --help`** — 打印帮助

<!-- 生成的参考导航 -->

## 相关文档

- [点文件的所有权和模式](/dotfiles.html)。
- [`mise bootstrap dotfiles <SUBCOMMAND>`](/cli/bootstrap/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
