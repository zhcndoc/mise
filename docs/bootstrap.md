---
description: "在 mise 配置中声明并应用整机设置：软件包、文件、服务、代码仓库、dotfiles 和工具。"
socialDescription: "用 mise 配置声明整机设置，并通过一条命令应用。"
---

# 机器初始化

`mise bootstrap` 会根据 mise 配置初始化机器，包括主机软件包、系统文件、服务、Git 仓库、dotfiles、shell 激活、工具以及 `bootstrap` 任务。当机器需要配置 `[tools]` 以外的内容时，请使用此命令。

mise 不会自动应用 `[bootstrap]`。只有运行 `mise bootstrap` 或某一部分的 `apply` 子命令（例如 `mise bootstrap packages apply`）时才会执行。声明状态的部分会跳过已经符合配置的项目，因此每次更改配置后都可以再次运行。

## 快速开始

将以下内容写入全局配置 `~/.config/mise/config.toml`，即可将其作为当前机器的设置：

```toml
[bootstrap.mise_shell_activate]
zsh = true

[tools]
node = "24"

[tasks.bootstrap]
run = "node --version"
```

对于 Bash，请改用 `bash = true`。对于 fish，请设置 `fish = "auto"`，这样会在提示符出现时激活 mise，并在脚本中使用 shims；参见 [shell 激活](/bootstrap/shell.html)。先预览运行内容，再应用设置并检查结果：

```sh
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
```

试运行会列出每一部分将要更改的内容，并打印 `bootstrap` 任务而不是实际运行：

```text
mise bootstrap: shell activation
edit ~/.zprofile (block:activate)
edit ~/.zshrc (block:activate)
mise bootstrap: tools
mise node@24.x.x  ⇢ would install
mise bootstrap: running `bootstrap` task
[bootstrap] $ node --version
```

实际运行会写入激活配置块、安装 Node.js 并执行任务。添加 `--yes` 可跳过确认提示并直接应用；mise 修改 shell 启动文件后，请重新打开 shell。

同样的配置也可以放在项目的 `mise.toml` 中，但 mise 读取项目配置前需要先运行 [`mise trust`](/cli/trust.html)；全局配置无需信任。

## 可声明的内容 {#what-goes-where}

每个配置部分都有单独的说明页面，大多数部分也有自己的 `status` 和 `apply` 子命令。

| 配置                                                                      | 用途                                                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`[bootstrap.packages]`](/bootstrap/packages/)                            | 通过 apt、dnf、pacman、Homebrew、WinGet 等包管理器安装主机软件包                             |
| [`[bootstrap.apt.sources]`](/bootstrap/packages/apt.html#sources)         | `apt:` 软件包使用的 apt 软件源和 PPA                                                       |
| [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html)                 | 用于添加更多软件源的包管理器插件                                                            |
| [`[bootstrap.users]`, `[bootstrap.groups]`](/bootstrap/accounts.html)     | Linux 用户和组                                                                              |
| [`[bootstrap.files]`, `[bootstrap.directories]`](/bootstrap/files.html)   | 系统文件和目录，以及其内容、所有者和权限                                                    |
| [`[bootstrap.secrets]`](/bootstrap/secrets.html)                          | `[bootstrap.files]` 和 `[dotfiles]` 模板从环境中读取的密钥值                                |
| [`[bootstrap.services]`](/bootstrap/services.html)                        | Linux、macOS 和 Windows 上的用户服务，以及已有的 Linux 系统服务                             |
| [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html)                  | Linux 主机防火墙策略和规则                                                                  |
| [`[bootstrap.compose]`](/bootstrap/compose.html)                          | Docker Compose 项目                                                                        |
| [`[bootstrap.repos]`](/bootstrap/repos.html)                              | 在应用 dotfiles 前克隆的 Git 仓库                                                          |
| [`[dotfiles]`](/dotfiles.html)                                            | dotfiles：跟踪原位文件、从源文件创建文件，以及编辑代码块或行                                 |
| [`[dotfile_groups]`, `[bootstrap] dotfile_groups`](/dotfiles/groups.html) | dotfiles 目录树，以及机器要应用的目录树                                                     |
| [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)                | 在 shell 启动文件中激活 mise                                                               |
| [`[bootstrap.user]`](/bootstrap/shell.html#set-your-login-shell)          | 登录 shell                                                                                 |
| [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html)            | 使用 `defaults write` 写入 macOS 用户偏好设置                                               |
| [`[bootstrap.macos.*]`](/bootstrap/macos-defaults.html)                   | Dock、Finder、键盘和触控板等常见 macOS 偏好设置                                             |
| [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html)             | 使用 `launchctl` 写入并加载 macOS LaunchAgents                                              |
| [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)              | 使用 `systemctl --user` 管理 systemd 用户单元                                               |
| [`[tools]`](/dev-tools/)                                                  | 由 mise 安装和管理的工具                                                                   |
| [`[bootstrap.hooks]`](#hooks)                                             | 在运行流程中指定时点执行的命令                                                              |
| [`[tasks.bootstrap]`](#the-bootstrap-task)                                | 上述配置部分未涵盖的设置                                                                    |
| [`[bootstrap.remote]`](/bootstrap/remote.html)                            | 供 `mise bootstrap remote` 使用的 SSH 主机                                                  |

## 从仓库开始 {#starting-from-a-repository}

如果要根据 Git 中保存的配置设置机器，请将仓库传给 `mise bootstrap`。对于与自身配置分离的设置项目（例如团队的工作站仓库），请使用 `--from`；对于要成为当前机器自身配置的仓库，请使用 `--adopt`：

```sh
# bootstrap 项目：mise.toml 及其使用的文件
mise bootstrap --from https://github.com/you/workstation.git
# 全局 mise 配置：以 Git 仓库形式克隆到 ~/.config/mise
mise bootstrap --adopt you/mise-config
# 来自 `mise dot origin set` 的 setup 仓库：受跟踪文件会还原到各自路径
mise bootstrap --adopt you/setup
```

[从仓库进行 Bootstrap](/bootstrap/from-repository.html) 介绍不同类型仓库的用途、`--adopt` 如何区分它们、引用和 `--update`。 [设置机器](/bootstrap/setup.html) 提供接管 setup 仓库的操作步骤。

## 执行顺序 {#how-it-runs}

在更改任何内容之前，mise 会解析 `[bootstrap.files]` 模板和 `mode = "template"` 的 `[dotfiles]` 条目所使用的 [`[bootstrap.secrets]`](/bootstrap/secrets.html) 输入，并渲染这些模板。如果缺少某个值，运行会在首次更改之前停止。

之后，`mise bootstrap` 会按顺序执行以下步骤。第二列中的部分名称可用于 `--only` 和 `--skip`；只有对应部分运行时，该部分的钩子才会运行。括号中的旧名称仍然有效，但会显示弃用警告，并将在 mise 2027.10.4 中移除。

| 步骤 | 部分（`--only`、`--skip`）          | 应用内容                                                                                                                                              | 钩子                            |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1    | `accounts`                         | [`[bootstrap.users]` 与 `[bootstrap.groups]`](/bootstrap/accounts.html)                                                                               |                                 |
| 2    | `plugins`                          | [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html)                                                                                             |                                 |
| 3    | `files`                            | 带有 [`phase = "pre-packages"`](/bootstrap/files.html) 的文件和目录                                                                                   |                                 |
| 4    | `packages`                         | [`[bootstrap.apt.sources]`](/bootstrap/packages/apt.html#sources)，然后是内置包管理器的 [`[bootstrap.packages]`](/bootstrap/packages/)                 | `pre-packages`、`post-packages` |
| 5    | `files`                            | 其余的 [`[bootstrap.files]` 和 `[bootstrap.directories]`](/bootstrap/files.html)                                                                       |                                 |
| 6    | `services`                         | [`[bootstrap.services]`](/bootstrap/services.html)，但不包括 `requires_tools = true` 的用户服务                                                       |                                 |
| 7    | `firewall`                         | [`[bootstrap.linux.firewall]`](/bootstrap/firewall.html)                                                                                              |                                 |
| 8    | `compose`                          | [`[bootstrap.compose]`](/bootstrap/compose.html)                                                                                                      |                                 |
| 9    | `repos`                            | [`[bootstrap.repos]`](/bootstrap/repos.html)                                                                                                          | `pre-repos`、`post-repos`       |
| 10   | `dotfiles`                         | [`[dotfiles]`](/dotfiles.html)                                                                                                                        | `pre-dotfiles`、`post-dotfiles` |
| 11   | `mise-shell-activate` (`shell`)    | [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)                                                                                            |                                 |
| 12   | `macos-defaults` (`defaults`)      | [`[bootstrap.macos.defaults]`](/bootstrap/macos-defaults.html) 和其他 `[bootstrap.macos.*]` 键                                                        | `pre-defaults`、`post-defaults` |
| 13   | `macos-launchd-agents` (`launchd`) | [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html)                                                                                         |                                 |
| 14   | `linux-systemd-units` (`systemd`)  | [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)                                                                                          |                                 |
| 15   | `user`                             | [`[bootstrap.user]`](/bootstrap/shell.html#set-your-login-shell)                                                                                      | `pre-user`、`post-user`         |
| 16   | `tools`                            | `[tools]`，与 `mise install` 的行为相同                                                                                                               | `pre-tools`、`post-tools`       |
| 17   | `packages`                         | 来自[包管理器插件](/bootstrap/packages/plugins.html)的软件包                                                                                          |                                 |
| 18   | `services`                         | `requires_tools = true` 的用户服务                                                                                                                   |                                 |
| 19   | `task`                             | 如果存在，则运行 [`bootstrap` 任务](#the-bootstrap-task)                                                                                             |                                 |
| 20   | `final-hook`                       |                                                                                                                                                       | `final`                         |

在第 4 步中，mise 添加 apt 软件源前会先运行 `pre-packages` 钩子。

除非 `[bootstrap.packages]` 中的软件包来自包管理器插件，否则 `post-packages` 钩子会在第 4 步后立即运行。如果有软件包来自插件，则会改为在第 17 步安装完这些软件包后运行。即使指定了 `--skip tools`，第 18 步仍会运行。

声明式配置部分会将机器当前状态与配置对比，只更改不一致的内容。钩子和 `bootstrap` 任务每次都会运行，因此请确保它们可重复执行。整个运行流程是一系列步骤，而非事务：如果后续步骤失败，前面已完成的更改仍会保留。请修复报告的问题，然后再次运行 `mise bootstrap`。

至少有一个文件被[跟踪](/dotfiles/history.html)或已有历史记录后，每次更改内容的运行都会在运行前后为受跟踪文件创建检查点，供 [`mise dot undo`](/cli/dotfiles/undo.html) 撤销本次运行对这些文件所做的更改。适用命令包括 `mise bootstrap`、每个 `mise bootstrap <part> apply`，以及原位更改文件或 bootstrap 配置的其他命令，例如 `mise dot add`、`mise dot edit`、`mise bootstrap packages use` 和 `mise bootstrap unapply`。没有跟踪文件时，bootstrap 不会创建历史记录；试运行不会记录更改；设置 [`history.enabled = false`](/configuration/settings.html#history.enabled) 可关闭记录。

## 选择运行内容

`--only` 只运行指定部分，`--skip` 则运行除指定部分外的所有内容。两者使用[执行顺序](#how-it-runs)中的部分名称，可重复指定或用逗号分隔，但不能同时使用：

```sh
mise bootstrap --only dotfiles,tools --dry-run
mise bootstrap --only dotfiles,tools
mise bootstrap --skip tools,task
```

请选中更改所依赖的所有部分。`--only services` 不会安装这些服务所需的软件包或单元文件；要将新建账户设为文件所有者，则需同时选择 `accounts` 和 `files`。

以下选项会改变选中部分的行为：

| 选项               | 作用                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `--update`         | 安装软件包前刷新包管理器元数据，并更新[已声明的仓库](/bootstrap/repos.html)                                      |
| `--force-dotfiles` | 整个文件形式的 `[dotfiles]` 条目与现有文件冲突时，直接替换而不是停止                                             |
| `--prune-dotfiles` | 移除由 dotfile 组部署、但现在没有任何活动条目部署的文件；等同于 `mise dot apply --prune`                          |
| `--skip-dirty`     | 跳过有本地更改的 `[bootstrap.repos]` 检出目录，而不是报错                                                       |
| `--prompt-secrets` | 提示输入环境中缺失的[密钥输入](/bootstrap/secrets.html)                                                         |
| `--prompt-vars`    | 提示输入尚无已保存答案、且带有 `prompt` 的 [`[vars]`](/configuration/vars.html#prompt)                           |
| `-y`、`--yes`      | 应用配置时跳过确认提示                                                                                         |

元数据刷新方式取决于包管理器：apk 添加 `--update-cache`；apt 运行 `apt-get update`；dnf、nix 和 AUR helper 添加 `--refresh`；pacman 运行 `pacman -Sy`；zypper 运行 `zypper refresh`；scoop 运行 `scoop update`；winget 运行 `winget source update`。Homebrew、Flatpak、`macos-app` 和 mas 没有单独的刷新操作。

## 预览与检查 {#previewing-changes}

`mise bootstrap --dry-run` 会预览选中的部分，列出每个部分将要进行的更改，并打印钩子命令和 `bootstrap` 任务，而不实际运行它们。它不会渲染 `[dotfiles]` 模板，但会渲染 `[bootstrap.files]` 内容模板（`template = true`），以便与磁盘上的文件比较。因此，模板中的 `exec()` 调用会在试运行期间执行；`mise bootstrap plan` 和 `mise bootstrap status` 也会执行模板中的 `exec()`。参见[会运行命令的模板](#templates-that-run-commands)。

### 规划声明式资源

`mise bootstrap plan` 会按依赖顺序列出声明式资源的更改：账户、软件包（包括插件提供的软件包）、系统文件和目录、系统服务和用户服务、防火墙策略和规则，以及 Compose 项目。它不涵盖 dotfiles、仓库、shell 激活、macOS 默认设置、LaunchAgents、systemd 用户单元、登录 shell、工具、钩子或 `bootstrap` 任务。要预览这些内容，请使用 `mise bootstrap --dry-run`。

```sh
mise bootstrap plan
mise bootstrap plan --json
mise bootstrap plan --detailed-exitcode
```

使用 `--detailed-exitcode` 时，退出码会说明规划结果：

| 退出码    | 含义                                        |
| --------- | ------------------------------------------- |
| 0         | 无更改                                      |
| 2         | 计划包含更改                                |
| 1         | 规划失败，或某项资源状态为 `unknown`        |

如果 mise 无法自行达到资源声明的状态，该资源就会标记为 `unknown`。例如，当前平台没有对应的软件包管理器，或无法安装请求的版本。mise 会报告此项而不是跳过它，以便你手动处理。

### 检查状态 {#inspecting-state}

```sh
mise bootstrap status
mise bootstrap status --missing   # exit 1 if anything differs from the config
mise bootstrap status --json
```

`status` 会列出每个已配置的部分、`[tools]` 中的工具，以及已安装工具所需的系统依赖。`--missing` 仍会列出所有内容，只改变退出码，因此适合在 CI 中使用。每一部分也都有自己的 `status` 子命令，例如 `mise bootstrap packages status`；[`mise dot status`](/cli/dotfiles/status.html) 则会检查 dotfiles 及其历史记录。

### 后续处理事项

如果运行结束后还有待处理事项，例如更改登录 shell 后需要重新登录，或需要处理 mise 在当前平台上跳过的部分，`mise bootstrap` 会在结尾列出 `bootstrap: follow-up` 清单。试运行时则会显示 `bootstrap: follow-up if applied`。即使后续步骤失败，mise 仍会打印该清单。

<a id="hooks"></a>

## 钩子

钩子会在运行流程中的指定时点执行命令。可以将某个阶段设为命令字符串、命令数组或包含 `run` 的表：

```toml
[bootstrap.hooks]
post-defaults = "killall Dock || true"

[bootstrap.hooks.post-tools]
run = [
  "mise exec -- node --version",
  "mise exec -- python --version",
]

[bootstrap.hooks.final]
run = "mise exec -- gh auth status"
```

可用阶段包括 `pre-packages`、`post-packages`、`pre-repos`、`post-repos`、`pre-dotfiles`、`post-dotfiles`、`pre-defaults`、`post-defaults`、`pre-user`、`post-user`、`pre-tools`、`post-tools` 和 `final`。[执行顺序](#how-it-runs)中列出了每个阶段的运行时点。所有配置文件中的钩子都会合并，且先处理全局配置，因此全局配置可以设置机器，项目也可以添加自己的命令。

钩子会在 `mise bootstrap` 期间运行。`pre-dotfiles` 和 `post-dotfiles` 也会在 [`mise dot apply`](/cli/dotfiles/apply.html) 前后运行。其他部分的子命令（例如 `mise bootstrap repos apply`）不会运行钩子；`--no-hooks`、`MISE_NO_HOOKS=1` 和[安全模式](/security.html#safe-mode)会跳过所有钩子。

每条命令都像内联任务一样，使用 [`unix_default_inline_shell_args`](/configuration/settings.html#unix_default_inline_shell_args) 指定的 shell；Windows 上则使用 [`windows_default_inline_shell_args`](/configuration/settings.html#windows_default_inline_shell_args)。钩子失败会终止运行；试运行会打印命令而不是执行它。试运行期间绝不会调用 `exec()`，因此如果钩子模板调用了 `exec()`，或读取由其计算得到的变量，mise 会原样打印钩子，并附上渲染错误说明。钩子运行在 mise 自身环境中，而不是任务环境中，因此需要使用 `[tools]` 中工具的命令应像上例一样通过 `mise exec --` 运行，或移到 [`bootstrap` 任务](#the-bootstrap-task)中。

钩子命令是 [Tera 模板](/templates.html)，会使用声明配置文件的上下文进行渲染，例如 <code v-pre>{{ config_root }}</code>、<code v-pre>{{ xdg_config_home }}</code> 和 <code v-pre>{{ vars.name }}</code>。

## bootstrap 任务

其他部分运行完毕后，如果存在名为 `bootstrap` 的任务（例如 `[tasks.bootstrap]` 表），`mise bootstrap` 就会运行它。该任务与其他[任务](/tasks/)一样运行，并可以使用 `[tools]` 中的工具。

如果 mise 可以检查并应用某项状态，请使用声明式配置部分。对于这些部分无法涵盖的设置（例如检查身份验证或初始化本地数据），请使用任务：

```toml
[tasks.bootstrap]
run = [
  "install -d -m 700 ~/.ssh",
  "gh auth status",
]
```

每次运行 `mise bootstrap` 都会执行此任务，因此请为只应执行一次的步骤添加判断条件。对于共享[setup 仓库](/bootstrap/setup.html)的机器，接管配置时会在文件还原后运行一次任务。通过 `mise dot pull` 或监视器还原的共享更改不会触发任务；请运行 `mise bootstrap` 以应用更改并运行任务。使用 `--skip task` 可跳过任务。

## 模板

`[bootstrap]` 下的值并非全部都是 [Tera 模板](/templates.html)。以下内容会进行渲染：

| 位置                                                          | 渲染内容                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`[bootstrap.linux.systemd.units]`](/bootstrap/systemd.html)  | 单元中的所有字符串值                                                  |
| [`[bootstrap.macos.launchd.agents]`](/bootstrap/launchd.html) | 代理中的所有字符串值                                                  |
| [`[bootstrap.compose]`](/bootstrap/compose.html)              | Compose 项目中的文本值和列表值；不包括 `state` 等字段                  |
| [`[bootstrap.hooks]`](#hooks)                                 | 钩子命令                                                              |
| [`[bootstrap.files]`](/bootstrap/files.html)                  | 文件内容，仅当 `template = true` 时                                   |
| [`[dotfiles]`](/dotfiles.html)                                | 文件内容，仅当 `mode = "template"` 或 `template = "tera"` 时         |

其他内容（包括配置部分的键、软件包规格、仓库路径和 macOS 默认设置）都会按原样使用。

渲染时使用的是声明条目的配置文件所对应的模板上下文，因此 <code v-pre>{{ config_root }}</code> 不会因运行 `mise bootstrap` 的目录不同而改变。对于单元、代理、Compose 项目和钩子，它是配置根目录：项目目录，或全局配置的 `MISE_GLOBAL_CONFIG_ROOT`（默认为 `$HOME`）。对于 `[bootstrap.files]` 内容模板，它是包含声明文件的目录；参见[将文件内容作为模板渲染](/bootstrap/files.html#render-content-as-a-template)。受管理文件的内容模板还会获得 <code v-pre>{{ target }}</code>。`[bootstrap.files]` 模板和 `mode = "template"` 的 `[dotfiles]` 条目可以调用 <code v-pre>{{ secret(name="...") }}</code>；使用 `template = "tera"` 的代码块、行和合并编辑则不能调用。

不包含模板语法的值会跳过渲染器，因此单元、代理或 Compose 项目中的字面值 `%h`、`%i` 或 `$HOME` 会原样保留在生成文件中。各部分文档中说明的 `~` 展开仍会在之后进行。

### 会运行命令的模板

<code v-pre>{{ exec(...) }}</code> 可以用于 `[bootstrap.hooks]` 和文件内容模板，但不能用于单元、代理或 Compose 值。单元、代理和 Compose 值在运行 `status`、`plan`、`--dry-run` 和 `apply` 时都会以相同方式渲染，因此 mise 会禁止它们调用 `exec()`，避免这些命令执行任何操作。文件内容模板没有此限制：mise 会渲染模板并将结果与磁盘上的文件比较，因此其中的 `exec()` 会在此时运行：

| 模板                         | 会渲染模板的只读命令                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `[bootstrap.files]` 内容     | `mise bootstrap status`、`mise bootstrap plan` 和 `mise bootstrap --dry-run`                                             |
| `[dotfiles]` 内容            | `mise bootstrap status` 和 `mise dot status`，但不包括试运行                                                             |
| `[bootstrap.hooks]` 命令     | 试运行时不会执行 `exec()`；若钩子调用了它或读取依赖于它的变量，则会原样打印钩子并附上说明                              |

## 后续步骤

- [设置机器](/bootstrap/setup.html) 介绍如何跟踪 dotfiles、声明工具和软件包，以及将第二台机器配置为相同状态。
- [机器模块](/bootstrap/modules.html) 介绍如何将可选设置分组到配置环境中，供每台机器自行选择，并通过 `mise bootstrap unapply` 移除模块资源。
- [远程主机](/bootstrap/remote.html) 介绍如何通过 SSH 将相同配置应用到其他机器。
- 若要更改 mise 部署的 dotfile，请参见[接管文件并记录修改](/dotfiles/managed.html#capturing-changes)。若要从命令行添加软件包，请参见 [`mise bootstrap packages use`](/cli/bootstrap/packages/use.html)。
