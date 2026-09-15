---
description: "从配置中移除工具请求并清理未使用的安装"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise unuse`

- **用法：** `mise unuse [FLAGS] <INSTALLED_TOOL@VERSION>…`
- **别名：** `rm`、`remove`
- **效果：** 具有破坏性 — 可能删除或不可逆地覆盖
- **源代码：** [`src/cli/unuse.rs`](https://github.com/jdx/mise/blob/main/src/cli/unuse.rs)

从配置中移除工具请求并清理未使用的安装

如果不指定选择器，mise 会编辑第一个声明了所请求工具之一的已加载配置。使用 `--path`、`--global` 或 `--env` 可选择特定文件。版本参数会逐字匹配已配置的请求：要移除 `node = "20"`，请使用 `mise unuse node@20`，而不是它解析到的具体已安装版本。省略版本可从选定文件中移除该工具的所有请求。

只有在没有剩余的受跟踪配置或工具存根需要这些版本时，才会清理版本。传递 `--no-prune` 可编辑配置，同时保留安装。若要在不编辑配置的情况下移除安装，请使用 `mise uninstall`。

## 参数
- **`<INSTALLED_TOOL@VERSION>…`** — 要移除的工具

## 标志
- **`-e --env <ENV>`** — 如果 `.mise.<env>.toml` 存在，则修改该文件，否则修改 `mise.<env>.toml`
- **`-g --global`** — 使用全局配置文件（`~/.config/mise/config.toml`），而不是本地配置文件
- **`-p --path <PATH>`** — 指定配置文件或目录的路径

  如果指定的是目录，则会按照目标文件选择规则在该目录中查找配置文件。

  **别名：** `--file`
- **`--no-prune`** — 不要同时清理已安装的版本
- **`-h --help`** — 打印帮助信息

## 示例

从 mise.toml 中移除 node@18.0.0 并卸载它

```
mise unuse node@18.0.0
```

改为从全局配置中移除它

```
mise unuse -g node@18.0.0
```

从 mise.local.toml 中移除字面值为 node@20 的请求

```
mise unuse --env local node@20
```

从 mise.staging.toml 中移除字面值为 node@20 的请求

```
mise unuse --env staging node@20
```

<!-- 生成的参考导航 -->

## 相关文档

- [配置写入目标](/configuration.html#target-file-for-write-operations)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
