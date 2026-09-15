---
description: "诊断安装、shell 激活、工具版本和性能问题"
---

# 故障排除

如果你正在寻找有关特定错误消息的帮助，请参阅 [错误](/errors.html)——本页面则按症状组织。

## `mise activate` 不能在 `~/.profile`、`~/.bash_profile`、`~/.zprofile` 中使用

正常的 `mise activate` 会安装 shell 钩子，在提示符出现前刷新环境，并且对于受支持的 shell，还会在目录发生变化时刷新环境。请将其放入交互式 shell 的 rc 文件中，例如 `~/.bashrc` 或 `~/.zshrc`。配置文件或非交互式脚本可能不会运行这些钩子。

对于脚本，请使用 `mise exec -- command` 来为该命令计算项目环境。对于编辑器，[shims](/dev-tools/shims.html) 会使用进程的工作目录解析工具。`mise activate --shims` 可以放在编辑器会读取的登录配置文件中。

`mise env` 同样会计算**当前项目**的工具和变量，而不仅仅是全局工具。计算其输出会更新当前 shell 一次；切换目录后，它不会继续更新。请参阅 [IDE 集成](/ide-integration.html) 和 [CI 设置](/continuous-integration.html)。

::: warning
`mise activate --shims` 不支持 `mise activate` 的所有功能。<br>
有关更多信息，请参见 [shims vs path](/dev-tools/shims.html#shims-vs-path)。
:::

另请参阅 [shebang](/tips-and-tricks#shebang) 示例，了解如何让脚本调用 mise 获取所需工具，这是另一种无需激活即可使用 mise 的方式。

## 缓慢的 shell 提示符 {#slow-shell-prompts}

`mise activate` 会在每次出现提示符时运行一个钩子，以检查是否需要更新工具或环境变量。这通常只需几毫秒，但如果你的提示符感觉迟缓，可以使用 `MISE_TIMINGS` 对其进行性能分析。

在已激活的 Bash 或 Zsh 会话中，暂时停用 mise，然后手动为 `hook-env` 计时。这会测量一次环境计算；只有在比较变更时才需要重复执行：

```sh
mise deactivate

# 显示每个主要步骤的耗时（按颜色区分：红色 = 慢）
MISE_TIMINGS=1 mise hook-env -s bash 2>&1 >/dev/null

# 或使用 =2 获取更详细的逐步拆分，以及累计耗时
MISE_TIMINGS=2 mise hook-env -s bash 2>&1 >/dev/null
```

将 `bash` 替换为你的 shell。之后打开一个新终端，以恢复正常激活。

环境计算缓慢的常见原因：

- 环境需要重新计算时执行了耗时的 `_.source` 脚本
- 工具或插件数量过多
- 环境指令中包含依赖网络的操作

在更改设置之前，使用计时输出找出耗时的步骤。[环境缓存](/cache-behavior.html#environment-caching) 和受监视的文件可以减少环境提供程序的重复工作。

[`mise activate --shims`](/dev-tools/shims) 会将开销从每个提示符移动到每次工具调用，其速度是否更快取决于你的工作流。有关权衡，请参阅 [Shims vs PATH](/dev-tools/shims.html#shims-vs-path)。

## mise 出现故障或无法正常工作

请从问题发生的目录运行诊断：

```sh
mise --version
mise doctor
```

然后使用 `--verbose`、`MISE_DEBUG=1` 或 `MISE_TRACE=1` 重新运行失败的命令。若要保留调试日志，请设置 `MISE_LOG_FILE_LEVEL=debug MISE_LOG_FILE=/path/to/logfile`。分享之前请检查诊断输出；其中可能会出现环境值和私有路径。

对于激活问题，请比较 `mise exec -- command` 与 shell 中运行相同命令的结果。`mise env` 会显示计算出的 shell 赋值，但计算这些赋值可能会运行环境指令，输出中也可能包含机密信息。不要未经修改就将其粘贴到公开的问题中。

对于安装失败，`mise install --raw` 会按串行方式安装，并将安装程序的输入/输出直接连接到终端。这可以显示出在分组输出中被隐藏的交互式提示或嵌套构建错误。

通过安装 mise 的包管理器更新 mise，或对于独立安装，使用 `mise self-update`。如果症状是元数据过时，请清除相关的[缓存](/cache-behavior.html)。重新安装所有内容或删除 mise 的状态，不应成为诊断版本选择或 shell 问题的第一步。

如果问题仍然存在，请在错误报告中包含命令、相关配置、操作系统、shell、mise 版本以及检查过的 `mise doctor` 输出。常见消息及其根本原因请参阅[错误](/errors.html)。

## 正在使用错误版本的工具

比较项目的版本选择与 shell 实际运行的命令。对于 Node.js：

```sh
mise ls --current node
mise which node
mise exec -- node --version
node --version
type -a node
```

如果 `mise ls` 显示缺少某个版本，请使用 `mise install` 安装。如果它显示了错误的请求或配置来源，请检查当前目录、环境选择以及[配置优先级](/configuration.html)。

如果 `mise exec` 使用了预期版本，但 `node` 没有使用，请检查 `type -a node`，查看是否有优先级更高的 shell 别名、函数或可执行文件。移除另一个版本管理器中的冲突激活设置，或者修正 shell 启动文件中 `PATH` 的设置顺序。编辑后打开一个新的 shell。对于仅在编辑器中出现的故障，请检查[编辑器的进程环境](/ide-integration.html)。

[`activate_aggressive`](/configuration/settings.html#activate_aggressive) 会让激活过程将工具置于其他 `PATH` 条目之前。它可以帮助处理相互竞争的 PATH 更新，但之后运行的另一个钩子仍然可以改变顺序。`mise exec -- command` 仍然是选择项目环境的显式方式。

## 工具的新版本不可用

版本会缓存在两个位置，因此全新的版本可能不会立即出现。

第一个位置是 mise CLI 自己的版本缓存，对于 Node，可以使用 `mise cache clear node` 清除（将其替换为你的工具）。

第二个位置是 <https://mise-versions.jdx.dev> 主机，这是一个集中列出大多数工具所有版本的位置。它可以加快 mise 的速度，并避免在查询新版本时受到 GitHub 速率限制。请在该网站上检查你的工具，查看是否已有更新版本。可以通过设置 `MISE_USE_VERSIONS_HOST=0` 禁用此服务。以下是一次性检查命令：

```sh
mise cache clear node
MISE_USE_VERSIONS_HOST=0 mise ls-remote node
```

这会直接查询后端，可能需要其身份验证凭据。

mise 还会把 versions host 用作公共 GitHub release 元数据和 GitHub artifact attestations 的共享缓存。这意味着，公共 `github:` 和许多 `aqua:` 工具的正常安装，即使在没有配置 token 的 Docker 构建或 CI 作业中，也可以避免未认证的 GitHub API 调用。如果 versions host 还没有所请求的元数据，mise 会回退到 GitHub 的 API。

mise-versions 本身也会受到速率限制的影响，但你可以通过使用其 [GitHub app](https://github.com/apps/mise-versions) 进行身份验证来帮助它更频繁地获取数据。该应用不需要任何权限，因为它只获取公共仓库信息。这样做的人越多，mise 获取工具新版本的速度就越快。

## Windows 问题

::: warning
Windows support is available, but asdf plugins can't run on Windows, so tools must use another
backend such as core, vfox, aqua, github, or http—which means some registry tools are not
available on Windows.
:::

### 路径长度限制

如果在你的 `mise.toml` 层级结构中定义了许多工具，`mise x` 可能会生成某些工具无法处理的过长 `Path` 环境变量，尤其是 `cmd.exe`。这会影响调用 `cmd.exe` 的 `mise` 工具（例如 `npm install`）。

限制为 **8191 个字符**，而 `cmd.exe` 不会截断更长的 `Path`——它会[完全忽略该变量](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation)。因此，表现并不是某一个工具消失了：所有通过 `Path` 找到的内容会同时停止解析，并报告 `is not recognized`。`C:\Windows\System32` 中的程序仍然可以运行，因为 `cmd.exe` 无需查询 `Path` 就能找到它们——这正是该故障看起来毫无规律的原因，也说明了下面的测试为何重要。

你有以下几种选择：

1. 将 `MISE_INSTALLS_DIR` 环境变量设置为更短的位置，例如 `C:\.mise-installs`。
1. 使用 `powershell.exe` 或 `pwsh.exe` 代替 `cmd.exe`，因为它们可以处理更长的 `Path`。
1. 重新组织 monorepo 中的 `mise.toml` 文件，仅指定它们所需的工具。
1. 使用 [shims](/dev-tools/shims.html) 防止你的**shell 的** `Path` 随工具集增长——`mise activate --shims` 添加一个目录，而不是每个工具添加一个目录。请注意它不涵盖的情况：通过 shim 运行工具时，仍然会构建一个包含每个活动工具目录的环境，因此一个自身调用 `cmd.exe` 的 mise 管理工具（例如 `npm`）无论采用哪种方式，看到的都是同样长的 `Path`。Shims 也[不支持](/dev-tools/shims.html#shims-vs-path) `mise activate` 的所有功能。

你可以运行以下命令来测试自己是否已经触发了 `cmd.exe` 的 `Path` 限制：

```powershell
# Path 在限制范围内
❯ mise x -- cmd.exe /d /s /c "git --version"
git version 2.55.0.windows.3
# Path 超出 cmd.exe 限制
❯ mise x -- cmd.exe /d /s /c "git --version"
'git' is not recognized as an internal or external command,
operable program or batch file.
mise ERROR command failed: exit code 1
mise ERROR Run with --verbose or MISE_VERBOSE=1 for more information
```

关于该测试，有两点需要注意。第一，选择一个不在 `C:\Windows\System32` 中、也不在运行测试的目录中的程序：`cmd.exe` 会在 `Path` 之前搜索当前目录，并且无需查询 `Path` 就能找到系统目录中的程序，因此无论 `Path` 有多长，在这两个位置进行探测都会成功。这正是 `where.exe` 无法提供任何信息的原因。第二，确认所选程序可以正常运行（在你的 shell 中运行 `git --version`），因为不存在的程序也会产生与该限制相同的 `is not recognized`。

重复的 `Path` 条目不像过去那样影响明显：重新激活时，mise 现在会在添加当前工具集的目录之前，移除它在继承的 `Path` 中找到的过时安装目录（v2026.5.18）；从 v2026.7.18 起，它还会在计算环境（`mise x`、`mise run`、`mise env`、`mise doctor`）时合并完全重复的条目。这会减少 mise 添加的内容，但不会提高上限——足够多的不同工具仍然会达到 8191 个字符。

### Shims 泄漏到 WSL

当 `windows_shim_mode` 设置为 `file` 时，mise 会在每个 `<tool>.cmd` shim 旁边写入一个没有扩展名的 bash 脚本（这样 Git Bash / Cygwin 就能解析该工具）。WSL 的默认 Windows-PATH 互操作会将 shims 目录暴露在 `/mnt/c/...` 下，其中每个文件都会被视为可执行文件，因此在 WSL 中运行 shim 工具时会原生执行该脚本。mise 会保护生成的脚本：检测到 WSL 后，它会从 `PATH` 中移除 shims 目录，并在已安装原生 Linux 工具时运行该工具；否则会以普通的 `<tool>: not found` 失败，而不会无限递归或报错 `mise: not found`。

默认的 `exe` 模式不受影响：它只会写入原生的 `<tool>.exe`
文件，而 WSL 会忽略这些文件，因此不会泄漏到 Linux 中。

请在 WSL 内使用 Linux 安装的 mise 管理 Linux 工具。若要完全阻止 Windows PATH 条目进入 WSL，请在 `/etc/wsl.conf` 中禁用 Windows-PATH 互操作：

```ini
[interop]
appendWindowsPath = false
```

在 WSL 中保存工作，然后从 PowerShell 运行 `wsl --shutdown`，以停止所有正在运行的 WSL
发行版。重新打开 WSL 后，再检查更新后的 `PATH`。

### `shell = "bash -c"` task fails with `command not found` from PowerShell

如果一个固定使用 `shell = "bash -c"` 的任务从 Git Bash 中可以运行，但从 PowerShell 中运行时却报
`command not found`，mise 很可能把 `bash` 解析成了 `C:\Windows\System32\bash.exe` 这个 WSL 启动器，而不是真正的 POSIX
bash。该启动器会进入 WSL 发行版的 Linux 用户空间，而在其中 mise 管理的 Windows 工具是不可见的。

当 mise 能在标准安装位置找到一个真正的 POSIX bash（Git Bash / MSYS2）时，会自动优先使用它。如果你的 bash 安装在其他位置，请设置
`MISE_BASH_PATH` 进行覆盖：

```powershell
$env:MISE_BASH_PATH = "C:\tools\msys64\usr\bin\bash.exe"
mise run my-bash-task
```

```toml
# 或者，从 mise.toml 中将其作用域限制到单个项目
[env]
MISE_BASH_PATH = "C:/tools/msys64/usr/bin/bash.exe"
```

mise 会原样遵循一个**显式**指定的 bash 路径。如果你设置了 `shell`（在任务中）或
`windows_default_inline_shell_args` 为绝对路径，例如
`C:/msys64/usr/bin/bash.exe -c`，mise 会精确使用那个二进制文件——
`MISE_BASH_PATH` 覆盖以及 Git Bash / MSYS2 的自动检测只在 shell 名称为裸的 `bash` 时才生效。

同样的解析规则（自动检测、使用 `MISE_BASH_PATH`，绝不使用 WSL 启动器）
也适用于 mise 为获取
[`[env] _.source`](/environments/#env-source) 脚本内容而启动的 bash。

如果 shell 路径包含空格（例如 `C:\Program Files\Git\bin\bash.exe`），
请将程序放在双引号中，以免空格被当作参数分隔符。
在 Windows 上，反斜杠按字面意义处理，因此无需转义；正斜杠也同样可用：

```toml
[tasks.build]
run = "echo hi"
shell = '"C:\Program Files\Git\bin\bash.exe" -c'
```

（在 macOS/Linux 上，`shell` 则遵循 POSIX 引号规则。）

#### Cygwin

原生 Windows mise 可以在 Git Bash、MSYS2 或 Cygwin 中激活 Bash、Zsh 和 Fish。
请在将使用其输出的 shell 中运行 `mise activate`。mise 会识别调用方的 shell 可执行文件及其运行时 DLL，而不是依赖可能缺失或从另一个 shell 继承而来的 `SHELL` 或 `MSYSTEM`。不支持在 PowerShell 中生成激活脚本、稍后再在不同运行时中加载该脚本。

生成的钩子中的 PATH 赋值和可执行文件引用会使用该运行时的路径。在内部，mise 保留原生 Windows PATH 值，包括其保存的原始 PATH。激活或钩子不会启动 `cygpath` 子进程。路径映射支持运行时默认值，以及持久化的 `etc/fstab` 和 `etc/fstab.d` 挂载，包括自定义驱动器前缀。仅限会话的 `mount` 更改和任意文件系统符号链接不会被重建；对于自定义 PATH 位置，请使用持久化挂载。更改挂载配置后重启 shell。

对于任务：

将 `MISE_BASH_PATH` 指向你的 Cygwin bash，以确保使用目标 bash：

```powershell
$env:MISE_BASH_PATH = "C:\cygwin64\bin\bash.exe"
```

mise 会原样传递 PATH。Git Bash、MSYS2 和 Cygwin 都会在进入 shell 时将其转换为 Unix 格式，在传递给原生程序时再转换回 Windows 格式，因此无需为其中任何一个进行配置。

它们的区别在于除 PATH 之外的所有内容：MSYS2 / Git Bash 会在传递给原生程序的过程中重写看起来像 POSIX 的参数和其他环境变量——`/c` 会变成 `C:/`——而 Cygwin 会保持两者不变。因此，从 Git Bash 任务启动的原生程序可能会看到并非你预期的参数；`MSYS_NO_PATHCONV=1` 可以针对单个命令禁用这种转换。

## 在 tmux 或其他 shell 初始化脚本中调用时，mise 不工作

Shell 初始化可能会在 mise 的第一个环境钩子之前运行。如果此时需要某个工具，请使用 `mise exec -- python --version`，或者[将 shims 添加到 PATH](/dev-tools/shims.html#how-to-add-mise-shims-to-path)，例如：

```bash
export PATH="$HOME/.local/share/mise/shims:$PATH"
python --version # assumes Python is configured and installed
```

或者手动调用 `hook-env`：

```bash
eval "$(mise activate bash)"
eval "$(mise hook-env)"
python --version # assumes Python is configured and installed
```

有关更多信息，请参见 [“mise activate” 的作用是什么？](/faq#what-does-mise-activate-do)。

## mise 是安全的吗？

mise 可以验证下载内容并限制不受信任的配置，但保证程度取决于所使用的后端和设置。请阅读[安全性](/security.html)，了解验证方法、安全模式和配置信任；请阅读[偏执模式](/paranoid.html)，了解更严格的检查。请通过 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) 报告漏洞。

## 安装工具时出现 403 Forbidden

你可能会遇到如下错误之一：

```text
HTTP status client error (403 Forbidden) for url
403 API rate limit exceeded for
```

如果工具托管在 GitHub 上，并且你触发了 API 速率限制，就可能发生这种情况；在 GitHub Actions 等 CI 环境中运行 mise 时尤其常见。

默认情况下，mise 使用 <https://mise-versions.jdx.dev> 来避免大多数公共 GitHub API 调用，用于获取发布元数据和工件证明检查。如果你仍然看到此错误，通常意味着版本主机上尚未提供该元数据，设置了 `MISE_USE_VERSIONS_HOST=0`，该工具使用的是私有仓库，或者该工具使用了 GitHub Enterprise/自定义 API 设置。

403 也可能表示缺少仓库访问权限或存在组织策略。在将其视为速率限制之前，请检查响应和身份验证诊断。请参阅 [GitHub Tokens](/dev-tools/github-tokens.html) 和 [403 errors](/errors.html)。

## 在脚本中执行 `mise install` 或 `mise use` 后找不到工具

安装工具会更改磁盘上的文件，但无法更改父脚本的环境。请对下一个命令使用 `mise exec`。对于声明了 Node.js 的项目：

```sh
mise install
mise exec -- node --version
```

如果后续有许多命令需要相同的环境，请在安装后为你的 shell 计算 `mise env`，或者将 [shims](/dev-tools/shims.html) 放入 `PATH`。请让脚本位于预期的项目目录中，以便 mise 找到其配置。

## Creating `~/.bash_profile` breaks existing `~/.profile` on Ubuntu/Debian

在许多 Linux 发行版中，`~/.profile` 会加载 `~/.bashrc` 并设置你的环境。
但是，如果 `~/.bash_profile` 存在，bash 会读取它，**而不是** `~/.profile`。

如果你按照为 mise 创建 `~/.bash_profile` 的安装说明进行设置，那么你现有的
`~/.profile` 配置（包括 PATH、环境变量等）可能会停止加载。

**修复方法：** 改为在 `~/.bashrc` 中添加 mise 的激活，或者在你的
`~/.bash_profile` 中加载 `~/.profile`：

```bash
# ~/.bash_profile
[[ -f ~/.profile ]] && source ~/.profile
```

## 带有 `redact` 环境变量和 `raw` 输出的任务 {#tasks-with-redact-env-vars-break-raw-output}

Raw 和交互式任务会继承终端的输入/输出。mise 无法对绕过其输出处理的内容进行脱敏，并且在配置了脱敏时会发出提示。需要脱敏时，请使用普通任务输出；移除 `redact` 并不能解决机密信息处理问题。请参阅[任务输出](/tasks/task-configuration.html#raw)。

如果较旧版本的 mise 在为 raw 任务配置脱敏时不产生输出，请更新 mise，并使用无害的测试值重试。当前的 raw 模式会直接传递输出。

## `mise activate` 在 CI / 非交互式 shell 中

在 CI 中使用 `mise exec -- command` 或 `mise run task`。它们无需 shell 提示符即可选择环境。当命令需要通过 `PATH` 解析工具时，shims 是另一种选择。完整的提供程序示例请参阅[持续集成](/continuous-integration.html)；有关安装后执行的模式，请参阅[脚本安装](#tool-not-found-after-mise-install-or-mise-use-in-a-script)。

## 找不到命令时不会触发自动安装

当你运行一个找不到的命令时，mise 可以安装提供该命令的工具（[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 功能）。它使用 mise 注册表中的 `bins` 元数据将命令映射回工具，这意味着已配置但从未安装过的工具也会被处理，而不仅仅是你已有工具的缺失版本。

如果没有任何反应，原因通常是以下之一：

- **该工具由原始后端规范配置。**`"cargo:some-crate" = "1.0.0"` 或 `"github:owner/repo" = "1.0.0"` 不是注册表条目，因此不包含 bin 元数据，也没有任何内容可以将你输入的命令与其关联起来。
- **该工具根本没有配置。**处理程序只会安装当前目录配置中已经请求的工具；对于从未声明过的命令，它不会自行选择工具。
- **该工具关闭了此功能**——可能是 [`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 为 `false`，或者该工具被列在 [`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 中。

**解决方法：**

- 如果存在注册表条目，请使用工具的注册表名称（`ripgrep`），而不是原始后端规范（`github:BurntSushi/ripgrep`），这样处理程序才能将命令映射到它。
- 否则，请显式安装，而不要按需安装：使用 `mise install`，或使用 [`mise x|exec`](/cli/exec) 在一步中安装并运行某个命令。两者都会实例化整个已配置的工具集，因此后端无关紧要。[`mise r|run`](/cli/run) 也会执行相同操作，但仅在运行任务时执行。
- 手动安装一次即可让处理程序之后正常工作：有版本存在后，mise 还可以从已安装的可执行文件中发现映射关系。
