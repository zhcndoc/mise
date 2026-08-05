<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate git-pre-commit`

- **用法**: `mise generate git-pre-commit [FLAGS]`
- **别名**: `pre-commit`
- **作用**: 修改状态
- **源代码**: [`src/cli/generate/git_pre_commit.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/git_pre_commit.rs)

生成一个 git pre-commit 钩子

此命令会生成一个 git pre-commit 钩子，在你向仓库提交更改时运行类似 `mise run pre-commit` 的 mise 任务。

已暂存的文件会作为 `STAGED` 传递给该任务。

如需更高级的 pre-commit 功能，请查看 mise 的姊妹项目：<https://hk.jdx.dev/>

## 标志

### `-t --task <TASK>`

当 pre-commit 钩子被触发时运行的任务

**默认：** `pre-commit`

### `-w --write`

写入 `.git/hooks/pre-commit` 并使其可执行

### `--hook <HOOK>`

要生成哪个钩子（保存到 `.git/hooks/$hook`）

**默认：** `pre-commit`

示例：

```
mise generate git-pre-commit --write --task=pre-commit
git commit -m "feat: add new feature" # 运行 `mise run pre-commit`
```
