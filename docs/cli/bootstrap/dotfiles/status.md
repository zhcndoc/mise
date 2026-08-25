<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap dotfiles status`

- **用法：** `mise bootstrap dotfiles status [-J --json] [--missing] [TARGET]…`
- **别名：** `ls`
- **效果：** 只读
- **源代码：** [`src/cli/dotfiles/status.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/status.rs)

显示 `[dotfiles]` 中点文件的状态。

## 参数
- **`[TARGET]…`** — 仅显示这些目标

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果任何已配置的点文件不处于其期望状态（缺失、源文件缺失、存在差异），则以代码 1 退出
- **`-h --help`** — 打印帮助

示例：

```
mise bootstrap dotfiles status
mise bootstrap dotfiles status ~/.zshrc
mise bootstrap dotfiles status --json
mise bootstrap dotfiles status --missing # 如果有任何内容不同步则退出 1
```
