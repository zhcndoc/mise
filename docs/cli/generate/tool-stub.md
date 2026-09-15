---
description: "为基于 HTTP 的工具生成工具存根"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate tool-stub`

- **用法：** `mise generate tool-stub [FLAGS] <OUTPUT>`
- **效果：** 修改状态
- **源代码：** [`src/cli/generate/tool_stub.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/tool_stub.rs)

为基于 HTTP 的工具生成工具存根

此命令会生成工具存根，可以自动从 HTTP URL 下载并执行工具。它可以通过下载并分析工具，自动检测校验和、文件大小和二进制文件路径。

当使用特定平台的 URL 生成存根时，该命令会向现有存根文件追加新平台，而不是覆盖它们。这使你可以逐步构建跨平台工具存根。

## 参数
- **`<OUTPUT>`** — 工具存根的输出文件路径

## 标志
- **`-b --bin <BIN>`** — 提取的归档文件中的二进制路径

  如果未指定且已下载归档文件，将自动检测最可能的二进制文件
- **`--bootstrap`** — 将存根包装在引导脚本中，在尚未安装 mise 时安装它

  启用后，会生成一个 bash 脚本，该脚本：
  1. 检查 mise 是否安装在预期路径
  2. 如果未安装，则使用嵌入式安装程序下载并安装 mise
  3. 使用 mise 执行工具存根
- **`--bootstrap-version <BOOTSTRAP_VERSION>`** — 为引导脚本指定 mise 版本

  默认使用安装脚本中的最新版本。
  使用此选项可固定到特定版本（例如：“2025.1.0”）。
- **`--checksum-algorithm <CHECKSUM_ALGORITHM>`** — 下载构件时使用的校验和算法

  接受 `blake3` 或 `sha256`，默认为 `blake3`。不能与 `--lock` 或 `--skip-download` 一起使用，因为这些模式不会计算校验和。

  **选项：** `blake3`、`sha256`

  **默认值：** `blake3`
- **`--fetch`** — 获取现有工具存根文件的校验和和大小

  这会读取现有存根文件，并通过下载文件填充缺失的校验和／大小字段。存根中必须已经存在 URL。
- **`--http <HTTP>`** — 要使用的 HTTP 后端类型

  **默认值：** `http`
- **`--lock`** — 将锁文件数据（确切版本 + 平台 URL／校验和）解析并嵌入现有存根文件，以便在不调用运行时 API 的情况下进行可复现安装
- **`--platform-bin <PLATFORM_BIN>`** — 平台特定的二进制路径，格式为 platform:path

  示例：--platform-bin windows-x64:tool.exe --platform-bin linux-x64:bin/tool
- **`--platform-url <PLATFORM_URL>`** — 平台特定的 URL，格式为 platform:url 或仅为 url（自动检测平台）

  当输出文件已存在时，新平台将追加到现有平台表中。如果再次指定，现有平台 URL 将被更新。

  如果只提供 URL（不带 platform:），将根据 URL 文件名自动检测平台。

  示例：--platform-url linux-x64:https://... --platform-url <https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-arm64.tar.gz>
- **`--skip-download`** — 跳过用于校验和及二进制路径检测的下载（更快但信息较少）
- **`-u --url <URL>`** — 用于下载工具的 URL

  示例：<https://github.com/owner/repo/releases/download/v2.0.0/tool-linux-x64.tar.gz>
- **`--version <VERSION>`** — 工具的版本

  **默认值：** `latest`
- **`-h --help`** — 打印帮助

## 示例

下载并检查实际归档文件，以检测其二进制文件和校验和

```
mise generate tool-stub ./bin/node --platform-url https://nodejs.org/dist/v22.17.1/node-v22.17.1-darwin-arm64.tar.gz
```

向同一存根添加 Linux 构件

```
mise generate tool-stub ./bin/node --platform-url linux-x64:https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-x64.tar.gz
```

为你自己的构件创建草稿，而不获取占位 URL

```
mise generate tool-stub ./bin/my-tool --url https://example.com/my-tool.tar.gz --skip-download
# Replace the URL with a real artifact before fetching metadata or executing it
```

填充现有存根中缺失的校验和和大小

```
mise generate tool-stub ./bin/node --fetch
```

对于现有的注册表支持的存根，解析并嵌入版本／平台锁定数据

```
mise generate tool-stub ./bin/registry-node --lock --version 22
```

<!-- 生成的参考导航 -->

## 相关文档

- [便携式工具存根](/dev-tools/tool-stubs.html)。
- [`mise generate <SUBCOMMAND>`](/cli/generate.html)。
- [全局标志和参数语法](/cli/#global-flags)。
