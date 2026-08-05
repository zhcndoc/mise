<!-- 由 usage-cli 根据用法规范生成 -->
# `mise bootstrap dotfiles edit`

- **用法**: `mise bootstrap dotfiles edit [FLAGS] <TARGET>`
- **效果**: 修改状态
- **源代码**: [`src/cli/dotfiles/edit.rs`](https://github.com/jdx/mise/blob/main/src/cli/dotfiles/edit.rs)

编辑一个受管理的 dotfile 源文件。

## 参数

### `<TARGET>`

要编辑的目标

## 标志

### `--apply`

在编辑器退出后应用此目标

### `-m --mode <MODE>`

如果该目标尚未被管理，则使用的 dotfile 模式

### `-s --source <PATH>`

如果该目标尚未被管理，则使用的源路径

### `-y --yes`

在添加未管理的目标时跳过确认提示

示例：

```
mise bootstrap dotfiles edit ~/.zshrc
mise bootstrap dotfiles edit --apply ~/.config/starship.toml
```
