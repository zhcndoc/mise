<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise settings unset`

- **用法**: `mise settings unset [-l --local] <KEY>`
- **别名**: `rm`、`remove`、`delete`、`del`
- **作用**: 修改状态
- **源代码**: [`src/cli/settings/unset.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/unset.rs)

清除一个设置

这会修改 ~/.config/mise/config.toml 的内容。

## 参数

### `<KEY>`

要移除的设置

## 标志

### `-l --local`

使用本地配置文件而不是全局配置文件

示例：

```
mise settings unset idiomatic_version_file
```
