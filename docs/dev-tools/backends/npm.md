---
description: "通过内置的 aube 安装器安装 npm 命令行软件包，每个软件包使用独立目录。"
---

# npm 后端

`npm` 后端从 npm 注册表安装命令行软件包，并为每个软件包使用独立目录。安装由 mise 内置的
[aube](https://github.com/aubepkg/aube) 包管理器完成，因此只有运行这些工具时才需要
Node.js。应用程序依赖项应保留在 `package.json` 中，并通过项目使用的包管理器或
[mise deps](/dev-tools/deps.html) 安装。

## 要求 {#requirements}

<span id="dependencies"></span>

mise 使用内置的 aube 包管理器列出并安装 npm 工具，因此此过程不需要 Node.js 或 npm。
不过，大多数命令行工具以及部分生命周期脚本仍需要 Node.js 才能运行。请将 `node` 添加到
`[tools]`：mise 会先于 npm 工具安装它，但不会自动为你添加此项。

其他安装程序需要单独的可执行文件；参见[选择安装程序](#choosing-an-installer)。

## 用法 {#usage}

<span id="quick-start"></span>

Prettier 运行时需要 Node.js，因此要在当前项目中同时声明这两个工具：

```sh
mise use node@24 npm:prettier
mise exec -- prettier --version
```

此命令会将以下内容写入 `mise.toml`。添加 `-g` 可改为写入全局配置。

```toml
[tools]
node = "24"
"npm:prettier" = "latest"
```

如果项目已在 `package.json` 中列出 Prettier，应通过项目的包脚本运行该版本，以便版本和
插件与项目保持一致。

安装带作用域的软件包时，请给标识符加引号：`mise use 'npm:@biomejs/biome'`。安装的
命令名是 `biome`，而不是软件包名称。

### 从 Git 安装 {#install-from-git}

若要从 Git 仓库而非注册表安装，请使用 Git URL 或 `github:`、`gitlab:`、`bitbucket:`
简写。版本可以是 Git 引用（标签、分支或提交），而 `latest` 表示仓库的默认分支：

```sh
mise use 'npm:git+https://github.com/owner/repo'
mise use 'npm:github:owner/repo@v1.2.0'
```

## 私有注册表 {#registry-configuration}

mise 通过 HTTP 从注册表读取软件包元数据，内置 aube 也从该注册表安装软件包。两者都会从
用户级 `~/.npmrc`（或 `NPM_CONFIG_USERCONFIG` 指定的文件）以及 `NPM_CONFIG_*` 环境变量
读取注册表、作用域注册表（`@scope:registry`）、身份验证令牌、`ca` 和 `cafile`、
`strict-ssl`、每个注册表对应的 `cert` 和 `key` 客户端证书，以及 `tokenHelper`。它们
都不会读取项目中的 `.npmrc`。

设置 [`npm.shell_out`](/dev-tools/backends/npm.html#npm.shell_out) 后，mise 会使用
`npm view` 获取元数据；默认的 `auto` 安装程序还会使用 `npm install -g` 安装工具。此选项
需要 npm。若要使用内置客户端尚未实现的 npm 专属功能，或通过 npm 本身排查注册表问题，可
启用此选项。

## 锁定依赖项 {#dependency-locking}

使用内置 aube 安装程序时，`mise.lock` 会记录每个 npm 工具的完整依赖关系图（锁文件格式为
2 或更高版本，新锁文件均使用此格式）。创建锁文件，或升级旧版 mise 写入的锁文件，然后
按锁文件安装：

```sh
mise lock --upgrade
mise install --locked
```

创建新锁文件时，直接运行 `mise lock` 即可。若工具本身的版本未变，但需要刷新其依赖项：

```sh
mise lock --bump npm:prettier
```

普通锁定会复用已记录的依赖关系图；锁定安装则直接按该图安装，不会再次解析依赖项。其他
安装程序无法按内置 aube 生成的依赖关系图重放安装；请使用内置 aube，或针对所选安装程序
刷新锁文件。

<span id="dependency-sidecars"></span>

请将工具的旁文件目录（默认为 `.mise/locks/npm-<package>/<version>/`）与 `mise.lock` 一起
提交；运行 `mise lock --sidecars` 可列出这些目录。依赖关系图以 `package.json` 和
`aube-lock.yaml` 的形式存放，使用 aube 格式而非 `package-lock.json`，因此只读取 npm 锁文件的
扫描器可能无法发现其中的依赖项。另见[依赖关系图](/dev-tools/mise-lock.html#dependency-graphs)。

## 最短发行等待时间 {#minimum-release-age}

mise 会将 [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 同时
应用于工具及其依赖项。内置 aube 会自行处理此设置。对于已锁定的依赖关系图，等待时间门槛
只在解析依赖关系图时生效；安装时会重放已提交的依赖项。

外部安装程序必须使用支持 mise 所传标志的版本：

| 安装程序  | 最低版本        | 标志                                                                                         |
| --------- | --------------- | --------------------------------------------------------------------------------------------- |
| pnpm      | 10.16.0         | `--config.minimum-release-age=<minutes>`                                                      |
| Bun       | 1.3.0           | `--minimum-release-age <seconds>`                                                             |
| npm       | 6.9.0           | `--before <timestamp>`; from 11.10.0, `--min-release-age=<days>` for windows of a day or more |

较旧版本可能不接受此标志。

## 构建脚本与供应链检查 {#build-scripts-and-supply-chain-checks}

<span id="lifecycle-scripts"></span>
<span id="allow-builds"></span>

生命周期脚本（`preinstall`、`install`、`postinstall`、`prepare`）会在安装时运行软件包及其
依赖项中的代码。默认情况下，mise 不会运行依赖项脚本。可通过 `allow_builds` 批准指定软件包：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild", "sharp"] }
```

`allow_builds = true` 会允许运行所有依赖项脚本。此选项会按以下方式传递给各
[安装程序](#choosing-an-installer)：

| 安装程序                | 未设置 `allow_builds`                      | `allow_builds = ["pkg"]`                    | `allow_builds = true`             |
| ----------------------- | ----------------------------------------- | ------------------------------------------- | --------------------------------- |
| 内置 aube（默认）       | 不运行依赖项脚本                          | 写入安装目录的 `aube.allowBuilds`            | 运行所有依赖项脚本                |
| `aube_cli`              | mise 传入 `--ignore-scripts`              | `--allow-build=<pkg>`                       | `--dangerously-allow-all-builds`  |
| `pnpm` 10.4 或更高版本  | 使用 pnpm 默认行为；pnpm 10 会跳过脚本    | `--allow-build=<pkg>`                       | `--dangerously-allow-all-builds`  |
| `npm` 11.16 或更高版本  | mise 传入 `--ignore-scripts=true`         | `--allow-scripts=<pkg>`                     | `--dangerously-allow-all-scripts` |
| 较旧版 `npm`            | mise 传入 `--ignore-scripts=true`         | 不支持；mise 会发出警告                     | 不支持；mise 会发出警告           |
| `bun`                  | Bun 会跳过不受信任依赖项的脚本             | 忽略                                       | 忽略                              |

对某个安装程序的批准不会改变其他安装程序的行为。使用 npm 11.16 或更高版本时，如果设置了
`allow_builds`，mise 会移除 `--ignore-scripts=true`，因为 npm 的 `ignore-scripts` 设置会
覆盖允许列表。使用较旧版 npm 时，请升级 npm、改用 aube 或 pnpm，或者通过
`npm_args = "--ignore-scripts=false"` 接受此次安装中的所有脚本。mise 使用 Bun 全局安装，
不会写入 Bun 的 `trustedDependencies` 列表；若要信任所有脚本，请传入
`bun_args = "--trust"`。

使用 pnpm 时，请通过 `allow_builds` 配置批准，不要在 `postinstall` 钩子中运行
`pnpm approve-builds`：全局选项 `approve-builds -g` 仅存在于 pnpm 10.4 至 10.x，并已在
pnpm 11 中移除。

### 信任策略 {#trust-policy}

<span id="trust-policy-excludes"></span>

aube 的 `trustPolicy=no-downgrade` 检查会比较依赖项的已选版本与更早版本。如果更早版本有
更强的 npm 可信发布者、分阶段发布或来源证明证据，安装就会失败。检查并确认相关依赖项后，
可通过 `trust_policy_excludes` 将其排除。此设置适用于内置 aube（默认）和 `aube_cli`：

```toml
[tools]
"npm:some-tool" = { version = "latest", trust_policy_excludes = ["undici@^5 || >=6 <7"] }
```

请使用 aube 的软件包版本模式，只排除已经审核过的版本。若只填写软件包名称，例如
`"undici"`，也会排除该软件包的所有未来版本。mise 会将列表以 `trustPolicyExclude` 的
名称写入安装目录中的 `.config/aube/config.toml`。添加例外前，请先阅读[调查信任级别降级](#investigating-trust-downgrades)和
aube 的[信任策略文档](https://aube.sh/security#trust-policy)。

### 下载量低或新发布的软件包 {#low-download-and-new-packages}

<span id="allow-low-downloads"></span>

aube 会拒绝添加每周下载量低于 `lowDownloadThreshold`（默认为 1000）的软件包、名称与
热门软件包相似的软件包，以及刚注册的软件包：

```text
refusing to add some-tool: only 930 weekly downloads (threshold: 1000).
```

确认软件包名称和发布者后，可通过 `allow_low_downloads` 批准安装：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_low_downloads = true }
```

此例外只适用于你明确指定的软件包。mise 会将其以 `allowedUnpopularPackages` 的名称写入
安装目录中的 `.config/aube/config.toml`；下载量门槛不会改变，依赖项仍会接受检查，aube 的
恶意软件公告检查也会继续运行。通过 `mise.lock` 解析出的工具会自动通过这三项检查，因此
只有首次未锁定安装时才需要此选项。这些信号用于评估软件包声誉，并不能证明软件包不安全。
此选项适用于内置 aube 和 `aube_cli`。

### 来自注册表之外的依赖项 {#dependencies-from-outside-the-registry}

<span id="allow-exotic-deps"></span>

aube 会拒绝来自 npm 注册表之外的依赖项（例如 `git+` URL、`file:` 路径或 tarball URL），
因为注册表无法为这些依赖项提供保护。aube 的
[`blockExoticSubdeps`](https://aube.sh/settings/#setting-blockexoticsubdeps) 设置会因此
导致安装失败，并显示类似错误：

```text
registry error for xlsx: uses exotic specifier "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
which is blocked by blockExoticSubdeps (declared by @gmickel/gno)
```

请先检查该依赖项的来源，再通过 `allow_exotic_deps` 按名称允许它：

```toml
[tools]
"npm:@gmickel/gno" = { version = "2.3.0", allow_exotic_deps = ["xlsx"] }
```

mise 会将此列表以 `blockExoticSubdepsExclude` 的名称写入安装目录中的
`.config/aube/config.toml`，因此其他软件包（包括后续版本新增的依赖项）仍会接受检查。
`allow_exotic_deps = true` 会排除整个依赖关系图，包括未来加入的依赖项，因此建议优先使用
明确列出的名称。如果可行，请联系上游项目，让它改为依赖注册表中发布的版本。此选项适用于
内置 aube 和 `aube_cli`；npm、pnpm 和 Bun 不会执行这项检查。

### Socket 安全扫描器 {#socket-security}

<span id="bun-compatible-security-scanner"></span>

内置 aube 实现了
[Bun 安全扫描器 API](https://bun.sh/docs/pm/security-scanner-api)，可以配合 Socket 的
[`@socketsecurity/bun-security-scanner`](https://socket.dev/blog/socket-integrates-with-bun-1-3-security-scanner-api).
设置 `AUBE_SECURITY_SCANNER` 即可启用：

```sh
MISE_NPM_PACKAGE_MANAGER=aube \
AUBE_SECURITY_SCANNER=/absolute/path/to/scanner.mjs \
  mise install npm:prettier@latest
```

设置 `MISE_NPM_PACKAGE_MANAGER=aube` 后，即使配置选择了 npm、Bun 或 pnpm，也会运行该扫描器。

扫描器会在解析依赖项之后、下载软件包 tarball 之前运行。它会接收已解析的直接依赖项和
传递依赖项；如果发现严重问题，安装就会被阻止。配置了扫描器后，如果它无法启动或运行完成，
安装也会按失败处理。配置方法请参阅
[aube 安全扫描器文档](https://aube.sh/package-manager/security-scanner)。

mise 会将每个 `npm:` 工具安装到独立的项目目录中，因此仅填写扫描器软件包名时，无法从
该项目的 `node_modules` 解析到它。请改为将变量指向模块的绝对路径。例如，可将 Socket
扫描器安装到单独且固定的目录，并将以下包装文件放在该目录的 `node_modules` 旁边：

```js
// scanner.mjs
export { scanner } from "@socketsecurity/bun-security-scanner";
```

扫描器桥接程序需要 Node.js 22.6 或更高版本。它会继承 `SOCKET_SECURITY_API_KEY` 等
Socket 环境变量；aube 则会从扫描器的环境中移除常见的 npm 和 GitHub 凭据。

### Socket Firewall {#socket-firewall}

[Socket Firewall](https://docs.socket.dev/docs/socket-firewall-free) 也可以直接包装 mise：

```sh
sfw mise install npm:prettier@latest
sfw mise use -g npm:prettier
```

这种方式在网络层生效。mise 的 npm 元数据客户端和内置 aube 都使用 aube-registry；它会遵循
`HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY`，并载入 `NODE_EXTRA_CA_CERTS` 证书包。Socket
没有将 mise 或 aube 列为支持的包管理器，因此不保证此配置有效。

<a id="choosing-an-installer"></a>

## 选择安装程序

使用 [`npm.package_manager`](/dev-tools/backends/npm.html#npm.package_manager) 选择安装程序：

| 设置             | 安装程序                                             | 是否需要单独的可执行文件 |
| ---------------- | ---------------------------------------------------- | ------------------------ |
| `auto`（默认）   | 内置 aube；`npm.shell_out = true` 时使用 npm          | 仅使用 npm 时需要        |
| `aube`           | 内置 aube                                            | 否                       |
| `aube_cli`       | `aube add --global`                                  | `aube`                   |
| `pnpm`           | pnpm                                                 | `pnpm`                   |
| `bun`            | Bun                                                  | `bun`                    |
| `npm`            | npm                                                  | `npm`                    |

例如：

```toml
[settings]
npm.package_manager = "pnpm"
```

安装时，显式指定的安装程序优先于 `npm.shell_out`。`pnpm_args` 等安装程序专属选项只会应用于
当前选定的安装程序。

## 工具选项 {#tool-options}

可以在 `[tools]` 中的工具条目里设置这些选项，也可以像
`'npm:some-tool[allow_low_downloads=true]'` 一样内联设置。所有后端都接受的选项请参见
[工具选项](/dev-tools/#tool-options)。

| 选项                    | 适用的安装程序                                      | 说明                                                                                                                                 |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `allow_builds`          | 内置 aube、`aube_cli`、pnpm、npm 11.16 或更高版本   | 批准运行依赖项构建脚本；参见[构建脚本](#build-scripts-and-supply-chain-checks)                                                |
| `trust_policy_excludes` | 内置 aube、`aube_cli`                               | 将已审核的软件包排除在信任策略之外；参见[信任策略](#trust-policy)                                                               |
| `allow_low_downloads`   | 内置 aube、`aube_cli`                               | 批准所请求的软件包通过声誉检查；参见[低下载量和新软件包](#low-download-and-new-packages)                                     |
| `allow_exotic_deps`     | 内置 aube、`aube_cli`                               | 允许从注册表之外获取依赖项；参见[注册表外依赖项](#dependencies-from-outside-the-registry)                                       |
| `aube_args`             | `aube_cli`                                          | 传递给 `aube add --global` 的额外参数                                                                                                |
| `pnpm_args`             | pnpm                                                | 传递给 `pnpm add --global` 的额外参数                                                                                                |
| `bun_args`              | Bun                                                 | 传递给 `bun install --global` 的额外参数                                                                                             |
| `npm_args`              | npm                                                 | 传递给 `npm install -g` 的额外参数                                                                                                   |
| `install_env`           | `aube_cli`、pnpm、Bun、npm                          | 安装程序的环境变量；见下文                                                                                                           |

### `aube_args`、`pnpm_args`、`bun_args` 和 `npm_args`

<span id="aube-args"></span>
<span id="pnpm-args"></span>
<span id="bun-args"></span>
<span id="npm-args"></span>

这些原始参数会附加到所选安装程序的命令中。内置 aube 不支持 `aube_args`，并会发出警告。
当 `npm.package_manager = "npm"`，或设置 `auto` 且 `npm.shell_out = true` 时，
`npm_args` 才会生效。例如，设置 pnpm 的日志级别：

```toml
[tools]
"npm:some-tool" = { version = "latest", pnpm_args = "--loglevel=warn" }
```

### `install_env`

为外部安装程序（`aube_cli`、`pnpm`、`bun` 或 `npm`）设置环境变量。内置 aube 在 mise
进程内部运行，不会单独启动，因此不支持 `install_env`，并会发出警告。对于仅影响安装的
aube 设置，请使用 `allow_builds`、`allow_exotic_deps`、`allow_low_downloads` 或
`trust_policy_excludes`；其他环境变量请设置在 mise 自身的环境中。

```toml
[settings]
npm.package_manager = "npm"

[tools]
"npm:some-tool" = { version = "latest", install_env = { NODE_OPTIONS = "--max-old-space-size=4096" } }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="npm" :level="3" />

## 故障排除 {#troubleshooting}

| 症状                                                    | 处理方法                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| CLI 启动时提示缺少 `node`                               | 将 `node` 添加到 `[tools]`；内置安装程序不会自动为项目添加运行时。                                                              |
| 缺少原生依赖项                                          | 其构建脚本未运行。通过 [`allow_builds`](#build-scripts-and-supply-chain-checks) 仅批准该软件包。                              |
| 版本列表可正常读取，但安装失败                          | 检查所选安装程序，以及它是否能读取注册表和凭据。                                                                               |
| aube 因信任、下载量或来源问题拒绝安装软件包             | 阅读错误信息，再查看[供应链检查](#build-scripts-and-supply-chain-checks)下对应的章节。                                        |

### 调查信任级别降级 {#investigating-trust-downgrades}

`trustPolicy=no-downgrade` 检查失败代表供应链风险信号，并非普通的版本解析错误。这表示
某个较早版本拥有比当前选定版本更强的 npm 可信发布者、分阶段发布或来源证明证据。添加例外前：

1. 检查 npm 发行版、对应的源代码标签或提交、发布者身份及 tarball。将元数据与 npmjs.org
   上的信息对照，确认内容没有遭到篡改。
2. 确认维护者是否手动发布、是否在可信工作流之外回移了更改、是否跳过来源证明，或是否使用了
   会剥除元数据的注册表。
3. 将不一致的证据报告给上游。发行信息偏差应由软件包维护者处理；如果 npmjs.org 上有元数据，
   但代理或镜像未提供，则应联系相应注册表运营方。
4. 只排除已审核的版本，在 [`trust_policy_excludes`](#trust-policy) 中填写
   `"<package>@<version>"`。只写软件包名称会排除所有未来版本。

使用默认的 `auto` 安装程序时，`mise settings npm.shell_out=true` 会切换到 npm CLI，
并完全跳过这项检查，因此只有在不得已时才应这样做。显式设置
`npm.package_manager = "aube_cli"` 仍会使用独立的 aube 安装，并保留此检查。

实现代码：[`src/backend/npm.rs`](https://github.com/jdx/mise/blob/main/src/backend/npm.rs)。
