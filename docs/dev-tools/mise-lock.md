---
description: "锁定已解析的工具版本和制品校验和，以便重复安装得到相同结果。"
---

# 锁文件（mise.lock）

`mise.lock` 会记录 `mise.toml` 中版本请求解析出的确切版本；后端提供时，还会记录下载 URL 和校验和。请将它与 `mise.toml` 一起提交，确保所有机器和 CI 作业安装相同的工具。

## 快速开始 {#overview}

在 `mise.toml` 中声明了工具的项目中运行：

```sh
mise lock             # resolve the configured tools and write mise.lock
mise install --locked # install exactly what mise.lock records
```

`mise lock` 只写入锁文件，不会安装工具。请提交 `mise.toml`、`mise.lock`，以及 mise 为[依赖关系图](#dependency-graphs)创建的 `.mise/locks/` 目录。拉取更新后，团队成员和 CI 运行 `mise install --locked`。

若要将工具升级到其版本请求允许的最新版本：

```sh
mise lock --bump node
mise install --locked
```

提交前请检查锁文件差异并运行项目检查。`mise.lock` 锁定的是工具，而不是应用依赖，因此仍需保留 `package-lock.json`、`uv.lock` 等文件。

锁定安装并不等于离线安装。私有下载、尚未缓存的制品以及验证操作仍可能需要联网和[令牌](/dev-tools/github-tokens.html)。文件格式详见 [mise.lock 参考](/dev-tools/mise-lock-reference.html)。

## 创建锁文件 {#enabling-lockfiles}

运行 [`mise lock`](/cli/lock.html) 可创建项目锁文件。若要让 mise 在安装或升级工具时自动创建并更新锁文件，请在项目的 `mise.toml` 中设置 [`lockfile`](/configuration/settings.html#lockfile)：

```toml [mise.toml]
[settings]
lockfile = true
```

也可以在全局配置中设置该选项（`mise settings lockfile=true`），将其作为所有项目的默认行为。

该设置有三种状态：

- 在配置文件中设为 `true`：mise 会创建锁文件并保持更新。
- 未设置：mise 会更新已有锁文件，但不会创建新文件。`MISE_LOCKFILE=1` 的行为相同；只有在配置文件中设置 `lockfile = true` 才会启用自动创建。
- 设为 `false`：该项目禁用锁文件。若同时设置 `locked = true`，则会报错。

`mise lock` 会锁定当前配置根目录中的工具，包括任务通过 `tools` 声明的工具、继承任务模板中的工具以及被引入的任务文件中的工具。它只读取定义，不会运行任务、钩子或安装器，因此即使任务尚未运行，也可以先锁定其工具。全局工具只能通过 `mise lock --global` 锁定；参见[全局锁文件](#global-lockfiles)。

仅列在 `.tool-versions` 中的工具不会被锁定。请先将它们迁移到 `mise.toml`；[从 asdf 迁移](/dev-tools/comparison-to-asdf.html)介绍了如何转换该文件。

[`lockfile_mode`](/configuration/settings.html#lockfile_mode) 设置决定自动更新时如何重写文件；参见[完整锁文件生成](/dev-tools/mise-lock-reference.html#complete-lockfile-generation)。

## 工具使用哪个锁文件

每个配置文件都会将锁文件写在自身旁边：

| 工具声明位置                                                          | 锁文件                                                              | 是否提交                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `mise.toml`                                                           | `mise.lock`                                                         | 是                                            |
| `mise.<env>.toml`，例如 `mise.test.toml`                               | `mise.<env>.lock`                                                   | 是                                            |
| `mise.local.toml`                                                     | `mise.local.lock`                                                   | 否；与 `mise.local.toml` 一起忽略              |
| `mise.<env>.local.toml`                                               | `mise.<env>.local.lock`                                             | 否                                            |
| `~/.config/mise/config.toml` 或 `/etc/mise/config.toml`               | 同一目录下的 `mise.lock`，由 `mise lock --global` 创建              | 仅当配置文件保存在仓库中时提交                  |
| monorepo 子项目中设置了 `[monorepo] lockfile = true` 的 `mise.toml`    | monorepo 根目录下同名的锁文件                                     | 是                                            |
| `.nvmrc` 等惯用版本文件                                               | 最近的、所在目录包含该版本文件的 `mise.toml` 对应的锁文件         | 是                                            |
| `.tool-versions`                                                      | None                                                                |                                              |

锁文件位置遵循配置文件所在位置：`.config/mise.toml` 使用 `.config/mise.lock`；`conf.d/` 目录中的文件则共用其父目录中的一个锁文件。

### 环境 {#environment-specific-lockfiles}

设置 `MISE_ENV=test` 时，`mise lock` 会为 `mise.toml` 中的工具写入 `mise.lock`，并为 `mise.test.toml` 中的工具写入 `mise.test.lock`。环境锁文件只包含对应配置声明的工具，因此未设置 `MISE_ENV` 的 CI 作业只依赖 `mise.lock`。升级 `mise.dev.lock` 中的工具不会使这些作业的缓存失效。参见[配置环境](/configuration/environments.html)。

### 本地锁文件

`mise.local.toml` 中的工具会写入 `mise.local.lock`：

```sh
mise use --path mise.local.toml node@24   # locked in mise.local.lock
mise use --path mise.toml node@22         # locked in mise.lock
```

`mise lock --local` 会刷新 `mise.local.lock`，而不是 `mise.lock`：

```sh
mise lock --local              # update mise.local.lock
mise lock --local node python  # update only these tools in mise.local.lock
```

若在 Git 中忽略 `mise.local.lock`，也应忽略其旁文件目录 `.mise/locks/mise.local/`。

### 全局锁文件

普通的 `mise lock` 只锁定项目配置根目录中的工具。`mise lock --global` 会锁定全局配置和系统配置中的工具：

```sh
mise lock --global   # writes ~/.config/mise/mise.lock (and /etc/mise/mise.lock)
```

如果 `~/.config/mise/config.toml` 是指向 dotfiles 仓库的符号链接，例如 `~/dotfiles/mise.toml`，那么在仓库内运行 `mise lock` 会提示没有可锁定的内容，因为 mise 将该文件视为全局配置。请在仓库内运行 `mise lock --global`，以写入 `~/dotfiles/mise.lock`。从其他目录运行时，mise 会读写 `~/.config/mise/mise.lock`，因此也应将此路径链接到 `~/dotfiles/mise.lock`。旁文件会跟随符号链接目标。

mise 会更新符号链接锁文件的目标，并保留该链接。只有在全局或系统配置中，或在[受信任](/security.html#configuration-trust)且未启用[安全模式](/security.html#safe-mode)的项目配置中，才会跟随指向锁文件目录之外的链接。其他情况下写入会失败，避免检出目录决定 `mise lock` 替换你的哪些文件。

### Monorepos

在 [monorepo](/tasks/monorepo.html)（`monorepo_root = true`）中，设置 `[monorepo] lockfile = true` 可将所有子项目工具的锁文件集中放在根目录：`packages/api/mise.toml` 中的工具会写入根目录的 `mise.lock`，环境和本地配置则写入根目录下的 `mise.ci.lock`、`mise.local.lock` 等文件。

```toml [mise.toml]
monorepo_root = true

[monorepo]
config_roots = ["packages/api", "packages/web"]
lockfile = true
```

下一个支持锁文件的命令会将现有子项目锁文件迁移到根目录锁文件。发生冲突时保留根目录条目；只存在于子项目中的条目也会保留；迁移完成后会删除子项目锁文件及其旁文件。

未设置此项时，mise 会在每个子项目配置旁边保留锁文件。从 mise 2026.12.0 起，未设置该项且存在 `mise*.lock` 文件的 monorepo 会收到警告；从 2027.6.0 起，未设置时默认使用根目录锁文件。较旧版本的 mise 不认识子项目工具的根目录锁文件，因此需要兼容旧版本的团队可以继续使用原有布局：

```toml [mise.toml]
[monorepo]
lockfile = false
```

## 更新锁定版本 {#workflow}

| 目标                                                                 | 命令                     |
| -------------------------------------------------------------------- | ------------------------ |
| 更改 `mise.toml` 中的版本请求并安装                                   | `mise use node@26`       |
| 安装请求允许的最新版本并更新 `mise.lock`                               | `mise upgrade node`      |
| 不安装工具，将 `mise.lock` 更新到允许的最新版本                        | `mise lock --bump node`  |
| 锁定确切版本，同时保留前缀请求                                         | `mise lock node@24.11.0` |
| 安装 `mise.lock` 中记录的版本                                          | `mise install --locked`  |

### 升级锁定版本

`mise lock --bump` 会重新解析 `latest`、`lts` 或 `"24"` 这样的前缀版本请求，并将最新匹配版本写入锁文件。它不会安装工具，也不会修改 `mise.toml`。确切版本固定值仍会解析为自身并保持不变；若要重写 `mise.toml` 中的固定值，请使用 [`mise upgrade --bump`](/cli/upgrade.html)。

```sh
# mise.toml has node = "24", locked at 24.10.0, and 24.11.0 is out
mise lock --bump             # mise.lock now has 24.11.0; mise.toml still says "24"
mise lock --bump node        # bump only node
mise lock --bump --dry-run   # show what would change without writing
```

若要自动更新，可按计划运行此命令，并在锁文件发生变化时创建拉取请求。`--json` 会为每个锁定版本发生变化的工具输出一个对象，其中包含 `name`、`backend`、`lockfile`、`old_versions` 和 `new_versions`，并抑制其他输出。版本未变化时刷新校验和或 URL 不会列入结果；从配置中移除的工具，其 `new_versions` 为空。详情参见 [`mise lock`](/cli/lock.html)。

```sh
mise lock --bump --dry-run --json
```

```json
[
  {
    "name": "node",
    "backend": "core:node",
    "lockfile": "~/src/myproj/mise.lock",
    "old_versions": ["24.10.0"],
    "new_versions": ["24.11.0"]
  }
]
```

如果作业会在你无法控制的分支上运行（例如机器人在拉取请求中升级 `mise.lock`），请设置 `MISE_SAFE=1`，防止项目配置执行代码。[安全模式](/security.html#safe-mode)会拒绝运行任务、模板 `exec()` 和插件安装，并跳过钩子及 `_.source` 脚本，但仍可通过 HTTP 解析版本：

```sh
MISE_SAFE=1 mise lock --bump --json
```

### 固定锁定版本

若要锁定某个确切版本，同时让 `mise.toml` 保留前缀或 `latest` 请求：

```sh
# mise.toml has node = "latest" or node = "24"
mise upgrade node@24.11.0   # installs 24.11.0 and updates mise.lock
mise lock node@24.11.0      # updates mise.lock without installing
```

如果目标版本超出配置请求的范围，mise 也会以相同精度重写请求。例如 `node = "22"` 时，运行 `mise upgrade node@24.11.0` 会将 `mise.toml` 改为 `node = "24"`，并锁定 `24.11.0`。

### 命令行为 {#command-behavior-with-lockfiles}

以下命令会更新已有锁文件。它们是否会创建新锁文件，取决于 [`lockfile` 设置](#enabling-lockfiles)。

| 命令                        | 安装工具 | 更新 `mise.toml`                           | 更新 `mise.lock`                           |
| --------------------------- | -------- | ------------------------------------------ | ----------------------------------------- |
| `mise use node@24`          | 是       | 是（设置 `node = "24"`）                    | 是                                         |
| `mise install`              | 是       | 否                                         | 是                                         |
| `mise install node`         | 是       | 否                                         | 是（node 的配置版本）                      |
| `mise install node@24.11.0` | 是       | 否                                         | 否（在配置之外临时安装）                    |
| `mise upgrade`              | 是       | 否                                         | 是                                         |
| `mise upgrade node`         | 是       | 否                                         | 是（请求范围内的最新版本）                  |
| `mise upgrade node@24.11.0` | 是       | 仅当版本超出请求范围时                       | 是                                         |
| `mise upgrade --bump`       | 是       | 是（将请求升级至匹配版本）                   | 是                                         |
| `mise lock`                 | 否       | 否                                         | 是（所有已配置的工具）                      |
| `mise lock --bump`          | 否       | 否                                         | 是（请求范围内的最新版本）                  |
| `mise lock node@24.11.0`    | 否       | 仅当版本超出请求范围时                       | 是                                         |

### 切换到新的注册表后端 {#registry-backend-changes}

注册表有时会将工具迁移到其他后端，例如从 `github:jdx/communique` 迁移到 `packslip:github.com/jdx/communique`。通过简称配置的工具会继续使用 `mise.lock` 中记录的后端；即使 `mise lock --bump` 或 `mise upgrade` 选择了更新版本，注册表更新也不会改变锁定工具的安装来源。发生这种情况时，`mise install` 和 `mise lock` 会发出警告：

~~~text
mise WARN  communique is locked to github:jdx/communique, but the registry now installs it from packslip:github.com/jdx/communique. Run `mise backends switch communique` to switch.
~~~

[`mise backends switch`](/cli/backends/switch.html) 会将锁定条目切换到注册表指定的后端，同时保持版本不变，记录新后端的校验和与 URL，并从新后端重新安装已安装版本：

~~~sh
mise backends switch communique   # 切换一个工具
mise backends switch --dry-run    # 列出有新后端的所有锁定工具
~~~

## 严格锁文件模式 {#strict-lockfile-mode}

如果锁文件中没有匹配条目，`mise install --locked` 会直接失败而不会解析版本，因此可在 CI 中发现不完整的锁文件：

```sh
mise install --locked
MISE_LOCKED=1 mise install   # the same, set through the environment
```

对于会记录下载 URL 的后端，锁文件条目还必须包含当前平台对应的 URL。大多数不记录 URL 的后端仍可使用只记录版本的锁文件；参见[后端支持](#backend-support)。格式版本为 2 或更高的锁文件还要求 npm 和 PyPI 工具包含其[依赖关系图](#dependency-graphs)。

上述每个 URL 都必须有校验和，否则 mise 会在下载前报错，并指出工具、平台和 URL。若发布未提供校验和，`mise lock` 会下载制品并计算校验和。手动编写的条目或 [`lockfile_mode = "merge"`](/configuration/settings.html#lockfile_mode) 生成的条目可能没有校验和；merge 模式不强制要求校验和。若仍要安装此类条目，请将 [`locked_require_checksum`](/configuration/settings.html#locked_require_checksum) 设为 `false`：

```sh
MISE_LOCKED_REQUIRE_CHECKSUM=0 mise install --locked
```

To make locked mode your personal default, set
[`locked = true`](/configuration/settings.html#locked) in your global config.
Locked mode reads the lockfile, so it fails when `lockfile = false`.

### 指定锁定范围

默认情况下，`--locked`、`MISE_LOCKED=1` 和 `locked = true` 会应用于项目、用户全局和系统配置中的工具。若某些配置范围有意使用滚动版本或由发行版管理的工具，可通过 [`locked_scopes`](/configuration/settings.html#locked_scopes) 将其排除：

```toml [~/.config/mise/config.toml]
[settings]
locked = true
locked_scopes = ["project"]
```

有效范围为 `project`、`global` 和 `system`。在命令行或环境变量中指定的工具仍会被锁定，因为它们不属于任何配置范围。排除某个范围只会放宽该范围的锁定模式；若该范围存在锁文件，mise 仍会使用它。如果全局工具应被锁定但锁文件中缺少对应条目，请运行 `mise lock --global`。`locked_scopes` 仅限全局配置设置，因此项目无法削弱你的锁定策略。

### 锁定单个配置根目录

若只要求某个配置根目录中的工具具有锁定条目，请改为设置 `tool_config.locked`：

```toml [mise.toml]
[tool_config]
locked = true

[tools]
node = "24"
```

此策略涵盖该根目录下所有配置（例如 `mise.toml` 和 `mise.local.toml`）声明的工具，并分别使用各自的锁文件检查。继承自全局配置或父配置根目录的工具仍遵循原有策略。即使 `locked_scopes` 排除了该范围，此策略仍然生效。

### 准备各平台条目

对于会记录 URL 的后端，请为安装这些工具的每个平台添加条目：

```sh
mise lock                                    # refresh the platforms already in the file
mise lock --platform linux-x64,macos-arm64   # add or refresh specific platforms
```

不传入 `--platform` 时，如果设置了 [`lockfile_platforms`](/configuration/settings.html#lockfile_platforms)，`mise lock` 会使用其中指定的平台并加入当前平台；否则会刷新锁文件中已有的平台，或为新锁文件写入常见平台条目。[锁定工具存根](/dev-tools/tool-stubs.html#locked-tool-stub)遵循相同规则，并使用所属项目的 `mise.lock`。

## CI 和 Docker 中的锁文件 {#ci-cd}

在 CI 作业和 Docker 构建中提交 `mise.lock`。除了确保各处安装相同版本，它还可以避免每次运行都查询版本。没有锁文件时，像 `node = "24"` 或 `latest` 这样的请求需要获取工具的可用版本列表，来源可能是[版本主机](/configuration/settings.html#use_versions_host)，也可能是工具的上游。全新的运行器或 Docker 层没有缓存列表，因此每个工具在下载前至少都需要一次请求。恢复的缓存只能短暂提供帮助：列表超过 [`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 指定的时长（默认为 1 小时）后，`mise install` 会重新获取列表。工具存在匹配的锁文件条目时，mise 会直接使用其中的版本并跳过查询。

为所有会运行这些工具的平台创建锁定条目，包括 CI 运行器、开发者机器和 Docker 镜像：

```sh
mise lock --platform linux-x64,linux-arm64,macos-arm64
```

提交 `mise.lock`；如果 mise 为[依赖关系图](#dependency-graphs)创建了 `.mise/locks/`，也一并提交。然后运行：

```sh
mise install --locked
```

仓库中存在 `mise.lock` 时，`jdx/mise-action` 会自动添加 `--locked`。在 Dockerfile 中，应在运行 `mise install` 前与 `mise.toml` 一起复制 `mise.lock`；若锁文件记录了依赖关系图，也要复制 `.mise/locks/`。详见 [Docker](/mise-cookbook/docker.html#installing-project-tools)。

完整工作流示例见[持续集成](/continuous-integration.html)。

## 后端支持

锁文件条目记录的内容取决于后端。请检查目标工具和平台对应的生成条目。

| 后端                                                                                                | `mise.lock` 记录的内容                                                                                     |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| aqua, github, gitlab, forgejo, http, s3                                                            | A URL per platform and a checksum where the release provides one or mise can compute it                   |
| packslip                                                                                           | URL and checksum per platform, and the signer the project committed to; policy is checked at installation |
| conda                                                                                              | URL and checksum per platform, and the package's dependencies                                             |
| Core tools that download archives: Bun, Deno, Elixir, Erlang, Go, Java, Node.js, Python, Ruby, Zig | A URL per platform and a checksum where one is available                                                  |
| core:swift                                                                                         | URL and checksum per platform and Linux distro; locked mode does not require the URL                      |
| npm (embedded aube) and pypi (uv)                                                                  | The version, plus a [dependency graph](#dependency-graphs) in format version 2 and later                  |
| cargo, dotnet, gem, go, spinel, core:dotnet, core:rust                                             | The top-level version only; the language's installer resolves dependencies and build inputs               |
| vfox tool plugins                                                                                  | URLs that the plugin's hooks return, which locked mode requires                                           |
| asdf and vfox backend plugins                                                                      | The version only; the plugin performs the installation                                                    |
| spm                                                                                                | 版本；从制品包安装时还会记录软件包的 URL 和校验和 |

锁定模式不要求 `asdf`、`cargo`、`dotnet`、`gem`、`go`、`npm`、`pypi`（`pipx`）、`spinel`、`spm`、`ubi`、`core:dotnet`、`core:rust`、`core:swift` 和 vfox 后端插件提供 URL。它们大多不会记录 URL；`spm`（安装制品包时）和 `core:swift` 会记录 URL 及校验和，且仍会验证已记录的校验和。豁免仅适用于制品 URL；npm 和 PyPI 依赖图有各自的检查。

A `provenance` field is not proof that mise verified the bytes; see
[provenance and verification](#provenance-and-security).

### 来自 mise-versions 的校验和 {#checksums}

对于公开的 GitHub 仓库，`mise lock` 会从 [mise-versions](/configuration/settings.html#use_versions_host) 读取发布元数据，包括每个制品的校验和，并在不下载制品的情况下记录下来。此类校验和会标记为：

```toml [mise.lock]
[tools.ripgrep."platforms.linux-x64"]
checksum = "sha256:…"
checksum_source = "mise-versions"
url = "https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz"
```

mise 会像验证其他校验和一样，在实际下载后将标记的校验和与文件进行比较，但绝不会使用它来复用已缓存的下载。否则 mise-versions 可能决定从[下载缓存](#restored-caches)中安装哪个文件。`mise lock` 在锁定时为来源证明检查而对照下载验证的校验和不会带此标记。较旧版本的 mise 会忽略此字段。

## Dependency graphs

Format version 2 and later lock the transitive dependencies of npm and PyPI
tools, not only their top-level version. mise stores each graph in the package
manager's own format, `aube-lock.yaml` for npm tools installed with embedded aube
and `uv.lock` for PyPI tools when uv 0.12.10 or newer is installed, in a sidecar
directory (`.mise/locks/` by default). `mise.lock` records the directory and a
digest of the graph. Commit the sidecar directory with `mise.lock`;
`mise lock --sidecars` lists it.

`mise lock --bump npm:prettier` refreshes a tool's dependency graph even when its
top-level version does not change, and `mise install --locked` replays the
recorded graph without resolving dependencies again. Projects that lock
different graphs for the same package version get separate installations.
Lifecycle scripts can still produce different output on each machine. See
[native dependency sidecars](/dev-tools/mise-lock-reference.html#native-dependency-sidecars)
for the layout and for editing sidecars, and the [npm](/dev-tools/backends/npm.html)
and [PyPI](/dev-tools/backends/pypi.html) backend pages for installer limits.

## Restored caches and installed tools {#restored-caches}

::: warning
`mise.lock` 验证的是 mise 下载的内容，而不是磁盘上已有的文件。恢复的 CI 缓存或共享解压目录会被直接信任。
:::

mise can't validate an installed tree against the lockfile. The checksum covers
the downloaded artifact, and installs are mutable on purpose: tools update
themselves and `postinstall` hooks change files. For tools compiled from source,
such as Ruby, the lockfile doesn't vouch for the compiled output, and a tool
that downloads its own source may record no checksum for it at all.

下载文件的缓存规则不同。mise 只会在服务器确认文件未变，或文件哈希与固定校验和一致且下载自同一 URL 时复用缓存。锁文件校验和不会让 mise 复用由其他 URL 提供的文件；来自 [mise-versions](#checksums) 的校验和则完全不会复用缓存文件。固定校验和总会在下载后验证；如果没有固定校验和，则任何人都能写入的缓存都会被视为可信。使用 `--locked` 时，只会复用带固定校验和的下载，因此可安全信任恢复的下载缓存。详见 [`download_cache`](/configuration/settings.html#download_cache) 和 [在 CI 中缓存下载](/continuous-integration.html#trusted-cache)。

So treat a cache of installed files as trusted build input:

- Don't restore caches written by untrusted refs or triggers.
- Record a manifest of the cache outside it, in trusted CI metadata, and check
  the restored files against it. A manifest stored in the cache can be replaced
  along with it. That proves the cache is unchanged since CI saved it, not that
  it matches the lockfile.
- To check an install against the lockfile, run `mise install --locked` with an
  empty data directory. Every artifact is then downloaded and checked against
  the checksum the lockfile records, for the backends that record one.

## Provenance and verification {#provenance-and-security}

对于受支持的后端，`mise lock` 会记录 SLSA、Cosign、Minisign 或 GitHub 制品证明等来源信息。mise 会先针对每个目标平台的制品验证新的来源信息，再写入锁文件。若 aqua 软件包声明支持 GitHub 制品证明以及 Cosign、Minisign 或 SLSA，那么在没有制品证明的发布中，`mise lock` 也会像安装时一样，先通过其他验证才能记录。

已记录的来源信息与校验和绑定。如果锁定版本的制品发生变化，而 mise 无法为新字节确认相同的来源信息，`mise lock` 会失败并保留原条目。确认发布真实可信后，再从 `mise.lock` 中删除该条目以锁定新制品。

When an entry has both a checksum and provenance, `mise install` can skip
repeating the provenance check. That makes the lockfile a trust input: review
changes to it, and take it only from a trusted project source. Checksums are
still verified on every download.

To repeat provenance checks on every install, set
[`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance),
which [paranoid mode](/paranoid.html) also turns on:

```sh
MISE_LOCKED_VERIFY_PROVENANCE=1 mise install
```

这会对正在安装的制品重新运行受支持的验证。但它不会为从未发布来源信息的版本生成来源信息；已安装的工具也可能不会再次下载。此设置与 packslip 签名者和签名列表策略相互独立。

## 最短发行等待时间

即使 `mise.lock` 中记录的版本比 [`minimum_release_age`](/security.html#minimum-release-age) 所允许的时间更新，仍然可以安装；此限制仅在 mise 选择新版本时生效。npm 和 PyPI 工具解析锁文件未记录的传递依赖时，也会应用此限制。

## 故障排查

### 校验和不匹配 {#regenerating-checksums}

校验和不匹配表示下载内容与锁文件记录的制品不同。请检查错误信息和锁文件中的工具、平台、URL 及后端选项。供应商可能替换了制品，镜像站可能提供了不同内容，或锁文件条目可能对应另一个构建版本。

确认上游有意更改后，只刷新该工具的条目并检查差异：

```sh
mise lock node
git diff -- mise.lock
```

不要为了绕过错误而删除校验和或卸载所有工具。如果新制品并非预期内容，请保留现有锁文件，并在接受新内容前调查该版本发行情况。

### `mise lock` 未找到工具

`No tools configured to lock` 表示当前配置根目录没有声明可写入锁文件的工具。如果全局配置中声明了工具，提示信息会说明这一点；请使用 `mise lock --global` 锁定它们。`.tool-versions` 中的工具不会被锁定。参见[工具使用哪个锁文件](#which-lockfile-a-tool-uses)。

### 锁文件冲突

多个分支更改了相同工具时：

1. 先解决 `mise.toml` 冲突，保留所需的版本请求。
2. 在 `mise.lock` 中为每个冲突条目任选一侧保留，然后运行 `mise lock`，根据合并后的请求重写条目。提交该命令产生的旁文件变更。
3. 运行 `mise install --locked` 和项目检查，然后提交更改。
