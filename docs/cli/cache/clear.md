---
description: "删除缓存数据"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise cache clear`

- **用法：** `mise cache clear [--task <TASK>] [TOOL]…`
- **别名：** `c`、`clean`
- **作用：** 修改状态
- **源代码：** [`src/cli/cache/clear.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/clear.rs)

Delete cached data

With no arguments, deletes the whole cache directory, the cached environment,
and every task's cached artifacts. With TOOL arguments, deletes only the cached
data of those tools, such as their version lists. With --task, deletes only that
task's cached artifacts. Installed tools are not removed; mise downloads or
rebuilds what it needs again.

## Arguments
- **`[TOOL]…`** — Only clear the cache of these tools, such as `node`

## Flags
- **`--task <TASK>`** — [experimental] Clear task artifact cache entries for a task name or pattern
- **`-h --help`** — Print help

## Examples

Clear the whole cache

```
mise cache clear
```

Refresh node's version list

```
mise cache clear node
```

[experimental] Forget the build task's cached artifacts

```
mise cache clear --task build
```

<!-- generated reference navigation -->

## 相关文档

- [缓存行为](/cache-behavior.html)。
- [`mise cache [SUBCOMMAND]`](/cli/cache.html)。
- [全局标志和参数语法](/cli/#global-flags)。
