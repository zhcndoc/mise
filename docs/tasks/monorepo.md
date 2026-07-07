# Monorepo 任务

mise 支持使用目标路径语法的 monorepo 风格任务组织。此功能允许你在单个仓库中管理多个项目的任务，其中每个项目都可以拥有自己的 `mise.toml` 配置，包含工具、环境变量以及任务，这些任务可能与调用任务的位置不同。

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
- **自动信任传递**：当 monorepo 根目录被信任时，所有后代配置都会自动被信任

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

::: tip 可选的冒号语法
在从子目录运行任务或定义任务依赖时，前导 `:` 是可选的。虽然两种语法都能工作，**但我们建议使用 `:` 前缀**，以明确表示这是 monorepo 任务引用。

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

裸名称语法（不带 `:`）主要是为了便于从非 monorepo 配置迁移到 monorepo 配置。迁移时，你不需要立即更新所有任务依赖——它们会继续工作。不过，使用 `:` 前缀可以更清楚地表明你引用的是当前 config_root 中的任务。
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
3. **任务特定工具和环境**：在任务的 `tools` 和 `env` 属性中定义的值具有最高优先级

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
- [配置](/configuration) - 通用的 mise 配置
