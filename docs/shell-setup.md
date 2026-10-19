---
description: "在 bash、zsh、fish、PowerShell、Nushell、Xonsh 或 Elvish 中启用 mise，并安装 Shell 补全。"
socialDescription: "在 bash、zsh、fish、PowerShell、Nushell、Xonsh 或 Elvish 中启用 mise。"
---

# 在 Shell 中启用 mise

Shell 激活会在交互式 Shell 中安装钩子，使当前项目的工具加入 `PATH`，并在切换目录或显示提示符时设置对应的环境变量。不会读取 Shell 启动文件的编辑器和其他程序可以改用 shims；脚本和 CI 则可直接调用 `mise exec` 或 `mise run`，无需启用激活。[Shims](/dev-tools/shims.html#overview)对比了这三种方式。

将一条激活语句添加到所用 Shell 的启动文件中，然后打开新终端。Bash、Zsh、Fish 和 PowerShell 的示例会先检查该语句，因此重复运行不会添加第二个钩子。Nushell、Xonsh 和 Elvish 需要手动将语句添加到对应文件。

## 开始之前 {#before-you-start}

激活语句会直接按名称运行 `mise`，因此执行启动文件时 `mise` 必须位于 `PATH` 中。[mise.run 安装脚本](/installing-mise.html#mise-run)会将 mise 安装到 `~/.local/bin/mise`，但该目录并非在所有系统上都已加入 `PATH`。如果 `command -v mise` 没有输出，请在添加的语句中用 `~/.local/bin/mise` 替代 `mise`。激活后，mise 会将自己的目录加入 `PATH`。

## Bash {#bash}

```sh
activation='eval "$(mise activate bash)"'
grep -qxF "$activation" ~/.bashrc 2>/dev/null || printf '%s\n' "$activation" >> ~/.bashrc
```

macOS Terminal 默认打开 Bash 登录 Shell，它会读取 `~/.bash_profile`；只有该文件加载了 `~/.bashrc` 时，后者才会生效。如果 `~/.bash_profile` 尚未加载它，请添加 `[ -f ~/.bashrc ] && . ~/.bashrc`。

## Zsh {#zsh}

```sh
zshrc="${ZDOTDIR:-$HOME}/.zshrc"
activation='eval "$(mise activate zsh)"'
mkdir -p "$(dirname "$zshrc")"
grep -qxF "$activation" "$zshrc" 2>/dev/null || printf '%s\n' "$activation" >> "$zshrc"
```

设置了 `ZDOTDIR` 时，此命令会写入 `$ZDOTDIR/.zshrc`。

## Fish {#fish}

在 fish 中运行：

```fish
mkdir -p ~/.config/fish
set activation 'mise activate fish | source'
grep -qxF $activation ~/.config/fish/config.fish 2>/dev/null; or echo $activation >> ~/.config/fish/config.fish
```

Homebrew 以及会安装 `vendor_conf.d/mise-activate.fish` 的软件包会自动在 fish 中启用 mise，因此可以跳过此步骤。若要关闭自动激活，请将 `MISE_FISH_AUTO_ACTIVATE` 设为 `0`：

```fish
set -Ux MISE_FISH_AUTO_ACTIVATE 0
```

## PowerShell {#powershell}

`$PROFILE` 是当前 PowerShell 主机所使用的配置文件。以下命令会在文件不存在时创建它，并且只添加一次激活语句：

```powershell
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}
$activation = '(&mise activate pwsh) | Out-String | Invoke-Expression'
if (-not (Select-String -Path $PROFILE -SimpleMatch $activation -Quiet)) {
    Add-Content $PROFILE $activation
}
```

不同的终端、编辑器和 PowerShell 版本可能使用不同的配置文件，详见 [PowerShell 配置文件](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles)。

只有 PowerShell 7 及更新版本会在切换目录时更新环境。Windows PowerShell 5.1 会在下一个提示符出现时更新，并在启动时显示警告；将 `$env:MISE_PWSH_CHPWD_WARNING` 设为 `0` 可隐藏该警告。

## Nushell {#nushell}

Nushell 会将激活内容作为生成的模块加载。将以下内容添加到 `env.nu`（路径位于 `$nu.env-path`），确保解析 `config.nu` 前模块已经生成：

```nushell
let mise_path = $nu.default-config-dir | path join mise.nu
^mise activate nu | save $mise_path --force
```

将以下内容添加到 `config.nu`（路径位于 `$nu.config-path`）：

```nushell
use ($nu.default-config-dir | path join mise.nu)
```

保存两个文件后重启 Nushell。如果 `mise` 不在 `PATH` 中，请在 `env.nu` 中使用它的绝对路径。每次启动时，`env.nu` 都会重新生成模块，因此 mise 升级后也会自动使用新版本。

## Xonsh {#xonsh}

将以下内容添加到 `~/.xonshrc` 或所用的 Xonsh 配置文件中：

```xonsh
execx($(mise activate xonsh))
```

保存后重启 Xonsh。mise 会在 Xonsh 环境中设置 `$PATH` 等变量，Xonsh 会将这些变量传递给它启动的命令，但不会修改 Python 的 `os.environ`。

## Elvish {#elvish}

将以下内容添加到 `rc.elv`：

```text
var mise: = (ns [&])
eval (mise activate elvish | slurp) &ns=$mise: &on-end={|ns| set mise: = $ns }
mise:activate
```

`mise shell` 和 `mise deactivate` 会修改当前 Shell，因此需要使用模块中的 `mise` 函数，而非 `mise` 可执行文件。将 `mise` 设置为该函数的别名：

```text
edit:add-var mise~ {|@args| mise:mise $@args }
```

## Windows Shell {#windows}

PowerShell 使用上文的 [PowerShell](#powershell) 激活语句。

原生 Windows 版 mise 也可以在 Git Bash、MSYS2 和 Cygwin 中激活 Bash、Zsh 与 Fish：将对应 Shell 的语句添加到它的启动文件中。mise 会在执行语句时检测运行环境，并按该环境要求的格式写入 `PATH`，因此不要在 PowerShell 中生成脚本，再到其他 Shell 中加载。有关这些 Shell 的路径转换，请参阅[故障排除](/troubleshooting.html#cygwin)。

cmd.exe 无法启用激活。请改为将 shims 目录加入当前用户的 `Path`，然后打开新窗口：

```powershell
$shims = "$env:LOCALAPPDATA\mise\shims"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $shims) {
  [Environment]::SetEnvironmentVariable('Path', "$shims;$userPath", 'User')
}
```

Shims 不会在 Shell 本身设置 `[env]` 变量，详见 [Shims 与 PATH](/dev-tools/shims.html#shims-vs-path)。

## 其他 Shell {#other-shells}

如需支持其他 Shell，请在 GitHub 上发起[功能建议讨论](https://github.com/jdx/mise/discussions/categories/ideas)。每种集成都是 [`src/shell/`](https://github.com/jdx/mise/tree/main/src/shell) 中的一个小模块，欢迎贡献实现。

## 各 Shell 支持的功能 {#shell-feature-compatibility}

| 功能                                 | Bash | Zsh | Fish | Nushell            | Elvish | Xonsh | PowerShell  |
| ------------------------------------ | ---- | --- | ---- | ------------------ | ------ | ----- | ----------- |
| `mise activate`                      | 是   | 是  | 是   | 是                 | 是     | 是    | 是          |
| `mise shell` 和 `mise deactivate`   | 是   | 是  | 是   | 是                 | 是     | 是    | 是          |
| 切换目录时更新                       | 是   | 是  | 是   | 下次显示提示符     | 是     | 是    | 7 及更新版本 |
| [Shell 别名](/shell-aliases.html)    | 是   | 是  | 是   | 否                 | 否     | 否    | 否          |
| `mise completion`                    | 是   | 是  | 是   | 否                 | 否     | 否    | 是          |

Elvish 需要使用[对应章节](#elvish)中的 `mise` 别名，才能运行 `mise shell` 和 `mise deactivate`。PowerShell 5.1 和 Nushell 会在下次显示提示符时更新环境，而非在切换目录时立即更新，因此在同一行运行 `cd dir; node -v` 仍会使用上一个目录的工具。各 Shell 的处理方式详见[目录切换](/dev-tools/shims.html#hook-on-cd)。

## 命令补全 {#autocompletion}

[`mise completion`](/cli/completion.html) 会生成命令补全脚本，支持补全 mise 的命令、标志、工具、版本和任务名称。脚本是独立的，无需另外安装 `usage` CLI。

Homebrew、Arch Linux (pacman)、Ubuntu PPA 和 COPR (dnf) 软件包会自动安装 bash、zsh 和 fish 的补全脚本。extrepo apt 仓库、yum 和 zypper 仓库以及 mise.run 安装脚本不会自动安装。

`--install` 会将脚本写入 Shell 查找补全脚本的位置，但不会修改启动文件；对于 zsh 和 PowerShell，它会输出一条需要手动添加的语句：

::: code-group

```sh [bash]
mise completion bash --install
# writes ~/.local/share/bash-completion/completions/mise
```

```sh [zsh]
mise completion zsh --install
# writes ~/.local/share/zsh/site-functions/_mise and prints the fpath line to add
```

```sh [fish]
mise completion fish --install
# writes ~/.config/fish/completions/mise.fish
```

```powershell [PowerShell]
mise completion powershell --install
# writes ~/.config/powershell/completions/mise.ps1
# (on Windows, %LOCALAPPDATA%\PowerShell\completions\mise.ps1)
# and prints the line to add to $PROFILE
```

:::

通过 bash-completion 软件包加载 Bash 补全脚本；该软件包必须已安装并在 Shell 中启用。

若要自行选择安装位置，请使用 `mise completion <shell>` 输出脚本并保存。例如，zsh 可运行：

```sh
mkdir -p ~/.zfunc
mise completion zsh > ~/.zfunc/_mise
```

然后将以下语句添加到 `~/.zshrc` 中，放在任何现有的 `compinit` 调用之前（包括框架添加的调用）。如果 `~/.zshrc` 已运行 `compinit`，则无需添加第二行：

```zsh [~/.zshrc]
fpath=(~/.zfunc $fpath)
autoload -Uz compinit && compinit
```

这些脚本用于补全 mise 自身的命令。通过 packslip 后端安装的命令，请参阅[工具补全和技能](/dev-tools/packslip-resources.html)。

## 验证配置 {#verify}

打开新终端并运行 [`mise doctor`](/cli/doctor.html)：

```sh
mise doctor
```

加载了钩子时，输出中会显示 `activated: yes`。如果显示 `activated: no`，请确认激活语句已写入当前 Shell 会读取的启动文件，并且执行该文件时 `mise` 位于 `PATH` 中。其他问题请参阅[故障排除](/troubleshooting.html)。
