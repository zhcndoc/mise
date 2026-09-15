---
description: "将已弃用的 ubi 配置迁移到 GitHub、GitLab 或 HTTP 后端。"
---

# Ubi 后端 <Badge type="danger" text="已弃用" />

::: warning
ubi 后端已**弃用**。请改用 [GitHub 后端](/dev-tools/backends/github)。

与 ubi 相比，GitHub 后端具有多项优势，包括来源验证、下载进度报告以及更少的依赖项。要进行迁移，请在配置文件中将 `ubi:owner/repo` 替换为 `github:owner/repo`。[`matching`](/dev-tools/backends/github.html#matching) 和 [`matching_regex`](/dev-tools/backends/github.html#matching-regex) 选项可以继续使用。需要注意的一个行为差异是：ubi 仅将子字符串 `matching` 应用于已经匹配你的 OS/arch 的资源之间进行决胜，并且当只有一个资源匹配平台时会跳过该选项。GitHub 后端则会在自动检测之前将 `matching` 作为预筛选条件，因此对于包含多个二进制文件的发布版本，你将获得筛选器指定的二进制文件；如果该文件未针对你的平台发布，则会收到明确指出该筛选器的错误。

还有一个迁移时需要注意的问题：ubi 会将 `matching` 合并到安装路径中，因此你可以通过在同一个 `ubi:owner/repo` 字符串上使用不同的 `matching` 值，从一个仓库安装多个二进制文件。GitHub 后端则将安装路径仅按工具名称 + 版本键控，因此两个具有不同 `matching` 值的 `github:owner/repo` 条目会解析到**同一个**目录，第二个会覆盖第一个。如果你依赖这种 ubi 模式，请在 GitHub 上为每个二进制文件提供各自的 [`tool_alias`](/dev-tools/backends/github.html#multiple-assets-from-the-same-release)，这样每个文件都会获得自己独立的安装目录。
:::

此页面记录现有的 ubi 配置。对于新安装，请根据需要使用
[GitHub](/dev-tools/backends/github.html)、[GitLab](/dev-tools/backends/gitlab.html)
或 [HTTP](/dev-tools/backends/http.html) 后端。

## 用法

一次迁移一个工具。对于简单的发布版本安装，将：

```toml
[tools]
"ubi:BurntSushi/ripgrep" = "14.1.1"
```

改为：

```toml
[tools]
"github:BurntSushi/ripgrep" = "14.1.1"
```

然后运行 `mise install` 和 `mise exec -- rg --version`。根据目标后端检查自定义选项：例如，`exe` 和 `extract_all` 是 ubi 选项，不应盲目复制。重新生成并检查任何锁定文件。在替代方案正常工作之前，保留旧的安装。

对于多个二进制文件，请按照上文所述的别名迁移方式操作。直接的
`ubi:https://...` 下载应归入 [HTTP 工具条目](/dev-tools/backends/http.html#usage)。

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

使用 `rename_exe` 选项指定目标可执行文件名称：

```toml
[tools]
"ubi:cli/cli" = { version = "latest", exe = "gh", rename_exe = "github" } # github 的 cli
```

### `matching`

当针对你的 OS/arch 存在多个文件时，设置一个字符串来匹配发布文件名，例如 "gnu"、"musl" 或 "msvc"。仅当多个发布文件名匹配你的 OS/arch 时才会使用此选项；如果只有一个发布资源匹配，则会忽略该选项。

```toml
[tools]
"ubi:BurntSushi/ripgrep" = { version = "latest", matching = "musl" }
```

### `matching_regex`

设置一个正则表达式，在根据 OS/arch 进行匹配之前匹配发布文件名。如果该模式产生单个匹配项，则选择该文件。如果没有匹配项，ubi 会报告错误。

```toml
[tools]
"ubi:shader-slang/slang" = { version = "latest", matching_regex = "\\d+\\.tar" }
```

### `provider`

设置用于获取资源和发布信息的提供方：`github` 或 `gitlab`（默认为 `github`）。
当你使用 `api_url` 时，请显式设置 `provider`，因为可能无法从 URL 正确推断类型。

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

设置为 `true` 以提取 tarball 中的所有文件，而不仅仅是二进制文件。不能与 `exe` 或 `rename_exe` 兼容。

```toml
[tools]
"ubi:helix-editor/helix" = { version = "latest", extract_all = true }
```

### `bin_path`

tarball 中包含二进制文件的目录。当二进制文件不在 tarball 根目录中时，此选项很有用，并且只有在 `extract_all` 设置为 `true` 时才有意义。

```toml
[tools]
"ubi:owner/repo" = {
  version = "latest",
  extract_all = true,
  bin_path = "target/release", # match the archive's actual layout
}
```

**二进制路径查找顺序：**

1. 如果指定了 `bin_path`，则使用该目录
2. 如果 `extract_all` 设置为 `true`，则使用安装路径根目录
3. 如果未设置 `bin_path`，则在安装路径中查找 `bin/` 目录
4. 如果不存在 `bin/` 目录，则使用已解压目录的根目录

### `tag_regex`

设置一个正则表达式，以过滤掉与其不匹配的标签。当供应商在同一个仓库中为不相关的 CLI 发布版本时，此选项很有用。例如，`cargo-bins/cargo-binstall` 有许多针对 `cargo-binstall` 之外的 CLI 的发布版本；此选项可以过滤掉这些发布版本。

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

有时供应商会以 ubi 无法识别的方式命名其发布版本，可能只针对特定的
OS/arch 组合。例如，在[此工单](https://github.com/houseabsolute/ubi/issues/79)中，某个供应商使用了
"mac"，而不是更常见的 "macos" 或 "darwin" 标签。

对于现有的 ubi 安装，如果你需要隔离其解析器，可以将其与单独安装的 ubi CLI
进行比较。在一个空的临时目录中运行：

```sh
ubi -p jdx/mise
./bin/mise --version
```

### `ubi` 选错了 tarball

GitHub 发布版本可能包含许多 tarball，其中一些不包含你想要的 CLI。使用
`matching` 字段指定要匹配发布文件名的字符串。

```sh
mise use 'ubi:tamasfe/taplo[matching=full]'
# or with ubi directly
ubi -p tamasfe/taplo -m full
```

### `ubi` 无法在 tarball 中找到二进制文件

ubi 假设仓库名称与二进制文件名称相同，但实际情况通常并非如此。
例如，BurntSushi/ripgrep 提供的二进制文件名为 `rg`，而不是 `ripgrep`。在这种情况下，请使用 `exe` 字段指定
二进制文件名称：

```sh
mise use 'ubi:BurntSushi/ripgrep[exe=rg]'
# or with ubi directly
ubi -p BurntSushi/ripgrep -e rg
```

### `ubi` 使用了奇怪的版本

这是 mise 的问题，而不是 ubi 的问题。mise 需要列出工具的可用版本，以便让 "latest"
指向 CLI 的实际最新发布版本。有时供应商会为不相关的内容发布 GitHub
版本。例如，`cargo-bins/cargo-binstall` 是 cargo-binstall 的仓库，但它也有许多
针对不相关 CLI 的发布版本。使用 `tag_regex` 工具选项将这些版本过滤掉：

```sh
mise use 'ubi:cargo-bins/cargo-binstall[tag_regex=^\d+\.]'
```

现在运行 `mise ls-remote ubi:cargo-bins/cargo-binstall[tag_regex=^\d+\.]` 时，你应该只看到
以数字开头的版本。此命令的输出会被缓存，因此你可能需要先运行 `mise cache clear`。
