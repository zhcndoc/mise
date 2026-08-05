<!-- 由 usage-cli 根据用法规范生成 -->
# `mise tasks deps`

- **用法**: `mise tasks deps [FLAGS] [TASKS]…`
- **作用**: 只读
- **源代码**: [`src/cli/tasks/deps.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/deps.rs)

显示依赖图的树状可视化表示。

## 参数

### `[TASKS]…`

要显示依赖关系的任务  
可以通过空格分隔来指定多个任务  
例如：mise tasks deps lint test check

## 标志

### `--compact`

在首次出现后折叠重复的依赖项

### `--dot`

以 DOT 格式显示依赖关系

### `--hidden`

显示隐藏任务

示例：

```
# 显示所有任务的依赖关系
$ mise tasks deps

# 显示 "lint"、"test" 和 "check" 任务的依赖关系
$ mise tasks deps lint test check

# 以 DOT 格式显示依赖关系
$ mise tasks deps --dot

# 在首次出现后折叠重复的依赖项
$ mise tasks deps --compact
```
