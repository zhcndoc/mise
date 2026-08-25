<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap dotfiles apply`

- **用法：** `mise bootstrap dotfiles apply [FLAGS] [TARGET]…`
- **效果：** 修改状态
- **源代码：** [`src/cli/dotfiles/apply.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/apply.rs)

从 `[dotfiles]` 应用点文件

应用已配置的整文件条目，以及不处于其
期望状态的编辑条目。整文件条目可以进行符号链接、复制，或渲染模板。
编辑条目管理文件中由标记分隔的块，或在 mise 其余部分不拥有的文件中的单行。

## 参数
- **`[TARGET]…`** — 仅应用这些目标

## 标志
- **`-f --force`** — 覆盖与整文件点文件条目冲突的现有文件
- **`-n --dry-run`** — 打印将要执行的操作，但不写入任何内容
- **`-y --yes`** — 跳过确认提示
- **`-h --help`** — 打印帮助

示例：

```
mise bootstrap dotfiles apply
mise bootstrap dotfiles apply --dry-run
mise bootstrap dotfiles apply --force --yes
```
