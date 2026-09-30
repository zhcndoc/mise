---
description: "使用 mise bootstrap 为开发机器声明、安装和维护共享的主机软件包。"
socialDescription: "从 mise.toml 管理原生库、构建依赖和主机应用程序。"
---

# 引导软件包

在 `[bootstrap.packages]` 中声明整台机器共享的原生库、构建依赖和应用程序，然后使用 `mise bootstrap packages apply` 显式应用它们，或通过完整的 [`mise bootstrap`](/bootstrap.html) 与工具一起安装。

## 开始使用

选择机器使用的软件包管理器。对于 Debian 或 Ubuntu 主机，请将以下内容添加到 `mise.toml`：

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:build-essential" = "latest"
```

检查已安装内容，预览更改，然后应用它们：

```sh
mise bootstrap packages status
mise bootstrap packages apply --dry-run
mise bootstrap packages apply
```

`"manager:package"` 中必须包含管理器前缀，值是版本。**`"latest"` 接受已安装的版本。** 应用配置时会安装缺失的软件包，但不会在每次运行时升级它们；请使用 [`mise bootstrap packages upgrade`](#升级已安装的软件包) 执行升级。

## 主机软件包还是 mise 工具

对于属于主机软件包数据库或共享安装前缀的软件，请使用 `[bootstrap.packages]`。这些安装在项目之间共享：切换目录不会切换其版本，mise 也不会为它们创建 shim。

当每个项目需要各自选择工具版本时，请使用 [`[tools]`](/dev-tools/)。一个项目可以同时使用两者，例如用 `[tools]` 管理编译器，用 `[bootstrap.packages]` 管理原生开发库。

## 支持的软件包管理器

`"manager:package"` 中的管理器前缀是必需的。各管理器页面说明其前置条件、软件包名称和版本支持：

| 管理器         | 平台和要求                                                       | 指南                                                |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| `apk`          | Alpine Linux                                                     | [apk](/bootstrap/packages/apk.html)                 |
| `apt`          | Debian、Ubuntu                                                   | [apt](/bootstrap/packages/apt.html)                 |
| `aur`          | 使用 yay 或 paru 的 Arch、Manjaro                                | [AUR](/bootstrap/packages/aur.html)                 |
| `dnf`          | Fedora、RHEL、CentOS、Rocky、Alma                                | [dnf](/bootstrap/packages/dnf.html)                 |
| `zypper`       | 使用 `zypper` 和 `rpm` 的 openSUSE、SUSE Linux Enterprise         | [zypper](/bootstrap/packages/zypper.html)           |
| `pacman`       | Arch、Manjaro                                                    | [pacman](/bootstrap/packages/pacman.html)           |
| `brew`         | macOS arm64；Linux x86_64/arm64；无需安装 Homebrew               | [Homebrew](/bootstrap/packages/brew.html)           |
| `brew-cask`    | macOS；Linux 上的纯字体 cask；无需安装 Homebrew                  | [Cask](/bootstrap/packages/brew.html#casks)         |
| `macos-app`    | macOS；声明下载 URL 和校验和                                     | [直接下载应用](#没有-cask-时的-macos-应用)          |
| `flatpak`      | `PATH` 中有 `flatpak` 的 Linux；系统作用域                       | [Flatpak](/bootstrap/packages/flatpak.html)         |
| `flatpak-user` | `PATH` 中有 `flatpak` 的 Linux；用户作用域                       | [Flatpak](/bootstrap/packages/flatpak.html)         |
| `nix`          | `PATH` 中有 `nix` 的 Linux 和 macOS；用户 profile                 | [Nix](/bootstrap/packages/nix.html)                 |
| `mas`          | `PATH` 中有 `mas` 的 macOS                                      | [Mac App Store](/bootstrap/packages/mas.html)       |
| `scoop`        | `PATH` 中有 Scoop 的 `scoop` shim 的 Windows                      | [Scoop](/bootstrap/packages/scoop.html)             |
| `winget`       | `PATH` 中有 `winget` 的 Windows                                  | [WinGet](/bootstrap/packages/winget.html)           |
| 软件包插件     | 由各插件定义                                                     | [软件包插件](/bootstrap/packages/plugins.html)     |

[软件包管理器插件](/bootstrap/packages/plugins.html)可以添加编辑器扩展和应用插件等其他主机软件包。在 Linux 上，`brew-cask` 仅支持没有生命周期钩子或结构化 flight 步骤的字体 cask；请参阅 [cask 指南](/bootstrap/packages/brew.html#casks)。

## 声明软件包

条目的值可以是版本字符串，也可以是选项表：

```toml
[bootstrap.packages]
"brew:coreutils" = "latest"
"brew-cask:1password" = { os = "macos" }
"brew-cask:font-jetbrains-mono" = { os = ["linux", "macos"] }
"winget:BurntSushi.ripgrep.MSVC" = { os = "windows" }
```

表格形式中，`version` 默认为 `"latest"`。版本固定使用管理器的原生格式，并且只有管理器支持时才有效。[`macos-app`](#没有-cask-时的-macos-应用) 需要显式版本和额外的下载字段。

### 选择平台

使用 `os` 将软件包限制在某个操作系统或操作系统/架构组合。它接受单个值或列表，名称和别名与 `[tools]` 相同，例如 `linux`、`macos`、`windows`、`unix`、`linux/x64` 和 `macos/arm64`。

选择器不匹配的条目会被跳过。应用完整配置时，当前机器上不可用的管理器也会被跳过。状态仍会列出不可用的管理器，让你区分被跳过的软件包和已安装的软件包。有关整台机器的选择，请参阅[选择要运行的管理器](#选择要运行的管理器)。

### 声明式移除软件包

`pacman`、`scoop` 和 `zypper` 支持 `state = "absent"`：

```toml
[bootstrap.packages]
"pacman:libreoffice-fresh" = { state = "absent" }
"scoop:neovim" = { state = "absent" }
```

如果软件包已安装，`status --missing` 会报告偏离状态，而 `apply` 会将其移除。一个例外是仅安装在 Scoop 全局作用域中的应用，它不属于 mise 管理的用户作用域。`apply` 会移除批次中的其他 Scoop 条目，然后因该条目需要提升权限而失败，并打印应运行的 `scoop uninstall --global` 命令。请参阅 [Scoop 的可用性和作用域](/bootstrap/packages/scoop.html#availability-and-scope)。

其他内置管理器目前只支持默认的 `state = "present"`。从配置中移除条目本身不会卸载软件包；请参阅[导入和清理](#导入和清理)。

### 接管现有的 Homebrew cask 应用

对于 `brew-cask`，设置 `adopt = true` 可保留现有应用，而不是替换它。通常，其内容必须与下载的应用匹配。声明 `auto_updates: true` 的 cask 可以接管不同的应用，因为应用可能已经自行更新。

设置 `[bootstrap.brew] adopt = true` 可为所有 cask 启用接管，并可使用每个条目的 `adopt = false` 覆盖。示例请参阅 [cask 接管指南](/bootstrap/packages/brew.html#casks)。直接的 [`macos-app` 下载](#接管现有的应用)有更严格的接管规则，Homebrew 的默认行为不适用于它们。

## 语义

- **声明式且增量式** —— 软件包声明会在[配置层级](/configuration.html)中合并。项目可以向全局列表添加软件包，或使用相同键覆盖版本和 `state`；未被覆盖的其他声明仍保留在合并列表中。
- **安装是显式的** —— `mise install` 只会针对缺失的主机软件包打印一次性提示，不会安装它们。请运行 `mise bootstrap packages apply`、`mise bootstrap packages use` 或完整的 `mise bootstrap` 进行安装。
- **未知管理器会发出警告**并提示安装软件包插件；其条目会被忽略，因此配置可以包含当前 mise 尚不支持的管理器。
- **保持拼写一致** —— WinGet 软件包 ID 和 Scoop 应用名称不区分大小写，Scoop bucket 前缀也不会区分已安装的应用。如果活动声明为同一软件包指定了不同版本或状态，mise 会报告错误。请只声明一次软件包，或使用相同拼写让正常的配置层级覆盖生效。被 `os` 或 `env` 选择器排除的条目不参与此检查。

## 命令

### 应用或记录软件包

```sh
mise bootstrap packages status --json
mise bootstrap packages status --missing
mise bootstrap packages apply --manager apt --dry-run
mise bootstrap packages apply --manager apt
mise bootstrap packages apply --update
```

不带软件包参数的 `apply` 会读取活动配置。像 `mise bootstrap packages apply apt:curl` 这样的显式请求可以安装软件包但不记录它。`macos-app:<name>` 请求必须已经在配置中有对应的下载声明。

`--update` 会在应用更改前刷新软件包元数据。`--yes` 会跳过 mise 的确认提示，但不会提供 sudo 凭据。

要记录并安装软件包，请使用 `use`：

```sh
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

使用 `--no-install` 可在不检查或安装软件包的情况下写入声明；此标志适用于每个软件包管理器。

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
版本固定仍受管理器能力限制。例如，apk、apt、dnf 和 zypper 遵循配置中的固定版本；AUR、pacman、brew、brew-cask、flatpak、flatpak-user 和 mas 无法安装固定版本，因此固定条目会被跳过并发出警告。[`scoop`](/bootstrap/packages/scoop.html) 可以安装固定版本但无法锁定它们，因此 `upgrade` 会跳过 Scoop 的固定条目。详情请参阅相应管理器指南。

对于 `macos-app`，不会发现版本：请自行更新声明，再应用或升级。请参阅[更新已声明的应用](#更新已声明的应用)。

## 没有 cask 时的 macOS 应用

如果供应商下载或内部应用没有 Homebrew cask，请使用 `macos-app`。如果存在合适的 cask，优先使用 `brew-cask`，它会为你提供下载元数据并跟踪版本。

### 声明下载

添加包含全部四个必需字段的表。以下示例使用占位 URL 和校验和，请替换为应用的实际值：

```toml
[bootstrap.packages."macos-app:example"]
version = "1.2.3"
url = "https://example.com/Example-{{version}}-arm64.dmg"
sha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
artifact = "Example.app"
os = "macos/arm64"
```

| 字段       | 含义                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`  | 要安装的明确版本，不支持 `latest`。                                                                                                                   |
| `url`      | 压缩包下载 URL。`{{version}}` 会替换为声明的版本。拒绝 `.git` URL，因为无法通过 `sha256` 验证克隆结果。                                             |
| `sha256`   | 压缩包的 SHA-256 校验和，必须恰好包含 64 个十六进制字符。不接受 Homebrew 的 `no_check` 值。                                                          |
| `artifact` | 要从压缩包安装的应用程序 bundle，例如 `Example.app`。                                                                                               |

请选择适合 Mac 架构的下载；上面的可选 `os` 选择器将示例限制为 Apple Silicon。请尽量使用 HTTPS。非 HTTPS URL 会产生警告，但仍然必须校验和验证。

预览并安装已声明的应用：

```sh
mise bootstrap packages apply macos-app:example --dry-run
mise bootstrap packages apply macos-app:example
```

mise 会验证压缩包校验和，并使用 cask 安装器将应用安装到 `/Applications`。此管理器支持 `.dmg` 和 `.zip` 压缩包中的应用 bundle，不支持 `pkg` 安装程序、命令行二进制文件或字体。要选择其他应用目录，请使用 [`MISE_BREW_CASK_OPT_APPDIR`](/bootstrap/packages/brew.html#overriding-the-application-directory)。收据保存在 mise 的状态目录中，与 Homebrew 的 Caskroom 分开。

### 接管现有的应用

如果目标位置已有不属于此条目的应用，安装默认会被拒绝。要在不替换 bundle 的情况下接管相同应用，请在声明中添加：

```toml
adopt = true
```

mise 会将已安装的 bundle 与下载内容比较。如果两者不同，接管会失败并保持现有应用不变。若要安装不同的构建版本，请先移除现有应用。

接管会记录所有权，并授权 mise 之后替换该应用。如果应用由 Homebrew 或其他管理器安装，请在让 mise 管理后续更新前协调该管理器的记录。独立的收据不会阻止两个管理器针对同一应用。

保留现有 bundle 可以避免替换应用后再次授予 macOS“隐私与安全性”权限。这比默认的 `brew-cask` 行为更严格，后者在替换现有应用前只会发出警告。

中断安装后，如果应用没有完成的所有权收据，也同样需要显式接管。仅有待处理事务不会建立所有权。更改 `artifact` 或应用目录也会要求 mise 重新评估新目标的所有权。

如果 mise 正在暂存自己的 bundle 时目标位置出现应用，也会以同样方式拒绝，并保持不变：

```
macos-app: '/Applications/Example.app' was created by something else while this
app was being staged; it was left untouched
```

dry-run 会警告目标存在未拥有的应用，但无法判断接管是否成功，因为它尚未下载压缩包来比较内容。

### 更新已声明的应用

每个版本都要更新 `version` 和 `sha256`；如果 URL 不使用 `{{version}}`，或供应商更改了 URL 格式，也要更新 `url`。然后运行：

```sh
mise bootstrap packages apply macos-app:example
```

如果应用已经安装，`upgrade` 也可以安装新声明的版本。两个命令都不会从普通下载 URL 中发现版本。声明不变且已安装版本匹配时，没有需要应用的更新。

## 选择要运行的管理器

默认情况下，mise 会操作当前机器上所有已配置且可用的管理器。可用性会检查支持的平台和必需的命令；它并不是选择一个首选管理器。例如，如果 Linux 主机同时存在 apt 声明和 mise 的内置 Homebrew 管理器声明，则两者都可以使用。

如果多个管理器都可能适用 —— 一台机器上安装了多个软件包管理器，或共享配置列出了你不想在此处使用的管理器 —— 请使用 `--manager` 为单个命令选择管理器，或使用 [`system_packages.managers`](/configuration/settings.html#system_packages.managers) 设置选择一个子集：

```toml
[settings]
system_packages.managers = ["apt"]
```

你也可以使用上面所示的每个软件包的 `os` 选择器。若要将选择放入 `mise.macos.toml` 或 `mise.linux.toml`，请通过 `-E`/`MISE_ENV` 激活该配置环境，或启用
[`auto_env`](/configuration/environments.html#platform-environments)；文件名本身目前不会激活该环境。

## sudo

apk、apt、dnf、pacman 和 zypper 管理器需要 root 权限才能更改软件包。mise 会在必要时使用 sudo。AUR 帮助程序以当前用户身份构建，并自行处理软件包安装提权；Flatpak 用户安装不需要 root。
当登录 shell 设置必须编辑 `/etc/shells` 时，也会使用相同的 mise sudo 路径：

- 已经是 root（容器、CI）：不使用 sudo，直接运行命令
- 交互式终端：例如 `sudo apt-get install ...`，并显示普通的 sudo 提示
- 在没有免密码 sudo 的非交互环境中：mise 会报错并打印需要手动运行的确切命令 —— 它绝不会挂起等待密码
- 在所有情况下，运行前都会记录完整的命令行

设置 [`system_packages.sudo = false`](/configuration/settings.html#system_packages.sudo) 可完全禁止提权；mise 会打印命令供你自行运行。
Homebrew formula 安装可能需要提权以创建其规范前缀；cask 安装程序也可能需要为其产物提权（请参阅 [brew](/bootstrap/packages/brew.html)）。
软件包插件绝不会使用 mise 的 sudo 路径，也绝不能自行提权。

## CI 用法

先安装主机软件包，再安装项目工具。在容器中，你通常已经是 root，因此不会出现 sudo 提示：

```sh
mise bootstrap packages apply --yes
mise install
```

[`mise bootstrap --yes`](/bootstrap.html) 会将两者合并（并在定义了名为
`bootstrap` 的任务时随后运行该任务）——只需一个命令即可设置全新的机器或容器。

当软件包缺失时，`mise bootstrap packages status --missing` 会退出并返回 1，因此可以方便地在不安装任何内容的情况下进行 CI 检查。如果所需管理器可能不可用，也请检查 JSON 状态：被跳过的声明并不能证明其软件包已安装。

Nix 声明也可以通过 `mise bootstrap packages export --format nix`[导出为 NixOS 模块](./nix.md#export-to-nixos)。使用
`mise bootstrap packages use --no-install` 可在不检查或安装软件包的情况下写入声明；此标志适用于每个软件包管理器。
在容器中以 root 身份运行时，这些命令无需 sudo 提示。`mise doctor` 也会报告已配置的主机软件包，并在有缺失时发出警告。对于 NixOS，可以使用 `mise bootstrap packages export --format nix` [导出模块](/bootstrap/packages/nix.html#export-to-nixos)。
