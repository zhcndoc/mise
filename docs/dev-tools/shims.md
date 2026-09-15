---
description: "通过 shims 运行正确的工具版本，包括在未激活的 shell 外部运行"
---

# Shims

有几种方法可以将 `mise` 上下文（开发工具、环境变量）加载到 shell 中：

- `mise activate`（也称为[“mise PATH 激活”](#path-activation)），`mise` 会在每次显示提示符时更新你的 `PATH` 和其他环境变量
- [`mise activate --shims`](#mise-activate-shims)，使用 shims 加载开发工具
- 使用 [`mise x|exec`](/cli/exec) 或 [`mise r|run`](/cli/run) 执行临时命令或任务（请参阅[“既不使用 shims，也不使用 PATH”](#neither-shims-nor-path)）

本页介绍这些方法之间的区别以及如何使用它们。特别是，它将帮助你决定在 shell 中使用 shims 还是 `mise activate`

## `mise` 激活方法概览 {#overview}

### PATH 激活 {#path-activation}

mise 的“PATH”激活方法会在每次显示提示符时更新环境变量。具体来说，它会更新 `PATH` 环境变量，shell 使用该变量搜索可运行的程序。

::: info
对于 Bash，将 `eval "$(mise activate bash)"` 添加到 `~/.bashrc`。在终端中运行一次
`echo ... >> ~/.bashrc` 设置命令即可；不要将该追加命令本身放入启动文件中。
:::

例如，默认情况下，你的 `PATH` 变量可能如下所示：

```sh
echo "$PATH"
/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

使用 [`mise activate`](/cli/activate.html) 时，`mise` 会自动将所需的工具添加到 `PATH`。

```sh
PATH="$HOME/.local/share/mise/installs/python/3.14.7/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
```

在此示例中，python 的 `bin` 目录被添加到了 `PATH` 的开头，因此它在当前 shell 会话中可用。
当激活的是类似 `python = "3.14"` 或 `node = "26"` 这样的模糊版本时，此路径可能会使用请求版本的符号链接，例如 `~/.local/share/mise/installs/python/3.14/bin`，而不是完全解析后的补丁版本。

当某个程序需要工具的稳定路径时，请使用 shims，例如配置了 Python 可执行文件的 IDE。对于脚本，`mise exec -- <command>` 会显式加载工具和环境变量。

### Shims {#mise-activate-shims}

::: warning
`mise activate --shims` 不支持 `mise activate` 的所有功能。<br>
更多信息请参阅 [shims vs path](/dev-tools/shims.html#shims-vs-path)。
:::

使用 shims 时，`mise` 会将小型可执行文件（`shims`）放入一个包含在你的 `PATH` 中的目录。你可以把 `shims` 理解为指向 mise 二进制文件的符号链接，它们会拦截命令并加载相应的上下文。

```sh
ls -l ~/.local/share/mise/shims/node
# [...] ~/.local/share/mise/shims/node -> ~/.local/bin/mise
```

默认情况下，shim 目录位于 `~/.local/share/mise/shims`（Windows 上为：`%LOCALAPPDATA%\mise\shims`）。当你安装工具（例如 `node`）时，`mise` 会为该工具提供的每个二进制文件在 `shims` 目录中添加一个条目（例如 `~/.local/share/mise/shims/node`）。

```sh
mise use node@24 npm:prettier@3

~/.local/share/mise/shims/node --version
~/.local/share/mise/shims/prettier --version
```

这些命令使用为当前目录选择的版本。上面的路径假定使用默认的 Unix 数据目录。要按命令名称查找 shims，请将其目录添加到现有的 `PATH` 中：

```sh
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

子进程会继承此 `PATH`。独立启动的应用程序、CI 作业和其他 shell 需要自行设置环境；编辑某个 shell 的配置文件不会为计算机上的每个进程完成配置。

## 延迟工具

当某个工具应在其命令第一次被调用时安装，而不是由直接运行的 `mise install` 安装时，可以将该工具设置为 `lazy = true`：

```toml
[tools]
node = { version = "24", lazy = true }
```

对于 registry 简写形式，mise 会根据 registry 的 `bins` 元数据创建引导 shim。显式后端以及不在 registry 中的工具必须使用 `lazy_bins` 声明其命令名称：

```toml
[tools]
"github:example/acme" = { version = "1.2.3", lazy = true, lazy_bins = ["acme", "acmectl"] }
```

直接编辑延迟声明后运行 `mise reshim`。更新工具配置的 `mise use` 等命令会自动重建 shim farm。调用延迟 shim 时，会安装其配置的提供程序，以及该提供程序[依赖](/dev-tools/#tool-dependencies)但尚未安装的任何已配置工具，然后执行它。工具集中的其他内容不会被安装。这与 `not_found_auto_install` 相互独立；显式的项目工具选择永远不会被较低优先级的延迟声明绕过。

直接运行的 `mise install` 会跳过缺失的延迟工具。传递 `--include-lazy` 可安装所有已配置的工具，包括延迟声明；也可以显式指定一个工具，例如 `mise install node`，以立即只安装该延迟工具。安装完成后，普通的 `mise activate` 会将真实工具路径放在 shim farm 之前，因此后续调用不会产生 shim 调度开销。`mise activate --shims` 仍然会感知项目，并且按设计通过 mise 调度每次调用。

任务和 `mise x` 的工作方式相同。`mise run` 不会预先安装延迟工具。相反，只要工具集包含延迟声明，mise 为任务（以及 `mise x` 和 `mise env`）构建的环境就会在 shim farm 尚未位于 `PATH` 中时将其放在工具路径之后，并且会先创建缺失的引导 shim。任务第一次运行其某个命令时会安装该工具。`mise x -- <command>` 会直接安装延迟命令的提供程序。

::: tip
[`mise activate --shims`](/cli/activate.html#flags) 是将 shims 目录添加到 PATH 的简写形式。
:::

## 如何将 mise shims 添加到 PATH

当 `mise` 本身已经位于 `PATH` 中时，使用 `mise activate --shims`。
将以下行添加到指定文件中，并保留现有设置。
Bash 和 Zsh 配置文件会在**登录 shell**中运行；它们不是任意非交互式脚本的启动文件。

::: code-group

```sh [Bash: ~/.bash_profile]
# Use ~/.profile instead if that is your existing login startup file.
eval "$(mise activate bash --shims)"
```

```sh [Bash: ~/.bashrc]
eval "$(mise activate bash)"
```

```sh [Zsh: ~/.zprofile]
eval "$(mise activate zsh --shims)"
```

```sh [Zsh: ~/.zshrc]
eval "$(mise activate zsh)"
```

```fish [Fish: ~/.config/fish/config.fish]
if status is-interactive
    mise activate fish | source
else
    mise activate fish --shims | source
end
```

:::

Bash 登录 shell 会读取 `~/.bash_profile`、`~/.bash_login` 和 `~/.profile` 中第一个可用的文件。只有在配置文件加载了 `~/.bashrc` 时，它们才会读取 `~/.bashrc`。在添加会隐藏旧配置文件的新配置文件之前，请检查现有的启动文件。Zsh 会为登录 shell 读取 `~/.zprofile`，为交互式 shell 读取 `~/.zshrc`。

对于脚本或 CI 命令，优先使用 `mise exec -- <command>`。从已配置 shell 启动的脚本会继承其 `PATH`，但调度程序或 IDE 可能不会继承该 shell 的环境。有关这些环境，请参阅 [IDE integration](/ide-integration.html) 和 [Windows setup](/installing-mise.html#windows-scoop)。

::: info
可以在 shell 配置文件中调用 [`mise activate --shims`](/cli/activate.html#flags)，然后稍后在交互式会话中调用 [`mise activate`](/cli/activate.html)。当有效工具集中包含延迟声明或启用了 `not_found_auto_install` 时，PATH 激活会将用户 shim farm 和现有系统 shim farm 保留在真实工具路径之后。
如果两者都没有，完整激活会像以前一样移除 shim farm。这使延迟引导命令可用，同时在安装完成后不会增加调度开销。`not_found_auto_install`
仍然控制通用的缺失工具安装，但不会禁用显式的 `lazy = true` 声明。

:::

要明确禁止工具 shim 参与完整 shell 激活，包括启用了自动安装或延迟工具时，运行 `mise settings set activate_shims false` 并重启 shell。
有关权衡，请参阅 [`activate_shims`](/configuration/settings.html#activate_shims)。Shims 有多种用途：安装缺失的已配置版本、引导延迟工具，以及调度已配置的命令包装器。通过 [mr-boxington](https://github.com/jdx/mr-boxington) 使用的 `cargo` 等包装器会使用自己的 `command-wrappers/bin` 目录；即使禁用此设置，该目录仍会保持启用状态。
显式的 `mise activate --shims` 也仍然有效。

::: info
当 shim 无法解析由 mise 管理的工具时（例如，`mise.toml` 中固定的版本尚未安装，且 [`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 已禁用），它不会报错，而是回退到在 `PATH` 其他位置找到的第一个同名可执行文件。

对于你也希望在 mise 外部使用的工具，这很方便；但对于操作系统本身也提供的工具（例如 Debian/Ubuntu 上的 `python3`），这意味着 shim 可能会悄悄运行一个完全不同且无关的二进制文件，而不是明确报错。

如果你希望无法解析的 shim 直接失败，可以将 [`not_found_system_fallback`](/configuration/settings.html#not_found_system_fallback) 设置为 `false`，并同时将 `not_found_auto_install` 设置为 `false`。
:::

- 如果你愿意，也可以决定只使用 `shims`，但这会带来一些[限制](/dev-tools/shims.html#shims-vs-path)
- [`mise activate --shims`](/cli/activate.html#flags) 的另一种选择是使用 `export PATH="$HOME/.local/share/mise/shims:$PATH"`。如果此时 `mise` 尚不可用，这种方式会很有帮助

### mise reshim

要强制 `mise` 更新 `shims` 目录的内容，请运行 `mise reshim`。

对于系统 shim farm，使用 `mise reshim --system`。如果 `shims_dir` 和
`system_shims_dir` 解析为同一个物理路径，任一命令都会协调一个包含两个作用域的合并 farm。

当安装、更新或移除工具时，mise 会重建 shims。如果其他包管理器在现有安装中添加了可执行文件，请运行
`mise reshim`。Node.js 核心插件可以通过其 [`node.npm_shim`](/configuration/settings.html#node.npm_shim) 包装器，在执行 `npm install -g` 后完成此操作；这不是适用于每个包管理器的通用钩子。

`mise reshim` 只会创建和移除 shims。一些用户将其视为“修复”按钮，但只有在 `~/.local/share/mise/shims` 中缺少本应存在的内容时才需要运行它。

对于 `mise reshim`，配置的 shim 目录可能是诸如 `~/.local/bin` 或 `/usr/local/bin` 这样的共享可执行目录：reshim 只会替换或移除其识别为 mise shim 的条目，并保留同名的非托管文件。不过，mise 的其他功能仍会将 shim 目录整体识别为 `PATH` 条目，因此共享目录目前不支持 `mise activate`、hook-env 或内部依赖查找。如果使用这些功能，请使用专用的 `shims_dir`。

## 命令包装器

当某个命令应始终通过另一个程序运行，同时保留其普通名称时，使用 `[wrappers]`。例如，下面的配置会将每次 `cargo` 调用都通过 [Mr Boxington](https://github.com/jdx/mr-boxington) 路由：

```toml
[tools]
mr-boxington = "1.4.1"

[wrappers.cargo]
command = "mbx"
env = { MBX_CARGO_SHIM_MODE = "1" }
```

添加或移除包装器后运行 `mise reshim`。该包装器同时适用于 `mise activate` 和 `mise activate --shims`，并且优先于同名的可执行文件。当它进行委托时，mise 会从 `PATH` 中移除其调度目录，因此在配置了由 mise 管理的 Rust 时，`mbx` 会解析到其中的 Cargo，否则会回退到 rustup 或系统安装。

如果不需要参数或环境变量，也可以使用简写形式：

```toml
[wrappers]
terraform = "tofu"
```

详细形式可以在用户提供的参数之前插入参数：

```toml
[wrappers.python]
command = "uv"
args = ["run", "python"]
```

## Shims 与 PATH {#shims-vs-path}

当使用 shims **而不是** [PATH 激活](#path-activation) 时，会受到以下功能影响：

- mise 中定义的[环境变量](/environments/) 仅对 mise 工具可用
- 大多数[钩子](/hooks.html)不会触发
- Unix 的 `which` 命令会指向 shim，从而隐藏真实的可执行文件

一般来说，对于_交互式_场景，推荐使用 PATH 激活（`mise activate`）而不是 shims。

使用 `activate` 时，每次显示提示符，mise 都会确定 `PATH` 和其他
环境变量应当是什么，并将其导出。这就是它不适合脚本等非交互式场景的原因：提示符从未显示，因此你必须手动调用 `mise hook-env`，让 mise 更新环境变量（但也有例外；请参阅[“对 `cd` 的钩子”](#hook-on-cd)）。

### 环境变量与 shims

Shims 的一个缺点是，只有在调用 shim 时才会加载环境变量。这意味着，如果你
在 `mise.toml` 中设置了一个[环境变量](/environments/)，只有在调用 shim 时才会应用该变量。

下面的示例只适用于 `mise activate`：

```sh
$ mise set NODE_ENV=production
$ echo $NODE_ENV
production
```

但以下方式两者都适用：

```sh
$ mise set NODE_ENV=production
$ node -p process.env.NODE_ENV
production
```

即使不需要任何 mise 工具，你也可以使用 [`mise x|exec`](/cli/exec.html) 和 [`mise r|run`](/cli/run.html) 来加载环境：

```sh
$ mise set NODE_ENV=production
$ mise x -- bash -c "echo \$NODE_ENV"
production
$ mise r some_task_that_uses_NODE_ENV
production
```

::: tip
一般来说，[任务](/tasks/) 是确保始终加载 mise 环境的好方法。
:::

### Hooks 与 shims

[钩子](/hooks.html) `cd`、`enter` 和 `leave` 只有在使用 `mise activate` 时才会触发。单独的 [`watch_files`](/hooks.html#watch-files-hook) 配置也要求使用 `mise activate`。不过，`preinstall` 和 `postinstall` 仍然可以与 shims 一起使用，因为它们不需要 shell 集成。

### `which`

许多用户认为 `which` 很有价值。Shims 实际上会“破坏” `which`，导致它显示 shim 的位置。解决方法是使用 `mise which`，它会显示实际位置。一些用户更喜欢运行 `which node` 的“整洁性”，并获得包含版本号的真实路径，例如：

```sh
$ which node
~/.local/share/mise/installs/node/24/bin/node
```

### 性能

PATH 激活会在提示符处以及受支持的目录变更钩子中执行其工作。
Shims 会在调用命令时解析环境。哪种方式开销更低取决于你运行命令的方式。

例如，一个反复调用 shim 的脚本会在每次调用时解析环境：

```bash
for i in {1..500}; do
    node script.js
done
```

使用 `mise exec -- bash benchmark.sh` 运行外层脚本，可以只准备一次环境。
子进程随后会继承位于 shim 目录之前的真实工具目录。同样，由 shim 启动的进程会将解析后的环境传递给其子进程。

请参阅[慢 shell 提示符](/troubleshooting.html#slow-shell-prompts)来诊断
激活开销。钩子行为和父 shell 环境更新也有所不同，因此应根据这些要求以及性能来选择激活方法。

## 既不使用 shims，也不使用 PATH {#neither-shims-nor-path}

[`mise exec`](/cli/exec.html)、[`mise run`](/cli/run.html) 和
[`mise en`](/cli/en.html) 会显式加载工具和环境变量：

```sh
mise exec -- node --version
mise run build
```

第二条命令要求存在名为 `build` 的任务。这种方式适用于 CI、
脚本以及不希望更改 shell 启动文件的项目。
它要求 `mise` 位于 `PATH` 中，但不需要 shell 激活或 shim 目录。

## 对 `cd` 的钩子 {#hook-on-cd}

对于某些 shell（`bash`、`zsh`、`fish`、`xonsh`），`mise` 会挂钩到 `cd` 命令；而在其他 shell 中，它只会在显示提示符时运行。这依赖于 `zsh` 中的 `chpwd`、`bash` 中的 `chpwd` 模拟（包装 `cd`/`pushd`/`popd`）以及 `PROMPT_COMMAND`、`fish` 中的 `fish_prompt`，还有 `xonsh` 中的 `on_chdir`。

目录变更钩子允许这些 shell 在下一个命令执行前应用新的项目环境，即使提示符尚未显示。

::: details 在一行中运行多个命令

如果你像下面这样在一行中运行一组命令：

```sh
cd ~
cd ~/src/proj1 && node -v && cd ~/src/proj2 && node -v
```

在没有 `cd` 钩子的 shell 中使用 `mise activate` 时，即使目录已经变更，这里也会使用来自 `~` 的工具，而不是来自 `~/src/proj1` 或 `~/src/proj2` 的工具。

这是因为在这些 shell 中，`mise` 只会在提示符显示之前运行，而在其他 shell 中，它会挂钩到 `cd`。上面的内联示例始终可以与 Shims 一起正常工作。

:::

## 在 rc 文件中使用 mise

像 `.zshrc` 这样的 rc 文件很特殊：它们是脚本，但只会在交互式会话中运行。如果你需要
在 rc 文件中访问 mise 提供的工具，有两个选项：

::: code-group

```sh [hook-env]
eval "$(mise activate zsh)"
eval "$(mise hook-env -s zsh)"
node some_script.js
```

```sh [shims]
eval "$(mise activate zsh --shims)" # 应放在第一行
eval "$(mise activate zsh)"
node some_script.js
```

:::
