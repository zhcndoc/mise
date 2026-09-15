---
description: "为开发机器声明并安装主机软件包。"
socialDescription: "为开发机器声明并安装主机软件包。"
---

# 引导软件包

在 `[bootstrap.packages]` 中声明共享的主机软件包，然后使用
`mise bootstrap packages apply` 或完整的 [bootstrap](/bootstrap.html) 应用它们。
将其用于原生库、构建依赖项和主机应用程序。

从你的机器所使用的管理器开始。对于 Debian 或 Ubuntu 主机：

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:build-essential" = "latest"
```

预览并应用已配置的软件包：

```sh
mise bootstrap packages status
mise bootstrap packages apply --dry-run
mise bootstrap packages apply
```

每个条目的键都是 `"manager:package"` —— 必须包含管理器前缀 ——
值是版本：`"latest"` 表示使用管理器安装的任意版本，或者在支持的情况下使用管理器原生格式的固定版本（请参阅各管理器页面）。**`"latest"` 接受已安装的版本。** 它不会在每次应用时触发升级；请使用 `mise bootstrap packages upgrade` 执行升级。

使用表格形式可以根据操作系统或操作系统/架构限制单个软件包。`os` 接受单个值或列表，并使用与 `[tools]` 相同的名称和别名（`linux`、`macos`、`windows`、`linux/x64`、`macos/arm64` 等）。省略 `version` 时默认为 `"latest"`：

```toml
[bootstrap.packages]
"brew:coreutils" = "latest"
"brew-cask:1password" = { os = "macos" }
"brew-cask:font-jetbrains-mono" = { os = ["linux", "macos"] }
"pacman:libreoffice-fresh" = { state = "absent" }
"winget:BurntSushi.ripgrep.MSVC" = { os = "windows" }
```

`pacman` 条目可以设置 `state = "absent"` 以声明式地移除软件包。
`mise bootstrap packages status --missing` 会将已安装但有该声明的软件包视为偏离状态，而 `mise bootstrap packages apply` 会将其移除。
其他内置管理器目前仅支持默认的 `state = "present"`。

`brew-cask` 条目还接受 `adopt = true`，用于接管已安装在 cask 目标位置的相同应用。设置 `bootstrap.brew.adopt = true` 可将接管设为所有 cask 的默认行为，并可通过每个 cask 的 `adopt = false` 覆盖。请参阅
[brew cask 文档](/bootstrap/packages/brew.html#casks)。

## 主机软件包还是 mise 工具

主机软件包声明可以包含版本约束（如果管理器支持），但安装内容会在项目之外共享。切换目录不会切换这些版本，mise 也不会为其创建 shim。
当你需要由每个项目选择隔离版本时，请使用 [`[tools]`](/dev-tools/)。当软件属于主机的软件包数据库或共享前缀时，请使用 `[bootstrap.packages]`。

管理器列表可通过[软件包管理器插件](./plugins.md)扩展，用于编辑器扩展和其他应用程序插件等由主机拥有的状态。

## 支持的包管理器

| 管理器        | 平台                                                         | 页面                                                |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `apk`          | Alpine Linux                                                   | [apk](/bootstrap/packages/apk.html)                 |
| `apt`          | Debian, Ubuntu                                                 | [apt](/bootstrap/packages/apt.html)                 |
| `aur`          | Arch, Manjaro with yay or paru                                 | [AUR](/bootstrap/packages/aur.html)                 |
| `dnf`          | Fedora, RHEL, CentOS, Rocky, Alma                              | [dnf](/bootstrap/packages/dnf.html)                 |
| `pacman`       | Arch, Manjaro                                                  | [pacman](/bootstrap/packages/pacman.html)           |
| `brew`         | macOS (arm64), Linux (x86_64/arm64) — **no Homebrew required** | [brew](/bootstrap/packages/brew.html)               |
| `brew-cask`    | macOS; Linux (font casks) — **no Homebrew required**           | [brew](/bootstrap/packages/brew.html)               |
| `flatpak`      | Linux with the `flatpak` CLI on `PATH` (system scope)          | [Flatpak](/bootstrap/packages/flatpak.html)         |
| `flatpak-user` | Linux with the `flatpak` CLI on `PATH` (user scope)            | [Flatpak](/bootstrap/packages/flatpak.html)         |
| `nix`          | Linux and macOS with the `nix` CLI on `PATH` (user profile)    | [Nix](/bootstrap/packages/nix.html)                 |
| `mas`          | macOS with the `mas` CLI on `PATH`                             | [mas](/bootstrap/packages/mas.html)                 |
| `winget`       | Windows with the `winget` CLI on `PATH`                        | [WinGet](/bootstrap/packages/winget.html)           |
| plugin         | Declared by the plugin                                         | [Package plugins](/bootstrap/packages/plugins.html) |

## 语义

- **默认采用声明式和增量式行为** —— 条目会作为键的并集，在
  [配置层级](/configuration.html)（全局 → 项目）之间合并。项目可以在全局列表的基础上添加软件包（并覆盖全局条目的版本固定）。更本地的配置可以使用 `state = "absent"` 覆盖 pacman 条目。清理是显式的、限定管理器范围的破坏性操作：`mise bootstrap packages prune` 默认针对 Homebrew，而插件拥有的软件包需要使用
  `mise bootstrap packages prune --manager <plugin>`。它只会移除当前配置或受信任、可加载的已跟踪配置不再需要的软件包。
- **按操作系统筛选** —— `os` 选择器不匹配的条目，以及当前机器上不可用管理器的条目，不会执行操作，因此同一份配置可跨平台使用：macOS 上会忽略 `apt` 条目，Ubuntu 上会忽略 `dnf` 条目，依此类推。`brew` 同时适用于 macOS 和 Linux；`brew-cask` 适用于 macOS，并在 Linux 上支持仅字体的 cask，但不支持生命周期钩子或结构化 flight 步骤；
  当 `flatpak` CLI 位于 `PATH` 中时，`flatpak` 和 `flatpak-user` 适用于 Linux；当 `mas` CLI 位于 `PATH` 中时，`mas` 适用于 macOS；当 `winget` CLI 位于 `PATH` 中时，`winget` 适用于 Windows。状态命令仍会列出不可用的管理器，因此不会静默隐藏任何内容。
- **仅手动安装** —— mise 从不隐式安装系统软件包。缺少软件包时，`mise install` 会打印一次性提示。显式的 `packages apply`、`packages use` 以及完整的 `mise bootstrap` 会执行安装；`packages upgrade` 会更新已安装的软件包。
- **未知管理器会被忽略并发出警告**，同时提示安装软件包插件，因此使用较新 mise 版本中管理器的配置仍然可以解析。

## 命令

### 应用或记录软件包

```sh
mise bootstrap packages status --json
mise bootstrap packages status --missing
mise bootstrap packages apply --manager apt --dry-run
mise bootstrap packages apply --manager apt
mise bootstrap packages apply --update

mise bootstrap packages use apt:curl
mise bootstrap packages use -g brew:ffmpeg
mise bootstrap packages use winget:BurntSushi.ripgrep.MSVC
```

不带软件包参数的 `apply` 会读取活动配置。像 `mise bootstrap packages apply apt:curl` 这样的显式请求可以安装软件包但不记录它。需要保留软件包声明时，请使用 `use`。
`--update` 会根据管理器刷新元数据；`--yes` 会跳过 mise 的确认提示，但不会提供 sudo 凭据。

`mise bootstrap packages use` 是针对系统软件包的 `mise use`：它会将 `"manager:package" = "version"` 条目写入 `mise.toml`（默认写入本地文件，使用 `-g` 时写入全局文件），并安装所有缺失的软件包。
当前机器上不可用管理器的条目会被写入但不安装 —— 共享配置就是这样获取在 Mac 上编写的 `apt:` 行的。

### 查找已安装的软件包

使用 `mise bootstrap packages where brew:unzip` 可打印已安装 Homebrew formula 的稳定绝对 `opt` 根目录。该命令目前支持 macOS arm64 和 Linux x86_64/arm64 上的 brew formula，包括 keg-only formula：

```sh
if package_root="$(mise bootstrap packages where brew:unzip)"; then
  export PATH="$package_root/bin:$PATH"
fi
```

请使用规范的 formula 名称：不会解析别名。像 `brew:homebrew/core/unzip` 或 `brew:owner/tap/unzip` 这样的限定输入会查询同一个本地 `unzip` rack，而不会检查 tap 来源。不需要声明或 Homebrew 可执行文件。缺失或无效的安装会以空标准输出失败；请单独使用 `mise bootstrap packages apply brew:unzip` 安装，或按照诊断信息恢复 opt 链接。

此本地查询只读取环境变量和全局 CLI 选项中的设置。项目/全局配置和 `.miserc.toml`、其中的可执行模板、自动更新以及启动维护操作都不在其查找路径中。有关命名、输出和升级语义，请参阅[formula 根目录](/bootstrap/packages/brew.html#locate-an-installed-formula)。

### 导入和清理

```sh
mise bootstrap packages import --manager brew --dry-run
mise bootstrap packages import --manager brew
mise bootstrap packages prune --manager brew --dry-run
```

在不使用 `--dry-run` 运行之前，请检查清理计划。Formula 清理可能包括由 Homebrew 自身安装的软件，而不仅仅是由 mise 安装的软件。

`mise bootstrap packages import --manager brew` 是 Homebrew formula 的反向操作：它读取活动 Homebrew 的 `opt` 链接，并将请求的 formula 以 `"brew:<formula>" = "latest"` 的形式写入 `[bootstrap.packages]`。默认情况下，它只导入 keg 收据中标记为按请求安装的 formula；传递 `--all` 还会包含依赖 formula。之后的清理运行会保留已导入的 formula，因为它们现在已在配置中声明。

`mise bootstrap packages prune --manager brew` 会移除当前配置或受信任、可加载的已跟踪配置不再需要的已链接 brew formulae。这包括由真实的 Homebrew 安装的 formulae。它是 mise 的声明式清理命令，精神上类似于
[Homebrew Bundle 清理](https://docs.brew.sh/Manpage)，而不是 Homebrew 已移除的旧上游
`brew prune` 命令。

`mise bootstrap packages prune --manager brew-cask` 只会移除由 mise 所有、具有当前安装时收据且内容指纹未发生变化的直接产物。它会跳过旧收据、由 Homebrew 所有的 cask、pkg 和命令包装器产物、具有生命周期操作的 cask、已更改或共享的目标，以及不完整的事务。跳过操作会附带原因，并且绝不会应用 `zap` 元数据。

对于软件包插件管理器，清理只会考虑 mise 在 `PackageInstall` 期间观察到从缺失状态转变为已安装状态的软件包。现有或手动安装的软件包绝不会被接管。插件必须实现 `PackageUninstall`；试运行会打印批准的移除批次而不调用钩子，并且 mise 会在更新其所有权状态前使用 `PackageInstalled` 验证移除结果。

### 升级已安装的软件包

```sh
mise bootstrap packages upgrade --manager apt --dry-run
mise bootstrap packages upgrade --manager apt
mise bootstrap packages upgrade --manager winget
```

`mise bootstrap packages upgrade` 会刷新软件包管理器元数据，并将已配置且已安装的软件包升级到最新可用版本 —— apk、apt 和 dnf 还会遵循配置中固定的版本
（[AUR](/bootstrap/packages/aur.html)、[pacman](/bootstrap/packages/pacman.html)、
brew、brew-cask、flatpak、flatpak-user 和 mas 无法安装固定版本，因此固定条目会被跳过并发出警告）。尚未安装的软件包会被跳过 —— 这是 `mise bootstrap packages apply` 的工作。对于 brew，这会获取 formula 当前的 bottle 并替换旧 keg；对于 brew-cask，这会安装当前的 cask 产物；对于 flatpak 和 flatpak-user，这会在各自的作用域中更新已配置的应用程序和运行时；对于 mas，这会运行 `mas upgrade`；对于 winget，这会为每个已配置且已安装的软件包运行精确 ID 的 `winget upgrade`。

`mise doctor` 也会报告已配置的系统包，并在有任何缺失时发出警告。

## 选择要运行的管理器

默认情况下，mise 会操作当前机器上所有已配置且可用的管理器。可用性会检查支持的平台和必需的命令；它并不是选择一个首选管理器。例如，如果 Linux 主机同时存在 apt 声明和 mise 的内置 Homebrew 管理器声明，则两者都可以使用。

如果多个管理器都可能适用 —— 一台机器上安装了多个软件包管理器，或共享配置列出了你不想在此处使用的管理器 —— 请使用 [`system_packages.managers`](/configuration/settings.html#system_packages.managers) 设置选择一个子集：

```toml
[settings]
system_packages.managers = ["apt"]
```

你也可以使用上面所示的每个软件包的 `os` 选择器。若要将选择放入 `mise.macos.toml` 或 `mise.linux.toml`，请通过 `-E`/`MISE_ENV` 激活该配置环境，或启用
[`auto_env`](/configuration/environments.html#platform-environments)；文件名本身目前不会激活该环境。

## sudo

apk、apt、dnf 和 pacman 管理器需要 root 权限才能更改软件包。mise 会在必要时使用 sudo。AUR 帮助程序以当前用户身份构建，并自行处理软件包安装提权；Flatpak 用户安装不需要 root。
当登录 shell 设置必须编辑 `/etc/shells` 时，也会使用相同的 mise sudo 路径：

- 已经是 root（容器、CI）：不使用 sudo，直接运行命令
- 交互式终端：例如 `sudo apt-get install ...`，并显示普通的 sudo 提示
- 在没有免密码 sudo 的非交互环境中：mise 会报错并打印需要手动运行的确切命令 —— 它绝不会挂起等待密码
- 在所有情况下，运行前都会记录完整的命令行

设置 [`system_packages.sudo = false`](/configuration/settings.html#system_packages.sudo) 可完全禁止提权；mise 会打印命令供你自行运行。
Homebrew formula 安装可能需要提权以创建其规范前缀；cask 安装程序也可能需要为其产物提权（请参阅 [brew](/bootstrap/packages/brew.html)）。
软件包插件绝不会使用 mise 的 sudo 路径，也绝不能自行提权。

## CI 用法

在容器中，你通常已经是 root，因此不会出现提示：

```sh
mise bootstrap packages apply --yes
mise install
```

[`mise bootstrap --yes`](/bootstrap.html) 会将两者合并（并在定义了名为
`bootstrap` 的任务时随后运行该任务）——只需一个命令即可设置全新的机器或容器。

当软件包缺失时，`mise bootstrap packages status --missing` 会退出并返回 1，因此可以方便地在不安装任何内容的情况下进行 CI 检查。如果所需管理器可能不可用，也请检查 JSON 状态：被跳过的声明并不能证明其软件包已安装。

Nix 声明也可以通过 `mise bootstrap packages export --format nix`[导出为 NixOS 模块](./nix.md#export-to-nixos)。使用
`mise bootstrap packages use --no-install` 可在不检查或安装软件包的情况下写入声明；此标志适用于每个软件包管理器。
