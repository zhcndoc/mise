<!-- @由 usage-cli 根据用法规范生成 -->
# `mise settings set`

- **用法：** `mise settings set [-l --local] <SETTING> [VALUE]`
- **别名：** `create`
- **作用：** 修改状态
- **源代码：** [`src/cli/settings/set.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/set.rs)

添加/更新一个设置

默认情况下，这会修改 ~/.config/mise/config.toml 的内容。
使用 `--local` 时，则修改本地配置文件。
请参阅 <https://mise.jdx.dev/configuration.html#target-file-for-write-operations>

## 参数
- **`<SETTING>`** — 要设置的设置项
- **`[VALUE]`** — 要设置的值（如果以 KEY=VALUE 的形式提供，则可选）

## 标志
- **`-l --local`** — 使用本地配置文件而不是全局配置文件
- **`-h --help`** — 打印帮助

示例：

```
mise settings idiomatic_version_file=true
```
