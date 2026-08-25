# 术语表

本术语表定义了 mise 文档中使用的关键术语和概念。

## 核心概念

**Activation**
: 将 mise 的上下文（工具、环境变量、PATH 修改）加载到 shell 会话中的过程。通常通过在 shell rc 文件中使用 `eval "$(mise activate bash)"` 完成。有关设置说明，请参见 [Installing mise](/installing-mise.html)。

**后端**
: mise 用来安装和管理工具的软件包管理器或生态系统。每个后端都知道如何从各自的来源获取、安装和管理工具。更多细节请参见下面的 [后端](#backends) 和 [后端架构](/dev-tools/backend_architecture)。

**核心工具**
: 使用 Rust 编写并随 mise 一起发布的内置工具实现。这些实现为 Node.js、Python、Ruby、Go 等流行语言提供一流支持。完整列表请参见 [核心工具](/core-tools)。

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

**工具请求**
: 用户对工具版本的指定，可能是模糊的或使用别名。示例：`node@18`、`python@latest`、`go@1.21`。这些会被解析为具体的工具版本。

**工具版本**
: 工具的具体、已解析版本。例如，`node@18`（工具请求）可能会解析为 `node@18.19.0`（工具版本）。

**工具集**
: 针对特定上下文的、已解析工具的不可变集合，包含某个目录或项目应当处于激活状态的所有工具版本。

## 后端

mise 支持多个后端，用于从不同来源安装工具：

**aqua**
: 使用 [aqua-proj](https://aquaproj.github.io/) 注册表的后端。支持 SLSA 可信溯源验证，并可访问数千种工具。参见 [aqua 后端](/dev-tools/backends/aqua)。

**asdf**
: 与 [asdf](https://asdf-vm.com/) shell 脚本插件兼容的传统后端。仅支持 Linux 和 macOS。比原生后端更慢，但可访问 asdf 插件生态系统。参见 [asdf 后端](/dev-tools/backends/asdf)。

**cargo**
: 通过使用 `cargo install` 编译来安装 Rust 工具。参见 [cargo 后端](/dev-tools/backends/cargo)。

**conda**
: 从 Conda 仓库安装软件包。参见 [conda 后端](/dev-tools/backends/conda)。

**dotnet**
: 安装 .NET 工具。参见 [dotnet 后端](/dev-tools/backends/dotnet)。

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

**pipx**
: 使用 pipx 在隔离环境中安装 Python CLI 工具。参见 [pipx 后端](/dev-tools/backends/pipx)。

**spm**
: 通过 Swift Package Manager 安装工具。参见 [spm 后端](/dev-tools/backends/spm)。

**ubi**
: 用于分发为单个二进制文件的工具的通用二进制安装器。参见 [ubi 后端](/dev-tools/backends/ubi)。

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
: 用于拦截工具命令并将其委托给 mise 的小型可执行脚本，mise 会在执行前加载相应的工具上下文。它是 PATH 激活的替代方案。参见 [Shims](/dev-tools/shims)。

## 配置

**config_root**
: mise 在解析配置文件中的相对路径时使用的规范项目根目录。通过 `MISE_PROJECT_ROOT` 环境变量设置，或自动检测。

**配置环境**
: 环境特定的配置文件，例如 `mise.dev.toml` 或 `mise.prod.toml`，通过 `MISE_ENV` 环境变量启用。参见 [配置环境](/configuration/environments)。

**配置层级**
: 不同级别（系统、全局、项目）的 mise.toml 文件会合并在一起，其中更接近当前目录的文件优先于父目录中的文件。

**设置**
: 存储在 `~/.config/mise/settings.toml` 中的全局 mise 配置选项，用于定义所有项目的行为。参见 [设置](/configuration/settings)。

**模板**
: 使用 Tera 模板语法的配置动态值，例如 <span v-pre>`{{env.HOME}}`</span> 或 <span v-pre>`{{arch()}}`</span>。参见 [模板](/templates)。

## 环境变量

**env._ 指令**
: 用于高级设置的特殊环境配置指令：

- `env._.file` - 从文件加载变量（例如 `.env`）
- `env._.path` - 将目录添加到 PATH 前面
- `env._.source` - 加载 bash 脚本

**延迟求值**
: 使用 `tools = true` 配置的环境变量，可访问工具提供的环境变量。这些变量会在工具加载后进行求值。

**脱敏**
: 使用 `redact = true` 标记敏感环境变量，以便在 mise 输出和日志中隐藏其值。

## 钩子

**钩子**
: 在特定事件下于 mise 激活期间自动执行的脚本。一个实验性功能。参见 [钩子](/hooks)。

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

**watch_files 钩子**
: 当指定文件发生变化时运行。文件监视需要 `mise activate`。

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
: mise 存储已安装工具和其他持久数据的目录。默认为 `~/.local/share/mise`。

**MISE_PROJECT_ROOT**
: 自动设置为当前项目根目录（即 mise.toml 所在位置）的环境变量。

## 其他术语

**工具别名**
: 通过 `mise tool-alias` 或 `[tool_alias]` 配置项管理的工具后端或工具版本的别名。后端别名允许像 `node` 这样的短名称指向自定义后端。版本别名允许像 `lts-iron` 这样的符号名称映射到具体的版本号。参见 [工具别名](/dev-tools/aliases)。

**Shell 别名**
: 通过 `mise shell-alias` 或 `[shell_alias]` 配置项管理的 Shell 命令别名（例如：`ll = "ls -la"`）。它们会在进入目录时动态设置，并在离开目录时取消设置，类似于环境变量。支持 bash、zsh、fish 和 xonsh。参见 [Shell 别名](/shell-aliases)。

**direnv**
: 一个用于环境管理的外部工具，mise 可以与其配合使用。参见 [direnv 集成](/direnv)。

**mise-en-place**
: 法语烹饪短语，意思是“各就各位”——这是 mise 背后的理念。厨师在烹饪前准备好所有食材；开发者在编码前也应该准备好所有工具。

**mise.lock**
: 一个锁定文件，记录精确解析后的版本，以便在不同机器和 CI 中实现可复现的环境。参见 [mise.lock](/dev-tools/mise-lock)。

**工具选项**
: mise.toml 中用于改变工具行为的配置，例如设置 Python 的 `virtualenv` 路径或 Node.js 的 `corepack` 偏好。
