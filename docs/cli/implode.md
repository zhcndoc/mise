<!-- 由 usage-cli 根据用法规范生成 -->
# `mise implode`

- **用法**：`mise implode [-n --dry-run] [--config]`
- **效果**：破坏性操作 — 可能会删除或不可逆地覆盖数据
- **源代码**：[`src/cli/implode.rs`](https://github.com/jdx/mise/blob/main/src/cli/implode.rs)

移除 mise CLI 和所有相关数据

默认跳过配置目录。

## 标志

### `-n --dry-run`

列出将被移除但实际上不会移除的目录

### `--config`

同时移除配置目录。
