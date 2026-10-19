---
description: 当锁文件发生变化或输出文件缺失时，运行 npm install、uv sync 等项目包安装命令。
socialDescription: 在锁文件变化或输出文件缺失时安装项目依赖。
---

# 项目依赖 <Badge type="warning" text="experimental" />

`mise deps` 会在所跟踪的文件发生变化或输出文件缺失时，运行包管理器的安装命令来安装项目依赖，例如 `node_modules` 或 Python 虚拟环境。使用 `[tools]` 安装包管理器本身，使用 `[deps]` 安装项目依赖。

::: warning 实验性功能
`mise deps` 目前仍是实验性功能。可像下方示例一样，在 `[settings]` 下设置 `experimental = true`，或设置环境变量 `MISE_EXPERIMENTAL=1` 来启用。
:::

## 快速开始

对于包含 `package.json` 和 `package-lock.json` 的 npm 项目，添加以下配置：

```toml [mise.toml]
[settings]
experimental = true

[tools]
node = "24"

[deps.npm]
auto = true
```

安装 Node.js，确认 mise 能识别该提供程序，然后安装依赖并查看提供程序为何已是最新：

```sh
mise install
mise deps install --list
mise deps install npm
mise deps install npm --explain
```

设置 `auto = true` 后，每当提供程序过期，`mise exec` 和 `mise run` 也会先运行该提供程序。只有输入文件存在时提供程序才会启用，因此如果项目还没有锁文件，请先用包管理器生成一个，例如运行 `mise exec --no-deps -- npm install`。

## 启用和禁用提供程序 {#configuration}

只配置项目实际使用的提供程序；mise 不会自动检测它们。空表可以启用内置提供程序，但不会让它自动运行：

```toml
[deps.uv]
```

要关闭某个提供程序（例如从其他配置文件继承的提供程序），请使用：

```toml
[deps]
disable = ["npm"]
```

此配置会阻止提供程序运行，但不会移除已安装的依赖。运行 `mise deps install --list` 可查看生效的提供程序及其启用状态。

## 内置提供程序

每个内置提供程序都预设了源文件、输出和安装命令：

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

只有项目中存在所需输入文件时，提供程序才会启用。大多数提供程序需要对应的锁文件；例外包括 `go`（`go.mod`）、`pip`（`requirements.txt`）、`dart` 和 `flutter`（`pubspec.yaml`），以及 `git-submodule`（非空的 `.gitmodules`）。pub 工作区中的成员会跟踪工作区的包配置文件。

只有在提供程序成功运行后，mise 才会开始检查可选输出是否被删除。这让默认将依赖安装到项目目录之外的包管理器也能正常使用。`pip` 提供程序不会创建或选择虚拟环境；如果希望 pip 将依赖安装到 `.venv`，请先配置 [Python 虚拟环境激活](/lang/python.html#automatic-virtualenv-activation)。

默认命令执行普通安装，不一定会严格使用锁文件。若要求 npm 根据锁文件执行干净安装，请覆盖 `run`：

```toml
[deps.npm]
run = "npm ci"
```

命令是否运行仍由新鲜度检查决定。即使所跟踪内容没有变化，也可以传入 `--force` 强制运行。

## 自定义提供程序

你可以为任何将输入文件转换为输出的项目专属步骤定义提供程序。以下示例假设 `@graphql-codegen/cli` 和 `prisma` 已是项目依赖，并且相应脚本和配置均已存在：

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

### 提供程序选项

以下选项适用于自定义和内置提供程序：

| 选项          | 类型     | 描述                                                                       |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `auto`        | bool     | 过期时在 `mise exec` 和 `mise run` 前运行（默认值：`false`）。              |
| `sources`     | string[] | 用于判断新鲜度的文件或 glob 模式。                                          |
| `outputs`     | string[] | 提供程序保持最新所必须存在的文件或目录。                                    |
| `run`         | string   | 提供程序过期时要运行的命令。                                                |
| `env`         | table    | 命令使用的环境变量。                                                        |
| `dir`         | string   | 源文件、输出和命令所使用的基准目录。                                        |
| `description` | string   | 输出中显示的描述。                                                          |
| `depends`     | string[] | 必须先成功完成的其他提供程序。                                              |
| `timeout`     | string   | 命令的最长运行时间，例如 `"30s"` 或 `"5m"`（默认不设限制）。              |

对于内置提供程序，设置 `sources` 或 `outputs` 会替换其默认值，而不是在默认值上追加。空数组（如 `outputs = []`）会关闭相应的路径跟踪，也会关闭该内置提供程序提供的所有可选输出跟踪。

相对路径和 glob 模式会在应用 `dir` 后，以提供程序的配置根目录为基准解析；绝对路径则按原样使用。例如，pnpm 工作区将已安装的依赖放在某个应用目录下时，可以覆盖根目录级别的默认值：

```toml
[deps.pnpm]
sources = ["pnpm-lock.yaml", "packages/app/package.json"]
outputs = ["packages/app/node_modules"]
```

### 模板和环境变量

提供程序配置中的字符串值支持 [Tera 模板](/templates.html)，例如 <span v-pre>`{{ config_root }}`</span>、<span v-pre>`{{ env.NAME }}`</span> 和 <span v-pre>`{{ vars.name }}`</span>。模板处理完成后，还会展开 `$NAME` 和 `${NAME:-default}` 等 shell 风格变量，使用的规则与 `[env]` 值相同，由 [`env_shell_expand`](/configuration/settings.html#env_shell_expand) 设置控制。

```toml
[vars]
package = "api"

[deps.codegen]
sources = ["schemas/$SCHEMA_NAME.graphql"]
outputs = ["generated/${SCHEMA_NAME:-default}/"]
env = { OUTPUT_PACKAGE = "{{ vars.package }}" }
run = 'npm run codegen -- "$OUTPUT_PACKAGE"'
```

`$SCHEMA_NAME` 的值来自环境变量；如果 `${SCHEMA_NAME:-default}` 未设置，则会回退为 `default`。没有默认值的未定义变量会保持原样并给出警告；使用 `${NAME:-}` 可以将其默认设为空字符串。

在 `run` 中，配置加载时会渲染 Tera 表达式；`$VAR` 表达式则留给提供程序的 shell 在命令运行时展开，因此 `run` 可以使用提供程序 `env` 表中的值。需要作为单个参数传递的 shell 展开式应加引号。提供程序 ID 和环境变量名称不使用模板。Tera 模板无效时，会在任何提供程序命令启动前作为配置错误报告。

## 执行顺序与并行

没有 `depends` 的提供程序会并行运行，最多并行数由 [`jobs`](/configuration/settings.html#jobs) 设置决定。包含 `depends` 的提供程序会等待其依赖项成功完成后再运行。如果依赖项失败，依赖它的提供程序会被跳过。检测到循环依赖时会发出警告，并跳过循环中的提供程序。

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

此配置假设 uv 项目声明了 `ansible-core`，且其虚拟环境已加入 `PATH`，例如通过 `_.python.venv` 实现。`uv` 完成后才会启动 `ansible-galaxy` 提供程序。`depends` 只控制已配置提供程序的执行顺序；它不会启用提供程序，也不会安装包管理器。

## 自动运行提供程序 {#auto-install}

设置 `auto = true` 的提供程序过期时，会在以下命令执行前运行：

- [`mise run`](/cli/run.html) runs a task
- [`mise exec`](/cli/exec.html) runs a command

这些自动运行使用与 `mise deps` 相同的源文件和输出。它们会在命令启动前处理已跟踪文件的变化，但不会将依赖升级到更新的上游版本。要在某次调用中跳过自动运行：

```sh
mise run --no-deps build
mise exec --no-deps -- npm test
```

### 过期警告

在[已激活的 shell](/shell-setup.html)中，`auto = true` 的提供程序过期时，mise 会列出提供程序名称和过期原因并发出警告：

```text
mise WARN  deps: npm (package-lock.json changed) — run `mise deps`
```

要关闭此警告，请将 [`status.show_deps_stale`](/configuration/settings.html#status.show_deps_stale) 设为 `false`：

```toml
[settings]
status.show_deps_stale = false
```

## 新鲜度检查方式 {#freshness-checking}

当所需输出均存在，且自上次成功运行以来所跟踪的内容均未改变时，提供程序即为最新状态。跟踪内容包括 `sources` 中各文件的内容，以及生效命令（`run` 字符串、shell、`env` 和 `dir`）。否则提供程序会被视为过期，mise 将运行它。

- 首次运行时，带有源文件的提供程序处于过期状态。
- mise 首次检测到可选输出后，该输出就必须持续存在。
- mise 创建的虚拟环境（例如通过 `python.uv_venv_auto` 创建）会使跟踪它的每个 provider 持续处于过期状态，直到该 provider 运行。
- 具有输出但没有源文件的自定义提供程序，只要输出存在就会保持最新；仅修改命令不会触发重新运行。
- 既没有源文件也没有输出的提供程序每次都会运行。

mise 不会逐个检查已安装的依赖，不会查找更新的上游版本，也不会发现未跟踪的外部包缓存被删除。请在 `sources` 中列出命令结果所依赖的输入文件。状态保存在 `$MISE_STATE_DIR/deps/`，而非项目目录中；其中只保存哈希值，不保存命令或环境变量的值。

要查看新鲜度判断结果或即将运行的命令，请使用：

```sh
mise deps install npm --explain
mise deps install --dry-run
```

只有提供程序处于最新状态时，`--explain` 才会以状态码 0 退出。如果提供程序过期或未启用（例如缺少锁文件），则会以非零状态码退出，因此可用于 CI 检查。若要运行因跟踪状态未能发现文件变化的提供程序，请传入 `--force`。

## Monorepo

默认情况下，`mise deps` 只会运行当前项目配置文件中定义的提供程序，以及全局配置中的提供程序。要运行所有显式配置的 monorepo 根目录中的提供程序，请传入 `--monorepo`：

```toml
monorepo_root = true

[monorepo]
config_roots = ["apps/*", "packages/*"]
```

```sh
mise deps --monorepo
```

此功能要求显式设置 [`[monorepo].config_roots`](/tasks/monorepo.html#explicit-config-roots)；mise 不会在任意子目录中搜索提供程序。monorepo 根目录配置中的提供程序也会包含在内，因为该配置属于每个选定配置根目录的层级结构，这与 `mise install --monorepo` 的行为相同。

Monorepo 提供程序 ID 会包含其配置根目录，因此同一个提供程序可以出现在多个项目中。例如，两个 uv 提供程序分别命名为 `//apps/api:uv` 和 `//apps/worker:uv`。使用限定名称配合 `--only`、`--skip` 或提供程序参数：

```sh
mise deps --monorepo --only //apps/api:uv
mise deps install //apps/worker:uv --monorepo
```

不带 `//` 前缀的 `depends` 项会在同一配置根目录内解析，因此 `apps/api` 中配置 `depends = ["uv"]` 的提供程序依赖的是 `//apps/api:uv`。

当 `mise run` 运行另一个配置根目录中的任务（例如 `mise run //apps/api:build`）时，该配置根目录中 `auto = true` 的提供程序会先运行。同时还会运行当前项目（若从 monorepo 根目录调用，则为根目录项目）和全局配置中的自动提供程序。

如果只涉及一个嵌套项目，使用 `dir` 选项会更简单：

```toml
[deps.uv]
dir = "apps/api"
```

## 添加和移除依赖 {#adding-and-removing-packages}

`mise deps add` 和 `mise deps remove` 会运行包管理器相应的添加和移除命令，并更新项目清单（例如 `package.json`）及锁文件。依赖名称需采用 `ecosystem:package` 格式：

```sh
mise deps add npm:react
mise deps add npm:@types/react@19
mise deps add -D npm:vitest        # dev dependency
mise deps remove npm:lodash
```

这些命令支持 `npm`、`yarn`、`pnpm`、`bun`、`deno`、`aube`、`dart` 和 `flutter`。它们会先安装 `[tools]` 中缺失的工具，不需要配置 `[deps]` 条目，但如果已配置提供程序的 `dir`，则会使用该目录。其他提供程序请直接运行包管理器，例如 `mise exec -- uv add httpx`。

## 全栈项目示例 {#example-full-stack-project}

此示例假设仓库根目录包含 npm 和 uv 项目，两个锁文件均已提交，Prisma 已作为项目依赖安装，并且 npm 中定义了 `codegen` 脚本：

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

`mise deps` 会并行运行过期的 `npm` 和 `uv` 提供程序。`prisma` 和 `frontend-codegen` 会等待 `npm` 完成，之后两者可以并行运行。`frontend-codegen` 没有设置 `auto = true`，因此只会在运行 `mise deps` 时执行，不会在每次 `mise exec` 或任务启动前运行。

所有可用参数请参阅 [`mise deps`](/cli/deps.html)、[`mise deps install`](/cli/deps/install.html)、[`mise deps add`](/cli/deps/add.html) 和 [`mise deps remove`](/cli/deps/remove.html)。
