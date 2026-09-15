---
description: "将工具版本安装到特定路径"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise install-into`

- **用法：** `mise install-into <TOOL@VERSION> <PATH>`
- **作用：** 修改状态
- **源代码：** [`src/cli/install_into.rs`](https://github.com/jdx/mise/blob/main/src/cli/install_into.rs)

将工具版本安装到特定路径

用于将工具构建到某个目录中，以便在 mise 之外使用

## 参数
- **`<TOOL@VERSION>`** — 要安装的工具，例如：node@20
- **`<PATH>`** — 工具安装到的路径

## 标志
- **`-h --help`** — 打印帮助

## 示例

将 node@20.0.0 安装到 ./mynode

```
mise install-into node@20.0.0 ./mynode && ./mynode/bin/node -v
v20.0.0
```

<!-- 生成的参考导航 -->

## 相关文档

- [开发工具](/dev-tools/)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
