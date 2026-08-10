<!-- @由 usage-cli 根据用法规范生成 -->
# `mise shell`

- **用法**: `mise shell [FLAGS] <TOOL@VERSION>…`
- **别名**: `sh`
- **作用**: 只读
- **源代码**: [`src/cli/shell.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell.rs)

为当前会话设置工具版本。

仅在 mise 已经激活的会话中有效。

其工作方式是为当前 shell 会话设置环境变量，
例如 `MISE_NODE_VERSION=20`，这些变量会被 `mise activate` 创建的 shell 函数进行“eval”执行。

## 参数

### `<TOOL@VERSION>…`

要使用的工具

## 标志

### `-j --jobs <JOBS>`

并行运行的任务数  
小于 1 的值将按 1 处理  
[默认值：4]

### `-u --unset`

移除先前设置的版本

### `--raw`

将后端安装命令的 stdin/stdout/stderr 直接连接到终端，意味着 --jobs=1

示例：

```
$ mise shell node@20
$ node -v
v20.0.0
```
