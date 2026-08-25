<!-- @由 usage-cli 根据使用规范生成 -->
# `mise fmt`

- **用法：** `mise fmt [FLAGS]`
- **效果：** 修改状态
- **源代码：** [`src/cli/fmt.rs`](https://github.com/jdx/mise/blob/main/src/cli/fmt.rs)

格式化 mise.toml

对 mise.toml 中的键进行排序并清理空白字符。

## 标志
- **`-a --all`** — 格式化当前目录中的所有文件
- **`-c --check`** — 检查配置是否已格式化，不执行格式化
- **`-s --stdin`** — 从标准输入读取配置，并将格式化后的版本写入标准输出
- **`-h --help`** — 输出帮助

示例：

```
mise fmt
```
