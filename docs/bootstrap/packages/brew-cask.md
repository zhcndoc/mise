---
description: "在 mise.toml 中声明 Homebrew cask，例如 macOS 应用和字体；无需安装 Homebrew 即可管理。"
---

# Homebrew cask

`brew-cask` 管理器无需安装 Homebrew，即可安装其 cask，主要包括 macOS 应用和字体。mise 会从 Homebrew API 读取 cask、下载其制品，并在 cask 提供 sha256 时进行校验，最后将应用包安装到 `/Applications`。

```toml
[bootstrap.packages]
"brew-cask:firefox" = "latest"
"brew-cask:visual-studio-code" = "latest"
"brew-cask:font-jetbrains-mono" = { os = ["linux", "macos"] }
```

```sh
mise bootstrap packages apply --manager brew-cask --dry-run
mise bootstrap packages apply --manager brew-cask
```

如果软件厂商提供的下载没有对应 cask，请使用 [`macos-app`](/bootstrap/packages/macos-app.html)。要安装命令行 formula，请使用 [`brew`](/bootstrap/packages/brew.html)。

## 支持的平台

`brew-cask` 可在搭载 Apple 芯片或 Intel 芯片的 macOS 上运行。在两种机器上，mise 都会将 cask 记录在 `/opt/homebrew/Caskroom` 下。Intel Mac 上该目录不同于 Intel 版 Homebrew 使用的 `/usr/local/Caskroom`，因此 mise 不会检测由 Homebrew 安装在后者中的 cask。依赖 formula 的 cask 需要 Apple 芯片，因为 `brew` 管理器在 macOS 上只安装适用于 Apple 芯片的 bottle。

### Linux 字体 Cask

在 Linux 上，`brew-cask` 只安装不含 `preflight` 或 `postflight` 步骤的字体 cask。字体会安装到 `$XDG_DATA_HOME/fonts`，其默认值为 `~/.local/share/fonts`：

```toml
[bootstrap.packages]
"brew-cask:font-heavy-data-nerd-font" = "latest"
```

`[bootstrap.packages]` 中的其他 cask 在 Linux 上会显示为 `skipped`，因此 macOS 和 Linux 可以共用一份软件包清单。显式请求安装某个不受支持的平台软件（例如 `mise bootstrap packages apply brew-cask:firefox`）会报平台不受支持的错误。为应用 cask 添加 `os = "macos"`，可以明确标注其适用平台。

## Cask 名称

使用 Homebrew 中的 cask 标识，例如 `brew-cask:firefox`。`brew-cask:homebrew/cask/firefox` 指向同一个 cask。带版本的标识（如 `temurin@17`）会将 `@` 后的部分视为名称的一部分。其他 tap 中的 cask 应使用完整名称，例如 `brew-cask:owner/tap/app`；详见[第三方 tap](/bootstrap/packages/brew.html#third-party-taps)。

## 固定版本

cask 只提供当前版本，因此 mise 无法安装指定的历史版本。若安装的版本与固定版本不同，该条目会显示为 `version mismatch`，`apply` 和 `upgrade` 会发出警告并跳过。

## 应用目录 {#overriding-the-application-directory}

与 Homebrew 一样，应用包默认安装到 `/Applications`。如需安装到其他位置（例如无需 sudo 权限的 `~/Applications`），请设置 `MISE_BREW_CASK_OPT_APPDIR`。若要每次运行都使用该目录，请在 Shell 启动文件中导出此变量：

```sh
export MISE_BREW_CASK_OPT_APPDIR="$HOME/Applications"
```

如需为某个 cask 指定其他目录，请在对应条目中设置 `appdir`。它的优先级高于环境变量，因此 macOS 要求放在 `/Applications` 的 cask 仍可安装在该位置：

```toml
[bootstrap.packages]
"brew-cask:1password" = { appdir = "/Applications" }
```

该目录必须是绝对路径，不能包含 `..`，也不能是 `/`。`appdir` 也接受以 `~/` 开头的路径。`MISE_BREW_CASK_OPT_APPDIR` 为空时表示使用 `/Applications`。原本安装到 `/Applications` 的 cask 会改装到所选目录，并保留 cask 指定的子目录；安装到 `$HOMEBREW_PREFIX/Applications` 的 cask 则仍留在原处。其行为与 `brew install --cask --appdir` 一致。

`appdir` 也适用于随该 cask 一起安装的依赖项。它只影响安装和升级，mise 不会移动已经安装的应用。如果目标 `appdir` 中已存在同名应用，首次安装会失败；除非你先[接管](#adopt-an-existing-app)该应用。

## 接管现有应用

mise 首次将 cask 安装到默认目录时，如果那里已有同名应用，mise 会替换该应用并显示警告。替换应用包可能导致 macOS[清除该应用的隐私权限](#macos-privacy-security-tcc)。若要保留现有应用，请接管它：

```toml
[bootstrap.packages]
"brew-cask:firefox" = { adopt = true }
```

如需默认接管应用，请在 `[bootstrap.brew]` 下设置 `adopt`。单个条目可通过 `adopt = false` 退出此设置：

```toml
[bootstrap.brew]
adopt = true

[bootstrap.packages]
"brew-cask:textmate" = "latest"
"brew-cask:replace-me" = { adopt = false }
```

与 `brew install --cask --adopt` 一样，mise 会先下载并校验 cask，只有现有应用的内容与下载文件完全相同时才会接管。若内容不同，安装会失败，现有应用也会保持不变。[自动更新的应用](#self-updating-apps)是例外：由于应用可能已自行更新，mise 会直接接管当前应用。

只有尚未由 mise 安装的 cask 才会应用接管设置。命令行中指定的 cask 也适用，因此你可以逐个将应用交由 mise 管理：

```sh
mise bootstrap packages apply brew-cask:firefox
```

## 自动更新的应用

在 Homebrew 中标记为 `auto_updates: true` 的 cask（如 `firefox` 和 `visual-studio-code`）会自行更新。mise 只会安装一次当前版本，之后运行 `apply` 时不会更改该应用。

只有当应用报告的已安装版本早于 cask 版本，且应用当前未运行时，`upgrade` 才会替换此类应用。否则 mise 会跳过它，交由应用自身的更新器处理。对于基于 pkg 的 cask（如 `tailscale-app`），mise 会改为比较已安装软件包的收据。该行为由 cask 定义决定，无法按条目覆盖。

状态会将这些条目标记为 `installed (auto-updates)`，`--json` 输出中也会包含 `"auto_updates": true`。显示的版本是 mise 安装的版本；应用之后可能已自行更新。

## macOS 隐私权限 {#macos-privacy-security-tcc}

mise 替换应用包时（例如升级过程中），macOS 可能会清除你授予该应用的“隐私与安全性”权限，例如“辅助功能”“屏幕录制”和“完全磁盘访问权限”。你可能需要在“系统设置”中重新授予这些权限。mise 替换已有应用时会显示警告。若要在不替换应用的情况下将手动安装的应用交由 mise 管理，请[接管该应用](#adopt-an-existing-app)。

## 支持的制品

| Cask 制品                         | macOS                                                             | Linux                  |
| --------------------------------- | ----------------------------------------------------------------- | ---------------------- |
| 应用包（`app`）                    | 安装到应用目录                                                     | 否                     |
| 二进制文件和命令包装器             | 链接到 `<prefix>/bin`                                              | 否                     |
| 字体（`font`）                     | 安装到 `~/Library/Fonts`                                           | `$XDG_DATA_HOME/fonts` |
| 安装包（`pkg`）                    | cask 列出 `pkgutil` ID 时通过 `installer` 安装                     | 否                     |
| 脚本安装器（`installer`）          | 运行，但会跳过从 stdin 读取内容的安装器                             | 否                     |
| Shell 补全                         | 链接到 prefix                                                      | 否                     |
| 通用 `artifact` 条目               | 复制到 cask 指定的目标位置                                         | 否                     |
| 手册页（`manpage`）                | 不建立链接                                                         | 不建立链接             |
| 服务及其他制品类型                 | 不支持                                                             | 不支持                 |

mise 会先安装 cask 所依赖的 formula 和其他 cask；如果声明的 cask 存在冲突，会在执行任何更改前报错。`preflight` 和 `postflight` 步骤由 mise 自行运行。pkg 安装器和需要 root 权限的步骤会通过[mise 的 sudo 处理机制](/bootstrap/packages/#sudo)执行，因此无终端运行时必须配置免密码 sudo 或以 root 身份运行，否则会直接失败，不会等待输入密码。如果 cask 需要 mise 尚未实现的制品类型或步骤，安装会报错；mise 不会退回去调用 `brew`。

## 由 Homebrew 安装的 Cask

如果 cask 是由 Homebrew 安装的，mise 会将其视为已安装并保持不变：`apply` 不执行操作，`upgrade` 会跳过它。请使用 Homebrew 升级或移除此 cask。如果 Homebrew 中的记录没有版本信息或包含多个版本，mise 会报错并说明如何在 Homebrew 中修复。

## 由 mise 安装的 Cask

mise 会在 Caskroom 中使用自己的收据记录这些 cask，不会写入 Homebrew 的 cask 元数据，因此它们始终由 mise 管理。请使用 mise 而非 Homebrew 升级或清理它们。

只要应用、字体、二进制文件和补全文件都在相应位置，该 cask 就被视为已安装。已安装应用内部发生变化（例如应用自行更新）不会导致 mise 重新安装。二进制文件或补全链接损坏或指向其他位置时，下次运行 `apply` 会重新安装；安装曾被中断时也一样。

## 升级

`mise bootstrap packages upgrade --manager brew-cask` 会为每个已配置且当前安装版本不同于 Homebrew 版本的 cask 安装最新版本。Homebrew 版本为 `latest` 的 cask 会被跳过；[自动更新的应用](#self-updating-apps)则遵循各自的规则。

## 清理

[`mise bootstrap packages prune --manager brew-cask`](/cli/bootstrap/packages/prune.html) 只会移除由 mise 安装且之后未发生变化的 cask。当前配置或 mise 跟踪的任一可信配置文件中声明的 cask 都会保留：

```sh
mise bootstrap packages prune --manager brew-cask --dry-run
```

Prune 会跳过以下项目并逐项说明原因：由 Homebrew 安装的 cask；已接管的应用和自动更新应用；包含 pkg 安装器、脚本安装器、命令包装器或通用制品的 cask；包含安装或卸载步骤的 cask；文件已更改或与其他 cask 共用文件的 cask；安装过程被中断的 cask；以及由未记录 prune 信息的旧版 mise 安装的 cask（升级刷新记录后即可清理）。Prune 不会运行 cask 的 `zap` 清理步骤。无法导入 cask。

删除 `brew-cask:` 条目不会立即卸载对应 cask；只有运行 prune 后才会卸载。

## 故障排除

| 现象                                                   | 处理方法                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `already exists and is not owned`                      | 移除现有应用后重新运行 `apply`；如果内容一致，可设置 `adopt = true`；也可以在 mise 之外管理该应用。               |
| `cannot adopt ...: existing artifact is not identical` | 已安装的应用与当前构建不同。移除它以安装 cask 提供的构建，或删除对应条目。                                      |
| `unsupported artifact type`                            | mise 无法安装此 cask。请使用 Homebrew 安装，或删除对应条目。                                                     |
| 升级后应用失去权限                                     | 在“系统设置”的“隐私与安全性”中重新授予这些权限。                                                               |
