---
description: "查阅所有 [dotfiles] 配置项、各模式支持的字段、变体和匹配规则、状态以及历史文件。"
socialDescription: "查阅所有 [dotfiles] 配置项、匹配规则、状态和状态文件。"
---

# Dotfiles 配置参考

本页列出 `[dotfiles]` 条目的键、各模式接受的键、变体选择器、匹配模式语法、状态值，以及 mise 为 dotfiles 和其历史记录保存的状态。`[dotfile_groups]` 的键见[分组](/dotfiles/groups.html#group-keys)；`[history]` 表和历史设置见[历史配置参考](/dotfiles/history.html#configuration-reference)。

## 条目键 {#entry-keys}

整文件条目以目标路径为键，路径必须是绝对路径或以 `~/` 开头。字符串值是 `{ source = "<value>" }` 的简写。

| Key                 | Type            | Meaning                                                                                                                                                                                                                   |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`            | path            | The file or directory to deploy. Relative paths start at the declaring config file's directory. Defaults to the target's path under [`dotfiles.root`](/configuration/settings.html#dotfiles.root).                        |
| `mode`              | string          | `symlink`, `symlink-each`, `copy`, `template`, `absent`, `track`, or `track-local`. Defaults to [`dotfiles.default_mode`](/configuration/settings.html#dotfiles.default_mode). See [Modes](/dotfiles/managed.html#modes). |
| `content`           | string          | The whole file, written inline. See [Inline content](/dotfiles/managed.html#inline-content).                                                                                                                              |
| `permissions`       | octal string    | Permissions for the target, such as `"0600"`. On its own, manages an existing path's permissions only. See [Permissions](/dotfiles/managed.html#permissions).                                                             |
| `exclude`           | list of globs   | Paths to skip in a walked source directory or a tracked directory. See [Pattern syntax](#patterns).                                                                                                                       |
| `manifest`          | `"git"`         | Deploy only files in the source repository's Git index. See [Deploy only files committed to Git](/dotfiles/managed.html#git-tracked-directories).                                                                         |
| `dot_prefix`        | boolean         | Deploy source names `dot-<name>` as `.<name>`. See [Visible source names](/dotfiles/managed.html#dot-prefix).                                                                                                             |
| `relative`          | boolean         | `symlink` and `symlink-each`: link by a relative path. Overrides [`dotfiles.relative_symlinks`](/configuration/settings.html#dotfiles.relative_symlinks).                                                                 |
| `remove_empty`      | boolean         | Remove the target when the template renders empty. See [Remove the target when a template renders empty](/dotfiles/managed.html#remove-empty).                                                                            |
| `create_if_missing` | boolean         | 仅当目标不存在时才写入；已有文件保持不变。详见[仅在文件不存在时创建](/dotfiles/managed.html#create-if-missing)。 |
| `variants`          | list of tables  | Per-machine selection: a target per machine for deployed entries, separate contents for tracked ones. See [Variant selectors](#variant-selectors).                                                                        |
| `depends`           | list of strings | 按名称指定组，按目标路径指定整文件条目；mise 会在渲染或读取此条目前先写入这些依赖。详见[等待其他条目](/dotfiles/managed.html#depends)。编辑项和 track 模式不支持此项。 |
| `enabled`           | boolean         | `false` turns off an entry inherited from another config file.                                                                                                                                                            |
| `include`           | list of globs   | Track only: the files a tracked directory saves. See [Select files in a directory](/dotfiles/history.html#choose-which-files-a-directory-saves).                                                                          |
| `autosave`          | boolean         | Track only: `false` saves the path only on `mise dot save <path>`. See [Save some files only on request](/dotfiles/history.html#save-on-request).                                                                         |
| `encrypt`           | boolean         | Track only: encrypt contents before saving them to Git. See [Encrypted files](/dotfiles/encryption.html).                                                                                                                 |
| `allow_plaintext`   | boolean         | Track only: save a credential-named file that you track directly in plaintext. See [Credential filtering](/dotfiles/history.html#credential-filtering-and-omissions).                                                     |

A `[dotfiles]` entry takes no `group` key; declare a group's entries under
[`[dotfile_groups.<name>.entries]`](/dotfiles/groups.html#group-entries).

## Edit keys {#edit-keys}

An edit entry is keyed by the target path followed by `/<id>`, such as
`"~/.zshrc/aliases"`. Ids can contain letters, digits, `_`, `-`, and `.`. See
[Edit part of a file](/dotfiles/edits.html).

| Key           | Type                                                | Meaning                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block`       | string                                              | Inline content to keep between marker comments.                                                                                                                                                                                     |
| `source`      | path                                                | A file with the block content (with `template = "tera"`) or the keys to merge (with `merge`).                                                                                                                                       |
| `template`    | `"tera"`                                            | Render `source` with Tera first.                                                                                                                                                                                                    |
| `comment`     | string                                              | The marker comment prefix. Defaults to one inferred from the file extension.                                                                                                                                                        |
| `line`        | string                                              | One exact line to ensure exists.                                                                                                                                                                                                    |
| `position`    | `"append"` or `"prepend"`                           | Where a missing `line` goes. Defaults to `"append"`.                                                                                                                                                                                |
| `merge`       | `true` 或 `"missing"`                                | 将 `source` 中的键设置到 `.json`、`.jsonc`、`.toml`、`.yaml`、`.yml` 或 `.ini` 目标文件中。`"missing"` 只设置目标中没有值的键；详见[应用可能更改的默认值](/dotfiles/edits.html#merge-missing)。 |
| `format`      | `"json"`、`"jsonc"`、`"toml"`、`"yaml"` 或 `"ini"` | 配合 `merge` 使用；当目标文件扩展名无法表明格式时指定格式，例如为 VS Code 的 `settings.json` 指定 `"jsonc"`。 |
| `permissions` | 八进制字符串 | 仅用于 `merge`：apply 创建目标文件时设置的权限；已有文件会保留原权限。详见[由 mise 创建文件时设置权限](/dotfiles/edits.html#merge-permissions)。 |

`block` and `source` are mutually exclusive, and neither combines with
`line`。`position` 仅适用于 `line`；`format` 和 `permissions` 仅适用于 `merge`。未设置 `source` 的 `merge` 条目
reads the target's path under
[`dotfiles.root`](/configuration/settings.html#dotfiles.root), and takes no
`block`, `line`, `position`, or `comment`. Only a `merge` entry takes
`permissions`. Edits are never encrypted.

## Modes and keys {#modes-and-keys}

The table shows which whole-file keys each kind of entry accepts. An entry
with `content` is an inline-content entry, and one with only `permissions`
(no `source`, `content`, or `mode`) is a permissions-only entry. Every entry
also accepts `enabled`.

| Entry            | Accepts                                                                                                                                                             | Accepted, no effect              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `symlink`        | `source`, `relative`, `variants` (selectors and `target`)                                                                                                           | `exclude`, `autosave`, `encrypt` |
| `symlink-each`   | `source` (a directory), `exclude`, `manifest`, `dot_prefix`, `relative`, `variants` (selectors and `target`)                                                        | `autosave`, `encrypt`            |
| `copy`           | `source`、`variants`（选择条件和 `target`）；来源为目录时支持 `exclude`、`manifest`、`dot_prefix`；来源为文件时支持 `permissions`、`create_if_missing` | `autosave`、`encrypt` |
| `template`       | `source`（文件）、`permissions`、`remove_empty`、`create_if_missing`、`variants`（选择条件和 `target`） | `exclude`、`autosave`、`encrypt` |
| `content`        | `content`、`permissions`、`create_if_missing`、`variants`（仅选择条件） | `autosave` |
| Permissions only | `permissions`, `variants` (selectors and `target`)                                                                                                                  | `autosave`                       |
| `absent`         | `variants` (selectors and `target`)                                                                                                                                 | `autosave`                       |
| `fnox`           | `permissions`、`variants`（选择条件和 `target`） | `autosave` |
| `track`          | `exclude`, `include`, `autosave`, `encrypt`, `allow_plaintext`, `variants` (selectors only)                                                                         |                                  |
| `track-local`    | `exclude`, `include`, `autosave`, `allow_plaintext`                                                                                                                 |                                  |

For `encrypt` and `relative`, the table means the `true` value; `encrypt =
false` and `relative = false` are accepted everywhere except that
permissions-only and `track-local` entries reject any `encrypt` key, including
`encrypt = false`. See [Local-only history](/dotfiles/history.html#local-only)
for `track-local`.

mise warns about and ignores an entry that sets one of the
[entry keys](#entry-keys) its kind does not accept; for a `track` entry,
`mise dot paths` also lists it as invalid. A key that is not an entry key at
all is ignored without a warning, except in configuration arriving from
another machine, which a pull refuses to apply. `permissions` with a
directory source, and `manifest` or `dot_prefix` with a file source, stop the
command with an error. An entry that sets both `permissions` and `manifest` is
ignored with a warning.

## How entries combine {#how-entries-combine}

- Entries merge across the [config hierarchy](/configuration.html#configuration-hierarchy).
  Whole-file entries merge by target path, and edit entries by target path
  and id. A more local config file replaces an entry with the same key,
  including its variants.
- If a more local declaration is invalid, or none of its variants matches this
  machine, the inherited entry stays active.
- A tracking entry and a deployed entry for the same path are separate
  entries; see [Track files that mise also deploys](/dotfiles/history.html#ownership).
- mise reads tracking entries, and the `[history]` table, only from system and
  global config.
- mise warns about and skips an entry with an unknown mode or edit operation,
  so a config written for a newer mise still loads.

## Variant selectors {#variant-selectors}

Each element of `variants` selects machines with these keys:

| Key       | Matches                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `os`      | 操作系统（`linux`、`macos`、`windows`）、`unix` 系列，或在其后通过 `/` 指定架构，例如 `linux/arm64` 或 `unix/x64`。列表可匹配其中任一值。                                                |
| `profile` | 通过 `-E` 或 `MISE_ENV` 选择的[配置环境](/configuration/environments.html)。                                                                                                                    |
| `default` | 设为 `true` 时，作为未匹配其他变体时使用的回退项。不能同时设置 `os` 或 `profile`，且每个条目最多只能有一个默认变体。                                                                         |
| `machine` | 设为 `true` 时，为每台机器保存独立版本；详见[每台机器一个版本](/dotfiles/history.html#machine-variants)。它必须是条目唯一的变体，且不能与 `encrypt` 组合。                                      |

A variant with both `os` and `profile` matches only when both do. `profile` 会在其名称出现在所选环境列表中的任意位置时匹配，因此 `MISE_ENV=ssh,work` 会同时匹配 `profile = "work"` 和 `profile = "ssh"`。When several
variants match, mise scores each one and the highest score wins:

| 选择器                        | 分值   |
| ----------------------------- | ------ |
| `profile`                     | 4      |
| `os` 指定单个系统              | 2      |
| `os = "unix"`                 | 1      |
| `/` 后指定架构                 | 另加 2 |

因此，在 Mac 上，`os = "macos"` 的得分高于 `os = "unix"`；只指定 profile 的变体与同时指定系统和架构的变体得分相同。最高分并列时，条目会被视为无效，直到你修正配置。没有任何变体匹配时，mise 会使用 `default` 变体；若未指定，则在该机器上跳过此条目。跳过的跟踪路径既不会在该机器上保存，也不会应用；检查点仍会保留其他机器保存的版本。

部署条目的变体可添加 `target` 来选择路径；详见[不同机器使用不同目标路径](/dotfiles/managed.html#platform-specific-destinations)。跟踪条目的每个变体则会在同一路径下保存独立的内容流；详见[不同机器保存不同内容](/dotfiles/history.html#variants)。

## 匹配模式语法 {#patterns}

整文件条目的 `exclude`、分组的 `exclude`，以及跟踪条目的 `exclude` 和 `include` 中的模式，都相对于条目目录：部署条目和分组以源目录为基准，跟踪条目则以被跟踪目录为基准。

| 模式                | 匹配对象                                                                            |
| ------------------- | ----------------------------------------------------------------------------------- |
| `mise.toml`、`*.md` | 不含 `/` 的名称会在任意深度匹配单个路径组件                                        |
| `nvim/spell`        | 含 `/` 的模式以条目目录为基准：只匹配该路径                                        |
| `/cache`            | 开头的 `/` 也会固定匹配基准，类似 `.gitignore`：只匹配顶层的 `cache` 目录            |
| `nvim/**/*.bak`     | `**` 可跨目录匹配：`nvim/init.bak` 和 `nvim/after/init.bak`                          |
| `sessions`          | 匹配目录的模式会涵盖该目录下的所有内容                                              |

`/nvim/spell` 和 `nvim/spell` 是同一模式。在这些列表中，开头的 `/` 从不表示绝对路径；下文的全局列表规则不同。

在 `include` 列表中，`*` 不会跨过 `/`，这与 `.gitignore` 相同：`rules/*.md` 只选择 `rules` 目录中的 Markdown 文件，而 `rules/**/*.md` 还会选择其子目录中的文件。

::: warning 已弃用：排除模式中的 `*` 可跨越 `/`
在包含 `/` 的 `exclude` 模式中，`*` 仍可跨目录匹配，因此 `"nvim/*.bak"` 也会跳过 `nvim/after/init.bak`。如果模式只因这一规则而跳过路径，mise 会显示警告。请改用 `**`：排除模式中的 `*` 将不再跨过 `/`，与 `.gitignore`、include 列表以及以 `/` 开头的模式相同。
:::

部署条目的 `exclude` 中若有无效 glob，mise 会报告该模式，但仍会应用列表中的其他模式。跟踪条目的 `exclude` 或 `include` 中若有无效 glob，整个条目都会失效，以免误保存内容。

### 全局排除模式 {#global-exclude-patterns}

由 [`mise dot exclude`](/cli/dotfiles/exclude.html) 写入的 `[history] exclude` 列表，会作用于每个跟踪条目下的路径：

| 模式                   | 匹配对象                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| `cache`                | 跟踪条目下任意位置名为 `cache` 的文件或目录                             |
| `sessions/**`          | 跟踪条目下任意深度的 `sessions` 目录内容                                |
| `~/.codex/sessions/**` | 该特定目录中的内容                                                      |
| `keys/*.pem`           | 跟踪条目下任意 `keys` 目录中直接包含的 PEM 文件                         |
| `keys/**/*.pem`        | 这些 `keys` 目录中任意深度的 PEM 文件                                   |

- 相对模式会在每个跟踪条目下的任意深度匹配，绝不相对于 Shell 当前工作目录。开头的 `./` 会被忽略。
- 绝对模式可以使用 `~` 开头，并且即使父目录经过符号链接，仍会继续匹配。
- `*` 不跨越路径分隔符，`**` 可以跨越。在 Windows 上，`/` 和 `\` 都是路径分隔符。
- 对路径（或其在跟踪根目录下的父目录）进行匹配的最后一条规则决定是否排除该路径。后续的 `!glob` 可以重新选中被排除目录中的文件。除非后续规则可能选中目录中的内容，否则 mise 会跳过整个被排除目录，不读取其中内容。
- 不会展开环境变量；请使用 `~/` 或绝对路径。`mise dot exclude` 会拒绝包含 `$` 的模式和无效 glob。如果配置中已有此类模式，mise 会发出警告并忽略该规则，其他规则仍会生效。

检查点会记录保存时所用的规则版本。如果回滚无法可靠解释旧检查点所覆盖的范围，会将相关路径报告为已跳过，而不会删除现有文件。

## 状态值 {#status-states}

[`mise dot status`](/cli/dotfiles/status.html) 会为每个需要处理的条目、编辑项和孤立分组文件输出一行，并统计已应用或已跟踪的项目；`--verbose` 会列出全部项目，指定目标路径则只列出这些目标。随后会显示历史记录状态，包括跟踪情况（条目、文件、最新检查点、未保存更改）、仓库信息（远程源、分支、模式和同步时间）、冲突、自动捕获及 Bootstrap。“后续步骤”列表会列出用于处理待办事项的命令。

| 状态                                               | 含义                                                                                         | 处理方式                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `applied`                                          | 目标与条目相符。                                                                               | 无需处理。                                                              |
| `applied (target absent; permissions not applied)` | 仅权限目标不存在。                                                                             | 无需处理，或创建该路径。                                                |
| `missing`                                          | 目标或编辑项尚不存在。                                                                         | `mise dot apply`                                                      |
| `differs (<reason>)`                               | 目标存在，但内容、链接或权限不符，或者无法检查。                                                 | 运行 `mise dot diff`，再运行 `mise dot apply`；冲突时添加 `--force`。     |
| `source missing`                                   | 条目源不存在。                                                                                 | 创建源文件，或修正 `source`。                                           |
| `tracked`                                          | `mode = "track"` 条目。`tracked (2 omitted, 1 nested)` 会统计保存时跳过的文件。                | `mise dot paths` 会列出相关文件。                                       |
| `not on this machine (variants: <names>)`          | `track` 条目的所有变体都选择了其他机器，例如当前 profile 未启用。                                | 无需处理，或选择一个变体，例如使用 `-E <profile>`。                      |
| `ambiguous variants (<names> match equally)`       | `track` 条目有两个变体与当前机器匹配程度相同，因此该条目被跳过。                                  | 提高其中一个变体的具体程度。                                            |
| `absent`                                           | `absent` 条目的目标已不存在。                                                                  | 无需处理。                                                              |
| `would remove (<reason>)`                          | `absent` 条目的文件或符号链接仍然存在。                                                         | `mise dot apply`                                                      |
| `orphaned`                                         | 某个分组曾部署该文件，但现在没有活动条目再部署它。                                                | `mise dot apply --prune` 或 `mise dot unapply --group <name>`         |
| `orphaned (changed since applied)`                 | mise 写入后又被修改的孤立文件。                                                                  | 手动删除，或添加 `--force` 删除已修改的副本。                           |

`mise dot status --missing` 会输出相同的行；当任一条目或编辑项的状态为 `missing`、`source missing`、`differs` 或 `would remove` 时，退出状态为 1。孤立文件不会影响退出状态。

### JSON 输出 {#json-output}

`mise dot status --json` 会输出包含 `files`、`edits` 和 `history` 的对象；如果分组留下了文件，还会包含 `orphaned`。

- 每个 `files` 元素都有 `target`、`source`、`mode`、`origin`、`state`，以及跟踪条目的 `omitted` 和 `nested` 计数。`mode` 是某个模式、`content` 或 `permissions`；`state` 是 `applied`、`missing`、`differs`、`source_missing` 或 `tracked`。
- `source` 是用于显示的路径，主目录会以 `~` 表示；内联内容、仅权限和 `absent` 条目则为 `null`。绝对路径请使用 `origin.source`。
- `origin` 描述条目的来源，包括配置文件、其 `config_root`、文件名中的配置环境以及解析后的源路径。路径为有效 UTF-8 时会表示为字符串；在 Unix 上，包含其他字节的路径会写作 `mise:path-bytes:<base64url>`。
- 设置了 `permissions` 的条目会以八进制字符串包含该值。
- `differs` 条目包含 `reason`。`absent` 条目在目标已删除时为 `applied`，目标仍存在时为 `differs`，且原因以 `; will be removed` 结尾。目标不存在的仅权限条目会以 `reason` 标记为 `applied`。如果 `tracked` 条目的变体都选择了其他机器或出现并列，`reason` 会指出相关变体。
- 每个 `edits` 元素都有 `path`、`edit`（例如 `block:aliases`）、`origin` 和 `state`。
- 每个 `orphaned` 元素都有 `target`、`group` 和 `state`，其值为 `orphaned` 或 `orphaned_changed`。

## 状态文件 {#state-files}

mise 会在 [`MISE_STATE_DIR`](/directories.html) 下保存记录（默认是 `~/.local/state/mise`）。请保留这些记录，mise 需要依靠它们识别自己写入的内容。

| 路径                                           | 内容                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `$MISE_STATE_DIR/dotfiles/`                    | 每个 `symlink-each` 条目创建的链接                                                                                                        |
| `$MISE_STATE_DIR/dotfiles/targets/`            | 每个目标上次由 mise 写入内容的摘要，以及 mise 创建的父目录                                                                               |
| `$MISE_STATE_DIR/dotfiles/groups/`             | 各[分组](/dotfiles/groups.html)部署的文件；分组不再部署后，mise 仍可据此找到这些文件                                                       |
| `$MISE_STATE_DIR/history/repo.git`             | 历史记录：保存检查点的裸 Git 仓库                                                                                                         |
| `$MISE_STATE_DIR/history/`                     | 检查点索引（mise 可从 Git 重建）、操作日志和恢复副本、`health.json`、`watch-schedule.json`                                                |
| `~/.config/mise/config.local.toml`             | 由 `mise dot origin set` 写入的 `[history.origin]`                                                                                       |
| `~/.config/mise/conf.d/dotfiles-tracking.toml` | 已由其他 `[dotfiles]` 条目管理的文件所对应的跟踪条目                                                                                      |

mise 会为每个模板目标记录摘要，因此之后启用 `remove_empty` 时仍可安全删除目标。应用操作发现目标与渲染结果完全相同时，也会记录该文件：该文件会被视为由 mise 写入，之后若被修改，删除时就会产生冲突。没有这些记录，mise 就无法删除先前创建的链接或目录、区分自己的模板输出和你的编辑，也无法找到孤立的分组文件。

## 检查点内容 {#what-a-checkpoint-records}

每个检查点都是 `$MISE_STATE_DIR/history/repo.git` 中的一个 Git commit，与编辑的文件分开保存。检查点会将跟踪文件作为普通 Git tree 条目保存，并记录其路径、跟踪设置、变体、加密状态和权限等元数据。

权限元数据涵盖非默认权限：权限不是 `0644` 或 `0755` 的文件、权限不是 `0755` 的跟踪目录，以及跟踪路径与主目录或 mise 配置目录之间权限不是 `0755` 的目录。若在权限为 `0700` 的 `~/.claude` 中跟踪 `~/.claude/settings.json`，检查点会记录该权限，以便新机器重建出私有目录，而不是所有用户均可读取的目录。主目录和 mise 配置目录本身不会被记录。

符号链接会以链接形式保存。mise 会报告无法保存的超大文件、特殊文件和不可读路径；保存其他文件时，会保留这些路径先前保存的版本。因此依赖检查点前，请先检查报告中跳过的内容。排除规则会将相应路径从后续检查点中移除。加密失败时，保存操作会停止，而不会改为存储明文。

检查点只会恢复文件内容，不会恢复已安装的软件包或服务的运行状态；这些内容请使用系统备份工具恢复，然后运行 `mise bootstrap` 应用恢复后的配置。

### 操作检查点 {#operation-checkpoints}

会更改或捕获跟踪文件的命令会在操作前后保存检查点，例如 `mise bootstrap` 及其 part 子命令，以及 `mise dot apply`、`add`、`unapply`、`edit`、`rollback`、`undo`、`pull` 和 `capture`。元数据会记录操作标签和两个检查点之间的关联，供 `mise dot undo` 与 `mise dot history diff --operation` 使用。原始命令参数、环境内容和临时恢复副本不会写入已提交的元数据。

操作更改 `autosave = false` 的跟踪文件时，会先保存该文件的实际内容；无关的手动编辑仍保持未保存状态。如果操作多次写入同一文件，操作前检查点仍会保留首次写入前的内容。这些检查点中的加密文件也会保持加密。

`undo` 会使用操作前检查点还原该操作更改的跟踪路径。操作写入的未跟踪文件只会在完成或恢复中断的写入时使用临时恢复副本；操作之后这些副本会被删除，因此未跟踪文件无法撤销。

## 恢复机制 {#recovery-details}

回滚修改任何文件前，mise 会先将当前内容保存在 `rollback-before` 检查点中。如果无法保存所有将要修改的文件，就会在写入前停止。保存检查点后，mise 会再次检查计划，并在替换每个路径前再次检查；如果并发编辑导致计划失效，操作就会停止。

文件会逐个写入，日志会记录每个受影响的路径，因此操作中断时可能已有部分写入完成。运行 [`mise dot recover`](/cli/dotfiles/recover.html) 可重试尚未完成的写入。重试绝不会覆盖后续编辑；如果无法继续，会保留这些编辑和恢复副本，并列出需要检查的路径。若要接受当前文件状态：

```sh
mise dot recover <operation> --keep-current
```

确认后，mise 会丢弃该操作的临时恢复副本，并保留当前文件和已提交历史。未解决的恢复数据会一直保留，直到你处理完毕。

普通 Bootstrap 写入若无法保存临时恢复内容（例如文件过大），会发出警告并继续；此类写入中断后无法自动恢复。Pull、rollback 和 undo 若缺少所需恢复数据，则会拒绝写入。关闭历史记录后，普通 Bootstrap 仍可在没有历史存储的情况下运行，但显式历史命令仍需要恢复数据。

## 历史记录锁 {#history-lock}

记录历史的操作会锁定 `MISE_STATE_DIR` 中的历史存储。运行过程中需要记录历史时，最多会等待该锁 30 秒，之后才会失败。

如果没有任何跟踪文件且尚无历史记录，`mise bootstrap` 只会在首次重写 dotfile 或编辑项时访问历史存储，以便保留用于恢复中断写入的私有日志。如果此时另一个 mise 进程持有锁，当前操作会发出警告并在没有日志的情况下继续，而不是失败。如果运行开始时没有内容需要记录，但结束前声明了跟踪项，则会在结束时同样等待 30 秒。如果锁仍被占用，或者先前已有写入在没有日志的情况下运行，mise 会警告结果未被记录，但仍保留操作结果。

## 监视器 {#watcher-reference}

[`监视器`](/dotfiles/history.html#automatic-saves) 会递归监视跟踪目录。对于单个跟踪文件，它会监视父目录；对于缺失路径，则监视最近的现存父目录。它不会监视 `autosave = false` 的文件。每个历史存储只运行一个监视器。

### 自适应调度 {#adaptive-scheduling}

mise 会为每个跟踪文件单独安排调度：

1. 普通编辑会在静默时间达到 [`history.watch.debounce`](/configuration/settings.html#history.watch.debounce) 后保存。
2. 如果文件在两次保存之间持续变化、未能稳定下来，其保存间隔会逐步翻倍，最长不超过 [`history.watch.max_interval`](/configuration/settings.html#history.watch.max_interval)。自上次保存后至少发生两次更改，且文件在稳定等待期内再次更改时，间隔才会翻倍；因此，间隔较长的普通编辑器保存仍使用常规间隔。
3. 文件停止变化后，mise 会在该间隔的一部分时间过后保存最终内容，最多等待五分钟。
4. 文件静默达到四个间隔且至少经过五分钟后，会恢复为基础间隔。

更长的间隔只影响该文件。其他文件仍照常保存；显式保存以及 bootstrap、rollback 或 undo 前的检查点仍会立即执行。频繁更改的文件仍会定期保存，mise 不会将它排除或切换为手动保存。其他文件触发检查点或 mise 扫描整个跟踪集合时，频繁更改的文件会继续保留上次保存的内容，直到轮到它保存。

监视器会将这些调度、每个频繁更改文件的上次保存时间和待处理编辑记录在 `watch-schedule.json` 中，以便重启后继续使用。启动时，即使文件在监视器停止期间发生变化，也会保留已保存版本，直到下次保存时间到达。全局配置中的 `history.watch` 设置会在监视器运行期间生效。

完整扫描发现新的跟踪条目时，即使 `autosave = false`，也会保存第一个版本。之后的扫描会继续沿用该版本，直到你显式保存此路径。

### 扫描与失败 {#reconciliation-and-failures}

监视器还会扫描所有跟踪文件，以捕获文件系统通知遗漏的更改：扫描会在启动、关闭、配置变更时进行，并按 [`history.watch.reconcile`](/configuration/settings.html#history.watch.reconcile) 指定的间隔定期进行。将该设置设为 `0` 可关闭定期扫描。编辑全局配置（包括 `conf.d/` 中的文件）会重新加载跟踪路径并更新监视目标；将 `history.enabled = false` 设为 `false` 会停止监视器。

保存失败的内容会保持待处理状态，并按逐渐增长的间隔重试，间隔从一秒增加到五分钟。若保存与 bootstrap、rollback 或 undo 操作重叠，监视器会等待该操作完成后重试。关闭时，监视器会短暂等待正在运行的操作，并报告无法保存的内容。

监视器每分钟都会检查启动时使用的 mise 可执行文件是否已被替换。升级后，它会先保存待处理内容，再以失败状态退出，以便服务管理器使用新版本重新启动它。手动运行 `mise dot watch` 启动的监视器会停止，需要你重新启动。如果该可执行文件已被删除且没有替代文件，监视器会继续运行，而 `mise dot status` 和 `mise doctor` 会报告它已过期；请运行 `mise bootstrap services apply` 重启它。可执行文件恢复后，该报告会消失。

### `mise dot watch` 的输出与退出码 {#watch-output}

[`mise dot watch --json`](/cli/dotfiles/watch.html) 每行会输出一个 JSON 对象。事件类型包括 `started`、`already-running`、`captured`、`unchanged`、`deferred`、`replan`、`throttled`、`settled`、`degraded`、`sync`、`synced`、`sync-error`、`applied`、`described`、`describe-error`、`describe-skipped`、`outdated`、`restarting`、`unsaved`、`unavailable`、`disabled`、`error` 和 `stopped`。

历史记录已关闭，或该存储已有其他监视器运行时，`mise dot watch` 以 0 退出；Git 不可用、无法打开存储或无法安装任何监视器时则以 1 退出。`mise dot watch --once` 会执行一次扫描和同步；如果保存被延迟或失败，或与远程源同步失败，则以 1 退出。

## 保留规则 {#retention}

mise 会无限期保留所有可达的 Git 历史；检查点不会过期，也不会压缩。取消跟踪某个路径不会删除其旧提交；加密最新版本也不会删除早期的明文版本，详见[从历史记录中移除明文](/dotfiles/encryption.html#remove-plaintext-from-history)。
