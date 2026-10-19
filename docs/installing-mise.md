---
description: "在 macOS、Linux 或 Windows 上安装 mise，验证可执行文件并保持更新。"
---

# 安装 mise

根据平台选择安装方式，确认可执行文件正常后，再[设置 Shell](/shell-setup.html)。首次配置项目请参阅[开始使用](/getting-started.html)。

## 选择安装方式 {#installation-methods}

| 平台     | 推荐方式                                                             | 其他方式                                                                                                                  |
| -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| macOS    | [mise.run](#mise-run)                                              | [Homebrew](#homebrew)、[MacPorts](#macports)、[packslip](#packslip)（Apple silicon）                                     |
| Linux    | [mise.run](#mise-run)                                              | [packslip](#packslip)、[apt](#apt)、[dnf](#dnf)、[pacman](#pacman)、[apk](#apk)、[其他方式](#linux)                       |
| Windows  | [winget](#windows-winget)                                          | [PowerShell 脚本](#windows-script)、[Scoop](#windows-scoop)、[Chocolatey](#windows-chocolatey)、[packslip](#packslip) |
| CI       | [mise-action 或已提交的包装脚本](/continuous-integration.html)     |                                                                                                                         |
| Docker   | [官方镜像](/mise-cookbook/docker.html)                             |                                                                                                                         |

mise.run、packslip 和 [GitHub Releases](#github-releases) 会安装官方发行版二进制文件。这些文件使用 mise 优化过的发行配置构建，并可通过 `mise self-update` 更新。包管理器构建的版本可能落后于官方发行版；Homebrew 公式的构建速度也可能明显更慢，产物更大。

每台机器只使用一种安装方式。如果 `PATH` 中存在两个安装位置，实际运行的可能是较旧版本；请参阅[验证可执行文件](#verify-the-executable)。

## 官方发行版二进制文件 {#recommended}

### 安装脚本（mise.run）{#mise-run}

```sh
curl -fsSL https://mise.run | sh
```

脚本会将可执行文件安装到 `~/.local/bin/mise`。该目录无需预先位于 `PATH` 中：[启用 mise](/shell-setup.html)后，mise 会自行将其目录加入 `PATH`。若要指定其他路径（其父目录必须允许当前用户写入）：

```sh
curl -fsSL https://mise.run | MISE_INSTALL_PATH="$HOME/bin/mise" sh
```

未设置 `MISE_VERSION` 时，脚本会选择至少在 24 小时前发布的最新稳定版本。如果安装路径中已有相同或更新版本的可执行文件，脚本会保留它。若要确保安装结果可复现，请设置 `MISE_VERSION`：

```sh
curl -fsSL https://mise.run | MISE_VERSION=v2026.10.4 sh
```

脚本会从 mise.jdx.dev 下载发行版压缩包。如果 mise.jdx.dev 上没有该版本或无法访问，脚本会改从 [GitHub Releases](https://github.com/jdx/mise/releases) 下载。校验和不会从 mise.jdx.dev 获取。与脚本一同发布的版本使用嵌入脚本中的校验和；其他 `MISE_VERSION` 则使用 GitHub Releases 中的 `SHASUMS256.txt` 进行校验。如果脚本无法获取校验和，或压缩包校验不匹配，就会停止安装。

#### 一步完成安装和激活 {#shell-specific-installation-activation}

针对特定 Shell 的安装地址会安装 mise，并将激活语句追加到对应的启动文件中：

::: code-group

```sh [zsh]
curl -fsSL https://mise.run/zsh | sh
# adds activation to ${ZDOTDIR:-$HOME}/.zshrc
```

```sh [bash]
curl -fsSL https://mise.run/bash | sh
# adds activation to ~/.bashrc
```

```sh [fish]
curl -fsSL https://mise.run/fish | sh
# adds activation to ~/.config/fish/config.fish
```

:::

如果文件中已存在对应的标记注释，脚本会跳过追加。它们无法识别你或包管理器以其他方式添加的激活语句，因此如果之前已配置激活，请先检查文件。

#### 安装脚本选项 {#installer-options}

脚本读取以下环境变量，而非 TOML 设置：

| 变量                                   | 作用                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MISE_INSTALL_PATH`                    | 可执行文件路径，默认为 `~/.local/bin/mise`。                                                                                                                    |
| `MISE_VERSION`                         | 要安装的发行版，例如 `v2026.10.4`。设置后会跳过发行时间延迟。                                                                                                  |
| `MISE_SELF_UPDATE_MINIMUM_RELEASE_AGE` | 跳过新于指定时间的版本：整数加 `s`、`m`、`h`、`d` 或 `w`，例如 `7d`；`0s` 表示不延迟。未设置时依次回退到 `MISE_MINIMUM_RELEASE_AGE` 和 `24h`。                 |
| `MISE_INSTALL_SKIP_IF_EXISTS`          | 设为 `1` 时，如果安装路径中的可执行文件已是所选版本，则跳过下载。                                                                                               |
| `MISE_INSTALL_MUSL`                    | 设为 `1` 时，安装静态 musl 构建版本。                                                                                                                          |
| `MISE_INSTALL_OS`、`MISE_INSTALL_ARCH` | 覆盖自动检测的平台，例如设为 `MISE_INSTALL_ARCH=x64` 可在 Apple silicon 上安装 Intel 构建版本。架构值追加 `-musl` 可安装 musl 版本。                            |
| `MISE_INSTALL_EXT`                     | 归档格式，可选 `tar.zst` 或 `tar.gz`。检测到 `zstd` 时默认为 `tar.zst`。                                                                                       |
| `MISE_INSTALL_FROM_GITHUB`             | 设为 `1` 时，仅从 GitHub Releases 下载，不会先尝试 mise.jdx.dev。                                                                                                 |
| `MISE_INSTALL_HELP`                    | 设为 `0` 时，安装后不显示激活提示。                                                                                                                             |
| `MISE_DEBUG`、`MISE_QUIET`             | 设为 `1` 时，分别显示调试信息或仅显示错误。                                                                                                                     |

#### 验证安装脚本 {#verify-the-install-script}

运行脚本前，可以先检查它的签名：

```sh
gpg --keyserver hkps://keys.openpgp.org --recv-keys 24853EC9F655CE80B48E6C3A8B81C9D17413A06D
curl -fsSL -o install.sh.sig https://mise.jdx.dev/install.sh.sig
gpg --output install.sh --decrypt install.sh.sig
```

确认 GPG 报告该签名有效，且签名密钥指纹为 `24853EC9F655CE80B48E6C3A8B81C9D17413A06D`。如果下载或验证失败，请停止操作，不要运行输出文件。验证通过后再执行：

```sh
sh ./install.sh
```

#### 支持的平台 {#supported-platforms}

此脚本支持安装以下构建版本：

- `macos-x64`
- `macos-arm64`
- `linux-x64`
- `linux-x64-musl`
- `linux-arm64`
- `linux-arm64-musl`
- `linux-armv7`
- `linux-armv7-musl`

除了这些版本，[GitHub Releases](#github-releases) 还提供 `windows-x64` 和 `windows-arm64`。

`linux-x64`、`linux-arm64` 和 `linux-armv7` 构建版本采用动态链接，需要 glibc 2.18 或更新版本。`-musl` 构建版本是静态链接，不依赖 glibc；可用于 Alpine Linux 等 musl 系统，也可用于 glibc 版本较旧的系统。

在 musl 系统上，脚本会选择 musl 构建版本。在 glibc 系统上，脚本会直接选择 glibc 构建版本，不检查 glibc 版本；如果 glibc 早于 2.18，请手动选择 musl 构建版本：

```sh
curl -fsSL https://mise.run | MISE_INSTALL_MUSL=1 sh
```

::: details 提高 glibc 最低版本的规则

mise 提高 glibc 最低版本前，仍使用更旧版本的所有发行版都必须已结束厂商标准支持。Ubuntu ESM、RHEL ELS 和 SUSE LTSS 等延长支持计划不会延长这一期限。这些系统的用户可以改用静态 musl 构建版本。

下表列出了部分发行版的标准支持结束日期：

| glibc  | 发行版                                                  | 标准支持结束时间                          |
| ------ | ------------------------------------------------------ | ---------------------------------------- |
| ≤ 2.27 | RHEL 7, Ubuntu 16.04 / 18.04, Debian 9, Amazon Linux 2 | ended (last: Amazon Linux 2, 2026-06-30) |
| 2.28   | Debian 10                                              | ended 2024-06-30                         |
| 2.28   | RHEL 8, Rocky 8, AlmaLinux 8                           | 2029-05-31                               |
| 2.31   | Ubuntu 20.04, Debian 11                                | ended (last: Debian 11, 2026-08-31)      |
| 2.34   | Amazon Linux 2023                                      | 2029-06-30                               |
| 2.34   | RHEL 9, Rocky 9, AlmaLinux 9                           | 2032-05-31                               |
| 2.35   | Ubuntu 22.04                                           | 2027-06-01                               |

当前最低要求仍为 glibc 2.18。这些日期用于规划未来的兼容性调整，并不代表具体的发行时间表。表中未列出的发行版也遵循相同的支持规则。

:::

其他平台请参阅[使用 Cargo 从源码构建](#cargo)。

### packslip {#packslip}

[packslip](https://packslip.dev) 无需运行 mise 安装脚本，即可安装经过签名的上游发行版。它会根据 mise 的 GitHub 仓库验证 Sigstore 签名和透明日志记录，检查归档文件的摘要与大小，并从完整归档中提供 `mise` 可执行文件。

Linux x64 或 arm64、macOS arm64、Windows x64 或 arm64 请使用 packslip 1.5.1 或更新版本。Intel Mac 需要使用其他安装方式。

请通过 packslip 的签名 [APT 或 RPM 仓库](https://packslip.dev/docs/distributions/)或其[入门指南](https://packslip.dev/docs/getting-started/)中的其他方式安装 packslip，然后安装 mise：

```sh
packslip install github.com/jdx/mise --pin ps1_nlhmwtfeufglxv5myvwvronk7a
~/.local/bin/mise --version
```

packslip 会输出命令的安装路径：普通 Unix 用户为 `~/.local/bin/mise`，root 用户为 `/usr/local/bin/mise`。它不会更改 `PATH` 或 Shell 配置文件。

`--pin` 是 mise GitHub 仓库的指纹，因此即使该仓库更名或其他仓库使用了原名称，packslip 仍只接受 mise 自己发布的版本。如果不使用 `--pin`，packslip 会在首次使用时信任 GitHub 为该名称返回的仓库，并在该机器后续安装时继续使用它。

不指定 `--version` 或使用 `--version latest` 时，packslip 会安装当前稳定版本。若要安装指定版本：

```sh
packslip install github.com/jdx/mise --version 2026.10.4 \
  --pin ps1_nlhmwtfeufglxv5myvwvronk7a
```

此安装方式支持 `mise self-update`；重新运行 `packslip install` 会将 mise 替换为指定版本。packslip 不会自动更新自身或 mise。有关系统级安装、目标路径覆盖和信任设置，请参阅 [packslip 安装指南](https://packslip.dev/docs/bootstrap/)；有关固定 packslip 并让 mise 持续更新，请参阅 [Docker 页面](/mise-cookbook/docker.html#bootstrap-with-packslip)。

## macOS {#macos}

在 macOS 上推荐使用[安装脚本](#mise-run)。

### Homebrew {#homebrew}

```sh
brew install mise
```

Homebrew 使用自身配置从源码构建 mise；[mise.run](#mise-run) 提供的官方二进制文件速度更快，也会更早发布。该公式会安装 Shell 补全，并自动在 fish 中启用 mise。
[Homebrew 公式](https://formulae.brew.sh/formula/mise)

### MacPorts {#macports}

```sh
sudo port install mise
```

[MacPorts 移植包](https://ports.macports.org/port/mise/)

## Linux {#linux}

在 Linux 上推荐使用[安装脚本](#mise-run)。以下软件包会随系统的其他软件一同更新。

### apt {#apt}

在 Debian 11+ 和 Ubuntu 22.04+ 上，使用 extrepo 启用 mise 仓库：

```sh
sudo apt install -y extrepo
sudo extrepo enable mise
sudo apt update
sudo apt install -y mise
```

在 Ubuntu 26.04+ 上，也可以改用 PPA：

```sh
sudo add-apt-repository -y ppa:jdxcode/mise
sudo apt update
sudo apt install -y mise
```

### dnf {#dnf}

mise 位于 [jdxcode/mise COPR](https://copr.fedorainfracloud.org/coprs/jdxcode/mise/) 仓库中。

#### Fedora 43+、RHEL 10、CentOS Stream 10 及其重构版本 {#dnf-fedora}

```sh
sudo dnf copr enable jdxcode/mise
sudo dnf install mise
```

#### RHEL 9、CentOS Stream 9、AlmaLinux 9 和 Rocky 9 {#dnf-el9}

RHEL 9 自带的 Rust 版本过旧，无法构建 mise，因此请启用适用于这些系统的 CentOS Stream 9 构建版本。不指定 chroot 名称时，`dnf copr enable` 会查找并不存在的 `epel-9` 构建版本：

```sh
sudo dnf copr enable jdxcode/mise centos-stream+epel-next-9
sudo dnf install mise
```

### yum（RHEL 8 及衍生发行版）{#yum}

```sh
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://mise.jdx.dev/rpm/mise.repo
sudo yum install -y mise
```

### zypper {#zypper}

```sh
sudo wget https://mise.jdx.dev/rpm/mise.repo -O /etc/zypp/repos.d/mise.repo
sudo zypper refresh
sudo zypper install mise
```

### pacman {#pacman}

在 Arch Linux 上运行：

```sh
sudo pacman -S mise
```

[Arch Linux 软件包](https://archlinux.org/packages/extra/x86_64/mise/)

### apk {#apk}

在 Alpine Linux 上，mise 位于 [community 仓库](https://gitlab.alpinelinux.org/alpine/aports/-/blob/master/community/mise/APKBUILD)：

```sh
apk add mise
```

::: warning Alpine 上默认从源码构建的行为已弃用
在 Alpine 上，mise 默认从源码构建工具。自 2026.8.0 起会对此显示警告，并将在 2027.8.0 中改为默认使用预编译二进制文件。若要继续从源码构建，请设置 [`all_compile = true`](/configuration/settings.html#all_compile)。
:::

### Nix {#nix}

使用 nixpkgs 24.05 或更新版本：

```sh
nix-env -iA nixpkgs.mise
```

若要试用而不进行持久安装，请运行 `nix-shell -p mise --run "mise --version"`。

mise 仓库也提供 flake：

```nix
inputs.mise.url = "github:jdx/mise";
# then add inputs.mise.packages.${system}.mise to your packages
```

::: warning NixOS 上默认从源码构建的行为已弃用
在 NixOS 上，mise 默认从源码构建工具。自 2026.8.0 起会对此显示警告，并将在 2027.8.0 中改为默认使用预编译二进制文件；这些文件需要 [nix-ld](https://github.com/Mic92/nix-ld)。若要继续从源码构建，请设置 [`all_compile = true`](/configuration/settings.html#all_compile)。
:::

### Snap {#snap-linux}

```sh
sudo snap install mise --classic
```

[snapcraft.io 上的 mise 页面](https://snapcraft.io/mise)

## Windows {#windows}

在 Windows 上推荐使用 winget。安装后，请按照[设置 Windows Shell](/shell-setup.html#windows)中的说明，为 [PowerShell 启用激活](/shell-setup.html#powershell)；也可以将 shims 目录加入 cmd.exe 的 `Path`。

### winget {#windows-winget}

```powershell
winget install jdx.mise
```

[winget 清单](https://github.com/microsoft/winget-pkgs/tree/master/manifests/j/jdx/mise)

### PowerShell 脚本 {#windows-script}

```powershell
irm https://mise.run/powershell | iex
```

该脚本只需要 PowerShell 5.1 或更新版本，无需 POSIX Shell。它会将官方发行版安装到 `~\.local\bin`，并把 `mise-shim.exe` 放在 `mise.exe` 旁边；安装前会使用 GitHub Releases 发布的 `SHASUMS256.txt` 校验 zip 文件。脚本会将该目录添加到当前用户的 `Path`（无需管理员权限）。再次运行即可升级 mise。在 MSYS2 或 Git Bash 中，请通过
`powershell.exe -NoProfile -Command "irm https://mise.run/powershell | iex"`.

| 变量                       | 作用                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `MISE_VERSION`             | 安装指定版本，而非最新版本                                   |
| `MISE_INSTALL_PATH`        | `mise.exe` 的路径（默认为 `~\.local\bin\mise.exe`）         |
| `MISE_INSTALL_MODIFY_PATH` | 设为 `0` 时不修改当前用户的 `Path`                           |
| `MISE_INSTALL_SHIMS_PATH`  | 设为 `1` 时也将 shims 目录添加到当前用户的 `Path`            |
| `MISE_INSTALL_FROM_GITHUB` | 设为 `1` 时从 GitHub Releases 下载，而不是 mise.jdx.dev       |

### Scoop {#windows-scoop}

```powershell
scoop install mise
```

Scoop 会通过自己的命令 shim 将 `mise` 加入 `Path`，但不会添加 mise 的工具 shims 目录，因此请另外配置激活或 shims。
[Scoop 清单](https://github.com/ScoopInstaller/Main/blob/master/bucket/mise.json)

### Chocolatey {#windows-chocolatey}

```powershell
choco install mise
```

[Chocolatey 软件包](https://community.chocolatey.org/packages/mise)可能落后于官方发行版；选择前请先检查其版本。

### Windows 手动安装 {#windows-manual}

从 [GitHub Releases](https://github.com/jdx/mise/releases) 下载 `mise-v<version>-windows-x64.zip`（或 `windows-arm64`）以及 `SHASUMS256.txt`。在 PowerShell 中输出 zip 文件的哈希值：

```powershell
(Get-FileHash mise-v2026.10.4-windows-x64.zip -Algorithm SHA256).Hash
```

哈希值必须与 `SHASUMS256.txt` 中 `./mise-v2026.10.4-windows-x64.zip` 对应的值一致；PowerShell 会以大写形式输出哈希值。如果已安装 `minisign`，也可以按照[手动下载](#github-releases)一节中的说明验证 `SHASUMS256.txt` 的签名。然后解压 `mise\bin` 目录，其中包含 `mise.exe` 和 `mise-shim.exe`，并将该目录加入 `Path`。请将这两个文件放在一起：mise 会复制 `mise-shim.exe` 来创建 shims。

## 语言包管理器 {#language-package-managers}

### Cargo {#cargo}

从源码构建需要符合该发行版 `rust-version` 要求的 Rust 工具链，以及平台对应的编译器和原生库。详见[构建依赖项](/contributing.html#build-dependencies)。

```sh
cargo install --locked mise
```

[cargo-binstall](https://github.com/cargo-bins/cargo-binstall) 可以安装预构建的二进制文件，无需编译：

```sh
cargo install --locked cargo-binstall
cargo binstall mise
```

若要构建 `main` 分支上的最新提交：

```sh
cargo install --locked mise --git https://github.com/jdx/mise --branch main
```

### npm {#npm}

`mise` npm 包分发的是预编译二进制文件，并非 Node.js 库。它适用于通过
`package.json` 或 `npx` 配置 mise 的 JavaScript 项目。请安装 `mise`，不要安装旧的
`@jdxcode/mise` 包。

```sh
npm install -g mise
```

npx 无需全局安装 npm 包即可运行 mise。npm 会缓存下载内容；mise 安装的工具仍会照常放在 mise 的数据目录中：

```sh
npx --yes mise exec python@3.14 -- python --version
```

[npm 软件包](https://www.npmjs.com/package/mise)

## 容器 {#docker}

官方镜像发布在 `ghcr.io/jdx/mise` 和 Docker Hub（`jdxcode/mise`），支持 Linux amd64
和 arm64。可将 `-debian` 标签用作 CI 或开发镜像，也可以通过 `COPY --from=` 从
scratch 镜像复制静态二进制文件。镜像标签、摘要固定和 Dockerfile 示例请参阅
[Docker 文档](/mise-cookbook/docker.html)。

## 手动下载 {#github-releases}

在 [GitHub Releases](https://github.com/jdx/mise/releases) 中选择发行版本和对应平台的文件。以下示例将 Linux x64 可执行文件下载到当前目录：

```sh
mise_version=2026.10.4
mise_platform=linux-x64
curl -fL -o mise "https://github.com/jdx/mise/releases/download/v${mise_version}/mise-v${mise_version}-${mise_platform}"
```

每个发行版本还会提供 `SHASUMS256.txt`，并使用 minisign
（`SHASUMS256.txt.minisig`）和 GPG（`SHASUMS256.asc`）签名。先验证校验和文件的签名，再用该文件检查下载内容。以下命令需要安装 `minisign` 和 `sha256sum`（在 macOS 上将 `sha256sum -c` 替换为 `shasum -a 256 -c`），并沿用上文的变量和 `mise` 文件：

```sh
base="https://github.com/jdx/mise/releases/download/v${mise_version}"
curl -fL -O "$base/SHASUMS256.txt" -O "$base/SHASUMS256.txt.minisig"
minisign -Vm SHASUMS256.txt -P RWTC3g8W3z4RZK3V3qv7fa1QY4JEWyBtqIHW+85QlJpZc5yG+uNYNBSZ &&
  grep " ./mise-v${mise_version}-${mise_platform}$" SHASUMS256.txt | sed 's| ./mise-.*| mise|' | sha256sum -c
```

仓库中的 [`minisign.pub`](https://github.com/jdx/mise/blob/main/minisign.pub) 是 minisign 公钥。接下来将可执行文件安装到当前用户有写入权限的目录：

```sh
mkdir -p ~/.local/bin
install -m 755 ./mise ~/.local/bin/mise
~/.local/bin/mise --version
```

## 验证可执行文件 {#verify-the-executable}

```sh
mise --version
mise doctor
```

启用 Shell 激活前，默认的 mise.run 安装需要通过
`~/.local/bin/mise --version` 和 `~/.local/bin/mise doctor` 运行。如果显示的版本并非刚安装的版本，请在 Unix 上运行 `command -v mise`，或在 PowerShell 中运行 `Get-Command mise`，检查实际执行的是哪个副本。

mise 会将工具、缓存和状态保存在主目录下；如需更改位置，请参阅[目录](/directories.html)。其他问题请参阅[故障排除](/troubleshooting.html)。

## Shell 设置 {#shells}

如需在 bash、zsh、fish、PowerShell、Nushell、Xonsh 或 Elvish 中启用 mise，或安装 Shell 补全，请参阅 [Shell 设置](/shell-setup.html)。

## 更新 mise {#updating}

如果通过包管理器安装了 mise，请使用该包管理器更新。否则运行
[`mise self-update`](/cli/self-update.html)；除非传入 `--no-plugins`，它也会更新已安装的插件。`mise upgrade` 更新的是工具，而不是 mise 本身。

若要自动更新，请在全局配置中启用
[`self_update.auto`](/configuration/settings.html#self_update.auto)：

```sh
mise settings self_update.auto=true
```

随后 mise 会按
[`self_update.check_duration`](/configuration/settings.html#self_update.check_duration)
设置的间隔检查新版本；也可以将 `true` 替换为指定间隔，例如
`mise settings self_update.auto=1d`。发现新版本时，mise 会在符合条件的交互式命令运行前安装更新，然后用新二进制文件重新运行该命令。在 CI、离线模式、非交互式会话，以及打包方禁用了自我更新的安装中，mise 会跳过检查。

`mise self-update` 和自动更新会跳过发布未满
[`self_update.minimum_release_age`](/configuration/settings.html#self_update.minimum_release_age)
时长的版本；未设置时会回退到 [`minimum_release_age`](/security.html#minimum-release-age)。运行 `mise self-update 2026.10.4` 可不受此延迟限制，直接安装指定版本。替换二进制文件前，mise 会验证发行版本的签名；验证内容详见
[packslip 验证说明](/dev-tools/packslip-verification.html#self-update)。

组织可以通过镜像分发经批准的发行版本，配置
[`self_update.repository`](/configuration/settings.html#self_update.repository)
和 [`self_update.api_url`](/configuration/settings.html#self_update.api_url) 即可。
镜像必须保留官方发行文件名和签名，且 `api_url` 必须使用 HTTPS。对于私有仓库和 GitHub Enterprise，mise 会按其[令牌解析规则](/dev-tools/github-tokens.html)查找 GitHub 令牌。请在全局或系统配置中设置这些选项；mise 会忽略项目配置中的设置：

```toml [~/.config/mise/config.toml]
[settings.self_update]
repository = "myorg/mise-mirror"
api_url = "https://github.example.com/api/v3"
```

mise 会与注册表和发行版 API 通信，这些接口会随时间变化，因此请保持 mise 为较新版本。如果项目需要较新版本的 mise，请设置
[`min_version`](/configuration.html#minimum-mise-version)，不要为所有人固定同一个 mise 版本。发行版打包方可以禁用 `mise self-update`，并引导用户通过包管理器更新；详见[打包 mise](/packaging.html)。

## 卸载 {#uninstalling}

使用安装 mise 的软件包管理器移除由软件包管理器管理的 CLI。对于独立安装，请先预览移除内容：

```sh
mise implode --dry-run
```

`mise implode` 会移除 CLI、已安装的工具、缓存和状态数据（包括存在时的系统数据目录）。除非传入 `--config`，否则会保留用户配置目录。正式运行前，请检查预览列出的路径；环境变量可能会改变这些路径。

然后从 Shell 启动文件中移除激活语句，并删除已安装的补全文件。项目中的 `mise.toml` 和通过机器初始化安装的主机软件包不属于 mise 的数据，会继续保留。数据存储路径请参阅[目录](/directories.html)。
