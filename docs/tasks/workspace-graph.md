---
description: "根据 Cargo、uv、Go、Gradle 和 Node.js 工作区推断单体仓库中的项目及其依赖关系，并运行受影响的任务及其上游任务。"
socialDescription: "根据 Cargo、uv、Go、Gradle 和 Node.js 工作区推断单体仓库项目，并运行受影响的任务。"
---

# 工作区项目关系图

mise 可以读取 Cargo、uv、Go、Gradle 和 Node.js 工作区清单，从而识别[单体仓库](/tasks/monorepo.html)包含哪些项目及其依赖关系。你可以使用该图只运行受更改影响的项目中的任务、先运行上游项目的任务，并将 Node.js 软件包脚本导入为任务。

项目关系图与配置根目录相互独立。配置根目录用于告诉 mise 任务配置的位置；项目关系图则由各生态系统的清单推断而来。项目无需自带 `mise.toml` 也可以出现在图中。

## 设置项目关系图 {#set-up-the-graph}

将仓库根目录标记为 monorepo 根目录，并设置 `[monorepo].config_roots`：

```toml
# 仓库根目录中的 mise.toml
monorepo_root = true

[monorepo]
config_roots = ["apps/*", "packages/*"]
```

未设置 [`config_roots`](/tasks/monorepo.html#explicit-config-roots) 时，mise 会退回到已弃用的文件系统遍历方式并显示警告。无论项目是否有 mise 配置，都会出现在关系图中。`packages/*` 这样的 glob 会静默跳过没有配置的项目；如果显式指定一个没有配置的项目路径，则每次 mise 加载任务时都会显示警告。

查看 mise 发现的项目：

```sh
mise tasks graph            # 列出每个项目的 ID、根目录、依赖项和元数据
mise tasks graph --explain  # 显示各项目、边和任务由哪个提供方及文件提供
mise tasks graph --json     # 以 JSON 格式输出相同信息
```

`--explain` 还会显示提供方建议的任务字段（例如 inputs 或 outputs）来自哪个提供方和清单。来自 [`[monorepo.projects]`](#project-overrides) 覆盖配置的值会标记为 `configuration`。JSON 输出会在每个项目的 `provenance`、`dependency_provenance` 和 `tasks` 字段中提供相同信息。任务建议包含字段级来源信息，因此其他工具可以分辨某个输出声明来自 `turbo.json` 还是根任务默认值。

## 项目提供方 {#providers}

| 提供方   | 发现依据                                                          | 项目 ID                        | 依赖关系边来源                                                                                                  |
| -------- | ----------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Cargo    | 根目录 `Cargo.toml` 中的 `[workspace]` 表                          | `cargo:<package.name>`         | `path` 依赖，包括声明了 `workspace = true` 的依赖                                                              |
| uv       | 根目录 `pyproject.toml` 中的 `[tool.uv.workspace]` 表              | `uv:<normalized project.name>` | `[tool.uv.sources]` 中声明 `workspace = true` 或包含 `path` 的条目                                              |
| Go       | 根目录 `go.work` 中的 `use` 指令                                   | `go:<module path>`             | 无；请使用[项目覆盖配置](#project-overrides)添加                                                               |
| Gradle   | 根目录 `settings.gradle(.kts)` 中的 `include` 指令                 | `gradle:<project path>`        | `dependencies {}` 块中的 `project(":x")` 引用                                                                  |
| Node.js  | `pnpm-workspace.yaml` 或根目录 `package.json` 中的 `workspaces`    | `node:<package name>`          | `dependencies`、`devDependencies`、`optionalDependencies` 和 `peerDependencies` 中指向工作区软件包的条目       |

项目 ID 来自生态系统元数据，而不是目录，因此移动项目不会改变其 ID。每个提供方都会直接解析清单：构建项目图不需要安装 `cargo`、`uv`、Python、`go`、Gradle 或 Node.js 包管理器；运行导入的 Node.js 脚本则需要安装相应的包管理器。

如果依赖项解析到项目自身，就不会创建依赖边。如果推断出的依赖边形成循环，[`mise tasks graph`](/cli/tasks/graph.html) 会报告该问题，你可以通过项目覆盖打破循环。

### Cargo 工作区 {#cargo-workspaces}

mise 会展开工作区的 `members` 模式并遵循 `exclude` 设置；如果工作区清单也包含 `[package]`，还会纳入根软件包。与 Cargo 相同，工作区根目录内由路径依赖引用的软件包也会自动纳入。工作区之外的路径仍属于外部依赖，不会加入关系图。每个软件包都必须设置 `[package].name`。`mise tasks graph` 会将软件包根目录和根目录中的 `Cargo.toml` 报告为工作区定义来源。

普通、开发、构建和目标平台专属依赖表中带本地 `path` 的依赖会形成依赖边。重命名依赖按路径解析；声明了 `workspace = true` 的依赖会从根 `[workspace.dependencies]` 表中获取路径。只指定版本号的依赖、注册表依赖、工作区之外的路径依赖，以及位于排除路径下的依赖都会被忽略。

### uv 工作区 {#uv-workspaces}

mise 会展开 `members` glob 并遵循 `exclude` 设置。根目录 `pyproject.toml` 含有 `[project]` 表时，根项目也会纳入关系图；没有该表的虚拟工作区根目录不算项目。每个项目都必须定义 `[project].name`。mise 会将 `my_package`、`my.package` 和 `my-package` 等等效拼写规范化为同一 ID：`uv:my-package`。

monorepo 根目录下的本地目录来源也会作为项目纳入，即使它们已从 uv 工作区中排除，因此路径依赖仍能建立依赖边。

mise 会从 `[project].dependencies`、可选依赖组、`[dependency-groups]` 和 uv 的旧版 `dev-dependencies` 中读取依赖。只有匹配的 `[tool.uv.sources]` 条目通过 `workspace = true` 选择了工作区成员，或通过 `path` 指向仓库中的项目目录时，才会添加依赖边。除非工作区成员覆盖某项依赖的来源，否则根目录中的来源声明会应用于工作区成员。如果来源是包含环境标记的数组，只要其中有一个本地选项就会添加依赖边，因为关系图与平台无关。注册表、Git、URL、wheel、源码归档和外部工作区来源都不会添加项目或依赖边。

### Go 工作区 {#go-workspaces}

mise 会读取单独的 `use` 指令和 `use` 块。每个列出的目录都必须包含带有 `module` 指令的 `go.mod`。monorepo 根目录以外的模块会被忽略，因为关系图中的项目根目录必须是相对于仓库的路径。

mise 不会根据 `require` 或 `replace` 推断依赖边。这些指令描述模块选择，不一定代表任务关系图所需的构建依赖关系。请通过覆盖配置添加需要的依赖边：

```toml
[monorepo.projects."go:example.com/acme/api"]
depends_add = ["go:example.com/acme/lib"]
```

### Gradle 工作区 {#gradle-workspaces}

mise 会以 Groovy 或 Kotlin 语法读取单体仓库根目录的 `settings.gradle` 或 `settings.gradle.kts` 中的字面 `include` 指令。它不会运行 Gradle 或其包装器。项目 ID 使用 Gradle 自身的项目路径：`:app` 会成为 `gradle::app`，`:services:person-service` 会成为 `gradle::services:person-service`，根项目则为 `gradle::`。只有根项目本身带有构建脚本时才会纳入；对于 `include(":services:api")` 隐含的 `:services` 等父项目，也只有其存在构建脚本时才会纳入。`project(":x").projectDir = file("...")` 重映射会设置项目根目录；否则，根目录就是路径所指的目录。绝对路径或包含 `..` 的根目录会被跳过，因为项目根目录必须位于仓库之内。

依赖边来自项目构建脚本顶层 `dependencies {}` 块中的字面引用：`project(":lib")`、`project(path: ":lib")` 和 `project(path = ":lib")`。mise 不会识别通过 `subprojects {}`、`allprojects {}`、`project(":x") {}` 或约定插件添加的依赖；请使用[项目覆盖配置](#project-overrides)添加这些依赖。mise 不会读取 `includeBuild`、版本目录或类型安全的项目访问器。修改 settings 脚本会影响所有项目。

Gradle settings 是可执行脚本，因此 mise 不会猜测其含义。如果 `include` 参数不是字符串字面量（例如变量、插值、拼接，或遍历文件系统的循环），如果 `include` 带有条件或位于代码块内，如果 `projectDir` 不是 `file("...")` 字面量，或者两个 settings 脚本同时存在，mise 都会报告错误。请在 `[monorepo.projects]` 下声明项目，以接管该提供方的发现结果：

```toml
[monorepo.projects."gradle::app"]
root = "app"

[monorepo.projects."gradle::lib"]
root = "lib"
```

### Node.js 工作区 {#nodejs-workspaces}

mise 会通过以下文件发现 npm、pnpm、Yarn 和 Bun 工作区软件包：

- `pnpm-workspace.yaml`
- 根目录 `package.json` 中的 `workspaces` 数组
- `workspaces` 的单模式字符串写法
- Yarn Classic 的对象写法 `workspaces.packages`

两个文件同时存在时，以 `pnpm-workspace.yaml` 确定工作区成员。对于 pnpm 和 Yarn 工作区，根目录 `package.json` 若设置了 `name`，也会作为项目纳入。支持正向和排除模式、递归 `**` glob，以及 `packages/{web,api}` 这样的花括号模式。发现过程中会跳过 `.git` 和 `node_modules`，但不会读取 `.gitignore` 或 `.ignore` 文件。

每个软件包都必须在 `package.json` 中设置 `name`。`mise tasks graph` 还会报告软件包根目录、工作区定义文件和检测到的包管理器。

依赖名称与另一个工作区软件包完全匹配时，就会建立依赖边。版本字符串按不透明文本处理：`workspace:*`、`catalog:`、`*`、版本范围或其他写法都会建立相同的依赖边，mise 不会解析或比较这些值。四种依赖类型都会计入，包括开发依赖。如果实际构建关系与清单不同，请在项目覆盖中使用 `depends`、`depends_add` 或 `depends_remove`。

## 运行受影响项目的任务 {#affected-tasks}

[`mise run --affected <task>`](/cli/run.html) 只会在发生更改的项目，以及依赖这些项目的项目中运行任务。更改可以是两个 Git 版本之间的提交，也可以是工作区中的编辑：

```sh
# 在 HEAD 或未提交的编辑影响到的项目中运行 build
mise run --affected build

# 仅考虑尚未提交的更改
mise run --affected --affected-uncommitted --affected-untracked build

# 显示每个项目入选的原因，但不实际运行
mise run --affected --affected-explain --dry-run build

# 将入选项目以 JSON 输出，但不运行任务
mise run --affected --affected-json build

# 比较指定的版本
mise run --affected --affected-base origin/main --affected-head HEAD test
```

单独指定任务名称（例如 `build`）时，对应的是 `//...:build`，即每个项目中名为 `build` 的任务。mise 会合并以下三种更改来源：

- **已提交**：从 merge base 起，`<base>...<head>` 中 head 一侧的更改；
- **未提交**：与 `HEAD` 比较后得到的已暂存和未暂存跟踪文件编辑；
- **未跟踪**：未被 `.gitignore` 排除的新文件。

只有 head 版本就是当前检出的提交时，工作区更改才会计入。使用其他 `--affected-head` 时，mise 只比较已提交的版本范围。CI 中的工作区通常是干净的，因此结果与只比较已提交版本范围相同。

指定更改来源可缩小项目选择范围。只要指定其中任意来源，其他未指定的来源就不会计入；指定的来源会合并计算：

| 选项                     | 环境变量                    | 计入的更改                 |
| ------------------------ | --------------------------- | -------------------------- |
| `--affected-committed`   | `MISE_AFFECTED_COMMITTED`   | 已提交的版本范围            |
| `--affected-uncommitted` | `MISE_AFFECTED_UNCOMMITTED` | 已暂存和未暂存的编辑        |
| `--affected-untracked`   | `MISE_AFFECTED_UNTRACKED`   | 未跟踪且未忽略的文件        |

使用 `--affected-committed` 可忽略工作区内容，确保每次运行可复现。head 版本不是当前检出提交时，`--affected-uncommitted` 和 `--affected-untracked` 会失败。

mise 会选择：

- 拥有每个更改文件的项目（即包含该文件的最深层项目根目录）；
- 当更改文件不属于任何项目或匹配 [`task_config.global_inputs`](/tasks/caching.html#inputs-shared-by-every-task) 时，选择所有项目；
- 对于已更改的 `pnpm-lock.yaml`，只选择锁文件条目发生更改的 Node.js 项目；工作区更改计入时，会将 merge base 与工作区进行比较（其他锁文件按普通文件处理）；
- 直接或间接依赖于已选项目的所有项目。

然后，mise 会在这些项目中运行匹配的任务。任务依赖项仍按常规执行，因此已选任务仍可能在未更改的项目中运行前置任务。

`--affected-explain` 会列出每个入选项目及其入选原因（`changed path`、`workspace-global path`、`lockfile change` 或 `depends on affected project`），随后列出匹配的任务及所属项目：

```text
Affected projects (HEAD~1...HEAD):
  node:@acme/ui (packages/ui)
    changed path: packages/ui/index.js
  node:@acme/web (apps/web)
    depends on affected project: node:@acme/ui
Affected tasks:
  node:@acme/web#build
    affected project: node:@acme/web
  node:@acme/ui#build
    affected project: node:@acme/ui
```

`--affected-json` 会以对象形式输出相同的选择结果，其中包含 `base` 和 `head` 版本、受影响的 `projects`（含根目录和原因），以及匹配的 `tasks`（含项目 ID）。

mise 按以下优先级选择版本：

1. `--affected-base` 和 `--affected-head`。
2. `MISE_AFFECTED_BASE` and `MISE_AFFECTED_HEAD`.
3. CI 元数据。在 GitHub Actions 中，pull request 会设置 base `origin/$GITHUB_BASE_REF`，head 为 `$GITHUB_SHA`。在 GitLab CI 中，base 为 `$CI_MERGE_REQUEST_DIFF_BASE_SHA` 或 `origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME`，head 为 `$CI_COMMIT_SHA`。
4. `HEAD~1` 和 `HEAD`。

两个版本都必须存在于克隆仓库中，因此 CI 需要获取足够的提交历史，例如在 `actions/checkout` 中设置 `fetch-depth: 0`。

## Node.js 软件包脚本 {#node-package-scripts}

mise 可以将每个 Node.js 工作区软件包中的 `scripts` 导入为任务，因此软件包不需要自己的 `mise.toml`。在 monorepo 根配置中启用此功能：

```toml
[settings]
task.auto_infer = ["node"]
```

导入的任务名称由项目 ID、`#` 和脚本名称组成。也可以使用 monorepo 路径运行它，因此路径模式同样可以选中该任务：

```sh
mise run 'node:@acme/web#build'
mise run //apps/web:build
mise //...:test
```

该任务会在软件包目录中运行 `<package manager> run <script> --`，并将任务参数传递给脚本。mise 会依次从 `pnpm-workspace.yaml`、根目录的 `packageManager` 字段和锁文件（`bun.lock` 或 `bun.lockb`、`pnpm-lock.yaml`、`yarn.lock`、`package-lock.json` 或 `npm-shrinkwrap.json`）判断包管理器；如果都没有，则回退到 npm。包管理器必须位于 `PATH` 中，例如通过 `[tools]` 提供。 [`mise tasks info`](/cli/tasks/info.html) 会将该软件包的 `package.json` 显示为任务来源。

在软件包 monorepo 路径上显式定义 mise 任务后，它会替代导入的脚本。此时使用任一名称都会运行这个显式任务。

## 根任务默认值 {#root-task-defaults}

在根目录的 `mise.toml` 中使用 `[monorepo.task_defaults.<name>]`，为每个项目中的同名任务设置统一默认值：

```toml
[monorepo.task_defaults.build]
sources = ["src/**", "package.json"]
outputs = ["dist/**"]
cache = { enabled = true }

[monorepo.task_defaults.test]
env = { NODE_ENV = "test" }
```

这些默认值适用于 `node:@acme/web#build` 等导入任务，以及 `//apps/web:build` 等显式 mise 任务，覆盖关系图中的每个项目、每个配置根目录和通过覆盖添加的项目。它们只会填充任务尚未设置的字段。

### 任务定义优先级 {#task-definition-precedence}

mise 分两个阶段解析任务定义。首先，显式项目任务会替代同一项目、同名的导入任务，而导入任务使用项目 ID 的名称则会成为该显式任务的别名。

然后，mise 按优先级从高到低填充尚未设置的字段：

1. 任务自身的字段，来自项目配置或提供方。
2. 显式任务通过 `extends` 指定的[任务模板](/tasks/templates.html)。
3. 匹配的 `[monorepo.task_defaults.<name>]` 条目。

`env`、`vars` 和 `tools` 等映射字段会在这些层之间合并，每个条目以优先级较高的层为准。`depends`、`sources` 和 `outputs` 等集合字段则完整采用最高优先级且定义了该字段的值。合并方式遵循[任务模板合并规则](/tasks/templates.html#merge-semantics)，但有一项例外：根任务默认值只会在任务没有 `usage` 时提供该字段，而 `extends` 指定的模板会将自己的 usage 规范添加到任务之前。

例如，即使根默认值也定义了 `run`，导入脚本仍会保留自己的命令，但会继承提供方未设置的缓存输入和环境变量。如果项目之后显式定义该任务，显式命令会替代脚本；命名模板会先于根默认值填充任务缺少的字段。

## 提供方的任务建议 {#provider-task-suggestions}

生态系统元数据含有明确声明时，提供方可以补充任务配置：

- 相对于项目的输入模式，用作任务的 `sources`；
- 相对于项目的输出模式，包括显式声明任务不会写入任何文件；
- 是否启用[制品缓存](/tasks/caching.html#enable-artifact-caching)；
- 项目内的任务依赖以及 `^task` 依赖。

建议配置属于导入任务的一部分，因此优先级与提供方的命令相同。匹配的显式任务会替代这些建议；否则，任务模板和根任务默认值只会填充提供方尚未设置的字段。元数据不具备权威性时，提供方会保留该字段为空；mise 绝不会根据命令字符串猜测输出或缓存行为。

Node.js 提供方会从根目录 `turbo.json` 的 `tasks` 中读取 `inputs`、`outputs`、`cache` 和 `dependsOn`。`<package>#<task>` 条目的优先级高于普通 `<task>` 条目。mise 无法精确复现的模式（例如包含 `$TURBO_ROOT$` 的模式）会保持未设置，让任务模板或根任务默认值来提供。

## 上游任务依赖 {#upstream-task-dependencies}

在依赖项前加上 `^`，即可先在上游项目中运行该任务。通常可以在根任务默认值中为整个工作区统一设置：

```toml
[monorepo.task_defaults.build]
depends = ["^build"]
```

现在运行 `node:@acme/web#build` 时，mise 会先在 `@acme/web` 依赖的每个项目中运行 `build`，再构建 `@acme/web`。mise 会沿整个项目关系图遍历，包括没有 `build` 任务的项目，并跳过缺少该任务的项目。对于不在项目关系图中的配置根目录，`^build` 不会执行任何操作。

`^` 只能用于 `depends`。mise 会拒绝在 `depends_post` 和 `wait_for` 中使用它，因为这两个字段不表示前置依赖。上游依赖同时适用于导入任务和显式任务，并与其他 `depends` 条目共用同一调度器，支持循环检测、去重、并行执行和[缓存键](/tasks/caching.html#what-goes-into-the-cache-key)传递。

## 项目覆盖 {#project-overrides}

在根目录 `mise.toml` 中使用 `[monorepo.projects]`，修正或扩展提供方推断出的内容。项目 ID 中包含 `:`，因此需要加引号：

```toml
[monorepo.projects."node:@acme/web"]
root = "apps/web"
depends_add = ["custom:docs"]
depends_remove = ["node:@acme/legacy"]

[monorepo.projects."custom:docs"]
root = "docs"
metadata = { kind = "documentation" }
```

| 字段             | 作用                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `remove`         | 设为 `true` 会移除项目及其所有关联边；不能与其他字段同时设置                                        |
| `root`           | 替换推断出的根目录；如果 ID 是新的，则添加项目                                                      |
| `metadata`       | 替换推断出的元数据                                                                                 |
| `depends`        | 替换全部推断出的依赖                                                                               |
| `depends_add`    | 在替换 `depends` 后添加依赖边                                                                      |
| `depends_remove` | 在替换 `depends` 后移除依赖边                                                                      |

新项目需要带命名空间的 ID（例如 `custom:docs`）和 `root`。同一依赖不能同时添加和移除。最终关系图只能引用现有项目 ID，且不能有循环；诊断信息会列出涉及的项目以及可用于修复关系图的覆盖字段。

如果某个提供方无法读取工作区元数据，运行 [`mise tasks graph`](/cli/tasks/graph.html) 或 `mise run --affected` 时就会返回该提供方的错误。在该提供方的命名空间中声明项目（例如 `go:example.com/acme/api`）即可接管其发现结果：此时会忽略发现错误，而你声明的项目将构成该提供方的全部内容。
