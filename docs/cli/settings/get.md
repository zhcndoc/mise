---
description: "显示设置的有效值"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise settings get`

- **用法：** `mise settings get [-l --local] <SETTING>`
- **效果：** 只读
- **源代码：** [`src/cli/settings/get.rs`](https://github.com/jdx/mise/blob/main/src/cli/settings/get.rs)

显示设置的有效值

Includes defaults, config files, and environment overrides. With `--local`,
reads only the explicit settings in the nearest project config, and a
setting that is not set there is an error. An optional setting with no
default that is not set anywhere, such as `python.compile`, is also reported
as not set and exits with an error. To inspect one file, use
`mise config get settings.KEY --file path/to/mise.toml`.

## 参数
- **`<SETTING>`** — 要显示的设置

## Flags
- **`-l --local`** — Read only the explicit settings in the nearest project config
- **`-h --help`** — Print help

## 示例

Show the effective number of parallel jobs

```
mise settings get jobs
```

Show the value set in the project config

```
mise settings get --local experimental
```

<!-- 生成的参考导航 -->

## 相关文档

- [设置参考](/configuration/settings.html)。
- [`mise settings [FLAGS] [SETTING] [VALUE] [SUBCOMMAND]`](/cli/settings.html)。
- [全局标志和参数语法](/cli/#global-flags)。
