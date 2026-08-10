<!-- @由 usage-cli 根据使用规范生成 -->
# `mise bootstrap packages apply`

- **用法**: `mise bootstrap packages apply [FLAGS] [PACKAGE]…`
- **别名**: `i`
- **效果**: 修改状态
- **源代码**: [`src/cli/system/install.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/install.rs)

从 `[bootstrap.packages]` 应用系统包

检查已配置的包中哪些缺失，并使用系统包管理器安装它们。
内置系统包管理器在非 root 用户运行时可能会使用 sudo 提权（参见
`system_packages.sudo`）；包插件则不会。

也可以显式以 `manager:package` 形式提供包（例如 `apk:zlib-dev`、`apt:curl`、`brew:jq`）；无论它们是否出现在配置中，都会被安装。显式包和 `--manager` 会将运行范围限定为仅这些包。`install` 也可作为此命令的别名。

## 参数

### `[PACKAGE]…`

以 `manager:package` 形式指定的软件包；默认包含 [bootstrap.packages] 中配置的所有内容。

## 标志

### `-m --manager <MANAGER>`

仅为此内置管理器或插件管理器安装软件包

### `-n --dry-run`

打印将要运行的命令，但不实际执行

### `-y --yes`

跳过确认提示

### `--update`

先刷新包管理器元数据（apk：`--update-cache`，apt：`apt-get update`）

示例：

```
mise bootstrap packages apply
mise bootstrap packages apply apk:zlib-dev apt:curl brew:jq brew-cask:firefox flatpak:org.mozilla.firefox flatpak-user:org.gnome.Builder mas:497799835
mise bootstrap packages apply --dry-run
mise bootstrap packages apply --manager apt --yes
```
