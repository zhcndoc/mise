---
description: "使用与当前工具版本匹配的 man pages、shell 补全和 agent skills。"
socialDescription: "使用与当前工具版本匹配的 man pages、shell 补全和 agent skills。"
---

# Packslip Man Pages、补全和 Skills

通过 [Packslip backend](/dev-tools/backends/packslip.html) 安装的工具可以提供与项目中当前使用版本匹配的 man pages、shell 补全和 agent skills。发布者会在 release manifest 中声明这些资源。

通过 `packslip:` 安装工具即可使用其声明的资源。来自其他 backend 的现有安装不会自动获得这些资源。

## 补全

mise 支持 zsh、bash、fish 和 PowerShell 的工具补全。已安装的补全文件会跟随每个项目中当前使用的工具版本，因此更改版本后无需重新安装补全。

### 使用补全

启用 [mise](/getting-started.html#activate-mise) 后，在项目中激活已安装的工具时，补全就会生效。例如：

```sh
mise use packslip:github.com/jdx/hk
```

运行 `mise exec -- hk --version` 验证安装，然后在已激活的 shell 中输入 `hk` 并按 Tab。hk 为 bash、zsh、fish 和 PowerShell 发布了原生补全脚本，因此不需要额外的设置命令或 `usage` 安装。mise 会在 shell 中注册一个加载器；只有在你补全命令时，它才会读取发布者的脚本。切换项目或工具版本会选择匹配的补全，离开项目则会移除其注册信息。

### 不激活 shell 时手动设置

对于在其 Packslip manifest 中声明了补全的工具，mise 可以安装一个加载这些资源的补全文件。将下面的 `TOOL` 替换为可执行文件的名称：

| Shell      | Command                                            |
| ---------- | -------------------------------------------------- |
| zsh        | `mise completion zsh --tool TOOL --install`        |
| bash       | `mise completion bash --tool TOOL --install`       |
| fish       | `mise completion fish --tool TOOL --install`       |
| PowerShell | `mise completion powershell --tool TOOL --install` |

按照命令打印的一次性设置说明操作，然后加载补全文件或启动新的 shell。mise 会写入补全文件，但不会编辑你的 shell 配置。除非传入 `--force`，否则它会保留并非由自己创建的现有文件。

若要打印补全脚本而不安装它，请省略 `--install`：

```sh
mise completion zsh --tool TOOL
```

`--tool` 接受命令名称，而不是诸如 `packslip:github.com/jdx/hk` 这样的 backend 标识符。
如果一个 release 包含多个命令，请选择要进行补全的命令。
不使用 `--tool` 时，`mise completion` 会为 mise 自身生成补全。

## Man pages

当已安装工具的 Packslip manifest 声明了静态 `man` 资源时，mise 会在该工具版本处于激活状态时将其添加到 `MANPATH`。这在已激活的 shell 以及由 `mise exec`、`mise run` 和 `mise env` 创建的环境中均可用。切换项目会选择匹配版本的页面。

mise 会将这些页面保存在工具安装目录下的 `.mise-packslip/man` 中。它会将该目录添加到现有 `MANPATH` 的开头；当 `MANPATH` 未设置时，mise 会保留操作系统默认的手册页位置。使用较旧 mise 版本安装的工具必须重新安装一次，以便 mise 准备此布局。

Packslip man pages 可以来自 release archive、单独签名的 release asset，或 release commit 对应的 source repository。诸如 `tool.1` 的文件会放置在 `man1` 下；也支持诸如 `tool.5.gz` 的压缩页面。自动生成的 `exec` 资源以及仅由 `cli-spec` 派生的 man pages 不会自动安装。

### 生成的补全

发布者可以提供补全文件、静态 usage CLI specification，或生成其中任意一种的命令。mise 优先使用静态来源。基于 usage 的补全使用 mise 内置的引擎；无需单独安装 `usage`。

如果补全需要发布者的生成器命令，mise 会按需运行该命令，并缓存针对已安装版本、可执行文件和 shell 的成功输出。这可能发生在 Tab 补全期间，或直接调用 `mise completion --tool` 时。它不会仅仅因为 shell 启动就运行发布者的工具。

::: info
[`packslip.exec`](/configuration/settings.html#packslip.exec) 控制**安装期间**的资源生成。将其设置为 `false` 不会禁用**按需生成补全**。
:::

## Skills

Skill 是一个包含 `SKILL.md` 及任意支持文件的目录。默认情况下，mise 会在工具安装期间获取声明的 skills，因此不同工具版本可以携带不同的 skill 内容。使用 `mise skills ls` 查看为已激活工具获取的 skills；未声明 skills 的工具没有可同步的内容。

查看项目中已激活工具的 skills：

```sh
mise skills ls
mise skills ls --json
```

将它们链接到 agent 读取 skills 的位置：

```sh
mise skills sync --dir .agents/skills
```

这些是本地符号链接，而不是 skill 的可移植副本。请不要将生成的链接纳入版本控制，并让每位开发者在自己的机器上运行 sync。该目录也可以包含手写的 skills；mise 会保留这些内容。

每个链接都指向已激活工具版本的安装目录。版本更改后运行 sync 以更新链接。mise 会保留用户创建的目录和无关链接，并将任何冲突的名称报告为已跳过。

### 选择 skill 目录

不使用 `--dir` 时，sync 会使用最近的 mise 项目根目录下的 `.claude/skills`。设置 [`skills.dir`](/configuration/settings.html#skills.dir) 以使用 agent 首选的目录。`--dir` 会覆盖设置，仅对一次调用生效。

`mise skills sync --global` 会改为在 home folder 下解析配置的目录；使用默认设置时，该目录为 `~/.claude/skills`。
绝对目录会按原样使用。

### 使项目链接保持最新

配置 skill 目录，并在 `mise install` 和 `mise use` 后启用同步：

```toml
[settings.skills]
dir = ".agents/skills"
auto_sync = true
prune = true
```

`prune = true` 会移除不再处于激活状态的 skills 所对应的 mise 自有链接。不启用该设置时，过时链接会保留。若要在一次手动运行中清理：

```sh
mise skills sync --dir .agents/skills --prune
```

上述配置应放在项目的 `mise.toml` 或全局设置中，具体取决于你希望它在哪个范围内生效。

自动同步要求存在 mise 项目根目录。它不会仅仅因为你切换目录就运行。如果 agent 没有自动检测到更改，请在 agent 中重新加载 skills。

### 选择获取或生成 skills

| Setting                                                             | Default          | Effect                                                             |
| ------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| [`skills.fetch`](/configuration/settings.html#skills.fetch)         | `true`           | 在工具安装期间获取声明的 skills。                    |
| [`skills.dir`](/configuration/settings.html#skills.dir)             | `.claude/skills` | 选择 sync 使用的目录。                                 |
| [`skills.auto_sync`](/configuration/settings.html#skills.auto_sync) | `false`          | 在 mise 项目中安装和使用后进行同步。                  |
| [`skills.prune`](/configuration/settings.html#skills.prune)         | `false`          | 在同步期间移除过时的 mise 自有链接。                         |
| [`packslip.exec`](/configuration/settings.html#packslip.exec)       | `false`          | 在安装期间运行已安装的工具以生成资源。               |

Skill 可以来自 artifact、单独签名的 asset，或 release commit 对应的 source repository。获取这些文件不会执行工具。仅通过 `exec` 命令提供的 skill，会在启用 `packslip.exec` 时于安装期间生成。该命令会运行新安装的可执行文件，并且必须打印 `SKILL.md` 内容。

关闭 `skills.fetch` 会跳过未来的获取操作；不会删除之前获取的文件或现有链接。使用带清理选项的 sync，以移除指向不再处于激活状态的 skills 的链接。

## 资源选择和命令执行

以下详细信息适用于 release 为某个资源提供多个来源的情况。

### 来源选择

资源可以针对精确的 artifact 文件名或某个平台。mise 会为已安装的 artifact 选择资源，优先选择精确的 artifact 匹配项，然后选择最具体的平台匹配项。不同的可执行文件、shell 和 skill 名称代表不同的资源。

对于具体程度相同的备选项，mise 优先选择 artifact 内的文件，然后是单独签名的 asset，最后是 source-repository 文件。静态 CLI specs 遵循相同的顺序。同一来源类型内由声明顺序决定优先级。可用的高优先级 skill 来源会阻止获取或运行较低优先级的来源。只有存在 `SKILL.md` 时，目录才会被视为 skill。

对于补全，mise 首先尝试提供的补全文件，然后是静态 usage CLI spec，最后是生成补全或 CLI spec 的命令。选择范围限定于已安装的 artifact、可执行文件和 shell。

单独的资源 asset 必须匹配其签名摘要；repository 资源固定到 release 的 source commit。缺少可选资源可能导致工具安装完成但不包含该资源。摘要不匹配属于验证失败。

### 生成和缓存

针对同一生成补全的并发请求会共享工作结果。空输出、失败或超时不会被缓存；mise 会尝试下一个来源。静态补全文件会直接从安装目录读取，不会写入缓存，因此在只读或共享安装中同样可用。

当 mise 运行资源生成器时，它会：

- 将已安装的可执行文件添加到 PATH，并应用 manifest 的环境变量，同时为补全资源展开 `{shell}`。
- 使用临时工作目录，不使用 stdin，并丢弃 stderr。
- 强制执行五秒截止时间和 4 MiB 输出限制，并在完成、失败、超时或取消后清理子进程。

这些限制不会对可执行文件进行沙箱隔离。[backend verification checks](/dev-tools/backends/packslip.html#what-is-verified) 会确定使用的是哪个发布者的可执行文件。

### 补全文件如何跟随当前激活版本 {#follow-the-active-version}

已安装的补全文件会在你补全命令时委托给 mise。
更改目录或通过 `mise use` 选择其他版本后，下次补全会使用该目录的当前激活版本。

| Shell      | Implementation                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| zsh        | 临时委托给发布者的脚本，然后恢复 mise 的补全函数。                        |
| bash       | 委托给发布者的注册函数，并在下一个提示符处恢复 mise 的函数。                        |
| fish       | 为每次补全在子 shell 中加载发布者的脚本，使注册信息不会进入父 shell。 |
| PowerShell | 临时委托给发布者的 completer，然后恢复 mise 的 completer。                               |

<span id="static-files-usage-specs-and-generated-scripts"></span>

## 故障排除

| Symptom                                        | Next step                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 工具通过其他 backend 安装     | 检查 `mise ls`，然后使用明确的 `packslip:` 标识符安装声明了该资源的 release。                                                                          |
| 未声明补全                         | 确认 release 支持你的 shell 和可执行文件。如果不支持，发布者必须添加补全或 CLI spec。                                                               |
| `--install` 拒绝工具标识符          | 传入可执行文件名称，例如 `hk`，而不是 `packslip:github.com/jdx/hk`。                                                                                                      |
| 补全文件已存在               | 在决定使用 `--force` 替换之前检查现有文件。                                                                                                                |
| 脚本能打印但 Tab 补全无法工作 | 检查 mise 是否已激活，以及工具是否在此项目中处于激活状态。手动设置时，按照 `--install` 打印的说明操作。mise 会自行处理基于 usage 的补全。 |
| 补全生成失败                    | 检查发布者的命令是否能在时间和大小限制内生成非空输出。向发布者报告失败的生成器。                                              |
| 未列出 skills                               | 检查 `mise skills ls`、当前激活版本，以及其 manifest 是否声明了 skills。检查 `skills.fetch`；仅通过 exec 提供的 skill 还需要在安装期间启用 `packslip.exec`。 |
| Skill 链接被跳过                        | 检查冲突路径；mise 会保留用户拥有的文件和目录。                                                                                                         |
| 链接指向旧版本                  | 运行 `mise skills sync`，或为未来的 install/use 操作启用 `skills.auto_sync`。                                                                                                |

有关确切的 flags，请参阅 [`mise completion`](/cli/completion.html)、[`mise skills ls`](/cli/skills/ls.html) 和 [`mise skills sync`](/cli/skills/sync.html)。
发布者可以参阅 [Packslip resources guide](https://packslip.dev/docs/resources/)，将这些声明添加到其 releases 中。
