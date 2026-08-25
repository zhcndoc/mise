<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise bootstrap packages upgrade`

- **用法：** `mise bootstrap packages upgrade [FLAGS] [PACKAGE]…`
- **别名：** `up`
- **影响：** 修改状态
- **源代码：** [`src/cli/system/upgrade.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/upgrade.rs)

从 `[bootstrap.packages]` 升级已安装的引导包

刷新包管理器元数据，并升级已安装的已配置包：apk/apt/dnf/pacman 升级到最新可用版本（apk、apt 和 dnf 遵循配置中固定的版本），brew 倾倒公式的当前 bottle 并替换旧的 keg，brew-cask 安装当前的 cask 构件，flatpak 和 flatpak-user 更新应用程序及运行时，mas 升级 App Store 应用。尚未安装的软件包会被跳过——请使用 `mise bootstrap packages apply` 安装这些包。

包也可以显式地以 `manager:package` 形式提供。

## 参数
- **`[PACKAGE]…`** —— `manager:package` 形式的包；默认为 [bootstrap.packages] 中配置的全部包

## 标志
- **`-m --manager <MANAGER>`** —— 仅升级此内置管理器或插件管理器的包
- **`-n --dry-run`** —— 输出将要运行的命令，但不运行这些命令
- **`-y --yes`** —— 跳过确认提示
- **`-h --help`** —— 显示帮助

示例：

```
mise bootstrap packages upgrade
mise bootstrap packages upgrade brew:postgresql@17
mise bootstrap packages upgrade --manager brew-cask
mise bootstrap packages upgrade --manager mas
mise bootstrap packages upgrade --manager apt --yes
mise bootstrap packages upgrade --dry-run
```
