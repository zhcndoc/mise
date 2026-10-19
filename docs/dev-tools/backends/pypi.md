---
description: "从 PyPI 或 Git 安装 Python 命令行应用，每个应用都使用隔离环境。"
---

# PyPI 后端

`pypi` 后端会从 PyPI 或 Git 仓库安装 Python 命令行应用，每个应用都使用独立虚拟环境和依赖。
它通过 uv 安装；uv 不可用时则使用 pipx。应用所需的 NumPy、requests 等库应放在由 uv 或 pip
管理的项目环境中。

`pipx:` 是此后端的另一种名称：`pipx:black` 和 `pypi:black` 安装的是同一个软件包。参阅
[`pipx:` 兼容性](#compatibility-with-pipx)。

## 前置条件

<span id="dependencies"></span>

安装 uv 或 pipx，并同时安装 Python：pipx 运行时需要 Python；从[依赖关系图](#dependency-locking)
安装时也需要使用已安装的解释器，而不是由 uv 下载的解释器。如果配置中包含 `uv`、`pipx` 或
`python`，mise 会在 Python 工具之前安装它们。`with`、
[`expose`](#expose) and [`dependency_prereleases`](/dev-tools/backends/pypi.html#dependency-prereleases)
选项需要 uv。

## 用法 {#usage}

<span id="quick-start"></span>
<span id="project-configuration"></span>

在当前项目中安装 uv、Python 和 Black：

```sh
mise use python@3.14 uv pypi:black
mise exec -- black --version
```

这会将以下内容写入 `mise.toml`。若要写入全局配置，请在 `mise use` 后添加 `-g`。

```toml
[tools]
python = "3.14"
uv = "latest"
"pypi:black" = "latest"
```

如果 `mise.lock` 记录了工具的完整依赖关系图（参阅[依赖锁定](#dependency-locking)），mise 会
使用 `uv sync --frozen` 安装。否则锁文件只记录工具版本，即“仅锁定版本”安装；mise 会运行
`uv tool install`，uv 不可用时则运行 `pipx install`。若要自行选择 pipx，请参阅
[使用 pipx 代替 uv](#using-pipx)。

## 软件包源 {#supported-pipx-syntax}

PyPI 软件包使用 `pypi:black`；其 GitHub 仓库使用 `pypi:psf/black`。两种来源的发布版本和安装
要求可能不同。

| 源                      | 示例                                             |
| ----------------------- | ------------------------------------------------ |
| PyPI 最新版本           | `pypi:black`                                    |
| PyPI 特定版本           | `pypi:black@24.3.0`                             |
| GitHub 最新发行版       | `pypi:psf/black`                                |
| GitHub 特定发行版       | `pypi:psf/black@24.3.0`                         |
| Git 仓库                | `pypi:git+https://github.com/psf/black.git`     |
| Git 分支                | `pypi:git+https://github.com/psf/black.git@main` |
| Git 子目录              | `pypi:git+https://github.com/o/repo#subdirectory=cli` |

不支持其他形式，包括直接使用 HTTPS 压缩包 URL。

对于 GitHub 来源，`latest` 会选择最新的 GitHub 发行版；仅当仓库没有发行版时才会从默认分支
安装。对于其他 Git URL，`latest` 会将默认分支的 HEAD 解析为提交。也可以明确指定分支、标签或
提交。

### Monorepo 子目录 {#git-subdirectory}

若软件包位于 Git 仓库的子目录中，可添加与 pip 和 uv 相同的 `#subdirectory=` 片段。`.git`
后缀可省略，GitHub 简写形式也支持此片段：

~~~sh
mise use 'pypi:git+https://github.com/runpantheon/ltui#subdirectory=ltui@main'
mise use 'pypi:runpantheon/ltui#subdirectory=jtui@main'
~~~

请为参数加引号，避免 Shell 对 `#` 作特殊处理。该片段是工具名称的一部分，因此每个子目录都算作
独立工具，版本仍写在 `@` 后。其他片段键会原样传递，但 mise 会将工具名中的 `[...]` 解析为工具
选项；请使用 [`extras`](#extras) 选项，而不是 `#egg=pkg[extra]`。

版本信息取自整个仓库，因此即使该子目录在某个标签中尚不存在，`latest` 仍会选择最新发行版。
如果仓库的发行版本早于该子目录，请固定分支或提交。使用 [`extras`](#extras) 时，mise 会根据
子目录推测发行包名称；若名称不同，请设置 [`package_name`](/dev-tools/backends/pypi.html#package-name)。

使用 uv 0.12.10 或更高版本时，`mise lock` 会记录每个工具的完整依赖关系图，包括 wheel 哈希及
Python 和平台标记；`mise install --locked` 会直接重放该关系图，不再重新解析。请创建锁文件或
升级仅锁定版本的锁文件，然后安装：

```sh
mise lock --upgrade
mise install --locked
```

请将 `mise.lock` 与各工具的旁文件目录一并提交；目录中包含原生的 `pyproject.toml` 和
`uv.lock`。详见[依赖关系图](/dev-tools/mise-lock.html#dependency-graphs)。已有锁文件会继续使用
仅锁定版本的安装方式，直到你将其升级。

<a id="dependency-locking"></a>

### 更新依赖

普通的 `mise lock` 会复用已记录的依赖关系图。若工具本身的版本未变，但要更新其依赖：

```sh
mise lock --bump pypi:black
```

也可以使用 uv 检查或编辑旁文件。以下示例针对默认旁文件布局中锁定为 Black 24.10.0 的工具：

```sh
uv tree --project .mise/locks/pypi-black/24.10.0
uv lock --project .mise/locks/pypi-black/24.10.0 --upgrade-package click
mise lock
```

编辑旁文件后，请先运行 `mise lock` 接受其新摘要，再使用 `mise install --locked`。

### 要求和限制

依赖关系图要求目标 Python 版本和平台上的每个依赖项都有已发布的 wheel。`mise lock` 和锁定安装
不会构建源代码分发包；若无法生成只含 wheel 的依赖关系图，普通的 `mise install` 会退回到仅锁定
版本的 uv 安装。

Git 来源和 pipx 安装始终只锁定版本；pipx 也无法重放 uv 生成的依赖关系图。`uvx_args` 和
`pipx_args` 无法写入锁文件：普通的 `mise install` 会退回到仅锁定版本的方式，而 `mise lock` 会
拒绝这些参数。请改用与工具一同锁定的 [`with`](#with)、[`expose`](#expose) 和
[`dependency_prereleases`](/dev-tools/backends/pypi.html#dependency-prereleases)，并直接配置
[Python](#choosing-python) 和[注册表 URL](#registry-url)。

`mise lock` 可以根据软件包元数据解析依赖关系图，无需先安装所选解释器。根据依赖关系图安装时会使用所选的 mise Python，不会另行下载 Python。如果锁文件格式为 2 或更高版本，但缺少该工具的依赖关系图，锁定安装会失败；请运行 `mise lock` 创建依赖关系图。

依赖关系图覆盖所有已锁定要求支持的 Python 版本范围（从 Python 3.8 起），并保留每个已发布的
wheel 平台，因此旁文件可能较大。锁定安装会复用 uv 的制品缓存。不同的依赖关系图和 Python
解释器会使用独立安装目录；`mise ls` 仍显示软件包版本。

## 私有索引

<span id="private-indexes-and-release-age"></span>

若要让所有工具都使用另一个索引，请设置
[`pypi.registry_url`](/dev-tools/backends/pypi.html#pypi.registry_url)：mise 会从该索引列出版本，并在安装时
将其简单索引传给 uv 和 pip。单个工具的 [`registry_url`](#registry-url) 选项会更改该工具的版本列表
和依赖锁定；仅锁定版本的安装还需在 `uvx_args` 或 `pipx_args` 中指定索引。仅提供简单索引的服务
必须在所选发行版的 wheel 链接中提供 `data-requires-python` 元数据。请将注册表凭据放在安装器的
环境或凭据提供程序中：包含凭据或查询字符串的 URL 无法写入锁文件。

## 最低发行时长

mise 解析依赖关系图时， [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 会筛选该工具的依赖项；
重放已有依赖关系图时则不会筛选。对于仅锁定版本的安装，mise 会向 uv 传递 `--exclude-newer`
（需 uv 0.2.22 或更新版本），或通过 pipx 向 pip 传递 `--uploaded-prior-to`。

## 选择 Python

在 mise 中配置解释器：

```toml
[tools]
python = "3.14"
uv = "0.12.10"
"pypi:black" = "latest"
```

依赖图锁定安装会使用 mise 配置的 Python；若 mise 未管理 Python，则使用 `PATH` 中找到的第一个
版本。对于 uv 的仅锁定版本安装，如果 mise 管理了 Python，它会向 `uv tool install` 传递
`--python <mise python>`，避免工具环境依赖 uv 自行下载的 Python；如需选择其他版本，可在
[`uvx_args`](/dev-tools/backends/pypi.html#uvx-args) 中传入自己的 `--python`。pipx 使用自身的默认解释器；
若要指定版本，请在 [`pipx_args`](/dev-tools/backends/pypi.html#pipx-args) 中传入 `--python`。

若要让某个工具使用独立于默认 Python 的版本，请将其 `python` 选项设为数字形式的 CPython 次版本号或精确补丁版本号。mise 会将该运行时解析并安装为工具的私有依赖，不会把 Python 添加到 Shell 的活动工具中。所选运行时会作为普通的 `python` 条目记录在同一锁文件范围内，因此使用锁定安装前请先提交更新后的锁文件。这需要支持 PyPI 工具 `python` 选项的 mise 版本。

```toml
[tools]
"pypi:black" = { version = "latest", python = "3.12" }
"pypi:ruff" = { version = "latest", python = "3.12.12" }
```

此选择器同时适用于 uv 和 pipx 安装，也会将依赖关系图限定为所选运行时能够满足的 Python 版本范围。它不能与 `uvx_args` 或 `pipx_args` 中的 `--python` 或 `-p` 组合使用。

<a id="python-upgrades"></a>

## Python 升级

使用 [`mise upgrade`](/cli/upgrade.html) 升级 `python` 时，mise 会自动重新安装所有已安装的 PyPI 工具。
在 Unix 上，未使用依赖关系图安装的工具会通过 Python 次版本路径（例如 `.../python/3.14/bin/python`）
调用 mise 管理的 Python，因此升级补丁版本无需重新安装即可继续工作。使用依赖图锁定的安装，以及
通过其他方式进行的次版本升级，则需要手动重新安装：

```sh
mise install --force pypi:black
mise exec -- black --version
```

重新安装前请确认当前使用的 Python：解释器被移除或更改后，工具环境及其原生扩展将无法继续工作。

## 使用 pipx 代替 uv {#using-pipx}

若要使用 pipx 安装工具，请添加 Python 和 pipx，并为该工具关闭 uv：

```toml
[tools]
python = "3.14"
pipx = "latest"
"pypi:black" = { version = "latest", uvx = false }
```

若要对所有 Python 工具使用 pipx，请设置 [`pypi.uvx = false`](/dev-tools/backends/pypi.html#pypi.uvx)。pipx
安装只锁定版本；`with`、`expose` 和 `dependency_prereleases` 则需要 uv。如果注册表短名称设置了
其中一项（例如 `ansible` 会设置 `expose`），请将其设为空值以清除。显式标识符（如
`pypi:ansible`）不会继承注册表选项，因此这只适用于短名称：

```toml
[tools]
ansible = { version = "latest", uvx = false, expose = [], pipx_args = "--include-deps" }
```

<a id="compatibility-with-pipx"></a>

### 与 `pipx:` 的兼容性

`pipx:` 前缀仍然有效，已有配置无需更改。不过，对 mise 来说，`pypi:black` 和 `pipx:black` 是
两个不同的工具：切换前缀会单独安装一份副本，并新增独立的锁文件条目。mise 会在输出和锁文件中
保留显式指定的 `pipx:` 名称。

`uvx` 和 `uvx_args` 这两个选项名称用于控制通过 uv 进行的安装；它们并不表示 mise 会运行
`uvx` 命令。

## 工具选项

可在 `[tools]` 中的工具条目上设置这些选项，也可以像
`'pypi:psf/black[extras=jupyter]@latest'` 这样直接写在工具标识中。所有后端通用的选项请参阅
[工具选项](/dev-tools/#tool-options)。

| 选项                     | 安装器                    |
| ------------------------ | ------------------------- |
| `registry_url`           | uv 和 pipx                |
| `install_env`            | uv 和 pipx                |
| `extras`                 | uv 和 pipx                |
| `package_name`           | uv 和 pipx                |
| `with`                   | uv                        |
| `expose`                 | uv 0.8.5 或更新版本       |
| `dependency_prereleases` | uv                        |
| `python`                 | uv 和 pipx                |
| `uvx_args`               | uv，仅锁定版本的安装      |
| `uvx`                    | 设为 `false` 时选择 pipx  |
| `pipx_args`              | pipx                      |

### `registry_url` {#registry-url}

设置用于列出该工具版本的注册表 URL。请在软件包名称的位置加入 `{}` 占位符。此设置会覆盖该工具的
[`pypi.registry_url`](/dev-tools/backends/pypi.html#pypi.registry_url) 配置。

```toml
[tools]
"pypi:my-tool" = { version = "latest", registry_url = "https://packages.example.com/pypi/{}/json" }
```

依赖锁定也会根据此 URL 推导安装索引。对于仅锁定版本的安装，请在 `uvx_args` 或 `pipx_args` 中
单独设置安装索引。以下为 pipx 示例：

```toml
[tools."pypi:my-tool"]
version = "latest"
uvx = false
registry_url = "https://packages.example.com/pypi/{}/json"
pipx_args = "--pip-args='--index-url https://packages.example.com/pypi/simple'"
```

### `install_env`

为安装器设置环境变量。应用 `install_env` 后，mise 仍会设置工具目录、可执行文件目录以及已配置的
软件包索引变量。以下为 uv 示例：

```toml
[tools]
"pypi:black" = { version = "latest", install_env = { UV_COMPILE_BYTECODE = "1" } }
```

### `extras`

安装可选依赖（Python 软件包 extras），值可以是逗号分隔的字符串或数组。Git 来源也支持 extras：

```toml
[tools]
"pypi:harlequin" = { version = "latest", extras = ["postgres", "s3"] }
"pypi:psf/black" = { version = "latest", extras = "jupyter" }
```

直接写在工具标识中时，请使用 mise 的 `key=value` 选项语法：

```sh
mise use 'pypi:psf/black[extras=jupyter]@latest'
```

### `package_name`

如果 Git 仓库名称与 Python 发行包名称不同，请设置此项。mise 需要该名称，才能为 Git 来源构建
选择 `extras` 的依赖声明：

```toml
[tools]
"pypi:owner/repository" = { version = "latest", package_name = "distribution", extras = ["feature"] }
```

### `with`

将其他 Python 依赖安装到工具的环境中。此选项需要 uv，并会与工具一同锁定。

```toml
[tools]
"pypi:azure-cli" = { version = "latest", with = ["pip"] }
```

将依赖固定到精确版本，会把锁定的 Python 版本范围缩小为该发行版支持的范围：依赖自身的
`requires-python` 会提高范围下限，因此工具可能需要比其自身声明更新的解释器。如果仅在某些
版本中需要此依赖，可使用解释器标记限制固定版本，例如
`"legacy==1.0.0; python_version < '3.12'"`，以保留较宽的版本范围。mise 不会在版本范围计算中
纳入这类固定依赖。

### `expose`

安装其他 Python 依赖，并将其可执行文件也加入 `PATH`。此选项需要 uv 0.8.5 或更高版本，且会与
工具一同锁定。

```toml
[tools]
"pypi:ansible" = { version = "latest", expose = ["ansible-core"] }
```

### `dependency_prereleases`

设置 uv 对依赖项预发布版本的策略：`disallow`、`allow`、`if-necessary` 或 `explicit`。此选项需要
uv，在锁定依赖关系图和仅锁定版本的安装中都会生效。

```toml
[tools]
"pypi:azure-cli" = { version = "latest", dependency_prereleases = "allow" }
```

### `uvx_args`

仅锁定版本安装时，传给 `uv tool install` 的附加参数。它们不能与依赖关系图同时使用；如果满足
需求，请优先使用 [`with`](#with)、[`expose`](#expose) 和
[`dependency_prereleases`](/dev-tools/backends/pypi.html#dependency-prereleases)。

```toml
[tools]
"pypi:ansible-core" = { version = "latest", uvx_args = "--resolution lowest" }
```

### `uvx`

设为 `false` 后会改用 pipx 而不是 uv 安装该工具，同时关闭依赖关系图锁定；此时必须安装 pipx。参阅
[使用 pipx 代替 uv](#using-pipx)。

### `pipx_args`

传给 `pipx install` 的附加参数。它们仅适用于 pipx 安装，且不能与依赖关系图同时使用。

```toml
[tools]
ansible = { version = "latest", uvx = false, expose = [], pipx_args = "--include-deps" }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="pypi" :level="3" />

## 故障排除

| 提示                                                                     | 处理方法                                                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `<tool> has no uv dependency graph; run mise lock`                       | 锁文件中没有该工具的依赖关系图。运行 `mise lock`，然后重新安装。                           |
| `semantic options (with, expose, and dependency_prereleases) require uv` | 将 `uv` 加入 `[tools]`，并确认没有设置 `uvx = false` 或 `pypi.uvx = false`。               |
| `pipx is required to install <tool> but was not found`                   | 将 `pipx` 加入 `[tools]`；若工具未设置 `uvx = false`，也可以添加 `uv`。                    |
| Python 更改后工具无法运行                                                 | 重新安装工具；参阅 [Python 升级](#python-upgrades)。                                       |

实现：[`src/backend/pipx.rs`](https://github.com/jdx/mise/blob/main/src/backend/pipx.rs)。
