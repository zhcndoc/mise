# Go

`mise` 可用于在同一系统上安装和管理 [go](https://golang.org/) 的多个版本。

> 以下是使用 go mise 核心插件的说明。当没有安装名为 "go" 的 git 插件时，会使用此插件。若你想使用 [asdf-golang](https://github.com/kennyp/asdf-golang)，请使用 `mise plugins install go GIT_URL`。

这部分的代码位于 mise 仓库中的
[`./src/plugins/core/go.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/go.rs)。

## 用法

以下命令会安装最新版本的 go-1.21.x（如果尚未安装 1.21.x 的某个版本），并将其设为全局默认：

```sh
mise use -g go@1.21
```

1.20 及更低的 go 次版本需要在版本号前指定 `prefix`，因为每个系列的第一个版本发布时没有 `.0` 后缀，这使得 1.20 会成为精确版本匹配：

```sh
mise use -g go@prefix:1.20
```

## `.go-version` 文件支持

mise 使用 `mise.toml` 或 `.tool-versions` 文件在不同软件版本之间自动切换。
不过，它也可以读取名为 `.go-version` 的 Go 特定版本文件。

参见 [惯用版本文件](/configuration.html#idiomatic-version-files)

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

以下 [tool-options](/dev-tools/#tool-options) 适用于 `go` 后端。
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
