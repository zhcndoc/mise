# asdf 后端

::: warning
asdf 插件被视为遗留方案。**出于供应链安全原因，新的 asdf 和 vfox 插件不被接受加入 [mise registry](https://github.com/jdx/mise/blob/main/registry/)** —— 如需提交到 registry，请改用 [aqua](/dev-tools/backends/aqua.html)（首选）或 [github](/dev-tools/backends/github.html) 后端。

如果你正在编写私有/自定义插件（不是用于提交到 registry），相比 asdf 更推荐 [vfox 插件](/dev-tools/backends/vfox.html)——它们使用 Lua 编写，支持跨平台（包括 Windows），并且可以使用内置模块进行 HTTP、JSON、HTML 解析等更多功能。
:::

`asdf` 是 mise 的原始后端。

它依赖于每个工具对应的 asdf 插件。asdf 插件通常由与工具供应商无关的单一开发者编写，因此使用风险更高。它们通常也无法在 Windows 上正常工作，因为它们是用 bash 编写的，而 Windows 上通常没有 bash，并且这些脚本一般也不是为跨平台而写的。

对于 [registry](https://github.com/jdx/mise/blob/main/registry/) 中的工具，如果可能的话，不会使用 asdf 插件。有时无法使用更安全的后端（如 aqua/github），因为某些工具的安装过程很复杂，或者需要导出环境变量。

这些插件都托管在 mise-plugins 组织下，以保障供应链安全，因此你无需依赖除我之外的任何人维护的插件。

由于 asdf 工具更复杂且存在安全隐患，我们正在积极将 registry 中的工具尽可能从 asdf 迁移到不需要插件的后端，如 aqua 和 github。尽管如此，并非所有工具都能通过 github/aqua 正常工作，因为它们可能具有独特的安装流程，或者需要设置除 `PATH` 之外的环境变量。

## 功能对比：asdf 与 vfox

| 功能                         | asdf 插件           | vfox 插件            |
| --------------------------- | ------------------ | -------------------- |
| **语言**                    | Bash 脚本           | Lua                  |
| **Windows 支持**            | ❌                 | ✅                   |
| **内置 HTTP 模块**          | ❌（需要 curl）     | ✅                   |
| **内置 JSON 模块**          | ❌（需要 jq）       | ✅                   |
| **内置 HTML 解析**          | ❌                 | ✅                   |
| **内置归档解压**            | ❌                 | ✅                   |
| **内置 semver 模块**        | ❌                 | ✅                   |
| **内置日志记录**            | ❌                 | ✅                   |
| **安装后钩子**              | ❌                 | ✅                   |
| **安全证明**                | ❌                 | ✅（cosign、SLSA）   |
| **多工具插件**              | ❌                 | ✅（后端插件）       |
| **锁文件支持**              | ❌                 | ✅                   |
| **滚动版本校验和**          | ❌                 | ✅                   |

## Hook 迁移：asdf 到 vfox

| asdf 脚本                  | vfox Hook                | 说明                                                             |
| --------------------------- | ------------------------ | ---------------------------------------------------------------- |
| `bin/list-all`              | `Available`              | 返回结构化的版本对象，而不是纯文本                                   |
| `bin/download`             | `PreInstall`             | 返回 URL 和校验和；mise 负责处理下载                                  |
| `bin/install`               | `PostInstall`            | 在 mise 下载并解压工具之后运行                                        |
| `bin/exec-env`              | `EnvKeys`                | 返回结构化的键/值对，而不是 `export` 语句                              |
| `bin/list-legacy-filenames` | `PLUGIN.legacyFilenames` | 在 `metadata.lua` 中设置，而不是使用脚本                               |
| `bin/parse-legacy-file`     | `ParseLegacyFile`        | 返回结构化结果，而不是纯文本                                           |

## 为 mise 编写 asdf（旧版）插件

有关[编写插件](https://asdf-vm.com/plugins/create.html)的更多信息，请参阅 asdf 文档。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `asdf` 后端——这些
应放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 asdf 插件安装脚本设置环境变量：

```toml
[tools]
"asdf:owner/plugin" = { version = "latest", install_env = { MAKEFLAGS = "-j8" } }
```
