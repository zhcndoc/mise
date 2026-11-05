---
description: 使用 packslip 发行版声明的 man 手册、shell 补全和代理技能，并匹配各项目当前启用的工具版本。
socialDescription: packslip 发行版中与工具版本匹配的 man 手册、补全和代理技能。
---

# man 手册、Shell 补全和技能

通过 [packslip 后端](/dev-tools/backends/packslip.html)安装的工具，可以提供 man 手册、Shell 补全和
代理技能，并随各项目当前启用的工具版本切换。发布者在发行清单中声明这些资源。使用 `packslip:`
标识安装工具即可获得它们；通过其他后端安装则不会包含这些资源。

## Man 手册

已安装工具的清单声明静态 `man` 资源时，该工具版本处于启用状态期间，mise 会将其 man 手册加入
`MANPATH`。这既适用于已激活的 Shell，也适用于 `mise exec`、`mise run` 和 `mise env` 创建的环境。
切换项目时会使用相应版本的手册。

mise 会将这些手册保存在工具安装目录下的 `.mise-packslip/man`，并将该目录加到现有 `MANPATH` 的
开头。如果之前没有设置 `MANPATH`，mise 会保留操作系统默认的手册目录。若工具由 mise 2026.9.3
或更早版本安装，请重新安装一次（`mise install --force TOOL@VERSION`）以设置其 man 手册。

Man 手册可以来自发行压缩包、单独签名的发行制品，或发行版本对应的源码仓库。`tool.1` 这类文件会
放到 `man1` 目录中，也支持 `tool.5.gz` 这类压缩手册。mise 不会安装需要通过生成器命令（`exec`）
生成的手册，也不会安装仅以 `cli-spec` 形式存在的手册。

## 补全

Shell 补全支持 zsh、bash、fish 和 PowerShell，并会跟随各项目当前启用的工具版本，因此切换版本后
无需重新安装补全。

### 使用补全

在[激活 mise](/shell-setup.html)后，只要工具在项目中处于启用状态，就可以使用该工具的补全：

```sh
mise use packslip:github.com/jdx/hk
mise exec -- hk --version
```

随后输入 `hk` 并按 Tab。hk 自带原生补全脚本，无需额外设置或安装 `usage`。mise 会在 Shell 中注册
加载器，并仅在补全命令时读取发布者提供的脚本。切换项目或工具版本时会选用匹配的补全；离开项目
后则会移除相应注册项。

<a id="manual-setup-without-shell-activation"></a>

### 手动设置，无需激活 Shell

即使没有激活 Shell，mise 也可以为清单中声明了补全的工具安装补全文件。请将 `TOOL` 替换为可执行
文件名称：

| Shell      | 命令                                               |
| ---------- | -------------------------------------------------- |
| zsh        | `mise completion zsh --tool TOOL --install`        |
| bash       | `mise completion bash --tool TOOL --install`       |
| fish       | `mise completion fish --tool TOOL --install`       |
| PowerShell | `mise completion powershell --tool TOOL --install` |

按命令打印的提示完成一次性设置，然后加载补全文件或启动新的 Shell。mise 会写入补全文件，但不会修改
Shell 配置；除非传入 `--force`，否则不会覆盖由其他程序创建的现有文件。安装后的文件会在补全命令时
调用 mise，因此更改目录或运行 `mise use` 后，下次补全就会使用该目录中启用的版本。

若要仅打印补全脚本而不安装，请省略 `--install`：

```sh
mise completion zsh --tool TOOL
```

`--tool` 接受可执行文件名称（`hk`）或工具标识（`packslip:github.com/jdx/hk`）。使用 `--install` 时，
请传入可执行文件名称，因为安装后的文件会以此命名。如果一个发行包包含多个命令，请指定需要补全的
命令。省略 `--tool` 时，[`mise completion`](/cli/completion.html) 会为 mise 本身生成补全。

<span id="static-files-usage-specs-and-generated-scripts"></span>

### 生成式补全

发布者可以提供补全文件、静态 usage CLI 规范，或用于生成其中任一种资源的命令。mise 会优先使用
补全文件，其次是静态规范，最后才是生成命令。根据 usage 规范生成的补全使用 mise 内置引擎，因此
无需安装 `usage`。

如果补全需要运行发布者提供的生成命令，mise 会按需运行，并为已安装的版本、可执行文件和 Shell
缓存成功结果。该命令可能在按 Tab 补全或直接运行 `mise completion --tool` 时执行，但不会在 Shell
启动时运行。静态补全文件会直接读取，不会写入缓存，因此只读或共享安装目录也能使用。
[`packslip.exec`](/configuration/settings.html#packslip.exec) 仅在安装期间生效；它不会阻止按需生成补全。

## 技能

技能是包含 `SKILL.md` 及相关文件的目录。安装工具时，mise 会获取发行清单中声明的技能，因此每个
工具版本都带有自己的技能。查看项目中当前启用工具提供的技能：

```sh
mise skills ls
mise skills ls --json
```

将其链接到 agent 读取技能的位置：

```sh
mise skills sync --dir .agents/skills
```

这些是指向当前启用工具版本安装目录的符号链接，并非可移植副本，因此不应提交到版本库；请让每位
开发者在自己的机器上运行 sync。mise 会在同一目录的 `.mise-skills.json` 中记录由它管理的链接。

在 Git 仓库中，sync 会将这些链接和 `.mise-skills.json` 写入仓库的 `.git/info/exclude`，并在标记为
`mise skills` 的区块中持续更新。该文件仅属于当前克隆，因此仓库内容不会更改，`git status` 也不会
提示提交这些链接。在 Git 仓库之外，以及通过链接创建的 `git worktree` 中（它会与其他工作树共用
此文件），sync 不会执行此操作。

该目录也可以包含手动编写的技能：mise 不会改动用户创建的目录或无关链接；遇到名称冲突时会报告并
跳过，Git 仍会跟踪它们。工具版本更改后再次运行 sync，即可更新链接。

<a id="choose-a-skill-directory"></a>

### 选择技能目录

Without `--dir`, sync uses the [`skills.dir`](/configuration/settings.html#skills.dir)
setting under the nearest mise project root; `--dir` overrides it for one run.

未设置时，mise 会优先使用已存在的 `.agents/skills`，其次使用已存在的 `.claude/skills`。两者都不存在时，会创建大多数代理读取的 `.agents/skills`，并为 Claude Code 创建指向它的 `.claude/skills` 符号链接。如果你更喜欢其他位置，可以自行将另一个目录链接到该位置，mise 会优先使用先找到的目录。设置 `skills.dir` 可固定使用某个目录。

改用 `mise skills sync --global` 时，则会使用主目录下的同一设置。绝对路径会按原样使用。

<a id="keep-project-links-up-to-date"></a>

### 使项目链接保持最新

将以下配置添加到项目的 `mise.toml`；若要全局应用，则添加到全局配置：

```toml
[settings.skills]
dir = ".agents/skills"
auto_sync = true
prune = true
```

启用 `auto_sync` 后，mise 会在 `mise install`、`mise use` 更改版本以及 `mise upgrade` 后执行同步。项目目录会获得项目配置声明的工具，以及由 `MISE_<TOOL>_VERSION` 变量选择的工具。只有全局配置声明的其他工具会链接到主目录下。`prune = true` 会在同步时移除 mise 创建的、指向非活动技能的链接；未启用时，过期链接会保留。若只想在某次手动运行中清理：

```sh
mise skills sync --dir .agents/skills --prune
```

自动同步要求存在 mise 项目根目录，切换目录不会触发同步。如果 agent 未发现更改，请重新加载技能。

### 技能设置 {#choose-whether-to-fetch-or-generate-skills}

| Setting                                                             | Default | Effect                                                             |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| [`skills.fetch`](/configuration/settings.html#skills.fetch)         | `true`  | Fetch declared skills during tool installation.                    |
| [`skills.dir`](/configuration/settings.html#skills.dir)             | 未设置  | 选择同步时链接到的目录。                                            |
| [`skills.auto_sync`](/configuration/settings.html#skills.auto_sync) | `false` | Sync after install, use, and upgrade within a mise project.        |
| [`skills.prune`](/configuration/settings.html#skills.prune)         | `false` | Remove stale mise-owned links during sync.                         |
| [`packslip.exec`](/configuration/settings.html#packslip.exec)       | `false` | Run the installed tool to generate a resource during installation. |

A skill can come from the artifact, a separate signed asset, or the source
repository at the release commit, and fetching it does not run the tool. A
separate asset must match its signed digest, and a mismatch is a verification
failure. A skill offered only as an `exec` command is generated during
installation when `packslip.exec` is on; that command runs the newly installed
executable and must print `SKILL.md` content.

Turning off `skills.fetch` skips fetching from then on. It does not delete
skills already fetched or existing links; run sync with `--prune` to remove
links to skills that are no longer active.

### When a declared skill is not installed

`mise skills ls` and `mise skills sync` name each skill a release declares that
is missing from the install, with the reason: `skills.fetch` is off, the skill
is generated by an `exec` command and `packslip.exec` is off, or the download
failed at install time, in which case reinstalling the tool fetches it.

## When mise runs a publisher's command {#resource-selection-and-command-execution}

If a completion or skill is available only as a command, mise runs the installed
executable with its bin directory on `PATH` and the manifest's environment
variables, in a temporary directory with no stdin. Each run has a five-second
limit and a 4 MiB output limit, and mise cleans up child processes when it ends.
Empty output, a failure, or a timeout is not cached, and mise tries the next
source. The run is not sandboxed: the
[verification checks](/dev-tools/backends/packslip.html#what-is-verified)
establish whose executable it is.

When a release offers several sources for one resource, mise prefers one
declared for the exact artifact it installed over one declared for a platform.
Among equally specific sources, it prefers a file inside the artifact, then a
separate signed asset, then a file from the source repository. The
[packslip resources guide](https://packslip.dev/docs/resources/) describes the
full selection rules for publishers.

## Troubleshooting

| Symptom                                        | Next step                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 工具通过其他后端安装                           | 使用 `mise ls` 检查，然后通过声明了该资源的发行版，使用显式 `packslip:` 标识重新安装。                                                                                                 |
| 未声明补全                                     | 确认发行版支持当前 Shell 和可执行文件。若不支持，发布者需要添加补全或 CLI 规范。                                                                                                         |
| `--install` 拒绝工具标识                       | 请传入可执行文件名称（例如 `hk`），而不是 `packslip:github.com/jdx/hk`。                                                                                                                |
| 补全文件已存在                                 | 使用 `--force` 替换前，先检查现有文件。                                                                                                                                                 |
| 脚本有输出，但按 Tab 无法补全                  | 确认 mise 已激活，且此项目启用了该工具。手动设置时，请按 `--install` 打印的说明操作。usage 派生的补全由 mise 自行处理。                                                               |
| 补全生成失败                                   | 检查发布者的命令能否在时限和大小限制内生成非空输出。若生成器有问题，请报告给发布者。                                                                                                     |
| 找不到 man 手册                               | 确认工具已启用（`mise ls --current`），且其发行版声明了 man 手册。若工具由 mise 2026.9.3 或更早版本安装，请重新安装。                                                                    |
| 未列出任何技能                                 | 检查 `mise skills ls`、当前启用版本，以及其清单是否声明技能。检查 `skills.fetch`；仅由 exec 提供的技能还要求安装时启用 `packslip.exec`。                                              |
| 技能链接被跳过                                 | 检查冲突路径；mise 不会改动用户拥有的文件和目录。                                                                                                                                       |
| 链接仍指向旧版本                               | 运行 `mise skills sync`，或为后续安装启用 `skills.auto_sync`。                                                                                                                          |

所有标志的说明请参阅 [`mise completion`](/cli/completion.html)、
[`mise skills ls`](/cli/skills/ls.html) 和 [`mise skills sync`](/cli/skills/sync.html)。发布者可参考
[packslip 资源指南](https://packslip.dev/docs/resources/)了解如何声明这些资源。
