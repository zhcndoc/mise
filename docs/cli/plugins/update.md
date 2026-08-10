<!-- @由 usage-cli 根据用法规范生成 -->
# `mise plugins update`

- **用法**：`mise plugins update [-j --jobs <JOBS>] [PLUGIN]…`
- **别名**：`up`、`upgrade`
- **作用**：修改状态
- **源代码**：[`src/cli/plugins/update.rs`](https://github.com/jdx/mise/blob/main/src/cli/plugins/update.rs)

将插件更新到最新版本

注意：这会更新插件本身，而不是运行时版本。

## 参数

### `[PLUGIN]…`

要更新的插件

## 标志

### `-j --jobs <JOBS>`

要并行运行的任务数  
小于 1 的值将按 1 处理  
默认值：4

示例：

```
mise plugins update              # 更新所有插件
mise plugins update cmake       # 仅更新 cmake
mise plugins update cmake#beta  # 指定一个引用
```
