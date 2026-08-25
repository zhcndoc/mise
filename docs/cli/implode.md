<!-- 由 usage-cli 根据用法规范生成 -->
# `mise implode`

- **用法：** `mise implode [-n --dry-run] [--config]`
- **效果：** 具有破坏性 — 可能删除或不可逆地覆盖
- **源代码：** [`src/cli/implode.rs`](https://github.com/jdx/mise/blob/main/src/cli/implode.rs)

移除 mise CLI 和所有相关数据

默认跳过配置目录。

## 选项
- **`-n --dry-run`** — 列出将被移除的目录，但不实际移除它们
- **`--config`** — 同时移除配置目录
- **`-h --help`** — 打印帮助信息
