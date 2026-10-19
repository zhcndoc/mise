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

### Monorepo

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

若要将锁定模式设为个人默认值，请在全局配置中设置 [`locked = true`](/configuration/settings.html#locked)。锁定模式会读取锁文件，因此当 `lockfile = false` 时会失败。

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
| aqua、github、gitlab、forgejo、http、s3                                                            | 每个平台的 URL；发行版提供或 mise 可计算时，还会记录校验和                                                 |
| packslip                                                                                           | 每个平台的 URL、校验和，以及项目固定的签名者；安装时会检查策略                                             |
| conda                                                                                              | 每个平台的 URL、校验和，以及软件包依赖                                                                     |
| 会下载归档的核心工具：Bun、Deno、Elixir、Erlang、Go、Java、Node.js、Python、Ruby、Zig                  | 每个平台的 URL；存在校验和时也会记录                                                                      |
| core:swift                                                                                         | 每个平台和 Linux 发行版的 URL 及校验和；锁定模式不要求提供 URL                                              |
| npm（内置 aube）和 pypi（uv）                                                                       | 版本，以及格式版本 2 起包含的[依赖关系图](#dependency-graphs)                                               |
| cargo、dotnet、gem、go、spinel、core:dotnet、core:rust                                              | 仅顶层版本；语言对应的安装器会解析依赖和构建输入                                                           |
| vfox 工具插件                                                                                      | 插件钩子返回的 URL；锁定模式要求这些 URL                                                                   |
| asdf 和 vfox 后端插件                                                                               | 仅版本；安装由插件执行                                                                                     |
| spm                                                                                                 | 仅版本                                                                                                     |

对于 `asdf`、`cargo`、`dotnet`、`gem`、`go`、`npm`、`pypi`（`pipx`）、`spinel`、`spm`、`ubi`、`core:dotnet`、`core:rust`、`core:swift` 和 vfox 后端插件，锁定模式不要求 URL，因为这些后端不会记录 URL。此豁免仅适用于制品 URL；npm 和 PyPI 依赖关系图仍有各自的检查。

存在 `provenance` 字段并不代表 mise 已验证制品内容；参见[来源信息与验证](#provenance-and-security)。

## 依赖关系图

格式版本 2 起，锁文件会记录 npm 和 PyPI 工具的传递依赖，而不只记录顶层版本。mise 会在旁文件目录中，以软件包管理器自己的格式保存每个依赖关系图（默认目录为 `.mise/locks/`）：通过内置 aube 安装的 npm 工具使用 `aube-lock.yaml`；安装了 uv 0.12.10 或更高版本时，PyPI 工具使用 `uv.lock`。`mise.lock` 会记录目录位置和依赖关系图摘要。请将旁文件目录与 `mise.lock` 一起提交；运行 `mise lock --sidecars` 可列出该目录。

即使顶层版本没有变化，`mise lock --bump npm:prettier` 也会刷新该工具的依赖关系图；`mise install --locked` 则会按记录的关系图重新安装，不再解析依赖。同一软件包版本如果对应不同的锁定关系图，项目会分别安装。生命周期脚本在不同机器上仍可能生成不同结果。旁文件目录结构及其编辑方法见[原生依赖旁文件](/dev-tools/mise-lock-reference.html#native-dependency-sidecars)；安装器限制请参阅 [npm](/dev-tools/backends/npm.html) 和 [PyPI](/dev-tools/backends/pypi.html) 后端说明。

## 恢复的缓存和已安装工具 {#restored-caches}

::: warning
`mise.lock` 验证的是 mise 下载的内容，而不是磁盘上已有的文件。恢复的 CI 缓存或共享解压目录会被直接信任。
:::

mise 无法根据锁文件验证已安装目录。校验和只覆盖下载的制品，而安装目录本来就允许变化：工具可能自行更新，`postinstall` 钩子也会修改文件。对于 Ruby 等从源码编译的工具，锁文件不保证编译产物的内容；工具自行下载的源码也可能完全没有对应校验和。

下载文件的处理方式不同。mise 会将其保存在缓存中；只有服务器确认文件未变化，或文件哈希符合固定校验和时，才会复用缓存。下载后始终会检查固定校验和；如果没有校验和，则会信任任何可被写入的缓存。使用 `--locked` 时只会复用带固定校验和的下载文件，因此恢复的下载缓存可以安全信任。参见 [`download_cache`](/configuration/settings.html#download_cache) 和 [CI 中的下载缓存](/continuous-integration.html#trusted-cache)。

因此，应将已安装文件缓存视为可信构建输入：

- 不要恢复由不可信分支或触发事件写入的缓存。
- 在可信 CI 元数据中、缓存目录之外记录缓存清单，并用它检查恢复的文件。保存在缓存中的清单也可能随缓存一起被替换；这种检查只能证明缓存自 CI 保存后未变化，不能证明其内容符合锁文件。
- 若要根据锁文件验证安装结果，请使用空数据目录运行 `mise install --locked`。这样会重新下载每个制品，并对会记录校验和的后端检查锁文件中的校验和。

## 来源信息与验证 {#provenance-and-security}

对于受支持的后端，`mise lock` 会记录 SLSA、Cosign、Minisign 或 GitHub 制品证明等来源信息。写入之前，mise 会根据每个目标平台的制品验证新的来源信息。

如果条目同时包含校验和与来源信息，`mise install` 可以跳过重复的来源验证。因此，锁文件本身属于信任输入：请审查其变更，并只从可信的项目来源获取。每次下载时仍会验证校验和。

若要在每次安装时重新验证来源信息，请设置 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance)；[paranoid 模式](/paranoid.html)也会启用此项：

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
