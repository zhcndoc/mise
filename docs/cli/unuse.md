---
description: "从配置文件中移除工具请求，并清理不再使用的安装"
---

<!-- 由 usage-cli 根据使用规范生成 -->
# `mise unuse`

- **用法：** `mise unuse [FLAGS] <INSTALLED_TOOL@VERSION>…`
- **别名：** `rm`、`remove`
- **效果：** 具有破坏性 — 可能删除或不可逆地覆盖
- **源代码：** [`src/cli/unuse.rs`](https://github.com/jdx/mise/blob/main/src/cli/unuse.rs)

Remove tool requests from config files and prune unused installations

Without `--path`, `--global`, or `--env`, mise edits the first loaded config
that declares one of the tools; in your home directory it edits the global
config. A version argument matches the configured request literally: to
remove `node = "20"`, use `mise unuse node@20`, not the installed version it
resolved to. Omit the version to remove every request for that tool from the
selected file.

Versions are pruned only when no remaining tracked config or tool stub needs
them. Pass `--no-prune` to edit the config and keep the installations. To
remove an installation without editing config, use `mise uninstall`.

## Arguments
- **`<INSTALLED_TOOL@VERSION>…`** — Tools to remove from the config, with the version written as in the config

## Flags
- **`-e --env <ENV>`** — Edit mise.&lt;ENV>.toml in the current directory, or .mise.&lt;ENV>.toml if that exists

  Not the same as the global -E, which only chooses which config files are loaded.
- **`-g --global`** — Use the global config file (`~/.config/mise/config.toml`) instead of the local one
- **`-p --path <PATH>`** — Edit this config file, or the config file in this directory

  **别名：** `--file`
- **`--override`** — 写入优先级高于所有项目配置的全局 override 文件 `config.override.toml`。使用 `--env` 时，则写入 `config.<ENV>.override.toml`。详见 <https://mise.jdx.dev/configuration.html#override-file>
- **`--no-prune`** — 不要同时清理已安装的版本
- **`-h --help`** — 打印帮助信息

## 示例

Remove node@22.0.0 from mise.toml and uninstall it if nothing else uses it

```
mise unuse node@22.0.0
```

Remove it from the global config instead

```
mise unuse -g node@22.0.0
```

Remove the node@20 request from mise.staging.toml

```
mise unuse --env staging node@20
```

<!-- 生成的参考导航 -->

## 相关文档

- [Removing tools](/dev-tools/#remove-tools).
- [All commands](/cli/).
- [Global flags and argument syntax](/cli/#global-flags).
