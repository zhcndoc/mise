---
description: "将 Homebrew tap URL 添加到全局 `[bootstrap.brew.taps]`"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap packages brew tap`

- **Usage:** `mise bootstrap packages brew tap [FLAGS] <TAP> [URL]`
- **Effect:** modifies state
- **Source code:** [`src/cli/system/brew/tap.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/brew/tap.rs)

Add a Homebrew tap URL to the global `[bootstrap.brew.taps]`

## Arguments
- **`<TAP>`** — Tap name, e.g. `owner/repo`
- **`[URL]`** — GitHub URL of the tap; defaults to `https://github.com/<owner>/homebrew-<repo>.git`

## Flags
- **`-l --local`** — Write to the local config instead of the global config
- **`-n --dry-run`** — Show the config change without writing it
- **`-p --path <PATH>`** — Write to this config file or directory

  **别名：** `--file`
- **`-h --help`** — 输出帮助

## 示例

Record a tap whose repository is not acme/homebrew-tools

```
mise bootstrap packages brew tap acme/tools https://github.com/acme/brew-tools.git
```

Write the entry to the local config instead

```
mise bootstrap packages brew tap acme/tools https://github.com/acme/brew-tools.git --local
```

<!-- 生成的参考导航 -->

## 相关文档

- [Homebrew formulae and taps](/bootstrap/packages/brew.html#third-party-taps).
- [`mise bootstrap packages brew <SUBCOMMAND>`](/cli/bootstrap/packages/brew.html).
- [Global flags and argument syntax](/cli/#global-flags).
