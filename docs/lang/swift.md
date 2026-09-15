---
description: "mise 可用于在同一系统上管理多个版本的 Swift。"
---

# Swift

`mise` 可用于在同一系统上管理多个版本的 [`swift`](https://swift.org/)。Swift 支持 macOS 和 Linux。

## 用法

安装当前项目的 Swift 并检查所选工具链：

```sh
mise use swift@latest
mise exec -- swift --version
```

使用 `mise use -g swift@latest` 设置个人默认版本。在包含 `Package.swift` 的现有 Swift 包中，运行 `mise exec -- swift build` 进行构建。

在 Linux 上，Swift 压缩包面向特定发行版，并且需要兼容的系统库。mise 会在锁定文件选项中记录所选发行版；请使用为目标发行版构建的锁定文件条目。Swift 核心插件目前不支持 Windows。

请参阅[面向 Swift 开发者的 mise 指南](https://tuist.dev/blog/2025/02/04/mise)，了解如何将 `mise` 与 `swift` 搭配使用。

## 工具选项

以下 [工具选项](/dev-tools/#tool-options)可用于 `swift` 后端。这些选项位于 `mise.toml` 的 `[tools]` 部分。

### `install_env`

为由核心 `swift` 后端运行的安装时命令设置环境变量：

```toml
[tools]
swift = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="swift" :level="3" />
