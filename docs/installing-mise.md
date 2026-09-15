---
description: "在 macOS、Linux 或 Windows 上安装 mise，并将其连接到你的 shell。"
---

# 安装 mise

如果你是 `mise` 的新用户，请先阅读 [入门指南](/getting-started)。

## 安装方法

选择一种安装方法，验证可执行文件，然后根据需要配置你的 shell，以实现项目自动激活。后续更新时，如果某个软件包管理器负责管理你的 mise 安装，请继续使用同一个软件包管理器。

| 平台             | 推荐方式       | 备选方式       |
| ---------------- | -------------- | -------------- |
| macOS            | mise.run       | Homebrew        |
| Linux            | mise.run       | 系统软件包     |
| Windows          | Scoop          | winget          |
| 任意平台（Rust 用户） | cargo binstall | cargo install   |
| CI/Docker        | mise.run       | GitHub Releases |

通过 `mise.run` 安装的官方单文件发布版本是 macOS 和 Linux 上的首选方法。这些二进制文件使用 mise 的优化发布配置构建，并且可以通过 `mise self-update` 立即更新。请优先使用它们，而不是第三方软件包构建版本：Homebrew 配方可能明显更慢且体积更大，并且软件包管理器中的发布版本也可能落后于 mise 的发布版本。

::: tip 哪些方法会自动更新？
软件包管理器（apt、dnf、brew、pacman 等）会在你更新系统软件包时更新 mise。官方独立安装支持 `mise self-update`；某些构建或软件包可能会禁用此功能。更新 mise 本身不同于 `mise upgrade`，后者会更新受管理的工具。

对于支持 `mise self-update` 的安装方式，可以全局启用自动更新：

```sh
mise settings auto_update=true
```

mise 随后会在符合条件的交互式命令运行前定期检查更新，在不更新插件的情况下安装较新的版本，并使用新二进制文件重新运行原始命令。使用 [`auto_update_check_duration`](/configuration/settings.html#auto_update_check_duration) 配置检查间隔。

组织可以通过设置 [`self_update.repository`](/configuration/settings.html#self_update.repository)，将手动和自动自更新指向经过筛选的 GitHub 发布镜像。私有仓库和 GitHub Enterprise 使用 mise 现有的 GitHub 令牌解析机制。镜像存档必须保留官方文件名和嵌入的 mise 签名。API URL 必须使用 HTTPS：

```toml
[settings.self_update]
repository = "myorg/mise-mirror"
api_url = "https://api.github.com"
```

这些设置仅限全局配置：请在用户全局配置或系统配置中设置，而不要在项目配置中设置。
:::

::: tip 保持 mise 为最新版本
mise 会连接许多外部注册表和后端，例如 aqua、GitHub releases、语言包注册表以及系统包管理器。这些服务会随着时间变化，因此当 CLI 保持在较新的版本时，mise 的效果最佳。

项目和组织通常应在需要较新 mise 功能时设置 [`min_version`](/configuration.html#minimum-mise-version)，而不是将每个用户锁定到特定的 mise 可执行文件。虽然有多种方法可以固定或引导使用特定的 mise 版本，但通常不建议将用户锁定到某一个 mise 版本。在受控的 CI 构建中，固定 mise 版本可能很有用，但随着上游注册表的发展，需要制定计划来更新它。`min_version` 允许项目要求某项功能，同时让用户继续使用当前的 CLI。
:::

### <https://mise.run> {#mise-run}

`mise` 不需要位于 `PATH` 中。如果你在 shell 的 rc 文件中运行激活脚本，mise 会自动将自身添加到 `PATH` 中。

```sh
curl -fsSL https://mise.run | sh
```

要选择其他可执行文件路径（其父目录必须可由你的用户写入）：

```sh
curl -fsSL https://mise.run | MISE_INSTALL_PATH="$HOME/bin/mise" sh
```

#### 按 shell 进行安装 + 激活

如需更简洁的设置，可以使用特定于 shell 的端点，它们会安装 mise，并在 shell 的配置文件中配置激活：

::: code-group

```sh [zsh]
curl -fsSL https://mise.run/zsh | sh
# Installs mise and adds activation to ~/.zshrc
```

```sh [bash]
curl -fsSL https://mise.run/bash | sh
# Installs mise and adds activation to ~/.bashrc
```

```sh [fish]
curl -fsSL https://mise.run/fish | sh
# Installs mise and adds activation to ~/.config/fish/config.fish
```

:::

这些针对 shell 的安装程序将：

- 使用与主安装程序相同的逻辑安装 mise
- 将激活配置追加到所选 shell 的配置文件（zsh 遵循 `ZDOTDIR`；fish 使用 `~/.config/fish/config.fish`）
- 如果同一 shell 安装程序的标记已经存在，则跳过追加操作

如果激活配置是手动添加的或由软件包管理器添加的，请先检查文件：安装程序的标记检查无法检测所有等效的钩子。

选项：

- `MISE_DEBUG=1` – 启用调试日志
- `MISE_QUIET=1` – 禁用非错误输出
- `MISE_INSTALL_PATH=/some/path` – 更改二进制文件路径（默认：`~/.local/bin/mise`）
- `MISE_VERSION=v2025.12.0` – 安装指定版本
- `MISE_INSTALL_SKIP_IF_EXISTS=1` – 如果安装路径中的 mise 二进制文件已经与请求的版本匹配，则跳过下载和安装

要验证安装脚本未被篡改：

```sh
gpg --keyserver hkps://keys.openpgp.org --recv-keys 24853EC9F655CE80B48E6C3A8B81C9D17413A06D
curl -fsSL -o install.sh.sig https://mise.jdx.dev/install.sh.sig
gpg --output install.sh --decrypt install.sh.sig
```

确认 GPG 报告该发布密钥的签名有效，指纹为 `24853EC9F655CE80B48E6C3A8B81C9D17413A06D`。如果下载或验证失败，请停止操作；不要运行输出文件。验证成功后：

```sh
sh ./install.sh
```

::: tip
除非你通过 `MISE_VERSION` 更改版本，否则安装脚本会固定到下载时的最新版本，并在文件中包含校验和。因此，下载脚本并将其提交到项目中，是确保所有使用该脚本安装的用户获取完全相同的 mise 二进制文件的好方法。
:::

支持的操作系统/架构：

- `macos-x64`
- `macos-arm64`
- `linux-x64`
- `linux-x64-musl`
- `linux-arm64`
- `linux-arm64-musl`
- `linux-armv7`
- `linux-armv7-musl`

如果你需要其他内容，可以使用 `cargo install mise` 编译它（见下文）。

### apk

适用于 Alpine Linux：

```sh
apk add mise
```

_mise 位于
[社区仓库](https://gitlab.alpinelinux.org/alpine/aports/-/blob/master/community/mise/APKBUILD)中。_

::: warning Alpine 默认从源代码构建的设置已弃用
Alpine 目前默认从源代码编译工具。此自动行为已弃用：受影响的源代码安装会从 mise 2026.8.0 开始发出警告，并且默认设置将在 mise 2027.8.0 中切换为预编译二进制文件。如果要继续从源代码编译，请显式设置 [`all_compile = true`](/configuration/settings.html#all_compile)。
:::

### apt

在 Ubuntu 26.04+ 上，mise 可通过 PPA 使用：

```sh
sudo add-apt-repository -y ppa:jdxcode/mise
sudo apt update
sudo apt install -y mise
```

在 Debian 11+ 和 Ubuntu 22.04+ 上，可以通过 extrepo 启用 mise 仓库：

```sh
sudo apt install -y extrepo
sudo extrepo enable mise
sudo apt update
sudo apt install -y mise
```

### pacman

适用于 Arch Linux：

```sh
sudo pacman -S mise
```

[Arch 软件包](https://archlinux.org/packages/extra/x86_64/mise/)

### Cargo

源代码构建需要满足所选发布版本的 `rust-version` 要求，以及平台的编译器和原生库先决条件。请参阅[贡献指南](/contributing.html)了解构建依赖。使用 Cargo 构建：

```sh
cargo install --locked mise
```

使用 [cargo-binstall](https://github.com/cargo-bins/cargo-binstall) 可更快完成：

```sh
cargo install --locked cargo-binstall
cargo binstall mise
```

从 main 分支的最新提交构建：

```sh
cargo install --locked mise --git https://github.com/jdx/mise --branch main
```

### dnf

#### Fedora 41+、CentOS Stream 9+、RHEL 10+

```sh
sudo dnf copr enable jdxcode/mise
sudo dnf install mise
```

#### RHEL 9 / AlmaLinux 9 / Rocky 9

RHEL 9 AppStream 目前冻结在 Rust 1.88，这比 mise 支持的最低 Rust 版本还旧。请改用 CentOS Stream 9 构建版本——生成的二进制文件可在 RHEL 9 衍生版上正常工作：

```sh
sudo dnf copr enable jdxcode/mise centos-stream+epel-next-9
sudo dnf install mise
```

[COPR 软件包页面](https://copr.fedorainfracloud.org/coprs/jdxcode/mise/)

### Snap（Linux）

```sh
sudo snap install mise --classic
```

[snapcraft.io 页面](https://snapcraft.io/mise)

### Docker

有关在 Docker 中使用 mise 的技巧，请参阅 [Docker cookbook](/mise-cookbook/docker)。

::: details 示例 Dockerfile

在 Docker 构建上下文中，将声明 `[tools]` 下 `node = "24"` 的 `mise.toml` 文件放置其中。此示例会复制该配置、安装其中的工具，并使用 `mise exec` 作为容器命令。根据实际项目需要，添加其他配置文件、锁定文件、钩子输入文件或应用程序文件。

```dockerfile
FROM debian:13-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV MISE_INSTALL_PATH=/usr/local/bin/mise
RUN curl -fsSL https://mise.run -o /tmp/install-mise.sh \
    && sh /tmp/install-mise.sh \
    && rm /tmp/install-mise.sh

WORKDIR /app
COPY mise.toml ./mise.toml
RUN mise trust && mise install

ENTRYPOINT ["mise", "exec", "--"]
CMD ["node", "--version"]
```

:::

### Homebrew

::: warning
Homebrew 配方使用方便，但不是首选的安装方式。Homebrew 会独立构建 mise，而不是使用官方、优化程度更高的发布版二进制文件。为了获得最佳性能并最快获取新版本，请改用 [`mise.run`](#mise-run) 安装程序。
:::

```sh
brew install mise
```

[Homebrew 配方](https://formulae.brew.sh/formula/mise)

### npm

mise 以预编译二进制文件的形式提供于 npm 中。它不是 Node.js 软件包——只是通过 npm 分发。这对于希望通过 `package.json` 或 `npx` 设置 mise 的 JS 项目很有用。

```sh
npm install -g mise
```

使用 npx 运行 mise，而无需将其作为永久的全局 npm 软件包添加。npm 会缓存其下载内容，并且 mise 安装的任何工具都会保留在 mise 的数据目录中：

```sh
npx --yes mise exec python@3.14 -- python --version
```

[npm 包](https://www.npmjs.com/package/mise)

旧版的 [`@jdxcode/mise`](https://www.npmjs.com/package/@jdxcode/mise) 包仍在发布。

### GitHub Releases

从 [GitHub Releases](https://github.com/jdx/mise/releases) 中选择一个版本以及匹配的操作系统/架构构件。例如，将 Linux x64 可执行文件下载到临时工作目录：

```sh
mise_version=2026.9.1
mise_platform=linux-x64
curl -fL -o mise "https://github.com/jdx/mise/releases/download/v${mise_version}/mise-v${mise_version}-${mise_platform}"
```

根据所选发布版本和平台更改这两个值。在安装前，根据该发布版本的校验和/签名元数据验证构件。`mise.run` 安装程序会为你处理平台选择和校验和检查。

验证下载的 Unix 可执行文件后，将其安装到用户可写入的路径：

```sh
mkdir -p ~/.local/bin
install -m 755 ./mise ~/.local/bin/mise
~/.local/bin/mise --version
```

### MacPorts

```sh
sudo port install mise
```

[MacPorts 端口](https://ports.macports.org/port/mise/)

### nix

对于 Nix 包管理器，版本需为 24.05 或更高：

```sh
nix-env -iA nixpkgs.mise
```

要在不进行持久安装的情况下试用 Nixpkgs 软件包，请运行 `nix-shell -p mise --run "mise --version"`。

此仓库还会在你的 flake 声明了一个指向 `github:jdx/mise` 的 `mise` 输入时，提供位于 `inputs.mise.packages.${system}.mise` 的 flake 软件包。该属性是 Nix 表达式，而不是 shell 命令。

::: warning NixOS 从源代码构建的默认设置已弃用
NixOS 目前默认从源代码编译工具。此自动行为已弃用：受影响的源代码安装会从 mise 2026.8.0 开始发出警告，并且默认设置将在 mise 2027.8.0 中切换为预编译二进制文件。请在此变更之前启用 [nix-ld](https://github.com/Mic92/nix-ld)。如果要继续从源代码编译，请显式设置 [`all_compile = true`](/configuration/settings.html#all_compile)。
:::

### yum（RHEL 8、CentOS Stream 8、Amazon Linux 2）

```sh
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://mise.jdx.dev/rpm/mise.repo
sudo yum install -y mise
```

### zypper

```sh
sudo wget https://mise.jdx.dev/rpm/mise.repo -O /etc/zypp/repos.d/mise.repo
sudo zypper refresh
sudo zypper install mise
```

### Windows - Scoop

Scoop 会通过自身的命令 shim 提供 `mise` 可执行文件。请单独配置[shell 激活](#shells)或 [mise 的工具 shim](/dev-tools/shims.html)；当前的 Scoop 清单不会将 mise 的工具 shim 目录添加到 PATH。

```sh
scoop install mise
```

[Scoop 清单](https://github.com/ScoopInstaller/Main/blob/master/bucket/mise.json)

### Windows - winget

```sh
winget install jdx.mise
```

[winget 清单](https://github.com/microsoft/winget-pkgs/tree/master/manifests/j/jdx/mise)

### Windows - Chocolatey

::: info
在选择 Chocolatey 之前，请检查 [Chocolatey 软件包](https://community.chocolatey.org/packages/mise)的版本；它可能落后于官方发布版本。
:::

```sh
choco install mise
```

### Windows - 手动安装

从 [GitHub](https://github.com/jdx/mise/releases) 下载最新发布版本，并将二进制文件添加到你的 PATH 中。

如果你的 shell 不支持 `mise activate`，请将 shim 目录（默认为 `%LOCALAPPDATA%\mise\shims`）添加到 PATH 中。

## 验证可执行文件

```sh
mise --version
mise doctor
```

对于激活前的默认 `mise.run` 安装，请使用 `~/.local/bin/mise --version` 和 `~/.local/bin/mise doctor`。如果版本不符合预期，请在 Unix 上使用 `command -v mise`，或在 PowerShell 中使用 `Get-Command mise`，检查当前运行的是哪个副本。PATH 中存在两种安装方式可能导致使用较旧的二进制文件。

## Shell

示例假设 `mise` 位于 PATH 中。对于默认的 `mise.run` 安装，请在激活配置行中改用 `~/.local/bin/mise`。在你实际使用的启动文件中添加一行激活配置；避免重复追加。

### Bash

```sh
activation='eval "$(mise activate bash)"'
grep -qxF "$activation" ~/.bashrc 2>/dev/null || printf '%s\n' "$activation" >> ~/.bashrc
```

### Zsh

```sh
zshrc="${ZDOTDIR:-$HOME}/.zshrc"
activation='eval "$(mise activate zsh)"'
mkdir -p "$(dirname "$zshrc")"
grep -qxF "$activation" "$zshrc" 2>/dev/null || printf '%s\n' "$activation" >> "$zshrc"
```

### Fish

```sh
mkdir -p ~/.config/fish
activation='mise activate fish | source'
grep -qxF "$activation" ~/.config/fish/config.fish 2>/dev/null || printf '%s\n' "$activation" >> ~/.config/fish/config.fish
```

::: tip
对于 Homebrew 和可能的其他安装方式，mise 会自动激活，因此不需要执行此步骤。

更多信息请参见 [`MISE_FISH_AUTO_ACTIVATE=1`](/configuration#mise-fish-auto-activate-1)。
:::

### PowerShell

使用 PowerShell 的 `$PROFILE` 变量获取当前主机的配置文件。如果文件不存在则创建，然后添加一次激活配置行：

```powershell
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType Directory -Force (Split-Path -Parent $PROFILE) | Out-Null
    New-Item -ItemType File -Path $PROFILE | Out-Null
}
$activation = '(&mise activate pwsh) | Out-String | Invoke-Expression'
if (-not (Select-String -Path $PROFILE -SimpleMatch $activation -Quiet)) {
    Add-Content $PROFILE $activation
}
```

如果你为终端、编辑器或 PowerShell 版本使用不同的配置文件，请参阅 [PowerShell 配置文件](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles)。

### Nushell

Nushell 会将激活内容作为生成的模块加载。将以下内容添加到 `env.nu`（位于 `$nu.env-path`），以便在解析 `config.nu` 之前使模块存在：

```nushell
let mise_path = $nu.default-config-dir | path join mise.nu
^mise activate nu | save $mise_path --force
```

将以下内容添加到 `config.nu`（位于 `$nu.config-path`）：

```nushell
use ($nu.default-config-dir | path join mise.nu)
```

保存两个文件后重启 Nushell。如果 `mise` 不在 PATH 中，请在 `env.nu` 命令中使用其绝对可执行文件路径。模块会在启动时重新生成，因此会随 mise 更新而更新。

### Xonsh

将以下内容添加到 `~/.xonshrc` 或你使用的 Xonsh 配置文件中：

```xonsh
execx($(mise activate xonsh))
```

对于 mise 尚未位于 PATH 中的默认 `mise.run` 安装，请改用 `execx($(~/.local/bin/mise activate xonsh))`。保存后重启 Xonsh。

mise 会更新 Xonsh 的环境和进程环境。如果你自己的启动代码修改了 PATH，请保持这两个视图一致，以便子进程解析到与 shell 相同的命令。

### Elvish

将以下内容添加到你的 `rc.elv`：

```shell
var mise: = (ns [&])
eval (mise activate elvish | slurp) &ns=$mise: &on-end={|ns| set mise: = $ns }
mise:activate
```

你也可以选择将 `mise` 别名为 `mise:mise`，以便无缝集成 `mise {activate,deactivate,shell}`：

```shell
edit:add-var mise~ {|@args| mise:mise $@args }
```

### 其他 shell？

添加新的 shell 并不困难，因为此项目中的 shell 代码非常少。[请参阅此处](https://github.com/jdx/mise/tree/main/src/shell)，了解其他 shell 的实现方式。如果你的 shell 当前尚不受支持，我很乐意帮助你完成集成。

## 自动补全

::: tip
某些安装方法会自动安装自动补全脚本。
:::

运行这些示例前，请加载 shell 的 rc 文件或重启 shell，以便上面添加的激活配置将 `mise` 放入 PATH。对于重新加载 shell 前的默认 `mise.run` 安装，请调用 `~/.local/bin/mise completion`，而不是 `mise completion`。

[`mise completion`](/cli/completion.html) 命令可以为你的 shell 生成自动补全脚本。

以下说明用于完成 mise 本身。对于通过 packslip 后端安装的命令，请参阅[工具补全和技能](/dev-tools/packslip-resources.html)。生成的脚本是自包含的，不需要单独的 `usage` CLI。

安装补全脚本最简单的方法是：

```shell
mise completion bash --install
```

将 `bash` 替换为你的 shell 对应的 `zsh`、`fish` 或 `powershell`。或者，自行选择路径：

::: code-group

```sh [bash]
# 这需要安装 bash-completion
mkdir -p ~/.local/share/bash-completion/completions/
mise completion bash > ~/.local/share/bash-completion/completions/mise
```

```sh [zsh]
# Generate into a directory owned by your user:
mkdir -p ~/.zfunc
mise completion zsh > ~/.zfunc/_mise
```

在现有的 `compinit` 调用之前，将 `fpath` 更新添加到 `.zshrc` 中（包括由 shell 框架执行的调用）：

```sh
fpath=(~/.zfunc $fpath)
```

如果 `.zshrc` 尚未初始化补全功能，还需添加：

```sh
autoload -Uz compinit
compinit
```

```sh [fish]
mkdir -p ~/.config/fish/completions
mise completion fish > ~/.config/fish/completions/mise.fish
```

:::

## 故障排除

如果你在安装后遇到问题，请运行：

```sh
mise doctor
```

此命令会诊断 mise 设置中的常见问题。有关更多信息，请参阅 [mise doctor](/cli/doctor)。

## 卸载

使用安装 mise 的软件包管理器移除由软件包管理器管理的 CLI。对于独立安装，请先预览移除内容：

```sh
mise implode --dry-run
```

`mise implode` 会移除 CLI、已安装的工具、缓存和状态，包括系统数据目录（如果存在）。除非传入 `--config`，否则它会保留用户配置目录。在不使用 `--dry-run` 运行之前，请检查列出的路径；这些路径可能通过环境变量进行自定义。

从 shell 启动文件中移除激活配置行，并移除你单独安装的任何补全文件。项目 `mise.toml` 文件以及通过引导安装的主机软件包与 mise 的工具数据相互独立。有关已配置的存储路径，请参阅[目录](/directories.html)。
