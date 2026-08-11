# SPM 后端

你可以直接从 GitHub 或 GitLab 的发布版本中安装由 [Swift Package Manager](https://www.swift.org/documentation/package-manager) 管理的可执行文件。

这部分代码位于 mise 仓库中的 [`./src/backend/spm.rs`](https://github.com/jdx/mise/blob/main/src/backend/spm.rs)。

当某个发布版本提供了一个 SwiftPM 产物包（`*.artifactbundle.zip`）时，如果它与当前的 Swift 目标三元组匹配，mise 将使用该包中的预构建可执行文件。如果没有可匹配的产物包，mise 会回退为从源码构建该包，除非明确要求必须使用产物包。

## 依赖项

这依赖于已安装 `swift`。你可以[手动](https://www.swift.org/install)安装它，或者[使用 mise](/lang/swift) 安装。

> [!NOTE]
> 如果你已经安装了 Xcode，并且通过 `xcode-select` 在系统中选择了它，那么 Swift 已经可以通过 Xcode 安装中内置的工具链使用。

## 用法

以下命令会安装最新版本的 `tuist`
并将其设置为 PATH 中的活动版本：

```sh
$ mise use -g spm:tuist/tuist
$ tuist --help
概览：生成、构建并测试你的 Xcode 项目。

用法：tuist <subcommand>
...
```

版本将会以以下格式设置到 `~/.config/mise/config.toml` 中：

```toml
[tools]
"spm:tuist/tuist" = "latest"
```

如果发布版本只提供了一个 SwiftPM 资源包，mise 可以直接安装该资源包：

```sh
mise use -g spm:giginet/swift-testing-revolutionary@0.4.0
swift-testing-revolutionary --help
```

版本将会以以下格式设置到 `~/.config/mise/config.toml` 中：

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
对于 artifact bundle 安装，这只适用于 `swift -print-target-info`；
下载、解压和符号链接步骤由 mise 直接处理。

```toml
[tools]
"spm:tuist/tuist" = { version = "latest", install_env = { SWIFTPM_ENABLE_PLUGINS = "1" } }
```

### `provider`

设置用于获取资源和发布信息的提供者类型。可以是 `github` 或 `gitlab`（默认是 `github`）。
如果你使用简写形式并且为自托管仓库设置了 `api_url`，请确保 `provider` 被设置为正确的类型，
因为类型可能无法从 URL 正确推导出来。

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
# 或
"spm:swiftlang/swiftly" = { version = "latest", filter_bins = "swiftly" }
```

### `install_command`

从已检出的包目录中运行显式命令，而不是发现可执行产品并运行 `swift build --product`。
该命令使用 mise 的默认内联 shell，并继承 [`install_env`](#install_env) 以及 Swift 依赖项的
`PATH`。`PREFIX` 和 `MISE_TOOL_INSTALL_PATH` 都会设置为工具的安装目录。

此选项仅适用于源代码安装，不能与 `filter_bins` 结合使用。mise 不会自动运行包的
Makefile 或其他安装脚本；必须显式配置该命令。

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

将 `spm.artifactbundle_only = true` 设置为要求所有 `spm:` 安装都必须使用 SwiftPM 制品包。
这与 `cargo.binstall_only` 类似：如果没有可用的匹配制品包，mise 将会失败，
而不是从源代码进行编译。

```toml
[settings]
spm.artifactbundle_only = true
```

这也可以通过设置 `MISE_SPM_ARTIFACTBUNDLE_ONLY=1` 来配置。
