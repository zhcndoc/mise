---
description: "从 Git 仓库初始化机器：使用 --from 指定 bootstrap 项目，或通过 --adopt 管理全局配置和 setup 仓库。"
socialDescription: "使用 --from 或 --adopt 从 Git 仓库初始化机器。"
---

# 从仓库初始化

`mise bootstrap` 可以克隆仓库，并使用其中的配置运行。对于独立于全局配置的初始化项目，请使用 `--from`；如需将仓库设为全局 mise 配置，或恢复由仓库跟踪的 dotfiles，请使用 `--adopt`。

## 选择 `--from` 还是 `--adopt`

这两个选项会让仓库在当前机器上承担不同的用途。

如果只是应用某个初始化项目，而不将它作为自己的配置，请使用 `--from`。常见情况是团队维护的工作站初始化仓库：其中的 `mise.toml` 会安装团队所需的软件包和工具，并写入每台机器都需要的文件。mise 会保留该项目的检出副本，并从中运行 bootstrap，同时保持全局配置目录不变。你自己的配置仍保存在原处，之后也可以再次应用该项目。

如果此后要让仓库成为当前机器自己的配置，请使用 `--adopt`。仓库可以是后续所有 mise 命令都会读取的全局配置，也可以是包含受跟踪 dotfiles 的初始化仓库，由 mise 恢复这些文件并与其他机器保持同步。

| 仓库内容                                               | 命令                           | 仓库存放位置                                     | 后续行为                                                            |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| 初始化项目：`mise.toml` 及其引用的文件                 | `mise bootstrap --from <url>`  | `$MISE_DATA_DIR/bootstrap-repo`，或 `--from-dir` | 使用 `--update` 再次运行，以应用新的提交                           |
| 全局 mise 配置：`config.toml`、`conf.d/`、`tasks/`      | `mise bootstrap --adopt <url>` | `~/.config/mise` 下的 Git 检出副本               | 后续每个 mise 命令都会将其作为全局配置读取                          |
| 使用 `mise dot origin set` 创建的初始化仓库            | `mise bootstrap --adopt <url>` | mise 的历史存储；文件写入各自路径                | 后续更改通过历史监视器或 `mise dot pull` 同步                        |

`--adopt` 会通过 `.mise-history/format.toml` 文件识别初始化仓库；`mise dot origin set` 会将此文件写入它接管的分支，因此同一个选项可用于上述两种仓库。`--from` 和 `--adopt` 不能同时使用。

无论选择哪种方式，bootstrap 都会使用仓库配置运行，mise 也会在此次运行中信任该配置。执行命令前请先检查仓库。添加 `--dry-run` 可预览操作，添加 `-E <env>` 可选择[配置环境](/configuration/environments.html)，例如在初始化项目中为 `mise.work.toml` 选择 `-E work`，或在全局配置中为 `config.work.toml` 选择该环境。

## 初始化项目（`--from`）{#a-bootstrap-project}

初始化项目是一个包含 `mise.toml` 及其引用源文件（例如 dotfiles 和模板）的仓库。mise 会克隆该仓库，并在检出目录中运行 `mise bootstrap`：

```sh
mise bootstrap --from https://github.com/you/workstation.git
mise -E work bootstrap --from git@github.com:you/workstation.git
```

检出副本会放在 `$MISE_DATA_DIR/bootstrap-repo` 中，通常为 `~/.local/share/mise/bootstrap-repo`，之后的运行会继续使用该副本。使用 `--from-dir <DIR>` 可指定其他目录。

该项目不会替换全局配置。mise 仍会像处理其他目录一样加载全局配置，因此从该项目运行 bootstrap 时，也会应用全局配置中的设置，例如 `[bootstrap.packages]` 和钩子。

如需检出分支、标签或提交，而不是默认分支，请在 URL 中添加 `?ref=`。`git::` 前缀可用，但不是必需的：

```sh
mise bootstrap --from 'https://github.com/you/workstation.git?ref=v1'
```

如果检出副本已存在：

- 其 `origin` 必须与传入的 URL 一致。mise 会直接使用现有检出副本。
- `--update` 会先拉取新提交，且只接受快进更新。
- 使用 `?ref=` 时，`--update` 会重新查询远程仓库中的 ref。分支会被检出并快进更新；同名分支优先于标签。标签则会移动到其当前指向的提交。如果远程分支或标签已不存在，就会报错。

尚无检出副本时使用 `--dry-run`，只会打印克隆命令后停止，因为检出仓库前没有可预览的配置。

## 全局配置（`--adopt`）{#global-mise-configuration}

当仓库是你的全局 mise 配置，并包含 `config.toml`、`config.work.toml`、`conf.d/` 和 `tasks/` 等文件时，请使用 `--adopt`：

```sh
mise bootstrap --adopt you/mise-config
```

`OWNER/REPO` 会展开为 `https://github.com/OWNER/REPO.git`。HTTPS、SSH URL 和本地路径也都可用。mise 会将仓库的默认分支克隆到 `$MISE_CONFIG_DIR`（通常为 `~/.config/mise`），并从中运行 bootstrap。文件会保留在原处，因此之后的每个 mise 命令都会将它们作为全局配置读取。如果设置了 `$MISE_GLOBAL_CONFIG_FILE`，mise 会将仓库克隆到该文件所在目录，并加载该文件。

如需接管其他分支（例如保存了笔记本电脑专用配置的分支），请在仓库地址中添加 `?ref=`：

```sh
mise bootstrap --adopt 'you/mise-config?ref=laptop'
```

该 ref 必须是分支，因为你会继续在检出副本中拉取和提交；标签或提交会被拒绝。mise 不会将现有检出副本切换到其他分支：如果当前分支不同，请先使用 Git 切换。之后 `--update` 会快进更新当前分支。初始化仓库和[`mise bootstrap remote`](/bootstrap/remote.html)也采用相同规则。

克隆需要 `git`；SSH URL（例如 `git@github.com:you/setup.git`）还需要 `ssh`。新机器缺少这些程序时，mise 会在克隆前询问是否通过主机软件包管理器（apt、dnf、pacman、apk、zypper、Homebrew、scoop 或 winget）安装。传入 `--yes` 可直接同意，无需确认。仓库自身的 `[bootstrap.packages]` 无法安装这些依赖，因为此时仓库尚未克隆。使用 `--dry-run` 时，mise 会报告缺少哪些程序，而不会安装。

目标目录必须不存在、为空，或已是 `origin` 指向指定仓库的 Git 检出副本。接管到现有 `~/.config/mise` 前，请先将该目录移到别处。使用现有检出副本时，`--update` 会在运行 bootstrap 前快进更新。该检出副本是普通 Git 仓库，可以像其他仓库一样提交和拉取。

[`mise dot origin set`](/cli/dotfiles/origin/set.html) 不会同步这个检出副本。它需要独立仓库，或使用当前仓库的另一个分支；详见[远程源与全局配置](/dotfiles/sync.html#origin-and-global-config)。

## 初始化仓库（`--adopt`）{#shared-dotfile-history}

初始化仓库存放受跟踪 dotfiles 的历史，并与[`mise dot origin set`](/cli/dotfiles/origin/set.html)配合使用。接管后会恢复受跟踪的文件，并从恢复的配置运行 bootstrap：

```sh
mise bootstrap --adopt you/setup
```

mise 会依次执行以下操作：

1. 将仓库默认分支或 `?ref=` 指定的分支获取到 mise 自己的历史存储中。
2. 将每个受跟踪文件恢复到当前机器上的原路径。
3. 记住该仓库作为后续同步的远程源。
4. 使用恢复后的 mise 配置运行 bootstrap。

mise 不会将初始化仓库克隆到 `$MISE_CONFIG_DIR`。但是，如果该目录已经是 Git 检出副本，其 `origin` 必须指向你要接管的仓库。初始化仓库始终使用最新提交，因此 `--update` 只会刷新随后 bootstrap 中的软件包元数据和 `[bootstrap.repos]`。

请在第一台机器上跟踪 mise 配置和所有模板源文件，这样 bootstrap 就能在此机器上重新创建工具和服务并渲染模板。如果此机器上的文件与共享版本不同，接管过程会在写入文件或运行 bootstrap 前暂停，让你逐个决定如何处理。`--dry-run` 会显示将要写入的文件以及等待处理的文件。
接管时，`--replace-history` 会丢弃无关的本地历史，但不会处理版本不同的文件；添加 `--take-remote-all` 可统一采用仓库中的版本。

[配置新机器](/bootstrap/setup.html#set-up-another-machine)介绍如何接管初始化仓库，包括处理已存在的文件。后续同步方式请参阅[在机器之间同步](/dotfiles/sync.html)。

## 在其他机器上

如需通过 SSH 在其他机器上接管仓库，请参阅[远程主机](/bootstrap/remote.html#private-configuration-repositories)。
