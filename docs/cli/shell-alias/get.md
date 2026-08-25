<!-- 由 usage-cli 根据用法规范生成 -->
# `mise shell-alias get`

- **Usage:** `mise shell-alias get <shell_alias>`
- **Effect:** 只读
- **Source code:** [`src/cli/shell_alias/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/shell_alias/get.rs)

显示某个 shell 别名的命令

## 参数
- **`<shell_alias>`** — 要显示的别名

## 标志
- **`-h --help`** — 打印帮助

示例：

```
$ mise shell-alias get ll
ls -la
```
