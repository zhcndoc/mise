---
description: "通过 mise.toml 使用 Chocolatey 安装和升级 Windows 软件包，并固定版本。"
---

# Chocolatey 软件包（choco）

`choco` 管理器通过 [Chocolatey](https://chocolatey.org) 安装和升级 Windows 软件包；Chocolatey 会在整台计算机范围内安装软件。

```toml
[bootstrap.packages]
"choco:git" = "latest"
"choco:docker-engine" = "latest"
"choco:visualstudio2022buildtools" = "117.12.0"
```

```sh
mise bootstrap packages apply --manager choco --dry-run
mise bootstrap packages apply --manager choco
```

## 前置条件

请先安装 Chocolatey。在 Windows 上，只要 `choco.exe` 位于 `PATH` 中即可使用此管理器。在其他系统上，`choco:` 条目会显示为[已跳过](/bootstrap/packages/#choose-platforms)，因此同一份配置可以包含适用于多个平台的软件包。

Chocolatey 会将软件安装到整台计算机共用的位置，因此必须在提升权限的（管理员）终端中运行 `apply` 和 `upgrade`。mise 不会绕过 UAC，也不会为 Chocolatey 提权；Chocolatey 报错时，mise 会原样报告。`status` 只读取 Chocolatey 的本地软件包列表，无需提升权限即可运行。

[`mise bootstrap remote`](/bootstrap/remote.html) 要求目标机器上有 POSIX Shell，且无法控制原生 Windows 主机，因此请直接在 Windows 机器上运行 `mise bootstrap`。安装仅供当前用户使用的应用时，请使用 [`scoop`](/bootstrap/packages/scoop.html) 管理器；使用 Windows 程序包管理器时，请用 [`winget`](/bootstrap/packages/winget.html)。

## 软件包名称

请使用 `choco search` 显示的软件包 ID，或 [Chocolatey 社区仓库](https://community.chocolatey.org/packages)中的 ID。mise 会按原样传递 ID，并且只按完全一致的 ID 匹配已安装的软件包，不会模糊匹配。Chocolatey 的 ID 不区分大小写；为避免[声明冲突](/bootstrap/packages/#semantics)，请在各处使用相同的拼写。

## 固定版本

对于 `apply` 和 `upgrade`，mise 都会将固定版本作为 `--version` 参数传给 Chocolatey，版本字符串必须与 Chocolatey 中的完全一致。如果固定版本低于已安装版本，软件包会降级，因此 mise 会添加 `--allow-downgrade`。运行 `choco search <id> --exact --all-versions` 可列出可用版本。`"latest"` 条目在安装了任意版本后即视为满足；运行 `upgrade` 可将其升级到最新版本。

## mise 执行的命令

| Operation             | Command                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| 检查安装状态 | `choco list --local-only --exact --limit-output <id>`                        |
| 安装         | `choco install <id> [--version <pin> --allow-downgrade] --yes --no-progress` |
| 升级         | `choco upgrade <id> [--version <pin> --allow-downgrade] --yes --no-progress` |

mise 对每个软件包分别运行一次 Chocolatey。Chocolatey 2.x 只列出本地软件包，可能不接受 `--local-only`，因此 mise 会去掉该参数后重试查询。Chocolatey 没有单独的元数据刷新操作，所以 `--update` 不会产生效果。软件包安装成功但要求重启（退出码为 1641 或 3010）时，仍会视为已安装，mise 会提示尚待重启。

## 移除软件包

mise 不支持对 Chocolatey 软件包使用 `state = "absent"`、`import` 或 `prune`。删除配置条目不会卸载软件包；请自行运行 `choco uninstall`。
