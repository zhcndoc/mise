---
description: "使用本指南将 mise 添加到现有项目并维护其配置：选择工具、共享默认设置、升级版本以及运行日常命令。"
---

# 操作指南

使用本指南将 mise 添加到现有项目并维护其配置：
选择工具、共享默认设置、升级版本以及运行日常命令。
如果尚未安装 mise，请先完成[入门指南](/getting-started.html)。

示例使用 `mise exec` 和 `mise run`，因此 shell 激活是可选的。
通过[激活](/getting-started.html#activate-mise)，你也可以直接在命令提示符中运行
所选工具。

## 安装开发工具

The main command for working with tools in mise is [`mise use`](/cli/use). It does two things：

- 安装工具（如果尚未安装）
- 将其版本请求保存到项目配置中

`mise install node@24` 会下载工具，但不会为项目选择该工具。
使用 `mise use` 保存该选择，或使用 `mise exec node@24 -- node --version`
运行一次该工具。

在现有项目的根目录中运行以下命令（或者先创建一个临时目录）：

```bash
mise use node@24
mise exec -- node --version
# v24.x.x
```

你还会注意到现在有一个 `mise.toml` 文件，内容如下：

```mise-toml [mise.toml]
[tools]
node = "24"
```

- 如果该文件位于项目根目录中，那么每当有人运行 [`mise install`](/cli/install) 时，都会安装 `node`。
- 克隆项目后，`mise install` 会安装已配置的工具。使用 `mise upgrade` 更新这些工具。

## `mise.toml` 配置

你可以手动创建一个 `mise.toml` 文件，也可以使用 CLI 创建。

> [!TIP]
> 使用 `mise edit` 打开一个用于配置的交互式编辑器。它提供了一个 TUI，你可以在其中浏览各个部分，使用模糊搜索从注册表中添加工具，并通过支持 schema 的自动补全来配置设置。

使用 [`mise.toml`](/configuration#mise-toml) 与他人共享你的工具配置。这个文件应提交到版本控制中，并包含项目所需的通用工具集。

对于希望保持私有的工具或设置，请使用 [`mise.local.toml`](/configuration#mise-toml)。此文件应添加到 `.gitignore` 中，非常适合存放个人偏好或配置。

`mise` 支持层叠的嵌套配置文件，从更宽泛到更具体的设置依次生效：

1. `~/.config/mise/config.toml` - 适用于所有项目的全局设置
2. `~/work/mise.toml` - 工作相关设置
3. `~/work/project/mise.toml` - 项目相关设置
4. `~/work/project/mise.local.toml` - 不应共享的项目相关设置

`mise` 会合并所有父目录中的配置文件，以确定工具集合——层级较低的配置会覆盖层级较高的配置。

:::tip
使用 [`mise config ls`](/cli/config/ls) 查看 `mise` 当前使用的配置文件。
:::

选择与项目匹配的版本精度。诸如 `node@24` 这样的请求允许使用该系列中的版本。使用 `mise use --pin` 保存确切版本，或使用[锁定文件](/dev-tools/mise-lock.html)共享已解析的版本，同时在 `mise.toml` 中保留更宽泛的请求。

如果省略版本，mise 默认使用 `node@latest`。

## 开发工具后端

工具可通过多种后端安装，例如 `aqua`、`github` 或 `gitlab`。有关你可以使用的诸如 `node` 之类的所有简写完整列表，请参阅[注册表](/registry.html)。

你也可以使用诸如 `npm` 或 `cargo` 之类的其他后端，
从各自的注册表中获取命令行软件包。同时声明所需的运行时或编译器：

```bash
mise use node@24 'npm:@antfu/ni'
mise use rust@stable cargo:starship
```

## 升级开发工具

使用 [`mise upgrade`](/cli/upgrade) 升级工具版本。默认情况下，它会遵循 `mise.toml` 中的版本前缀。如果存在[锁定文件](/configuration/settings#lockfile)，
mise 会将 `mise.lock` 更新为与 `mise.toml` 中前缀匹配的工具最新版本。

因此，如果 `mise.toml` 中有 `node = "24"`，那么 `mise upgrade node` 会将其升级到 `node 24` 的最新版本。

要将 `mise.toml` 中的版本更新为更高版本，请使用 `mise upgrade --bump node`。
它会保持当前版本的精度：如果你有 `node = "24"`，
而 `mise upgrade --bump node` 将其更新为 `node@26`，那么它会在 `mise.toml` 中设置 `node = "26"`。

_更多关于工具使用的信息，请参见 [Dev Tools](/dev-tools/)。_

## 设置环境变量

mise 也可以为项目设置环境变量。你可以使用 CLI 设置：

```bash
mise set MY_VAR=123
mise exec -- node -p process.env.MY_VAR
# 123
```

或者直接修改 `mise.toml`：

```toml
[env]
MY_VAR = "123"
```

以下是一些适用场景：

- 为 Node.js 项目设置 `NODE_ENV`
- 为数据库连接设置 `DATABASE_URL`
- 设置 `RUST_TEST_THREADS=1` 以串行运行 cargo 测试

不要将机密信息放入已提交的配置中。请使用被忽略的本地文件或[机密提供程序](/environments/secrets/)。`mise.local.toml` 仍然是明文文件；其名称不会加密内容，也不会自动阻止其进入 Git。

你也可以使用 `mise.toml` 修改 `PATH`。
以下示例使通过 `npm` 安装的 CLI 可用：

```toml
[env]
_.path = "./node_modules/.bin"
```

这会将 `./node_modules/.bin` 添加到项目的 PATH 中。这里的 "." 指包含 `mise.toml` 文件的目录，因此即使你进入子目录，该条目仍然有效。

_有关如何使用环境变量的更多信息，请参见 [Environments](/environments/)。_

## 任务

任务在项目中定义，用于执行命令。

如果项目的 `package.json` 已经定义了 `build` 和 `test` 脚本，请添加以下任务封装。在运行这些脚本前，先安装项目的 npm 依赖：

```sh
mise exec -- npm ci
```

这假定项目提交了 `package-lock.json`。如果没有，请使用项目所选的软件包管理器及其锁定文件。然后将以下内容添加到 `mise.toml`：

```mise-toml [mise.toml]
[tasks]
build = "npm run build"
test = "npm test"
```

或者，在 `mise-tasks/build` 中将 `build` 定义为文件任务。每个任务名称选择一种定义方式：

```bash [mise-tasks/build]
#!/bin/bash
npm run build
```

在 Unix 上，使用 `chmod +x mise-tasks/build` 使文件任务可执行。
任务通过 [`mise run`](/cli/run) 执行：

```bash
mise run build
mise run test
```

:::tip
`mise run` 会在运行任务前设置“mise 环境”（工具和环境变量）。
因此，如果你不想在 shell 中激活 mise，可以使用 `mise run`，在运行任务时将
工具放入 PATH，并设置 `mise.toml` 中的环境变量。
:::

`mise` 与 [usage](https://usage.jdx.dev) 配合使用，后者提供了许多用于记录和运行任务的功能。

下面是一个带有 usage 规范的任务示例：

```bash [mise-tasks/greet]
#!/usr/bin/env bash
set -e

#MISE description="Greet a user with a message"
#USAGE flag "-g --greeting <greeting>" help="The greeting word to use" default="hello" {
#USAGE   choices "hi" "hello" "hey"
#USAGE }
#USAGE flag "-u --user <user>" help="The user to greet" default="world"
#USAGE flag "--dir <dir>" help="The directory to greet from" default="."
#USAGE complete "dir" run="find . -maxdepth 1 -type d"
#USAGE arg "<message>" help="问候消息"

echo "${usage_greeting?}, ${usage_user?}! Your message is: ${usage_message?}"
```

将脚本保存为 `mise-tasks/greet`，并在 Unix 上使其可执行：

```sh
chmod +x mise-tasks/greet
```

然后运行：

```shell
mise run greet --user jdx -g "hey" "How are you?"
```

- 所有选项都会作为以 `usage_` 为前缀的环境变量传递，例如 `usage_user`。
- 使用 `mise run greet --help` 查看帮助，其中会显示任务中定义的选项。
- 自动补全会按预期提供支持，因此输入 `mise run greet --greeting <tab>` 时，会显示 `hi`、`hello` 和 `hey`
  作为选项。
- [自定义补全](https://usage.jdx.dev/spec/reference/complete)可以由 CLI 提供。`mise run greet --dir <tab>` 会执行 `find . -maxdepth 1 -type d` 来提供补全。

要让自动补全生效，请设置 [mise 自动补全](/installing-mise.html#autocompletion)。

_更多关于如何使用任务的信息，请参见 [Tasks](/tasks/)。_

## 常用命令

| 任务                            | 命令                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| 显示活动配置文件                | [`mise config ls`](/cli/config/ls.html)                                                |
| 检查已选择的工具版本            | [`mise ls --current`](/cli/ls.html)                                                    |
| 查找可用版本                    | [`mise ls-remote TOOL`](/cli/ls-remote.html)                                           |
| 查看有更新的工具                | [`mise outdated`](/cli/outdated.html)                                                  |
| 列出项目任务                    | [`mise tasks ls`](/cli/tasks/ls.html)                                                  |
| 诊断环境问题                    | [`mise doctor`](/cli/doctor.html)                                                      |
| 更新 mise 本身                  | [`mise self-update`](/cli/self-update.html)，或用于安装它的软件包管理器 |

请参阅 [CLI 参考](/cli/)，了解所有命令和选项。

## 延伸阅读 {#final-thoughts}

使用功能指南了解此工作流之外的其他选项：

- [Dev Tools](/dev-tools/) – 深入了解如何使用开发工具
- [Environments](/environments/) – 深入了解如何使用环境变量
- [Tasks](/tasks/) – 深入了解如何使用任务
- [Configuration](/configuration) – 了解有关 `mise.toml` 文件的更多信息
- [Settings](/configuration/settings) – mise 中可用的所有配置设置
- [Backends](/dev-tools/backends/) – mise 中所有可用后端的索引
- [Registry](/registry) – mise 中工具可用的所有“简写”，例如 `node`、`terraform` 或 `watchexec`，它们分别指向 `core:node`、`aqua:hashicorp/terraform` 和 `aqua:watchexec/watchexec`
- [CLI](/cli/) – mise 中可用命令的完整列表
