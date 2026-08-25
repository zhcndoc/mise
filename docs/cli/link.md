<!-- @由 usage-cli 根据用法规范生成 -->
# `mise link`

- **用法：** `mise link [-f --force] <TOOL@VERSION> <PATH>`
- **别名：** `ln`
- **作用：** 修改状态
- **源代码：** [`src/cli/link.rs`](https://github.com/jdx/mise/blob/main/src/cli/link.rs)

将某个工具版本符号链接到 mise 中

当你要添加的安装版本是通过 mise 之外自定义编译的，或者使用其他工具构建的版本时，请使用此命令。

## 参数
- **`<TOOL@VERSION>`** — 要为其创建符号链接的工具名称和版本
- **`<PATH>`** — 工具版本的本地路径
  例如：~/.nvm/versions/node/v20.0.0

## 选项
- **`-f --force`** — 如果现有工具版本存在，则覆盖它
- **`-h --help`** — 打印帮助

示例：

```
# 使用 node-build 构建 node-20.0.0 并将其链接到 mise 中
$ node-build 20.0.0 ~/.nodes/20.0.0
$ mise link node@20.0.0 ~/.nodes/20.0.0

# 让 mise 使用 Homebrew 提供的 node 版本
$ brew install node
$ mise link node@brew $(brew --prefix node)
$ mise use node@brew
```
