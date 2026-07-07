<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap mise-shell-activate status`

- **用法**: `mise bootstrap mise-shell-activate status [-J --json] [--missing]`
- **源代码**: [`src/cli/bootstrap/mise_shell_activate/status.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap/mise_shell_activate/status.rs)

## 标志

### `-J --json`

以 JSON 格式输出

### `--missing`

如果任何已配置的 shell 激活未处于其期望状态，则以退出代码 1 退出
