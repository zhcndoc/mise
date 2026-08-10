<!-- 由 usage-cli 根据用法规范生成 -->
# `mise test-tool`

- **用法**: `mise test-tool [FLAGS] [TOOLS]…`
- **源代码**: [`src/cli/test_tool.rs`](https://github.com/jdx/mise/blob/main/src/cli/test_tool.rs)

测试一个工具是否能够安装并执行。

## 参数

### `[TOOLS]…`

要测试的工具

## 标志

### `-a --all`

测试 registry/ 中指定的每个工具

### `-j --jobs <JOBS>`

并行运行的工具测试数量  
小于 1 的值将按 1 处理  
[默认值：4]

### `--all-config`

测试配置文件中指定的所有工具

### `--include-non-defined`

也测试 registry/ 中未定义的工具，并尝试猜测如何测试它

### `--raw`

将后端安装命令的 stdin/stdout/stderr 直接连接到终端，意味着 --jobs=1

示例：

```
mise test-tool ripgrep
```
