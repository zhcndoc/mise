# Deno

`mise` 可用于在同一系统上安装和管理 [deno](https://deno.land/) 的多个版本。

> 以下是使用 deno mise 核心插件的说明。当没有安装名为“deno”的
> git 插件时会使用它。如果你想使用 [asdf-deno](https://github.com/asdf-community/asdf-deno)
> 那么运行 `mise plugins install deno https://github.com/asdf-community/asdf-deno`。

这部分代码位于 mise 仓库中的
[`./src/plugins/core/deno.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/deno.rs)。

## 使用

以下命令会安装 deno 并将其设为全局默认：

```sh
mise use -g deno@1       # 安装 deno 1.x
mise use -g deno@latest  # 安装最新版本的 deno
```

使用 `mise ls-remote deno` 查看可用版本。

> [!NOTE]
> 避免使用 `deno upgrade` 来升级 `deno`，因为 `mise` 不会知晓这一变更。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 可用于 `deno` 后端。
这些选项位于 `mise.toml` 中的 `[tools]` 部分。

### `install_env`

为由核心 `deno` 后端运行的安装时命令设置环境变量：

```toml
[tools]
deno = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```
