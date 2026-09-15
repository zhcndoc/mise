---
description: "当前工具随附的 Agent skills，来自其 packslips"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise skills`

- **用法：** `mise skills [SUBCOMMAND]`
- **别名：** `skill`
- **效果：** 只读
- **源代码：** [`src/cli/skills/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/skills/mod.rs)

当前工具随附的 Agent skills，来自其 packslips

使用 `packslip:` backend 安装的工具可以声明一个 agent skill：一个包含
`SKILL.md` 及其引用内容、采用 Agent Skills 格式的目录。mise 知道此处每个工具当前使用的版本，因此可以将完全对应于该版本的 skill 交给 agent。

## 选项
- **`-h --help`** — 打印帮助

## 子命令

- [`mise skills ls [-J --json]`](/cli/skills/ls.html)
- [`mise skills sync [FLAGS]`](/cli/skills/sync.html)

<!-- 生成的参考导航 -->

## 相关文档

- [Skills 和其他 Packslip 资源](/dev-tools/packslip-resources.html)。
- [所有命令](/cli/)。
- [全局选项和参数语法](/cli/#global-flags)。
