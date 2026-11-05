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
- `[tools]` 条目，其值为版本字符串或版本字符串数组，工具名称中不含选项（`"tool[opt=value]"`），且不使用 [`path:`](/dev-tools/versions.html) 版本（它会将目录加入 `PATH`，但不会安装工具）
- `[tasks]`, as long as no task lists `secrets`

Anything else needs trust, including tool option tables, `[env]`, `[hooks]`,
`[settings]`, `[tool_alias]` and `include`. mise ignores the `[settings]` of a
config that is not trusted, so a repository cannot change mirrors, build
commands or other settings before you trust it. Other files follow the same
idea:

- `.tool-versions` 仅在包含模板语法、内联工具选项（例如 `node[postinstall=...] 24`）或 `path:` 版本时需要信任。
- `.nvmrc` 等惯用版本文件仅在包含 `path:` 版本时需要信任。
- 项目的 [`mise.lock`](/dev-tools/mise-lock.html) 会与配置一起读取。在配置受信任前，锁文件只能固定版本和校验和：如果条目将工具锁定到不同于工具键或注册表所选的后端，或添加了选项，mise 会忽略该条目；下载仍会使用后端通常采用的位置，而非锁文件中的 URL 和依赖图。
- 任务文件（包括 [`task_config.includes`](/tasks/task-discovery.html) 中的 TOML 文件）仅在包含模板语法或列出 `secrets` 时需要信任。`mise lock` 解析带选项的任务工具前仍会询问信任，与工具选项表相同。
- [工具桩](/dev-tools/tool-stubs.html)无需信任即可运行，因为运行它本身就代表你已批准。`mise lock` 也会读取 `mise.lock` 的 `tool-stubs` 列表中的工具桩，此时项目配置必须受信任。在安全模式下，这些工具桩的选项不会生效。
- [`.miserc.toml`](/configuration.html#miserc) 无需信任。它只保存用于选择要加载哪些配置文件的早期设置，mise 会从当前目录向上查找它。项目的 `env` 列表可以添加环境，但不能删除或重排全局或系统 `miserc.toml` 选择的环境。项目环境排在全局环境之后，并会覆盖它们，因此全局环境只能保护项目配置无法设置的选项，例如 `paranoid`。项目文件能设置的其他键会影响加载哪些项目文件，以及 mise 向上查找配置的范围，但无法隐藏全局或系统配置。全局和系统 `conf.d` 片段只遵循各自的 `env_conf_d`。项目 `.miserc.toml` 中的模板看不到环境变量，只能使用 `if` 语句和少量函数及过滤器，因此无法泄露环境或让 mise 卡住；详见[.miserc.toml 中的模板](/templates.html#miserc-template-support)。

无需信任即可加载的任务，在实际运行前不会执行任何内容。项目受信任前，Shell 补全不会运行任务参数 usage spec 中可指定的命令，包括 `complete run=`、`complete delegate=`、`choices run=` 和 `mount`。

[Paranoid mode](/paranoid.html) removes these exemptions apart from
`.miserc.toml`: every other config file outside global and system config needs
trust.

### When mise asks

When a command needs a config that is not trusted:

- In a terminal, mise asks
  `mise config files in <dir> are not trusted. Trust them?` with Yes, No and
  All, where All answers yes to every prompt in that command. No adds the
  directory to an ignore list, and mise skips that config without asking again
  until you run `mise trust` on it.
- Without a terminal, such as in a script or an editor extension, mise cannot
  ask, so the command fails with
  [`Config files in <path> are not trusted`](/errors.html#untrusted-config).
- Shell activation never asks. It skips the untrusted config, warns
  `<path> is not trusted, run mise trust to enable it`, and still applies the
  trusted ones.
- Commands that read every tracked config, such as `mise prune`, skip untrusted
  ones.

`mise trust --show` lists the trust status of the config directories from the
current directory up. A config that needs no trust still shows as `untrusted`.

### Implicit trust

Some commands trust the config they load without asking, because running them
is already a decision to run the project's code. In normal mode outside CI,
these are `mise run`, task shorthand such as `mise build`, `mise install`,
`mise exec`, `mise watch`, and `mise daemons start`, `restart` and `register`.
它们会记录所加载的每个非全局配置的信任状态，包括上级目录中的配置，效果与运行 `mise trust` 相同。忽略列表中的配置仍会被忽略。此类命令仅请求自身帮助（例如 `mise run --help`）时不会记录信任；mise 代你启动的命令也不会记录，例如 shim 为工具运行的 `mise x`，或任务 hook 运行的 `mise run`。

mise also trusts a config file when it writes one, for example with
[`mise use`](/cli/use.html) 或 [`mise set`](/cli/set.html)。信任范围覆盖该文件的整个配置根目录，因此如果其中还有其他配置文件尚未受信任（例如 `mise.local.toml` 或 `mise.staging.toml`），mise 会像加载该文件时一样先询问信任。在安全模式下，写入操作不会记录信任。

### CI and `--yes`

When mise detects CI, for example because `CI` is set, it treats every config as
trusted and records nothing. Configs on the ignore list or under
[`ignored_config_paths`](/configuration/settings.html#ignored_config_paths) still
do not load. `CI` also turns on [`yes`](/configuration/settings.html#yes).

Outside CI, `--yes` or `MISE_YES=1` answers the trust prompt with yes, which
records trust. Paranoid mode turns off both the CI exemption and `--yes` for
trust.

### Manage trust

```sh
mise trust --show              # trust status from here up
mise trust                     # trust the nearest untrusted config
mise trust path/to/mise.toml   # trust a reviewed file
mise trust --all               # trust configs here, above and below
mise trust --untrust           # remove trust
mise trust --ignore            # never load this config
```

普通模式下，信任状态属于配置根目录，通常是包含 `mise.toml` 的目录，因此会涵盖其中所有配置文件，例如 `mise.local.toml` 或 `.mise/config.toml`。如果 `mise/`、`.mise/` 或 `.config/` 目录本身是 Git 仓库（例如受跟踪的 `~/code/.config`），也适用此规则。
`mise trust --all` walks subdirectories, skipping hidden and gitignored ones and
`node_modules`, `vendor`, `target`, `dist` and `build`. Trust records are kept in
the [state directory](/directories.html). See [`mise trust`](/cli/trust.html)
for every flag.

信任记录使用解析后的路径。如果符号链接配置（例如由 GNU Stow 安装的配置）在运行 `mise trust` 后仍显示为不受信任，请信任实际文件路径。

### 按路径设置信任

以下两个设置根据路径决定信任状态：

- [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)
  trusts configs under these paths without a prompt, including projects you
  create there later. It overrides the ignore list, and `["/"]` trusts
  everything. It is global-only.
- [`ignored_config_paths`](/configuration/settings.html#ignored_config_paths)
  stops configs under these paths from loading. It overrides
  `trusted_config_paths` and `mise trust`. mise reads it before it looks for
  config files, so set it in a [`.miserc.toml`](/configuration.html#miserc) or
  in `MISE_IGNORED_CONFIG_PATHS`。项目的 `.miserc.toml` 不能忽略全局或系统配置。

```toml
# ~/.config/mise/config.toml
[settings]
trusted_config_paths = ["~/src/work"]
```

### 单仓库根目录

普通模式下，信任包含 `monorepo_root = true` 的配置，也会信任其目录下的所有配置文件，因此应将子项目配置一并纳入仓库审核。详见 [Monorepo 任务](/tasks/monorepo.html)。偏执模式下，信任根配置只会信任该文件本身。

普通模式下，信任包含 `monorepo_root = true` 的配置，也会信任该目录下的所有配置文件，因此应将子项目配置一并纳入仓库审核。子项目配置只有在根配置仍受信任时才保持受信任：对根目录运行 `mise trust --ignore`，或移除覆盖该目录的 `trusted_config_paths` 条目后，子项目配置需要重新单独信任。详见[Monorepo 任务](/tasks/monorepo.html)。偏执模式下，信任根配置只会信任该文件本身。

链接的 Git worktree 中的配置，如果主 checkout 中相同路径的配置已受信任，也会被信任。在 worktree 中运行 `mise trust --untrust` 时，mise 会警告该文件仍因上述原因保持受信任；如要阻止加载，请在该 worktree 中运行 `mise trust --ignore`。偏执模式不会在 worktree 之间共享信任状态。

<a id="safe-mode"></a>

仓库必须将工作树登记在其当前路径下：如果 `.git` 文件只指向仓库中的某个工作树，就不会共享信任状态。手动移动工作树后，请运行 `git worktree repair`。主 checkout 中的路径若本身是符号链接，或位于符号链接之下，也不会共享信任；请直接信任该工作树的配置。

## Safe mode

当自动化流程必须读取其无法控制的配置时（例如在 pull request 分支上解析工具版本的机器人），请设置 `MISE_SAFE=1`。安全模式会在不询问信任状态的情况下加载项目配置，同时禁止这些配置在 mise 解析版本时运行代码或更改环境：

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json
```

移除 `--dry-run` 即可更新锁文件。安全模式不会让命令自动变为只读。[`safe`](/configuration/settings.html#safe) 设置只能用于全局配置，因此项目不能自行将其关闭。

安全模式适用于解析和元数据命令，例如 `mise lock`、`mise ls`、`mise env` 和 `mise outdated`。

::: warning
安全模式并不会让其他命令在未经审核的配置上运行变得安全。`mise install` 可能会从源码构建工具，并运行工具的构建脚本，例如 `cargo:` crate 的 `build.rs`。
:::

### Refused operations

These fail with `<operation> is disabled in safe mode (MISE_SAFE=1)`:

- 任何配置中的模板函数 `exec()`、`read_file()`、`read_json()`、`read_yaml()`、`read_toml()`、`get_env()`，过滤器 `hash_file`、`file_size`、`last_modified`、`canonicalize`，以及测试 `dir`、`file`、`exists`。
- Running tasks.
- 工具选项 `postinstall` 和 `install_env`，以及 `spm:` 后端的 `install_command`。
- asdf plugin scripts, so tools from the `asdf:` backend cannot list or install
  versions.
- 发往 S3 的请求会使用你的 AWS 凭据签名，因此 `s3:` 后端的工具无法列出或安装版本。
- Installing plugins. vfox plugins that are already installed or built in still
  run, because the operator chose them.
- mise secrets: `[secrets]` sources, `mise secrets ls`, tasks that list
  `secrets`, and `--secrets` and `--secrets-all` on `mise run` and `mise exec`.
- `mise daemons` commands and task daemons.
- The diagnostic commands in `[doctor.checks]` that `mise doctor project` runs.

### Ignored configuration

These are skipped without an error, so resolution commands keep working:

- Hooks and `[[watch_files]]` entries from every config, including global
  config, and bootstrap hooks, as with `--no-hooks`.
- Project `[env]`, `[vars]` and environment directives such as `_.path` and
  `_.file`.
- 项目中的 `path:` 工具版本，以及指向此类版本的项目 `[tool_alias]` 版本。
- 模板无法访问运行 mise 的进程环境：全局和系统配置文件之外的模板中，`env` 为空，因此仓库不能将你的凭据写入 mise 请求的 URL、`mise.lock` 或命令输出。模板读取没有 `default` 的变量时会失败，与变量未设置时相同。此规则也适用于项目 `.miserc.toml`。之后由后端渲染全局或系统配置中的工具选项时（包括全局 `[tool_alias]`），仍可访问 `env`。
- `_.source` in every config, including global config.
- Project `[shell_alias]`.
- 项目任务 usage spec 中由 Shell 补全运行的命令。
- 项目 `[wrappers]` 和 `rust` 工具的 `mr_boxington` 选项。
- 项目配置选择的主机不会使用你的凭据：项目 `api_url` 不会获得 GitHub、GitLab 或 Forgejo 令牌（除非全局配置指定了相同主机）；项目配置声明的工具也不会获得 `~/.netrc` 中针对其 `url`、`checksum_url`、`version_list_url`、`version_date_url` 或 `api_url` 所指主机的凭据。全局和系统配置中的工具仍可使用这些凭据。因此，项目指向私有代码托管服务或文件服务器时，无法在该处列出或下载版本。
- 如果全局配置声明了某个工具，项目就不能为它设置 `[tool_alias]`，以免仓库将你的工具指向其他后端、选项或版本。
- 项目[延迟安装工具](/dev-tools/shims.html#lazy-tools)：mise 不会为其命令写入 shims，也不会在首次使用时安装它们。
- Project `[settings]`, so a repository cannot turn off verification or redirect
  a backend.
- Remote `include` entries in project config, which mise does not fetch.
- 项目配置中的远程任务文件（`file = "https://…"` 或 `git::…`）。其任务仅根据 TOML 内容列出。
- 项目 `[deps]`，因此 `mise deps` 和 `mise exec` 不会运行仓库的依赖提供程序；全局和系统配置中的提供程序仍会运行。
- Project daemon declarations. Daemons also do not start or stop when you change
  directories.
- Project `[bootstrap]`, `[dotfiles]` and `[dotfile_groups]`, and the
  `[bootstrap] config_roots` a project selects, because applying them writes
  files into your home directory, clones repositories and installs packages.
  [`mise bootstrap`](/cli/bootstrap.html) and
  [`mise dotfiles`](/cli/dotfiles.html) name the skipped files, still apply the
  ones in global and system config, and refuse `mise dotfiles apply --prune`
  while a project declares dotfiles they ignore.

Global and system config still applies, apart from these rules. Review it and the
environment of the process that runs mise.

### What still works

Version resolution keeps working for backends that query HTTP APIs, such as core
tools, `aqua:`, `github:`, `gitlab:`, `http:`, `cargo:`, `pypi:`, `gem:`,
`dotnet:` and `npm:`. The `go:` backend runs `go list` with
`GOTOOLCHAIN=local`, so a project's `go.mod` cannot make Go download another
toolchain. 列出已安装工具和刷新 `mise.lock` 的操作仍可照常使用，但如果项目 `mise.lock` 的符号链接指向其目录之外，就不会通过该链接写入。

即使在偏执模式下，安全模式也会在不询问或报错的情况下加载不受信任的配置。退出安全模式后，这些配置仍不会被标记为受信任，即使命令（例如 `mise use` 或 `mise set`）修改了它们。语法错误和被拒绝的操作仍会失败。

Safe mode limits what project config can do. It is not an operating-system
sandbox for mise, its network requests or the plugins the operator installed.
Use [sandboxing](/sandboxing.html) to restrict the commands mise starts.

## Download verification

<a id="software-verification"></a>

mise 执行哪些检查，取决于所用后端以及上游项目发布的内容。校验和用于确认文件字节与预期摘要一致；签名或来源证明检查还会将制品关联到签署者或构建流程。预期校验和、密钥或身份信息必须来自可信来源。

要查看某个工具适用哪些检查，请运行 [`mise tool`](/cli/tool.html)，查看 `Security` 行：

```sh
mise tool jq
# Security: checksum (sha256), github_attestations
```

| 后端或工具                  | 检查项目                                                                                                                                     | 设置和选项                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aqua:`                     | Checksums, Cosign and Minisign signatures, SLSA provenance and GitHub artifact attestations, as the aqua registry declares them for the tool | [`aqua.cosign`](/configuration/settings.html#aqua.cosign), [`aqua.minisign`](/configuration/settings.html#aqua.minisign), [`aqua.slsa`](/configuration/settings.html#aqua.slsa), [`aqua.github_attestations`](/configuration/settings.html#aqua.github_attestations)                                                                                            |
| `github:`                   | GitHub artifact attestations when a github.com release publishes them; SLSA provenance when the tool names its signer                        | [`github.github_attestations`](/configuration/settings.html#github.github_attestations), [`github.slsa`](/configuration/settings.html#github.slsa), and the [`github_attestations`](/dev-tools/backends/github.html#github-attestations) and [`slsa_signer_identity`](/dev-tools/backends/github.html#slsa-signer-identity-and-slsa-signer-issuer) tool options |
| `packslip:`                 | A signed release manifest, artifact digests and a pinned signer; see [verification and policy](/dev-tools/packslip-verification.html)        | [Tool options](/dev-tools/backends/packslip.html#tool-options)                                                                                                                                                                                                                                                                                                  |
| Node.js                     | `SHASUMS256.txt` 中的校验和及其 OpenPGP 签名；非官方构建除外，其他发布必须提供签名 | [`node.verify`](/configuration/settings.html#node.verify)、[`node.gpg_verify`](/configuration/settings.html#node.gpg_verify) |
| `npm:`                      | 选择启用，仅适用于内置 aube：如果工具自身的软件包发布了 Sigstore 来源证明，则进行验证 | [`npm.provenance`](/configuration/settings.html#npm.provenance) |
| Swift on Linux              | OpenPGP signatures                                                                                                                           | [`swift.gpg_verify`](/configuration/settings.html#swift.gpg_verify)                                                                                                                                                                                                                                                                                             |
| Zig                         | Minisign signatures, always                                                                                                                  | None                                                                                                                                                                                                                                                                                                                                                            |
| Precompiled Ruby and Python | GitHub artifact attestations                                                                                                                 | [`ruby.github_attestations`](/configuration/settings.html#ruby.github_attestations), [`python.github_attestations`](/configuration/settings.html#python.github_attestations)                                                                                                                                                                                    |

这些检查默认开启，`npm:` 检查除外，它需要选择启用。将全局
[`github_attestations`](/configuration/settings.html#github_attestations) or
[`slsa`](/configuration/settings.html#slsa) setting to `false` turns that check
off for the `aqua:` and `github:` backends. For precompiled Python and Ruby,
`github_attestations` is only the default, and an explicit
`python.github_attestations` or `ruby.github_attestations` overrides it.

mise verifies OpenPGP, Cosign, Minisign, SLSA and attestations itself, so it
needs no `gpg`, `cosign` or `gh` executable. If a check fails, read the
underlying error before you turn a setting off; see
[checksum errors](/errors.html#checksum-mismatch).

[`lockfile`](/dev-tools/mise-lock.html#provenance-and-security) 会记录校验和及 mise 验证过的来源证明，后续安装会复用该结果，而不再重复检查。设置 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 或启用[偏执模式](/paranoid.html)，可在每次安装时重新验证。两者都不会重新检查已安装的工具。`npm:` 来源证明检查不会记录到锁文件中，因此启用 [`npm.provenance`](/configuration/settings.html#npm.provenance) 后，每次安装该工具时 mise 都会验证。

mise checks its own releases too: `mise self-update` verifies each release's
signature before it replaces the binary. See
[self-update verification](/dev-tools/packslip-verification.html#self-update)
for the checks and [Updating mise](/installing-mise.html#updating) for the
commands.

## Minimum release age

mise skips versions published more recently than a cutoff when it picks a
version for a request such as `node@24` or `latest`. The default cutoff is 24
hours. The delay gives the community time to notice a compromised release; it
does not make an older release trustworthy.

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

若要在某个较新版本达到时长限制前单独安装它，可对该工具将时长设为 `0s`，例如运行 `mise upgrade --minimum-release-age 0s gh`。此标志只对当前命令生效。之后运行 `mise upgrade` 时，即使解析到较旧版本，也不会将以此方式安装的版本降级。

To exempt tools from the setting and the default, list them in
[`minimum_release_age_excludes`](/configuration/settings.html#minimum_release_age_excludes):

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
