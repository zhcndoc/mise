# Bootstrap 软件包 <Badge type="warning" text="experimental" />

mise 可以通过 `mise.toml` 中的 `[bootstrap.packages]` 部分，确保安装机器全局系统软件包：

```toml
[bootstrap.packages]
"apk:build-base" = "latest"
"apt:libssl-dev" = "latest"
"apt:build-essential" = "latest"
"brew:postgresql@17" = "latest"
"brew:ffmpeg" = "latest"
"brew-cask:firefox" = "latest"
"mas:497799835" = "latest"
```

每一项的键为 `"manager:package"` —— 必须包含管理器前缀 —— 值为版本：`"latest"` 表示由该管理器安装的最新版本，或者在支持的情况下使用该管理器原生格式的固定版本（见各管理器对应页面）。

mise 也可以放置配置文件（dotfiles）—— 参见 [Dotfiles](/dotfiles.html)，它使用 `mise dotfiles` 命令。

系统软件包是有意与 [`[tools]`](/configuration.html) 分开的：它们不是按项目固定版本，不会生成 shim，并且由平台的包管理器安装到机器全局——或者对于 `brew` 和 `brew-cask`，则由 mise 内置的 Homebrew 安装器安装，这些安装器不需要 Homebrew 本身。请将它们用于共享库、构建依赖以及机器全局的 GUI 应用（`libssl-dev`、`postgresql`、`ffmpeg`、`firefox`），而不是用于项目开发工具——那些应该放在 `[tools]` 中。

`[bootstrap]` 部分还可以声明 [repos](/bootstrap/repos.html)（`[bootstrap.repos]`），并通过 `mise bootstrap repos apply` 应用；声明 [macOS defaults](/bootstrap/macos-defaults.html)（`[bootstrap.macos.defaults]`），并通过 `mise bootstrap macos defaults apply` 应用；以及声明 macOS [LaunchAgents](/bootstrap/launchd.html)（`[bootstrap.macos.launchd.agents]`），并通过 `mise bootstrap macos launchd-agents apply` 应用。Linux 用户服务位于 [systemd](/bootstrap/systemd.html)（`[bootstrap.linux.systemd.units]`）中，并通过 `mise bootstrap linux systemd-units apply` 应用。Shell 激活片段位于 [Shell Activation](/bootstrap/shell.html)（`[bootstrap.mise_shell_activate]`）中。当前用户的 [login shells](/bootstrap/user.html)（`[bootstrap.user].login_shell`）可通过 `mise bootstrap user apply` 或 [`mise bootstrap`](/cli/bootstrap.html) 应用。

## 支持的包管理器

| 管理器      | 平台                                                         | 页面                                      |
| ----------- | ------------------------------------------------------------ | ----------------------------------------- |
| `apk`       | Alpine Linux                                                 | [apk](/bootstrap/packages/apk.html)       |
| `apt`       | Debian, Ubuntu                                               | [apt](/bootstrap/packages/apt.html)       |
| `dnf`       | Fedora, RHEL, CentOS, Rocky, Alma                            | [dnf](/bootstrap/packages/dnf.html)       |
| `pacman`    | Arch, Manjaro                                                | [pacman](/bootstrap/packages/pacman.html) |
| `brew`      | macOS (arm64), Linux (x86_64/arm64) — **无需 Homebrew**      | [brew](/bootstrap/packages/brew.html)     |
| `brew-cask` | macOS — **无需 Homebrew**                                    | [brew](/bootstrap/packages/brew.html)     |
| `mas`       | 在 `PATH` 中带有 `mas` CLI 的 macOS                           | [mas](/bootstrap/packages/mas.html)       |

## 语义

- **默认是声明式和追加式** — 条目会跨越 [配置层级](/configuration.html)（全局 → 项目）按键的并集进行合并。项目可以在全局列表之上添加包（并覆盖全局条目的版本锁定），但不能删除它们。对于 Homebrew 配方，`mise bootstrap packages prune --manager brew` 是一个显式的破坏性命令，会移除当前配置或受信任、可加载的跟踪配置不再需要的已链接配方。
- **按操作系统过滤** — 当前机器上不可用的管理器条目不会被处理，因此同一份配置可跨平台工作：`apt` 条目会在 macOS 上被忽略，`dnf` 条目会在 Ubuntu 上被忽略，依此类推。`brew` 同时适用于 macOS 和 Linux；`brew-cask` 适用于 macOS；当 `mas` CLI 位于 `PATH` 中时，`mas` 适用于 macOS。状态命令仍会列出不可用的管理器，因此不会有任何内容被悄然隐藏。
- **仅手动安装** — mise 从不隐式安装系统包。`mise install` 在缺少包时会打印一次性提示，但只有 `mise bootstrap packages apply` 会真正安装任何内容。
- **未知管理器会带警告并被忽略**，因此使用新版 mise 中管理器的配置仍然可以正常解析。

对于当前用户的登录 shell 设置，请使用 `[bootstrap.user].login_shell`：

```toml
[bootstrap.user]
login_shell = "/bin/zsh"
```

详情请参见 [用户登录 shell](/bootstrap/user.html)。

## 命令

```sh
mise bootstrap packages status            # 请求与已安装包的表格
mise bootstrap packages status --json     # 机器可读格式
mise bootstrap packages status --missing  # 如果有任何不同步则退出 1（CI 检查）

mise bootstrap packages apply           # 安装任何缺失的包（先提示）
mise bootstrap packages apply apt:curl  # 安装特定包（无论是否已配置）
mise bootstrap packages apply --dry-run # 打印命令而不执行
mise bootstrap packages apply --yes     # 跳过确认提示
mise bootstrap packages apply --manager apt
mise bootstrap packages apply --update  # 先刷新包管理器元数据

mise bootstrap packages use apk:zlib-dev apt:curl brew:jq brew-cask:firefox mas:497799835
mise bootstrap packages use -g brew:ffmpeg                      # 全局写入
mise bootstrap packages use apt:curl@8.5.0-2   # 锁定版本（brew 通过
                                   # 配方名锁定：brew:postgresql@17）

mise bootstrap packages import --manager brew   # 添加已安装且被请求的 brew formula
mise bootstrap packages import --manager brew --all
mise bootstrap packages import --manager brew --dry-run

mise bootstrap packages prune --manager brew    # 移除不再需要的已链接 brew formula
mise bootstrap packages prune --manager brew --dry-run
mise bootstrap packages prune --manager brew --yes

mise bootstrap packages upgrade           # 将已安装包升级到当前版本
mise bootstrap packages upgrade --manager brew
mise bootstrap packages upgrade --manager brew-cask
mise bootstrap packages upgrade --manager mas
```

`mise bootstrap packages use` 是系统包的 `mise use`：它会向 mise.toml（默认是本地文件，使用 `-g` 则是全局文件）写入
`"manager:package" = "version"` 条目，并安装任何缺失的内容。对于当前机器上不可用的管理器，会写入条目但不会安装——这就是共享配置如何把在 Mac 上编写的 `apt:` 行带过去的。

`mise bootstrap packages import --manager brew` 是 Homebrew
formulae 的反向操作：它读取当前激活的 Homebrew `opt` 链接，并将请求的
formulae 以 `"brew:<formula>" = "latest"` 的形式写入 `[bootstrap.packages]`。默认只导入 keg 收据表明是“按请求安装”的 formulae；传入 `--all` 可同时包含依赖 formulae。导入的 formulae 会在之后的 prune 运行中保留下来，因为它们现在已经在配置中声明了。

`mise bootstrap packages prune --manager brew` 会移除当前配置或受信任、可加载的已跟踪配置不再需要的已链接 brew formulae。这包括由真实的 Homebrew 安装的 formulae。它是 mise 的声明式清理命令，精神上类似于
[Homebrew Bundle cleanup](https://docs.brew.sh/Manpage)，而不是 Homebrew 已移除的旧上游
`brew prune` 命令。

`mise bootstrap packages upgrade` 会刷新包管理器元数据，并将已配置且已经安装的包升级到最新可用版本——apk、apt 和 dnf 也会遵循配置中锁定的版本（pacman、brew、brew-cask 和 mas [无法安装锁定版本](/bootstrap/packages/pacman.html)，因此锁定条目会被跳过并给出警告）。尚未安装的包会被跳过——那是 `mise bootstrap packages apply` 的工作。对于 brew，这会倒入该 formula 当前的 bottle 并替换旧的 keg；对于 brew-cask，这会安装当前的 cask artifact；对于 mas，这会运行 `mas upgrade`。

`mise doctor` 也会报告已配置的系统包，并在有任何缺失时发出警告。

## 选择要运行的管理器

默认情况下，mise 会对当前机器上可用的每个已配置管理器执行操作。由于可用性意味着操作系统（`apt` 只存在于 Debian 系列系统上，`brew` 则在存在 bottle 的任何地方都可用），这通常无需配置就能正常工作。

如果有多个管理器都可能适用——例如一台机器上安装了多个包管理器，或者共享配置列出了你不想在这里使用的管理器——可以通过 [`system_packages.managers`](/configuration/settings.html)
设置选择一个子集：

```toml
[settings]
system_packages.managers = ["apt"]
```

当你希望针对不同操作系统选择不同的管理器时，这可以与 [平台特定配置文件](/configuration.html)
（`mise.macos.toml`、`mise.linux.toml`）结合使用。

## sudo

Linux 包管理器需要 root 权限。当未以 root 身份运行时，mise 会使用 `sudo` 提权，并像平常一样提示你输入密码。当 `[bootstrap.user].login_shell` 需要向 `/etc/shells` 添加一个 shell 时，也会使用相同的 sudo 路径，而且这只会在显式执行 `mise bootstrap` 时发生：

- 已经是 root（容器、CI）：不使用 sudo，命令直接运行
- 交互式终端：例如 `sudo apt-get install ...`，带有正常的 sudo
  提示
- 非交互式且没有免密码 sudo：mise 会报错并打印需要手动运行的确切
  命令——它绝不会因为等待密码而卡住
- 运行前会记录完整的命令行

设置 [`system_packages.sudo = false`](/configuration/settings.html) 可完全禁止
提权；mise 会改为打印需要你自己运行的命令。`brew` 管理器通常不需要 sudo，除非是首次创建
`/opt/homebrew`（见 [brew](/bootstrap/packages/brew.html)）。

## CI 用法

在容器中，你通常已经是 root，因此不会出现提示：

```sh
mise bootstrap packages apply --yes
mise install
```

[`mise bootstrap --yes`](/cli/bootstrap.html) 将两者结合起来（并在之后运行一个名为 `bootstrap` 的任务，如果已定义的话）——只需一条命令即可为一台全新的机器或容器完成设置。

`mise bootstrap packages status --missing` 在缺少包时会以 1 退出，这使其成为一个方便的 CI 检查方式，而无需安装任何东西。
