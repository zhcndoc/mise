---
description: "通过 mise 安装 Python、为各项目选择版本，并自动创建或激活虚拟环境。"
---

# Python

mise 使用预编译的
[python-build-standalone](https://github.com/astral-sh/python-build-standalone) 构建，或通过 python-build
安装 Python，并为每个项目选择版本。它还可以创建并激活项目虚拟环境，无论项目是否使用 uv。

## 快速开始

为当前项目选择 Python 并检查解释器：

```sh
mise use python@3.14
mise exec -- python --version
```

`mise use` 会将 `python = "3.14"` 写入 `mise.toml`。个人默认版本可使用
`mise use -g python@3.14`。安装 Python 后即可使用解释器；项目依赖应安装到[虚拟环境](#automatic-virtualenv-activation)中。

项目配置示例（包括 uv 项目）请参阅 [Python 实用指南](/mise-cookbook/python.html)。

## 选择版本

| 请求                | 选择结果                                      |
| ------------------- | --------------------------------------------- |
| `python@3.14`       | 最新的 3.14.x 版本                            |
| `python@3.14.8`     | 指定版本                                      |
| `python@latest`     | 最新稳定版 CPython                            |
| `python@pypy3.11`   | 最新的 Python 3.11 对应 PyPy                  |
| `python@anaconda3`  | 最新的 Anaconda 发行版（`anaconda3-*`）       |
| `python@miniconda3` | 最新的 Miniconda 发行版（`miniconda3-*`）     |

除 CPython 外的实现使用 python-build 定义中的名称；运行 `mise ls-remote python` 可查看这些名称。预发布版
（例如 `3.15.0rc3`）会列出，但不会通过 `3.15` 这样的前缀或 `latest` 选中。

可以一次选择多个版本。第一个版本提供 `python` 命令，每个版本也都有自己的带版本号可执行文件：

```sh
mise use python@3.13 python@3.14
mise exec -- python --version     # the first configured version, 3.13.x
mise exec -- python3.14 --version # the versioned executable, 3.14.x
```

## 版本文件

mise 可以读取 `.python-version` 和 `.python-versions`。启用 Python 的版本文件支持：

```sh
mise settings add idiomatic_version_file_enable_tools python
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，使团队成员也获得相同设置。
`mise.toml` 中的 Python 版本优先于这些文件，因此请保留一个唯一来源。参阅[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

## 虚拟环境 {#automatic-virtualenv-activation}

mise 可以通过以下两种方式创建并激活项目虚拟环境：

| 机制                                  | 适用项目                           | 配置位置      |
| ------------------------------------- | ---------------------------------- | ------------- |
| [`_.python.venv`](#python-venv)       | 未使用 uv 的项目                   | `[env]`       |
| [`python.uv_venv_auto`](#uv-projects) | 带有 `uv.lock` 的 uv 项目          | `[settings]`  |

两种方式都会设置 `VIRTUAL_ENV`，并将虚拟环境的 `bin` 目录放在 `PATH` 最前面（Windows 上为 `Scripts`）。
这会在已激活 mise 的 Shell、[`mise exec`](/cli/exec.html) 和任务中生效。仅使用 [shims](/dev-tools/shims.html)
时，虚拟环境不会加入 `PATH`，`which python` 会指向 shim。

### `_.python.venv` {#python-venv}

在 `mise.toml` 的 `[env]` 配置段中添加 `_.python.venv`：

```toml [mise.toml]
[tools]
python = "3.14"

[env]
_.python.venv = { path = ".venv", create = true }
```

运行 `mise exec -- python -c 'import sys; print(sys.executable)'`，确认 Python 来自 `.venv`，然后将
`.venv/` 加入 `.gitignore`。

使用字符串（例如 `_.python.venv = ".venv"`）会激活现有环境；若环境不存在，则会发出警告并提示创建
环境的命令。表格形式接受以下选项：

| 选项                 | 用途                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| `path`               | 环境目录，可相对于配置根目录，也可使用绝对路径或模板路径                              |
| `create`             | 环境不存在时创建它                                                                    |
| `python`             | 用于创建环境的 Python 版本；默认为第一个已配置的 Python                               |
| `python_create_args` | 传给 `python -m venv` 的参数，例如 `["--without-pip"]`                                |
| `uv_create_args`     | 传给 `uv venv` 的参数，例如 `["--seed"]` 或 `["--system-site-packages"]`             |

如果已安装 uv（例如运行过 `mise use -g uv`），mise 会使用 uv 创建环境；否则使用 `python -m venv`。
设置 [`python.venv_stdlib`](/lang/python.html#python.venv_stdlib) 可始终使用标准库 `venv`。未在指令中单独指定参数时，mise 会使用
[`python.uv_venv_create_args`](/lang/python.html#python.uv_venv_create_args) 和
[`python.venv_create_args`](/lang/python.html#python.venv_create_args)。

uv 创建的虚拟环境中没有 `pip`（uv 提供 `uv pip` 作为替代）。若需要 `pip`，请为环境预装它：

```toml [mise.toml]
[env]
_.python.venv = {
  path = ".venv",
  create = true,
  uv_create_args = ["--seed"],
}
```

若要改为向 Python 的 `venv` 模块传递参数：

```toml [mise.toml]
[env]
_.python.venv = {
  path = ".venv",
  create = true,
  python_create_args = ["--without-pip"],
}
```

### uv 项目（`python.uv_venv_auto`）{#uv-projects}

对于由 uv 管理的项目，请设置 [`python.uv_venv_auto`](/lang/python.html#python.uv_venv_auto)，并由 uv 管理环境：

```toml [mise.toml]
[settings]
python.uv_venv_auto = "source"
```

设为 `"source"` 时，mise 会激活 uv 创建的虚拟环境。设为 `"create|source"` 时，如果环境不存在，mise
还会使用 mise 所选的 Python 通过 uv 创建环境。mise 会从当前目录向上查找最近的 `uv.lock`，以确定
项目位置。没有 `uv.lock` 时此设置不起作用，因此请先运行 `uv lock` 或 `uv sync`。设为 `"source"` 但
尚无虚拟环境时，mise 会警告并提示运行 `uv sync` 或 `uv venv`，或者启用 [`[deps.uv]`](/dev-tools/deps.html)。

环境默认为 `uv.lock` 同级的 `.venv`，也可以通过 uv 的 `UV_PROJECT_ENVIRONMENT` 变量指定。相对路径会
从 `uv.lock` 所在目录解析；绝对路径则按原样使用。

```toml [mise.toml]
[env]
UV_PROJECT_ENVIRONMENT = "my.venv"

[settings]
python.uv_venv_auto = "create|source"
```

此处不适用 `_.python.venv` 的 `uv_create_args` 和 `python_create_args` 选项。若要在 mise 创建此环境时
传入参数，请设置 `python.uv_venv_create_args`。

uv 仍可能选择自己下载的 Python，而不是 mise 安装的版本。若要让 `uv sync` 和 `uv run` 使用 mise 的
解释器，请将 `UV_PYTHON` 设为该解释器的路径：

```toml [mise.toml]
[tools]
python = "3.14"

[env]
UV_PYTHON = { value = "{{ tools.python.path }}", tools = true }
```

完整项目配置请参阅 [Python 实用指南中的 uv 示例](/mise-cookbook/python.html#mise-uv)。

### 已弃用的形式

`virtualenv` 工具选项（例如 `python = { version = "3.14", virtualenv = ".venv" }`）自 mise 2026.7.0
起会发出警告，并将在 2027.7.0 中移除。请改用 `_.python.venv`。

`python.uv_venv_auto = true` 自 mise 2026.7.0 起会发出警告，并将在 2027.7.0 中移除。请改用
`"source"` 或 `"create|source"`。除创建和激活环境外，旧值 `true` 还会导出仅包含 Python 版本号的
`UV_PYTHON`；请使用上方的 `UV_PYTHON` 示例，将 uv 指向 mise 的解释器。

## mise 如何安装 Python {#precompiled-python-binaries}

默认情况下，mise 会从 python-build-standalone 下载预编译的 CPython 构建，无需编译器或系统库，并验证其
GitHub 制品证明
([`python.github_attestations`](/lang/python.html#python.github_attestations))。这些构建与在本机编译的 Python 存在一些
[已知差异](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)。mise
不会自行设置 Python 环境变量；对应版本的 `bin` 目录会加入 `PATH`。

没有预编译构建的版本以及 PyPy、Anaconda 等实现，会通过 pyenv 的构建工具
[python-build](https://github.com/pyenv/pyenv/tree/master/plugins/python-build) 安装。若要使用 python-build
编译所有 CPython，请安装其[构建依赖](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)，并设置
[`python.compile`](/lang/python.html#python.compile)：

```sh
mise settings python.compile=true
```

将 `python.compile` 设为 `false` 可停用 python-build。此时 mise 只会列出预编译的 CPython 构建和 PyPy
发行版，并从 PyPy 自身的下载源安装 PyPy。python-build 会从环境或 `install_env` 中读取自己的变量，
例如 `PYTHON_CONFIGURE_OPTS`。

在 Alpine 和 NixOS 上，由于 [`all_compile`](/configuration/settings.html#all_compile) 默认值为 `true`，
mise 当前会默认从源码编译。此默认行为已弃用；mise 2027.8.0 起会改用预编译二进制文件。若现在就要
使用预编译二进制文件，请设置 `python.compile = false` 或 `all_compile = false`；在 NixOS 上还需先启用
[nix-ld](https://github.com/Mic92/nix-ld)。若要继续编译，请显式设置 `all_compile = true`。

mise 会从 `https://mise-versions.jdx.dev/data/python-precompiled-<arch>-<os>.gz` 下载可用的预编译 CPython 构建版本列表，例如 `python-precompiled-aarch64-apple-darwin.gz`。即使 [`use_versions_host`](/configuration/settings.html#use_versions_host) 为 `false`，mise 也会下载此列表。mise 在以下情况下需要该列表：

- 安装某个 CPython 版本，除非 `python.compile` 为 `true`（Windows 始终使用预编译构建），或锁文件已记录该版本在此平台上的构建 URL
- 在 `python.compile` 为 `false` 时列出版本；Windows 上始终需要
- 写入锁文件条目（例如 `mise lock`），无论 `python.compile` 设置为何值

安装和版本列表操作会按
[`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 设置的时长缓存列表。写入锁文件条目时，每次都会重新下载该列表，不使用缓存。

[`offline`](/configuration/settings.html#offline) 模式会阻止下载。

官方 mise 版本在 x86-64 Linux 上会下载基准版 `x86_64` 构建。若需针对较新 CPU 优化的构建，例如带
AVX2 的 CPU 使用 `x86_64_v3`，请设置 [`python.precompiled_arch`](/lang/python.html#python.precompiled_arch)。

### 自由线程版 Python

若要安装 python-build-standalone 提供的自由线程版构建，请选择其 flavor：

```toml [mise.toml]
[settings]
python.precompiled_flavor = "freethreaded-install_only_stripped"
```

```sh
mise install python
```

该安装中的 `python` 会运行自由线程解释器（`python3.Xt`）。此设置适用于该配置安装的所有 Python。该构建
与默认构建安装到同一个 `installs/python/<version>` 目录，因此如果此版本已安装，请运行
`mise install -f python` 重新安装。

若要改用 python-build 编译自由线程版 Python：

```sh
MISE_PYTHON_COMPILE=true PYTHON_BUILD_FREE_THREADING=1 mise install python
```

### Windows

mise 在 Windows 上安装相同的 python-build-standalone 预编译构建；该平台不支持使用 python-build 编译。
mise 会调整上游[已知差异](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)中的两项：

- 压缩包中只有 `python.exe`，因此 mise 会在旁边添加 `python3.exe` 别名。
- 压缩包中没有 `pip.exe`，因此 mise 会添加运行 `python -m pip` 的 `pip.cmd` 和 `pip3.cmd` 包装脚本。
  即使 pip 自行升级，这些脚本也能继续工作。

安装目录中的 `Scripts` 会加入 `PATH`，因此 `pip install` 安装的控制台脚本（如 `black`）可以直接运行。
如果使用 shims 而不是 `mise activate`，请在 `pip install` 后运行 `mise reshim`，为新可执行文件创建 shim。

## 从 pyenv 或 uv 迁移

[`mise sync python`](/cli/sync/python.html) 可让 mise 使用其他工具已安装的 Python，无需重新安装：

```sh
mise sync python --pyenv  # link versions from $PYENV_ROOT/versions
mise sync python --uv     # share installs both ways with uv
```

这两个命令都不会为项目选择版本。若要继续使用项目现有的版本文件，请按[版本文件](#version-files)中的
说明启用 `.python-version`。

## 故障排除

已安装的 `python` 插件优先于内置安装器。如果 mise 的行为与本文说明不同，请检查
[`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

### 在 macOS 上编译时遇到 OpenSSL 错误 {#troubleshooting-errors-with-homebrew}

如果源码构建找不到 OpenSSL，请仅为本次安装指定 Homebrew OpenSSL 的位置：

```sh
CFLAGS="-I$(brew --prefix openssl)/include" \
LDFLAGS="-L$(brew --prefix openssl)/lib" \
MISE_PYTHON_COMPILE=true mise install python@3.14
```

将标志仅放在此命令上，可避免影响无关构建。如果构建仍然失败，请查看 python-build 构建日志和
[构建环境指南](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)。预编译构建不受此问题影响。

### 工具无法兼容预编译构建

某些工具会受到预编译构建的[已知差异](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)影响。
请设置 `python.compile = true`，改用 python-build 编译的 Python。

## 工具选项

### `patch_sysconfig`

在 Unix 上安装预编译 Python 时，mise 会重写 Python `sysconfig` 数据中的构建路径，使其指向安装目录。
如果此修补导致特定构建无法安装，可将其关闭：

```toml [mise.toml]
[tools]
python = { version = "3.14", patch_sysconfig = false }
```

关闭修补后，已安装 Python 的 `sysconfig` 数据中会保留过时的构建路径，因此仅应将此设置用作临时解决办法。

### 通用选项

`install_env` 会传给 python-build、`python --version` 检查、默认软件包安装和 `postinstall` 命令。例如，
当 mise 从源码构建 Python 时（`python.compile = true`，或该版本没有预编译构建），可通过以下配置启用
优化编译：

```toml [mise.toml]
[tools]
python = { version = "3.14", install_env = { PYTHON_CONFIGURE_OPTS = "--enable-optimizations" } }
```

其他通用选项请参阅[工具选项](/dev-tools/#tool-options)。

## 默认软件包文件 <Badge type="danger" text="已弃用" /> {#default-python-packages}

mise 会将 `~/.default-python-packages` 中列出的软件包（每行一个）通过 `pip install` 安装到每个新
Python 版本中；可通过 [`python.default_packages_file`](/lang/python.html#python.default_packages_file) 设置该文件。
mise 自 2026.11.0 起会对此文件发出警告，并将在 2027.11.0 起停止读取。建议改用
[PyPI 后端](/dev-tools/backends/pypi.html)安装 Python CLI，例如设置 `"pypi:black" = "latest"`；
也可以使用 [`postinstall`](/dev-tools/#tool-postinstall-commands) 命令安装每个 Python 版本都需要的软件包。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="python" :level="3" />
