<!-- 由 usage-cli 根据使用规范生成 -->
# `mise bootstrap compose status`

- **Usage:** `mise bootstrap compose status [-J --json] [--missing]`
- **Effect:** 只读
- **Source code:** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

显示已配置的 Docker Compose 项目状态

## Flags
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 当任一 Compose 项目未达到收敛状态时以代码 1 退出
- **`-h --help`** — 打印帮助信息
