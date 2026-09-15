---
description: "Debian 系 Linux（Debian、Ubuntu、Mint 等）的系统包。"
---

# Debian and Ubuntu packages (apt)

适用于 Debian 系 Linux（Debian、Ubuntu、Mint 等）的系统包。

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:curl" = "8.5.0-2ubuntu10" # 版本固定
"apt:gcc:arm64" = "latest"     # 架构限定符
```

## 预览和应用

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager apt --dry-run
mise bootstrap packages apply --manager apt
```

这些命令使用当前 `[bootstrap.packages]` 声明。要同时添加和安装软件包，请使用 `mise bootstrap packages use apt:libssl-dev`。管理器必须在主机上可用；当管理器不可用时，显式指定 `--manager apt` 会失败。

## 行为

- 使用 `dpkg-query` 检查软件包状态（只读，绝不提权）。
- 使用 `apt-get install -y` 安装缺失的软件包，必要时使用 sudo 提权（参见 [sudo](/bootstrap/packages/#sudo)）。
- 版本固定值会以 apt 原生的 `name=version` 语法传递；`name:arch` 限定符会原样传递到软件包名称中。
- 设置 `DEBIAN_FRONTEND=noninteractive`，因此安装不会因 debconf 配置提示而阻塞。这不会提供 sudo 凭据，也不能保证每个维护者脚本都以非交互方式运行。
- `mise bootstrap packages upgrade` 会运行 `apt-get update`，然后对已配置的软件包运行 `apt-get install --only-upgrade`，因此未安装的请求软件包不会成为安装目标。apt 仍会解析这些升级所需的依赖项。

## 元数据刷新

如果 `/var/lib/apt/lists` 不包含任何软件包列表（全新的容器），mise 会在安装前自动运行 `apt-get update`。否则，它不会接触 apt 元数据——如果安装失败并显示“Unable to locate package”，请显式刷新：

```sh
mise bootstrap packages apply --update
```

## 架构限定的软件包

`gcc:arm64` 是带有架构限定符的软件包名称。目标的 dpkg 架构配置和 apt 软件源必须提供该架构；此声明不会启用 multiarch 或添加软件源。

## 版本固定

上面的版本仅供示例，并且特定于某个发行版版本。在固定版本之前，使用 `apt-cache policy curl` 检查目标上的候选版本。精确固定的版本必须在已配置的软件源中保持可用；mise 不会将 apt 变成历史软件包存档。

当安装的是不同版本时，固定条目（`"apt:curl" = "8.5.0-2ubuntu10"`）会在 `mise bootstrap packages status` 中显示为 `version mismatch`，而 `mise bootstrap packages apply` 会将该固定版本传递给 apt 以进行修正。`"latest"` 条目只要任意版本已安装就视为满足——使用 `mise bootstrap packages upgrade` 将它们更新到最新可用版本。
