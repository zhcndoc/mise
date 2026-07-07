# Python

像 `pyenv` 一样，`mise` 可以在同一系统上管理多个 Python 版本。Mise 还可以为你的项目自动创建虚拟环境，并与 `uv` 集成。

> 以下是使用 python mise 核心插件的说明。只要没有通过 `mise plugins install python [GIT_URL]` 手动
> 安装名为 "python" 的插件，就会使用核心插件。

此功能的代码位于 mise 仓库中
[`./src/plugins/core/python.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/python.rs)。

## 用法

以下命令会安装最新版本的 python-3.15.x，并将其设为全局
默认值：

```sh
mise use -g python@3.15
```

你也可以同时使用多个版本的 python：

```sh
$ mise use -g python@3.14 python@3.15
$ python -V
3.14.0
$ python3.15 -V
3.15.0
```

你还可以安装特定的 python 发行版本。要从某个发行版本获取最新版本，只需使用该
发行版本前缀。

```sh
mise use -g python@anaconda         # anaconda 的最新版本
```

有关常见任务和示例，请参阅 [Python Cookbook](/mise-cookbook/python.html)。

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

mise 支持 `.python-version`/`.python-versions` 文件。参见[惯用版本文件](/configuration.html#idiomatic-version-files)。

## 自动虚拟环境激活

mise 有两种方式来管理 Python 虚拟环境：

| 机制                  | 最适合                         | 配置位置          |
| --------------------- | ---------------------------- | -------------------- |
| `python.uv_venv_auto` | uv 项目（带有 `uv.lock`）      | `[settings]` 部分   |
| `_.python.venv`       | 不使用 uv 的项目              | `[env]` 部分        |

**`python.uv_venv_auto`** 会检测并加载由 `uv` 管理的 `.venv`。使用 `"source"` 仅激活已存在的 venv，或使用 `"create|source"` 在缺失时创建。完整示例请参见 [mise + uv Cookbook](/mise-cookbook/python.html#mise-uv)。

**`_.python.venv`** 会创建/激活一个 venv，并将其添加到 PATH。它既适用于 `mise activate`，也适用于 `mise exec`。对于不使用 uv 的项目，请使用此项。

::: warning
这些是彼此独立的机制，代码路径不同。`_.python.venv` 中的 `uv_create_args` 和 `python_create_args` 等选项不会被 `python.uv_venv_auto` 使用。
:::

### `_.python.venv` 配置

在 `mise.toml` 的 `[env]` 部分使用 `_.python.venv`：

```toml
[tools]
python = "3.15" # [可选] 将用于该虚拟环境

[env]
_.python.venv = ".venv" # 相对于此文件所在目录
_.python.venv = "/root/.venv" # 可以是绝对路径
_.python.venv = "{{env.HOME}}/.cache/venv/myproj" # 可以使用模板
_.python.venv = { path = ".venv", create = true } # 如果不存在则创建该虚拟环境
_.python.venv = { path = ".venv", create = true, python = "3.15" } # 使用指定的 python 版本
_.python.venv = {
  path = ".venv", create = true,
  python_create_args = ["--without-pip"], # 将参数传递给 python -m venv
}
_.python.venv = {
  path = ".venv", create = true,
  uv_create_args = ["--system-site-packages"], # 将参数传递给 uv venv
}
# 将种子包（pip、setuptools 和 wheel）安装到虚拟环境中。
_.python.venv = { path = ".venv", create = true, uv_create_args = ['--seed'] }
```

除非设置 `create=true`，否则需要手动使用 `python -m venv /path/to/venv` 创建该 venv。
有关 `_.python.venv`，请参见 [env-directives](https://mise.en.dev/environments/#env-directives)。

::: tip
虚拟环境激活需要使用 `mise activate` 或 `mise exec`。仅使用 [shims](/dev-tools/shims) 时，不会将 venv 的 `bin/` 目录加入 PATH，因此 `which python` 指向的会是 shim，而不是 venv 的解释器。
:::

### `python.uv_venv_auto` 设置

对于由 uv 管理的项目（即包含 `uv.lock` 文件的项目），你可以使用 `python.uv_venv_auto` 设置，自动加载或创建由 uv 管理的 `.venv`。完整示例请参见 [mise + uv Cookbook](/mise-cookbook/python.html#mise-uv)。

```toml [mise.toml]
[settings]
python.uv_venv_auto = "source"        # 激活已存在的 .venv
# 或
python.uv_venv_auto = "create|source" # 如果缺失则创建 .venv，然后激活
```

## mise & uv

如果你已经安装了 `uv`（例如，通过 `mise use -g uv@latest`），`mise` 将使用它通过 `_.python.venv` 创建虚拟环境。否则，它将使用内置的 `python -m venv` 命令。

请注意，`uv` 默认不包含 `pip`（因为 `uv` 提供的是 `uv pip`）。如果你需要 `pip` 包，请添加 `uv_create_args = ['--seed']` 选项。

:::warning
`python.uv_venv_auto` 的 `true` 值被视为旧版用法，并将在未来版本中弃用（计划在 mise 2026.7 中移除）。请改用 `"source"` 或 `"create|source"`。
注意：`python.uv_venv_auto` **设置**本身不会被移除——只有 `true` 这个值会逐步淘汰。
:::

旧版 `true` 值与较新的字符串值之间的一个区别是，`true` 还会导出 `UV_PYTHON`（仅设置为 Python 版本号）。这会告诉 `uv` 使用哪个 Python 版本，但不能保证 `uv` 使用的是由 `mise` 管理的特定解释器——`uv` 可能会回退到同版本的系统 Python 或自管理 Python。

如果要严格确保 `uv` 使用 `mise` 管理的 Python 解释器，请改为将 `UV_PYTHON` 设置为实际安装路径：

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

你可以通过设置 `MISE_PYTHON_DEFAULT_PACKAGES_FILE` 变量来指定该文件的非默认位置。

## 预编译的 Python 二进制文件

默认情况下，mise 会为 Python 下载[预编译二进制文件](https://github.com/astral-sh/python-build-standalone)，而不是使用 python-build 进行编译。这使得安装 Python 快得多。

除了速度更快之外，这也意味着你不必安装所有系统依赖项。

不过，需要注意的是，这些预编译二进制文件也有一些[怪癖](https://github.com/astral-sh/python-build-standalone/blob/main/docs/quirks.rst)。

如果你想禁用这些二进制文件，请设置 `mise settings python.compile=1`。

不过，这些二进制文件可能无法在较旧的 CPU 上运行；但你可以通过将 `MISE_PYTHON_PRECOMPILED_ARCH` 设置为不同的版本，选择与旧 CPU 更兼容的二进制文件。有关此选项的更多信息，请参见 <https://gregoryszorc.com/docs/python-build-standalone/main/running.html>。将其设置为 "x86_64" 可获得最兼容的二进制文件。

## python-build

可选地，mise
使用 [python-build](https://github.com/pyenv/pyenv/tree/master/plugins/python-build)（pyenv 的一部分）
来编译 Python 运行时，
你需要确保在使用
python-build 安装 Python 之前，
其[依赖项](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)已安装。

## 安装无 GIL Python

可以通过 python-build 按如下方式安装无 GIL Python：

```bash
MISE_PYTHON_COMPILE=0 MISE_PYTHON_PRECOMPILED_FLAVOR=freethreaded+pgo-full mise install python
```

或者使用 python-build 进行编译：

```bash
MISE_PYTHON_COMPILE=1 PYTHON_BUILD_FREE_THREADING=1 mise install python
```

## 使用 Homebrew 时排查错误

如果你平时使用 Homebrew，并且看到了与 OpenSSL 相关的错误，
最好的办法可能是使用以下命令来安装 Python：

```sh
CFLAGS="-I$(brew --prefix openssl)/include" \
LDFLAGS="-L$(brew --prefix openssl)/lib" \
mise install python@latest;
```

Homebrew 会安装它自己的 OpenSSL 版本，这可能会与系统期望的版本发生冲突。
你甚至可以把它添加到你的
`.profile`、
`.bashrc`、
`.zshrc`...
中，这样就不用每次都手动设置了

另外，如果你遇到 python-build 方面的问题，
在安装之前取消链接 pkg-config 可能会对你有帮助
([原因](https://github.com/pyenv/pyenv/issues/2823#issuecomment-1769081965))。

```sh
brew unlink pkg-config
mise install python@latest
brew link pkg-config
```

因此，整个脚本看起来会是这样：

```sh
brew unlink pkg-config
CFLAGS="-I$(brew --prefix openssl)/include" \
  LDFLAGS="-L$(brew --prefix openssl)/lib" \
  mise install python@latest
brew link pkg-config
```

## 设置

`python-build` 已经有
一些[设置项](https://github.com/pyenv/pyenv/tree/master/plugins/python-build)，此外 mise 中的 python 还有一些额外的配置变量。

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置环境变量来进行设置。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="python" :level="3" />
