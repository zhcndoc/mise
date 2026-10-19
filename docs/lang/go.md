---
description: "通过 mise 安装 Go、从 go.mod 和 go.work 读取工具链版本，并管理 GOROOT 和 GOBIN。"
---

# Go

mise 会安装官方发布的 [Go](https://go.dev/) 发行版，并为所选版本设置
`GOROOT` 和 `GOBIN`。

## 快速开始

为当前项目选择一个 Go 发布系列：

```sh
mise use go@1.27
mise exec -- go version
```

使用 `mise use -g go@1.27` 设置个人默认版本。[`mise upgrade go`](/cli/upgrade.html)
会在已配置的版本范围内升级。

## 选择版本

| 版本请求         | 选择的版本                             |
| ---------------- | -------------------------------------- |
| `go@1.27`        | 最新的 1.27.x 发行版                    |
| `go@1.27.1`      | 指定发行版                              |
| `go@latest`      | 最新发行版                              |
| `go@1.20`        | 精确匹配 `1.20`，即 1.20 系列的首个发行版 |
| `go@prefix:1.20` | 最新的 1.20.x 发行版                    |

Go 1.20 及更早版本系列的首个版本号是 `1.20`，而不是 `1.20.0`，因此
`go@1.20` 会选择该系列的首个版本。若要获取最新的 1.20.x，请使用 `prefix:`：

```sh
mise use go@prefix:1.20
```

从 Go 1.21 开始，系列的首个版本号为 `1.21.0`，因此 `go@1.21` 已会选择最新的
1.21.x。版本列表不包含 Beta 版和候选发布版。运行 `mise ls-remote go` 查看所有版本。

## 版本文件 {#go-version-file-support}

mise 可以从 `.go-version`、`go.mod` 或 `go.work` 中选择 Go 版本。为 Go 启用这些
版本文件：

```sh
mise settings add idiomatic_version_file_enable_tools go
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得
相同的行为。参见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

在 `go.mod` 和 `go.work` 中，mise 会将模块的工具链版本作为精确版本请求读取。版本可以由
`toolchain goX.Y.Z` 指令指定；若文件中没有 `toolchain` 行，也可以由带补丁版本号的
`go X.Y.Z` 指令指定。Go 会将没有 `toolchain` 行时的 `go 1.27.1` 视为
`toolchain go1.27.1`；`go mod tidy` 则会移除与 `go` 行相同的 `toolchain` 行。
因此，以下两种写法都会选择 Go 1.27.1：

```text [go.mod]
go 1.27.1
```

```text [go.mod]
go 1.27.0

toolchain go1.27.1
```

Go 本身将这些行视为最低版本要求；如果本机安装了更新的工具链，就会运行较新的版本。mise
会将其作为精确版本读取，因为 `go` 命令会把当前运行的版本写入这些行。例如，下面的
`go.work` 会为包含 `api` 和 `worker` 模块的工作区选择 Go 1.27.1：

```text [go.work]
go 1.27.0

toolchain go1.27.1

use (
    ./api
    ./worker
)
```

不带补丁版本号的 `go X.Y` 指令并不对应某个 Go 发行版，只声明模块支持的最低 Go 版本。
mise 在 `go.work` 中会忽略它；从 `go.mod` 读取这种指令的行为已弃用，并将在 mise
2026.11.0 中移除。请改用 `toolchain` 行，或设置
`idiomatic_version_file_ignore_minimum_versions` 立即忽略该版本要求。参见[mise
读取哪些字段](/dev-tools/versions.html#which-fields-mise-reads)。

### 工作区和 `GOWORK`

启用工作区时，mise 会使用该工作区的 `go.work`，不再读取其下的 `go.mod` 文件；即使你
在某个模块的子目录中运行 mise 也是如此。如果 `go.work` 中既没有
`toolchain goX.Y.Z` 行，也没有在缺少 `toolchain` 行时使用的精确 `go X.Y.Z` 行，这两个
文件都不会提供版本。mise 不会读取 `toolchain default`、部分版本号或候选发布版。

环境变量 `GOWORK` 用于控制 mise 使用哪个工作区：

| `GOWORK` 的值            | mise 的行为                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 未设置、空值或 `auto`    | 在 mise 配置搜索路径范围内，从当前目录及其父目录查找 `go.work`。                                                       |
| `off`                   | 忽略 `go.work` 并读取 `go.mod`。                                                                                         |
| 绝对路径                | 仅使用指定的工作区文件（若 mise 能找到）；忽略其他 `go.work` 文件，也不会回退到 `go.mod`。                              |

设置 `GOWORK` 不会让 mise 读取配置搜索路径以外的文件。如果指定的工作区不在这些路径中或
不存在，它就不会提供版本；此类工作区请在 `mise.toml` 中设置 Go 版本。mise 会忽略相对
路径形式的 `GOWORK` 并使用默认搜索方式。Go 本身也不接受相对路径，因此请使用绝对路径。

### Go 自带的工具链切换机制 {#go-toolchain-selection}

Go 自带[工具链选择机制](https://go.dev/doc/toolchain)，由 `GOTOOLCHAIN` 以及 `go.mod`、
`go.work` 中的 `go` 和 `toolchain` 行共同控制。当 `GOTOOLCHAIN=auto`（Go 的默认值）
时，mise 安装的 `go` 命令可以在模块要求时下载并运行更新的工具链。如果看到的版本与
mise 选择的版本不同，可以对比 `mise exec -- go version` 和
`mise exec -- go env GOTOOLCHAIN` 的结果。若要让 Go 始终运行 mise 选定的工具链，请在
`[env]` 中设置 `GOTOOLCHAIN`：

```toml [mise.toml]
[env]
GOTOOLCHAIN = "local"
```

## 使用 `go install` 安装的可执行文件

除非 shell 中已设置 `GOBIN`，mise 会将它设为所选 Go 版本的 `bin` 目录，该目录也会加入
`PATH`。因此，用 `go install` 安装的命令属于该 Go 版本；切换或升级 Go 后，这些命令也会
随之消失。

若要在切换 Go 版本后继续使用 Go CLI，请通过[`go:` 后端](/dev-tools/backends/go.html)将它
作为独立工具安装，例如 `mise use -g go:golang.org/x/tools/gopls`。若要使用 Go 的默认目录
（`$GOPATH/bin`，即 `~/go/bin`），请将
[`go.set_gobin`](/lang/go.html#go.set_gobin) 设为 `false`，并自行将该目录加入 `PATH`。

## 环境变量

| 变量     | 值                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `GOROOT` | 所选版本的安装目录。可通过 [`go.set_goroot`](/lang/go.html#go.set_goroot) 关闭。                      |
| `GOBIN`  | 所选版本的 `bin` 目录；若已设置 `GOBIN` 或 `go.set_gobin` 为 `false`，则不会覆盖。                    |

mise 不会设置 `GOPATH`。如需指定值，请在 `[env]` 中设置。

## mise 如何安装 Go

mise 会从[版本列表主机](/configuration/settings.html#use_versions_host)获取 Go 版本；关闭
`use_versions_host` 后，则从 [`go.repo`](/lang/go.html#go.repo) 的发布标签获取。mise 会从
[`go.download_mirror`](/lang/go.html#go.download_mirror) 下载适用于当前平台的压缩包（默认
地址为 `https://dl.google.com/go`），根据随包发布的 `.sha256` 文件校验，并运行
`go version`。设置 [`go.skip_checksum`](/lang/go.html#go.skip_checksum) 可关闭校验。

如果已安装名为 `go` 的插件，它的优先级高于内置安装器。如果 mise 的行为与本文不符，请
检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参见[选择其他实现](/core-tools.html#selecting-another-implementation)。

## 工具选项

Go 没有专属工具选项。`install_env` 会传递给 `go version` 检查、默认软件包的
`go install` 命令以及 `postinstall` 命令。例如，`postinstall` 若要安装私有模块，就需要
`GOPRIVATE`：

```toml [mise.toml]
[tools]
go = {
  version = "1.27",
  install_env = { GOPRIVATE = "github.com/acme/*" },
  postinstall = "go install github.com/acme/tool@latest",
}
```

其他通用选项参见[工具选项](/dev-tools/#tool-options)。

## 默认软件包文件 <Badge type="danger" text="deprecated" /> {#default-packages}

mise 会将 `~/.default-go-packages` 中列出的软件包（
[`go.default_packages_file`](/lang/go.html#go.default_packages_file)，每行一个）通过
`go install` 安装到每个新 Go 版本中。mise 从 2026.11.0 开始对此文件发出警告，并将在
2027.11.0 停止读取。请改用 [`go:` 后端](/dev-tools/backends/go.html)安装 Go CLI，例如
`"go:github.com/jesseduffield/lazygit" = "latest"`；若某些软件包需要安装到每个 Go 版本中，
则可使用 [`postinstall`](/dev-tools/#tool-postinstall-commands) 命令。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="go" :level="3" />
