<!-- @由 usage-cli 根据用法规范生成 -->
# `mise bin-paths`

- **用法**: `mise bin-paths [--bin-names] [-J --json] [TOOL@VERSION]…`
- **作用**: 只读
- **源代码**: [`src/cli/bin_paths.rs`](https://github.com/jdx/mise/blob/main/src/cli/bin_paths.rs)

列出所有已激活的运行时二进制路径。

## 参数

### `[TOOL@VERSION]…`

要查找的工具  
例如：ruby@3

## 标志

### `--bin-names`

输出可执行文件名称，而不是 bin 目录

### `-J --json`

以 JSON 格式输出可执行条目（隐含 --bin-names）
