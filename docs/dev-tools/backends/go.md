---
description: "使用 go install 构建和安装 Go 命令行软件包。"
---

# Go 后端

`go` 后端使用 `go install` 构建 Go 命令行软件包。使用可执行软件包的导入路径，该路径可能包含 `/cmd/TOOL` 或 `/v4` 等主版本后缀。库应放在应用程序的 `go.mod` 中。

相关代码位于 mise 仓库中的 [`./src/backend/go.rs`](https://github.com/jdx/mise/blob/main/src/backend/go.rs)。

## 依赖项

在当前项目中安装 Go 和工具。在 mise 构建依赖工具时，已配置的 Go 安装可用：

```sh
mise use go@1.26 go:github.com/DarthSim/hivemind
mise exec -- hivemind --help
```

这会将两个工具都记录在 `mise.toml` 中；添加 `-g` 可用于全局配置。根据软件包以及是否使用 cgo，源码构建可能还需要 Git、C 编译器或原生库。

## 用法

使用 `mise ls-remote go:github.com/DarthSim/hivemind` 列出可用版本。要选择一个版本，请运行 `mise use go:github.com/DarthSim/hivemind@VERSION`，将 `VERSION` 替换为列出的版本。mise 会将生成的可执行文件写入自己的安装目录，而不是普通的 `GOBIN`。

### 版本发现和发布日期

对于 latest，mise 首先直接从模块代理或 go list 查询最新稳定发布版本。这样可以避免列出所有版本并为每个版本获取发布日期，从而避免标签很多的模块超时。

mise ls-remote 等命令，以及 @1 等版本请求，仍会使用完整版本列表。为保持这些查询快速，mise 会通过模块代理获取最新 100 个版本的发布日期，或通过 go list 获取最新 10 个版本。所有版本仍会列出；超出这些范围的版本没有发布日期。

没有发布日期的版本仍会根据 minimum_release_age 检查：在 mise 确定版本前，它会读取该版本的日期；如果答案比截止时间更新，就继续向后查找。因此，深入到已标记版本之前的截止时间会为每个跳过的版本执行一次查询，通过 go list 首次解析有很多发布版本的模块时可能明显变慢。直接 latest 查询包含发布日期；如果该版本太新，mise 会回退到完整列表并为候选项获取日期。

::: warning 无法访问的来源
如果读取版本日期完全失败（例如代理无法访问或 VCS 主机超时），mise 会发出警告并允许该版本，而不是让安装失败。因此在网络异常时版本可能越过截止时间，警告会说明发生了这种情况。
:::

### 私有模块
私有模块使用 Go 的常规 VCS 身份验证。导出 `GOPRIVATE`，或在 mise 的 `[env]` 配置中定义它，以便 mise 将版本发现委托给 Go，而不是自行查询公共模块代理。仅使用 `go env -w` 设置的值不会被 mise 读取来选择发现路径：

```toml
[env]
GOPRIVATE = "github.com/acme/*"
```

Go 使用 `GOPRIVATE` 作为 `GONOPROXY` 和 `GONOSUMDB` 的默认值。如果单独配置这些变量，请根据所需的代理和校验和数据库隐私设置每一个变量。

### 固定版本

你也可以固定特定的 Go 模块版本，包括尚未发布的伪版本：
```toml
[tools]
"go:github.com/grafana/oats" = "v0.7.1-0.20260703092802-96201f1b8136"
```

如果需要直接从 VCS 而不是模块代理解析尚未发布的修订版本，请将固定版本与 [`install_env`](/dev-tools/backends/go.html#install-env) 结合使用：

```toml
[tools]
"go:github.com/grafana/oats" = { version = "v0.7.1-0.20260703092802-96201f1b8136", install_env = { GOPROXY = "direct", GONOSUMDB = "github.com/grafana/oats" } }
```

## 工具选项

以下 [工具选项](/dev-tools/#tool-options) 适用于 `go` 后端——这些内容放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `go install` 命令设置环境变量。应用 `install_env` 后，mise 仍会将 `GOBIN` 设置为工具安装目录。当 `GOPRIVATE` 还必须影响版本发现时，请按照上面的示例将其放入 `[env]` 中。

```toml
[tools]
"go:github.com/acme/my-tool" = { version = "latest", install_env = { GOPRIVATE = "github.com/acme/*" } }
```

### `tags`

指定 Go 构建标签（作为 `go install -tags` 传递）：

```toml
[tools]
"go:github.com/golang-migrate/migrate/v4/cmd/migrate" = { version = "latest", tags = "postgres" }
# 等效的数组形式：
# "go:github.com/golang-migrate/migrate/v4/cmd/migrate" = { version = "latest", tags = ["postgres", "mysql"] }
```

## 故障排除

- **软件包不是 main 软件包：** 使用可执行文件的导入路径，而不是仓库根目录或库软件包
- **私有模块查找失败：** 检查已导出的 `GOPRIVATE` 以及 Go/Git 凭据；mise 的 GitHub 令牌不能替代 VCS 身份验证
- **Go 版本或编译器错误：** 使用软件包支持的工具链，并安装所有必需的原生构建依赖项
