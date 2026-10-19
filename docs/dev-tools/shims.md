---
description: "在 shell 激活、shims 和 mise exec 之间选择，让编辑器和脚本运行正确的工具版本。"
---

# Shims 启动器

shim 是一个以工具命令命名的小型可执行文件，例如 `node`。程序运行 shim 时，它会向 mise 查询当前目录选择的版本，加载项目环境，然后运行真正的可执行文件。对于无法访问已激活 shell 的编辑器和其他程序，请将 shim 目录加入 `PATH`。

## 选择 mise 工具的使用方式 {#overview}

| 方式                                                      | 环境应用范围                                        | 更新时机                                    | 适用场景                                |
| --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| [`mise activate`](/cli/activate.html)                     | 当前 shell                                           | 每次显示提示符时，大多数 shell 中也在 `cd` 后 | 交互式终端                               |
| [`mise activate --shims`](#how-to-add-mise-shims-to-path) | 将 shim 目录加入 shell 的 `PATH`                    | 每次运行 shim 命令时                        | 编辑器、IDE、GUI 应用、登录配置文件     |
| shim                                                      | 启动的程序及其子进程                                | 每次启动时                                  | 通过 `PATH` 查找的命令                   |
| [`mise exec`](/cli/exec.html)                             | 单条命令及其子进程                                  | 每条命令一次                                | 脚本和 CI                                |
| [`mise run`](/cli/run.html)                               | 单个任务及其依赖                                    | 每个任务一次                                | 命名的项目命令                           |
| [`mise env`](/cli/env.html)                               | 打印供其他程序应用的环境变量赋值                    | 每次运行时                                  | 其他环境工具                             |

在你输入命令的 shell 中使用 `mise activate`，这样 `node` 和 `[env]` 变量就会随你切换项目。需要为工具提供稳定路径的程序（例如配置了 Python 可执行文件的 IDE）应使用 shims；[shims 与 PATH 激活](#shims-vs-path)介绍了 shims 的限制。两种方式也可以同时使用：在登录配置文件中设置 `mise activate --shims`，并在交互式启动文件中设置 `mise activate`，如[将 shims 加入 PATH](#how-to-add-mise-shims-to-path)所示。激活配置参见 [Shell 设置](/shell-setup.html)。

### 不使用激活或 shims {#neither-shims-nor-path}

[`mise exec`](/cli/exec.html)、[`mise run`](/cli/run.html) 和
[`mise en`](/cli/en.html) 都可以加载工具和环境变量，而无需更改任何启动文件：

```sh
mise exec -- node --version
mise run build # 运行名为 build 的任务
```

这种方式适用于 CI、脚本，以及不想更改 shell 启动文件的项目。只需要确保 `mise` 位于 `PATH` 中，无需激活或 shim 目录。

## shims 的工作方式 {#mise-activate-shims}

mise 会维护两个 shim 目录：

- 用户 shim 目录：`~/.local/share/mise/shims`（Windows 上为 `%LOCALAPPDATA%\mise\shims`），由 [`shims_dir`](/configuration/settings.html#shims_dir) 设置。
- 系统 shim 目录：`/usr/local/share/mise/shims`，用于[系统级安装](/dev-tools/system-installs.html)。

安装工具时，mise 会为该工具提供的每个可执行文件在 shim 目录中添加一个 shim。在 Unix 上，每个 shim 都是指向 `mise` 二进制文件的符号链接；在 Windows 上，默认情况下每个 shim 都是随 `mise.exe` 一同发布的 `mise-shim.exe` 的副本（参见 [`windows_shim_mode`](/configuration/settings.html#windows_shim_mode)）。如果更新替换了 `mise.exe` 却留下旧版 `mise-shim.exe`，`mise doctor` 和 `mise reshim` 会报告此问题，因为重新生成的 shim 仍会使用旧启动器。请使用安装 mise 的包管理器更新，或运行 `mise self-update`，确保两个文件都被替换，然后运行 `mise reshim --force`。

```sh
mise use node@24 npm:prettier@3
ls -l ~/.local/share/mise/shims/node
# ~/.local/share/mise/shims/node -> ~/.local/bin/mise
~/.local/share/mise/shims/prettier --version
```

每个工具的所有已安装版本都会共用一个 shim。每次运行 shim 时，它都会读取当前目录的配置、选择版本、设置项目的 `[env]` 变量，并运行真正的可执行文件。

如果 shim 找不到配置指定的版本，只要 [`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 已启用，就会自动安装该版本。否则，它会运行 `PATH` 中下一个同名可执行文件。对于你也希望在 mise 之外使用的工具，这种回退很方便；但对于操作系统也提供的命令（例如 Debian 或 Ubuntu 上的 `python3`），shim 可能会静默运行无关的系统二进制文件。将 [`not_found_system_fallback`](/configuration/settings.html#not_found_system_fallback) 和 `not_found_auto_install` 都设为 `false`，即可让无法解析的 shim 直接失败。

## 将 shims 加入 PATH {#how-to-add-mise-shims-to-path}

`mise activate --shims` 会输出用于将 shim 目录和[命令包装器](#command-wrappers)目录加入 `PATH` 的配置行。请在目标程序会读取的启动文件中添加配置，同时保留现有设置：

::: code-group

```sh [Bash: ~/.bash_profile]
# 如果你已在使用 ~/.bash_login 或 ~/.profile，请改为编辑现有文件。
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

登录 shell 会读取 profile 文件，交互式 shell 会读取 `~/.bashrc` 和 `~/.zshrc`。登录 Bash 只会读取 `~/.bash_profile`、`~/.bash_login` 和 `~/.profile` 中找到的第一个文件；只有该文件显式加载 `~/.bashrc` 时才会读取它。在 Ubuntu 和 Debian 上，`~/.profile` 通常会加载 `~/.bashrc` 并设置 `PATH`，因此新建 `~/.bash_profile` 会阻止加载 `~/.profile`。请将配置行添加到已有文件，或新建 `~/.bash_profile` 并在其中加载 `~/.profile`：

```sh [~/.bash_profile]
[[ -f ~/.profile ]] && source ~/.profile
eval "$(mise activate bash --shims)"
```

如果执行 profile 时 `mise` 不在 `PATH` 中，请通过完整路径调用它，例如 `eval "$($HOME/.local/bin/mise activate zsh --shims)"`，或者直接添加用户 shim 目录。此配置行不会添加系统 shim 目录和命令包装器目录：

```sh
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

编辑器和其他 GUI 程序只会在启动时读取这些文件；有些桌面环境只会在登录时读取登录 profile。更改后请重启编辑器，或注销后重新登录。编辑器的具体设置参见 [IDE 集成](/ide-integration.html)。由调度器、服务管理器或不读取 profile 的 IDE 启动的程序需要单独设置 `PATH`，或者通过 `mise exec` 调用。

在 Windows 上，编辑器和其他 GUI 程序不会读取 `$PROFILE`。请按 [Windows shell](/shell-setup.html#windows) 文档所述，将 `%LOCALAPPDATA%\mise\shims` 加入用户 `Path`；PowerShell 自身仍可在 `$PROFILE` 中保留 `mise activate pwsh`。

## shims 与 PATH 激活 {#shims-vs-path}

shims 只负责启动工具本身。它们不会在 shell 中设置 [`[env]` 变量](#env-vars-and-shims)，只会运行安装[钩子](#hooks-and-shims)，并会让 [`which`](#which) 输出 shim 路径。你输入命令的 shell 应使用 [PATH 激活](#path-activation)；未从该 shell 启动的程序则使用 shims。

### PATH 激活 {#path-activation}

使用 [`mise activate`](/cli/activate.html) 时，mise 会将每个选定工具的
`bin` 目录加入 `PATH` 的最前面：

```sh
echo "$PATH"
# ~/.local/share/mise/installs/python/3.14.8/bin:/usr/local/bin:/usr/bin:/bin
```

在 bash、zsh、fish、elvish 和 PowerShell 中，激活脚本运行时 mise 会设置 `PATH` 和 `[env]` 变量。Nushell 和 xonsh 则会等到首次显示提示符或目录发生变化时再设置。此后，mise 会在每次显示提示符时刷新环境；对于带有[目录变更钩子](#hook-on-cd)的 shell，还会在每次 `cd` 后刷新。子进程会继承更新后的环境。

默认情况下，即使当前目录没有 `mise.toml`，激活也会把 shim 目录保留在 `PATH` 中，并置于真实工具目录之后：

```sh
echo "$PATH"
# ~/.local/share/mise/shims:/usr/local/bin:/usr/bin:/bin
```

这样，运行缺少的工具命令时可以自动安装（[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install) 默认开启），也能让[延迟安装工具](#lazy-tools)在首次使用时安装。若要移除 shim，请参阅[让 mise activate 不添加 shim](#activate-shims)。

### 目录变更 {#hook-on-cd}

在大多数 shell 中，目录发生变化时 mise 也会更新环境，而不只是显示提示符时更新。因此，`cd ~/proj && node -v` 会使用项目版本：

| Shell          | 在 `cd` 后更新     | 机制                                                    |
| -------------- | ------------------ | ------------------------------------------------------- |
| bash            | 是                | 包装 `cd`、`pushd` 和 `popd`，并使用 `PROMPT_COMMAND`     |
| zsh             | 是                | `chpwd` 钩子                                            |
| fish            | 是                | `--on-variable PWD` 处理器                               |
| elvish          | 是                | `after-chdir` 钩子                                      |
| xonsh           | 是                | `on_chdir` 事件                                         |
| PowerShell 7+   | 是                | `LocationChangedAction`                                 |
| PowerShell 5.x  | 下次显示提示符时  | 仅使用提示符钩子                                        |
| Nushell         | 下次显示提示符时  | `env_change.PWD` 钩子，由 Nushell 在提示符处运行         |

在 fish 中，将 `mise_fish_mode` 设为 `eval_after_arrow` 可延迟到下一条命令开始时更新；设为 `disable_arrow` 则只在显示提示符时更新。

::: details 在同一行运行多条命令

在 PowerShell 5.x 和 Nushell 中，同一行命令会继续使用该行开始时所在目录的工具：

```sh
cd ~
cd ~/src/proj1 && node -v && cd ~/src/proj2 && node -v
```

两次 `node -v` 调用都会使用 `~` 所选的工具。shims 始终根据当前目录解析版本，因此在所有 shell 中都能正确处理这一行命令。

:::

### 环境变量 {#env-vars-and-shims}

只有在 `mise activate` 下，才能在 shell 中读取 `[env]` 变量：

```sh
mise set NODE_ENV=production
echo "$NODE_ENV"
# production
```

这两种方式下都可用，因为 `node` 会通过 shim 运行：

```sh
mise set NODE_ENV=production
node -p process.env.NODE_ENV
# production
```

即使命令不需要 mise 管理的工具，`mise exec` 和 `mise run` 也会加载环境。[任务](/tasks/) 始终在此环境中运行：

```sh
mise exec -- bash -c 'echo $NODE_ENV'
# production
```

### 钩子 {#hooks-and-shims}

`cd`、`enter` 和 `leave` [钩子](/hooks.html)以及 [`watch_files`](/hooks.html#watch-files-hook) 只会在 `mise activate` 下运行。shims 也会运行 `preinstall` 和 `postinstall`，因为这些钩子是在安装期间运行，而不是从 shell 中运行。

### `which` {#which}

使用 shims 时，`which node` 会输出 shim 的路径，而 `mise which node` 会输出真正的可执行文件路径。使用 PATH 激活时，`which node` 会输出已安装工具的路径：

```sh
which node
# ~/.local/share/mise/installs/node/24/bin/node
```

路径可能经过以版本请求命名的链接（例如 `node/24`），而不是最终解析到的版本。实验性目录布局中的路径参见[安装目录结构](/dev-tools/install-layout.html)。

### 检查工具是否已安装 {#command-v}

当 shims 位于 `PATH` 中时，即使 `node` 尚未安装或不是当前目录启用的版本，`command -v node` 仍会成功，因为 shim 文件存在。因此，使用 `command -v` 检查工具是否已安装的脚本可能得到错误的肯定结果。`which` 和 `whence` 也有相同表现。

保留 `command -v`，并且仅在它找到 shim 时才询问 mise。shim 是指向 `mise` 二进制文件的符号链接，位置由 [`shims_dir`](/configuration/settings.html#shims_dir) 或 `system_shims_dir` 决定。`command mise` 会跳过 `mise activate` 定义的 shell 函数。只有当工具能在当前目录解析成功时，`mise which` 才会以零状态码退出：

```sh [have.sh]
have() {
    p=$(command -v "$1") || return 1
    if [ -L "$p" ] && [ "$(basename "$(readlink "$p")")" = mise ]; then
        command mise which "$1" >/dev/null 2>&1
    else
        return 0
    fi
}

have prettier || echo "prettier is not installed"
```

没有安装 mise 的用户不会进入 `mise which` 分支，因此团队中只有部分成员使用 mise 时也能共用此脚本。此示例假设 shim 是符号链接，因此不适用于 Windows。[命令包装器](#command-wrappers)也会链接到 `mise`，但 `mise which` 不会解析包装器名称，因此即使包装后的命令可以运行，`have` 仍会将其报告为缺失。

无法解析的 shim 仍可能运行 `PATH` 中后续位置的同名可执行文件，因此 `have` 可能会将 shim 最终仍能运行的工具报告为缺失。将 `not_found_system_fallback` 和 `not_found_auto_install` 设为 `false`，可以让这类 shim 也直接失败，除非有[延迟安装工具](#lazy-tools)提供该命令。参见 [shims 的工作方式](#mise-activate-shims)。

### 性能 {#performance}

PATH 激活会在显示提示符和目录变化时执行工作。shims 则会在每次命令运行时解析环境，因此循环中每次调用 shim 都会产生这部分开销。例如，下面的脚本会解析环境 500 次：

```sh [benchmark.sh]
for i in {1..500}; do
    node script.js
done
```

使用 `mise exec -- bash benchmark.sh` 运行脚本，可只解析一次环境。之后，子进程会在 shim 目录之前找到真实工具目录。通过 shim 启动的程序也会以相同方式将已解析的环境传给子进程。激活开销的排查方法参见[缓慢的 shell 提示符](/troubleshooting.html#slow-shell-prompts)。

### 脚本与 shell 启动文件 {#using-mise-in-rc-files}

脚本不会显示提示符。激活后，它会读取激活脚本应用的环境；带有 [`cd` 钩子](#hook-on-cd)的 shell 也会在目录变化时更新环境。脚本不会看到运行期间发生的配置更改。可以运行 `eval "$(mise hook-env -s bash)"` 刷新环境，或通过 `mise exec` 运行命令。

`~/.zshrc` 等 shell 启动文件也是脚本。在 bash、zsh 和 fish 中，激活后下一行就可以使用工具：

::: code-group

```sh [activate]
eval "$(mise activate zsh)"
node some_script.js
```

```sh [shims]
eval "$(mise activate zsh --shims)" # 应放在第一行
eval "$(mise activate zsh)"
node some_script.js
```

:::

Nushell 和 xonsh 会在首次显示提示符时才应用环境，因此请先将 shims 加入 `PATH`，或使用 `mise exec`。

## 使用 mise reshim 重建 shims {#mise-reshim}

安装、升级或移除工具时，mise 会相应添加或删除 shims。如果其他程序向现有安装目录中添加了可执行文件，请运行 [`mise reshim`](/cli/reshim.html)，例如全局安装包之后。Node.js 核心工具会通过 [`node.npm_shim`](/configuration/settings.html#node.npm_shim) 包装器为 `npm install -g` 执行此操作；其他包管理器没有此类钩子。

`mise reshim` 只会添加或删除 shims。它不能修复错误的版本或损坏的安装；只有当预期的命令缺少 shim 时才需要运行。`mise reshim --system` 会重建系统 shim 目录。

用户 shim 目录可以设置为 `~/.local/bin` 等共享目录：`mise reshim` 只会替换或删除它识别为 mise shim 的条目。不过激活和 hook-env 会将整个目录视为 shim 目录，因此激活时请使用专用的 [`shims_dir`](/configuration/settings.html#shims_dir)。

## 从 shims 中排除命令 {#excluding-command-names}

操作系统也会提供某些命令，机器上的其他软件依赖使用系统版本。设置 [`shims.exclude`](/configuration/settings.html#shims.exclude) 可防止这些名称进入 shim 目录。mise 仍会安装和管理工具，只是不为它创建 shim。运行以下命令可将设置加入全局配置：

```sh
mise settings shims.exclude=python,python3,pip,pip3
```

例如，在 Arch Linux 上，`/usr/bin/python` 是发行版自带的解释器，其模块位于匹配的 `site-packages` 目录中。如果不排除 `python`，进入固定了 `python` 版本的项目后，`#!/usr/bin/env python` 脚本和构建时调用 `python` 的 `PKGBUILD` 都会改用该固定版本。

下次运行 `mise reshim` 时会移除被排除的名称，延迟安装工具的引导 shim 和插件提供的 shim 也会跳过它们。带版本号的 shim 会保留，因此 `python3.12` 仍会解析到配置所选的版本。没有 shim 后，mise 不会介入该命令，也不会在每次运行时加载配置。

::: warning
排除 `python3` 后，运行 `python3 -m venv` 会静默地使用系统解释器创建虚拟环境。要使用 mise 管理的版本，请运行带版本号的命令，例如 `python3.12 -m venv`。此设置只影响 shims：不带 `--shims` 的 `mise activate` 会将工具的整个 `bin` 目录加入 `PATH`，因此仍能在那里找到被排除的名称。
:::

::: warning
不要使用 mise 安装 `bash`、`zsh` 等 Shell。几乎所有脚本都会按名称运行它们，因此对应的 shim 会影响整个系统。请使用系统软件包管理器安装 Shell；[`mise bootstrap`](/bootstrap.html) 可以管理这些软件包。
:::

## 在 mise activate 中排除 shims {#activate-shims}

PATH 激活会优先放置真实工具目录。默认开启的 [`activate_shims`](/configuration/settings.html#activate_shims) 也会将用户级和系统级 shim 目录保留在 `PATH` 中，排在真实工具目录之后，因此仍可通过运行缺少的工具命令来安装它。默认开启 `not_found_auto_install` 时，无论当前目录是否配置了工具，都会保留这些 shim；关闭该设置后，只有声明了[延迟安装工具](#lazy-tools)时才会保留 shim。运行 `mise settings activate_shims=false` 并重启 Shell，即可完全禁止激活过程添加 shim。关闭后会有哪些功能不可用，详见 [`activate_shims`](/configuration/settings.html#activate_shims)；[命令包装器](#command-wrappers)仍可使用，因为它们使用独立目录；显式运行 `mise activate --shims` 仍会添加 shim。

## 延迟安装工具 {#lazy-tools}

为工具设置 `lazy = true`，即可在首次运行该工具的命令时安装，而不是在执行 `mise install` 时安装：

```toml [mise.toml]
[tools]
node = { version = "24", lazy = true }
```

对于注册表中的工具，mise 会根据注册表的命令列表创建引导 shims。使用显式后端或未收录在注册表中的工具，则需要通过 `lazy_bins` 指定命令名称：

```toml [mise.toml]
[tools]
"github:example/acme" = { version = "1.2.3", lazy = true, lazy_bins = ["acme", "acmectl"] }
```

运行延迟安装工具的某个命令时，mise 会安装该工具以及它所[依赖](/dev-tools/#tool-dependencies)但尚未安装的已配置工具，然后运行该命令。其他工具不会被安装。即使关闭了 `not_found_auto_install`，此功能仍可用。优先级更高的配置若选择同一工具但未设置 `lazy`，则延迟安装声明不会覆盖该配置。

单独运行 `mise install` 会跳过延迟安装工具；不带参数的 `mise upgrade` 也会跳过尚未安装的延迟工具。`mise install --include-lazy` 可立即安装所有延迟安装工具；`mise install node` 或 `mise upgrade node` 则安装指定工具。`mise outdated` 仍会列出这些工具，并标记为 `[MISSING] (lazy)`。安装后，`mise activate` 会将真实工具放在其 shim 之前，后续调用无需额外操作。`mise activate --shims` 则会让每次调用继续通过 mise 分发。

当工具集合中包含延迟安装工具时，任务、`mise exec` 和 `mise env` 会在工具目录之后加入引导 shims，因此任务首次运行该工具的命令时会触发安装。`mise run` 不会预先安装延迟安装工具。`mise use` 更改延迟安装声明时会重建 shims；如果手动编辑声明，请运行 `mise reshim`。

## 命令包装器 {#command-wrappers}

命令包装器保留命令名称，但会运行另一个程序。例如，让 `terraform` 运行 OpenTofu：

```toml [mise.toml]
[tools]
opentofu = "1"

[wrappers]
terraform = "tofu"
```

添加或删除包装器后，请运行 `mise reshim`。包装器同时适用于 `mise activate` 和 `mise activate --shims`，并且优先于同名可执行文件。如果提供包装器命令的已配置工具尚未安装，包装器会像该命令自己的 shim 一样先安装工具；除非工具采用延迟安装，否则还受 `not_found_auto_install` 控制。

表格形式的包装器会将参数插入用户参数之前，也可以设置环境变量：

```toml [mise.toml]
[tools]
uv = "latest"

[wrappers.python]
command = "uv"
args = ["run", "python"]
```

当 Rust 来自 rustup 或系统，而不是 mise 时，此配置会让每次 `cargo` 调用都经过 [Mr Boxington](https://mr-boxington.jdx.dev/)：

```toml [mise.toml]
[tools]
mr-boxington = "latest"

[wrappers.cargo]
command = "mbx"
env = { MBX_CARGO_SHIM_MODE = "1" }
```

`command`、`args` 和 `env` 的值均为[模板](/templates.html)，因此 wrapper 可以使用 `vars`、`env`、`config_root` 和 `join_path` 等函数。`read_file` 等函数中的相对路径会相对于声明该 wrapper 的文件所在目录解析。由于 `command` 可能负责安装项目工具，它只能读取 `vars`、`config_root`、`config_source` 和进程环境变量：

```toml [mise.toml]
[wrappers.foo]
command = "foo-real"
env = { FOO_HOME = "{{ [xdg_data_home, 'foo'] | join_path }}" }
```

值中直接包含 <span v-pre>`{{`</span> 或 <span v-pre>`{%`</span>（例如 Docker 的 <span v-pre>`{{.Names}}`</span> 格式字符串）时，mise 现在会将其解析为模板。请用 raw 块包裹这类内容：

```toml [mise.toml]
[wrappers.docker]
command = "podman"
args = ["ps", "--format", "{% raw %}{{.Names}}{% endraw %}"]
```

包装器运行命令时，mise 会从 `PATH` 中移除 shim 和包装器目录，因此 `mbx` 会找到真正的 Cargo：如果配置了 mise 管理的 Rust，就使用该版本；否则使用 rustup 或系统安装的版本。若要使用 mise 管理的 Rust，请参见 [Rust 指南](/lang/rust.html#share-cargo-builds-with-mr-boxington)，通过 `mr_boxington` 工具选项和 `mr-boxington` 工具完成配置。
