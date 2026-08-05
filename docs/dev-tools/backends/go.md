# Go 后端

即使没有对应的 asdf 插件，你也可以通过 [go install](https://go.dev/doc/install) 直接安装包。

这部分的代码位于 mise 仓库中的 [`./src/backend/go.rs`](https://github.com/jdx/mise/blob/main/src/backend/go.rs)。

## 依赖项

这依赖于已安装 `go`。你可以通过 mise 安装：

```sh
mise use -g go
```

::: tip
如果你想用其他方式安装 go，任何安装方法都可以。
mise 会使用 PATH 中的任意 `go`。
:::

## 用法

以下命令会安装 [hivemind](https://github.com/DarthSim/hivemind) 的最新版本，并
将其设置为 PATH 上的活动版本：

```sh
$ mise use -g go:github.com/DarthSim/hivemind
$ hivemind --help
Hivemind version 1.1.0
```

你也可以固定特定的 Go 模块版本，包括尚未发布的
伪版本：

```toml
[tools]
"go:github.com/grafana/oats" = "v0.7.1-0.20260703092802-96201f1b8136"
```

如果你需要直接从 VCS 而不是模块代理解析尚未发布的修订版本，
请将固定的版本与 [`install_env`](#install_env) 结合使用：

```toml
[tools]
"go:github.com/grafana/oats" = { version = "v0.7.1-0.20260703092802-96201f1b8136", install_env = { GOPROXY = "direct", GONOSUMDB = "github.com/grafana/oats" } }
```

## 工具选项

以下 [工具选项](/dev-tools/#tool-options) 适用于 `go` 后端——这些内容放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `go install` 命令设置环境变量。mise 在应用 `install_env` 之后，仍会将 `GOBIN`
设置为工具安装目录。

```toml
[tools]
"go:github.com/DarthSim/hivemind" = { version = "latest", install_env = { GOPRIVATE = "github.com/acme/*" } }
```

### `tags`

指定 go build 标签（作为 `go install -tags` 传递）：

```toml
[tools]
"go:github.com/golang-migrate/migrate/v4/cmd/migrate" = { version = "latest", tags = "postgres" }
# 等效的数组形式：
# "go:github.com/golang-migrate/migrate/v4/cmd/migrate" = { version = "latest", tags = ["postgres", "mysql"] }
```
