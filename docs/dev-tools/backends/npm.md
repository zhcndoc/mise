# npm 后端

即使没有对应的 asdf 插件，你也可以直接从 [npmjs.org](https://npmjs.org/) 安装包。

相关代码位于 mise 仓库中的 [`./src/backend/npm.rs`](https://github.com/jdx/mise/blob/main/src/backend/npm.rs)。

## 依赖项

默认情况下，mise 处理 `npm:` 工具时无需安装 node 或包管理器 CLI。版本解析（`mise ls-remote`、解析 `latest`）会直接通过 HTTP 查询 npm registry，而软件包则使用 mise 内置的 [aube](https://github.com/jdx/aube) 包管理器进行安装。两者都会遵循配置在 `~/.npmrc`（或 `NPM_CONFIG_USERCONFIG`）中的 registry、作用域 registry（`@scope:registry`）和身份验证令牌，以及 `NPM_CONFIG_*` 环境变量。已安装的软件包在运行时仍可能需要 `node`，启用的软件包生命周期脚本在安装过程中也可能需要它。当 `node` 已配置时，mise 会将其安装顺序排在 `npm:` 工具之前，但 npm 后端不会自动添加或安装 `node`。

如果要改为调用 npm CLI——使用 `npm view` 获取元数据，并使用 `npm install -g` 进行安装——请设置
[`npm.shell_out`](/configuration/settings.html#npm-shell-out)（需要已安装 npm）。如果你依赖内置实现不支持的、仅 npm 支持的配置（例如 `cafile`、客户端证书或身份验证令牌辅助程序），可以使用此选项。

你也可以通过
[`npm.package_manager`](/configuration/settings.html#npm-package-manager) 选择特定的安装程序。默认值 `auto` 使用内置的 aube；将其设置为 `aube_cli`、`bun`、`pnpm` 或 `npm` 时，会调用相应工具，而该工具必须已安装。独立的 `aube_cli` 模式在 `npm.shell_out` 仍为默认值 `false` 时，使用 mise 内置的 HTTP 客户端获取版本元数据，并直接调用 `aube` 进行安装；它不依赖 aube 的 `npm` 兼容层。

npm 后端会将 [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 传递给安装过程中的传递依赖解析。内置的 aube 安装程序会原生支持该选项。调用外部工具时，则依赖包管理器支持其发行时间限制参数：

- `pnpm >= 10.16.0` 使用 `--config.minimumReleaseAge=<minutes>`
- `bun >= 1.3.0` 使用 `--minimum-release-age <seconds>`
- `npm >= 11.10.0` 使用 `--min-release-age=<days>`；`npm 6.9.0–11.9.x` 使用 `--before <timestamp>`（子日级别的 `minimum_release_age` 时间窗口也使用 `--before`，因为 `--min-release-age` 的粒度为天）

如果你希望在调用外部工具时保护传递依赖，请安装并使用满足上述相应要求的包管理器版本。较旧的版本在处理传递的参数时可能会失败。

## Socket 安全

使用通过 mise 安装的 `npm:` 工具时，有两种方式使用 [Socket](https://socket.dev)。

### 兼容 Bun 的安全扫描器

内置的 aube 安装器实现了
[Bun 安全扫描器 API](https://bun.sh/docs/pm/security-scanner-api)，并且兼容 Socket 的
[`@socketsecurity/bun-security-scanner`](https://socket.dev/blog/socket-integrates-with-bun-1-3-security-scanner-api)。
设置 `AUBE_SECURITY_SCANNER` 以启用它：

```sh
MISE_NPM_PACKAGE_MANAGER=aube \
AUBE_SECURITY_SCANNER=/absolute/path/to/scanner.mjs \
  mise install npm:prettier@latest
```

显式选择 `aube` 可确保即使用户的 mise 设置选择了 npm、Bun 或 pnpm，也会使用该扫描器。

扫描器会在依赖解析之后、下载软件包 tarball 之前运行。它会接收已解析的直接依赖和传递依赖注册包；致命发现会阻止安装。配置了扫描器后，如果扫描器无法启动或完成，安装也会默认失败。有关完整的行为和配置，请参阅
[aube 的安全扫描器文档](https://aube.jdx.dev/package-manager/security-scanner.html)。

Mise 会在合成项目中安装每个 `npm:` 工具，因此，通常无法从该项目的
`node_modules` 中解析裸扫描器包名称。请将设置指向一个绝对模块路径。例如，将 Socket 扫描器安装到单独的稳定目录中，并将此包装器放在该目录的
`node_modules` 旁边：

```js
// scanner.mjs
export { scanner } from "@socketsecurity/bun-security-scanner";
```

扫描器桥接程序要求 Node.js 22.6 或更高版本。它会继承 Socket 专用的环境变量，例如
`SOCKET_SECURITY_API_KEY`，而 aube 会从扫描器子进程中移除常见的 npm 和 GitHub 凭据。

### Socket Firewall

[Socket Firewall](https://docs.socket.dev/docs/socket-firewall-free) 也可以改为包装 mise 本身：

```sh
sfw mise install npm:prettier@latest
sfw mise use -g npm:prettier
```

这会在网络层工作。Mise 的 npm 元数据客户端和内置的 aube 安装器都使用 aube-registry，该组件遵循
`HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY` 设置，并将
`NODE_EXTRA_CA_CERTS` 证书包显式加载到其 Rust TLS 客户端中。Socket 目前将 npm、yarn 和 pnpm 记录为受支持的 JavaScript 包管理器，而不是 mise 或 aube，因此这种互操作性并不受上游兼容性保证。

## 用法

以下命令会安装 [prettier](https://www.npmjs.com/package/prettier) 的最新版本
并将其设置为 PATH 上的当前生效版本：

```sh
$ mise use -g npm:prettier
$ prettier --version
3.1.0
```

版本将以以下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"npm:prettier" = "latest"
```

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列出的环境变量来配置这些内容。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="npm" :level="3" />

## 生命周期脚本

npm 后端一次只安装一个全局工具包。生命周期脚本是由包提供的命令，例如 `preinstall`、`install`、`postinstall` 和 `prepare`；允许它们就意味着允许所选包及其依赖在安装期间运行代码。

在默认的 `npm.package_manager = "auto"` 设置下，mise 会通过其内置的
`aube` 包管理器进行安装。设置 `npm.package_manager = "aube"`、`"aube_cli"`、`"pnpm"`、`"bun"` 或
`"npm"` 可以显式选择包管理器（`aube` 同样使用内置版本；其他选项则会调用外部程序）。
在默认的 `auto` 包管理器下，[`npm.shell_out`](/configuration/settings.html#npm-shell-out)
会强制使用 npm CLI。显式选择的安装程序在安装时仍具有更高优先级。
`allow_builds`、`trust_policy_excludes`、`pnpm_args`、`bun_args` 和 `npm_args` 选项仅
影响实际使用的包管理器；为其中一个包管理器设置的批准选项不会改变另一个包管理器的行为。

对于需要审核依赖构建脚本的工具，请在使用 `aube`（默认）、`aube_cli`、`pnpm` 或 npm 11.16.0+ 时使用 `allow_builds`。

### `aube`（默认）

内置的 [`aube`](https://aube.jdx.dev/package-manager/lifecycle-scripts) 安装程序遵循
pnpm v11 的构建批准模型：除非依赖的生命周期脚本被明确加入允许列表，否则将拒绝执行。
请使用 `allow_builds` 来指定经过审核的依赖构建：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

`allow_builds` 会写入安装的 `aube.allowBuilds` 清单字段。
请使用 `trust_policy_excludes` 来指定经过审核的 aube 信任策略例外。
将 `allow_builds = true` 设置为允许每个依赖的构建脚本，此操作表示你明确接受相关风险。
（现在安装会在进程内运行，而不是通过 `aube` CLI 运行，因此 `aube_args` 选项会被忽略。）

### `aube_cli`

设置 `npm.package_manager = "aube_cli"`，即可通过独立的 `aube`
可执行文件进行安装，同时保留 mise 内置的 HTTP 元数据查找功能：

```toml
[settings.npm]
package_manager = "aube_cli"
```

此模式会直接调用 `aube add --global`。它会转发 `aube_args` 和
`allow_builds`，不需要执行 `aube activate`，也不依赖 aube 的 npm 兼容性 shim 的行为。

### `pnpm`

[`pnpm`](https://pnpm.io/cli/add#--allow-build) 使用构建批准设置来管理依赖生命周期脚本。对于经过审核的依赖构建，请使用 `allow_builds`：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

`allow_builds` 会作为每个包一个 `--allow-build=<pkg>` 标志传递给 `pnpm add --global`。
`--allow-build` 于 pnpm v10.4.0 中添加，并受 pnpm v10.4.0+ 和 v11.x 支持。
将 `allow_builds = true` 设置为传递 `--dangerously-allow-all-builds`，表示你明确接受每个依赖的构建脚本都可能运行。

[`pnpm approve-builds`](https://pnpm.io/cli/approve-builds) 于 v10.1.0 中添加，但不建议从 postinstall 中运行 `approve-builds`。`pnpm approve-builds -g` 在 pnpm v10.4.0 到 v10.x 期间对全局包有效，并在 v11.0.0 中被移除；对于 pnpm v10.4.0+ 或 v11.x 的全局安装，请使用 `allow_builds = ["<pkg>"]`。

### `bun`

[`bun`](https://bun.sh/docs/pm/lifecycle) 默认不会执行任意依赖生命周期脚本。Bun 的项目安装控制包括 `trustedDependencies`、`bun add --trust` 和 `bun pm trust`，但 npm 后端的 Bun 路径是全局安装，不会写入按传递依赖划分的 `trustedDependencies` 允许列表。

mise 不会自动添加 Bun 的 [`--trust`](https://bun.sh/docs/pm/cli/add#trusted-dependencies) 标志。当你接受更广泛的安装期脚本信任时，可以通过 `bun_args` 显式传递它：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm`

`npm` 通常默认运行生命周期脚本。mise 对于基于 npm 的安装，默认传递
[`--ignore-scripts=true`](https://docs.npmjs.com/cli/v11/using-npm/config/#ignore-scripts)。

在 npm 11.16.0+ 中，`allow_builds = ["<pkg>"]` 会作为
[`--allow-scripts=<pkg>`](https://docs.npmjs.com/cli/v11/using-npm/config/#allow-scripts) 传递，用于经过审核的全局安装。当使用 `allow_builds` 且 npm 支持 `--allow-scripts` 时，mise 不会传递 `--ignore-scripts=true`，因为 npm 的 `ignore-scripts` 设置优先于允许列表。

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

将 `allow_builds = true` 设置为传递
[`--dangerously-allow-all-scripts`](https://docs.npmjs.com/cli/v11/using-npm/config/#dangerously-allow-all-scripts)，表示你明确接受每个依赖的构建脚本都可能运行。

对于较旧的 npm 版本，mise 会保留 `--ignore-scripts=true`；当你接受安装图中的每个包都可以运行生命周期脚本时，请使用 `aube`/`pnpm`、升级 npm，或通过 `npm_args` 选择进入 npm 的默认脚本行为：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `npm` 后端。这些内容放在 `mise.toml` 的 `[tools]` 中。

### `allow_builds`

当 `settings.npm.package_manager = "aube"`、`"aube_cli"`、`"pnpm"` 或 npm 11.16.0+ 时，应批准其依赖生命周期构建脚本的包。请使用此选项，而不是在 `aube_args`、`pnpm_args` 或 `npm_args` 中明确写出特定于包管理器的批准标志。

例如，要允许一个已验证的依赖构建脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

对于多个已审核的依赖构建：

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

`trust_policy_excludes` 会作为 `trustPolicyExclude` 写入 aube 安装目录的 `.npmrc`。它不会影响 `npm`、`pnpm` 或 `bun` 安装。

### `allow_low_downloads`

即使请求安装的包每周下载量低于 aube 的 `lowDownloadThreshold`（默认为 1000），也允许其安装。没有此选项时，aube 会拒绝安装：

```
拒绝添加 some-tool：每周下载量仅为 930（阈值：1000）。
```

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_low_downloads = true }
```

此豁免仅针对你请求的包，会作为 `allowedUnpopularPackages=<package>` 写入 aube 安装目录的 `.npmrc`。传递依赖仍会受到限制，阈值本身也不会改变——因此不会悄悄放行你未主动选择的不受欢迎依赖。

从 `mise.lock` 解析出的 npm 工具会自动通过此下载量检查，因此复现现有锁文件不需要 `allow_low_downloads`。但首次无锁安装仍需要显式设置此选项才能批准。

下载量是受欢迎程度的信号，而不是安全性信号：下载量低意味着很少有其他人审查过该包，因此应优先确认你信任其发布者，而不是直接使用此选项。它不会影响 `npm`、`pnpm` 或 `bun` 安装。

### 调查信任降级

`trustPolicy=no-downgrade` 失败是供应链信号，而不是通常的找不到匹配版本的问题。这意味着较早的版本比选定版本具有更强的 npm 可信发布者、分阶段发布或来源证明证据。

在添加例外之前：

1. 检查 npm 发布信息、源代码标签/提交、发布者身份和压缩包，将元数据与 npmjs.org 进行比较，并确认没有任何内容看起来遭到篡改。
2. 检查维护者是否有意手动发布、在受信任的工作流之外回移植、跳过来源证明，或使用了剥离元数据的注册表。
3. 将不一致的证据报告给相关的上游负责人。包发布偏差应由维护者处理；npmjs.org 上存在但代理或镜像中缺失的元数据应由相应的注册表运营者处理。
4. 审查后，优先使用限定版本的 `"<package>@<version>"` 例外。仅填写包名会免除所有未来版本的检查。

使用默认的 `auto` 包管理器时，设置 `mise settings npm.shell_out=true` 会切换到 npm CLI，并完全绕过此 aube 检查，因此这应作为最后手段，而不是首选的解决方法。显式选择 `npm.package_manager = "aube_cli"` 仍会使用独立的 aube 进行安装。

更多详情请参阅 aube 的[信任策略文档](https://aube.jdx.dev/security#trust-policy)。

### `aube_args`

当 `settings.npm.package_manager = "aube_cli"` 时，传递给 `aube add --global` 的额外参数。
这些是用户原样提供的参数。

例如，使用 aube 的仅追加报告模式安装 `npm`：

```toml
[tools]
"npm:npm" = {
  version = "latest",
  aube_args = "--reporter append-only",
}
```

### `pnpm_args`

当 `settings.npm.package_manager = "pnpm"` 时，传递给 `pnpm` 安装的额外参数。
这些是原样使用的用户提供参数。

例如，设置 pnpm 的日志级别：

```toml
[tools]
"npm:some-tool" = { version = "latest", pnpm_args = "--loglevel=warn" }
```

### `bun_args`

当 `settings.npm.package_manager = "bun"` 时，传递给 `bun` 安装的额外参数。
这些是原样使用的用户提供参数。mise 不会自动添加 `--trust`。

例如，传递 Bun 的广泛信任标志：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm_args`

当 `settings.npm.package_manager = "npm"` 时，传递给 `npm` 安装的额外参数。
这些是原样使用的用户提供参数。例如，要启用 npm 生命周期脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```
