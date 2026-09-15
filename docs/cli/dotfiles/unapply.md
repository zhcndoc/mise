---
description: "移除从 `[dotfiles]` 应用的点文件"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise dotfiles unapply`

- **用法：** `mise dotfiles unapply [FLAGS] [TARGET]…`
- **影响：** 破坏性操作——可能删除或不可逆地覆盖内容
- **源代码：** [`src/cli/dotfiles/unapply.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/unapply.rs)

移除从 `[dotfiles]` 应用的点文件

移除已配置的整个文件条目和编辑内容，同时保留
mise 无法识别为受管理的文件。修改后的副本、模板和纯行
编辑需要使用 `--force`。源文件和配置条目会保留。
在删除声明之前运行此命令，以便 mise 仍能识别其目标。

## 参数
- **`[TARGET]…`** —— 仅取消应用这些目标

## 标志
- **`-f --force`** —— 移除已修改或其他存在歧义的受管理文件和行
- **`-n --dry-run`** —— 输出将执行的操作，但不写入任何内容
- **`-y --yes`** —— 跳过确认提示
- **`--prompt-secrets`** —— 安全地提示输入缺失的引导秘密输入
- **`-h --help`** —— 输出帮助信息

## 示例

```
mise dot unapply
mise dot unapply ~/.zshrc
mise dot unapply --dry-run
mise dot unapply --force --yes
```

<!-- 生成的参考导航 -->

## 相关文档

- [入门](/getting-started.html)。
- [`mise dotfiles <SUBCOMMAND>`](/cli/dotfiles.html)。
- [全局标志和参数语法](/cli/#global-flags)。
