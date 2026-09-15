---
description: "显示设置的有效值"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise settings get`

- **用法：** `mise settings get [-l --local] <SETTING>`
- **效果：** 只读
- **源代码：** [`src/cli/settings/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/get.rs)

显示设置的有效值

包括默认值、配置和环境覆盖。使用 `--local` 时，仅读取所选本地配置中的显式设置；未设置的键将报错
使用 `mise config get settings.KEY --file path/to/mise.toml` 检查单个文件

## 参数
- **`<SETTING>`** — 要显示的设置

## 标志
- **`-l --local`** — 使用本地配置文件而不是全局配置文件
- **`-h --help`** — 打印帮助

## 示例

```
mise settings get jobs
mise settings get python.compile
```

<!-- 生成的参考导航 -->

## 相关文档

- [设置参考](/configuration/settings.html)。
- [`mise settings [FLAGS] [SETTING] [VALUE] [SUBCOMMAND]`](/cli/settings.html)。
- [全局标志和参数语法](/cli/#global-flags)。
