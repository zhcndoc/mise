---
description: "在原位置跟踪配置文件，或将它们作为链接、副本和模板从 dotfiles 仓库部署。"
socialDescription: "在原处跟踪 dotfiles，或从仓库以链接、副本和模板的形式部署。"
---

# Dotfiles

mise 会保存你原地编辑的配置文件历史，也可以将 dotfiles 仓库中的文件以链接、副本或模板形式部署。相关命令位于 [`mise dotfiles`](/cli/dotfiles.html) 下，本组文档中简写为其别名 `mise dot`；`mise bootstrap dotfiles` 会运行相同命令。Dotfiles 功能可以独立使用，也可以与 [`mise bootstrap`](/bootstrap.html) 搭配使用。

## 推荐配置 {#recommended-setup}

如果不确定从何开始，可以先原地跟踪文件，让监视器自动保存每次编辑，再通过私有 Git 仓库共享文件。将监视器添加到 `~/.config/mise/config.toml`：

```toml
[bootstrap.services.mise-history]
builtin = "history-watch"
```

然后跟踪文件和 mise 配置，启动监视器，并关联仓库：

```sh
mise dot track ~/.zshrc ~/.config/nvim ~/.config/mise/config.toml
mise bootstrap services apply
mise dot origin set https://github.com/you/dotfiles.git --sync sync
```

在另一台机器上运行 `mise bootstrap --adopt you/dotfiles` 即可还原这些文件。[配置新机器](/bootstrap/setup.html)介绍了完整步骤。本组文档的其他页面会讲解更多方案和全部选项；开始使用并不需要先阅读它们。

## 选择方案 {#choose-an-approach}

跟踪会将文件留在原处，作为可继续编辑的普通文件，并将其版本保存在本地 Git 仓库中，供你回滚或在多台机器间共享。部署则将文件保存在你维护的源目录中（例如 dotfiles 仓库），并通过 `mise dot apply` 使实际文件与源目录保持一致。两种方式可以结合使用，即跟踪由 mise 部署的文件。

| 需求                                                        | 方案                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| 原地编辑文件，并撤销或共享更改                                | [`mode = "track"`](/dotfiles/history.html)                  |
| 在仓库中维护文件并链接到目标位置                              | [`symlink` 或 `symlink-each`](/dotfiles/managed.html#modes) |
| 为应用提供也可由其重写的普通文件                              | [`copy`](/dotfiles/managed.html#modes)                      |
| 生成因机器而异的文件                                          | [`template`](/dotfiles/managed.html#templates)              |
| 部署整个目录树，并按机器选择其中内容                          | [组](/dotfiles/groups.html)                                  |
| 管理应用也会写入的文件中的少数几个键                          | [`merge = true`](/dotfiles/edits.html#merge)                |
| 向其他方式不管理的文件添加行或代码块                          | [`line` 或 `block`](/dotfiles/edits.html)                  |
| 从所有机器上移除旧文件                                        | [`mode = "absent"`](/dotfiles/managed.html#absent)          |

## 原地跟踪文件 {#tracking-files-in-place}

```sh
mise dot track ~/.zshrc
```

mise 会将文件留在原处，将当前内容保存为检查点，并在全局配置（`~/.config/mise/config.toml`）中添加 `"~/.zshrc" = { mode = "track" }`。编辑后运行 `mise dot save`，或安装[监视器](/dotfiles/history.html#automatic-saves)以自动保存每次编辑。[Dotfiles 历史记录](/dotfiles/history.html)介绍如何比较和回滚版本，[跨机器同步](/dotfiles/sync.html)介绍如何通过私有 Git 仓库共享文件。[配置新机器](/bootstrap/setup.html)会以两台机器为例介绍完整流程。

## 从仓库部署 {#deploy-from-a-repository}

假设你的 dotfiles 位于一个 Git 仓库中：

```text
~/src/dotfiles/
├── mise.toml
├── git/config
└── nvim/
```

在仓库的 `mise.toml` 中声明每个目标及其来源：

```toml
# ~/src/dotfiles/mise.toml
[dotfiles]
"~/.gitconfig" = { source = "git/config", mode = "copy" }
"~/.config/nvim" = { source = "nvim" }   # a symlink, the default mode
```

信任该文件，预览并应用配置，然后检查结果：

```sh
cd ~/src/dotfiles
mise trust
mise dot apply --dry-run
mise dot apply
mise dot status
```

mise 会将 `git/config` 复制到 `~/.gitconfig`，并将 `~/.config/nvim` 链接到 `nvim` 目录；`status` 会将两者都报告为 `applied`。相对源路径以声明它们的配置文件所在目录为基准。之后若要修改文件，请编辑其源文件并再次运行 `mise dot apply`。

仓库中的 `mise.toml` 属于项目配置。只有在信任该配置后，mise 才会读取其中的 `[dotfiles]`；并且需要在该目录中运行，或在其他位置运行 `mise -C ~/src/dotfiles dot apply`。

若要将整个仓库部署到主目录中，可以用一个条目遍历仓库：

```toml
[dotfiles]
"~" = { source = ".", mode = "symlink-each", exclude = ["mise.toml", "*.md", ".git"] }
```

若采用每个应用一个目录的 GNU Stow 布局，请使用[组](/dotfiles/groups.html)。若要从已有文件开始，[`mise dot add`](/dotfiles/managed.html#capturing-changes) 会将文件移入 dotfiles 目录，再链接回原位置。[托管文件](/dotfiles/managed.html)介绍了模式、模板、权限和冲突。

## 在哪里声明 dotfiles {#where-to-declare-dotfiles}

请在以下位置之一放置 `[dotfiles]`：

- 全局配置 `~/.config/mise/config.toml`，这样从任何目录运行都会生效。`mise dot track` 和 `mise dot add` 默认都会将条目写入此处，除非 [`write_targets.dotfiles`](/configuration/settings.html#write_targets.dotfiles) 指定了其他全局文件。
- 与所用源文件位于同一位置的 [`conf.d` 文件夹](/configuration.html#conf-d-folders)。该文件夹可以是指向 dotfiles 仓库的符号链接。
- 如上例所示，放在 dotfiles 仓库的 `mise.toml` 中。

这些文件中的条目与其他配置一样，按照[配置层级](/configuration.html#configuration-hierarchy)进行合并：更靠近当前目录的文件会替换目标相同的条目。跟踪条目和 `[history]` 表只会从全局配置和系统配置中读取。若要让某些条目只用于一台机器或一种操作系统，请将它们放在 `config.local.toml` 中，或放在启用了 `auto_env` 的平台配置文件中，例如 `config.macos.toml`；详见[平台环境](/configuration/environments.html#platform-environments)。

## 与 mise bootstrap 搭配使用 {#with-mise-bootstrap}

[`mise bootstrap`](/bootstrap.html) 会将 `[dotfiles]` 作为整机初始化的一个步骤应用，并在克隆[仓库](/bootstrap/repos.html)后执行，因此源文件可以来自刚刚克隆的仓库；详见[执行顺序](/bootstrap.html#how-it-runs)。单独运行 `mise dot apply` 也会执行此步骤。两种方式都会在写入前后运行 `pre-dotfiles` 和 `post-dotfiles` [钩子](/bootstrap.html#hooks)（使用 `--dry-run` 时只会打印钩子），并运行与写入文件相匹配的 [`[history.reload]` 命令](/dotfiles/history.html#reload-an-application-after-restoring-files)。`mise dot add` 和 `mise dot edit --apply` 不会运行这些钩子。

当条目会部署 mise 自身的配置（例如将检出目录中的 `~/.config/mise/config.toml` 副本部署到目标位置）时，`mise dot apply` 会先写入该文件，再重新读取配置并规划其他条目。新文件添加的规则会在同一次运行中生效，且 `--dry-run` 会根据计划写入的文件进行规划。

## 命令 {#commands}

| 任务                          | 命令                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 预览并应用                    | [`mise dot diff`](/cli/dotfiles/diff.html)、[`mise dot apply`](/cli/dotfiles/apply.html)                                                        |
| 检查状态                      | [`mise dot status`](/cli/dotfiles/status.html)                                                                                                   |
| 收录文件或记录编辑            | [`mise dot add`](/cli/dotfiles/add.html)、[`mise dot edit`](/cli/dotfiles/edit.html)                                                             |
| 移除已部署文件                | [`mise dot unapply`](/cli/dotfiles/unapply.html)                                                                                                |
| 跟踪并保存                    | [`mise dot track`](/cli/dotfiles/track.html)、[`mise dot save`](/cli/dotfiles/save.html)、[`mise dot untrack`](/cli/dotfiles/untrack.html)      |
| 浏览并还原                    | [`mise dot history`](/cli/dotfiles/history.html)、[`mise dot rollback`](/cli/dotfiles/rollback.html)、[`mise dot undo`](/cli/dotfiles/undo.html) |
| 在机器间共享                  | [`mise dot origin`](/cli/dotfiles/origin.html)、[`mise dot sync`](/cli/dotfiles/sync.html)、[`mise dot pull`](/cli/dotfiles/pull.html)          |

所有子命令和标志请参阅 [`mise dotfiles`](/cli/dotfiles.html)。

## 后续阅读 {#next-steps}

- [托管文件](/dotfiles/managed.html)：条目、模式、模板、权限和冲突。
- [组](/dotfiles/groups.html)：部署目录树并按机器选择。
- [编辑文件片段](/dotfiles/edits.html)：代码块、行和合并键。
- [Dotfiles 历史记录](/dotfiles/history.html)：保存、比较并回滚跟踪的文件。
- [Dotfiles 参考](/dotfiles/reference.html)：所有键、模式规则和状态说明。
- [让 Dotfiles 自动保存](https://jdx.dev/posts/2026-09-07-dotfiles-that-save-themselves/)：通过实际配置介绍文件跟踪与同步。
