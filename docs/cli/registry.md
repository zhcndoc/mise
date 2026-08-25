<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise registry`

- **用法：** `mise registry [FLAGS] [NAME]`
- **效果：** 只读
- **源代码：** [`src/cli/registry.rs`](https://github.com/jdx/mise/blob/main/src/cli/registry.rs)

列出可安装的工具

此命令会以简写名称列出注册表中可用的工具。

例如，`poetry` 是 `asdf:mise-plugins/mise-poetry` 的简写。

## 参数
- **`[NAME]`** — 仅显示指定工具的完整名称

## 标志
- **`-b --backend <BACKEND>`** — 仅显示此后端对应的工具
- **`--hide-aliased`** — 隐藏别名工具
- **`-J --json`** — 以 JSON 格式输出
- **`--security`** — 在 JSON 输出中包含每个工具后端的安全功能。

  需要使用 --json。安全信息会在工具的所有后端之间去重。由于每个后端的安全信息都需要单独解析，对于大型列表，这可能会显著增加耗时。
- **`-h --help`** — 打印帮助

示例：

```
$ mise registry
node    core:node
poetry  asdf:mise-plugins/mise-poetry
ubi     cargo:ubi-cli

$ mise registry poetry
asdf:mise-plugins/mise-poetry
```
