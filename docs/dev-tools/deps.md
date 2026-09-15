---
description: "当受跟踪的输入发生变化或输出缺失时，mise deps 会运行项目依赖安装程序。"
---

# 依赖 <Badge type="warning" text="实验性" />

`mise deps` 会在受跟踪的输入发生变化或输出缺失时运行项目依赖安装程序。它会将源哈希与上次成功运行的结果进行比较，然后调用配置的包管理器。使用 `[tools]` 安装包管理器本身；使用 `[deps]` 安装项目的包。

## 快速开始

对于包含 `package.json` 和 `package-lock.json` 的现有 npm 项目，添加：

```toml [mise.toml]
[settings]
experimental = true

[tools]
node = "24"

[deps.npm]
auto = true
```

检查提供程序、安装其依赖项并解释新鲜度结果：

```sh
mise install
mise deps install --list
mise deps install npm
mise deps install npm --explain
```

设置 `auto = true` 后，后续的 `mise exec` 和 `mise run` 命令也会检查此提供程序。如果项目还没有锁文件，请先使用其包管理器创建一个，例如 `mise exec --no-deps -- npm install`。

## 配置

仅启用项目使用的提供程序。空表会选择一个内置提供程序，但不会使其自动运行：

```toml
[deps.uv]
```

要禁用提供程序，例如禁用从其他配置继承的提供程序：

```toml
[deps]
disable = ["npm"]
```

这会阻止提供程序运行，但不会移除已安装的包。使用 `mise deps install --list` 检查生效的提供程序。

## 内置提供程序

每个提供程序都会为源文件、输出和安装命令提供默认值：

| 提供程序        | 源文件                                                 | 受跟踪的输出                     | 默认命令                                                       |
| --------------- | ------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------- |
| `npm`           | `package.json`、`package-lock.json`                    | `node_modules/`                  | `npm install`                                                  |
| `yarn`          | `package.json`、`yarn.lock`                            | `node_modules/`                  | `yarn install`                                                 |
| `pnpm`          | `package.json`、`pnpm-lock.yaml`                       | `node_modules/`                  | `pnpm install`                                                 |
| `bun`           | `package.json`、`bun.lock` 或 `bun.lockb`              | `node_modules/`                  | `bun install`                                                  |
| `deno`          | `deno.json`、`deno.jsonc`、`package.json`、`deno.lock` | 可选的 `node_modules/`           | `deno install`                                                 |
| `aube`          | `package.json`、`aube-lock.yaml`                       | `node_modules/`                  | `aube install`                                                  |
| `go`            | `go.mod`、`go.sum`                                     | 可选的 `vendor/`                 | 如果存在 `vendor/`，则为 `go mod vendor`，否则为 `go mod download` |
| `pip`           | `requirements.txt`                                     | 可选的 `.venv/`                  | `pip install -r requirements.txt`                              |
| `poetry`        | `pyproject.toml`、`poetry.lock`                        | 可选的 `.venv/`                  | `poetry install`                                                |
| `uv`            | `pyproject.toml`、`uv.lock`                            | 可选的 `.venv/`                  | `uv sync`                                                       |
| `bundler`       | `Gemfile`、`Gemfile.lock`                              | 可选的 `vendor/bundle/`          | `bundle install`                                                |
| `composer`      | `composer.json`、`composer.lock`                       | `vendor/`                        | `composer install`                                              |
| `dart`          | `pubspec.yaml`、`pubspec.lock`                         | `.dart_tool/package_config.json` | `dart pub get`                                                  |
| `flutter`       | `pubspec.yaml`、`pubspec.lock`                         | `.dart_tool/package_config.json` | `flutter pub get`                                               |
| `git-submodule` | `.gitmodules`                                          | 声明的子模块目录                 | `git submodule update --init --recursive`                       |

必须显式配置提供程序，并且项目必须具有所需的输入文件。大多数提供程序都要求锁文件。例外情况包括 `go`（`go.mod`）、`pip`（`requirements.txt`）、Dart/Flutter（`pubspec.yaml`）和 `git-submodule`（非空的 `.gitmodules`）。Pub 工作区成员会跟踪工作区的包配置文件。

只有在 mise 成功运行后观察到某个**可选输出**时，才会检查其是否被删除。这支持默认安装到项目外部的包管理器。特别是，pip 提供程序不会创建或选择虚拟环境：如果 pip 应该安装到 `.venv`，请先配置 [Python 虚拟环境激活](/lang/python.html#automatic-virtualenv-activation)。

这些默认值是普通的安装命令，不一定是固定锁文件的安装命令。要要求 npm 执行基于锁文件的干净安装，请覆盖 `run`：

```toml
[deps.npm]
run = "npm ci"
```

新鲜度检查仍然会决定是否运行它。如果需要在其受跟踪状态未发生变化时也执行命令，请使用 `--force`。

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

这要求显式配置 [`[monorepo].config_roots`](/tasks/monorepo.html#config-roots)；mise 不会搜索任意子目录中的依赖提供程序。monorepo 根配置中的提供程序也会被包括在内，因为该配置属于每个选定配置根目录的层级结构，这与 `mise install --monorepo` 的行为一致。

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

ecosystem 前缀会告诉 mise 使用哪个包管理器。目前支持添加/移除操作的 ecosystem 包括 `npm`、`yarn`、`pnpm`、`bun`、`deno`、`aube`、`dart`、`flutter`。

## 自定义提供者

为项目特定的构建步骤创建自定义提供程序。这些示例假设 `@graphql-codegen/cli` 和 `prisma` 已经是项目依赖项，并且相应的脚本/配置已经存在：

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

如果省略这些选项，内置提供者会使用其文档中规定的源文件和输出。设置 `sources` 或 `outputs` 会替换该提供者的默认值，而不是在其基础上添加内容。空数组（例如 `outputs = []`）会显式禁用该类路径跟踪；它还会禁用内置提供者提供的任何可选输出。

相对路径和 glob 模式会在应用 `dir` 后从提供者的配置根目录解析。绝对路径则按原样使用。例如，某个将已安装包保存在应用程序目录下的 pnpm 工作区可以覆盖根级默认值：

```toml
[deps.pnpm]
sources = ["pnpm-lock.yaml", "packages/app/package.json"]
outputs = ["packages/app/node_modules"]
```

### 模板和环境变量

提供者配置中的字符串值支持 Tera 模板，例如
<span v-pre>`{{ config_root }}`</span>、<span v-pre>`{{ env.NAME }}`</span> 和
<span v-pre>`{{ vars.name }}`</span>。Shell 风格的环境变量，例如
`$NAME` 和 `${NAME:-default}`，会在 Tera 模板之后展开，并使用与 `[env]` 值相同的
`env_shell_expand` 设置。

```toml
[vars]
package = "api"

[deps.codegen]
sources = ["{{ config_root }}/schemas/$SCHEMA_NAME.graphql"]
outputs = ["{{ config_root }}/generated/${SCHEMA_NAME:-default}/"]
dir = "{{ config_root }}"
env = { OUTPUT_PACKAGE = "{{ vars.package }}-$BUILD_MODE" }
run = 'npm run codegen -- "$OUTPUT_PACKAGE"'
```

在运行此示例前，请在环境中设置 `SCHEMA_NAME` 和 `BUILD_MODE`。当某个值应保持为一个参数时，请在 `run` 中引用 Shell 展开式。

`run` 中的 `$VAR` 表达式会留给提供程序的 Shell 在执行时展开。这允许 `run` 使用提供程序 `env` 表中的值。`run` 中的 Tera 表达式会在加载提供程序配置时渲染。

提供者 ID 和环境变量名称不会进行模板化。无效的 Tera 模板会在提供者命令启动前作为配置错误报告。未定义的 Shell 风格变量会在发出警告后保持不变；使用 `${NAME:-}` 可将其显式默认为空字符串。

## 新鲜度检查

mise 使用 blake3 哈希来确定源文件或生效的提供程序命令自上次成功运行以来是否发生变化。哈希存储在
`$MISE_STATE_DIR/deps/<hash>.toml` 中，并以项目根目录为键，因此不会在项目目录内写入任何内容。命令哈希包括运行命令、Shell、提供程序 `env` 和工作目录；原始命令和环境值不会存储在状态中。

1. 计算所有源文件的 blake3 哈希
2. 计算生效的提供程序命令的 blake3 哈希
3. 与上次成功运行时存储的哈希进行比较
4. 如果源文件或生效的命令被添加、移除或更改，则将提供程序标记为过期

必需的输出必须存在。可选输出一旦被观察到，就必须继续存在。启用源文件跟踪时，第一次运行会被视为过期，对源文件或生效命令的更改会触发再次运行。

对于没有源文件的自定义提供程序，只要现有输出存在，就足以视为最新；仅命令发生变化不会使其失效。既没有源文件也没有输出的提供程序每次都会运行。当命令的结果取决于输入文件的内容时，请配置真实的输入文件。

新鲜度检查不会检查每个已安装的包，不会查询上游是否有更新版本，也不会检测未受跟踪的外部包缓存是否被移除。使用 `mise deps install <provider> --explain` 查看决策，并使用 `--force` 修复在受跟踪状态之外发生文件变化的依赖项。

在命令哈希功能之前创建的状态，会在源文件受跟踪的提供程序运行一次后迁移。

## 自动安装

当提供程序设置了 `auto = true` 时，它会自动运行于以下命令之前：

- `mise run`（任务执行）
- `mise x`（执行命令）

自动检查使用与 `mise deps` 相同的源文件和输出；它们会确保在执行前处理受跟踪的变更。它们不会将包升级到最新的上游版本。

要在单次调用中跳过自动安装：

```bash
mise run --no-deps build
mise x --no-deps -- npm test
```

## 过期警告

使用 `mise activate` 时，如果任何自动启用的提供程序存在过期依赖项，mise 会发出警告：

```
mise WARN deps: npm may need update, run `mise deps`
```

使用以下配置禁用此功能：

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

提供程序可以使用 `depends` 字段声明对其他提供程序的依赖。提供程序会等待其所有依赖项成功完成后再运行。

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

这假设 uv 项目声明了 `ansible-core`，并且其虚拟环境位于
`PATH` 中（例如通过 `_.python.venv`）。`ansible-galaxy` 提供程序会等待
`uv` 完成后再开始。`depends` 条目会对已配置的提供程序进行排序；它不会声明缺失的提供程序，也不会安装包管理器。

没有 `depends` 的提供程序会并行运行。如果某个依赖项失败，所有依赖于它的提供程序都会被跳过。循环依赖会被检测到，受影响的提供程序会在发出警告后被跳过。

## 并行执行

Deps 提供程序会并行运行，并遵循 `jobs` 设置的并发限制。当多个提供程序需要运行时（例如 npm 和 pip 都需要运行），这可以加快安装速度。具有 `depends` 的提供程序会等待其依赖项完成后再开始，而相互独立的提供程序会并发运行。

```toml
[settings]
jobs = 4  # 同时最多运行 4 个提供程序
```

## 示例：全栈项目

此示例假设仓库根目录中包含 npm 和 uv 项目，两个锁文件都已提交，Prisma 已作为项目依赖项安装，并且存在 npm `codegen` 脚本：

```toml [mise.toml]
[settings]
experimental = true

[tools]
node = "24"
python = "3.14"
uv = "latest"

[deps.npm]
auto = true

[deps.uv]
auto = true

[deps.prisma]
auto = true
depends = ["npm"]
sources = ["prisma/schema.prisma", "package-lock.json"]
outputs = ["node_modules/.prisma/"]
run = "npx --no-install prisma generate"

[deps.frontend-codegen]
depends = ["npm"]
sources = ["schema.graphql", "codegen.ts", "package-lock.json"]
outputs = ["src/generated/"]
run = "npm run codegen"
```

`mise deps` 会并行运行过期的 npm 和 uv 提供程序。Prisma 和前端 codegen 会等待 npm 完成，然后彼此并行运行。codegen 提供程序没有设置 `auto = true`，因此它会通过显式的 `mise deps` 命令运行，而不是在每次 `mise exec` 或任务调用前自动运行。
