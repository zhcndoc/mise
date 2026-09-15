---
description: "将一个 Homebrew tap URL 添加到 [bootstrap.brew.taps]"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap packages brew tap`

- **用法：** `mise bootstrap packages brew tap [FLAGS] <TAP> [URL]`
- **作用：**修改状态
- **源代码：**[`src/cli/system/brew/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/brew/mod.rs)

将一个 Homebrew tap URL 添加到 [bootstrap.brew.taps]。

## 参数
- **`<TAP>`** — Tap 名称，例如 `owner/repo`
- **`[URL]`** — Tap 的仓库 URL；默认为 GitHub 的 owner/homebrew-repo.git 命名格式

## 选项
- **`-l --local`** — 写入本地配置，而不是全局配置
- **`-n --dry-run`** — 输出配置变更，但不写入
- **`-p --path <PATH>`** — 写入此配置文件或目录

  **别名：** `--file`
- **`-h --help`** — 输出帮助

## 示例

```
mise bootstrap packages brew tap railwaycat/emacsmacport
mise bootstrap packages brew tap acme/tools https://github.com/acme/homebrew-tools.git
```

<!-- 生成的参考导航 -->

## 相关文档

- [Homebrew packages and taps](/bootstrap/packages/brew.html)。
- [`mise bootstrap packages brew <SUBCOMMAND>`](/cli/bootstrap/packages/brew.html)。
- [全局标志和参数语法](/cli/#global-flags)。
