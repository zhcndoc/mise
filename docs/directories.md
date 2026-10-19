---
description: "查阅 mise 保存配置、已安装工具、缓存和状态的位置，以及用于迁移它们的 MISE_*_DIR 变量。"
socialDescription: "查阅 mise 保存配置、已安装工具、缓存和状态的位置，以及迁移方法。"
---

# 目录

mise 会将配置、已安装工具、缓存和机器本地状态分别保存在不同目录中。未通过 `MISE_*_DIR` 或 `XDG_*` 变量覆盖时，将使用下表中的默认路径。

| 用途                        | Linux                         | macOS                   | Windows                           | 覆盖方式                                                                                                                          |
| --------------------------- | ----------------------------- | ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 全局配置                    | `~/.config/mise`              | `~/.config/mise`        | `%USERPROFILE%\.config\mise`      | `MISE_CONFIG_DIR`；否则使用 `XDG_CONFIG_HOME` + `/mise`                                                                            |
| 缓存                        | `~/.cache/mise`               | `~/Library/Caches/mise` | `%TEMP%\mise`                     | `MISE_CACHE_DIR`；否则使用 `XDG_CACHE_HOME` + `/mise`                                                                              |
| 本地状态                    | `~/.local/state/mise`         | `~/.local/state/mise`   | `%USERPROFILE%\.local\state\mise` | `MISE_STATE_DIR`；否则使用 `XDG_STATE_HOME` + `/mise`                                                                              |
| 已安装工具和插件            | `~/.local/share/mise`         | `~/.local/share/mise`   | `%LOCALAPPDATA%\mise`             | `MISE_DATA_DIR`；否则使用 `XDG_DATA_HOME` + `/mise`                                                                                |
| 系统配置                    | `/etc/mise`                   | `/etc/mise`             | 当前驱动器上的 `\etc\mise`         | `MISE_SYSTEM_CONFIG_DIR`（旧名称：`MISE_SYSTEM_DIR`）                                                                             |
| 临时文件                    | `$TMPDIR/mise` 或 `/tmp/mise` | `$TMPDIR/mise`          | `%TEMP%\mise-tmp`                 | `MISE_TMP_DIR`；否则使用系统临时目录中的 `mise`；如果该目录位于缓存目录内，则使用 `mise-tmp`                                        |

以下目录位于数据目录中，也可以单独迁移：

| 子目录           | 默认值                        | 覆盖方式                                                                |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------ |
| 已安装工具      | `installs/`                   | `MISE_INSTALLS_DIR`                                                      |
| 安装存储        | `installs/` (`i\` on Windows) | `MISE_INSTALL_STORE_DIR`；详见[安装目录](#local-share-mise-installs)      |
| 插件            | `plugins/`                    | `MISE_PLUGINS_DIR`                                                       |
| 下载文件        | `downloads/`                  | `MISE_DOWNLOADS_DIR`                                                     |
| Shims           | `shims/`                      | [`shims_dir`](/configuration/settings.html#shims_dir)（`MISE_SHIMS_DIR`）|
| 命令包装器      | `command-wrappers/bin/`       | 无                                                                        |

`mise cache path` 会打印正在使用的缓存目录；`mise doctor` 会报告解析后的数据、配置、缓存、状态和 shims 目录。请在启动 mise 的环境中设置这些变量，例如 Shell 启动文件或 CI 作业中，并确保 Shell、编辑器和 CI 使用相同设置。不要在 `[env]` 中设置这些变量：mise 会在读取 `mise.toml` 前确定目录，因此在那里设置可能导致不同命令使用不同目录。

请将这些目录分开。尤其不要将 `MISE_CACHE_DIR` 指向包含配置或已安装工具的目录，因为清除缓存会删除其中所有内容。

## `~/.config/mise` {#config-mise}

此目录存放[全局配置](/configuration.html#global-config)，通常包括 `config.toml`、`conf.d/` 片段和 `miserc.toml`。可将便携式配置保存在 dotfiles 仓库中，但不要把凭据和机器专用值放进共享文件。项目配置保存在项目目录中；详见 [mise.toml](/configuration.html#mise-toml)。

## `~/.cache/mise` {#cache-mise}

此目录存放 mise 可以重新生成的数据，例如各工具的可用版本列表和缓存的 `exec()` 输出。`mise cache clear` 会清除此目录；运行前请确保没有安装任务正在进行。只要缓存目录与数据目录分开，清除缓存就不会卸载工具。详见[缓存](/cache-behavior.html)。

## `~/.local/state/mise` {#local-state-mise}

此目录存放信任决策、受跟踪的配置路径、加密的[环境缓存](/cache-behavior.html#environment-caching)、任务新鲜度记录，以及[dotfiles](/dotfiles.html)及其[历史记录](/dotfiles/history.html)、[守护进程](/daemons.html)、[项目依赖项](/dev-tools/deps.html)、bootstrap 软件包和 packslip 签名者固定信息的状态。请将其保留在本机。删除此目录会丢失这些状态；如果只需刷新缓存值，请使用 `mise cache clear`。

## `~/.local/share/mise` {#local-share-mise}

此目录存放工具安装文件、插件、shims 和命令包装器。不要让 asdf 和 mise 共用同一数据目录：虽然部分目录结构相似，但两者不会协调彼此的更改。

已安装工具依赖于安装机器的操作系统、体系结构、配置和本机库。在不同机器之间复制此目录不是受支持的工具安装方式。如何在 CI 中缓存该目录，请参阅[持续集成](/continuous-integration.html)。

### `downloads` {#local-share-mise-downloads}

后端在安装工具时可能会暂时将归档文件写入此处，安装完成后 mise 会删除这些文件。已完成的下载会保存在[下载缓存](/configuration/settings.html#download_cache)中。为了避免在 CI 中重新安装工具，请缓存 `installs/`；如果安装存储位于单独目录，也请一并缓存。

### `plugins` {#local-share-mise-plugins}

`mise plugins install` 会将插件安装到此目录。开发插件时，请链接本地检出副本：

```sh
mise plugins link my-tool ~/src/mise-my-tool
```

### `installs` {#local-share-mise-installs}

此目录保存已安装的版本：`mise install node@24.0.0` 会将工具安装到 `installs/node/24.0.0`。mise 也会为版本前缀和别名创建链接，例如 `installs/node/24`。请使用 `mise where node` 或 `mise which node` 获取路径，而不要自行拼接路径。

`MISE_INSTALLS_DIR` 可更改此目录的位置。与其他目录变量一样，请在启动 mise 的环境中设置它，而不要写入 `[env]`，否则安装操作可能使用一个目录，而后续命令和 shims 会查找另一个目录。

实验性的[标识安装布局](/dev-tools/install-layout.html)会将工具安装到
`installs/<label>-<hash>/`，例如 `installs/age-hlencrst`，并将
`installs/age/1.2.1` 链接到该目录。`installs/.mise/` 中的目录清单会记录每个安装所在的位置；它不是缓存，因此应与安装文件一起备份。在 Windows 上，安装文件会放在 `installs` 旁边的 `i\` 目录中（`%LOCALAPPDATA%\mise\i`）。较短的路径可为 Windows 260 字符的路径长度限制留出更多空间。所有平台均可通过 `MISE_INSTALL_STORE_DIR` 指定安装文件存放位置；位于 `installs/` 内部的目录会被忽略。

### `shims` {#local-share-mise-shims}

shims 让编辑器、脚本和非交互式 Shell 无需运行 `mise activate` 即可使用 mise 管理的工具。详见[Shims](/dev-tools/shims.html)。

[`shims_dir`](/configuration/settings.html#shims_dir) 可更改此目录的位置。它只能在全局配置中设置，支持展开 `~`，且最终必须是绝对路径。`mise reshim` 可将 shims 发布到共享目录（例如 `~/.local/bin`），并且只会替换或移除能识别为 mise shim 的条目。其他情况下，mise 仍会将整个 shim 目录作为一个 `PATH` 条目处理；如果同时使用 `mise activate`，请为 shims 使用专用目录。

### `command-wrappers/bin` {#local-share-mise-command-wrappers-bin}

此目录存放[`[wrappers]`](/dev-tools/shims.html#command-wrappers)的分发 shim，由 mise 管理。添加或移除包装器后，请运行 `mise reshim`。

## 系统配置 {#system-config}

`/etc/mise` 保存适用于本机所有用户的配置，例如 `/etc/mise/config.toml`、`conf.d/` 片段和 `miserc.toml`。它的优先级最低；详见[全局和系统配置](/configuration.html#global-config)。

## 系统级安装和 shims {#system-installs-and-shims}

`mise install --system` 会将工具安装到 `/usr/local/share/mise/installs`，`mise reshim --system` 则会将 shims 写入 `/usr/local/share/mise/shims`。`MISE_SYSTEM_DATA_DIR` 可同时更改这两个目录（默认值为 `/usr/local/share/mise`）；[`system_installs_dir`](/configuration/settings.html#system_installs_dir)（`MISE_SYSTEM_INSTALLS_DIR`）和[`system_shims_dir`](/configuration/settings.html#system_shims_dir)（`MISE_SYSTEM_SHIMS_DIR`）则可分别更改目录。在 Unix 上，如果目录不可写，mise 会使用 `sudo` 写入。详见[系统级安装](/dev-tools/system-installs.html)。
