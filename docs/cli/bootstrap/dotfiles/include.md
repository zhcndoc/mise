---
description: "再次捕获与 glob 匹配的路径"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap dotfiles include`

- **用法：** `mise bootstrap dotfiles include <GLOB>`
- **效果：** 修改状态
- **源代码：** [`src/cli/dotfiles/exclude.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/exclude.rs)

再次捕获与 glob 匹配的路径

从全局配置中的 `[history] exclude` 移除该 glob。

## 参数
- **`<GLOB>`** — 由 `exclude` 指定的 glob

## 标志
- **`-h --help`** — 打印帮助

<!-- 生成的参考导航 -->

## 相关文档

- [点文件所有权和模式](/dotfiles.html)。
- [`mise bootstrap dotfiles <SUBCOMMAND>`](/cli/bootstrap/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
