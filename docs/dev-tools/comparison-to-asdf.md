---
description: "将项目和个人默认设置从 asdf 迁移到 mise，了解对应命令及两者差异。"
---

# 从 asdf 迁移

mise 可以读取 `.tool-versions` 文件，也能运行 [asdf 插件](/dev-tools/backends/asdf.html)，因此
你可以逐个迁移项目，让团队成员暂时继续使用 asdf。mise 有自己的命令、安装目录和后端，因此每个
项目迁移后都应进行检查。

## 迁移项目 {#migrate-from-asdf-to-mise}

调整 shell 配置前，先在一个项目中完成迁移：

1. [Install mise](/installing-mise.html).
2. In the project directory, run `mise config ls` and `mise ls --current` to
   see how mise reads the existing `.tool-versions`.
3. Run `mise install`, then check a tool through mise:

   ```sh
   mise exec -- node --version
   ```

   请将 `node --version` 替换为项目中实际使用的工具命令。mise 会单独安装每个工具，不会复用
   asdf 的安装目录；两个版本管理器也不能共用同一目录。

4. 项目运行正常后，从 shell 启动文件中移除 asdf 的激活代码和 shim 目录，并[激活 mise](/shell-setup.html)。
   启动新的 shell，再检查 `mise doctor` 和 `command -v node`。

若要将项目迁移到 `mise.toml`，请先预览转换结果，再生成文件：

```sh
mise generate config --tool-versions .tool-versions --dry-run
mise generate config --tool-versions .tool-versions
```

除非仍有 asdf 用户需要，否则请在迁移后删除 `.tool-versions`。所有项目都运行正常后，可以
[卸载 asdf](https://asdf-vm.com/manage/core.html#uninstall)。

## 命令对照 {#command-compatibility}

| 操作                         | asdf                                                     | mise                                                                             |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 安装版本                     | `asdf install nodejs 24.0.0`                             | `mise install node@24.0.0`                                                       |
| 选择项目版本                 | `asdf set nodejs 24.0.0`（0.16 之前：`asdf local`）      | `mise use node@24.0.0`（同时安装）                                               |
| 选择个人默认版本             | `asdf set -u nodejs 24.0.0`（0.16 之前：`asdf global`）  | `mise use -g node@24.0.0`                                                        |
| 添加插件                     | `asdf plugin add nodejs`                                 | 注册表工具无需插件；其他工具可用 `mise plugins install <name> <git-url>`         |
| 列出已安装版本               | `asdf list nodejs`                                       | `mise ls node`                                                                   |
| 列出可用版本                 | `asdf list all nodejs`                                   | `mise ls-remote node`                                                            |
| 查看最新版本                 | `asdf latest nodejs`                                     | `mise latest node`                                                               |
| 查看当前选中的版本           | `asdf current`                                           | `mise ls --current`                                                              |
| 查找当前选中的可执行文件     | `asdf which node`                                        | `mise which node`                                                                |
| 查看安装目录                 | `asdf where nodejs`                                      | `mise where node`                                                                |
| 使用选定版本运行命令         | `asdf exec node -v`                                      | `mise exec -- node -v`                                                           |
| 卸载版本                     | `asdf uninstall nodejs 24.0.0`                           | `mise uninstall node@24.0.0`                                                     |
| 重建 shims                   | `asdf reshim`                                            | `mise reshim`                                                                    |

asdf 0.16 使用 Go 重写了 asdf，并以 [`asdf set`](https://asdf-vm.com/manage/versions.html)
取代 `asdf local` 和 `asdf global`。`mise set` 与版本管理无关，它用于设置环境变量。请使用
`mise use` 管理工具版本。

mise 接受部分 asdf 写法，例如 `mise install node 24.0.0`，也接受 `nodejs` 和 `golang` 等工具名，
但它并未完整模拟 asdf。请在脚本中使用 mise 自己的语法，并在 `mise.toml` 中使用 `node` 和 `go`
作为工具名。

## 与 asdf 用户共用 `.tool-versions` {#share-tool-versions}

只要团队成员仍在使用 asdf，就保留共享的 `.tool-versions`。若要用 mise 更新该文件，请指定文件
路径，并固定为 asdf 支持的具体版本：

```sh
mise use --path .tool-versions --pin node@24
```

请勿在 asdf 会读取的文件中使用 `prefix:`、`sub-` 等 [mise 专用版本请求](/dev-tools/versions.html#request-syntax)，
也不要使用 `aqua:jqlang/jq` 等后端名称。同一目录下的 `mise.toml` 对其中声明的工具具有更高优先级，
因此同时保留两个文件前请检查是否存在冲突声明。仅列在 `.tool-versions` 中的工具不会写入
[`mise.lock`](/dev-tools/mise-lock.html)，`--locked` 也不会检查它们。

## 个人默认版本 {#personal-defaults}

mise 将个人默认版本保存在 `~/.config/mise/config.toml` 中。选择所需版本，并使用
`mise use -g` 设置：

```sh
mise use -g node@24 python@3.14
```

mise 也会读取 `~/.tool-versions`，因为它会在每个父目录中查找 `.tool-versions`。因此，asdf
的全局版本仍会应用于主目录下的项目，直到你将这些版本迁移到 `~/.config/mise/config.toml`，并删除
或精简原文件。在主目录中运行 `mise config ls` 可查看这两个文件。

请逐个复制版本，而不要一次性转换整个文件。检查列出多个版本或使用别名的条目，并在所有工具都能
正常使用前保留旧文件。

## 两者行为差异 {#what-works-differently}

### 版本选择时机 {#performance}

使用 `mise activate` 时，mise 会在 shell 提示符出现或切换目录时更新 `PATH` 和环境变量，之后的
命令会直接运行工具的可执行文件。asdf 则会在每次调用工具时通过 shim 解析版本。mise 也为需要稳定
可执行文件路径的程序提供 [shims](/dev-tools/shims.html#overview)；与 asdf 类似，它们会在每次
调用时解析版本。

### 插件与安全 {#security}

asdf 插件是 shell 脚本，每次安装工具时都会在你的机器上运行，因此你必须同时信任插件维护者和工具
发布者。mise 通过内置后端安装大多数注册表工具，无需插件。有些后端还会验证下载内容：packslip
会检查经过签名的发行清单；aqua 则会执行其注册表声明的校验和、cosign、SLSA 或证明验证。验证方式
因工具而异，请运行 `mise tool <name>` 检查。参见[安全](/security.html)。

### Windows {#windows-support}

对于提供 Windows 构建的工具和后端，mise 可在 Windows 上原生运行。asdf 插件是 shell 脚本，需要
Unix 环境；mise 无法让它们直接在 Windows 上原生运行。Windows 安装方式请参见[安装 mise](/installing-mise.html)。

### 没有 asdf 插件的工具 {#extra-backends}

如果注册表中有对应名称，请直接使用；否则可明确指定软件包来源：

```toml [mise.toml]
[tools]
node = "24"
ripgrep = "latest"
"npm:prettier" = "3"
```

Prettier 运行时需要 Node.js，因此这里同时声明了两者。其他[后端](/dev-tools/backends/)可安装发行
版二进制文件、Python CLI、Rust crate 和私有工具。
