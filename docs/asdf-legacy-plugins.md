---
description: "mise 通过其 asdf 后端保持与 asdf 插件生态系统的兼容性。"
---

# asdf（旧版）插件

::: warning
asdf 插件被视为旧版。**出于供应链安全原因，新的 asdf 和 vfox 插件不会被接受进入 [mise 注册表](https://github.com/jdx/mise/blob/main/registry/)** ——对于注册表提交，请改用 [packslip](/dev-tools/backends/packslip.html)（项目发布 packslip 时优先使用）、[aqua](/dev-tools/backends/aqua.html)、[github](/dev-tools/backends/github.html) 或 [gitlab](/dev-tools/backends/gitlab.html)。

如果你正在编写私有/自定义插件（不是用于注册表提交），请优先使用 [vfox 插件](/dev-tools/backends/vfox.html) 而不是 asdf——它们使用 Lua 编写，支持跨平台（包括 Windows），并且可以访问内置模块。有关详情，请参阅 [功能对比](/dev-tools/backends/asdf.html#feature-comparison-asdf-vs-vfox) 和 [hook 迁移表](/dev-tools/backends/asdf.html#hook-migration-asdf-to-vfox)。
:::

mise 通过其 asdf 后端保持与 asdf 插件生态系统的兼容性。这些插件被视为旧版，因为与 mise 的现代插件系统相比，它们存在一些限制。

## 什么是 asdf（旧版）插件？

asdf 插件是基于 shell 脚本的插件，遵循 asdf 插件规范。它们最初是扩展 asdf 生态系统中工具管理的方式，现在由 mise 支持，以保持向后兼容。

## 局限性

asdf 插件与 mise 的现代插件系统相比有若干局限：

- **平台支持**：需要 Unix shell 工具；asdf 后端在 Windows 上默认禁用
- **性能**：shell 脚本执行速度比 mise 的原生后端慢
- **功能**：与 aqua、github 或 tool/backend 插件等现代后端相比功能有限
- **维护**：更难维护和调试
- **执行范围**：插件脚本以你的权限运行。Lua 插件也可以运行命令和访问文件；两种插件格式都不是操作系统沙箱。

## 何时使用 asdf（旧版）插件

仅在以下情况下使用 asdf 插件：

- 该工具无法通过现代后端（aqua、github 等）获取
- 你需要与现有的 asdf 工作流兼容
- 该工具需要复杂的、基于 shell 的安装逻辑，而现代后端无法处理

**对于新工具，请先考虑以下替代方案：**

1. [packslip backend](dev-tools/backends/packslip.md) - 对于已签名的发布清单优先使用
2. [aqua backend](dev-tools/backends/aqua.md) - 为没有 packslip 的工具提供精选元数据
3. [github backend](dev-tools/backends/github.md) - 简单的 GitHub 发布
4. [gitlab backend](dev-tools/backends/gitlab.md) - 通过 GitLab 发布的工具
5. [Language package managers](dev-tools/backends/) - npm、pipx、cargo、gem 等
6. [backend plugins](backend-plugin-development.md) - 具有后端方法的增强型插件
7. [tool plugins](tool-plugin-development.md) - 基于 hook 的跨平台插件

## 安装 asdf（旧版）插件

### 来自注册表

一些注册表条目保留了 asdf 替代方案，但简写可能会优先选择其他后端。
当你需要测试或维护该实现时，请显式选择 asdf：

```bash
# Select the asdf implementation explicitly
mise use asdf:mise-plugins/mise-postgres@17

# The postgres shorthand currently prefers vfox instead
mise registry postgres
```

### 来自 Git 仓库

```bash
# 直接从仓库安装插件
mise plugin install <plugin-name> <git-url>

# 示例：PostgreSQL 插件
mise plugin install postgres https://github.com/mise-plugins/mise-postgres
```

### 手动安装

```bash
# 手动添加插件
mise plugin add postgres https://github.com/mise-plugins/mise-postgres

# Install tool version
mise install postgres@17.0

# Use the tool
mise use postgres@17.0
```

当后端启用时，已安装的同名插件会优先于注册表简写。使用上面的完整 `asdf:owner/repo` 标识符可以选择某个实现，而无需依赖已安装的短名称插件。

## 插件结构

asdf 插件遵循以下目录结构：

```
plugin-name/
├── bin/
│   ├── list-all          # List all available versions
│   ├── download          # Separate download phase [optional]
│   ├── install           # Install the tool
│   ├── latest-stable     # Get latest stable version [optional]
│   ├── help.overview     # Plugin description [optional]
│   ├── help.deps         # Plugin dependencies [optional]
│   ├── help.config       # Plugin configuration [optional]
│   ├── help.links        # Plugin links [optional]
│   ├── list-legacy-filenames  # Legacy version files [optional]
│   ├── parse-legacy-file # Parse legacy version files [optional]
│   ├── post-plugin-add   # Post plugin addition hook [optional]
│   ├── post-plugin-update # Post plugin update hook [optional]
│   ├── pre-plugin-remove # Pre plugin removal hook [optional]
│   └── exec-env          # Set execution environment [optional]
├── lib/                  # Shared library code [optional]
└── README.md
```

## 必需脚本

提供 `bin/list-all` 和 `bin/install`。单独的 `bin/download` hook 是可选的；没有它时，install hook 负责获取源代码或二进制文件。将脚本标记为可执行，并将诊断信息写入 stderr，以便版本输出保持机器可读。

### bin/list-all

列出该工具的所有可用版本：

```bash
#!/usr/bin/env bash
set -euo pipefail
# Illustrative version list, ordered oldest to newest by the publisher's rules.
printf '%s\n' 1.0.0 1.1.0 1.10.0
```

对于实际插件，请查询发布者的发布源，并使用合适的解析器解析结构化元数据。不要使用 `grep` 抓取 JSON，也不要假设每个工具都使用 SemVer。保留有意义的发布顺序；`sort -V` 在 macOS 上不可移植，也无法理解渠道。

### bin/download

下载工具源码/二进制文件：

```bash
#!/usr/bin/env bash
set -euo pipefail

# 来自 mise 的输入变量
# ASDF_INSTALL_TYPE（version 或 ref）
# ASDF_INSTALL_VERSION（版本号或 git ref）
# ASDF_INSTALL_PATH（安装位置）
# ASDF_DOWNLOAD_PATH（下载位置）

version="$ASDF_INSTALL_VERSION"
download_path="$ASDF_DOWNLOAD_PATH"

# Download logic here
mkdir -p "$download_path"
curl -fSL -o "$download_path/archive.tar.gz" \
  "https://github.com/owner/repo/archive/v${version}.tar.gz"
```

### bin/install

安装工具。此源代码构建示例假设归档文件包含一个带有 `install` 目标的 Makefile，该目标接受 `PREFIX`，并且构建依赖项已经可用：

```bash
#!/usr/bin/env bash
set -euo pipefail

# 来自 mise 的输入变量
# ASDF_INSTALL_TYPE（version 或 ref）
# ASDF_INSTALL_VERSION（版本号或 git ref）
# ASDF_INSTALL_PATH（安装位置）
# ASDF_DOWNLOAD_PATH（源码下载位置）

install_path="$ASDF_INSTALL_PATH"
download_path="$ASDF_DOWNLOAD_PATH"

# 解压并安装
cd "$download_path"
tar -xzf archive.tar.gz --strip-components=1
make install PREFIX="$install_path"
```

## 可选脚本

### bin/exec-env

工具运行时设置环境变量：

```bash
#!/usr/bin/env bash

# 设置环境变量
export TOOL_HOME="$ASDF_INSTALL_PATH"
export PATH="$ASDF_INSTALL_PATH/bin:$PATH"
```

### bin/latest-stable

获取最新稳定版本：

```bash
#!/usr/bin/env bash
# Return a version from bin/list-all according to this tool's stable-release policy.
printf '%s\n' 1.10.0
```

### bin/list-legacy-filenames

列出旧版版本文件名：

```bash
#!/usr/bin/env bash
echo ".example-version"
```

通过 [`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 为工具启用惯用版本文件。
不要返回 `.tool-versions`：mise 已经自行解析这种多工具格式。

### bin/parse-legacy-file

解析旧版版本文件：

```bash
#!/usr/bin/env bash
head -n 1 "$1"
```

## 环境变量

Hook 输入取决于所处阶段。安装 hook 接收版本和路径值；更新 hook 接收之前和新的 Git ref：

- `ASDF_INSTALL_TYPE` - `version` 或 `ref`
- `ASDF_INSTALL_VERSION` - 版本号或 git ref
- `ASDF_INSTALL_PATH` - 安装目录
- `ASDF_DOWNLOAD_PATH` - 下载目录
- `ASDF_PLUGIN_PATH` - 插件目录
- `ASDF_PLUGIN_PREV_REF` - 之前的 git ref（用于更新）
- `ASDF_PLUGIN_POST_REF` - 新的 git ref（用于更新）

## 最佳实践

### 错误处理

```bash
#!/usr/bin/env bash
set -euo pipefail  # 出错、未定义变量、管道失败时退出

# 检查依赖
command -v curl >/dev/null 2>&1 || {
  echo "错误：需要 curl" >&2
  exit 1
}
```

### 跨平台兼容性

```bash
#!/usr/bin/env bash

# 检测平台
case "$(uname -s)" in
  Darwin*) platform="darwin" ;;
  Linux*)  platform="linux" ;;
  *)       echo "不支持的平台" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64) arch="amd64" ;;
  arm64|aarch64) arch="arm64" ;;
  *)      echo "Unsupported architecture" >&2; exit 1 ;;
esac
```

### 版本解析

仅当发布者前缀属于该工具的约定时，才对其进行规范化。保留非数字版本和渠道不变；通用的 SemVer 解析器并不适用。

```bash
#!/usr/bin/env bash

# Remove this example publisher's prefix
parse_version() {
  local version="$1"
  # 如果存在，移除 'v' 前缀
  version="${version#v}"
  echo "$version"
}
```

## 测试插件

### 本地开发

```bash
# Link plugin for development
mise plugin link my-plugin /path/to/local/plugin

# Test basic functionality
mise ls-remote my-plugin
mise use my-plugin@1.0.0
mise exec -- my-plugin --version
```

### 调试

```bash
# 启用调试模式
export MISE_DEBUG=1

# 或使用 --verbose 标志
mise install --verbose my-plugin@1.0.0
```

## 示例插件

这个自包含的本地 fixture 演示了无需网络请求或编译器的最小接口。在 `my-plugin/bin/` 下创建以下两个可执行文件：

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
cat > "$ASDF_INSTALL_PATH/bin/my-plugin" <<'SCRIPT'
#!/usr/bin/env sh
printf '%s\n' 'my-plugin 1.0.0'
SCRIPT
chmod +x "$ASDF_INSTALL_PATH/bin/my-plugin"
```

从单独的项目目录进行测试：

```sh
chmod +x /path/to/my-plugin/bin/list-all /path/to/my-plugin/bin/install
mise plugin link my-plugin /path/to/my-plugin
mise ls-remote my-plugin
mise use my-plugin@1.0.0
mise exec -- my-plugin --version
```

将 fixture 安装程序替换为实际的下载、验证、解压或构建步骤。保持 `bin/exec-env` 的开销较低：它可能会在构建 shell 环境时运行。

## 迁移路径

考虑从 asdf 插件迁移到现代替代方案：

1. **检查 [已签名的 packslip 发布](/dev-tools/backends/packslip.html)，然后确认该工具是否在 [aqua 注册表](https://github.com/aquaproj/aqua-registry)中可用**
2. **对于简单的 GitHub 发布，使用 [github backend](dev-tools/backends/github.md)**
3. **为复杂工具创建 [mise 插件](tool-plugin-development.md)** - 使用 [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) 快速开始
4. **使用特定语言的软件包管理器**（npm、pipx、cargo、gem）

## 社区资源

- **[asdf 插件列表](https://github.com/asdf-vm/asdf-plugins)** - 官方 asdf 插件注册表
- **[mise-plugins 组织](https://github.com/mise-plugins)** - 社区维护的插件
- **[插件模板（asdf）](https://github.com/asdf-vm/asdf-plugin-template)** - 用于创建 asdf 插件的模板
- **[插件模板（mise）](https://github.com/jdx/mise-tool-plugin-template)** - 使用 Lua 创建 mise 插件的现代模板。

## 安全注意事项

asdf 插件会执行任意 shell 脚本，这会带来安全风险：

- **仅从可信来源安装插件**
- **在安装前审查插件代码**
- **尽可能避免使用带有复杂安装脚本的插件**
- **考虑使用现代后端以获得更好的安全性**

## 后续步骤

- [探索现代后端](dev-tools/backends/)以寻找更好的替代方案
- [了解后端插件](backend-plugin-development.md)以增强功能
- [了解工具插件](tool-plugin-development.md)以获得跨平台支持
- [查看注册表](registry.md)以获取可用工具。
