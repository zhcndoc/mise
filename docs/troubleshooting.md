---
description: "排查 Shell 激活、工具版本、下载、任务和 Windows 环境中的问题。"
outline: [2, 3]
---

# 故障排除

本页按问题表现整理了 Shell 激活、工具版本、下载、任务和 Windows 环境中的常见故障。若要查询 mise 输出的消息，请参阅[错误消息](/errors.html)。

## 收集诊断信息 {#mise-is-failing-or-not-working-right}

请在问题出现的目录中运行以下命令：

```sh
mise --version
mise doctor        # setup problems, config files, tools, and activation status
mise doctor path   # the PATH entries mise adds
```

使用 `--verbose` 或 `MISE_DEBUG=1` 重新运行失败的命令（使用 `MISE_TRACE=1` 可查看更多细节）。若要保留日志，请添加 `MISE_LOG_FILE=mise.log MISE_LOG_FILE_LEVEL=debug`。如果安装失败但原因不明，`mise install --raw` 会逐个安装工具，并将安装器连接到终端，以显示进度界面隐藏的提示和构建错误。

排查 Shell 问题时，可将 Shell 中运行的命令与 `mise exec -- <command>` 的结果比较；后者会为该条命令计算项目环境。

日志、跟踪输出和 `mise env` 的输出可能包含密钥和私有路径，请在分享前先检查内容。

使用安装 mise 时所用的软件包管理器，或通过 `mise self-update` 更新；参见[更新 mise](/installing-mise.html#updating)。如果问题是元数据过期，请清除[缓存](/cache-behavior.html)。删除 mise 数据或重新安装所有工具通常无法解决版本选择或 Shell 问题。

如果问题仍然存在，请创建 [GitHub Issue](https://github.com/jdx/mise/issues)，并附上运行的命令、配置、操作系统、Shell、mise 版本和 `mise doctor` 输出。如有疑问，请发起[讨论](/contact.html)。

## Shell 激活与 PATH {#shell-activation-and-path}

### 登录 Shell、编辑器、脚本或 CI 找不到工具 {#mise-activate-doesn-t-work-in-profile-bash-profile-zprofile}

<a id="tool-not-found-after-mise-install-or-mise-use-in-a-script"></a>
<a id="mise-activate-in-ci-non-interactive-shells"></a>
<a id="mise-isn-t-working-when-calling-from-tmux-or-another-shell-initialization-script"></a>

`mise activate` 运行时会应用环境，之后通过 hook 更新环境；该 hook 会在每次显示提示符前运行，并在大多数 Shell 中于每次 `cd` 后运行。若进程从不运行此 hook，就会一直使用启动时的环境：

- 登录配置文件（`~/.profile`、`~/.bash_profile`、`~/.zprofile`）只会由登录 Shell 读取。未读取这些文件便启动的 Shell 和程序（例如子 Shell 或以非登录 Shell 打开的终端）会继承 `PATH`，但不会继承 hook，因此切换项目后工具版本不会随之改变。请将 `mise activate` 放入交互式启动文件（`~/.bashrc`、`~/.zshrc`、`~/.config/fish/config.fish`），并将 `mise activate --shims` 放入登录配置文件；详见[将 shims 添加到 PATH](/dev-tools/shims.html#how-to-add-mise-shims-to-path)。
- 编辑器和其他 GUI 程序最多只会在启动时读取一次登录配置文件。按上文所述将 shims 添加到它们的 `PATH`，然后重启编辑器。详见[编辑器和 IDE](/ide-integration.html)。Shims [无法覆盖激活所实现的全部功能](/dev-tools/shims.html#shims-vs-path)。
- 脚本和 CI 作业不会显示提示符。请使用 `mise exec -- <command>` 或 `mise run <task>` 运行命令，它们会为该命令计算环境。将脚本放在项目目录中，以便 mise 找到配置。详见[持续集成](/continuous-integration.html)。
- 在脚本中安装工具不会更改该脚本的 `PATH`。请通过 `mise exec` 运行后续命令：

  ```sh
  mise install
  mise exec -- node --version
  ```

- 在 Bash、Zsh、Fish、PowerShell 中，以及 Elvish 执行 `mise:activate` 之后，同一启动文件中位于激活行之后的代码都能使用 mise 工具。激活行之前的代码，以及从不读取该文件的 Shell（例如 tmux 从 `tmux.conf` 运行的 `sh -c` 命令）则无法使用。此时可使用 `mise exec -- <command>`，或先将 shims 加入 `PATH`。在 Nushell 和 Xonsh 中，激活会在第一次显示提示符时应用环境。详见[脚本与 Shell 启动文件](/dev-tools/shims.html#using-mise-in-rc-files)。

`eval "$(mise env -s bash)"` 会将当前项目的工具和变量一次性载入 Shell；切换目录时不会更新环境。独立脚本也可以在 [shebang](/tips-and-tricks.html#shebang) 中指定所用工具。

### 创建 `~/.bash_profile` 后 `~/.profile` 不再加载 {#creating-bash-profile-breaks-existing-profile-on-ubuntu-debian}

登录 Bash 只会读取 `~/.bash_profile`、`~/.bash_login` 和 `~/.profile` 中第一个存在的文件。Ubuntu 和 Debian 在 `~/.profile` 中设置 `PATH`，因此新建 `~/.bash_profile` 会遮蔽它；无论该文件是手动创建、为[配置 shims](/dev-tools/shims.html#how-to-add-mise-shims-to-path)而创建，还是由 [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html) 中的 `bash = true` 创建，都有此问题。请在新文件中加载 `~/.profile`：

```sh [~/.bash_profile]
[[ -f ~/.profile ]] && source ~/.profile
```

### 运行了错误版本的工具 {#the-wrong-version-of-a-tool-is-being-used}

对比项目选择的版本与 Shell 实际运行的版本。以 Node.js 为例：

```sh
mise ls --current node       # the version and the config file that selects it
mise which node              # the executable mise would run
mise exec -- node --version  # the version mise runs
node --version               # the version your shell runs
type -a node                 # every node your shell can find, in order
mise doctor path             # the PATH entries mise adds
```

如果 `mise ls` 显示缺少该版本，请运行 `mise install`。如果显示了错误的版本请求或配置文件，请检查当前目录、所选的[配置环境](/configuration/environments.html)，以及[配置文件的合并方式](/configuration.html#configuration-hierarchy)。mise 如何从已安装版本中进行选择，详见[请求的解析方式](/dev-tools/versions.html#how-requests-resolve)。

如果 `mise exec` 运行的是预期版本，而直接运行 `node` 却不是，`type -a node` 会显示排在最前面的别名、函数或可执行文件。请移除其他版本管理器的激活配置，并将 `mise activate` 放在启动文件中所有修改 `PATH` 的内容之后，例如 Zinit 或 Oh My Zsh 插件。编辑完成后打开新的 Shell。 [`activate_aggressive`](/configuration/settings.html#activate_aggressive) 会让工具目录优先于激活后添加到 `PATH` 的条目（例如启动文件后续行中的条目）。若有提示符 hook 在 mise 的 hook 后运行，它仍可能在每次提示符出现时改变顺序；请将该 hook 移到 `mise activate` 之前，或使用 `mise exec -- <command>`。如果问题只在编辑器中出现，请参阅[编辑器和 IDE](/ide-integration.html)。

### Shell 提示符响应缓慢 {#slow-shell-prompts}

`mise activate` 会在每次显示提示符时运行 hook。如果相关内容没有变化，hook 会提前返回，因此通常只需几毫秒。若要测量一次完整环境计算所需的时间：

```sh
MISE_TIMINGS=1 mise hook-env --force -s bash >/dev/null  # time per step
MISE_TIMINGS=2 mise hook-env --force -s bash >/dev/null  # with sub-steps
```

将 `bash` 替换为你使用的 Shell。`--force` 会跳过提前返回检查，因此命令会测量完整计算过程，但不会更改当前会话。计算缓慢的常见原因包括：

- 环境需要重新计算时运行的 `_.source` 脚本
- 配置了大量工具或环境插件
- 会发起网络请求的环境指令或模板

通过[环境缓存](/cache-behavior.html#environment-caching)和 `watch_files` 可减少环境插件的重复工作。在 NFS 等较慢的文件系统上，[`hook_env.chpwd_only`](/configuration/settings.html#hook_env.chpwd_only) 只会在切换目录时检查配置；[`hook_env.cache_ttl`](/configuration/settings.html#hook_env.cache_ttl) 则会缓存检查结果。

[`mise activate --shims`](/dev-tools/shims.html) 会将开销从每次提示符显示转移到每次工具调用，整体快慢取决于你调用工具的频率。详见[性能](/dev-tools/shims.html#performance)。

## 版本与下载 {#versions-and-downloads}

### 未列出新发布的版本 {#new-version-of-a-tool-is-not-available}

以下三种情况可能导致你看不到最近一天内发布的版本：

- [最低发布时长](/security.html#minimum-release-age)。对大多数后端，发布未满 24 小时前，mise 不会列出该版本，也不会在处理版本前缀或 `latest` 时选择它。此时 `mise ls-remote` 会显示警告 `1 newer node release hidden by minimum_release_age`。若要立即安装该版本，请指定准确版本，例如 `mise use node@24.11.1`。如果某个前缀匹配的版本全部被隐藏（例如 24.12.0 发布后的首日请求 `node@24.12`），命令会返回 [404](/errors.html#http-404)。
- mise 缓存的版本列表副本。哪些命令会使用缓存，请参阅[mise 何时刷新版本列表](/cache-behavior.html#version-list-refresh)。
- [mise-versions](https://mise-versions.jdx.dev) 主机负责提供大多数工具的版本列表，并按计划检查上游更新。

若要查看后端提供的所有版本，请先清除该工具的缓存，然后跳过版本主机和发布时长筛选：

```sh
mise cache clear node
mise ls-remote --no-versions-host --minimum-release-age 0s node
```

不使用版本主机时，mise 可能需要后端凭据，例如 [GitHub token](/dev-tools/github-tokens.html)。[`use_versions_host`](/configuration/settings.html#use_versions_host) 设置会对所有命令关闭版本主机。

版本主机也受 GitHub 的速率限制。授权[mise-versions GitHub 应用](https://github.com/apps/mise-versions)后，它会获得更多 API 配额，从而更快显示新版本；该应用不会请求任何权限。

### 下载失败并返回 403 Forbidden {#_403-forbidden-when-installing-a-tool}

GitHub 返回 403 通常是因为触发了速率限制，在 CI 中尤其常见。详见[`HTTP 状态客户端错误（403 Forbidden）`](/errors.html#http-403)。

### 输入缺失的命令后没有自动安装工具 {#auto-install-on-command-not-found-does-not-trigger}

输入一个找不到的命令时，mise 可以安装提供该命令的已配置工具（[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install)）。mise 会根据注册表中每种工具所提供的命令列表查找工具，因此也适用于从未安装过的已配置工具。以下情况不会触发自动安装：

- mise 未在 Bash、Zsh、Fish 或 PowerShell 中通过 `mise activate` 激活。其他 Shell 没有“找不到命令”hook，而 shims 只会为已安装工具的命令创建。
- 工具使用了后端标识符（例如 `"cargo:some-crate"` 或 `"github:owner/repo"`），而不是 `ripgrep` 这样的注册表名称。后端标识符不包含命令列表，因此如果注册表中有对应条目，请使用注册表名称。
- 配置中没有该工具。设置 [`not_found_auto_install_registry`](/configuration/settings.html#not_found_auto_install_registry)，即可安装由注册表中唯一条目提供的工具；mise 会将它添加到全局配置。
- [`auto_install`](/configuration/settings.html#auto_install) 或 `not_found_auto_install` 为 `false`，或者该工具列在 [`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 中。

对于使用后端标识符的工具，可将其设为 `lazy = true`，并在 `lazy_bins` 中列出命令。这样 mise 会创建 shims，在首次运行其中一条命令时安装工具；详见[延迟安装工具](/dev-tools/shims.html#lazy-tools)：

```toml [mise.toml]
[tools]
"github:owner/repo" = { version = "1.2.3", lazy = true, lazy_bins = ["tool"] }
```

除此之外，也可以运行 `mise install` 或 [`mise exec`](/cli/exec.html)，它们会在运行命令前安装缺少的工具。对于标记为 `lazy = true` 的工具，两者都会等到首次运行其命令时再安装；`mise install --include-lazy` 则会一并安装这类工具。安装某个工具的任一版本后，mise 也会从该安装中查找其命令，因此后续处理器可以安装项目请求的其他版本。

## 任务 {#tasks}

### 原始任务输出中的密钥不会被脱敏 {#tasks-with-redact-env-vars-break-raw-output}

设置了 [`raw = true`](/tasks/task-configuration.html#raw) 或 [`interactive = true`](/tasks/task-configuration.html#interactive) 的任务，以及使用 `--raw` 的运行，会直接向终端写入内容，因此 mise 无法在输出中遮蔽[需要脱敏](/environments/secrets/#redaction)的值。遇到这种情况时，mise 会显示提示。对于输出可能包含密钥的任务，请勿启用 `raw`。详见[脱敏的适用范围](/environments/secrets/#what-redaction-covers)。

有关任务执行顺序错误或 mise 找不到任务的问题，请参阅[依赖与执行顺序](/tasks/architecture.html)和[`no task <name> found`](/errors.html#task-not-found)。

## Windows {#windows-problems}

哪些工具和后端支持 Windows，请参阅[mise 是否支持 Windows？](/faq.html#windows-support)。

### `PATH` 过长导致 `cmd.exe` 找不到程序 {#path-limits}

mise 构建出的 `PATH` 超出 `cmd.exe` 可接受的长度时会显示警告：

```text
mise WARN  PATH is 9120 characters, longer than the 8191 cmd.exe accepts. ...
```

`cmd.exe` 不会截断过长的 `PATH`，而是[完全忽略该变量](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation)。随后，所有需要通过 `PATH` 查找的程序都会报错 `is not recognized`，但 `C:\Windows\System32` 中的程序仍可运行。通过 `cmd.exe` 运行的工具（例如 `npm`、`npx` 和批处理脚本）都会受影响。

若要缩短 `PATH`：

1. 将 `MISE_INSTALLS_DIR` 设为较短的目录，例如 `C:\.mise-installs`。
2. 只在需要这些工具的 `mise.toml` 文件中声明工具。在 monorepo 中，请将工具从根配置移出。
3. 从 PowerShell 运行命令，它支持更长的 `PATH`。

mise 已会从传递给 `mise exec`、`mise run` 和 `mise env` 的 `PATH` 中移除完全重复的条目，因此长度来自不同目录。[Shims](/dev-tools/shims.html) 可以缩短当前 Shell 的 `PATH`，但通过 shim 启动的工具仍会获得所有已启用工具的目录；因此调用 `cmd.exe` 的工具仍会看到同样过长的 `PATH`。

若要确认此问题，请从不包含目标程序的目录中，通过 `cmd.exe` 运行一个不在 `C:\Windows\System32` 中的程序。`cmd.exe` 无需读取 `PATH`，也能在这两个位置查找程序：

```powershell
mise exec -- cmd.exe /d /s /c "git --version"
```

如果 `git --version` 在当前 Shell 中可以运行，但上述命令输出 `'git' is not recognized as an internal or external command`，说明 `PATH` 已超过长度限制。

### 编辑器报告 `spawn EINVAL` {#vscode-for-windows-extension-with-error-spawn-einval}

由于 [Node.js 安全修复](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2#command-injection-via-args-parameter-of-child_processspawn-without-shell-option-enabled-on-windows-cve-2024-27980---high)，直接启动 `.cmd` shim 的编辑器扩展会报错 `spawn EINVAL`。请使用默认设置 [`windows_shim_mode = "exe"`](/configuration/settings.html#windows_shim_mode)，运行 `mise reshim`，然后重启扩展或语言服务器。如果扩展仍尝试启动 `.cmd` 路径，请将其工具路径设置改为 `%LOCALAPPDATA%\mise\shims` 中的 `.exe` shim，或改为 `mise which <tool>` 输出的路径。

### 从 PowerShell 运行 `bash -c` 任务时报告 `command not found` {#shell-bash-c-task-fails-with-command-not-found-from-powershell}

`shell = "bash -c"` 任务需要 POSIX bash，例如 Git Bash 或 MSYS2。从 PowerShell 启动时，`PATH` 中的第一个 `bash` 通常是 WSL 启动器 `C:\Windows\System32\bash.exe`，它会在 Linux 中运行命令，因此无法访问 mise 管理的 Windows 工具。mise 会跳过 WSL 启动器，改用标准安装位置或 `PATH` 中的 Git Bash 或 MSYS2。如果两者都找不到，则会显示警告 `no real POSIX bash found on PATH (only the WSL launcher)`。请安装 Git for Windows 或 MSYS2，或者将 `MISE_BASH_PATH` 指向 bash：

```powershell
$env:MISE_BASH_PATH = "C:\tools\msys64\usr\bin\bash.exe"
mise run my-bash-task
```

若要只为一个项目设置，请将其写入 `mise.toml`：

```toml [mise.toml]
[env]
MISE_BASH_PATH = "C:/tools/msys64/usr/bin/bash.exe"
```

只有当 Shell 名称是简单的 `bash` 时，`MISE_BASH_PATH` 和自动检测才适用。如果任务的 `shell` 或 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args) 指定了路径（例如 `C:/msys64/usr/bin/bash.exe -c`），mise 就会运行该二进制文件。选择运行 [`_.source`](/environments/#env-source) 脚本所用 bash 时也遵循相同规则。

路径中包含空格时请加引号。在 Windows 上，`shell` 中的反斜杠按字面处理，正斜杠也可使用；在 macOS 和 Linux 上，`shell` 遵循 POSIX 引号规则：

```toml [mise.toml]
[tasks.build]
run = "echo hi"
shell = '"C:\Program Files\Git\bin\bash.exe" -c'
```

### Git Bash、MSYS2 和 Cygwin {#cygwin}

Windows 原生版 mise 可以激活运行在 Git Bash、MSYS2 或 Cygwin 下的 Bash、Zsh 和 Fish。请按照 [Shell 设置](/shell-setup.html#windows)所述，将 `mise activate` 放入对应 Shell 自己的启动文件中：该行运行时，mise 会检测运行时环境，并按其预期格式写入 `PATH`。在 PowerShell 中生成、随后在另一个 Shell 中加载的脚本无法正常工作。

如果 `PATH` 中的目录使用了自定义挂载点，请在运行时的 `/etc/fstab` 或 `/etc/fstab.d` 中声明。mise 只会根据运行时的默认挂载点和这些文件转换路径，因此不会转换当前会话中通过 `mount` 创建的挂载点，也不会转换符号链接目录。更改挂载设置后请重启 Shell。

对于 `shell = "bash -c"` 的任务，可设置 `MISE_BASH_PATH` 来指定 Cygwin 的 bash：

```powershell
$env:MISE_BASH_PATH = "C:\cygwin64\bin\bash.exe"
```

mise 会原样向这些 Shell 传递 `PATH`，而它们会在两个方向上自行转换路径，因此无需配置 `PATH`。其他参数的处理方式不同：Git Bash 或 MSYS2 启动原生程序时，会改写看起来像 POSIX 路径的参数和环境变量（`/c` 会变成 `C:/`），Cygwin 则不会。若要对单条命令禁用此行为，请在命令前加上 `MSYS_NO_PATHCONV=1`。

### 在 WSL 中运行 Windows 工具 {#shims-leaking-into-wsl}

WSL 默认会将 Windows 的 `PATH` 添加到 Linux 环境中。使用 [`windows_shim_mode = "file"`](/configuration/settings.html#windows_shim_mode) 时，mise 会在每个 `.cmd` shim 旁写入一个没有扩展名的 Bash 脚本，WSL 中输入的命令可以在 `/mnt/c` 下找到它。该脚本会检测 WSL，从 `PATH` 中移除自身目录；如果已安装对应的 Linux 工具，则运行该工具，否则返回 `<tool>: not found`。默认的 `exe` 模式只会写入 `<tool>.exe` 文件，WSL 中名为 `<tool>` 的命令无法匹配它。

若要在 WSL 中管理 Linux 工具，请在 WSL 内安装 Linux 版 mise。若要彻底阻止 Windows 路径进入 WSL，请将以下内容加入 `/etc/wsl.conf`，从 PowerShell 运行 `wsl --shutdown`，然后重新打开 WSL：

```ini [/etc/wsl.conf]
[interop]
appendWindowsPath = false
```

`wsl --shutdown` 会停止所有正在运行的 WSL 发行版，请先保存工作内容。
