<!-- @由 usage-cli 根据用法规范生成 -->
# `mise settings`

- **用法**: `mise settings [FLAGS] [SETTING] [VALUE] <SUBCOMMAND>`
- **作用**: 修改状态
- **源代码**: [`src/cli/settings/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/mod.rs)

显示当前设置

这是 `~/.config/mise/config.toml` 的内容

请注意，别名也存储在此文件中
但通过 `mise tool-alias` 单独管理。

## 参数

### `[SETTING]`

设置名称

### `[VALUE]`

要设置的设置值。

## 全局标志

### `-l --local`

使用本地配置文件，而不是全局配置文件。

## 标志

### `-a --all`

列出所有设置

### `-J --json`

以 JSON 格式输出

### `-T --toml`

以 TOML 格式输出

### `--json-extended`

以包含来源的 JSON 格式输出。

## 子命令

- [`mise settings add [-l --local] <SETTING> [VALUE]`](/cli/settings/add.md)
- [`mise settings get [-l --local] <SETTING>`](/cli/settings/get.md)
- [`mise settings ls [FLAGS] [SETTING]`](/cli/settings/ls.md)
- [`mise settings set [-l --local] <SETTING> [VALUE]`](/cli/settings/set.md)
- [`mise settings unset [-l --local] <KEY>`](/cli/settings/unset.md)

示例：
```
# 列出所有设置
$ mise settings

# 获取设置 "always_keep_download" 的值
$ mise settings always_keep_download

# 将设置 "always_keep_download" 的值设为 "true"
$ mise settings always_keep_download=true

# 将设置 "node.mirror_url" 的值设为 "https://npmmirror.com/mirrors/node/"
$ mise settings node.mirror_url https://npmmirror.com/mirrors/node/
```
