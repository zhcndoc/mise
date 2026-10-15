---
description: "恢复中断的点文件操作"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise dotfiles recover`

- **用法：** `mise dotfiles recover [--keep-current] [-y --yes] [OPERATION]`
- **效果：** 具有破坏性——可能删除或不可逆地覆盖内容
- **源代码：** [`src/cli/dotfiles/recover.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/recover.rs)

恢复中断的点文件操作

Finishes recovering from an operation that was interrupted, for example by a crash or Ctrl-C. With no argument, recovers every interrupted operation. mise restores files from the operation's recovery copies unless you have edited them since. When it cannot tell which version is safe, it lists the files: check them, then rerun with `--keep-current` to keep what is on disk and discard the operation's recovery copies. When several operations were interrupted, `--keep-current` needs the ID of one. Git history is not changed.

## Arguments
- **`[OPERATION]`** — The operation's checkpoint ID (see `mise dot history --pending`) or a unique prefix of its UUID

## Flags
- **`--keep-current`** — Keep the files on disk instead of restoring the recovery copies
- **`-y --yes`** — Discard the operation's recovery copies without prompting
- **`-h --help`** — Print help

## Examples

Recover every interrupted operation

```
mise dot recover
```

Keep the files on disk for operation 42

```
mise dot recover 42 --keep-current --yes
```

<!-- generated reference navigation -->

## 相关文档

- [Dotfiles history](/dotfiles/history.html).
- [`mise dotfiles [--local] <SUBCOMMAND>`](/cli/dotfiles.html).
- [Global flags and argument syntax](/cli/#global-flags).
