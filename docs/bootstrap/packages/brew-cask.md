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
| App bundles (`app`)               | Installed into the application directory                          | No                     |
| Binaries and command wrappers     | Linked into `<prefix>/bin`                                        | No                     |
| Fonts (`font`)                    | Installed into `~/Library/Fonts`                                  | `$XDG_DATA_HOME/fonts` |
| Installer packages (`pkg`)        | Installed with `installer`, when the cask lists its `pkgutil` IDs | No                     |
| Script installers (`installer`)   | Run, except installers that read from stdin                       | No                     |
| Shell completions                 | Linked into the prefix                                            | No                     |
| Generic `artifact` entries        | Copied to the target the cask names                               | No                     |
| Manual pages (`manpage`)          | Not linked                                                        | Not linked             |
| Services and other artifact types | Not supported                                                     | Not supported          |

mise installs a cask's formula and cask dependencies first, and a declared
cask conflict fails before anything changes. It runs a cask's `preflight` and
`postflight` steps itself. Pkg installers and steps that need root go through
[mise's sudo handling](/bootstrap/packages/#sudo), so a run without a terminal
needs passwordless sudo or root, and fails instead of waiting for a password. A
cask that needs an artifact type or step mise does not implement fails with an
error; mise never falls back to running `brew`.

## Casks installed by Homebrew

If Homebrew installed a cask, mise counts it as installed and leaves it alone:
`apply` does nothing and `upgrade` skips it. Use Homebrew to upgrade or remove
it. If Homebrew's records for the cask show no version or several, mise stops
with an error that tells you how to repair them in Homebrew.

`status --json` 会区分这些软件包与 mise 管理的软件包。每个已安装的软件包都有 `managed_by` 字段：mise 交由 Homebrew 管理的为 `"homebrew"`，由 mise 安装和升级的为 `"mise"`，无法确定时为 `"unknown"`。该字段不表示应用是否会[自行更新](#self-updating-apps)；此信息由 `auto_updates` 单独报告。

## Casks mise installed

mise 会在 Caskroom 中使用自己的收据记录这些软件包，默认不会写入 Homebrew 的 cask 元数据，因此它们仍由 mise 管理。请使用 mise 而不是 Homebrew 来升级或清理它们。Homebrew 不会识别这些软件包：`brew upgrade` 和 `brew outdated` 会跳过它们，`brew doctor` 则会报告其 Caskroom 目录没有有效元数据。

### 交由 Homebrew 升级 {#let-homebrew-upgrade-them}

如果你同时使用 Homebrew，并希望通过 `brew upgrade` 管理所有 cask，请在 `[bootstrap.brew]` 下设置 `homebrew_metadata`：

```toml
[bootstrap.brew]
homebrew_metadata = true
```

mise 安装 cask 后，会写入 Homebrew 所需的元数据文件（`.metadata/<version>/<timestamp>/Casks/<token>.json`，内容为 `{}`，与 Homebrew 通过 API 加载的 cask 相同），并在旁边写入 `INSTALL_RECEIPT.json`。这样 `brew info` 会显示安装时间，并表明该 cask 是你主动安装的，而不是作为依赖安装的。Homebrew 会从 API 读取 cask 定义，并从 Caskroom 目录名获取已安装版本，因此 `brew upgrade`、`brew outdated` 和 `brew doctor` 都会像处理 Homebrew 安装的软件包一样处理它。

这会将 cask 的管理权交给 Homebrew，详见[由 Homebrew 安装的 cask](#casks-installed-by-homebrew)：从此 mise 不再管理它，`apply`、`upgrade` 和 `prune` 都会跳过。mise 之前安装的 cask 会在下次 `apply` 时补上元数据。第三方 tap 中的 cask 仍由 mise 管理，因为 Homebrew 记录的只有 token，并会到 `homebrew/cask` 中查找它。安装在默认应用目录之外的 cask（通过 `appdir` 条目或 `MISE_BREW_CASK_OPT_APPDIR` 设置）也仍由 mise 管理，因为 `brew upgrade` 会将其重新安装到 `/Applications`。该设置仅适用于 Apple 芯片 Mac，因为 mise 和 Homebrew 共用 Caskroom；并且要求 Homebrew 版本不低于 6.0.22。较旧版本在收据中没有卸载步骤时，会从未经签名的端点获取卸载步骤（参见 [GHSA-rg9r-ppxp-87hm](https://github.com/Homebrew/brew/security/advisories/GHSA-rg9r-ppxp-87hm)），因此 mise 在这些版本上不会交出管理权。

A cask counts as installed while its app, font, binary, and completion files
are in place. Changes inside an installed app, such as a self-update, do not
make mise reinstall it. A broken or retargeted binary or completion link does,
on the next `apply`. So does an install that was interrupted.

## Upgrade

`mise bootstrap packages upgrade --manager brew-cask` installs the current
version of each configured cask whose installed version differs from
Homebrew's. Casks whose Homebrew version is `latest` are skipped, and
[self-updating apps](#self-updating-apps) follow their own rules.

## Prune

[`mise bootstrap packages prune --manager brew-cask`](/cli/bootstrap/packages/prune.html)
removes only casks that mise installed and that are unchanged since. It keeps
every cask declared in the current configuration or any trusted config file
mise tracks:

```sh
mise bootstrap packages prune --manager brew-cask --dry-run
```

Prune 会跳过以下项目并逐项说明原因：由 Homebrew 安装的 cask；已接管的应用和自动更新应用；包含 pkg 安装器、脚本安装器、命令包装器或通用制品的 cask；包含安装或卸载步骤的 cask；文件已更改或与其他 cask 共用文件的 cask；安装过程被中断的 cask；以及由未记录 prune 信息的旧版 mise 安装的 cask（升级刷新记录后即可清理）。Prune 不会运行 cask 的 `zap` 清理步骤。无法导入 cask。

如果 prune 仅因 mise 无法确认 cask 未更改而跳过它（例如会自行更新的应用，或包含安装步骤的 cask），请传入 `--force` 移除：

```sh
mise bootstrap packages prune --manager brew-cask --force
```

Prune 会列出因上述原因跳过、但传入 `--force` 后会移除的 cask。强制清理会移除 mise 记录安装的应用、二进制文件、字体和补全文件（但不会移除当前已指向其他位置的链接），以及 cask 的 Caskroom 目录。cask 自身安装步骤创建的内容（例如特权辅助程序或启动代理）会保留。`--force` 不会移除由 Homebrew 安装的 cask、没有 mise 收据的 cask、中断的安装，或与其他 cask 共用的文件。

Deleting a `brew-cask:` entry does not uninstall the cask until you prune.

## 故障排除

| 现象                                                   | 处理方法                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `already exists and is not owned`                      | 移除现有应用后重新运行 `apply`；如果内容一致，可设置 `adopt = true`；也可以在 mise 之外管理该应用。               |
| `cannot adopt ...: existing artifact is not identical` | 已安装的应用与当前构建不同。移除它以安装 cask 提供的构建，或删除对应条目。                                      |
| `unsupported artifact type`                            | mise 无法安装此 cask。请使用 Homebrew 安装，或删除对应条目。                                                     |
| 升级后应用失去权限                                     | 在“系统设置”的“隐私与安全性”中重新授予这些权限。                                                               |
