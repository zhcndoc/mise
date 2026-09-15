---
description: "适用于 Red Hat 系列 Linux（Fedora、RHEL、CentOS Stream、Rocky、Alma 等）的系统软件包。"
---

# RPM 软件包（dnf）

适用于 Red Hat 系列 Linux（Fedora、RHEL、CentOS Stream、Rocky、Alma 等）的系统软件包。

```toml
[bootstrap.packages]
"dnf:openssl-devel" = "latest"
"dnf:postgresql-server" = "latest"
"dnf:bash" = "5.2.26-3.fc40" # 锁定版本或版本-发行版组合
```

## 预览和应用

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager dnf --dry-run
mise bootstrap packages apply --manager dnf
```

这些命令使用当前启用的 `[bootstrap.packages]` 声明。若要同时添加并安装软件包，请使用 `mise bootstrap packages use dnf:openssl-devel`。管理器必须在主机上可用；当管理器不可用时，显式指定 `--manager dnf` 会失败。

## 行为

- 软件包状态通过 `rpm -q` 检查（只读，绝不提权）。
- 缺失的软件包使用 `dnf install -y` 安装，必要时通过 sudo 提权
  （见 [sudo](/bootstrap/packages/#sudo)）。
- 版本固定值会以 dnf 原生的 `name-version` /
  `name-version-release` 语法传入；仅版本固定值对该版本的任意
  发布版都算满足。
- `mise bootstrap packages apply --update` 会添加 `--refresh` 以强制进行元数据
  刷新；否则 dnf 会自行管理其元数据过期。
- `mise bootstrap packages upgrade` 会对已配置的
  软件包运行 `dnf upgrade -y --refresh` —— 只会处理已安装的软件包。

## 版本选择

上面的 Fedora 版本-发行版示例展示了语法；它不适用于所有 RPM 发行版或版本。请选择目标系统已启用的软件仓库中可用的版本。mise 会将约束传递给 dnf，不会添加软件仓库或获取归档的 RPM 来满足该约束。

`"latest"` 接受已安装的软件包。使用 `upgrade` 请求更新；源代码软件包和原生依赖解析仍由 dnf 负责。

::: info
仅支持 `dnf`，不支持仅有传统 `yum` 的系统。在 RHEL/CentOS 8+ 以及所有当前 Fedora 版本中，`dnf` 是默认选项。
:::
