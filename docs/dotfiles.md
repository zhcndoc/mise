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
mise dot track ~/.zshrc ~/.config/nvim ~/.config/mise
mise bootstrap services apply
mise dot origin set https://github.com/you/dotfiles.git --sync sync
```

请跟踪整个 `~/.config/mise` 目录，使 `config.work.toml`、`conf.d/` 和 `miserc.toml` 等环境配置文件与 `config.toml` 一起同步。以 `.local.toml` 结尾的文件会保留在各自机器上。

On another machine, `mise bootstrap --adopt you/dotfiles` restores them.
[Set up a machine](/bootstrap/setup.html) walks through each step. The rest of
these pages cover the other approaches and every option; you do not need them
to get started.

## 选择方案 {#choose-an-approach}

跟踪会将文件留在原处，作为可继续编辑的普通文件，并将其版本保存在本地 Git 仓库中，供你回滚或在多台机器间共享。部署则将文件保存在你维护的源目录中（例如 dotfiles 仓库），并通过 `mise dot apply` 使实际文件与源目录保持一致。两种方式可以结合使用，即跟踪由 mise 部署的文件。

| 需求                                                        | 方案                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Keep editing a file where it is, and undo or share changes  | [`mode = "track"`](/dotfiles/history.html)                  |
| Keep files in a repository and link them into place         | [`symlink` or `symlink-each`](/dotfiles/managed.html#modes) |
| Give an application a regular file that it can also rewrite | [`copy`](/dotfiles/managed.html#modes)                      |
| Generate a file that differs per machine                    | [`template`](/dotfiles/managed.html#templates)              |
| Deploy a whole tree, and choose parts of it per machine     | [Groups](/dotfiles/groups.html)                             |
| Own a few keys in a file that an application also writes    | [`merge = true`](/dotfiles/edits.html#merge)                |
| Add a line or block to a file you do not otherwise manage   | [`line` or `block`](/dotfiles/edits.html)                   |
| 部署机密文件但不将其提交到版本库 | [`mode = "fnox"`](/dotfiles/managed.html#fnox) |
| Remove an old file from every machine                       | [`mode = "absent"`](/dotfiles/managed.html#absent)          |

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

只有明确声明的路径及其内容会受管理。未包含在这些路径中的 `README.md` 会保留在版本库中；像上例这样的目录条目可使用 `exclude = ["*.md", ...]` 将其排除。条目键是其_目标路径_，因此 `"/README.md"` 指的是文件系统根目录下的文件，而不是版本库中的 README。`mise dot apply` 不会更改版本库的 Git 历史；[dotfiles 历史记录](/dotfiles/history.html)存储在单独的位置，只有连接 origin 后才会共享。

For a GNU Stow layout, with one directory per application, use
[groups](/dotfiles/groups.html). To start from files you already have,
[`mise dot add`](/dotfiles/managed.html#capturing-changes) moves each one into
your dotfiles directory and links it back. [Managed files](/dotfiles/managed.html)
covers modes, templates, permissions, and conflicts.

## Where to declare dotfiles {#where-to-declare-dotfiles}

Put `[dotfiles]` in one of these places:

- Your global config, `~/.config/mise/config.toml`, so that it applies from
  any directory. `mise dot track` writes its entries here, and so does
  `mise dot add`, unless
  [`write_targets.dotfiles`](/configuration/settings.html#write_targets.dotfiles)
  names another global file.
- A [`conf.d` folder](/configuration.html#conf-d-folders) next to the sources
  it uses. The folder can be a symlink into your dotfiles repository.
- The `mise.toml` of your dotfiles repository, as above.

Entries merge across these files like the rest of the
[config hierarchy](/configuration.html#configuration-hierarchy): a more local
file replaces an entry with the same target. Tracking entries and the
`[history]` table are read only from global and system config. To give some
entries to one machine or operating system, put them in `config.local.toml`,
or in a platform file such as `config.macos.toml` with the `auto_env` setting
on; see [Platform environments](/configuration/environments.html#platform-environments).

## With mise bootstrap {#with-mise-bootstrap}

[`mise bootstrap`](/bootstrap.html) applies `[dotfiles]` as one step of a full
machine setup, after it clones [repositories](/bootstrap/repos.html), so a
source can come from a repository it just cloned; see the
[run order](/bootstrap.html#how-it-runs). `mise dot apply` runs the same step
on its own. Both run your `pre-dotfiles` and `post-dotfiles`
[hooks](/bootstrap.html#hooks) before and after they write (`--dry-run` prints
the hooks instead), and the [`[history.reload]` commands](/dotfiles/history.html#reload-an-application-after-restoring-files)
that match the files they wrote. `mise dot add` and `mise dot edit --apply`
do not run these hooks.

When an entry deploys mise's own configuration, such as a copy of
`~/.config/mise/config.toml` from a checkout, `mise dot apply` writes it first
and reads the configuration again before it plans the other entries. A rule the
new file adds takes effect in the same run, and `--dry-run` plans against the
file it would write.

## Commands {#commands}

| Task                          | Commands                                                                                                                                         |
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
