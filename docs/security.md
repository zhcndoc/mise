---
description: "控制哪些项目配置可以运行代码、验证下载、延后新版本并限制 mise 启动的命令。"
socialDescription: "管理配置文件信任、下载验证、新版本延迟和命令限制。"
---

# 安全概览

mise 的每项安全控制都针对一个阶段，涵盖从加载项目配置到运行配置启动的命令。最先遇到的通常是[配置文件信任](#configuration-trust)：mise 会先征求许可，再允许运行仓库配置中的代码。

## mise 防护的风险

| 风险                                                                     | 控制措施                                        | 默认状态                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| 进入仓库或在其中运行 mise 时，仓库配置执行了代码                       | [配置文件信任](#configuration-trust)              | 开启                                                         |
| 自动化流程必须读取他人编写的配置                                        | [安全模式](#safe-mode)                            | 关闭；设置 `MISE_SAFE=1` 启用                                |
| 受信任的配置在审核后发生了变化                                          | [偏执模式](/paranoid.html)                        | 关闭                                                         |
| 下载内容遭到篡改或替换                                                  | [下载验证](#download-verification)                | 后端和上游项目支持时开启                                     |
| 新发布的版本存在恶意内容                                                | [最低发布时长](#minimum-release-age)              | 所有[后端](#which-backends-have-a-default) 默认延迟 24 小时  |
| 任务或命令读取、写入或访问了超出所需范围的内容                          | [沙箱](/sandboxing.html)                          | 关闭；仅支持 Linux 和 macOS                                  |
| 密钥进入了 Shell、日志或不需要它的进程                                  | [密钥](#secrets)                                  | 选择启用                                                     |

每项控制措施都有各自的作用范围。信任配置不会验证上游发布内容；为任务启用沙箱，也不会在 mise 解析配置时为 mise 本身启用沙箱。

这些控制措施不会替你审核所安装的软件。工具、软件包、asdf 插件或 vfox 插件安装后，会以你的权限运行。全局和系统配置（例如 `~/.config/mise/config.toml`）归你所有，因此 mise 不会征求许可，直接信任它们。mise 本身以你的用户身份运行，且没有沙箱保护。

## 配置文件信任

项目配置可以运行代码。模板可以调用 `exec()`，hook 和 `[env]` 指令可以运行命令或更改 `PATH` 等变量，`postinstall` 等工具选项也会运行脚本。只有配置受信任后，mise 才会加载其中可能执行这些操作的内容。

### 哪些内容需要信任

不含模板语法（<span v-pre>`{{`</span>、`{%` 或 `{#`）且只包含以下内容的 `mise.toml` 不需要信任即可加载：

- `min_version`
- `[tools]` 中的条目，其值为版本字符串或版本字符串数组，且工具名中不含选项（`"tool[opt=value]"`）
- `[tasks]`，前提是没有任务列出 `secrets`

其他内容都需要信任，包括工具选项表、`[env]`、`[hooks]`、`[settings]`、`[tool_alias]` 和 `include`。mise 会忽略未受信任配置文件中的 `[settings]`，因此仓库在你信任它之前无法更改镜像、构建命令或其他设置。其他文件的处理方式如下：

- `.tool-versions` 只有包含模板语法或内联工具选项（例如 `node[postinstall=...] 24`）时才需要信任。
- `.nvmrc` 等惯用版本文件始终不需要信任。
- 任务文件（包括来自 [`task_config.includes`](/tasks/task-discovery.html) 的 TOML 文件）只有包含模板语法或列出 `secrets` 时才需要信任。
- [`.miserc.toml`](/configuration.html#miserc) 始终不需要信任。它只保存用于选择要加载哪些配置文件的早期设置，其中的模板也不能调用 `exec()`、`read_file()`、`read_json()`、`read_yaml()` 或 `read_toml()`。

[偏执模式](/paranoid.html)会取消这些例外，`.miserc.toml` 除外：全局和系统配置之外的所有其他配置文件都需要信任。

### mise 何时询问

命令需要读取尚未受信任的配置时：

- 在终端中，mise 会显示 `mise config files in <dir> are not trusted. Trust them?`，并提供 Yes、No 和 All。选择 All 会对该命令中的所有提示都回答 Yes；选择 No 会将目录加入忽略列表，mise 会跳过该配置，不再询问，直到你对它运行 `mise trust`。
- 没有终端时（例如在脚本或编辑器扩展中），mise 无法询问，因此命令会以 [`Config files in <path> are not trusted`](/errors.html#untrusted-config) 错误退出。
- Shell 激活不会询问。它会跳过不受信任的配置，显示 `<path> is not trusted, run mise trust to enable it` 警告，但仍会应用受信任的配置。
- `mise prune` 等需要读取所有受跟踪配置的命令会跳过未受信任的配置。

`mise trust --show` 会列出从当前目录到上层目录中各配置目录的信任状态。不需要信任的配置仍会显示为 `untrusted`。

### 隐式信任

有些命令会直接信任所加载的配置，不再询问，因为运行这些命令本身就表示你决定执行项目代码。在 CI 之外的普通模式下，这些命令包括 `mise run`、`mise build` 等任务简称、`mise install`、`mise exec`、`mise watch`，以及 `mise daemons start`、`restart` 和 `register`。它们会为加载的每个非全局配置记录信任状态，包括上层目录中的配置，效果等同于运行 `mise trust`。已在忽略列表中的配置仍会被忽略。

mise 写入配置文件时也会信任该文件，例如通过 [`mise use`](/cli/use.html) 或 [`mise set`](/cli/set.html) 写入时。

### CI 和 `--yes`

mise 检测到 CI（例如设置了 `CI`）时，会将所有配置视为受信任，但不会记录信任状态。忽略列表中的配置，以及位于 [`ignored_config_paths`](/configuration/settings.html#ignored_config_paths) 中路径下的配置，仍不会加载。`CI` 还会启用 [`yes`](/configuration/settings.html#yes)。

CI 之外，`--yes` 或 `MISE_YES=1` 会对信任提示回答 yes，并记录信任状态。偏执模式会同时关闭 CI 信任例外和 `--yes` 对信任提示的自动确认。

### 管理信任状态

```sh
mise trust --show              # trust status from here up
mise trust                     # trust the nearest untrusted config
mise trust path/to/mise.toml   # trust a reviewed file
mise trust --all               # trust configs here, above and below
mise trust --untrust           # remove trust
mise trust --ignore            # never load this config
```

普通模式下，信任状态以配置根目录为单位，通常是包含 `mise.toml` 的目录，因此会涵盖其中的所有配置文件，例如 `mise.local.toml`。`mise trust --all` 会遍历子目录，但跳过隐藏目录、被 Git 忽略的目录，以及 `node_modules`、`vendor`、`target`、`dist` 和 `build`。信任记录保存在[状态目录](/directories.html)中。所有标志见 [`mise trust`](/cli/trust.html)。

信任记录使用解析后的路径。如果符号链接配置（例如由 GNU Stow 安装的配置）在运行 `mise trust` 后仍显示为不受信任，请信任实际文件路径。

### 按路径设置信任

以下两个设置根据路径决定信任状态：

- [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths) 会自动信任这些路径下的配置，不再询问，也包括之后在这些目录中创建的项目。它的优先级高于忽略列表；设置为 `["/"]` 表示信任所有内容。此设置只能用于全局配置。
- [`ignored_config_paths`](/configuration/settings.html#ignored_config_paths) 会阻止加载这些路径下的配置。它的优先级高于 `trusted_config_paths` 和 `mise trust`。mise 会在查找配置文件前读取此设置，因此应将其写入 [`.miserc.toml`](/configuration.html#miserc) 或通过 `MISE_IGNORED_CONFIG_PATHS` 设置。

```toml
# ~/.config/mise/config.toml
[settings]
trusted_config_paths = ["~/src/work"]
```

### 单仓库根目录

普通模式下，信任包含 `monorepo_root = true` 的配置，也会信任其目录下的所有配置文件，因此应将子项目配置一并纳入仓库审核。详见 [Monorepo 任务](/tasks/monorepo.html)。偏执模式下，信任根配置只会信任该文件本身。

### Git 工作树

链接的 Git worktree 中的配置，如果主 checkout 中相同路径的配置已受信任，也会被信任。在 worktree 中运行 `mise trust --untrust` 时，mise 会警告该文件仍因上述原因保持受信任；如要阻止加载，请在该 worktree 中运行 `mise trust --ignore`。偏执模式不会在 worktree 之间共享信任状态。

<a id="safe-mode"></a>

## 安全模式

当自动化流程必须读取其无法控制的配置时（例如在 pull request 分支上解析工具版本的机器人），请设置 `MISE_SAFE=1`。安全模式会在不询问信任状态的情况下加载项目配置，同时禁止这些配置在 mise 解析版本时运行代码或更改环境：

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json
```

移除 `--dry-run` 即可更新锁文件。安全模式不会让命令自动变为只读。[`safe`](/configuration/settings.html#safe) 设置只能用于全局配置，因此项目不能自行将其关闭。

安全模式适用于解析和元数据命令，例如 `mise lock`、`mise ls`、`mise env` 和 `mise outdated`。

::: warning
安全模式并不会让其他命令在未经审核的配置上运行变得安全。`mise install` 可能会从源码构建工具，并运行工具的构建脚本，例如 `cargo:` crate 的 `build.rs`。
:::

### 拒绝的操作

以下操作会以 `<operation> is disabled in safe mode (MISE_SAFE=1)` 错误退出：

- 任意配置模板中的 `exec()`、`read_file()`、`read_json()`、`read_yaml()` 和 `read_toml()`。
- 运行任务。
- `postinstall` 和 `install_env` 工具选项。
- asdf 插件脚本，因此 `asdf:` 后端的工具无法列出或安装版本。
- 安装插件。已安装或内置的 vfox 插件仍会运行，因为这是操作人员主动选择的。
- mise secrets：`[secrets]` 来源、`mise secrets ls`、列出 `secrets` 的任务，以及 `mise run` 和 `mise exec` 的 `--secrets`、`--secrets-all`。
- `mise daemons` 命令和任务守护进程。
- `[doctor.checks]` 中由 `mise doctor project` 运行的诊断命令。

### 忽略的配置

以下内容会被跳过，但不会报错，因此版本解析命令仍可继续运行：

- 所有配置中的 hook 和 `[[watch_files]]` 条目（包括全局配置和 bootstrap hook），效果与 `--no-hooks` 相同。
- 项目 `[env]`、`[vars]` 和 `_.path`、`_.file` 等环境指令。
- 所有配置（包括全局配置）中的 `_.source`。
- 项目 `[shell_alias]`。
- 项目 `[wrappers]` 和 `rust` 工具的 `mr_boxington` 选项。
- 项目 `[settings]`，以防仓库关闭验证或重定向后端。
- 项目配置中的远程 `include` 条目；mise 不会获取这些内容。
- 项目守护进程声明。切换目录时也不会启动或停止守护进程。
- 项目 `[bootstrap]`、`[dotfiles]`、`[dotfile_groups]`，以及项目所选 `[bootstrap] config_roots`。应用这些配置会向主目录写入文件、克隆仓库并安装软件包。 [`mise bootstrap`](/cli/bootstrap.html) 和 [`mise dotfiles`](/cli/dotfiles.html) 会指出被跳过的文件，仍会应用全局和系统配置中的内容；如果项目声明了被忽略的 dotfiles，则会拒绝运行 `mise dotfiles apply --prune`。

除上述规则外，全局和系统配置仍会生效。请审核这些配置以及运行 mise 的进程环境。

### 仍可使用的功能

对于通过 HTTP API 查询版本的后端，版本解析仍可正常工作，例如内置工具、`aqua:`、`github:`、`gitlab:`、`http:`、`cargo:`、`pypi:`、`gem:`、`dotnet:` 和 `npm:`。`go:` 后端会使用 `GOTOOLCHAIN=local` 运行 `go list`，因此项目的 `go.mod` 无法让 Go 下载另一个工具链。列出已安装工具和刷新 `mise.lock` 也照常可用。

即使处于偏执模式，安全模式也会加载不受信任的配置，且不会提示或报错。但这不会将配置标记为受信任，因此之后未启用安全模式时仍需信任它。语法错误和被拒绝的操作仍会失败。

安全模式会限制项目配置能执行的操作，但它并不是操作系统级沙箱，无法隔离 mise、本身发出的网络请求或操作人员安装的插件。如需限制 mise 启动的命令，请使用[沙箱](/sandboxing.html)。

## 下载验证

<a id="software-verification"></a>

mise 执行哪些检查，取决于所用后端以及上游项目发布的内容。校验和用于确认文件字节与预期摘要一致；签名或来源证明检查还会将制品关联到签署者或构建流程。预期校验和、密钥或身份信息必须来自可信来源。

要查看某个工具适用哪些检查，请运行 [`mise tool`](/cli/tool.html)，查看 `Security` 行：

```sh
mise tool jq
# Security: checksum (sha256), github_attestations
```

| 后端或工具                  | 检查项目                                                                                                                                     | 设置和选项                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aqua:`                     | 按 aqua registry 对工具的声明，验证校验和、Cosign 和 Minisign 签名、SLSA 来源证明及 GitHub 制品证明                                        | [`aqua.cosign`](/configuration/settings.html#aqua.cosign)、[`aqua.minisign`](/configuration/settings.html#aqua.minisign)、[`aqua.slsa`](/configuration/settings.html#aqua.slsa)、[`aqua.github_attestations`](/configuration/settings.html#aqua.github_attestations)                                                                                                |
| `github:`                   | github.com 发布版本提供时验证 GitHub 制品证明；工具指定签署者时验证 SLSA 来源证明                                                            | [`github.github_attestations`](/configuration/settings.html#github.github_attestations)、[`github.slsa`](/configuration/settings.html#github.slsa)，以及 [`github_attestations`](/dev-tools/backends/github.html#github-attestations) 和 [`slsa_signer_identity`](/dev-tools/backends/github.html#slsa-signer-identity-and-slsa-signer-issuer) 工具选项 |
| `packslip:`                 | 验证签名的发布清单、制品摘要和固定的签署者；参见[验证与策略](/dev-tools/packslip-verification.html)                                           | [工具选项](/dev-tools/backends/packslip.html#tool-options)                                                                                                                                                                                                                                                                                                      |
| Node.js                     | 验证 `SHASUMS256.txt` 中的校验和；发布版本提供 OpenPGP 签名时也会验证签名                                                                    | [`node.verify`](/configuration/settings.html#node.verify)、[`node.gpg_verify`](/configuration/settings.html#node.gpg_verify)                                                                                                                                                                                                                                    |
| Linux 上的 Swift            | OpenPGP 签名                                                                                                                                | [`swift.gpg_verify`](/configuration/settings.html#swift.gpg_verify)                                                                                                                                                                                                                                                                                             |
| Zig                         | 始终验证 Minisign 签名                                                                                                                       | 无                                                                                                                                                                                                                                                                                                                                                               |
| 预编译的 Ruby 和 Python     | GitHub 制品证明                                                                                                                              | [`ruby.github_attestations`](/configuration/settings.html#ruby.github_attestations)、[`python.github_attestations`](/configuration/settings.html#python.github_attestations)                                                                                                                                                                                    |

默认情况下会启用这些检查。将全局 [`github_attestations`](/configuration/settings.html#github_attestations) 或 [`slsa`](/configuration/settings.html#slsa) 设置为 `false`，即可对 `aqua:` 和 `github:` 后端关闭对应检查。对于预编译的 Python 和 Ruby，`github_attestations` 只是默认值，显式设置 `python.github_attestations` 或 `ruby.github_attestations` 会覆盖它。

mise 会自行验证 OpenPGP、Cosign、Minisign、SLSA 和制品证明，因此不需要 `gpg`、`cosign` 或 `gh` 可执行文件。如果检查失败，请先阅读底层错误，再考虑关闭设置；详见[校验和错误](/errors.html#checksum-mismatch)。

[`mise.lock`](/dev-tools/mise-lock.html#provenance-and-security) 会记录 mise 验证过的校验和和来源证明，后续安装会复用该结果，而不再重复检查。设置 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 或启用[偏执模式](/paranoid.html)，可在每次安装时重新验证。两种方式都不会重新检查已经安装的工具。

mise 也会检查自身发布版本：`mise self-update` 会在替换二进制文件前验证每个版本的签名。检查方式见[自我更新验证](/dev-tools/packslip-verification.html#self-update)，更新命令见[更新 mise](/installing-mise.html#updating)。

<a id="minimum-release-age"></a>

## 最低发布时长

mise 为 `node@24` 或 `latest` 等请求选择版本时，会跳过发布距今短于设定时长的版本。默认时长为 24 小时。延迟可为社区发现遭入侵的版本留出时间，但并不能因此保证较早发布的版本可信。

```toml
[settings]
minimum_release_age = "7d" # raise the default 24h delay to 7 days
```

[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 接受相对时长（`7d`、`6mo`、`1y`）和日期（`2024-06-01`、`2024-06-01T12:00:00Z`）。设置为 `0s` 可关闭延迟。

### 哪些后端默认启用

未显式配置时，mise 会对所有后端应用 24 小时默认延迟。可使用 [`minimum_release_age_excludes`](/configuration/settings.html#minimum_release_age_excludes) 排除某个工具或后端。

后端只能筛选其已知发布日期的版本：

| 能力                                              | 后端                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 筛选工具自身的版本                                | 会报告发布日期的后端，例如 `aqua:`、`cargo:`、`github:`、`gitlab:`、`go:`、`npm:`、`pypi:` 和大多数内置工具                     |
| 筛选安装时解析的依赖                              | `npm:` 和 `pypi:`（`pipx:` 是别名）                                                                                              |

没有发布日期的版本不会被筛选。安装这类版本时，mise 会警告它无法检查截止时间，因此该版本并未被延迟；可改用会报告发布日期的后端，或排除该工具以关闭警告。其他后端可以延迟工具自身的版本，但无法延迟安装器或编译器获取的依赖。有关如何将时长限制传递给软件包管理器，请参阅 [npm](/dev-tools/backends/npm.html) 和 [PyPI](/dev-tools/backends/pypi.html) 后端页面。

### 时长限制的适用范围

mise 在必须选择版本时（例如处理 `node@24` 这样的前缀请求或 `latest`）会应用时长限制。以下版本不会被筛选：

- 明确指定的版本，例如 `node@24.0.0`。
- [`mise.lock`](/dev-tools/mise-lock.html) 中记录的版本。这样，已审核的版本选择在延迟窗口内仍可复现。`npm:` 和 `pypi:` 仍会对锁文件未记录的传递依赖应用时长限制。
- 已安装且符合请求的版本。时长限制只约束 mise 下载哪些新版本，不会停用已有版本。若要重新检查已安装版本是否符合时长限制，需在 `mise lock` 中显式配置该时长，而不能依赖默认值。

对于 `packslip:` 工具，mise 会将时长限制与已验证的发布透明日志时间进行比较；详见 [packslip 验证](/dev-tools/packslip-verification.html#minimum-release-age)。安装脚本和 `mise self-update` 会对 mise 自身的发布版本应用独立延迟，参见[安装器选项](/installing-mise.html#installer-options)和[更新 mise](/installing-mise.html#updating)。

### 单个工具的限制与排除项

可将 `minimum_release_age` 设为工具选项，为某个工具覆盖全局值：

```toml
[settings]
minimum_release_age = "7d"

[tools.trivy]
version = "latest"
minimum_release_age = "1d" # security scanner updates are time-sensitive
```

`mise install`、`mise use`、`mise upgrade` 和 `mise lock` 等命令的 `--minimum-release-age` 标志会覆盖前两者。优先级依次为：命令行标志、工具选项、设置或内置默认值。

若要让某些工具不受设置值和默认值限制，请将它们列入 [`minimum_release_age_excludes`](/configuration/settings.html#minimum_release_age_excludes)：

```toml
[settings]
minimum_release_age = "7d"
minimum_release_age_excludes = ["trivy", "npm:*"]
```

条目可以是后端通配符（`npm:*`）、工具简称（`trivy`）或完整后端 ID（`npm:prettier`）。工具选项或命令行标志仍会对已排除的工具生效。多个配置文件中的排除项会合并，因此项目可以在全局列表基础上追加条目，无需重复列出。

## 密钥

尽可能避免将密钥值写入 `mise.toml` 或 Shell 环境。[mise secrets](/environments/secrets/fnox.html)（实验性功能）会从密钥管理器获取密钥，并只将其传递给明确列出这些密钥的任务。sops 和 age 的值会像其他 `[env]` 值一样解密到环境中。如何选择方案，请参阅[密钥](/environments/secrets/)；如何在任务输出和 CI 日志中遮蔽密钥，请参阅[脱敏](/environments/secrets/#redaction)。

任务列出 `secrets` 的配置始终需要信任，安全模式也会拒绝 mise secrets。[环境缓存](/configuration/settings.html#env_cache)绝不会保存包含 age 值、sops 文件或已脱敏值的环境。

## 报告安全漏洞

请按照 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) 中的说明，通过电子邮件私下报告安全漏洞，不要在公开 issue 或讨论区中报告。SECURITY.md 还提供了用于加密报告的 PGP 密钥。修复只会合并到最新版本。
