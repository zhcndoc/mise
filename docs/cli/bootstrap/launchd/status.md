<!-- @由 usage-cli 根据用法规范生成 -->
# `mise bootstrap launchd 状态`

- **用法：** `mise bootstrap launchd status [-J --json] [--missing]`
- **作用：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果任何已配置的 LaunchAgent 未处于其所需状态，则以代码 1 退出
- **`-h --help`** — 打印帮助
