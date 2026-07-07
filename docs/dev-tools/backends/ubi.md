# Ubi 后端 <Badge type="danger" text="已弃用" />

::: warning
ubi 后端已**弃用**。请改用 [GitHub 后端](/dev-tools/backends/github)。

与 ubi 相比，GitHub 后端提供了若干优势，包括来源验证、下载进度报告以及更少的依赖。要进行迁移，请在配置文件中将 `ubi:owner/repo` 替换为 `github:owner/repo`。[`matching`](/dev-tools/backends/github.html#matching) 和 [`matching_regex`](/dev-tools/backends/github.html#matching_regex) 选项可以直接沿用。需要注意的一处行为差异是：ubi 仅将子字符串 `matching` 作为已匹配你的 OS/架构的资产之间的决胜条件，并且当只有一个资产与平台匹配时会跳过它。GitHub 后端则会在自动检测之前将 `matching` 作为预筛选，因此对于多二进制发布，你会得到由你的过滤器命名的二进制文件；如果该二进制未针对你的平台发布，则会得到一个明确错误，指出该过滤器未发布。

还有一个迁移时需要注意的问题：ubi 会将 `matching` 合并到安装路径中，因此你可以通过在同一个 `ubi:owner/repo` 字符串上使用不同的 `matching` 值，从一个仓库安装多个二进制文件。GitHub 后端则将安装路径仅按工具名称 + 版本键控，因此两个具有不同 `matching` 值的 `github:owner/repo` 条目会解析到**同一个**目录，第二个会覆盖第一个。如果你依赖这种 ubi 模式，请在 GitHub 上为每个二进制文件提供各自的 [`tool_alias`](/dev-tools/backends/github.html#multiple-assets-from-the-same-release)，这样每个文件都会获得自己独立的安装目录。
:::

你可以直接使用 [ubi](https://github.com/houseabsolute/ubi) 后端安装 GitHub Releases 和 URL 包。ubi 已直接编译进
mise 代码库，因此无需单独安装即可使用。

ubi 不需要插件，甚至不需要为每个工具进行任何配置。它所做的是尝试从 GitHub Releases 中推断出正确的
二进制文件/压缩包，并下载正确的那个。只要供应商
在其发布中使用相对标准的标记方案，ubi 应该就能识别出来。

相关代码位于 mise 仓库中的 [`./src/backend/ubi.rs`](https://github.com/jdx/mise/blob/main/src/backend/ubi.rs)。

## 用法

以下命令会安装最新版本的 goreleaser
并将其设为 PATH 中的当前活动版本：

```sh
$ mise use -g ubi:goreleaser/goreleaser
$ goreleaser --version
1.25.1
```

版本将以如下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"ubi:goreleaser/goreleaser" = "latest"
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `ubi` 后端——这些配置写在 `mise.toml` 的 `[tools]` 中。

### `exe`

`exe` 选项允许你指定归档包中的可执行文件名称。当归档包包含多个可执行文件时，这个选项很有用。

如果你遇到类似 `could not find any files named cli in the downloaded zip file` 的错误，可以使用 `exe` 选项来指定可执行文件名称：

```toml
[tools]
"ubi:cli/cli" = { version = "latest", exe = "gh" } # github 的 cli
```

### `rename_exe`

`rename_exe` 选项允许你指定在提取后可执行文件的名称。

使用 `rename_exe` 选项来指定目标可执行文件名称：

```toml
[tools]
"ubi:cli/cli" = { version = "latest", exe = "gh", rename_exe = "github" } # github 的 cli
```

### `matching`

设置一个字符串，用于在同一 OS/架构有多个文件时与发布文件名进行匹配，例如 "gnu"、"musl" 或 "msvc"。请注意，只有当你的 OS/架构对应的匹配发布文件名多于一个时，此选项才会被使用。如果只有一个发布资源与你的 OS/架构匹配，则会忽略此项。

```toml
[tools]
"ubi:BurntSushi/ripgrep" = { version = "latest", matching = "musl" }
```

### `matching_regex`

设置一个正则表达式字符串，它会在与 OS/架构匹配之前先用于匹配发布文件名。如果该模式只匹配到一个结果，就会选择该发布项。如果没有找到匹配项，则会报错。

```toml
[tools]
"ubi:shader-slang/slang" = { version = "latest", matching_regex = "\\d+\\.tar" }
```

### `provider`

设置用于获取资源和发布信息的提供方类型。可以是 `github` 或 `gitlab`（默认是 `github`）。
如果你使用 `api_url`，请确保 `provider` 设置为正确的类型，因为类型可能无法从 URL 正确推导出来。

```toml
[tools]
"ubi:gitlab-org/cli" = { version = "latest", exe = "glab", provider = "gitlab" }
```

### `api_url`

设置提供方 API 的 URL。这在使用自托管实例时很有用。

```toml
[tools]
"ubi:acme/my-tool" = {
  version = "latest",
  provider = "gitlab",
  api_url = "https://gitlab.acme.com/api/v4",
}
```

### `extract_all`

设置为 `true` 可提取 tar 包中的所有文件，而不只是 "bin"。与 `exe` 和 `rename_exe` 不兼容。

```toml
[tools]
"ubi:helix-editor/helix" = { version = "latest", extract_all = "true" }
```

### `bin_path`

tar 包中二进制文件所在的目录。当二进制文件不在 tar 包根目录时，这很有用。
只有在设置了 `extract_all` 为 `true` 时，这才有意义。

```toml
[tools]
"ubi:BurntSushi/ripgrep" = {
  version = "latest",
  extract_all = "true",
  bin_path = "target/release",
}
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果 `extract_all` 设置为 `true`，则使用安装路径根目录
3. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
4. 如果不存在 `bin/` 目录，则使用已解压目录的根目录

### `tag_regex`

设置一个正则表达式，用于过滤掉不匹配该正则的标签。当某个供应方在同一仓库中为无关的 CLI 提供了大量发布时，这很有用。例如，`cargo-bins/cargo-binstall` 就有很多与 `cargo-binstall` 无关的 CLI 发布。这个选项可用于过滤掉这些发布。

```toml
[tools]
"ubi:cargo-bins/cargo-binstall" = { version = "latest", tag_regex = '^\d+\.' }
```

## 自托管 GitHub/GitLab

如果你正在使用自托管的 GitHub/GitLab 实例，你可以设置 `provider` 和 `api_url` 工具选项。
此外，你还可以设置 `MISE_GITHUB_ENTERPRISE_TOKEN` 或 `MISE_GITLAB_ENTERPRISE_TOKEN` 环境变量，以
通过 API 进行身份验证。

## 支持的 Ubi 语法

- **用于最新发布版本的 GitHub 简写：** `ubi:goreleaser/goreleaser`
- **用于特定发布版本的 GitHub 简写：** `ubi:goreleaser/goreleaser@1.25.1`
- **URL 语法：** `ubi:https://github.com/goreleaser/goreleaser/releases/download/v1.16.2/goreleaser_Darwin_arm64.tar.gz`

## ubi 故障排除

### `ubi` 解析器找不到 os/arch

有时供应商会为其发布版本使用一些奇怪的格式，导致 ubi 无法识别，可能是针对某个特定的 os/arch 组合。例如，这最近就发生在[这个 issue](https://github.com/houseabsolute/ubi/issues/79)中，因为某个供应商使用了
“mac” 而不是更常见的 “macos” 或 “darwin” 标签。

可以先单独使用 ubi 来确认问题是否与 mise 或 ubi 本身有关：

```sh
ubi -p jdx/mise
./bin/mise -v # 是的，技术上这意味着你可以使用 `mise use ubi:jdx/mise`，不过我也不知道为什么你会这么做
```

### `ubi` 选错了 tarball

另一个问题是，GitHub release 可能会包含很多 tarball，其中有些并不包含你想要的 CLI，你可以使用 `matching` 字段来指定一个用于匹配 release 的字符串。

```sh
mise use ubi:tamasfe/taplo[matching=full]
# 或者直接使用 ubi
ubi -p tamasfe/taplo -m full
```

### `ubi` 无法在 tarball 中找到二进制文件

ubi 假设仓库名与二进制文件名相同，但实际情况通常并非如此。
例如，BurntSushi/ripgrep 提供的二进制文件名是 `rg`，而不是 `ripgrep`。在这种情况下，你可以
使用 `exe` 字段指定二进制文件名：

```sh
mise use ubi:BurntSushi/ripgrep[exe=rg]
# 或者直接使用 ubi
ubi -p BurntSushi/ripgrep -e rg
```

### `ubi` 使用了奇怪的版本

这个问题实际上出在 mise 上，而不是 ubi 上。mise 需要能够列出工具的可用版本，
这样 `latest` 才会指向 CLI 实际上的最新发布版本。有时会发生的情况是，供应商会为一些无关的内容发布 GitHub release。例如，`cargo-bins/cargo-binstall`
是 cargo-binstall 的仓库，但它有一堆与 cargo-binstall 无关的 CLI 发布版本。
我们需要把这些过滤掉，可以通过 `tag_regex` 工具选项来指定：

```sh
mise use 'ubi:cargo-bins/cargo-binstall[tag_regex=^\d+\.]'
```

这样当你运行 `mise ls-remote ubi:cargo-bins/cargo-binstall[tag_regex=^\d+\.]` 时，你应该只会看到
以数字开头的版本。请注意，这个命令会被缓存，所以你可能需要先运行 `mise cache clear`。
