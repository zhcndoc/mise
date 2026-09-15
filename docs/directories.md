---
description: "mise 将配置、已安装工具、一次性元数据和机器本地状态分离开来。"
---

# 目录结构

mise 将配置、已安装工具、一次性元数据和机器本地状态分离开来。
使用下表查找文件，然后参阅下面的各个部分，了解哪些内容可以安全地共享或删除。
以下是未设置 `MISE_*` 或 `XDG_*` 目录覆盖时的默认值。

| 用途                       | Linux                 | macOS                   | Windows                           | 覆盖                                                     |
| -------------------------- | --------------------- | ----------------------- | --------------------------------- | -------------------------------------------------------- |
| 全局配置                   | `~/.config/mise`      | `~/.config/mise`        | `%USERPROFILE%\.config\mise`      | `MISE_CONFIG_DIR`；否则为 `XDG_CONFIG_HOME` + `/mise`   |
| 缓存                       | `~/.cache/mise`       | `~/Library/Caches/mise` | `%TEMP%\mise`                     | `MISE_CACHE_DIR`；否则为 `XDG_CACHE_HOME` + `/mise`     |
| 本地状态                   | `~/.local/state/mise` | `~/.local/state/mise`   | `%USERPROFILE%\.local\state\mise` | `MISE_STATE_DIR`；否则为 `XDG_STATE_HOME` + `/mise`     |
| 已安装的工具和插件         | `~/.local/share/mise` | `~/.local/share/mise`   | `%LOCALAPPDATA%\mise`             | `MISE_DATA_DIR`；否则为 `XDG_DATA_HOME` + `/mise`       |

`mise cache path` 会打印当前使用的缓存路径。`mise doctor` 会报告解析后的 mise 目录。请在启动 mise 的环境中设置目录覆盖，并在 shell、编辑器和 CI 作业之间保持一致。

请保持这些目录彼此分离。尤其不要将 `MISE_CACHE_DIR` 指向包含配置或已安装工具的目录：缓存清理会删除其中的内容。

## `~/.config/mise`

- 覆盖：`$MISE_CONFIG_DIR`
- 默认：`${XDG_CONFIG_HOME:-$HOME/.config}/mise`

存储全局配置，通常为 `config.toml`。你可以将可移植配置纳入 dotfiles 仓库进行版本控制，但请不要将凭据和机器特定的值放入共享文件中。
项目配置与项目放在一起；请参阅[配置](/configuration.html)。

## `~/.cache/mise`

- 覆盖：`$MISE_CACHE_DIR`
- 默认：`${XDG_CACHE_HOME:-$HOME/.cache}/mise`，_macOS：`~/Library/Caches/mise`。_

存储 mise 用于保存可用工具版本列表等内容的内部缓存。在没有进行安装时，使用 `mise cache clear` 清除元数据。这不会在缓存目录和安装目录分离时卸载工具。
更多信息请参阅[缓存行为](/cache-behavior)。

## `~/.local/state/mise`

- 覆盖：`$MISE_STATE_DIR`
- 默认：`${XDG_STATE_HOME:-$HOME/.local/state}/mise`

存储信任记录、跟踪的配置路径和加密的环境缓存。请将其保留在本机。删除它会丢失信任决策和其他状态；如果只需要刷新缓存值，请使用 `mise cache clear`。

## `~/.local/share/mise`

- 覆盖：`$MISE_DATA_DIR`
- 默认：`${XDG_DATA_HOME:-$HOME/.local/share}/mise`

包含工具安装内容、插件、shim 和命令包装器。不要让 asdf 和 mise 管理同一个安装目录。某些文件系统布局看起来相似，但这些工具不会协调对共享状态的更改。

对于 CI，已安装工具的缓存必须与操作系统、架构、配置以及任何原生库要求相匹配。在任意机器之间复制此目录并不是一种可移植的安装方法。

### `~/.local/share/mise/downloads`

插件可能会把安装过程中下载的资源（例如 tarball）写到这里。mise 在安装/卸载后默认会删除这些文件；将 `always_keep_download` 设为保留它们，以便调试后端/插件的安装行为。
这个目录不是受支持的下载缓存。有些后端在预期文件已存在时可能会跳过下载，但这种行为取决于具体后端，且不保证一定如此。如果你想避免在 CI 或离线工作流中重新安装工具，请改为缓存 `~/.local/share/mise/installs`。

### `~/.local/share/mise/plugins`

mise 在运行 `mise plugins install` 时将插件安装到此目录。如果你正在开发插件，并且该路径下尚未安装插件，请使用指向本地检出目录的符号链接：

```sh
mkdir -p ~/.local/share/mise/plugins
ln -s ~/src/mise-my-tool ~/.local/share/mise/plugins/my-tool
```

### `~/.local/share/mise/installs`

存储已安装的工具版本。例如，`mise install node@24.0.0` 会在数据目录下安装到 `installs/node/24.0.0`。mise 还可能创建指向具体安装内容的版本前缀和别名符号链接。请使用 `mise where node` 或 `mise which node` 查找选定的安装或可执行文件，而不是根据别名构造路径。

你可以设置 `MISE_INSTALLS_DIR` 环境变量来覆盖这个位置。

`MISE_INSTALLS_DIR` 会在 mise 启动时读取。请在调用 mise 之前将其设置到环境中，并在之后调用 mise 以及 shim 时保持设置状态。不要将它设置在 `mise.toml` 的 `[env]` 部分中：`[env]` 描述的是 mise 导出的环境，而此时 mise 已经选择好了其安装目录。
将它设置在那里可能会导致安装过程使用一个目录，而后续命令和 shim 则在另一个目录中查找。

### `~/.local/share/mise/shims`

这是 mise 放置 shim 的位置。通常，这些 shim 用于 IDE 集成，或在 `mise activate` 因某种原因无法运行时使用。

- 设置：`shims_dir`
- 环境覆盖：`MISE_SHIMS_DIR`

此设置仅限全局使用，会展开 `~`，并且必须解析为绝对路径。

`mise reshim` 可以将 shim 发布到共享的可执行文件目录，例如 `~/.local/bin` 或 `/usr/local/bin`；它只会替换或删除其识别为 mise shim 的条目。mise 的其他功能仍会将 shim 目录作为完整的 `PATH` 条目进行过滤，因此在使用 `mise activate`、hook-env 或内部依赖查找时，请使用专用目录。

### `~/.local/share/mise/command-wrappers/bin`

这是 mise 放置由 `[wrappers]` 配置的分发 shim 的位置。mise 管理此目录；添加或删除命令包装器后，请使用 `mise reshim`。

## 系统安装和 shim

系统安装默认位于 `/usr/local/share/mise/installs`，系统 shim 默认位于 `/usr/local/share/mise/shims`。可以通过仅限全局使用的 `system_installs_dir` 和 `system_shims_dir` 设置，或 `MISE_SYSTEM_INSTALLS_DIR` 和 `MISE_SYSTEM_SHIMS_DIR` 环境变量更改它们的位置。
两个路径都会展开 `~`，并且必须解析为绝对路径。

`mise install --system` 会写入系统安装根目录，`mise reshim --system` 会重建系统 shim。mise 从不会自动提升权限。请使用必要的权限预先安装，或者在默认位置不可写时重定向这些设置。

发行版可以让系统存储和用户存储位于同一位置，同时保留系统配置。例如，Omarchy 可以将所有工具产物保留在用户的主目录中：

```toml
[settings]
system_installs_dir = "~/.local/share/mise/installs"
shims_dir = "~/.local/share/mise/shims"
system_shims_dir = "~/.local/share/mise/shims"
```

当 shim 路径相等时，mise 会使用一个锁管理一组组合 shim。当安装根目录相等时，该根目录会被视为本地存储，而不会被扫描并分类两次。
