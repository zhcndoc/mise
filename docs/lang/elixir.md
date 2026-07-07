# Elixir

`mise` 可用于在同一系统上管理多个 [`elixir`](https://elixir-lang.org/) 版本。

> 以下是使用 elixir 核心插件的说明。当未安装名为“elixir”的 git 插件时，会使用此插件。

相关代码位于 mise 仓库中的
[`./src/plugins/core/elixir.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/elixir.rs)。

## 用法

使用最新稳定版本的 elixir：

```sh
mise use -g erlang elixir
```

请注意，安装 `elixir` 需要 [`erlang`](/lang/erlang.html)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 可用于 `elixir` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 core `elixir` 后端运行的安装时命令设置环境变量：

```toml
[tools]
elixir = { version = "latest", install_env = { MIX_HOME = "~/.mix" } }
```
