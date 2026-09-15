---
description: "mise 可用于在同一系统上安装和管理多个版本的 deno。"
---

# Deno

`mise` 可用于在同一系统上安装和管理 [deno](https://deno.land/) 的多个版本。

## 用法

为当前项目安装 Deno 并验证选定的可执行文件：

```sh
mise use deno@latest
mise exec -- deno --version
```

在项目外使用 `mise use -g deno@latest` 设置个人默认版本。像 `deno@2` 这样的特定版本请求会使项目保持在该发布系列中。

使用 `mise ls-remote deno` 查看可用版本。

> [!NOTE]
> 使用 `mise upgrade deno` 进行更新。运行 `deno upgrade` 会更改已安装的二进制文件，但不会更新 mise 记录的版本。

这些说明使用 mise 内置的 deno 支持。已安装的同名外部插件可能会更改行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/deno.rs)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 可用于 `deno` 后端。这些选项应放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为由核心 `deno` 后端运行的安装时命令设置环境变量：

```toml
[tools]
deno = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```
