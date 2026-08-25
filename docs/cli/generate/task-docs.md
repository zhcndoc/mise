<!-- @由 usage-cli 根据用法规范生成 -->
# `mise generate task-docs`

- **用法：** `mise generate task-docs [FLAGS]`
- **效果：** 修改状态
- **源代码：** [`src/cli/generate/task_docs.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/task_docs.rs)

为项目中的任务生成文档。

## 标志
- **`-i --inject`** — 将文档插入现有文件

  此操作会查找特殊注释 `<!-- mise-tasks -->`，并将其替换为生成的文档。它会替换此注释与下一个注释 `<!-- /mise-tasks -->` 之间的所有内容，因此可以在同一个文件上多次运行，以更新文档。如果文件中缺少这两个注释，文件必须已经包含它们；否则 mise 会报错，而不会修改文件。
- **`-I --index`** — 仅写入任务索引， intended for use with `--multi`
- **`-m --multi`** — 将每个任务呈现为单独的文档，需要将 `--output` 指定为目录
- **`-o --output <OUTPUT>`** — 将生成的文档写入文件或目录
- **`-r --root <ROOT>`** — 搜索任务的根目录
- **`-s --style <STYLE>`**

  **选项：** `simple`、`detailed`

  **默认值：** `simple`
- **`-h --help`** — 打印帮助

示例：

```
mise generate task-docs
```
