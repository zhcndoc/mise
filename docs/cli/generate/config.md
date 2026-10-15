---
description: "生成一个 mise.toml 文件"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate config`

- **Usage:** `mise generate config [FLAGS] [PATH]`
- **Effect:** destructive — may delete or irreversibly overwrite
- **Source code:** [`src/cli/generate/config.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/config.rs)

生成一个 mise.toml 文件。

Same as `mise edit`, which has the details. It opens the interactive editor, or
without an interactive terminal (or with --yes) writes a commented starter
template. If PATH already exists it stops with an error rather than replace
the file; pass --force to replace it.

## Arguments
- **`[PATH]`** — Config file to edit or create; defaults to mise.toml

## Flags
- **`-g --global`** — Generate the global config file (~/.config/mise/config.toml)
- **`-n --dry-run`** — Print the result instead of writing it to the file
- **`-f --force`** — Replace an existing file with the starter template when not opening the editor
- **`-t --tool-versions <FILE>`** — Copy the tools from this .tool-versions file into the config, without opening the editor
- **`-h --help`** — Print help

## 示例

Edit mise.toml in the current directory

```
mise generate config
```

Print the result instead of writing it

```
mise generate config -n
```

<!-- 已生成引用导航 -->

## 相关文档

- [配置](/configuration.html)。
- [`mise generate <SUBCOMMAND>`](/cli/generate.html)。
- [全局标志和参数语法](/cli/#global-flags)。
