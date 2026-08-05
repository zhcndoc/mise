<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise settings get`

- **用法**: `mise settings get [-l --local] <SETTING>`
- **效果**: 只读
- **源代码**: [`src/cli/settings/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/get.rs)

显示当前设置

这是 ~/.config/mise/config.toml 中单个条目的内容

请注意，别名也存储在此文件中
但通过 `mise tool-alias get` 单独管理。

## 参数

### `<SETTING>`

要显示的设置

## 标志

### `-l --local`

使用本地配置文件而不是全局配置文件

示例：

```
$ mise settings get idiomatic_version_file
true
```
