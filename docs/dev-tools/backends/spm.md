---
description: "从 GitHub 或 GitLab 发布版本中安装 Swift Package Manager 可执行文件。"
---

# SPM 后端

你可以直接从 GitHub 或 GitLab 的发布版本中安装由 [Swift Package Manager](https://www.swift.org/documentation/package-manager) 管理的可执行文件。

此后端的代码位于 mise repository 的 [`./src/backend/spm.rs`](https://github.com/jdx/mise/blob/main/src/backend/spm.rs) 中。

当某个发布版本提供 SwiftPM artifact bundle（`*.artifactbundle.zip`）时，如果该资源包与当前 Swift target triple 匹配，mise 会使用其中预构建的可执行文件。如果没有可匹配的资源包，除非明确要求使用 artifact bundle，否则 mise 会回退为从源代码构建软件包。

## 依赖项

此后端即使在使用 artifact bundle 时也需要 Swift，因为 mise 需要 Swift 提供 target triple。从源代码构建还需要 Git 和软件包的构建依赖项。你可以[手动安装](https://www.swift.org/install)，也可以[使用 mise 安装](/lang/swift)。

> [!NOTE]
> 如果你已经安装了 Xcode，并且通过 `xcode-select` 在系统中选择了它，那么 Swift 已经可以通过 Xcode 安装中内置的工具链使用。

## 用法

在具备所需 Swift 工具链的情况下，在 macOS 上将 Tuist 安装到当前项目中：

```sh
mise use spm:tuist/tuist
mise exec -- tuist --help
```

这会将以下内容写入 `mise.toml`。添加 `-g` 以用于全局配置。
从源代码构建前，请检查软件包所需的 Swift/Xcode 版本。

```toml
[tools]
"spm:tuist/tuist" = "latest"
```

如果发布版本只提供了一个 SwiftPM 资源包，mise 可以直接安装该资源包：

```sh
mise use spm:giginet/swift-testing-revolutionary@0.4.0
mise exec -- swift-testing-revolutionary --help
```

项目配置如下：

```toml
[tools]
"spm:giginet/swift-testing-revolutionary" = "0.4.0"
```

### 支持的语法

| 描述                                           | 用法                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| GitHub 最新发布版本的简写                     | `spm:tuist/tuist`                                    |
| GitHub 特定发布版本的简写                     | `spm:tuist/tuist@4.15.0`                             |
| GitHub 最新发布版本的 URL                     | `spm:https://github.com/tuist/tuist.git`             |
| GitHub 特定发布版本的 URL                     | `spm:https://github.com/tuist/tuist.git@4.15.0`      |
| GitHub 特定提交的简写                         | `spm:owner/repo@rev:<commit>`                        |
| GitHub 特定提交的 URL                         | `spm:https://github.com/owner/repo.git@rev:<commit>` |

其他语法可能可用，但不受支持且未经测试。

提交选择器（`rev:<commit>` 和兼容的 `ref:<commit>` 形式）始终会从源代码构建资源包。要实现可复现的安装，请使用完整的提交 SHA。资源包归档是发布资源，不能与提交选择器结合使用。

## 工具选项

以下 [工具选项](/dev-tools/#tool-options) 适用于后端——这些
放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 Swift Package Manager 命令设置环境变量，例如
`swift package dump-package`、`swift -print-target-info` 和 `swift build`。
对于 artifact bundle 安装，此选项仅适用于
`swift -print-target-info`；下载、提取和符号链接步骤由 mise 直接处理。在 macOS
上，对于系统 Swift 工具链，使用以下配置选择 Xcode 开发者目录：

```toml
[tools]
"spm:tuist/tuist" = { version = "latest", install_env = { DEVELOPER_DIR = "/Applications/Xcode.app/Contents/Developer" } }
```

### `provider`

设置用于获取资源和发布信息的提供者类型。可以是 `github` 或 `gitlab`（默认为 `github`）。
如果你在自托管仓库中使用带有 `api_url` 的简写形式，请明确设置 `provider`，
因为通常无法从 URL 推导出类型。

```toml
[tools]
"spm:patricklorran/ios-settings" = { version = "latest", provider = "gitlab" }
```

### `api_url`

设置提供者 API 的 URL。在使用自托管实例时，这很有用。

```toml
[tools]
"spm:acme/my-tool" = { version = "latest", provider = "gitlab", api_url = "https://gitlab.acme.com/api/v4" }
```

### `artifactbundle`

控制是否使用 SwiftPM artifact bundle。未设置时，mise 会先尝试匹配
`*.artifactbundle.zip` 的发布资源；如果没有匹配的 bundle，则回退为从源代码构建。

将 `artifactbundle = true` 设为某个工具必需使用 artifact bundle。如果没有 bundle 匹配
当前 Swift target triple，则安装会失败，而不是回退到源代码构建。

将 `artifactbundle = false` 设为跳过 artifact bundle，并始终从源代码构建。

```toml
[tools]
"spm:giginet/swift-testing-revolutionary" = { version = "0.4.0", artifactbundle = true }
"spm:tuist/tuist" = { version = "latest", artifactbundle = false }
```

### `artifactbundle_asset`

选择特定的 artifact bundle 发布资源。当某个发布包含多个
`*.artifactbundle.zip` 资源时，这是必需的。

```toml
[tools]
"spm:giginet/swift-testing-revolutionary" = { version = "0.4.0", artifactbundle_asset = "swift-testing-revolutionary.artifactbundle.zip" }
```

### `filter_bins`

限制从包或 artifact bundle 中安装哪些可执行产品。未设置时，
`Package.swift` 中声明的每个可执行产品都会被构建并符号链接到 `bin/`，或者 artifact bundle 中每个
匹配的可执行资源都会被符号链接到 `bin/`。

这对那些会附带辅助可执行文件（例如测试运行器）且你不希望它们出现在
`PATH` 中的包很有用。对于源代码构建，过滤会在 `swift build` 之前进行，因此不需要的产品永远不会
被构建。

接受 TOML 数组或逗号分隔字符串。如果列出的任何名称与包中的可执行
产品不匹配，安装将以清晰的错误失败。

```toml
[tools]
"spm:swiftlang/swiftly" = { version = "latest", filter_bins = ["swiftly"] }
# Equivalent string form:
# "spm:swiftlang/swiftly" = { version = "latest", filter_bins = "swiftly" }
```

### `install_command`

从已检出的软件包目录中运行显式命令，而不是发现可执行产品并运行 `swift build --product`。该命令使用 mise 的默认内联 shell，并继承 [`install_env`](/dev-tools/backends/spm.html#install-env) 以及 Swift 依赖项的 `PATH`。`PREFIX` 和
`MISE_TOOL_INSTALL_PATH` 都会设置为工具的安装目录。

此选项仅适用于源代码安装，不能与 `filter_bins` 结合使用。mise 永远不会
自动运行软件包的 Makefile 或其他安装脚本；必须显式配置该命令。

适用于可执行文件并非唯一需要安装的产物的包——例如某个包还附带动态库或 Swift 模块，
其自身的 `make install` 目标会将这些文件放置在二进制文件旁边：

```toml
[tools]
"spm:owner/repo" = { version = "1.2.3", artifactbundle = false, install_command = "make install PREFIX=\"$MISE_TOOL_INSTALL_PATH\"" }
```

有些安装脚本即使底层的 `swift build` 失败也会成功退出，因此 mise
会验证该命令是否至少将一个可执行文件安装到了 `bin/` 中；否则安装将失败。

## 设置

### `spm.artifactbundle_only`

将 `spm.artifactbundle_only = true` 设置为要求所有 `spm:` 安装都使用 SwiftPM artifact bundle。
这与 `cargo.binstall_only` 的行为一致：如果没有可匹配的 artifact bundle，mise 会失败，
而不是从源代码编译。

```toml
[settings]
spm.artifactbundle_only = true
```

也可以通过 `MISE_SPM_ARTIFACTBUNDLE_ONLY=1` 设置。

## 故障排除

- **没有匹配的 artifact bundle：** 检查 Swift target triple。仅当软件包支持你的主机且已安装其构建前置条件时，才允许从源代码构建。
- **意外进行编译：** 当缺少预构建 bundle 时应失败而不是触发源代码构建，请设置 `artifactbundle = true`。
- **没有可执行产品：** 确认软件包发布了 CLI，检查 `filter_bins`，或者在项目具有自定义安装流程时使用显式的 `install_command`。
