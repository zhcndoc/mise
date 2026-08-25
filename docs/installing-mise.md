# 安装 Mise

如果你是 `mise` 的新用户，请先阅读 [入门指南](/getting-started)。

## 安装方法

本页面列出了在系统上安装 `mise` 的多种方式。

| 平台             | 推荐方式       | 备选方式       |
| ---------------- | -------------- | -------------- |
| macOS            | mise.run       | Homebrew        |
| Linux            | mise.run       | 系统软件包     |
| Windows          | Scoop          | winget          |
| 任意平台（Rust 用户） | cargo binstall | cargo install   |
| CI/Docker        | mise.run       | GitHub Releases |

通过 `mise.run` 安装的官方单文件发布版本是 macOS 和 Linux 上的首选方法。这些二进制文件使用 mise 的优化发布配置构建，并且可以通过 `mise self-update` 立即更新。请优先使用它们，而不是第三方软件包构建版本：Homebrew 配方可能明显更慢且体积更大，并且软件包管理器中的发布版本也可能落后于 mise 的发布版本。

::: tip 哪些方法会自动更新？
软件包管理器（apt、dnf、brew、pacman 等）会在你更新系统软件包时更新 mise。其他方法可以使用 `mise self-update` 更新。

对于支持 `mise self-update` 的安装方式，可以全局启用自动更新：

```sh
mise settings set auto_update true
```

随后，mise 会在符合条件的交互式命令执行前定期检查更新，在不更新插件的情况下安装较新的版本，然后使用新的二进制文件重新运行原始命令。使用 [`auto_update_check_duration`](/configuration/settings.html#auto_update_check_duration) 配置检查间隔。
:::

::: tip 保持 mise 为最新版本
mise 会连接许多外部注册表和后端，例如 aqua、GitHub releases、语言包注册表以及系统包管理器。这些服务会随着时间变化，因此当 CLI 保持在较新的版本时，mise 的效果最佳。

项目和组织通常应在需要更高版本的 mise 功能时设置 [`min_version`](/configuration.html#minimum-mise-version)，而不是将每个用户都锁定到某个特定的 mise 可执行文件。虽然有方法可以固定或引导安装特定版本的 mise，但一般不建议将用户锁定在某一个 mise 版本。将 mise 版本固定回旧版，就像阻止 `apt update` 或 `brew update` 刷新包元数据一样：它可能隐藏弃用提示，并导致与上游集成（如 aqua-registry）出现陈旧失效。除非经过漫长的弃用流程，否则会避免破坏性变更，因此保持最新通常风险较低。
:::

### <https://mise.run> {#mise-run}

请注意，`mise` 不必位于 `PATH` 中。如果你在 shell 的 rc 文件中运行激活脚本，mise 会自动将自己添加到 `PATH`。

```sh
curl https://mise.run | sh
```

或者使用选项

```sh
curl https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh
```

#### 按 shell 进行安装 + 激活

为了获得更简洁的设置，你可以使用针对特定 shell 的端点，它会安装 mise，并在你的 shell 配置文件中自动配置激活：

::: code-group

```sh [zsh]
curl https://mise.run/zsh | sh
# 安装 mise 并将激活配置添加到 ~/.zshrc
```

```sh [bash]
curl https://mise.run/bash | sh
# 安装 mise 并将激活配置添加到 ~/.bashrc
```

```sh [fish]
curl https://mise.run/fish | sh
# 安装 mise 并将激活配置添加到 ~/.config/fish/config.fish
```

:::

这些针对 shell 的安装程序将：

- 使用与主安装程序相同的逻辑安装 mise
- 自动检测你的 shell 配置文件
- 如果激活行尚未存在，则添加它
- 如果已经配置过，则跳过添加激活（可安全多次运行）

选项：

- `MISE_DEBUG=1` – 启用调试日志
- `MISE_QUIET=1` – 禁用非错误输出
- `MISE_INSTALL_PATH=/some/path` – 更改二进制文件路径（默认：`~/.local/bin/mise`）
- `MISE_VERSION=v2025.12.0` – 安装指定版本
- `MISE_INSTALL_SKIP_IF_EXISTS=1` – 如果安装路径中的 mise 二进制文件已经与请求的版本匹配，则跳过下载和安装

如果你想验证安装脚本没有被篡改：

```sh
gpg --keyserver hkps://keys.openpgp.org --recv-keys 24853EC9F655CE80B48E6C3A8B81C9D17413A06D
curl https://mise.jdx.dev/install.sh.sig | gpg --decrypt > install.sh
# 确保上面的内容是使用 mise 发布密钥签名的
sh ./install.sh
```

::: tip
只要你不使用 `MISE_VERSION` 更改版本，安装脚本就会固定为下载时的最新版本，并在文件内包含校验和。这样，把该文件下载下来并放入项目中，就能很好地确保任何使用该脚本安装的人都会获取完全相同的 mise 二进制文件。
:::

支持的 os/arch：

- `macos-x64`
- `macos-arm64`
- `linux-x64`
- `linux-x64-musl`
- `linux-arm64`
- `linux-arm64-musl`
- `linux-armv6`
- `linux-armv6-musl`
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

在 Debian 11+ 和 Ubuntu 22.04+ 上，可以使用 extrepo 启用 mise 仓库：

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

使用 Cargo 从源码构建：

```sh
cargo install --locked mise
```

使用 [cargo-binstall](https://github.com/cargo-bins/cargo-binstall) 可更快完成：

```sh
cargo install cargo-binstall
cargo binstall mise
```

从 main 分支的最新提交构建：

```sh
cargo install mise --git https://github.com/jdx/mise --branch main
```

### dnf

#### Fedora 41+、CentOS Stream 9+、RHEL 10+

```sh
dnf copr enable jdxcode/mise
dnf install mise
```

#### RHEL 9 / AlmaLinux 9 / Rocky 9

RHEL 9 AppStream 目前冻结在 Rust 1.88，这比 mise 支持的最低 Rust 版本还旧。请改用 CentOS Stream 9 构建版本——生成的二进制文件可在 RHEL 9 衍生版上正常工作：

```sh
dnf copr enable jdxcode/mise centos-stream+epel-next-9
dnf install mise
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

```dockerfile
FROM debian:13-slim

RUN apt-get update \
    && apt-get -y --no-install-recommends install sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
RUN curl https://mise.run | sh
RUN mise trust -a && mise install
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

mise 可作为预编译二进制文件在 npm 上获取。这不是一个 Node.js 包——只是通过 npm 分发。这对希望通过 `package.json` 或 `npx` 来设置 mise 的 JS 项目很有用。

```sh
npm install -g mise
```

如果你只是想在单个命令中测试，而不想完整安装，可以使用 npx：

```sh
npx mise exec python@3.11 -- python some_script.py
```

[npm 包](https://www.npmjs.com/package/mise)

旧版的 [`@jdxcode/mise`](https://www.npmjs.com/package/@jdxcode/mise) 包仍在发布。

### GitHub Releases

从 [GitHub](https://github.com/jdx/mise/releases) 下载最新发布版本。

```sh
curl -L https://github.com/jdx/mise/releases/download/v2025.12.0/mise-v2025.12.0-linux-x64 > /usr/local/bin/mise
chmod +x /usr/local/bin/mise
```

### MacPorts

```sh
sudo port install mise
```

[MacPorts 端口](https://ports.macports.org/port/mise/)

### nix

对于 Nix 包管理器，版本需为 24.05 或更高：

```sh
nix-env -iA mise
```

你也可以直接使用
`mise-flake.packages.${system}.mise` 导入该包。它支持所有默认的 Nix
系统。

::: warning NixOS 从源代码构建的默认设置已弃用
NixOS 目前默认从源代码编译工具。此自动行为已弃用：受影响的源代码安装会从 mise 2026.8.0 开始发出警告，并且默认设置将在 mise 2027.8.0 中切换为预编译二进制文件。请在此变更之前启用 [nix-ld](https://github.com/Mic92/nix-ld)。如果要继续从源代码编译，请显式设置 [`all_compile = true`](/configuration/settings.html#all_compile)。
:::

### yum（RHEL 8、CentOS Stream 8、Amazon Linux 2）

```sh
yum install -y yum-utils
yum-config-manager --add-repo https://mise.jdx.dev/rpm/mise.repo
yum install -y mise
```

### zypper

```sh
sudo wget https://mise.jdx.dev/rpm/mise.repo -O /etc/zypp/repos.d/mise.repo
sudo zypper refresh
sudo zypper install mise
```

### Windows - Scoop

这是在 Windows 上安装 mise 的推荐方式。它会自动将你的 shims 添加到 PATH。

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
Chocolatey 版本目前已过时。
:::

```sh
choco install mise
```

### Windows - 手动安装

从 [GitHub](https://github.com/jdx/mise/releases) 下载最新发布版本，并将二进制文件添加到你的 PATH 中。

如果你的 shell 不支持 `mise activate`，你需要编辑 PATH，将 shims 目录包含进去（默认：`%LOCALAPPDATA%\mise\shims`）。

## Shell

### Bash

```sh
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
```

### Zsh

```sh
echo 'eval "$(mise activate zsh)"' >> "${ZDOTDIR-$HOME}/.zshrc"
```

### Fish

```sh
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

::: tip
对于 Homebrew 以及其他一些安装方式，mise 会自动激活，因此
这一步不是必需的。

更多信息请参见 [`MISE_FISH_AUTO_ACTIVATE=1`](/configuration#mise-fish-auto-activate-1)。
:::

### PowerShell

::: warning
请查看 [about_Profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles) 文档，以找到你实际的配置文件位置。
如果父目录不存在，你需要先创建它。
:::

```powershell
echo '(&mise activate pwsh) | Out-String | Invoke-Expression' >> $HOME\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

### Nushell

Nu
不[支持 `eval`](https://www.nushell.sh/book/how_nushell_code_gets_run.html#eval-function)，
可以通过追加到 `env.nu` 和 `config.nu` 来安装 mise：

```nushell
'
let mise_path = $nu.default-config-dir | path join mise.nu
^mise activate nu | save $mise_path --force
' | save $nu.env-path --append
"\nuse ($nu.default-config-dir | path join mise.nu)" | save $nu.config-path --append
```

如果你更希望保持点文件整洁，可以将其保存到其他目录，然后
更新 `$env.NU_LIB_DIRS`：

```nushell
"\n$env.NU_LIB_DIRS ++= ($mise_path | path dirname | to nuon)" | save $nu.env-path --append
```

### Xonsh

由于 `.xsh` 文件[不会被编译](https://github.com/xonsh/xonsh/issues/3953)，你可以通过使用纯 Python 导入来节省一点启动时间：例如，将下面的代码添加到 `~/.config/xonsh/mise.py` 配置文件中，并在 `~/.config/xonsh/rc.xsh` 中 `import mise`：

```python
from pathlib import Path
from xonsh.built_ins import XSH

ctx = XSH.ctx
mise_init = subprocess.run([Path('~/bin/mise').expanduser(),'activate','xonsh'],capture_output=True,encoding="UTF-8").stdout
XSH.builtins.execx(mise_init,'exec',ctx,filename='mise')
```

或者继续使用 `rc.xsh`/`.xonshrc`：

```sh
echo 'execx($(~/bin/mise activate xonsh))' >> ~/.config/xonsh/rc.xsh # 或 ~/.xonshrc
```

鉴于 `mise` 会同时替换 shell 环境变量 `$PATH` 和操作系统环境变量 `PATH`，请注意你的配置
不要把这两个值设置得不同（你可能需要在配置末尾加上
`throw os.environ['PATH'] = xonsh.built_ins.XSH.env.get_detyped('PATH')`，以确保它们一致）

### Elvish

将以下内容添加到你的 `rc.elv`：

```shell
var mise: = (ns [&])
eval (mise activate elvish | slurp) &ns=$mise: &on-end={|ns| set mise: = $ns }
mise:activate
```

可选地将 `mise` 别名为 `mise:mise`，以便无缝集成 `mise {activate,deactivate,shell}`：

```shell
edit:add-var mise~ {|@args| mise:mise $@args }
```

### 其他 shell？

添加一个新的 shell 一点也不难，因为这个项目中很少有 shell 代码。
[点击这里](https://github.com/jdx/mise/tree/main/src/shell)了解其他 shell 是如何实现的。如果你的 shell 目前不受支持，
我很乐意帮你把它集成进去。

## 自动补全

::: tip
某些安装方法会自动安装自动补全脚本。
:::

[`mise completion`](/cli/completion.html) 命令可以为你的 shell 生成自动补全脚本。
生成的脚本是自包含的，不需要单独的 `usage` CLI。

安装补全脚本最简单的方法是：

```shell
mise completion <shell> --install
```

将 `<shell>` 替换为 `bash`、`zsh`、`fish` 或 `powershell`。或者，也可以自行选择路径：

::: code-group

```sh [bash]
# 这需要安装 bash-completion
mkdir -p ~/.local/share/bash-completion/completions/
mise completion bash > ~/.local/share/bash-completion/completions/mise
```

```sh [zsh]
# 如果你使用 oh-my-zsh，这里有一个 `mise` 插件。请使用以下内容更新你的 .zshrc 文件：
# plugins=(... mise)

# 否则，使用以下命令查看 zsh 在哪里查找补全：
echo $fpath | tr ' ' '\n'

# 如果你是通过 `apt-get` 安装的 zsh，例如，这将会生效：
mkdir -p /usr/local/share/zsh/site-functions
mise completion zsh  > /usr/local/share/zsh/site-functions/_mise
```

```sh [fish]
mise completion fish > ~/.config/fish/completions/mise.fish
```

:::

然后，重新加载你的 shell 的 rc 文件或重启你的 shell。

## 故障排除

如果你在安装后遇到问题，请运行：

```sh
mise doctor
```

这将诊断你的 mise 设置中的常见问题。有关更多信息，请参阅 [mise doctor](/cli/doctor)。

## 卸载

使用 `mise implode` 来卸载 mise。这将移除 mise 二进制文件及其所有数据。使用
`mise implode --help` 获取更多信息。

或者，手动删除以下目录以彻底清理：

- `~/.local/share/mise`（也可以是 `MISE_DATA_DIR` 或 `XDG_DATA_HOME/mise`）
- `~/.local/state/mise`（也可以是 `MISE_STATE_DIR` 或 `XDG_STATE_HOME/mise`）
- `~/.config/mise`（也可以是 `MISE_CONFIG_DIR` 或 `XDG_CONFIG_HOME/mise`）
- 在 Linux 上：`~/.cache/mise`（也可以是 `MISE_CACHE_DIR` 或 `XDG_CACHE_HOME/mise`）
- 在 macOS 上：`~/Library/Caches/mise`（也可以是 `MISE_CACHE_DIR`）
