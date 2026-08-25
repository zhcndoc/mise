<!-- @由 usage-cli 根据用法规范生成 -->
# `mise bootstrap systemd 状态`

- **用法：** `mise bootstrap systemd status [-J --json] [--missing]`
- **效果：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果任何已配置的 systemd 用户服务不处于其期望状态，则以代码 1 退出
- **`-h --help`** — 输出帮助信息
