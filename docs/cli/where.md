<!-- @由 usage-cli 根据用法规范生成 -->
# `mise where`

- **用法：** `mise where <TOOL@VERSION>`
- **效果：** 只读
- **源代码：** [`src/cli/where.rs`](https://github.com/jdx/mise/blob/main/src/cli/where.rs)

显示工具的安装路径

该工具必须已安装，此命令才能生效。

## 参数
- **`<TOOL@VERSION>`** — 要查询的工具
  例如：ruby@3
  如果指定了 "@&lt;PREFIX>"，则会显示与此前缀匹配的最新已安装版本
  否则会显示当前处于活动状态的已安装版本

## 标志
- **`-h --help`** — 打印帮助

示例：

```
# 显示 node 的最新已安装版本
# 如果未安装，则报错
$ mise where node@20
/home/jdx/.local/share/mise/installs/node/20.0.0

# 显示 node 当前处于活动状态的安装目录
# 如果 node 未在任何 .tool-version 文件中被引用，则报错
$ mise where node
/home/jdx/.local/share/mise/installs/node/20.0.0
```
