# 配置

了解如何使用 `mise.toml` 文件、环境变量以及各种配置选项为你的项目配置 mise，以管理你的开发环境。

## `mise.toml`

`mise.toml` 是 mise 的配置文件。它可以位于以下任意文件路径中（按优先级顺序排列，较上层会覆盖较下层的配置）：

- `mise.local.toml` - 用于本地配置，不应提交到源代码管理
- `mise.toml`
- `mise/config.toml`
- `.mise/config.toml`
- `.config/mise.toml` - 可将配置文件集中放在一个公共目录中
- `.config/mise/config.toml`
- `.config/mise/conf.d/*.toml` - 该目录中的所有文件都会按字母顺序加载

::: tip
运行 [`mise cfg`](/cli/config.html) 来查看 mise 在你的具体环境中按什么顺序加载文件。通常这比去弄清 mise 的规则要容易得多。
:::

注意：

- 以 `mise` 开头的路径也可以是点文件，例如：`.mise.toml` 或 `.mise/config.toml`。
- 这个列表不包括 [配置环境](/configuration/environments)，它允许使用特定于环境的配置文件，例如 `mise.development.toml`——通过设置 `MISE_ENV=development` 启用。平台特定环境，如 `mise.windows.toml` 或 `mise.macos-arm64.toml`，可以通过 [`auto_env` 设置](/configuration/environments.html#platform-environments) 自动启用。
- 有关这些路径及其优先级的实际代码，请参见 [`src/config/mod.rs` 中的 `LOCAL_CONFIG_FILENAMES`](https://github.com/jdx/mise/blob/main/src/config/mod.rs)。为简洁起见，这里没有列出一些旧路径。

## 配置层级

mise 使用一种复杂的分层配置系统，将来自多个来源的设置进行合并。理解这个层级有助于你有效地组织开发环境。

### 配置合并的工作方式

这些文件会向上递归，所以如果你有一个 `~/src/work/myproj/mise.toml` 文件，那么其中定义的内容将覆盖
`~/src/work/mise.toml` 或 `~/.config/mise.toml` 中设置的任何内容。配置内容会被合并在一起。

### 配置解析过程

当 mise 需要配置时，它会遵循以下过程：

1. **沿着目录树向上遍历**，从你当前所在位置一直到根目录（或 `MISE_CEILING_PATHS`）
2. **收集沿途找到的所有配置文件**
3. **按顺序合并它们**，更具体的（更接近当前目录的）设置会覆盖更宽泛的设置
4. 如果设置了 `MISE_ENV`，则**应用特定于环境的配置**，例如 `mise.dev.toml`

### 可视化配置层级

```
/
├── etc/mise/                         # 系统范围配置（最低优先级）
│   ├── conf.d/*.toml                 # 系统分片，按字母顺序加载
│   ├── config.toml                   # 系统默认配置
│   └── config.<env>.toml             # 特定环境的系统配置（MISE_ENV 或 -E）
└── home/user/
    ├── .config/mise/
    │   ├── conf.d/*.toml             # 用户分片，按字母顺序加载
    │   ├── config.toml               # 全局用户配置
    │   ├── config.<env>.toml         # 特定环境的用户配置
    │   ├── config.local.toml         # 用户本地覆盖
    │   └── config.<env>.local.toml   # 特定环境的用户本地覆盖
    └── work/
        ├── mise.toml                 # 工作区范围设置
        └── myproject/
            ├── mise.local.toml       # 本地覆盖（git 忽略）
            ├── mise.toml             # 项目配置
            ├── mise.<env>.toml       # 特定环境的项目配置
            ├── mise.<env>.local.toml # 特定环境的项目本地覆盖
            └── backend/
                └── mise.toml         # 特定服务配置（最高优先级）
```

### 按部分划分的合并行为

不同的配置部分会以不同方式合并：

**工具** (`[tools]`): 以覆盖方式叠加

```toml
# 全局：node@18, python@3.11
# 项目：node@20, go@1.21
# 结果：node@20, python@3.11, go@1.21
```

**环境变量** (`[env]`): 以覆盖方式叠加

```toml
# 全局：NODE_ENV=development
# 项目：NODE_ENV=production, API_URL=localhost
# 结果：NODE_ENV=production, API_URL=localhost
```

**任务** (`[tasks]`): 每个任务都会被完全替换

```toml
# 全局：[tasks.test] = "npm test"
# 项目：[tasks.test] = "yarn test"
# 结果："yarn test"（完全替换全局）
```

**设置** (`[settings]`): 以覆盖方式叠加

```toml
# 全局：experimental = true
# 项目：jobs = 4
# 结果：experimental = true, jobs = 4
```

::: tip
运行 `mise config` 查看 mise 按优先级顺序加载了哪些文件。
:::

### 写入操作的目标文件

当诸如 [`mise use`](/cli/use)、[`mise set`](/cli/set) 或 [`mise unuse`](/cli/unuse) 这样的命令需要向配置文件写入时，它们会使用**最高优先级目录中优先级最低的文件**。这意味着：

- 如果 `mise.toml` 和 `mise.local.toml` 都存在，则写入 `mise.toml`
- 如果 `mise.toml` 和 `mise.production.toml` 都存在，则写入 `mise.toml`
- 如果只存在 `mise.local.toml`，则写入 `mise.local.toml`

这种行为确保共享配置（`mise.toml`）默认会被更新，而本地覆盖（`mise.local.toml`）和特定环境配置则保持不变，除非明确指定目标。

::: info 示例

```bash
# 当同时存在 mise.toml 和 mise.local.toml 时：
$ mise use node@22              # 写入 mise.toml
$ mise use --env local node@20  # 写入 mise.local.toml
$ mise set NODE_ENV=production  # 写入 mise.toml
```

:::

下面是一个典型的 `mise.toml` 示例：

```toml
[tools]
node = '24'
python = '3.12'

[env]
NODE_ENV = 'development'

[tasks.dev]
run = 'npm run dev'

[tasks.test]
run = 'pytest'
```

`mise.toml` 文件是层级化的。当前目录中的文件配置会覆盖父目录中的冲突配置。例如，如果 `~/src/myproj/mise.toml`
定义如下：

```toml
[tools]
node = '20'
python = '3.10'
```

而 `~/src/myproj/backend/mise.toml` 定义如下：

```toml
[tools]
node = '18'
ruby = '3.1'
```

那么在 `~/src/myproj/backend` 目录中，`node` 将为 `18`，`python` 将为 `3.10`，`ruby`
将为 `3.1`。你可以使用 `mise ls --current` 查看当前生效的版本。

你还可以使用诸如 `.mise.production.toml` 之类的特定环境配置文件，更多详情请参见
[配置环境](/configuration/environments)。

### `[tools]` - 开发工具

参见 [Tools](/dev-tools/)。除了指定版本之外，每个工具条目还可以包含以下选项：

- `os`: 将安装限制在某些操作系统上
- `depends`: 仅在此配置中相对于其他工具的安装顺序；vfox 插件钩子依赖应放在插件的 `metadata.lua` 中（参见 [工具依赖](/dev-tools/#tool-dependencies)）
- `install_env`: 安装期间以及工具级 `postinstall` 使用的环境变量
- `postinstall`: 在该特定工具安装完成后运行的命令

示例：

```toml
[tools]
node = { version = "22", postinstall = "corepack enable" }
```

### `[env]` - 任意环境变量

请参阅 [environments](/environments/)。

### `[tasks.*]` - 运行文件或 shell 脚本

参见 [Tasks](/tasks/)。

### `[settings]` - Mise 设置

参见 [Settings](/configuration/settings) 获取完整的设置列表。

### `[plugins]` - 指定自定义插件仓库 URL

使用 `[plugins]` 来添加/修改插件短名称。请注意，这只会修改
_new_ 插件安装。现有插件可以使用任何 URL。

```toml
[plugins]
elixir = "https://github.com/my-org/mise-elixir.git"
node = "https://github.com/my-org/mise-node.git#DEADBEEF" # 支持特定 gitref
"vfox-backend:myplugin" = "https://github.com/jdx/vfox-npm"
```

插件类型前缀（例如 `asdf:`、`vfox:` 或 `vfox-backend:`）是可选的。
如果省略，mise 会先克隆该插件，然后从已安装的插件文件中检测插件类型。

如果你只是想从某个特定 URL 安装一次插件，最好使用
`mise plugin install <NAME> <GIT_URL>`。如果你想与项目中的其他开发者共享插件位置/修订版本，请将此部分添加到 `mise.toml` 中。

本地插件目录同样受支持。绝对路径和以 `~/` 开头的路径会直接使用。以 `./` 或 `../`
开头的显式相对路径，会相对于声明它们的文件所在配置根目录进行解析：

```toml
[plugins]
example = "./plugins/mise-example"
```

本地插件会以符号链接的形式链接到 mise 的插件目录中，其行为与
`mise plugins link` 一致，因此源目录中的更改会立即生效。
与远程条目一样，`[plugins]` 只会影响新安装。运行
`mise plugins install --force <NAME>`，可使用配置的本地源替换现有插件。
`file://` 源仍然是 Git 仓库，并且会被克隆。

这取代了已弃用的 `settings.shorthands_file` / `MISE_SHORTHANDS_FILE` 机制：将相同的
`shortname = "backend-or-url"` 条目放在 `[plugins]` 下，而不是放在单独的 TOML 文件中。

### `[tool_alias]` - 工具版本别名

::: tip
`[alias]` 已重命名为 `[tool_alias]`，以将其与 `[shell_alias]` 区分开来。
旧的 `[alias]` 键仍然可用，但已被弃用。
:::

以下配置会使 `mise install node@my_custom_node` 安装 node-20.x
这也可以在 [plugin](/dev-tools/aliases.md) 中指定。
注意，添加别名还会添加一个符号链接，在这种情况下：

```sh
~/.local/share/mise/installs/node/20 -> ./20.x.x
```

```toml
[tool_alias.node.versions]
my_custom_node = '20'
```

### `[shell_alias]` - Shell 别名

定义在进入目录时设置、离开目录时取消设置的 shell 别名：

```toml
[shell_alias]
ll = "ls -la"
gs = "git status"
dev = "npm run dev"
```

它们的工作方式类似于环境变量——会根据你当前所在的目录动态设置。
有关更多详情，请参阅 [Shell Aliases](/shell-aliases)。

### 最低 mise 版本

指定配置文件所需支持的最低 mise 版本。

你可以设置硬性最低版本（不满足时会报错）或软性最低版本（会警告并继续）：

```toml
#（等同于硬性）
min_version = '2024.11.1'

# 新的对象形式
min_version = { hard = '2024.11.1' }

# 软性推荐
min_version = { soft = '2024.11.1' }

# 两者都设置
min_version = { hard = '2024.11.1', soft = '2024.9.0' }
```

当未满足软性最低版本时，mise 会打印警告，并且（如果可用）显示自我更新说明。当未满足硬性最低版本时，mise 会报错并显示自我更新说明。

使用 `min_version` 来表明你的项目所支持的最旧 mise 版本。一般来说，用户应保持 mise 为最新，因为 mise 会与随时间变化的外部注册表和后端集成。项目和组织应优先选择最低版本要求，而不是将用户锁定到某个特定的 mise 可执行文件；通常不建议把用户固定到某个 mise 版本。把用户版本锁回去，就像阻止 `apt update` 或 `brew update` 刷新包元数据一样：这会隐藏弃用警告，并让上游集成逐渐变得过时。

### Monorepo 根目录

将配置文件标记为 monorepo 根目录，以便为任务启用目标路径语法。

```toml
monorepo_root = true
```

启用后：

- 子目录中的任务可通过命名空间路径访问（例如，`//projects/frontend:build`）
- 子目录任务使用来自父级配置的工具
- 任务仅在需要时加载（例如，在运行它们时，或使用 `mise tasks ls --all` 时）
- 当根目录受信任时，所有后代配置文件都会被**隐式信任**
- 无需为每个子目录的配置单独授予信任

有关详细用法和示例，请参见 [Monorepo Tasks](/tasks/monorepo)。

### `mise.toml` 架构

- 你可以在 [schema/mise.json](https://github.com/jdx/mise/blob/main/schema/mise.json) 或 <https://mise.jdx.dev/schema/mise.json> 中找到 `mise.toml` 的 JSON 架构。
- 一些编辑器可以在编辑 `mise.toml` 文件时自动加载该架构，以提供自动补全和验证功能（[VSCode](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings)、[IntelliJ](https://www.jetbrains.com/help/idea/json.html#ws_json_using_schemas)、[neovim](https://github.com/b0o/SchemaStore.nvim) 等）。它也可以在 [JSON 架构存储库](https://www.schemastore.org/) 中找到。
- 请注意，对于“包含的任务”（参见[任务配置](/tasks/task-configuration)），还有另一个架构：<https://mise.jdx.dev/schema/mise-task.json>。

## 全局配置：`~/.config/mise/config.toml`

可以在 `~/.config/mise/config.toml` 中配置 mise。它的作用类似于本地的 `mise.toml`，但会应用于每个目录。

这里只展示了一些常见设置。完整列表和说明请参阅 [Settings](/configuration/settings)。

```toml [~/.config/mise/config.toml]
[tools]
# 全局工具版本写在这里
# 你可以使用 `mise use -g` 来设置这些
node = 'lts'
python = ['3.10', '3.11']

[settings]
# 读取其他版本管理器使用的版本文件，例如 .nvmrc
idiomatic_version_file_enable_tools = ['node']

trusted_config_paths = [
    '~/work/my-trusted-projects',
]

env_file = '.env' # 从 dotenv 文件加载环境变量，参见 `MISE_ENV_FILE`

[settings.status]
show_env = false
show_tools = false

# "_" 是一个特殊键，用于放置你想写入 mise.toml 但 mise 永远不会解析的信息
[_]
foo = "bar"
```

## 系统配置：`/etc/mise/config.toml`

与 `~/.config/mise/config.toml` 类似，但适用于系统上的所有用户。这对于为所有用户设置默认值很有用。

## `.tool-versions`

`.tool-versions` 文件是 asdf 的配置文件，它可以像 `mise.toml` 一样在 mise 中使用。
不过它不如 `mise.toml` 灵活，所以更推荐使用 `mise.toml`。如果你
已经有很多 `.tool-versions` 文件，或者在使用 asdf 的团队中工作，它会很有用。

下面是一个包含所有受支持语法的示例：

```text
node        20.0.0       # 允许使用注释
ruby        3            # 可以是模糊版本
shellcheck  latest       # 也支持 "latest"
jq          1.6
erlang      ref:master   # 从 vcs ref 编译
go          prefix:1.19  # 使用最新的 1.19.x 版本——在 "1.19" 恰好匹配时需要
shfmt       path:./shfmt # 使用自定义运行时
node        lts          # 使用 node 的 lts 版本（并非所有插件都支持）

node        sub-2:lts      # 从解析出的主版本号中减去 2（例如：20 变为 18）
python      sub-0.1:latest # 从解析出的次版本号中减去 1（例如：3.11 变为 3.10）
```

有关此文件格式的更多信息，请参见 [asdf 文档](https://asdf-vm.com/manage/configuration.html#tool-versions)。

## 作用域

`mise.toml` 和 `.tool-versions` 都支持“作用域”，用于修改版本的行为：

- `ref:<SHA>` - 从版本控制系统（通常是 git）的引用编译
- `prefix:<PREFIX>` - 使用与此前缀匹配的最新版本。对 Go 很有用，因为 `1.20`
  只能精确匹配 `1.20`，而 `prefix:1.20` 将匹配 `1.20.1`、`1.20.2` 等版本。
- `path:<PATH>` - 使用指定路径中自定义编译的版本。一个使用场景是重新使用
  Homebrew 工具（例如：`path:/opt/homebrew/opt/node@20`）。
- `sub-<PARTIAL_VERSION>:<ORIG_VERSION>` - 解析 `ORIG_VERSION`，从解析得到的版本组件中减去
  `PARTIAL_VERSION` 中对应的数字组件，然后将结果作为版本前缀再次解析。例如，`sub-2:lts` 会解析
  `lts`，并从其主版本组件中减去 2（`20` 变为 `18`）；而 `sub-0.1:latest` 会从解析得到的次版本组件中减去 1（`3.11` 变为 `3.10`）。这是数字版本运算，而不是请求第 N 个之前发布的版本。

## 惯用版本文件

mise 支持像 asdf 一样的“惯用版本文件”。它们是语言特定的文件，
例如 `.node-version`
和 `.python-version`。这些文件非常适合在不强迫
其他开发者使用 mise 或 asdf 之类特定工具的情况下，为项目设置运行时版本。

它们支持别名，这意味着你可以使用一个包含 `lts/hydrogen` 的 `.nvmrc` 文件，并且它会在
mise 和 nvm 中正常工作。以下是一些支持的惯用版本文件：

<!-- mise:idiomatic-version-files:start -->

| 插件          | 惯用文件                                                                                                                                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atmos         | `.atmos-version`                                                                                                                                                                                                                                                                                           |
| bun           | `.bun-version`, `package.json`                                                                                                                                                                                                                                                                             |
| chezmoi       | `.chezmoiversion`                                                                                                                                                                                                                                                                                          |
| cmake         | `CMakeLists.txt`                                                                                                                                                                                                                                                                                           |
| crystal       | `.crystal-version`                                                                                                                                                                                                                                                                                         |
| dagger        | `dagger.json`                                                                                                                                                                                                                                                                                              |
| deno          | `.deno-version`, `package.json`                                                                                                                                                                                                                                                                            |
| dotnet        | `global.json`                                                                                                                                                                                                                                                                                              |
| earthly       | `Earthfile`                                                                                                                                                                                                                                                                                                |
| elixir        | `.exenv-version`                                                                                                                                                                                                                                                                                           |
| go            | `.go-version`, `go.mod`                                                                                                                                                                                                                                                                                    |
| golangci-lint | `.golangci.yml`, `.golangci.yaml`, `.golangci.toml`, `.golangci.json`                                                                                                                                                                                                                                      |
| goreleaser    | `.config/goreleaser.yml`, `.config/goreleaser.yaml`, `.goreleaser.yml`, `.goreleaser.yaml`, `goreleaser.yml`, `goreleaser.yaml`                                                                                                                                                                            |
| java          | `.java-version`, `.sdkmanrc`                                                                                                                                                                                                                                                                               |
| lefthook      | `lefthook.yml`, `lefthook.yaml`, `.lefthook.yml`, `.lefthook.yaml`, `lefthook.toml`, `.lefthook.toml`, `lefthook.json`, `.lefthook.json`, `lefthook.jsonc`, `.lefthook.jsonc`, `.config/lefthook.yml`, `.config/lefthook.yaml`, `.config/lefthook.toml`, `.config/lefthook.json`, `.config/lefthook.jsonc` |
| node          | `.nvmrc`, `.node-version`, `package.json`                                                                                                                                                                                                                                                                  |
| npm           | `package.json`                                                                                                                                                                                                                                                                                             |
| opentofu      | `.opentofu-version`                                                                                                                                                                                                                                                                                        |
| packer        | `.packer-version`                                                                                                                                                                                                                                                                                          |
| perl          | `.perl-version`                                                                                                                                                                                                                                                                                            |
| pixi          | `pixi.toml`, `pyproject.toml`                                                                                                                                                                                                                                                                              |
| pnpm          | `package.json`                                                                                                                                                                                                                                                                                             |
| pre-commit    | `.pre-commit-config.yaml`                                                                                                                                                                                                                                                                                  |
| python        | `.python-version`, `.python-versions`                                                                                                                                                                                                                                                                      |
| ruby          | `.ruby-version`, `Gemfile`                                                                                                                                                                                                                                                                                 |
| ruff          | `ruff.toml`, `.ruff.toml`                                                                                                                                                                                                                                                                                  |
| rust          | `rust-toolchain.toml`                                                                                                                                                                                                                                                                                      |
| swift         | `.swift-version`                                                                                                                                                                                                                                                                                           |
| task          | `Taskfile.yml`, `Taskfile.yaml`, `taskfile.yml`, `taskfile.yaml`                                                                                                                                                                                                                                           |
| terraform     | `.terraform-version`                                                                                                                                                                                                                                                                                       |
| terragrunt    | `.terragrunt-version`                                                                                                                                                                                                                                                                                      |
| terramate     | `.terramate-version`                                                                                                                                                                                                                                                                                       |
| yarn          | `.yvmrc`, `package.json`                                                                                                                                                                                                                                                                                   |
| zig           | `.zig-version`                                                                                                                                                                                                                                                                                             |

<!-- mise:idiomatic-version-files:end -->

由注册表支持的工具还可以描述 mise 应如何从结构化的惯用文件中提取版本。注册表条目可以使用与 [HTTP 后端](/dev-tools/backends/http.html#version-listing)相同的 `version_regex`、`version_json_path` 和 `version_expr` 解析器。
这使得通过 `aqua:` 和 `github:` 等后端安装的工具能够支持 JSON 清单和其他工具专用的版本文件，而无需 asdf 或 vfox 插件。

有些文件声明的是最低兼容版本或配置格式主版本，而不是确切的二进制版本。mise 会将该值视为普通的版本请求，因此像 `3.25` 这样的值会选择最新的 CMake 3.25 版本，而 GoReleaser 配置中的 `version: 2` 会选择最新的 GoReleaser 2.x 版本。

对于 `go.mod`，如果存在 `toolchain goX.Y.Z` 指令（精确的工具链固定版本），则会使用该指令。
否则会使用 `go X.Y` 指令；由于它只声明了所需 Go 版本的_最低值_，mise 会将其解析为匹配的最新补丁版本（例如，`go 1.22` → 最新的 `1.22.x`）。

在 mise 中，这些默认是禁用的，原因说明见 <https://github.com/jdx/mise/discussions/4345>。

- `mise settings add idiomatic_version_file_enable_tools python` 用于启用特定工具，例如 Python ([文档](/configuration/settings.html#idiomatic_version_file_enable_tools))

可以通过 `tool:filename` 组合为某个工具禁用单个文件。例如，要让 node 使用
`.nvmrc`，同时让包管理器继续使用 `package.json`：

```sh
mise settings add idiomatic_version_file_disable_files node:package.json
```

发现并解析这些文件会产生少量性能开销。注册表解析器会在进程内运行；由插件提供的文件可能会调用插件的解析器。结果会被[缓存](/cache-behavior)，因此通常不会明显影响性能。

::: info
asdf 将这些称为“旧版版本文件（legacy version files）”。我认为这是个糟糕的命名，因为它暗示
这些文件不应该被使用——而在我看来显然并非如此。我更喜欢“惯用版本文件（idiomatic
version files）”这个术语，因为它们并不是 asdf/mise 独有的版本文件，也可以被其他工具使用。
（`.nvmrc` 是一个值得注意的例外，因为它绑定于某个特定工具。）
:::

## 设置

请参阅 [设置](/configuration/settings) 以查看完整的设置列表。

## 任务

查看 [任务](/tasks/) 以获取完整的配置选项列表。

## 环境变量

::: tip
通常，mise 中的环境变量用于设置 [配置](/configuration/settings)，因此大多数环境变量都记录在该文档中。以下是一些不属于设置项的环境变量。

mise 中的一个设置项通常可以通过环境变量进行配置，也可以在配置文件中设置。
:::

mise 也可以通过环境变量进行配置。可用的选项如下：

### `MISE_DATA_DIR`

默认（Linux）：`~/.local/share/mise` 或 `$XDG_DATA_HOME/mise`
默认（macOS）：`~/.local/share/mise` 或 `$XDG_DATA_HOME/mise`
默认（Windows）：`%LOCALAPPDATA%\mise` 或 `$XDG_DATA_HOME/mise`

这是 mise 存储插件和工具安装的目录。这些内容不应在不同机器之间共享。

### `MISE_CACHE_DIR`

默认（Linux）：`~/.cache/mise` 或 `$XDG_CACHE_HOME/mise`
默认（macOS）：`~/Library/Caches/mise` 或 `$XDG_CACHE_HOME/mise`
默认（Windows）：`%TEMP%\mise` 或 `$XDG_CACHE_HOME/mise`

这是 mise 存储内部缓存的目录。这些内容不应在不同机器之间共享。只要 mise 未运行，它随时都可能被删除。

### `MISE_TMP_DIR`

默认：[`std::env::temp_dir()`](https://doc.rust-lang.org/std/env/fn.temp_dir.html) 在 rust 中的实现

这用于临时存储，例如安装工具时。

### `MISE_SYSTEM_CONFIG_DIR`

默认：`/etc/mise`

这是 mise 存储系统级配置的目录。
`MISE_SYSTEM_DIR` 也作为旧别名受支持。

### `MISE_GLOBAL_CONFIG_FILE`

默认：`$MISE_CONFIG_DIR/config.toml`（通常为 `~/.config/mise/config.toml`）

这是配置文件的路径。

当你希望全局写入（例如从 `$HOME` 运行 `mise use` 或 `mise set`）指向不同的配置文件时，请使用此项。[`MISE_DEFAULT_CONFIG_FILENAME`](#mise_default_config_filename)
会自定义默认的本地配置文件名，而不是全局配置路径。

### `MISE_DEFAULT_CONFIG_FILENAME`

默认：`mise.toml`

这会自定义 mise 创建或查找项目配置文件时使用的默认本地配置文件名。

### `MISE_GLOBAL_CONFIG_ROOT`

默认：`$HOME`

::: v-pre
这是用于全局配置文件的 `{{config_root}}` 的路径。
:::

### `MISE_ENV_FILE`

设置为某个文件名即可从 dotenv 文件中读取环境变量，例如：`MISE_ENV_FILE=.env`。
这会在当前目录及其父目录中搜索并加载所有匹配的文件。
底层使用 [dotenvy](https://crates.io/crates/dotenvy)。

### `MISE_${TOOL}_VERSION`

为某个工具设置版本。例如，`MISE_NODE_VERSION=20` 将使用 <node@20.x>，无论
`mise.toml`/`.tool-versions` 中设置了什么。

### `MISE_TRUSTED_CONFIG_PATHS`

这是一个路径列表，mise 会自动将其标记为
受信任的路径。它们按照平台对 PATH
环境变量的约定进行分隔：Unix 上使用 `:`，Windows 上使用 `;`。

### `MISE_CEILING_PATHS`

这是一个路径列表，mise 会在这些路径中停止搜索
配置文件和文件任务。这对于阻止 mise 在加载缓慢的目录中搜索文件很有用。它们按照平台对 PATH 环境变量的约定进行分隔。在大多数 Unix 平台上，分隔符是 `:`，在 Windows 上是 `;`。

### `MISE_LOG_LEVEL=trace|debug|info|warn|error`

这些会改变 mise 的详细程度。

你也可以使用 `MISE_DEBUG=1`、`MISE_TRACE=1` 和 `MISE_QUIET=1`，以及
`--log-level=trace|debug|info|warn|error`。

### `MISE_LOG_FILE=~/mise.log`

将日志输出到文件。

### `MISE_LOG_FILE_LEVEL=trace|debug|info|warn|error`

与 `MISE_LOG_LEVEL` 相同，但用于日志_文件_输出级别。如果你想
保存日志但又不希望它们占满显示区域，这会很有用。

### `MISE_LOG_HTTP=1`

在日志中显示 HTTP 请求/响应。

### `MISE_LOG_VERBOSE_DEPS=1`

来自噪声较大的第三方 crate（`h2`、`hyper`、
`reqwest`、`rustls` 等，它们会为每个 HTTP/2 帧或套接字
读取输出一行）的调试和跟踪日志会始终被丢弃——否则它们会淹没调试/跟踪
输出。将其设为 `1` 可让这些日志通过；这是唯一能
看到它们的方法，包括在 `--log-level=trace`/`-vv` 下。

### `MISE_QUIET=1`

等同于 `MISE_LOG_LEVEL=warn`。

### `MISE_HTTP_TIMEOUT`

设置 http 请求的超时时间（秒）。默认值为 `30`。

### `MISE_RAW=1`

设置为 "1" 可将插件脚本直接通过管道传入 stdin/stdout/stderr。默认情况下 stdin 是禁用的，
因为当并行安装一堆插件时，你不会看到提示信息。如果某个
插件接受输入，或者看起来没有正确安装，请使用此项。

设置 `MISE_JOBS=1`，因为同一时间只能执行 1 个插件脚本。

### `MISE_TERM_WIDTH`

覆盖 mise 用于渲染表格和列表（例如 `mise ls`）的终端宽度。
默认情况下，mise 会从终端检测宽度。这在 CI 或其他非交互式环境中很有用，
因为这些环境中的检测可能会返回错误值（例如 CircleCI 会将宽度报告为 `0`），
从而导致输出出现异常换行。

如果未设置 `MISE_TERM_WIDTH`，mise 会回退到常用的 `COLUMNS`
环境变量，最后才使用自动检测。该覆盖值会被严格遵守，
因此你也可以强制使用更窄的宽度：

```sh
MISE_TERM_WIDTH=120 mise ls
```

### `MISE_FISH_AUTO_ACTIVATE=1`

配置 fish shell 的 vendor_conf.d 脚本以自动激活。
该文件会在 homebrew 以及其他某些安装方式中自动使用，
以便在不进行额外配置的情况下自动激活 mise。

默认启用，设置为 "0" 可禁用。
