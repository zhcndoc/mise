<!-- @由 usage-cli 根据用法规范生成 -->
# `mise generate task-docs`

- **用法**：`mise generate task-docs [FLAGS]`
- **影响**：修改状态
- **源代码**：[`src/cli/generate/task_docs.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/task_docs.rs)

为项目中的任务生成文档。

## 标志

### `-i --inject`

将文档插入到现有文件中

此命令会查找特殊注释 `<!-- mise-tasks -->`，并将其替换为生成的文档。
它会替换该注释与下一个注释 `<!-- /mise-tasks -->` 之间的所有内容，因此可以在同一文件上多次运行以更新文档。
文件必须已经包含这两个注释；如果缺少其中任何一个，mise 将报错，而不会修改文件。

### `-I --index`

仅写入任务索引，供 `--multi` 使用

### `-m --multi`

将每个任务渲染为单独的文档，要求 `--output` 是一个目录

### `-o --output <OUTPUT>`

将生成的文档写入文件/目录

### `-r --root <ROOT>`

搜索任务的根目录

### `-s --style <STYLE>`

**可选值：**

- `simple`
- `detailed`

**默认值：** `simple`

示例：

```
mise generate task-docs
```
