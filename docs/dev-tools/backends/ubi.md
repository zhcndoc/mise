---
description: "请在 mise 2027.1.0 发布前，将工具从已弃用的 ubi 后端迁移到 github、gitlab 或 http 后端。"
---

# 从 ubi 后端迁移 <Badge type="danger" text="已弃用" />

`ubi` 后端使用 [ubi](https://github.com/houseabsolute/ubi) 库，从 GitHub 和 GitLab 发行版中安装单个可执行文件。该后端已弃用：请将每个 `ubi:` 工具迁移到 [github](/dev-tools/backends/github.html)、[gitlab](/dev-tools/backends/gitlab.html) 或 [http](/dev-tools/backends/http.html) 后端。

::: warning 已弃用
从 2026.4.0 起，mise 每次运行时在列出 `ubi:` 工具版本或安装该工具时会打印一次弃用警告。ubi 后端将在 mise 2027.1.0 中移除；请在升级到该版本前完成迁移。
:::

## 迁移工具 {#usage}

请逐个迁移工具，并在替代工具确认可用前保留旧安装。

1. 更改后端前缀：

   | ubi 条目                                    | 替代写法                                                                                   |
   | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
   | `ubi:owner/repo`                            | `github:owner/repo`                                                                        |
   | `ubi:owner/repo` with `provider = "gitlab"` | `gitlab:owner/repo`                                                                        |
   | `ubi:https://...`, a direct download URL    | An `http:` tool with that [`url`](/dev-tools/backends/http.html#usage) and a version label |

2. 根据[选项映射](#option-mapping)替换工具选项。
3. 安装并运行该工具：

   ```sh
   mise install
   mise exec -- <command> --version
   ```

4. 如果使用锁文件，请运行 `mise lock` 为新工具写入条目。然后使用 `mise uninstall --all ubi:owner/repo` 移除旧安装。

如果工具通过 `exe` 指定可执行文件名称，迁移到新后端后通常无需设置该选项，因为 github 后端会解压归档并查找可执行文件：

```toml
[tools]
# was: "ubi:BurntSushi/ripgrep" = { version = "14.1.1", exe = "rg" }
"github:BurntSushi/ripgrep" = "14.1.1"
```

若要保留重命名后的可执行文件，请按文件名进行重命名：

```toml
[tools]
# was: "ubi:cli/cli" = { version = "latest", exe = "gh", rename_exe = "gh-cli" }
"github:cli/cli" = { version = "latest", rename_exe = { "gh" = "gh-cli" } }
```

GitLab 工具应迁移到 gitlab 后端：

```toml
[tools]
# was: "ubi:gitlab-org/cli" = { version = "latest", exe = "glab", provider = "gitlab" }
"gitlab:gitlab-org/cli" = "latest"
```

## 选项映射

| ubi 选项          | 替代方式                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exe`            | 通常可删除：github 和 gitlab 后端会解压整个归档并查找可执行文件。若只需公开其中一部分，请使用 [`filter_bins`](/dev-tools/backends/github.html#filter-bins)。 |
| `rename_exe`     | 使用 [`rename_exe`](/dev-tools/backends/github.html#rename-exe)。如果 `exe` 指定的文件名与仓库名不同，请使用表格形式，例如 `rename_exe = { "gh" = "gh-cli" }`。 |
| `matching`       | 使用 [`matching`](/dev-tools/backends/github.html#matching)，它会在平台检测前筛选资源；参见[行为差异](#behavior-differences)。 |
| `matching_regex` | [`matching_regex`](/dev-tools/backends/github.html#matching-regex)                                                                                                                           |
| `provider`       | 使用 `github:` 或 `gitlab:` 前缀                                                                                                                                                             |
| `api_url`        | [`api_url`](/dev-tools/backends/github.html#api-url)                                                                                                                                         |
| `extract_all`    | 删除此选项：这些后端始终会解压整个归档。                                                                                                                                                       |
| `bin_path`       | 使用 [`bin_path`](/dev-tools/backends/github.html#bin-path)。github 后端会移除单个顶层目录，除非设置了 `bin_path`；请根据归档内容检查路径。 |
| `tag_regex`      | 没有等价选项。使用 [`version_prefix`](/dev-tools/backends/github.html#version-prefix) 只保留以固定前缀开头的标签。                                                                             |

## 行为差异

| 行为                           | ubi                                                                                                | github 和 gitlab 后端                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `matching`                    | 在已匹配当前平台的资源中解决并列情况；只有一个匹配项时忽略此选项                                            | 在平台检测前筛选资源；当前平台没有匹配资源时会报错                                                               |
| 安装内容                       | 除非设置 `extract_all`，否则只安装一个可执行文件                                                            | 安装整个归档；含可执行文件的目录会加入 `PATH`，因此归档中的其他可执行文件也可能出现在其中                           |
| 没有发行版的仓库               | 将 Git 标签列作版本                                                                                         | 只列出带有资源的发行版，因此只发布标签的仓库没有可用版本                                                       |
| 验证                           | 记录已安装可执行文件的校验和                                                                                | 检查发行版摘要或校验和文件及 GitHub 制品证明，并在 `mise.lock` 中记录下载 URL                                    |

这两个后端都不会将相同 `owner/repo` 的不同条目视为独立工具：`ubi:owner/repo[matching=a]` 和 `ubi:owner/repo[matching=b]` 会解析为同一工具，并且只安装第一个条目。若要从同一个发行版安装多个二进制文件，请为每个文件创建指向 `github:owner/repo` 的[工具别名](/dev-tools/backends/github.html#multiple-assets-from-the-same-release)。

## 现有配置参考 {#tool-options}

完成迁移前，`ubi:` 工具仍可使用以下选项：

- `exe`：从归档中提取的可执行文件，默认使用仓库名称。
- `rename_exe`：提取后赋予可执行文件的名称。
- `matching`：多个资源都与操作系统和架构匹配时，用于在资源名称中查找文本，例如 `gnu`、`musl` 或 `msvc`。只有一个资源匹配时，ubi 会忽略此选项。
- `matching_regex`：在匹配操作系统和架构之前，资源名称必须匹配的正则表达式。没有匹配项时，ubi 会报错。
- `provider`：`github`（默认值）或 `gitlab`。
- `api_url`：自托管实例的服务商 API URL。还需设置 `provider`，并在 `MISE_GITHUB_ENTERPRISE_TOKEN` 或 `MISE_GITLAB_ENTERPRISE_TOKEN` 中提供令牌。
- `extract_all`：设为 `true` 时提取归档中的所有文件，而非单个可执行文件；此时会忽略 `exe` 和 `rename_exe`。
- `bin_path`：配合 `extract_all` 使用，指定安装目录中存放可执行文件的目录。
- `tag_regex`：发行版标签必须匹配的正则表达式；只有匹配的标签会列为版本。

工具可以写作 `ubi:owner/repo`、`ubi:owner/repo@1.25.1`，也可以使用直接下载 URL，例如
`ubi:https://github.com/goreleaser/goreleaser/releases/download/v1.16.2/goreleaser_Darwin_arm64.tar.gz`,
which has only the version `latest`.

设置 `bin_path` 后，mise 会将该目录加入 `PATH`。否则，如果设置了 `extract_all`，就使用安装目录；若安装目录中存在 `bin/`，则使用该目录；最后才回退到安装目录本身。

`tag_regex` 会匹配完整标签，包括前导 `v`。`cargo-bins/cargo-binstall` 会为多个 crate 发布版本；以下配置只保留 `v1.2.3` 形式的标签：

```sh
mise use 'ubi:cargo-bins/cargo-binstall[tag_regex=^v\d+\.]'
mise ls-remote 'ubi:cargo-bins/cargo-binstall[tag_regex=^v\d+\.]'
```

## 故障排查

如果 ubi 选择了错误的资源、找不到可执行文件或列出了无关版本，请迁移该工具。github 后端的 [`matching`](/dev-tools/backends/github.html#matching)、[`asset_pattern`](/dev-tools/backends/github.html#asset-pattern)、[`version_prefix`](/dev-tools/backends/github.html#version-prefix) 和 [`rename_exe`](/dev-tools/backends/github.html#rename-exe) 可处理这些情况。

Implementation: [`src/backend/ubi.rs`](https://github.com/jdx/mise/blob/main/src/backend/ubi.rs).
