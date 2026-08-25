<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap repos`

- **用法：** `mise bootstrap repos <SUBCOMMAND>`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

管理来自 `[bootstrap.repos]` 的 git 仓库检出。

## 标志
- **`-h --help`** — 打印帮助

## 子命令

- [`mise bootstrap repos apply [FLAGS]`](/cli/bootstrap/repos/apply.md)
- [`mise bootstrap repos exec [-c --continue-on-error] [-n --dry-run] [PATH]… <-- COMMAND>…`](/cli/bootstrap/repos/exec.md)
- [`mise bootstrap repos status [-J --json] [--missing]`](/cli/bootstrap/repos/status.md)
- [`mise bootstrap repos update [FLAGS] [PATH]…`](/cli/bootstrap/repos/update.md)
