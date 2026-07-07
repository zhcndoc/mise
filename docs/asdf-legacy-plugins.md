# asdf（旧版）插件

::: warning
asdf 插件被视为旧版。**出于供应链安全原因，新的 asdf 和 vfox 插件不再被接受到 [mise registry](https://github.com/jdx/mise/blob/main/registry/) 中**——用于注册表提交时，请改用 [aqua](/dev-tools/backends/aqua.html)（推荐）或 [github](/dev-tools/backends/github.html) 后端。

如果你正在编写私有/自定义插件（不是用于注册表提交），请优先使用 [vfox 插件](/dev-tools/backends/vfox.html) 而不是 asdf——它们使用 Lua 编写，支持跨平台（包括 Windows），并且可以访问内置模块。有关详情，请参阅 [功能对比](/dev-tools/backends/asdf.html#feature-comparison-asdf-vs-vfox) 和 [hook 迁移表](/dev-tools/backends/asdf.html#hook-migration-asdf-to-vfox)。
:::

mise 通过其 asdf 后端保持与 asdf 插件生态系统的兼容性。这些插件被视为旧版，因为与 mise 的现代插件系统相比，它们存在一些限制。

## 什么是 asdf（Legacy）插件？

asdf 插件是基于 shell 脚本的插件，遵循 asdf 插件规范。它们最初是扩展 asdf 生态系统中工具管理的方式，现在由 mise 支持，以保持向后兼容。

## 局限性

asdf 插件与 mise 的现代插件系统相比有若干局限：

- **平台支持**：仅可在 Linux 和 macOS 上运行（不支持 Windows）
- **性能**：Shell 脚本执行速度比 mise 的原生后端更慢
- **功能**：与 aqua、github 或工具/后端插件等现代后端相比功能有限
- **维护**：更难维护和调试
- **安全性**：不如沙盒化的现代后端安全

## 何时使用 asdf（旧版）插件

仅在以下情况下使用 asdf 插件：

- 该工具无法通过现代后端（aqua、github 等）获取
- 你需要与现有的 asdf 工作流兼容
- 该工具需要复杂的、基于 shell 的安装逻辑，而现代后端无法处理

**对于新工具，请先考虑以下替代方案：**

1. [aqua 后端](dev-tools/backends/aqua.md) - GitHub release 的首选
2. [github 后端](dev-tools/backends/github.md) - 简单的 GitHub release
3. [语言包管理器](dev-tools/backends/) - npm、pipx、cargo、gem 等
4. [后端插件](backend-plugin-development.md) - 带有后端方法的增强型插件
5. [工具插件](tool-plugin-development.md) - 基于 hook 的跨平台插件

## 安装 asdf（旧版）插件

### 来自注册表

大多数常用的 asdf 插件都可以通过 mise 的注册表获取：

```bash
# 从注册表简写安装
mise use postgres@15

# 这等同于
mise use asdf:mise-plugins/mise-postgres@15
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

# 安装工具版本
mise install postgres@15.0.0

# 使用该工具
mise use postgres@15.0.0
```

## 插件结构

asdf 插件遵循以下目录结构：

```
plugin-name/
├── bin/
│   ├── list-all          # 列出所有可用版本
│   ├── download          # 下载源代码/二进制文件
│   ├── install           # 安装工具
│   ├── latest-stable     # 获取最新稳定版 [可选]
│   ├── help.overview     # 插件描述 [可选]
│   ├── help.deps         # 插件依赖项 [可选]
│   ├── help.config       # 插件配置 [可选]
│   ├── help.links        # 插件链接 [可选]
│   ├── list-legacy-filenames  # 旧版版本文件 [可选]
│   ├── parse-legacy-file # 解析旧版版本文件 [可选]
│   ├── post-plugin-add   # 插件添加后钩子 [可选]
│   ├── post-plugin-update # 插件更新后钩子 [可选]
│   ├── pre-plugin-remove # 插件移除前钩子 [可选]
│   └── exec-env          # 设置执行环境 [可选]
├── lib/                  # 共享库代码 [可选]
└── README.md
```

## 必需脚本

### bin/list-all

列出该工具的所有可用版本：

```bash
#!/usr/bin/env bash
# 列出所有可用版本
curl -s https://api.github.com/repos/owner/repo/releases |
  grep '"tag_name":' |
  sed -E 's/.*"([^"]+)".*/\1/' |
  sort -V
```

### bin/download

下载工具源码/二进制文件：

```bash
#!/usr/bin/env bash
set -e

# 来自 mise 的输入变量
# ASDF_INSTALL_TYPE（version 或 ref）
# ASDF_INSTALL_VERSION（版本号或 git ref）
# ASDF_INSTALL_PATH（安装位置）
# ASDF_DOWNLOAD_PATH（下载位置）

version="$ASDF_INSTALL_VERSION"
download_path="$ASDF_DOWNLOAD_PATH"

# 下载逻辑在此
curl -Lo "$download_path/archive.tar.gz" \
  "https://github.com/owner/repo/archive/v${version}.tar.gz"
```

### bin/install

安装该工具：

```bash
#!/usr/bin/env bash
set -e

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

在执行工具时设置环境变量：

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
curl -s https://api.github.com/repos/owner/repo/releases/latest |
  grep '"tag_name":' |
  sed -E 's/.*"([^"]+)".*/\1/'
```

### bin/list-legacy-filenames

列出旧版版本文件名：

```bash
#!/usr/bin/env bash
echo ".tool-version"
echo ".tool-versions"
```

### bin/parse-legacy-file

解析旧版版本文件：

```bash
#!/usr/bin/env bash
cat "$1" | head -n 1
```

## 环境变量

asdf 插件可以访问以下环境变量：

- `ASDF_INSTALL_TYPE` - `version` 或 `ref`
- `ASDF_INSTALL_VERSION` - 版本号或 git 引用
- `ASDF_INSTALL_PATH` - 安装目录
- `ASDF_DOWNLOAD_PATH` - 下载目录
- `ASDF_PLUGIN_PATH` - 插件目录
- `ASDF_PLUGIN_PREV_REF` - 之前的 git 引用（用于更新）
- `ASDF_PLUGIN_POST_REF` - 新的 git 引用（用于更新）
- `ASDF_CMD_FILE` - 正在运行的可执行文件路径

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
  arm64)  arch="arm64" ;;
  *)      echo "不支持的架构" >&2; exit 1 ;;
esac
```

### 版本解析

```bash
#!/usr/bin/env bash

# 解析语义化版本
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
# 为开发链接插件
mise plugin add my-plugin /path/to/local/plugin

# 测试基本功能
mise list-all my-plugin
mise install my-plugin@1.0.0
mise which my-plugin
```

### 调试

```bash
# 启用调试模式
export MISE_DEBUG=1

# 或使用 --verbose 标志
mise install --verbose my-plugin@1.0.0
```

## 示例插件

以下是一个虚构工具的最小示例：

```bash
#!/usr/bin/env bash
# bin/list-all
curl -s "https://api.github.com/repos/example/tool/releases" |
  grep '"tag_name":' |
  sed -E 's/.*"v([^"]+)".*/\1/' |
  sort -V
```

```bash
#!/usr/bin/env bash
# bin/download
set -e
version="$ASDF_INSTALL_VERSION"
platform=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)

url="https://github.com/example/tool/releases/download/v${version}/tool-${platform}-${arch}.tar.gz"
curl -fSL "$url" -o "$ASDF_DOWNLOAD_PATH/tool.tar.gz"
```

```bash
#!/usr/bin/env bash
# bin/install
set -e
cd "$ASDF_DOWNLOAD_PATH"
tar -xzf tool.tar.gz
cp tool "$ASDF_INSTALL_PATH/bin/"
chmod +x "$ASDF_INSTALL_PATH/bin/tool"
```

## 迁移路径

考虑从 asdf 插件迁移到现代替代方案：

1. **检查工具是否可在 [aqua registry](https://aquaproj.github.io/aqua-registry/) 中找到**
2. **对简单的 GitHub 发布版本使用 [github backend](dev-tools/backends/github.md)**
3. **为复杂工具创建一个 [mise 插件](tool-plugin-development.md)** - 使用 [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template) 进行快速入门
4. **使用特定语言的包管理器**（npm、pipx、cargo、gem）

## 社区资源

- **[asdf 插件列表](https://github.com/asdf-vm/asdf-plugins)** - 官方 asdf 插件注册表
- **[mise-plugins 组织](https://github.com/mise-plugins)** - 社区维护的插件
- **[插件模板（asdf）](https://github.com/asdf-vm/asdf-plugin-template)** - 用于创建 asdf 插件的模板
- **[插件模板（mise）](https://github.com/jdx/mise-tool-plugin-template)** - 使用 Lua 创建 mise 插件的现代模板

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
- [查看注册表](registry.md)以获取可用工具
