---
description: "从 GitHub 或 GitLab 安装 Swift 软件包可执行文件，可使用制品包或从源码构建。"
---

# spm 后端

`spm` 后端可从托管在 GitHub 或 GitLab 上的 [Swift Package Manager](https://www.swift.org/documentation/package-manager) 软件包中安装命令行可执行文件。如果发行版中包含与你的平台匹配的预构建制品包，mise 会使用该制品包；否则会通过 `swift build` 从源码构建软件包。

## 依赖项 {#dependencies}

即使使用制品包，此后端仍需要 Swift，因为 mise 会通过 Swift 查询目标三元组。请[手动安装 Swift](https://www.swift.org/install)，或[使用 mise 安装](/lang/swift.html)。在 macOS 上，通过 `xcode-select` 选中 Xcode 后即可使用其中的工具链。从源码构建时还需要 Git 和软件包自身的构建依赖项。

## 用法

在当前项目中安装 SwiftFormat，然后运行：

```sh
mise use spm:nicklockwood/SwiftFormat
mise exec -- swiftformat --version
```

该命令会将以下内容写入 `mise.toml`。添加 `-g` 可将其安装为全局工具。

```toml
[tools]
"spm:nicklockwood/SwiftFormat" = "latest"
```

SwiftFormat 的发行版包含 `swiftformat.artifactbundle.zip`。如果制品包中有适用于当前 Swift 目标三元组的可执行文件，mise 就会安装它；否则会从源码构建软件包。从源码构建前，请先确认软件包要求的 Swift 或 Xcode 版本。

软件包也可以只提供制品包：

```sh
mise use spm:giginet/swift-testing-revolutionary@0.4.0
mise exec -- swift-testing-revolutionary --help
```

版本使用原样发布的发行版标签。因此，如果仓库的标签是 `v1.2.0`，`mise ls-remote spm:owner/repo` 也会显示 `v1.2.0`。`@1.2.0` 和 `@v1.2.0` 都会解析到该标签。

### 支持的语法

| 格式                                    | 示例                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| GitHub 简写                              | `spm:nicklockwood/SwiftFormat`                               |
| 带发行版版本的 GitHub 简写                | `spm:nicklockwood/SwiftFormat@0.63.1`                        |
| GitHub URL                              | `spm:https://github.com/nicklockwood/SwiftFormat.git`        |
| 带发行版版本的 GitHub URL                 | `spm:https://github.com/nicklockwood/SwiftFormat.git@0.63.1` |
| GitLab URL                              | `spm:https://gitlab.com/owner/repo.git`                      |
| 自托管 URL                              | `spm:https://git.example.com/owner/repo.git`                 |
| 指定提交                                | `spm:owner/repo@rev:<commit>`                                |
| 通过 URL 指定提交                        | `spm:https://github.com/owner/repo.git@rev:<commit>`         |

除非工具设置了[`provider = "gitlab"`](#provider)，否则简写形式默认表示 GitHub。`gitlab.com` URL 始终使用 GitLab。对于自托管 URL，mise 会根据主机名推导 API URL；如果服务器运行 GitLab，请设置 `provider = "gitlab"`。

提交选择器（`rev:<commit>` 或等效的 `ref:<commit>`）始终会触发源码构建。为确保安装可复现，请使用完整提交 SHA。制品包属于发行版资源，不能与提交选择器一起使用。

## Tool options

### `install_env` {#install-env}

传递给 mise 所运行 Swift 命令的环境变量，例如 `swift package dump-package`、`swift -print-target-info` 和 `swift build`。安装制品包时，这些变量只会传给 `swift -print-target-info`；下载、解压和链接制品包的工作由 mise 自行完成。在 macOS 上，可为系统 Swift 工具链选择 Xcode 开发者目录：

```toml
[tools]
"spm:nicklockwood/SwiftFormat" = { version = "latest", install_env = { DEVELOPER_DIR = "/Applications/Xcode.app/Contents/Developer" } }
```

### `provider`

托管软件包的代码平台：`github`（默认值）或 `gitlab`。使用 GitLab 简写或自托管 GitLab URL 时，请设置此项。

```toml
[tools]
"spm:patricklorran/ios-settings" = { version = "latest", provider = "gitlab" }
```

### `api_url` {#api-url}

The provider's API URL. For a self-hosted package, write the full package URL,
so that source builds clone from that server. mise derives the API URL from its
host, `https://<host>/api/v3` for GitHub or `https://<host>/api/v4` for GitLab;
set `api_url` when the API lives somewhere else. 该主机会收到你的 GitHub 或 GitLab 令牌，因此，通过此方式指定 github.com 或 gitlab.com 之外主机上软件包的配置需要[信任](/cli/trust.html)，与 `api_url` 相同。[安全模式](/security.html#safe-mode)会拒绝此类软件包，除非设置了 `api_url`：

```toml
[tools]
"spm:https://git.acme.com/acme/my-tool.git" = { version = "latest", provider = "gitlab", api_url = "https://git.acme.com/gitlab/api/v4" }
```

使用 `owner/repo` 指定软件包时，mise 会从 `api_url` 的主机克隆仓库：它会移除 `/api/v3` 或 `/api/v4` 后缀，将 GitHub 的 `https://api.<host>` 转换为 `https://<host>`，并忽略 URL 中的凭据。其他 `api_url`（例如公共 API 的代理地址）仍会从 github.com 或 gitlab.com 克隆，因此此时应填写完整仓库 URL：

```toml
[tools]
"spm:acme/SwiftTool" = { version = "1.2.0", api_url = "https://github.acme.com/api/v3" } # clones https://github.acme.com/acme/SwiftTool.git
```

### `artifactbundle`

是否使用 SwiftPM 制品包。未设置时，mise 会先尝试使用匹配的 `*.artifactbundle.zip` 发行版资源，如果没有匹配项，则从源码构建。设置 `artifactbundle = true` 可强制使用制品包：如果没有与当前 Swift 目标三元组匹配的制品包，安装就会失败。设置 `artifactbundle = false` 可始终从源码构建；此设置与 [`spm.artifactbundle_only`](/configuration/settings.html#spm.artifactbundle_only) 冲突。

从 bundle 安装时会将其校验和记录到 `mise.lock`。只要锁文件为当前平台记录了校验和，若发布中缺少 bundle、校验和不匹配，或 bundle 没有当前 Swift 目标所需的二进制文件，安装就会失败，而不会回退到源码构建。设置 `artifactbundle = false` 可改为从源码构建。

```toml
[tools]
"spm:giginet/swift-testing-revolutionary" = { version = "0.4.0", artifactbundle = true }
"spm:nicklockwood/SwiftFormat" = { version = "latest", artifactbundle = false }
```

### `artifactbundle_asset` {#artifactbundle-asset}

如果发行版包含多个 `*.artifactbundle.zip` 资源，此项用于指定要使用的制品包。与 `artifactbundle = true` 一样，设置此项也会强制要求使用制品包。

```toml
[tools]
"spm:giginet/swift-testing-revolutionary" = { version = "0.4.0", artifactbundle_asset = "swift-testing-revolutionary.artifactbundle.zip" }
```

### `filter_bins` {#filter-bins}

要安装的可执行产品。未设置时，mise 会构建并链接 `Package.swift` 中声明的所有可执行产品，或者链接制品包中的所有匹配可执行文件。如果软件包附带了不希望加入 `PATH` 的辅助可执行文件（例如测试运行器），可使用此项进行筛选。源码构建时，mise 会在运行 `swift build` 前进行筛选，因此不会构建其他产品。

值可以是数组或逗号分隔的字符串。如果名称没有匹配到可执行产品，安装会失败。

```toml
[tools]
"spm:swiftlang/swiftly" = { version = "latest", filter_bins = ["swiftly"] }
```

### `install_command` {#install-command}

A command to run in the checked-out package directory instead of discovering
executable products and running `swift build --product`. It runs with mise's
default inline shell and gets [`install_env`](#install-env), the Swift that mise
manages on `PATH`, and `PREFIX` and `MISE_TOOL_INSTALL_PATH` set to the install
directory. It applies
only to source builds and cannot be combined with `filter_bins`. mise never runs
a package's Makefile or install script unless you configure it here.
[安全模式](/security.html#safe-mode)会拒绝安装设置了此项的工具。

如果软件包除可执行文件外还需安装其他内容（例如动态库或通过软件包自身 `make install` 安装的 Swift 模块），请使用此项：

```toml
[tools]
"spm:owner/repo" = { version = "1.2.3", artifactbundle = false, install_command = "make install PREFIX=\"$MISE_TOOL_INSTALL_PATH\"" }
```

某些安装脚本即使 `swift build` 失败也会返回成功，因此 mise 会检查命令是否至少将一个可执行文件放入 `bin/`；如果没有，安装仍会失败。

`danger-swift` 注册表简称会提供官方安装器选项，因此项目无需重复设置 `install_command`。在 macOS 上，安装会使用 `xcrun` 选定的 Swift 工具链，与执行 Dangerfile 时保持一致。还需要 Danger JS。若要通过 npm 后端进行全新安装，请分别声明 Node 和 Danger JS：

```toml
[tools]
node = "24"
danger-js = "13.0.10"
danger-swift = "3.22.1"
```

## Settings

<script setup>
import Settings from '/components/settings.vue';
</script>

<Settings child="spm" :level="3" />

## 故障排除

| 问题                                  | 检查内容                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 没有匹配的制品包                       | Swift 目标三元组。只有在软件包支持当前主机且已安装构建依赖时，才允许从源码构建。                                                                 |
| 意外地从源码构建                       | 设置 `artifactbundle = true`，这样缺少制品包时安装就会失败。                                                                                    |
| 存在多个制品包                         | 设置 `artifactbundle_asset` 选择其中一个。                                                                                                      |
| 没有可执行产品                         | 确认软件包发布了命令行工具、`filter_bins` 名称有效，或为自定义安装设置了 `install_command`。                                                     |
| `latest` 解析到不相关的标签            | 发布多个产品的仓库会分别为每个产品打标签，而 mise 会按原样列出标签。请固定版本，例如 `spm:owner/repo@1.2.0`。                                   |

实现代码：[`src/backend/spm.rs`](https://github.com/jdx/mise/blob/main/src/backend/spm.rs)。
