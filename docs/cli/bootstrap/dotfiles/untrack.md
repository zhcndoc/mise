---
description: "停止跟踪文件或目录"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap dotfiles untrack`

- **用法：** `mise bootstrap dotfiles untrack <PATH>…`
- **作用：** 修改状态
- **源代码：** [`src/cli/dotfiles/untrack.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/untrack.rs)

停止跟踪文件或目录

移除 `[dotfiles]` 跟踪条目（或在 config.local.toml 中关闭继承的跟踪条目），并停止未来的捕获操作。文件本身及其现有检查点均保持原样。

## 参数
- **`<PATH>…`** — 要停止跟踪的路径

## 标志
- **`-h --help`** — 显示帮助

示例：

```
mise dot untrack ~/.zshrc
```

<!-- 生成的参考导航 -->

## 相关文档

- [Dotfile 所有权和模式](/dotfiles.html)。
- [`mise bootstrap dotfiles <SUBCOMMAND>`](/cli/bootstrap/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
