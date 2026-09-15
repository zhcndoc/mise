---
description: "显示 shell 别名对应的命令"
---

<!-- @由 usage-cli 根据用法规范生成 -->
# `mise shell-alias get`

- **用法：** `mise shell-alias get <shell_alias>`
- **效果：** 只读
- **源代码：** [`src/cli/shell_alias/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell_alias/get.rs)

显示某个 shell 别名的命令

## 参数
- **`<shell_alias>`** — 要显示的别名

## 标志
- **`-h --help`** — 打印帮助

## 示例

```
mise shell-alias get ll
ls -la
```

<!-- 生成的参考导航 -->

## 相关文档

- [Shell 别名](/shell-aliases.html)。
- [`mise shell-alias [--no-header] [SUBCOMMAND]`](/cli/shell-alias.html)。
- [全局标志和参数语法](/cli/#global-flags)。
