---
description: "将 npm 命令行包安装到单独的工具目录中。"
---

# npm 后端

`npm` 后端从 npm 注册表中安装命令行包，并将其放入单独的工具目录中。将应用程序的依赖项保存在 `package.json` 中，并使用其包管理器或 [mise deps](/dev-tools/deps.html) 进行安装。

## 快速开始 {#usage}

Prettier 运行时需要 Node.js，因此请在当前项目中声明这两个工具：

```sh
mise use node@24 npm:prettier
mise exec -- prettier --version
```

这会将以下内容写入 `mise.toml`。全局配置请添加 `-g`。

```toml
[tools]
node = "24"
"npm:prettier" = "latest"
```

对于作用域包，请引用其完整标识符，例如 `mise use 'npm:@biomejs/biome'`。包的可执行文件名称可能与其注册表名称不同。mise 安装的是 CLI 包，而不是任意库。

如果项目已经在 `package.json` 中声明了 Prettier，请通过包脚本运行该副本，以使其插件和版本与项目保持一致。

## 依赖项

默认情况下，mise 使用其内置的 [aube](https://github.com/jdx/aube) 包管理器安装 npm 工具。版本查询和安装不需要单独的 Node.js 或包管理器可执行文件。

**已安装的 CLI 可能仍然需要 Node.js**，其生命周期脚本也可能需要。需要时，请在 `[tools]` 中声明 `node`。mise 会在 npm 工具之前安装配置的 Node.js，但不会自动将其添加到项目中。

## 选择安装程序

使用 [`npm.package_manager`](/configuration/settings.html#npm.package_manager) 选择安装程序：

| 设置             | 安装程序                                             | 是否需要单独的可执行文件 |
| ---------------- | ---------------------------------------------------- | ------------------------ |
| `auto`（默认）   | 内置 aube，或在 `npm.shell_out = true` 时使用 npm     | 仅使用 npm 时需要        |
| `aube`           | 内置 aube                                            | 否                       |
| `aube_cli`       | `aube add --global`                                  | `aube`                   |
| `pnpm`           | pnpm                                                 | `pnpm`                   |
| `bun`            | Bun                                                  | `bun`                    |
| `npm`            | npm                                                  | `npm`                    |

例如：

```toml
[settings.npm]
package_manager = "pnpm"
```

显式指定的安装程序在安装时优先于 `npm.shell_out`。特定于安装程序的选项仅适用于所选安装程序。独立的 `aube_cli` 会直接调用 aube；它不需要 `aube activate` 或 npm 兼容性垫片。

### 注册表配置

默认情况下，mise 通过 HTTP 直接查询注册表以查找版本。该客户端和内置 aube 都支持来自 `~/.npmrc`、`NPM_CONFIG_USERCONFIG` 和 `NPM_CONFIG_*` 环境变量的注册表、作用域注册表（`@scope:registry`）和身份验证令牌。

将 [`npm.shell_out`](/configuration/settings.html#npm.shell_out) 设置为使用 `npm view` 获取元数据，并在使用默认的 `auto` 安装程序时使用 `npm install -g` 进行安装。这需要 npm。当你需要使用内置客户端不支持的 npm 特定配置（例如 `cafile`、客户端证书或身份验证令牌助手）时，请使用此设置。

## 依赖锁定

使用内置 aube 安装程序时，版本 2 锁定文件会记录工具的传递依赖图。创建锁定文件或升级现有锁定文件：

```sh
mise lock --upgrade
mise install --locked
```

即使工具自身的版本没有更改，也可以刷新依赖项：

```sh
mise lock --bump npm:prettier
```

普通锁定会复用已记录的依赖图。冻结安装会重放该依赖图，而不会再次解析依赖项。其他安装程序无法重放内置 aube 的依赖图；请使用内置 aube，或为所选安装程序刷新锁定文件。

### 依赖侧车文件

将原生的 `package.json` 和 `aube-lock.yaml` 文件与 `mise.lock` 一起提交。它们位于[每个条目的侧车目录](../mise-lock.md#native-dependency-sidecars)中，通常为 `.mise/locks/npm-<package>/<version>/`。

无操作锁定会保留原生文件的字节内容。其格式是 aube 的 YAML，而不是 `package-lock.json`，因此仅支持 npm 的扫描器可能无法识别其中的传递依赖。有关编辑侧车文件和验证其摘要的信息，请参阅[锁定文件指南](../mise-lock.md#dependency-graphs)。

## 最低发布年龄

mise 会将 [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 传递给传递依赖解析。内置 aube 原生支持此设置。对于冻结的依赖图，截止时间会在解析依赖图时应用；安装过程会重放已提交的依赖项。

外部安装程序需要支持所传递标志的版本：

| 安装程序 | 最低版本 | 标志                                  |
| -------- | -------- | ------------------------------------- |
| pnpm     | 10.16.0  | `--config.minimumReleaseAge=<minutes>` |
| Bun      | 1.3.0    | `--minimum-release-age <seconds>`      |
| npm      | 6.9.0    | `--before <timestamp>`                |
| npm      | 11.10.0  | `--min-release-age=<days>`             |

由于 `--min-release-age` 只接受完整天数，npm 对不足一天的时间窗口仍使用 `--before`。较旧的包管理器版本可能会因无法识别所传递的参数而失败。

## 生命周期脚本

npm 后端一次只安装一个全局工具包。生命周期脚本是由包提供的命令，例如 `preinstall`、`install`、`postinstall` 和 `prepare`；允许它们就意味着允许所选包及其依赖在安装期间运行代码。

对于经过审核的依赖构建，请在内置 aube、独立 aube、pnpm 或 npm 11.16.0+ 中使用 `allow_builds`：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

具体策略取决于[所选安装程序](#choosing-an-installer)。针对一个安装程序的批准不会改变另一个安装程序的行为。

### `aube`（默认）

内置的 [aube](https://aube.jdx.dev/package-manager/lifecycle-scripts) 会拒绝依赖生命周期脚本，除非脚本明确列入允许列表，其行为遵循 pnpm v11 的构建批准模型。mise 会将 `allow_builds` 写入安装的 `aube.allowBuilds` 清单字段。`allow_builds = true` 会允许所有依赖项的构建脚本。

对于经过审核的信任策略例外，请使用 `trust_policy_excludes`。内置安装程序会忽略 `aube_args`。

### `aube_cli`

独立 aube 会通过 `aube add --global` 接收 `allow_builds` 和 `aube_args`。使用 `npm.package_manager = "aube_cli"` 选择它。

### `pnpm`

对于 pnpm 10.4.0+ 和 v11，mise 会将每个 `allow_builds` 包作为 [`--allow-build=<pkg>`](https://pnpm.io/cli/add#--allow-build) 传递。`allow_builds = true` 会传递 `--dangerously-allow-all-builds`。

对于全局安装，请使用此选项，而不是从 postinstall 中运行 `pnpm approve-builds`。全局的 `approve-builds -g` 在 pnpm 10.4.0–10.x 中可用，但已在 v11 中移除。

### `bun`

[`bun`](https://bun.sh/docs/pm/lifecycle) 默认不会执行任意依赖生命周期脚本。Bun 的项目安装控制包括 `trustedDependencies`、`bun add --trust` 和 `bun pm trust`，但 npm 后端的 Bun 路径是全局安装，不会写入按传递依赖划分的 `trustedDependencies` 允许列表。

mise 不会自动添加 Bun 的 [`--trust`](https://bun.sh/docs/pm/cli/add#trusted-dependencies) 标志。当你接受更广泛的安装期脚本信任时，可以通过 `bun_args` 显式传递它：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm`

`npm` 默认运行生命周期脚本。对于由 npm 支持的安装，mise 默认传递 [`--ignore-scripts=true`](https://docs.npmjs.com/cli/v11/using-npm/config/#ignore-scripts)。

在 npm 11.16.0+ 中，`allow_builds = ["<pkg>"]` 会作为 [`--allow-scripts=<pkg>`](https://docs.npmjs.com/cli/v11/using-npm/config/#allow-scripts) 传递，用于经过审核的全局安装。当使用 `allow_builds` 且 npm 支持 `--allow-scripts` 时，mise 不会传递 `--ignore-scripts=true`，因为 npm 的 `ignore-scripts` 设置优先于允许列表。

设置 `allow_builds = true`，可在你明确接受每个依赖构建脚本都可能运行时，传递 [`--dangerously-allow-all-scripts`](https://docs.npmjs.com/cli/v11/using-npm/config/#dangerously-allow-all-scripts)。

对于较旧的 npm 版本，mise 会保留 `--ignore-scripts=true`；当你接受安装图中的每个包都可以运行生命周期脚本时，请使用 `aube`/`pnpm`、升级 npm，或通过 `npm_args` 选择进入 npm 的默认脚本行为：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `npm` 后端。这些内容放在 `mise.toml` 的 `[tools]` 中。

### `allow_builds`

当 `settings.npm.package_manager = "aube"`、`"aube_cli"`、`"pnpm"` 或 npm 11.16.0+ 时，应批准其依赖生命周期构建脚本的包。请使用此选项，而不是在 `aube_args`、`pnpm_args` 或 `npm_args` 中明确写出特定于包管理器的批准标志。

例如：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild", "sharp"] }
```

要允许安装时的所有依赖构建脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = true }
```

`allow_builds` 不会影响 `bun` 安装，因为 mise 的 Bun 路径是全局安装，不会为每个传递依赖写入 `trustedDependencies` 允许列表。对于 npm 安装，`allow_builds` 需要 npm 11.16.0+。

### `trust_policy_excludes`

当 `settings.npm.package_manager = "aube"` 或 `"aube_cli"` 时，应免于 aube 的 `trustPolicy=no-downgrade` 检查的包或包版本范围。对于经过审核的依赖来源元数据变更，请使用此选项，而不要为整个安装禁用信任策略。

例如，要免除某个依赖的所有版本：

```toml
[tools]
"npm:some-tool" = { version = "latest", trust_policy_excludes = ["undici"] }
```

要仅免除选定版本，请使用 aube 的包版本模式语法：

```toml
[tools]
"npm:some-tool" = { version = "latest", trust_policy_excludes = ["undici@^5 || >=6 <7"] }
```

`trust_policy_excludes` 会作为 `trustPolicyExclude` 写入 aube 安装目录的 `.config/aube/config.toml` 中。它不会影响 `npm`、`pnpm` 或 `bun` 安装。

### `allow_low_downloads`

明确批准所请求的包，以通过 aube 的信誉检查。这包括每周下载量低于 `lowDownloadThreshold`（默认值为 1000）、名称类似于热门包，或包名称刚刚注册等情况。如果没有此选项，aube 会拒绝安装；例如：

```
拒绝添加 some-tool：每周下载量仅为 930（阈值：1000）。
```

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_low_downloads = true }
```

该豁免仅适用于你所请求的包，并会写入 aube 安装目录 `.config/aube/config.toml` 中的 `allowedUnpopularPackages`。传递依赖仍然会受到限制，aube 的恶意包公告检查也仍会运行。信誉阈值本身不会改变，因此此选项不会悄悄放行未经批准的依赖项。

从 `mise.lock` 解析的 npm 工具会自动通过这三项信誉检查，因此重现现有锁定文件不需要 `allow_low_downloads`。但首次未锁定安装仍需要显式选项来批准它。

这些是信誉信号，而不是包不安全的证明。在批准包之前，请验证包名称和发布者。此选项不会影响 `npm`、`pnpm` 或 `bun` 安装。

### `aube_args`

当 `settings.npm.package_manager = "aube_cli"` 时，传递给 `aube add --global` 的额外参数。这些是用户原样提供的参数。

例如，使用 aube 的仅追加报告模式安装 `npm`：

```toml
[tools]
"npm:npm" = { version = "latest", aube_args = "--reporter append-only" }
```

### `pnpm_args`

当 `settings.npm.package_manager = "pnpm"` 时，传递给 `pnpm` 安装的额外参数。这些是原样使用的用户提供参数。

例如，设置 pnpm 的日志级别：

```toml
[tools]
"npm:some-tool" = { version = "latest", pnpm_args = "--loglevel=warn" }
```

### `bun_args`

当 `settings.npm.package_manager = "bun"` 时，传递给 `bun` 安装的额外参数。这些是原样使用的用户提供参数。mise 不会自动添加 `--trust`。

例如，传递 Bun 的广泛信任标志：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm_args`

使用 `npm.package_manager = "npm"`，或使用 `auto` 且 `npm.shell_out = true` 时，传递给 npm 安装的额外参数。这些是用户原样提供的参数。例如，要选择启用 npm 生命周期脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```

## Socket 安全性

对于由 mise 安装的 `npm:` 工具，有两种方式可以使用 [Socket](https://socket.dev)。

### 兼容 Bun 的安全扫描器

内置 aube 安装程序实现了 [Bun 的安全扫描器 API](https://bun.sh/docs/pm/security-scanner-api)，并兼容 Socket 的 [`@socketsecurity/bun-security-scanner`](https://socket.dev/blog/socket-integrates-with-bun-1-3-security-scanner-api)。设置 `AUBE_SECURITY_SCANNER` 以启用它：

```sh
MISE_NPM_PACKAGE_MANAGER=aube \
AUBE_SECURITY_SCANNER=/absolute/path/to/scanner.mjs \
  mise install npm:prettier@latest
```

显式选择 `aube` 可确保使用扫描器，即使用户的 mise 设置选择了 npm、Bun 或 pnpm。

扫描器会在依赖解析之后、下载包 tarball 之前运行。它会接收已解析的直接和传递注册表包；致命发现会阻止安装。如果已配置扫描器但无法启动或完成，它也会默认拒绝。有关完整的行为和配置，请参阅 [aube 的安全扫描器文档](https://aube.jdx.dev/package-manager/security-scanner.html)。

mise 会将每个 `npm:` 工具安装到合成项目中，因此通常无法从该项目的 `node_modules` 中解析裸扫描器包名。请将设置指向一个绝对模块路径。例如，将 Socket 扫描器安装在单独的稳定目录中，并将以下包装器放在该目录的 `node_modules` 旁边：

```js
// scanner.mjs
export { scanner } from "@socketsecurity/bun-security-scanner";
```

扫描器桥接程序需要 Node.js 22.6 或更高版本。它会继承 `SOCKET_SECURITY_API_KEY` 等 Socket 专用环境变量，而 aube 会从扫描器子进程中移除常见的 npm 和 GitHub 凭据。

### Socket Firewall

[Socket Firewall](https://docs.socket.dev/docs/socket-firewall-free) 也可以包装 mise 本身：

```sh
sfw mise install npm:prettier@latest
sfw mise use -g npm:prettier
```

这会在网络层工作。mise 的 npm 元数据客户端和内置 aube 安装程序都使用 aube-registry，后者支持 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY` 设置，并将 `NODE_EXTRA_CA_CERTS` 证书包显式加载到其 Rust TLS 客户端中。Socket 目前将 npm、yarn 和 pnpm 记录为受支持的 JavaScript 包管理器，而不是 mise 或 aube，因此这种互操作性并非上游兼容性保证。

## 故障排除

- **CLI 启动时缺少 `node`：** 显式配置 Node.js；内置安装程序不会向项目添加运行时。
- **缺少原生依赖：** 检查所选安装程序的生命周期脚本策略，并使用其支持的选项仅批准所需的构建。
- **私有包元数据可以正常获取，但安装失败：** 检查所选安装程序，以及两个客户端是否都能读取注册表和凭据。
- **aube 信任或下载量策略阻止安装：** 检查具体的策略错误和上文相关选项，然后再考虑更换安装程序。

### 调查信任降级

`trustPolicy=no-downgrade` 失败表示供应链信号，而不是普通的无法找到匹配版本。它意味着较早的发布版本比所选版本具有更强的 npm trusted-publisher、staged-publish 或 provenance 证据。

在添加例外之前：

1. 检查 npm 发布版本、源代码标签／提交、发布者身份和 tarball，将元数据与 npmjs.org 进行比较，并确认没有任何内容看起来遭到篡改。
2. 检查维护者是否有意手动发布、在受信任工作流之外回移植、跳过 provenance，或使用了会删除元数据的注册表。
3. 将不一致的证据报告给相关的上游负责人。包发布漂移应由维护者负责；npmjs.org 上存在但代理或镜像中缺失的元数据应由相应的注册表运营者负责。
4. 审查后，优先使用限定版本的 `"<package>@<version>"` 例外。裸包名称会豁免该包未来的每个版本。

使用默认的 `auto` 包管理器时，使用 `mise settings npm.shell_out=true` 会切换到 npm CLI，并完全绕过此 aube 检查，因此它应作为最后手段，而不是首选解决方法。显式选择 `npm.package_manager = "aube_cli"` 仍会在安装时使用独立 aube。

有关更多详细信息，请参阅 aube 的[信任策略文档](https://aube.jdx.dev/security#trust-policy)。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 设置这些选项，或设置下方列出的环境变量。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="npm" :level="3" />

实现：[`src/backend/npm.rs`](https://github.com/jdx/mise/blob/main/src/backend/npm.rs)。
