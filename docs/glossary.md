---
description: "查阅 mise 文档中的术语，涵盖后端、版本请求、信任、shim 和 bootstrap 等概念。"
socialDescription: "mise 文档术语表，涵盖后端、版本请求、信任和 shim 等概念。"
outline: [2, 3]
---

# 术语表

每个术语都链接到对应的详细说明页面。

## 工具与版本 {#tools-and-versions}

### Tool {#tool}

mise 为项目安装并加入 `PATH` 的程序，例如 `node`、`terraform` 或 `jq`。在 `mise.toml` 的 `[tools]` 下声明工具。详见[开发工具](/dev-tools/)。

### Backend {#backend}

mise 获取并安装工具的来源及方式，例如 `aqua`、`github`、`npm` 或 `pypi`（也接受 `pipx`）。核心工具使用 mise 内置安装器。`ubi` 后端已弃用；请按[ubi 迁移指南](/dev-tools/backends/ubi.html)改用 `github`，或对其他托管平台使用 `gitlab` 或 `http`。详见[后端](/dev-tools/backends/)。

### Backend identifier {#backend-identifier}

带有后端前缀的工具名称，例如 `aqua:aws/aws-cli` 或 `npm:prettier`。如果工具在注册表中没有简称，或你想自行选择后端，可在 `mise.toml` 或命令行中使用后端标识符。详见[后端标识符](/dev-tools/backends/#identifiers)。

### Core tools {#core-tools}

安装器内置于 mise 的语言，例如 Node.js、Python、Ruby、Go 和 Java。它们无需插件。详见[核心工具概览](/core-tools.html)。

### Registry {#registry}

mise 已知的工具简称列表，每个简称映射到一个或多个后端。例如，`aws-cli` 会映射到 `aqua:aws/aws-cli`。详见[注册表](/registry.html)。

### Plugin {#plugin}

使用 Lua 编写的扩展，或旧式 asdf shell 脚本，可用于添加工具、后端、环境指令或 bootstrap 包管理器。大多数工具无需插件。详见[插件](/plugins.html)。

### Toolset {#toolset}

mise 合并当前目录适用的所有配置文件后，得出的工具及版本集合。运行 `mise ls --current` 可查看该集合。

### Version request {#version-request}

你请求的版本，例如 `node = "24"` 中的 `"24"`、`latest` 或 `ref:main`。mise 会将其解析为具体版本。详见[版本请求和版本文件](/dev-tools/versions.html)。

### Version prefix {#version-prefix}

只指定版本开头的版本请求，例如 `node@24` 或 `python@3.14`。匹配会在分隔符处进行，因此 `1.2` 可匹配 `1.2.3`，但不会匹配 `1.20`。详见[请求语法](/dev-tools/versions.html#request-syntax)。

### Resolved version {#resolved-version}

版本请求最终选择的具体版本，例如 `node = "24"` 对应的 `24.11.1`。mise 会优先使用锁文件中的版本，其次使用已安装且符合请求的版本。详见[请求的解析方式](/dev-tools/versions.html#how-requests-resolve)。

### Pin {#pin}

固定版本而不使用前缀请求。`mise use --pin node@24` 会将解析出的版本（例如 `node = "24.11.1"`）写入配置文件。也可以保留配置中的前缀，并由[锁文件](#lockfile)记录具体版本。详见[固定版本或使用锁文件](/dev-tools/versions.html#pin-vs-lockfile)。

### Lockfile {#lockfile}

`mise.lock` 文件会记录每种工具解析后的版本；对于支持此功能的后端，还会按平台记录下载 URL 和校验和，确保所有机器安装相同构建。详见[锁文件（mise.lock）](/dev-tools/mise-lock.html)。

### Idiomatic version file {#idiomatic-version-file}

其他工具使用的版本文件，例如 `.nvmrc`、`.python-version` 或 `.ruby-version`。只有通过 [`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 为工具启用后，mise 才会读取这些文件。详见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

### `.tool-versions` {#tool-versions}

asdf 使用的版本文件，每行指定一个工具，例如 `node 24.11.1`。mise 会同时读取此文件和 `mise.toml`。详见[`.tool-versions`](/dev-tools/versions.html#tool-versions)。

### Tool options {#tool-options}

针对单个工具条目的设置，例如下载 URL、资源匹配模式、`os` 或 `postinstall` 命令，以表格形式书写：`node = { version = "24", postinstall = "corepack enable" }`。详见[工具选项](/dev-tools/#tool-options)。

### Tool alias {#tool-alias}

在 `[tool_alias]` 下定义的名称，可将工具指向另一个后端，也可为版本请求命名。详见[工具别名](/dev-tools/aliases.html)。

### Lazy tool {#lazy-tool}

标记为 `lazy = true` 的工具。`mise install` 会跳过它，直到首次运行其命令时才安装。详见[延迟安装工具](/dev-tools/shims.html#lazy-tools)。

### Tool stub {#tool-stub}

通常提交在代码仓库中的可执行文件，用于指定一种工具及其版本。运行该文件时，如果工具尚未安装就会先安装，然后使用你提供的参数运行。详见[工具启动器](/dev-tools/tool-stubs.html)。

### Versions host {#versions-host}

[mise-versions](https://mise-versions.jdx.dev) 服务为大多数工具提供版本列表和 GitHub 发行版元数据，以减少 mise 对 GitHub 的请求。通过 [`use_versions_host`](/configuration/settings.html#use_versions_host) 可关闭此功能。详见[新发行版未列出](/troubleshooting.html#new-version-of-a-tool-is-not-available)。

## 配置 {#configuration}

### mise.toml {#mise-toml}

项目配置文件，用于声明工具、环境变量、任务、hooks 和设置。文件也可以命名为 `.mise.toml`，或放在 `.config/`、`.mise/`、`mise/` 目录中；详见[配置文件位置](/configuration.html#mise-toml)。

### mise.local.toml {#mise-local-toml}

用于覆盖项目 `mise.toml` 的个人配置。可通过 `.git/info/exclude` 或全局忽略文件将其排除在 Git 之外。

### Global config {#global-config}

`~/.config/mise/config.toml`，适用于所有目录。`mise use -g` 会写入此文件，项目配置则优先于它。详见[全局与系统配置](/configuration.html#global-config)。

### Config file precedence {#config-file-precedence}

mise 会加载从当前目录到根目录的配置文件，以及全局和系统配置。多个文件设置同一项时，离当前目录最近的文件优先。运行 `mise config ls` 可列出 mise 已加载的文件。详见[配置文件的合并方式](/configuration.html#configuration-hierarchy)。

### Config environment {#config-environment}

额外的配置文件，例如 `mise.production.toml`。通过 `-E production` 或 `MISE_ENV=production` 选择后，会与 `mise.toml` 一起加载。详见[配置环境](/configuration/environments.html)。

### config_root {#config-root}

配置文件中相对路径的解析基准，也是模板中 <code v-pre>{{ config_root }}</code> 的值。对于项目配置，即使文件位于 `.config/mise/`，此目录仍是项目目录。详见 [config_root](/configuration.html#config-root)。

### Project root {#project-root}

当前项目的目录，mise 会通过 `MISE_PROJECT_ROOT` 将其提供给任务和 hooks。在单体仓库中，任务获得的是定义该任务的子项目根目录。详见[任务环境](/tasks/running-tasks.html#task-environment)。

### Settings {#settings}

控制 mise 本身行为的选项，可在配置文件的 `[settings]` 中设置，也可使用 `mise settings` 或 `MISE_*` 环境变量设置。部分选项只能在全局配置中设置。详见[设置](/configuration/settings.html)。

### Tera templates {#templates}

mise 读取配置文件时会渲染的值，例如 <code v-pre>{{ env.HOME }}</code> 或 <code v-pre>{{ arch() }}</code>。详见 [Tera 模板](/templates.html)。

### Directories {#directories}

mise 会将已安装工具、缓存元数据、全局配置和信任记录等状态分别存放在不同目录中。[目录说明](/directories.html)列出了默认路径及用于迁移它们的 `MISE_*_DIR` 变量。

## Shell 与环境 {#shell-and-environment}

### Shell activation {#activation}

在 shell 启动文件中运行 `mise activate`，例如在 `~/.zshrc` 中写入 `eval "$(mise activate zsh)"`。mise 随后会为当前目录设置 `PATH` 和 `[env]` 变量，并在切换项目时更新它们。详见[配置 Shell](/shell-setup.html)。

### hook-env {#hook-env}

激活机制在每次显示提示符前运行的内部命令，用于更新当前目录的环境。设置 `MISE_TIMINGS=1` 运行它，可[分析缓慢的提示符](/troubleshooting.html#slow-shell-prompts)。

### Shims {#shims}

存放在 shim 目录中的小型可执行文件，名称与工具命令相同，例如 `node`。每个 shim 都会选择当前目录对应的版本并运行，因此编辑器等不会加载已激活 shell 的程序也能使用 mise 工具。详见 [Shims](/dev-tools/shims.html)。

### Reshim {#reshim}

重新生成 shims。mise 在安装或移除工具时会自动执行此操作。其他程序（例如全局 `npm install`）向已安装工具添加可执行文件后，请运行 `mise reshim`。详见 [Shims](/dev-tools/shims.html#mise-reshim)。

### Command wrapper {#command-wrapper}

在 `[wrappers]` 下定义的命令，保留原有名称但实际运行另一个程序，例如让 `terraform` 命令运行 `tofu`。详见[命令包装器](/dev-tools/shims.html#command-wrappers)。

### Env directives {#env-directives}

`[env]` 下以 `_.` 开头、功能不止于设置单个变量的键：`_.file` 加载 dotenv 文件，`_.path` 将目录加入 `PATH`，`_.source` 运行脚本并保留其导出变量，`_.python.venv` 则激活 virtualenv。详见[环境指令](/environments/#env-directives)。

### Tool-dependent environment {#tool-dependent-environment}

在 `[env]` 条目中设置 `tools = true`，mise 会在工具加入 `PATH` 后再解析该条目，因此其值可以调用这些工具。详见[使用工具设置的值](/environments/#lazy-eval)。

### Redaction {#redaction}

在任务输出和 mise 捕获的日志中，将标记为 `redact = true` 的值替换为 `[redacted]`。原始模式和交互式任务的输出不会脱敏。详见[脱敏与 CI 掩码](/environments/secrets/#redaction)。

### Shell aliases {#shell-aliases}

在 `[shell_alias]` 下声明的别名，例如 `ll = "ls -la"`。进入项目时 mise 会设置别名，离开时会移除。支持 Bash、Zsh 和 Fish。详见[Shell 别名](/shell-aliases.html)。

### Hooks {#hooks}

在特定事件发生时运行的命令：已激活 shell 切换目录时触发 `enter`、`leave` 和 `cd`；工具安装前后触发 `preinstall` 和 `postinstall`；受监视文件发生变化时触发 `[[watch_files]]` 条目。详见 [Hooks](/hooks.html)。

### direnv {#direnv}

一种按目录更改环境的独立工具。mise 的 `[env]` 可以满足相同需求，且不支持同时运行两者。详见[从 direnv 迁移](/direnv.html)。

## 任务 {#tasks}

### Task {#task}

使用项目工具和环境变量运行的命名命令或脚本。详见[任务](/tasks/)。

### TOML task {#toml-task}

在 `mise.toml` 的 `[tasks]` 下定义的任务。详见 [TOML 任务](/tasks/toml-tasks.html)。

### File task {#file-task}

在任务目录（例如 `mise-tasks/` 或 `.mise/tasks/`）中以可执行脚本形式定义的任务。详见[文件任务](/tasks/file-tasks.html)。

### Task dependencies {#task-dependencies}

任务之间的运行顺序：`depends` 会先运行依赖任务，`depends_post` 会在任务之后运行，`wait_for` 则等待已加入当前运行流程的任务。详见[依赖关系和执行顺序](/tasks/architecture.html)。

### Monorepo root {#monorepo-root}

包含多个项目的仓库根目录 `mise.toml`，通过 `monorepo_root = true` 标记。每个子项目的任务都会获得基于路径的名称，例如 `//projects/api:build`，并可从仓库中的任意目录运行。在 `[monorepo].config_roots` 中列出子项目；扫描文件系统寻找子项目的方式已弃用。详见[单体仓库任务](/tasks/monorepo.html)。

## 安全 {#security}

### Trust {#trust}

允许 mise 加载可能运行代码的项目配置文件，例如包含 `[env]`、hooks、模板或工具选项的文件。运行 `mise trust` 即可授权。详见[配置文件信任](/security.html#configuration-trust)。

### Safe mode {#safe-mode}

通过 `MISE_SAFE=1` 启用的一种模式：无需信任即可加载项目配置，但会跳过或拒绝其中所有会运行代码的内容，例如 hooks、任务和模板中的 `exec()`。适用于读取不受自身控制的配置的自动化流程。详见[安全模式](/security.html#safe-mode)。

### Paranoid mode {#paranoid-mode}

一种设置，要求每个项目配置文件都必须经过信任，并在文件变更后重新信任。它还会关闭自动信任（包括 CI 中的自动信任），并在每次安装时重新验证来源证明。详见 [Paranoid 模式](/paranoid.html)。

## 机器初始化 {#machine-setup}

### Bootstrap {#bootstrap}

`mise bootstrap`，根据配置初始化机器：包括主机软件包、系统文件、服务、Git 仓库、dotfiles、shell 激活和工具。详见 [Bootstrap](/bootstrap.html)。

### Bootstrap packages {#bootstrap-packages}

在 `[bootstrap.packages]` 中声明并通过主机包管理器安装的软件包，例如 apt、Homebrew 或 WinGet。整台机器共用这些软件包，与 `[tools]` 中按项目管理的版本不同。详见 [Bootstrap 软件包](/bootstrap/packages/)。

### Dotfiles {#dotfiles}

位于 home 目录中的配置文件，例如 `~/.zshrc`。mise 可以记录其变更历史，并根据配置复制、链接或生成这些文件。详见 [Dotfiles](/dotfiles.html)。

### Daemon {#daemon}

在命令之间持续运行的进程，例如数据库或开发服务器。可在 `mise.toml` 中声明，并由 [pitchfork](https://pitchfork.jdx.dev/) 管理。Daemon 功能仍处于实验阶段。详见 [Daemons](/daemons.html)。
