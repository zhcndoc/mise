<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap repos exec`

- **用法**: `mise bootstrap repos exec [-c --continue-on-error] [-n --dry-run] [PATH]… <-- COMMAND>…`
- **源代码**: [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

## 参数

### `[PATH]…`

仅在匹配的已配置或展开路径中运行

### `<-- COMMAND>…`

要在每个代码仓库中运行的命令及参数

## 标志

### `-c --continue-on-error`

命令失败后继续在其他仓库中运行

### `-n --dry-run`

打印将要运行的命令，但不实际运行它们
