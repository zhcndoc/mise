---
description: "[experimental] Stop project daemons"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise daemons stop`

- **用法：** `mise daemons stop [ARGS]…`
- **源代码：** [`src/cli/daemons.rs`](https://github.com/jdx/mise/blob/main/src/cli/daemons.rs)

[experimental] Stop project daemons

With no names, stops every daemon the project has registered, including daemons a removed group started. Data is kept. Select daemons as `mise daemons start` does: by name, with `--group NAME`, or with `--all`. Other flags pass through to `pitchfork stop`.

## Arguments
- **`[ARGS]…`** — Daemon names (short, such as `api`, or qualified, such as `shop/api`), `--group NAME`, and flags passed to pitchfork

## 标志
- **`-h --help`** — 打印帮助

## Examples

Stop one daemon

```
mise daemons stop postgres
```

<!-- generated reference navigation -->

## 相关文档

- [Daemons](/daemons.html).
- [`mise daemons [--json] [SUBCOMMAND]`](/cli/daemons.html).
- [Global flags and argument syntax](/cli/#global-flags).
