---
description: "通过 mise 安装 Node.js、读取 .nvmrc 或 package.json，并为各项目固定 npm、pnpm 或 Yarn 版本。"
---

# Node.js

mise 从 nodejs.org 官方构建下载 Node.js，并为每个项目选择对应版本。它也能读取 `.nvmrc`、`.node-version` 和 `package.json`，因此使用其他版本管理器配置的项目也能继续使用。

## 快速开始

为当前项目选择 Node.js，并在不依赖 Shell 激活的情况下检查版本：

```sh
mise use node@26
mise exec -- node --version
```

`mise use` 会将 `node = "26"` 写入 `mise.toml`。使用 `mise use -g node@26` 可设置个人默认版本；进入项目后，项目配置的版本会覆盖该默认值。[`mise upgrade node`](/cli/upgrade.html) 会在已配置的版本范围内更新。

`nodejs` 是 `node` 的别名，详见[常见问题](/faq.html#what-is-the-difference-between-nodejs-and-node-or-golang-and-go)。项目配置示例请参阅 [Node.js 指南](/mise-cookbook/nodejs.html)。

## 选择版本

| 版本请求           | 选择结果                                                          |
| ------------------ | ----------------------------------------------------------------- |
| `node@26`          | 最新的 26.x 版本                                                  |
| `node@26.10.0`     | 指定版本                                                          |
| `node@lts`         | 当前 LTS 系列的最新版本                                            |
| `node@lts/krypton` | 指定 LTS 系列的最新版本（也可使用 `lts-krypton`）                  |
| `node@latest`      | 最新版本                                                          |

使用 `mise ls-remote node` 列出所有可用版本，或使用 `mise ls-remote node 26` 查看某个主版本系列。完整语法请参阅[版本请求](/dev-tools/versions.html)。

## 版本文件 {#nvmrc-node-version-and-package-json-support}

启用 Node.js 的相应设置后，mise 才会读取 `.nvmrc`、`.node-version` 或 `package.json`：

```sh
mise settings add idiomatic_version_file_enable_tools node
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得相同的行为。详见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

`.nvmrc` 中的 `lts/*` 和 `lts/iron` 等别名与 nvm 中的行为相同，开头的 `v` 会被忽略。若要读取 `.nvmrc` 和 `.node-version`，但不读取 `package.json`：

```sh
mise settings add idiomatic_version_file_disable_files node:package.json
```

### `package.json`

当 `devEngines.runtime` 的 `name` 为 `node` 时，mise 会读取该字段：

```json [package.json]
{
  "devEngines": {
    "runtime": { "name": "node", "version": "26.10.0" }
  }
}
```

此配置会选择 Node.js 26.10.0。`devEngines.runtime` 可以是对象或数组；若为数组，mise 会读取第一项。其他运行时请参阅 [Bun](/lang/bun.html#version-files) 和 [Deno](/lang/deno.html#version-files) 页面。

mise 不会读取 `engines.node`，因为它描述的是软件包兼容的 Node.js 版本，而非开发时使用的版本。如果项目只声明了 `engines` 范围，请显式选择版本：

```sh
mise use node@24
```

## 软件包管理器

npm 随 Node.js 一同提供。mise 也可以不依赖 Corepack，将 npm、pnpm 和 Yarn 作为独立工具安装并选择版本；此外还支持 [aube](https://aube.sh/)，它可以使用现有的 npm、pnpm 和 Yarn 锁文件。pnpm 和 aube 的项目配置示例请参阅 [Node.js 指南](/mise-cookbook/nodejs.html)。

### 固定 npm 版本 {#pinning-npm-version}

若要让团队使用相同的 npm 版本，并避免不同 npm 版本造成 `package-lock.json` 频繁变化，可在 Node.js 旁固定 npm 版本：

```toml [mise.toml]
[tools]
node = "26"
npm = "11"
```

若要将两者都固定为确切版本：

```sh
mise use --pin node@lts npm@latest
```

此命令会将解析后的版本写入 `mise.toml`。在 mise 环境中，单独配置的 npm 优先于 Node.js 自带的 npm；可运行 `mise exec -- npm --version` 检查版本。此配置只决定使用哪个 npm 可执行文件；项目依赖仍由锁文件控制。

<a id="package-manager-versions-in-package-json"></a>

### package.json 中的软件包管理器版本

mise 可以从 `package.json` 读取 npm、pnpm 或 Yarn 版本。请启用仓库可能声明的每种软件包管理器：

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ["npm", "pnpm", "yarn"]
```

mise 会优先读取匹配的 `devEngines.packageManager` 声明，然后读取顶层 `packageManager` 字段。声明中的名称必须与已启用的工具一致：

~~~json [package.json]
{
  "packageManager": "pnpm@10.15.0"
}
~~~

此配置会选择 pnpm 10.15.0。对应的 `devEngines` 声明如下：

~~~json [package.json]
{
  "devEngines": {
    "packageManager": { "name": "pnpm", "version": "10.15.0" }
  }
}
~~~

`devEngines.packageManager` 也可以是数组；mise 会读取第一项。Bun 运行时和软件包管理器的优先级规则请参阅 [Bun 版本文件](/lang/bun.html#version-files)。

安装前，mise 会使用 Corepack 风格的校验和后缀（`+sha1`、`+sha224`、`+sha256`、`+sha384` 或 `+sha512`）核对准确的软件包管理器制品：

```json [package.json]
{
  "packageManager": "pnpm@10.15.0+sha224.88208eb7c2e7de6ed534fa298248dee656723116995eda4b508fd0c9"
}
```

npm、pnpm 和 Yarn 1 的制品是 npm registry 中的 tarball；Yarn 2 及更高版本使用 Yarn 发布的 CLI 文件，并且声明中必须指定确切版本。未提供校验和时，mise 会通过常规的[注册表](/registry.html)后端安装软件包管理器，并使用该后端的验证机制。

与 Corepack 不同，若项目没有声明软件包管理器版本，mise 不会自动选择一个已知可用的版本。请在 `mise.toml`、`package.json` 或全局配置中设置版本。

### Corepack

mise 会自行安装软件包管理器，因此不需要 Corepack。如果仍想使用 Corepack 的 shims，请将 [`node.corepack`](/lang/node.html#node.corepack) 设为 `true`；这样每次安装包含 Corepack 的 Node.js 版本后，mise 都会运行 `corepack enable`。

## 全局 npm 软件包

除非 `.npmrc` 设置了其他 `prefix`，否则 `npm install -g` 会将软件包安装到当前启用的 Node.js 版本中。因此，切换 Node.js 版本后，全局安装的命令将无法使用。

在 macOS 和 Linux 上，mise 会将每个版本的 `bin/npm` 替换为一个小型包装器；全局安装或卸载后，该包装器会运行 [`mise reshim`](/cli/reshim.html)，为新命令创建 [shims](/dev-tools/shims.html)。可通过 [`node.npm_shim`](/lang/node.html#node.npm_shim) 关闭此行为。

若要在不同 Node.js 版本间保留某个 CLI，请使用 [npm 后端](/dev-tools/backends/npm.html)将其作为独立工具安装，例如 `mise use -g npm:typescript`。

## mise 如何安装 Node.js

mise 会从 [`node.mirror_url`](/lang/node.html#node.mirror_url)（默认为 `https://nodejs.org/dist/`）下载适用于当前平台的官方二进制归档文件，并使用该版本发布的 `SHASUMS256.txt` 校验；如果该文件附有 OpenPGP 签名，也会进行验证（[`node.gpg_verify`](/lang/node.html#node.gpg_verify)）。随后会运行 `node -v` 和 `npm -v`。mise 不会设置 Node.js 专用环境变量，只会将该版本的 `bin` 目录加入 `PATH`。

如果当前平台没有对应的二进制文件，mise 会从源码编译 Node.js；除非 [`node.compile`](/lang/node.html#node.compile) 设为 `false`。

在 Alpine 和 NixOS 上，由于 [`all_compile`](/configuration/settings.html#all_compile) 默认值为 `true`，mise 目前默认从源码编译。此默认行为已弃用，mise 2027.8.0 将改用预编译二进制文件。若现在就要使用预编译版本，请将 `node.compile` 或 `all_compile` 设为 `false`；在 NixOS 上还需先启用 [nix-ld](https://github.com/Mic92/nix-ld)。若要继续编译，请显式设置 `all_compile = true`。

已安装且名为 `node` 的插件优先于内置安装器。如果 mise 的行为与本页所述不同，请检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

### 从源码编译 {#building-from-source}

将 `node.compile` 设为启用后，mise 会编译 Node.js，而不是下载二进制文件。请先安装 Node.js 的[构建依赖项](https://github.com/nodejs/node/blob/main/BUILDING.md#building-nodejs-on-supported-platforms)：

```sh
mise settings node.compile=true
mise install node@26
```

如果 `PATH` 中存在 `ninja`，mise 会使用它。可通过 [`node.ninja`](/lang/node.html#node.ninja)、[`node.concurrency`](/lang/node.html#node.concurrency)、[`node.configure_opts`](/lang/node.html#node.configure_opts)、[`node.cflags`](/lang/node.html#node.cflags) 和 [`node.apply_patches`](/lang/node.html#node.apply_patches) 设置调整构建过程。

### 非官方构建

非官方构建项目 [unofficial builds](https://unofficial-builds.nodejs.org/) 为官方构建未覆盖的平台发布 Node.js。

在 Alpine 等使用 musl 的主机上，mise 会检测 musl。如果从默认的 `node.mirror_url` 下载二进制文件而非编译（见上文关于 Alpine 的说明），则会自动从 unofficial builds 获取 Node.js 的 `musl` 版本。将 [`libc`](/configuration/settings.html#libc) 设为 `musl` 也会产生相同效果。

对于 linux-loong64、linux-armv6l 等其他平台，或针对较旧 glibc 构建的 `glibc-217` 版本，可将 mise 指向 unofficial builds：

```sh
mise settings node.mirror_url=https://unofficial-builds.nodejs.org/download/release/
```

如有需要，再通过 [`node.flavor`](/lang/node.html#node.flavor) 选择构建类型：

```sh
mise settings node.flavor=glibc-217
```

## 从 nvm、nodenv 或 Homebrew 迁移

若要复用已安装的 Node.js 版本，可使用 [`mise sync node`](/cli/sync/node.html) 将其链接到 mise：

```sh
mise sync node --nvm     # reads versions under node.nvm_dir (NVM_DIR)
mise sync node --nodenv  # reads versions under node.nodenv_root (NODENV_ROOT)
mise sync node --brew    # reads Homebrew's versioned node@NN formulae
```

`mise sync` 不会覆盖由 mise 自行安装的版本。然后按[版本文件](#nvmrc-node-version-and-package-json-support)中的说明启用 `.nvmrc` 和 `.node-version`。

## 工具选项

Node.js 没有专用工具选项。`install_env` 会应用于源码构建、`node -v` 和 `npm -v` 检查、默认软件包安装、`corepack enable` 以及 `postinstall` 命令。例如，以下配置会覆盖源码构建所用的编译器标志：

```toml [mise.toml]
[tools]
node = { version = "26", install_env = { CFLAGS = "-O2" } }
```

其他通用选项请参阅[工具选项](/dev-tools/#tool-options)。

## 默认软件包文件 <Badge type="danger" text="deprecated" /> {#default-node-packages}

mise 会将 `~/.default-npm-packages`（[`node.default_packages_file`](/lang/node.html#node.default_packages_file)）中按行列出的软件包，通过 `npm install --global` 安装到每个新安装的 Node.js 版本中。自 2026.11.0 起，mise 会对此文件发出警告，并将在 2027.11.0 停止读取。请改用 [npm 后端](/dev-tools/backends/npm.html)安装 npm CLI，例如配置 `"npm:typescript" = "latest"`；也可以对每个 Node.js 版本都需要的软件包使用 [`postinstall`](/dev-tools/#tool-postinstall-commands) 命令。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="node" :level="3" />
