# Node

像 `nvm`、`volta`、`fnm` 或 `asdf`……一样，`mise` 可以在同一系统上管理多个版本的 Node.js。

> 以下是使用 node mise 核心插件的说明。当没有安装名为 "node" 的 git 插件时会使用它。
> 如果你想使用 [asdf-nodejs](https://github.com/asdf-vm/asdf-nodejs)
> 那么运行 `mise plugins install node https://github.com/asdf-vm/asdf-nodejs`

这部分的代码位于 mise 仓库中的 [`./src/plugins/core/node.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/node.rs)。

## 用法

以下命令会安装最新版本的 node-26.x 并将其设为全局
默认值：

```sh
mise use -g node@26
```

有关常见任务和示例，请参阅 [Node.JS Cookbook](/mise-cookbook/nodejs.html)。

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

这会将像 `lts` 和 `latest` 这样的别名解析为 `mise.toml` 中的精确版本号，例如：

```toml [mise.toml]
[tools]
node = "26.1.0"
npm = "11.12.1"
```

固定的 npm 版本优先于 Node 自带的版本，因此 `npm --version` 将
始终返回 `mise.toml` 中指定的版本。

## `.nvmrc`、`.node-version` 和 `package.json` 支持

默认情况下，mise 使用 `mise.toml` 文件来在不同软件版本之间自动切换。

它也支持使用 `.tool-versions` 文件来指定版本，以兼容 ASDF。此外，`.nvmrc`、`.node-version` 以及 `package.json` 中的 `devEngines` 字段也受到支持，但需要显式启用（见下方提示）。

这使它可以直接替代 `nvm`。有关更多信息，请参阅[惯用版本文件](/configuration.html#idiomatic-version-files)。

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

mise-node 可以在安装完 node 版本后自动安装一组默认的 npm 包。要使用此旧功能，请提供一个 `$HOME/.default-npm-packages` 文件，每行列出一个包，例如：

```text
lodash
request
express
```

你可以通过设置 `MISE_NODE_DEFAULT_PACKAGES_FILE` 变量来指定该文件的非默认位置。

## "nodejs" -> "node" 别名

你不能安装/使用名为 "nodejs" 的插件。如果你尝试这样做，mise 只会将其重命名为
"node"。有关说明，请参阅 [FAQ](/faq.html#what-is-the-difference-between-nodejs-and-node-or-golang-and-go)。

## 从源代码构建

如果从源代码编译，请参阅 node 文档中的 [BUILDING.md](https://github.com/nodejs/node/blob/main/BUILDING.md#building-nodejs-on-supported-platforms)，了解
所需的系统依赖项。

```shell
mise settings node.compile=1
mise use node@latest
```

## 非官方构建

Nodejs.org 提供了一组 [非官方构建](https://unofficial-builds.nodejs.org/)，它们与某些官方二进制文件不支持的平台兼容。对于这些平台来说，这些构建是从源码编译之外的一个不错替代方案。

要使用它们，首先将镜像 URL 设置为指向非官方构建：

```sh
mise settings node.mirror_url=https://unofficial-builds.nodejs.org/download/release/
```

如果你的目标只是支持像 linux-loong64 或 linux-armv6l 这样的替代架构/操作系统，那么这就是所需的全部配置。Node 还提供诸如 musl 或 glibc-217 之类的 flavor（glibc-217 使用的 glibc 版本比官方二进制文件所构建时使用的版本更旧）。

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
