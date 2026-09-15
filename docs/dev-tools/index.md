---
description: "为每个项目安装开发工具并自动切换版本。"
---

# Dev Tools

mise 会为每个项目安装开发工具并选择其版本。
在同一台机器上保留多个 Node.js、Python、Ruby、Go 及其他工具的版本，
然后在 `mise.toml` 中声明项目使用的版本。

## 将工具添加到项目

在项目目录中：

```sh
mise use node@24 python@3.13
```

这会安装工具，并将版本请求记录到配置中：

```toml [mise.toml]
[tools]
node = "24"
python = "3.13"
```

使用这些工具运行命令：

```sh
mise exec -- node --version
```

使用 [shell 激活](/getting-started.html#activate-mise)后，你可以直接运行
`node --version`。当你在项目之间切换时，mise 会更新 shell 环境。激活会选择已安装的工具；在克隆仓库或编辑其配置后，使用 `mise install` 安装工具。

## 选择正确的命令

| 目标                                             | 命令                               |
| ------------------------------------------------ | ------------------------------------- |
| 添加或更改项目的工具版本           | `mise use node@24`                    |
| 设置个人默认版本                           | `mise use --global node@24`           |
| 安装项目声明的工具              | `mise install`                        |
| 尝试一个版本但不保存                  | `mise exec node@24 -- node --version` |
| 显示当前配置选择的工具 | `mise ls --current`                   |
| 在配置的版本请求范围内升级    | `mise upgrade node`                   |

像 `"24"` 这样的版本请求会选择该系列中的一个版本。精确固定版本会选择特定版本。参见 [mise.lock](/dev-tools/mise-lock.html)，了解如何记录解析后的版本而不替换 `mise.toml` 中的版本请求。

## 工具的选择方式

1. mise 会发现当前目录及其父目录中的配置，以及全局配置。更具体的配置可以覆盖默认值。
2. 每个工具的[后端](/dev-tools/backends/)都会解析其版本请求并处理安装。[注册表](/registry.html)会将简短的工具名称映射到后端，因此通常不需要自行选择后端。
3. mise 会将选定的工具添加到命令的 `PATH` 中。默认情况下，`mise exec`
   和 `mise run` 会在执行命令或任务前安装缺失的工具。

使用 `mise config ls` 检查活动配置文件。完整的优先级规则请参见
[配置](/configuration.html)。

### Shell、编辑器和脚本

- **交互式 shell：** [激活 mise](/getting-started.html#activate-mise)，以便在每次提示符出现时更新
  `PATH` 和项目环境变量。
- **编辑器：** 使用 [IDE 集成](/ide-integration.html)，包括程序需要稳定可执行文件路径时使用的
  [shims](/dev-tools/shims.html)。
- **脚本和 CI：** 使用 `mise exec -- <command>` 或 `mise run <task>` 加载项目环境，而不依赖 shell 启动文件。

### 现有版本文件

mise 也会读取 asdf 的 `.tool-versions` 文件。`.nvmrc` 和 `.python-version` 等工具专用文件需要启用
[惯用版本文件](/configuration.html#idiomatic-version-files)。
迁移指南请参见[与 asdf 的比较](./comparison-to-asdf)。

### 工具配置中的模板

工具版本和选项可以引用环境变量以及
[`vars`](/configuration/vars.html)，包括来自 `_.source`、`_.file`
和环境模块的值。这些值会在工具模板渲染前解析。

## 工具选项

工具选项可自定义特定后端的安装方式。请从后端参考文档开始：某个后端的有效选项可能不适用于同一工具的另一个来源。

示例使用 TOML 1.1，该版本允许内联表跨多行书写，并允许在其中使用尾随逗号。当将选项拆分为多行可以提高可读性时，请使用这种形式。

### 表格格式（推荐）

当选项包含嵌套字段时，请使用 TOML 表。这展示了 HTTP 后端的平台映射；请将示例 URL 替换为你自己的发布资源：

```toml [mise.toml]
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/my-tool-macos-x64.tar.gz",
}
linux-x64 = {
  url = "https://example.com/my-tool-linux-x64.tar.gz",
}
```

有关校验和、可执行文件选择以及其他平台映射，请参见
[HTTP 后端](/dev-tools/backends/http.html)。

### 点号表示法

相同的嵌套字段也可以使用点号键书写：

```toml
[tools."http:my-tool"]
version = "1.0.0"
platforms.macos-x64.url = "https://example.com/my-tool-macos-x64.tar.gz"
platforms.linux-x64.url = "https://example.com/my-tool-linux-x64.tar.gz"
```

### 通用嵌套支持

mise 接受嵌套 TOML 选项，但所选后端必须理解这些选项。嵌套是一种组织已记录选项的方式；它不会定义新后端，也不会向现有后端添加任意功能。对于简短声明，请使用单行内联表：

```toml
[tools]
node = { version = "24", postinstall = "node --version" }
```

### 版本排序

后端通常会保留其版本源返回的顺序。当上游在较新的发布线之后发布回溯版本时，Aqua、GitHub、GitLab、Forgejo 和 HTTP 工具可以选择采用语义版本优先级：

```toml
[tools]
"github:owner/tool" = { version = "latest", version_order = "semver" }
```

对于 `latest`，后端返回的权威结果仍然具有优先权——例如 GitHub 或 Forgejo 上标记为 **Latest** 的发布版本。如果该发布版本与请求的软件包不匹配，或者后端没有权威的最新版本结果，mise 会回退到版本列表，并在那里应用 `version_order`。这对于包含多个产品的仓库非常重要：仓库范围内的 Latest 发布版本可能并不包含每个软件包对应的资源。

使用 `version_order = "semver"` 时，mise 会在 `mise ls-remote` 输出中按优先级排列有效的语义版本，并在解析该列表或版本前缀时采用相同顺序。不透明版本会在语义版本之前保留其源顺序，因此像 `nightly` 这样的精确请求仍可正常工作。构建元数据不会影响优先级。对于已知遵循语义版本规范的工具，注册表条目可以设置此选项；用户可以设置 `version_order = "source"` 以恢复后端的默认排序。

### 工具安装后命令

通过在工具配置中添加 `postinstall` 字段，可以在工具完成安装后立即运行命令。这与 `[hooks].postinstall` 分开，仅在安装特定工具时适用。

```toml
[tools]
node = { version = "22", postinstall = "corepack enable" }
```

行为：

- 当该工具/版本的安装成功完成后，会运行该命令。
- 命令执行期间，该工具的 bin 路径会位于 PATH 中，因此你可以直接调用已安装的工具。
- 环境变量包括指向该工具安装目录的 `MISE_TOOL_INSTALL_PATH`，以及来自该工具 `install_env` 选项的任何变量。
- 如果安装失败，则不会运行 `postinstall` 命令。

## 操作系统特定工具

你可以使用 `os` 字段将工具限制为特定操作系统：

```toml
[tools]
# 仅在 Linux 和 macOS 上安装
ripgrep = { version = "latest", os = ["linux", "macos"] }

# 仅在 Windows 上安装
"github:PowerShell/PowerShell" = { version = "latest", os = ["windows"] }

# 与其他选项一起使用
"cargo:usage-cli" = {
  version = "latest",
  os = ["linux", "macos"],
  locked = false,
}
```

`os` 字段接受一个操作系统标识符数组：

- `"linux"` - 所有 Linux 发行版
- `"macos"` - macOS（Darwin）。`"darwin"` 也可作为别名接受。
- `"windows"` - Windows。`"win"` 也可作为别名接受。

### 操作系统/架构组合

你也可以使用 `os/arch` 语法将工具限制为特定的操作系统和架构组合：

```toml
[tools]
# 仅在 macOS ARM64 和所有 Linux 上安装（跳过 macOS x86_64）
hk = { version = "latest", os = ["linux", "macos/arm64"] }

# 仅在 Linux x86_64 上安装
jq = { version = "latest", os = ["linux/x64"] }
```

支持的架构标识符：

- `"arm64"`（或 `"aarch64"`）
- `"x64"`（或 `"x86_64"` 或 `"amd64"`）

当某一项包含 `/` 时，操作系统和架构都必须匹配。当某一项只是一个操作系统名称时，它匹配该操作系统上的任意架构。

如果工具指定了 `os` 限制，而当前操作系统不在列表中，mise 会跳过该工具的安装和使用。

## 工具依赖

你可以使用 `depends` 字段在工具之间声明显式安装依赖。这可以确保一个工具在另一个工具开始安装之前已完全安装完成。

```toml
[tools]
python = "3.14"
uv = "latest"
"pipx:ruff" = { version = "latest", depends = ["python"] }
```

在此示例中，`pipx:ruff` 会等待 `python` 完成安装后再开始安装。

`depends` 字段接受单个字符串或字符串数组：

```toml
[tools]
# 单个依赖
"pipx:ruff" = { version = "latest", depends = "python" }

# 多个依赖
# "pipx:ruff" = { version = "latest", depends = ["python", "uv"] }
```

用户指定的 `[tools].depends` 会添加排序约束，并使匹配的工具可供安装 hook 使用。诸如 vfox `PLUGIN.depends` 之类的后端声明会与这些用户声明合并到同一个安装依赖上下文中。

依赖声明不会将工具添加到配置中，也不会自动安装工具。当配置了匹配的工具时，必须解析出其选定版本，并且该版本已经安装（或在同一安装批次中更早成功完成安装）。如果没有匹配的已配置工具，现有系统或配置 `PATH` 中的可执行文件仍可能满足该依赖。

### vfox 插件 hook 依赖

vfox 插件作者应在 `metadata.lua` 的 `PLUGIN` 表中声明插件固有的要求：

```lua
PLUGIN = {
    name = "example",
    version = "1.0.0",
    depends = { "go" },
}
```

使用在 `mise.toml` 中显示的工具名称。用户可以通过 `[tools].depends` 补充插件声明；这两种形式都会影响安装顺序、`os.execute` 和 `cmd.exec` 可见的 `PATH`，以及 `tools = true` 环境值。它们不会影响 `io.popen`。参见[工具插件开发](/tool-plugin-development#_2-metadata-lua)。

## 缓存与性能

远程版本列表会根据
[`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache)进行缓存。
下载的工件和后端元数据拥有各自的缓存。保留和复用行为取决于后端和设置；缓存的版本列表并不意味着请求的工具已经安装。

Shell 激活会在命令运行前准备工具路径。当跟踪的配置和环境输入没有变化时，`mise hook-env`
可以跳过相关工作。对于速度较慢的提示符，请使用[故障排除指南](/troubleshooting.html#slow-shell-prompts)
查找耗时的输入。有关在提示符处解析与在每个命令中解析之间的区别，请参见 [shims](/dev-tools/shims.html)。

## 常用命令

以下是使用开发工具时最重要的一些命令。点击命令标题可打开其参考页面，其中列出了所有可用的标志/选项以及更多示例。

### [`mise use`](/cli/use)

`mise use` 会安装请求的版本，并将请求记录到配置中：

```sh
mise use node@24
mise exec -- node --version
```

默认情况下，它会写入当前项目的 `mise.toml`：

```toml [mise.toml]
[tools]
node = "24"
```

使用 `--pin` 写入具体版本而不是请求，使用 `--global` 设置个人默认版本，或使用 `--path` 选择配置文件。参见
[写入目标规则](/configuration.html#target-file-for-write-operations)。

该命令不会直接更改其父 shell。Shell 激活会在下一个提示符或受支持的目录变更 hook 中应用选择；`mise exec`
和任务会显式加载它。编辑 `mise.toml` 也会更改选择；之后运行 `mise install` 以安装新声明的工具。

### [`mise install`](/cli/install)

`mise install` 会下载或构建工具，而不会更改版本声明。
要选择已安装的版本，请在配置中声明该版本，或直接将其传递给
`mise exec`，例如 `mise exec node@24 -- node --version`。

::: tip
如果你从 `asdf` 转来，则无需先运行 `mise plugin add` 来安装插件；如有需要，mise 会自动完成。你仍然可以手动安装插件，也可以安装默认注册表中没有的插件。
:::

它可以通过多种方式使用：

- `mise install node@20.0.0` - 安装特定版本
- `mise install node@20` - 安装与此前缀匹配的最新版本
- `mise install node` - 安装当前在 `mise.toml`（或其他配置文件）中指定的 node 版本
- `mise install` - 安装配置文件中指定的所有插件和工具
- `mise install --include-task-tools` - 还会安装当前范围内任务所需的每个工具，但不会运行这些任务

最后一种形式适用于在运行任务前预热 CI、容器或离线缓存。添加
`--monorepo` 可包含每个已配置 monorepo 根目录中的任务工具。

### [`mise exec`|`mise x`](/cli/exec)

对于使用特定工具执行一次性命令，请使用 `mise x`。例如，使用 Python 3.14 运行脚本：

```sh
mise x python@3.14 -- python myscript.py
```

在默认的 [`auto_install`](/configuration/settings.html#auto_install) 和
[`exec_auto_install`](/configuration/settings.html#exec_auto_install) 设置下，如果 Python 尚未安装，mise 会自动安装它。`mise x` 还会读取本地/全局 `mise.toml`/`.tool-versions` 文件，因此如果你不想使用 `mise activate` 或 shims，可以在命令前加上 `mise x --` 来使用 mise：

```sh
mise x -- node --version
```

::: tip
如果你经常使用这个命令，设置一个别名会很有帮助：

```sh
alias mx="mise x --"
```

:::

同样，`mise run` 会[执行任务](/tasks/)，并使用所有工具激活 mise 环境。

## 自动安装机制

mise 提供了多种机制，可根据需要自动安装缺失的工具或版本。下面按照触发方式和时机进行分类，并列出每种机制的相关设置。以下常规机制需要启用 [auto_install](/configuration/settings.html#auto_install)，执行、任务和缺失命令则有单独的控制项。请参见[延迟工具](/dev-tools/shims.html#lazy-tools)，了解如何显式声明将安装延迟到首次使用命令时的工具。

### 按需执行 ([`mise x`](/cli/exec), [`mise r`](/cli/run))

默认情况下，[`mise x`](/cli/exec) 和 [`mise r`](/cli/run) 会在执行前安装缺失的非延迟工具。延迟工具会在首次使用时处理。

- **触发时机：** 每当你使用 [`mise x`](/cli/exec) 或 [`mise r`](/cli/run) 执行尚未安装的工具/版本时。
- **如何控制：**
  - 设置：[`exec_auto_install`](/configuration/settings.html#exec_auto_install)（默认：true）
  - 设置：[`task.run_auto_install`](/configuration/settings.html#task.run_auto_install)（默认：true）

### 命令未找到处理程序（Shell 集成）

如果你在 shell 中输入一个命令（例如 `node`）但系统找不到它，mise 可以在知道该二进制文件由哪个工具提供的情况下，尝试自动安装缺失的工具版本。

- **触发时机：** 当 shell 中找不到某个命令且处理程序已启用时。
- **如何控制：**
  - 设置：[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install)（默认：true）
- **限制：** mise 通过注册表的 bin 元数据识别提供者，因此即使配置的工具从未安装过，也可以处理这些工具；但无法处理通过原始后端规范配置的工具（例如 `cargo:some-crate`），因为这类工具不包含此类元数据。请使用 `mise install` 显式安装，或使用 `mise x` 一步完成安装和运行。请参阅[故障排除](/troubleshooting.html#auto-install-on-command-not-found-does-not-trigger)。

::: tip
通过将 [`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 设置为工具名称列表，可以为特定工具禁用自动安装。
:::
