# 单仓库任务

mise 支持使用目标路径语法的单仓库风格任务组织。此功能允许你在单个仓库中管理多个项目的任务，其中每个项目都可以拥有自己的 `mise.toml` 配置，包含工具、环境变量以及任务，这些任务可能与调用任务的位置不同。

## 概述

当在你的根目录 `mise.toml` 中启用 `monorepo_root` 时，mise 会自动发现子目录中的任务，并使用它们相对于 monorepo 根目录的路径作为前缀。这会在整个仓库中创建一个统一的任务命名空间。

::: tip
包含 `mise.toml` 文件的目录称为 **config_root**。在 monorepo 模式下，每个项目都可以有自己的 config_root 及其各自的配置，与 monorepo 根目录分开。请注意，如果你在子目录中使用诸如 `./projects/frontend/.mise/config.toml` 这样的其他路径，config_root 将是 `./projects/frontend`——而不是 `./projects/frontend/.mise`。
:::

### 优势

- **一致的执行方式**：使用如果从任务所在目录调用时会设置的 mise 配置，可从 monorepo 中的任意位置运行任务
- **清晰的任务命名空间**：任务会以前缀形式标明它们在 monorepo 根目录下的位置
- **基于模式的执行**：使用通配符跨多个项目运行任务
- **工具与环境分层**：子目录任务会使用父级配置中的工具和环境变量，但也可以在其 config_root 中定义自己的配置
- **自动信任传递**：当 monorepo 根目录被信任时，所有后代配置都会自动被信任。

## 配置

### 启用 Monorepo 模式

将 `monorepo_root = true` 添加到你的根 `mise.toml`：

```toml
# /myproject/mise.toml
monorepo_root = true

[tools]
# 此处定义的工具会应用于所有子目录
node = "20"
```

### 示例结构

```
myproject/
├── mise.toml（包含 monorepo_root = true）
├── projects/
│   ├── frontend/
│   │   └── mise.toml（包含任务：build、test）
│   └── backend/
│       └── mise.toml（包含任务：build、test）
```

使用此结构时，任务会自动添加命名空间：

- `//projects/frontend:build`
- `//projects/frontend:test`
- `//projects/backend:build`
- `//projects/backend:test`

## 任务路径语法

Monorepo 任务使用带有 `//` 和 `:` 前缀的特殊路径语法。你可以直接使用 `mise` 或 `mise run` 来运行这些任务。对于非 monorepo 任务，建议避免为脚本使用直接语法，因为它可能会与未来的 core mise 命令冲突。不过，mise 永远不会定义带有 `//` 或 `:` 前缀的命令，因此这一建议不适用于 monorepo 任务。

```bash
# 直接语法（monorepo 任务首选）
mise //projects/frontend:build

# 使用 'run' 也可以
mise run //projects/frontend:build

# 通配符需要加引号
mise '//projects/frontend:*'
```

### 绝对路径

使用 `//` 前缀从 monorepo 根目录指定绝对路径：

```bash
# 运行 frontend 项目中的 build 任务
mise //projects/frontend:build

# 运行 backend 项目中的 test 任务
mise //projects/backend:test
```

### 当前 config_root 任务

使用 `:` 前缀运行当前 config_root 中的任务：

```bash
cd projects/frontend
mise :build  # 从 frontend 的 config_root 运行 build 任务
```

这适用于 config_root 下的任意目录，而不仅仅是 config_root 本身。任务名称会解析到最近的上层 config_root，因此，`cd projects/frontend/src/components
&& mise :build` 也会运行 frontend 的 `build`。如果当前目录不在任何 config_root 内，则该名称会相对于 monorepo 根目录解析。

::: tip 可选的冒号语法
从子目录运行任务或定义任务依赖时，开头的 `:` 是可选的。两种语法都有效，但**我们建议使用 `:` 前缀，以明确表示** monorepo 任务引用。

**从子目录运行：**

```bash
cd projects/frontend
mise :build      # 推荐：明确的 monorepo 任务引用
mise build       # 也可以（用于迁移兼容）
```

**任务依赖：**

```toml
# projects/frontend/mise.toml
[tasks.lint]
run = "eslint ."

[tasks.build]
depends = [":lint"]  # 推荐：明确且清晰
# 或者
depends = ["lint"]   # 也可以（用于迁移兼容）
run = "webpack build"
```

以 `./` 开头的依赖路径会相对于声明它们的任务进行解析。这样就可以在 monorepo 的不同层级复用相同的依赖声明：

```toml
[tasks.test]
depends = [{ task = "./...:groups:tests:*", optional = true }]
```

例如，当由 `//apps/frontend:test` 声明时，此模式会解析为
`//apps/frontend/...:groups:tests:*`，并匹配当前项目及其子项目，但不会匹配同级项目。

不带 `:` 的裸名称语法主要用于便于从非 monorepo 配置迁移到 monorepo 配置。迁移时，你不需要立即更新所有任务依赖——它们会继续正常工作。不过，使用 `:` 前缀可以明确表示你引用的是当前 config_root 中的任务。
:::

### 通配符模式

mise 支持两种类型的通配符，以便灵活执行任务：

#### 路径通配符（`...`）

使用省略号（`...`）匹配任意目录深度：

```bash
# 运行所有项目中的 'test' 任务（任意深度）
mise //...:test

# 运行 projects/ 下所有子目录中的 'build'
mise //projects/...:build

# 匹配中间带有通配符的路径
mise //projects/.../api:build  # 匹配 projects/*/api 和 projects/*/*/api
```

::: info
未来版本可能会添加额外的 glob 模式，因此 `mise //projects/*:build`
和 `mise '//projects/**:build'` 很可能会受支持。我们使用 `...` 是因为它与
bazel 和 buck2 的做法一致。
:::

#### 任务名通配符（`*`）

使用星号（`*`）匹配任务名称：

```bash
# 运行 frontend 项目中的所有任务
mise '//projects/frontend:*'

# 运行所有以 'test:' 开头的任务
mise '//projects/frontend:test:*'

# 在所有项目中运行 'lint' 任务
mise //...:lint
```

### 组合通配符

你可以将两种通配符组合起来，形成更强大的模式：

```bash
# 运行所有项目中的所有任务（不知道为什么你会想这么做，但确实可以）
mise '//...:*'

# 运行所有项目中的所有 test 任务
mise '//...:test*'

# 运行所有前端相关项目中的 build 任务
mise //.../frontend:build
```

## 工具、环境和变量分层

子目录任务会自动使用层级中父级配置文件中的工具和环境变量。不过，每个子目录也可以在自己的 `config_root` 中定义自己的工具和环境变量。这使你可以：

1. 在 monorepo 根目录定义通用工具和环境
2. 在特定子目录中覆盖工具或环境
3. 在子目录中添加额外的工具或环境

`vars` 在任务模板中遵循相同的层级，因此从 monorepo 根目录运行子目录任务时，可以使用子配置中的变量。

像 <span v-pre>`sources = ["{{env.SRC_DIR}}/*"]`</span> 这样的任务模板会使用该任务自身配置层级中的 env 进行渲染，因此无论任务从哪里被调用，子项目的 `[env]` 部分都会生效。

子级 `task_config.includes` 模板也可以引用继承的 vars，这对集中管理任务 include 很有用，例如 <span v-pre>`git::https://example.com/tasks.git//go.toml?ref={{vars.central_ref}}`</span>。

### 分层示例

```toml
# /myproject/mise.toml
monorepo_root = true

[tools]
node = "20"      # 对所有子目录可用
python = "3.12"  # 对所有子目录可用

[env]
LOG_LEVEL = "info"  # 对所有子目录可用
```

```toml
# /myproject/projects/frontend/mise.toml
[tools]
node = "18"  # 覆盖根目录的 node 20

[env]
LOG_LEVEL = "debug"  # 覆盖根目录的 LOG_LEVEL
PORT = "3000"        # 添加新的环境变量

[tasks.build]
run = "npm run build"  # 使用 node 18 和 LOG_LEVEL=debug
```

```toml
# /myproject/projects/backend/mise.toml
# 没有 tools 或 env 部分 - 使用根目录中的 node 20、python 3.12 和 LOG_LEVEL=info

[tasks.build]
run = "npm run build"  # 使用根目录中的 node 20 和 LOG_LEVEL=info
```

### 分层规则

1. **基础工具集和环境**：任务从所有全局配置文件（包括层级中的父级配置）中的工具和环境开始
2. **子目录覆盖**：子目录配置文件中定义的工具和环境会在其上进行合并，从而允许覆盖
3. **任务特定工具和环境**：在任务的 `tools` 和 `env` 属性中定义的值具有最高优先级。

## 工具

使用 `mise install --monorepo` 从 `[monorepo].config_roots` 中列出的每个目录安装工具的并集。这在 CI 中很有用，当你想为仓库中的所有项目预热缓存时：

```bash
MISE_ENV=ci mise install --monorepo
```

传入工具名称会对并集进行过滤，同时保留多个已配置版本：

```bash
mise install --monorepo node
```

`mise ls --monorepo` 会列出相同的并集，并可用于检查缓存键或调试哪些 config roots 提供了工具。这两个命令都要求 `monorepo_root = true` 以及显式的 `[monorepo].config_roots`。

## 锁文件

单体仓库可以在 monorepo 根目录使用一个锁文件。来自 `packages/api/mise.toml` 的工具会写入 `<monorepo_root>/mise.lock`，而环境和本地变体会写入根目录文件，例如 `mise.ci.lock` 和 `mise.local.lock`。

这正在作为一个三态设置逐步推出。在推出窗口期间，未设置时会保持当前按子项目分别使用锁文件的行为。现在设置 `lockfile = true` 即可启用根目录锁文件：

```toml
[monorepo]
lockfile = true
```

如果 mise 发现了旧的子项目锁文件，它会在下一次运行支持锁文件的命令时将它们迁移到根锁文件中。冲突时以根目录条目为准，唯一的子项目条目会被保留，已迁移的子项目锁文件将被删除。

如果想在默认行为改变后仍将锁文件保留在每个子项目配置旁边，可以在 monorepo 根目录中固定旧行为：

```toml
[monorepo]
lockfile = false
```

使用 `mise*.lock` 文件且未设置该项的 monorepo，将在 mise `2026.12.0` 中开始显示警告，并在 mise `2027.6.0` 中默认使用根锁文件。较旧版本的 mise 不理解由单体仓库统一管理、但由子项目拥有的工具的锁文件。需要混合版本兼容的团队应使用 `lockfile = false`，直到所有人都完成升级。

## 配置根目录

你必须使用 `[monorepo]` 部分显式列出你的配置根目录：

```toml
# /myproject/mise.toml
monorepo_root = true

[monorepo]
config_roots = [
    "packages/frontend",
    "packages/backend",
    "services/*",          # 单层通配符模式
]
```

这会告诉 mise 哪些目录包含项目配置。优势：

- **快速发现**：无需遍历文件系统
- **显式控制**：只包含你列出的项目
- **支持通配符**：使用 `*` 表示单层模式（例如，`services/*` 匹配 `services/api`、`services/worker`）

::: tip
支持单层通配符（`*`），但不支持递归通配符（`**`）。这样既能保证可预测的性能，又能保持灵活的模式。
:::

::: warning 自动发现已弃用
通过自动遍历文件系统来发现 monorepo 子目录的方式已弃用。如果你没有定义 `[monorepo].config_roots`，mise 仍然会遍历文件系统，但会发出弃用警告。请迁移到显式配置根目录。
:::

### 嵌套的 Monorepo 根目录

当层级结构中的多个配置将 `monorepo_root = true` 时，**最近的**配置优先。这种情况会出现在检出到主检出目录内部的 git worktree 中：

```
myproject/mise.toml                       # monorepo_root = true
myproject/packages/api/mise.toml
myproject/.worktrees/feature-x/mise.toml  # monorepo_root = true (同一仓库的其他分支)
myproject/.worktrees/feature-x/packages/api/mise.toml
```

在 `myproject/.worktrees/feature-x` 内部时，该目录就是 monorepo 根目录：`//packages/api:build` 会解析到 worktree 中的副本，`{{config_root}}` 会指向 worktree 内部，并且会展开 worktree 自身的 `[monorepo].config_roots`。

**外层** monorepo 中的任务不会被加载。它们属于另一个 monorepo 的任务集，而不是所选根目录的父级命名空间；因此加载它们会将其置于 `//` 命名空间之外——你会看到主检出目录中的 `build` 与 worktree 中的 `//:build` 并列。外层根目录之上的所有内容（你的全局配置、`$HOME/mise.toml`）都不受影响，仍会像往常一样提供任务。

外层配置仍然是**工具、环境变量和变量**的祖先配置，它们会像继承任何父配置一样继承。如果你连这些内容也不希望继承，请将 worktree 保存在主检出目录之外（例如 `myproject-worktrees/feature-x`）。

## 工作区项目图（实验性）

mise 可以根据生态系统工作区元数据推断出一个与提供程序无关的项目图。此图与从配置根目录发现任务的机制分离：项目无需拥有自己的 `mise.toml` 也可以出现在图中。

启用实验性功能并标记仓库根目录：

```toml
# /myproject/mise.toml
experimental = true
monorepo_root = true
```

使用以下命令检查推断出的项目：

```bash
mise tasks graph
mise tasks graph --explain
mise tasks graph --json
```

使用 `--explain` 查看每个项目、依赖边和任务是由哪个工作区提供程序推断出的。
当提供程序建议任务输入、输出、可缓存性或依赖项时，解释信息还会显示每个建议字段对应的提供程序和生态系统元数据文件。由
`[monorepo.projects]` 覆盖项引入的值会标记为 `configuration`，而不是归因于某个提供程序。

JSON 输出会在每个项目的 `provenance`、`dependency_provenance` 和 `tasks` 字段中包含相同的信息。任务建议包含字段级来源信息，因此其他工具可以区分例如来自
`turbo.json` 的输出声明和根 mise 任务默认值。

### 受影响的任务

使用 `mise run --affected <task-pattern>`，仅在两个 Git
修订版本之间发生变更的项目中运行任务。mise 会选择拥有变更路径的项目，然后沿着反向项目依赖关系继续选择，
因此也会包含下游项目。工作区全局路径和 `task_config.global_inputs` 会选择整个工作区。Provider 可能会将锁文件变更缩小到外部依赖发生变化的项目。

```bash
# 比较 HEAD 与其第一个父提交，并运行受影响的构建任务
mise run --affected build

# 在保留正常试运行行为的同时检查选择结果
mise run --affected --affected-explain --dry-run build

# 将选择结果输出为 JSON，但不运行任务
mise run --affected --affected-json build

# 比较显式指定的修订版本
mise run --affected --affected-base origin/main --affected-head HEAD test
```

`--affected-explain` 会列出每个选中的项目及其原因：项目拥有的变更路径、工作区全局路径、由 Provider
归属的锁文件，或依赖于另一个受影响的项目。它还会列出与这些项目关联的任务模式匹配结果。正常的任务依赖关系会在之后展开，因此选中的任务仍可能运行未变更项目中的必需前置任务。

`--affected-json` 会输出相同的展开前选择结果，但不会运行任务。其稳定的 JSON 对象包含基础修订版本和头部修订版本、包含根目录和原因的受影响项目，以及包含关联项目 ID 的任务模式匹配结果。

在本地，修订版本默认值为 `HEAD~1` 和 `HEAD`。`MISE_AFFECTED_BASE` 和
`MISE_AFFECTED_HEAD` 可以覆盖这些默认值。当这些变量未设置时，GitHub Actions 和 GitLab 合并请求元数据会提供 CI 默认值；显式 CLI 选项具有最高优先级。

### Cargo 工作区发现

当根目录的 `Cargo.toml` 包含 `[workspace]` 表时，Cargo 提供程序会发现各个软件包。
它会展开工作区的 `members` 模式，遵循 `exclude` 设置；如果工作区清单同时包含 `[package]`，还会包含根软件包。工作区根目录中的路径依赖会作为隐式成员包含在内，这与 Cargo 的工作区成员行为一致。工作区外部的路径仍是外部依赖，不会添加到图中。

每个被发现的软件包都必须包含 `[package].name`。mise 使用这一稳定的生态系统标识来创建类似 `cargo:my-crate` 的 ID；将 crate 移动到另一个目录不会改变其 ID。`mise tasks graph` 还会将软件包根目录和 `Cargo.toml` 报告为工作区定义来源。发现过程会直接解析清单，不要求安装 `cargo` 可执行文件。

### Cargo 依赖推断

对于每个发现的 Cargo 软件包，mise 会根据带有本地
`path` 的依赖项推断内部边。普通依赖、开发依赖、构建依赖以及特定目标的依赖表都会参与其中。重命名的依赖项会根据其路径解析，而声明了 `workspace = true` 的依赖项则会从根目录的 `[workspace.dependencies]` 表继承路径。

仅指定版本的依赖项和注册表依赖项会被忽略，工作区之外的路径依赖项以及位于排除路径下的路径依赖项也会被忽略。解析后指向同一软件包的声明不会创建自依赖边。如果推断出的内部边形成环，`mise tasks graph` 会报告该环；必要时，项目覆盖项可以替换或调整推断出的依赖关系。

### uv 工作区发现

当根目录的 `pyproject.toml` 包含
`[tool.uv.workspace]` 表时，uv 提供程序会发现 Python 项目。根项目始终包含在内，而 mise 会展开
`members` glob，并为其余工作区成员遵循 `exclude`。每个项目都必须定义
`[project].name`；mise 会将等价的 Python 包名称写法（例如 `my_package`、
`my.package` 和 `my-package`）规范化为稳定的 ID，例如 `uv:my-package`。

配置的 monorepo 根目录下的本地目录源也会被表示为项目，即使它们被排除在 uv 工作区成员之外。
这保留了 uv 中工作区路径依赖替代方案的依赖边。本地元数据会直接解析，因此发现依赖图时无需安装
`uv` 或 Python。

### uv 依赖推断

mise 会从 `[project].dependencies`、可选依赖组、`[dependency-groups]` 以及 uv 的旧版 `dev-dependencies` 中读取依赖。仅当相应的 `[tool.uv.sources]` 条目选择了一个设置为 `workspace = true` 的工作区成员，或通过 `path` 指向仓库内的项目目录时，才会添加内部边。根项目的源声明会应用于工作区成员，除非某个成员覆盖了该依赖的源。

带有环境标记的源数组会以保守方式处理：任何本地替代源都会添加该边，因为依赖图与平台无关。Registry、Git、URL、wheel、源代码归档以及外部工作区源不会添加项目或边。自依赖会被忽略，而项目之间的循环依赖会由 `mise tasks graph` 报告，并可通过项目覆盖进行修正。

### Go 工作区发现

Go 提供程序会发现根目录 `go.work` 中由 `use` 指令列出的模块。单独的指令和 `use` 块均受支持。每个列出的目录都必须包含带有 `module` 指令的 `go.mod`；mise 使用该稳定的模块路径创建 ID，例如
`go:example.com/acme/api`。位于已配置单体仓库根目录之外的模块会被忽略，因为 mise 图中的项目根目录始终相对于仓库。

发现过程会直接解析 `go.work` 和 `go.mod`，不要求使用 `go` 可执行文件。它不会从 `require` 或 `replace` 推断依赖边：这些指令描述的是模块选择，不一定是任务图所需的源码级关系。请使用项目覆盖配置，将对构建有影响的边添加进去：

```toml
[monorepo.projects."go:example.com/acme/api"]
depends_add = ["go:example.com/acme/lib"]
```

使用 `depends` 替换完整的依赖集合，或使用 `depends_add` 和 `depends_remove` 进行针对性调整。图解释会将这些已配置的边归因于 `configuration`。

### Node 工作区发现

Node 提供程序会从以下位置发现 npm、pnpm、Yarn 和 Bun 工作区包：

- `pnpm-workspace.yaml`
- 根目录 `package.json` 中的 `workspaces` 数组
- `workspaces` 的单模式字符串形式
- Yarn Classic 的对象形式 `workspaces.packages`

当两个文件同时存在时，`pnpm-workspace.yaml` 定义工作区成员关系。对于 pnpm 和检测到的 Yarn 工作区，带有 `name` 的有效根目录 `package.json` 会被隐式包含。Node 工作区发现支持正向和负向模式、递归 `**` 通配符，以及类似 `packages/{web,api}` 的大括号模式。发现过程会跳过 `.git` 和 `node_modules`，但不会应用 Git 忽略文件或 `.ignore` 文件。

每个被发现的包都必须在其 `package.json` 中包含 `name`。mise 使用这一稳定的生态系统标识来创建类似 `node:@acme/web` 的 ID；将包移动到另一个目录不会改变其 ID。`mise tasks graph` 还会报告包根目录、工作区定义来源以及检测到的包管理器。

### Node 依赖推断

对于每个发现的 Node 软件包，mise 会检查以下 `package.json` 字段：

- `dependencies`
- `devDependencies`
- `optionalDependencies`
- `peerDependencies`

当声明的依赖名称与另一个已发现的工作区软件包完全匹配时，mise 会向该软件包稳定的 `node:` 项目 ID 添加一条边。外部软件包名称以及指向同一项目的声明会被忽略。

依赖版本字符串会被视为不透明值。只要内部名称匹配，无论其值使用的是 `workspace:*`、`catalog:`、`*`、普通版本范围，还是其他特定于软件包管理器的形式，都会创建相同的边。mise 在构建项目图时不会解析或比较这些值。

这四种依赖类型都会参与同一个项目图，包括开发依赖。如果这些声明产生循环，`mise tasks graph` 会报告该循环，而不会静默删除某条边。当推断出的构建关系需要不同于软件包清单中的关系时，请在项目覆盖配置中使用 `depends`、`depends_add` 或 `depends_remove`。

### Node 包脚本

启用任务推断和实验性功能后，mise 会将从每个发现的 Node 工作区包中导入脚本作为任务。包不需要拥有自己的 `mise.toml`。

导入的任务使用稳定的项目 ID，后跟 `#` 和包脚本名称：

```bash
mise run 'node:@acme/web#build'
```

等效的 monorepo 路径可作为别名使用，因此现有的路径模式也同样有效：

```bash
mise run //apps/web:build
mise //...:test
```

任务会通过工作区包管理器（`npm`、`pnpm`、`yarn` 或 `bun`）在包目录中运行，并将任务参数传递给包管理器。mise 使用根目录中的 `packageManager` 声明或锁定文件来选择包管理器；如果两者都无法确定包管理器，则回退到 npm。`mise task info` 会将包的 `package.json` 报告为任务来源。

如果包的 monorepo 路径中存在显式的 mise 任务，则该任务优先于导入的脚本。这两个名称仍会继续解析到该显式任务。

此推断功能需要选择启用，目前仍处于实验阶段，并且仅对已配置的 monorepo 根目录运行：

```toml
[settings]
experimental = true
task.auto_infer = ["node"]
```

### 根任务默认配置

在根目录的 `mise.toml` 中使用 `[monorepo.task_defaults.<name>]`，为每个工作区项目中名称相同的任务定义共享默认配置：

```toml
[monorepo.task_defaults.build]
sources = ["src/**", "package.json"]
outputs = ["dist/**"]
cache = { enabled = true }

[monorepo.task_defaults.test]
env = { NODE_ENV = "test" }
```

这些默认配置同时适用于提供程序推断的任务（例如 `node:@acme/web#build`）和显式的 mise 任务（例如 `//apps/web:build`）。任务本地配置具有更高优先级。当显式任务使用 `extends` 时，其模板的优先级也高于根默认配置。

根任务默认配置处于实验阶段，除非启用实验性功能，否则会被忽略。

### 任务定义优先级

任务定义分两个阶段解析。首先，显式项目任务会替换具有相同项目和任务名称的提供程序推断任务。提供程序任务的项目 ID 名称会保留为显式任务的别名，因此使用任一名称都会运行显式定义。

选择任务后，mise 按以下顺序填充未设置的字段，优先级从高到低：

1. 所选任务自身的字段，无论这些字段来自项目本地配置还是提供程序推断
2. 对于使用了 `extends` 的显式任务，由 `extends` 指定的任务模板
3. 来自工作区根目录的匹配 `[monorepo.task_defaults.<name>]` 定义

`env`、`vars` 和 `tools` 等映射字段会跨这些层级合并，优先级较高层级中的条目会覆盖其他层级中的条目。`depends`、`sources` 和 `outputs` 等集合字段不会拼接多个层级中的值，而是使用定义了该字段的最高优先级层级中的完整值。这些合并规则与[任务模板](/tasks/templates)使用的规则相同。

例如，当根默认配置也定义了 `run` 时，推断出的包脚本仍会保留其提供程序命令，同时继续继承提供程序未指定的缓存输入或环境条目。如果项目之后显式定义了该任务，显式命令会替换包脚本；命名模板会先填充其缺失字段，然后才应用根默认配置。

### 提供程序任务建议

当生态系统元数据明确描述任务配置时，工作区提供程序可以附加任务配置。提供程序可以建议：

- 相对于项目的输入模式，这些模式会成为任务的 `sources`
- 相对于项目的输出模式，包括明确声明任务没有文件输出
- 是否启用或禁用任务输出缓存
- 相对于项目的任务依赖项以及 `^task` 依赖项

建议属于推断出的任务定义的一部分，因此它们与提供程序命令具有相同的优先级。匹配的显式项目任务会替换这些建议。否则，任务模板和根任务默认值只会填充提供程序未建议的字段。当其生态系统元数据不具备权威性时，提供程序会将字段留空；mise 不会根据命令字符串猜测输出或可缓存性。

Node 工作区提供程序会从匹配的 `turbo.json` 任务定义中读取 `inputs`、`outputs`、`cache` 和 `dependsOn`。对于 mise 无法精确保留的 Turbo 特定模式（例如 `$TURBO_ROOT$`），提供程序会将其留空，以便任务模板或根任务默认值可以提供这些模式。

### 上游任务依赖

在任务依赖前加上 `^`，即可先在上游工作区项目中运行该任务。根任务默认值通常用于在整个工作区中应用此关系：

```toml
[monorepo.task_defaults.build]
depends = ["^build"]
```

`^` 前缀仅支持用于 `depends`。`depends_post` 和 `wait_for` 中不接受该前缀，因为这些字段描述的不是前置工作。

现在运行 `node:@acme/web#build` 时，会先在 `@acme/web` 所依赖的每个项目中运行 `build`，然后再构建 `@acme/web`。该关系会遵循完整的项目依赖图，包括经过未定义 `build` 的中间项目。缺失的上游任务会被跳过。对于未在检测到的项目图中表示的已配置任务根，该依赖为空操作，因为该任务没有上游项目关系。

上游依赖同时适用于提供程序推断的任务和显式配置的 mise 任务。它们使用与普通 `depends` 相同的任务调度器，包括循环检测、去重、并行执行和依赖缓存键传播。此语法仅适用于已配置的 monorepo 工作区，并且必须启用实验性功能。

### 项目覆盖配置

在根目录的 `mise.toml` 中使用 `[monorepo.projects]`，以修正或扩展提供程序推断。包含 `:` 的项目 ID 或作用域包名称必须加引号：

```toml
[monorepo.projects."node:@acme/web"]
root = "apps/web"
depends_add = ["custom:docs"]
depends_remove = ["node:@acme/legacy"]

[monorepo.projects."custom:docs"]
root = "docs"
metadata = { kind = "documentation" }
```

覆盖配置可以：

- 设置 `remove = true`，移除推断出的项目及其关联边
- 设置 `root` 或 `metadata`，替换推断出的值
- 设置 `depends`，替换完整的推断依赖集合
- 使用 `depends_add` 和 `depends_remove`，调整单个依赖边
- 为新的命名空间 ID 指定明确的 `root`，添加与提供程序无关的项目

最终图必须引用现有的项目 ID，且不得包含依赖循环。诊断信息会指出受影响的项目，以及可用于修复图的覆盖字段。

## 列出任务

`mise tasks` 和 `mise tasks --all` 的区别：

- **`mise tasks`**：列出当前 config_root 层级中的任务（当前 config_root 及其父级）
- **`mise tasks --all`**：列出整个 monorepo 中的任务，包括兄弟目录和子目录

### 列表示例

给定如下结构：

```
myproject/
├── mise.toml (任务: deploy)
├── projects/
│   ├── frontend/
│   │   └── mise.toml (任务: build, test)
│   └── backend/
│       └── mise.toml (任务: build, serve)
```

当位于 `projects/frontend/` 时：

```bash
# 列出: //:deploy, //projects/frontend:build, //projects/frontend:test
mise tasks

# 列出: //:deploy, //projects/frontend:build, //projects/frontend:test,
#        //projects/backend:build, //projects/backend:serve
mise tasks --all
```

### 查看特定项目任务

```bash
# 列出 frontend 项目中的所有任务
mise tasks '//projects/frontend:*'
```

## 最佳实践

### 1. 在根目录定义共享工具和环境

将常用工具和环境放在根 `mise.toml` 中，以避免重复：

```toml
# /myproject/mise.toml
monorepo_root = true

[tools]
node = "20"
python = "3.12"
go = "1.21"

[env]
NODE_ENV = "development"
```

### 2. 仅在必要时覆盖

只有当子目录确实需要不同版本时，才覆盖其中的工具：

```toml
# /myproject/legacy-app/mise.toml
[tools]
node = "14"  # 仅为旧版应用覆盖
# root 中的 python 和 go
```

### 3. 使用具有描述性的任务名称

用公共名称为相关任务添加前缀，以便支持模式匹配：

```toml
[tasks.test]
run = "npm test"

[tasks."test:unit"]
run = "npm run test:unit"

[tasks."test:e2e"]
run = "npm run test:e2e"
```

然后运行所有测试任务：`mise '//...:test*'`

### 4. 对相关项目进行分组

将项目组织到子目录中，以便进行有针对性的执行：

```
myproject/
├── services/
│   ├── api/
│   ├── worker/
│   └── scheduler/
└── apps/
    ├── web/
    └── mobile/
```

然后按组运行任务：

```bash
mise //services/...:build  # 构建所有服务
mise //apps/...:test       # 测试所有应用
```

## 与其他工具的比较

单体仓库生态系统提供了许多优秀的工具，各有不同的优势。下面是 mise 的 Monorepo Tasks 的对比情况：

### 简单任务运行器

**Taskfile** 和 **Just** 非常适合单项目的任务自动化。它们轻量且易于配置，但并不是为单体仓库而设计的。虽然你可以在一个仓库中放置多个 Taskfile/Justfile，但它们并不提供统一的任务发现、跨项目通配符，或在项目之间自动进行工具/环境分层。

**mise 的优势：** 在整个单体仓库中自动发现任务，拥有统一的命名空间和强大的通配符模式。

### 面向 JavaScript 的工具

**Nx**、**Turborepo** 和 **Lerna** 是专为 JavaScript/TypeScript 单体仓库设计的强大工具。

- **Nx** 提供了诸如依赖图可视化、受影响项目检测、代码生成和计算缓存等令人惊叹的功能。它拥有庞大的插件生态系统，并且在前端单体仓库中表现出色。
- **Turborepo** 专注于极速的任务缓存和并行执行，配置却非常少。
- **Lerna** 以包版本管理和发布工作流的方式，开创了 JavaScript 单体仓库管理的先河。

**mise 的优势：** 语言无关支持。虽然这些工具在 JS/TS 生态中表现出色，但 mise 同样适用于 Rust、Go、Python、Ruby，或任意语言组合。你还可以获得统一的工具版本管理（不仅仅是任务）以及贯穿整个技术栈的环境变量管理。

### 大规模构建系统

**Bazel**（Google）和 **Buck2**（Meta）是工业级构建系统，面向拥有成千上万工程师的大型、多语言单体仓库。

- **Bazel** 提供了诸如分布式缓存、远程执行和具备细粒度依赖跟踪的密闭构建等强大功能。
- **Buck2** 是一个现代化重写版本，具有简洁的架构和令人印象深刻的性能优化。

但它们都极其强大，同时也带来了显著的复杂度：

- 密闭构建需要严格隔离和完全的依赖控制
- 使用专门的 DSL（如 Starlark 等）会带来陡峭的学习曲线
- 配置复杂，需要专门的构建工程师
- 为远程缓存投入大量基础设施
- 对代码组织方式有更严格的约束

**mise 的优势：** 通过非密闭构建实现简洁性。mise 不试图在隔离环境中控制你的整个构建环境，而是以灵活、实用的方式管理工具和任务。这种“非密闭”方式意味着你无需重构整个代码库，也不必学习一种新语言，就能使用 mise。你可以通过简单的 TOML 配置获得强大的单体仓库任务管理——对大多数团队来说，这已经足够强大，同时又避免了密闭构建所需的企业级复杂性。

### 其他值得注意的工具

**Rush**（Microsoft）为 JavaScript 单体仓库提供严格的依赖管理和构建编排，强调安全性和遵循约定。

**Moon** 是一个较新的、基于 Rust 的构建系统，目标是在支持多语言的同时保持对开发者友好。

### mise 的最佳适配场景

mise 的 Monorepo Tasks 旨在在简洁性与强大能力之间取得最佳平衡：

| 功能                    | 简单运行器 | JS 导向 | 构建系统 | mise |
| ----------------------- | ---------- | ------- | -------- | ---- |
| 多语言支持              | ✅         | ❌      | ✅       | ✅   |
| 易于学习                | ✅         | ⚠️      | ❌       | ✅   |
| 统一的任务发现          | ❌         | ✅      | ✅       | ✅   |
| 通配符模式              | ❌         | ⚠️      | ✅       | ✅   |
| 工具版本管理            | ❌         | ❌      | ⚠️       | ✅   |
| 环境分层                | ❌         | ⚠️      | ❌       | ✅   |
| 最小化配置              | ✅         | ⚠️      | ❌       | ✅   |
| 任务缓存                | ❌         | ✅      | ✅       | ❌   |

**何时选择 mise：**

- ✅ 多语言单体仓库（多种语言）
- ✅ 你希望统一管理工具 + 任务
- ✅ 你更偏好简洁性而不是极致性能
- ✅ 你已经在使用 mise 做工具管理

**何时考虑其他方案：**

- 你只使用 JavaScript/TypeScript → Nx 或 Turborepo 可能提供更多针对 JS 的特性
- 你处于 Google/Meta 级别、拥有成千上万工程师的规模 → Bazel 或 Buck2 提供分布式构建基础设施
- 你需要高级任务缓存 → Nx、Turborepo 或 Bazel 提供更复杂的缓存系统

最好的工具，是最适合你团队需求的工具。mise 的 Monorepo Tasks 面向那些希望在不增加复杂度负担的前提下实现强大单体仓库管理的团队，尤其适合跨多种语言协作的场景。

## 任务模板

对于在多个项目之间具有相似任务模式的 monorepo，[任务模板](/tasks/templates) 允许你在 monorepo 根目录定义可复用的任务：

```toml
# 根目录 mise.toml
[settings]
monorepo_root = true

[task_templates."python:build"]
run = "uv build"
tools = { python = "3.12", uv = "latest" }

[task_templates."python:test"]
run = "pytest"
tools = { python = "3.12" }
depends = ["build"]
```

然后，项目可以扩展这些模板：

```toml
# packages/api/mise.toml
[tasks.build]
extends = "python:build"

[tasks.test]
extends = "python:test"
run = "pytest --cov"  # 使用覆盖率进行覆盖
```

有关完整文档，请参见[任务模板](/tasks/templates)。

## 相关内容

- [任务模板](/tasks/templates) - 可复用的任务定义
- [任务配置](/tasks/task-configuration) - 所有任务配置选项
- [运行任务](/tasks/running-tasks) - 如何执行任务
- [配置](/configuration) - 通用的 mise 配置。
