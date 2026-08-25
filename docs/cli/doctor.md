<!-- @由 usage-cli 根据用法规范生成 -->
# `mise doctor`

- **用法：** `mise doctor [-J --json] <SUBCOMMAND>`
- **别名：** `dr`
- **效果：** 只读
- **源代码：** [`src/cli/doctor/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/doctor/mod.rs)

检查 mise 安装中可能存在的问题。

## 标志
- **`-J --json`**
- **`-h --help`** — 打印帮助

## 子命令

- [`mise doctor path [-f --full]`](/cli/doctor/path.md)

示例：

```
$ mise doctor
[WARN] plugin node is not installed
```
