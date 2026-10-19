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

未指定 `--dir` 时，sync 会使用最近的 mise 项目根目录中的
[`skills.dir`](/configuration/settings.html#skills.dir) 设置。请将其指向 agent 读取的目录；`--dir` 可在单次
运行中覆盖此设置。

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

启用 `auto_sync` 后，mise 会在 `mise install`、`mise use` 更改版本以及 `mise upgrade` 后自动同步。
设置 `prune = true` 会移除指向已不再启用技能的 mise 创建的链接；否则过期链接会保留。若只想在
某次手动运行时清理：

```sh
mise skills sync --dir .agents/skills --prune
```

自动同步要求存在 mise 项目根目录，切换目录不会触发同步。如果 agent 未发现更改，请重新加载技能。

### 技能设置 {#choose-whether-to-fetch-or-generate-skills}

| 设置                                                                | 默认值           | 作用                                                               |
| ------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| [`skills.fetch`](/configuration/settings.html#skills.fetch)         | `true`           | 安装工具时获取已声明的技能。                                       |
| [`skills.dir`](/configuration/settings.html#skills.dir)             | `.claude/skills` | 指定 sync 创建链接的目标目录。                                    |
| [`skills.auto_sync`](/configuration/settings.html#skills.auto_sync) | `false`          | 在 mise 项目中安装、切换工具和升级后同步。                         |
| [`skills.prune`](/configuration/settings.html#skills.prune)         | `false`          | 同步时移除过期的 mise 管理链接。                                   |
| [`packslip.exec`](/configuration/settings.html#packslip.exec)       | `false`          | 安装时运行已安装工具以生成资源。                                   |

技能可以来自制品、单独签名的资源，或发行提交对应的源码仓库；获取技能不会运行工具。单独资源必须
与签名摘要一致，否则验证失败。如果技能仅由 `exec` 命令提供，且启用了 `packslip.exec`，就会在安装
期间生成；该命令会运行新安装的可执行文件，并且必须输出 `SKILL.md` 内容。

关闭 `skills.fetch` 后，mise 不会再获取技能，但不会删除已获取的技能或现有链接。请运行带
`--prune` 的 sync，以移除指向已不再启用技能的链接。

### 已声明的技能未安装时

`mise skills ls` 和 `mise skills sync` 会列出发行版中已声明但未安装的技能，并说明原因：
`skills.fetch` 已关闭；技能由 `exec` 命令生成但 `packslip.exec` 已关闭；或安装时下载失败（重新安装
工具会再次获取技能）。

## mise 运行发布者命令时 {#resource-selection-and-command-execution}

如果补全或技能只能通过命令生成，mise 会在临时目录中运行已安装的可执行文件，并将其 bin 目录加入
`PATH`，同时设置清单中的环境变量；stdin 为空。每次运行最多五秒，输出上限为 4 MiB，结束后 mise
会清理子进程。输出为空、命令失败或超时的结果不会缓存，mise 会尝试下一个来源。该命令不在沙箱中
运行：[验证检查](/dev-tools/backends/packslip.html#what-is-verified)用于确认可执行文件的来源。

当发行版为同一资源提供多个来源时，mise 优先选择针对当前安装的精确制品声明的来源，而不是针对
平台声明的来源。如果来源的匹配精度相同，则依次优先使用制品内文件、单独签名的资源、源码仓库
中的文件。[packslip 资源指南](https://packslip.dev/docs/resources/)详细说明了面向发布者的选择规则。

<a id="troubleshooting"></a>

## 故障排除

| 现象                                           | 后续处理                                                                                                                                                                               |
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
