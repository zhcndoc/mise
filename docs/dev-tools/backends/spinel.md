---
description: "使用实验性的 Spinel 后端从 GitHub 源代码编译 Ruby 命令行工具。"
---

# Spinel 后端 <Badge type="warning" text="实验性" />

`spinel:` 后端使用 [Spinel](https://github.com/matz/spinel)（Matz 的 Ruby AOT 编译器）将 GitHub
仓库中的 Ruby 命令行工具编译为本机可执行文件。生成的程序运行时既不需要 Ruby，也不需要 Spinel。

::: warning
此后端处于实验阶段，未来可能被移除。Spinel 尚处于早期阶段，只有在 Spinel 发展起来且此后端仍易于维护时，
才值得保留。如果其中任一条件不再满足，它就会被移除。使用 `mise settings experimental=true` 启用它。
:::

## 要求

- macOS 或 Linux（不支持 Windows）。
- `git`。
- `PATH` 中的 `spinel` 编译器，或在 `spinel` 工具选项中指定其路径。Spinel 以源代码形式发布：请参阅其
  [快速开始](https://github.com/matz/spinel#quick-start)来构建它。
- C 编译器，Spinel 会调用它来生成可执行文件。

Spinel 只支持 Ruby 语言的一部分，因此许多 Ruby 工具无法编译。此后端只编译一个入口文件，不会安装 gem、
复制数据文件或获取子模块。

## 用法

```sh
mise settings experimental=true
```

大多数工具都需要选项，例如入口文件，因此请在 `mise.toml` 中声明它们，然后安装：

```toml
[tools."spinel:tobi/try"]
version = "1.10.1"
entrypoint = "try.rb"
bin = "try"
tag_prefix = "v"
```

```sh
mise install
```

`mise ls-remote spinel:tobi/try` 会列出仓库的 git 标签（通过 `git ls-remote`，而不是 GitHub API）。设置
`tag_prefix = "v"` 后，标签 `v1.10.1` 对应的版本就是 `1.10.1`。

## 工具选项

以下[工具选项](/dev-tools/#tool-options)可用于 `spinel` 后端，应将它们放在 `mise.toml` 的 `[tools]` 中。

### `entrypoint`

要编译的 Ruby 文件，相对于仓库根目录。默认为 `main.rb`。

### `bin`

写入 `bin/` 的可执行文件名称。默认为仓库名称。

### `tag_prefix`

每个 git 标签中版本之前的文本，例如 `v`。只会列出带有此前缀的标签。

### `source_ref`

用于替代标签进行构建的完整 40 字符 commit SHA。此时版本只作为标签使用。

### `spinel`

要运行的编译器。默认为 `PATH` 中的 `spinel`。

实现：[`src/backend/spinel.rs`](https://github.com/jdx/mise/blob/main/src/backend/spinel.rs)。
