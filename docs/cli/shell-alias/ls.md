<!-- @由 usage-cli 根据使用说明生成 -->
# `mise shell-alias ls`

- **用法：** `mise shell-alias ls [--no-header]`
- **别名：** `list`
- **效果：** 只读
- **源代码：** [`src/cli/shell_alias/ls.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell_alias/ls.rs)

列出 shell 别名

显示当前目录中设置的 shell 别名。
这些别名在 `mise.toml` 的 `[shell_alias]` 部分中定义。

## 选项
- **`--no-header`** — 不显示表头
- **`-h --help`** — 打印帮助

示例：

```
$ mise shell-alias ls
alias    command
ll       ls -la
gs       git status
```
