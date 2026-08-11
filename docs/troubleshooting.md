# 故障排除

如果你正在寻找有关特定错误消息的帮助，请参阅 [错误](/errors.html)——本页面则按症状组织。

## `mise activate` 不能在 `~/.profile`、`~/.bash_profile`、`~/.zprofile` 中使用

`mise activate` 只能用于 `rc` 文件中。这些是交互式文件，供真实用户在使用终端时加载。（而不是由 IDE 或其他程序执行时）。在非交互式环境中不会显示提示符，因此 PATH 不会被修改。

对于非交互式场景，建议改用 shims，因为它们每次执行时都会通过查看 `PWD` 将调用路由到正确的目录。你也可以使用 `mise exec`，而不是期望命令直接在 PATH 中可用。你还可以在非交互式 shell 中运行 `mise env`，不过那样
只会设置全局工具。进入不同项目时，它不会修改环境变量。

::: warning
`mise activate --shims` 不支持 `mise activate` 的所有功能。<br>
有关更多信息，请参见 [shims vs path](/dev-tools/shims.html#shims-vs-path)。
:::

另请参见 [shebang](/tips-and-tricks#shebang) 示例，了解如何让脚本调用 mise 来获取运行时。
这也是在不进行激活的情况下使用 mise 的另一种方式。

## 缓慢的 shell 提示符 {#slow-shell-prompts}

`mise activate` 会在每次提示符时运行一个 hook，以检查工具或环境变量是否需要更新。这通常只需要几毫秒，但如果你觉得提示符很卡顿，可以使用 `MISE_TIMINGS` 对其进行性能分析：

先停用 mise，这样提示符 hook 就不会干扰你的测量，然后手动运行带有 timings 的 `hook-env`：

```sh
mise deactivate

# 显示每个主要步骤的耗时（按颜色区分：红色 = 慢）
MISE_TIMINGS=1 mise hook-env -s bash 2>&1 >/dev/null

# 或使用 =2 获取更详细的逐步拆分，以及累计耗时
MISE_TIMINGS=2 mise hook-env -s bash 2>&1 >/dev/null
```

将 `bash` 替换为你的 shell。提示符变慢的常见原因包括：

- `mise.toml` 中代价很高的 `_.source` 脚本——它们会在每次提示符时重新运行
- 工具或插件数量很多
- env 指令中依赖网络的操作

请注意，[`mise activate --shims`](/dev-tools/shims) 会把成本从每次提示符转移到每次工具调用；根据你的工作流，这种方式可能更快，也可能更慢。有关权衡请参见 [Shims vs PATH](/dev-tools/shims.html#shims-vs-path)。

## mise 出现故障或无法正常工作

首先尝试设置 `MISE_DEBUG=1` 或 `MISE_TRACE=1`，看看是否能提供更多信息。  
你也可以设置 `MISE_LOG_FILE_LEVEL=debug MISE_LOG_FILE=/path/to/logfile`，将日志写入文件。

如果是 activate hook 出现了问题，你可以尝试禁用它，并手动调用 `eval "$(mise hook-env)"`。  
使用 `mise env` 也会很有帮助，它只会输出将要设置的环境变量。  
另外也可以考虑使用 [shims](/dev-tools/shims.md)，这通常兼容性更好。

如果运行时安装无法正常工作，尝试使用 `--raw` 标志，它会按顺序安装内容，并直接将 stdin/stdout/stderr 连接到终端。  
如果某个插件因为某种原因试图与你交互，这样就能让它正常工作。

当然，也要检查 `mise --version` 的版本，并确保它是最新的。  
使用 `mise self-update` 来更新它。`mise cache clean` 可用于清空内部缓存，`mise implode` 可用于删除除配置之外的所有内容。

最后，还有 `mise doctor`，它会显示诊断信息以及检测到的关于你设置的任何警告。  
如果你提交 bug 报告，请包含 `mise doctor` 的输出。

## 正在使用错误版本的工具

这很可能意味着 mise 并不是 PATH 中的第一个——可能是在使用 shims 或 `mise activate`。你可以通过调用 `which -a` 来验证是否如此，例如，如果当前使用的是 node@20.0.0，但 mise 指定的是 node@26.0.0，首先确保 mise 已安装并激活了这个版本，方法是运行 `mise ls node`。它不应显示 missing，并且应有正确的 "Requested" 版本：

```bash
$ mise ls node
Plugin  Version  Config Source       Requested
node    24.0.0  ~/.mise/config.toml  24.0.0
```

如果 `node -v` 没有显示正确的版本，请通过运行 `mise doctor` 确保 mise 已被激活。它不应在关于 mise 未激活的部分列出 "problem"。最后，运行 `which -a node`。如果列出的目录不是 mise 目录，那么 mise 就不是 PATH 中的第一个。首先被运行的那个 node 的目录需要在 mise 之前设置。通常这意味着要把 PATH 中的 mise shims 设置放在 bashrc/zshrc 的末尾。

如果使用 `mise activate`，你还有另一个选择：启用 `MISE_ACTIVATE_AGGRESSIVE=1`，这样 mise 会始终将其工具前置，使其成为 PATH 中的第一个。如果你使用的是某些也会像 `mise activate` 一样动态修改路径的东西，这可能不会生效，因为另一个工具可能会在 mise 之后修改 PATH。

如果没有其他办法，你可以使用 [`mise x --`](/cli/exec) 来运行命令，以确保使用的是正确版本。

## 工具的新版本不可用

版本有两个地方会被缓存，因此一个全新的发布可能不会立刻出现。

第一处是 mise CLI 会缓存版本。可以使用 `mise cache clear` 清除缓存。

第二处使用 <https://mise-versions.jdx.dev> 主机作为一个集中位置来列出大多数插件的所有版本。这样做的目的是加快 mise 的速度，并且在查询新版本时绕过 GitHub 的速率限制。请检查你的插件对应的仓库，看看是否有更新版本。可以通过设置 `MISE_USE_VERSIONS_HOST=0` 来禁用此服务。

mise 还会把 versions host 用作公共 GitHub release 元数据和 GitHub artifact attestations 的共享缓存。这意味着，公共 `github:` 和许多 `aqua:` 工具的正常安装，即使在没有配置 token 的 Docker 构建或 CI 作业中，也可以避免未认证的 GitHub API 调用。如果 versions host 还没有所请求的元数据，mise 会回退到 GitHub 的 API。

mise-versions 本身也会受到速率限制的影响，但你可以通过使用其 [GitHub app](https://github.com/apps/mise-versions) 进行认证来帮助它更频繁地获取数据。它不需要任何权限，因为它只是获取公共仓库信息。这样做的人越多，mise 就越能更快地获取工具的新版本。

## Windows 问题

::: warning
目前对 Windows 仅提供非常基础的支持，不过由于 Windows 不支持 asdf
插件，它们必须仅使用 core 和 vfox——这意味着 Windows 上只有少数几个工具可用。
:::

### 路径长度限制

如果你在 `mise.toml` 层级结构中定义了很多工具，那么 `mise x` 可能会生成一个过长的 `Path` 环境变量，以至于某些工具无法处理，最典型的是 `cmd.exe`。这会影响调用 `cmd.exe` 的 `mise` 工具（例如 `npm install`）。

限制为 **8191 个字符**，而 `cmd.exe` 不会截断更长的 `Path`——它会[完全忽略该变量](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/command-line-string-limitation)。因此，表现并不是某一个工具消失了：所有通过 `Path` 找到的内容会同时停止解析，并报告 `is not recognized`。`C:\Windows\System32` 中的程序仍然可以运行，因为 `cmd.exe` 无需查询 `Path` 就能找到它们——这正是该故障看起来毫无规律的原因，也说明了下面的测试为何重要。

你有以下几种选择：

1. 将 `MISE_INSTALLS_DIR` 环境变量设置为更短的路径，例如 `C:\.mise-installs`。
1. 使用 `powershell.exe` 或 `pwsh.exe` 替代 `cmd.exe`，因为它们可以处理更长的 `Path`。
1. 重新组织 monorepo 中的 `mise.toml` 文件，使其只指定所需的工具。
1. [Shims](/dev-tools/shims.html) 可以防止你的** shell** 的 `Path` 随工具集增长——`mise activate --shims` 添加的是一个目录，而不是每个工具各添加一个目录。但请注意它无法解决的问题：通过 shim 运行工具时，仍然会构建一个包含所有活动工具目录的环境，因此，一个由 mise 管理且自身调用 `cmd.exe` 的工具（例如 `npm`）无论采用哪种方式，看到的都是同样过长的 `Path`。此外，Shims [不支持](/dev-tools/shims.html#shims-vs-path) `mise activate` 的全部功能。

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

关于该测试，有两点需要注意。请选择一个**不在** `C:\Windows\System32` 中、也不在运行测试所在目录中的程序：`cmd.exe` 会在查询 `Path` 之前搜索当前目录，并且完全无需查询 `Path` 就能找到系统目录中的程序，因此无论 `Path` 多长，在这两个位置进行探测都会成功。这正是 `where.exe` 无法告诉你任何信息的原因。然后，先确认所选程序可以正常运行（例如在 shell 中运行 `git --version`），因为一个你根本没有安装的程序也会产生与该限制相同的 `is not recognized` 错误。

重复的 `Path` 条目不像过去那样影响明显：重新激活时，mise 现在会在添加当前工具集的目录之前，移除它在继承的 `Path` 中找到的过时安装目录（v2026.5.18）；从 v2026.7.18 起，它还会在计算环境（`mise x`、`mise run`、`mise env`、`mise doctor`）时合并完全重复的条目。这会减少 mise 添加的内容，但不会提高上限——足够多的不同工具仍然会达到 8191 个字符。

### Shims 泄漏到 WSL

当 `windows_shim_mode` 设置为 `file` 时，mise 会在每个 `<tool>.cmd` shim 旁边写入一个没有扩展名的 bash
脚本（这样 Git Bash / Cygwin 就能解析该工具）。WSL 默认的 Windows-PATH 互操作会将 shims 目录暴露为
`/mnt/c/...`，其中每个文件都被视为可执行文件，因此在 WSL 中运行一个 shim 工具实际上会原生执行该脚本。mise 对生成的脚本做了保护：
当检测到 WSL 时，它会从 `PATH` 中移除 shims 目录，并在已安装原生 Linux 工具时运行该工具；否则它会以普通的 `<tool>: not
found` 失败，而不是无限递归或报出 `mise: not found`。

默认的 `exe` 模式不受影响：它只会写入原生的 `<tool>.exe`
文件，而 WSL 会忽略这些文件，因此不会泄漏到 Linux 中。

如果想要让 Windows shims 完全不进入 WSL，可以选择在 WSL 内使用 mise 安装/管理该工具，或者在 `/etc/wsl.conf` 中禁用 Windows-PATH 互操作：

```ini
[interop]
appendWindowsPath = false
```

### 从 PowerShell 运行 `shell = "bash -c"` 的任务时出现 `command not found`

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

mise 还会检测 Cygwin bash（通过其路径中的 `cygwin` / `cygwin64` / `cygwin32` 段），并且
使用 Cygwin 的 `/cygdrive/c/...` 形式来转换 PATH，而不是 Git Bash 的 `/c/...`，
这样 PATH 上的二进制文件就能正确解析。请将 `MISE_BASH_PATH` 指向你的 Cygwin bash，以便
使用预期的那个：

```powershell
$env:MISE_BASH_PATH = "C:\cygwin64\bin\bash.exe"
```

#### 自定义 `cygdrive` 挂载根（Cygwin **以及** Git Bash / MSYS2）

`cygdrive` 自动挂载机制是 Cygwin 和 MSYS2 / Git Bash 共享的——它们都允许
你在 `/etc/fstab` 中更改挂载根（Cygwin 的默认值是 `/cygdrive`，Git Bash /
MSYS2 的默认值是 `/`，也就是 `/c/...`）。mise 不会读取 `/etc/fstab`，因此如果你修改了它，
请设置 `MISE_CYGDRIVE_PREFIX` 以匹配——这对**任一** shell 都适用：

```powershell
# 例如，适用于将驱动器挂载在 /mnt 下的 fstab
$env:MISE_CYGDRIVE_PREFIX = "/mnt"
```

前缀必须是绝对路径（以 `/` 开头）；像 `mnt` 这样的相对值会被拒绝，
并给出警告，随后改用 shell 的默认值。`MISE_CYGDRIVE_PREFIX=/`
会折叠为 Git Bash 的 `/c/...` 形式。

## 在 tmux 或其他 shell 初始化脚本中调用时，mise 不工作

`mise activate` 在 shell 提示符显示之前不会更新 PATH。因此，如果你需要在提示符显示之前访问
由 mise 提供的工具，你可以选择
[将 shims 添加到你的 PATH](/dev-tools/shims.html#how-to-add-mise-shims-to-path)，例如：

```bash
export PATH="$HOME/.local/share/mise/shims:$PATH"
python --version # 在将 shims 添加到 PATH 后即可工作
```

或者你可以手动调用 `hook-env`：

```bash
eval "$(mise activate bash)"
eval "$(mise hook-env)"
python --version # 只有在显式调用 hook-env 之后才会工作
```

有关更多信息，请参见 [“mise activate” 的作用是什么？](/faq#what-does-mise-activate-do)。

## mise 是安全的吗？

提供一个安全的供应链非常重要。与 asdf 相比，mise 已经提供了更安全的
使用体验。欢迎围绕安全进行评估和贡献。我们也敦促用户关注他们使用的插件，并敦促插件作者关注
他们所服务的用户。

更多详情请参见 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md)。

## 安装工具时出现 403 Forbidden

你可能会遇到如下错误之一：

```text
HTTP status client error (403 Forbidden) for url
403 API rate limit exceeded for
```

如果该工具托管在 GitHub 上，并且你已经触发了 API 速率限制，就可能会发生这种情况。这在 GitHub Actions 之类的 CI 环境中运行 mise 时尤其常见。

默认情况下，mise 使用 <https://mise-versions.jdx.dev> 来避免大多数公共 GitHub API 调用，用于获取发布元数据和工件证明检查。如果你仍然看到此错误，通常意味着版本主机上尚未提供该元数据，设置了 `MISE_USE_VERSIONS_HOST=0`，该工具使用的是私有仓库，或者该工具使用了 GitHub Enterprise/自定义 API 设置。

有关如何配置身份验证并避免速率限制，请参阅 [GitHub Tokens](/dev-tools/github-tokens.html)。

## 在脚本中执行 `mise install` 或 `mise use` 后找不到工具

如果你在脚本中运行 `mise use` 或 `mise install`，然后立即尝试使用该工具，它可能会找不到。这是因为 `mise activate` 会在下一个提示符时更新 PATH，而脚本中不会出现这种情况。

**解决方案：**

```bash
# 选项 1：使用 mise exec（推荐）
mise install
mise exec -- my-tool --version

# 选项 2：在安装后重新评估环境
mise install
eval "$(mise hook-env)"
my-tool --version

# 选项 3：使用 shims（它们始终动态解析）
export PATH="$HOME/.local/share/mise/shims:$PATH"
mise install
my-tool --version
```

## 创建 `~/.bash_profile` 会破坏 Ubuntu/Debian 上现有的 `~/.profile`

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

## 带有 `redact` 环境变量的任务会导致 `raw` 输出失效

如果你在配置中的任何环境变量上设置了 `redact = true`，那么带有 `raw = true` 的任务看起来会
没有输出。这是因为 mise 会拦截 stdout/stderr 以执行脱敏，这
与 raw 模式冲突。

**解决方法**：从不需要它的环境变量中移除 `redact`，或者接受在启用脱敏时，raw 任务
不会产生可见输出。

## `mise activate` 在 CI / 非交互式 shell 中

`mise activate` 会挂钩到 shell 提示符以更新 PATH，因此从历史上看，它在非交互式 shell 中无法工作。随着 `chpwd` 支持的加入，它现在可以在更多场景下工作了，但我们仍然建议在 CI 和脚本中使用这些方法：

```bash
# 选项 1：使用 shims（推荐用于 CI）
export PATH="$HOME/.local/share/mise/shims:$PATH"
# 在 GitHub Actions 中，使用：echo "$HOME/.local/share/mise/shims" >> $GITHUB_PATH

# 选项 2：使用 mise exec
mise exec -- npm test

# 选项 3：在 activate 之后手动调用 hook-env
eval "$(mise activate bash)"
eval "$(mise hook-env)"
```

另请参阅 Tips & Tricks 中的 [CI/CD 部分](/tips-and-tricks.html#ci-cd)。

## 找不到命令时不会触发自动安装

当你运行一个找不到的命令时，mise 可以安装提供该命令的工具（[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 功能）。它使用 mise 注册表中的 `bins` 元数据将命令映射回工具，这意味着已配置但从未安装过的工具也会被处理，而不仅仅是你已有工具的缺失版本。

如果没有任何反应，通常是以下原因之一：

- **工具是通过原始后端规范配置的。** `"cargo:some-crate" = "1.0.0"` 或 `"ubi:owner/repo" = "1.0.0"` 不是注册表条目，因此不包含 bin 元数据，也就无法将你输入的命令与其关联起来。
- **工具根本没有配置。** 处理程序只会安装当前目录中配置要求的工具；对于从未声明过的命令，它不会自行选择对应的工具。
- **该工具的功能已关闭**——可能是 [`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 为 `false`，也可能是该工具列在 [`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 中。

**解决方法：**

- 如果存在注册表条目，请使用工具的注册表名称（`ripgrep`），而不是原始后端规范（`ubi:BurntSushi/ripgrep`），这样处理程序就能将命令映射到该工具。
- 否则请显式安装，而不要按需安装：使用 `mise install`，或使用 [`mise x|exec`](/cli/exec) 在一步中完成安装并运行。二者都会实际安装整个已配置的工具集，因此与后端无关。[`mise r|run`](/cli/run) 也会执行相同操作，但仅作为运行任务的一部分。
- 手动安装一次后，处理程序就能从此正常工作：有了已安装的版本后，mise 也可以从已安装的可执行文件中发现该映射。
