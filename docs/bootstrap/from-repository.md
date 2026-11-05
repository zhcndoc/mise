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
| Bootstrap 项目：`mise.toml` 及其使用的文件 | `mise bootstrap --from <url>` | `$MISE_DATA_DIR/bootstrap-repo` 或 `--from-dir` 指定的位置 | 使用 `--update` 重新运行以应用新提交 |
| 全局 mise 配置：`config.toml`、`conf.d/`、`tasks/` | `mise bootstrap --adopt <url>` | `~/.config/mise` 下的 Git 检出目录 | 后续每条 mise 命令都会读取它；`mise bootstrap --update` 会拉取更新 |
| A setup repository created with `mise dot origin set`  | `mise bootstrap --adopt <url>` | mise's history store; files go to their paths    | Later changes arrive through the history watcher or `mise dot pull` |

若要在多台机器间共享自己的配置，请先建立 setup 仓库：跟踪 `~/.config/mise` 及你编辑的文件，并设置远程源，步骤见[设置机器](/bootstrap/setup.html)。若要将 mise 配置放在自己的 dotfiles 检出目录中，详见[将全局配置保存在其他目录](#global-config-elsewhere)。

`--adopt` detects a setup repository by the `.mise-history/format.toml` file
that `mise dot origin set` writes on the branch it adopts, so the same flag
covers both kinds. `--from`
and `--adopt` cannot be combined.

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

`OWNER/REPO` 会展开为 `https://github.com/OWNER/REPO.git`。也可以使用 HTTPS、SSH URL 和本地路径。相对路径请写成 `./OWNER/REPO`：如果当前目录中也存在同名的 `OWNER/REPO`，mise 会拒绝不带 `./` 的写法。

mise 会将仓库的默认分支克隆到 `$MISE_CONFIG_DIR`（通常为 `~/.config/mise`），并从中运行 bootstrap。文件会保留在该处，因此后续每条 mise 命令都会将其作为全局配置读取。如果设置了 `$MISE_GLOBAL_CONFIG_FILE`，mise 会将仓库克隆到该文件所在目录，并加载该文件。

如需接管其他分支（例如保存了笔记本电脑专用配置的分支），请在仓库地址中添加 `?ref=`：

```sh
mise bootstrap --adopt 'you/mise-config?ref=laptop'
```

该 ref 必须是分支，因为你会继续在检出副本中拉取和提交；标签或提交会被拒绝。mise 不会将现有检出副本切换到其他分支：如果当前分支不同，请先使用 Git 切换。之后 `--update` 会快进更新当前分支。初始化仓库和[`mise bootstrap remote`](/bootstrap/remote.html)也采用相同规则。

克隆需要 `git`；SSH URL（例如 `git@github.com:you/setup.git`）还需要 `ssh`。新机器缺少这些程序时，mise 会在克隆前询问是否通过主机软件包管理器（apt、dnf、pacman、apk、zypper、Homebrew、scoop 或 winget）安装。传入 `--yes` 可直接同意，无需确认。仓库自身的 `[bootstrap.packages]` 无法安装这些依赖，因为此时仓库尚未克隆。使用 `--dry-run` 时，mise 会报告缺少哪些程序，而不会安装。

目标位置必须不存在、为空，或已经是一个 `origin` 指向所指定仓库的 Git 检出目录。接管前请先移走已有的 `~/.config/mise`。如果检出目录已存在，`--update` 会在运行 bootstrap 前将其快进更新；之后不带 `--adopt` 运行 `mise bootstrap --update` 也会如此。该检出目录是普通 Git 仓库，可像其他仓库一样提交和拉取。

[`mise dot origin set`](/cli/dotfiles/origin/set.html) 不会同步这个检出副本。它需要独立仓库，或使用当前仓库的另一个分支；详见[远程源与全局配置](/dotfiles/sync.html#origin-and-global-config)。

## 初始化仓库（`--adopt`）{#shared-dotfile-history}

初始化仓库存放受跟踪 dotfiles 的历史，并与[`mise dot origin set`](/cli/dotfiles/origin/set.html)配合使用。接管后会恢复受跟踪的文件，并从恢复的配置运行 bootstrap：

```sh
mise bootstrap --adopt you/setup
```

mise does the following:

1. Fetches the repository's default branch, or the branch `?ref=` names, into
   its own history store.
2. Restores each tracked file to its path on this machine.
3. Remembers the repository as the origin for later synchronization.
4. Runs bootstrap from the restored mise configuration.

mise does not clone a setup repository into `$MISE_CONFIG_DIR`. If that
directory is already a Git checkout, though, its `origin` must be the repository
you adopt. Setup repositories always come from their latest commit, so
`--update` only refreshes package metadata and `[bootstrap.repos]` in the
bootstrap that follows.

Track the mise configuration and any template sources on the first machine, so
bootstrap can recreate tools and services and render templates here. If a file
on this machine differs from the shared version, adoption pauses before it
writes anything or runs bootstrap, so you can decide each file. `--dry-run`
shows the files it would write and those held for a decision.
`--replace-history` discards unrelated local history while adopting. It does
not resolve files that differ; add `--take-remote-all` to take the repository's
version of each.

[Set up a machine](/bootstrap/setup.html#set-up-another-machine) walks through
adopting a setup repository, including files that already exist. For
synchronization after that, see [Sync across machines](/dotfiles/sync.html).

## 将全局配置保存在其他目录 {#global-config-elsewhere}

共享全局配置最简单的方式是跟踪它：运行 `mise dot track ~/.config/mise`，设置远程源，然后按照[设置机器](/bootstrap/setup.html)中的说明在其他机器上接管。

如果你将自己的 dotfiles 检出目录用于管理其他应用配置，也可以将 mise 配置放在其中一个目录下：

```text
~/.dotfiles/
├── .zshrc
└── .config/
    ├── kitty/kitty.conf
    └── mise/
        ├── config.toml
        ├── config.work.toml
        ├── miserc.toml
        └── conf.d/
```

在新机器上，只需运行一条命令即可克隆该检出目录，将 `~/.config/mise` 链接到其中由 `--config-dir` 指定的目录，并从该目录运行 bootstrap：

```sh
mise bootstrap --from https://github.com/you/dotfiles.git --from-dir ~/.dotfiles --config-dir .config/mise
```

此后，该目录中的 `config.toml`、`config.<env>.toml`、`conf.d/` 和 `miserc.toml` 都会作为全局配置；本次及后续运行中，`{{ mise_config_dir }}` 的值均为 `~/.config/mise`。检出目录中必须存在 `--config-dir` 指定的目录。链接会创建在 mise 读取配置的位置，因此 `XDG_CONFIG_HOME` 和 `MISE_CONFIG_DIR` 也会影响该位置；该路径必须不存在、为空，或已经是此链接。若已有配置，请先移到其他位置。检出目录的其余部分通过普通条目部署：

```toml [~/.dotfiles/.config/mise/config.toml]
[dotfiles]
"~/.config/kitty" = { mode = "symlink" }
"~/.zshrc" = {}
```

没有设置 `source` 的条目会读取 [`dotfiles.root`](/configuration/settings.html#dotfiles.root) 下的同一路径，其默认值为 `~/.dotfiles`。如果检出目录位于其他位置，请将 `dotfiles.root` 设置为该目录。更新时无需传入 `--from`：`--update` 会快进更新链接指向的检出目录，然后使用新提交运行 bootstrap：

```sh
mise bootstrap --update
```

`mise use -g`、`mise dot add` 和其他写入全局配置的命令现在都会通过链接写入该检出目录。请在该目录中提交这些更改。

## On other machines

To adopt a repository on another machine over SSH, see
[Remote hosts](/bootstrap/remote.html#private-configuration-repositories).
