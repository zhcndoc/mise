<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap packages status`

- **用法：** `mise bootstrap packages status [-J --json] [--missing]`
- **别名：** `ls`
- **作用：** 只读
- **源代码：** [`src/cli/system/status.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/status.rs)

显示 `[bootstrap.packages]` 中系统包的状态。

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--missing`** — 如果任何已配置的包不处于其期望状态，则以代码 1 退出
- **`-h --help`** — 打印帮助

示例：

```
mise bootstrap packages status
mise bootstrap packages status --json
mise bootstrap packages status --missing # 如果有任何内容未同步，则退出 1
```
