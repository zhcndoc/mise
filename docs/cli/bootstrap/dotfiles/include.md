---
description: "停止排除与 glob 匹配的路径"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap dotfiles include`

- **用法：** `mise bootstrap dotfiles include <GLOB>`
- **效果：** 修改状态
- **源代码：** [`src/cli/dotfiles/exclude.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/exclude.rs)

停止排除与 glob 匹配的路径

从全局配置中的 `[history] exclude` 移除该 glob。请传入与 `mise dot exclude` 相同的模式：

```
mise dot exclude '~/.codex/sessions/**'
mise dot include '~/.codex/sessions/**'
```

其他匹配的排除规则仍会生效。此命令不会编辑受跟踪目录的 `include` 列表；请修改 `[dotfiles]` 中的该字段来选择目录保存的文件。

## 参数
- **`<GLOB>`** — `mise dot exclude` 使用的 glob

## 标志
- **`-h --help`** — 打印帮助

<!-- 生成的参考导航 -->

## 相关文档

- [点文件所有权和模式](/dotfiles.html)。
- [`mise bootstrap dotfiles <SUBCOMMAND>`](/cli/bootstrap/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
