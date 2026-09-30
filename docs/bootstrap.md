---
description: "声明并应用机器设置：软件包、点文件、仓库和服务。"
---

# Bootstrap

`mise bootstrap` 应用 mise 配置中声明的机器设置：
软件包、文件、服务、仓库、shell 设置、工具以及最终任务。
当工作站或服务器的设置需求超出安装
`[tools]` 时使用它。想要应用该配置时，请显式运行此命令。

从机器所需的部分开始，预览它们，并随着配置增长添加更多资源。
每个部分都有自己的状态和应用命令。
对于 SSH 目标，请参阅[远程 bootstrap](/bootstrap/remote.html)。

## 示例

这个小型 `mise.toml` 配置 zsh 激活，安装 Node.js，并在最终任务中验证
它。请根据实际使用的 shell 选择[shell 条目](/bootstrap/shell.html)：

```toml
[bootstrap.mise_shell_activate]
zprofile = "shims"
zshrc = "activate"

[tools]
node = "24"

[tasks.bootstrap]
run = "node --version"
```

在信任配置之前先检查它，然后预览并应用：

```sh
mise trust
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
```

`--yes` 会跳过确认提示，以便无人值守地应用配置。试运行会检查
状态并打印建议的操作；钩子和最终任务不会执行。
激活文件发生变化后，请打开新的 shell。

## 从仓库开始

根据仓库包含的内容选择匹配的命令：

| 仓库内容                                                               | 命令                           | 文件存放位置                                          |
| ---------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| 包含 `mise.toml` 和源文件的 bootstrap 项目                            | `mise bootstrap --from <url>`  | 单独的检出目录，然后使用项目定义的目标                |
| 全局 mise 配置，例如 `config.toml`、`conf.d/` 和 `tasks/`              | `mise bootstrap --adopt <url>` | 你的全局 mise 配置目录                                |
| 通过 `mise dot origin set` 共享的受跟踪点文件                         | `mise bootstrap --adopt <url>` | 此机器上每个受跟踪文件的路径                          |

有关共享受跟踪点文件的操作指南，请参阅
[设置机器](/bootstrap/setup.html)。

### Bootstrap 项目

使用 `--from` 克隆项目并应用其中的 `mise.toml`：

```sh
mise bootstrap --from git@github.com:example/dotfiles.git
```

要检出分支、标签或提交而不是默认分支，请像任务包含和插件源一样在 URL 后附加 `?ref=`。`git::` 前缀是可选的：

```sh
mise bootstrap --from 'git::https://github.com/example/dotfiles.git?ref=v1'
```

检出目录默认为 `$MISE_DATA_DIR/bootstrap-repo`。使用 `--from-dir` 选择其他位置。mise 会信任你为本次调用提供的仓库，因此请在运行命令之前检查它。

要选择 mise 环境，请传入 `-E`，例如
`mise -E work bootstrap --from <url>`。然后，克隆的项目会加载匹配的
配置，例如 `mise.work.toml`。

现有检出目录的 `origin` 必须是请求的 URL。除非传入 `--update` 以先拉取更新的提交，否则 mise 会使用当前检出；该拉取只接受快进更新。使用 `?ref=` 时，`--update` 会再次从远程查找 ref：分支（同名时优先于标签）会被切换并快进，标签会检出到其当前提交；远程上不存在的分支或标签会报错。使用 `--dry-run` 时，mise 会报告缺少检出目录，但不会克隆它。

### 全局 mise 配置

当仓库包含你的全局 mise 配置时，使用 `--adopt`：

```sh
mise bootstrap --adopt example/mise-config
```

mise 会将其克隆到 `$MISE_CONFIG_DIR`，通常是 `~/.config/mise`，并使用
该配置运行 bootstrap。`config.toml`、`config.work.toml`、`conf.d/` 和
`tasks/` 等文件会继续供后续 mise 命令使用。传入 `-E work` 以选择
`config.work.toml`。

如果设置了 `$MISE_GLOBAL_CONFIG_FILE`，mise 会将仓库克隆到该文件的父
目录，并加载所选文件。现有的非空目标必须是 Git 检出目录，且其 `origin`
必须是请求的 URL。传入 `--update` 可在 bootstrap 前将其快进更新。

### 共享点文件历史

**设置仓库**保存你通过 `mise dot origin set` 共享的点文件历史。
在另一台机器上运行：

```sh
mise bootstrap --adopt you/setup
```

mise 会识别仓库中的 `.mise-history/format.toml` 标记，并：

1. 将最新分支获取到其历史存储中
2. 将受跟踪文件恢复到此机器上的对应路径
3. 记住 origin，以便将来同步
4. 使用恢复的 mise 配置运行 bootstrap

在第一台机器上共享之前，请跟踪 mise 配置和所有模板源。
它们可以让 bootstrap 在下一台机器上重新创建工具和服务，并渲染模板。
即使仓库不包含全局 mise 配置，也仍然可以恢复受跟踪的文件。

将安装 shell 插件或修复权限等无法仅靠文件完成的机器设置，放在共享配置的 [`[tasks.bootstrap]`](#what-goes-where) 中。采用配置时会从恢复后的配置运行它。之后，`mise dot pull` 和 watcher 会恢复共享更改但不运行设置；请运行 `mise bootstrap` 应用这些更改，此时任务会再次运行。`[history.reload]` 命令会响应恢复的文件，但 mise 在恢复前读取这些命令，因此同一次更新（包括首次采用）带来的 reload 表不会触发。

如果现有文件不同，mise 会要求你先解决冲突，然后才会恢复文件或运行剩余的 bootstrap 步骤。使用 `--dry-run` 预览计划。有关同步和恢复的详细信息，请参阅[历史](/history.html#sharing-across-machines)。

此工作流会将 Git 历史存储在 `$MISE_CONFIG_DIR` 之外；
如果那里已有检出目录，则会保留该检出目录。如果该目录是 Git 检出目录，
其 origin 必须与请求的仓库匹配。

设置仓库始终会获取其最新分支。`--update` 控制后续 bootstrap 中的软件包
元数据和声明的仓库更新。

## 执行方式

`mise bootstrap` 按以下顺序运行这些步骤。

在进行更改之前，mise 会解析文件阶段所需的
[`[bootstrap.secrets]`](/bootstrap/secrets.html)。此预检可防止因缺少输入而导致主机仅被部分配置。

1. `mise bootstrap accounts apply` converges
   [`[bootstrap.users]` and `[bootstrap.groups]`](/bootstrap/accounts.html).
2. `mise bootstrap plugins apply` installs package manager plugins declared in
   [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html).
   Files and directories with [`phase = "pre-packages"`](/bootstrap/files.html#files-before-packages)
   are then applied, before the `pre-packages` hook.
3. Built-in managers install missing [`[bootstrap.packages]`](/bootstrap/packages/).
4. `mise bootstrap files apply` converges
   the remaining [`[bootstrap.files]` and `[bootstrap.directories]`](/bootstrap/files.html)
   (the default `"post-packages"` phase).
5. [`[bootstrap.services]`](/bootstrap/services.html) converges existing Linux
   systemd system units and user services on Linux, macOS, and Windows.
   User services with `requires_tools = true` wait until after tool installation.
6. `mise bootstrap firewall apply` converges host firewall policy and rules from
   [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html).
7. `mise bootstrap compose apply` converges
   [`[bootstrap.compose]`](/bootstrap/compose.html) projects.
8. `mise bootstrap repos apply` clones or updates
   [`[bootstrap.repos]`](/bootstrap/repos.html).
9. `mise dot apply` applies [`[dotfiles]`](/dotfiles.html).
10. `mise bootstrap mise-shell-activate apply` configures shell activation from
    [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html).
11. `mise bootstrap macos defaults apply` writes
    [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html).
12. `mise bootstrap macos launchd-agents apply` writes and loads
    [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html).
13. `mise bootstrap linux systemd-units apply` converges
    [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)
    by writing unit files, enabling/disabling them, and starting/stopping them
    as configured.
14. `mise bootstrap user apply` applies [`[bootstrap.user]`](/bootstrap/user.html).
15. `mise install` installs missing `[tools]`.
16. Plugin package managers apply after their host tools are available, followed
    by user services with `requires_tools = true`.
17. `mise run bootstrap` runs a task named `bootstrap`, if one exists.
18. `[bootstrap.hooks.final]` runs after the bootstrap task, if configured.

Every mutating run — the full `mise bootstrap`, each `mise bootstrap <part>
apply`, and the commands that change dotfiles or bootstrap config in place
(`dotfiles add`, `unapply`, `edit`, `packages use`, `import`, brew `tap`) —
records a pair of [history checkpoints](/history.html): the tracked files
before and after the run, plus a journal of what the run changed. Dry runs
record nothing.

Use `mise bootstrap --skip <part>` to skip specific parts. Supported parts are
`accounts`, `plugins`, `packages`, `files`, `services`, `firewall`, `compose`, `repos`, `dotfiles`, `mise-shell-activate`,
`macos-defaults`, `macos-launchd-agents`, `linux-systemd-units`, `user`, `tools`,
`task`, and `final-hook`. The old shorter names `shell`, `defaults`, `launchd`,
and `systemd` are still accepted as aliases. The flag can be repeated or
comma-separated, for example `mise bootstrap --skip tools,task`.

使用 `mise bootstrap --only <part>` 仅运行特定部分。它支持
相同的部分名称，并且可以重复使用或用逗号分隔，例如
`mise bootstrap --only dotfiles,tools`。`--only` 和 `--skip` 互斥。

Use `mise bootstrap --update` to refresh system package manager metadata
before installing packages (apk: `--update-cache`, apt: `apt-get update`,
scoop: `scoop update`, winget: `winget source update`) and
update declared repositories. Check the [repo update rules](/bootstrap/repos.html)
for clean-worktree and fast-forward requirements.

Hook phases can also run before and after the built-in steps:
`pre-packages`, `post-packages`, `pre-repos`, `post-repos`, `pre-dotfiles`,
`post-dotfiles`, `pre-defaults`, `post-defaults`, `pre-user`, `post-user`,
`pre-tools`, and `post-tools`. Hook commands support [Tera templates](/templates.html)
using the declaring config's context, including values such as
<code v-pre>{{ config_root }}</code>, <code v-pre>{{ xdg_config_home }}</code>,
and <code v-pre>{{ vars.name }}</code>.

The declarative steps compare the requested state with the host and apply
needed changes. Hooks and the `bootstrap` task run on every selected apply, so
make them safe to repeat. Bootstrap is a sequence, not a transaction: if a later
phase fails, earlier successful changes remain. Fix the reported failure and
run bootstrap again.

## 预览更改

使用 `mise bootstrap --dry-run` 预览所选阶段。在开发配置时，可以通过以下方式缩小
应用范围：

```sh
mise bootstrap --only dotfiles,tools --dry-run
mise bootstrap --only dotfiles,tools
```

选择更改所需的所有前置条件。`--only services` 不会安装为这些服务提供支持的
软件包或单元文件。

如需结构化的资源计划，请使用 `mise bootstrap plan`。配置计划器会按依赖顺序报告
账户、系统软件包、特权文件和目录、系统服务、防火墙策略和规则，以及 Compose 项目。
随着其他声明式 bootstrap 部分采用资源模型，它们也会加入同一张图。

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

使用 `mise bootstrap status` 在一个位置检查声明式 bootstrap 状态。它会报告每个声明式部分——机密、账户、文件和目录、服务、防火墙、Compose 项目、软件包、仓库、点文件、shell 激活、macOS 默认设置、LaunchAgents、systemd 单元和登录 shell——以及 `[tools]` 和已安装工具所需的任何系统依赖：

```sh
mise bootstrap status
mise bootstrap status --json
mise bootstrap status --missing
mise bootstrap packages status
mise bootstrap repos status
mise dot status
mise dot apply --dry-run
mise dot apply --dry-run --verbose
mise bootstrap mise-shell-activate status
mise bootstrap macos defaults status
mise bootstrap macos launchd-agents status
mise bootstrap linux systemd-units status
mise bootstrap firewall status
mise bootstrap user status
```

使用 `mise dot history` 查看 bootstrap 记录的检查点——每次变更运行对应一对检查点，
分别记录运行前后的受跟踪文件。参阅[历史](/history.html)。

```sh
mise dot history
mise dot history show latest
mise dot history diff 11 12
```

`mise bootstrap status --missing` 会在一个命令中检查整个声明式 bootstrap
范围。范围更窄的 `mise bootstrap packages status --missing`
和 `mise dot status --missing` 命令适用于只想检查某个部分且不安装任何内容的情况。

## 各项配置的用途

| Config                                                                  | Use for                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`[bootstrap.secrets]`](/bootstrap/secrets.html)                        | Names of secret inputs consumed by managed file templates                   |
| [`[bootstrap.users]`, `[bootstrap.groups]`](/bootstrap/accounts.html)   | Linux service accounts and groups                                           |
| [`[bootstrap.files]`, `[bootstrap.directories]`](/bootstrap/files.html) | Managed system paths, content, ownership, and permissions                   |
| [`[bootstrap.services]`](/bootstrap/services.html)                      | User services on Linux, macOS, and Windows; existing Linux system services  |
| [`[bootstrap.compose]`](/bootstrap/compose.html)                        | Docker Compose project lifecycle                                            |
| [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html)               | Package manager plugins                                                     |
| [`[bootstrap.packages]`](/bootstrap/packages/)                          | OS packages from apk, apt, dnf, pacman, brew, flatpak, mas, scoop, winget   |
| [`[bootstrap.repos]`](/bootstrap/repos.html)                            | Git repos cloned before dotfiles are applied                                |
| [`[dotfiles]`](/dotfiles.html)                                          | Tracking dotfiles, creating files from sources, and editing blocks or lines |
| [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)              | mise activation snippets in shell startup files                             |
| [`[bootstrap.macos.*]`](/bootstrap/macos-defaults.html)                 | Curated macOS preferences for Dock/Finder/keyboard/trackpad                 |
| [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html)          | macOS user preferences written through `defaults write`                     |
| [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html)           | macOS user LaunchAgents written and loaded with `launchctl`                 |
| [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)            | Linux systemd user services managed with `systemctl --user`                 |
| [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html)                | Linux host firewall policy and managed rules                                |
| [`[bootstrap.user]`](/bootstrap/user.html)                              | Current-user settings such as `login_shell`                                 |
| `[bootstrap.hooks]`                                                     | Commands that run at named bootstrap phases                                 |
| `[tools]`                                                               | Versioned dev tools managed by mise                                         |
| `[tasks.bootstrap]`                                                     | Anything custom that should run after tools are installed                   |

当 mise 可以检查并收敛状态时，请使用声明式部分。对于不适合这些部分的命令式设置，例如检查身份验证或填充本地数据，请使用 [tasks.bootstrap]。该任务会在每次 bootstrap 时再次运行，因此请保护只应执行一次的操作。在共享设置仓库的机器上，采用仓库时以及共享更新后的每次 mise bootstrap 都会运行该任务。

## 模块

使用配置环境按应用或角色组织可选的机器设置。每个环境文件可以一起声明软件包、点文件和服务。这些文件使用 mise 现有的配置系统作为模块。

### 定义模块

将共享设置放在 `~/.config/mise/config.toml` 中，并将可选设置放在旁边的 `config.<name>.toml` 中。例如，下面的 SSH 模块面向使用 apt 和 systemd 用户会话的 Linux 机器。它会安装客户端，从点文件检出目录链接已有的 SSH 配置，并运行 agent：

~~~toml [~/.config/mise/config.ssh.toml]
[bootstrap.packages]
"apt:openssh-client" = "latest"

[dotfiles]
"~/.ssh/config" = "~/src/dotfiles/ssh/config"

[bootstrap.services.ssh-agent]
scope = "user"
command = "ssh-agent -D -a %t/ssh-agent.socket"
~~~

应用此模块前，请在 ~/src/dotfiles/ssh/config 创建源文件。要在 shell 中使用该 agent，请将 SSH_AUTH_SOCK 设置为 $XDG_RUNTIME_DIR/ssh-agent.socket。

对于 bootstrap 项目，请改为在项目目录中使用 mise.toml 和 mise.ssh.toml。

### 选择和预览模块

在 miserc.toml 中选择机器的默认模块。例如，定义 config.ssh.toml 和 config.gpg.toml 后：

~~~toml [~/.config/mise/miserc.toml]
env = ["ssh", "gpg"]
~~~

基础 config.toml 仍会加载。先预览合并后的设置，再应用它：

~~~sh
mise bootstrap --dry-run
mise bootstrap
~~~

要为单次调用选择模块，请使用 mise -E ssh,gpg bootstrap。对于远程 bootstrap，请在清单中设置每个主机的 mise_env 列表。这样，一个仓库就能描述具有不同模块组合的机器。

### 模块如何组合

不同键的声明会加入同一次运行。在同一目录中，如果多个环境声明了同一键，后列出的环境优先。例如，当 env = ["ssh", "gpg"] 时，两个文件都声明的服务会使用 config.gpg.toml 中的定义。

使用 mise config 检查已加载的文件。对于每个受管理的文件和服务，mise bootstrap plan --json 都包含 origin.config 和 origin.environment，因此可以追溯资源的声明来源。

如果设置应始终加载，请使用基础配置，或使用没有环境后缀的 conf.d 片段，例如 conf.d/ssh.toml。

要将一组设置与其源文件放在一起，请使用 `conf.d` 文件夹。相对点文件源会在该文件夹内解析，其中的 `mise.<env>.toml` 文件只在对应环境激活时加载：

~~~text
~/.config/mise/conf.d/ssh/
├── mise.toml          # 始终加载；"~/.ssh/config" = "ssh_config"
├── mise.linux.toml    # linux 环境激活时加载
└── ssh_config
~~~

### 移除模块资源

从 env 移除模块会停止加载其声明，但会将资源留在机器上。使用 mise bootstrap unapply 移除其管理的文件、目录、用户服务、点文件条目和编辑。

首先从 miserc.toml 的 env 中移除模块，这样下一次 bootstrap 就不会再次应用它。保留模块配置文件在磁盘上，然后预览并确认移除：

~~~sh
mise bootstrap unapply ssh --dry-run
mise bootstrap unapply ssh
~~~

该命令会临时在剩余环境旁选择 ssh 来读取其声明。也可以一次移除多个模块：

~~~sh
mise bootstrap unapply ssh gpg --dry-run
mise bootstrap unapply ssh gpg
~~~

Unapply 会在移除资源前请求确认。使用 --yes 可以跳过提示并批准移除；全局 --yes、MISE_YES 和 mise 的 yes 设置也适用，mise 会在 CI 中启用该设置。

#### 移除计划

Mise 会比较包含和不包含指定环境时的当前配置。它使用磁盘上仍然存在的声明，而不是过去 bootstrap 运行的记录。清理完成前请保留这些声明：如果先删除模块文件，mise 就没有移除其资源所需的信息。

- 基础配置或其他选定模块仍声明为 present 的资源会被保留。声明 state = "absent" 不会保护资源。
- 不再符合声明的目标会带有原因并被跳过。使用 --force 移除已更改目标前，请检查输出。
- 目录只有在计划移除后为空时才会删除。即使使用 --force，无法读取的目录和类型异常的受管理路径也会保留。

源文件和配置条目会被保留。Unapply 不会恢复先前因 state = "absent" 声明而移除的资源。

#### 需要单独清理的资源

Unapply 会报告软件包、仓库和 Compose 声明，并给出单独移除的建议：

- **软件包：** 遵循管理器专用的清理指南。请先预览计划；清理不限于某一个模块的软件包。
- **Compose 项目：** 设置 state = "absent"，并在选中模块时应用更改，例如使用 mise -E ssh bootstrap --only compose。
- **仓库：** 不再需要时，移除 bootstrap.repos 中声明的检出目录。

其他 bootstrap 部分（包括系统服务）不属于 unapply 的范围，请使用其资源专用的移除流程。

## 模板

mise.toml 的每个部分都不是 Tera 模板。在 bootstrap 中，下列内容会被渲染：

| 位置                                                         | 渲染内容                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| bootstrap.linux.systemd.units                                  | 单元中的每个字符串值                                           |
| bootstrap.macos.launchd.agents                                 | agent 中的每个字符串值                                         |
| bootstrap.hooks                                                  | 钩子命令                                                       |
| bootstrap.files                                                   | 仅当 template = true 时渲染文件内容                             |
| dotfiles                                                         | 仅当 mode = "template" 或 template = "tera" 时渲染文件内容       |

其他所有内容，包括部分键、软件包规格、仓库路径、macOS 默认设置和其余 bootstrap 值，都会按原样使用。

渲染使用声明该条目的配置文件上下文，因此 <code v-pre>{{ config_root }}</code> 是该配置的目录，而不是运行 mise bootstrap 的目录。受管理文件的内容模板还会获得 <code v-pre>{{ target }}</code> 和 <code v-pre>{{ secret(name="...") }}</code>。

不含模板语法的值会完全跳过渲染，因此单元或 agent 中字面形式的 %h、%i 或 $HOME 会原样进入生成文件。章节所述的任何 ~ 展开仍会在之后进行。

<code v-pre>{{ exec(...) }}</code> 可用于 bootstrap.hooks 和文件内容模板，但不能用于单元或 agent 值：这些值在 status、plan、--dry-run 和 apply 中以相同方式渲染，因此只读命令绝不能启动 shell。

## 钩子

钩子仅在显式 `mise bootstrap` 调用期间运行。钩子可以指定为命令字符串、命令字符串数组，或带有 `run` 字段的表。它们使用与任务相同的默认内联 shell 设置，若失败则会停止 bootstrap，并且在 `mise bootstrap --dry-run` 时会打印命令而不是执行。钩子运行在当前进程环境中；当命令需要使用来自 `[tools]` 且位于 PATH 上的工具时，请在钩子中使用 `mise exec -- ...`，或者使用 `[tasks.bootstrap]`。

以下钩子假设 `node`、`python` 和 `gh` 已在 `[tools]` 中声明。

```toml
[bootstrap.hooks.post-tools]
run = [
  "mise exec -- node --version",
  "mise exec -- python --version",
]

[bootstrap.hooks.final]
run = "mise exec -- gh auth status"
```

作为简写，也可以直接设置某个钩子阶段：

```toml
[bootstrap.hooks]
post-defaults = "killall Dock || true"
```

钩子会按照从全局到本地的顺序在配置层级之间合并，因此共享配置可以定义广泛的机器设置，而项目可以添加自己的阶段命令。
`pre-dotfiles` 和 `post-dotfiles` 阶段也会包围
`mise dot apply`。

## 常见工作流

有关从第一个受跟踪文件开始，到让第二台机器共享其更改的操作指南，请参阅[设置机器](/bootstrap/setup.html)。

### 新机器

```sh
mise trust
mise bootstrap --yes
```

### 添加软件包

```sh
mise bootstrap packages use apk:zlib-dev apt:libssl-dev winget:BurntSushi.ripgrep.MSVC
```

这会写入 `[bootstrap.packages]` 并安装缺失的内容。

### 保存已编辑的点文件

对于已经以 `copy` 模式管理的文件，请将编辑内容保存回其源文件：

```sh
$EDITOR ~/.zshrc
mise dot add ~/.zshrc
```

`add` 会更新受管理的源文件。对于 mise 尚未管理的文件，它会在
`dotfiles.root` 下创建源文件，写入配置条目，并应用该文件。
参阅[捕获更改](/dotfiles.html#capturing-changes)。

对于直接编辑文件且希望将其保存到历史中的情况，请使用
`mise dot track ~/.zshrc`，然后设置[自动保存](/history.html#automatic-saves)。

### 编辑受管理的点文件

```sh
mise dot edit ~/.zshrc
mise dot apply ~/.zshrc
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
