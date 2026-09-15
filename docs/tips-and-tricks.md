---
description: "常见工作流的简短配方。"
---

# 技巧与窍门

常见工作流的简短配方。每个部分都链接到完整指南，以便在设置或平台细节重要时查阅。如果你
还没有配置项目，请从[入门指南](/getting-started.html)开始。

## macOS Rosetta

对于 Apple Silicon 上的预编译 Intel 工具，将 [`MISE_ARCH`](/configuration/settings.html#arch)
设置为 `x64`。将这些安装与原生 arm64 工具分开，并对安装和执行使用相同的目录和架构覆盖：

```sh
export MISE_DATA_DIR="$HOME/.local/share/mise-x64"
export MISE_ARCH=x64
mise install node@24
mise exec node@24 -- node --version
```

请在专用 shell 会话中运行此命令。这些覆盖设置会一直有效，直到你取消设置或
关闭该 shell。必须安装 Rosetta 才能在 Apple Silicon 上执行 Intel 二进制文件；
源代码构建可能还需要 Intel 工具链和依赖项。

如果某个后端需要 mise 进程本身以 Intel 模式运行，请安装单独的二进制文件：

```sh
curl -fsSL https://mise.run -o /tmp/install-mise.sh
MISE_INSTALL_PATH="$HOME/.local/bin/mise-x64" MISE_INSTALL_ARCH=x64 sh /tmp/install-mise.sh
"$HOME/.local/bin/mise-x64" --version
```

使用该可执行文件时，也请保留单独的 `MISE_DATA_DIR`。有关编译要求，请参阅相关的
[语言指南](/core-tools.html)。

## Shebang

你可以在 shebang 中指定工具及其版本，而无需先设置
`mise.toml`/`.tool-versions` 配置：

```javascript [script.js]
#!/usr/bin/env -S mise x node@24 -- node
// "env -S" allows multiple arguments in a shebang
console.log(`Running node: ${process.version}`);
```

将其保存为 `script.js`，运行 `chmod +x script.js`，然后执行 `./script.js`。
这要求 mise 位于 `PATH` 中，并且 `env` 实现支持 `-S`；原生 Windows
不会执行 Unix shebang。无需激活 shell。对于带有其他安装选项、可提交到仓库的包装器，请参阅
[工具存根](/dev-tools/tool-stubs.html)。

## 引导脚本

生成并提交一个首次使用时下载 mise 的包装器：

```sh
mise generate install-script --localize --write bin/mise
./bin/mise install
```

提交 `bin/mise`，并忽略 `.mise/`；本地化包装器会将其二进制文件、工具和
缓存存储在那里。生成的包装器会记录默认的 mise 版本；重新生成它即可更新
该默认版本。有关版本覆盖、缓存布局和示例流水线，请参阅
[CI 引导](/continuous-integration.html#bootstrapping)。

## 项目本地任务入口点

如果你希望贡献者无需先安装 mise 就能运行项目任务，可以将 [`mise generate install-script`](/cli/generate/install-script.html) 与 [`mise generate task-stubs`](/cli/generate/task-stubs.html) 配合使用：

```sh
mkdir -p bin
mise generate install-script --localize --write bin/mise --windows
mise generate task-stubs --mise-bin ./bin/mise
./bin/test
```

在运行示例前定义一个 `test` 任务。提交生成的入口点并忽略
`.mise/`。任务存根的行为类似于小型项目命令，而 `bin/mise`
会为项目下载并运行固定版本的 mise 二进制文件。

示例包含面向 Windows 贡献者的 `--windows`。Windows 无法执行 shebang 脚本，因此
`mise generate install-script --write ./bin/mise --windows` 会在其旁边写入
`bin/mise.cmd`，Windows 贡献者则运行 `.\bin\mise.cmd`。启动器会为该版本下载独立的
`mise.exe`，并将其与生成脚本时嵌入的校验和进行比对，因此除 Windows
本身已提供的内容外不需要其他依赖。

出于同样的原因，每个任务存根旁边都会有一个 `.cmd` 启动器，因此上述示例在
Windows 中的形式是 `.\bin\test.cmd`。默认的 `.cmd` 任务启动器可以在任何平台上生成，但 `cmd.exe` 可能会改变
参数中的 shell 元字符。当需要精确转发参数时，请在 Windows 上生成
`--windows-launcher exe`；请参阅[任务存根](/cli/generate/task-stubs.html)。

## 机器引导

使用 [`mise bootstrap`](/bootstrap.html) 应用配置中声明的机器设置。
先从预览开始：

```sh
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
```

选择机器所需的部分：[软件包](/bootstrap/packages/)、
[代码仓库](/bootstrap/repos.html)、[dotfiles](/dotfiles.html)、
[shell 激活](/bootstrap/shell.html)、[macOS 默认设置](/bootstrap/macos-defaults.html)、
[launchd](/bootstrap/launchd.html) 或 [systemd](/bootstrap/systemd.html)。
完整指南解释了阶段顺序和主机选择；不要仅仅为了尝试该命令，就将不相关平台的声明复制到工作站配置中。

钩子和 `bootstrap` 任务都是普通命令，需要各自具备幂等行为。
采用现有 Homebrew cask 时，请在替换应用程序包之前参阅[所有权和 macOS 隐私权限](/bootstrap/packages/brew.html#macos-privacy-security-tcc)。

## 使用 Zinit 的 Zsh {#installation-via-zsh-zinit}

如果你使用 [Zinit](https://github.com/zdharma-continuum/zinit)，请使用受支持的
[安装方法](/installing-mise.html)安装 mise，然后在会修改 PATH 的插件之后激活它：

```zsh
# ~/.zshrc, after your Zinit setup
eval "$(mise activate zsh)"
```

这样可以让 mise 的更新由其安装程序或软件包管理器负责。按照
[Zsh 补全说明](/installing-mise.html#autocompletion)添加补全，
并避免在插件和补全设置中重复初始化 `compinit`。

## CI/CD

提交项目工具配置，并在 CI 中使用 `mise exec` 或 `mise run`。
有关提供商示例、锁定安装和缓存，请参阅[持续集成](/continuous-integration.html)。

### GitHub Actions

对于在 `mise.toml` 中声明了 Node 的代码仓库：

```yaml
name: tools
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: jdx/mise-action@v4
      - run: mise exec -- node --version
```

## `mise set`

你可以使用 [`mise set`](/cli/set.html) 代替手动编辑 `mise.toml` 来添加环境变量：

```sh
mise set NODE_ENV=production
```

## 使用 Tera 读取不受支持的版本文件

一些项目本地的版本文件已经作为[惯用版本文件](https://mise.jdx.dev/configuration.html#idiomatic-version-files)受到支持。对于其他版本文件，您可以在 `mise.toml` 中使用 Tera 模板读取文件，并将版本分配给相应的工具。

例如，要使用 `.hvm` 文件并指定普通的 Hugo 版本：

```toml
[tools]
hugo = "{{ read_file(path=config_root ~ '/.hvm') | trim }}"
```

HVM 也支持带有 `/extended` 后缀的版本。在 mise 中，Hugo 和 Hugo Extended 是两个独立的工具，因此需要去掉该后缀，并改用 `hugo-extended`：

```toml
[tools]
hugo-extended = "{{ read_file(path=config_root ~ '/.hvm') | trim | replace(from='/extended', to='') }}"
```

在评估任一示例前，先创建包含版本字符串的 `.hvm`。当你从子目录调用 mise 时，`config_root` 会让路径与配置保持关联。为项目选择一个
Hugo 变体。有关函数和过滤器，请参阅[模板](/templates.html)。

## [`mise run`](/cli/run.html) 简写

只要任务名称不与 mise 提供的命令冲突，你就可以跳过 `run` 部分：

```sh
mise test
```

::: warning
不要在脚本中这样做：mise 未来版本可能会添加与你的任务冲突的命令
:::

## 编辑时监视任务

[`mise watch`](/cli/watch.html) 会在文件更改时重新运行任务。它使用
`watchexec`，你可以使用 mise 全局安装它：

```sh
mise use -g watchexec@latest
mise watch test
```

对于应在更改时重启的长时间运行进程，使用 `--restart`：

```sh
mise watch --restart dev
```

## 共享任务目录

对于包含大量任务的项目，
[`task_config.includes`](/tasks/task-configuration.html#task_config.includes)
可以从其他目录、`tasks.toml` 文件或远程 git 代码仓库中加载任务定义。请将示例 URL 替换为你信任的代码仓库和 ref：

```toml
[task_config]
includes = [
  "mise-tasks",
  "tasks.toml",
  "git::https://github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
]
```

被包含的 `tasks.toml` 文件使用与 `[tasks]` 表相同的结构，只是没有
`[tasks.]` 前缀。

## 使用模板复用任务定义

实验性的 [任务模板](/tasks/templates.html) 允许多个任务共享
通用工具、环境变量和命令默认值：

```toml
[settings]
experimental = true

[task_templates."node:test"]
tools = { node = "24", pnpm = "latest" }
run = "pnpm test"

[tasks.test]
extends = "node:test"
run = "pnpm test -- --watch=false"
```

这假设 `pnpm test -- --watch=false` 会被项目的测试脚本接受。
当软件包需要共享默认值时使用模板，然后在本地覆盖命令或路径。

## 从任务输出中去除敏感信息

如果某个任务可能在 CI 日志中回显机密信息，请将 `redactions` 添加到任务或配置中。
所列环境变量的值会在处理后的任务输出中替换为 `[redacted]`：

```toml
redactions = ["API_KEY", "PASSWORD"]
```

也支持 glob 模式：

```toml
redactions = ["SECRETS_*"]
```

原始或交互式输出不会进行脱敏，子进程仍会接收原始值。有关受支持的输出和日志边界，请参阅[脱敏](/environments/#redactions)。

## 软件验证

请参阅 [安全](/security.html#software-verification) 了解 mise 的软件验证控制，
包括 aqua 签名、SLSA 来源证明以及 GitHub 产物证明。

## 最低发布年龄

请参阅 [安全](/security.html#minimum-release-age) 以了解供应链延迟控制、后端支持以及传递依赖过滤行为。

## [`mise up --bump`](/cli/upgrade.html)

使用 `mise up --bump` 将所有软件升级到最新版本，并更新 `mise.toml` 文件。这会保留之前的精度，
因此如果你之前有 `node = "24"`，而 node 26 是最新版本，`mise up --bump node` 会将 `mise.toml` 更改为 `node = "26"`。

## cargo-binstall

[cargo-binstall](https://github.com/cargo-bins/cargo-binstall) 可以下载预构建的 Rust CLI
二进制文件，而不是编译它们。启用 `cargo.binstall` 后（默认启用），mise 会在可用时将其用于
`cargo:` 工具。并非每个 crate 都有兼容的预构建版本；
有关回退行为，请参阅 [Cargo 后端](/dev-tools/backends/cargo.html)。

```sh
mise use -g cargo-binstall
```

## [`mise cache clear`](/cli/cache.html)

在检查新版本时清除工具的缓存元数据，例如
`mise cache clear node`。`mise cache path` 会显示当前缓存目录。完整的
`mise cache clear` 还会影响环境和任务缓存；请参阅[缓存行为](/cache-behavior.html)。

## [`mise en`](/cli/en.html)

`mise en` 会使用当前项目环境启动一个**新 shell**。退出该 shell 即可
返回原始会话。它本身不会添加目录变更更新；新 shell 的启动文件仍可能激活 mise。如果你
希望跳过 Bash 的 rc 文件，请使用 `mise en -s "bash --norc"`。

## 进入项目时自动安装

在正常激活的 shell 中，进入受信任的项目时运行安装：

```toml
[hooks]
enter = "mise i -q"
```

进入目录时，该钩子可以下载工具并运行安装脚本。
如果你希望自行选择运行这些操作的时机，请改用显式的 `mise install`。

## [`mise tool [TOOL]`](/cli/tool.html)

检查工具所选的后端、版本请求和安装信息：

```sh
mise tool ripgrep
```

使用 `mise registry ripgrep` 检查注册表选择，并使用 `mise which rg` 查找
当前项目所选的可执行文件。

## [`mise cfg`](/cli/config.html)

列出已加载的配置文件及其工具：

```sh
mise config
```

当某个值来自意外的文件时可以使用此命令。有关优先级以及文件命令
写入的位置，请参阅[配置](/configuration.html)。`mise cfg` 是一个别名。

## `mise.lock`

将已配置的请求解析到要提交的锁文件中：

```sh
mise lock
mise install --locked
```

锁定会记录具体版本，并在后端支持时记录产物 URL 和校验和。`mise install --locked` 会检查锁文件能否满足配置。
使用 `mise lock --bump --dry-run` 可以在应用版本刷新前预览结果。

不同后端能够锁定的元数据不同。对于自定义 HTTP 下载，请在可用时配置
[校验和来源](/dev-tools/backends/http.html#checksum-url)。有关平台覆盖范围和严格验证，请参阅
[锁文件](/dev-tools/mise-lock.html)；不要仅仅为了重新生成元数据而卸载所有工具。

## 锁文件 URL 跟踪（避免速率限制）

对于记录产物 URL 的后端，锁文件可以避免后续安装时重复查找发布资源。
它不包含产物本身，也不会消除所有网络或身份验证要求。下载、验证、私有代码仓库和
特定后端的操作仍可能需要访问权限。

有关凭据，请参阅 [GitHub Tokens](/dev-tools/github-tokens.html)；有关每个后端的保证，请参阅
[锁文件行为](/dev-tools/mise-lock.html)。
