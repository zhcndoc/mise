---
description: "安装 Node.js、Python 等工具，为各项目选择版本，并升级或移除工具。"
---

# 开发工具

mise 可以安装 Node.js、Python、Go 等工具，并为每个项目选择对应版本。在项目的 `mise.toml` 中声明所需版本后，mise 会在你于该目录中工作时将这些工具加入 `PATH`。

## 为项目添加工具 {#add-a-tool-to-a-project}

在项目目录中：

```sh
mise use node@24 python@3.14
```

这会安装这两个工具，并将版本请求写入项目配置：

```toml [mise.toml]
[tools]
node = "24"
python = "3.14"
```

使用这些工具运行命令：

```sh
mise exec -- node --version
# v24.x.x
```

启用 [Shell 激活](/shell-setup.html) 后，可以直接运行 `node --version`；在不同项目间切换时，mise 会自动切换版本。克隆仓库或修改其 `mise.toml` 后，运行 `mise install` 安装其中声明的工具。

## 常用命令 {#choose-the-right-command}

| 目标                                   | 命令                                  |
| -------------------------------------- | ------------------------------------- |
| 添加或更改项目的工具版本               | `mise use node@24`                    |
| 设置个人默认版本                       | `mise use --global node@24`           |
| 安装项目声明的工具                     | `mise install`                        |
| 同时安装项目任务所需的工具             | `mise install --include-task-tools`   |
| 临时运行某个版本，不保存配置           | `mise exec node@24 -- node --version` |
| 查看此目录使用的工具                   | `mise ls --current`                   |
| 列出可安装的版本                       | `mise ls-remote node`                 |
| 查看命令实际运行的可执行文件           | `mise which node`                     |
| 查看有新版本可用的工具                 | `mise outdated`                       |
| 按当前版本请求升级                     | `mise upgrade node`                   |
| 升级并改写版本请求                     | `mise upgrade --bump node`            |
| 从项目中移除工具                       | `mise unuse node`                     |
| 删除已安装的版本                       | `mise uninstall node@22`              |

[`mise use`](/cli/use.html) 会安装版本并将请求写入项目的 `mise.toml`。添加 `--pin` 可改为写入解析后的确切版本；添加 `--global` 可将个人默认版本写入 `~/.config/mise/config.toml`；添加 `--path` 可指定文件。详情参阅[写入操作使用的配置文件](/configuration.html#target-file-for-write-operations)。`mise use` 无法更改当前运行命令的 Shell：激活后的 Shell 会在下一个提示符处应用更改，而 `mise exec` 和任务每次运行时都会读取配置。

[`mise install`](/cli/install.html) 安装工具，但不会更改任何配置：

- `mise install node@24.11.1` 安装指定版本。
- `mise install node@24` 安装最新的 24.x 版本。
- `mise install node` 安装配置所选择的版本。
- `mise install` 安装所有已配置的工具，但会跳过标记为 [`lazy = true`](/dev-tools/shims.html#lazy-tools) 的工具；添加 `--include-lazy` 也可安装这些工具。
- `mise install --include-task-tools` 还会安装当前作用域内任务所需的工具，但不会运行任务，可用于预热 CI、容器或离线缓存。添加 `--monorepo` 可包含所有已配置的 monorepo 根目录。

[`mise exec`](/cli/exec.html) 会读取相同的配置文件，因此即使没有激活 Shell 或使用 shims，也可以在任意命令前加上 `mise exec --`。例如，设置别名 `alias mx='mise exec --'` 可以减少输入。运行任务时，[`mise run`](/tasks/) 会加载相同的工具和环境。

## mise 如何选择工具 {#how-tools-are-selected}

1. mise 会读取当前目录、父目录和全局配置中的 `mise.toml` 及其他配置文件。离当前目录较近的文件会覆盖上层文件；参阅[配置文件位置](/configuration.html#mise-toml)。
2. [注册表](/registry.html)会将 `node` 这样的简写映射到[后端](/dev-tools/backends/)，由后端列出版本并安装工具。
3. 后端会解析[版本请求](/dev-tools/versions.html)，例如 `24` 或 `latest`。mise 会先复用匹配的已安装版本，然后才查找更新版本；也可通过[锁文件](/dev-tools/mise-lock.html)固定解析结果。
4. mise 会将所选工具加入命令、任务或 Shell 的 `PATH`。`mise exec` 和 `mise run` 会先安装缺失的工具。

mise 也会读取 `.tool-versions` 文件。要读取 `.nvmrc`、`.python-version` 等其他工具使用的版本文件，必须启用[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。如果你从 asdf 迁移而来，请参阅[从 asdf 迁移](/dev-tools/comparison-to-asdf.html)。运行 `mise config ls` 可查看某个目录中生效的配置文件。

## Shell、编辑器和脚本 {#shells-editors-and-scripts}

- 在交互式 Shell 中，[激活 mise](/shell-setup.html)，这样 `PATH` 和项目环境变量会在每次出现提示符时更新。
- 在编辑器和 IDE 中，如果程序需要稳定的可执行文件路径，请使用 [shims](/dev-tools/shims.html) 或[编辑器集成](/ide-integration.html)。
- 在脚本和 CI 中，运行 `mise exec -- <command>` 或 `mise run <task>`；参阅[持续集成](/continuous-integration.html)。

[Shims](/dev-tools/shims.html#overview) 对这三种方式进行了比较。

## 升级工具 {#upgrade-tools}

[`mise outdated`](/cli/outdated.html) 会列出存在符合当前版本请求的新版本的工具。添加 `--bump` 可改为与所有版本中的最新版本比较。

[`mise upgrade`](/cli/upgrade.html) 会安装各版本请求范围内的最新发行版。如果 `mise.toml` 中设置了 `node = "24"`，运行 `mise upgrade node` 会安装最新的 24.x 版本，同时保持 `mise.toml` 不变。如果项目使用[锁文件](/dev-tools/mise-lock.html)，mise 会将 `mise.lock` 更新为新版本。

`--bump` 会升级到最新发行版，并以相同精度改写版本请求：`node = "24"` 会变为 `node = "26"`，而 `node = "24.11.1"` 会变为最新的确切版本。如果你像 `mise upgrade --bump node@latest` 这样指定了请求，mise 会改为写入该请求。

```sh
mise upgrade --dry-run      # 查看将发生的更改
mise upgrade --interactive  # 从列表中选择工具
mise upgrade --bump --local # 仅提升项目配置中的版本请求
mise upgrade --global       # 仅升级全局配置中的工具
```

即使项目为某个工具设置了自己的版本，`--global` 也只会升级全局配置中的请求，并且绝不会更改项目配置或锁文件。`mise outdated --global` 会报告将要安装的版本。工具的自动更新功能也会使用这两个命令；参阅[自动更新工具](/dev-tools/self-updating-tools.html)。

升级后，mise 会等到 [`upgrade.prune_after`](/configuration/settings.html#upgrade.prune_after) 指定的时间过去后，再安排删除被替换的版本，让仍在运行的程序可以继续使用它。传入 `--prune` 可立即删除，传入 `--no-prune` 可保留；将 [`upgrade.auto_prune`](/configuration/settings.html#upgrade.auto_prune) 设为 `false`，可默认保留被替换的版本。

## 自动更新工具 {#automatic-tool-updates}

全局配置（`~/.config/mise/config.toml`）中的工具可以自动保持更新。在对应条目中设置 `auto_update`：

```toml [~/.config/mise/config.toml]
[tools]
claude = { version = "latest", auto_update = true }
node = { version = "24", auto_update = "6h" }
```

当 shim 或 `mise exec` 即将运行该工具，而距上次检查已超过间隔时，mise 会先对该工具运行 `mise upgrade`，显示常规安装进度，然后运行新版本。更新不会超出版本请求范围：`node = "24"` 会更新到最新的 24.x，不会更新到 26。如果更新失败或处于离线状态，mise 会发出警告并运行当前已安装的版本。

在通过 [`mise activate`](/shell-setup.html) 激活的 Shell 中，工具会直接从 `PATH` 运行，命令执行前没有其他程序拦截。因此，当某个工具到达检查时间时，mise 会在 Shell 提示符出现时于后台启动更新，不会阻塞提示符。更新完成且 Shell 在提示符处刷新环境后，命令才会使用新版本。更新输出会被丢弃；如果失败，`mise doctor` 会显示错误。

`auto_update = true` 会按照 [`tool_update.check_duration`](/configuration/settings.html#tool_update.check_duration) 指定的间隔检查更新。也可以用 `"6h"` 这样的时长为该工具单独设置间隔。小于一小时的间隔会自动提升为一小时。

如果不想逐个标记工具，而要更新全局配置中的所有工具，可将 [`tool_update.global_auto`](/configuration/settings.html#tool_update.global_auto) 设为 `true` 或一个间隔。工具自身的 `auto_update` 设置优先级更高，因此可用 `auto_update = false` 将其排除：

```toml [~/.config/mise/config.toml]
[settings]
tool_update.global_auto = "12h"

[tools]
claude = "latest"
node = { version = "24", auto_update = "6h" }
python = { version = "3.13", auto_update = false }
```

::: tip 24 小时的延迟可能意味着最长 48 小时
更新会遵循 [`minimum_release_age`](/security.html#minimum-release-age)。[大多数后端](/security.html#which-backends-have-a-default)的默认值为 `24h`。发行版发布 24 小时后才符合更新条件，而 mise 要到下次检查时才会发现它。因此，如果至少每个检查间隔启动一次工具，更新会在发行版发布后的 24 至 48 小时内完成；如果没有启动，则还会更晚。
:::

要延长等待时间，可在工具条目中设置 `minimum_release_age`：

```toml [~/.config/mise/config.toml]
[tools]
node = { version = "24", auto_update = "6h", minimum_release_age = "3d" }
```

- 只能在全局配置中启用此功能，项目配置不能启用。如果项目为某个工具设置了自己的版本，则在该项目中运行时不会更新它。
- 启动工具时只会检查正在运行的工具：`mise exec -- npm test` 不会更新 `claude`。在已激活的 Shell 中，提示符出现时会检查所有已启用且间隔已到的工具。任务不会更新工具。
- `node = "24.11.1"` 这样的确切版本不会自动更新。如果全局锁文件（`mise lock --global`）固定了该工具，更新时会将锁文件条目改为新版本。项目配置和锁文件绝不会被修改。
- 只会更新已安装的工具。尚未安装版本的工具（例如尚未运行过的[延迟安装工具](/dev-tools/shims.html#lazy-tools)）会保持不变，直到其他操作安装它。
- 离线、在 CI 中或设置了 `locked = true` 时，不会运行更新。
- 旧版本会按照 `mise upgrade` 后相同的计划清理。
- 如果工具上次更新失败，`mise doctor` 会显示错误。

如果希望按计划检查更新，让工具即使在没有使用 Shell 时也保持最新，可在全局配置中声明 `tool-update` 服务，然后运行 `mise bootstrap services apply`：

```toml [~/.config/mise/config.toml]
[bootstrap.services.mise-tool-update]
builtin = "tool-update"
```

该服务每小时检查一次，并在各工具的更新间隔到期时更新它们。启用该服务后，工具启动和 Shell 提示符本身不会触发更新。参阅[用户服务](/bootstrap/services.html#user-services)。

## 移除工具 {#remove-tools}

| 命令                     | 修改配置            | 删除已安装版本                                                |
| ------------------------ | ------------------- | ------------------------------------------------------------- |
| `mise unuse node`        | 移除版本请求        | 删除所有受跟踪配置和工具存根都不再需要的版本                  |
| `mise uninstall node@22` | 否                  | 删除指定版本；`--all` 会删除该工具的所有版本                  |
| `mise prune`             | 否                  | 删除所有受跟踪配置和工具存根都不再需要的版本                  |

[`mise unuse`](/cli/unuse.html) 会修改第一个声明该工具的已加载配置文件，也可以用 `--path`、`--global` 或 `--env` 指定文件。版本参数匹配配置中原样写入的请求，因此 `node = "24"` 应使用 `mise unuse node@24` 移除，而不是使用解析后的版本。添加 `--no-prune` 可保留已安装版本。

[`mise uninstall`](/cli/uninstall.html) 会删除已安装版本，但保留配置；因此，下次运行 `mise install` 时，仍在配置中的工具会再次安装。

[`mise prune`](/cli/prune.html) 会删除所有已使用过的配置文件和已运行过的工具存根都不再需要的版本。mise 会将这些文件记录在 `~/.local/state/mise/tracked-configs` 和 `tracked-stubs` 中。正在运行的进程已启动的版本会保留。运行 `mise ls --prunable` 或 `mise prune --dry-run` 可预览待删除内容。

## 自动安装 {#auto-install-mechanisms}

如果缺少已配置的工具，mise 可以自动安装，而不是直接失败。将 [`auto_install`](/configuration/settings.html#auto_install) 设为 `false` 会关闭下表中的前四种情况；[`auto_install_disable_tools`](/configuration/settings.html#auto_install_disable_tools) 可列出要跳过自动安装的工具。延迟安装工具仍会在首次使用时安装。

| 运行场景                                                                  | mise 安装的内容                                                | 控制设置                                                                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 运行 `mise exec`                                                          | 安装配置选择的缺失工具                                        | [`exec_auto_install`](/configuration/settings.html#exec_auto_install)                                             |
| 运行 `mise run`                                                           | 安装任务需要的缺失工具                                        | [`task.run_auto_install`](/configuration/settings.html#task.run_auto_install)                                     |
| 激活的 Shell 中的未知命令，或指向缺失版本的 shim                        | 提供该命令的已配置工具                                        | [`not_found_auto_install`](/configuration/settings.html#not_found_auto_install)                                   |
| 配置中未提及的未知命令                                                    | 提供该命令的唯一注册表工具，并将其添加到全局配置              | [`not_found_auto_install_registry`](/configuration/settings.html#not_found_auto_install_registry)，默认关闭     |
| [延迟安装工具](/dev-tools/shims.html#lazy-tools)中的命令                  | 首次使用时安装该工具                                          | 工具的 `lazy = true`                                                                                              |

关闭自动安装后，`mise exec` 会警告工具缺失，然后运行 `PATH` 上已有的同名命令。命令未找到处理器通过注册表中的命令名称查找工具，因此在 `cargo:some-crate` 这样的原始后端工具安装过某个版本之前，处理器无法安装它；参阅[故障排查](/troubleshooting.html#auto-install-on-command-not-found-does-not-trigger)。

## 工具选项 {#tool-options}

要设置选项，请将工具写成表格，而不是版本字符串。除非某一行注明了支持的后端，下列选项适用于任何工具条目。后端专属选项（例如 GitHub 的 `matching`）列于各个[后端页面](/dev-tools/backends/)中。

| 选项                  | 作用                                                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`             | [版本请求](/dev-tools/versions.html)。对于[其他类型的请求](/dev-tools/versions.html#scopes)，可改用 `prefix`、`ref` 或 `path`。                                                                                                                                                                    |
| `os`                  | 仅在指定平台安装和使用工具；参阅[按操作系统选择工具](#os-specific-tools)。                                                                                                                                                                                                                         |
| `depends`             | 先安装这些工具；参阅[工具依赖项](#tool-dependencies)。                                                                                                                                                                                                                                            |
| `install_env`         | 为安装工具的命令（构建脚本、软件包管理器、插件钩子）及其 `postinstall` 设置环境变量。解析和下载工具时，mise 也会读取其中的 GitHub、GitLab 和 Forgejo 令牌变量；参阅[令牌](/dev-tools/github-tokens.html)。                                                                                          |
| `postinstall`         | 工具安装后运行的命令；参阅[工具安装后命令](#tool-postinstall-commands)。                                                                                                                                                                                                                          |
| `lazy`、`lazy_bins`   | 首次运行工具命令时才安装；参阅[延迟安装工具](/dev-tools/shims.html#lazy-tools)。                                                                                                                                                                                                                  |
| `auto_update`         | 仅在全局配置中使用；运行工具前先更新；参阅[自动更新工具](#automatic-tool-updates)。                                                                                                                                                                                                                |
| `minimum_release_age` | 仅选择至少在指定时长前发布的版本（后端提供发行日期时）；参阅[最低发行间隔](/security.html#minimum-release-age)。                                                                                                                                                                                  |
| `prerelease`          | 在 `mise ls-remote` 和解析 `latest` 或版本前缀时包含预发行版。除核心 `java` 插件外，所有后端都支持；参阅 [`prereleases`](/configuration/settings.html#prereleases)。                                                                                                                               |
| `version_order`       | 对 aqua、github、gitlab、forgejo 和 http 工具按 `semver` 或 `source` 排序；参阅[版本排序](/dev-tools/versions.html#version-ordering)。                                                                                                                                                             |

mise 的 HTTP 客户端不会从 `install_env` 读取代理变量，因此请在启动 mise 的环境中设置 `HTTPS_PROXY` 等变量。

### 行内或表格语法 {#table-format}

简短选项可以写在一行中；工具有多个选项时请使用表格。以下两种写法等价：

::: code-group

```toml [Inline]
[tools]
ripgrep = { version = "15", os = ["linux", "macos"] }
```

```toml [Table]
[tools.ripgrep]
version = "15"
os = ["linux", "macos"]
```

:::

mise 支持 TOML 1.1，因此行内表格可以跨多行，并以逗号结尾。对于嵌套选项（例如 HTTP 后端的按平台 `platforms`），可以使用点分隔键，也可以为每个平台单独写一行：

```toml [mise.toml]
[tools."http:my-tool"]
version = "1.0.0"
platforms.macos-arm64.url = "https://example.com/my-tool-macos-arm64.tar.gz"
platforms.linux-x64.url = "https://example.com/my-tool-linux-x64.tar.gz"
```

校验和与可执行文件选择方式请参阅 [HTTP 后端](/dev-tools/backends/http.html)。

### 命令行选项 {#on-the-command-line}

在版本号前将选项附加到工具名称后，并用逗号分隔。请将参数括起来，避免 Shell 展开方括号：

```sh
mise use 'github:jqlang/jq[version_prefix=jq-,rename_exe=jq]@1.8.2'
```

`mise install` 和 `mise exec` 也支持相同语法。`mise use` 会将选项写入 `mise.toml`：

```toml [mise.toml]
[tools]
"github:jqlang/jq" = { version = "1.8.2", version_prefix = "jq-", rename_exe = "jq" }
```

`mise use --tool-option KEY=VALUE` 会为后面指定的工具设置选项。`mise use --tool-option mr_boxington=true rust mr-boxington` 会为 `rust` 设置此选项，并添加该选项所需的 `mr-boxington` 工具；参阅[使用 Mr Boxington 缓存 Cargo 构建](/lang/rust.html#share-cargo-builds-with-mr-boxington)。

### 工具选项中的变量 {#templates-in-tool-configuration}

版本和选项值可以使用[模板](/templates.html)引用环境变量和 [`vars`](/configuration/vars.html)，包括 `[env]` 通过 `_.source`、`_.file` 或环境模块加载的值。例如，将 Go 安装指向公司的模块代理：

```toml [mise.toml]
[vars]
goproxy = "https://goproxy.example.com"

[tools]
go = "1.27"
"go:github.com/mikefarah/yq/v4" = { version = "latest", install_env = { GOPROXY = "{{ vars.goproxy }}" } }
```

### 按操作系统选择工具 {#os-specific-tools}

设置 `os` 可让工具仅在某些平台上安装和使用。在其他平台上，mise 会跳过该工具：

```toml [mise.toml]
[tools]
# 仅限 Linux 和 macOS
ripgrep = { version = "latest", os = ["linux", "macos"] }

# 仅限 Windows
"github:PowerShell/PowerShell" = { version = "latest", os = ["windows"] }

# Linux，以及搭载 Apple 芯片的 macOS
hk = { version = "latest", os = ["linux", "macos/arm64"] }
```

可选值为 `linux`、`macos`（或 `darwin`）、`windows`（或 `win`）和 `unix`（除 Windows 外的所有平台）。可以添加架构来缩小范围，例如 `macos/arm64` 或 `linux/x64`；架构可写为 `arm64`（或 `aarch64`）和 `x64`（或 `x86_64`、`amd64`）。未指定架构时，该值匹配平台上的所有架构。

### 工具依赖项 {#tool-dependencies}

`depends` 会让一个工具等待其他工具安装完成。如果某个工具的安装过程或 `postinstall` 需要运行后端本身并不依赖的其他工具，可使用此选项：

```toml [mise.toml]
[tools]
node = "24"
# postinstall 会运行 npm，因此必须先完成 node 的安装
# github:example/acme 是占位值
"github:example/acme" = { version = "1.2.3", depends = ["node"], postinstall = "npm install --prefix ~/.acme acme-plugins" }
```

`depends` 接受单个工具名称或列表。它只控制安装顺序，不会添加或安装所列工具。每个工具都必须在 `[tools]` 中配置并先行安装，或已经位于 `PATH` 上。安装依赖它们的工具及运行其 `postinstall` 时，所列工具会加入 `PATH`。插件作者应通过 `PLUGIN.depends` 声明插件自身的依赖；参阅[工具插件开发](/tool-plugin-development.html#depends)。

### 工具安装后命令 {#tool-postinstall-commands}

`postinstall` 会在该工具安装后运行命令。它与 [`[hooks].postinstall`](/hooks.html) 钩子不同，后者会在一次完整的 `mise install` 结束后运行一次：

```toml [mise.toml]
[tools]
node = { version = "24", postinstall = "corepack enable" }
```

默认情况下，此命令仅在 mise 安装或修复工具时运行；安装失败后不会运行，使用 `--dry-run` 时也不会运行。要让它在每次 `mise install` 和 `mise use` 时运行（即使该版本已经安装），请设置 `when = "always"`：

```toml [mise.toml]
[tools]
node = { version = "24", postinstall = { run = "corepack enable", when = "always" } }
```

此命令运行时，工具的 `bin` 目录和[依赖项](#tool-dependencies)会加入 `PATH`，并可使用工具的 `install_env` 和项目的 `[env]` 值。以下模板会先完成渲染：<code v-pre>{{ tools.ripgrep.path }}</code>。命令还会收到以下环境变量：

- `MISE_TOOL_NAME`：工具的简写名称，例如 `node`。
- `MISE_TOOL_VERSION`：已安装的版本，例如 `24.11.1`。
- `MISE_TOOL_INSTALL_PATH`：工具的安装目录。
- `MISE_CONFIG_FILE`：声明该工具的配置文件。
- `MISE_CONFIG_ROOT`：该文件的[配置根目录](/configuration.html#config-root)。
- `MISE_PROJECT_ROOT`：当前项目根目录；没有活动项目时则为配置根目录。

`postinstall` 执行失败会导致安装失败。

## 系统级安装 {#system-installations}

`mise install --system` 会将工具安装到共享目录，默认是 `/usr/local/share/mise/installs`，这样机器上的每个用户账户都能使用同一份安装。请以普通用户身份运行；在 Unix 上，mise 只会在写入受保护目录时调用 `sudo`。支持的后端、目录和 sudo 设置见[系统级安装](/dev-tools/system-installs.html)。

## 缓存 {#caching-and-performance}

mise 会在一段时间内复用工具的远程版本列表：安装时最长复用到工具的
[`minimum_release_age`](/configuration/settings.html#minimum_release_age)，报告最新版本时则按
[`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 设置复用。运行 `mise cache clear <tool>` 可刷新列表。另请参阅[缓存](/cache-behavior.html)；若激活导致 Shell 提示符变慢，请参阅[Shell 提示符缓慢](/troubleshooting.html#slow-shell-prompts)。
