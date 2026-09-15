---
description: "删除所有缓存文件"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise cache clear`

- **用法：** `mise cache clear [--task <TASK>] [TOOL]…`
- **别名：** `c`、`clean`
- **作用：** 修改状态
- **源代码：** [`src/cli/cache/clear.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/clear.rs)

删除所有缓存文件

## 参数
- **`[TOOL]…`** — 要清除缓存的工具，例如：node、python

## 标志
- **`--task <TASK>`** — 清除任务名称或模式的输出缓存条目
- **`-h --help`** — 显示帮助

<!-- 生成的参考导航 -->

## 相关文档

- [缓存行为](/cache-behavior.html)。
- [`mise cache [SUBCOMMAND]`](/cli/cache.html)。
- [全局标志和参数语法](/cli/#global-flags)。
