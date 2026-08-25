<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise sync python`

- **用法：** `mise sync python [--pyenv] [--uv]`
- **作用：** 修改状态
- **源代码：** [`src/cli/sync/python.rs`](https://github.com/jdx/mise/blob/main/src/cli/sync/python.rs)

将外部工具中的所有工具版本符号链接到 mise 中

例如，可用它将所有 pyenv 安装导入到 mise 中

这不会覆盖受管理的安装、运行时别名或来自其他提供程序的链接。

## 标志
- **`--pyenv`** — 从 pyenv 获取工具版本
- **`--uv`** — 与 uv 同步工具版本（双向同步）
- **`-h --help`** — 打印帮助

示例：

```
pyenv install 3.11.0
mise sync python --pyenv
mise use -g python@3.11.0 - 使用 pyenv 提供的 python

uv python install 3.11.0
mise install python@3.10.0
mise sync python --uv
mise x python@3.11.0 -- python -V - 使用 uv 提供的 python
uv run -p 3.10.0 -- python -V - 使用 mise 提供的 python
```
