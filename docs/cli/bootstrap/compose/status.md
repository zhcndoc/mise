<!-- 由 usage-cli 根据使用规范生成 -->
# `mise bootstrap compose status`

- **用法**：`mise bootstrap compose status [-J --json] [--missing]`
- **作用**：只读
- **源代码**：[`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

显示已配置的 Docker Compose 项目状态

## 选项

### `-J --json`

以 JSON 格式输出

### `--missing`

当任何 Compose 项目未达到收敛状态时，以代码 1 退出
