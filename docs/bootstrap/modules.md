---
description: "将可选的机器初始化配置归入配置环境，为每台机器选择要加载的模块，并移除模块创建的资源。"
socialDescription: "将可选的机器初始化配置归入配置环境，并按机器选择模块。"
---

# 机器模块

模块是一个[配置环境](/configuration/environments.html)文件，用于集中管理机器初始化中的某一部分，例如 SSH 或 GPG，以及相关软件包、dotfiles 和服务。每台机器都可以选择所需模块；[`mise bootstrap unapply`](/cli/bootstrap/unapply.html) 则可移除模块创建的资源。

## 定义模块

将共用设置放在 `~/.config/mise/config.toml` 中，并将每项可选配置放入同目录下的 `config.<name>.toml` 文件。以下 SSH 模块适用于使用 apt 和 systemd 用户会话的 Linux 机器：它会安装 SSH 客户端、从 dotfiles 检出目录链接 SSH 配置，并运行 agent：

```toml [~/.config/mise/config.ssh.toml]
[bootstrap.packages]
"apt:openssh-client" = "latest"

[dotfiles]
"~/.ssh/config" = "~/src/dotfiles/ssh/config"

[bootstrap.services.ssh-agent]
scope = "user"
command = "ssh-agent -D -a %t/ssh-agent.socket"
```

应用此模块前，请先创建 `~/src/dotfiles/ssh/config`。若要在 Shell 中使用 agent，请将 `SSH_AUTH_SOCK` 设为 `$XDG_RUNTIME_DIR/ssh-agent.socket`。

在 [Bootstrap 项目](/bootstrap/from-repository.html#a-bootstrap-project)中，请改为在项目目录使用 `mise.toml` 和 `mise.ssh.toml`。

## 选择模块 {#select-and-preview-modules}

在全局配置目录的 `miserc.local.toml` 中选择此机器要启用的模块。例如，定义 `config.ssh.toml` 和 `config.gpg.toml` 后，可这样选择：

```toml [~/.config/mise/miserc.local.toml]
env = ["ssh", "gpg"]
```

mise 会在读取其他配置前先读取 [`miserc.local.toml`](/configuration.html#miserc)。只要不提交该文件，即使通过 [`--adopt`](/bootstrap/from-repository.html#global-mise-configuration) 将配置目录设为共享检出目录，此文件也会留在本机。该文件中的 `env` 列表会替换共享 `miserc.toml` 中的列表，因此每台机器都需要的设置应放在始终会加载的基础 `config.toml` 中。先预览合并后的设置，再应用：

```sh
mise bootstrap --dry-run
mise bootstrap
```

若只想为单次运行选择模块，请使用 `mise -E ssh,gpg bootstrap`。`-E` 会在本次运行中替换 `miserc.local.toml` 的选择，而不是在其基础上追加。对于[远程主机](/bootstrap/remote.html)，请在清单中为每台主机设置 `mise_env` 列表，这样同一仓库就能描述启用不同模块组合的机器。

## 合并模块 {#how-modules-combine}

不同键的声明都会参与同一次运行。如果同一目录中的两个模块声明了相同的键，则 `env` 中靠后的模块优先。例如 `env = ["ssh", "gpg"]` 同时在两个文件中声明某项服务时，会使用 `config.gpg.toml` 中的定义。

`mise config` 会列出已加载的文件。`mise bootstrap plan --json` 会为每个托管文件和服务提供 `origin.config` 与 `origin.environment`，方便追溯资源对应的声明。

应始终加载的设置应放在基础配置中，或放在不带环境后缀的 [`conf.d` 片段](/configuration.html#conf-d)中，例如 `conf.d/ssh.toml`。若要将模块与其源文件放在一起，请使用 [`conf.d` 文件夹](/configuration.html#conf-d-folders)。相对 dotfile 源路径会在文件夹内解析，其中的 `mise.<env>.toml` 文件仅在对应环境启用时加载：

```text
~/.config/mise/conf.d/ssh/
├── mise.toml          # always loaded; "~/.ssh/config" = "ssh_config"
├── mise.linux.toml    # when the linux environment is active
└── ssh_config
```

## 移除模块资源

从 `env` 中移除模块会停止加载其声明，但不会移除机器上已有的资源。`mise bootstrap unapply` 会移除该模块管理的文件、目录、用户服务、systemd 用户单元、dotfile 条目和编辑项。

首先，从 `miserc.local.toml`（或其他选择模块的位置）的 `env` 中移除该模块，以免下次 bootstrap 再次应用。保留模块配置文件，然后预览并确认移除操作：

```sh
mise bootstrap unapply ssh --dry-run
mise bootstrap unapply ssh
```

此命令会在剩余环境之外，为本次运行临时选中 `ssh`，以便读取该模块的声明。可以在一次运行中指定多个模块：

```sh
mise bootstrap unapply ssh gpg --dry-run
mise bootstrap unapply ssh gpg
```

Unapply 移除任何资源前都会先请求确认。全局 `--yes` 参数、`MISE_YES` 和 [`yes`](/configuration/settings.html#yes) 设置也可跳过提示并批准移除；mise 会在 CI 中启用该设置。

### 移除操作如何规划

mise 会比较启用和未启用指定环境时的当前配置。它依据磁盘上仍然存在的声明，而不是先前 bootstrap 运行的记录，因此请保留这些声明，直到清理完成。若先删除模块文件，mise 就无法得知需要移除哪些资源。

- 如果基础配置或另一个已选模块仍声明某项资源存在，则会保留该资源。其他位置的 `state = "absent"` 声明不会保护它。
- 如果目标与其声明不再一致（例如文件被手动编辑），系统会保留该目标并报告原因。使用 `--force` 移除已更改的目标前，请先检查输出。
- 只有在计划移除资源后目录变为空时，才会删除该目录。即使使用 `--force`，也会保留无法读取的目录和类型与预期不符的托管路径。

源文件和配置条目都会保留。若资源先前已被 `state = "absent"` 声明移除，Unapply 不会将其恢复。

### 需要单独清理的资源

对于软件包、软件仓库和 Compose 声明，Unapply 会提供清理建议，而不会直接移除：

- 对于软件包，unapply 会建议运行 [`mise bootstrap packages prune`](/cli/bootstrap/packages/prune.html)，以处理 Homebrew formula、mise 安装的 cask 和插件提供的软件包。请先预览计划，因为 prune 的范围并不局限于某个模块的软件包。其他管理器安装的软件包应使用对应管理器移除。
- 对于 Compose 项目，请在模块仍处于选中状态时将 `state` 设为 `"absent"` 并应用更改，例如运行 `mise -E ssh bootstrap --only compose`。
- 对于软件仓库，不再需要时请删除 [`[bootstrap.repos]`](/bootstrap/repos.html) 中声明的检出目录。

其他 Bootstrap 部分（包括系统服务）不属于 unapply 的处理范围。请参阅相应章节中的移除步骤。
