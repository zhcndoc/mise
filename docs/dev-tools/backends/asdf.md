---
description: "在 Linux 和 macOS 上通过旧版 asdf 插件安装工具；此类插件是由 Shell 脚本组成的 Git 仓库。"
---

# asdf 后端（旧版）

`asdf` 后端通过 [asdf](https://asdf-vm.com/) 插件安装工具。插件是包含 shell 脚本的 Git 仓库，这些脚本用于列出工具版本并执行安装。只有现有插件提供其他后端无法实现的功能时才使用此后端；开发新插件时，请改为编写[工具插件](/tool-plugin-development.html)。

::: warning 旧版
asdf 插件本质上是 shell 脚本；mise 每次列出版本、安装或激活工具时，都会以你的权限运行这些脚本。使用前请先检查插件，并优先选择直接安装发布者发行版的[后端](/dev-tools/backends/#which-backend-to-use)。
:::

## 要求

asdf 插件需要 Bash 以及脚本调用的 Unix 工具，通常包括 `curl`、`git` 和 `tar`。mise 在 Windows 上不会使用 asdf 后端：会跳过 `asdf:` 工具，并让注册表简称继续尝试下一个后端。在 Windows 上请使用原生后端或 [vfox 插件](/dev-tools/backends/vfox.html)。

## 用法

通过对应的 asdf 插件安装 AWS CLI 并运行：

```sh
mise use asdf:MetricMike/asdf-awscli@2
mise exec -- aws --version
```

这会在 `mise.toml` 中写入以下内容：

```toml
[tools]
"asdf:MetricMike/asdf-awscli" = "2"
```

`asdf:` 后面可以是 GitHub `owner/repo`，也可以是完整 Git URL，例如 `asdf:https://gitlab.com/wt0f/asdf-ripgrep`。mise 首次需要插件时会克隆它。运行 `mise registry <tool>` 可查看某个注册表简称是否仍会回退到 asdf 插件。

若要通过自定义简称使用插件，请使用 [`mise plugins install`](/cli/plugins/install.html) 安装，或将其列在 `[plugins]` 下；参见 [asdf 插件（旧版）](/asdf-legacy-plugins.html)。该页面还介绍如何编写、维护 asdf 插件并将其移植到 Lua。

## 工具选项

请在 `[tools]` 中的工具条目下设置这些选项。所有后端都接受的选项见[工具选项](/dev-tools/#tool-options)。

### `install_env`

为插件安装脚本设置环境变量：

```toml
[tools]
"asdf:owner/asdf-tool" = { version = "latest", install_env = { MAKEFLAGS = "-j8" } }
```

### `depends`

<span id="install-dependencies"></span>

`depends` 中列出的工具会先安装；运行插件的 `bin/download` 和 `bin/install` 脚本时，这些工具的可执行文件会排在 `PATH` 其他条目之前：

```toml
[tools]
python = "3.14"
"asdf:owner/asdf-tool" = { version = "latest", depends = ["python"] }
```

其他 mise 工具不会加入该 `PATH`，因此脚本使用的每个 mise 工具都必须列在 `depends` 中。`depends` 不会自动将工具添加到配置里：依赖工具仍需在 `[tools]` 中单独声明。参见[工具依赖](/dev-tools/#tool-dependencies)。

### 插件选项

工具条目中的其他键会作为环境变量传递给插件脚本，变量名由 `MISE_TOOL_OPTS__` 加大写键名组成。例如，`mirror = "eu"` 会变成 `MISE_TOOL_OPTS__MIRROR=eu`。插件 README 会列出它读取的选项。

## 故障排查

| 现象                                           | 处理方法                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Windows 上跳过了 `asdf:` 工具                   | mise 不会在 Windows 上运行 asdf 插件。请使用原生后端或 [vfox 插件](/dev-tools/backends/vfox.html)。                    |
| 插件脚本失败                                    | 运行 `MISE_DEBUG=1 mise install <tool>` 查看详情，然后安装脚本所调用的命令。                                         |
| `backend asdf is disabled by disable_backends` | 从 [`disable_backends`](/dev-tools/backends/#disable-backends) 中移除 `asdf`。                                      |

Implementation: [`src/backend/asdf.rs`](https://github.com/jdx/mise/blob/main/src/backend/asdf.rs).
