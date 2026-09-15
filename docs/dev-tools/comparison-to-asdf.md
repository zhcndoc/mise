---
description: "mise 读取 .tool-versions 并支持 legacy asdf 插件"
---

# 与 asdf 的比较

mise 读取 `.tool-versions` 并支持 [legacy asdf 插件](/dev-tools/backends/asdf.html)。
你可以从现有项目的版本声明开始，然后采用 `mise.toml` 来配置[环境变量](/environments/)和[任务](/tasks/)。
CLI 和插件兼容性尽力而为；mise 有自己的命令、安装目录和后端选择。

## 从 asdf 迁移到 mise

在更改 shell 默认设置之前，先从一个项目开始：

1. [安装 mise](/installing-mise.html)。
2. 在项目目录中运行 `mise config ls` 和 `mise ls --current`，检查 mise 如何读取现有的 `.tool-versions`。
3. 运行 `mise install`，然后通过 mise 验证项目命令：

   ```sh
   mise exec -- node --version
   ```

   将 `node --version` 替换为项目工具中的命令。mise 使用自己的安装目录；不会自动复用 asdf 的安装目录。

4. 项目正常运行后，从 shell 启动文件中移除 asdf 激活配置和 shim `PATH` 条目，并[激活 mise](/getting-started.html#activate-mise)。
   启动新的 shell，然后检查 `mise doctor` 和 `command -v node`。

如果团队成员仍在使用 asdf，请保留共享的 `.tool-versions` 文件。要使用 mise 更新该文件，请指定文件并固定一个具体版本：

```sh
mise use --path .tool-versions --pin node@24
```

避免在 asdf 必须读取的文件中使用 mise 专用前缀或后端标识符。
同一目录中的 `mise.toml` 会优先于它声明的工具，因此在同时保留这两个文件之前，请检查是否存在冲突的声明。

对于个人默认设置，请使用 `mise use -g node@24` 或编辑
`~/.config/mise/config.toml`。在项目之外运行 `mise config ls`，查看哪些 home／全局文件正在为你的环境提供配置。请明确复制所需的版本，而不要移动或重写 asdf 的安装。

## go 版 asdf（0.16+）

asdf 0.16 使用 Go 替代了旧的 Bash 实现，并更改了部分 CLI。特别是，当前的 asdf 使用 `asdf set` 写入版本。请参阅
[asdf 的版本命令](https://asdf-vm.com/manage/versions.html)。
`mise set` 的用途不同：它用于写入环境变量。工具版本请使用 `mise use`。

## 用户体验

`mise use` 会合并安装和配置。例如：

```sh
mise use node@24 python@3.14
mise exec -- node --version
```

这会记录两个工具的版本请求，并在必要时安装它们。
克隆已配置的项目后，`mise install` 会安装其中的工具，而不会更改声明。通常不需要单独安装插件：
注册表会选择一个后端，许多工具使用内置后端。

## 命令兼容性

在脚本中优先使用 mise 文档中的命令语法。某些旧版 asdf 写法可以使用，但兼容性别名并不能完整模拟 asdf。

| 目标                         | asdf 命令                    | mise 命令                              |
| ---------------------------- | ---------------------------- | -------------------------------------- |
| 安装特定版本                 | `asdf install nodejs 24.0.0` | `mise install node@24.0.0`             |
| 选择项目版本                 | `asdf set nodejs 24.0.0`     | `mise use node@24.0.0`（也会安装）    |
| 选择个人默认版本             | `asdf set -u nodejs 24.0.0`  | `mise use -g node@24.0.0`              |
| 列出可用版本                 | `asdf list all nodejs`       | `mise ls-remote node`                  |
| 检查已选择的版本             | `asdf current`               | `mise ls --current`                    |
| 查找已选择的可执行文件       | `asdf which node`            | `mise which node`                      |
| 重建 shims                   | `asdf reshim`                | `mise reshim`                          |

mise 可识别旧版工具名称 `nodejs` 和 `golang`，而其 TOML 配置使用规范名称 `node` 和 `go`。

## 性能

主要区别在于版本选择运行的时机。使用正常的 `mise activate` 时，mise 会在 shell 提示符处或受支持的目录变更钩子中更新 `PATH` 和环境变量。后续工具调用会直接使用这些可执行文件路径。
asdf 则会在工具被调用时通过 shim 解析工具。

mise 还会为需要稳定可执行文件路径的程序提供 shims。其开销取决于命令通过 mise 的频率；使用 `mise exec -- <script>` 可以为脚本及其子进程准备一次环境。基于 Bash 的旧版 asdf 的历史基准不能反映当前 asdf 的性能。请参阅
[shims](/dev-tools/shims.html) 了解行为上的权衡。

## Windows 支持

mise 为兼容的工具和后端提供原生 Windows 支持。可用性仍取决于工具的发布产物和安装逻辑。旧版 asdf shell 插件通常需要 Unix 环境；使用 mise 不会使这些插件变成原生 Windows 安装程序。请参阅
[Windows](/installing-mise.html#windows-scoop)。

## 供应链安全

asdf 插件会在工具管理期间执行 shell 代码。通过任一管理器使用插件时，除了信任工具发布者之外，还需要信任插件维护者。mise 可以通过内置下载后端安装许多工具，而无需外部插件。

## 安全性

验证方式因发行版而异。例如，packslip 会验证签名清单，aqua 支持其注册表条目中描述的验证方法。仅凭工具或后端名称，不能保证特定产物带有签名。请参阅[安全指南](/security.html)，了解信任、验证和配置控制。

## 额外的后端

如果注册表提供了简写，请使用注册表简写，或者明确选择软件包源：

```toml [mise.toml]
[tools]
node = "24"
ripgrep = "latest"
"npm:prettier" = "3"
```

这里的 npm 后端需要 Node.js，因此两者都进行了声明。其他后端可以安装发布的二进制文件、Python CLI、Rust crate 或私有工具。请参阅[后端参考](/dev-tools/backends/)，了解前置条件和选项。
