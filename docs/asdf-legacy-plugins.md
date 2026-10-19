---
description: "使用、维护和测试基于 shell 脚本的旧版 asdf 插件，并将它们移植为 Lua 工具插件。"
---

# asdf 插件（旧版）

asdf 插件是包含 Shell 脚本（`bin/list-all`、`bin/install` 等）的 Git 仓库，遵循
[asdf 插件接口](https://asdf-vm.com/plugins/create.html)。在 Linux 和 macOS 上，mise 会
通过 [asdf 后端](/dev-tools/backends/asdf.html)运行这些插件，因此现有插件仍可继续使用。

asdf 插件属于旧版格式：mise 注册表不再接受由这类插件支持的新工具，mise 也不会在 Windows
上运行它们。若要编写新插件，请使用 Lua 编写[工具插件](/tool-plugin-development.html)。
下文介绍如何使用和维护现有 asdf 插件，以及如何将其移植为 Lua 插件。

## 安装 asdf 插件 {#installing-asdf-legacy-plugins}

可以直接通过仓库标识符使用插件，无需单独安装：

```sh
mise use asdf:owner/asdf-tool@1.2.3
```

也可以用自定义名称安装插件，再通过该名称使用：

```sh
mise plugins install my-tool https://github.com/owner/asdf-tool
mise use my-tool@1.2.3
```

`mise plugins add` 是 `mise plugins install` 的别名。若要让所有参与项目的成员都能通过
`mise install` 获取插件，请在 `mise.toml` 中声明插件，并固定到完整的提交 SHA（mise 不接受
缩写 SHA）：

```toml
[plugins]
my-tool = "https://github.com/owner/asdf-tool#c532b140abd4ca00d3e76651b9bd32a980bd483c"

[tools]
my-tool = "1.2.3"
```

`mise registry <tool>` 会按优先级列出注册表简写可用的后端，`mise tool <tool>` 则会显示 mise
选中的后端。需要使用特定插件时，请填写完整的 `asdf:owner/repo` 标识符。可在
[asdf-plugins](https://github.com/asdf-vm/asdf-plugins) 仓库和
[mise-plugins](https://github.com/mise-plugins) 组织中查找现有插件；更新或移除插件的方法请参阅
[插件](/plugins.html)。

## 局限性

- mise 不会在 Windows 上运行 asdf 插件；`asdf:` 工具会被跳过。
- [`mise.lock`](/dev-tools/mise-lock.html) 只会记录 asdf 工具的版本。工具由插件脚本自行下载，
  因此 mise 没有可供锁定的 URL 或校验和，也无法验证下载内容。
- 每个脚本都会在新进程中运行；有关缓存，请参阅 [`bin/exec-env`](/asdf-legacy-plugins.html#bin-exec-env)。
- 在[安全模式](/security.html#safe-mode)下，mise 会拒绝运行 asdf 插件脚本。

## asdf 插件与 Lua 插件对比 {#feature-comparison-asdf-vs-vfox}

|                           | asdf 插件                                 | Lua 工具插件                                                                                                                                                          |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 编写方式                  | 可执行脚本，通常使用 Bash                  | Lua 钩子，由 mise 在内嵌解释器中运行                                                                                                                                  |
| 支持的平台                | Linux 和 macOS                             | Linux、macOS 和 Windows；每个平台都需提供对应的工具构建版本                                                                                                           |
| 外部程序                  | 通常需要 `curl`、`git`、`tar` 等           | 内置的 [HTTP、JSON、HTML 和归档模块](/plugin-lua-modules.html#module-index)                                                                                           |
| 下载与验证                | 脚本自行下载并安装工具                     | `PreInstall` 返回 URL 和校验和；mise 负责下载、验证和解压                                                                                                              |
| `mise.lock`               | 仅记录版本                                | 记录版本、各平台的下载 URL，以及 `PreInstall` 返回的来源证明方式。mise 安装时会检查校验和，但不会将其写入锁文件。                                                     |

这两种格式都不是沙箱：脚本和钩子都会以你的权限运行命令。

## 脚本 {#plugin-structure}

mise 会从插件的 `bin/` 目录运行以下脚本。请确保它们具有可执行权限。

| 脚本                                                                      | 必需     | 用途                                                                                                        |
| ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| `bin/list-all`                                                           | 是       | 列出版本，按发布者顺序从旧到新排列                                                                          |
| `bin/install`                                                            | 是       | 将 `$ASDF_INSTALL_VERSION` 安装到 `$ASDF_INSTALL_PATH`                                                       |
| `bin/download`                                                           | 否       | 在运行 `install` 前将文件下载到 `$ASDF_DOWNLOAD_PATH`                                                       |
| `bin/latest-stable`                                                      | 否       | 解析 `latest`                                                                                                |
| `bin/list-bin-paths`                                                     | 否       | 指定要加入 `PATH` 的安装目录（默认为 `bin`）                                                                |
| `bin/exec-env`                                                           | 否       | 工具激活期间导出变量（忽略对 `PATH` 的更改；请使用 `list-bin-paths`）                                        |
| `bin/list-aliases`                                                       | 否       | 提供[版本别名](/dev-tools/aliases.html#aliased-versions)                                                     |
| `bin/list-legacy-filenames`、`bin/parse-legacy-file`                     | 否       | 支持生态惯用版本文件                                                                                        |
| `bin/uninstall`                                                          | 否       | 清理安装目录以外的文件；mise 删除安装、下载和缓存目录前会运行此脚本                                          |
| `bin/post-plugin-add`、`bin/post-plugin-update`、`bin/pre-plugin-remove` | 否       | 在插件生命周期事件中运行                                                                                    |

### bin/list-all

按发布者提供的顺序从旧到新打印所有版本，以空格或换行分隔。mise 会移除数字前导的 `v`，因此
`v1.2.3` 会变为 `1.2.3`。

```bash
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' 1.0.0 1.1.0 1.10.0
```

不要使用 `sort -V` 重新排序：macOS 上没有此命令，而且它会错误排列预发行版本和渠道名称。

### `bin/download` 和 `bin/install`

`bin/download` 是可选脚本。若未提供，`bin/install` 会自行下载工具。以下两个脚本会下载源码
归档、使用随附发布的校验和文件进行检查，再通过 `make` 构建：

```bash
#!/usr/bin/env bash
# bin/download
set -euo pipefail
file="tool-${ASDF_INSTALL_VERSION}.tar.gz"
url="https://github.com/owner/tool/releases/download/v${ASDF_INSTALL_VERSION}/$file"
mkdir -p "$ASDF_DOWNLOAD_PATH"
cd "$ASDF_DOWNLOAD_PATH"
curl -fsSL -o "$file" "$url"
curl -fsSL -o "$file.sha256" "$url.sha256"
# 校验和文件包含“<digest>  <file>”。macOS 提供 shasum，不提供 sha256sum。
if command -v sha256sum >/dev/null; then
  sha256sum -c "$file.sha256"
else
  shasum -a 256 -c "$file.sha256"
fi
```

```bash
#!/usr/bin/env bash
# bin/install
set -euo pipefail
cd "$ASDF_DOWNLOAD_PATH"
tar -xzf "tool-${ASDF_INSTALL_VERSION}.tar.gz" --strip-components=1
make install PREFIX="$ASDF_INSTALL_PATH"
```

mise 不会验证这些脚本下载的内容，因此 `bin/download` 中的校验和检查是阻止损坏或遭篡改
归档的关键：校验不匹配时脚本会以非零状态退出，mise 随之判定安装失败。如果 `bin/install`
成功退出但 `$ASDF_INSTALL_PATH` 仍为空，mise 也会判定安装失败。安装成功后，mise 会删除
下载目录，除非将 [`always_keep_download`](/configuration/settings.html#always_keep_download)
设为启用。
因此，工具运行所需的文件不要留在下载目录中。

### `bin/list-bin-paths`

打印要加入 `PATH` 的目录，相对于 `$ASDF_INSTALL_PATH`，以空格分隔。`.` 表示安装目录本身。
未提供此脚本时，mise 会将 `bin` 加入 `PATH`。

```bash
#!/usr/bin/env bash
echo "bin libexec/tool/bin"
```

### `bin/exec-env`

mise 会通过 Bash 加载此脚本，并保留它导出的变量：

```bash
#!/usr/bin/env bash
export TOOL_HOME="$ASDF_INSTALL_PATH"
```

mise 会忽略此脚本对 `PATH` 的修改。它会自行将 `bin` 或 `bin/list-bin-paths` 打印的目录加入
`PATH`。若要添加绝对路径，请改为导出 `MISE_ADD_PATH`。

在插件或安装目录发生变化前，mise 会缓存此脚本和 `bin/list-bin-paths` 的输出。缓存未命中时，
mise 会在构建 Shell 环境期间运行这些脚本，因此应确保它们执行迅速。如果输出取决于工具选项
或项目，请设置[缓存键](#mise-plugin-toml)。

### `bin/latest-stable`

打印 `latest` 应解析到的唯一版本。未提供此脚本时，mise 会根据 `bin/list-all` 的输出解析
`latest`。

### `bin/list-aliases`

每行打印一个别名及其版本，两者以空格分隔：

```text
lts 24.1.0
current 25.0.0
```

### `bin/list-legacy-filenames` 和 `bin/parse-legacy-file` {#legacy-version-files}

`bin/list-legacy-filenames` 会打印插件可读取的生态惯用版本文件名称，例如
`.example-version`。mise 只会为列在
[`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools)
中的工具读取这些文件。不要列出 `.tool-versions`：mise 会自行解析该文件。

`bin/parse-legacy-file` 会将文件路径作为 `$1` 接收，并打印版本号。未提供此脚本时，mise 会
直接使用文件内容。

```bash
#!/usr/bin/env bash
head -n 1 "$1"
```

### `bin/uninstall`

mise 会在删除该版本的安装、下载和缓存目录之前运行 `bin/uninstall`。可用它移除工具在其他
位置创建的文件。

### 插件生命周期脚本 {#plugin-lifecycle-scripts}

mise 通过 Git、zip 归档或 `[plugins]` 中指定的本地路径安装插件后，会运行
`bin/post-plugin-add`；`mise plugins link` 不会运行此脚本。移除插件前会运行
`bin/pre-plugin-remove`；更新导致插件 Git 引用发生变化后，会运行 `bin/post-plugin-update`。

## 环境变量 {#environment-variables}

每个脚本都会收到以下变量：

| 变量                                    | 值                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ASDF_PLUGIN_PATH`、`MISE_PLUGIN_PATH`  | 插件目录                                                                                               |
| `MISE_PLUGIN_NAME`                      | 安装插件时使用的名称                                                                                   |
| `ASDF_CONCURRENCY`、`MISE_CONCURRENCY`  | CPU 数量，用于 `make -j`                                                                               |
| `GITHUB_TOKEN`、`GITHUB_API_TOKEN`      | 按 `MISE_GITHUB_TOKEN`、`GITHUB_API_TOKEN`、`GITHUB_TOKEN` 的顺序取第一个已设置的值；都未设置时为空    |
| `MISE_DATA_DIR`、`MISE_CACHE_DIR`       | mise 的[目录](/directories.html)                                                                       |

`bin/list-all` 和 `bin/latest-stable` 还会收到项目的 `[env]` 值和 `_.path` 条目，因此私有
插件列出版本时可以使用项目中的凭据或辅助程序。mise 会为每个解析后的环境单独缓存版本列表，
但不会将这些环境变量写入缓存。

针对单个版本执行的脚本（`download`、`install`、`uninstall`、`list-bin-paths` 和 `exec-env`）
还会收到以下变量：

| 变量                                                                         | 值                                                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ASDF_INSTALL_TYPE`、`MISE_INSTALL_TYPE`                                     | `version`；`ref:` 请求为 `ref`，`sub-` 请求为 `sub`，`path:` 请求为 `path`                                                   |
| `ASDF_INSTALL_VERSION`、`MISE_INSTALL_VERSION`                               | 解析后的版本；`ref:` 请求则为 Git 引用                                                                                    |
| `ASDF_INSTALL_PATH`、`MISE_INSTALL_PATH`                                     | 安装目录                                                                                                                    |
| `ASDF_DOWNLOAD_PATH`、`MISE_DOWNLOAD_PATH`                                   | 下载目录                                                                                                                    |
| `MISE_TOOL_OPTS__<KEY>`                                                      | `[tools]` 中工具条目的各选项，键名转为大写：`mirror = "eu"` 会得到 `MISE_TOOL_OPTS__MIRROR=eu`                             |
| `MISE_PROJECT_ROOT`                                                          | 项目根目录（如果存在）                                                                                                      |
| 项目的 `[env]` 值                                                            | 与 `mise.toml` 中的设置相同                                                                                                |
| 工具的 [`install_env`](/dev-tools/backends/asdf.html#install-env) 值         | 与工具条目中的设置相同                                                                                                      |

`bin/post-plugin-update` 还会收到 `ASDF_PLUGIN_PREV_REF`、`ASDF_PLUGIN_POST_REF`（以及
`MISE_PLUGIN_PREV_REF`、`MISE_PLUGIN_POST_REF`），分别表示更新前后的 Git 引用。

## mise 如何运行脚本 {#how-mise-runs-your-scripts}

- 除非用户设置 [`raw`](/configuration/settings.html#raw)，否则脚本的标准输入会连接到
  `/dev/null`，因此提示输入的操作无法等待用户输入。
- mise 会读取 `list-all`、`latest-stable`、`list-aliases`、`list-legacy-filenames` 和
  `parse-legacy-file` 的输出；除非用户传入 `--verbose`，否则会隐藏这些脚本的标准错误输出。
  请将诊断信息写入标准错误，避免混入版本列表。`list-bin-paths` 也会以相同方式读取，但其
  标准错误输出会显示在终端中。
- 如果 `PATH` 中有 `asdf` 命令，它会由 mise 代为执行：`asdf install`、`asdf list` 和
  `asdf reshim` 会调用对应的 mise 命令，其他子命令则会转交给 mise。
- 工具 [`depends`](/dev-tools/backends/asdf.html#install-dependencies) 选项中列出的工具，
  会在运行 `bin/download` 和 `bin/install` 时排在 `PATH` 的前面。

### mise.plugin.toml {#mise-plugin-toml}

插件根目录下可选的 `mise.plugin.toml` 文件可以更改 mise 对部分脚本的缓存或替代方式：

<!-- schema: skip -->

```toml
[exec-env]
cache-key = ["{{ opts.mirror | default(value='') }}"]

[list-legacy-filenames]
data = ".example-version"
```

`[exec-env]` 和 `[list-bin-paths]` 接受 `cache-key`，其值为[模板](/templates.html)列表；
渲染后的值会成为缓存键的一部分，因此依赖这些值的输出会分别缓存。模板可使用 `opts`（工具
选项）和 `project_root`。请像上例一样为每次查找提供默认值，否则模板渲染失败会导致 mise
崩溃。`[list-aliases]` 和 `[list-legacy-filenames]` 接受 `data`，用于提供固定字符串，
以替代运行对应脚本。

## 最小插件示例 {#example-plugin}

此插件不需要网络或编译器。在 `my-plugin/bin/` 中创建两个可执行文件：

```bash
#!/usr/bin/env bash
# bin/list-all
set -euo pipefail
printf '%s\n' 1.0.0
```

```bash
#!/usr/bin/env bash
# bin/install
set -euo pipefail
mkdir -p "$ASDF_INSTALL_PATH/bin"
cat >"$ASDF_INSTALL_PATH/bin/my-plugin" <<'SCRIPT'
#!/usr/bin/env sh
printf '%s\n' 'my-plugin 1.0.0'
SCRIPT
chmod +x "$ASDF_INSTALL_PATH/bin/my-plugin"
```

请将示例安装脚本替换为实际的下载、验证和构建步骤。[asdf 插件模板](https://github.com/asdf-vm/asdf-plugin-template)
提供了错误处理和平台检测的常见写法。

## 测试插件 {#testing-plugins}

在单独的项目目录中链接插件并进行测试：

```sh
chmod +x /path/to/my-plugin/bin/*
mise plugins link my-plugin /path/to/my-plugin
mise ls-remote my-plugin
mise use my-plugin@1.0.0
mise exec -- my-plugin --version
# my-plugin 1.0.0
```

运行 `MISE_DEBUG=1 mise install --force my-plugin@1.0.0` 可重新运行安装脚本，并查看 mise
执行的每个脚本。修改 `bin/list-all` 后，运行 `mise cache clear my-plugin`，让 mise 重新
列出版本。若要避免测试影响自己的插件和配置，请使用[隔离测试环境](/plugin-publishing.html#testing-before-publication)。

## 安全 {#security-considerations}

每当 mise 列出版本、安装工具或构建环境时，asdf 插件脚本都会以你的权限运行。安装插件前请
阅读脚本，并将插件固定到完整的提交 SHA（`#<sha>`），避免插件更新在你不知情时更改脚本内容。

## 迁移为 Lua 插件 {#migration-path}

首先确认工具是否真的需要插件：许多工具可以直接通过[后端](/dev-tools/backends/#which-backend-to-use)
安装，例如运行 `mise use github:owner/repo`。若确实需要插件，请从[工具插件模板](https://github.com/jdx/mise-tool-plugin-template)
开始，并将每个脚本迁移到对应的 Lua 钩子。

### 钩子迁移 {#hook-migration-asdf-to-vfox}

| asdf 脚本                                                                 | Lua 钩子                 | 说明                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `bin/list-all`                                                           | `Available`              | 返回 `{ version = "..." }` 表格，按从新到旧排列；`list-all` 则按从旧到新打印                  |
| `bin/latest-stable`                                                      | 无                       | mise 会根据 `Available` 列表解析 `latest`                                                           |
| `bin/download`                                                           | `PreInstall`             | 返回 URL 和 `sha256` 或 `sha512`；mise 负责下载、验证并解压文件                                     |
| `bin/install`                                                            | `PostInstall`            | 可选；在 mise 解压下载内容后运行，可用于构建等步骤                                                  |
| `bin/list-bin-paths`、`bin/exec-env`                                     | `EnvKeys`                | 返回 `{ key = "...", value = "..." }` 表格，包括 `PATH` 条目，而不是 `export` 行                 |
| `bin/list-legacy-filenames`                                              | `PLUGIN.legacyFilenames` | 在 [`metadata.lua`](/plugin-lua-modules.html#metadata) 中提供列表，而非编写脚本                    |
| `bin/parse-legacy-file`                                                  | `ParseLegacyFile`        | 返回 `{ version = "..." }`                                                                         |
| `bin/uninstall`                                                          | `PreUninstall`           | mise 移除版本前运行                                                                                 |
| `bin/list-aliases`                                                       | 无                       | 用户可在配置中定义[版本别名](/dev-tools/aliases.html#aliased-versions)                             |
| `bin/post-plugin-add`, `bin/post-plugin-update`, `bin/pre-plugin-remove` | none                     |                                                                                                     |

工具选项会通过 `ctx.options` 和 `MISE_TOOL_OPTS__` 环境变量传递给 Lua 钩子；参见
[工具选项](/tool-plugin-development.html#tool-options)。
