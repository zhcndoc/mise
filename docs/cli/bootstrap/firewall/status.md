<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap firewall status`

- **用法：** `mise bootstrap firewall status [-J --json] [--missing]`
- **效果：** 只读
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

显示已配置的 Linux 主机防火墙状态

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 防火墙未收敛时以代码 1 退出
- **`-h --help`** — 打印帮助
