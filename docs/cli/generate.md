<!-- 由 usage-cli 根据用法规范生成 -->
# `mise generate`

- **用法：** `mise generate <SUBCOMMAND>`
- **别名：** `gen`、`g`
- **效果：** 只读
- **源代码：** [`src/cli/generate/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/mod.rs)

为各种工具/服务生成文件。

## 标志
- **`-h --help`** — 打印帮助
- [`mise generate config [FLAGS] [PATH]`](/cli/generate/config.md)
- [`mise generate devcontainer [FLAGS]`](/cli/generate/devcontainer.md)
- [`mise generate git-pre-commit [FLAGS] [-- MISE_ARG]…`](/cli/generate/git-pre-commit.md)
- [`mise generate github-action [FLAGS]`](/cli/generate/github-action.md)
- [`mise generate install-script [FLAGS]`](/cli/generate/install-script.md)
- [`mise generate task-docs [FLAGS]`](/cli/generate/task-docs.md)
- [`mise generate task-stubs [FLAGS]`](/cli/generate/task-stubs.md)
- [`mise generate tool-stub [FLAGS] <OUTPUT>`](/cli/generate/tool-stub.md)
