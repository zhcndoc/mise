---
description: "将由 nvm、nodenv 或 Homebrew 安装的 node 版本符号链接到 mise"
---

<!-- @generated 由 usage-cli 根据 usage spec 生成 -->
# `mise sync node`

- **用法：** `mise sync node [FLAGS]`
- **作用：** 修改状态
- **源代码：** [`src/cli/sync/node.rs`](https://github.com/jdx/mise/blob/main/src/cli/sync/node.rs)

将由 nvm、nodenv 或 Homebrew 安装的 node 版本符号链接到 mise

Use this to make versions installed by another version manager available to
mise. It does not overwrite managed installs, runtime aliases, or links from
other providers. Pass one or more of --brew, --nodenv, and --nvm.

## 选项
- **`--brew`** — 从 Homebrew 获取工具版本
- **`--nodenv`** — 从 nodenv 获取工具版本
- **`--nvm`** — 从 nvm 获取工具版本
- **`-h --help`** — 打印帮助

## 示例

Use the node that Homebrew installed

```
brew install node@24
mise sync node --brew
mise use -g node@24
```

<!-- 生成的参考导航 -->

## 相关文档

- [Node.js](/lang/node.html#migrating-from-nvm-nodenv-or-homebrew).
- [`mise sync <SUBCOMMAND>`](/cli/sync.html).
- [Global flags and argument syntax](/cli/#global-flags).
