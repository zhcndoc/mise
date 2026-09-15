---
description: 在 mise bootstrap 期间使本地 Windows 软件包与 WinGet 保持一致
---

# WinGet

通过 Windows Package Manager CLI 管理 Windows 应用程序和软件包。

```toml
[bootstrap.packages]
"winget:BurntSushi.ripgrep.MSVC" = "latest"
"winget:Microsoft.PowerToys" = "0.101.0"
```

使用 `winget search` 显示的软件包标识符，而不是显示名称。mise 会将该标识符与 `--id` 和 `--exact` 一起传递给 WinGet，因此 bootstrap 永远不会接受含糊的模糊匹配。

## 命令

```sh
mise bootstrap packages use winget:BurntSushi.ripgrep.MSVC
mise bootstrap packages status
mise bootstrap packages apply --manager winget
mise bootstrap packages apply --manager winget --update
mise bootstrap packages upgrade --manager winget
```

`mise bootstrap packages status` 会运行 `winget list --id <ID> --exact`，并将已安装版本与可选的固定版本作为不透明字符串进行比较。`"latest"` 会被任何已安装版本视为满足；使用升级命令可将其更新到已配置的 WinGet 源中提供的最新版本。

应用和升级操作会在禁用交互的静默模式下运行，并接受 WinGet 提供的软件包和源协议。安装程序仍可能需要通过 UAC 提升 Windows 权限。mise 不会绕过 UAC，也不会尝试自行提升 WinGet 进程的权限，并会原样传递 WinGet 的失败信息。

`--update` 会在应用缺失软件包前刷新 WinGet 源。升级操作始终会先刷新源。初始 WinGet 集成不支持声明式移除、软件包导入和清理。

## 可用性和范围

该管理器仅在 `winget.exe` 位于 `PATH` 中的 Windows 上可用。共享配置可以包含 `winget:` 条目以及 Linux 或 macOS 软件包条目；不可用的管理器会被报告为已跳过，不会阻止其他平台的 bootstrap。

此支持仅适用于运行 `mise bootstrap` 的 Windows 本地计算机。[`mise bootstrap remote`](/bootstrap/remote.html) 仍需要 POSIX shell 目标；原生 Windows SSH/PowerShell 目标尚不支持。Scoop 和 Chocolatey 也不在此首个实现的范围内。
