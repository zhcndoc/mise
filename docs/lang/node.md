---
description: "为每个项目安装和切换 Node.js 版本。"
socialDescription: "为每个项目安装和切换 Node.js 版本。"
---

# Node.js

与 `nvm`（或 `volta`、`fnm`、`asdf`）一样，`mise` 可以在同一系统上管理多个 Node.js 版本。

## 用法

为当前项目选择 Node.js，并在不依赖 shell 激活的情况下进行验证：

```sh
mise use node@26
mise exec -- node --version
```

使用 `mise use -g node@26` 设置个人默认版本。在通过 shell 激活进入项目、运行任务或使用 `mise exec` 时，项目版本会覆盖该默认版本。使用 `mise upgrade node` 可在已配置的请求范围内进行更新。

请参阅 [Node.js Cookbook](/mise-cookbook/nodejs.html) 了解常见任务和示例。

这些说明使用 mise 内置的 node 支持。已安装的同名外部插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详情，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/node.rs)。

## 用 aube 运行项目

[aube](https://aube.jdx.dev/) 是一个快速的 Node.js 包管理器，默认提供强大的供应链安全保护。它会原地读取和写入现有的 `package-lock.json`、`pnpm-lock.yaml` 和 `yarn.lock` 文件，因此项目可以在无需迁移锁文件的情况下尝试使用它。它的 `aubr` 命令会在运行包脚本前自动安装过时的依赖项，并在依赖项已经是最新版本时跳过安装。

使用 mise 安装它，然后运行现有的包脚本：

```sh
mise use aube
mise exec -- aubr test
```

请参阅 [aube 的安全概览](https://aube.jdx.dev/security)，了解其发布冷却、信任策略、恶意包和生命周期脚本保护。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `node` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为源码构建、默认包安装、Corepack 设置以及由核心 `node` 后端运行的安装时验证命令设置环境变量：

```toml
[tools]
node = { version = "latest", install_env = { CFLAGS = "-O2" } }
```

## 固定 npm 版本

默认情况下，Node.js 会附带一个捆绑的 npm 版本。如果你需要特定的 npm 版本
（例如，为了让整个团队保持一致的版本，并避免 `package-lock.json` 冲突），
你可以在 `mise.toml` 中将其与 Node 一起固定：

```toml [mise.toml]
[tools]
node = "26"
npm = "11"
```

要将两者都固定为精确版本：

```sh
mise use --pin node@lts npm@latest
```

这会将解析后的具体版本写入 `mise.toml`。版本号取决于当前发布的版本；使用 `mise ls --current` 查看结果，或直接读取配置文件。

在 mise 环境中，单独配置的 npm 优先于 Node 捆绑的 npm。使用 `mise exec -- npm --version` 检查它。此配置选择包管理器可执行文件；项目的依赖锁文件仍然控制其 npm 包。

## `.nvmrc`、`.node-version` 和 `package.json` 支持

默认情况下，mise 使用 `mise.toml` 文件来在不同软件版本之间自动切换。

它也支持 `.tool-versions` 文件，以兼容 asdf。`.nvmrc`、`.node-version` 以及 `package.json` 中的 `devEngines` 字段也受支持，但必须显式启用（请参阅下面的提示）。

有关更多信息，请参阅[惯用版本文件](/configuration.html#idiomatic-version-files)。

::: tip
惯用版本文件（`.nvmrc`、`.node-version`、`package.json` 中的 `devEngines` 字段）默认是禁用的，必须显式启用：

```sh
mise settings add idiomatic_version_file_enable_tools node
```

或者在 `~/.config/mise/config.toml` 中：

```toml
[settings]
idiomatic_version_file_enable_tools = ["node"]
```

在保持启用 `.nvmrc` 或 `.node-version` 的同时，阻止 node 使用 `package.json` 中的
`devEngines.runtime`：

```sh
mise settings add idiomatic_version_file_disable_files node:package.json
```

:::

## 默认 node 包

::: warning 计划弃用
默认包文件已弃用。目前它们仍然受支持，但 mise 将从 `2026.11.0` 开始发出警告，
并将在 `2027.11.0` 中移除支持。

对于 npm CLI，请使用 [npm 后端](/dev-tools/backends/npm.html) 直接安装该工具：

```toml
[tools]
"npm:typescript" = "latest"
```

对于确实应该安装到每个 Node.js 版本中的包，请使用工具级别的
`postinstall` 钩子：

```toml
[tools]
node = { version = "22", postinstall = "npm install -g typescript" }
```

:::

mise 可以在安装 node 版本后立即自动安装一组默认的 npm 包。要使用此旧版功能，请提供一个 `$HOME/.default-npm-packages` 文件，每行列出一个包，例如：

```text
typescript
eslint
```

你可以使用 `MISE_NODE_DEFAULT_PACKAGES_FILE` 变量为此文件指定其他位置。

## "nodejs" -> "node" 别名

你无法安装或使用名为 "nodejs" 的插件。如果你尝试这样做，mise 会将其重命名为
"node"。有关解释，请参阅 [FAQ](/faq.html#what-is-the-difference-between-nodejs-and-node-or-golang-and-go)。

## 从源代码构建

如果从源代码编译，请参阅 node 文档中的 [BUILDING.md](https://github.com/nodejs/node/blob/main/BUILDING.md#building-nodejs-on-supported-platforms)，了解
所需的系统依赖项。

```shell
mise settings node.compile=1
mise use node@latest
```

## 非官方构建

Nodejs.org 为官方二进制文件不支持的某些平台提供了一组[非官方构建](https://unofficial-builds.nodejs.org/)。对于这些平台，这是一个不错的替代方案，可以避免从源代码编译。

要使用它们，请先将镜像 URL 指向非官方构建：

```sh
mise settings node.mirror_url=https://unofficial-builds.nodejs.org/download/release/
```

如果你只需要支持 linux-loong64 或 linux-armv6l 等替代架构或操作系统，则完成此设置即可。Node 还提供 musl 或 glibc-217 等 flavor，后者使用的 glibc 版本比官方二进制文件构建时所使用的版本更旧。

要使用这些，请设置 `node.flavor`：

```sh
mise settings node.flavor=musl
mise settings node.flavor=glibc-217
```

对于常见的 musl 情况，当未设置 `node.flavor` 时，`mise settings libc=musl` 也会选择 Node 的 `musl` flavor。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="node" :level="3" />
