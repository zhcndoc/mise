---
description: "保存跟踪文件的更改"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise dotfiles watch`

- **用法：** `mise dotfiles watch [--once] [-J --json]`
- **效果：** 修改状态
- **源代码：** [`src/cli/dotfiles/watch.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/watch.rs)

保存跟踪文件的更改

在前台运行：为每个自动保存的跟踪条目安装文件系统监视，在更改后的文件保持
`history.watch.debounce` 时间不变后保存检查点（持续更改的文件不会延迟其他文件；
`history.watch.max_interval` 会强制保存该文件），并在启动时、每隔
`history.watch.reconcile` 以及配置发生更改时协调整个集合。手动保存的条目不会被监视。

连接了设置仓库时，监视器还会根据
`settings.history.sync` 进行同步：在 `sync` 模式下，会在保存后的
`history.sync_interval` 内发布，每隔 `history.fetch_interval` 获取一次，并在完整设置
不存在冲突后应用传入的更改；在 `fetch-only` 模式下只获取；在 `manual` 模式下不进行
网络操作。同步失败后会退避，并在保存继续进行的同时重试。`--once` 会执行一次协调和一次此类同步。

内置服务 `history-watch` 会为你运行此命令：

```
[bootstrap.services.mise-history]
builtin = "history-watch"
```

退出代码：当历史记录被禁用或已有其他监视器运行时为 0；当 git 不可用、存储无法打开或无法
安装任何监视器时为 1。捕获失败后会以退避方式重试，绝不会丢弃待处理的更改；如果捕获会
与其他历史记录操作重叠，则会延后执行。

## 标志
- **`--once`** — 协调并同步一次后退出（用于计时器和 cron）
- **`-J --json`** — 每行输出一个 JSON 对象，而不是日志行
- **`-h --help`** — 打印帮助

示例：

```
mise dot watch
mise dot watch --once      # one reconcile, for a timer
mise dot watch --json
```

<!-- 生成的参考导航 -->

## 相关文档

- [开始使用](/getting-started.html)。
- [`mise dotfiles <SUBCOMMAND>`](/cli/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
