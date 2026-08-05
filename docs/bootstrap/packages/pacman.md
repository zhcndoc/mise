# pacman

基于 Arch 的 Linux 发行版（Arch、Manjaro、EndeavourOS 等）的系统软件包。

```toml
[bootstrap.packages]
"pacman:openssl" = "latest"
"pacman:base-devel" = "latest"
```

## 行为

- 使用 `pacman -Q` 检查软件包状态（只读，绝不提权）。
- 缺失的软件包使用 `pacman -S --noconfirm --needed` 安装，
  必要时通过 sudo 提权（参见
  [sudo](/bootstrap/packages/#sudo)）。`--needed` 使安装
  具有幂等性。
- 如果 `/var/lib/pacman/sync` 不包含任何数据库（全新容器），mise
  会在安装前自动运行 `pacman -Sy`。如需强制刷新，请使用
  `mise bootstrap packages apply --update`。
- `mise bootstrap packages upgrade` 会运行 `pacman -Sy`，然后只升级已
  配置的软件包。请注意，Arch 官方仅支持全系统升级（`pacman -Syu`）——
  单独升级某个软件包属于
  [部分升级](https://wiki.archlinux.org/title/System_maintenance#Partial_upgrades_are_unsupported)，
  因此在滚动发行版系统上更建议你自行运行 `pacman -Syu`。

::: warning
Arch 软件仓库只包含每个软件包的最新版本，因此 pacman
条目无法按固定版本安装——`mise bootstrap packages apply`
会跳过已固定版本的条目并给出警告，不过 `mise bootstrap packages status` 仍会
将它们报告为 `version mismatch`。不支持 AUR 软件包（它们
需要 AUR helper 并从源码构建）。
:::
