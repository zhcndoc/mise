# 工具存根

工具存根允许你创建带有嵌入式 TOML 配置的可执行文件，用于工具执行。它们提供了一种便捷的方式，可以直接在可执行脚本中定义工具版本、后端和执行参数。它们也是让一些工具在 mise 中实现懒加载的好方法，因为这些工具只会在被调用时才会被获取，而不会在调用诸如 `mise install` 之类的命令时就被获取。

此功能的灵感来自 [dotslash](https://github.com/facebook/dotslash)，它开创了在可移植工具执行中使用嵌入式配置的可执行文件这一概念。

## 概述

工具存根是一个可执行文件，以指向 `mise tool-stub` 的 shebang 行开头，并包含 TOML 配置，用于指定要执行哪个工具以及如何执行它。当存根运行时，mise 会自动安装指定的工具版本（如果需要），并使用提供的参数执行它。

工具存根可以使用任何 mise 后端，但由于它们默认使用 http——而 http 后端工具具有类似 url 之类的属性，并且不需要版本——因此 http 存根看起来与非 http 存根略有不同。

::: tip
工具存根对于将不常用的工具添加到你的 mise 配置中尤其有用。由于工具只会在其存根首次执行时才被安装，因此你可以定义许多工具，而无需一开始就承担全部安装开销。这非常适合专用工具、测试实用程序或你可能不会每天使用的项目特定二进制文件。
:::

## 工具（非 http）存根

```bash
#!/usr/bin/env -S mise tool-stub
# 可选的注释，用于描述该工具

version = "1.0.0"
tool = "python"
bin = "python"
```

::: info 为什么使用 `env -S`？
`-S` 标志告诉 `env` 按空格拆分命令行，从而允许向解释器传递多个参数。这是必要的，因为 Unix 系统上的 shebang 传统上在解释器路径后只支持一个参数。使用 `env -S mise tool-stub` 可以通过将其拆分为 `env` → `mise` → `tool-stub`，使 shebang 正常工作。
:::

## 配置字段

工具存根配置本质上是 `mise.toml` 中 `[tools]` 部分可配置内容的子集，并额外添加了一个 `tool` 字段用于指定要使用的工具。工具存根支持 `mise.toml` 中工具配置可用的所有相同选项。

### 可选字段

- `tool` - 显式工具名称或后端规范（例如 `"python"`、`"github:cli/cli"`）。这是工具存根中唯一独有的字段——它指定要使用配置中的哪个工具条目。如果省略且存在 `url` 字段，则默认为 HTTP 后端。
- `version` - 要使用的工具版本
- `bin` - 在该工具内要执行的二进制文件名称（默认为存根文件名）。

## HTTP 存根

对于多平台 tarball：

```toml
#!/usr/bin/env -S mise tool-stub
url = "https://example.com/releases/1.0.0/tool-linux-x64.tar.gz"
```

对于特定平台的 tarball：

```toml
#!/usr/bin/env -S mise tool-stub
[platforms.linux-x64]
url = "https://example.com/releases/1.0.0/tool-linux-x64.tar.gz"

[platforms.darwin-arm64]
url = "https://example.com/releases/1.0.0/tool-macos-arm64.tar.gz"
```

### 平台特定的二进制路径

不同平台可能有不同的二进制结构或名称。当二进制路径在不同平台之间存在差异时，你可以指定平台特定的 `bin` 字段：

```toml
#!/usr/bin/env -S mise tool-stub
# 平台通用的 bin 字段，在各平台结构相同时使用
bin = "bin/tool"

[platforms.linux-x64]
url = "https://example.com/tool-linux.tar.gz"
# 使用通用的 bin 字段："bin/tool"

[platforms.windows-x64]
url = "https://example.com/tool-windows.zip"
bin = "tool.exe"  # Windows 的平台特定二进制文件
```

工具存根生成器会自动检测不同平台是否具有不同的二进制路径，并在需要时生成平台特定的 `bin` 字段，或者在所有平台都具有相同二进制结构时使用通用的 `bin` 字段。

::: tip
如果未指定 `tool` 字段且存在 `url` 字段，tool stubs 默认使用 HTTP 后端。
有关配置基于 HTTP 的工具的完整详细信息，请参阅 [HTTP 后端文档](/dev-tools/backends/http)。
:::

## 生成工具存根（http）

虽然你可以使用 TOML 配置手动创建工具存根，但 mise 提供了一个 [`mise generate tool-stub`](/cli/generate/tool-stub) 命令，可自动为基于 HTTP 的工具创建存根。

::: tip 增量构建
当使用特定平台的 URL 时，工具存根生成器会将新平台追加到现有存根文件中，而不是覆盖它们。这使你可以通过使用不同平台多次运行该命令，逐步构建跨平台工具存根。
:::

### 基本生成

为通过 HTTP 分发的工具生成工具存根：

```bash
mise generate tool-stub ./bin/gh --url "https://github.com/cli/cli/releases/download/v2.96.0/gh_2.96.0_linux_amd64.tar.gz"
```

这将会：

- 下载归档文件以检测校验和（用于安全性）
- 解压以自动检测二进制文件路径
- 生成一个包含完整 TOML 配置的可执行存根

### 特定平台生成

对于每个平台对应不同 URL 的工具，你可以一次生成所有平台：

```bash
mise generate tool-stub ./bin/rg \
  --platform-url linux-x64:https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz \
  --platform-url darwin-arm64:https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-aarch64-apple-darwin.tar.gz
```

**自动平台检测**：如果 URL 包含平台信息，你可以省略平台前缀，让 mise 自动检测：

```bash
# 从 URL 自动检测平台（检测为 'macos-arm64'）
mise generate tool-stub ./bin/node \
  --platform-url https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-arm64.tar.gz

# 从 URL 自动检测平台（检测为 'linux-x64'）
mise generate tool-stub ./bin/node \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz
```

或者通过一次添加一个平台来增量构建它们：

```bash
# 从 Linux 支持开始（显式平台）
mise generate tool-stub ./bin/rg \
  --platform-url linux-x64:https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz

# 之后，使用自动检测添加 macOS 支持（追加到现有文件）
mise generate tool-stub ./bin/rg \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-aarch64-apple-darwin.tar.gz

# 使用自动检测添加 Windows 支持（追加到现有文件）
mise generate tool-stub ./bin/rg \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-pc-windows-msvc.zip
```

生成器会保留现有配置，并将新平台合并到 `[platforms]` 表中。如果你指定了一个已存在的平台，它的 URL 将被更新。

### 生成选项

- `--version VERSION` - 指定工具版本（默认值为 "latest"）。
- `--bin PATH` - 覆盖自动检测到的二进制文件路径
- `--platform-url PLATFORM:URL` - 添加特定平台的 URL（可多次使用）
- `--platform-url URL` - 使用从 URL 文件名自动检测的平台添加特定平台的 URL
- `--platform-bin PLATFORM:PATH` - 设置特定平台的二进制文件路径
- `--skip-download` - 跳过下载以加快生成速度（不进行校验和或二进制检测）
- `--lock` - 解析并将锁文件数据（固定版本 + 平台 URL/校验和）嵌入到现有存根中

### 支持的归档格式

生成器会自动检测并解压多种归档格式：

- `.tar.gz` / `.tgz`（gzip 压缩的 tar 包）
- `.tar.xz` / `.txz`（xz 压缩的 tar 包）
- `.tar.bz2` / `.tbz2`（bzip2 压缩的 tar 包）
- `.tar.zst` / `.tzst`（zstd 压缩的 tar 包）
- `.zip`（zip 归档）
- `.7z`（7-zip 归档）

### 生成的存根示例

运行生成命令会产生一个可执行存根，如下所示：

```bash
#!/usr/bin/env -S mise tool-stub

version = "latest"
bin = "bin/gh"
url = "https://github.com/cli/cli/releases/download/v2.96.0/gh_2.96.0_linux_amd64.tar.gz"
checksum = "blake3:a1b2c3d4e5f6..."
size = 12345678
```

生成器会自动：

- 计算 BLAKE3 校验和以进行完整性验证
- 检测文件大小
- 识别归档中的正确二进制文件路径
- 使用输出文件名作为工具名称。

## 示例

### 基础 Node.js 存根

```bash
#!/usr/bin/env -S mise tool-stub
# Node.js v20 工具存根

tool = "node"
version = "20.0.0"
bin = "node"
```

### 使用自定义二进制名称的 Python

```bash
#!/usr/bin/env -S mise tool-stub
# 可作为 'py' 访问的 Python 工具

tool = "python"
version = "3.11"
bin = "python"
```

### GitHub Release 后端

```bash
#!/usr/bin/env -S mise tool-stub
# GitHub CLI 工具

tool = "github:cli/cli"
version = "latest"
```

### 锁定的工具存根

```bash
#!/usr/bin/env -S mise tool-stub

tool = "node"
version = "20.18.1"
bin = "node"

[lock.platforms.linux-x64]
url = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.xz"
checksum = "sha256:abc123..."

[lock.platforms.macos-arm64]
url = "https://nodejs.org/dist/v20.18.1/node-v20.18.1-darwin-arm64.tar.gz"
checksum = "sha256:def456..."
```

`[lock]` 部分由 `mise generate tool-stub --lock` 生成，并提供带校验和验证的可复现下载。`tool/version` 字段仍用于后端解析，而锁定数据则提供下载快捷方式。

::: tip
锁定尤其适用于避免 GitHub API 速率限制，尤其是在用户未设置 `GITHUB_TOKEN` 时。有了锁定的存根，工具可以在运行时无需任何 API 调用即可安装。
:::

#### 锁定存根

```bash
# 创建一个带模糊版本的存根
mise generate tool-stub ./bin/node --version 20

# 锁定它以固定精确版本并添加平台 URL/校验和
mise generate tool-stub ./bin/node --lock
```

这会解析版本，获取所有常见平台（linux-x64、linux-arm64、macos-x64、macos-arm64、windows-x64）的 URL，并将它们写入存根中的 `[lock]` 部分。

#### 提升锁定版本

要提升锁定存根的版本，请在 `--lock` 的同时传入 `--version`：

```bash
# 升级到最新的 node 22.x 并重新锁定
mise generate tool-stub ./bin/node --lock --version 22
```

### 带平台支持的 HTTP 后端

```bash
#!/usr/bin/env -S mise tool-stub
# 带平台特定下载的自定义 HTTP 工具

version = "1.0.0"

[platforms.linux-x64]
url = "https://releases.example.com/v{{version}}/tool-linux-x64.tar.gz"

[platforms.darwin-arm64]
url = "https://releases.example.com/v{{version}}/tool-macos-arm64.tar.gz"
```

## 用法

### 直接执行

使存根可执行并直接运行它：

```bash
chmod +x ./bin/my-tool
./bin/my-tool --version
```

### 通过 mise 命令

使用 [`mise tool-stub`](/cli/tool-stub) 命令执行——当某些东西无法正常工作时，这对测试很有用：

```bash
mise tool-stub ./bin/my-tool --version
```

## 缓存

工具存根实现了智能缓存，可减少 mise 运行存根时的开销：

- 二进制路径会基于存根文件路径和修改时间进行缓存
- 当存根文件发生变化时，缓存会自动失效
- 缺失的二进制文件会自动触发缓存清理

缓存后的存根开销约为 4 毫秒。

## 清理

执行存根会将其记录在 `~/.local/state/mise/tracked-stubs` 中，方式与使用配置文件时跟踪配置文件相同。[`mise prune`](/cli/prune) 会将跟踪存根所引用的工具版本视为必需版本，因此不会删除这些版本，就像跟踪配置文件所需的版本一样。

存根必须至少在机器上执行过一次，其工具才能受到保护。如果之后删除存根文件，其工具版本将再次变得可以清理（除非还有其他内容需要它们）。

## 替代方案：使用 `mise x` 创建简单存根

对于基本使用场景，你可以使用 [`mise x`](/cli/exec) 命令快速创建简单的工具存根，作为手动编写 TOML 配置的替代方案：

```bash
# 创建 bin 目录
mkdir -p ./bin

# 创建一个简单的 Node.js 存根
cat > ./bin/node << 'EOF'
#!/usr/bin/env bash
exec mise x node@20 -- "$@"
EOF
chmod +x ./bin/node

# 创建一个使用特定版本的 Python 存根
cat > ./bin/python << 'EOF'
#!/usr/bin/env bash
exec mise x python@3.11 -- "$@"
EOF
chmod +x ./bin/python
```

这种方法非常适合无需自定义选项、环境变量或平台特定设置的简单工具执行。对于更复杂的配置，请使用上面描述的完整 TOML 配置格式。
