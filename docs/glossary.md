---
description: "指南和 CLI 参考中使用的概念定义。"
---

# 术语表

指南和 CLI 参考中使用的概念定义。点击术语链接查看配置语法和示例。

## 核心概念

**Activation**
: 将 mise 的上下文（工具、环境变量、PATH 修改）加载到 shell 会话中的过程。通常通过在 shell rc 文件中使用 `eval "$(mise activate bash)"` 完成。有关设置说明，请参见 [Installing mise](/installing-mise.html)。

**Backend**
: 从特定来源解析版本并安装工具的实现。后端可以直接下载发行版本，也可以使用包管理器；它不一定是一个独立程序。请参见下方的 [Backends](#backends) 和 [Backend Architecture](/dev-tools/backend_architecture) 了解详情。

**Core Tools**
: 随 mise 一起提供、使用 Rust 编写的内置工具实现。这些实现为 Node.js、Python、Ruby 和 Go 等常用语言提供一流支持。完整列表请参见 [Core tools](/core-tools)。

**mise.toml**
: mise 项目的主要配置文件。包含工具版本、环境变量、任务和钩子。完整规范请参见 [配置](/configuration)。

**mise.local.toml**
: 覆盖 `mise.toml` 的用户本地配置文件。通常会加入 `.gitignore`，用于不应与团队共享的个人设置。

**插件**
: 为 mise 添加功能的扩展，例如管理额外工具或设置环境变量。概览请参见 [插件](/plugins)。

**注册表**
: 工具别名的集合，将用户友好的短名称映射到其完整的后端规范。例如，`aws-cli` 映射到 `aqua:aws/aws-cli`。请参见 [注册表](/registry)。

**工具**
: mise 可以安装和管理的开发工具或运行时，例如 `node`、`python`、`terraform` 或 `jq`。

**Tool Request**
: 用户对工具版本的指定，可以是模糊版本或使用别名。例如：`node@24`、`python@latest`、`go@1.26`。这些请求会解析为具体的工具版本。

**Tool Version**
: 工具的具体解析版本。例如，`node@24`（工具请求）可能会解析为 `node@24.0.0`（工具版本）。

**Toolset**
: 特定上下文中请求和解析出的工具集合，其中包含某个目录或项目应处于活动状态的所有工具版本。

## 后端

mise 支持多个后端，用于从不同来源安装工具：

**aqua**
: 使用 [aqua](https://aquaproj.github.io/) 注册表的后端。为受支持的工具提供发行版本选择和验证元数据。请参见 [aqua backend](/dev-tools/backends/aqua)。

**asdf**
: 与 [asdf](https://asdf-vm.com/) shell 脚本插件兼容的传统后端。仅支持 Linux 和 macOS。比原生后端更慢，但可访问 asdf 插件生态系统。参见 [asdf 后端](/dev-tools/backends/asdf)。

**cargo**
: 在可用且启用 `cargo-binstall` 时使用它安装 Rust CLI 工具，否则使用 `cargo install` 编译安装。请参见 [cargo backend](/dev-tools/backends/cargo)。

**conda**
: 直接从 Conda 频道下载并解析软件包，无需 conda 可执行文件。请参见 [conda backend](/dev-tools/backends/conda)。

**dotnet**
: 安装 .NET 工具。参见 [dotnet 后端](/dev-tools/backends/dotnet)。

**forgejo**
: 从 Forgejo 发布版本安装工具。请参见 [Forgejo backend](/dev-tools/backends/forgejo.html)。

**gem**
: 将 Ruby gems 作为工具安装。参见 [gem 后端](/dev-tools/backends/gem)。

**github**
: 直接从 GitHub 发布版本安装工具。参见 [github 后端](/dev-tools/backends/github)。

**gitlab**
: 直接从 GitLab 发布版本安装工具。参见 [gitlab 后端](/dev-tools/backends/gitlab)。

**go**
: 使用 `go install` 安装 Go 工具。参见 [go 后端](/dev-tools/backends/go)。

**http**
: 从任意 HTTP/HTTPS URL 安装工具。参见 [http 后端](/dev-tools/backends/http)。

**npm**
: 从 npm 注册表安装 Node.js 包和 CLI 工具。参见 [npm 后端](/dev-tools/backends/npm)。

**packslip**
: 从经过签名的清单安装发行版本，并验证构件摘要和签名者。请参见 [packslip backend](/dev-tools/backends/packslip.html)。

**pipx**
: 默认使用 uv，或在配置后使用 pipx，在隔离环境中安装 Python CLI 工具。请参见 [pipx backend](/dev-tools/backends/pipx)。

**pkgx**
: 通过 pkgx 安装软件包。请参见 [pkgx backend](/dev-tools/backends/pkgx.html)。

**s3**
: 从 S3 或兼容存储下载工具构件。请参见 [S3 backend](/dev-tools/backends/s3.html)。

**spm**
: 通过 Swift Package Manager 安装工具。参见 [spm 后端](/dev-tools/backends/spm)。

**ubi**
: 用于安装以单个二进制文件分发的工具的通用二进制安装器（已弃用；请改用 `github` 或 `aqua` 后端）。请参见 [ubi backend](/dev-tools/backends/ubi)。

**vfox**
: 与 [VersionFox](https://vfox.dev/) 插件兼容的后端。参见 [vfox 后端](/dev-tools/backends/vfox)。

## Shell 集成

**hook-env**
: `mise hook-env` 命令，用于导出环境变更以进行 shell 集成。由通过 `mise activate` 安装的 shell hook 自动调用。

**PATH 激活**
: shell 集成的默认方法，mise 会在每次提示符出现时更新 `PATH` 环境变量，以包含相应的工具二进制文件。

**Reshim**
: 工具安装或移除后，更新 shims 目录的过程。如果 shims 不同步，请运行 `mise reshim`。

**Shims**
: 拦截工具命令并将其委托给 mise 的可执行启动器，mise 会在执行前加载适当的工具上下文。它是 PATH 激活的一种替代方案。请参见 [Shims](/dev-tools/shims)。

## 配置

**config_root**
: mise 在解析配置文件中的相对路径时使用的规范项目根目录。根据配置文件的位置确定。导入的文件可能具有不同于活动项目 `MISE_PROJECT_ROOT` 的 `config_root`。

**Configuration Environments**
: 特定环境的配置文件，例如 `mise.dev.toml` 或 `mise.prod.toml`，通过 `MISE_ENV`、`mise -E` 或 `.miserc.toml` 选择。请参见 [Configuration Environments](/configuration/environments)。

**Configuration Hierarchy**
: mise 合并不同层级（系统、全局、项目）中的 mise.toml 文件的机制，距离当前目录更近的文件优先于父目录中的文件。

**Settings**
: 控制 mise 本身的选项，通常位于配置文件的 `[settings]` 中。其中一些设置可以针对项目；标记为仅限全局的设置必须进行全局配置。请参见 [Settings](/configuration/settings)。

**模板**
: 使用 Tera 模板语法的配置动态值，例如 <span v-pre>`{{env.HOME}}`</span> 或 <span v-pre>`{{arch()}}`</span>。参见 [模板](/templates)。

## 环境变量

**env._ 指令**
: 用于高级设置的特殊环境配置指令：

- `env._.file` - 从文件加载变量（例如 `.env`）
- `env._.path` - 将目录添加到 PATH 前面
- `env._.source` - 加载 bash 脚本

**Tool-dependent environment**
: 使用 `tools = true` 的指令会在工具环境可用后运行。这是求值顺序，而不是延迟安装，也不是仅在读取变量时求值。

**Redaction**
: 对 mise 处理的输出中的选定值进行遮蔽。`redact = true` 会标记一个环境值；原始输出或交互式子进程输出会绕过此处理。请参见 [redaction](/environments/#redactions)。

## 钩子

**Hooks**
: 由进入项目或安装工具等事件触发的命令。Shell 事件需要正常激活；安装钩子则不需要。请参见 [Hooks](/hooks)。

**cd 钩子**
: 当你在 mise 处于活动状态时切换目录时运行。

**enter 钩子**
: 当进入一个使 mise.toml 变为活动状态的目录时运行。

**leave 钩子**
: 当离开一个曾处于活动状态的 mise.toml 所在目录时运行。

**postinstall 钩子**
: 在工具成功安装后运行。

**preinstall 钩子**
: 在工具安装开始前运行。

**watch_files hook**
: 当激活钩子检测到匹配文件发生变化时运行。它不是后台监视器；`mise watch` 是一个独立命令。

## 任务

**依赖图**
: 一种内部用于根据依赖关系解析任务执行顺序的有向无环图（DAG）。

**文件任务**
: 定义为独立可执行脚本的任务，位于如 `mise-tasks/` 或 `.mise/tasks/` 这样的目录中。参见 [文件任务](/tasks/file-tasks)。

**任务**
: 在 mise 环境中执行的可复用命令，定义于 mise.toml 中或作为独立脚本。参见 [任务](/tasks/)。

**任务依赖**
: 通过 `depends`（先运行）、`depends_post`（后运行）或 `wait_for`（等待但不触发）定义的任务之间的关系。参见 [任务配置](/tasks/task-configuration)。

**TOML 任务**
: 直接定义在 mise.toml 文件的 `[tasks]` 部分中的任务。参见 [TOML 任务](/tasks/toml-tasks)。

## 目录与环境

**MISE_CACHE_DIR**
: mise 缓存已下载文件和元数据的目录。在 Linux 上默认为 `~/.cache/mise`，在 macOS 上默认为 `~/Library/Caches/mise`。

**MISE_DATA_DIR**
: mise 存储已安装工具和其他持久数据的目录。在 Unix 上默认为 `~/.local/share/mise`，在 Windows 上默认为 `%LOCALAPPDATA%\mise`。请参见 [directories](/directories.html)。

**MISE_PROJECT_ROOT**
: 传递给任务和钩子的活动项目根目录。对于 `.config/mise/config.toml` 等嵌套配置布局，会解析到所属项目目录，而不是配置文件的直接父目录。

## 其他术语

**工具别名**
: 通过 `mise tool-alias` 或 `[tool_alias]` 配置项管理的工具后端或工具版本的别名。后端别名允许像 `node` 这样的短名称指向自定义后端。版本别名允许像 `lts-iron` 这样的符号名称映射到具体的版本号。参见 [工具别名](/dev-tools/aliases)。

**Shell Aliases**
: Shell 命令别名（例如：`ll = "ls -la"`），通过 `mise shell-alias` 或 `[shell_alias]` 配置部分进行管理。它们会在进入目录时动态设置，并在离开目录时取消设置，类似于环境变量。支持情况因 shell 而异；请参见 [shell compatibility table](/getting-started.html#shell-feature-compatibility)。请参见 [Shell Aliases](/shell-aliases)。

**direnv**
: 一个用于环境管理的外部工具，mise 可以与其配合使用。参见 [direnv 集成](/direnv)。

**mise-en-place**
: 法语烹饪短语，意思是“各就各位”——这是 mise 背后的理念。厨师在烹饪前准备好所有食材；开发者在编码前也应该准备好所有工具。

**mise.lock**
: 记录所选平台的具体版本和受支持构件元数据的文件。它与记录请求版本的 `mise.toml` 互为补充。请参见 [mise.lock](/dev-tools/mise-lock)。

**Tool Options**
: mise.toml 中用于改变工具行为的配置，例如 HTTP 下载 URL、构件模式或特定于后端的安装参数。Python 虚拟环境激活属于环境指令，而不是通用工具选项。

**Bootstrap packages**
: 在 `[bootstrap.packages]` 中声明、在机器设置期间应用的主机软件包。它们使用共享的系统软件包数据库或前缀，不同于项目选择的 `[tools]` 版本。请参见 [bootstrap packages](/bootstrap/packages/)。
