<!-- @由 usage-cli 根据使用规范生成 -->
# `mise upgrade`

- **用法**: `mise upgrade [FLAGS] [INSTALLED_TOOL@VERSION]…`
- **别名**: `up`
- **效果**: 修改状态
- **源代码**: [`src/cli/upgrade.rs`](https://github.com/jdx/mise/blob/main/src/cli/upgrade.rs)

升级过时的工具

默认情况下，这会保持 mise.toml 中指定的版本范围不变。因此，如果你设置了 node@20，它将
升级到可用的最新 20.x.x 版本。请参阅 `--bump` 标志以使用最新版本
并更新 mise.toml 中的版本。

这将更新 mise.lock（如果已启用），请参阅 <https://mise.jdx.dev/configuration/settings.html#lockfile>。

## 参数

### `[INSTALLED_TOOL@VERSION]…`

要升级的工具  
例如：node@20 python@3.10  
如果未指定，则所有当前工具都将被升级。

## 标志

### `-i --interactive`

显示多选菜单以选择要升级的工具

### `-j --jobs <JOBS>`

并行运行的任务数  
小于 1 的值将按 1 处理  
[默认值：4]

### `-l --bump`

升级到可用的最新版本，并将 mise.toml 中的版本提升为该版本

例如，如果你的 mise.toml 中有 `node = "20.0.0"`，但 22.1.0 是当前可用的最新版本，
这将安装 22.1.0，并将你的配置设置为 `node = "22.1.0"`。

它会保持与之前相同的精度，所以如果你之前写的是 `node = "20"`，它会
将你的配置改为 `node = "22"`。

### `-n --dry-run`

只打印将要执行的操作，不真正执行

### `-x --exclude… <INSTALLED_TOOL>`

要从升级中排除的工具
例如：go python

### `--dry-run-code`

类似于 --dry-run，但如果有过时的工具则以代码 1 退出

这对于脚本检查工具是否需要升级很有用。

### `--inactive`

升级所有工具，包括已安装但未激活、当前配置中不存在的工具

### `--local`

仅升级在本地配置文件中定义的工具

这将只升级在项目本地 mise.toml 中定义的工具，并
跳过在全局配置（~/.config/mise/config.toml）中定义的工具。

### `--minimum-release-age <MINIMUM_RELEASE_AGE>`

仅升级到在此日期之前发布或早于此时长的版本

支持像 "2024-06-01" 这样的绝对日期，以及像 "90d" 或 "1y" 这样的相对时长。
这对于可复现性或安全性目的可能很有用。

这只影响像 "20" 或 "latest" 这样的模糊版本匹配。
像 "22.5.0" 这样明确固定的版本不会被过滤。

### `--monorepo`

用于未来单体仓库升级的占位符；`mise upgrade --monorepo` 目前尚未实现。

### `--no-prune`

不要卸载已升级替换掉的版本

默认情况下，新版本安装完成后会移除旧版本，除非其他受跟踪的配置或工具存根仍然需要它。使用此选项可保留旧版本，例如，当 mise 外部的某些内容指向旧的安装目录时。

将 `upgrade.auto_prune = false` 设置为默认行为。

### `--prune`

卸载已被升级版本替换的版本

这已经是默认行为。使用此选项可在单次运行中覆盖 `upgrade.auto_prune = false`。

### `--raw`

将后端安装命令的 stdin/stdout/stderr 直接连接到终端，隐含 `--jobs=1`

示例：

```
# 将 node 升级到与 mise.toml 中范围匹配的最新版本
$ mise upgrade node

# 将 node 升级到最新版本并将 mise.toml 中的版本提升为该版本
$ mise upgrade node --bump

# 将所有工具升级到最新版本
$ mise upgrade

# 将所有工具升级到最新版本，并将 mise.toml 中的版本提升为该版本
$ mise upgrade --bump

# 只打印将要执行的操作，不真正执行
$ mise upgrade --dry-run

# 将 node 和 python 升级到最新版本
$ mise upgrade node python

# 升级除 go 之外的所有工具
$ mise upgrade --exclude go

# 显示多选菜单以选择要升级的工具
$ mise upgrade --interactive

# 仅升级本地 mise.toml 中定义的工具，不升级全局配置中的工具
$ mise upgrade --local
```
