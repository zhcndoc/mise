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

### 没有匹配当前发行版的构建时

swift.org 会为每个发行版系列发布一个构建。如果主机没有对应构建，mise 会发出警告并退回到另一个系列的构建。该构建可能链接到名称不同的库——例如 Arch 系列主机会使用仅宽字符的 ncurses，因此有 libncursesw.so.6，而回退构建需要 libncurses.so.6——当 mise 运行 swift --version 检查安装时，安装就会失败。mise 会列出无法解析的库：

~~~
this swift build needs shared libraries missing from this host:
libform.so.6, libncurses.so.6, libpanel.so.6
~~~

当名称不同但库兼容时，可以使用 install_env 将安装指向包含别名的目录：

~~~sh
mkdir -p ~/.local/lib/curses-compat
ln -sf /usr/lib/libncursesw.so.6 ~/.local/lib/curses-compat/libncurses.so.6
ln -sf /usr/lib/libformw.so.6 ~/.local/lib/curses-compat/libform.so.6
ln -sf /usr/lib/libpanelw.so.6 ~/.local/lib/curses-compat/libpanel.so.6
~~~

~~~toml
[tools]
swift = { version = "6.3.3", install_env = { LD_LIBRARY_PATH = "{{env.HOME}}/.local/lib/curses-compat" } }
~~~

同一个 LD_LIBRARY_PATH 也应放在 [env] 中，这样工具链安装后仍能正常工作。替换库是关于兼容性的判断，mise 无法替你完成；如果发行版确实缺少该库，应直接安装它。

请参阅[面向 Swift 开发者的 mise 指南](https://tuist.dev/blog/2025/02/04/mise)，了解如何将 mise 与 swift 搭配使用。
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
