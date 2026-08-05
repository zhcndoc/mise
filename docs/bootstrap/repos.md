# 仓库

mise 可以在 `[bootstrap.repos]` 中声明 Git 仓库，并通过
`mise bootstrap repos apply` 或作为 [`mise bootstrap`](/bootstrap.html) 的一部分应用这些仓库：

```toml
[bootstrap.repos]
"~/src/dotfiles" = { url = "git@github.com:jdx/dotfiles.git", ref = "main" }
"~/src/mise" = { url = "https://github.com/jdx/mise.git" }
```

每个键都是目标路径。`url` 是必需的。可选的 `ref` 可以是
分支、标签或完整的 commit SHA。

目标路径可以是绝对路径、以 `~/` 开头的路径，或相对路径。相对路径
会根据声明它们的配置文件的项目根目录进行解析，并且必须指向其中的一个目录——
不能是空路径或 `.`，也不能通过 `..` 或绝对路径片段逃逸出根目录。因此，相对路径
仅在项目配置中有效，在全局配置（例如 `~/.config/mise/config.toml`）中无效。

仓库会在 `[bootstrap.packages]` 之后、`[dotfiles]` 之前运行，因此引导配置可以安装
`git`、克隆 dotfiles 仓库，然后从该检出目录应用 dotfiles。

## 语义

- **声明式且按路径键控** — 条目会按照展开后的目标路径跨配置层级合并。对于该路径，更本地的配置会替换完整的仓库条目。
- **仅执行安全更新** — mise 会克隆缺失的仓库或空的目标目录，并且仅在工作树干净且配置的 `origin` URL 匹配时更新现有仓库。仅比较以下三种与传输方式无关的网络 URL 形式：`git@host:path`、`ssh://git@host/path` 和 `https://host/path` 会被视为同一个仓库。不同的主机、SSH 别名、显式端口、路径或非 `git` 的 SSH 用户仍会产生冲突。其他情况都要求完全匹配：`http://` 和 `git://` origin（不安全的传输方式绝不会被静默视为 https 配置）、不带用户的 SSH origin（git 会将其解析为登录用户，而不是 `git`）、带查询字符串的 URL、本地路径以及 `file://` URL。
- **不隐式写入** — 只有通过显式的 `apply`、`update`、`exec` 或顶层 `mise bootstrap` 命令，才会修改仓库。执行应用操作时，若未配置 `ref`，绝不会拉取现有仓库；如需此命令式行为，请使用 `mise bootstrap repos update`。
- **不强制重置** — 脏仓库、非空的非 git 目标路径以及不匹配的 origin 都会失败，而不会覆盖本地工作。
- **省略 `ref`** — 如果现有仓库的 origin 符合预期，则视为当前最新状态；mise 不会对其执行获取或更新。

## 命令

```sh
mise bootstrap repos status            # 显示仓库检出状态
mise bootstrap repos status --json     # 机器可读
mise bootstrap repos status --missing  # 如果有任何仓库不是最新则退出 1

mise bootstrap repos apply           # 克隆或更新缺失/已变更的仓库
mise bootstrap repos apply --dry-run # 输出命令但不执行
mise bootstrap repos apply --yes     # 跳过确认提示

mise bootstrap repos update             # 克隆缺失的仓库并拉取现有仓库
mise bootstrap repos update ~/src/mise  # 仅更新匹配的路径
mise bootstrap repos update --dry-run   # 输出命令但不执行
mise bootstrap repos update --yes       # 跳过确认提示

mise bootstrap repos exec -- git status        # 在每个可用仓库中运行 argv
mise bootstrap repos exec ~/src/mise -- git pull
mise bootstrap repos exec --continue-on-error -- command
mise bootstrap repos exec --dry-run -- command
```

`update` 会获取并快进拉取未配置 `ref` 的仓库当前分支。对于处于分离 HEAD 状态的未固定仓库，它会发出警告并跳过。存在未提交更改的仓库、远程地址冲突的仓库以及非 Git 目标会在任何仓库发生更改之前失败。传入一个或多个路径后，只会更新完全匹配的已配置路径或其展开形式。

`exec` 会直接运行命令，不进行 shell 插值，并以每个仓库作为工作目录。缺失或冲突的仓库会被跳过并发出警告。除非设置 `--continue-on-error`，否则它会在第一个命令失败时停止；在该模式下，它会访问每个可用仓库，并在最后报告所有失败。

## 状态

| 状态         | 含义                                         |
| ------------ | -------------------------------------------- |
| `current`    | 仓库存在，origin 匹配，且 ref 匹配           |
| `missing`    | 目标路径不存在或为空                         |
| `differs`    | 仓库是干净的，但不在配置的 ref 上            |
| `dirty`      | 仓库有本地更改或未跟踪文件                   |
| `conflict`   | 目标路径不是预期的 git 仓库                  |
