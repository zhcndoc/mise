---
description: "使用 //path:task 名称跨仓库项目运行任务，并为各项目配置工具和环境、共享根配置。"
socialDescription: "使用 //path:task 名称跨仓库项目运行任务，并为各项目配置工具。"
---

# Monorepo 任务

当一个仓库包含多个各自需要不同工具、环境变量或任务的项目时，可以使用 monorepo 模式。将根配置标记为 monorepo 根目录，并列出各项目目录。之后，每个项目的任务都会获得基于路径的名称，例如 `//projects/frontend:build`；在仓库中的任意位置运行时，都会使用定义该任务的项目所配置的工具和环境。

## 设置 monorepo

在仓库根目录的 `mise.toml` 中声明根目录及其项目：

```toml
# mise.toml at the repository root
monorepo_root = true

[monorepo]
config_roots = ["projects/frontend", "projects/backend"]

[tools]
node = "24" # every project inherits this
```

每个列出的目录都有自己的配置：

```text
myproject/
├── mise.toml            # monorepo_root = true
└── projects/
    ├── frontend/
    │   └── mise.toml    # tasks: build, test
    └── backend/
        └── mise.toml    # tasks: build, test
```

mise 会将这些任务命名为 `//projects/frontend:build`、`//projects/frontend:test`、`//projects/backend:build` 和 `//projects/backend:test`。[`mise tasks --all`](/cli/tasks/ls.html) 会列出它们。

配置根目录是包含 mise 配置文件的目录。无论配置文件是 `projects/frontend/mise.toml` 还是 `projects/frontend/.mise/config.toml`，配置根目录都是 `projects/frontend`。

### 配置根目录 {#explicit-config-roots}

mise 只会加载 `[monorepo].config_roots` 中列出的目录，不会在文件系统中搜索目录。每个条目可以是相对于 monorepo 根目录的路径，也可以是匹配一层目录的 glob：

```toml
[monorepo]
config_roots = [
  "packages/frontend",
  "packages/backend",
  "services/*",
]
```

- `services/*` 这样的 glob 会匹配下一层目录。如果匹配目录中没有 mise 配置文件、`.mise/tasks/` 目录或 `mise-tasks/` 目录，就会跳过该目录。
- 列出的路径没有 mise 配置时会显示警告。
- 递归 `**` glob、绝对路径以及包含 `..` 的路径都会被忽略，并显示警告。

::: warning 自动发现已弃用
未设置 `[monorepo].config_roots` 时，mise 会遍历文件系统查找任务配置，并显示弃用警告。以下设置
[`task.monorepo_depth`](/configuration/settings.html#task.monorepo_depth),
[`task.monorepo_exclude_dirs`](/configuration/settings.html#task.monorepo_exclude_dirs),
以及 [`task.monorepo_respect_gitignore`](/configuration/settings.html#task.monorepo_respect_gitignore)
用于控制遍历行为；设置 `config_roots` 后，这些设置不再生效。
[`mise install --monorepo`](/cli/install.html) 和
[`mise ls --monorepo`](/cli/ls.html) 没有回退机制，未设置
`config_roots`。
:::

### 信任配置

在普通模式下，信任 monorepo 根目录也会信任其下的所有配置，因此运行 [`mise trust`](/cli/trust.html) 前请先检查整个仓库。在[偏执模式](/paranoid.html)下，信任根目录不会延伸至其下的配置，即使你在启用偏执模式前已经信任了根目录也一样；请逐个信任配置。一般规则请参阅[配置的信任机制](/security.html#configuration-trust)。

## 按路径运行任务 {#task-path-syntax}

使用 [`mise run`](/cli/run.html) 运行 monorepo 任务，也可以直接运行 `mise <task>`：

```sh
mise //projects/frontend:build
mise run //projects/frontend:build
```

脚本通常应使用 `mise run`，因为未来新增的 mise 子命令可能与任务同名。mise 不会添加以 `//` 或 `:` 开头的子命令，因此在 monorepo 任务中使用简写是安全的。包含 `*` 的模式应加引号，以免被 Shell 展开。

### 绝对路径

以 `//` 开头的名称表示从 monorepo 根目录开始的路径：

```sh
mise //projects/frontend:build
mise //projects/backend:test
```

### 当前项目中的任务 {#current-config-root-tasks}

以 `:` 开头的名称表示当前目录所在的最近配置根目录中的任务：

```sh
cd projects/frontend/src/components
mise :build # runs //projects/frontend:build
```

如果当前目录不在任何配置根目录内，则会相对于 monorepo 根目录解析名称。

### 不带前缀的任务名称

在配置根目录内，无论在命令行还是 `depends` 中，`build` 这样的名称都与 `:build` 解析方式相同。因此，现有项目切换到 monorepo 模式时无需重命名依赖项。新配置建议使用 `:build`，明确表示该名称相对于当前项目。

## 通配符 {#wildcard-patterns}

任务路径的目录部分支持 `...`，任务名称部分支持 `*` 或 `**`：

```sh
mise //...:test                            # test in every project
mise //projects/...:build                  # build in every project under projects/
mise //projects/.../api:build              # projects/api, projects/x/api, projects/x/y/api, ...
mise //.../frontend:build                  # build in every project directory named frontend
mise '//projects/frontend:*'               # every task in projects/frontend without a : group
mise '//projects/frontend:**'              # every task in projects/frontend, including test:unit
mise '//projects/frontend:test:*'          # test:unit, but not test:unit:fast
mise '//...:**'                            # every task in every project
mise run '//...:test' ::: '//...:test:**'  # test and every test:… task in every project
```

`...` 遵循 Bazel 和 Buck2 的约定，可匹配零个或多个目录。目录部分不支持 `//projects/*:build` 这样的 Shell 风格 glob。在任务名称部分，`*` 只匹配一个 `:` 分组中的内容，而 `**` 可以跨分组匹配，与其他[任务通配符](/tasks/running-tasks.html#wildcards)一致。

可以将相关项目放在同一目录下（例如 `services/`），并为相关任务使用相同前缀（例如 `test:`），这样一个模式就能选中它们。

## 路径别名 {#short-names-for-project-paths}

使用 `[monorepo.path_aliases]` 为配置根目录设置较短的名称：

~~~toml
monorepo_root = true

[monorepo]
config_roots = ["foo/bar/baz/abc/123"]

[monorepo.path_aliases]
"123" = "foo/bar/baz/abc/123"
~~~

此后，`mise run //123:build` 会运行 `//foo/bar/baz/abc/123:build`。该别名适用于此根目录中的所有任务，也支持 `//123:*` 这样的模式。完整路径仍是任务的规范名称，也继续有效。

别名必须是单个路径段，只能包含字母、数字、`-`、`_` 和 `.`，且不能包含 `...`。它必须直接或通过 glob 指向 `config_roots` 中列出的根目录。别名不能与配置根目录的首段相同，例如当 `projects/frontend` 是根目录时，不能将 `projects` 用作别名。

## 依赖其他项目中的任务

在 `depends` 中使用路径指定其他项目的任务：

```mise-toml
# projects/frontend/mise.toml
[tasks.build]
depends = ["//libs/shared:build", ":lint"]
run = "npm run build"
```

`//libs/shared:build` 会先于 frontend 的 `build` 运行，并使用 `libs/shared` 项目的工具和环境。如果 Turborepo、Cargo 或 Bazel 等其他构建系统已经安排了构建顺序，请让一个 mise 任务调用该构建系统，而不要在 `depends` 中重复声明相同的依赖关系。

### 相对依赖路径

以 `./` 开头的依赖路径会相对于声明它的项目解析，因此无论项目嵌套多深，都可以使用同一声明：

```toml
[tasks.test]
depends = [{ task = "./...:groups:tests:*", optional = true }]
```

如果由 `//apps/frontend:test` 声明，该路径会解析为 `//apps/frontend/...:groups:tests:*`。它会匹配该项目及其下级项目，但不会匹配同级项目。

## 工具、环境与 vars 的分层

项目任务会使用其上层所有配置中的工具和环境变量，项目自身的配置可以覆盖或补充这些设置。大多数项目共用的工具应放在根配置中，只有项目需要使用不同版本时才覆盖。

```toml
# mise.toml at the repository root
monorepo_root = true

[monorepo]
config_roots = ["projects/frontend", "projects/backend"]

[tools]
node = "24"
python = "3.13"

[env]
LOG_LEVEL = "info"
```

```mise-toml
# projects/frontend/mise.toml
[tools]
node = "22" # overrides the root's node 24

[env]
LOG_LEVEL = "debug" # overrides the root's LOG_LEVEL
PORT = "3000"       # adds a variable

[tasks.build]
run = "npm run build" # node 22, python 3.13, LOG_LEVEL=debug
```

```mise-toml
# projects/backend/mise.toml
[tasks.build]
run = "npm run build" # node 24, python 3.13, LOG_LEVEL=info from the root
```

任务的工具和环境按以下顺序合并，后面的配置优先：

1. 任务配置根目录上方的所有配置文件，顺序从全局配置开始，经过 monorepo 根目录及中间的目录。
2. 任务所在配置根目录中的配置文件。
3. 任务自身的 `tools` 和 `env`。

`vars` 也遵循相同的层级。项目任务中的模板，例如
<span v-pre>`sources = ["{{ env.SRC_DIR }}/*"]`</span>，或者使用 <span v-pre>`{{ vars.central_ref }}`</span> 的 `task_config.includes` URL，都会使用该项目的环境和 vars 渲染，无论你从何处运行任务。

任务还会收到 `MISE_MONOREPO_ROOT`（monorepo 根目录）和 `MISE_PROJECT_ROOT`（任务的配置根目录）。其他变量请参阅[任务环境](/tasks/running-tasks.html#task-environment)。

## 列出任务 {#listing-tasks}

`mise tasks` 会列出当前配置根目录及其上层配置中的任务。`mise tasks --all` 会列出 monorepo 中的所有任务。对于以下目录结构：

```text
myproject/
├── mise.toml            # task: deploy
└── projects/
    ├── frontend/
    │   └── mise.toml    # tasks: build, test
    └── backend/
        └── mise.toml    # tasks: build, serve
```

在 `projects/frontend/` 中运行：

```sh
# //:deploy, //projects/frontend:build, //projects/frontend:test
mise tasks

# also //projects/backend:build and //projects/backend:serve
mise tasks --all
```

若要从任意位置列出某个项目的任务，可筛选完整列表：

```sh
mise tasks --all --name-only | grep '^//projects/frontend:'
```

## 为所有项目安装工具 {#tools}

`mise install --monorepo` 会使用当前的 `MISE_ENV`，安装 `[monorepo].config_roots` 所列所有目录中配置工具的并集。可在 CI 中使用它，为整个仓库预热工具缓存：

```sh
MISE_ENV=ci mise install --monorepo
```

传入工具名称可只安装指定工具，同时保留各处配置的版本：

```sh
mise install --monorepo node
```

添加 `--include-task-tools` 还会安装任务在自身 `tools` 中声明的工具。`mise ls --monorepo` 会列出相同的工具并集，可用于生成 CI 缓存键，或检查哪些配置根目录声明了某个工具。

## 锁文件

设置 `[monorepo] lockfile = true`，可在 monorepo 根目录集中保存所有项目工具的一套锁文件（`mise.lock`、`mise.ci.lock`、`mise.local.lock`）；设置 `lockfile = false`，则在每个项目的配置旁分别保存锁文件。切换为 `true` 后，下一个读取或写入锁文件的命令会将各项目锁文件合并到根目录锁文件中并删除原文件；发生冲突时保留根目录条目。默认值和逐步启用计划详见[锁文件（mise.lock）](/dev-tools/mise-lock.html#monorepos)。

## 嵌套 monorepo 根目录

如果配置层级中有多个配置将 `monorepo_root = true`，则以最近的一个为准。将 Git worktree 检出到主检出目录内部时就会出现这种情况：

```text
myproject/mise.toml                       # monorepo_root = true
myproject/packages/api/mise.toml
myproject/.worktrees/feature-x/mise.toml  # monorepo_root = true (same repository, other branch)
myproject/.worktrees/feature-x/packages/api/mise.toml
```

在 `myproject/.worktrees/feature-x` 中，该目录就是 monorepo 根目录：`//packages/api:build` 会解析到 worktree 中的副本，<code v-pre>{{ config_root }}</code> 也会指向 worktree 内部，并且展开的是 worktree 自身的 `[monorepo].config_roots`。

不会加载外层 monorepo 的任务。它们属于另一个 monorepo 的任务集；若加载这些任务，就会将其放到 `//` 命名空间之外，使主检出中的 `build` 与 worktree 中的 `//:build` 并列。全局配置或 `$HOME/mise.toml` 等外层根目录上方的配置仍会像往常一样提供任务。

外层配置仍是工具、环境变量和 vars 的祖先配置，会像其他父配置一样向下传递这些设置。若也要避免这种继承，请将 worktree 放在主检出目录之外，例如 `myproject-worktrees/feature-x`。

## 共用任务定义 {#task-templates}

在根配置中定义[任务模板](/tasks/templates.html#monorepo-usage)，然后由每个项目通过 `extends` 继承。若要为所有项目中同名任务设置一致的默认值，而不修改各项目配置，请使用
[`[monorepo.task_defaults]`](/tasks/workspace-graph.html#root-task-defaults).

## `[monorepo]` 参考

`monorepo_root = true` 用于标记配置根目录。以下键应放在该根目录配置的 `[monorepo]` 段中：

| 键              | 类型                       | 默认值  | 说明                                                                                                      |
| --------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `config_roots`  | 字符串数组                 | 无      | 项目目录，可以是路径或单层 glob。参见[配置根目录](#explicit-config-roots)                                |
| `path_aliases`  | 字符串表                   | `{}`    | 配置根目录的短名称。参见[路径别名](#short-names-for-project-paths)                                        |
| `lockfile`      | 布尔值                     | 未设置  | 根目录或各项目分别使用锁文件。参见[锁文件](#lockfiles)                                                   |
| `task_defaults` | 任务定义表                 | `{}`    | 按任务名称设置默认值。参见[根任务默认值](/tasks/workspace-graph.html#root-task-defaults)                 |
| `projects`      | 项目覆盖表                 | `{}`    | 修正项目图。参见[项目覆盖](/tasks/workspace-graph.html#project-overrides)                                |

## 后续步骤

- [工作区项目图](/tasks/workspace-graph.html)：
  根据 Cargo、uv、Go、Gradle 和 Node.js 工作区推断项目及其依赖关系，只运行受影响的任务，并导入软件包脚本。
- [任务模板](/tasks/templates.html)：在项目之间共用任务定义。
- [任务缓存](/tasks/caching.html)：跳过输入未变化的任务，或从缓存恢复任务。
