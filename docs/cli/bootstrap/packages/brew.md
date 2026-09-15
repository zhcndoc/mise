---
description: "管理 bootstrap packages 使用的 Homebrew tap"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap packages brew`

- **用法：** `mise bootstrap packages brew <SUBCOMMAND>`
- **效果：** 只读
- **源代码：** [`src/cli/system/brew/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/brew/mod.rs)

管理 bootstrap packages 使用的 Homebrew tap

这些命令会编辑 `[bootstrap.brew.taps]`，以便已添加 tap 的 formula 和 cask
可以由 mise 直接获取，而无需安装 Homebrew。

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap packages brew tap [FLAGS] <TAP> [URL]`](/cli/bootstrap/packages/brew/tap.html)
- [`mise bootstrap packages brew untap [FLAGS] <TAPS>…`](/cli/bootstrap/packages/brew/untap.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Homebrew 软件包和 tap](/bootstrap/packages/brew.html)。
- [`mise bootstrap packages <SUBCOMMAND>`](/cli/bootstrap/packages.html)。
- [全局标志和参数语法](/cli/#global-flags)。
