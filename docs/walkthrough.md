---
description: "在现有仓库中引入 mise，与团队共享配置，并将项目命令作为任务运行。"
socialDescription: "在现有仓库中引入 mise，并与团队共享配置。"
---

# 在现有项目中使用 mise

将 mise 引入正在使用的项目：声明项目所需的工具，将个人设置与共享配置分开，与团队共享环境，并通过 mise 运行项目命令。如果尚未安装 mise，请先阅读[开始使用](/getting-started.html)。

本页示例使用 `mise exec` 和 `mise run`，因此无需启用 Shell 激活。启用[激活功能](/getting-started.html#activate-mise)后，也可以直接在提示符下运行所选工具。

## 声明项目所需的工具 {#installing-dev-tools}

先从项目已有的版本文件开始。mise 无需额外配置即可读取 `.tool-versions`：

```sh
cat .tool-versions
# nodejs 24
mise ls --current
# node  24.x.x  ~/src/app/.tool-versions  24
```

`.nvmrc`、`.node-version`、`.python-version` 和 `.ruby-version` 等其他版本管理器使用的文件属于[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。mise 只会读取已启用工具对应的文件，因此请在项目配置中启用这些工具，让原有文件继续作为版本来源：

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ["node", "python"]
```

对于项目尚未声明的工具，请在项目根目录运行 [`mise use`](/cli/use.html)。该命令会安装工具，并将版本请求写入 `mise.toml`：

```sh
mise use node@24 python@3.14
```

```toml [mise.toml]
[tools]
node = "24"
python = "3.14"
```

每个版本请求都可以选择精确程度。`node@24` 这样的前缀接受任意 Node.js 24 版本，因此不同机器可能解析出不同版本。`mise use --pin` 会写入精确版本；也可以在 `mise.toml` 中保留版本前缀，并通过[锁文件](#share-the-setup)记录精确版本。如果不指定版本，`mise use node` 会写入 `node = "latest"`。各形式的解析规则请参阅[版本请求](/dev-tools/versions.html)；[`mise use` 与 `mise install` 的区别](/dev-tools/#choose-the-right-command)请参阅相应说明。

语言包管理器也可以作为后端使用。请同时声明它们所需的运行时：

```sh
mise use node@24 'npm:@antfu/ni'
mise use rust@stable cargo:starship
```

mise 支持的其他安装来源请参阅[后端](/dev-tools/backends/)。[`mise edit`](/cli/edit.html) 会打开 `mise.toml` 的交互式编辑器，还可以在注册表中搜索工具。

## 将个人设置保留在本地 {#mise-toml-configuration}

`mise.toml` 会与所有克隆项目的人共享。请将个人覆盖项（例如用于测试的其他版本或本机的 `DATABASE_URL`）放入同目录下的 `mise.local.toml`，并将该文件加入 `.gitignore`：

```sh
mise use --env local node@26
echo 'mise.local.toml' >> .gitignore
```

mise 会合并当前目录及所有父目录中的配置文件，以及全局配置。越接近当前目录的文件优先级越高：

1. `~/.config/mise/config.toml`：全局默认设置
2. `~/work/mise.toml`：`~/work` 下所有项目的设置
3. `~/work/app/mise.toml`：项目共享配置
4. `~/work/app/mise.local.toml`：项目个人覆盖配置

运行 [`mise config ls`](/cli/config/ls.html) 可查看当前生效的文件；mise 会读取的所有位置请参阅[配置文件](/configuration.html#mise-toml)。

`mise.local.toml` 是纯文本文件，文件名不会对其加密，也不会自动阻止它进入 Git。不要将密钥放入已提交的配置；需要保密的值请使用[密钥提供方](/environments/secrets/)。

## 共享项目配置 {#share-the-setup}

将 `mise.toml` 提交到版本库。若要记录版本请求解析出的精确版本和下载校验和，请生成锁文件并一同提交：

```sh
mise lock
git add mise.toml mise.lock
```

如何更新和强制使用锁文件，请参阅[锁文件](/dev-tools/mise-lock.html)。如果配置使用了近期 mise 版本新增的功能，请通过 [`min_version`](/configuration.html#minimum-mise-version) 声明最低版本，而不是要求所有人安装同一个精确版本：

```toml [mise.toml]
min_version = "2026.10.0"
```

克隆项目后，团队成员应先阅读项目配置，因为任务、钩子和 `[env]` 都可能运行代码，然后再执行：

```sh
mise install    # installs the declared tools and trusts the project
mise tasks ls   # lists the project's tasks
```

信任配置后允许执行哪些操作，请参阅[配置的信任机制](/security.html#configuration-trust)。

对于尚未安装 mise 的贡献者，可以提交一个包装脚本，在首次使用时下载固定版本的 mise：

```sh
mise generate install-script --localize --write
./bin/mise install
```

包装脚本的选项（包括 Windows 启动器）请参阅[持续集成](/continuous-integration.html#bootstrapping)。

## 将项目命令定义为任务 {#tasks}

将项目已有命令包装为任务，即可让它们使用 mise 管理的工具和环境：

```toml [mise.toml]
[tasks]
build = "npm run build"
test = "npm test"
```

```sh
mise run test
```

无论是否启用 Shell 激活，`mise run test` 都会安装缺少的工具、设置 `[env]`，然后运行 `npm test`。

任务也可以是 `mise-tasks/` 中的可执行脚本。不要在 `mise.toml` 和 `mise-tasks/` 中定义同名任务：

```sh [mise-tasks/build]
#!/usr/bin/env bash
npm run build
```

在 Unix 上，使用 `chmod +x mise-tasks/build` 将脚本设为可执行文件。文件任务可以在 `#USAGE` 注释中声明标志和参数；mise 会解析这些声明、添加 `--help`，并在 Shell 中提供补全。详见[任务参数](/tasks/task-arguments.html)。

若要直接调用项目 npm 软件包中的可执行文件，请将 `node_modules/.bin` 加入项目的 `PATH`：

```toml [mise.toml]
[env]
_.path = "./node_modules/.bin"
```

该路径相对于 `mise.toml` 所在目录，因此从子目录运行时也有效。更多信息请参阅[环境变量](/environments/)。

## 保持工具为最新版本 {#upgrading-dev-tools}

[`mise outdated`](/cli/outdated.html) 会列出有新版本的工具；[`mise upgrade`](/cli/upgrade.html) 会在 `mise.toml` 指定的版本请求范围内安装新版本。有关 `--bump`、锁文件和自动更新，请参阅[升级工具](/dev-tools/#upgrade-tools)。

## 常用命令 {#common-commands}

| 用途                           | 命令                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| 查看生效的配置文件             | [`mise config ls`](/cli/config/ls.html)                                                |
| 查看已选择的工具版本           | [`mise ls --current`](/cli/ls.html)                                                    |
| 查找可用版本                   | [`mise ls-remote TOOL`](/cli/ls-remote.html)                                           |
| 查看有更新的工具               | [`mise outdated`](/cli/outdated.html)                                                  |
| 列出项目任务                   | [`mise tasks ls`](/cli/tasks/ls.html)                                                  |
| 诊断环境问题                   | [`mise doctor`](/cli/doctor.html)                                                      |
| 更新 mise 本身                 | [`mise self-update`](/cli/self-update.html)，或使用安装 mise 时所用的包管理器             |

## 延伸阅读 {#final-thoughts}

- [开发工具](/dev-tools/)：版本、后端和工具选项
- [环境](/environments/)：变量、`.env` 文件和密钥
- [任务](/tasks/)
- [配置](/configuration.html)和[设置](/configuration/settings.html)
- [注册表](/registry.html)：`node` 等简短名称及其对应的后端
- [CLI 参考](/cli/)
