---
description: "mise 可用于在同一系统上安装和管理 go 的多个版本"
---

# Go

`mise` 可用于在同一系统上安装和管理 [go](https://golang.org/) 的多个版本。

## 用法

为当前项目选择一个 Go 发布系列：

```sh
mise use go@1.25
mise exec -- go version
```

使用 `mise use -g go@1.25` 设置个人默认版本。`mise ls-remote go` 列出可用版本；`mise upgrade go` 会在已配置的请求范围内更新。

1.20 及以下的次要 go 版本需要在版本号前指定 `prefix`，因为每个系列的第一个版本发布时都没有 `.0` 后缀，这使得 1.20 成为了精确的版本匹配：

```sh
mise use go@prefix:1.20
```

这些说明使用 mise 内置的 go 支持。已安装的同名外部插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/go.rs)。

## `.go-version` 文件支持

显式启用 Go 的惯用文件：

```sh
mise settings add idiomatic_version_file_enable_tools go
```

mise 可以读取 `.go-version` 或 `go.mod` 中的 `toolchain goX.Y.Z` 声明。`go` 指令是最低兼容性要求；将其读取为版本请求已被[弃用](/configuration.html#which-fields-mise-reads)。

Go 还有自己的[工具链选择](https://go.dev/doc/toolchain)机制，该机制由 `GOTOOLCHAIN` 以及模块／工作区声明控制。mise 启动 Go 后，它可能会使用不同的工具链。调查意外版本时，请比较 `mise exec -- go version` 和 `mise exec -- go env GOTOOLCHAIN`。

## 默认包

::: warning 计划弃用
默认包文件已被弃用。它们目前仍受支持，但 mise 将从 `2026.11.0` 开始发出警告，
并将在 `2027.11.0` 移除支持。

对于 Go CLI，请直接使用 `go:` 后端安装工具：

```toml
[tools]
"go:github.com/jesseduffield/lazygit" = "latest"
```

对于确实应该安装到每个 Go 版本中的包，请使用工具级别的 `postinstall`
钩子：

```toml
[tools]
go = { version = "1.25", postinstall = "go install github.com/daixiang0/gci@latest" }
```

:::

mise 可以在安装新的 go 版本后自动安装一组默认包。
要使用此旧版功能，请提供一个 `$HOME/.default-go-packages` 文件，其中每行列出一个包，例如：

```text
github.com/daixiang0/gci # 允许注释
github.com/jesseduffield/lazygit
```

## 工具选项

以下[工具选项](/dev-tools/#tool-options)适用于 `go` 后端。
这些选项位于 `mise.toml` 中的 `[tools]` 部分。

### `install_env`

为核心 `go` 后端运行的默认包安装和安装时验证命令设置环境变量：

```toml
[tools]
go = { version = "latest", install_env = { GOPRIVATE = "github.com/acme/*" } }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="go" :level="3" />
