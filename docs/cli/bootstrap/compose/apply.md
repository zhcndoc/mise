<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap compose apply`

- **用法**：`mise bootstrap compose apply [-n --dry-run] [-y --yes]`
- **影响**：具有破坏性 — 可能会删除或不可逆地覆盖
- **源代码**：[`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

应用配置的 Docker Compose 项目状态

## 标志

### `-n --dry-run`

打印将要发生的更改，但不进行任何更改

### `-y --yes`

跳过确认提示
