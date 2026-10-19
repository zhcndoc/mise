---
description: "通过 mise bootstrap 将 Git 仓库克隆到指定路径，并固定到分支、标签或提交。"
socialDescription: "通过 mise bootstrap 将 Git 仓库克隆到指定路径。"
---

# Git 仓库

在 `[bootstrap.repos]` 中声明 Git 仓库检出项，并以目标存放路径作为键。
[`mise bootstrap`](/bootstrap.html) 会在应用[点文件](/dotfiles.html)前克隆缺失的仓库，因此新
机器可以在一次运行中克隆点文件仓库并链接其中的文件。

## 示例

```toml
[bootstrap.packages]
"apt:git" = "latest"

[bootstrap.repos]
"~/src/dotfiles" = { url = "git@github.com:example/dotfiles.git", ref = "main" }
"~/src/project" = { url = "https://github.com/example/project.git" }

[dotfiles]
"~/.zshrc" = "~/src/dotfiles/zshrc"
```

```sh
mise bootstrap repos apply --dry-run
mise bootstrap
```

`mise bootstrap` 会安装 Git、克隆两个仓库，然后将 `~/.zshrc` 链接到新检出的仓库中的文件。
Git 必须能够通过每个 `url` 完成身份验证，例如对 `git@github.com:` 形式的地址使用 SSH 密钥。

在仓库克隆完成前，完整运行 `mise bootstrap` 的演练会停在源文件位于该仓库中的点文件处，因此
首次预览时请单独预览仓库操作。

若要单独管理仓库，请使用 [`mise bootstrap repos apply`](/cli/bootstrap/repos/apply.html)。

## 声明仓库

每个键都是仓库检出路径，且必须提供 `url`。路径可以是绝对路径、以 `~/` 开头的路径或相对路径。
相对路径以声明它的配置文件所在项目的根目录为基准，并且必须指向该根目录内部的目录：路径不能为空、
不能是 `.`，也不能使用 `..` 或绝对路径片段跳出根目录。因此，相对路径只能用于项目配置，不能用于
全局配置 `~/.config/mise/config.toml`。

键可以使用 [`[vars]`](/configuration/vars.html) 中的值，例如
<code v-pre>"{{ vars.repos_dir }}/project"</code>。为变量设置 `prompt` 后，各台机器可以分别选择
自己的基础目录，同时仓库声明仍保存在共享配置中：

```toml
[vars.repos_dir]
default = "~/src"
prompt = "Where should repositories be cloned?"

[bootstrap.repos]
"{{ vars.repos_dir }}/project-a" = { url = "git@github.com:example/project-a.git" }
```

读取变量时不会弹出提示；未回答的变量会使用其 `default` 值。运行
[`mise vars prompt`](/cli/vars/prompt.html) 即可填写。

可选的 `ref` 可以是分支、标签或完整提交 SHA。无效条目会显示警告并跳过。

`url` 和 `ref` 也可以使用变量及进程环境变量（`env.NAME`），因此一份文件可以用于多个分支。与检出路径一样，配置中的 `[env]` 表值不可用：

```toml
[vars]
branch = "main"

[bootstrap.repos]
"~/src/project" = { url = "git@github.com:example/project.git", ref = "{{ vars.branch }}" }
```

## 克隆选项

以下可选字段用于设置缺失仓库的首次克隆方式。它们不会影响已有检出目录，已有目录会保留最初克隆时的结构。

| 字段           | 作用                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `filter`       | 传入 `--filter=<spec>`；例如使用 `"blob:none"` 可执行无 blob 克隆。                                       |
| `depth`        | 浅克隆时传入 `--depth <n> --no-single-branch`；不能与完整提交 SHA 或以 `refs/` 开头的 `ref` 一起使用。     |
| `submodules`   | 为 `true` 时传入 `--recurse-submodules`；若同时设置 `filter`，还会传入 `--also-filter-submodules`。        |

```toml
[bootstrap.repos]
"~/src/large" = { url = "git@github.com:example/large.git", filter = "blob:none", depth = 1 }
```

## 选择引用版本 {#choose-apply-or-update}

`apply` 和 [`mise bootstrap repos update`](/cli/bootstrap/repos/update.html) 对现有检出项的操作
取决于 `ref`：

| 声明方式     | 对现有检出项执行 `apply` 的行为                                                    | `update` 的行为                             |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| 不设置 `ref` | 保持当前提交不变                                                                    | 获取并快进当前分支                          |
| 分支 `ref`   | 若当前分支与 origin 分支不同，则检出该分支并快进                                    | 与 `apply` 相同                             |
| 标签 `ref`   | 若当前版本不是该标签，则获取并检出该标签                                            | 与 `apply` 相同                             |
| 提交 `ref`   | 若当前提交不是指定提交，则获取并检出该提交                                          | 与 `apply` 相同                             |

两个命令都会克隆缺失的仓库；若设置了 `ref`，则会检出指定引用版本。对于分支或标签 `ref`，状态
检查会通过 `git ls-remote` 向远端查询当前提交，因此需要网络连接；若无法连接远端，仓库状态会显示
为 `differs`。提交 `ref` 则在本地检查。若未固定版本的仓库处于分离的 `HEAD` 状态，`update` 会
发出警告并跳过。

完整运行 `mise bootstrap` 会应用仓库声明；`mise bootstrap --update` 则会对仓库运行 `update`。

## 保护本地修改

mise 不会覆盖本地修改。在更改任何仓库前，如果检出项包含未提交或未跟踪的更改、目标是非空的普通
目录，或检出项的 `origin` 与 `url` 不匹配，apply 和 update 都会失败。空目录会视为缺失，并在其中
克隆仓库。

传入 `--skip-dirty` 可在显示警告后跳过有本地修改的仓库，并更新其余仓库。遇到冲突仍会在任何
更改发生前停止操作。

### origin 的匹配规则

以下形式会被视为同一仓库，主机名不区分大小写：

- `git@host:owner/repo`
- `ssh://git@host/owner/repo`
- `https://host/owner/repo`

主机、SSH 别名、端口、路径或 SSH 用户不同都属于冲突。其他 URL 必须完全匹配，只有末尾的 `/` 会被
忽略；网络 URL 末尾的 `.git` 也会被忽略。以下形式必须完全匹配：

- `http://` 和 `git://` URL；不安全的传输方式不会被视为 `https://` 形式
- 未指定用户的 SSH URL；Git 会将其解析为你的登录名，而不是 `git`
- 带查询字符串或片段的 URL，以及带用户名或密码的 `https://` URL
- 本地路径和 `file://` URL

## 在每个仓库中运行命令

[`mise bootstrap repos exec`](/cli/bootstrap/repos/exec.html) 会在每个已存在且 origin 匹配的检出项
中运行命令，包括有本地修改的检出项。它会直接运行命令，不经过 shell，并将检出目录设为工作目录；
缺失或冲突的仓库会显示警告并跳过：

```sh
mise bootstrap repos exec -- git status --short
mise bootstrap repos exec ~/src/project -- git log -1
mise bootstrap repos exec --continue-on-error -- git fetch
mise bootstrap repos exec --dry-run -- git pull
```

`--` 前的路径可将命令限制在指定检出项中。默认情况下，首次失败时就会停止；使用
`--continue-on-error` 后则会遍历所有检出项，并在最后报告全部失败项。使用 `--dry-run` 时，只会
打印每个检出项对应的命令，不会实际运行。

## 配置合并方式

跨[配置层级](/configuration.html#configuration-hierarchy)时，条目按展开后的路径合并，因此
`"~/src/project"` 和 `"/home/you/src/project"` 是同一条目。更靠近项目的配置会整体替换该路径
对应的条目。

## 移除仓库声明

mise 不会删除仓库检出目录。删除声明只会让 mise 停止管理该仓库。
[`mise bootstrap unapply`](/bootstrap/modules.html#remove-a-module-s-resources) 会报告模块声明了
多少个仓库条目，但会保留检出目录，由你自行删除。不再需要时，请手动删除目录。

## 预览并应用

使用 [`mise bootstrap repos status`](/cli/bootstrap/repos/status.html) 检查各仓库状态，并在应用前
预览将执行的 Git 命令：

```sh
mise bootstrap repos status                  # state of each repository
mise bootstrap repos status --json           # the same, as JSON
mise bootstrap repos status --missing        # exit 1 if any repository is not current
mise bootstrap repos apply --dry-run         # print the Git commands
mise bootstrap repos apply                   # clone or move checkouts to their ref
mise bootstrap repos apply --yes             # apply without prompting
mise bootstrap repos apply --skip-dirty      # skip checkouts with local changes
mise bootstrap repos update                  # also fast-forward unpinned checkouts
mise bootstrap repos update ~/src/project    # update one configured path
mise bootstrap repos update --skip-dirty     # skip checkouts with local changes
```

`update` 也接受相同的 `--dry-run` 和 `--yes` 标志。传入的路径必须与配置路径一致，可以使用原始
写法或展开后的路径。

| 状态       | 含义                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `current`  | 检出目录存在、origin 匹配，且当前版本为 `ref`                           |
| `missing`  | 路径不存在或是空目录                                                   |
| `differs`  | 检出目录没有未提交更改，但当前版本不是 `ref`                           |
| `dirty`    | 检出目录包含未提交或未跟踪的更改                                       |
| `conflict` | 路径不是目录、不是 Git 检出目录，或 origin 不同                         |

## 配置参考

| 键     | 可用值                          | 默认值                          |
| ----- | ------------------------------- | ------------------------------- |
| `url` | 仓库 URL 或路径                 | 必填                            |
| `ref` | 分支、标签或完整提交 SHA        | 无；不会移动检出版本            |

## 另请参阅

- [Bootstrap](/bootstrap.html#how-it-runs)：了解仓库操作在启动流程中的位置，位于点文件之前。
- [点文件](/dotfiles.html)：了解如何链接克隆仓库中的文件。
- [从仓库启动](/bootstrap/from-repository.html)：了解如何使用配置仓库初始化一台机器。
