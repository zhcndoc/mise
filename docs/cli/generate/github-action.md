<!-- 由 usage-cli 根据用法规范生成 -->
# `mise generate github-action`

- **用法：** `mise generate github-action [FLAGS]`
- **效果：** 修改状态
- **源代码：** [`src/cli/generate/github_action.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/github_action.rs)

生成一个 GitHub Action 工作流文件

此命令会生成一个 GitHub Action 工作流文件，在你向仓库推送更改时运行一个 mise 任务，例如 `mise run ci`。

## 选项
- **`-t --task <TASK>`** — 工作流触发时运行的任务

  **默认值：** `ci`
- **`-w --write`** — 写入 .github/workflows/$name.yml
- **`--name <NAME>`** — 要生成的工作流名称

  **默认值：** `ci`
- **`-h --help`** — 打印帮助

示例：

```
mise generate github-action --write --task=ci
git commit -m "feat: add new feature"
git push # 在 GitHub 上运行 `mise run ci`
```
