---
description: "将跟踪的 dotfiles 版本保存到本地 Git 历史中，比较并回滚变更，还可选择要保存的内容。"
socialDescription: "在本地 Git 历史中保存、比较和回滚跟踪的 dotfiles 版本。"
---

# Dotfiles 历史记录

mise 会将你跟踪的文件版本保存到本地 Git 仓库，以便比较版本、恢复旧版本和撤销更改。在你[跨机器同步](/dotfiles/sync.html)之前，历史记录只保存在本机。

若要跟踪第一个文件，请参阅[就地跟踪文件](/dotfiles.html#tracking-files-in-place)；若要了解两台机器上的完整配置流程，请参阅[配置一台机器](/bootstrap/setup.html)。

## 要求 {#requirements-and-settings}

历史记录功能需要 `PATH` 中有 `git`（macOS 上由 Xcode Command Line Tools 提供）。缺少 Git 时，
[`mise dot save`](/cli/dotfiles/save.html) 会失败；bootstrap 命令仍会运行并记录操作，但不记录文件内容；
[`mise dot status`](/cli/dotfiles/status.html) 会说明原因。

历史记录默认启用（[`history.enabled`](/configuration/settings.html#history.enabled)），但只有开始跟踪文件后才会记录内容。
可以通过 [`mise dot track`](/cli/dotfiles/track.html)、全局或系统配置中 `mode = "track"` 的 `[dotfiles]` 条目（不论该文件如何创建），
或采用[设置仓库](/dotfiles/sync.html)来开始跟踪。将 `history.enabled` 设为 `false` 会停止自动保存和显式保存，但仍可浏览历史记录、
编辑检查点说明，已有历史也会保留。

共享同一个 `MISE_STATE_DIR` 的并行作业（例如 CI 作业）可能会等待彼此的[历史记录锁](/dotfiles/reference.html#history-lock)。
若不希望它们互相影响，请为每个作业设置独立的 `MISE_STATE_DIR`，或将 `MISE_HISTORY_ENABLED` 设为 `false`。

## 保存检查点 {#saving}

检查点是跟踪文件的一个已保存版本，以 Git 提交的形式存储。若要保存单个文件的当前内容：

```sh
mise dot save ~/.zshrc
```

若要保存所有跟踪文件并添加说明：

```sh
mise dot save --description "before changing my theme"
```

如果没有发现更改，保存操作不会创建提交。指定 `--description`、`--label` 或 `--task` 时，即使文件没有变化，`mise dot save` 也会创建检查点。

如果无法保存任何内容，`save` 就会失败，例如缺少 Git、历史记录已禁用，或指定路径未被跟踪。对于应继续运行的脚本，
`--best-effort` 会将无法写入检查点（例如缺少 Git）降为警告；历史记录已禁用或路径未跟踪时仍会失败。

`mise bootstrap`、`mise dot apply` 和 `mise dot rollback` 等会更改跟踪文件的命令，会在操作前后各保存一个检查点；详见[操作检查点](/dotfiles/reference.html#operation-checkpoints)。

## 自动保存 {#automatic-saves}

watcher 是后台服务，会保存跟踪文件的更改，包括由编辑器、应用程序或其他命令所做的编辑。将它添加到全局配置：

```toml
[bootstrap.services.mise-history]
builtin = "history-watch"
```

安装并检查服务是否正在运行：

```sh
mise bootstrap services apply
mise dot status
```

mise 会将 watcher 安装为无需 root 权限的用户服务：Linux 上是 systemd 用户单元，macOS 上是 LaunchAgent，Windows 上是计划任务。
完整运行一次 `mise bootstrap` 也会完成此操作。如果无法启动，请参阅[用户服务](/bootstrap/services.html#user-services)。
没有服务时，`mise dot watch` 会在前台运行 watcher；`mise dot watch --once` 则只扫描一次，例如可由计时器或 cron 作业调用。

文件停止变化达到 [`history.watch.debounce`](/configuration/settings.html#history.watch.debounce) 指定的时间后，watcher 会保存普通编辑。
持续变化的文件会降低保存频率，因此其他文件已保存时，它仍可能包含未保存的编辑；`mise dot paths --noisy` 会列出这些文件。
显式执行 `save` 仍会立即保存。调度规则见 [watcher 参考](/dotfiles/reference.html#adaptive-scheduling)。

### 仅在请求时保存某些文件 {#save-on-request}

日志、缓存、数据库和会话状态通常不应纳入历史记录；请[将它们排除](#exclude-files-from-one-directory)。若某个配置文件只应在你明确要求时保存，
请在跟踪时关闭自动保存：

```sh
mise dot track ~/.config/app/state.json --no-autosave
mise dot save ~/.config/app/state.json
```

这会在条目中写入 `autosave = false`。跟踪操作会立即保存第一个版本，之后的编辑则需运行 `mise dot save <path>` 才会保存。
watcher 的检查点保留该文件上次保存的版本。`mise bootstrap` 和 `mise dot capture` 等会更改或捕获文件的命令仍会在运行前保存它。

### 检查 watcher 状态 {#health}

如果文件没有保存或共享，请先运行：

```sh
mise doctor
mise dot status
```

[`mise doctor`](/cli/doctor.html) 会报告已声明但已停止的 watcher、重复出现的保存失败、不可用的历史存储，以及因持续变化而降低保存频率的文件。
报告中也会提供启动已停止 watcher 的命令。

`mise dot status` 会提供更多细节：watcher 正在运行、已声明但已停止，还是尚未声明；保存是否失败；最近一次保存和完整扫描的时间；
最近一次失败；以及每个繁忙文件的保存间隔、上次保存时间和待处理编辑。它还会列出最新检查点之后发生变化、可由 `mise dot save` 记录的跟踪文件：

```text
  unsaved changes: 2 path(s) since the latest checkpoint (~/.config/app/added.toml, ~/.zshrc); `mise dot history diff` shows them, `mise dot save` records them.
```

查找这些文件时会读取所有跟踪文件，与 `mise dot history diff` 一样。

这两个命令也会报告使用旧版 mise 的 watcher 服务，或因 `MISE_STATE_DIR` 不同而监视另一个存储的服务。运行 `mise bootstrap services apply` 可重启它。

这些命令只读取 watcher 保存的健康报告，不会启动同步或更改文件。超过数个完整扫描间隔的旧报告会被标记为过期。
繁忙文件较长的保存间隔仅供参考。桌面同步冲突通知请参阅[冲突通知](/dotfiles/sync.html#conflict-notifications)。

### 自动描述检查点 {#descriptions-from-an-agent}

[`history.describe_command`](/configuration/settings.html#history.describe_command) 会运行一个命令（例如编程代理），为 watcher 保存的每个检查点生成说明。
请在全局或系统配置中设置此项；项目配置中的该设置会被 mise 忽略。以下示例假设已安装 Claude Code：

```toml
[settings.history]
describe_command = "claude -p --output-format text --no-session-persistence '请用不超过 120 个字符的一行纯文本描述配置文件的这些变更，不要加引号。'"
```

更改详情（包括未加密文件的差异）会发送给你配置的命令。不会列出已排除的文件，也不会发送任一检查点中已加密文件的内容。

对于变体文件，差异比较的是每个检查点保存的对应变体。跟踪的变体目录中新建或删除的文件也遵循此规则。

命令会通过 stdin 接收一个 JSON 对象，字段包括 `uuid`、`trigger`、计算所得的 `description`、`added`、`modified` 和 `removed` 路径，
以及已更改未加密文件的统一格式 `diff`。差异最多为 64 KiB；被截断时会设置 `diff_truncated`。文件内容仅通过 stdin 传入，不会通过 Shell 插值传递。

命令输出的一行文本（最多 200 个字符）会成为检查点说明，并记录 `description_source: command`。命令运行前会先保存检查点。
如果命令失败、没有输出，或运行超过 30 秒，检查点会保留其计算所得的说明。每个由 watcher 保存的检查点只运行一次描述命令，
并且一次只运行一个；文件系统事件和重试不会触发额外运行。

若要手动描述检查点，请运行
[`mise dot history describe <ref> <text>`](/cli/dotfiles/history/describe.html).

## 比较版本 {#comparing}

按从新到旧的顺序，列出某个文件发生变化的检查点：

```sh
mise dot history --path ~/.zshrc
```

```text
2  2026-10-07 18:12  save      edited ~/.zshrc   1
1  2026-10-07 18:12  baseline  tracked ~/.zshrc  1
```

每行显示检查点 ID、保存时间、触发原因、说明，以及涉及的文件数量。不指定 `--path` 时，
[`mise dot history`](/cli/dotfiles/history.html) 会列出所有文件的近期检查点：默认显示 20 条，使用 `--limit 0` 可显示全部。
`--trigger` 和 `--label` 可筛选列表。

使用列表中的 ID 查看某个检查点。以下示例使用检查点 12：

```sh
mise dot history show 12
mise dot history diff 12 --patch --path ~/.zshrc
```

`history show` 会显示检查点的触发原因和发生变化的文件。添加 `--files` 可列出其中所有文件，添加 `--json` 可获得结构化输出。
`history diff 12` 会显示该检查点中的更改。若要比较两个检查点，请提供两个 ID：

```sh
mise dot history diff 11 12 --patch --path ~/.zshrc
```

若要比较当前文件与最近保存的版本：

```sh
mise dot history diff --path ~/.zshrc
```

这也会显示 `autosave = false` 文件中的未保存编辑。添加 `--exit-code` 可在存在差异时返回退出码 1；省略 `--path` 则比较所有跟踪文件。

## 引用检查点 {#referring-to-checkpoints}

可使用 `history` 中的检查点 ID，也可使用以下引用：

| 引用           | 含义                                                               |
| -------------- | ------------------------------------------------------------------ |
| `12`           | 本地 ID 为 12 的检查点                                              |
| `latest`       | 最近的检查点                                                       |
| `latest~1`     | 最近检查点之前的检查点；使用 `~N` 可继续向前查找                  |
| `commit:<sha>` | 由完整哈希或唯一前缀标识的 Git 提交                                |

指定 `--path` 时，`latest~N` 只统计该路径发生变化的检查点：

```sh
mise dot history show latest~1 --path ~/.zshrc
```

这会选中该文件最近一次变更之前的检查点，即使此后其他文件也发生了变化。

数字 ID 仅在本机有效，mise 重建索引后可能发生变化。需要稳定引用时请使用 Git 提交哈希。纯数字始终表示检查点 ID；
非纯数字的提交前缀也可以省略 `commit:`。

## 回滚 {#rolling-back}

若要将文件恢复到最近一个与当前内容不同的已保存版本，请先预览更改，再执行回滚：

```sh
mise dot rollback ~/.zshrc --dry-run
mise dot rollback ~/.zshrc
```

mise 会在替换文件前保存当前内容。若要撤销回滚，请运行：

```sh
mise dot undo
```

[`mise dot undo`](/cli/dotfiles/undo.html) 会恢复最近一次操作所更改的跟踪文件，其他文件保持当前内容。回滚和撤销都会创建新提交，
因此旧版本仍然可用，恢复后的版本也可以同步到其他机器。

每次回滚或撤销都会记录两个检查点：一个保存操作前的状态，另一个保存操作结果。提交说明会列出这两个检查点，并通过保存目标版本的检查点标识恢复的版本：

```text
history: rolled back ~/.zshrc to checkpoint 6; recorded as checkpoint 10, with checkpoint 9 holding the state before it
```

`mise dot history --path ~/.zshrc` 只会列出更改该文件的检查点，因此会显示 6 和 10；除非当时有未保存编辑，否则不会显示 9。

若要选择检查点，请使用 `history` 中的 ID 或[检查点引用](#referring-to-checkpoints)：

```sh
mise dot rollback ~/.zshrc --to 42
mise dot rollback --to latest~3 --all --dry-run
```

`--all` 会选择目标检查点所覆盖的全部内容。如果该检查点记录某个文件不存在，回滚就会删除该文件。即使不使用 `--to`，也可能出现这种情况：
文件不存在的早期保存状态也算作可恢复的版本。

预览会为每个路径显示以下状态：

| 操作              | 含义                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `write`           | 将文件替换为内容不同的已保存版本                                                            |
| `delete`          | 删除被记录为不存在的文件                                                                    |
| `remove if empty` | 如果回滚清空了目录且其中没有其他内容，则删除该目录                                          |
| `unchanged`       | 保留已匹配的文件                                                                            |
| `skip`            | 不处理检查点未覆盖或已省略的路径                                                            |
| `conflict`        | 解决路径类型变化（例如文件变成目录）；替换需要使用 `--force`                                |

Git 不记录空目录，因此回滚目录时会保留 Git 没有记录的空文件夹。恢复配置文件不会更改已安装的软件包或正在运行的服务；请运行 `mise bootstrap` 应用恢复后的配置。

回滚、撤销和 pull 会逐个写入文件，并为每个文件记录日志。如果操作中断，请运行 [`mise dot recover`](/cli/dotfiles/recover.html) 将其完成；
详见[恢复](/dotfiles/reference.html#recovery-details)。

### 恢复文件后重新加载应用 {#reload-an-application-after-restoring-files}

在全局配置中添加命令，可在应用文件发生变化后重新加载应用：

```toml
[history.reload]
"~/.config/hypr/**" = "hyprctl reload"
```

回滚、撤销或 [pull](/dotfiles/sync.html#sync-immediately) 写入文件后，每条匹配的命令会运行一次。mise 会在操作开始前从系统和全局配置读取这些命令。

`mise dot apply` 或 `mise bootstrap` 的 dotfiles 步骤写入匹配路径时，也会运行相同命令，包括创建链接或副本、渲染模板或应用编辑。
dry-run、跳过 dotfiles 的 bootstrap，以及不会写入活动文件的 `mise dot sync` 都不会触发重新加载。glob 也会匹配符号链接目录中的路径：
`"~/.config/hypr/**"` 会匹配 `"~/.config/hypr" = "dotfiles/hypr"` 条目。

重新加载命令用于响应文件更改，不应用来配置机器。mise 会在恢复前读取这些命令，因此同一次更新中新增的命令（包括首次运行
`mise bootstrap --adopt` 时添加的命令）不会因此运行。请将安装 Shell 插件、修复权限等初始化步骤放入 [`bootstrap` 任务](/bootstrap.html#the-bootstrap-task)，
该任务会在采用配置时运行，并会在共享更新后的每次 `mise bootstrap` 中运行。

## 捕获外部命令 {#capturing-an-external-command}

若要查看更新对跟踪文件造成的变化，可使用 [`mise dot capture`](/cli/dotfiles/capture.html) 包装更新命令。例如，在 Omarchy 上：

```sh
mise dot capture --label "omarchy update" -- omarchy-update
mise dot history --label "omarchy update"
mise dot history diff --operation --patch
```

`capture` 会在命令执行前后保存跟踪文件，包括 `autosave = false` 的文件，并记录标签及命令是否成功。
差异会比较这两个检查点，即使此后发生过其他保存也一样。若要检查较早的操作，请提供其检查点 ID：

```sh
mise dot history diff 42 --operation --patch
```

命令会直接运行，并继承输入、输出和环境。需要 Shell 语法时请使用 `-- sh -c '...'`。捕获失败时，mise 会发出警告，但命令仍会运行并返回自身的退出状态。
失败的命令以及未更改任何内容的命令仍会保留成对的检查点。

其他历史记录写入操作会等待这对检查点写完。此期间编辑器和其他程序仍可更改文件，这些编辑也会出现在差异中。`undo` 会恢复整个时间段内的跟踪文件变更。
若只恢复部分文件，请用 `history show` 找到操作的 Before 检查点，再运行 `mise dot rollback <path> --to <before-ref>`。
软件包、服务状态和未跟踪文件不在此恢复范围内。

如果包装命令被终止，下一个更改历史记录的命令会恢复其待处理操作记录。外部命令逐个写入文件的过程不会记录在日志中。
如果包装的命令取消跟踪某个文件，后一个检查点会将其排除；之前的检查点仍可用，恢复操作也会让该文件保持未跟踪状态。

## 停止跟踪文件 {#stop-tracking-a-file}

```sh
mise dot untrack ~/.zshrc
```

[`mise dot untrack`](/cli/dotfiles/untrack.html) 会移除跟踪条目，但文件仍保留在原处。之后的检查点不会再记录它，但其早期版本仍保存在 Git 中，且仍可共享。
若要保留文件历史但绝不共享，请改用 [`mode = "track-local"`](/dotfiles/history.html#local-only) 跟踪。
对于从其他配置文件（例如系统配置）继承的条目，`untrack` 会改为在 `config.local.toml` 中设置 `enabled = false`。
也可以在后续配置文件中设置 `enabled = false`，以关闭任何继承条目。

若要停止保存跟踪目录中的部分内容（例如日志或缓存），请改用[排除规则](#exclude-files-from-one-directory)。

## 选择历史记录的内容 {#explicit-tracking-and-exclusions}

在全局配置中声明要保存的每个文件或目录：

```toml
[dotfiles]
"~/.zshrc" = { mode = "track" }
"~/templates" = { mode = "track" }
"~/.gitconfig" = { mode = "template", source = "~/templates/gitconfig.tera" }
```

历史记录会保存 `~/.zshrc` 和 `~/templates` 中的文件。模板会创建 `~/.gitconfig`；若也要记录该文件的历史，请单独跟踪输出文件。
mise 只会从系统和全局配置读取跟踪条目。项目配置中的 `mode = "track"` 会被警告并忽略。

请跟踪主目录或 mise 配置目录下的具体路径。跟踪条目指定的是路径，而非 glob。跟踪目录后，之后在其下新增的文件也会被跟踪，但须遵守下文规则。
若要共享工具、服务和模板，也请跟踪 mise 配置及其使用的源文件；bootstrap 会报告历史记录中缺少的必需文件。

符号链接会以链接形式保存。若要保存链接目标的内容，请单独跟踪目标。如果父目录是符号链接，请跟踪该链接，并使用实际目录路径跟踪其下文件。
主目录和 mise 配置目录本身也可以是符号链接；mise 会将它们映射到每台机器上对应的目录。

跟踪条目不能包含 `source`、`content`、`manifest`、`permissions`、`remove_empty`、`relative`、`dot_prefix` 或变体 `target` 覆盖项；
详见[模式和键表](/dotfiles/reference.html#modes-and-keys)。`mise dot paths` 会将此类条目标记为无效并从历史记录中排除；
如果 `mise dot track` 写入的条目未生效，该命令会以非零状态退出。

建议从单个配置文件开始跟踪，以便自行选择保存内容。不要将日志、缓存、数据库和应用会话状态纳入历史记录。
以 `.local.toml` 结尾的文件属于机器本地配置，永远不会保存，即使设置了 `encrypt = true` 也一样。

### 跟踪前预览 {#preview-before-tracking}

跟踪目录会保存其中的所有内容，因此请先预览较大的目录：

```sh
mise dot track --dry-run ~/.codex
# ~/.codex: 22,972 files, 1.2 GiB
```

`mise dot paths --preview ~/.codex` 会显示相同的文件数量和大小，并列出文件。两个命令都会显示将被排除的内容，包括凭据文件和嵌套仓库，
且都不会写入任何内容。它们只读取文件元数据，不读取文件内容，并会跳过无法访问的子目录，因此预览可能只显示已选文件数量，
而无法显示整个目录的总数。

`mise dot track` 会在保存前打印相同的文件数量和大小；目录树超过 5,000 个文件或 256 MiB 时会发出警告。
警告不会阻止跟踪；扫描达到上限时会报告结果不完整。跟踪前可先添加排除规则缩小范围，例如
`mise dot exclude '~/.codex/sessions/**'`.

### 选择目录中的文件 {#choose-which-files-a-directory-saves}

如果目录中有少量配置文件，其他大多是缓存、日志或会话文件，请使用 `include`：

```toml
[dotfiles]
"~/.codex" = { mode = "track", include = ["config.toml", "rules/**"] }
```

此配置会保存 `config.toml` 和 `rules/` 下的文件。`~/.codex` 其他位置的新文件不会进入历史记录，因此无需再单独排除。

| 配置                        | 选择范围                                                      |
| -------------------------- | ------------------------------------------------------------ |
| 未设置 `include`            | 目录中的文件，并应用内置凭据过滤规则                          |
| `include = []`              | 不选择任何文件                                                |
| `include` 列表非空          | 匹配任一模式的文件，包括名称像凭据的文件                      |
| 显式排除项                  | 从以上任一选择范围中移除匹配的文件                            |

包含模式以被跟踪目录为基准解析，并遵循[模式语法](/dotfiles/reference.html#patterns)；在 include 列表中，`*` 不会跨越 `/`。
字面名称和 glob 具有同等效力：`include = ["**"]` 也会选择名称像凭据的文件。加密是单独的选项；`encrypt = true` 会加密所选文件。

::: warning 按名称选中的凭据文件会以明文保存
如果没有设置 `encrypt = true`，include 列表选中的凭据文件会以明文保存，并可能共享到远程仓库。预览和路径列表会将其标记为 `plaintext:`，
保存时也会产生[捕获警告](#capture-warnings)。之后再启用加密，不会移除早期提交中的明文内容。
:::

例如，若要保存一个名称会触发凭据过滤规则的 Shell 函数：

```toml
[dotfiles]
"~/.config/fish" = { mode = "track", include = ["functions/secrets.fish"] }
```

此条目只选择该文件。若要保存真实凭据，请进行加密：

```toml
[dotfiles]
"~/.aws" = { mode = "track", include = ["credentials"], encrypt = true }
```

请先配置[加密接收者](/dotfiles/encryption.html#choose-recipients)。修改 `include` 不会关闭加密，也不会重写已有历史。
如果移除加密，并在曾加密过的路径上保存明文，[发布检查](/dotfiles/encryption.html#allow-plaintext-history)仍会覆盖该路径的全部历史记录。

include 列表只适用于被跟踪的目录。单个文件可以直接跟踪，也可以跟踪其父目录并使用相对路径选择该文件。
无效的 include 或 exclude glob 会使跟踪条目失效；请修正后再重新跟踪。include 列表会与其他机器共享并记录在检查点中，
因此回滚时能识别未包含的文件；详见[混用 mise 版本](/dotfiles/sync.html#mixed-mise-versions)。

::: tip `mise dot include` 修改的是另一个列表
`mise dot include <glob>` 会从全局 `[history] exclude` 列表中移除一条规则，不会更改目录的 `include` 字段；请编辑对应的 `[dotfiles]` 条目。
:::

### 从单个目录中排除文件 {#exclude-files-from-one-directory}

在跟踪条目上设置 `exclude` 列表，可排除该路径下的文件，而不影响其他条目：

```toml
[dotfiles]
"~/.codex" = { mode = "track", exclude = ["sessions", "*.log"] }
```

模式以被跟踪目录为基准解析，并遵循[模式语法](/dotfiles/reference.html#patterns)。`sessions` 会排除任意深度下名称为该值的目录及其内容；
`*.log` 会排除任意深度下匹配的文件；`/cache` 则只排除 `~/.codex/cache`。

条目列表和全局 `[history] exclude` 列表会同时生效；全局 `!glob` 不能重新包含已由条目排除的文件。
`mise dot paths` 和 `mise dot track --dry-run` 会显示实际生效的规则。

### 在所有跟踪条目中排除文件 {#exclude-files-across-tracked-entries}

[`mise dot exclude`](/cli/dotfiles/exclude.html) 会将 glob 添加到全局配置的 `[history] exclude` 中。请为其加引号，以免 Shell 展开：

```sh
mise dot exclude '~/.codex/sessions/**'
mise dot paths
```

绝对模式只适用于指定位置，因此此示例不会影响 `~/.config/kitty/sessions/`。相对模式（例如 `cache`）则会匹配每个跟踪条目下的内容。
若要移除规则，请将相同 glob 传给 [`mise dot include`](/cli/dotfiles/include.html)：

```sh
mise dot include '~/.codex/sessions/**'
```

`[history] exclude` 中后续的 `!glob` 可以重新包含先前规则排除的路径。移除一条规则不会覆盖仍在排除此路径的其他规则。
[模式语法](/dotfiles/reference.html#global-exclude-patterns)参考说明了匹配顺序、绝对模式和无效规则。修正 mise 警告的规则后，请运行 `mise dot paths` 检查结果。

### 凭据过滤 {#credential-filtering-and-omissions}

未启用加密时，内置文件名规则会排除 `.netrc`、`*.age`、`*.key`、`*.pem`、`*.gpg`、`*.kdbx`、`id_*`、`*token*`、`*secret*`、
`credentials*` 和 `oauth*`。mise 配置目录下的 `github_tokens.toml`、`hosts.yml` 和 `age.txt` 也会被排除。

规则只检查文件自身的名称，不检查内容或父目录名称。`id_ed25519` 和 `id_ed25519.pub` 都匹配 `id_*`；名为 `secrets.fish` 的 Shell 函数也会匹配
`*secret*`。以 `.example`、`.sample` 或 `.template` 结尾的名称（例如 `secrets.sh.example`）被视为模板，不会排除。
`mise dot save` 和 `mise dot track` 会报告排除项，`mise dot status` 会显示排除数量，`mise dot paths` 会列出每个路径及其原因。
若要保存凭据，请[加密它](/dotfiles/encryption.html)。

直接跟踪名称看似凭据存储的文件时，`mise dot track` 会询问是否以明文保存。默认答案为否，`--yes` 和管道输入都不能批准此操作。
对于非交互命令（包括将文件列表通过管道传给 `mise dot track` 的脚本），请传入 `--allow-plaintext`；但只有确认该文件可以安全地进入 Git 历史和所有已连接的远程仓库后才这样做：

```sh
mise dot track --allow-plaintext ~/commit-mossy-token.md
```

此选择会以 `allow_plaintext = true` 写入该文件的条目，因此后续保存和其他机器都会使用相同策略，不再询问或警告。
`mise dot paths` 仍会将文件列为明文。真实凭据请使用 `mise dot track --encrypt`。文件尚不存在时也可以通过 `--allow-plaintext` 批准；
如果该路径之后变成目录，目录仍会被跟踪，其内容则遵循常规过滤规则。

### 捕获警告 {#capture-warnings}

include 列表选中名称像凭据的文件并将其以明文存储时，保存操作会发出警告。include 列表发生变化、排除早期检查点中包含的文件时也会报告：
这些路径不会再出现在新检查点中，但其早期版本仍保留在 Git 历史中。

include 模式也会选择之后创建的匹配文件。若 `~/.config/fish` 设置了 `include = ["**"]`，之后新增的 `functions/secrets.fish` 会在下次捕获时以明文保存并发出警告。
警告不会阻止保存或共享，因此后台保存可能会在你看到警告之前就将文件共享到远程仓库。若要加密该目录下选中的所有文件，请在保存私密文件前于条目中设置
`encrypt = true`。已保存版本的处理方法见[从历史中移除明文](/dotfiles/encryption.html#remove-plaintext-from-history)。

警告会显示在执行保存的命令中：

| 保存方式                   | 查看警告的位置                                                          |
| -------------------------- | ---------------------------------------------------------------------- |
| 显式保存或跟踪             | 对应命令的输出                                                          |
| Bootstrap                  | bootstrap 命令运行期间                                                  |
| Watcher 或自动应用         | 下一次除 `watch` 外的 `mise dot` 命令，或 `mise bootstrap`               |

例如，watcher 应用范围更小的 include 列表后，`mise dot paths` 会先打印待处理提示，指出包含被排除路径的早期检查点，然后列出当前选择范围。
每条警告在一次命令中只显示一次，即使命令失败也一样。后台保存产生的警告，或后续失败操作的保护性检查点产生的警告，会留待下一次前台命令显示。

### 嵌套仓库 {#nested-repositories}

被跟踪目录中包含自身 `.git` 的目录属于独立仓库。mise 会跳过其内容，并在跟踪、保存、查看状态和列出路径时报告该目录。
历史记录不会保存其中的文件或提交指针。

若要保存嵌套仓库中的工作文件，请将其根目录作为单独条目跟踪：

```sh
mise dot track ~/.hammerspoon/Spoons/SkyRocket.spoon
```

之后，该仓库中的文件会遵循其条目设置，且 `.git` 始终会被排除。父条目的 include 模式不会进入嵌套仓库。
也可以让安装该仓库的工具继续管理它，或移除其 `.git`，将目录视为普通文件。

检查点会将跳过的仓库记录为省略项；即使之后移除了 `.git`，回滚也不会更改这些路径下的文件。
旧版 mise 历史中若包含提交指针，pull 和采用配置时会跳过这些指针，而不会恢复不可用的 Git 对象或移除现有检出目录。

### 在不同机器上保存不同内容 {#variants}

变体允许被跟踪的文件在不同机器上具有不同内容，但路径相同。例如，为 macOS 和 Linux 分别保存不同版本的 `~/.zshrc`：

```toml
[dotfiles]
"~/.zshrc" = { mode = "track", variants = [{ os = "macos" }, { os = "linux" }] }
```

将其添加到全局配置，或运行 `mise dot track ~/.zshrc --os macos` 添加一个变体。`os` 可在 `/` 后指定架构，因此
`os = "macos/arm64"` 只匹配 Apple silicon Mac（平台配置文件名写作 `macos-arm64`）。`os = "unix"` 会在 Linux 和 macOS 间共享一个版本，
并在 Windows 上跳过该路径：

```toml
[dotfiles]
"~/.zshrc" = { mode = "track", variants = [{ os = "unix" }] }
```

使用 `profile` 选择[配置环境](/configuration/environments.html)：

```toml
[dotfiles]
"~/.gitconfig-work" = { mode = "track", variants = [{ profile = "work" }, { default = true }] }
```

有多个变体匹配时，会采用最具体的一个；若具体程度相同，mise 会报告歧义并跳过该路径，直到你修正配置。
没有匹配项时，mise 会采用标记为 `default = true` 的变体；若未设置默认变体，则不会在该机器上保存或应用此路径。检查点会保留其他机器保存的版本。

机器选中某个变体时（例如另一台机器保存了 `work` 配置环境的版本，而本机通过 `-E work` 激活该环境），保存的版本来自另一台机器。
在 `mise dot pull` 应用之前，保存操作不会更改该路径，`mise dot status` 会将其列为 `not applied here`。
如果文件在本机不存在，或自上次选中该变体以来未更改，pull 会写入已保存版本。本机已有不同副本时，pull 会因冲突停止：
`mise dot pull --take-remote <path>` 会采用已保存版本；运行 `mise dot pull --keep-local <path>`，然后执行 `mise dot save <path>`，则会保留本机版本。
`--keep-local` 只适用于单独跟踪的文件；若文件位于被跟踪目录中，请先采用已保存版本，再复制回本机版本并保存。

::: warning 在本机无法撤销 `--take-remote`
你的副本从未在本机保存，因此 `--take-remote` 替换它后，`mise dot undo` 无法恢复。若之后可能需要，请先将文件复制到其他位置。
:::

匹配规则见[变体选择器](/dotfiles/reference.html#variant-selectors)。被跟踪的变体不接受 `target`；若要在每台机器上部署到不同路径，
请参阅[在不同机器上使用不同目标路径](/dotfiles/managed.html#platform-specific-destinations)。

#### 每台机器各自保存一个版本 {#machine-variants}

某些文件描述机器本身，例如显示器布局或触控板设置。使用 `machine` 变体，让每台机器分别保存自己的版本：

```toml
[dotfiles]
"~/.config/hypr/monitors.lua" = { mode = "track", variants = [{ machine = true }] }
```

也可以运行 `mise dot track ~/.config/hypr/monitors.lua --machine`。

每台机器都会保存、回滚和恢复自己的版本。同步仍会像往常一样共享其他跟踪文件，但绝不会将某台机器的版本应用到另一台机器。
每个版本仍会随其他历史记录一起推送到远程仓库，因此本机之外也有备份，之后可以在本机恢复。

每个历史流以机器命名，例如 `machine-omarchy-3f2a9c1b`：名称由主机名和随机后缀组成，首次生成后保存在
`$MISE_STATE_DIR/history/machine` 中。重命名主机不会更改该名称；即使两台机器主机名相同，也会有各自的版本。
若要自行指定名称，请在机器的全局配置中设置，例如放在 `~/.config/mise/config.local.toml`：

```toml
[history]
machine = "desk"
```

重装机器后，请设置其原有名称，以继续该机器的历史记录。`machine` 必须是条目唯一的变体，且不能与 `encrypt` 组合使用。
使用此功能前，请先升级所有共享配置的机器：旧版 mise 会拒绝此配置，而不会将一台机器的版本应用到其他机器。

### 仅保存在本机的历史记录 {#local-only}

有些文件值得记录历史，但不应离开本机，例如应用状态、仅供工作使用的配置，或希望能够回滚的凭据。使用 `mode = "track-local"` 跟踪：

```toml
[dotfiles]
"~/.config/app/state.json" = { mode = "track-local" }
```

也可以运行 `mise dot track --local ~/.config/app/state.json`。

这些文件的版本保存在本机自己的历史记录 `$MISE_STATE_DIR/history-local` 中，不会进入任何远程仓库：其内容和跟踪元数据都不会进入共享历史或推送记录。
但如果声明写在单独共享的配置文件中，该声明仍会作为文件文本的一部分共享。本地文件的保存、浏览和恢复方式与其他跟踪文件相同：

```sh
mise dot save                          # saves both histories
mise dot history --path ~/.config/app/state.json
mise dot rollback ~/.config/app/state.json
mise dot --local history               # list the local-only checkpoints
mise dot --local undo                  # undo the latest local-only rollback
```

指定路径的命令会使用保存该路径的历史记录；同一命令不能同时指定来自两种历史记录的路径。没有指定路径时，`mise dot --local` 会选择本地历史记录。
`mise dot capture` 会在命令前后各保存一个带标签的检查点，历史 watcher 会监视两类历史记录。

仅本机路径可以位于被跟踪目录内，例如共享目录 `~/.config/app` 中的 `~/.config/app/state.json`；共享历史会排除此文件。
路径改为仅本机跟踪之前已保存在共享历史中的版本仍会保留，与[停止跟踪](/dotfiles/history.html#stop-tracking-a-file)的情况相同。
如果其他机器共享相同路径，本机既不会应用其版本，也不会发布自己的版本。仅本机目录中的所有内容也都仅保存在本机；共享配置声明其中路径时会被拒绝。

由于此类历史不会离开本机，`track-local` 不接受 `encrypt` 或 `variants`。除非条目设置了 `allow_plaintext = true`，否则名称像凭据的文件仍会被排除。
旧版 mise 会将 `track-local` 条目视为未知模式并跳过，不会退回到共享跟踪模式。

### 跟踪由 mise 部署的文件 {#ownership}

你可以记录由 mise 复制、链接、渲染或编辑的文件。例如，跟踪 `~/.zshrc` 也会保存管理代码块或[Shell 激活](/bootstrap/shell.html)写入的更改。

如果你跟踪的文件已由 `[dotfiles]` 条目管理，mise 会保留该条目，并将跟踪条目写入
`~/.config/mise/conf.d/dotfiles-tracking.toml`。停止跟踪只会移除跟踪条目。
被跟踪目录也可以包含托管文件或模板源文件；其复制、链接或模板条目仍会生效。若两个条目会创建相同目标，仍会被拒绝。

## 配置参考 {#configuration-reference}

历史记录功能读取两个配置表。`[history]` 指定保存哪些内容以及保存位置，mise 只从全局和系统配置读取它，不会读取项目配置。
`[settings.history]` 包含控制 watcher 和同步的[设置](/configuration/settings.html)，也可以通过 `mise settings` 或环境变量设置。

| 配置表                     | 键                                                                                                            | 用途                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[history]`                | `exclude`                                                                                                     | 历史记录始终排除的 glob；详见[在所有跟踪条目中排除文件](#exclude-files-across-tracked-entries)                                                     |
| `[history]`                | `git_email`                                                                                                   | 历史提交的作者和提交者邮箱；详见[按机器区分提交](/dotfiles/sync.html#identify-commits-by-machine)                                                    |
| `[history.reload]`         | `"<glob>" = "<command>"`                                                                                      | 回滚、撤销、pull 或 apply 写入匹配文件后运行的命令；详见[恢复文件后重新加载应用](#reload-an-application-after-restoring-files)                           |
| `[history.encryption]`     | `recipients`                                                                                                  | 加密文件的公钥；详见[加密文件](/dotfiles/encryption.html)                                                                                            |
| `[history.origin]`         | `url`, `branch`                                                                                               | 远程仓库；`mise dot origin set` 会写入 `config.local.toml`；详见[跨机器同步](/dotfiles/sync.html)                                                   |
| `[settings.history]`       | `enabled`, `sync`, `sync_interval`, `fetch_interval`, `notify`, `allow_plaintext_history`, `describe_command` | 控制记录时间和同步方式                                                                                                                                |
| `[settings.history.watch]` | `debounce`, `max_interval`, `reconcile`                                                                       | watcher 的调度间隔                                                                                                                                    |

设置可以用 TOML 表表示，例如：

```toml
[settings.history]
sync = "manual"
notify = false
```

`allow_plaintext_history` 和 `describe_command` 只会从全局或
系统配置读取。watcher 运行期间，全局配置中 `history.watch` 设置的变更会立即生效。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="history" :level="3" />
