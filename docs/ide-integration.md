# IDE 集成

代码编辑器和 IDE 的工作方式与交互式 shell 不同。

通常，它们要么继承自当前 shell 的环境（如果你是从终端启动它，比如 `nvim .` 或 `code .`，就属于这种情况），要么会以[自己的方式](https://github.com/microsoft/vscode-docs/blob/906acccd6180d8425577f8297ed29e221ad3daca/docs/supporting/faq.md?plain=1#L238)来设置环境。

一旦你启动了 IDE，如果你更新了 mise 配置文件，它不会重新加载环境变量或由 `mise` 提供的 `PATH`。因此，我们不能依赖默认的 `mise activate` 方法来自动设置编辑器。

让 `mise` 与你的编辑器协同工作的方式有几种：

- 一些编辑器或 IDE 插件对 `mise` 有直接支持，并允许你在 IDE 设置中选择工具/sdk 路径。这将让你访问这些工具的二进制文件，但不会加载环境变量。
- 大多数编辑器（以及语言插件）会在 `PATH` 中查找工具，并在你的项目上下文中运行它们。因此，将 `mise` 的 shims 添加到 `PATH` 可能就足够了（见[下文](#adding-shims-to-path-default-shell)）。这将运行 mise 提供的工具并加载环境变量。
- 在其他情况下，你可能需要在 IDE 设置中手动指定 `mise` 提供的工具路径。可以通过使用 [`mise which <tool>`](./cli/which.md) 或 [`mise where`](./cli/where) 来获取路径。如果插件支持，你也可以提供工具 shim 的路径（例如 `~/.local/share/mise/shims/node`），因为当工具运行时这也会加载环境变量。
- 最后，一些自定义插件已被开发出来以配合 `mise` 使用。你可以在 [IDE Plugins](#ide-plugins) 部分找到它们。

## 将 shims 添加到默认 shell 配置中的 PATH {#adding-shims-to-path-default-shell}

与环境变量修改相比，IDE 与 [shims](./dev-tools/shims) 配合得更好。最简单的方法是
将 mise 的 shim 目录添加到 `PATH` 中。

对于 IntelliJ 和 VSCode——以及可能的其他 IDE，你可以修改默认 shell 的登录（即“profile”）
脚本。你的默认 shell 可以通过以下方式找到：

::: code-group

```shell [macos]
dscl . -read /Users/$USER UserShell
```

```shell [linux]
getent passwd $USER | cut -d: -f7
```

:::

你可以使用 `chsh -s /path/to/shell` 更改默认 shell，但你可能需要
先将其添加到 `/etc/shells` 中。一旦你知道正确的 shell，就修改相应的文件：

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

::: warning
在 macOS 上不要使用 /bin/bash 或 /usr/bin/bash。bash 很复杂，已有数十年历史，而且 mise 无法使用那么多功能。
除非你认为自己是 bash 专家，并且知道为什么我（以及 Apple 也是如此）会建议不要使用 bash，否则在 macOS 上请直接使用 zsh。
:::

在 Linux 上，这会在登录机器时读取，因此更改后需要先退出登录再重新登录才会生效。有关如何让 VSCode 读取登录文件，请参见下面的 [VSCode](#vscode)。

这假设 `mise` 已经在 `PATH` 上。如果不在，你需要使用绝对路径（
例如：`eval "$($HOME/.local/bin/mise activate zsh --shims)"`）。

下面是一个示例，展示 VSCode 会使用由 `mise` 提供的 `node`：

::: tabs
=== VSCode

![vscode using shims](./shims-vscode.png)

=== IntelliJ
![intellij using shims](./shims-intellij.png)
:::

如上所述，使用 `shims` 并不适用于 mise 的所有功能。例如，`[env]` 中任意的 [env vars](./environments/) 只有在执行 shim 时才会设置。为此，我们需要与 IDE 更紧密的集成和/或一个自定义插件。

## IDE 插件

以下是一些为配合 `mise` 使用而开发的社区插件：

- Emacs: [mise.el](https://github.com/liuyinz/mise.el)
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

如需更好的 Treesitter 和 LSP 集成，请查看 [neovim cookbook](./mise-cookbook/neovim.md)。

## emacs

### 传统 shim 方式

```lisp
;; 由 Mise 安装的 CLI 工具
;; 参见: https://www.emacswiki.org/emacs/ExecPath
(setenv "PATH" (concat (getenv "PATH") ":/home/user/.local/share/mise/shims"))
(setq exec-path (append exec-path '("/home/user/.local/share/mise/shims")))
```

### 与包 [mise.el](https://github.com/eki3z/mise.el) 配合使用

<https://github.com/eki3z/mise.el>

> 一个 GNU Emacs 库，使用 mise 工具来确定按目录/项目划分的环境变量，然后在按缓冲区的基础上设置这些环境变量。

```lisp
(require 'mise)
(add-hook 'after-init-hook #'global-mise-mode)
```

## JetBrains 编辑器（IntelliJ、RustRover、PyCharm、WebStorm、RubyMine、GoLand 等）

### IntelliJ 插件

<https://github.com/134130/intellij-mise>

此插件可以自动配置 IDE 使用 mise 提供的工具。它还对运行 mise 任务以及在运行配置中加载环境变量提供了一些支持。

### 直接选择 SDK

某些 JetBrains IDE（或语言插件）直接支持 `mise`。这使你可以从 IDE 设置中选择 SDK 版本。  
Java 示例：

![SDK 设置](./intellij-sdk-selection.png)

### 使用 asdf 布局选择 SDK

某些插件目前还无法找到由 `mise` 安装的 SDK，但可能支持 asdf。  
在这种情况下，可以通过创建符号链接来绕过这个问题，将 mise 工具目录链接到与 asdf 相同的布局：

```sh
ln -s ~/.local/share/mise ~/.asdf
```

然后它们应该会在项目设置中显示出来：

![项目设置](https://github.com/jdx/mise-docs/assets/216188/b34a0e3f-7af8-45c9-85b8-2c72bd1dc226)

或者在 node（以及可能的其他语言）情况下，它位于“语言和框架”下：

![语言和框架](https://github.com/jdx/mise-docs/assets/216188/9926be1c-ab88-451a-8ace-edf2dac564b5)

## VSCode

### macOS 的 VSCode 自动化配置文件

与 Linux 不同，macOS 在登录机器时不会读取登录 shell 配置文件（`~/.profile` 或 `~/.zprofile`）。你可能需要将此设置添加到 VSCode 配置中，以便它加载你的 shims：

```json
    "terminal.integrated.automationProfile.osx": {
        "path": "/usr/bin/zsh",
        "args": ["--login"]
    }
```

:::tip
如果你想包含 `~/.zshrc`，也可以使用 `["--login", "--interactive"]`。
:::

### VSCode 插件

有一个 [VSCode 插件](https://marketplace.visualstudio.com/items?itemName=hverlin.mise-vscode)，它可以为你配置其他扩展，而无需修改你的 shell 配置文件来将 shims 添加到 `PATH`。

此外，它还提供诸如以下的附加功能：

- 自动配置其他扩展以使用 `mise` 提供的工具
- 直接从 VSCode 管理 `mise` 任务、工具和环境变量
- 在 VSCode 中从 `mise.toml` 文件加载环境变量
- 支持 `mise.toml` 文件的自动补全和代码片段
- 与 VSCode 任务集成

<https://github.com/hverlin/mise-vscode/> ([文档](https://hverlin.github.io/mise-vscode/))

### 在启动配置中使用 [`mise exec`](./cli/exec)

虽然修改默认 shell 配置文件可能是最简单的解决方案，但你也可以在 `launch.json` 中设置工具：

::: details mise exec launch.json 示例

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${file}",
      "args": [],
      "osx": {
        "runtimeExecutable": "mise"
      },
      "linux": {
        "runtimeExecutable": "mise"
      },
      "runtimeArgs": ["exec", "--", "node"]
    }
  ]
}
```

:::

## Xcode

Xcode 项目可以从脚本构建阶段和方案中运行系统命令。由于 Xcode 使用工具 `/usr/bin/sandbox-exec` 对脚本的执行进行沙盒限制，不要指望 Mise 和自动激活的工具能够开箱即用。首先，你需要将 `$(SRCROOT)/mise.toml` 添加到 **Input files** 列表中。这是 Xcode 允许读取该文件所必需的。然后，你可以使用 `mise activate` 来激活你需要的工具：

```bash
# -C 确保 Mise 从项目根目录中的 Mise 配置文件加载配置。
eval "$($HOME/.local/bin/mise activate -C $SRCROOT bash --shims)"

swiftlint
```
