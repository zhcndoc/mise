---
description: "工具存根是一个可执行文件，用于记录如何获取和运行某个工具。"
---

# Tool Stubs

工具存根是一个可执行文件，用于记录如何获取和运行某个工具。
将其提交到仓库后，诸如 `./bin/py` 这样的命令就可以选择预期的运行时并转发其参数。mise 会在首次执行时安装该工具；普通的项目级 `mise install` 不会发现并安装任意存根文件。

此功能的灵感来自 [dotslash](https://github.com/facebook/dotslash)，它开创了在可移植工具执行中使用嵌入式配置的可执行文件这一概念。

## 概述

工具存根是一个可执行文件，以指向 `mise tool-stub` 的 shebang 行开头，并包含用于指定要执行的工具以及执行方式的 TOML 配置。存根运行时，mise 会安装指定的工具版本（如果需要），并使用提供的参数执行它。

存根需要在 `PATH` 上找到 `mise`，除非使用可选的引导包装器生成。它可以命名一个后端，也可以提供 HTTP 下载 URL。后端存根使用该后端的版本解析方式；HTTP 存根则直接记录构件位置。

对于普通工具的全机器级目录，优先使用 [`lazy = true` in `[tools]`](/dev-tools/shims.html#lazy-tools)。当可执行文件本身应携带可移植、自包含的工具定义时，独立的工具存根脚本仍然很有用。

## 工具（非 http）存根

创建一个 `bin` 目录，然后将此文件保存为 `bin/py`：

```toml [bin/py]
#!/usr/bin/env -S mise tool-stub

tool = "python"
version = "3.14"
bin = "python"
```

在 Unix 上，使其可执行并运行：

```sh
chmod +x ./bin/py
./bin/py --version
./bin/py -c 'import sys; print(sys.executable)'
```

存根的名称是 `py`，但它运行的是已安装的 `python` 可执行文件。存根路径后面的参数会转发给 Python。若要使用精确的运行时版本，请使用具体版本，或[锁定存根](#locking-a-stub)。

::: info 为什么使用 `env -S`？
`-S` 标志告诉 `env` 按空格拆分命令行，因此可以向解释器传递多个参数。这是必要的，因为 Unix 系统上的 shebang 传统上只支持在解释器路径后传递一个参数。`env -S mise tool-stub` 通过将其拆分为 `env` → `mise` → `tool-stub`，使 shebang 正常工作。
:::

## 配置字段

存根包含工具声明，而不是完整的 `mise.toml`。将字段放在顶层；不要将它们包装在 `[tools]` 中。特定于后端的安装选项会传递给选定的后端，而 `tool`、`version`、`bin`、`os`、`install_env` 以及嵌入的 `lock` 数据则控制存根本身。

### 可选字段

- `tool` - 显式的工具名称或后端规范（例如 `"python"`、`"github:cli/cli"`）。如果省略，顶层 URL 或特定平台的 URL 会选择 HTTP 后端；否则 mise 会使用存根文件名作为工具名称
- `version` - 版本请求（默认为 `latest`）
- `bin` - 要在工具中执行的二进制文件名称（默认为存根文件名）
- `os` - 存根可用的操作系统，也可以进一步限定架构（例如 `["linux", "macos/arm64"]`）

## HTTP 存根

顶层 URL 适用于运行存根的每个平台。只有当构件与所有这些机器兼容时，才使用顶层 URL。以下 URL 是占位符；使用生成器记录真实的下载元数据：

```toml
#!/usr/bin/env -S mise tool-stub
url = "https://example.com/releases/1.0.0/tool.tar.gz"
```

对于特定操作系统或架构的二进制文件，请改为提供平台表：

```toml
#!/usr/bin/env -S mise tool-stub
[platforms.linux-x64]
url = "https://example.com/releases/1.0.0/tool-linux-x64.tar.gz"

[platforms.macos-arm64]
url = "https://example.com/releases/1.0.0/tool-macos-arm64.tar.gz"
```

### 平台特定的二进制路径

将 `bin` 设置为相对于安装目录的路径，该目录位于移除任何归档根目录之后。生成器会处理这种解压布局。显式的 `--bin` 必须指定解压后保留的路径。

当布局或可执行文件名称不同时，使用特定于平台的 `bin` 字段：

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

工具存根生成器会检测不同平台是否具有不同的二进制路径，并在需要时生成特定于平台的 `bin` 字段；如果所有平台共享相同的二进制结构，则生成单个全局 `bin` 字段。

::: tip
当存在下载 URL 且没有 `tool` 字段选择其他后端时，工具存根默认使用 HTTP 后端。
有关配置基于 HTTP 的工具的完整详情，请参阅 [HTTP 后端文档](/dev-tools/backends/http)。
:::

## 生成工具存根（http）

虽然你可以手动创建工具存根，但 mise 提供了 [`mise generate tool-stub`](/cli/generate/tool-stub) 命令，用于为基于 HTTP 的工具生成存根。

::: tip 增量构建
使用特定于平台的 URL 时，工具存根生成器会将新平台追加到现有存根文件中，而不是覆盖它们。这样，你就可以通过使用不同平台多次运行该命令，逐步构建跨平台工具存根。
:::

### 基本生成

为通过 HTTP 分发的工具生成工具存根：

```bash
mise generate tool-stub ./bin/gh --url "https://github.com/cli/cli/releases/download/v2.96.0/gh_2.96.0_linux_amd64.tar.gz"
```

这将会：

- 下载归档并记录这些字节的校验和
- 解压归档以自动检测二进制文件路径
- 生成包含下载和执行元数据的可执行存根

生成的校验和可以检测构件之后是否发生变化。但它本身无法验证初始下载的发布者身份。在提交存根之前，请检查 URL，并从你信任的来源获取它。

### 特定平台生成

对于每个平台对应不同 URL 的工具，你可以一次生成所有平台：

```bash
mise generate tool-stub ./bin/rg \
  --platform-url linux-x64:https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-x86_64-unknown-linux-musl.tar.gz \
  --platform-url macos-arm64:https://github.com/BurntSushi/ripgrep/releases/download/14.0.3/ripgrep-14.0.3-aarch64-apple-darwin.tar.gz
```

**自动平台检测**：如果 URL 包含平台信息，你可以省略平台前缀，让 mise 自动检测：

```bash
# 从 URL 自动检测平台（检测为 'macos-arm64'）
mise generate tool-stub ./bin/node \
  --platform-url https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-arm64.tar.gz

# 从 URL 自动检测平台（检测为 'linux-x64'）
mise generate tool-stub ./bin/node \
  --platform-url https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-x64.tar.gz
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

生成器会将新平台合并到现有的 `[platforms]` 表中。重新指定平台会更新该条目，因此请在提交前检查差异。文件名含义不明确时，请使用显式的平台前缀。

### 生成选项

- `--version VERSION` - 指定工具版本（默认为 `"latest"`）
- `--bin PATH` - 覆盖自动检测的二进制文件路径
- `--platform-url PLATFORM:URL` - 添加特定于平台的 URL（可重复）
- `--platform-url URL` - 添加特定于平台的 URL，根据 URL 文件名自动检测平台
- `--platform-bin PLATFORM:PATH` - 设置特定于平台的二进制文件路径
- `--checksum-algorithm ALGORITHM` - 生成 `blake3`（默认）或 `sha256` 校验和
- `--skip-download` - 在不生成校验和或进行二进制文件检测的情况下生成；请检查二进制文件路径，并在依赖完整性检查之前运行 `--fetch`
- `--lock` - 解析并将锁定文件数据（固定版本＋平台 URL／校验和）嵌入现有存根
- `--fetch` - 为现有存根文件获取缺失的校验和和大小

`--checksum-algorithm` 不能与 `--lock` 或 `--skip-download` 结合使用，因为这些模式不会计算校验和。

对于 Bazel 等要求 SHA256 校验和的使用者，生成存根时请选择该算法：

```bash
mise generate tool-stub ./bin/tool \
  --url "https://example.com/tool.tar.gz" \
  --checksum-algorithm sha256
```

所选算法也会应用于通过 `--fetch` 填充的缺失校验和。现有校验和会被保留。

### 支持的归档格式

生成器会自动检测并解压多种归档格式：

- `.tar.gz` / `.tgz`（gzip 压缩的 tar 包）
- `.tar.xz` / `.txz`（xz 压缩的 tar 包）
- `.tar.bz2` / `.tbz2`（bzip2 压缩的 tar 包）
- `.tar.zst` / `.tzst`（zstd 压缩的 tar 包）
- `.zip`（zip 归档）
- `.7z`（7-zip 归档）

### 生成的存根示例

请检查生成的文件，而不是手动输入校验和或大小：

```sh
cat ./bin/gh
```

该文件包含从归档中发现的 URL、可执行文件路径、校验和和大小。当默认值为 `latest` 时，可以省略 `version`。对于 HTTP 存根，该标签不会使带版本号的 URL 跟踪较新的版本；升级时请更新 URL 并重新生成其元数据。

输出文件名会成为工具名称。如果自动检测选择了错误的可执行文件，请设置 `--bin`，尤其是在归档包含多个命令时。

## 示例

### 基础 Node.js 存根

```toml
#!/usr/bin/env -S mise tool-stub
# Node.js tool stub

tool = "node"
version = "24"
bin = "node"
```

### 使用自定义二进制名称的 Python

```toml
#!/usr/bin/env -S mise tool-stub
# 可作为 'py' 访问的 Python 工具

tool = "python"
version = "3.14"
bin = "python"
```

### GitHub Release 后端

```toml
#!/usr/bin/env -S mise tool-stub
# GitHub CLI 工具

tool = "github:cli/cli"
version = "latest"
bin = "gh"
```

### 锁定的工具存根

锁定后端存根，以记录具体版本以及其后端能够提供的平台下载元数据。生成器会将这些数据写入 `[lock]`；顶层 `tool` 仍然用于选择后端，而 `version` 会变为解析后的版本。

存储的 URL 可以避免后续安装时进行版本发布发现。但它们不会移除私有下载身份验证，也不会移除每个后端的验证和策略请求。请检查生成的平台和校验和；无法提供 URL 的后端不能提供相同的下载快捷方式。

#### 锁定存根

```bash
# Create a stub with a fuzzy version
mise generate tool-stub ./bin/node --version 24

# 锁定它以固定精确版本并添加平台 URL/校验和
mise generate tool-stub ./bin/node --lock
```

默认情况下，这会解析版本，并获取所有常见平台（linux-x64、linux-x64-musl、linux-arm64、linux-arm64-musl、macos-x64、macos-arm64 和 windows-x64）的 URL。如果配置了 `lockfile_platforms`，则会使用这些平台以及当前平台。生成的元数据会写入存根中的 `[lock]` 部分。

#### 提升锁定版本

要提升锁定存根的版本，请在 `--lock` 的同时传入 `--version`：

```bash
# Select Node.js 26 and regenerate the locked metadata
mise generate tool-stub ./bin/node --lock --version 26
```

### 带平台支持的 HTTP 后端

```toml
#!/usr/bin/env -S mise tool-stub
# 带平台特定下载的自定义 HTTP 工具

version = "1.0.0"

[platforms.linux-x64]
url = "https://releases.example.com/v{{version}}/tool-linux-x64.tar.gz"

[platforms.macos-arm64]
url = "https://releases.example.com/v{{version}}/tool-macos-arm64.tar.gz"
```

## 用法

### 直接执行

使存根可执行并直接运行它：

```bash
chmod +x ./bin/my-tool
./bin/my-tool --version
```

#### 在 Windows 上

Windows 无法执行 shebang 脚本，因此 `mise generate tool-stub` 会在存根旁边写入一个 `.cmd` 启动器。请按名称运行存根，Windows 会通过 `PATHEXT` 找到它：

```powershell
.\bin\my-tool.cmd --version
```

每当存根可以在 Windows 上运行时，都会生成启动器。显式的 `os` 选择器必须包含 Windows，并且任何平台表都必须包含一个 `[platforms.windows-*]` 条目。未声明任何限制的存根也会获得启动器。仅限 Linux 和 macOS 的存根不会获得启动器，其自身名称以 `.cmd`、`.bat` 或 `.exe` 结尾的存根也不会获得启动器。启动器会在每个平台上写入，而不仅仅是在 Windows 上，因此在 Linux 上生成并提交到仓库的存根，在其他人于 Windows 上克隆仓库后仍然可以正常工作。

如果存根后来不再为 Windows 提供支持，重新生成存根时会删除启动器，因此它不会继续针对存根已不再声明的平台运行。只有由 mise 生成的启动器会被删除——你自行编写的启动器会被保留。

不带扩展名的存根也会被保留：Git Bash 和 Cygwin 会通过 shebang 运行它，这与 [shims](/dev-tools/shims) 在 Windows 上同时放置不带扩展名的脚本和原生启动器的方式相同。

### 通过 mise 命令

通过 [`mise tool-stub`](/cli/tool-stub) 命令运行存根——当某些功能无法正常工作时，这对于调试很有用：

```bash
mise tool-stub ./bin/my-tool --version
```

## 缓存

工具存根会缓存查找结果，以减少运行它们时 mise 增加的开销：

- 二进制文件路径会根据存根文件路径和修改时间进行缓存
- 存根文件发生变化时，缓存会自动失效
- 缺失的二进制文件会自动触发缓存清理

每次调用仍然会经过 mise。对于脚本中的重复调用，可以考虑先使用 `mise exec` 准备一次环境，然后在该脚本中直接调用工具。

## 清理

执行存根会将其记录在 `~/.local/state/mise/tracked-stubs` 中，方式与使用配置文件时跟踪配置文件相同。[`mise prune`](/cli/prune) 会将跟踪存根所引用的工具版本视为必需版本，因此不会删除这些版本，就像跟踪配置文件所需的版本一样。

存根必须至少在机器上执行过一次，其工具才能受到保护。如果之后删除存根文件，其工具版本将再次变得可以清理（除非还有其他内容需要它们）。

## 替代方案：使用 `mise x` 创建简单存根

对于基本用例，你可以使用 [`mise x`](/cli/exec) 命令创建简单存根，而不必编写 TOML 配置：

```bash
# 创建 bin 目录
mkdir -p ./bin

# 创建一个简单的 Node.js 存根
cat > ./bin/node << 'EOF'
#!/usr/bin/env bash
exec mise x node@24 -- node "$@"
EOF
chmod +x ./bin/node

# 创建一个使用特定版本的 Python 存根
cat > ./bin/python << 'EOF'
#!/usr/bin/env bash
exec mise x python@3.14 -- python "$@"
EOF
chmod +x ./bin/python
```

`--` 后的命令至关重要：`mise x node@24` 用于选择运行时，而 `node "$@"` 用于指定可执行文件并保留调用者的参数。这些包装器需要 Bash 和 mise，并且不会嵌入构件元数据。当你需要平台映射或嵌入的锁定数据时，请使用 TOML 存根格式。
