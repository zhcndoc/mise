---
description: "与 pyenv 一样，mise 可以在同一系统上管理多个 Python 版本。"
---

# Python

与 `pyenv` 一样，`mise` 可以在同一系统上管理多个 Python 版本。它还可以为项目自动创建虚拟环境，并与 `uv` 集成。

## 用法

为当前项目选择 Python 并验证解释器：

```sh
mise use python@3.14
mise exec -- python --version
```

使用 `mise use -g python@3.14` 设置个人默认版本。安装 Python 会提供运行时；请使用项目虚拟环境来管理依赖。

你也可以同时使用多个 python 版本：

```sh
mise use python@3.13 python@3.14
mise exec -- python --version     # the first configured version, 3.13.x
mise exec -- python3.14 --version # the versioned executable, 3.14.x
```

你也可以安装特定的 python 变体。要获取某个变体的最新版本，请单独使用变体前缀：

```sh
mise use python@anaconda         # latest version of anaconda
```

有关常见任务和示例，请参阅 [Python Cookbook](/mise-cookbook/python.html)。

这些说明使用 mise 内置的 python 支持。已安装的同名外部插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详情，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/python.rs)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `python` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 python-build、默认包安装以及由核心 `python` 后端运行的安装时验证命令设置环境变量：

```toml
[tools]
python = { version = "latest", install_env = { CONFIGURE_OPTS = "--enable-optimizations" } }
```

### `patch_sysconfig`

在 Unix 上安装预编译的 Python 二进制文件时，mise 默认会修补 Python 的 `sysconfig` 数据，以便来自 `python-build-standalone` 的构建时路径指向最终的 mise 安装路径。如果这种修补对某个特定的 Python 构建造成安装问题，可以使用 `patch_sysconfig = false` 将其禁用：

```toml
[tools]
python = { version = "3.14", patch_sysconfig = false }
```

禁用此修补可能会使已安装的 Python 的 `sysconfig` 数据中保留过时的构建时路径，因此除非你需要将其作为安装解决方案，否则应优先使用默认设置。

## `.python-version` 支持

启用发现功能后即可支持 `.python-version`/`.python-versions` 文件：

```sh
mise settings add idiomatic_version_file_enable_tools python
```

保持一个权威的项目版本来源。`mise.toml` 中冲突的 Python 声明优先于惯用文件。请参阅[惯用版本文件](/configuration.html#idiomatic-version-files)。

## 自动虚拟环境激活

mise 有两种方式来管理 Python 虚拟环境：

| 机制                  | 最适合                         | 配置位置          |
| --------------------- | ---------------------------- | -------------------- |
| `python.uv_venv_auto` | uv 项目（带有 `uv.lock`）      | `[settings]` 部分   |
| `_.python.venv`       | 不使用 uv 的项目              | `[env]` 部分        |

**`python.uv_venv_auto`** 会检测并加载由 `uv` 管理的虚拟环境（默认为 `.venv`，也可以是由 `UV_PROJECT_ENVIRONMENT` 配置的路径）。使用 `"source"` 只激活现有虚拟环境，或使用 `"create|source"` 在虚拟环境缺失时创建它。mise 会向上查找 `uv.lock` 文件来定位 uv 项目，因此必须存在 `uv.lock`——没有该文件时此设置不会执行任何操作。完整示例请参阅 [mise + uv Cookbook](/mise-cookbook/python.html#mise-uv)。

**`_.python.venv`** 会创建/激活一个 venv，并将其添加到 PATH。它既适用于 `mise activate`，也适用于 `mise exec`。对于不使用 uv 的项目，请使用此项。

::: warning
这些是彼此独立的机制，代码路径不同。`_.python.venv` 中的 `uv_create_args` 和 `python_create_args` 等选项不会被 `python.uv_venv_auto` 使用。
:::

::: warning
旧版的 `virtualenv` 工具选项（`[tools]` 中的 `python = { version = "3.15", virtualenv = ".venv" }`）已弃用，并将在未来版本中移除。请改用下面的 `_.python.venv`。
:::

### `_.python.venv` 配置

在 `mise.toml` 的 `[env]` 部分使用 `_.python.venv`：

```toml [mise.toml]
[tools]
python = "3.14"

[env]
_.python.venv = { path = ".venv", create = true }
```

运行 `mise exec -- python -c 'import sys; print(sys.executable)'`，验证 Python 来自 `.venv`。将 `.venv/` 添加到 `.gitignore`。

为虚拟环境选择一种声明方式。类似 `_.python.venv = ".venv"` 的字符串会激活现有环境；对象形式接受以下选项：

| 选项                 | 用途                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `path`               | 相对于配置根目录的环境目录，或绝对路径/模板路径 |
| `create`             | 缺少环境时创建该环境                                             |
| `python`             | 创建环境时使用的 Python 版本                                          |
| `python_create_args` | 传递给 `python -m venv` 的参数，例如 `["--without-pip"]`                     |
| `uv_create_args`     | 传递给 `uv venv` 的参数，例如 `["--seed"]` 或 `["--system-site-packages"]`   |

例如，使用多行内联表向 Python 的 `venv` 模块传递参数：

```toml
[env]
_.python.venv = {
  path = ".venv",
  create = true,
  python_create_args = ["--without-pip"],
}
```

或者，在已安装 uv 且需要虚拟环境中包含 pip 时：

```toml
[env]
_.python.venv = {
  path = ".venv",
  create = true,
  uv_create_args = ["--seed"],
}
```

除非设置了 `create=true`，否则你需要手动使用 `python -m venv /path/to/venv` 创建 venv。
有关 `_.python.venv`，请参阅 [env-directives](https://mise.jdx.dev/environments/#env-directives)。

::: tip
虚拟环境激活需要使用 `mise activate` 或 `mise exec`。仅使用 [shims](/dev-tools/shims) 时，不会将 venv 的 `bin/` 目录加入 PATH，因此 `which python` 指向的会是 shim，而不是 venv 的解释器。
:::

### `python.uv_venv_auto` 设置

对于由 uv 管理的项目（包含 `uv.lock` 文件的项目），你可以使用 `python.uv_venv_auto` 设置，自动加载或创建由 uv 管理的虚拟环境。mise 会向上查找 `uv.lock` 来确定项目根目录；该锁定文件用于告诉 mise 项目使用 uv，因此必须存在。如果找不到 `uv.lock`，此设置不会执行任何操作——请先运行 `uv sync`（或 `uv lock`）生成该文件。完整示例请参阅 [mise + uv Cookbook](/mise-cookbook/python.html#mise-uv)。

```toml [mise.toml]
[settings]
python.uv_venv_auto = "source"        # activate existing .venv
# or
# python.uv_venv_auto = "create|source" # create .venv if missing, then activate
```

mise 在选择环境路径时会遵循 uv 的 `UV_PROJECT_ENVIRONMENT` 变量。相对路径会相对于 uv 项目根目录（包含 `uv.lock` 的目录）解析，而绝对路径则按原样使用。当该变量未设置或为空时，mise 使用 `.venv`。

```toml [mise.toml]
[env]
UV_PROJECT_ENVIRONMENT = "my.venv"

[settings]
python.uv_venv_auto = "create|source"
```

## mise & uv

如果你已经安装了 `uv`（例如，通过 `mise use -g uv@latest`），`mise` 将使用它通过 `_.python.venv` 创建虚拟环境。否则，它将使用内置的 `python -m venv` 命令。

`uv` 默认不包含 `pip`（而是提供 `uv pip`）。如果你需要 `pip` 包，请添加 `uv_create_args = ['--seed']` 选项。

:::warning
`python.uv_venv_auto` 的 `true` 值属于旧版用法，自 mise 2026.7 起已弃用；每当使用该值时，mise 都会发出警告，并计划在 mise 2027.7 中移除支持。请优先使用 `"source"` 或 `"create|source"`。
`python.uv_venv_auto` **设置**本身不会消失——只有 `true` 值会逐步淘汰。
:::

旧版 `true` 值与较新的字符串值之间有一个区别：`true` 还会导出 `UV_PYTHON`（仅设置为 Python 版本号）。这会告诉 `uv` 使用哪个 Python 版本，但不能保证 `uv` 使用由 `mise` 管理的特定解释器——`uv` 可能会回退到相同版本的系统 Python 或自行管理的 Python。

要确保 `uv` 使用由 `mise` 管理的 Python 解释器，请将 `UV_PYTHON` 设置为实际安装路径：

```toml
[tools]
python = "3.15"

[env]
UV_PYTHON = { value = "{{ tools.python.path }}", tools = true }
```

更多示例请参见 [mise + uv Cookbook](/mise-cookbook/python.html#mise-uv)。

## 默认 Python 包

::: warning 计划弃用
默认包文件已被弃用。它们目前仍然受支持，但 mise 将从 `2026.11.0` 开始发出警告，并将在 `2027.11.0` 移除支持。

对于 Python CLI，请使用 [pipx backend](/dev-tools/backends/pipx.html) 直接安装该工具：

```toml
[tools]
"pipx:black" = "latest"
```

对于确实应该安装到每个 Python 版本中的包，请使用工具级别的
`postinstall` 钩子：

```toml
[tools]
python = { version = "3.13", postinstall = "python -m pip install --upgrade ansible" }
```

:::

mise 可以在安装 Python 版本后，使用 pip 自动安装一组默认的 Python 包。要使用此旧版功能，请提供一个 `$HOME/.default-python-packages` 文件，并在其中每行列出一个包，例如：

```text
ansible
pipenv
```

你可以使用 `MISE_PYTHON_DEFAULT_PACKAGES_FILE` 变量为此文件指定其他位置。

## 预编译的 Python 二进制文件

默认情况下，mise 会下载 [预编译二进制文件](https://github.com/astral-sh/python-build-standalone)，而不是使用 python-build 编译 python。这会使安装 python 的速度大幅提升。

这也意味着你无需安装编译 python 所需的系统依赖。

不过，需要注意的是，这些预编译二进制文件也有一些[怪癖](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)。

要禁用这些二进制文件，请运行 `mise settings python.compile=1`。

这些二进制文件可能无法在较旧的 CPU 上运行。你可以通过将 `MISE_PYTHON_PRECOMPILED_ARCH` 设置为其他值，选择与较旧 CPU 更兼容的二进制文件；将其设置为 "x86_64" 可获得兼容性最高的二进制文件。有关此选项的更多信息，请参阅 <https://gregoryszorc.com/docs/python-build-standalone/main/running.html>。

## Windows

mise 在 Windows 上使用相同的预编译 python-build-standalone 二进制文件
（不支持在那里使用 python-build 进行编译）。mise 对上游的两个
[问题](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)
进行了平滑处理：

- 压缩包中只包含 `python.exe`，因此 mise 会在其旁边创建一个
  `python3.exe` 别名。
- 压缩包中不包含 `pip.exe`（pip 只能通过 `python -m pip` 使用），
  因此 mise 会在安装根目录中创建 `pip.cmd`/`pip3.cmd` 包装器，
  将调用委托给 `python -m pip`。由于它们采用委托方式，即使 pip
  自行升级后仍然可以正常工作。

安装目录中的 `Scripts` 目录会被加入 `PATH`，因此通过 `pip install`
安装的控制台脚本（例如 `black`）可以直接运行。如果你依赖 shim
而不是 `mise activate`，请在执行 `pip install` 后运行 `mise reshim`，
为新安装的可执行文件生成 shim。

## python-build

或者，mise 可以使用 [python-build](https://github.com/pyenv/pyenv/tree/master/plugins/python-build)（pyenv 的一部分）来编译 python 运行时。在使用 python-build 安装 python 之前，请确保已安装其[依赖项](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)。

## 安装无 GIL Python

Free-threaded python 可以通过运行以下命令，从预编译二进制文件安装：

```bash
MISE_PYTHON_COMPILE=0 MISE_PYTHON_PRECOMPILED_FLAVOR=freethreaded+pgo-full mise install python
```

或者使用 python-build 进行编译：

```bash
MISE_PYTHON_COMPILE=1 PYTHON_BUILD_FREE_THREADING=1 mise install python
```

## 使用 Homebrew 时排查错误

如果你使用 Homebrew 并看到与 OpenSSL 相关的错误，
请尝试使用以下命令安装 Python：

```sh
CFLAGS="-I$(brew --prefix openssl)/include" \
LDFLAGS="-L$(brew --prefix openssl)/lib" \
MISE_PYTHON_COMPILE=1 mise install python@latest
```

Homebrew 会安装自己的 OpenSSL 版本，这可能会与系统预期的版本冲突。
请将编译器标志限定在安装命令中，以免影响无关的构建。
如果失败来自 python-build，请检查其构建日志，并参考适用于你的 macOS 和 Python 版本的[上游构建环境指南](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)。预编译安装不会使用这些编译器标志；在有意测试源代码构建时，请设置 `MISE_PYTHON_COMPILE=1`。

## 设置

`python-build` 已经有一些[设置](https://github.com/pyenv/pyenv/tree/master/plugins/python-build)；此外，mise 中的 python 还有一些额外的配置变量。

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置环境变量来进行设置。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="python" :level="3" />
