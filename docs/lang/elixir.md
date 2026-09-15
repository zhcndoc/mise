---
description: "mise 可用于在同一系统上管理多个 elixir 版本。"
---

# Elixir

`mise` 可用于在同一系统上管理多个 [`elixir`](https://elixir-lang.org/) 版本。

## 用法

为项目声明 Erlang 和 Elixir：

```sh
mise use erlang elixir
mise exec -- elixir --version
```

Elixir 需要 [Erlang/OTP](/lang/erlang.html)。版本命令会报告这两个运行时，有助于诊断不兼容的版本组合。使用 `mise ls-remote elixir` 和 `mise ls-remote erlang` 选择项目支持的版本，然后将这两个请求传递给 `mise use`。

添加 `-g` 可设置个人默认值。在现有的 Mix 项目中，运行 `mise exec -- mix deps.get` 以安装应用依赖；选择 Elixir 不会安装这些依赖。

这些说明使用 mise 内置的 elixir 支持。已安装的同名外部插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/elixir.rs)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 可用于 `elixir` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 core `elixir` 后端运行的安装时命令设置环境变量：

```toml
[tools]
elixir = { version = "latest", install_env = { MIX_HOME = "~/.mix" } }
```
