# Zig

`mise` 可用于在同一系统上安装和管理多个版本的 [zig](https://ziglang.org/)。

> 以下是使用 zig mise 核心插件的说明。

其代码位于 mise 仓库中的
[`./src/plugins/core/zig.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/zig.rs)。

## 用法

以下命令会安装 zig 并将其设为全局默认：

```sh
mise use -g zig@0.14           # 安装 zig 0.14.x
mise use -g zig@latest         # 安装最新的 zig 发行版
mise use -g zig@master         # 安装来自 master 的最新 nightly
mise use -g zig@2024.11.0-mach # 安装 Mach 指定的 zig
mise use -g zig@mach-latest    # 安装最新的 Mach 指定 zig
```

可使用 `mise ls-remote zig` 查看可用的稳定版本。

请注意，[Mach](https://machengine.org/) 版本
不会出现在 `mise ls-remote zig` 中，这是为了规避
[版本排序 bug](https://github.com/jdx/mise/discussions/5232) 的权宜之计。
尽管如此，你仍然可以安装
[Mach 版本索引](https://machengine.org/zig/index.json) 中列出的 Mach 版本。以下
命令将列出可用的 Mach 版本：

```sh
curl https://machengine.org/zig/index.json | yq 'keys'
```

### `master`（nightly 通道）

`zig@master` 跟踪一个不断变化的 nightly。mise 在安装时会将其解析为当前指向的具体开发版本
（例如 `0.17.0-dev.836+...`），因此安装会
落在一个带版本号的目录中，而 `mise upgrade zig` / `mise outdated` 会获取
更新的 nightly——而不是让该通道一直固定在第一次
安装时对应的构建版本。运行 `mise upgrade zig`（或 `mise install -f zig@master`）即可切换到
当前的 nightly。

## zig 语言服务器

`zig` 语言服务器（[zls](https://github.com/zigtools/zls)）需要单独安装。
你可以使用 `mise` 来安装它：

```sh
mise use -g zls@0.14   # 安装 zls 0.14.x
mise use -g zls@latest # 安装最新的 zls 版本
```

请注意，标记发布版的 `zig` 应与
相同标记发布版的 `zls` 一起使用。目前没有 `zls` 的 Mach 版本。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `zig` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为核心 `zig` 后端运行的安装时命令设置环境变量：

```toml
[tools]
zig = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="zig" :level="3" />
