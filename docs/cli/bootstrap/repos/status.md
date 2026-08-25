<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap repos status`

- **用法：** `mise bootstrap repos status [-J --json] [--missing]`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果任何已配置的 repo 不处于其期望状态，则以代码 1 退出
- **`-h --help`** — 打印帮助信息
