---
description: "aur 管理器使用 yay 或 paru 从 Arch User Repository 安装软件包："
---

# Arch User Repository（AUR）

`aur` 管理器使用 `yay` 或 `paru` 从
[Arch User Repository](https://aur.archlinux.org/) 安装软件包：

::: warning 安装前请检查 AUR 软件包
AUR 软件包是用户提交的构建配方，并非由 Arch Linux 审核或支持的软件包。遭到入侵或恶意的 PKGBUILD 可能会在构建过程中以你的用户身份执行代码。安装软件包前请检查 PKGBUILD 及相关源，并在应用升级前检查上游更改。mise 将操作委托给你的 AUR helper，不会额外添加独立的信任或验证层。
:::

```toml
[bootstrap.packages]
"aur:google-chrome" = "latest"
"aur:visual-studio-code-bin" = "latest"
```

在应用此配置前，请安装可用的 AUR helper 及其构建依赖项。请以普通用户身份运行，不要使用 root。

如果两个 helper 都在 `PATH` 中，mise 优先使用 `yay`，否则使用 `paru`。由于 AUR 软件包使用 `makepkg` 构建，helper 会以当前用户身份运行；安装构建完成的软件包时，helper 会请求 pacman 提权。

软件包状态通过 pacman 的本地数据库及其 foreign-package 过滤器以只读方式检查。已配置仓库中的同名软件包不会满足 `aur:` 声明。只有在已安装的提供程序也是 foreign package 时，才接受虚拟软件包名称。安装使用 helper 的仅 AUR 模式和 `--noconfirm`，因此不会选择名称相同的仓库软件包。mise 有意省略 `--needed`，以便 helper 用请求的 AUR 软件包名称替换已安装的仓库软件包。`mise bootstrap packages apply --update` 还会要求 helper 刷新仓库元数据。

AUR helper 构建当前的 PKGBUILD，而不是解析历史软件包版本，因此版本固定仅用于状态显示。对于 mise 可以自动安装的条目，请使用 `"latest"`。

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager aur --dry-run
mise bootstrap packages apply --manager aur
mise bootstrap packages upgrade --manager aur
```

`upgrade` 只会重新构建已配置的 AUR 软件包。它不会升级机器上的所有 foreign package。构建这些软件包时，helper 仍可能解析依赖项。试运行会显示 helper 调用，但不会替你获取和检查 PKGBUILD。
