# 仓库 <Badge type="warning" text="experimental" />

mise 可以在 `[bootstrap.repos]` 中声明 git 仓库，并使用
`mise bootstrap repos apply` 应用它们：

```toml
[bootstrap.repos]
"~/src/dotfiles" = { url = "git@github.com:jdx/dotfiles.git", ref = "main" }
"~/src/mise" = { url = "https://github.com/jdx/mise.git" }
```

每个键都是目标路径。`url` 是必需的。可选的 `ref` 可以是
分支、标签或完整的 commit SHA。

仓库会在 `[bootstrap.packages]` 之后、`[dotfiles]` 之前运行，因此一个 bootstrap
配置可以安装 `git`，克隆一个 dotfiles 仓库，然后从该检出目录应用 dotfiles。

## 语义

- **声明式且按路径键控** — 条目会在配置层级中按展开后的目标路径进行合并。更本地的配置会替换该路径对应的完整仓库条目。
- **仅安全更新** — mise 只会克隆缺失的仓库或空的目标目录，并且仅当工作区是干净的且配置的 `origin` URL 匹配时，才会更新现有仓库。
- **无隐式写入** — 仓库仅通过 `mise bootstrap repos apply` 或 `mise bootstrap` 应用。
- **不强制重置** — 脏仓库、非空的非 git 目标路径，以及不匹配的 origin 都会失败，而不会覆盖本地工作。
- **省略 `ref`** — 具有预期 origin 的现有仓库会被视为最新；mise 不会获取或更新它。

## 命令

```sh
mise bootstrap repos status            # 显示仓库检出状态
mise bootstrap repos status --json     # 机器可读
mise bootstrap repos status --missing  # 如果有任何仓库不是最新则退出 1

mise bootstrap repos apply           # 克隆或更新缺失/已更改的仓库
mise bootstrap repos apply --dry-run # 打印命令但不执行
mise bootstrap repos apply --yes     # 跳过确认提示
```

## 状态

| 状态         | 含义                                         |
| ------------ | -------------------------------------------- |
| `current`    | 仓库存在，origin 匹配，且 ref 匹配           |
| `missing`    | 目标路径不存在或为空                         |
| `differs`    | 仓库是干净的，但不在配置的 ref 上            |
| `dirty`      | 仓库有本地更改或未跟踪文件                   |
| `conflict`   | 目标路径不是预期的 git 仓库                  |
