---
description: "控制 mise 查找任务的位置、加载 include 和远程任务文件的方式，以及任务重名时采用哪个定义。"
socialDescription: "控制 mise 查找任务的位置，以及任务重名时采用哪个定义。"
---

# 任务发现与优先级

mise 会从配置文件、你引入的任务文件，以及当前目录和每一级父目录中的任务目录可执行脚本收集任务。使用 [`task_config.includes`](#include-task-files-and-directories) 可更改任务搜索位置；如果多个来源定义了同名任务，请参阅[采用哪个定义](#which-definition-wins)。

如需查看任务的来源，请运行 [`mise tasks info <task>`](/cli/tasks/info.html)。

## 任务来源 {#task-sources}

mise 会加载以下三种任务来源：

- 配置文件中的 `[tasks.<name>]` 表，例如 `mise.toml`
- 配置引入的或位于任务目录中的 [TOML 任务文件](#included-toml-files)
- 任务目录中的可执行[文件任务](/tasks/file-tasks.html)

mise 会读取当前目录、每一级父目录和[全局配置](#global-tasks)中的这些来源。父目录中的任务也可在其子目录中使用：

```text
project/
├── mise.toml          # 定义 lint、test、build
└── frontend/
    └── mise.toml      # 定义 test 和 bundle
```

在 `frontend/` 中，`mise run lint` 和 `mise run build` 会运行父目录的任务，`mise run test` 会运行 `frontend` 中的定义，而 `mise run bundle` 仅在该目录可用。

### 默认任务目录 {#default-task-directories}

除非配置设置了 [`task_config.includes`](#include-task-files-and-directories)，否则 mise 会按以下顺序在这些目录中查找文件任务：

1. `mise-tasks`
2. `.mise-tasks`
3. `.mise/tasks`
4. `.config/mise/tasks`
5. `mise/tasks`

mise 会递归搜索每个目录。它会将每个可执行文件作为文件任务加载，并将每个非 mise 配置文件的 `.toml` 文件作为 [TOML 任务文件](#included-toml-files)加载。名称以 `.` 开头的文件和子目录会被跳过。子目录会成为任务名称的一部分，详见[文件任务分组](/tasks/file-tasks.html#task-grouping)。如果这些目录中有多个定义了同一任务，则列表中靠后的定义优先。

Windows 没有可执行权限；mise 在 Windows 上如何识别任务文件，请参阅 [Windows](/tasks/file-tasks.html#windows)。

### 全局任务 {#global-tasks}

`$MISE_CONFIG_DIR/tasks` 中的文件任务（默认目录为 `~/.config/mise/tasks`）是全局任务，可在任意目录中使用，无论是否存在全局配置文件。如果存在 `~/.config/mise/config.toml` 之类的全局配置文件，mise 也会将主目录下的其他默认任务目录作为全局目录解析。该文件中的内联任务同样是全局任务。如果没有全局配置文件，主目录下的其他任务目录就不是全局目录；你在主目录下工作时，它们会像项目任务目录一样加载。

### 信任 {#trust}

如果任务文件包含 Tera 模板语法，加载文件时就可能执行代码，因为 mise 会在加载任务时渲染模板。如果目录中没有受信任的配置文件，那么此类文件或列出 `secrets` 的文件必须先获得信任，mise 才会加载，处理方式与不受信任的配置文件相同。在[偏执模式](/paranoid.html)下，该目录中的每个任务文件都需要获得信任。详见[配置文件信任](/security.html#configuration-trust)。

## 采用哪个定义 {#which-definition-wins}

多个来源定义了同名任务时，mise 按以下规则选择定义：

- 来自较近目录的任务会取代父目录中的同名任务，项目任务会取代全局任务。
- 在同一目录中，优先级较高的配置文件中的任务优先，例如 `mise.local.toml` 高于 `mise.toml`。详见[配置文件优先级](/configuration.html#mise-toml)。不带命令的任务块则会添加元数据，详见[分层任务定义](#layered-task-definitions)。
- 带命令的内联 `[tasks.<name>]` 块会取代引入的 TOML 文件或任务目录中的同名任务，前提是该块来自选择了该文件的配置，或来自优先级更高的配置。详见[通过 TOML 配置文件任务](#configuring-file-tasks-from-toml)。
- 对同一个 `includes` 列表，最后一个定义该名称的条目优先。
- 用户全局配置文件和系统配置文件分别属于不同的作用域。用户全局任务会完全取代同名系统任务，不会继承其元数据。其他名称的系统任务仍然可用。
- 每个 [conf.d 目录](/configuration.html#conf-d-folders)都是独立的根目录。其 `includes` 只会在该目录中解析，并且只会取代该目录自己的默认任务目录。

## 引入任务文件和目录 {#include-task-files-and-directories}

设置 `task_config.includes`，列出 mise 为某个配置根目录读取的 TOML 任务文件和任务目录：

```toml
[task_config]
includes = [
  "tasks.toml", # TOML 任务文件
  "mytasks",    # 包含文件任务和 TOML 任务文件的目录
]
```

此列表会取代该配置根目录的[默认任务目录](#default-task-directories)。如需保留默认目录并添加其他目录，请逐一列出：

```toml
[task_config]
includes = [
  "mise-tasks",
  ".mise-tasks",
  ".mise/tasks",
  ".config/mise/tasks",
  "mise/tasks",
  "mytasks",
  "tasks.toml",
]
```

每个条目可以是：

- 相对于配置根目录的路径、绝对路径，或以 `~` 开头的路径
- glob 模式，例如 `tasks/*.toml`
- [`git::` URL](#remote-git-includes) 或 [`oci::` 引用](#remote-oci-includes)

mise 会将条目作为 Tera 模板渲染，因此可以使用
<code v-pre>{{ config_root }}</code>、<code v-pre>{{ env.HOME }}</code> 和已解析的 `vars`：

```toml
[task_config]
includes = ["{{ config_root }}/tasks/*.toml", "~/shared-tasks"]
```

### 使用哪个 includes 列表 {#which-includes-list-applies}

对每个目录，mise 会使用该目录中优先级最高且设置了 `includes` 的配置文件中的列表。同一目录其他配置文件的列表不会与之合并。如果没有设置列表，mise 就使用该目录的默认任务目录。

只有父目录设置了 [`task_config.cascade = true`](/tasks/task-configuration.html#task_config.cascade) 时，其列表才会应用到子目录。继承的条目仍从父目录的配置根目录解析；子目录若设置自己的 `includes`，则会取代继承的列表。

### 覆盖引入的任务 {#override-an-included-task}

多个条目定义了同名任务时，列表中的最后一个条目优先。此规则同样适用于目录、TOML 任务文件和远程引入。因此，要用本地任务覆盖共享仓库中的任务，请将本地目录列在 `git::` 条目之后：

```toml
[task_config]
includes = [
  "git::https://github.com/myorg/shared-tasks.git//tasks", # 共享任务
  ".mise/tasks", # 同名本地任务会覆盖共享任务
]
```

## 引入的 TOML 文件 {#included-toml-files}

TOML 任务文件只包含任务。每个任务的写法与 `mise.toml` 中 `[tasks]` 下的写法相同，但省略 `tasks.` 前缀：

```mise-toml [tasks.toml]
task1 = "echo task1"
task2 = "echo task2"

[task3]
run = "echo task3"
vars = { target = "linux" }
```

如需在编辑器中启用自动补全和校验，请使用[任务 JSON Schema](https://mise.jdx.dev/schema/mise-task.json)。

## 通过 TOML 配置文件任务 {#configuring-file-tasks-from-toml}

使用 `[tasks.<name>]` 块配置可执行文件任务。不含 `run`、`run_windows` 或 `file` 的任务块会添加元数据，并继续使用脚本作为命令。添加这些字段之一则会取代脚本命令，但受[文件任务配置优先级](#file-task-config-precedence)规则约束。

可以使用任务块设置 `#MISE` 标头行不支持的属性：`vars`、`timeout`，以及 `deny_*` 和 `allow_*` [沙箱属性](/tasks/task-configuration.html#sandbox)。

### 添加元数据和依赖项 {#add-metadata-and-dependencies}

对于 `mise-tasks/hello.sh`，可以使用 `[tasks.hello]` 或 `[tasks."hello.sh"]`：

```toml [mise.toml]
[tasks.hello]
description = "运行 lint 后打招呼"
env = { GREETING = "hi" }
depends = ["lint"]
```

`mise run hello` 会先运行 `lint`，再使用 `GREETING=hi` 执行脚本。`mise tasks ls` 会显示此描述。脚本的完整任务名称是 `hello.sh`；`mise run` 也接受省略扩展名的 `hello`。

完整名称只会选中一个脚本。不带扩展名的名称会选中所有同名脚本，除非已存在名称完全相同的任务。例如，同时存在 `hello.sh` 和 `hello.js` 时，`[tasks.hello]` 会配置两者，而 `[tasks."hello.sh"]` 只配置 `hello.sh`。

### 替换脚本命令 {#replace-a-scripts-command}

设置 `run`、`run_windows` 或 `file`，即可替换匹配的文件任务：

```mise-toml [mise.toml]
[tasks.hello]
run = "echo hi"
```

此时 `mise run hello` 会运行 `echo hi`。发现的 `hello.sh` 不再作为单独任务存在，因此 `mise run hello.sh` 将不可用。如果还存在 `hello.js`，此任务块会将两个脚本一并替换为一个名为 `hello` 的任务。

如需只替换 `hello.sh`，请使用它的完整名称：

```mise-toml [mise.toml]
[tasks."hello.sh"]
run = "echo hi"
```

此时 `mise run hello.sh` 会运行 `echo hi`，而 `hello.js` 仍是单独的任务。如需同时保留原脚本和新命令，请为命令指定不同的任务名称。

### 文件任务配置优先级 {#file-task-config-precedence}

只有当命令所在的任务块来自通过 [`task_config.includes`](#include-task-files-and-directories) 选中脚本目录的配置，或优先级更高的配置时，命令才会替换脚本。较低优先级的任务块可以添加元数据，但其中的命令会被忽略，mise 仍会运行脚本。此规则适用于完整名称和省略扩展名的名称。

没有配置设置 `task_config.includes` 时，mise 会在默认目录中发现脚本。此时，配置链中的任意配置都可以用命令替换匹配的脚本。

只要脚本仍是任务命令，就只有优先级最高的匹配 TOML 任务块会提供元数据。较低优先级的任务块不会添加任何内容，包括 `env` 和 `alias`。例如，`mise.local.toml` 中的 `[tasks.hello]` 优先于 `mise.toml` 中的 `[tasks."hello.sh"]`，两者的元数据不会合并。

TOML 命令替换脚本后，将适用[分层任务定义](#layered-task-definitions)规则。优先级更高的元数据任务块可以使用任一名称配置替代任务。例如，`mise.local.toml` 中的 `[tasks."hello.sh"]` 可以为 `mise.toml` 中的 `[tasks.hello] run = "echo hi"` 添加描述。优先级低于所选命令的任务块不会提供任何内容。如果两个名称都声明了命令，则优先级更高的命令优先。

### Windows 脚本配对 {#windows-script-pairs}

在 Windows 上，mise 会从 `build.sh` 和 `build.ps1` 这类脚本对中选择 [Windows 原生脚本](/tasks/file-tasks.html#windows)，并将任务命名为 `build`。使用 `[tasks.build]` 配置或替换该任务。名为 `[tasks."build.ps1"]` 的任务块则定义一个单独的任务。

## 分层任务定义 {#layered-task-definitions}

不含 `run`、`run_windows` 或 `file` 的内联 `[tasks.<name>]` 块，会为优先级较低配置中的同名任务添加元数据。这样无需重复命令，就可以添加描述、环境变量或依赖项。

::: code-group

```toml [mise.toml]
[tasks.check]
depends = ["lint", "test"]
```

```toml [mise.local.toml]
[tasks.check]
description = "Run the project checks"
```

:::

此时 `mise run check` 仍会运行 `lint` 和 `test`。即使依赖组本身没有命令，也可以接收元数据。

存在含 `run`、`run_windows` 或 `file` 的定义时，该定义会提供命令。优先级高于最高优先级命令定义的任务块会按优先级顺序添加元数据，包括各自声明的 `depends`。优先级更低的定义不参与合并。如果所有定义都没有命令，则以优先级最高的依赖组作为基础。

对于来自[引入的 TOML 文件](#included-toml-files)的任务，内联命令会替换被引入的任务，而不带命令的内联任务块会添加元数据。内联任务块必须来自选择该引入项的配置，或来自优先级更高的配置。[替换文件任务命令](#file-task-config-precedence)时也有此要求。

## 远程 git 引入 {#remote-git-includes}

使用 `git::` URL 从 git 仓库引入目录或单个 TOML 任务文件：

::: code-group

```toml [ssh]
[task_config]
includes = [
  "git::ssh://git@github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
  "git::ssh://git@github.com/myorg/shared-tasks.git//tasks/release.toml?ref=v1.0.0",
]
```

```toml [https]
[task_config]
includes = [
  "git::https://github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
  "git::https://github.com/myorg/shared-tasks.git//tasks/release.toml?ref=v1.0.0",
]
```

:::

路径指向目录时，mise 会像加载本地任务目录一样，加载其中的可执行文件任务和 TOML 任务文件。路径指向 `.toml` 文件时，mise 只会按照 [TOML 任务文件格式](#included-toml-files)加载该文件。引入的任务与本地任务行为相同。

mise 会将仓库克隆到 `MISE_CACHE_DIR/remote-git-tasks-cache`，并在后续运行中重复使用该克隆。因此，像 `main` 这样的分支不会自动获取新提交，除非你使用 [`mise cache clear`](/cli/cache/clear.html) 清除缓存。运行 `mise run --no-cache`，或设置 [`task.remote_no_cache`](/configuration/settings.html#task.remote_no_cache)，即可在每次运行时重新克隆。固定使用某个标签或提交，可确保运行结果可复现。

### Git URL 语法 {#git-url-syntax}

`task_config.includes` 以及任务的 [`file`](/tasks/task-configuration.html#file) 中使用的 `git::` URL 格式如下：

```text
git::<protocol>://<repository>.git//<path>?ref=<ref>
```

- `protocol`：`ssh` 或 `https`（也支持 `http`）。使用 SSH 时，请在 URL 中写入用户，例如 `ssh://git@github.com/...`。
- `repository`：仓库的主机名和路径，不含 `.git` 后缀，例如 `github.com/myorg/shared-tasks`。也接受不带 `.git` 的 Azure DevOps `_git` URL，以及 `git@ssh.dev.azure.com:v3/<org>/<project>/<repo>` 格式。
- `path`：双斜线之后的仓库内文件或目录路径。必须是相对路径，且不能包含 `.` 或 `..` 路径段。
- `ref`（可选）：分支、标签或提交。如果省略，mise 会使用仓库的默认分支。

## 远程 OCI 引入 {#remote-oci-includes}

在镜像引用前添加 `oci::`，即可引入以 OCI 制品发布的任务目录：

```toml
[task_config]
includes = [
  "oci::ghcr.io/myorg/shared-tasks:1.0.0",
  "oci::registry.example.com/platform/tasks@sha256:0f1e2d3c...",
]
```

此引用的语法与 `docker pull` 相同：`<registry>/<repository>` 后接 `:<tag>` 或 `@sha256:<digest>`。请固定使用版本标签或摘要。`latest` 等标签可能会变更，mise 会重复使用同一引用的已缓存拉取结果。

使用 [`oras push`](https://oras.land/docs/commands/oras_push/) 发布目录。推送的每个文件都会成为任务目录中的文件；推送的目录则会以其名称解压：

```sh
oras push ghcr.io/myorg/shared-tasks:1.0.0 build.toml scripts/deploy
```

mise 会将制品解包到目录中，并像加载本地任务目录一样加载它：可执行文件任务和 `.toml` [任务文件](#included-toml-files)都会被发现。制品不包含文件模式，因此 mise 会将所有以 `#!` 行开头的文件设为可执行。

::: details mise 如何读取制品层

- 带有 `org.opencontainers.image.title` 注解的层会成为该相对路径上的文件。这是 `oras push` 和
  [`podman artifact add`](https://docs.podman.io/en/stable/markdown/podman-artifact-add.1.html)
  所生成的格式。
- 同时带有该注解和 `io.deis.oras.content.unpack=true` 的 tar 层（即通过 `oras push` 推送的目录）会解压到相应名称的目录中。
- 没有标题的 tar、tar+gzip 或 tar+zstd 层会解压到根目录，并应用 whiteout 标记，因此由 tar 层组成的制品（例如使用 `crane append` 创建的制品）也能正常工作。这不是通用容器镜像读取器：如果镜像层中包含符号链接或设备文件，mise 会拒绝读取。

:::

mise 会根据清单中的摘要校验每个 blob，并拒绝符号链接和其他特殊文件。凭据的来源与 [`mise oci push`](/cli/oci/push.html) 相同，包括 `docker login` 或 `podman login` 配置；找不到凭据时会匿名访问。mise 会通过普通 HTTP 访问环回地址上的注册表；如需使用其他普通 HTTP 注册表，请添加到 [`oci.insecure_registries`](/configuration/settings.html#oci.insecure_registries)。

拉取结果会按引用缓存在 `MISE_CACHE_DIR/remote-oci-tasks-cache` 中，因此标签指向新摘要时 mise 不会自动发现。要刷新缓存，可以改用新的标签或摘要、删除该目录，或设置 [`task.remote_no_cache`](/configuration/settings.html#task.remote_no_cache)，使每次运行都重新拉取。

## 从发现结果中排除路径 {#exclude-paths-from-discovery}

设置 `task_config.excludes`，即可跳过任务目录中的文件、目录或匹配 glob 的路径。相对路径以配置根目录为基准解析：

```toml
[task_config]
excludes = [
  ".mise/tasks/python/pyproject.toml",
  ".mise/tasks/generated",
  ".mise/tasks/**/fixtures/*.toml",
]
```

排除规则适用于默认任务目录和 `task_config.includes` 选中的路径，也包括直接列出的 TOML 任务文件。如果 `pyproject.toml` 或 `Cargo.toml` 等其他 TOML 文件必须放在任务目录中，请使用排除规则；否则 mise 会尝试将它们作为任务文件加载。

距离最近且设置了 `task_config.excludes` 的配置会取代继承的排除列表。将其设为空数组即可清除通过 `task_config.cascade = true` 继承的排除项。[`task.disable_paths`](/configuration/settings.html#task.disable_paths) 设置也可以让 mise 不再搜索其中列出的路径。
