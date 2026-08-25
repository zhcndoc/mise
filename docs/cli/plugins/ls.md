<!-- @由 usage-cli 根据使用规范生成 -->
# `mise plugins ls`

- **用法：** `mise plugins ls [-o --outdated] [-u --urls]`
- **别名：** `list`
- **效果：** 只读
- **源代码：** [`src/cli/plugins/ls.rs`](https://github.com/jdx/mise/blob/main/src/cli/plugins/ls.rs)

列出已安装的插件

也可以显示可远程安装的插件。

## 标志
- **`-o --outdated`** — 显示有可用更新的插件
  检查远程端是否有更新版本，仅显示已过时的插件
- **`-u --urls`** — 显示每个插件的 Git URL
  例如：<https://github.com/mise-plugins/vfox-cmake.git>
- **`-h --help`** — 打印帮助

示例：

```
$ mise plugins ls
cmake
poetry

$ mise plugins ls --urls
cmake     https://github.com/mise-plugins/vfox-cmake.git
poetry    https://github.com/mise-plugins/vfox-poetry.git
```
