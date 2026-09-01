# 安全性

mise 包含多项用于安装和管理工具的供应链控制措施。这些控制措施的覆盖范围取决于后端以及上游提供的元数据。

## 软件验证

mise 提供原生软件验证，无需外部依赖。
对于 aqua 工具，Cosign/Minisign 签名、SLSA 来源证明和 GitHub 工件证明会自动使用 mise 的内置实现进行验证。Node.js 和 Swift 下载的 OpenPGP 签名验证同样内置，无需外部的 `gpg` 二进制文件。

要配置 aqua 验证（默认已启用）：

```sh
# 如有需要，可禁用特定的验证方法
export MISE_AQUA_COSIGN=false
export MISE_AQUA_SLSA=false
export MISE_AQUA_GITHUB_ATTESTATIONS=false
export MISE_AQUA_MINISIGN=false
```

有关锁定文件校验和及来源证明行为，请参阅 [mise.lock](/dev-tools/mise-lock.html)。

## 安全模式

安全模式（`MISE_SAFE=1`，或 [`safe`](/configuration/settings.html#safe) 设置）是防止**项目配置执行代码**的一道硬边界。它用于在针对不受你控制的配置运行 mise 时提供保护——尤其是刷新拉取请求分支上的 `mise.lock` 的自动化任务，例如定期运行的 `mise lock --bump` 任务（参见[更新锁定版本](/dev-tools/mise-lock.html#bumping-locked-versions)）。

```sh
# 从不受信任的配置中解析工具版本，但不执行其中任何内容
MISE_SAFE=1 mise lock --bump --dry-run --json
```

启用后，mise 会**拒绝并报错**（绝不会静默回退）执行以下操作：

- 在配置模板中运行 `exec()` 或 `read_file()`
- 运行钩子（像 `--no-hooks` 一样被抑制，因为钩子会从 `mise env`/`hook-env` 中以环境方式触发）
- 运行工具级别的 `postinstall` 钩子，或在安装期间应用工具级别的 `install_env`
- 运行任务
- 执行 asdf 插件脚本
- 安装插件

它还会**忽略项目配置（非全局配置）中的环境和 shell 配置**——`[env]`
值、`_.path`、`_.file` 以及 `[shell_alias]` 条目。这些配置原本会应用到你的
shell 环境中（环境变量和别名通过 `hook-env` 输出），以及 mise 在版本解析期间启动的
子进程中（例如 `go list` 或 vfox 插件钩子），这会构成间接的代码执行向量（`PATH`、`LD_PRELOAD`、
`DYLD_INSERT_LIBRARIES`、`NODE_OPTIONS` 等），而安全模式正是为了阻断这些向量。全局和系统配置（例如
`~/.config/mise/config.toml`）由操作员管理，仍然会生效，与
[信任](/cli/trust.html)模型一致。

`_.source` 会被视为代码执行，而不是环境注入，因此无论在哪里定义，在安全模式下都会被忽略——包括由操作员管理的全局配置。

项目配置（非全局配置）中的 `[settings]` 也会被忽略，因此不受信任的仓库无法在解析期间更改
mise 的行为（例如禁用验证或重定向后端）。全局/系统设置仍然会生效。未来可能会允许将特定项目设置加入白名单，前提是它们既安全又有必要。

由于在安全模式下加载的配置是惰性的——既不能执行代码，也不能注入环境——
**安全模式不要求配置受信任。** 当设置了 `safe` 后，mise 会加载不受信任的配置，而不会显示
[信任](/cli/trust.html)提示或报错，因为配置没有任何能够危害主机的操作。这使得自动化任务可以针对拉取请求中的配置运行
`mise lock`，而无需先执行 `mise trust`。

对于所有基于 HTTP 的后端——`core`、`aqua`、`github`、`gitlab`、`http`、`cargo`、`pipx`、`gem`、`dotnet` 和 `npm`——版本解析仍然有效，
`go` 也同样有效（它会以 `GOTOOLCHAIN=local` 运行，因此项目的 `go.mod` 无法触发工具链下载）。刷新
`mise.lock` 和列出已安装工具的操作也会正常工作。

已经安装的和内置的 vfox 插件也会继续工作：它们的代码由操作员选择，而不是由当前处理的仓库选择；对于尚未安装的插件，版本解析会直接短路，不会执行任何内容。

::: tip
安全模式是一道代码执行边界；它不能替代[信任](/cli/trust.html)
系统。不受信任的配置仍然需要执行 `mise trust`（或使用
[受信任的配置路径](/configuration/settings.html#trusted_config_paths)）。安全模式限制配置能够执行的操作；信任机制限制会加载哪些配置。
:::

`MISE_SAFE` 是 `global_only`，因此只能通过环境或全局配置设置——项目中的
`mise.toml` 无法为自身关闭该设置。

## 最低发布时长

为了限制供应链风险，你可以限制 mise 只安装在某个日期或时长之前发布的版本。这类似于 Renovate 的
[最低发布时长](https://docs.renovatebot.com/key-concepts/minimum-release-age/)概念：
新发布的版本会被忽略，直到其可用时间达到可配置的时长。

```toml
# mise.toml
[settings]
minimum_release_age = "7d"  # 只安装发布超过 7 天的版本
```

支持相对时长（`7d`、`6mo`、`1y`）和绝对日期（`2024-06-01`）。对于大多数后端，这只会影响模糊版本解析，例如
`node@20` 或 `latest`。明确固定的版本（如 `node@22.5.0`）会绕过此过滤器。
在普通工具集解析期间，已安装的模糊匹配版本仍然符合条件：
`minimum_release_age` 会限制远程版本选择，但不会使已安装的版本失效。生成锁定文件时，可能会根据发布元数据重新检查已安装的模糊匹配版本。

具体能力取决于后端：

| 能力                                           | 后端                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 顶层版本过滤                                   | 提供发布时间的后端，例如 `aqua:`、`cargo:`、`github:`、`gitlab:`、`go:`、`npm:`、`pipx:` 以及许多核心工具 |
| 安装期间的传递依赖过滤                         | `npm:` 和 `pipx:`                                                                                                                     |

没有时间戳的版本默认会被包含。没有传递依赖支持的后端仍然可以选择较旧的顶层工具版本，但不会限制其安装器或编译器获取的依赖项。

有关 `npm:` 和 `pipx:` 传递依赖支持的详细信息，请参阅
[npm 后端文档](/dev-tools/backends/npm.html)和
[pipx 后端文档](/dev-tools/backends/pipx.html)。

你还可以按工具设置 `minimum_release_age`，以覆盖全局设置：

```toml
# mise.toml
[settings]
minimum_release_age = "7d"  # 所有工具的默认值

[tools.trivy]
version = "latest"
minimum_release_age = "1d"  # trivy 更新对时效性要求较高，使用较短的时间窗口
```

优先级：`--minimum-release-age` CLI 标志 > 工具级 `minimum_release_age` > 全局
`minimum_release_age` 设置。

使用 `minimum_release_age_excludes` 可将工具或后端排除在全局/默认设置之外：

```toml
[settings]
minimum_release_age = "7d"
minimum_release_age_excludes = ["trivy", "npm:*"]
```

排除项可以匹配类似 `npm:*` 的后端通配符、类似 `trivy` 的工具简写，或类似 `npm:prettier` 的完整后端
ID。匹配的工具会跳过全局设置和内置默认值。即使工具匹配排除列表，按工具设置的
`minimum_release_age` 选项和 CLI 标志仍然会生效。来自多个配置文件的排除项会合并并去重，因此项目配置可以添加排除项，而无需重复全局配置中的排除项。

请参阅
[`minimum_release_age`](/configuration/settings.html#minimum_release_age)了解设置参考。
