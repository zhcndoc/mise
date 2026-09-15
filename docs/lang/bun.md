---
description: "mise 可用于在同一系统上安装和管理多个版本的 bun。"
---

# Bun

`mise` 可用于在同一系统上安装和管理 [bun](https://bun.sh/) 的多个版本。

## 用法

为当前项目安装 Bun，并检查所选的可执行文件：

```sh
mise use bun@latest
mise exec -- bun --version
```

在项目之外使用 `mise use -g bun@latest` 设置个人默认版本。提交项目的
`mise.toml`，以便团队成员选择相同的版本请求。

使用 `mise ls-remote bun` 查看可用版本。

> [!NOTE]
> 使用 `mise upgrade bun` 进行更新。运行 `bun upgrade` 会更改已安装的二进制文件，但不会更新 mise 记录的版本。

这些说明使用 mise 内置的 bun 支持。已安装的同名外部插件可能会更改行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/bun.rs)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `bun` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为核心 `bun` 后端运行的安装时命令设置环境变量：

```toml
[tools]
bun = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```
