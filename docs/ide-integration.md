---
description: "将您的编辑器、语言服务器和调试器连接到由 mise 管理的工具"
socialDescription: "将您的编辑器、语言服务器和调试器连接到由 mise 管理的工具"
---

# IDE 集成

编辑器的终端、语言服务器、调试器和扩展宿主可以使用不同的环境。首先确定哪个进程需要某个工具或变量，然后选择一种集成方式：

| 需求                                              | 集成方式                               | 预期效果                                                                                                                |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 固定的可执行文件或 SDK 目录                       | `mise which node` 或 `mise where java` | 选择已安装的路径；更改版本后更新 IDE 设置。                                                                               |
| 遵循当前项目的工具                               | [Shims](/dev-tools/shims.html)         | 解析工具，并在 shim 运行时加载 mise 环境变量。该进程必须在项目目录中运行。                                                |
| 使用项目环境运行命令                             | `mise exec -- command`                 | 为该命令及其子进程加载工具和变量。                                                                                       |
| 遵循配置更改的编辑器功能                         | 一个 [mise 插件](#ide-plugins)         | 支持情况取决于编辑器、扩展和语言。                                                                                       |

先在项目中运行 `mise install`。仅选择 SDK 路径不会加载 `[env]`。Shims 也不会更改已经运行的编辑器的环境。在更改继承的环境或固定的 SDK 路径后，重启受影响的语言服务器或编辑器。

## 将 shims 添加到默认 shell 配置中的 PATH {#adding-shims-to-path-default-shell}

将[shim 目录](/dev-tools/shims.html)添加到用于启动编辑器的环境中。这样，进程无需交互式提示符钩子即可找到由 mise 管理的工具。

对于 IntelliJ 和 VSCode，以及可能的其他编辑器，您可以修改默认 shell 的登录（或“profile”）脚本。使用以下命令查找默认 shell：

::: code-group

```shell [macos]
dscl . -read /Users/$USER UserShell
```

```shell [linux]
getent passwd $USER | cut -d: -f7
```

:::

编辑编辑器实际加载的 shell 启动文件。对于 Bash，请在 `~/.bash_profile`、`~/.bash_login` 和 `~/.profile` 中使用第一个存在的文件；创建新的 `~/.bash_profile` 可能会导致现有的 `~/.profile` 不再被读取。

::: code-group

```zsh
# ~/.zprofile
eval "$(mise activate zsh --shims)"
```

```bash
# ~/.bash_profile 或 ~/.bash_login 或 ~/.profile
eval "$(mise activate bash --shims)"
```

```fish
# ~/.config/fish/config.fish
if status is-interactive
  mise activate fish | source
else
  mise activate fish --shims | source
end
```

:::

编辑 profile 后重启编辑器。某些桌面环境只有在登录时才会读取登录 profile，因此可能还需要注销并重新登录。如果编辑器没有读取 shell profile，请检查编辑器的环境设置。VS Code 的[环境解析](https://code.visualstudio.com/docs/terminal/advanced#_environment-inheritance)和其[任务终端配置文件](#vscode-automation-profile-for-macos)是两种独立的机制。

这假设 `mise` 位于 `PATH` 中。如果不在，请使用绝对路径（例如 `eval "$($HOME/.local/bin/mise activate zsh --shims)"`）。

以下示例展示了 VSCode 和 IntelliJ 使用由 mise 提供的 `node`：

::: tabs
=== VSCode

![vscode using shims](./shims-vscode.png)

=== IntelliJ
![intellij using shims](./shims-intellij.png)
:::

如上所述，使用 `shims` 无法支持 mise 的所有功能。例如，[env vars](./environments/) 中的任意 [env] 变量只有在执行 shim 时才会被设置。要支持这些变量，需要与 IDE 进行更紧密的集成或使用自定义插件。

## IDE 插件

以下是一些为配合 `mise` 使用而开发的社区插件：

- Emacs: [mise.el](https://github.com/eki3z/mise.el)
- IntelliJ: [intellij-mise](https://github.com/134130/intellij-mise)
- VSCode: [mise-vscode](https://github.com/hverlin/mise-vscode)

## Vim

```vim
" 将 mise shims 添加到 PATH 前面
let $PATH = $HOME . '/.local/share/mise/shims:' . $PATH
```

## Neovim

```lua
-- 将 mise shims 追加到 PATH 前面
vim.env.PATH = vim.env.HOME .. "/.local/share/mise/shims:" .. vim.env.PATH
```

如需更好的 Treesitter 和 LSP 集成，请参阅 [neovim cookbook](./mise-cookbook/neovim.md)。

## Emacs

### Shims

```lisp
(let ((mise-shims (expand-file-name "~/.local/share/mise/shims")))
  (setenv "PATH" (concat mise-shims (char-to-string path-separator) (getenv "PATH")))
  (add-to-list 'exec-path mise-shims))
```

### 使用 mise.el 包

[mise.el](https://github.com/eki3z/mise.el) 会为每个缓冲区加载 mise 环境。按照其 README 安装该包，然后启用它：

```lisp
(require 'mise)
(add-hook 'after-init-hook #'global-mise-mode)
```

## JetBrains 编辑器（IntelliJ、RustRover、PyCharm、WebStorm、RubyMine、GoLand 等）

### IntelliJ 插件

<https://github.com/134130/intellij-mise>

该插件可以自动配置 IDE，以使用 mise 提供的工具。它还支持运行 mise 任务，以及在运行配置中加载环境变量。

### 直接选择 SDK

某些 JetBrains IDE（或语言插件）直接支持 `mise`，允许您从 IDE 设置中选择 SDK 版本。Java 示例：

![SDK 设置](./intellij-sdk-selection.png)

### 使用 asdf 布局选择 SDK

某些插件还无法找到由 `mise` 安装的 SDK，但支持 asdf。可用时优先选择直接 SDK。如果插件需要 asdf 目录，可以通过符号链接公开 mise 布局。仅当 `~/.asdf` 不存在时使用此变通方法；不要替换现有的 asdf 安装，也不要使用 asdf 修改由 mise 管理的安装：

```sh
ln -s ~/.local/share/mise ~/.asdf
```

随后它们应该会显示在项目设置中：

![项目设置](https://github.com/jdx/mise-docs/assets/216188/b34a0e3f-7af8-45c9-85b8-2c72bd1dc226)

对于 node（以及可能的其他语言），该设置位于“Languages & Frameworks”下：

![语言和框架](https://github.com/jdx/mise-docs/assets/216188/9926be1c-ab88-451a-8ace-edf2dac564b5)

## VSCode

### macOS 的 VSCode 自动化配置文件

要为任务和调试终端加载 `~/.zprofile`，请将以下内容添加到 `settings.json`：

```json
{
  "terminal.integrated.automationProfile.osx": {
    "path": "/bin/zsh",
    "args": ["--login"]
  }
}
```

此[自动化配置文件](https://code.visualstudio.com/docs/terminal/profiles#_configuring-the-taskdebug-profile)适用于任务和调试所使用的终端。它不会配置扩展宿主或每个语言服务器。请将 shim 设置保留在 `~/.zprofile` 中；添加 `--interactive` 还会加载 `~/.zshrc`，其中包括提示符自定义，而构建进程通常不需要这些内容。

### VSCode 插件

[VSCode 插件](https://marketplace.visualstudio.com/items?itemName=hverlin.mise-vscode)提供工具和任务管理、环境加载以及配置辅助功能。它可以配置[受支持的语言扩展](https://hverlin.github.io/mise-vscode/reference/supported-extensions/)以使用 mise 工具。扩展自动配置默认处于禁用状态；如果希望启用该行为，请启用 [`mise.configureExtensionsAutomatically`](https://hverlin.github.io/mise-vscode/reference/settings/#miseconfigureextensionsautomatically)。

有关其环境和任务设置，请参阅[插件文档](https://hverlin.github.io/mise-vscode/)。请在运行该扩展的计算机上配置 mise：本地安装不会为 SSH 主机、WSL 发行版或开发容器提供工具。

### 在启动配置中使用 [`mise exec`](./cli/exec)

对于 Node.js 调试，请在 `launch.json` 中通过 mise 运行运行时。将 `cwd` 设置为包含 `mise.toml` 的项目。编辑器必须能够找到 `mise`；否则，请将 `runtimeExecutable` 替换为其绝对路径。此示例适用于 macOS 和 Linux：

::: details mise exec launch.json 示例

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${file}",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "mise",
      "runtimeArgs": ["exec", "--", "node"]
    }
  ]
}
```

:::

## Xcode

Xcode 构建阶段不会运行交互式 shell 启动文件。请使用 mise 的绝对路径，并明确选择项目目录。对于声明了 SwiftLint 的项目：

```sh
"$HOME/.local/bin/mise" --cd "$SRCROOT" exec -- swiftlint lint
```

请在构建前安装项目的工具。如果 mise 是通过包管理器安装的，请相应调整 mise 路径。

启用**用户脚本沙盒**（**User Script Sandboxing**）后，请在构建阶段声明脚本的输入和输出。`$(SRCROOT)/mise.toml` 是一个输入，但 mise 和工具可能还需要访问其他配置文件、已安装的可执行文件和数据目录。使用构建日志中的沙盒拒绝信息来确定缺少的访问权限；仅允许 `mise.toml` 对每个工具而言并不够。Xcode Cloud 设置请参阅[持续集成](/continuous-integration.html#xcode-cloud)。

## 诊断编辑器不匹配问题

在项目目录中，将选定的可执行文件与编辑器使用的可执行文件进行比较：

```sh
mise which node
mise exec -- node --version
```

检查语言服务器或调试器日志中的可执行文件路径和工作目录。如果上述命令正常运行，但编辑器选择了另一个版本，请修正该进程的 SDK 设置、`PATH` 或工作目录。集成终端正常运行本身并不能确认语言扩展使用的是相同的环境。
