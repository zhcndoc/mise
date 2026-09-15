---
description: "应用来自 `[dotfiles]` 的 dotfiles"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise dotfiles apply`

- **Usage：** `mise dotfiles apply [FLAGS] [TARGET]…`
- **Effect：** 修改状态
- **Source code：** [`src/cli/dotfiles/apply.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/apply.rs)

应用来自 `[dotfiles]` 的 dotfiles

应用已配置的整文件条目和不处于其期望状态的编辑项。整文件条目可以创建符号链接、复制文件或渲染模板。编辑项用于管理文件中由标记分隔的代码块或单行内容，这些文件并非由 mise 以其他方式管理。

## 参数
- **`[TARGET]…`** — 仅应用这些目标

## 标志
- **`-f --force`** — 覆盖与整文件 dotfile 条目冲突的现有文件
- **`-n --dry-run`** — 输出将执行的操作，但不写入任何内容
- **`-y --yes`** — 跳过确认提示
- **`--prompt-secrets`** — 安全地提示输入缺失的引导 secret
- **`-h --help`** — 输出帮助信息

## 示例

```
mise dot apply
mise dot apply --dry-run
mise dot apply --force --yes
```

<!-- 生成的参考导航 -->

## 相关文档

- [开始使用](/getting-started.html)。
- [`mise dotfiles <SUBCOMMAND>`](/cli/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
