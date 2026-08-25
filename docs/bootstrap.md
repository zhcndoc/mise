# 引导

`mise bootstrap` 可通过一条命令，根据当前配置设置机器：Linux
用户和组、操作系统软件包、特权文件和目录、系统服务、Linux 主机防火墙策略、Docker Compose
项目、Git 仓库、dotfile、mise shell
激活、macOS 默认设置、macOS LaunchAgents、Linux systemd 用户服务、
用户的登录 shell、工具，以及任何最终的项目专属任务。它可以使用声明的秘密输入，而无需将其值存储在 mise 配置中。你还可以添加在引导流程中指定时间点运行的钩子。

通过 [`mise bootstrap remote`](/bootstrap/remote.html)，可以将相同的配置应用于命名的清单主机或临时 SSH
目标。

对于在项目或工作站就绪之前所需、但不属于 `[tools]` 的内容，请使用 bootstrap：原生库、Homebrew
公式、dotfile 仓库、shell rc 文件、编辑器配置、macOS
偏好设置、用户服务，以及一次性机器设置。

## 组合配置根

`[bootstrap].config_roots` 会将独立配置根中的声明式资源组合到当前 bootstrap 操作中：

```toml
[bootstrap]
config_roots = ["bundles/*"]
```

条目相对于声明它的配置根，并且可以使用单层级的 `*`
glob。每个匹配的目录都会使用正常的活动配置环境加载。相对资源源和模板 `config_root` 值仍然相对于声明它们的配置。由选定根声明的变量可供该根的 dotfile 模板使用，但不会泄漏到同级根。

组合包括 `[dotfiles]`、`[bootstrap.files]`、
`[bootstrap.directories]`、`[bootstrap.services]` 和 `[bootstrap.compose]`。
等效声明会被去重。对于同一个 dotfile 目标、编辑项 `(path, id)`、托管文件、托管目录、服务或 Compose 项目，不同的声明会报错，并指出两个声明配置。独立根不会根据其在 `config_roots` 中的顺序获得优先级。
同一目标的 `symlink-each` 声明是例外：当叶路径互不相交时，其源目录树会组合；而重叠的叶路径或文件／目录冲突会同时报告两个声明配置。
目录 `copy` 和 `symlink-each` 的占用范围也会与嵌套的 dotfile 声明进行检查。互不相交的叶路径可以共享目录，但两个条目不能拥有同一个叶路径，也不能在另一个条目需要目录的位置放置文件。

其他配置（例如工具、任务、软件包、钩子和仓库）不会从这些根中收集。如果这些资源需要聚合行为，请使用现有的显式工作流。

## 执行方式

`mise bootstrap` 按以下顺序执行这些步骤：

在进行更改之前，mise 会解析文件阶段所需的
[`[bootstrap.secrets]`](/bootstrap/secrets.html)。此预检可防止因缺少输入而导致主机仅被部分配置。

1. `mise bootstrap accounts apply` 收敛
   [`[bootstrap.users]` 和 `[bootstrap.groups]`](/bootstrap/accounts.html)。
2. `mise bootstrap plugins apply` 安装
   [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html) 中声明的软件包管理器插件。
3. 内置管理器安装缺失的 [`[bootstrap.packages]`](/bootstrap/packages/)。
4. `mise bootstrap files apply` 收敛
   [`[bootstrap.files]` 和 `[bootstrap.directories]`](/bootstrap/files.html)。
5. `mise bootstrap services apply` 收敛
   [`[bootstrap.services]`](/bootstrap/services.html) 中已有的 systemd 系统单元。
6. `mise bootstrap firewall apply` 根据
   [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html) 收敛主机防火墙策略和规则。
7. `mise bootstrap compose apply` 收敛
   [`[bootstrap.compose]`](/bootstrap/compose.html) 项目。
8. `mise bootstrap repos apply` 克隆或更新
   [`[bootstrap.repos]`](/bootstrap/repos.html)。
9. `mise bootstrap dotfiles apply` 应用 [`[dotfiles]`](/dotfiles.html)。
10. `mise bootstrap mise-shell-activate apply` 根据
    [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html) 配置 shell 激活。
11. `mise bootstrap macos defaults apply` 写入
    [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html)。
12. `mise bootstrap macos launchd-agents apply` 写入并加载
    [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html)。
13. `mise bootstrap linux systemd-units apply` 通过写入单元文件、启用或禁用单元，
    并根据配置启动或停止单元，来收敛
    [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)。
14. `mise bootstrap user apply` 应用 [`[bootstrap.user]`](/bootstrap/user.html)。
15. `mise install` 安装缺失的 `[tools]`。
16. 软件包管理器插件会在其宿主工具可用后应用。
17. 如果存在名为 `bootstrap` 的任务，`mise run bootstrap` 会运行该任务。
18. 如果已配置，`[bootstrap.hooks.final]` 会在 bootstrap 任务之后运行。

使用 `mise bootstrap --skip <part>` 跳过特定部分。支持的部分包括
`accounts`、`plugins`、`packages`、`files`、`services`、`firewall`、`compose`、`repos`、`dotfiles`、`mise-shell-activate`、
`macos-defaults`、`macos-launchd-agents`、`linux-systemd-units`、`user`、`tools`、
`task` 和 `final-hook`。较短的旧名称 `shell`、`defaults`、`launchd`
和 `systemd` 仍作为别名接受。该标志可以重复使用或用逗号分隔，例如 `mise bootstrap --skip tools,task`。

使用 `mise bootstrap --only <part>` 仅运行特定部分。它支持
相同的部分名称，并且可以重复使用或用逗号分隔，例如
`mise bootstrap --only dotfiles,tools`。`--only` 和 `--skip` 互斥。

使用 `mise bootstrap --update` 在安装软件包前刷新系统软件包管理器元数据
（apk：`--update-cache`，apt：`apt-get update`）。

钩子阶段也可以在内置步骤之前和之后运行：
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

[bootstrap.secrets]
service_token = "EXAMPLE_SERVICE_TOKEN"

[bootstrap.groups.example]
system = true

[bootstrap.users.example]
system = true
group = "example"
home = "/var/lib/example"
create_home = true

[bootstrap.directories."/opt/example"]
owner = "root"
group = "root"
mode = "0755"

[bootstrap.files."/etc/example.conf"]
content = 'token={{ secret(name="service_token") }}'
template = true
owner = "root"
group = "root"
mode = "0644"
notify = ["example"]

[bootstrap.services.example]
state = "running"
enabled = true
on_change = "reload_or_restart"

[bootstrap.linux.firewall]
backend = "auto"
state = "enabled"
default_incoming = "deny"
default_outgoing = "allow"

[[bootstrap.linux.firewall.rules]]
name = "https"
port = 443
protocol = "tcp"
action = "allow"

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

然后收敛整台机器（`--yes` 会跳过确认提示）：

```sh
mise bootstrap --yes
```

若要在不进行任何修改的情况下预览将发生的变化：

```sh
mise bootstrap --dry-run
```

如需结构化的资源计划，请使用 `mise bootstrap plan`。配置过程规划器会按依赖顺序报告账户、系统软件包、特权文件和目录、系统服务、防火墙策略和规则，以及 Compose 项目。其他声明式 bootstrap 部分在采用资源模型后，也会加入同一张图。

```sh
mise bootstrap plan
mise bootstrap plan --json
mise bootstrap plan --detailed-exitcode
```

使用 `--detailed-exitcode` 时，如果没有任何需要变更的内容，命令退出码为 0；如果计划包含变更，退出码为 2；如果规划失败或任何资源处于 `unknown` 状态，退出码为 1。未知资源不计为变更，但会阻止成功的收敛结果。当当前平台上的软件包管理器不可用，或无法安装所请求的版本时，该软件包会处于未知状态。这与应用行为一致：不受支持的版本固定会继续显示，以便手动解决，而不会被报告为 mise 将跳过的变更。

当 `mise bootstrap` 应用或将要应用某些需要用户后续操作的内容时，它会在成功运行后打印最后的 `bootstrap: follow-up` 部分。试运行会使用 `bootstrap: follow-up if applied`。如果后续 bootstrap 阶段失败，而较早阶段已经产生了后续操作项，mise 会在返回错误前打印这些项目。当没有任何可执行的后续操作需要报告时，将省略该部分。

默认情况下，bootstrap 会拒绝 dotfile 冲突，而不是替换本地文件。
当你明确希望 dotfiles 阶段替换冲突的整文件 dotfile 目标时，请使用
`mise bootstrap --force-dotfiles`。

## 检查状态

使用 `mise bootstrap status` 在一处检查声明式引导状态。它会报告每个声明式部分——软件包、仓库、点文件、Shell 激活、macOS 默认设置、LaunchAgents、systemd 单元和登录 Shell——以及 `[tools]` 和已安装工具所需的任何系统依赖项：

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
mise bootstrap firewall status
mise bootstrap user status
```

`mise bootstrap status --missing` 会通过一个命令检查整个声明式引导范围。更窄的 `mise bootstrap packages status --missing` 和 `mise bootstrap dotfiles status --missing` 命令在你只想检查某一部分而不安装任何东西时很有用。

## 各项配置的用途

| 配置                                                         | 用途                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`[bootstrap.packages]`](/bootstrap/packages/)                 | 来自 apk、apt、dnf、pacman、brew、flatpak 或 mas 的操作系统软件包 |
| [`[bootstrap.repos]`](/bootstrap/repos.html)                   | 在应用 dotfiles 之前克隆的 Git 仓库                         |
| [`[dotfiles]`](/dotfiles.html)                                 | 整个文件形式的 dotfiles，以及对现有文件进行的小型托管修改    |
| [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)     | shell 启动文件中的 mise 激活片段                            |
| [`[bootstrap.macos.*]`](/bootstrap/macos-defaults.html)        | 针对 Dock/Finder/键盘/触控板整理的 macOS 偏好设置             |
| [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html) | 通过 `defaults write` 写入的 macOS 用户偏好设置              |
| [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html)  | 使用 `launchctl` 写入并加载的 macOS 用户 LaunchAgents         |
| [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)   | 使用 `systemctl --user` 管理的 Linux systemd 用户服务        |
| [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html)       | Linux 主机防火墙策略和托管规则                               |
| [`[bootstrap.user]`](/bootstrap/user.html)                     | 当前用户设置，例如 `login_shell`                             |
| `[bootstrap.hooks]`                                            | 在指定引导阶段运行的命令                                     |
| `[tools]`                                                      | 由 mise 管理的版本化开发工具                                 |
| `[tasks.bootstrap]`                                            | 工具安装完成后应运行的任何自定义内容                         |

当 mise 可以检查并收敛状态时，请使用声明式区块。对于不适合这些区块的命令式设置，请使用
`[tasks.bootstrap]`，例如运行认证流程、初始化本地数据，或执行其他一次性的项目设置。

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

钩子会从全局配置到本地配置，跨配置层级进行合并，因此共享配置可以定义广泛的机器设置，而项目则可以添加自己的阶段命令。  
`pre-dotfiles` 和 `post-dotfiles` 阶段也会包裹  
`mise bootstrap dotfiles apply`。

## 常见工作流

### 新机器

```sh
mise trust
mise bootstrap --yes
```

### 添加软件包

```sh
mise bootstrap packages use apk:zlib-dev apt:libssl-dev
```

这会写入 `[bootstrap.packages]` 并安装缺失的内容。

### 保存已编辑的点文件

```sh
$EDITOR ~/.zshrc
mise bootstrap dotfiles add ~/.zshrc
```

`mise bootstrap dotfiles add` 会将当前文件存储在 `dotfiles.root` 下，并写入一个包含
`mode` 的显式 `[dotfiles]` 条目。

### 编辑受管理的点文件

```sh
mise bootstrap dotfiles edit ~/.zshrc
mise bootstrap dotfiles apply ~/.zshrc
```

对于通过符号链接的点文件，`edit` 会打开受管理的源文件，因此它可以配合默认的 `symlink` 模式使用。

## 高级：自管理配置

你可以将 dotfiles 仓库和 mise 全局配置作为 dotfiles 来管理：

```toml
[settings]
dotfiles.root = "~/.dotfiles"

[dotfiles]
"~/.dotfiles" = "~/src/dotfiles"
"~/.config/mise/config.toml" = "~/src/dotfiles/mise/config.toml"
```

在第一次应用之前，仓库／源必须已存在。对于首次运行期间所需的源，请使用真实的仓库路径；`~/.dotfiles` 在 mise 创建该符号链接之前并不存在。替换当前生效的全局配置会影响后续的 mise 调用，因此请谨慎使用此模式。
