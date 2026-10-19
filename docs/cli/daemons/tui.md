---
description: "[实验性] 打开 pitchfork 控制面板"
---

<!-- 由 usage-cli 生成 -->
# `mise daemons tui`

- **用法：** `mise daemons tui [ARGS]…`
- **源代码：** [`src/cli/daemons.rs`](https://github.com/jdx/mise/blob/main/src/cli/daemons.rs)

[experimental] Open the pitchfork dashboard

Requires a running pitchfork supervisor. Takes `pitchfork tui` flags, not daemon names.

## Arguments
- **`[ARGS]…`** — Flags passed to `pitchfork tui`

## 标志
- **`-h --help`** — 打印帮助

<!-- 生成的参考导航 -->

## 相关文档

- [Daemons](/daemons.html).
- [`mise daemons [--json] [SUBCOMMAND]`](/cli/daemons.html).
- [Global flags and argument syntax](/cli/#global-flags).
