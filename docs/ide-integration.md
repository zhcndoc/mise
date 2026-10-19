---
description: "将编辑器、语言服务器、调试器和开发容器接入 mise 管理的工具。"
---

# 编辑器和 IDE

编辑器的集成终端、语言服务器、调试器和扩展可能分别运行在不同环境中。先确认哪个进程需要工具或环境变量，再选择相应的集成方式：

| 需求                                              | 集成方式                               | 效果                                                                                                                     |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 固定的可执行文件或 SDK 目录                         | `mise which node` 或 `mise where java` | 选择已安装路径；更改版本后需更新 IDE 设置。                                                                                |
| 随当前项目切换的工具                                | [Shims](/dev-tools/shims.html)         | shim 运行时解析工具并加载 mise 环境变量。进程必须在项目目录中运行。                                                         |
| 使用项目环境运行的命令                              | `mise exec -- command`                 | 为该命令及其子进程加载工具和环境变量。                                                                                   |
| 随配置变化而更新的编辑器功能                        | [编辑器插件](#ide-plugins)             | 支持情况取决于编辑器、扩展和语言。                                                                                       |

请先在项目中运行 `mise install`。仅指定 SDK 路径不会加载 `[env]`。Shims 也不会更改已运行编辑器的环境，因此修改继承的环境或固定 SDK 路径后，请重启相关语言服务器或编辑器。

## 指向全局版本的固定路径 {#global-version-link}

IDE 中的 Maven 或 JDK 主目录等设置需要填写安装目录，因此需要一个在版本切换后仍有效的路径。每个工具的安装目录都有一个 `global` 链接，指向由全局配置和系统配置选定的版本：

```sh
~/.local/share/mise/installs/maven/global -> ./3.9.16
```

每当 mise 重建其他运行时符号链接（`latest`、`3`）时，例如运行 `mise use -g` 或 `mise install` 后，它也会更新此链接。项目配置和 `MISE_*_VERSION` 变量不会更改它；未被全局或系统配置选中的工具没有该链接。若 `global` 是实际目录，mise 不会修改它。

## 将 shims 加入 GUI 编辑器的 PATH {#adding-shims-to-path-default-shell}

从桌面启动的编辑器（包括 VS Code 和 JetBrains IDE）会读取登录 shell 的环境。将 mise [shims](/dev-tools/shims.html) 加入登录 shell 的 profile 后，这些编辑器无需提示符钩子也能找到 mise 工具。运行以下命令查看登录 shell：

::: code-group

```sh [macOS]
dscl . -read /Users/$USER UserShell
```

```sh [Linux]
getent passwd $USER | cut -d: -f7
```

:::

接着按照[如何将 mise shims 加入 PATH](/dev-tools/shims.html#how-to-add-mise-shims-to-path)中的说明，将 `mise activate --shims` 加入该 shell 的登录 profile；其中也介绍了 Bash 会读取哪个文件。如果运行 profile 时 `mise` 不在 `PATH` 中，请使用绝对路径，例如 `eval "$($HOME/.local/bin/mise activate zsh --shims)"`。

修改 profile 后请重启编辑器。有些桌面环境只在登录时读取登录 profile，因此你可能需要注销后重新登录。如果编辑器完全不读取 shell profile，请检查它的环境设置。VS Code 的[环境解析](https://code.visualstudio.com/docs/terminal/advanced#_environment-inheritance)和[任务终端 profile](#vscode-automation-profile-for-macos)是两套独立机制。

VS Code 和 IntelliJ 通过 shims 使用 mise 提供的 `node`：

::: tabs
== VS Code

![VS Code 通过 shims 使用工具](./shims-vscode.png)

== IntelliJ
![IntelliJ 通过 shims 使用工具](./shims-intellij.png)
:::

Shims 只会为它启动的工具进程设置 `[env]` 变量。编辑器本身及直接读取环境变量的功能无法获取这些变量；这类场景请使用[编辑器插件](#ide-plugins)。

## 编辑器插件 {#ide-plugins}

以下社区插件可以与 mise 集成：

| 编辑器          | 插件                                                                                     | 功能                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| VS Code        | [mise-vscode](https://marketplace.visualstudio.com/items?itemName=hverlin.mise-vscode) | 管理工具和任务、加载项目环境、辅助编辑配置，也可设置语言扩展使用 mise 工具。                                                       |
| JetBrains IDE  | [intellij-mise](https://github.com/134130/intellij-mise)                               | 根据 mise 配置 IDE 的 SDK、运行 mise 任务，并在运行配置中加载环境变量。                                                            |
| Neovim         | [miser.nvim](https://github.com/carldaws/miser.nvim)                                   | 为 `mise.toml` 中的工具启动语言服务器和格式化程序，并可在 Neovim 中运行 mise 任务。                                                |
| Emacs          | [mise.el](https://github.com/eki3z/mise.el)                                            | 为每个缓冲区加载 mise 环境。                                                                                                        |

## VS Code {#vscode}

[`mise-vscode` 扩展](https://hverlin.github.io/mise-vscode/)可以配置[受支持的语言扩展](https://hverlin.github.io/mise-vscode/reference/supported-extensions/)以使用 mise 工具。该功能默认关闭；启用 [`mise.configureExtensionsAutomatically`](https://hverlin.github.io/mise-vscode/reference/settings/#miseconfigureextensionsautomatically) 即可开启。环境和任务设置请参阅扩展文档。

请在运行扩展的机器上安装 mise。本地安装不会向 SSH 主机、WSL 发行版或[开发容器](#dev-containers)提供工具。

### 任务和调试终端 {#vscode-automation-profile-for-macos}

VS Code 会在自动化终端中运行任务和调试会话。若要让它启动会读取 profile 的登录 shell，并一并加载 shims，请在 `settings.json` 中添加[自动化 profile](https://code.visualstudio.com/docs/terminal/profiles#_configuring-the-taskdebug-profile)：

::: code-group

```json [macOS]
{
  "terminal.integrated.automationProfile.osx": {
    "path": "/bin/zsh",
    "args": ["--login"]
  }
}
```

```json [Linux]
{
  "terminal.integrated.automationProfile.linux": {
    "path": "/bin/bash",
    "args": ["--login"]
  }
}
```

:::

自动化 profile 不会配置扩展宿主或所有语言服务器。请将 shims 保留在登录 profile 中；加入 `--interactive` 还会加载交互式启动文件及提示符定制，而构建任务通常不需要这些内容。

### 在 launch.json 中通过 mise exec 调试 {#use-mise-exec-in-launch-configuration}

如需使用项目工具调试 Node.js，可在 `launch.json` 中通过 [`mise exec`](/cli/exec.html) 启动运行时。将 `cwd` 设置为包含 `mise.toml` 的目录。如果编辑器找不到 `mise`，请将 `runtimeExecutable` 设为其绝对路径。以下示例适用于 macOS 和 Linux：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "program": "${file}",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "mise",
      "runtimeArgs": ["exec", "--", "node"]
    }
  ]
}
```

## JetBrains IDE {#jetbrains-editors-intellij-rustrover-pycharm-webstorm-rubymine-goland-etc}

以下说明适用于 IntelliJ IDEA、PyCharm、WebStorm、GoLand、RubyMine、RustRover 等 JetBrains IDE。[intellij-mise 插件](https://github.com/134130/intellij-mise)可以自动根据 mise 配置 SDK。

### 直接选择 SDK

IntelliJ IDEA 的 Java SDK 选择器可以检测 mise 安装的 JDK：

![SDK 设置](./intellij-sdk-selection.png)

### 使用 asdf 目录布局选择 SDK

有些语言插件无法找到 mise 安装的 SDK，但可以识别 asdf 的目录结构。若可以直接选择 SDK，请优先使用该方式。如果插件需要 asdf 目录且 `~/.asdf` 不存在，可以通过符号链接公开 mise 的目录布局。不要替换现有的 asdf 安装，也不要使用 asdf 修改由 mise 管理的安装：

```sh
ln -s ~/.local/share/mise ~/.asdf
```

之后即可在 Project Settings 中看到这些 SDK：

![项目设置](https://github.com/jdx/mise-docs/assets/216188/b34a0e3f-7af8-45c9-85b8-2c72bd1dc226)

对于 Node.js 和其他一些语言，该设置位于“Languages & Frameworks”下：

![Languages & Frameworks 设置](https://github.com/jdx/mise-docs/assets/216188/9926be1c-ab88-451a-8ace-edf2dac564b5)

## Neovim {#neovim}

以下 Vim、Neovim 和 Emacs 代码片段使用默认数据目录。如果设置了 `MISE_DATA_DIR`，请改用 `$MISE_DATA_DIR/shims`。

```lua
-- 将 mise shims 加到 PATH 前面
vim.env.PATH = vim.env.HOME .. "/.local/share/mise/shims:" .. vim.env.PATH
```

Treesitter 和语言服务器的设置方式参见 [Neovim 指南](/mise-cookbook/neovim.html)，也可以使用 [miser.nvim](https://github.com/carldaws/miser.nvim)。

## Vim {#vim}

```vim
" 将 mise shims 加到 PATH 前面
let $PATH = $HOME . '/.local/share/mise/shims:' . $PATH
```

## Emacs {#emacs}

如需使用 shims：

```lisp
(let ((mise-shims (expand-file-name "~/.local/share/mise/shims")))
  (setenv "PATH" (concat mise-shims (char-to-string path-separator) (getenv "PATH")))
  (add-to-list 'exec-path mise-shims))
```

如果希望为每个缓冲区加载 mise 环境，请按照 README 安装 [mise.el](https://github.com/eki3z/mise.el)，然后启用它：

```lisp
(require 'mise)
(add-hook 'after-init-hook #'global-mise-mode)
```

## Xcode {#xcode}

Xcode 构建阶段不会运行交互式 shell 启动文件。请使用 mise 的绝对路径，并明确指定项目目录。对于声明了 SwiftLint 的项目：

```sh
"$HOME/.local/bin/mise" --cd "$SRCROOT" exec -- swiftlint lint
```

构建前请先安装项目工具。如果 mise 是由包管理器安装的，请相应调整其路径。

启用 User Script Sandboxing 后，请在构建阶段声明脚本的输入和输出。`$(SRCROOT)/mise.toml` 是一个输入，但 mise 和工具也可能读取其他配置文件、已安装的可执行文件及数据目录，因此仅允许访问 `mise.toml` 对某些工具并不足够。请根据构建日志中的沙盒拒绝记录查找缺失项。Xcode Cloud 的设置方式参见[持续集成](/continuous-integration.html#xcode-cloud)。

## 开发容器 {#dev-containers}

[`mise generate devcontainer`](/cli/generate/devcontainer.html) 会创建初始配置 `.devcontainer/devcontainer.json`，其中包含 mise 开发容器功能和 mise-vscode 扩展：

```sh
mise generate devcontainer --write
```

该文件会将 `postCreateCommand` 设为 `mise install`，以便新容器安装项目工具。`--mount-mise-data` 会为 mise 数据目录添加命名卷，使已安装工具在容器重建后仍可保留。构建前请检查镜像和挂载设置。如需在 home 目录从主机挂载的镜像中预装工具，请参阅 [Docker 指南](/mise-cookbook/docker.html#devcontainers-with-home-directory-mounts)。

## Windows {#windows}

按照 [Windows shell](/shell-setup.html#windows) 一节所述，将 `%LOCALAPPDATA%\mise\shims` 加入用户 `Path`，让编辑器找到 mise 工具，然后重启编辑器。如果扩展报告 `spawn EINVAL`，请参阅[故障排查指南](/troubleshooting.html#vscode-for-windows-extension-with-error-spawn-einval)。

## AI 编程助手 {#ai-coding-assistants}

在终端中运行命令的助手与其他进程一样，通过激活、shims 或 `mise exec` 获取 mise 工具。如需让助手读取项目工具、任务和环境并运行任务，请将它连接到 [mise MCP 服务器](/mcp.html)。通过 packslip 安装的工具也可以提供 agent skill；详见[手册页、补全和技能](/dev-tools/packslip-resources.html)。

## 诊断编辑器不匹配问题

在项目目录中运行以下命令，将 mise 选中的可执行文件与编辑器实际使用的文件进行比较：

```sh
mise which node
mise exec -- node --version
```

请在语言服务器或调试器日志中查看其可执行文件路径和工作目录。如果以上命令正常，但编辑器选择了其他版本，请修正该进程的 SDK 设置、`PATH` 或工作目录。集成终端运行正常，并不能证明语言扩展使用了相同的环境。
