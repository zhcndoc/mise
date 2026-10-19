---
description: "在 mise.toml 中声明整机软件包，并通过 apt、Homebrew、WinGet 等软件包管理器安装。"
socialDescription: "在 mise.toml 中声明整机软件包，并通过软件包管理器安装。"
---

# 初始化软件包 {#bootstrap-packages}

`[bootstrap.packages]` 用于声明整台机器共用的软件，例如原生库、构建依赖和桌面应用，并通过主机的软件包管理器安装。

机器上的所有项目共用这些安装：mise 不会按目录切换其版本，也不会为它们创建 shim。对于需要由各项目分别选择版本的工具，请使用 [`[tools]`](/dev-tools/)。项目可以同时使用两者，例如通过 `[tools]` 安装编译器，并通过 `[bootstrap.packages]` 安装其链接所需的 OpenSSL 头文件。

只有在你明确要求时，mise 才会安装这些软件包：运行 `mise bootstrap packages apply` 或完整的 [`mise bootstrap`](/bootstrap.html)。`mise install` 只会针对缺少的软件包显示一次提示。

## 开始使用

在 Debian 或 Ubuntu 上，将以下内容添加到 `mise.toml`：

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:build-essential" = "latest"
```

查看已安装的软件包：

```sh
mise bootstrap packages status
```

```text
管理器   软件包           已安装版本          状态
apt      libssl-dev       3.0.13-0ubuntu3.16  installed
apt      build-essential                      missing
```

先预览 mise 将要执行的命令，再实际运行：

```sh
mise bootstrap packages apply --dry-run
# sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -- build-essential
mise bootstrap packages apply
```

在其他系统上，请更换前缀，例如 Fedora 上的 `dnf:openssl-devel` 或 macOS 上的 `brew:openssl@3`。下表列出了所有支持的管理器。

`"latest"` 条目只要求软件包已安装，无论具体版本是什么。`apply` 会安装缺少的软件包，但不会升级已安装的软件包。运行 [`mise bootstrap packages upgrade`](#upgrade-installed-packages) 可执行升级。

<a id="supported-package-managers"></a>

## 支持的软件包管理器

每个键都必须包含 `manager:` 前缀。各管理器页面介绍了使用前提、软件包名称以及 mise 会运行的命令。

| 管理器                                                      | 适用系统                                          | 版本固定                                              | `state = "absent"` | 导入、清理                              |
| ----------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | ------------------ | ----------------------------------------- |
| [`apk`](/bootstrap/packages/apk.html)                       | Alpine Linux                                      | 支持                                                | 不支持             | 不支持                                  |
| [`apt`](/bootstrap/packages/apt.html)                       | Debian、Ubuntu 及其衍生版                         | 支持                                                | 不支持             | 不支持                                  |
| [`aur`](/bootstrap/packages/aur.html)                       | 使用 `yay` 或 `paru` 的 Arch 系 Linux             | 不支持                                              | 不支持             | 不支持                                  |
| [`brew`](/bootstrap/packages/brew.html)                     | Apple Silicon 上的 macOS、x86_64 和 arm64 Linux   | 不支持；使用带版本号的 formula，例如 `postgresql@17` | 不支持             | 支持导入和清理                          |
| [`brew-cask`](/bootstrap/packages/brew-cask.html)           | macOS；Linux 上的字体 cask                        | 不支持                                              | 不支持             | 清理由 mise 安装的 cask                 |
| [`dnf`](/bootstrap/packages/dnf.html)                       | Fedora、RHEL 及其衍生版                           | 支持                                                | 不支持             | 不支持                                  |
| [`flatpak`](/bootstrap/packages/flatpak.html)               | 使用 `flatpak` 的 Linux；系统级安装                | 不支持                                              | 不支持             | 不支持                                  |
| [`flatpak-user`](/bootstrap/packages/flatpak.html)          | 使用 `flatpak` 的 Linux；用户级安装                | 不支持                                              | 不支持             | 不支持                                  |
| [`macos-app`](/bootstrap/packages/macos-app.html)           | macOS                                             | 必须指定                                            | 不支持             | 不支持                                  |
| [`mas`](/bootstrap/packages/mas.html)                       | 通过 mise `[tools]` 安装或位于 `PATH` 的 macOS `mas` | 不支持                                            | 不支持             | 不支持                                  |
| [`nix`](/bootstrap/packages/nix.html)                       | `PATH` 中有 `nix` 的 Linux 和 macOS                | 不支持；改为固定 flake 源                           | 不支持             | 不支持；可导出到 NixOS                  |
| [`pacman`](/bootstrap/packages/pacman.html)                 | Arch 系 Linux                                     | 不支持                                              | 支持               | 不支持                                  |
| [`scoop`](/bootstrap/packages/scoop.html)                   | 安装了 Scoop 的 Windows                           | 支持；`upgrade` 会跳过已固定版本的条目              | 支持               | 不支持                                  |
| [`snap`](/bootstrap/packages/snap.html)                     | 使用 `snap` 的 Linux                              | 不支持；改为指定 `channel`                          | 支持               | 不支持                                  |
| [`winget`](/bootstrap/packages/winget.html)                 | 使用 WinGet 的 Windows                            | 支持                                                | 不支持             | 不支持                                  |
| [`zypper`](/bootstrap/packages/zypper.html)                 | openSUSE 和 SUSE Linux Enterprise                | 支持                                                | 支持               | 不支持                                  |
| [软件包管理器插件](/bootstrap/packages/plugins.html)       | 由各插件决定                                      | 由各插件决定                                        | 不支持             | 插件支持卸载时可清理                    |

## 声明软件包

每个键的格式为 `"manager:package"`。值可以是版本字符串，也可以是选项表：

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:curl" = "8.5.0-2ubuntu10"
"brew-cask:1password" = { os = "macos" }
"brew-cask:font-jetbrains-mono" = { os = ["linux", "macos"] }
"winget:BurntSushi.ripgrep.MSVC" = { os = "windows" }
"brew-cask:slack" = { env = "work" }
```

### 条目选项 {#entry-options}

| 键                          | 管理器                      | 说明                                                                                                                                                                                                                               |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                   | 全部                        | `"latest"`（默认值），或使用管理器自身格式的[固定版本](#version-pins)。                                                                                                                                                           |
| `os`                        | 全部                        | 仅在指定操作系统上安装；见[按操作系统筛选](#by-operating-system)。                                                                                                                                                                  |
| `env`                       | 全部                        | 仅在指定的[配置环境](/configuration/environments.html)启用时安装；见[按配置环境筛选](#by-config-environment)。                                                                                                                     |
| `state`                     | pacman、scoop、snap、zypper | `"present"`（默认值）或 `"absent"`；见[声明式移除软件包](#remove-a-package-declaratively)。                                                                                                                                       |
| `adopt`                     | brew-cask、macos-app        | 接管已安装的同一应用，而不是替换它；见 [brew-cask](/bootstrap/packages/brew-cask.html#adopt-an-existing-app) 和 [macos-app](/bootstrap/packages/macos-app.html#adopt-an-existing-app)。                                               |
| `appdir`                    | brew-cask                   | 此 cask 的应用程序目录；见[应用程序目录](/bootstrap/packages/brew-cask.html#overriding-the-application-directory)。                                                                                                                 |
| `url`、`sha256`、`artifact` | macos-app                   | 要安装的下载内容；见[声明下载项](/bootstrap/packages/macos-app.html#declare-a-download)。                                                                                                                                          |
| `channel`                   | snap                        | 用于安装和跟踪更新的 channel，例如 `"22/stable"`；见[通道说明](/bootstrap/packages/snap.html#channels)。                                                                                                                          |
| `classic`                   | snap                        | 使用 classic 隔离模式安装；见[classic 隔离模式](/bootstrap/packages/snap.html#classic-confinement)。                                                                                                                            |

对于不使用 `adopt`、`appdir`、`url`、`sha256`、`artifact`、`channel` 和 `classic` 的管理器，mise 会发出警告并忽略这些选项。其他未知键会导致配置文件解析失败。

### 固定版本 {#version-pins}

固定版本使用管理器自身的版本格式，例如 apt 的 `"8.5.0-2ubuntu10"`。如果软件包已安装但版本不同，`status` 会报告 `version mismatch`，而 `apply` 会安装指定版本。`"latest"` 条目接受任意已安装版本。

对于无法安装固定版本的管理器（见[表格](#supported-package-managers)），`status` 仍会报告版本不匹配，而 `apply` 和 `upgrade` 会跳过该条目并发出警告。对于 `brew` 和 `brew-cask`，`postgresql@17` 等名称中的 `@` 是 Homebrew 名称的一部分，并非版本固定符。

如需通过命令行写入固定版本，请在 [`mise bootstrap packages use`](#add-packages-with-use) 的软件包名称后追加 `@<version>`。

## 选择软件包的适用范围 {#choose-platforms}

默认情况下，mise 会处理当前机器上管理器可用的所有条目。不可用管理器对应的条目会被跳过，`status` 会将其列为 `skipped` 并说明原因，因此同一份配置可以声明多个平台的软件包。若 Linux 机器同时支持 apt 和内置 Homebrew 管理器，两组声明都会安装。

### 按操作系统筛选 {#by-operating-system}

使用 `os` 将条目限制在某个操作系统或操作系统与架构的组合上。它接受单个值或列表，名称与[按操作系统筛选工具](/dev-tools/#os-specific-tools)所用的名称相同，例如 `linux`、`macos`、`windows`、`unix`、`linux/x64` 和 `macos/arm64`：

```toml
[bootstrap.packages]
"brew-cask:1password" = { os = "macos" }
"brew:jq" = { os = ["macos/arm64", "linux"] }
```

Windows 版 mise 不包含 Homebrew 管理器。在 Windows 上，`brew:` 条目会被忽略，`brew-cask:` 和 `macos-app:` 条目则会因管理器未知而产生警告。如果配置由 Windows 机器共享，请在 Homebrew 条目中添加 `os = ["macos", "linux"]`。

### 按配置环境筛选 {#by-config-environment}

使用 `env` 将条目限制在一个或多个[配置环境](/configuration/environments.html)中。它接受单个名称或列表；只有通过 `-E`、`MISE_ENV`、`.miserc.toml` 中的 `env`，或由 [`auto_env`](/configuration/environments.html#platform-environments) 启用的平台环境激活其中之一时，条目才会生效：

```toml
[bootstrap.packages]
"brew-cask:slack" = { env = "work" }
"apt:postgresql" = { env = ["server", "ci"] }
```

```sh
mise -E work bootstrap packages apply
```

`mise.macos.toml` 或 `mise.linux.toml` 中的声明也遵循相同规则：只有对应环境处于活动状态时才会生效，因此请启用 [`auto_env`](/configuration/environments.html#platform-environments) 或传入 `-E`。仅有文件名并不会激活该环境。

### 按软件包管理器筛选 {#choosing-which-managers-run}

传入 `--manager` 可让单条命令只使用一个管理器。要限制某台机器上可运行的管理器，请设置 [`system_packages.managers`](/configuration/settings.html#system_packages.managers)：

```toml
[settings]
system_packages.managers = ["apt"]
```

`status` 会将被排除管理器的条目标为 `skipped`；通过 `--manager` 指定已排除的管理器则会报错。

## 移除软件包 {#remove-a-package-declaratively}

`pacman`、`scoop`、`snap` 和 `zypper` 支持将 `state` 设为 `"absent"`：

```toml
[bootstrap.packages]
"pacman:libreoffice-fresh" = { state = "absent" }
"scoop:neovim" = { state = "absent" }
```

如果声明为 `absent` 的软件包仍已安装，`status` 会将其报告为 `unexpectedly installed`，而 `apply` 会将其移除。各管理器页面说明了 mise 会执行的命令。其他管理器也会报告这种偏差，但 `apply` 不会移除该软件包：应用整个配置时会跳过该条目并发出警告；通过 `--manager` 或指定软件包范围运行时，则会在安装其他软件包后报错。

从 `mise.toml` 删除条目不会卸载任何内容。对于支持清理的管理器，请使用 [`prune`](#import-and-prune) 明确执行清理。

## 声明如何合并 {#semantics}

软件包声明会沿[配置层级](/configuration.html#configuration-hierarchy)合并。项目配置会向全局列表添加软件包；更局部的文件若包含相同键，则会取代全局条目，包括其版本和 `state`。

如果条目的管理器未知，mise 会提示安装软件包插件并忽略该条目。这样，尚不支持该管理器的 mise 版本也能读取此配置。

如果两个有效条目以不同拼写指向同一软件包，且版本或状态不一致，mise 会报错。WinGet ID 和 Scoop 应用名称不区分大小写，Scoop 也会忽略 bucket 前缀，因此 `scoop:Git` 和 `scoop:extras/git` 指向同一应用。请在所有文件中统一键的拼写，以便正常应用覆盖规则。被 `os` 或 `env` 筛除的条目不会参与检查。

## 命令 {#commands}

[`mise bootstrap packages`](/cli/bootstrap/packages.html) 参考页列出了所有子命令和选项。

### 查看状态 {#check-status}

[`mise bootstrap packages status`](/cli/bootstrap/packages/status.html) 会比较当前生效的声明与已安装内容：

```sh
mise bootstrap packages status
mise bootstrap packages status --json
mise bootstrap packages status --missing # exit 1 if anything is out of sync
```

`status` 不会安装软件包，也不会调用 sudo。软件包状态可能为 `installed`（已安装）、`missing`（缺失）、`version mismatch`（版本不匹配）、`needs repair`（需要修复）、`absent`（未安装）、`unexpectedly installed`（意外安装），或在管理器不可用时为 `skipped`（已跳过）。

### 应用配置 {#apply-or-record-packages}

[`mise bootstrap packages apply`](/cli/bootstrap/packages/apply.html) 会安装缺少或版本不匹配的软件包，并移除状态为 `absent` 的软件包：

```sh
mise bootstrap packages apply --dry-run
mise bootstrap packages apply --manager apt
mise bootstrap packages apply --update --yes
mise bootstrap packages apply apt:curl
```

`--dry-run` 只打印命令而不执行。`--manager` 将运行范围限制为单个管理器；如果该管理器不可用，命令会失败。某个管理器安装或移除软件包失败时，其他管理器仍会继续运行；全部执行完后，apply 会以非零状态退出，并为每个失败的管理器打印一行信息。在交互式终端中，mise 会在安装或移除前询问；`--yes` 会跳过确认，但不会提供 sudo 密码。

`--update` 会先刷新管理器的软件包元数据，例如运行 `apt-get update`、`apk add --update-cache`、`dnf install --refresh`、`pacman -Sy`、`zypper refresh`、`scoop update` 或 `winget source update`。
`brew`、`brew-cask`、`macos-app`、`flatpak`、`mas` 和 `snap` 会忽略此选项。

直接在命令行中指定的软件包（例如 `apt:curl`）会被安装，但不会记录到配置文件中；如果管理器不可用，则会报错。

### 使用 use 添加软件包 {#add-packages-with-use}

[`mise bootstrap packages use`](/cli/bootstrap/packages/use.html) 会写入声明并安装缺少的软件包：

```sh
mise bootstrap packages use apt:curl
mise bootstrap packages use apt:curl@8.5.0-2  # 写入 "apt:curl" = "8.5.0-2"
mise bootstrap packages use brew:postgresql@17 # @17 是 formula 名称的一部分
mise bootstrap packages use -g brew-cask:firefox
```

`use` 默认写入本地 `mise.toml`。`-g` 写入全局配置，`-e <env>` 写入 `mise.<env>.toml`，`-p <path>` 写入指定文件。使用 `-g` 时，如果设置了 [`write_targets.packages`](/configuration/settings.html#write_targets.packages)，新条目会写入指定目标；已存在的条目则会在原声明位置更新。

如需写入固定版本，请追加 `@<version>`。追加 `@latest` 或不使用 `@` 都会写入 `"latest"`。`brew:` 和 `brew-cask:` 名称中的 `@` 保留为名称的一部分；`mas:` 和 `nix:` 不接受固定版本。`--dry-run` 会打印条目和命令，但不会写入任何内容。

对于当前机器上不可用的管理器，条目仍会写入，但不会执行安装，因此你可以在 Mac 上添加 `apt:` 声明。`--no-install` 会直接写入声明，不检查也不安装任何内容。

### 升级已安装的软件包 {#upgrade-installed-packages}

[`mise bootstrap packages upgrade`](/cli/bootstrap/packages/upgrade.html) 会升级已安装且已配置的软件包；如果管理器支持，则会先刷新软件包元数据：

```sh
mise bootstrap packages upgrade --dry-run
mise bootstrap packages upgrade --manager apt
```

缺少的软件包会被跳过并产生警告；请使用 `apply` 安装它们。由管理器决定哪个版本是最新版本。支持固定版本的管理器会将条目升级到指定版本，各管理器页面说明了具体执行方式。

若要在一次运行中安装缺少的软件包并升级已安装的软件包，请使用 `mise bootstrap --upgrade`。它会在 `packages` 阶段升级软件包，并在 `tools` 阶段升级工具（与 `mise upgrade` 相同，但不带 `--bump`），然后运行 post 阶段钩子。它不会更新 mise 自身、软件仓库或容器镜像。`--dry-run` 只会预览已安装的软件包和工具的升级；对于即将由本次运行安装的内容，必须等安装后才能确定升级行为。

### 导入与清理 {#import-and-prune}

[`mise bootstrap packages import`](/cli/bootstrap/packages/import.html) 会记录已安装的 Homebrew formula：

```sh
mise bootstrap packages import --manager brew --dry-run
mise bootstrap packages import --manager brew
```

它会为按要求安装的每个 formula 写入 `"brew:<formula>" = "latest"`；`--all` 还会包括依赖项。`--global` 与 `use -g` 一样遵循 `write_targets.packages` 设置。

[`mise bootstrap packages prune`](/cli/bootstrap/packages/prune.html) 会卸载任何配置都未声明的软件包。请务必先预览将要执行的操作：

```sh
mise bootstrap packages prune --manager brew --dry-run
```

`prune` 会保留当前配置以及 mise 为其他项目跟踪的所有受信任配置文件中声明的软件包，且涵盖每个配置环境。默认使用 `--manager brew`。具体移除内容取决于管理器：

| 管理器          | prune 会移除的内容                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| brew            | 未声明，也不是已声明 formula 或 cask 所需依赖的已链接 formula，包括 Homebrew 安装的 formula；见 [brew](/bootstrap/packages/brew.html#importing-and-pruning)                               |
| brew-cask       | 仅移除由 mise 安装且此后未更改的 cask；见 [brew-cask](/bootstrap/packages/brew-cask.html#prune)                                                                                           |
| 软件包插件      | 仅在插件支持卸载时移除由 mise 安装的软件包；见[插件](/bootstrap/packages/plugins.html#prune)                                                                                               |

### 导出到 NixOS {#export-to-nixos}

`mise bootstrap packages export --format nix` 会将 `nix:` 声明写入 NixOS 模块，而不会安装这些软件包；见[导出到 NixOS](/bootstrap/packages/nix.html#export-to-nixos)。

### 查找已安装的 Homebrew formula {#locate-an-installed-package}

`mise bootstrap packages where brew:<formula>` 会输出 formula 稳定的 `opt` 目录，供脚本和构建选项使用。它只支持 `brew:` formula；见[查找已安装的 formula](/bootstrap/packages/brew.html#locate-an-installed-formula)。

## root 权限与 sudo {#sudo}

apk、apt、dnf、pacman、snap 和 zypper 需要 root 权限才能更改软件包。mise 未以 root 身份运行时，会先记录命令，再通过 `sudo` 执行。在交互式终端中，sudo 可以提示你输入密码。没有终端时，mise 会检查是否配置了免密码 sudo；如果没有，则报错并打印需要你手动运行的命令。如果没有安装 `sudo`，mise 会依次尝试 `run0`（systemd 256+）和 `doas`；如果这些工具也都未安装，则会提示你以 root 身份运行命令。设置
[`system_packages.elevate_with`](/configuration/settings.html#system_packages.elevate_with)
以固定使用某个提权工具，例如 `run0`。

将 [`system_packages.sudo`](/configuration/settings.html#system_packages.sudo) 设为 `false` 可禁止提权。需要 root 权限的命令会因此失败，并改为打印命令供你手动执行。

其他管理器的权限处理方式有所不同：

- AUR 辅助工具会以当前用户身份构建，并自行调用 sudo 安装结果，因此 `aur` 需要相同的 sudo 权限，且拒绝以 root 身份运行。
- `flatpak` 系统级安装通过 Flatpak 自带的 polkit 提示进行授权，而不是使用 sudo。`flatpak-user` 无需特殊权限。
- Homebrew 前缀尚不存在时，安装 formula 需要 sudo 来创建前缀并将其所有权交给当前用户（见 [brew](/bootstrap/packages/brew.html#the-prefix)）。安装 cask 时也可能需要 sudo，例如安装 pkg 安装包或执行某些安装步骤（见 [brew-cask](/bootstrap/packages/brew-cask.html#supported-artifacts)）。
- `nix`、`mas`、`scoop` 和 `winget` 从不使用 sudo。Windows 安装程序仍可能显示自己的 UAC 提示。
- 软件包插件从不使用 sudo，也不能自行提权。

## 在 CI 中使用 {#ci-usage}

先安装初始化软件包，再安装项目工具：

```sh
mise bootstrap packages apply --yes
mise install
```

以 root 身份运行的容器不需要 sudo。`mise bootstrap --only packages,tools --yes` 可在一条命令中运行相同的两个 [bootstrap](/bootstrap.html) 阶段。

如需在不安装任何内容的情况下检查配置偏差，请运行 `mise bootstrap packages status --missing`。当软件包未处于期望状态时，此命令会以状态码 1 退出。`skipped` 条目不算作缺失，因此如果所需管理器可能不可用，还应检查 `status --json` 输出中的 `"available": false`。`mise doctor` 也会对缺失的软件包发出警告。
