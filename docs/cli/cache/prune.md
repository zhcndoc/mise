<!-- @由 usage-cli 根据用法规范生成 -->
# `mise cache prune`

- **Usage:** `mise cache prune [-v --verbose] [--dry-run] [TOOL]…`
- **Aliases:** `p`
- **Effect:** modifies state
- **Source code:** [`src/cli/cache/prune.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/prune.rs)

移除过期的 mise 缓存文件

默认情况下，此命令会移除 30 天内未被访问的文件。
可通过 `MISE_CACHE_PRUNE_AGE` 环境变量进行更改。

## 参数
- **`[TOOL]…`** — 要清理缓存的工具，例如：node、python

## 标志
- **`-v --verbose`** — 显示已清理的文件
- **`--dry-run`** — 仅显示将要清理的内容
- **`-h --help`** — 打印帮助
