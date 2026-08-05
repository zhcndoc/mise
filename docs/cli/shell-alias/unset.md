<!-- 由 usage-cli 根据使用规范生成 -->
# `mise shell-alias unset`

- **用法**：`mise shell-alias unset <shell_alias>`
- **别名**：`rm`、`remove`、`delete`、`del`
- **效果**：修改状态
- **源代码**：[`src/cli/shell_alias/unset.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell_alias/unset.rs)

移除一个 shell 别名

这会修改 `~/.config/mise/config.toml` 的内容

## 参数

### `<shell_alias>`

要移除的别名

示例：

```
mise shell-alias unset ll
```
