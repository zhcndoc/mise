<!-- @由 usage-cli 根据用法规范生成 -->
# `mise cache prune`

- **用法**: `mise cache prune [-v --verbose…] [--dry-run] [TOOL]…`
- **别名**: `p`
- **作用**: 修改状态
- **源代码**: [`src/cli/cache/prune.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/prune.rs)

移除过期的 mise 缓存文件

默认情况下，此命令会移除 30 天内未被访问的文件。
可通过 `MISE_CACHE_PRUNE_AGE` 环境变量进行更改。

## 参数

### `[TOOL]…`

用于清理缓存的工具，例如：node、python

## 标志

### `-v --verbose…`

显示将被清理的文件

### `--dry-run`

仅显示将要清理的内容。
