<!-- @由 usage-cli 根据使用规范生成 -->
# `mise env`

- **用法：** `mise env [FLAGS] [TOOL@VERSION]…`
- **别名：** `e`
- **效果：** 只读
- **源代码：** [`src/cli/env.rs`](https://github.com/jdx/mise/blob/main/src/cli/env.rs)

导出环境变量以临时激活 mise 一次

如果你不想永久安装 mise，可以使用这个命令。如果你的 shell rc 文件中已经有 `mise activate`，那就不需要使用它。

## 参数
- **`[TOOL@VERSION]…`** — 要使用的工具

## 标志
- **`-D --dotenv`** — 以 dotenv 格式输出
- **`-J --json`** — 以 JSON 格式输出
- **`-s --shell <SHELL>`** — 为其生成环境变量的 Shell 类型

  **选项：** `bash`、`elvish`、`fish`、`nu`、`xonsh`、`zsh`、`pwsh`、`powershell`
- **`--json-extended`** — 以包含额外信息（来源、工具）的 JSON 格式输出
- **`--redacted`** — 仅显示已隐藏的环境变量
- **`--values`** — 仅显示环境变量的值
- **`-h --help`** — 输出帮助

示例：

```
eval "$(mise env -s bash)"
eval "$(mise env -s zsh)"
mise env -s fish | source
execx($(mise env -s xonsh))
```
