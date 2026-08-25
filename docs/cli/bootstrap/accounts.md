<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap accounts`

- **用法：** `mise bootstrap accounts <SUBCOMMAND>`
- **效果：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

从 `[bootstrap.users]` 和 `[bootstrap.groups]` 管理 Linux 用户和组

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap accounts apply [-n --dry-run] [-y --yes]`](/cli/bootstrap/accounts/apply.md)
- [`mise bootstrap accounts status [-J --json] [--missing]`](/cli/bootstrap/accounts/status.md)
