<!-- @由 usage-cli 根据用法规范生成 -->
# `mise cache clear`

- **用法**：`mise cache clear [--task <TASK>] [TOOL]…`
- **别名**：`c`
- **效果**：修改状态
- **源代码**：[`src/cli/cache/clear.rs`](https://github.com/jdx/mise/blob/main/src/cli/cache/clear.rs)

删除 mise 中的所有缓存文件。

## 参数

### `[TOOL]…`

用于清除缓存的工具，例如：node、python

## 标志

### `--task <TASK>`

清除任务名称或模式对应的输出缓存条目
