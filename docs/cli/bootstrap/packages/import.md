<!-- 由 usage-cli 根据使用规范生成 -->
# `mise bootstrap packages import`

- **用法**：`mise bootstrap packages import [FLAGS]`
- **作用**：修改状态
- **源代码**：[`src/cli/system/import.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/import.rs)

将已安装的系统包导入到 `[bootstrap.packages]`

目前仅支持 Homebrew formulae。默认情况下，会导入已链接的
formulae，其活动 keg 收据表明它们是按需安装的。
传入 `--all` 可导入所有已链接的 formulae，包括依赖项。

## 标志

### `-e --env <ENV>`

写入此环境的配置文件（mise.&lt;ENV>.toml）

### `-g --global`

写入全局配置（~/.config/mise/config.toml）

### `-m --manager <MANAGER>`

仅导入此管理器的软件包。目前仅支持 `brew`

**可选值：**

- `brew`

**默认值：** `brew`

### `--all`

导入所有已链接的公式，包括依赖项

### `-n --dry-run`

打印配置更改而不写入配置

### `-p --path <PATH>`

写入此配置文件或目录

示例：

```
mise bootstrap packages import --manager brew
mise bootstrap packages import --manager brew --all
mise bootstrap packages import --manager brew --global
mise bootstrap packages import --manager brew --dry-run
```
