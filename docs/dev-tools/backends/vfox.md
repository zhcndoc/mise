---
description: "使用与 vfox 兼容的跨平台 Lua 插件安装工具"
---

# Vfox 后端

::: tip
vfox 是 mise 推荐的插件系统。它提供跨平台支持、内置模块以及基于现代钩子架构的支持
:::

mise 可使用 [vfox](https://github.com/version-fox/vfox) 的插件来安装工具。

## 为什么选择 vfox？

- **跨平台** — Lua 钩子可在 Windows、macOS 和 Linux 上运行；插件仍需要兼容的制品和平台处理
- **内置模块** — HTTP、JSON、HTML 解析、归档提取、semver 比较和日志记录均开箱即用，无需外部依赖
- **安全性** — [工具插件](../../tool-plugin-development.md)支持对下载的制品进行证明验证（GitHub 制品证明、cosign 签名、SLSA 来源证明）。当工具插件的 `PreInstall` 钩子返回一个 `attestation` 表时，mise 会在安装期间对其进行验证，并将结果记录到 `mise.lock` 中，从而防止后续安装遭受降级攻击。后端插件目前不支持证明验证
- **结构化钩子** — 用于版本发现、安装和环境设置的上下文；后端插件可以管理多个工具

这部分代码位于 mise 仓库中的 [`./src/backend/vfox.rs`](https://github.com/jdx/mise/blob/main/src/backend/vfox.rs)。

## 依赖项

Lua 解释器已内置于 mise 中。插件仍可能调用外部命令，或安装需要系统库的软件。请阅读插件的要求；内置解释器并不能让每个插件都具备可移植性。

## 用法

从明确指定的 vfox 插件安装 cmake，并验证所选的可执行文件：

```sh
mise use vfox:version-fox/vfox-cmake
mise exec -- cmake --version
```

这会写入以下项目配置。添加 `-g` 以安装全局工具。

```toml
[tools]
"vfox:version-fox/vfox-cmake" = "latest"
```

明确的前缀会选择该插件，即使 `cmake` 注册表简写更倾向于使用其他后端。

## 默认插件后端

Windows 会从默认后端选择中排除 asdf。在 Linux 和 macOS 上，你可以使用 `mise settings add disable_backends asdf` 将其排除，但这不会使 vfox 优先于内置、Packslip、Aqua 或 release 后端。使用 `mise registry cmake` 查看该简写可用的来源，或者在你打算使用特定插件时使用明确的 `vfox:` 标识符。

## 插件

除了标准的 vfox 工具插件之外，mise 还支持使用 `plugin:tool` 格式管理多个工具的后端插件。这些插件非常适合：

- 从私有仓库安装工具
- 包管理器（npm、pip 等）
- 自定义工具家族

### 示例：插件用法

```bash
# Install a plugin
mise plugins install my-plugin https://github.com/username/my-plugin

# 使用 plugin:tool 格式
mise install my-plugin:some-tool@1.0.0
mise use my-plugin:some-tool@latest
```

### 从 Zip 文件安装

将 `PLUGIN_NAME` 和 `HTTPS_ZIP_URL` 替换为插件名称和归档 URL。

```bash
# Install a plugin from a zip file over HTTPS
mise plugins install PLUGIN_NAME HTTPS_ZIP_URL
# Example: Installing a plugin from a zip file
mise plugins install vfox-cmake https://github.com/mise-plugins/vfox-cmake/archive/refs/heads/main.zip
```

### 从签名的 packslip 安装

发布者可以为非注册表工具分发一个经过签名的、可移植的归档。明确选择该来源，使插件发布版本与工具版本保持分离：

```sh
mise plugins install vfox:PLUGIN_NAME 'packslip:OWNER/REPO#PLUGIN_VERSION'
```

或者进行配置：

```toml
[plugins]
"vfox:PLUGIN_NAME" = "packslip:OWNER/REPO#PLUGIN_VERSION"
```

省略 `#PLUGIN_VERSION` 可通过 packslip 后端解析最新的符合条件的插件发布版本。`mise plugins update PLUGIN_NAME` 会保留明确指定的版本；使用其他来源版本重新安装可更改该版本。已安装的插件会记录其解析后的版本、制品摘要和签名者。重新安装同一版本时会再次检查这些固定信息。

目前支持发布 `packslip.sigstore.json` 的 GitHub 仓库，并要求其包含一个带有 `extensions.mise.plugin = "vfox"` 声明的可移植 `tar.gz` 制品，且不包含可执行文件或主机要求。归档的根目录必须包含 `metadata.lua`，并且不得包含链接、特殊文件、Git 元数据或不安全路径。Mise 使用 packslip 后端的签名、摘要、签名者和发布策略检查。它会在移除之前的插件前完成验证并暂存替换内容。

[bfs 发布者示例](https://github.com/mise-plugins/vfox-bfs/releases/tag/v0.1.0)展示了该格式，并已在 Linux 和 macOS 上完成验证。常规 bfs 用法仍会继续使用其内置插件，而不会下载插件发布版本。Packslip 是一个明确的来源选项；现有的注册表默认值、Git 和 ZIP 来源保持不变。

更多信息请参阅：

- [使用插件](../../plugin-usage.md) - 最终用户指南
- [插件开发](../../tool-plugin-development.md) - 开发者指南
- [插件模板](https://github.com/jdx/mise-tool-plugin-template) - 创建插件的快速开始模板。

## URL 替换

vfox 后端遵循 mise 的 [`url_replacements`](/url-replacements.html) 设置，该设置同时适用于工具制品下载以及通过插件内置的 Lua HTTP 模块发出的请求。这包括 `http.get`、`http.head`、`http.download_file` 及其 `try_*` 变体。

应用 URL 替换后，vfox 还会使用 mise 的 [`netrc`](/configuration/settings.html#netrc) 设置，为目标主机添加 HTTP Basic 身份验证。当请求保持在同一源上时，插件提供的显式 `Authorization` 标头优先。

## 工具选项

以下 [工具选项](/dev-tools/#tool-options) 适用于 `vfox` 后端——这些选项应放在 `mise.toml` 的 `[tools]` 中。

传统 vfox `PreInstall` 和 `PostInstall` 钩子会在结构化的 `ctx.options` 表中接收自定义选项。标量值使用 mise 现有的字符串表示形式，而数组和表则保持结构化：

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

用于为在安装钩子期间通过 `cmd.exec` 启动的 vfox 插件命令设置环境变量。vfox 内置的 Lua HTTP、archive 和 JSON 辅助工具不会直接使用这些变量。

```toml
[tools]
"vfox:version-fox/vfox-cmake" = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```

### 安装依赖项

插件作者应在 `metadata.lua` 中使用 `PLUGIN.depends` 声明固有的安装要求。用户可以通过 [`depends` 工具选项](/dev-tools/#tool-dependencies)补充这些声明。来自两个来源的匹配已配置工具会共享同一个安装依赖上下文：它们会排在依赖它们的工具之前，并且其路径和 `tools = true` 值可用于通过 `os.execute` 或 `cmd.exec` 启动的安装钩子。

声明不会配置或自动安装工具。匹配的已配置依赖项必须解析并完成安装；未配置的依赖项仍可由现有系统或配置中的 `PATH` 提供。`io.popen` 不会接收此安装环境。
