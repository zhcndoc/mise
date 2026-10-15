---
description: "Remove files that `mise dot apply` deployed"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise dotfiles unapply`

- **用法：** `mise dotfiles unapply [FLAGS] [TARGET]…`
- **影响：** 破坏性操作——可能删除或不可逆地覆盖内容
- **源代码：** [`src/cli/dotfiles/unapply.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/unapply.rs)

Remove files that `mise dot apply` deployed

Removes the targets of whole-file entries and the blocks and lines that edit entries added, but only what mise can identify as its own. Modified copies, modified templates, and plain-line edits need `--force`. Merged keys, `absent` entries, and permissions-only targets are left alone. Sources and config entries are kept, so run this before you delete a declaration, while mise can still identify its targets.

With `--group`, removes only that dotfile group's files, using what mise recorded when it applied them, so it works even after the group is deselected or deleted from the config.

## 参数
- **`[TARGET]…`** —— 仅取消应用这些目标

## Flags
- **`-f --force`** — Remove modified or otherwise ambiguous managed files and lines
- **`-n --dry-run`** — Print the actions that would run without writing anything
- **`-y --yes`** — Skip the confirmation prompt
- **`--group <NAME>`** — Only unapply the files of this dotfile group, even one that is no longer selected or declared
- **`--prompt-secrets`** — Prompt for `[bootstrap.secrets]` values that templates need and the environment does not set
- **`-h --help`** — Print help

## 示例

Remove every target mise can identify

```
mise dot unapply
```

Remove one target

```
mise dot unapply ~/.zshrc
```

Remove one dotfile group's files

```
mise dot unapply --group work
```

Preview what would be removed

```
mise dot unapply --dry-run
```

Also remove modified targets, without prompting

```
mise dot unapply --force --yes
```

<!-- 生成的参考导航 -->

## 相关文档

- [Dotfiles](/dotfiles.html).
- [`mise dotfiles [--local] <SUBCOMMAND>`](/cli/dotfiles.html).
- [Global flags and argument syntax](/cli/#global-flags).
