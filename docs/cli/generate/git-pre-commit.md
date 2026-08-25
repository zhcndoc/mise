<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate git-pre-commit`

- **用法：** `mise generate git-pre-commit [FLAGS] [-- MISE_ARG]…`
- **别名：** `pre-commit`
- **效果：** 修改状态
- **源代码：** [`src/cli/generate/git_pre_commit.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/git_pre_commit.rs)

生成一个 git pre-commit 钩子

此命令会生成一个 git pre-commit 钩子，在你向仓库提交更改时运行类似 `mise run pre-commit` 的 mise 任务。

已暂存的文件会作为 `STAGED` 传递给该任务。

如需更高级的 pre-commit 功能，请查看 mise 的姊妹项目：<https://hk.jdx.dev/>

## 参数
- **`[-- MISE_ARG]…`** — 要嵌入生成的钩子中的 mise 标志，写在 `--` 之后

  这些参数会插入到 `mise` 和 `run` 之间，因此钩子会携带你在命令行中传递的相同上下文。当配置文件不在仓库根目录时很有用，因为 git 会从顶层目录运行钩子：`-- -C subdir` 会让钩子找到它。

## 标志
- **`-t --task <TASK>`** — 触发 pre-commit 钩子时要运行的任务

  **默认值：** `pre-commit`
- **`-w --write`** — 写入 .git/hooks/pre-commit 并使其可执行
- **`--hook <HOOK>`** — 要生成的钩子（保存到 .git/hooks/$hook）

  **默认值：** `pre-commit`
- **`-h --help`** — 打印帮助

示例：

```
$ mise generate git-pre-commit --write --task=pre-commit
$ git commit -m "feat: add new feature" # 运行 `mise run pre-commit`

# 配置位于子目录中，因此钩子必须先切换到该目录
$ mise generate git-pre-commit --write -- -C subdir
```
