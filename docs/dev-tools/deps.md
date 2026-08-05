# 依赖 <Badge type="warning" text="实验性" />

`mise deps` 命令通过对源文件进行哈希处理来管理项目依赖
（例如，`package-lock.json`），并在检测到更改时运行安装命令。
它还可以添加和移除单个包。

## 快速开始

```bash
# 启用实验性功能
export MISE_EXPERIMENTAL=1

# 安装所有项目依赖
mise deps

# 添加一个包
mise deps add npm:react

# 添加一个开发依赖
mise deps add -D npm:vitest

# 移除一个包
mise deps remove npm:lodash
```

## 配置

在 `mise.toml` 中配置依赖提供程序：

```toml
# 内置 npm 提供程序（自动检测锁文件）
[deps.npm]
auto = true  # 在 mise x/run 之前自动运行

# 适用于其他包管理器的内置提供程序
[deps.yarn]
[deps.pnpm]
[deps.bun]
[deps.deno]
[deps.aube]
[deps.go]
[deps.pip]
[deps.poetry]
[deps.uv]
[deps.bundler]
[deps.composer]

# 禁用特定提供程序
[deps]
disable = ["npm"]
```

## 内置提供者

mise 为常见的包管理器提供了内置提供者：

| 提供者      | 源文件                                                 | 输出                | 命令                                 |
| ---------- | ------------------------------------------------------ | ------------------- | ------------------------------------ |
| `npm`      | `package.json`, `package-lock.json`                    | `node_modules/`       | `npm install`                        |
| `yarn`     | `package.json`, `yarn.lock`                            | `node_modules/`       | `yarn install`                       |
| `pnpm`     | `package.json`, `pnpm-lock.yaml`                       | `node_modules/`       | `pnpm install`                       |
| `bun`      | `package.json`, `bun.lock`, `bun.lockb`                | `node_modules/`       | `bun install`                        |
| `deno`     | `deno.json`, `deno.jsonc`, `package.json`, `deno.lock` | `node_modules/`       | `deno install`                       |
| `aube`     | `package.json`, `aube-lock.yaml`                       | `node_modules/`       | `aube install`                        |
| `go`       | `go.mod`                                               | `vendor/` 或 `go.sum` | `go mod vendor` 或 `go mod download` |
| `pip`      | `requirements.txt`                                     | `.venv/`              | `pip install -r requirements.txt`    |
| `poetry`   | `pyproject.toml`, `poetry.lock`                        | `.venv/`              | `poetry install`                     |
| `uv`       | `pyproject.toml`, `uv.lock`                            | `.venv/`              | `uv sync`                            |
| `bundler`  | `Gemfile`, `Gemfile.lock`                              | `vendor/bundle/`      | `bundle install`                     |
| `composer` | `composer.json`, `composer.lock`                       | `vendor/`             | `composer install`                   |
| `dart`     | `pubspec.yaml`, `pubspec.lock`                         | `.dart_tool/`         | `dart pub get`                       |
| `flutter`  | `pubspec.yaml`, `pubspec.lock`                         | `.dart_tool/`         | `flutter pub get`                    |

只有在 `mise.toml` 中显式配置且其锁文件存在时，内置提供者才会启用。

## Monorepo

默认情况下，`mise deps` 只运行当前配置根目录中的提供程序。要运行每个显式配置的 monorepo 根目录中的提供程序，请使用 `--monorepo`：

```toml
monorepo_root = true

[monorepo]
config_roots = ["apps/*", "packages/*"]
```

```bash
mise deps --monorepo
```

这要求显式设置 [`[monorepo].config_roots`](/tasks/monorepo.html#explicit-config-roots)；mise 不会搜索任意子目录中的依赖提供程序。monorepo 根配置中的提供程序也会被包含，因为该配置属于每个选定配置根目录的层级结构，这与 `mise install --monorepo` 的行为一致。

Monorepo 提供程序 ID 包含其配置根目录，因此同一个提供程序可以出现在多个项目中。例如，两个 uv 提供程序分别命名为 `//apps/api:uv` 和 `//apps/worker:uv`。在使用 `--only`、`--skip` 或位置参数形式的提供程序参数时，请使用限定名称：

```bash
mise deps --monorepo --only //apps/api:uv
mise deps install //apps/worker:uv --monorepo
```

不带 `//` 前缀的提供程序依赖项会在同一配置根目录中解析。因此，`apps/api` 中配置了 `depends = ["uv"]` 的提供程序依赖于 `//apps/api:uv`。

对于单个嵌套项目，`dir` 选项仍然是更简单的替代方案：

```toml
[deps.uv]
dir = "apps/api"
```

## 添加和移除包

`mise deps add` 和 `mise deps remove` 命令让你可以使用 `ecosystem:package` 语法管理单个包：

```bash
# 添加包
mise deps add npm:react
mise deps add npm:@types/react@19
mise deps add -D npm:vitest        # 开发依赖

# 移除包
mise deps remove npm:lodash
```

ecosystem 前缀告诉 mise 使用哪个包管理器。目前支持用于 add/remove 的 ecosystem 有：`npm`、`yarn`、`pnpm`、`bun`、`deno`、`aube`、`dart`、`flutter`。

## 自定义提供者

为项目特定的构建步骤创建自定义提供者：

```toml
[deps.codegen]
sources = ["schema/*.graphql", "codegen.yml"]
outputs = ["src/generated/"]
run = "npm run codegen"
description = "生成 GraphQL 类型"

[deps.prisma]
sources = ["prisma/schema.prisma"]
outputs = ["node_modules/.prisma/"]
run = "npx prisma generate"
```

### 提供者选项

| 选项          | 类型     | 描述                                                                 |
| ------------- | -------- | -------------------------------------------------------------------- |
| `auto`        | bool     | 在 `mise x` 和 `mise run` 之前自动运行（默认：false）                |
| `sources`     | string[] | 用于检查变更的文件/模式                                               |
| `outputs`     | string[] | 提供者被视为最新时必须存在的文件/目录                                  |
| `run`         | string   | 过时时要运行的命令                                                    |
| `env`         | table    | 要设置的环境变量                                                      |
| `dir`         | string   | sources、outputs 和命令的基础目录                                     |
| `description` | string   | 输出中显示的描述                                                      |
| `depends`     | string[] | 此提供者运行前必须完成的其他提供者名称                                |
| `timeout`     | string   | 运行命令的超时时间，例如 `"30s"`、`"5m"`（默认：无超时）              |

## 新鲜度检查

mise 使用 blake3 内容哈希来判断自上次成功运行以来源文件是否发生了变化。哈希会存储在 `$MISE_STATE_DIR/deps/<hash>.toml` 中，并按项目根目录作为键（因此不会在项目目录内写入任何内容）。

1. 计算所有源文件的 blake3 哈希
2. 与上次成功运行时存储的哈希进行比较
3. 如果有任何文件被添加、删除或更改，则 provider 处于过期状态

这意味着：

- 如果你修改了 `package-lock.json`，`node_modules/` 将被视为过期
- 如果 `node_modules/` 不存在，provider 总是处于过期状态
- 如果源文件不存在，则 provider 被视为新鲜状态（无需处理）
- 首次运行时（没有已存储状态），provider 总是被视为过期状态。

## 自动安装

当在 provider 上设置 `auto = true` 时，它会在以下命令之前自动运行：

- `mise run`（任务执行）
- `mise x`（执行命令）

这确保在运行任务或命令之前，依赖始终保持最新。

要在单次调用中跳过自动安装：

```bash
mise run --no-deps build
mise x --no-deps -- npm test
```

## 过期警告

当使用 `mise activate` 时，如果任何自动启用的提供者存在过期依赖，mise 会发出警告：

```
mise WARN deps: npm may need update, run `mise deps`
```

可以通过以下方式禁用：

```toml
[settings]
status.show_deps_stale = false
```

## CLI 用法

```bash
# 安装所有项目依赖
mise deps

# 仅安装特定提供程序
mise deps install npm

# 显示某个提供程序为何是最新或过期
mise deps install npm --explain

# 显示将要执行的内容，但不实际运行
mise deps install --dry-run

# 即使输出是最新的也强制运行
mise deps install --force

# 列出可用的 deps 提供程序
mise deps install --list

# 跳过特定提供程序
mise deps install --skip npm

# 添加/移除包
mise deps add npm:react
mise deps remove npm:lodash
```

## 依赖

提供者可以使用 `depends` 字段声明对其他提供者的依赖。提供者会在运行前等待其所有依赖成功完成。

```toml
[deps.uv]
auto = true

[deps.ansible-galaxy]
auto = true
depends = ["uv"]
run = "ansible-galaxy install -r requirements.yml && touch .galaxy-installed"
sources = ["requirements.yml"]
outputs = [".galaxy-installed"]
```

在这个示例中，`ansible-galaxy` 会在开始之前等待 `uv` 完成。

没有 `depends` 的提供者仍然会像以前一样并行运行。如果某个依赖失败，所有依赖它的提供者都会被跳过。系统会检测循环依赖，并跳过受影响的提供者，同时给出警告。

## 并行执行

依赖提供程序会并行运行，并遵守 `jobs` 设置所定义的并发限制。
当多个提供程序需要运行时（例如 npm 和 pip 同时需要运行），这可以加快安装速度。
带有 `depends` 的提供程序会等待其依赖项完成后再开始，
而相互独立的提供程序则会并发运行。

```toml
[settings]
jobs = 4  # 同时最多运行 4 个提供程序
```

## 示例：全栈项目

```toml
# 面向具有 Node.js 前端和 Python 后端的项目的 mise.toml

[deps.npm]
auto = true

[deps.poetry]
auto = true

[deps.prisma]
auto = true
depends = ["npm"]  # 需要先有 node_modules
sources = ["prisma/schema.prisma"]
outputs = ["node_modules/.prisma/"]
run = "npx prisma generate"

[deps.frontend-codegen]
depends = ["npm"]  # 需要先有 node_modules
sources = ["schema.graphql", "codegen.ts"]
outputs = ["src/generated/"]
run = "npm run codegen"
```

运行 `mise deps` 会并行安装 npm 和 poetry 依赖，然后运行 prisma
和 frontend-codegen（同样是并行运行，因为它们只依赖于 npm，而不依赖彼此）。
