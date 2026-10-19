---
description: "快速了解 mise 命令、版本请求、Shell 激活、配置文件信任及相关工具。"
socialDescription: "快速了解 mise 命令、版本请求、Shell 激活和配置文件信任。"
outline: [2, 3]
---

# 常见问题

如果命令运行失败，请参阅[故障排查](/troubleshooting.html)，或在[错误信息](/errors.html)中查找对应提示。

## 日常命令

### `mise install` 和 `mise use` 有什么区别？

`mise install` 负责安装工具。`mise use` 除了安装工具，还会将版本请求写入配置文件：

```sh
mise use node@24      # add Node 24 to mise.toml and install it
mise install          # install every tool the project declares
mise install node@24  # install Node 24 without changing config
```

这两个命令都不会更改运行它们的 shell 环境。启用 shell 激活后，下次显示提示符时会应用变更；否则，请通过 `mise exec` 或 `mise run` 运行工具。未指定版本时，`mise install node` 会安装项目请求的版本；如果项目没有请求版本，则安装 `latest`。不带参数运行 `mise install` 会跳过标记为 `lazy = true` 的工具；添加 `--include-lazy` 也可安装这些工具。

### `mise use` 会写入哪里？

`mise use` 会写入适用于当前目录的最近配置文件。该文件可能位于父目录中，也可能是 `.tool-versions`。如果目录中同时有 `mise.toml` 和 `mise.local.toml`，mise 会写入 `mise.toml`。详见[mise 会写入哪个文件](/configuration.html#target-file-for-write-operations)。

若要自行指定文件：

```sh
mise use --path mise.toml node@24  # this file
mise use --global node@24          # your global config
mise use --env local node@24       # mise.local.toml, for personal versions
```

`mise use --dry-run node@24` 会显示将要进行的变更；`mise config ls` 则会列出 mise 在当前目录中加载的配置文件。

### `node@20` 会使用最新的 Node 20 发行版吗？ {#does-node20-mean-the-newest-available-version-of-node}

不会自动更新。项目请求 `node = "20"` 时，mise 会使用你已安装的最新 Node 20 版本。只有在未安装任何 20.x 版本，或运行 `mise install node@20`、`mise upgrade node` 时，mise 才会从可用发行版中选择：

```sh
mise latest --installed node@20  # the installed 20.x that mise uses
mise latest node@20              # the newest 20.x available
mise upgrade node                # install that release and use it
```

如果项目有[锁文件](/dev-tools/mise-lock.html)，mise 会使用其中记录的版本。详见[请求的解析方式](/dev-tools/versions.html#how-requests-resolve)。

### `latest` 表示最新发行版吗？ {#does-latest-mean-the-newest-remote-version}

在配置文件中并非如此。`node = "latest"` 会使用你已安装的最新版本，因此上游发布新版本后，只有运行 `mise upgrade node` 才会更新环境。在命令行中，`mise install node@latest`、`mise exec node@latest -- node -v` 和 `mise latest node` 会向后端查询最新发行版。

`latest` 的含义由各后端决定。它不一定对应版本号最大的发行版，而且多数后端不会包含预发行版。详见[版本请求和版本文件](/dev-tools/versions.html)及[升级工具](/dev-tools/#upgrade-tools)。

### `mise exec` 如何工作？

[`mise exec`](/cli/exec.html) 会读取当前目录的配置、安装缺少的工具，并使用项目工具和环境变量运行 `--` 后的命令：

```sh
mise exec -- node --version          # the Node version the project selects
mise exec node@24 -- node --version  # Node 24 for this one command
```

该命令及其子进程会获得此环境；你的 shell 本身不会改变。

## Shell 和编辑器

### `mise activate` 会做什么？

`mise activate` 会为你的 shell 输出一段脚本。启动文件运行该脚本后，mise 会为当前目录设置 `PATH` 和 `[env]` 变量，并添加一个在每次显示提示符前运行的 hook；在大多数 shell 中，执行每次 `cd` 后也会运行。该 hook 会更新当前目录的环境，并移除上一个项目的变量。激活过程还会定义 `mise` shell 函数，让 `mise shell` 和 `mise deactivate` 能修改当前会话。

请参照[配置 Shell](/shell-setup.html)完成设置。脚本和 CI 作业不会显示提示符，因此请在其中使用 `mise exec` 或 `mise run`。

### `mise activate`、shims、`mise exec` 和 `mise env` 有什么关系？

它们会在不同场景中提供 mise 工具：`mise activate` 更新交互式 shell；shims 为通过 `PATH` 查找工具的编辑器和其他程序提供入口；`mise exec` 和 `mise run` 为单条命令或任务准备环境；`mise env` 则输出供其他程序载入的变量。对比请参阅[选择 mise 工具的使用方式](/dev-tools/shims.html#overview)。

### mise 支持 Windows 吗？ {#windows-support}

可以。mise 可原生运行于 Windows，并支持 PowerShell 激活、shims、`mise exec` 和 `mise run`。可通过 `winget install jdx.mise` 安装；Scoop 和 Chocolatey 的安装方式请参阅 [Windows 安装说明](/installing-mise.html#windows)。PowerShell、Git Bash 或 `cmd.exe` 的设置方法请参阅 [Shell 配置](/shell-setup.html#windows)。

asdf 插件提供的工具无法在原生 Windows 上运行，因为这类插件是 shell 脚本。如果工具本身支持 Windows，核心工具及 aqua、github、http、npm 和 vfox 等后端都可以运行。`mise registry <tool>` 会列出该工具可用的后端。在 WSL 中，请安装 Linux 版 mise 并在其中管理 Linux 工具。Windows 问题请参阅[故障排查](/troubleshooting.html#windows-problems)。

### 如何关闭颜色输出或强制启用？ {#how-do-i-disable-force-cli-color-output}

设置 `NO_COLOR=1` 或 `MISE_COLOR=0` 可关闭颜色；设置 `CLICOLOR_FORCE=1` 可在输出被重定向到管道时仍启用颜色：

```sh
NO_COLOR=1 mise ls
CLICOLOR_FORCE=1 mise ls | less -R
```

`NO_COLOR=1` 和 `MISE_COLOR=0` 的优先级高于 `CLICOLOR_FORCE=1`。这些变量只控制 mise 自身的输出；mise 运行的工具有各自的颜色选项。

## 配置和网络

### 如何不将个人配置放入 Git？ {#i-don-t-want-to-put-a-mise-toml-tool-versions-file-into-my-project-since-git-shows-it-as-an-untracked-file}

将个人设置放在 `mise.local.toml` 中，并将团队共用的工具和任务放在已提交的 `mise.toml` 中。若只想在当前检出目录忽略 `mise.local.toml`，请将其加入 `.git/info/exclude`；若要在所有项目中忽略，请加入全局 Git 忽略文件。

同样的方法也可用于将 `mise.toml` 保持为私有文件，或者团队可以将其列入项目的 `.gitignore`。忽略规则只对未跟踪文件生效，不会隐藏已纳入 Git 的文件变更。

<a id="what-is-the-difference-between-nodejs-and-node-or-golang-and-go"></a>

### “nodejs”和“node”（或“golang”和“go”）有什么区别？

它们指的是同一种工具。mise 在命令行、`mise.toml` 和 `.tool-versions` 中都接受 `nodejs` 和 `golang` 作为 `node` 和 `go` 的别名。若 `mise use` 修改了 `mise.toml` 中以 `nodejs` 写入的条目，它会将名称改为 `node` 并保留注释。在 `.tool-versions` 中，mise 会写入 asdf 使用的名称 `nodejs` 和 `golang`。

### 为什么 mise 要求我信任配置文件？ {#my-config-file-is-being-ignored-mise-trust-issues}

项目配置文件可能会运行代码：模板可以执行命令，`[env]` 指令和 hooks 可以运行脚本，`postinstall` 等工具选项也会在安装过程中运行。若文件只列出工具版本、`min_version` 和普通任务，mise 会直接加载，无需询问。其他配置会等到你信任文件后才生效，这样克隆仓库并进入目录时不会自动执行其中的代码。检查文件后，运行 [`mise trust`](/cli/trust.html)。

`mise run`、`mise install`、`mise exec`、`mise watch` 以及 `mise daemons start`、`restart` 和 `register` 会自动信任项目配置，因为运行这些命令本身就意味着你决定执行其中的代码。在 CI 中，mise 会将配置视为可信。在 CI 以外，`--yes` 或 `MISE_YES=1` 会自动对信任提示回答“是”，因此只能用于你已检查过的配置。[Paranoid 模式](/paranoid.html)会关闭此自动信任。全局配置 `~/.config/mise/config.toml` 始终无需信任。

如果 mise 似乎忽略了配置文件：

- 运行 `mise trust --show` 可查看从当前目录向上的各配置目录信任状态。对于不受信任的文件，`mise doctor` 只会报告 `failed to load config: error parsing config file: <path>`。
- 如果你在信任提示中回答“否”，mise 会跳过该配置，且不会再次询问。检查文件后运行 `mise trust path/to/mise.toml`。
- 在编辑器扩展等没有终端的环境中，mise 无法询问，因此命令会以 [`Config files in <path> are not trusted`](/errors.html#untrusted-config) 错误退出。请先在终端中信任该文件。
- 只有选择相应的[配置环境](/configuration/environments.html)时，`mise.<env>.toml` 文件才会加载。

完整规则（包括符号链接配置及信任某目录下所有项目）请参阅[配置文件信任](/security.html#configuration-trust)。

### mise 会读取 `.nvmrc` 或 `.python-version` 吗？ {#how-do-idiomatic-version-files-python-version-node-version-etc-work}

只有为工具启用后才会读取。要让 mise 读取 `.nvmrc`、`.node-version`、`.python-version` 和 `.ruby-version` 等其他版本管理器的文件，必须先为对应工具开启此功能：

```sh
mise settings add idiomatic_version_file_enable_tools node  # read .nvmrc, .node-version, package.json
mise settings unset idiomatic_version_file_enable_tools     # stop reading them for every tool
```

若只想禁用其中一个文件，同时保留该工具对其他文件的读取，请在 [`idiomatic_version_file_disable_files`](/configuration/settings.html#idiomatic_version_file_disable_files) 中添加 `tool:file` 组合，例如 `node:package.json`。各工具支持读取的文件请参阅[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

### mise 如何将工具简称映射到来源？ {#how-do-the-shorthand-plugin-names-map-to-repositories}

随 mise 一同发布的[注册表](/registry.html)会将 `ripgrep` 等简称映射到 `aqua:BurntSushi/ripgrep` 等后端标识符。注册表的源文件位于 mise 仓库的 [`registry/`](https://github.com/jdx/mise/tree/main/registry) 目录。大多数工具无需插件。

`mise registry ripgrep` 会列出该工具可用的后端，`mise tool ripgrep` 会显示 mise 选中的后端。详见 [mise 如何选择后端](/dev-tools/backends/#how-backend-selection-works)。

<a id="how-do-i-use-mise-with-http-proxies"></a>

### 如何通过 HTTP 代理使用 mise？

mise 会读取标准的 `https_proxy`、`http_proxy`、`all_proxy` 和 `no_proxy` 变量，变量名可以使用大写或小写：

```sh
export https_proxy=http://proxy.example.com:8080
mise install
```

若要通过内部镜像下载，请使用 [URL 替换](/url-replacements.html)。mise 运行的包管理器和插件（例如 npm、pip、cargo 及 asdf 插件）会读取各自的代理和证书设置。

## 从 asdf 迁移 {#migration}

### 如何从 asdf 切换？ {#how-do-i-migrate-from-asdf}

<a id="how-compatible-is-mise-with-asdf"></a>

mise 会读取 `.tool-versions` 文件，因此你可以先在一个项目中试用，再更改 shell 设置，团队成员也可以继续使用 asdf。[从 asdf 迁移](/dev-tools/comparison-to-asdf.html)介绍了迁移步骤、命令对照，以及如何与 asdf 用户共用 `.tool-versions`。需要先了解一个区别：`mise set` 用于设置环境变量，`mise use` 用于选择工具版本。

## 范围和相关工具

### mise 能安装系统软件包或脱离 mise 使用的工具吗？ {#mise-is-for-dev-tools-not-applications-or-system-packages}

<a id="how-do-i-install-tools-other-users-can-run-without-mise"></a>

`[tools]` 用于按项目管理的版本，切换目录时 mise 会随之切换。如果某项内容只需为整台机器安装一次，例如系统库、桌面应用，或其他用户无需 mise 就能运行的命令，请选择以下方式之一：

- [`[bootstrap.packages]`](/bootstrap/packages/) 可声明 apt、dnf、Homebrew、WinGet 等包管理器的软件包，并由 `mise bootstrap` 安装。mise 会自行安装 `brew:` 和 `brew-cask:` 条目，因此无需先安装 Homebrew；详见 [Homebrew formula](/bootstrap/packages/brew.html)。
- [`mise install-into`](/cli/install-into.html) 可将 mise 支持的任意工具的一个版本安装到你指定的目录：

  ```sh
  mise install-into node@24 ~/standalone-node
  ~/standalone-node/bin/node --version
  ```

  请使用新建或空目录：`install-into` 会在询问后删除目录中的现有内容；使用 `--yes` 时则不会询问。请自行将该目录的 `bin` 加入 `PATH`，并设置 `JAVA_HOME` 等变量。

`bash`、`zsh` 等 Shell 也应在此处声明，而不是放在 `[tools]` 中。请将它们列入 `[bootstrap.packages]`。

这两种方式都会为每位用户提供固定版本，不会按项目切换。若要改为给每位用户配置由 mise 管理的工具，请将工具留在 `[tools]` 中，并通过 [`mise bootstrap`](/bootstrap.html) 配置每位用户的激活方式和工具。

### mise 安全吗？

后端支持时，mise 会校验下载内容；运行项目配置中的代码前会先征求许可；此外还提供安全模式和 paranoid 模式以进一步限制行为。每项检查的范围取决于所用后端。详见[安全](/security.html)，并按照[报告安全漏洞](/security.html#reporting-a-vulnerability)中的说明提交漏洞报告。

### usage 是什么？

[usage](https://usage.jdx.dev/) 是一种用于描述命令参数、标志和补全的规范。mise 内置了它：任务参数、`mise run <task> --help` 以及 mise 和其任务的补全都基于 usage 规范，因此无需另外安装 `usage` CLI。详见[任务参数](/tasks/task-arguments.html)。

### pitchfork 是什么？

[pitchfork](https://pitchfork.jdx.dev/) 是开发服务的进程管理器。mise 的实验性 [daemon 功能](/daemons.html)使用它来运行 `mise.toml` 中声明的数据库和开发服务器、检查服务是否就绪并在需要时重启。对于会结束的命令，请使用[任务](/tasks/)；对于持续运行的进程，请使用 daemon。

### mise 的版本控制如何工作？

mise 使用 `2026.10.4` 这类日历版本号，数字不代表兼容性。详见[版本号](/releases.html#versioning)。
