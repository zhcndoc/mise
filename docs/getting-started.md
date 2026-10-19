---
description: "安装 mise，然后为项目指定 Node.js 版本、环境变量和任务。"
---

# 开始使用

安装 mise 后，即可为项目指定 Node.js 版本、环境变量和任务。第 1 至第 3 步不会更改 Shell 配置；第 4 步可选择启用 Shell 激活。

如果要加入一个已有 `mise.toml` 的项目，请先安装 mise（第 1 步），阅读项目的 `mise.toml`（参见[信任配置](#trust)），然后在项目目录中运行 `mise install`，并用 `mise tasks ls` 查看任务列表。[在现有项目中使用 mise](/walkthrough.html)介绍如何将 mise 引入尚未使用它的项目。

## 1. 安装 mise {#installing-mise-cli}

在 macOS 或 Linux 上运行安装脚本：

```sh
curl -fsSL https://mise.run | sh
~/.local/bin/mise --version
# 2026.x.x linux-x64 (2026-xx-xx)
```

安装脚本会将 `mise` 可执行文件放在 `~/.local/bin/mise`。如果后续步骤中的 Shell 找不到 `mise`，请先使用完整路径 `~/.local/bin/mise`；第 4 步[启用 mise](#activate-mise)后，它会加入 `PATH`。

在 Windows 上运行 `winget install jdx.mise`。Homebrew、apt、dnf 和其他包管理器的安装方式请参阅[安装 mise](/installing-mise.html)。

## 2. 运行工具 {#mise-exec-run}

[`mise exec`](/cli/exec.html) 可使用指定的工具版本运行命令：

```sh
mise exec node@24 -- node --version
# v24.x.x
```

如果尚未安装 Node.js 24，mise 会先下载它，然后运行 `--` 后面的命令。此操作不会更改任何配置文件，也不会修改当前 Shell 的环境。

## 3. 设置项目 {#set-up-a-project}

创建目录，并为其选择 Node.js 24：

```sh
mkdir my-project
cd my-project
mise use node@24
```

[`mise use`](/cli/use.html) 会在需要时安装 Node.js 24，并将版本请求写入新建的 `mise.toml`：

```toml [mise.toml]
[tools]
node = "24"
```

### 设置环境变量 {#environment-variables}

运行 [`mise set`](/cli/set.html) 添加 `[env]` 配置段：

```sh
mise set NODE_ENV=development
```

此时 `mise.toml` 内容如下：

```toml [mise.toml]
[tools]
node = "24"

[env]
NODE_ENV = "development"
```

通过 mise 运行的命令可以同时使用该工具和环境变量：

```sh
mise exec -- node -p process.env.NODE_ENV
# development
```

你也可以[从 `.env` 文件加载变量](/environments/#env-directives)。

### 运行任务 {#run-a-task}

在同一个 `mise.toml` 中添加任务：

```toml [mise.toml]
[tasks.hello]
description = "Print the Node.js version and NODE_ENV"
run = 'node -e "console.log(process.version, process.env.NODE_ENV)"'
```

```sh
mise run hello
```

```text
[hello] $ node -e "console.log(process.version, process.env.NODE_ENV)"
v24.x.x development
```

[`mise run`](/cli/run.html) 会安装缺少的工具、设置项目环境，然后运行任务。

### 查看 mise 选择的配置 {#confirm-what-is-active}

在项目目录中运行：

```sh
mise config ls     # config files in use
mise ls --current  # selected tool versions
mise tasks ls      # available tasks
```

### 信任项目配置 {#trust}

包含 `[env]`、钩子、模板或设置的 `mise.toml` 可能会运行代码或更改环境，因此 mise 只会加载已信任的配置：通过 `mise use` 或 `mise set` 写入的文件会自动受信任；运行过 `mise install`、`mise exec` 或 `mise run` 的项目也会受信任。对于他人提供的项目，请先阅读其配置（包括任务），再运行这些命令或 [`mise trust`](/cli/trust.html)。信任规则详见[配置的信任机制](/security.html#configuration-trust)。

### 共享项目 {#share-the-project}

将 `mise.toml` 提交到版本库。团队成员和 CI 在项目中运行 `mise install`，即可安装相同的工具。`"24"` 是版本前缀而非精确版本，因此不同机器可能解析到不同的 Node.js 24 版本；若要记录精确版本，请运行 `mise lock` 并添加[锁文件](/dev-tools/mise-lock.html)。

## 4. 启用 mise <Badge text="可选" /> {#activate-mise}

在交互式 Shell 中启用 mise 后，进入项目目录时，项目工具会加入 `PATH`，环境变量也会随之设置。激活会添加一个钩子，在每次显示提示符或切换目录时更新当前目录对应的环境。脚本和 CI 无需启用 Shell 激活，继续使用 `mise exec` 和 `mise run` 即可。

针对所用的 Shell 运行一次对应命令，将激活语句追加到 Shell 启动文件中：

::: code-group

```sh [bash]
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
```

```sh [zsh]
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> "${ZDOTDIR:-$HOME}/.zshrc"
```

```fish [fish]
mkdir -p ~/.config/fish
echo '~/.local/bin/mise activate fish | source' >> ~/.config/fish/config.fish
```

```powershell [PowerShell]
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
Add-Content $PROFILE '(&mise activate pwsh) | Out-String | Invoke-Expression'
```

:::

如果通过包管理器安装了 mise，请将 `~/.local/bin/mise` 替换为 `mise`。使用 Homebrew 时，fish 会自动启用 mise，无需执行此步骤。[Shell 设置](/shell-setup.html)还介绍了 Nushell、Xonsh、Elvish、Git Bash 和 cmd.exe，并提供了重复运行也不会重复添加语句的命令。

打开新的终端，分别在项目目录内外检查 Node.js 版本：

```sh
cd my-project
node --version
# v24.x.x
cd ..
node --version
# another Node.js version, or "command not found"
```

若要在项目之外使用某个版本，可通过 `mise use --global node@24` 设置个人默认版本。该命令会写入 `~/.config/mise/config.toml`，项目配置的优先级更高。

运行 [`mise doctor`](/cli/doctor.html) 检查配置。不会读取 Shell 启动文件的编辑器和其他程序可以改用 [shims](/dev-tools/shims.html)，但 shims 有[一些限制](/dev-tools/shims.html#shims-vs-path)。

## 5. 查找更多工具 {#tool-backends}

在[注册表](/registry.html)中查找 `node`、`python`、`jq` 和 `ripgrep` 等工具。通常只需使用工具名即可。请在 `my-project` 目录中运行以下命令；如果刚完成第 4 步的演示，请先执行 `cd my-project`：

```sh
mise use ripgrep
mise exec -- rg --version
```

这会将 `ripgrep` 添加到项目的 `mise.toml`。在项目之外运行时，`mise use` 会在当前目录创建 `mise.toml`；如果当前目录是主目录，则会写入全局配置。

后端告诉 mise 从哪里获取工具以及如何安装。也可以显式指定后端，包括尚未加入注册表的工具：

```sh
mise exec github:BurntSushi/ripgrep -- rg --version
```

某些后端需要依赖其他工具或包管理器，例如 `npm:` 后端需要 Node.js。使用新的生态系统前，请先阅读[后端指南](/dev-tools/backends/)。

## 遇到问题时 {#if-something-doesn-t-work}

运行 `mise doctor` 检查配置。如果工具通过 `mise exec` 可以运行，但直接作为命令运行失败，请检查 [Shell 激活](#activate-mise)并打开新终端。其他问题请参阅[故障排除](/troubleshooting.html)。

### GitHub API 速率限制 {#github-api-rate-limiting}

如果错误提示触发了 GitHub API 速率限制，请为 mise 配置 [GitHub 令牌](/dev-tools/github-tokens.html)。

## 后续步骤 {#next-steps}

- [在现有项目中使用 mise](/walkthrough.html)
- [任务](/tasks/)：构建、测试和其他项目命令
- [编辑器](/ide-integration.html)与[持续集成](/continuous-integration.html)
- [Shell 补全](/shell-setup.html#autocompletion)
- [初始化](/bootstrap.html)：为整台机器配置系统软件包、点文件和服务
