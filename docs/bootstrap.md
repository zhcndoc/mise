# Bootstrap <Badge type="warning" text="experimental" />

包、git 仓库、dotfiles、mise shell 激活、macOS 默认设置、macOS
LaunchAgents、Linux systemd 用户服务、用户的登录 shell、工具，以及
任何最终的项目特定任务。你还可以添加在 bootstrap 序列中的命名点运行的钩子。

对于在项目或工作站就绪之前所需、但不属于 `[tools]` 的内容，请使用 bootstrap：原生库、Homebrew
公式、dotfile 仓库、shell rc 文件、编辑器配置、macOS
偏好设置、用户服务，以及一次性机器设置。

## 它的运行方式

`mise bootstrap` 按以下顺序执行这些步骤：

1. `mise bootstrap packages apply` 安装缺失的 `[bootstrap.packages]`。
2. `mise bootstrap repos apply` 克隆或更新 `[bootstrap.repos]`。
3. `mise bootstrap dotfiles apply` 应用 `[dotfiles]`。
4. `mise bootstrap mise-shell-activate apply` 配置来自
   `[bootstrap.mise_shell_activate]` 的 shell 激活。
5. `mise bootstrap macos defaults apply` 写入 `[bootstrap.macos.defaults]`。
6. `mise bootstrap macos launchd-agents apply` 写入并加载
   `[bootstrap.macos.launchd.agents]`。
7. `mise bootstrap linux systemd-units apply` 通过写入 unit 文件、启用/禁用它们，并按配置启动/停止它们来收敛
   `[bootstrap.linux.systemd.units]`。
8. `mise bootstrap user apply` 应用 `[bootstrap.user]`。
9. `mise install` 安装缺失的 `[tools]`。
10. `mise run bootstrap` 运行一个名为 `bootstrap` 的任务（如果存在）。
11. `[bootstrap.hooks.final]` 在 bootstrap 任务之后运行（如果已配置）。

使用 `mise bootstrap --skip <part>` 跳过特定部分。支持的部分包括
`packages`、`repos`、`dotfiles`、`mise-shell-activate`、`macos-defaults`、
`macos-launchd-agents`、`linux-systemd-units`、`user`、`tools`、`task` 和
`final-hook`。旧的较短名称 `shell`、`defaults`、`launchd` 和
`systemd` 仍然可以作为别名接受。该标志可以重复使用或用逗号分隔，例如
`mise bootstrap --skip tools,task`。

使用 `mise bootstrap --only <part>` 仅运行特定部分。它支持
相同的部分名称，并且可以重复使用或用逗号分隔，例如
`mise bootstrap --only dotfiles,tools`。`--only` 和 `--skip` 互斥。

Hook 阶段也可以在内置步骤之前和之后运行：
`pre-packages`、`post-packages`、`pre-repos`、`post-repos`、`pre-dotfiles`、
`post-dotfiles`、`pre-defaults`、`post-defaults`、`pre-user`、`post-user`、
`pre-tools` 和 `post-tools`。

声明式步骤会收敛：如果某个包已经安装，某个仓库已经处于请求的 ref，某个 dotfile 已经匹配，或者某个默认值已经
设置，mise 就会跳过它。`bootstrap` 任务每次都会运行，因此请保持它具备幂等性。

## 示例

```toml
[bootstrap.packages]
"apk:build-base" = "latest"
"apt:build-essential" = "latest"
"brew:postgresql@17" = "latest"

[bootstrap.repos]
"~/src/dotfiles" = { url = "git@github.com:jdx/dotfiles.git", ref = "main" }

[dotfiles]
"~/.gitconfig" = { mode = "symlink" }
"~/.config/nvim" = { mode = "symlink" }

[bootstrap.mise_shell_activate]
zprofile = "shims"
zshrc = "activate"
fish = "activate"

[bootstrap.macos.dock]
autohide = true
orientation = "left"
tilesize = 48

[bootstrap.macos.finder]
show_pathbar = true

[bootstrap.macos.keyboard]
key_repeat = 2
initial_key_repeat = 15

[bootstrap.macos.trackpad]
tap_to_click = true

[bootstrap.macos.defaults]
"com.apple.finder" = { AppleShowAllFiles = true }

[bootstrap.macos.launchd.agents.my-sync]
program = "~/.local/bin/my-sync"
args = ["--watch"]
run_at_load = true

[bootstrap.linux.systemd.units.my-sync]
description = "同步文件"
exec_start = "~/.local/bin/my-sync --watch"
restart = "on-failure"

[bootstrap.user]
login_shell = "/bin/zsh"

[bootstrap.hooks.pre-packages]
run = "softwareupdate --install-rosetta --agree-to-license"

[bootstrap.hooks.post-defaults]
run = "killall Dock || true"

[tools]
node = "lts"
python = "3.12"

[tasks.bootstrap]
run = "gh auth status || gh auth login"
```

然后运行：

```sh
mise bootstrap --yes
```

进行 dry run：

```sh
mise bootstrap --dry-run
```

当 `mise bootstrap` 应用或即将应用某些需要用户后续处理的内容时，
它会在成功运行后打印一个最终的 `bootstrap: follow-up` 部分。dry run
会使用 `bootstrap: follow-up if applied`。如果后续的某个 bootstrap 阶段
在前面的阶段已经生成了后续处理项之后失败，mise 会在返回错误之前打印
这些项。如果没有需要处理的可操作内容，则会省略该部分。

默认情况下，bootstrap 会拒绝 dotfile 冲突，而不是替换本地文件。
当你明确希望 dotfiles 阶段替换冲突的整文件 dotfile 目标时，请使用
`mise bootstrap --force-dotfiles`。

## 检查状态

使用 `mise bootstrap status` 在一个地方检查声明式引导状态：

```sh
mise bootstrap status
mise bootstrap status --json
mise bootstrap status --missing
mise bootstrap packages status
mise bootstrap repos status
mise bootstrap dotfiles status
mise bootstrap dotfiles apply --dry-run
mise bootstrap dotfiles apply --dry-run --verbose
mise bootstrap mise-shell-activate status
mise bootstrap macos defaults status
mise bootstrap macos launchd-agents status
mise bootstrap linux systemd-units status
mise bootstrap user status
```

`mise bootstrap status --missing` 会通过一个命令检查整个声明式引导范围。更窄的 `mise bootstrap packages status --missing` 和 `mise bootstrap dotfiles status --missing` 命令在你只想检查某一部分而不安装任何东西时很有用。

## 放置位置说明

| 配置                             | 用途                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| `[bootstrap.packages]`             | 来自 apk、apt、dnf、pacman 或 brew 的操作系统包               |
| `[bootstrap.repos]`                | 在应用 dotfiles 之前克隆的 Git 仓库                            |
| `[dotfiles]`                       | 整文件 dotfiles 以及对现有文件的小型受管编辑                   |
| `[bootstrap.mise_shell_activate]`  | shell 启动文件中的 mise 激活片段                              |
| `[bootstrap.macos.*]`              | 面向 macOS 的精选偏好设置，如 Dock/Finder/键盘/触控板         |
| `[bootstrap.macos.defaults]`       | 通过 `defaults write` 写入的 macOS 用户偏好设置               |
| `[bootstrap.macos.launchd.agents]` | 使用 `launchctl` 写入并加载的 macOS 用户 LaunchAgents        |
| `[bootstrap.linux.systemd.units]`  | 使用 `systemctl --user` 管理的 Linux systemd 用户服务         |
| `[bootstrap.user]`                 | 当前用户设置，例如 `login_shell`                              |
| `[bootstrap.hooks]`                | 在命名的 bootstrap 阶段运行的命令                              |
| `[tools]`                          | 由 mise 管理的带版本开发工具                                   |
| `[tasks.bootstrap]`                | 工具安装后应运行的任何自定义内容                               |

当 mise 可以检查并收敛状态时，请使用声明式区块。对不适合这些区块的命令式设置，请使用
`[tasks.bootstrap]`，例如运行认证流程、初始化本地数据，或其他一次性的项目设置。

## 钩子

钩子仅在显式 `mise bootstrap` 调用期间运行。钩子可以指定为命令字符串、命令字符串数组，或带有 `run` 字段的表。它们使用与任务相同的默认内联 shell 设置，若失败则会停止 bootstrap，并且在 `mise bootstrap --dry-run` 时会打印命令而不是执行。钩子运行在当前进程环境中；当命令需要使用来自 `[tools]` 且位于 PATH 上的工具时，请在钩子中使用 `mise exec -- ...`，或者使用 `[tasks.bootstrap]`。

```toml
[bootstrap.hooks.pre-packages]
run = "softwareupdate --install-rosetta --agree-to-license"

[bootstrap.hooks.post-tools]
run = [
  "mise exec -- corepack enable",
  "mise exec -- rustup component add rustfmt clippy",
]

[bootstrap.hooks.final]
run = "gh auth status || gh auth login"
```

作为简写，也可以直接设置某个钩子阶段：

```toml
[bootstrap.hooks]
post-defaults = "killall Dock || true"
```

钩子会在全局到本地的配置层级之间合并，因此共享配置可以定义较通用的机器设置，而项目则可以添加自己的阶段命令。

## 常见工作流程

### 新机器

```sh
mise trust
mise bootstrap --yes
```

### 添加一个包

```sh
mise bootstrap packages use apk:zlib-dev apt:libssl-dev
```

这会写入 `[bootstrap.packages]` 并安装缺失的内容。

### 捕获已编辑的 dotfile

```sh
$EDITOR ~/.zshrc
mise dotfiles add ~/.zshrc
```

`mise dotfiles add` 会将活动文件存储到 `dotfiles.root` 下，并写入一个带有 `mode` 的显式 `[dotfiles]` 条目。

### 编辑受管理的 dotfile

```sh
mise dotfiles edit ~/.zshrc
mise dotfiles apply ~/.zshrc
```

对于通过符号链接的 dotfile，`edit` 会打开受管理的源文件，因此它可以配合默认的 `symlink` 模式使用。

## 高级：自管理配置

你可以将 dotfiles 仓库和 mise 全局配置作为 dotfiles 来管理：

```toml
[settings]
dotfiles.root = "~/.dotfiles"

[dotfiles]
"~/.dotfiles" = "~/src/dotfiles"
"~/.config/mise/config.toml" = "~/src/dotfiles/mise/config.toml"
```

在第一次应用之前，仓库/源必须已存在。对于首次运行期间所需的源，请使用真实的仓库路径；`~/.dotfiles` 在 mise 创建该符号链接之前并不存在。替换当前生效的全局配置会影响后续的 mise 调用，因此请谨慎使用此模式。
