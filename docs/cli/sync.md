<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise sync`

- **用法**: `mise sync <SUBCOMMAND>`
- **效果**: 只读
- **源代码**: [`src/cli/sync/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/sync/mod.rs)

将来自其他版本管理器的工具与 mise 同步。

## 子命令

- [`mise sync node [FLAGS]`](/cli/sync/node.md)
- [`mise sync python [--pyenv] [--uv]`](/cli/sync/python.md)
- [`mise sync ruby [--brew]`](/cli/sync/ruby.md)
