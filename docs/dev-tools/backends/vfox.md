# Vfox 后端

::: tip
Vfox 是 mise 推荐的插件系统。它提供跨平台支持、内置模块，以及现代的基于钩子的架构。
:::

[Vfox](https://github.com/version-fox/vfox) 插件可用于 mise 中安装工具。

## 为什么选择 vfox？

- **跨平台** — 插件可在 Windows、macOS 和 Linux 上运行，无需针对不同平台编写特定代码
- **内置模块** — HTTP、JSON、HTML 解析、压缩包解压、semver 比较和日志记录都开箱即用，无需外部依赖
- **安全性** — [工具插件](../../tool-plugin-development.md) 支持对已下载工件进行证明验证（GitHub artifact attestations、cosign 签名、SLSA provenance）。当某个工具插件的 `PreInstall` 钩子返回一个 `attestation` 表时，mise 会在安装期间对其进行验证，并将结果记录到 `mise.lock` 中，从而在后续安装中防止降级攻击。后端插件目前不支持 attestation
- **现代架构** — 具有类型化上下文的结构化钩子、用于多工具管理的后端插件、滚动版本校验和以及锁文件支持

这部分代码位于 mise 仓库中的 [`./src/backend/vfox.rs`](https://github.com/jdx/mise/blob/main/src/backend/vfox.rs)。

## 依赖项

运行 vfox 后端不需要额外的系统包。Vfox Lua 代码由 mise 内置的解释器执行。

## 用法

以下命令会安装最新版本的 cmake，并将其设置为 PATH 上的活动版本：

```sh
$ mise use -g vfox:version-fox/vfox-cmake
$ cmake --version
cmake version 3.21.3
```

版本将以以下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"vfox:version-fox/vfox-cmake" = "latest"
```

## 默认插件后端

在 Windows 上，mise 默认使用 vfox 插件。
如果你希望即使在 Linux/macOS 上也默认使用插件，请设置以下配置：

```sh
mise settings add disable_backends asdf
```

现在你可以使用 `mise registry` 列出可用插件：

```sh
$ mise registry | grep vfox:
clang                         vfox:mise-plugins/vfox-clang
cmake                         vfox:mise-plugins/vfox-cmake
crystal                       vfox:mise-plugins/vfox-crystal
dart                          vfox:mise-plugins/vfox-dart
dotnet                        vfox:mise-plugins/vfox-dotnet
etcd                          aqua:etcd-io/etcd vfox:mise-plugins/vfox-etcd
flutter                       vfox:mise-plugins/vfox-flutter
gradle                        aqua:gradle/gradle vfox:mise-plugins/vfox-gradle
groovy                        vfox:mise-plugins/vfox-groovy
kotlin                        vfox:mise-plugins/vfox-kotlin
maven                         aqua:apache/maven vfox:mise-plugins/vfox-maven
php                           vfox:mise-plugins/vfox-php
scala                         vfox:mise-plugins/vfox-scala
terraform                     aqua:hashicorp/terraform vfox:mise-plugins/vfox-terraform
```

这样，在运行诸如 `mise use -g cmake` 之类的命令时，它们就会被安装，而无需
指定 `vfox:cmake`。

## 插件

除了标准的 vfox 插件之外，mise 还支持现代插件，这些插件可以使用 `plugin:tool` 格式管理多个工具。这些插件非常适合用于：

- 从私有仓库安装工具
- 包管理器（npm、pip 等）
- 自定义工具家族

### 示例：插件用法

```bash
# 安装插件
mise plugin install my-plugin https://github.com/username/my-plugin

# 使用 plugin:tool 格式
mise install my-plugin:some-tool@1.0.0
mise use my-plugin:some-tool@latest
```

### 从 Zip 文件安装

```bash
# 通过 HTTPS 从 zip 文件安装插件
mise plugin install <plugin-name> <zip-url>
# 示例：从 zip 文件安装插件
mise plugin install vfox-cmake https://github.com/mise-plugins/vfox-cmake/archive/refs/heads/main.zip
```

更多信息请参见：

- [使用插件](../../plugin-usage.md) - 最终用户指南
- [插件开发](../../tool-plugin-development.md) - 开发者指南
- [插件模板](https://github.com/jdx/mise-tool-plugin-template) - 创建插件的快速开始模板。

## URL 替换

vfox 后端遵循 mise 的 [`url_replacements`](/url-replacements.html) 设置，该设置同时适用于工具制品下载以及通过插件内置的 Lua HTTP 模块发出的请求。这包括 `http.get`、`http.head`、`http.download_file` 及其 `try_*` 变体。

应用 URL 替换后，vfox 还会使用 mise 的 [`netrc`](/configuration/settings.html#netrc) 设置，为目标主机添加 HTTP Basic 身份验证。当请求保持在同一源上时，插件提供的显式 `Authorization` 标头优先。

## 工具选项

以下 [工具选项](/dev-tools/#tool-options) 适用于 `vfox` 后端——这些选项
应放在 `mise.toml` 的 `[tools]` 中。

传统 vfox `PreInstall` 和 `PostInstall` 钩子会在结构化的
`ctx.options` 表中接收自定义选项。标量值使用 mise 现有的字符串表示形式，而数组和表则保持结构化：

```toml
[tools]
"vfox:example/plugin" = { version = "1.0.0", bundled = false, channels = ["stable", "beta"] }
```

```lua
function PLUGIN:PreInstall(ctx)
    local bundled = ctx.options.bundled == "false"
    local channels = ctx.options.channels
    -- ...
end
```

现有插件可以继续从钩子环境中读取带有 `MISE_TOOL_OPTS__` 前缀的自定义选项。这些变量仅在 mise 运行插件钩子期间可用，不会导出到用户的 shell 中。新插件应使用 `ctx.options`。

### `install_env`

用于为在安装钩子期间通过 `cmd.exec` 启动的 vfox 插件命令设置环境变量。
vfox 内置的 Lua HTTP、archive 和 JSON 辅助工具不会直接使用这些变量。

```toml
[tools]
"vfox:version-fox/vfox-cmake" = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```

### 安装依赖项

插件作者应在 `metadata.lua` 中使用 `PLUGIN.depends` 声明固有的安装要求。用户可以通过
[`depends` 工具选项](/dev-tools/#tool-dependencies) 补充这些声明。来自两个来源的匹配配置工具会共享一个安装依赖上下文：它们会排在依赖它们的工具之前，并且其路径和 `tools = true` 值可用于通过 `os.execute` 或
`cmd.exec` 启动的安装钩子。

声明不会配置或自动安装工具。匹配的已配置依赖项必须解析并完成安装；未配置的依赖项仍可由现有系统或配置中的 `PATH` 提供。`io.popen` 不会接收此安装环境。
