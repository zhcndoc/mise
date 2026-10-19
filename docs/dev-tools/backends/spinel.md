---
description: "使用 Spinel 将 GitHub 上的 Ruby 命令行工具编译为原生可执行文件。"
---

# spinel 后端 <Badge type="warning" text="实验性" />

`spinel` 后端使用 Matz 开发的 Ruby 提前编译器 [Spinel](https://github.com/matz/spinel)，将 GitHub 仓库中的 Ruby 命令行工具编译为原生可执行文件。生成的程序无需安装 Ruby 或 Spinel 即可运行。

::: warning 实验性
此后端可能会发生变化；如果 Spinel 或此后端不再适合维护，也可能被移除。使用它安装工具需要设置 `experimental = true`，并且只有启用该设置后，`mise edit` 才会提供此后端。
:::

## 要求

- macOS 或 Linux；不支持 Windows
- `git`
- `PATH` 中的 `spinel` 编译器，或在 [`spinel`](#spinel) 工具选项中指定其路径。Spinel 以源码形式发布；构建方法请参阅其[快速开始](https://github.com/matz/spinel#quick-start)。
- C 编译器；Spinel 会调用它生成可执行文件

Spinel 只支持 Ruby 语言的部分功能，因此许多 Ruby 工具无法编译。此后端只编译单个入口文件，不会安装 gem、复制数据文件或获取子模块。

## 用法

大多数工具需要指定入口文件等选项，因此请在 `mise.toml` 中声明：

```toml
[settings]
experimental = true

[tools."spinel:tobi/try"]
version = "1.10.1"
entrypoint = "try.rb"
bin = "try"
tag_prefix = "v"
```

然后安装工具：

```sh
mise install
```

mise 会获取标签 `v1.10.1`，编译 `try.rb`，并将可执行文件写入安装目录中的 `bin/try`。

`mise ls-remote spinel:tobi/try` 使用 `git ls-remote` 列出仓库的 Git 标签，因此无需 GitHub 令牌。设置 `tag_prefix = "v"` 后，标签 `v1.10.1` 会作为版本 `1.10.1` 显示。

mise 会保留 `git ls-remote` 返回的字母顺序，且此后端不支持 `version_order`。当版本号位数不同时，`latest` 可能因此选中较旧发行版，例如选择 `1.9.3` 而不是 `1.10.1`。请固定版本。

## 工具选项

### `entrypoint`

相对于仓库根目录的 Ruby 源文件路径。默认为 `main.rb`。

### `bin`

写入 `bin/` 的可执行文件名称。默认为仓库名称。

### `tag_prefix` {#tag-prefix}

Git 标签中版本号前的文本，例如 `v`。mise 只会列出以该前缀开头的标签，并在显示版本时移除此前缀。未设置时，所有标签都会作为版本列出。

### `source_ref` {#source-ref}

要构建的完整 40 字符提交 SHA，以此代替标签。此时版本仅作为标签使用。

### `spinel`

要运行的编译器名称或路径。默认为 `PATH` 中的 `spinel`。

## 故障排查

| 消息                                          | 检查内容                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `spinel may be required but was not found`    | 构建 Spinel 并将其加入 `PATH`，或设置 [`spinel`](#spinel) 选项。                                 |
| `spinel did not produce an executable`        | 查看错误上方的编译器输出；入口文件可能使用了 Spinel 不支持的 Ruby 特性。                          |
| `the spinel backend does not support Windows` | 请在 macOS 或 Linux 上安装该工具。                                                              |

实现：[`src/backend/spinel.rs`](https://github.com/jdx/mise/blob/main/src/backend/spinel.rs)。
