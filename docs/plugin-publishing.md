---
description: "将插件发布为 Git 仓库或发布归档，并提供经过测试的安装命令以及有关其实际接口的文档。"
---

# 插件发布

将插件发布为 Git 仓库或发布归档，并提供经过测试的安装命令以及有关其实际接口的文档。用户可以直接通过 URL 安装；添加 mise registry 简写是单独的流程，并且不接受新的 asdf/vfox 工具条目。

本指南适用于 Lua 工具、后端、环境和软件包插件。在调整测试或发布工作流之前，先选择[插件类型](/plugins.html)。

## 发布检查清单

### 必需文件

包含 `metadata.lua`、适用于你的接口的钩子文件，以及包含安装、配置、先决条件、支持平台和可用验证命令的 README。

不要将凭据和特定于机器的配置放入仓库。

### 可选但推荐

添加许可证、自动化测试、变更日志或发布说明，以及格式化／lint 任务。记录经过测试的最低 mise 版本，尤其是对于特定于 mise 的钩子和模块。

插件元数据中的版本描述的是插件发布版本，而不是受管理工具的版本。

## 仓库设置

### 1. 初始化仓库

使用与你的接口匹配的模板：

- [工具插件模板](https://github.com/jdx/mise-tool-plugin-template)。
- [后端插件模板](https://github.com/jdx/mise-backend-plugin-template)。
- [环境插件模板](https://github.com/jdx/mise-env-plugin-template)。

从模板创建新仓库，或初始化一个全新的目录：

```sh
mkdir my-plugin
cd my-plugin
git init -b main
mkdir hooks
```

在测试前添加你的实现。空的元数据和钩子不是可安装的插件。

### 2. 基本目录结构

```text
my-plugin/
├── metadata.lua
├── README.md
├── LICENSE
├── hooks/
└── test/
```

`hooks/` 中的文件用于标识接口：

| 插件类型 | 钩子文件 |
| --- | --- |
| 工具 | `available.lua`、`pre_install.lua`、`env_keys.lua`；可选的生命周期钩子 |
| 后端 | `backend_list_versions.lua`、`backend_install.lua`、`backend_exec_env.lua` |
| 环境 | `mise_env.lua`、可选的 `mise_path.lua` |
| 软件包 | `package_installed.lua`、`package_install.lua`；可选的升级／卸载钩子 |

后端钩子实现应放在 `hooks/` 下，而不是 `metadata.lua` 中。软件包插件还使用 `mise.plugin.toml` 声明管理器功能；参见[软件包开发](/package-plugin-development.html)。

### 3. Git 忽略配置

使用符合工作流的路径忽略测试输出和本地凭据。不要意外排除插件运行时所需的文件。使用 `git ls-tree -r --name-only HEAD` 检查发布树，并测试生成的归档或检出内容。

## 版本控制策略

### 语义化版本

SemVer 是一种适用于**插件发布**的实用约定：对于破坏性的配置或行为变更，增加主版本号；对于兼容性新增，增加次版本号；对于修复，增加修订版本号。这并不意味着**插件管理的工具**使用 SemVer。

### 版本管理

同时更新 `PLUGIN.version` 和发布说明：

```lua
PLUGIN = {
    name = "my-plugin",
    version = "1.2.3",
    description = "Manage Example Tool",
    author = "Plugin Author",
}
```

为该发布版本使用 Git 标签。用户安装仓库时，元数据版本本身不会选择 Git 修订版本。

## 发布前测试

### 自动化测试

使用隔离的 mise 目录运行测试，这样本地插件就不会替代开发者已安装的插件，也不会修改其通常使用的全局配置。以下 POSIX 设置会创建一个一次性测试项目。在更改目录前保存插件路径：

```sh
plugin_dir="$PWD"
test_dir="$(mktemp -d)"
export MISE_CONFIG_DIR="$test_dir/config"
export MISE_SYSTEM_CONFIG_DIR="$test_dir/system"
export MISE_GLOBAL_CONFIG_FILE="$test_dir/global.toml"
export MISE_DATA_DIR="$test_dir/data"
export MISE_CACHE_DIR="$test_dir/cache"
export MISE_STATE_DIR="$test_dir/state"
export MISE_ENV_CACHE=0
export MISE_YES=1
mkdir -p "$test_dir/project"
cd "$test_dir/project"
mise plugin link test-plugin "$plugin_dir"
```

在一次性 shell／子 shell 中运行此操作，完成后删除临时目录。清除任何会影响测试的继承 `MISE_*` 设置，尤其是安全模式、强制配置路径或禁用的后端。这些目录会隔离 mise 自身的状态；软件包插件和外部安装程序仍可能修改其宿主机管理的状态。

然后测试插件所实现的接口。以下名称均为占位符：

| 类型 | 验证 |
| --- | --- |
| 工具 | `mise ls-remote test-plugin`、`mise use test-plugin@1.0.0`、`mise exec -- example --version` |
| 后端 | `mise ls-remote test-plugin:example`、`mise use test-plugin:example@1.0.0`、`mise exec -- example --version` |
| 环境 | 在 `[env]` 下声明 `_.test-plugin`，然后在子进程中断言预期的环境 |
| 软件包 | 使用一次性宿主配置文件或伪 CLI；测试状态、选定批次、试运行和感知所有权的清理 |

`mise exec --` 后的命令必须包含实际的可执行文件。测试具体的工具版本，而不是 `latest`，这样无关的上游发布就不会改变测试装置。

### 手动测试

除了本地符号链接外，还要在全新的测试目录中测试已发布的 Git 引用或归档。符号链接可以看到未提交和未跟踪的文件，而这些文件可能不会包含在发布版本中。验证包含空格的路径、所需的外部程序，以及 CI 中支持的每个操作系统。空的 Linux 容器需要宿主机先决条件和绝对路径的 mise 可执行文件，才能运行安装程序。

## 发布流程

### 1. 准备发布

运行插件文档中列出的检查，检查差异和发布树，更新元数据和说明，并且只提交预期的发布文件。确认安装说明使用你自己的仓库 URL 和受支持的工具版本。

### 2. 创建发布

从已检查的发布提交创建并推送一个标签：

```sh
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin main
git push origin v1.2.3
```

如果实际包含发布内容的分支不是 `main`，则推送该分支。避免使用 `git push --tags`，因为它可能会发布无关的本地标签。

### 3. GitHub Releases（推荐）

为现有标签创建一个发布，并附上安装说明、受支持的 mise 版本以及行为变更。测试用户将收到的确切修订版本。只有在使用者会验证已发布的签名时，签名才有用；不要暗示每次插件安装都会验证 Git 标签签名。

### 4. 发布说明模板

````markdown
## v1.2.3

Describe the concrete behavior change, required mise version, and any migration steps.
List supported platforms and changed external prerequisites.

```sh
mise plugin install my-plugin 'https://github.com/your-org/my-plugin#v1.2.3'
```
````

## 分发方式

### 1. 直接 Git 安装

```sh
mise plugin install my-plugin https://github.com/your-org/my-plugin
mise plugin install my-plugin 'https://github.com/your-org/my-plugin#v1.2.3'
```

Git 引用使用 `#`，而不是工具请求使用的 `@version` 语法。标签或分支可能会移动；提交 ID 可以标识固定的源代码修订版本。已有安装需要显式更新或替换；分享新 URL 不会自动更新用户的安装。

### 2. 私有仓库访问

使用用户的 Git 身份验证设置，例如 SSH：

```sh
mise plugin install my-plugin git@github.com:your-org/private-plugin.git
```

HTTPS 仓库可以使用 Git 的凭据助手。不要将令牌直接放入命令 URL 中：它可能会保留在 shell 历史记录、配置、进程参数或 Git 远程仓库中。在调试插件钩子之前，使用 `git ls-remote <repository-url>` 验证访问权限。

### 3. 归档分发

从确切的发布引用创建一个带顶层目录的归档：

```sh
git archive --format=zip --prefix=my-plugin/ --output=my-plugin-v1.2.3.zip v1.2.3
```

发布归档，然后从全新的 mise 数据目录测试其 URL：

```sh
mise plugin install my-plugin https://github.com/your-org/my-plugin/releases/download/v1.2.3/my-plugin-v1.2.3.zip
```

归档安装没有 Git 历史记录。`mise plugin update` 无法为其获取新的 Git 引用；用户必须显式安装替换归档。

## 维护和更新

### 1. 更新工作流

测试变更，发布新的修订版本，并记录用户更新的方法：

```sh
mise plugin update my-plugin#v1.3.0
```

更新插件代码和升级已安装的工具版本是两个独立的操作。更改可执行文件路径或环境钩子时，要同时测试新的安装和已有的安装。

### 2. 向后兼容

记录重命名的选项、变更的默认值、所需的外部工具以及移除的平台。在可行的情况下保持旧配置正常工作；需要迁移时，提供完整的替代示例。

### 3. 用户沟通

发布说明应解释可观察到的变更以及采用这些变更所需的命令。说明已知限制，以及如何在不包含机密信息的情况下报告可复现的故障。

## 安全注意事项

检查你所分发的代码和依赖项。在构造命令时，将工具名称、路径、版本和配置选项视为输入。确保下载内容经过验证，并在缺少必要校验和时失败。不要打印凭据或秘密响应正文。

插件是以用户权限运行的代码。归档、标签、工具锁定文件和配置的信任分别涵盖不同的内容；避免声称其中某一项可以保护所有内容。参见[安全](/security.html)和[使用插件](/plugin-usage.html)。

## 最佳实践

使 README 足以说明如何安装、配置、运行、更新和移除集成。根据发布构件进行测试，自动化受支持平台的检查，并使测试装置独立于个人设置和凭据。

## 故障排查

### 常见问题

如果插件作为本地链接可以正常工作，但发布后失败，请将 `git ls-tree` 或归档内容与工作目录进行比较。检查钩子文件名和 Lua 语法，并确认已发布的修订版本包含辅助文件。

如果版本显示不正确，请区分 `PLUGIN.version`、仓库引用和受管理工具的版本。分别检查 `mise plugins ls --urls` 和 `mise ls --current`。对于身份验证失败，首先使用 Git 本身检查仓库访问权限。

## 下一步

- [后端插件开发](/backend-plugin-development.html)。
- [工具插件开发](/tool-plugin-development.html)。
- [环境插件开发](/env-plugin-development.html)。
- [软件包插件开发](/package-plugin-development.html)。
- [插件 Lua 模块](/plugin-lua-modules.html)。

## 示例

### 简单的后端插件发布

通过全部三个后端钩子测试 `test-plugin:example`，然后在新的数据目录中安装带标签的仓库，并重复相同的检查。这可以发现缺失的辅助文件和打包不正确的钩子目录。

### 带钩子的工具插件

测试版本列表、构件验证、解压、`PostInstall`（如果存在）以及 `EnvKeys`。在没有竞争性 `[tools]` 条目的项目中加入版本文件测试。
