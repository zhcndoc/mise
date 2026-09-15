---
description: "显示工具的可执行文件解析到的路径"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise which`

- **用法：** `mise which [FLAGS] [BIN_NAME]`
- **效果：** 只读
- **源代码：** [`src/cli/which.rs`](https://github.com/jdx/mise/blob/main/src/cli/which.rs)

显示工具的可执行文件解析到的路径

可用它来确定当前激活的是哪个版本的工具。

## 参数
- **`[BIN_NAME]`** — 要查找的可执行文件

## 标志
- **`-t --tool <TOOL@VERSION>`** — 使用指定的 tool@version
  例如：`mise which npm --tool=node@20`
- **`--plugin`** — 显示插件名称，而不是路径
- **`--version`** — 显示版本，而不是路径
- **`-h --help`** — 打印帮助

## 示例

```
mise which node
/home/username/.local/share/mise/installs/node/20.0.0/bin/node
```

```
mise which node --plugin
node
```

```
mise which node --version
20.0.0
```

<!-- 生成的参考导航 -->

## 相关文档

- [Shim 和可执行文件查找](/dev-tools/shims.html)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
