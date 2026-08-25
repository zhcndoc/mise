<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap secrets status`

- **用法：** `mise bootstrap secrets status [-J --json] [--missing]`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

显示已声明的引导密钥输入是否可用

## Flags
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果声明的密钥输入不可用，则以代码 1 退出
- **`-h --help`** — 打印帮助信息
