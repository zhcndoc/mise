---
description: "通过旧版 asdf 兼容插件脚本安装工具。"
---

# asdf 后端

::: warning
asdf 插件被视为旧版插件。出于供应链安全原因，**新的 asdf 和 vfox 插件不会被接受到 [mise registry](https://github.com/jdx/mise/blob/main/registry/) 中**——要提交到 registry，请改用 [packslip](/dev-tools/backends/packslip.html)（项目发布 packslip 时优先使用）、[aqua](/dev-tools/backends/aqua.html)、[github](/dev-tools/backends/github.html) 或 [gitlab](/dev-tools/backends/gitlab.html)。

如果你正在编写私有/自定义插件（不是用于提交到 registry），相比 asdf 更推荐 [vfox 插件](/dev-tools/backends/vfox.html)——它们使用 Lua 编写，支持跨平台（包括 Windows），并且可以使用内置模块进行 HTTP、JSON、HTML 解析等更多功能。
:::

`asdf` 后端会运行工具的 asdf 兼容插件脚本。当现有插件提供你的工具所需的安装行为时，请使用它。这些脚本会以你的权限执行，并且可能调用 mise 之外的程序，因此在使用前请检查插件源代码及其前置条件。

asdf 插件通常需要 Bash 和 Unix 工具。Windows 支持取决于插件及其执行环境；在 Windows 上，优先使用受支持的原生后端或 vfox 插件。

## 用法

当 registry 未提供插件源时，请使用显式插件源。将仓库和版本替换为你准备使用的插件：

```toml
[tools]
"asdf:owner/plugin" = "1.0.0"
```

运行 `mise install`，然后运行 `mise exec -- TOOL --version`，将 `TOOL` 替换为其可执行文件名。安装插件本身不会配置活动工具版本。对于现有的 registry 工具，`mise registry TOOL` 会显示已配置的源。

## 功能对比：asdf 与 vfox

| 领域                 | asdf 插件                                                   | vfox 插件                                                                                   |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 实现方式             | 可执行脚本，通常使用 Bash                                    | 由 mise 内置解释器运行的 Lua Hook                                                            |
| 外部工具             | 通常需要 curl、jq 和平台工具                                 | 提供内置的 HTTP、JSON、HTML 和归档模块                                                       |
| 平台可移植性         | 取决于脚本和可用命令                                         | Lua Hook 可以选择特定于平台的构件；发布者必须提供兼容的构建版本                              |
| 安装                 | 插件脚本下载并安装工具                                       | 结构化下载元数据以及可选的安装后 Hook                                                        |
| 锁定文件             | 版本锁定；没有可移植的构件 URL／来源证明契约                  | 工具插件可以提供下载元数据和证明；不同后端插件的能力有所不同                                  |

这些是接口差异，而不是沙箱边界。任一插件系统都可以运行外部命令。有关 mise 为 vfox Hook 接口添加的能力，请参阅[插件开发](/tool-plugin-development.html)。

## Hook 迁移：asdf 到 vfox

| asdf 脚本                  | vfox Hook                | 说明                                                               |
| -------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `bin/list-all`             | `Available`              | 返回结构化的版本对象，而不是纯文本                                   |
| `bin/download`             | `PreInstall`             | 返回 URL 和校验和；mise 负责处理下载                                  |
| `bin/install`               | `PostInstall`            | 在 mise 下载并解压工具之后运行                                        |
| `bin/exec-env`              | `EnvKeys`                | 返回结构化的键／值对，而不是 `export` 语句                              |
| `bin/list-legacy-filenames` | `PLUGIN.legacyFilenames` | 在 `metadata.lua` 中设置，而不是使用脚本                               |
| `bin/parse-legacy-file`     | `ParseLegacyFile`        | 返回结构化结果，而不是纯文本                                           |

## 为 mise 编写 asdf（旧版）插件

有关[编写插件](https://asdf-vm.com/plugins/create.html)的更多信息，请参阅 asdf 文档。

`bin/list-all` 和 `bin/latest-stable` 版本脚本会接收从 mise 配置中解析出的环境变量和 PATH 附加项，这些内容会在加载工具之前解析。这样一来，私有插件便可以在列出版本时使用凭据、来自 `_.path` 的辅助可执行文件，或 `[env]` 中的其他项目特定值。由于这些值可能会改变可用版本，mise 会针对每个解析后的配置环境分别存储版本列表缓存，而不会将原始值或路径写入缓存。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `asdf` 后端——这些应放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 asdf 插件安装脚本设置环境变量：

```toml
[tools]
"asdf:owner/plugin" = { version = "latest", install_env = { MAKEFLAGS = "-j8" } }
```

### 安装依赖

在同一次安装操作中选定、并使用
[`depends` 选项](/dev-tools/#tool-dependencies)声明的匹配工具，会在 asdf 工具之前安装。它们的路径会被添加到其 `bin/download` 和 `bin/install` 脚本所使用的 `PATH` 中：

```toml
[tools]
python = "3.12"
"asdf:owner/plugin" = { version = "latest", depends = ["python"] }
```

这样，asdf 插件便可以在同一次 `mise install` 期间调用由其他 mise 管理的工具提供的可执行文件。其他处于激活状态的 mise 工具不会被隐式添加；请使用 `depends` 声明每个由 mise 管理的安装依赖项。环境中或配置 `PATH` 中已经可用的可执行文件仍然可用。

`depends` 选项不会添加或安装缺失的工具。配置的依赖项必须已经安装，或在同一次安装操作中被选定。
