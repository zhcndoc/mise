<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise cache`

- **Usage:** `mise cache <SUBCOMMAND>`
- **Effect:** 只读
- **Source code:** [`src/cli/cache/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/mod.rs)

管理 mise 缓存

运行 `mise cache` 时不带任何参数，可查看当前缓存目录。

## Flags
- **`-h --help`** — 打印帮助

## Subcommands

- [`mise cache clear [--task <TASK>] [TOOL]…`](/cli/cache/clear.md)
- [`mise cache path`](/cli/cache/path.md)
- [`mise cache prune [-v --verbose] [--dry-run] [TOOL]…`](/cli/cache/prune.md)
- [`mise cache task [-J --json] <TASK>`](/cli/cache/task.md)
