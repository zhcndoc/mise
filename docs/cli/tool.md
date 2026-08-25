<!-- 由 usage-cli 根据用法规范生成 -->
# `mise tool`

- **用法：** `mise tool [FLAGS] <TOOL>`
- **作用：** 只读
- **源代码：** [`src/cli/tool.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool.rs)

获取有关工具的信息。

## 参数
- **`<TOOL>`** — 要获取信息的工具名称

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--active`** — 仅显示活动版本
- **`--backend`** — 仅显示后端字段
- **`--config-source`** — 仅显示配置源
- **`--description`** — 仅显示描述字段
- **`--installed`** — 仅显示已安装版本
- **`--requested`** — 仅显示请求的版本
- **`--tool-options`** — 仅显示工具选项
- **`-h --help`** — 打印帮助

示例：

```
$ mise tool node
Backend:            core
Installed Versions: 20.0.0 22.0.0
Active Version:     20.0.0
Requested Version:  20
Config Source:      ~/.config/mise/mise.toml
Tool Options:       [none]
```
