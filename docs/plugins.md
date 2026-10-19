---
description: "安装、配置、更新和移除为 mise 添加工具、环境变量或软件包管理器的插件。"
socialDescription: "安装、更新和移除为 mise 添加工具、环境变量或软件包管理器的插件。"
---

# 插件

插件是一个脚本目录（通常使用 Lua），可让 mise 安装工具、设置环境变量或管理其他程序的软件包。
大多数工具不需要插件，建议先查看[后端](/dev-tools/backends/)。

## 何时需要插件 {#when-you-need-a-plugin}

工具无需注册表短名称或插件也能安装。内置后端可以直接安装大多数工具，例如使用
`mise use github:owner/repo` 安装发布制品，或使用 `mise use npm:prettier` 安装 npm 软件包；
参阅[如何选择后端](/dev-tools/backends/#which-backend-to-use)。

当安装或配置所需逻辑尚无后端支持时，才使用插件。例如：下载或构建方式特殊的工具、来自内部制品
服务器的一系列工具、从服务中读取环境变量，或属于其他程序的软件包（如 VS Code 扩展）。

社区插件位于 [mise-plugins](https://github.com/mise-plugins) 组织和
[vfox 插件索引](https://github.com/version-fox/vfox-plugins)中。[注册表](/registry.html)并非插件目录。

## 插件类型 {#choose-a-plugin-type}

| 类型            | 提供内容                                                     | 使用方式                                                       | 开发指南                                                    |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 工具            | 单个工具及其版本                                             | `[tools]` `my-tool = "1.2.0"`                                  | [工具插件](/tool-plugin-development.html)                   |
| 后端            | 使用同一前缀的一系列工具                                     | `[tools]` `"my-backend:some-tool" = "1.2.0"`                   | [后端插件](/backend-plugin-development.html)                |
| 环境            | 环境变量和 `PATH` 条目；不安装任何内容                       | `[env]` `_.my-env-plugin = { api_url = "..." }`                | [环境插件](/env-plugin-development.html)                   |
| 包管理器        | 由其他程序（如 VS Code）管理的软件包                         | `[bootstrap.packages]` `"vscode:ms-python.python" = "latest"` | [包管理器插件](/package-plugin-development.html)           |
| asdf（旧版）    | 通过 Shell 脚本管理单个工具；仅支持 Linux 和 macOS            | `[tools]` `my-tool = "1.2.0"`                                  | [asdf 插件（旧版）](/asdf-legacy-plugins.html)              |

Lua 插件属于 [vfox](https://vfox.dev) 插件：工具插件使用 vfox 钩子，因此大多数 vfox 插件都能在
mise 中使用。后端、环境和包管理器钩子是 mise 新增的功能，vfox CLI 不会运行这些钩子。

Linux、macOS 和 Windows 版 mise 都内置 Lua 运行时。插件仍需通过所选下载项和运行的程序决定支持
哪些平台。asdf 插件使用 Shell 脚本，mise 不会在 Windows 上运行基于 asdf 的工具。

## 安装插件 {#installing-plugins}

### 在 mise.toml 中声明 {#in-mise-toml}

在 `[plugins]` 中声明插件，确保项目中的所有人使用相同的插件：

```toml [mise.toml]
[plugins]
my-tool = "https://github.com/your-org/mise-my-tool#v1.2.0"

[tools]
my-tool = "2.0.0"
```

`mise install` 会先安装插件，再安装工具。`#` 后的内容用于选择标签、分支或完整提交 SHA；mise
不接受缩写 SHA。标签或分支可能移动，因此请固定完整提交 SHA，确保每次使用相同的插件代码。

条目只会在 mise 安装插件时生效。更改条目后，`mise install` 和 `mise doctor` 会警告已安装插件与
配置不匹配；请运行 `mise plugins install --force my-tool`，根据 `[plugins]` 中的配置重新安装。
该配置段支持的所有值请参阅 [`[plugins]`](/configuration.html#plugins)。

### 从命令行安装 {#from-a-git-repository}

[`mise plugins install`](/cli/plugins/install.html) 只为当前用户安装插件；项目配置不会记录该插件：

```sh
mise plugins install my-tool https://github.com/your-org/mise-my-tool
mise plugins install my-tool 'https://github.com/your-org/mise-my-tool#v1.2.0'
```

如果省略名称，mise 会从 URL 中提取名称，并去掉开头的 `asdf-`、`mise-` 或 `vfox-`。例如，
`https://github.com/your-org/mise-my-tool` 会安装为 `my-tool`。如果插件已安装，mise 会发出警告并
保持不变；添加 `--force` 可替换它。

### 从私有仓库安装 {#from-a-private-repository}

请使用 SSH URL，或使用已配置 Git 凭据助手的 HTTPS URL。不要把令牌放进 URL，否则它会出现在
`mise.toml`、Shell 历史记录和日志中。`[plugins]` 的值是 [Tera 模板](/templates.html)，因此共享配置
可以从环境变量中读取部分来源信息：

```toml [mise.toml]
[plugins]
my-backend = "git@github.com:{{ env.PLUGIN_ORG }}/my-backend.git"
```

### 从 ZIP 压缩包安装 {#from-zip-file}

以 `.zip` 结尾的 URL 会安装压缩包中的内容：

```sh
mise plugins install my-tool https://github.com/your-org/mise-my-tool/archive/refs/tags/v1.2.0.zip
```

如果压缩包中只有一个顶层目录（如 GitHub 标签压缩包），mise 会解开该目录。通过压缩包安装的插件
不是 Git 工作区，因此 `mise plugins update` 无法更新；请运行
`mise plugins install --force my-tool <new-archive-url>` 替换它。

### 从本地目录安装 {#from-local-directory}

[`mise plugins link`](/cli/plugins/link.html) 会为目录创建符号链接，因此修改插件后无需重新安装即可生效：

```sh
mise plugins link my-tool ./mise-my-tool
```

若要替换已安装的插件，请添加 `--force`。`[plugins]` 条目也可以指定本地目录；以 `./` 或 `../`
开头的路径相对于声明该条目的配置文件所在的[配置根目录](/configuration.html#config-root)解析。

### 从已签名的 packslip 发行包安装 {#from-a-signed-packslip-release}

发布者可以在 GitHub 上将 Lua 插件作为已签名的
[packslip](/dev-tools/backends/packslip.html) 压缩包发布：

```sh
mise plugins install vfox:my-plugin 'packslip:your-org/my-plugin#1.0.0'
```

packslip 来源始终安装 vfox 插件，因此在命令行和 `[plugins]` 中都可以省略 `vfox:` 前缀。例如，
`my-plugin = "packslip:your-org/my-plugin#1.0.0"` 与 `"vfox:my-plugin" = ...` 均有效。命令行中
不接受 `asdf:` 等其他类型前缀。已安装插件会保留安装时指定的类型。省略 `#1.0.0` 可使用最新的
符合条件的发行版。mise 会验证压缩包的签名、摘要和签名者；`mise plugins update` 会保留显式指定的
版本固定值。目前仅支持发布了 `packslip.sigstore.json` 的 GitHub 仓库；参阅
[vfox 后端](/dev-tools/backends/vfox.html#install-from-a-signed-packslip)。

### 通过工具标识安装 {#vfox-identifiers}

`[tools]` 中的 `vfox:` 标识用于指定插件的 GitHub 仓库；mise 首次需要该插件时会自动安装：

```sh
mise use vfox:version-fox/vfox-cmake
```

参阅 [vfox 后端](/dev-tools/backends/vfox.html)和支持相同方式的
[asdf 后端](/dev-tools/backends/asdf.html)，后者接受 `asdf:owner/repo`。

## 使用插件 {#using-plugins}

### 工具插件 {#tool-plugins}

工具插件的安装名称就是工具名称：

```sh
mise ls-remote my-tool
mise use my-tool@2.0.0
mise exec -- my-tool --version
```

`--` 后面是可执行文件名称，该名称可能与工具名称不同。

### 后端插件 {#backend-plugins}

为每个工具添加安装插件时使用的名称作为前缀：

```sh
mise ls-remote my-backend:some-tool
mise use my-backend:some-tool@1.0.0
```

```toml [mise.toml]
[tools]
"my-backend:some-tool" = "1.0.0"
```

插件的 README 会列出它提供的工具。如果插件支持列举工具，这些工具也会显示在
[`mise search`](/cli/search.html) 和 Shell 补全中。

### 环境插件 {#environment-plugins}

环境插件会在 `[env]` 的 `_` 下添加一条指令。该表用于填写插件文档中说明的选项：

```toml [mise.toml]
[env]
_.my-env-plugin = { api_url = "https://api.example.com", debug = true }
```

`mise env` 会显示插件设置的变量。mise 会自行读取两个键，不会将它们传给插件：设置
`tools = true` 后，指令会在已配置工具加入 `PATH` 后运行；设置 `redact = true` 后，变量值会按
[敏感信息隐藏](/environments/secrets/#redaction)处理。添加指令前，请先安装插件或在 `[plugins]`
中列出它；参阅[故障排除](#troubleshooting)。

### 包管理器插件 {#package-plugins}

包管理器插件会向 [`[bootstrap.packages]`](/bootstrap/packages/) 添加一个包管理器。插件名称是其软件包
名称的前缀：

```toml [mise.toml]
[bootstrap.plugins]
vscode = "https://github.com/your-org/mise-vscode-extensions"

[bootstrap.packages]
"vscode:ms-python.python" = "latest"
```

`mise bootstrap` 会先安装插件，再安装软件包。若不想在配置中声明插件，可运行
`mise plugins install package:vscode <url>`。Bootstrap 指南中的[包管理器插件](/bootstrap/packages/plugins.html)
介绍了相关命令，以及 mise 如何跟踪已安装的软件包。

## 工具选项 {#tool-options}

工具条目中的选项也会传给相应插件。插件的 README 会列出它会读取的选项：

```toml [mise.toml]
[tools]
my-tool = { version = "2.0.0", mirror = "https://mirror.example.com" }
```

`os`、`depends`、`install_env`、`lazy`、`lazy_bins` 和 `auto_update` 由 mise 自行处理；参阅
[工具选项](/dev-tools/#tool-options)。其他所有选项都会传给插件，包括 mise 也会处理的
`postinstall` 和 `minimum_release_age`。Lua 钩子可从 `ctx.options` 读取选项。安装、卸载和环境钩子，
以及作用于某个已安装版本的 asdf 脚本，还能通过 `MISE_TOOL_OPTS__` 环境变量读取这些选项；此处
示例为 `MISE_TOOL_OPTS__MIRROR`。详见[工具插件选项](/tool-plugin-development.html#tool-options)。

## 更新和固定插件版本 {#update-plugins}

```sh
mise plugins update my-tool          # update one plugin
mise plugins update my-tool#v1.3.0   # check out another ref
mise plugins update                  # update every plugin
```

[`mise plugins update`](/cli/plugins/update.html) 更新的是插件代码，而不是插件安装的工具版本。mise
会跳过链接安装的插件，也无法更新从 ZIP 压缩包安装的插件。packslip 插件会保留显式指定的版本；
运行 `mise plugins update my-plugin#1.1.0` 可切换到另一个发行版。

`mise.toml` 或 `mise.lock` 中固定的版本是工具版本，而非插件代码版本。也应在 `[plugins]` 中或命令行
指定 ref 来固定插件，并在更改 ref 前检查代码变化。

要查看已安装的插件及其修订版本，请运行：

```sh
mise plugins ls --urls
mise plugins ls --outdated   # plugins whose Git remote has newer commits
```

## 移除插件 {#remove-plugins}

```sh
mise plugins uninstall my-tool
```

[`mise plugins uninstall`](/cli/plugins/uninstall.html) 会移除插件代码，但会保留它安装的工具版本。由于
mise 需要插件来设置这些工具的环境，请先用 [`mise uninstall`](/cli/uninstall.html) 移除工具，或添加
`--purge`。对于工具插件，`--purge` 还会删除工具的安装文件、下载内容和缓存；对于后端插件，则会对
已安装或已在配置中声明的每个 `my-backend:<tool>` 执行相同操作。如果某工具的目录也被其他工具使用，
mise 会发出警告并跳过它；共享安装目录和系统安装目录中的内容会保留。还应删除 `[plugins]` 和
`[tools]` 条目，否则 mise 会再次安装插件。

## 迁移 asdf 插件 {#hook-migration}

asdf 插件仍可在 Linux 和 macOS 上运行。若要让它支持 Windows，并为每次下载提供校验和，请将其移植为
Lua 工具插件；[asdf 插件（旧版）](/asdf-legacy-plugins.html)说明了各 asdf 脚本对应的 Lua 替代钩子，
[工具插件](/tool-plugin-development.html)则介绍了这些钩子。

## 安全 {#security-considerations}

插件会以你的权限运行，可以读写文件、发起网络请求和启动程序；Lua 并非沙箱。安装插件以及每次更新前，
都应检查其源代码，并固定到已审核的修订版本。在[安全模式](/security.html#safe-mode)下，mise 会拒绝安装
插件。有关信任与验证，请参阅[安全](/security.html)。

## 故障排除 {#troubleshooting}

| 现象                                                                   | 处理方法                                                                                                                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mise plugins install` 克隆失败                                         | 使用 `git ls-remote <url>` 检查 URL 和 ref；私有仓库还需检查 Git 凭据。                                                                                                      |
| `Plugin my-tool already installed` 且没有变化                           | 使用 URL 或 `[plugins]` 配置运行 `mise plugins install --force my-tool`。                                                                                                   |
| 提示插件与 `[plugins]` 配置不匹配                                       | 运行 `mise plugins install --force my-tool`，根据 `[plugins]` 配置重新安装。                                                                                                  |
| 工具安装失败                                                             | 运行 `MISE_DEBUG=1 mise install my-tool@2.0.0` 查看插件输出。确认插件支持当前平台，且所需程序均已安装。                                                                        |
| 项目中的每条命令都报 `Invalid version: my-env-plugin`                    | `_.my-env-plugin` 指定的环境插件尚未安装。请在 `[plugins]` 中列出，或切换到其他目录运行 `mise plugins install` 或 `mise plugins link`。                                       |
| 环境插件设置的变量缺失                                                   | 运行 `mise env`，并确认 `mise plugins ls` 中存在与指令同名的插件。`mise env` 输出可能包含机密信息，请勿粘贴到 issue 中。                                                     |
