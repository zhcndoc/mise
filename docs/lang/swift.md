# Swift

`mise` 可用于在同一系统上管理多个 [`swift`](https://swift.org/) 版本。Swift 支持 macos 和 linux。

## 用法

使用最新稳定版本的 swift：

```sh
mise use -g swift
swift --version
```

请参阅 [面向 Swift 开发者的 mise 指南](https://tuist.dev/blog/2025/02/04/mise)，了解如何将 `mise` 与 `swift` 一起使用。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `swift` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

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
