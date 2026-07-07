# 使用指南

在你完成 [入门指南](/getting-started) 之后，你就可以开始使用 mise 了。
本文档提供了一些你可能想要尝试的初始内容的快速概览。

## 安装开发工具

在 mise 中，使用工具的主要命令是 [`mise u|use`](/cli/use)。它主要做两件事：

- 安装工具（如果尚未安装）
- 将工具添加到 `mise.toml` 配置文件中——在 mise 里，如果工具在 `mise.toml` 中，我会说它是“激活”的

:::warning
这两项都是使用工具所必需的。如果你只是通过 `mise install` 安装了一个工具，它不会在你的 shell 中可用。
它还必须被添加到 `mise.toml` 中——这就是我为什么推荐使用 `mise use`，因为它会同时完成这两件事。
:::

你可以像这样使用它（注意：要使下面的示例生效，`mise` 必须先被[激活](/getting-started.html#activate-mise)）：

```bash
mkdir example-project && cd example-project
mise use node@26
node -v
# v26.x.x
```

你还会注意到，现在你有了一个包含以下内容的 `mise.toml` 文件：

```mise-toml [mise.toml]
[tools]
node = "26"
```

- 如果这个文件位于项目根目录，那么每当有人运行 [`mise install|i`](/cli/install) 时，都会安装 `node`。
- 当你首次克隆一个项目时，或者当你想更新已安装的工具时，这是你想要运行的命令。

## `mise.toml` 配置

你可以手动创建一个 `mise.toml` 文件，也可以使用 CLI 创建。

> [!TIP]
> 使用 `mise edit` 打开一个用于配置的交互式编辑器。它提供了一个 TUI，你可以在其中浏览各个部分，使用模糊搜索从注册表中添加工具，并通过支持 schema 的自动补全来配置设置。

使用 [`mise.toml`](/configuration#mise-toml) 与他人共享你的工具配置。这个文件应提交到版本控制中，并包含项目所需的通用工具集。

对于你想保密的工具或设置，请使用 [`mise.local.toml`](/configuration#mise-toml)。这个文件应添加到 `.gitignore` 中，非常适合保存个人偏好或配置。

`mise` 支持层叠的嵌套配置文件，从更宽泛到更具体的设置依次生效：

1. `~/.config/mise/config.toml` - 适用于所有项目的全局设置
2. `~/work/mise.toml` - 工作相关设置
3. `~/work/project/mise.toml` - 项目相关设置
4. `~/work/project/mise.local.toml` - 不应共享的项目相关设置

`mise` 会结合所有父目录来确定工具集合——配置层级越低，覆盖优先级越高。

:::tip
使用 [`mise config ls`](/cli/config/ls) 查看 `mise` 当前使用的配置文件。
:::

通常，建议在 `mise` 中使用宽松版本号，例如 `node@26`，这样与项目协作的其他人就不必担心你正在使用的工具的确切版本。如果你希望锁定版本以强制使用特定版本，请使用 `mise use --pin` 或 [`lockfile`](/configuration/settings#lockfile) 设置。

如果你省略版本，`mise` 将默认使用 `node@latest`。

## 开发工具后端

工具可通过多种后端安装，例如 `aqua`、`github` 或 `gitlab`。有关你可以使用的诸如 `node` 之类的所有简写完整列表，请参阅 [registry](/registry.html)。

你也可以使用其他后端，例如 `npm` 或 `cargo`，它们可以从各自的注册表中安装任何包：

```bash
mise use npm:@antfu/ni
mise use cargo:starship
```

## 升级开发工具

可以使用 [`mise up|upgrade`](/cli/upgrade) 来升级工具版本。默认情况下，它会遵守 `mise.toml` 中的版本前缀。如果存在 [lockfile](/configuration/settings#lockfile)，
mise 会将 `mise.lock` 更新为与 `mise.toml` 中前缀对应的该工具的最新版本。

因此，如果你在 `mise.toml` 中有 `node = "26"`，那么 `mise upgrade node` 将会升级到 `node 26` 的最新版本。

如果你想将 `mise.toml` 中的版本更新为更新的版本，可以使用 `mise upgrade --bump node`。
它会将版本设置为与当前版本相同的具体程度，因此如果你有 `node = "24"`，
但使用 `mise upgrade --bump node` 将其更新为 `node@26`，那么它会在 `mise.toml` 中设置为 `node = "26"`。

_更多关于工具使用的信息，请参见 [Dev Tools](/dev-tools/)。_

## 设置环境变量

mise 也可以用于为你的项目设置环境变量。你可以使用 CLI 设置环境变量：

```bash
mise set MY_VAR=123
echo $MY_VAR
# 123
```

或者直接修改 `mise.toml`：

```toml
[env]
MY_VAR = "123"
```

一些可用场景示例：

- 为 Node.js 项目设置 `NODE_ENV`
- 为数据库连接设置 `DATABASE_URL`
- 设置 `RUST_TEST_THREADS=1` 以串行运行 cargo 测试

不要在项目的 mise.toml 中设置密钥，因为该文件预期会被加入版本控制。
对于密钥，请改用 [mise.local.toml](#misetoml-configuration)。

你也可以使用 `mise.toml` 修改 `PATH`。
以下示例使通过 `npm` 安装的 CLI 可用：

```toml
[env]
_.path = "./node_modules/.bin"
```

这会将 `./node_modules/.bin` 添加到该项目的 PATH 中——这里的 "." 指的是 `mise.toml` 文件所在的目录，因此即使你进入子目录，它也仍然有效。

_有关如何使用环境变量的更多信息，请参见 [Environments](/environments/)。_

## 任务

任务在项目中定义，用于执行命令。

你可以在 `mise.toml` 中定义任务：

```mise-toml [mise.toml]
[tasks]
build = "npm run build"
test = "npm test"
```

或者也可以在 `mise-tasks` 目录中以独立文件的形式定义，例如 `mise-tasks/build`：

```bash [mise-tasks/build]
#!/bin/bash
npm run build
```

任务通过 [`mise r|run`](/cli/run) 执行：

```bash
mise run build
mise run test
```

:::tip
`mise run` 会在运行任务之前先设置好“mise 环境”（工具和环境变量）。
所以如果你不想在 shell 中激活 mise，你可以用 `mise run` 来运行任务，它会将工具加入 PATH，并应用 `mise.toml` 中的环境变量。
:::

`mise` 与 [usage](https://usage.jdx.dev) 搭配使用，后者提供了许多用于编写文档和运行任务的功能。

下面是一个带有 usage 规范的任务示例：

```bash [mise-tasks/greet]
#!/usr/bin/env bash
set -e

#MISE description="向用户打招呼并发送一条消息"
#USAGE flag "-g --greeting <greeting>" help="要使用的问候语" {
#USAGE   choices "hi" "hello" "hey"
#USAGE }
#USAGE flag "-u --user <user>" help="要问候的用户"
#USAGE flag "--dir <dir>" help="用于发出问候的目录" default="."
#USAGE complete "dir" run="find . -maxdepth 1 -type d"
#USAGE arg "<message>" help="问候消息"

echo "所有可用选项都作为带有前缀 'usage_' 的环境变量提供"
env | grep usage_

echo "${usage_greeting?}, ${usage_user?}! Your message is: ${usage_message?}"
```

这个任务可以这样运行：

```shell
mise run greet --user jdx -g "hey" "How are you?"
```

- 所有选项都会作为环境变量传递，前缀为 `usage_`，例如 `usage_user`。
- 可以使用 `mise run greet --help` 查看帮助，它会显示在任务中定义的选项。
- 补全功能与预期一致，因此输入 `mise run greet --greeting <tag>` 时会显示 `hi`、`hello` 和 `hey`
  作为可选项。
- 可以通过 CLI 提供 [自定义补全](https://usage.jdx.dev/spec/reference/complete)。`mise run greet --dir <tab>` 将执行 `find . -maxdepth 1 -type d` 来提供补全。

要让自动补全生效，请设置 [mise 自动补全](/installing-mise.html#autocompletion)。

_更多关于如何使用任务的信息，请参见 [Tasks](/tasks/)。_

## 常用命令

由于 mise 中可用的命令很多，以下是我认为最重要的一些：

- [`mise completion`](/cli/completion) – 为你的 shell 设置补全。
- [`mise cfg|config`](/cli/config) – 一组通过 CLI 操作 `mise.toml` 文件的命令。
- [`mise x|exec`](/cli/exec) – 在不激活 mise 的情况下，在 mise 环境中执行命令。
- [`mise g|generate`](/cli/generate) – 为你的项目生成诸如 git hooks、任务文档、GitHub Actions 等内容。
- [`mise i|install`](/cli/install) – 安装工具。
- [`mise link`](/cli/link) – 将通过其他方式安装的工具符号链接到 mise 中。
- [`mise ls-remote`](/cli/ls-remote) – 列出工具的所有可用版本。
- [`mise ls`](/cli/ls) – 列出已安装/已激活工具的信息。
- [`mise outdated`](/cli/outdated) – 告知你有哪些工具有更新版本可用。
- [`mise plugin`](/cli/plugins) – 插件可以为 mise 扩展新功能，例如额外的工具或环境变量管理。通常，这些插件只是 asdf 插件或现代插件。
- [`mise r|run`](/cli/run) – 运行在 `mise.toml` 或 `mise-tasks` 中定义的任务。
- [`mise self-update`](/cli/self-update) – 将 mise 更新到最新版本。如果你是通过包管理器安装的 mise，请不要使用此命令。
- [`mise settings`](/cli/settings) – 通过 CLI 访问以获取/设置配置项。
- [`mise rm|uninstall`](/cli/uninstall) – 卸载工具。
- [`mise up|upgrade`](/cli/upgrade) – 升级工具版本。
- [`mise u|use`](/cli/use) – 安装并激活工具。
- [`mise w|watch`](/cli/watch) – 监视项目中的更改，并在更改发生时运行任务。

## 最后的思考

开发工具、环境变量和任务协同工作，让管理你的开发环境更轻松——尤其是在与他人协作时。目标是为项目提供一致的用户体验，无论使用何种编程语言或工具。

延伸阅读：

- [开发工具](/dev-tools/) – 更深入了解如何使用开发工具
- [环境](/environments/) – 更深入了解如何使用环境变量
- [任务](/tasks/) – 更深入了解如何使用任务
- [配置](/configuration) – 关于 `mise.toml` 文件的更多信息
- [设置](/configuration/settings) – mise 中可用的全部配置项
- [后端](/dev-tools/backends/) – mise 中所有可用后端的索引
- [注册表](/registry) – mise 中所有可用的“简写”工具名，例如 `node`、`terraform` 或 `watchexec`，它们分别指向 `core:node`、`asdf:asdf-community/asdf-hashicorp` 和 `aqua:watchexec/watchexec`
- [CLI](/cli/) – mise 中可用命令的完整列表
