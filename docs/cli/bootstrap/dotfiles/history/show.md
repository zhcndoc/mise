---
description: "显示一个检查点：触发原因、变更内容及其日志"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap dotfiles history show`

- **用法：** `mise bootstrap dotfiles history show [FLAGS] [REF]`
- **效果：** 只读
- **源代码：** [`src/cli/dotfiles/history/show.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/history/show.rs)

显示一个检查点：触发原因、变更内容及其日志

## 参数
- **`[REF]`** — 数字检查点 ID、`latest`（默认值）、`latest~N` 或 `commit:<sha>`

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--files`** — 列出快照中的每个文件
- **`--path <PATH>`** — 在此路径发生变更的检查点中解析 `latest~N`
- **`-h --help`** — 打印帮助

<!-- 生成的参考导航 -->

## 相关文档

- [Dotfile 所有权和模式](/dotfiles.html)。
- [`mise bootstrap dotfiles history [FLAGS] [SUBCOMMAND]`](/cli/bootstrap/dotfiles/history.html)。
- [全局标志和参数语法](/cli/#global-flags)。
