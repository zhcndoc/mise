---
description: "mise 可用于在同一系统上安装和管理多个版本的 zig。"
---

# Zig

`mise` 可用于在同一系统上安装和管理多个版本的 [zig](https://ziglang.org/)。

## 用法

为当前项目安装最新的稳定版 Zig：

```sh
mise use zig@latest
mise exec -- zig version
```

为项目所需的发布渠道选择一个请求：

| 请求              | 选择                              |
| ----------------- | --------------------------------- |
| `zig@0.14`        | 0.14 系列中的一个版本             |
| `zig@latest`      | 最新的稳定版本                    |
| `zig@master`      | 持续更新的 nightly 渠道            |
| `zig@mach-latest` | 最新的 Mach 指定版本              |

使用 `mise use -g <request>` 设置个人默认值。之后执行 `mise use zig@...`
会替换项目之前的 Zig 请求。

使用 `mise ls-remote zig` 查看可用的稳定版本。

[Mach](https://machengine.org/) 版本不会出现在 `mise ls-remote zig` 中，这是因为
针对[版本排序错误](https://github.com/jdx/mise/discussions/5232)的一个变通方案。
你仍然可以安装[Mach 版本索引](https://machengine.org/zig/index.json)中列出的
Mach 版本。以下命令会列出可用的 Mach 版本，并且需要 `curl` 和 `jq`：

```sh
curl --fail --show-error --silent --location https://machengine.org/zig/index.json | jq 'keys'
```

### `master`（nightly 通道）

`zig@master` 跟踪一个不断变化的 nightly。mise 在安装时会将其解析为当前指向的具体开发版本
（例如 `0.17.0-dev.836+...`），因此安装会
落在一个带版本号的目录中，而 `mise upgrade zig` / `mise outdated` 会获取
更新的 nightly——而不是让该通道一直固定在第一次
安装时对应的构建版本。运行 `mise upgrade zig`（或 `mise install -f zig@master`）即可切换到
当前的 nightly。

这些说明使用 mise 内置的 zig 支持。安装的同名外部
插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅
[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/zig.rs)。

## zig 语言服务器

`zig` 语言服务器（[zls](https://github.com/zigtools/zls)）需要单独安装。
你可以使用 `mise` 来安装它：

```sh
mise use zig@0.14 zls@0.14
mise exec -- zls --version
```

选择与你的 Zig 版本兼容的 ZLS 版本；请参阅
[ZLS 安装指南](https://zigtools.org/zls/install/)。分别安装两个 `latest` 版本并不能进行兼容性检查。目前没有专用于 Mach 的 ZLS 版本。

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
