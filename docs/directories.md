# 目录结构

以下是 mise 使用的目录。

::: tip
如果你经常使用这些目录（像我一样），我建议将它们全部设置为 `~/.mise`，以便于访问。
:::

## `~/.config/mise`

- 覆盖：`$MISE_CONFIG_DIR`
- 默认：`${XDG_CONFIG_HOME:-$HOME/.config}/mise`

此目录存储全局配置文件 `~/.config/mise/config.toml`。此文件通常应放入你的 dotfiles 仓库中，以便在多台机器之间共享。

## `~/.cache/mise`

- 覆盖：`$MISE_CACHE_DIR`
- 默认：`${XDG_CACHE_HOME:-$HOME/.cache}/mise`，_macOS：`~/Library/Caches/mise`。_

存储 mise 用于诸如某个插件的所有可用版本列表之类用途的内部缓存。不要在不同机器之间共享此缓存。你可以在 mise 没有正在主动安装任何内容时随时删除该目录。使用 `mise cache clear` 执行此操作。
有关更多信息，请参见 [缓存行为](/cache-behavior)。

## `~/.local/state/mise`

- 覆盖：`$MISE_STATE_DIR`
- 默认：`${XDG_STATE_HOME:-$HOME/.local/state}/mise`

用于存储仅限本机的状态，例如哪些配置文件是受信任的。这些内容不应在不同机器之间共享。

## `~/.local/share/mise`

- 覆盖：`$MISE_DATA_DIR`
- 默认：`${XDG_DATA_HOME:-$HOME/.local/share}/mise`

这是 mise 使用的主目录，插件和工具都会安装到这里。
它与 asdf 中的 `~/.asdf` 几乎完全相同，以至于你可能只需将它们通过符号链接连接起来，就能同时使用 asdf 和 mise。（不过，支持这种用法并不是本项目的目标）。

这个目录 _可以_ 在不同机器之间共享，但前提是它们运行相同的操作系统/架构。通常我不建议这样做。

### `~/.local/share/mise/downloads`

插件可能会把安装过程中下载的资源（例如 tarball）写到这里。mise 在安装/卸载后默认会删除这些文件；将 `always_keep_download` 设为保留它们，以便调试后端/插件的安装行为。
这个目录不是受支持的下载缓存。有些后端在预期文件已存在时可能会跳过下载，但这种行为取决于具体后端，且不保证一定如此。如果你想避免在 CI 或离线工作流中重新安装工具，请改为缓存 `~/.local/share/mise/installs`。

### `~/.local/share/mise/plugins`

当运行 `mise plugins install` 时，mise 会将插件安装到这个目录。如果你正在开发某个插件，我建议你通过以下方式手动创建符号链接：

```sh
ln -s ~/src/mise-my-tool ~/.local/share/mise/plugins/my-tool
```

### `~/.local/share/mise/installs`

运行 `mise install` 时，工具会安装到这里。例如，`mise install
node@20.0.0` 会安装到 `~/.local/share/mise/installs/node/20.0.0`

这还会为该目录创建其他符号链接，用于版本前缀（`"20"` 和 `"20.15"`）以及匹配的别名（`"lts"`、`"latest"`）。
例如：

```sh
$ tree ~/.local/share/mise/installs/node
20 -> ./20.15.0
20.15 -> ./20.15.0
lts -> ./20.15.0
latest -> ./20.15.0
```

你可以设置 `MISE_INSTALLS_DIR` 环境变量来覆盖这个位置。

`MISE_INSTALLS_DIR` 会在 mise 启动时读取。请在调用 mise 之前将其设置到环境中，并在之后调用 mise 以及 shim 时保持设置状态。不要将它设置在 `mise.toml` 的 `[env]` 部分中：`[env]` 描述的是 mise 导出的环境，而此时 mise 已经选择好了其安装目录。
将它设置在那里可能会导致安装过程使用一个目录，而后续命令和 shim 则在另一个目录中查找。

### `~/.local/share/mise/shims`

这是 mise 放置 shim 的位置。通常这些用于 IDE 集成，或者在 `mise activate`
由于某些原因无法正常工作时使用。
