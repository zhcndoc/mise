# pipx 后端

pipx 是一个用于在隔离的虚拟环境中运行 Python CLI 的工具。这对于 Python CLI 是必要的，
因为它可以防止 CLI 之间，或 CLI 与 Python 项目之间的依赖冲突。简而言之，
这个后端让你可以将 Python CLI 添加到 mise 中。

需要明确的是，pipx 不是 pip，它通常也不用于管理 Python 依赖。
mise 是一个工具管理器，而不是像 pip、uv 或 poetry 那样的依赖管理器。不过，你可以使用 mise 来安装这些包管理器。
你会想使用 pipx 后端来安装像 "black" 这样的 CLI，而不是像 "NumPy" 或 "requests" 这样的库。

稍微有点令人困惑的是，如果安装了 uv，pipx 后端实际上会默认使用 [`uvx`](https://docs.astral.sh/uv/guides/tools/)（uv 版的 pipx 等价工具）。
这应该只会让安装速度更快，但请参见下文以了解如何禁用或配置，因为有时工具不能与 uvx 正常工作。

pipx 后端支持以下来源：

- PyPI
- Git
- GitHub
- Http

这部分代码位于 mise 仓库中的 [`./src/backend/pipx.rs`](https://github.com/jdx/mise/blob/main/src/backend/pipx.rs)。

## 依赖

这依赖于已安装 `uv`（推荐）或 `pipx`。

如果你已经安装了 `uv`，mise 会在底层使用 `uv tool install`，并且你不需要安装 `pipx` 就可以运行包含“pipx:”的命令。

mise 会在安装期间将 [`minimum_release_age`](/configuration/settings.html#minimum_release_age) 传递给传递性的 Python 依赖解析。uv 的安装路径使用 uv 的
`--exclude-newer` 标志，并且要求 `uv >= 0.2.22`。`pipx` 回退方案会传递 pip 的
`--uploaded-prior-to` 标志。

如果你因为其他原因需要 `pipx`，可以通过 mise 或不通过 mise 来安装它。以下是在 mise 中安装 `pipx` 的方法：

```sh
mise use -g python
pip install --user pipx
```

[其他安装说明](https://pipx.pypa.io/latest/installation/)

## 用法

以下命令会安装 [black](https://github.com/psf/black) 的最新版本
并将其设置为 PATH 上的当前生效版本：

```sh
$ mise use -g pipx:psf/black
$ black --version
black, 24.3.0
```

该版本将以如下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"pipx:psf/black" = "latest"
```

## Python 升级

如果 pipx 包使用的 python 版本发生变化（由 mise 或系统 python 引起），你可能需要
重新安装该包。可以使用以下命令完成：

```sh
mise install -f pipx:psf/black
```

或者你也可以重新安装所有 pipx 包：

```sh
mise install -f "pipx:*"
```

在使用 `mise up python` 时，mise _应该_ 会自动执行此操作。

### 支持的 Pipx 语法

| 描述                                  | 用法                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| PyPI 简写，最新版本                   | `pipx:black`                                           |
| PyPI 简写，指定版本                   | `pipx:black@24.3.0`                                    |
| GitHub 简写，最新版本                 | `pipx:psf/black`                                       |
| GitHub 简写，指定版本                 | `pipx:psf/black@24.3.0`                                |
| Git 语法，最新版本                    | `pipx:git+https://github.com/psf/black.git`            |
| Git 语法，指定分支                    | `pipx:git+https://github.com/psf/black.git@main`       |
| 带 zip 文件的 Https                   | `pipx:https://github.com/psf/black/archive/18.9b0.zip` |

其他语法可能可用，但不受支持且未经测试。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 设置这些，或者通过设置列出的环境变量。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="pipx" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `pipx` 后端——这些内容应放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `uv tool install` 或 `pipx install` 设置环境变量。mise 在应用 `install_env` 后，仍会设置工具目录、二进制目录以及已配置的 Python 包索引变量。

```toml
[tools]
"pipx:black" = { version = "latest", install_env = { PIP_TRUSTED_HOST = "pypi.org" } }
```

### `extras`

安装额外组件。

```toml
[tools]
"pipx:harlequin" = { version = "latest", extras = "postgres,s3" }
```

### `pipx_args`

安装包时传递给 `pipx` 的附加参数。

```toml
[tools]
"pipx:black" = { version = "latest", pipx_args = "--preinstall" }
```

### `uvx`

设置为 `false` 可始终为此工具禁用 uv。

```toml
[tools]
"pipx:ansible" = { version = "latest", uvx = "false", pipx_args = "--include-deps" }
```

### `uvx_args`

安装包时传递给 `uvx` 的附加参数。

```toml
[tools]
"pipx:ansible-core" = { version = "latest", uvx_args = "--with ansible" }
```
