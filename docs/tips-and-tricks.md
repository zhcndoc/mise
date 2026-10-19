---
description: "查看 mise 常用命令、脚本、配置、Shell 提示符以及 Apple 芯片上使用 Intel 工具的简明示例。"
socialDescription: "通过简明示例了解 mise 常用命令、脚本、配置和 Shell 提示符。"
---

# 使用技巧

这里收录了一些 mise 日常用法示例，每篇都链接到对应的完整指南。

## 常用命令

关于运行任务（包括 `mise <task>` 简写和文件变更后重新运行任务），请参阅[运行任务](/tasks/running-tasks.html)。

### 在项目环境中打开 Shell {#mise-en}

[`mise en`](/cli/en.html) 会启动一个新的 Shell，并载入项目工具和环境变量，无需激活 Shell。退出该 Shell 即可返回原会话。在其中切换目录不会更新环境；新 Shell 的启动文件仍可能激活 mise。如需跳过 Bash 启动文件，请运行：

```sh
mise en -s "bash --norc"
```

### 查看工具或设置的来源 {#mise-tool-tool}

<a id="mise-cfg"></a>

```sh
mise tool ripgrep      # backend, requested and active versions, config source
mise registry ripgrep  # the backends the short name can resolve to
mise which rg          # the executable this project runs
mise config ls         # config files in use and the tools each one sets
mise settings ls       # settings set in config files, and the file that set each
```

请参阅[`mise tool`](/cli/tool.html)、[`mise registry`](/cli/registry.html)、[`mise which`](/cli/which.html)、[`mise config ls`](/cli/config/ls.html) 和[`mise settings ls`](/cli/settings/ls.html)。关于配置文件的生效顺序，请参阅[配置文件位置](/configuration.html#mise-toml)。如需追踪环境变量，请参阅[查看 mise 设置的变量](#see-which-variables-mise-set)。

## 脚本与包装器

### 在 shebang 中固定工具版本 {#shebang}

无需 `mise.toml`，脚本也可以在 shebang 中指定要使用的工具和版本：

```js [script.js]
#!/usr/bin/env -S mise exec node@24 -- node
console.log(`Running node: ${process.version}`);
```

`env -S` 会将该行其余部分拆分为多个参数。运行 `chmod +x script.js`，然后执行 `./script.js`；如果尚未安装 Node.js 24，[`mise exec`](/cli/exec.html) 会在首次运行时安装它。此方式要求 mise 位于 `PATH` 中，且 `env` 支持 `-S`，但不要求激活 Shell。Windows 不会执行 shebang 行。如需为每个工具提交一个提供更多安装选项的包装器，请使用[工具存根](/dev-tools/tool-stubs.html)。

### 让贡献者无需安装 mise 即可运行任务 {#bootstrap-script}

<a id="project-local-task-entrypoints"></a>

提交一个 `bin/mise` 包装器，在首次使用时下载固定版本的 mise，并为每个任务提交一个脚本：

```sh
mise generate install-script --localize --write bin/mise --windows
mise generate task-stubs --mise-bin ./bin/mise
```

将 `bin/` 提交到仓库，并把 `.mise/` 加入 `.gitignore`；本地化后的包装器会将 mise、工具和缓存保存在该目录。贡献者随后可在项目根目录运行 `./bin/test`；Windows 用户则运行 `.\bin\test.cmd`。`--windows` 还会生成 `bin/mise.cmd`，并使用生成该包装器时记录的校验和检查下载的 `mise.exe`。如需升级 mise，请重新生成包装器。

[`mise generate task-stubs`](/cli/generate/task-stubs.html) 会为 mise 加载的每个任务生成存根，但隐藏任务和全局配置中的任务除外。旧版 mise 为这些任务生成的存根会继续留在 `bin/` 中，直到你手动删除。Windows 默认的 `.cmd` 启动器可能会修改包含 `& ^ | " %` 的参数；如果必须原样传递参数，请在 Windows 上使用 `--windows-launcher exe` 生成启动器。关于包装器的版本固定和目录设置，请参阅 [CI 引导配置](/continuous-integration.html#bootstrapping)。

## 配置

### 进入项目时安装工具 {#auto-install-when-entering-a-project}

在已运行 [`mise activate`](/cli/activate.html) 的 Shell 中，可以使用 [`enter` 钩子](/hooks.html)在 `cd` 进入项目时安装缺失的工具：

```toml [mise.toml]
[hooks]
enter = "mise install --quiet"
```

从下一个提示符开始，工具就会出现在 `PATH` 中。每次进入缺少工具的目录时，该钩子都会下载工具并运行安装脚本；如果你想自行决定何时安装，请手动运行 `mise install`。

### 从其他工具的文件中读取版本 {#using-tera-to-read-unsupported-version-files}

启用[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)后，mise 可以直接读取许多格式的版本文件。若要读取其他格式，可使用[模板](/templates.html)。例如，Hugo Version Manager 会将版本标签和可选的发行版写入 `.hvm` 文件，如 `v0.152.2/extended`：

```toml [mise.toml]
[tools]
hugo-extended = "{{ read_file(path=config_root ~ '/.hvm') | trim | split(pat='/') | first | trim_start(pat='v') }}"
```

这样会得到 `0.152.2`。mise 将 Hugo 的不同发行版作为独立工具安装（`hugo`、`hugo-extended` 和 `hugo-extended-withdeploy`），因此应选择与项目发行版相符的工具。`config_root` 可确保即使从子目录运行 mise，路径仍相对于配置文件解析。

### 在多个仓库之间共享任务 {#share-task-catalogs}

[`task_config.includes`](/tasks/task-discovery.html#include-task-files-and-directories) 用于指定任务的加载来源：目录、`tasks.toml` 文件或远程 git 仓库。设置该选项后，默认任务目录会被替换，因此仍要使用的默认目录（例如 `.mise/tasks`）也必须列出。远程 include 会运行该仓库中的代码，请固定到你信任的标签或提交：

```toml [mise.toml]
[task_config]
includes = [
  "mise-tasks",
  "tasks.toml",
  "git::https://github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
]
```

被 include 的 `tasks.toml` 中，任务写法与 `[tasks]` 下相同，但省略 `tasks.` 前缀。URL 语法和缓存说明请参阅[远程 git include](/tasks/task-discovery.html#remote-git-includes)。

### 使用模板复用任务设置 {#reuse-task-definitions-with-templates}

多个任务共用的工具、环境变量和命令可以写在[任务模板](/tasks/templates.html)中：

```toml [mise.toml]
[task_templates."node:test"]
tools = { node = "24", pnpm = "latest" }
run = "pnpm test"

[tasks.test]
extends = "node:test"

[tasks."test:watch"]
extends = "node:test"
run = "pnpm test --watch"
```

任务会继承模板中的字段，并覆盖自身设置的字段。

### 对任务输出中的秘密信息脱敏 {#redact-secrets-from-task-output}

如需屏蔽任务输出中的变量值，可将变量名列入顶层 `redactions` 数组，或为单个变量设置 `redact = true`；任务的 `env` 中也支持此设置：

```toml [mise.toml]
redactions = ["API_KEY", "SECRETS_*"]

[tasks.deploy]
env = { TOKEN = { value = "{{ env.DEPLOY_TOKEN }}", redact = true } }
run = "./deploy.sh"
```

mise 会用 `[redacted]` 替换匹配的值。原始任务和交互式任务不会进行脱敏，但命令仍会收到真实值。脱敏范围请参阅[脱敏说明](/environments/secrets/#redaction)。

### 为 `cargo:` 工具使用预构建二进制文件 {#cargo-binstall}

安装 [cargo-binstall](https://github.com/cargo-bins/cargo-binstall) 后，mise 会用它安装 [`cargo:` 工具](/dev-tools/backends/cargo.html)：如果 crate 发布了预构建二进制文件，mise 会直接下载，而不必从源码编译：

```sh
mise use -g cargo-binstall
```

如果没有预构建二进制文件，mise 会退回到 `cargo install`。设置 [`cargo.binstall`](/configuration/settings.html#cargo.binstall) 可关闭此功能。

## Shell 提示符 {#shell-prompt}

mise 没有自带的提示符片段。在已运行 [`mise activate`](/cli/activate.html) 的 Shell 中，切换目录时可以打印 mise 加载的内容；mise 也会导出提示符可以读取的 `[env]` 变量。

### 打印进入项目时发生的变化 {#print-what-changes-when-you-enter-a-project}

```sh
mise settings status.show_tools=true
mise settings status.show_env=true
```

这些命令会修改全局配置。进入项目时会打印类似以下内容：

```text
mise +node@24.21.0
mise +API_KEY +NODE_ENV
```

[`status.show_tools`](/configuration/settings.html#status.show_tools) 会列出刚刚启用（`+`）或停用（`-`）的工具。[`status.show_env`](/configuration/settings.html#status.show_env) 会列出 mise 新增（`+`）、更改（`~`）或移除（`-`）的变量名称，但不会显示变量值。

### 在提示符中显示项目和环境 {#show-the-project-and-environment-in-your-prompt}

在项目的 `mise.toml` 中为提示符设置变量。进入项目后 mise 会导出这些变量，离开时则会将它们移除：

```toml [mise.toml]
[env]
PROMPT_PROJECT = "{{ config_root | basename }}"
PROMPT_MISE_ENV = "{{ mise_env | default(value=[]) | join(sep=',') }}"
```

`config_root` 是配置文件所在的目录。`mise_env` 列出当前生效的[配置环境](/configuration/environments.html)，无论它们来自 `MISE_ENV` 还是 `.miserc.toml`。然后在 Shell 启动文件中读取这些变量。Zsh 用户可将以下内容写入 `~/.zshrc`：

```zsh
setopt PROMPT_SUBST
PROMPT='${PROMPT_PROJECT:+[$PROMPT_PROJECT${PROMPT_MISE_ENV:+:$PROMPT_MISE_ENV}] }%~ %# '
```

Bash 用户可将以下内容写入 `~/.bashrc`：

```sh
PS1='${PROMPT_PROJECT:+[$PROMPT_PROJECT${PROMPT_MISE_ENV:+:$PROMPT_MISE_ENV}] }\w \$ '
```

在名为 `web` 且使用 `staging` 环境的项目中，提示符会以 `[web:staging]` 开头。支持显示环境变量的提示符主题也可采用同样方式配置。对于 [powerline-go](https://github.com/justjanne/powerline-go)，请将 `shell-var` 加入 `-modules`，并传入 `-shell-var PROMPT_MISE_ENV -shell-var-no-warn-empty`。

请读取 `PROMPT_MISE_ENV`，不要读取 `MISE_ENV`。`.miserc.toml` 中选择的环境不会设置 Shell 的 `MISE_ENV`；如果自行导出 `MISE_ENV`，则会覆盖所有项目中的 `.miserc.toml` 选择。

### 查看 mise 设置的变量 {#see-which-variables-mise-set}

```sh
mise env --json-extended
```

[`mise env --json-extended`](/cli/env.html) 会列出 mise 在当前目录设置的所有变量、变量值和设置它的配置文件（`source`）。工具设置的变量（例如 Java 的 `JAVA_HOME`）还会标明对应的 `tool`。输出包含真实值，包括标记为脱敏的值，因此分享前请先处理敏感信息。遇到其他问题时，请先运行[`mise doctor`](/cli/doctor.html)。

## 平台

### 在 Apple 芯片设备上运行 Intel 工具 {#macos-rosetta}

如需在 Apple 芯片 Mac 上安装工具的 Intel 构建版本，请使用 `MISE_ARCH` 将 [`arch`](/configuration/settings.html#arch) 设置为 `x64`。请为这些安装指定单独的数据目录，以免覆盖原生版本；运行工具时也要使用这两个变量：

```sh
export MISE_DATA_DIR="$HOME/.local/share/mise-x64"
export MISE_ARCH=x64
mise install node@24
mise exec node@24 -- node --version
```

运行 Intel 二进制文件需要安装 Rosetta。mise 从源码编译的工具还需要 Intel 工具链和库；详见对应的[语言指南](/core-tools.html)。

如果某个后端要求 mise 本身以 Intel 进程运行，可使用安装器的 [`MISE_INSTALL_ARCH`](/installing-mise.html#installer-options) 变量，将 Intel 版 mise 安装在原生版本旁边，并为它指定相同的 `MISE_DATA_DIR`：

```sh
curl -fsSL https://mise.run | MISE_INSTALL_PATH="$HOME/.local/bin/mise-x64" MISE_INSTALL_ARCH=x64 sh
"$HOME/.local/bin/mise-x64" --version
```
