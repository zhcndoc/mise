---
description: "在隔离的虚拟环境中安装 Python 命令行应用"
---

# PyPI 后端

`pypi` 后端会在隔离的虚拟环境中安装 Python 命令行应用。每个工具都有自己的依赖项。对于 NumPy 和 requests 等应用程序库，请使用项目环境以及 pip 或 uv。

## 快速开始 {#dependencies}

安装 uv、Python 和来自 PyPI 的 CLI：

```sh
mise use python@3.14 uv pypi:black
mise exec -- black --version
```

### 项目配置 {#usage}

这会将以下内容添加到 `mise.toml`：

```toml
[tools]
python = "3.14"
uv = "latest"
"pypi:black" = "latest"
```

向 `mise use` 添加 `-g` 可全局安装工具。

mise 使用 uv 安装工具。启用[依赖锁定](#dependency-locking)后，它会运行 `uv sync --frozen`；仅版本安装使用 `uv tool install`。如果 uv 不可用，仅版本安装会回退到 `pipx install`。请参阅[使用 pipx](#using-pipx) 以显式选择该安装程序。

## 软件包源 {#supported-pipx-syntax}

使用 `pypi:black` 表示 PyPI 分发包，使用 `pypi:psf/black` 表示其 GitHub 源。它们的发行版本和安装要求可能不同。

| 源                      | 示例                                             |
| ----------------------- | ------------------------------------------------ |
| PyPI，最新版本          | `pypi:black`                                     |
| PyPI，特定版本          | `pypi:black@24.3.0`                              |
| GitHub，默认分支        | `pypi:psf/black`                                 |
| GitHub，特定发行版本    | `pypi:psf/black@24.3.0`                          |
| Git 仓库                | `pypi:git+https://github.com/psf/black.git`      |
| Git 分支                | `pypi:git+https://github.com/psf/black.git@main` |

对于 GitHub 源，`latest` 会从未固定的默认分支安装；它不会选择最新发布的版本。使用显式版本来选择发行版本。对于其他 Git URL，`latest` 会将默认分支 HEAD 解析为具体提交。显式版本请求也支持远程标签。

不支持直接使用 HTTPS 归档 URL。其他源语法可能有效，但不受支持且未经测试。

## 依赖锁定

使用 **uv 0.12.10 或更高版本**时，新建的 `mise.lock` 文件会记录完整的 Python 依赖关系图，包括 wheel 哈希和 Python／平台标记。锁定安装会复用该关系图，而不会再次解析依赖。

创建锁文件，或升级现有的仅版本锁文件，然后安装：

```sh
mise lock --upgrade
mise install --locked
```

提交 `mise.lock` 以及其[依赖侧载目录](../mise-lock.md#native-dependency-sidecars)，该目录包含原生的 `pyproject.toml` 和 `uv.lock` 文件。现有锁文件会继续使用仅版本行为，直到显式升级。

### 更新依赖

普通的 `mise lock` 会复用已记录的关系图。即使工具自身的版本没有变化，也可以刷新工具的传递依赖：

```sh
mise lock --bump pypi:black
```

也可以使用 uv 检查或编辑侧载。对于默认侧载布局中锁定为 Black 24.10.0 的工具：

```sh
uv tree --project .mise/locks/pypi-black/24.10.0
uv lock --project .mise/locks/pypi-black/24.10.0 --upgrade-package click
mise lock
```

编辑侧载后运行 `mise lock`，以便在使用 `mise install --locked` 前接受其更新后的摘要。

### 要求和限制

- **依赖关系图仅支持 Wheels：** 每个依赖项都必须为目标 Python 版本和平台提供已发布的 wheel。显式的 `mise lock` 和锁定安装不会构建源分发包。普通的 `mise install` 在无法生成仅 wheel 的关系图时，会回退到仅版本的 uv 安装。
- **使用 uv 的 PyPI 软件包：** Git 源和独立的 pipx 安装使用仅版本锁定。pipx 无法重放 uv 依赖关系图。
- **依赖关系图不支持自由格式的安装程序参数：** `uvx_args` 和 `pipx_args` 在普通安装期间使用仅版本安装。显式依赖锁定会拒绝它们，因为 mise 无法安全地将任意安装程序参数转换为可复现的关系图。需要依赖锁定时，请直接配置 [Python](#choosing-python) 和[注册表 URL](#registry-url)。
- **需要已安装的 Python：** 生成锁文件需要 uv 能够发现一个解释器，但该解释器不必与工具配置的 Python 版本匹配。关系图安装使用所选的 mise Python，不会下载替代版本。
- **需要完整的锁文件：** 如果缺少依赖关系图，修订版 2 的锁定 uv 安装会失败。运行 `mise lock` 生成它。

该关系图涵盖软件包支持的 Python 范围，从 Python 3.8 开始，并保留所有已发布的 wheel 目标以实现可移植性。这可能会使侧载变得很大。冻结安装会复用 uv 的构件缓存。

不同的依赖关系图和配置的 Python 解释器会产生独立的安装；`mise ls` 仍会显示软件包版本。对于系统 Python，mise 会在安装期间记录解释器的实现、主／次版本、ABI 和平台，以便后续命令即使在该解释器不再位于 PATH 中时也能找到环境。

### 私有索引和发行版本年龄

仅 Simple 索引必须在所选发行版本的 wheel 链接中提供一致的 `data-requires-python` 元数据。注册表凭据应放在安装程序环境或凭据提供程序中。包含凭据或查询字符串的 URL 无法记录在锁文件中。

[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 会在解析关系图时过滤传递依赖，而不是在重放关系图时过滤。对于仅版本安装，mise 会传递 uv 的 `--exclude-newer` 标志（需要 uv 0.2.22 或更高版本），或通过 pipx 传递 pip 的 `--uploaded-prior-to` 标志。

## 选择 Python

对于关系图锁定的工具，通过 mise 配置解释器：

```toml
[tools]
python = "3.14"
uv = "0.12.10"
"pypi:black" = "latest"
```

对于传统的仅版本安装，所选安装程序会选择解释器；`uvx_args` 和 `pipx_args` 可以传递安装程序专用的 Python 选项。

## Python 升级

如果 CLI 在更改 Python 后停止工作，请在目标 Python 版本下重新安装。这样会重新创建工具环境及其依赖：

```sh
mise install --force pypi:black
mise exec -- black --version
```

重新安装前请检查当前生效的 Python 版本。现有的 virtualenv 和原生扩展在其解释器被移除或更改后不一定仍可用。

## 使用 pipx

要使用 pipx 安装程序，请安装 Python 和 pipx，然后为该工具禁用 uv：

```sh
mise use python@3.14 pipx
```

```toml
[tools]
"pypi:ansible" = { version = "latest", uvx = false, expose = [], pipx_args = "--include-deps" }
```

这会使用仅版本锁定。现有的 uv 依赖关系图无法使用 pipx 重放。

### 与 `pipx:` 的兼容性

`pipx:` 后端名称仍受支持。现有配置无需更改。不过，`pypi:black` 和 `pipx:black` 是不同的工具标识：切换前缀会创建独立的安装和锁条目。mise 会在输出和锁文件中保留显式的 `pipx:` 名称。

传统选项名称 `uvx` 和 `uvx_args` 控制 uv 安装；它们不表示 mise 会运行 `uvx` 命令。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 设置这些选项，或设置所列出的环境变量。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="pypi" :level="3" />

## 工具选项

以下[工具选项](/dev-tools/#tool-options)可用于 `pypi` 后端——它们位于 `mise.toml` 的 `[tools]` 中。

### `registry_url` {#registry-url}

设置用于解析此工具版本的注册表 URL。包含一个 `{}` 占位符表示软件包名称。这会覆盖此工具的 `pypi.registry_url` 设置。

```toml
[tools]
"pypi:my-tool" = { version = "latest", registry_url = "https://packages.example.com/pypi/{}/json" }
```

依赖锁定还会从此 URL 派生安装索引。对于仅版本安装，请通过 `uvx_args` 或 `pipx_args` 单独配置安装索引。例如，使用 pipx 安装程序时：

```toml
[tools]
"pypi:my-tool" = { version = "latest", uvx = false, registry_url = "https://packages.example.com/pypi/{}/json", pipx_args = "--pip-args='--index-url https://packages.example.com/pypi/simple'" }
```

### `install_env`

为安装程序设置环境变量。应用 `install_env` 后，mise 仍会设置工具目录、bin 目录以及已配置的 Python 软件包索引变量。例如，对于 uv 安装程序：

```toml
[tools]
"pypi:black" = { version = "latest", install_env = { UV_COMPILE_BYTECODE = "1" } }
```

### `extras`

安装可选依赖（Python 软件包 extras）。

```toml
[tools]
"pypi:harlequin" = { version = "latest", extras = "postgres,s3" }
# 等效的数组形式：
# "pypi:harlequin" = { version = "latest", extras = ["postgres", "s3"] }
# extras 也适用于 Git 源：
# "pypi:psf/black" = { version = "latest", extras = ["jupyter"] }
```

内联传递 extras 时，请使用 mise 的 `key=value` 工具选项语法：

```bash
mise use 'pypi:psf/black[extras=jupyter]@latest'
```

对于名称不同于 Python 分发包名称的 Git 仓库，请设置 `package_name`，以便 mise 构建用于选择 extras 的需求：

```toml
[tools]
"pypi:owner/repository" = { version = "latest", package_name = "distribution", extras = ["feature"] }
```

### `pipx_args`

`pipx install` 的其他参数。这些参数仅适用于使用 pipx 的仅版本安装，并且不支持依赖关系图。

```toml
[tools]
"pypi:ansible" = { version = "latest", uvx = false, expose = [], pipx_args = "--include-deps" }
```

### `with`

在工具环境中安装其他 Python 需求。此选项需要 uv，并参与依赖锁定。

```toml
[tools]
"pypi:azure-cli" = { version = "latest", with = ["pip"] }
```

### `expose`

安装其他 Python 需求，并公开其可执行入口点。此选项需要 uv 0.8.5 或更高版本，并参与依赖锁定。

```toml
[tools]
"pypi:ansible" = { version = "latest", expose = ["ansible-core"] }
```

### `dependency_prereleases`

设置 uv 用于依赖解析的预发布版本策略。支持的值包括 `disallow`、`allow`、`if-necessary` 和 `explicit`。此选项需要 uv，并且在生成依赖关系图和仅版本安装期间都会应用。

```toml
[tools]
"pypi:azure-cli" = { version = "latest", dependency_prereleases = "allow" }
```

### `uvx`

设置为 `false` 以使用 pipx 而不是 uv 安装此工具。这也会禁用依赖关系图锁定，并要求安装 pipx。

```toml
[tools]
"pypi:ansible" = { version = "latest", uvx = false, expose = [] }
```

空的 `expose` 列表会清除 Ansible 的 uv 支持的注册表默认值。在覆盖注册表工具以使用 pipx 时，请以相同方式清除其他语义默认值。

### `uvx_args`

使用 `uv tool install` 进行仅版本安装时的其他参数。这些参数不支持依赖关系图；`pipx_args` 仅适用于 pipx。

```toml
[tools]
"pypi:ansible-core" = { version = "latest", uvx_args = "--resolution lowest" }
```

当 [`with`](#with)、[`expose`](#expose) 和 [`dependency_prereleases`](#dependency_prereleases) 选项能够满足所需行为时，优先使用这些语义选项。与任意参数不同，这些选项支持依赖关系图。

实现：[`src/backend/pipx.rs`](https://github.com/jdx/mise/blob/main/src/backend/pipx.rs)。
