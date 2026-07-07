# Bun

`mise` 可用于在同一系统上安装和管理 [bun](https://bun.sh/) 的多个版本。

> 以下是使用 bun mise 核心插件的说明。当没有安装名为 "bun" 的 git 插件时，会使用它。

其代码位于 mise 仓库中的
[`./src/plugins/core/bun.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/bun.rs)。

## 用法

以下命令将安装 bun 并将其设为全局默认：

```sh
mise use -g bun@0.7     # 安装 bun 0.7.x
mise use -g bun@latest  # 安装最新的 bun
```

使用 `mise ls-remote bun` 查看可用版本。

> [!NOTE]
> 避免使用 `bun upgrade` 来升级 bun，因为 `mise` 将不会感知到这一更改。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `bun` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为核心 `bun` 后端运行的安装时命令设置环境变量：

```toml
[tools]
bun = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```
