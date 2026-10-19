---
description: "在 mise.toml 中配置工具、环境变量和任务，并控制 mise 查找和写入配置文件的位置。"
socialDescription: "在 mise.toml 中配置工具、环境变量和任务，并指定 mise 查找配置文件的位置。"
---

# mise.toml {#mise-toml-reference}

项目的 `mise.toml` 用于声明项目所需的工具、环境变量和任务。mise 会将其与全局配置及父目录中的配置文件合并。

```mise-toml [mise.toml]
[tools]
node = "24"

[env]
NODE_ENV = "development"

[tasks.hello]
run = "node --eval 'console.log(process.env.NODE_ENV)'"
```

运行 `mise run hello` 会在尚未安装 Node.js 时安装它，并输出 `development`。运行 [`mise config`](/cli/config.html) 可列出 mise 加载的配置文件；运行 `mise ls --current` 可查看当前选择的工具版本。

| 配置内容                                        | 参考文档                                                       |
| ----------------------------------------------- | -------------------------------------------------------------- |
| 工具版本和安装选项                              | [开发工具](/dev-tools/)                                        |
| 传递给命令的环境变量                            | [环境变量](/environments/)                                     |
| 在模板中重复使用的值                            | [配置变量](/configuration/vars.html)                           |
| 开发、测试和生产环境的配置覆盖                  | [配置环境](/configuration/environments.html)                   |
| 命令及其依赖项                                  | [任务](/tasks/)                                                |
| 在 `cd`、安装或内容变更时运行的命令              | [Hook](/hooks.html)                                            |
| 检查机器是否能构建项目                          | [项目诊断](/configuration/project-diagnostics.html)           |
| 长时间运行的服务                                | [Daemon](/daemons.html)                                        |
| mise 自身的行为                                 | [设置](/configuration/settings.html)                           |

[`mise.toml` 可包含的顶层键](#top-level-keys)列出了所有可用配置段。

## 配置文件的合并顺序 {#configuration-hierarchy}

mise 按以下顺序加载配置，后加载的文件会覆盖先加载的文件：

1. `/etc/mise` 中的系统配置。
2. `~/.config/mise` 中的全局配置。
3. 从文件系统根目录到当前目录，查找路径上的每个目录中的配置文件。如果设置了
   最近的 [`ceiling_paths`](/configuration/settings.html#ceiling_paths)，则从该目录的下一层开始查找；
   不会加载 ceiling 目录本身中的文件。
4. [全局 override 文件](#override-file)（`config.override.toml`），其优先级高于以上所有文件，包括 `mise.local.toml`。

因此，较深目录中的文件会覆盖父目录中的文件。在每个目录中，mise 会读取[配置文件位置](#mise-toml)列出的文件，并按表格顺序决定优先级。选择[配置环境](/configuration/environments.html)后，mise 会在查找路径的每一级加入环境文件。父目录中的环境文件不会覆盖子目录中的普通配置文件。

```text
/
├── etc/mise/                         # system config (lowest precedence)
│   ├── conf.d/*.toml
│   ├── config.toml
│   └── config.<env>.toml
└── home/user/
    ├── .config/mise/                 # global config
    │   ├── config.override.toml          # beats all project config
    │   ├── config.<env>.override.toml
    │   ├── conf.d/*.toml
    │   ├── config.toml
    │   ├── config.<env>.toml
    │   ├── config.local.toml
    │   └── config.<env>.local.toml
    └── work/
        ├── mise.toml                 # shared by every project in work/
        └── myproject/
            ├── mise.toml             # project config
            ├── mise.<env>.toml       # environment config
            ├── mise.local.toml       # personal overrides, not committed
            ├── mise.<env>.local.toml
            └── backend/
                └── mise.toml         # nearest file (highest precedence)
```

配置值会彼此合并，而不是整体替换文件。在 `~/src/app` 中工作时，根据以下三个文件，mise 会使用 `mise.local.toml` 中的 `node` 版本请求，以及全局配置中的 `python` 版本请求：

::: code-group

```toml [~/.config/mise/config.toml]
[tools]
node = "22"
python = "3.13"
```

```toml [~/src/app/mise.toml]
[tools]
node = "24"
```

```toml [~/src/app/mise.local.toml]
[tools]
node = "25"
```

:::

这些是版本请求，mise 随后会将其解析为具体版本。

### 各配置段的合并方式 {#merge-behavior-by-section}

| 配置段               | 合并方式                                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[tools]`            | 按工具合并。最近文件中的条目会整体替换该工具的设置，包括选项；其他工具会继承。                                                                                                                                                                       |
| `[env]`              | 按变量合并；采用最近文件中的值。详见[环境变量](/environments/)。                                                                                                                                                                                     |
| `[vars]`             | 按变量合并；采用最近文件中的值。                                                                                                                                                                                                                     |
| `[settings]`         | 按设置项合并。                                                                                                                                                                                                                                       |
| `[tasks]`            | 按任务名称合并。较近目录中的任务会替换父目录任务。同一目录中，不含 `run`、`run_windows` 或 `file` 的配置块会补充元数据。详见[采用哪个定义](/tasks/task-discovery.html#which-definition-wins)。 |
| `[tool_config]`      | 不会合并。仅适用于同一[配置根目录](#config-root)中声明的工具。                                                                                                                                                                                       |
| `[secrets.*]`        | 按字段合并；采用最近项目文件中的值。全局配置会忽略此项。                                                                                                                                                                                             |
| `[daemons]`          | 按 daemon 合并。最近的声明会整体替换该 daemon。                                                                                                                                                                                                      |
| `[daemons_settings]` | 按键合并，并由子项目继承。全局和系统配置会忽略此项。                                                                                                                                                                                                 |

## 配置文件位置 {#mise-toml}

以下是 mise 从文件系统根目录到当前目录逐级查找时会在每个目录中检查的文件名。同一目录中，表格靠前的文件会覆盖靠后的文件。系统和全局配置使用[全局与系统配置](#global-config)一节中的文件名。

| 文件                              | 用途                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `mise.local.toml`                 | 个人覆盖配置。不要将其纳入版本控制。                                                  |
| `mise.toml`                       | 共享的项目配置                                                                         |
| `mise/config.toml`                | `mise/` 目录中的项目配置                                                               |
| `mise/conf.d/*/mise.toml`         | `mise/` 中的目录片段；详见[conf.d 目录](#conf-d-folders)                                |
| `mise/conf.d/*.toml`              | 按字母顺序加载的配置片段；详见[conf.d](#conf-d)                                        |
| `.mise/config.toml`               | 隐藏的 `.mise/` 目录中的项目配置                                                       |
| `.mise/conf.d/*/mise.toml`        | `.mise/` 中的目录片段                                                                  |
| `.mise/conf.d/*.toml`             | `.mise/` 中的片段                                                                      |
| `.config/mise.toml`               | `.config/` 下的项目配置                                                                |
| `.config/mise/mise.toml`          | `.config/mise/` 中的项目配置                                                           |
| `.config/mise/config.toml`        | `.config/mise/` 中的项目配置                                                           |
| `.config/mise/conf.d/*/mise.toml` | `.config/mise/` 中的目录片段                                                           |
| `.config/mise/conf.d/*.toml`      | `.config/mise/` 中的片段                                                               |
| `.tool-versions`                  | 使用 [`.tool-versions` 格式](/dev-tools/versions.html#tool-versions)指定的工具版本      |

- `mise.toml` 和 `mise.local.toml` 也可作为点文件使用。`.mise.toml` 会覆盖 `mise.toml`，`.mise.local.toml` 会覆盖 `mise.local.toml`。
- 每个 `config.toml` 旁边都可以有 `config.local.toml`，例如 `.config/mise/config.local.toml`；其他 `mise.toml` 旁边也可以有 `mise.local.toml`，例如 `.config/mise.local.toml`。同一目录中的本地文件会覆盖所有共享文件。
- 选择环境后，`mise.production.toml` 等环境文件会覆盖共享文件，本地文件再覆盖环境文件。`mise.production.local.toml` 等环境本地文件会覆盖以上所有文件。选择多个环境时，后面的环境文件会覆盖前面同类环境文件。详见[配置环境](/configuration/environments.html#file-names-and-precedence)。
- [`override_config_filenames`](/configuration/settings.html#override_config_filenames) 设置可将此列表中的 TOML 文件名替换为自定义名称（环境文件仍会加载）；[`override_tool_versions_filenames`](/configuration/settings.html#override_tool_versions_filenames) 则可替换 `.tool-versions` 的文件名。[`default_config_filename`](/configuration/settings.html#default_config_filename) 会更改 mise 创建的文件名。

`mise config` 会按优先级从低到高列出 mise 加载的文件；后列出的文件会覆盖前面的文件。

## 使用 conf.d 拆分配置 {#conf-d}

将 `*.toml` 文件放在 `conf.d` 目录中，可以按主题拆分配置。mise 会按字母顺序加载这些文件，并先于所在目录的 `config.toml`，因此 `config.toml` 会覆盖各个片段。项目中的 `mise/conf.d`、`.mise/conf.d`、`.config/mise/conf.d`，以及全局 (`~/.config/mise/conf.d`) 和系统 (`/etc/mise/conf.d`) 目录均支持此方式。文件名以 `.` 开头的文件会被跳过。

片段名称中不建议使用点号，例如 `node.tools.toml`；请将文件重命名为 `node-tools.toml`。详见 [conf.d 环境](/configuration/environments.html#conf-d-environments)。

### conf.d 目录 {#conf-d-folders}

`conf.d` 目录中的子目录也是一个配置片段，可将配置和所用文件放在一起：

```text
~/.config/mise/conf.d/
├── git.toml                  # single-file fragment
└── git-tools/                # 目录片段
    ├── mise.toml             # 始终加载
    ├── mise.local.toml       # 始终加载，通常加入 gitignore
    ├── mise.linux.toml       # linux 环境启用时加载
    ├── mise.linux.local.toml
    └── gitconfig
```

该目录是其文件的[配置根目录](#config-root)。相对路径（例如值为 `"gitconfig"` 的[点文件](/dotfiles.html)源路径）会在该目录内解析；<code v-pre>{{ config_root }}</code> 表示该目录的路径；其中定义的任务默认也会在该目录运行。该目录可以是符号链接，因此点文件仓库可以保留自己的布局：

```sh
ln -s ~/src/dotfiles/git ~/.config/mise/conf.d/git-tools
```

mise 在该目录中只读取 `mise.toml`、`mise.local.toml`、`mise.<env>.toml` 和 `mise.<env>.local.toml`，不会递归搜索子目录。目录名称以 `.` 开头时会被忽略。显式[配置环境](/configuration/environments.html)和[平台环境](/configuration/environments.html#platform-environments)对应的 `mise.<env>.toml` 文件都会加载，且不受 `env_conf_d` 迁移影响。

目录片段会在同一 `conf.d` 目录中的单文件片段之后、所在目录自身的配置（例如 `config.toml`）之前，按目录名称的字母顺序加载。目录中的环境文件会占据与 `conf.d/<name>.<env>.toml` 和 `conf.d/<name>.<env>.local.toml` 相同的加载位置。某目录的 `mise.local.toml` 会在所在目录的 `config.local.toml` 前加载：按照[环境文件顺序](/configuration/environments.html#file-names-and-precedence)，它会覆盖该目录片段和所在目录中的 `.<env>.toml` 文件，但不会覆盖 `.<env>.local.toml` 文件。项目目录片段中声明的工具会共用项目锁文件。

对于任务，每个目录都是独立根目录。该目录的 `[task_config]` 只适用于其中定义的任务；`task_config.includes = ["tasks"]` 会从目录的 `tasks/` 中加载文件任务，但不会替换外围配置的默认任务目录，例如 `~/.config/mise/tasks`。外围配置使用 `cascade = true` 设置的 `[task_config]` 值仍会生效，`includes` 除外。如果该目录和其他配置定义了同名任务，则采用优先级更高文件中的任务；如果某任务只在默认任务目录（例如 `.mise/tasks`）中找到，则配置文件中定义的同名任务优先。详见[任务发现与优先级](/tasks/task-discovery.html)。

## 全局与系统配置 {#global-config}

全局配置在每个目录中都会生效，通常位于 `~/.config/mise/config.toml`
（[`MISE_CONFIG_DIR`](/directories.html#config-mise)）。该目录也可以包含
`mise.toml`、`conf.d/` 配置片段、用于记录机器专属值的 `config.local.toml`，以及
`config.work.toml` 这类环境配置文件。`mise use --global` 和 `mise settings` 会写入此目录。

```toml [~/.config/mise/config.toml]
[tools]
node = "lts"
python = ["3.14", "3.13"]

[settings]
idiomatic_version_file_enable_tools = ["node"]
trusted_config_paths = ["~/work"]

[settings.status]
show_env = false
show_tools = false
```

全局配置与项目配置有以下区别：

- 它的[配置根目录](#config-root)是主目录，也可以通过
  [`global_config_root`](/configuration/settings.html#global_config_root).
- 此处会忽略 `[secrets.*]` 和 `[daemons_settings]`，而 `[daemon_providers]` 仅允许在此处使用。
- [`global_config_file`](/configuration/settings.html#global_config_file)
  （`MISE_GLOBAL_CONFIG_FILE`）会将这些文件替换为单个文件，同时关闭[全局覆盖文件](#override-file)。

系统配置适用于机器上的所有用户，优先级最低。它位于 `/etc/mise`
（[`MISE_SYSTEM_CONFIG_DIR`](/directories.html#system-config)），支持与全局配置目录相同的文件名，
例如 `/etc/mise/config.toml`。
[`system_config_file`](/configuration/settings.html#system_config_file)
（`MISE_SYSTEM_CONFIG_FILE`）可将这些文件替换为单个文件。

## 全局 override 文件 {#override-file}

通常，全局配置的优先级低于项目配置，因此项目的 `mise.toml` 可以覆盖你在全局设置的 `node` 版本或环境变量。如果你希望自己的值在所有项目中都优先生效，请将它写入全局 `config.toml` 同目录下的 `config.override.toml`：

```toml [~/.config/mise/config.override.toml]
[env]
AWS_PROFILE = "personal"

[tools]
node = "24"

[settings]
jobs = 8

[tasks.lint]
run = "my-lint --strict"
```

使用此文件后，即使项目的 `mise.toml` 或 `mise.local.toml` 设置了相同的值，`AWS_PROFILE`、`node` 工具请求、`jobs` 和 `lint` 任务仍以此文件中的值为准。override 文件未提及的值仍来自项目配置和其他全局配置。

override 层级适用于全局配置接受的所有配置段，包括 `[env]`、`[vars]`、`[tools]`、`[tasks]`、`[settings]`、hooks 等。各配置段仍按[各配置段的合并方式](#merge-behavior-by-section)合并；override 文件只是在合并时拥有最高优先级。override 文件属于全局配置，因此会按路径被[信任](/cli/trust.html)，并受其他全局配置的相同限制。

### 生效文件

mise 会从 `~/.config/mise`（[`MISE_CONFIG_DIR`](/directories.html#config-mise)）读取以下文件，表格按优先级从低到高排列：

| 文件                         | 加载条件                              |
| ---------------------------- | ------------------------------------- |
| `config.override.toml`       | 始终加载。                            |
| `config.<env>.override.toml` | `<env>` 位于 `MISE_ENV`（或 `-E`）中时。 |

环境专用文件的优先级高于基础 override 文件。如果有多个环境，例如 `MISE_ENV=dev,test`，后面的环境优先级高于前面的环境，与其他[配置环境](/configuration/environments.html)相同。整个 override 层级的优先级高于所有项目配置，包括项目的 `mise.<env>.toml` 和 `mise.local.toml` 文件。

文件名必须是 `config.override.toml`，而不是 `override.toml`。它与 [`MISE_OVERRIDE_CONFIG_FILENAMES`](/configuration/settings.html#override_config_filenames) 无关；后者只用于重命名 mise 在各目录中查找的文件。

[`MISE_GLOBAL_CONFIG_FILE`](/configuration/settings.html#global_config_file) 表示“这是唯一的全局配置文件”，因此设置后 mise 不会加载任何 override 文件。

### 查看和编辑 override 层级

[`mise config ls`](/cli/config/ls.html) 会在 `Tier` 列中用 `override` 标记 override 文件；`mise config ls --json` 则会添加 `"override": true`，以便查看哪些配置的优先级高于项目配置。[`mise doctor`](/cli/doctor.html) 也会在 `config_files` 列表中标记这些文件。

override 文件永远不会成为默认写入目标。`mise use`、`mise set`、`mise settings set`、`mise trust` 以及[写入目标文件](#target-file-for-write-operations)中列出的其他命令，仍会写入原来的文件。若要写入 override 文件，请传入 `--override`；该选项不能与 `--global` 或 `--path` 同时使用：

```sh
mise set --override AWS_PROFILE=personal   # config.override.toml
mise use --override node@24
mise settings set --override jobs 8
mise set --override --env work TOKEN=x     # config.work.override.toml
```

`mise use`、`mise unuse`、`mise set`、`mise unset`、`mise settings set|add|unset` 和 `mise config get|set` 均支持 `--override`。

### 锁文件

override 文件中声明的工具会覆盖项目中同名工具，并单独解析：mise 不会从项目的 `mise.lock` 中查找它，而 [`--locked`](/cli/install.html) 也不会要求项目锁文件固定其版本。它的锁定条目保存在全局配置旁的全局 `mise.lock` 中。锁定模式下，其他工具仍会依据其锁文件进行检查。

## mise 会写入哪个文件 {#target-file-for-write-operations}

当 [`mise use`](/cli/use.html)、[`mise set`](/cli/set.html)、
[`mise unset`](/cli/unset.html)、`mise settings --local` 和
[`mise tasks add`](/cli/tasks/add.html) 修改项目配置时，会写入最近的含配置目录中优先级最低的文件。
默认修改共享配置；只有明确指定时才会修改个人配置或环境配置：

```sh
# In a directory with mise.toml and mise.local.toml:
mise use node@24                # writes mise.toml
mise set NODE_ENV=production    # writes mise.toml
mise use --env local node@25    # writes mise.local.toml
mise use --env staging node@24  # writes mise.staging.toml
```

如果目录中只有 `mise.local.toml`，就写入该文件。在不含配置的子目录中运行时，会写入父目录的配置文件。
如果所有目录都没有配置文件，mise 会在当前目录创建 `mise.toml`；若当前目录是主目录，则改为写入全局配置。
使用 `--global` 写入全局配置，或通过 `--path` 指定文件。

其他命令的写入规则不同：

- [`mise config get`](/cli/config/get.html) 和 [`mise config set`](/cli/config/set.html) 使用当前已加载且优先级最高的 TOML 文件，该文件可能是 `mise.local.toml`。除非传入 `--override`，否则它们会跳过 [override 文件](#override-file)。使用 `--file` 可选择其他项目文件。
- [`mise unuse`](/cli/unuse.html) 会使用首个声明了目标工具的已加载配置文件，但不包括 [override 文件](#override-file)。带版本号的参数会与配置中的请求进行精确匹配：`node@20` 匹配 `node = "20"`，不匹配 `node = "20.0.0"`。使用 `--path` 可选择文件。

### 将全局配置分别写入不同文件 {#global-section-write-targets}

若要将全局工具、引导安装的软件包和点文件分别保存在不同文件中，可在
[`write_targets`](/configuration/settings.html#write_targets) 中为它们设置目标：

```toml [~/.config/mise/config.toml]
[settings.write_targets]
tools = "~/.config/mise/conf.d/10-tools.toml"
packages = "~/.config/mise/conf.d/20-packages.toml"
dotfiles = "~/.config/mise/conf.d/30-dotfiles.toml"
```

通过 `mise use --global`、`mise bootstrap packages use --global`、
`mise bootstrap packages import --global` 和 `mise dotfiles add`（默认写入全局配置）新增的声明，会写入这些目标文件。
目标必须是 mise 会从全局配置目录加载的文件的绝对路径（或以 `~/` 开头的路径），例如 `config.toml`、
`mise.toml` 或 `conf.d` 配置片段。`~/.config/mise/tools.toml` 这类路径不会被加载，因此 mise 会拒绝该路径。

只有新条目会写入目标文件。已有工具、软件包或点文件仍留在声明它的文件中；如果一条命令要更新多个全局文件中的条目，
mise 会停止并要求指定 `--path`。`--path` 始终优先，`mise use --env staging` 等项目级写入不受影响。
未设置目标的配置段仍写入常规全局配置文件。

## .miserc.toml {#miserc}

`.miserc.toml` 用于保存 mise 查找配置文件之前需要读取的设置，例如要加载哪些[配置环境](/configuration/environments.html)。
mise 会先读取此文件，再读取任何 `mise.toml`，因此在 `mise.toml` 的 `[settings]` 中设置这些值不会影响配置文件查找。

```toml [.miserc.toml]
env = ["development"]
```

此文件只接受以下键：
[`env`](/configuration/settings.html#env),
[`auto_env`](/configuration/settings.html#auto_env),
[`env_conf_d`](/configuration/settings.html#env_conf_d),
[`ceiling_paths`](/configuration/settings.html#ceiling_paths),
[`ignored_config_paths`](/configuration/settings.html#ignored_config_paths),
[`override_config_filenames`](/configuration/settings.html#override_config_filenames),
以及
[`override_tool_versions_filenames`](/configuration/settings.html#override_tool_versions_filenames).
其 JSON Schema 位于
[schema/miserc.json](https://github.com/jdx/mise/blob/main/schema/miserc.json).
`ignored_config_paths` 中的相对路径以 `.miserc.toml` 所在目录为基准解析。

### mise 在哪里查找 .miserc.toml {#miserc-locations}

查找顺序按优先级从高到低排列：

1. 当前目录及其各级父目录：依次查找 `.miserc.local.toml`、`.miserc.toml` 和 `.config/miserc.toml`。查找会在主目录后结束；
   若当前路径不在主目录下，则在文件系统根目录结束。查找也会在 `MISE_CEILING_PATHS` 环境变量所列目录之前停止，且不会搜索该目录。
   在主目录和根目录中，只读取 `.miserc.local.toml` 与 `.miserc.toml`。
2. 无论当前目录为何，依次读取 `~/.config/mise/miserc.local.toml` 和 `~/.config/mise/miserc.toml`。
3. `/etc/mise/miserc.toml`。

文件只覆盖其中设置的键，其他键保留继承值。`env` 会替换继承的环境列表，`env = []` 则清空该列表。
`-E` 标志以及 `MISE_ENV` 等环境变量的优先级高于所有 `.miserc.toml` 文件。

### 个人与整台机器的环境选择

使用 `.miserc.local.toml` 保存只适用于当前检出目录、而非整个项目的环境选择：

```toml [.miserc.local.toml]
env = ["native"]
```

之后，`mise install` 和 `mise run dev` 等命令会加载 `mise.native.toml`。将 `.miserc.local.toml` 加入全局 Git 忽略文件
（`core.excludesFile`），即可使它在所有仓库中都不受跟踪；每个 worktree 都需要单独创建该文件。

若要为整台机器选择环境，又不修改共享的全局 `miserc.toml`，可在 `~/.config/mise` 中使用 `miserc.local.toml`：

```toml [~/.config/mise/miserc.local.toml]
env = ["work"]
```

项目中的 `.miserc.toml` 和 `.miserc.local.toml` 仍可覆盖此设置。

### 在 .miserc.toml 中使用模板

`.miserc.toml` 中的值可以使用带有限定上下文的 [Tera 模板](/templates.html)，例如
<code v-pre>ceiling_paths = ["{{ env.HOME }}"]</code>。可用内容见
[.miserc.toml 中的模板](/templates.html#miserc-template-support)。如果模板渲染失败，mise 会使用文件原始内容，且不输出警告。

## config_root {#config-root}

`config_root` 是配置文件中相对路径的解析基准，也是模板中
<code v-pre>{{ config_root }}</code> 的值。对于项目配置，即使文件位于
`.config/mise.toml`、`.config/mise/config.toml`、`.mise/config.toml`、`mise/config.toml` 或 `conf.d/*.toml` 配置片段中，
即使从子目录运行 mise，配置根目录仍是项目目录。文件中定义的任务默认在此目录运行。
例外是 `.config/mise/mise.toml` 和 `.config/mise/mise.local.toml`，其根目录是 `.config/mise/` 本身。

| 配置文件                                     | `config_root`                |
| -------------------------------------------- | ---------------------------- |
| `~/src/app/mise.toml`                        | `~/src/app`                  |
| `~/src/app/.config/mise.toml`                | `~/src/app`                  |
| `~/src/app/.config/mise/config.toml`         | `~/src/app`                  |
| `~/src/app/.config/mise/conf.d/tools.toml`   | `~/src/app`                  |
| `~/src/app/.mise/config.toml`                | `~/src/app`                  |
| `~/src/app/mise/conf.d/node/mise.toml`       | `~/src/app/mise/conf.d/node` |
| `~/.config/mise/config.toml` (global config) | `~`                          |

[conf.d 目录](#conf-d-folders)拥有独立的配置根目录。对于全局配置，可通过
[`global_config_root`](/configuration/settings.html#global_config_root) 指定其他目录。

```toml
[env]
# 两个条目都以项目根目录为基准解析
_.path = ["tools/bin", "{{ config_root }}/tools/bin"]

# 等同于 "{{ config_root }}/scripts/env.sh"
_.source = "scripts/env.sh"
```

## 顶层键 {#top-level-keys}

| 键                                  | 用途                                                                    | 文档                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `[tools]`                           | 工具版本及各工具的选项                                                  | [开发工具](/dev-tools/)、[工具选项](/dev-tools/#tool-options)        |
| `[tool_config]`                     | 此配置根目录所声明工具的策略                                            | [`[tool_config]`](#tool-config)                                    |
| `[tool_alias]`                      | 工具的自定义版本名称                                                    | [工具别名](/dev-tools/aliases.html)                                 |
| `[plugins]`                         | 插件仓库 URL 和本地插件路径                                             | [`[plugins]`](#plugins)                                            |
| `[env]`                             | 命令和任务使用的环境变量                                                | [环境变量](/environments/)                                          |
| `[vars]`                            | 模板使用但不会导出的值                                                  | [配置变量](/configuration/vars.html)                                |
| `redactions`                        | 要在输出中隐藏的 `env` 或 `vars` 键                                     | [隐藏敏感值](/environments/secrets/#redaction)                      |
| `[secrets.*]`（实验性）             | mise 密钥的来源；仅项目配置支持                                         | [fnox](/environments/secrets/fnox.html)                             |
| `[tasks]`                           | 任务                                                                    | [任务](/tasks/)                                                     |
| `[task_config]`                     | 任务的包含项、排除项和默认值                                            | [任务配置参考](/tasks/task-configuration.html)                      |
| `[task_templates]`                  | 供 `extends` 使用的共享任务定义                                         | [任务模板](/tasks/templates.html)                                   |
| `[settings]`                        | mise 自身的行为                                                         | [设置](/configuration/settings.html)                               |
| `[hooks]`                           | 在 `cd`、进入、离开和安装时运行的命令                                   | [Hook](/hooks.html)                                                |
| `[[watch_files]]`                   | 文件变更时运行的命令                                                    | [Hook](/hooks.html)                                                |
| `[shell_alias]`                     | 在当前目录中生效的 Shell 别名；需要启用 shell 集成                      | [Shell 别名](/shell-aliases.html)                                   |
| `[wrappers]`                        | 拦截指定二进制名称的命令                                                | [命令包装器](/dev-tools/shims.html#command-wrappers)                |
| `include`                           | 合并到当前文件的其他配置文件                                            | [`include`](#include)                                              |
| `min_version`                       | 可使用此文件的最早 mise 版本                                            | [`min_version`](#minimum-mise-version)                             |
| `monorepo_root`、`[monorepo]`        | `//path:task` 寻址；信任根目录即信任其下的配置                          | [Monorepo 任务](/tasks/monorepo.html)                               |
| `[doctor]`                          | `mise doctor project` 的项目检查                                       | [项目诊断](/configuration/project-diagnostics.html)                |
| `[deps]`（实验性）                  | 项目依赖提供器                                                          | [项目依赖](/dev-tools/deps.html)                                    |
| `[oci]`（实验性）                   | `mise oci build` 的设置                                                 | [OCI 镜像](/dev-tools/mise-oci.html)                                |
| `[daemons]`（实验性）               | 后台进程和服务预设                                                      | [Daemon](/daemons.html)                                            |
| `[daemon_groups]`（实验性）         | 命名的 daemon 集合                                                      | [分组](/daemons.html#groups)                                       |
| `[daemons_settings]`（实验性）      | daemon ID 和主机名的命名空间                                           | [端口、URL 和 worktree](/daemons/worktrees.html#namespaces)         |
| `[daemon_providers]`（实验性）      | 共享服务；仅全局配置支持                                                | [在项目间共享 daemon](/daemons/sharing.html)                        |
| `[bootstrap]`                       | 机器初始化：软件包、仓库、服务等                                        | [初始化](/bootstrap.html)                                           |
| `[dotfiles]`                        | mise 在主目录中管理的文件                                               | [点文件](/dotfiles.html)                                            |
| `[dotfile_groups]`                  | 命名的点文件目录树                                                      | [分组](/dotfiles/groups.html)                                       |
| `[history]`                         | 点文件历史记录的内容                                                    | [历史记录](/dotfiles/history.html)                                  |
| `[_]`                               | mise 忽略的自由格式数据                                                 | [`[_]`](#free-form-data)                                           |

每个配置项及其类型和说明均列于 [mise.toml 配置参考](/configuration/reference.html)。

版本请求、`prefix:1.25` 这类前缀以及 `.tool-versions` 见[版本请求与版本文件](/dev-tools/versions.html)。
全局工具可以通过
[`auto_update`](/dev-tools/#automatic-tool-updates).

以下键已弃用：

| 已弃用的键                    | 替代项           | 移除版本     |
| ---------------------------- | --------------- | ----------- |
| `[alias]`                    | `[tool_alias]`  | 尚未确定     |
| `env_file`, `dotenv`         | `env._.file`    | 2027.4.0    |
| `env_path`                   | `env._.path`    | 2027.4.0    |
| `experimental_monorepo_root` | `monorepo_root` | 2027.12.0   |

### `[tool_config]` {#tool-config}

`[tool_config]` 会对共享同一[配置根目录](#config-root)的配置文件所声明的工具应用策略。
`mise.local.toml` 中的策略也适用于同目录 `mise.toml` 中的工具，但不影响从全局、系统或父级配置根目录继承的工具。

```toml
[tool_config]
locked = true

[tools]
node = "24"
```

目前唯一的策略是 `locked`。它要求从锁文件解析并安装此配置根目录中的工具；详见
[strict lockfile mode](/dev-tools/mise-lock.html#strict-lockfile-mode).

### `[plugins]` {#plugins}

`[plugins]` 可为插件名称指定仓库，让项目中的所有人都安装同一个插件：

```toml
[plugins]
elixir = "https://github.com/my-org/mise-elixir.git"
node = "https://github.com/my-org/mise-node.git#v1.2.0" # 分支、标签或完整提交 SHA
"vfox-backend:myplugin" = "https://github.com/jdx/vfox-npm"
```

固定到某个提交的引用必须使用完整 SHA；mise 会拒绝缩写 SHA，因为无法从远程仓库获取它们。
`asdf:`、`vfox:` 或 `vfox-backend:` 等插件类型前缀是可选的。省略前缀时，mise 会克隆插件并根据其文件检测类型。

条目只对新安装生效。如果已安装的插件与条目不再匹配（例如 URL 不同，或当前检出的引用不符），
`mise install`、`mise plugins install` 和 `mise doctor` 会发出警告。运行
`mise plugins install --force <name>` 可按 `[plugins]` 中的声明重新安装。若只想从 URL 安装一次而不与项目共享，
则运行 `mise plugins install <name> <git-url>`。

条目也可以指向本地目录。绝对路径和以 `~/` 开头的路径会直接使用；以 `./` 或 `../` 开头的相对路径，则以声明该路径的文件的
[配置根目录](#config-root)为基准解析：

```toml
[plugins]
example = "./plugins/mise-example"
```

mise 会像 [`mise plugins link`](/cli/plugins/link.html) 一样，将本地插件符号链接到插件目录，因此源文件变更会立即生效。
`file://` URL 表示 Git 仓库，mise 会克隆它。

`[plugins]` 取代了已弃用的 `shorthands_file` 设置（`MISE_SHORTHANDS_FILE`）：请将其中的
`shortname = "backend-or-url"` 条目移到这里。

### `include` {#include}

`include` 会将其他配置文件合并到当前文件中。组织可发布供所有仓库共用的基准配置，仓库也可以据此将大型配置拆分成多个文件：

```toml
include = [
  "./config/tools.toml",
  "git::https://github.com/myorg/platform.git//mise.toml?ref=main",
  "oci::ghcr.io/myorg/platform-config@sha256:0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0",
]

[tools]
node = "24" # 当前文件中的条目会覆盖被包含文件中的条目
```

本地 include 是相对于当前文件的 `.toml` 文件路径，也可以使用绝对路径。`git::` include 指向 `.toml` 文件；
`oci::` include 则指向根目录中包含 `mise.toml` 的制品。

被包含文件的优先级紧随包含它的文件之后；`include` 中靠后的条目会覆盖靠前的条目。被包含文件中的相对路径（例如 `_.file`）
和 <code v-pre>{{ config_root }}</code> 都以包含它的文件为基准解析。其工具会记录在包含文件的锁文件中，并且会检查它的 `min_version`。

被包含文件可以包含 `[tools]`、`[tool_alias]`、`[env]`、`[vars]`、`[hooks]`、`[shell_alias]`、`[plugins]`、`[wrappers]`、
`[bootstrap]`、`min_version` 和 `[_]`。也接受已弃用的 `[alias]` 和 `env_path`。发生同一事件时，被包含文件的 hook 会先于包含文件中的 hook 运行。
`[bootstrap]` 条目按键合并，以包含文件中的条目为准。其他键都会报错，包括 `include`（不支持嵌套包含）、`[settings]` 和 monorepo 键
（mise 在解析 include 前读取它们）、`[tasks]`、`task_config` 和 `task_templates`（请通过
[`task_config.includes`](/tasks/task-discovery.html) 共享任务），以及 `[dotfiles]`、`[daemons]` 等机器级配置段。

include 使用包含文件的信任状态。进入未受信任的项目时，项目不能让 mise 获取 URL；项目配置处于[安全模式](/security.html#safe-mode)时，
也不会获取 include。信任该文件后，被包含内容便会在相同信任状态下执行；这与 `git pull` 后发生变化的 `mise.toml` 一样。
在[偏执模式](/paranoid.html#remote-includes)下，include 必须固定到提交 SHA 或 OCI 摘要；本地 include 会报错，因为其内容不在该文件的信任哈希范围内。

A local include 每次加载时都会重新读取，不会缓存。mise 会将远程被包含文件缓存在 `MISE_CACHE_DIR` 下；固定到提交 SHA 或
OCI 摘要的文件不会重新获取。若缓存副本的年龄超过
[`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache).
`mise install`、`mise use` 和 `mise upgrade` 等命令会刷新分支、标签或 OCI 标签。Shell 激活、`mise exec`、`mise env`、`mise ls`、
shims 和[离线模式](/configuration/settings.html#offline)始终使用缓存副本。如果刷新失败，或返回的文件无法被当前 mise 加载，mise 会发出警告并保留缓存副本；
若没有缓存，则会报错。`mise cache clear` 会强制重新获取。

### `min_version` {#minimum-mise-version}

普通字符串表示硬性最低版本。较旧的 mise 版本会报错并打印升级说明：

```toml
min_version = "2026.1.0"
```

添加软性最低版本，可在版本过旧时发出警告而不终止：

```toml
min_version = { hard = "2025.6.0", soft = "2026.1.0" }
```

将 `hard` 设为能够识别此文件的最早版本，将 `soft` 设为希望团队成员使用的版本。也可以只设置 `{ soft = "2026.1.0" }`。

### `[_]` {#free-form-data}

mise 不会读取 `[_]` 表，因此你可以在配置文件中保存自己的数据，而不会因未知键导致 mise 报错：

```toml
[_]
owner = "platform-team"
```

### 编辑器 Schema {#mise-toml-schema}

`mise.toml` 的 JSON Schema 位于 <https://mise.jdx.dev/schema/mise.json>，也收录在
[JSON Schema Store](https://www.schemastore.org/) 中。因此，[VS Code](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings)、
[IntelliJ](https://www.jetbrains.com/help/idea/json.html#ws_json_using_schemas) 和
[Neovim](https://github.com/b0o/SchemaStore.nvim) 等编辑器可以用它补全和校验配置。通过 `task_config.includes` 加载的任务文件使用单独的 Schema：
<https://mise.jdx.dev/schema/mise-task.json>.

## 惯用版本文件 {#idiomatic-version-files}

为工具启用后，mise 也可以读取其他工具使用的版本文件，例如 `.nvmrc` 和 `.python-version`。支持的文件及启用方式见
[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。
