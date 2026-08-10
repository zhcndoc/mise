# 开发工具

> _安装并在开发工具之间切换，例如 node、python、cmake、terraform，
> 以及[数百种更多工具](/registry.html)，全部来自同一个项目配置。_

`mise` 是一个用于管理编程语言运行时和其他本地开发工具安装的工具。例如，它可用于在同一台机器上管理 Node.js、Python、Ruby、Go 等的多个版本。

一旦[激活](/getting-started.html#activate)，mise 就可以根据你所在的目录，在不同版本的工具之间自动切换。
这意味着，如果你有一个需要 Node.js 18 的项目，另一个需要 Node.js 22 的项目，mise 会在你在这两个项目之间切换时自动切换它们。可在 [registry](/registry) 中查看 mise 可用的工具。

为了知道该使用哪个工具版本，mise 通常会在当前目录及其父目录中查找 `mise.toml` 文件。为了了解工具是如何指定的，下面是一个 [mise.toml](/configuration.html) 文件示例：

```toml [mise.toml]
[tools]
node = '24'
python = '3'
ruby = 'latest'
```

它也兼容 asdf 的 `.tool-versions` 文件，以及像 `.node-version` 和
`.ruby-version` 这样的[惯用版本文件](/configuration#idiomatic-version-files)。更多细节请参见[配置](/configuration)。

在指定工具版本和工具选项时，你也可以引用环境变量，或引用在你的配置层级中定义的
[`vars`](/tasks/task-configuration.html#vars)，包括由 `_.source`、`_.file` 或 env modules 等指令生成的值。这些内容会在渲染工具版本和选项模板之前解析。

::: info
mise 兼容 asdf 的 `.tool-versions` 文件，并且在需要时仍然可以使用 asdf
插件。如果你正在从 asdf 迁移，请参见
[对比指南](./comparison-to-asdf)。
:::

## 工作原理

mise 通过一个复杂但易于使用的系统来管理开发工具，该系统会自动处理工具安装、版本管理和环境设置。

### 工具解析流程

当你进入一个目录或运行一个命令时，mise 会遵循以下流程：

1. **配置发现**：mise 会沿着目录树向上查找配置文件（`mise.toml`、`.tool-versions` 等），并按层级进行合并
2. **工具解析**：mise 使用注册表和版本列表，将版本规范（如 `node@latest` 或 `python@3`）解析为具体版本
3. **后端选择**：mise 会选择合适的 [后端](/dev-tools/backend_architecture) 来处理每个工具（core、asdf、aqua 等）
4. **安装检查**：mise 会验证所需的工具版本是否已安装，并自动安装缺失的版本
5. **环境设置**：mise 会配置你的 `PATH` 和环境变量，以使用已解析的工具版本

### 环境集成

mise 提供了多种方式与你的开发环境集成：

**自动激活**：使用 `mise activate`，mise 会挂钩到你的 shell 提示符，并在你切换目录时自动更新环境：

```bash
eval "$(mise activate zsh)"  # 在你的 ~/.zshrc 中
cd my-project               # 自动加载 mise.toml 中的工具
```

**按需执行**：使用 `mise exec` 在不永久激活的情况下，借助 mise 的环境运行命令：

```bash
mise exec -- node my-script.js  # 使用 mise.toml 中的工具运行
```

**Shims**：mise 可以创建轻量级的包装脚本，自动使用正确的工具版本：

```bash
mise activate --shims  # 创建 shims，而不是修改 PATH
```

### 路径管理

mise 会修改你的 `PATH` 环境变量，以优先使用正确的工具版本：

```bash
# 在使用 mise 之前
echo $PATH
/usr/local/bin:/usr/bin:/bin

# 在某个包含 node@20 的项目中激活 mise 后
echo $PATH
/home/user/.local/share/mise/installs/node/20.11.0/bin:/usr/local/bin:/usr/bin:/bin
```

这可以确保当你运行 `node` 时，得到的是项目配置中指定的版本，而不是系统范围内安装的版本。

### 配置层级

mise 支持嵌套配置，并会从更广泛的设置逐层传递到更具体的设置：

```bash
~/.config/mise/config.toml      # 全局默认值
~/work/mise.toml                # 工作区特定工具
~/work/project/mise.toml        # 项目特定覆盖
~/work/project/.tool-versions   # 兼容旧版 asdf
```

每一层都可以覆盖或扩展上一层，从而让你能够在不同上下文中对工具版本进行细粒度控制。

## 工具选项

工具选项允许你自定义工具的安装和配置方式。它们支持嵌套配置，便于更好地组织，尤其适用于特定平台的设置。

### 表格格式（推荐）

指定嵌套选项最简洁的方式是使用 TOML 表格：

```toml
[tools."http:my-tool"]
version = "1.0.0"

[tools."http:my-tool".platforms]
macos-x64 = {
  url = "https://example.com/my-tool-macos-x64.tar.gz",
  checksum = "sha256:abc123",
}
linux-x64 = {
  url = "https://example.com/my-tool-linux-x64.tar.gz",
  checksum = "sha256:def456",
}
```

### 点号记法

你也可以使用点号记法来表示更简单的嵌套配置：

```toml
[tools."http:my-tool"]
version = "1.0.0"
platforms.macos-x64.url = "https://example.com/my-tool-macos-x64.tar.gz"
platforms.linux-x64.url = "https://example.com/my-tool-linux-x64.tar.gz"
simple_option = "value"
```

### 通用嵌套支持

任何后端都可以使用嵌套选项来组织复杂配置：

```toml
[tools."custom:my-backend"]
version = "1.0.0"

[tools."custom:my-backend".database]
host = "localhost"
port = 5432

[tools."custom:my-backend".cache.redis]
host = "redis.example.com"
port = 6379
```

在内部，嵌套选项会被展平成点号记法（例如 `platforms.macos-x64.url`、`database.host`、`cache.redis.port`），供后端访问。

### 版本排序

后端通常会保留其版本源返回的顺序。当上游在较新的发布线之后发布回溯版本时，Aqua、GitHub、GitLab、Forgejo 和 HTTP 工具可以选择采用语义版本优先级：

```toml
[tools]
"github:owner/tool" = { version = "latest", version_order = "semver" }
```

对于 `latest`，后端返回的权威结果仍然具有优先权——例如 GitHub 或 Forgejo 上标记为 **Latest** 的发布版本。如果该发布版本与请求的软件包不匹配，或者后端没有权威的最新版本结果，mise 会回退到版本列表，并在那里应用 `version_order`。这对于包含多个产品的仓库非常重要：仓库范围内的 Latest 发布版本可能并不包含每个软件包对应的资源。

使用 `version_order = "semver"` 时，mise 在解析回退列表或版本前缀时，会根据优先级对有效的语义版本进行排序。不透明版本会在语义版本之前保留其源顺序，因此 `nightly` 等精确请求仍可正常工作。构建元数据不会影响优先级。对于已知遵循语义版本规范的工具，注册表条目可以设置此选项；用户可以设置 `version_order = "source"`，以恢复后端的默认排序。

该选项只影响版本解析。`mise ls-remote` 仍会显示后端返回的规范顺序。

### 工具安装后命令

通过在某个工具的配置中添加 `postinstall` 字段，可以在工具完成安装后立即运行一条命令。这与 `[hooks].postinstall` 是分开的，并且只在安装特定工具时生效。

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
"npm:windows-terminal" = { version = "latest", os = ["windows"] }

# 与其他选项一起使用
"cargo:usage-cli" = {
    version = "latest",
    os = ["linux", "macos"],
    locked = false
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
mytool = { version = "latest", os = ["linux/x64"] }
```

支持的架构标识符：

- `"arm64"`（或 `"aarch64"`）
- `"x64"`（或 `"x86_64"` 或 `"amd64"`）

当某一项包含 `/` 时，操作系统和架构都必须匹配。当某一项只是一个操作系统名称时，它匹配该操作系统上的任意架构。

如果某个工具指定了 `os` 限制，而当前操作系统不在列表中，mise 将跳过安装和使用该工具。

## 工具依赖

你可以使用 `depends` 字段在工具之间声明显式安装依赖。这可以确保一个工具在另一个工具开始安装之前已完全安装完成。

```toml
[tools]
python = "3.12.11"
"pipx:ruff" = { version = "latest", depends = ["python"] }
```

在这个示例中，`pipx:ruff` 会等到 `python` 完成安装后才开始。

`depends` 字段接受单个字符串或字符串数组：

```toml
[tools]
# 单个依赖
"pipx:ruff" = { version = "latest", depends = "python" }

# 多个依赖
"pipx:ruff" = { version = "latest", depends = ["python", "pipx"] }
```

用户指定的 `depends` 会为当前安装集合中已存在的工具添加顺序约束。当某个已配置工具的安装必须在另一个已配置工具的安装开始之前完成时，请使用它，尤其是在这些安装否则会并行运行的情况下。

### vfox 插件 hook 依赖

`[tools]` 中的 `depends` 只会添加安装图的排序关系。它本身不会声明 hook 运行时依赖，也不会将这些工具添加到 vfox 安装 hook 运行时使用的 `PATH` 中。

对于 vfox 插件，请在 `metadata.lua` 的 `PLUGIN` 表中声明安装 hook 所需的工具：

```lua
PLUGIN = {
    name = "example",
    version = "1.0.0",
    depends = { "go" },
}
```

使用工具名称，就像它们在 `mise.toml` 中出现的那样。当匹配的工具已配置时，mise 会使用这些元数据条目来安排当前的安装任务顺序，并构建 hook 环境。请参阅[工具插件开发](/tool-plugin-development#_2-metadata-lua)。

## 缓存与性能

mise 使用智能缓存来尽量减少开销：

- **版本列表**：按天缓存，避免重复的 API 调用
- **安装产物**：缓存下载内容，以加快重新安装速度
- **环境解析**：缓存环境设置，以便更快地显示 shell 提示符
- **插件元数据**：缓存插件信息，以提升操作速度

这确保了 mise 在你的日常开发工作流中只会带来极小的延迟。

::: info
激活后，只要目录发生变化，或者提示符被_显示_，mise 就会更新诸如 PATH 之类的环境变量。
参见 [FAQ](/faq#what-does-mise-activate-do)。
:::

激活后，每次提示符显示时，都会调用 `mise hook-env` 来获取新的
环境变量。
这应该非常快。如果目录没有变化，或者 `mise.toml`/`.tool-versions` 文件没有被修改，它会提前退出。

`mise` 会提前修改 `PATH`，因此运行时会被直接调用。这意味着调用工具时没有任何开销，并且像 `which node` 这样的命令会返回二进制文件的真实路径。
其他工具如 asdf 仅支持 shim 文件，在调用时动态定位运行时，这会增加一点延迟，并且可能会给某些命令带来问题。更多信息请参见 [shims](/dev-tools/shims)。

## 常用命令

以下是在使用开发工具时最重要的一些命令。点击每个命令的标题可跳转到其参考文档页面，查看所有可用的标志/选项以及更多示例。

### [`mise use`](/cli/use)

对于某些用户来说，`mise use` 可能是你唯一需要学习的命令。它会执行以下操作：

- 如有需要，安装工具的插件
- 安装指定版本
- 将该版本设为当前活动版本（即更新 `PATH`）
- 更新当前配置文件（`mise.toml` 或 `.tool-versions`）

```shell
> cd my-project
> mise use node@26
# 下载 node，验证签名...
mise node@26.x.x ✓ 已安装
mise ~/my-project/mise.toml tools: node@26.x.x # mise.toml 已创建/更新

> which node
~/.local/share/mise/installs/node/26/bin/node
```

`mise use node@26` 会安装最新的 node-26 版本，并创建/更新本地目录中的 `mise.toml` 配置文件。生成的文件如下所示：

```toml [mise.toml]
[tools]
node = "26"
```

只要你进入该目录，就会使用这个版本的 `node`。

`mise use -g node@26` 也会执行同样的操作，但会更新 [全局配置](/configuration.html#global-config-config-mise-config-toml)（`~/.config/mise/config.toml`），因此除非本地目录层级中存在配置文件，否则 node-26 将成为该用户的默认版本。

你也可以直接编辑 `mise.toml`，而不是使用 `mise use`——效果是一样的。编辑后运行 `mise install` 以安装任何新工具。

### [`mise install`](/cli/install)

`mise install` 会安装工具，但不会激活它们——也就是说，它会将工具下载/构建/编译到 `~/.local/share/mise/installs` 中，但如果不在 `.mise-toml` 或 `.tool-versions` 文件中“设置”该版本，你将无法使用它。

::: tip
如果你是从 `asdf` 迁移过来的，不需要再运行 `mise plugin add` 来先安装插件，必要时会自动完成。当然，如果你愿意，也可以手动安装插件，或者想使用默认注册表中没有的插件。
:::

它有很多种用法：

- `mise install node@20.0.0` - 安装特定版本
- `mise install node@20` - 安装匹配此前缀的最新版本
- `mise install node` - 安装当前在 `mise.toml`（或其他配置文件）中指定的 node 版本
- `mise install` - 安装配置文件中指定的所有插件和工具

### [`mise exec`|`mise x`](/cli/exec)

`mise x` 可用于一次性命令，并使用特定工具。例如：如果你想用 python3.12 运行一个脚本：

```sh
mise x python@3.12 -- ./myscript.py
```

如果 Python 尚未安装，它会被安装。`mise x` 也会读取本地/全局的 `.mise-toml`/`.tool-versions` 文件，所以如果你不想使用 `mise activate` 或 shim，也可以只需在命令前加上 `mise x --` 来使用 mise：

```sh
$ mise use node@20
$ mise x -- node -v
20.x.x
```

::: tip
如果你经常使用这个命令，设置一个别名会很有帮助：

```sh
alias mx="mise x --"
```

:::

类似地，`mise run` 可用于[执行任务](/tasks/)，它还会激活 mise 环境以及你所有的工具。

## 自动安装机制

mise 提供了若干机制，可根据需要自动安装缺失的工具或版本。下面按触发方式和时机对这些机制进行分组，并列出各自相关的设置。所有机制都需要启用全局 [auto_install](/configuration/settings.html#auto_install) 设置（**所有 auto_install 设置默认均已启用**）。

### 按需执行 ([`mise x`](/cli/exec), [`mise r`](/cli/run))

当你运行诸如 [`mise x`](/cli/exec) 或 [`mise r`](/cli/run) 之类的命令时，mise 会自动安装执行该命令所需的任何缺失工具版本。

- **何时触发：** 当你使用尚未安装的工具/版本运行 [`mise x`](/cli/exec) 或 [`mise r`](/cli/run) 时。
- **如何控制：**
  - 设置：[`exec_auto_install`](/configuration/settings.html#exec_auto_install)（默认：true）
  - 设置：[`task_auto_install`](/configuration/settings.html#task_auto_install)（默认：true）

### 命令未找到处理程序（Shell 集成）

如果你在 shell 中输入一个命令（例如 `node`）但系统找不到它，mise 可以在知道该二进制文件由哪个工具提供的情况下，尝试自动安装缺失的工具版本。

- **何时触发：** 当命令在 shell 中未找到且处理程序已启用时。
- **如何控制：**
  - 设置：[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install)（默认：true）
- **限制：** 仅适用于至少已经安装了一个版本的工具，因为否则 mise 无法知道哪个工具提供了该二进制文件。

::: tip
通过将 [`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 设置为工具名称列表，可以为特定工具禁用自动安装。
:::
