---
description: "Arch 系列 Linux（Arch、Manjaro、EndeavourOS 等）的系统软件包。"
---

# Arch 软件包（pacman）

基于 Arch 的 Linux 发行版（Arch、Manjaro、EndeavourOS 等）的系统软件包。

```toml
[bootstrap.packages]
"pacman:openssl" = "latest"
"pacman:base-devel" = "latest"
"pacman:libreoffice-fresh" = { state = "absent" }
```

对于滚动发布的工作站，在添加软件包之前，使用 Arch 支持的完整系统升级工作流程来保持整个系统为最新状态。mise 的作用域 `upgrade` 命令不能替代该工作流程；请参阅下面的部分升级限制。

## 预览并应用

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager pacman --dry-run
mise bootstrap packages apply --manager pacman
```

这些命令使用当前生效的 `[bootstrap.packages]` 声明。要同时添加并安装软件包，请使用 `mise bootstrap packages use pacman:openssl`。管理器必须在主机上可用；当管理器不可用时，显式指定 `--manager pacman` 会失败。

## 行为

- 使用 `pacman -Q` 和 `pacman -T` 检查软件包状态（只读，绝不会提权）。通过 `Provides` 满足所请求名称的已安装软件包会被视为已安装。
- 缺少的软件包使用 `pacman -S --noconfirm --needed` 安装，必要时通过 sudo 提权（请参阅 [sudo](/bootstrap/packages/#sudo)）。`--needed` 使安装具有幂等性。
- 使用 `state = "absent"` 声明的软件包会通过 `pacman -R --noconfirm` 移除。移除操作基于 pacman 的已安装软件包数据库，因此对官方 Arch 软件包以及来自已配置的第三方软件仓库（例如 Omarchy Package Repository）的软件包都以相同方式生效。mise 不会级联移除依赖它们的软件包，也不会移除孤立的依赖项。
- 如果 `/var/lib/pacman/sync` 不包含任何数据库（全新容器），mise 会在安装前自动运行 `pacman -Sy`。使用 `mise bootstrap packages apply --update` 强制刷新。
- `mise bootstrap packages upgrade` 会运行 `pacman -Sy`，然后仅升级已配置的软件包。通过 `Provides` 满足的软件包请求会被跳过，以避免替换已安装的提供者。Arch 官方仅支持完整系统升级（`pacman -Syu`）——升级单个软件包属于[部分升级](https://wiki.archlinux.org/title/System_maintenance#Partial_upgrades_are_unsupported)，因此在滚动发布系统上，建议自行运行 `pacman -Syu`。

::: warning
Arch 软件仓库仅提供每个软件包的最新版本，因此 pacman 条目无法以固定版本安装——`mise bootstrap packages apply` 会跳过固定版本条目并发出警告，不过 `mise bootstrap packages status` 仍会报告其存在 `version mismatch`。必须从 Arch User Repository 构建的软件包，请使用单独的 [`aur:` 管理器](./aur.md)。
:::
