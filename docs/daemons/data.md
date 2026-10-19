---
description: 查找 daemon 数据和生成配置的位置，将数据保存在检出目录中，重置数据库并清理已删除的项目。
socialDescription: 查找、重置和清理 daemon 数据。
---

# 数据与清理 <Badge type="warning" text="实验性" />

默认情况下，mise 会将每个项目的 daemon 状态和预设数据保存在项目目录之外的 `$MISE_STATE_DIR/daemons/` 下，并且不会自行删除。使用 `mise daemons ls --json` 查找这些数据，使用 `mise daemons prune` 清理已删除项目和 worktree 遗留的内容。

::: warning 实验性功能
Daemon 功能仍处于实验阶段。请在 `[settings]` 下设置 `experimental = true` 启用；详见[要求](/daemons.html#requirements)。
:::

## 数据存放位置 {#where-data-lives}

mise 会将每个项目生成的 pitchfork 配置写入 `$MISE_STATE_DIR/daemons/<project-hash>/`，并向 pitchfork 注册。`$MISE_STATE_DIR` 的位置请参阅[目录说明](/directories.html)。默认情况下，不会向项目目录树写入文件。已注册的文件会覆盖普通 pitchfork 配置中 ID 相同的 daemon 定义。若要修改 daemon，请编辑其 `[daemons]` 声明，而不是生成的文件。

预设会将数据保存在生成配置旁边的 `data/<daemon-name>/` 目录中。即使版本请求变更或删除了 daemon 声明，数据也会保留。升级到新的主版本时，需要显式迁移或重置数据：遇到不兼容的数据时，daemon 会在启动前失败。若要跨越不兼容的版本升级保留数据，请使用数据库自身的迁移工具。

如果首次初始化失败，mise 不会将数据移入目标目录，因此下次启动时会重新从头初始化。

[共享服务器 provider](/daemons/sharing.html#shared-server-providers) 会将数据单独保存在 `$MISE_STATE_DIR/daemon-providers/<name>/data` 中。

## 将数据保存在检出目录中 {#keep-data-in-the-checkout}

若要将预设数据保存在每个检出目录内，请设置 `data_dir`：

```toml
[daemons.postgres]
preset = "postgres"
version = "18"
data_dir = ".data/postgres"
```

相对路径以声明该项的项目根目录为基准；也可以使用绝对路径，`~/` 会展开为 home 目录。请将 `/.data/` 加入 `.gitignore`。这样每个 worktree 都有自己的数据，而运行时状态和生成配置仍保存在 mise 状态目录中。不要让两个运行中的实例指向同一个目录。

更改 `data_dir` 不会移动现有数据。复制或迁移数据前请先停止 daemon，并保留备份，直到确认新位置可用。`mise daemons prune` 不会触碰状态目录以外的数据，但删除 worktree 或清理被忽略的文件会删除其中保存的数据。

## 查找 daemon 数据 {#find-daemon-data}

删除项目或 worktree 前，使用 `mise daemons ls --json` 查找项目的 daemon 数据并检查其大小。每个 daemon 条目包含：

| 字段              | 值                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `root`            | 项目目录                                                                                  |
| `data_dir`        | 解析后的预设数据目录（自定义命令和 provider 使用方为 `null`）                               |
| `state_dir`       | 存放生成配置、状态和默认数据的目录                                                        |
| `data_size`       | `state_dir` 下默认数据的总字节数（不包括你设置的 `data_dir` 路径）                          |
| `data_size_human` | 格式化后供人阅读的数据大小                                                                |

除 `data_dir` 外，这些字段描述的是整个项目，因此同一项目中的所有 daemon 会报告相同的值。

## 重置数据库 {#reset-a-database}

停止 daemon，找到并删除其数据目录，然后重新启动。下次启动时会初始化全新数据。请先备份需要保留的内容。

```sh
mise daemons stop db
mise daemons ls --json | jq -r '.[] | select(.name == "db") | .data_dir'
rm -rf <that directory>
mise daemons start db
```

请删除整个目录，而不只是清空目录内容：如果预设的数据目录存在但缺少初始化时写入的标记，mise 会拒绝启动。

以上操作适用于自行运行预设的 daemon。使用[共享服务器 provider](/daemons/sharing.html#shared-server-providers)的 daemon 没有自己的数据目录，因此其 `data_dir` 为 `null`。请改用服务器自身的客户端删除数据库。切勿为了重置单个检出目录而删除 provider 的数据目录，因为其中保存了所有检出目录的数据库。

## 清理已删除的项目 {#clean-up-deleted-projects}

每个项目（包括每个链接的 Git worktree）都有自己的 daemon 状态和数据。删除项目目录（例如使用 `git worktree remove`）后，磁盘上的数据仍会保留，daemon 也仍注册在 pitchfork 中。

使用 [`mise daemons prune`](/cli/daemons/prune.html) 清理已删除项目的遗留内容。它会扫描 `$MISE_STATE_DIR/daemons/` 下所有项目状态：

```sh
# Preview the projects, state directories, and sizes
mise daemons prune --dry-run

# Review the list and confirm removal
mise daemons prune
```

清理操作会停止受影响的 daemon、注销其生成配置，并删除对应配置、状态和数据。确认提示会显示将删除的状态目录数量及总大小，默认选择“否”。删除后无法恢复，因此请先备份需要保留的数据。

仍然存在的项目状态会保留，即使项目已不再声明任何 daemon。`mise daemons start` 发现可由 prune 清理的状态时会显示提醒，但不会自行删除任何内容。

### 非交互式清理 {#non-interactive-cleanup}

传入全局 `--yes` 标志，即可在无需提示的情况下确认常规删除：

```sh
mise daemons prune --yes
```

如果项目缺失可能是因为卷尚未挂载或符号链接已删除，mise 会单独询问；使用 `--yes` 时会跳过该项目。请在不加 `--yes` 的情况下检查这些条目，只有确认项目本身已删除时才确认清理。当父目录已删除、某个上级目录为空或不可读、项目位于 `/Volumes/Disk` 等挂载点，或记录路径与创建状态目录时使用的路径不同时，会执行此额外检查。

### 保留状态的情况 {#when-state-is-kept}

清理需要 pitchfork。遇到无法读取项目路径或状态文件、无法取得项目锁、无法确认 daemon 已停止，或无法注销配置时，mise 会保留项目状态并说明原因。如果项目目录在删除前重新出现，mise 也会保留其状态。

数据库的 PID 文件或锁文件也可能阻止删除。PID 文件指向仍在运行的进程时会阻止清理；过期 PID 则不会。无法读取的标记文件或不含有效 PID 的文件会被视为进程可能仍在活动。请先解决报告的问题，再次运行 `mise daemons prune`。
