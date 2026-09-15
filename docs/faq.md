---
description: "关于日常命令、shell 集成和配置的快速解答。"
outline: [2, 3]
---

# 常见问题

关于日常命令、shell 集成和配置的快速解答。对于失败的命令，请从[故障排除](/troubleshooting.html)或[错误](/errors.html)开始。

## 日常命令

### `mise install` 和 `mise use` 有什么区别？

`mise install` 会安装请求的工具，但不会向配置中添加工具声明。`mise use` 会安装工具，并将其版本请求写入配置文件。

```sh
mise use node@24       # select Node 24 for the project and install it
mise install          # install tools already declared by the project
mise install node@24  # install Node 24 without adding a declaration
```

仅安装不会改变父 shell 的环境。使用激活、shims、`mise exec` 或 `mise run` 来运行选定的工具。要记录具体版本，请将 `--pin` 添加到 `mise use`；要复现项目的 lockfile，请使用 `mise install --locked`。

`mise install node` 会在存在配置请求时使用该请求，否则使用 `latest`。不带工具参数的 `mise install` 会安装已配置的工具集。

### `mise use` 会写入哪里？

默认情况下，mise 会选择最近适用配置目录中优先级最低的配置文件。这可能是父目录中的文件或 `.tool-versions` 文件，不一定是当前目录中的 `mise.toml`。如果该目录中同时存在 `mise.toml` 和 `mise.local.toml`，则优先使用共享配置。请参阅[写入目标选择](/configuration.html#target-file-for-write-operations)。

位置很重要时，请使用明确的目标：

```sh
mise use --path mise.toml node@24  # this file
mise use --global node@24          # global configuration
mise use --env local node@24       # personal local environment
```

`mise use --dry-run node@24` 可以预览操作。`mise config` 会显示当前目录加载的文件。

### 不完整的版本会选择最新发布版本吗？ {#does-node20-mean-the-newest-available-version-of-node}

诸如 `node@20` 这样的不完整请求会限制匹配的版本。对于普通执行，mise 可以重复使用满足请求的已安装版本。安装和升级命令可以解析出更新的可用匹配版本。lockfile 可以固定解析后的结果。

```sh
mise latest --installed node@20  # inspect an installed match
mise latest node@20              # inspect an available match
mise install node@20             # install a matching release
```

使用 `mise ls --current node` 和 `mise which node` 检查此项目实际使用的内容。不要根据目录名称推断选定的版本，也不要假设每个工具都遵循 Node 的版本方案。请参阅[版本选择](/dev-tools/)和[lockfiles](/dev-tools/mise-lock.html)。

### `latest` 是指远程端的最新版本吗？

`latest` 由工具的后端解析。对于普通执行，它可以重复使用已安装的版本，因此新发布的版本不会自动改变你的环境。lockfile 可以进一步限制选择范围。

要查询可用的发布版本，请运行 `mise latest node`。诸如 `mise install node@latest` 或 `mise exec node@latest -- node --version` 这样的显式请求，会在锁定策略允许的情况下请求可用版本，而不是仅重复使用当前已安装的匹配版本。

要在已配置的请求范围内升级，请使用 `mise upgrade node`。要同时更改配置中的请求，请使用 `mise upgrade --bump node`。请参阅[升级工具](/dev-tools/)和[lockfiles](/dev-tools/mise-lock.html)。不同后端对“latest”的定义不同；它并不普遍表示最大的语义版本，也不一定包含预发布版本。

### `mise exec` 如何工作？

`mise exec` 会读取配置，解析并按需安装缺失的请求工具，计算环境，然后运行 `--` 后的命令：

```sh
mise exec -- node --version
mise exec node@24 -- node --version
```

第一条命令使用项目配置的 Node 版本。第二条命令为本次调用提供覆盖值。如果 `mise.toml` 中已经有 `node@24` 请求，就不需要重复输入。子进程会接收 mise 的环境；父 shell 不会改变。

## Shell 和编辑器

### `mise activate` 会做什么？

`mise activate` 会输出 shell 脚本。在 shell 中执行该脚本会安装 mise 函数和钩子，用于刷新工具路径和环境变量。提示符钩子会注意配置变化；支持的 shell 还具有目录变更钩子。

`mise hook-env` 会计算当前目录所需的赋值，包括移除上一个项目中的值。如果没有任何相关内容发生变化，它可以提前退出。它会输出 shell 代码；单独运行可执行文件不会修改其父 shell。

该 shell 函数允许 `mise shell` 和 `mise deactivate` 等命令更新当前会话。将激活配置放入你的[shell 启动文件](/getting-started.html#activate-mise)中。对于脚本或 CI 作业，请使用 `mise exec -- command` 或 `mise run task`，这样执行就不会依赖提示符钩子。请参阅[shell 集成选项](#how-do-mise-activate-shims-mise-exec-and-mise-env-relate)。

### `mise activate`、shims、`mise exec` 和 `mise env` 有什么关系？

每种方法都会在不同边界上提供 mise 工具：

| 方法                    | 环境应用于                                      | 典型用途                   |
| ----------------------- | ----------------------------------------------- | -------------------------- |
| `mise activate`         | 当前 shell，由钩子刷新                          | 交互式终端                 |
| `mise activate --shims` | 向当前 shell 的 PATH 添加 shim 目录             | 编辑器和简单的 shell 设置  |
| 工具 shim               | 启动的工具及其子进程                            | 通过 PATH 找到的命令       |
| `mise exec` / `mise x`  | 一个命令及其子进程                              | 脚本和 CI                  |
| `mise env`              | 输出供其他程序使用的赋值                        | 环境集成                   |
| `mise run`              | 一个任务及其依赖                                | 命名的项目命令             |

Shims 会为它们启动的工具加载 `[env]`，但不会将其导出到父 shell，也不会在那里安装提示符钩子。要使用 shell 钩子和自动 shell 变量更新，请使用常规激活。请参阅[Shims 与 PATH](/dev-tools/shims.html#shims-vs-path)。

### 支持 Windows 吗？

mise 支持原生 Windows，包括 PowerShell 激活。请遵循[Windows 安装说明](/installing-mise.html#windows-winget)和[shell 兼容性表](/getting-started.html#shell-feature-compatibility)。

Shims、`mise exec` 和 `mise run` 同样可用。shim 会为它启动的工具加载 mise 环境；它不会更新父 PowerShell 会话。

后端和工具的支持因平台而异。asdf shell 插件要求 Unix；在 Windows 上请使用兼容的 core、binary-download 或 vfox 实现。WSL 使用 Linux 工具，并且应有自己独立的 Linux mise 安装。请参阅[Windows 故障排除](/troubleshooting.html#windows-problems)。

### 为什么 Windows 编辑器会报告 `spawn EINVAL`？ {#vscode-for-windows-extension-with-error-spawn-einval}

如果扩展尝试直接启动 `.cmd` shim，则在 [Node.js 安全修复](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2#command-injection-via-args-parameter-of-child_processspawn-without-shell-option-enabled-on-windows-cve-2024-27980---high)之后，可能会出现 `spawn EINVAL`。

使用默认的 [`windows_shim_mode = "exe"`](/configuration/settings.html#windows_shim_mode)，运行 `mise reshim`，然后重启受影响的扩展或语言服务器。如果它仍然解析旧的 shim 路径，请参阅[IDE 集成](/ide-integration.html)。

### 如何禁用或强制 CLI 颜色输出？

使用 `NO_COLOR=1` 或 `MISE_COLOR=0` 禁用 ANSI 颜色，使用 `CLICOLOR_FORCE=1` 强制启用颜色，包括在管道传输输出时。`NO_COLOR=1` 和 `MISE_COLOR=0` 的优先级高于 `CLICOLOR_FORCE=1`；强制启用颜色时，请取消设置这些禁用覆盖项。

```sh
NO_COLOR=1 mise ls
CLICOLOR_FORCE=1 mise ls
```

这些设置控制 mise 的输出。子工具可能有自己的颜色选项。

## 配置和网络

### 如何不将个人配置放入 Git？ {#i-don-t-want-to-put-a-mise-toml-tool-versions-file-into-my-project-since-git-shows-it-as-an-untracked-file}

使用 `mise.local.toml` 保存个人项目设置。将其添加到 `.git/info/exclude`，即可只在当前检出中忽略它；或者将其添加到全局 Git 忽略文件，以便在所有项目中忽略它。将共享的工具版本和任务保存在已提交的 `mise.toml` 中。

如果需要将 `mise.toml` 本身对当前检出保持私有，也可以使用相同的忽略机制。如果团队同意此策略，项目的 `.gitignore` 也是一种选择。忽略规则只会影响未跟踪文件；不会隐藏 Git 中已有文件的更改。

### “nodejs”和“node”（或“golang”和“go”）有什么区别？

它们是别名。例如，`mise install nodejs@24` 与 `mise install node@24` 相同。这意味着它们不能是不同的插件。

这样做是为了方便，因此你不必记住哪个是“官方”名称。如果别名行为异常，请使用规范名称 `node` 和 `go`，并[报告不匹配](/contact.html)。在底层，当 mise 读取配置文件或 CLI 输入时，它会将“nodejs”和“golang”替换掉。

当 mise _写入_ `mise.toml`（`mise use`、`mise unuse`）时，它会写入规范名称——`nodejs` 条目会变成 `node`，同时保留其注释。`.tool-versions` 文件不受影响，仍然使用 asdf 的拼写方式。

### 我的配置文件被忽略了／遇到了 `mise trust` 问题

信任取决于配置内容和命令，而不是文件作者。安全配置文件——只包含 `min_version`、值为纯版本字符串或字符串数组的 `[tools]` 条目，以及不含模板的 `[tasks]`——无需信任即可加载。工具选项表和其他顶层设置需要信任。在正常模式且不在 CI 中时，`mise run`、裸任务调用（例如 `mise <TASK>`）、`mise install`、`mise exec` 和 `mise watch` 会自动信任活动配置，因为它们会明确执行项目定义的行为。其他不安全配置需要信任。常见问题包括：

- **意外拒绝信任**：如果 mise 提示你信任某个文件，而你选择了否，该文件会被加入忽略列表。检查 `mise trust --show`，然后运行 `mise trust path/to/mise.toml`，再次信任经过审查的文件。
- **符号链接配置**：如果你的配置是符号链接（例如通过 GNU Stow），mise 可能会跟踪符号链接目标路径。尝试让 `mise trust` 指向实际文件路径。
- **CI**：在检测到 CI 时，除非启用了 paranoid 模式，否则 mise 会假设配置已受信任。
- **非交互模式**：在非交互式 shell 中，例如 IDE 扩展或没有 TTY 的脚本中，mise 无法提示你信任配置。在正常模式下的 `mise run`、`mise <TASK>`、`mise install`、`mise exec` 和 `mise watch` 之外，直接加载不受信任的 `mise.toml` 的命令可能会因不受信任的配置错误而失败。发现之前已跟踪的配置的命令可能会改为跳过不受信任的条目。请提前运行 `mise trust`，或在全局设置中配置你信任的配置文件路径 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)。
- **全局配置**由操作者管理，不需要项目级信任。如果你认为某个文件是全局配置，但它却被发现为项目配置，请检查 `mise config`。

运行 `mise doctor`（`mise dr`）可以查看是否有配置文件不受信任——它会在“problems”下列出这些文件。

另外，请检查当前目录以及选定的[配置环境](/configuration/environments.html)。未选中的配置文件不是信任失败。

### 习惯用法版本文件（`.python-version`、`.node-version` 等）如何工作？

习惯用法版本文件（`.python-version`、`.node-version`、`.ruby-version` 等）在 mise 中**默认是禁用的**。只有当你通过 [`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 为每个工具显式启用时，才会读取它们：

```sh
# 启用读取 .node-version 文件
mise settings add idiomatic_version_file_enable_tools node
```

如果你之前启用了习惯用法文件，现在想让 mise 停止读取它们（例如因为 `uv` 管理 `.python-version`），请从已配置列表中移除该工具。完全取消设置该选项即可恢复其空默认值。

更多信息请参见[习惯用法版本文件](/configuration.html#idiomatic-version-files)。

### 简写插件名称如何映射到仓库？

内置的[注册表](/registry.html)会将短名称映射到后端规范，例如 `aqua:owner/repo` 或 `vfox:owner/plugin`。它维护在仓库的[`registry/`](https://github.com/jdx/mise/tree/main/registry)目录中，并随 mise 一起发布。

大多数工具不需要外部插件。使用 `mise tool ripgrep` 检查工具选定的后端，或使用 `mise registry ripgrep` 查看可用选项。对于由插件支持的工具，后端规范会标识插件仓库。请参阅[后端选择](/dev-tools/backend_architecture.html#how-backend-selection-works)。

### 如何通过 HTTP 代理使用 mise？

在启动 mise 的环境中设置 `http_proxy` 和 `https_proxy`。例如，将下面的代理主机和端口替换为你所在组织的代理：

```sh
https_proxy=http://proxy.example.com:8080 mise install
```

插件脚本和包管理器可能有单独的代理或证书设置。如果只有某个后端失败，请在详细输出中确定子进程或 URL，并检查该工具的代理配置。网络和身份验证失败请参阅[错误](/errors.html)。

## 迁移

### 如何从 asdf 迁移？

1. 安装 mise 并[配置 shell 激活](/getting-started.html#activate-mise)。
2. 从 shell 启动文件中移除 asdf 激活，然后打开一个新 shell。
3. 在包含 `.tool-versions` 的项目中运行 `mise install`，然后使用 `mise exec -- node --version` 验证已配置的工具（替换为项目中的工具）。

mise 会读取 `.tool-versions`，但其全局配置通常位于 `~/.config/mise/config.toml`。检查 `~/.tool-versions`，并使用 `mise use --global` 添加你需要的默认值。例如，在选择所需版本后：

```sh
mise use --global node@24 python@3.14
```

此示例会选择新的默认值；它不是对任意 asdf 文件的无损转换。在检查每个工具之前，请保留旧文件，包括包含多个版本或别名的条目。不要在 asdf 和 mise 之间共享安装目录。确认无误后，你可以[卸载 asdf](https://asdf-vm.com/manage/core.html#uninstall)。

### mise 与 asdf 的兼容性如何？

mise 在 Unix 上支持 `.tool-versions` 和 asdf shell-plugin 接口。不保证与每个 asdf 命令或插件兼容。请优先使用每个命令帮助中显示的 mise 语法，例如 `mise install node@24`。

asdf 的 Go 重写版引入了 `asdf set` 等命令。`mise set` 用途不同：它用于设置环境变量。请使用 `mise use` 选择工具版本。

如果团队在两个工具之间共享 `.tool-versions`，请使用 asdf 接受的具体版本。`mise use --pin` 会写入解析后的版本，而不是模糊请求。你也可以将 `mise.toml` 与 `.tool-versions` 放在一起；对于同一级目录中同时声明的工具，mise 文件优先。请参阅[asdf 兼容性](/asdf-legacy-plugins.html)和[插件使用](/plugin-usage.html)。

## 范围和相关工具

### mise 可以管理系统包和桌面应用程序吗？ {#mise-is-for-dev-tools-not-applications-or-system-packages}

`[tools]` 管理有版本的开发工具和运行时。主机软件包、桌面应用程序和系统库应放在[`[bootstrap.packages]`](/bootstrap/packages/)中。

例如，编译器可能需要操作系统开发库软件包才能构建工具。请使用适当的管理器声明该软件包，并通过 `mise bootstrap` 应用它。大多数管理器会委托给操作系统包管理器；mise 内置的 Homebrew 安装器可以处理 `brew:` 和 `brew-cask:` 条目，而不要求安装 Homebrew 本身。

主机软件包共享计算机的软件包数据库或前缀。仅仅因为它们在 `mise.toml` 中声明，并不会获得按项目切换版本的能力。

### 如何安装其他用户无需 mise 即可运行的工具？

有两项功能可以安装运行时无需 mise、且能在 `PATH` 上使用的二进制文件。

对于有 Homebrew formula 的工具，请使用带有 `brew:` 条目的 [`[bootstrap.packages]`](/bootstrap/packages/)：

```toml
[bootstrap.packages]
"brew:ffmpeg" = "latest"
"brew:jq" = "latest"
```

mise 会将 bottles 写入规范前缀（Linux 上为 `/home/linuxbrew/.linuxbrew`，arm64 macOS 上为 `/opt/homebrew`），并创建常规的 `<prefix>/bin` 链接，同时不要求安装 Homebrew 本身。一旦将 `<prefix>/bin` 添加到 `PATH`，这些二进制文件的行为就与其他 Homebrew 安装的程序一样。[Keg-only](https://docs.brew.sh/FAQ#what-does-keg-only-mean) formula 是例外：与 brew 一样，mise 不会将它们放入前缀目录，因此它们的二进制文件会保留在 `<prefix>/opt/<name>/bin`。

在 arm64 macOS 以及运行 mise brew 管理器的 x86_64/arm64 Linux 上，`mise bootstrap packages import --manager brew` 会将现有的 Homebrew 或 Linuxbrew 设置快照保存到你的配置中——可以保存你按需安装的 formula，也可以通过 `--all` 保存所有已链接的 formula。

对于 mise 支持的任何后端，请使用 [`mise install-into`](/cli/install-into.html)。它会将一个工具版本安装到你选择的目录中，以便在 mise 之外使用：

```sh
mise install-into node@24 "$HOME/standalone-node"
"$HOME/standalone-node/bin/node" --version
```

请将其指向新的或空的目录：`install-into` 会在确认提示后删除目标位置中已有的内容；确认提示默认为否，或者在 `--yes` 下不询问。工具安装会进入该目录；后端也可能使用 mise 缓存并安装依赖项。请像上面的 brew 前缀一样，自行将其 `bin` 添加到 `PATH`。对于需要环境变量（例如 `JAVA_HOME`）或其他 mise 通常在运行时应用的配置的工具，仍然需要手动设置这些内容。

这两种方式都与 Homebrew 做出了相同的取舍：为所有人提供 `PATH` 上的一个版本，而不支持按项目选择版本。如果你需要按项目选择版本，请将工具保留在 `[tools]` 中，并让 [`mise bootstrap`](/bootstrap.html) 通过一条命令统一配置每个用户的激活状态、配置和工具——或者通过 [`mise bootstrap remote`](/bootstrap/remote.html) 在多台主机上完成。

### mise 安全吗？

mise 支持下载验证、配置文件信任，以及安全模式和 paranoid 模式等可选限制。它们提供的保障取决于后端和操作。请从[安全性](/security.html)开始，了解威胁模型和可用控制措施。请通过 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) 报告漏洞。

### usage 是什么？

[usage](https://usage.jdx.dev/) 是用于定义 CLI 工具的规范和 CLI。

参数、标志、环境变量和配置文件都可以在 usage 规范中定义。单个定义可以驱动帮助文本、参数解析和补全。

mise 将 usage 集成用于任务参数解析、帮助和自动补全，因此不需要单独的 `usage` CLI。请参阅[自动补全](/installing-mise.html#autocompletion)。

你可以在文件任务中使用 usage 来实现自动补全；请参阅[文件任务参数](/tasks/file-tasks.html#arguments)。

### pitchfork 是什么？

[pitchfork](https://pitchfork.jdx.dev/) 是面向开发者的进程管理器。Mise 可以通过实验性的[守护进程集成](/daemons)管理自定义进程和数据库预设。

它提供守护进程管理功能，例如失败时自动重启、智能就绪检查、进入项目目录时基于 shell 的自动启动或停止，以及按 cron 风格为周期性任务安排计划。

对于命令和依赖排序，请使用[mise 任务](/tasks/)；当服务需要独立于任务调用持续运行时，请使用进程监管器。

### mise 的版本控制如何工作？

mise 使用日历版本，格式为 `YYYY.MONTH.RELEASE`，例如 `2026.9.1`。最后一个数字是当月的发布计数，不代表月份中的某一天，也不是兼容性指标。

新功能可能会在 `experimental = true` 等设置后启用。弃用警告和[发行说明](https://github.com/jdx/mise/releases)会描述行为变化；不要根据类似 SemVer 的主版本推断兼容性。对于团队所需的 mise 版本，请使用 [`min_version`](/configuration.html)。
