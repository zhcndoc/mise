---
description: "将由 nvm、nodenv 或 Homebrew 安装的 node 版本符号链接到 mise"
---

<!-- @generated 由 usage-cli 根据 usage spec 生成 -->
# `mise sync node`

- **用法：** `mise sync node [FLAGS]`
- **作用：** 修改状态
- **源代码：** [`src/cli/sync/node.rs`](https://github.com/jdx/mise/blob/main/src/cli/sync/node.rs)

将由 nvm、nodenv 或 Homebrew 安装的 node 版本符号链接到 mise

使用此命令可让 mise 使用由其他版本管理器安装的版本。

这不会覆盖由 mise 管理的安装、运行时别名或来自其他提供程序的链接。

## 选项
- **`--brew`** — 从 Homebrew 获取工具版本
- **`--nodenv`** — 从 nodenv 获取工具版本
- **`--nvm`** — 从 nvm 获取工具版本
- **`-h --help`** — 打印帮助

## 示例

```
brew install node@20
mise sync node --brew
mise use -g node@20 # uses Homebrew-provided node
```

<!-- 生成的参考导航 -->

## 相关文档

- [Node.js](/lang/node.html)。
- [`mise sync <SUBCOMMAND>`](/cli/sync.html)。
- [全局标志和参数语法](/cli/#global-flags)。
