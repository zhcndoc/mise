---
description: "使用 mise 设置你的第一个工具、环境变量和任务。"
---

# 开始使用

完成本指南后，你将拥有一个配置了工具、环境变量和可运行任务的项目。Shell 激活是可选的：前几个示例无需更改你的 Shell 配置即可运行。

如果你已经为现有项目安装了 mise，请查看其 `mise.toml`，然后从项目目录运行 `mise install`。使用 `mise tasks ls` 查看其任务。

## 1. 安装 `mise` CLI {#installing-mise}

请参见[安装 mise](/installing-mise.html)，了解其他安装 mise 的方式（Homebrew、MacPorts、apt、Nix 等）。

::::tabs key:installing-mise
== Linux/macOS

```shell
curl https://mise.run | sh
```

安装程序会将 mise 可执行文件放置在 `~/.local/bin`。

验证安装：

```shell
~/.local/bin/mise --version
# mise 2026.x.x
```

- `~/.local/bin` 不需要在 `PATH` 中。mise 在[激活](#activate-mise)时会自动将其自身目录添加到 `PATH`
  中。

== Windows
::: code-group

```shell [scoop]
scoop install mise
```

```shell [winget]
winget install jdx.mise
```

```shell [chocolatey]
choco install mise
```

:::

== Debian/Ubuntu (apt)

```sh
sudo apt install -y extrepo
sudo extrepo enable mise
sudo apt update
sudo apt install -y mise
```

== Fedora 41+、RHEL/CentOS Stream 9+ (dnf)

```sh
sudo dnf copr enable jdxcode/mise
sudo dnf install mise
```

更多信息请参见 [copr 页面](https://copr.fedorainfracloud.org/coprs/jdxcode/mise/)。

== Snap

```sh
sudo snap install mise --classic
```

更多信息请参见 [snapcraft.io 页面](https://snapcraft.io/mise)。

::::

如需自定义 mise 存储下载工具和其他数据的位置，请参见[目录](/directories.html)。

## 2. 运行你的第一个工具 {#mise-exec-run}

使用 [`mise exec`](/cli/exec.html) 运行带有特定工具版本的命令：

```sh
mise exec node@24 -- node --version
```

默认情况下，mise 会在需要时下载工具，然后运行 `--` 后面的命令。这不会将 Node.js 添加到项目配置中，也不会更改当前 Shell 的环境。输出以 `v24.` 开头；补丁版本可能有所不同。

::: tip
如果 `mise` 尚未位于 `PATH` 中，在 macOS 或 Linux 上请改用 `~/.local/bin/mise`。[第 4 步](#activate-mise)中的激活操作会将 mise 添加到 Shell 的 `PATH` 中。
:::

## 3. 设置项目 {#set-up-a-project}

作为一个全新的示例，创建一个新目录。如果你使用的是现有项目，请从其根目录开始，并跳过前两个命令：

```sh
mkdir mise-example
cd mise-example
mise use node@24
```

[`mise use`](/cli/use.html) 会安装工具，并将其版本请求写入 `mise.toml`。与 `mise install` 不同，它还会更改你的配置。

### 设置环境变量 {#environment-variables}

编辑生成的 `mise.toml`，使其包含：

```toml [mise.toml]
[tools]
node = "24"

[env]
NODE_ENV = "development"
```

使用已配置的工具和环境运行命令：

```sh
mise exec -- node -p process.env.NODE_ENV
# development
```

你也可以[从 `.env` 文件加载变量](/environments/#env-directives)。

### 运行任务 {#run-a-task}

将以下部分添加到同一个 `mise.toml` 中：

```toml [mise.toml]
[tasks.hello]
description = "Print the project's Node.js version and environment"
run = '''node -e "console.log(process.version, process.env.NODE_ENV)"'''
```

```sh
mise run hello
```

输出包含一个以 `v24.` 开头的 Node.js 版本和 `development`。任务会自动获得项目的工具和环境。默认情况下，`mise run` 会在运行任务前安装缺失的已配置工具。

提交 `mise.toml`，这样队友和 CI 就可以使用相同的配置。版本请求 `"24"` 会选择 Node.js 24 系列中的一个版本，而不是精确固定某个版本。请参见[锁定文件](/dev-tools/mise-lock.html)，了解如何在不同机器之间共享解析后的版本。

### 项目配置还是全局默认值？

| 命令                        | 作用                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `mise use node@24`          | 安装 Node.js，并将版本请求保存到项目配置中。请从项目目录运行此命令。                               |
| `mise use --global node@24` | 安装 Node.js，并将个人默认值保存到全局配置中。                                                       |
| `mise install`              | 安装配置中已经声明的工具。                                                                         |
| `mise exec -- node --version` | 使用项目的工具和环境运行一条命令。                                                                  |
| `mise run hello`            | 使用项目的工具和环境运行一个命名任务。                                                             |

项目配置可以覆盖全局默认值。使用 `mise config ls` 查看当前生效的文件，使用 `mise ls --current` 查看已选择的工具。

### 信任配置文件 {#trust}

运行他人提供的配置前请先检查：任务、钩子和某些环境指令可以执行代码。使用 `mise trust` 显式信任你已经检查过的配置。

在 CI 之外的普通模式下，会自动信任活动配置中执行项目行为的命令，包括 `mise install`、`mise exec` 和 `mise run`。使用[严格模式](/paranoid.html)时，非全局配置需要显式信任。详情请参见 [`mise trust`](/cli/trust.html)。

### 确认当前生效的内容

```sh
mise config ls
mise ls --current
mise tasks ls
mise exec -- node --version
```

在项目目录中使用这些命令，可以在添加 Shell 激活之前检查配置发现、工具选择、任务发现和命令执行。

## 4. 激活 `mise` <Badge text="可选" /> {#activate-mise}

`mise exec` 很适合一次性命令，但对于交互式 shell，你大概会希望激活 mise，这样工具和环境变量就会自动加载。

有两种方式：

- [`mise activate`](/cli/activate) — 每次提示符运行时更新你的 `PATH` 和环境。推荐用于交互式 Shell。
- [Shims](/dev-tools/shims.html) — 用于选择工具版本的命令入口。适用于编辑器和其他不会加载 Shell 配置的程序。[Shims 不支持 `mise activate` 的所有功能](/dev-tools/shims.html#shims-vs-path)。

你可以跳过这两种方式，使用 `mise exec` 或 `mise run` 显式加载项目环境，包括在 CI 和脚本中。

根据你的安装方式和 Shell 选择相应的说明。只添加一次激活行；重复运行追加命令可能会创建重复的钩子。对于自定义的 zsh 或 fish 配置位置，请使用 Shell 的实际配置路径，而不是下面显示的默认路径。

::::tabs key:activating-mise

== mise.run 安装程序

::: code-group

```sh [bash]
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
```

```sh [zsh]
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
```

```sh [fish]
mkdir -p ~/.config/fish
echo '~/.local/bin/mise activate fish | source' >> ~/.config/fish/config.fish
```

:::

== Brew

::: code-group

```sh [bash]
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
```

```sh [zsh]
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

```sh [fish]
# 什么都不用做！使用 brew 和 fish 时，mise 会自动激活
# 你可以通过 `set -Ux MISE_FISH_AUTO_ACTIVATE 0` 来禁用此行为
```

:::

== Windows

将以下内容添加到你的 PowerShell 配置文件（`$PROFILE`）中：

```powershell
(&mise activate pwsh) | Out-String | Invoke-Expression
```

如果你需要打开 PowerShell 配置文件：

```powershell
# create profile if it doesn't already exist
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType Directory -Force (Split-Path -Parent $PROFILE) | Out-Null
    New-Item -ItemType File -Path $PROFILE | Out-Null
}
# open the profile
Invoke-Item $profile
```

- 如果不使用 PowerShell，请将 `<homedir>\AppData\Local\mise\shims` 添加到 `PATH`。

== 其他包管理器

::: code-group

```sh [bash]
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
```

```sh [zsh]
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

```sh [fish]
mkdir -p ~/.config/fish
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

:::

::::

修改 rc 文件后，重启你的 Shell 会话。运行 [`mise dr|doctor`](/cli/doctor.html) 验证是否已正确设置。

激活 mise 后，工具可以直接通过 `PATH` 使用：

```sh
mise use --global node@24
node -v
# v24.x.x
```

运行 `mise use --global node@24` 后，mise 更新了你的全局配置：

```toml [~/.config/mise/config.toml]
[tools]
node = "24"
```

## 5. 查找更多工具 {#tool-backends}

使用[注册表](/registry.html)查找工具名称，例如 `node`、`python`、`jq` 和 `ripgrep`。大多数时候，只需要使用名称：

```sh
mise use ripgrep
mise exec -- rg --version
```

**后端**会告知 mise 从哪里获取工具以及如何安装工具。你可以显式选择后端，包括为没有注册表简写的工具选择后端：

```sh
mise exec github:BurntSushi/ripgrep -- rg --version
```

某些后端需要其他运行时或包管理器。使用新的生态系统前，请查看[后端指南](/dev-tools/backends/)。

## 6. 后续步骤 {#next-steps}

- **继续在项目中工作：** 按照[操作演示](/walkthrough.html)了解配置覆盖、升级和日常命令。
- **编写构建和测试命令：** 请参见[任务](/tasks/)。
- **在终端之外使用 mise：** 设置你的[编辑器](/ide-integration.html)或 [CI 流水线](/continuous-integration.html)。
- **设置机器：** 使用[引导](/bootstrap.html)声明系统包、点文件和服务。

### 设置自动补全 {#autocompletion}

启用[Shell 补全](/installing-mise.html#autocompletion)，以补全工具、版本和任务名称。

### 如果某些功能无法正常工作

运行 `mise doctor` 检查你的设置。如果某个工具可以通过 `mise exec` 工作，但不能作为普通命令使用，请检查 [Shell 激活](#activate-mise)并重启 Shell。其他常见问题请参见[故障排除](/troubleshooting.html)。

#### GitHub API 速率限制 {#github-api-rate-limiting}

如果错误报告 GitHub API 速率限制，请配置一个 [GitHub 令牌](/dev-tools/github-tokens.html)。

### Shell 功能兼容性 {#shell-feature-compatibility}

并非所有 shell 都支持 mise 的每一项功能：

| 功能                         | Bash | Zsh | Fish | Nushell | Elvish | Xonsh | PowerShell |
| ---------------------------- | ---- | --- | ---- | ------- | ------ | ----- | ---------- |
| `mise activate`              | 是   | 是  | 是   | 是      | 是     | 是    | 是         |
| `mise shell`                 | 是   | 是  | 是   | 是      | 是     | 是    | 是         |
| Shell 别名（`[shell_alias]`） | 是   | 是  | 是   | 否      | 否     | 否    | 否         |
| `chpwd` 钩子                 | 是   | 是  | 是   | 是      | 是     | 是    | 是         |

PowerShell 的目录更改钩子要求 PowerShell 7 或更高版本。其他激活行为在受支持的较旧 PowerShell 版本上仍然可用。
