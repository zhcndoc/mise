---
description: "管理 `[bootstrap.brew.taps]` 中的 Homebrew tap URL"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap packages brew`

- **用法：** `mise bootstrap packages brew <SUBCOMMAND>`
- **效果：** 只读
- **源代码：** [`src/cli/system/brew/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/brew/mod.rs)

Manage Homebrew tap URLs in `[bootstrap.brew.taps]`

mise finds a third-party tap such as `acme/tools` at
`https://github.com/acme/homebrew-tools` without an entry. Add one only
when the tap's repository lives at a different GitHub URL; only GitHub taps
are supported. These commands edit config; they do not run Homebrew.

Not available on Windows.

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap packages brew tap [FLAGS] <TAP> [URL]`](/cli/bootstrap/packages/brew/tap.html)
- [`mise bootstrap packages brew untap [FLAGS] <TAPS>…`](/cli/bootstrap/packages/brew/untap.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Homebrew formulae and taps](/bootstrap/packages/brew.html#third-party-taps).
- [`mise bootstrap packages <SUBCOMMAND>`](/cli/bootstrap/packages.html).
- [Global flags and argument syntax](/cli/#global-flags).
