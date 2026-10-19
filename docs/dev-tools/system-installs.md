---
description: "将工具安装到共享系统目录，让机器上的所有用户账户都能使用同一份安装。"
---

# 系统级安装

如果多个用户账户或以 root 构建的容器镜像需要共用同一份工具安装，请使用系统级安装。`mise install --system` 会将工具安装到 `/usr/local/share/mise/installs`；每位用户的 mise 都会使用其中匹配的版本，而不必自行安装。

## 为所有用户安装工具 {#install-a-tool-for-every-user}

请以普通用户身份运行命令，不要使用 `sudo`：

```sh
mise install --system uv
```

在 Unix 上，mise 会以你的身份下载、验证并解压工具，然后运行 `sudo`，将准备好的安装文件移至系统目录。mise 会打印通过 `sudo` 执行的每条命令。缓存和锁文件更新仍归你所有。如果你已拥有目标目录的写入权限，或 mise 以 root 身份运行，则会直接安装而不使用 `sudo`。在 Windows 上，mise 不会提权；请安装到你有权限写入的目录。

安装工具不会自动选择其版本。请在用户会读取的配置文件中声明版本，例如系统配置 `/etc/mise/config.toml`：

```toml [/etc/mise/config.toml]
[tools]
uv = "0.12"
```

当用户的 mise 将 `uv = "0.12"` 解析为系统目录中已有的版本时，就会使用该安装。若要替换已安装的版本，请运行 `mise install --system --force uv`；mise 会先准备新版本，再替换现有安装。`mise upgrade` 会将系统级安装保留在系统目录中。

::: warning
`sudo mise install --system` 虽然可用，但会以 root 身份执行整个安装过程，可能在你的主目录中留下归 root 所有的文件。mise 检测到这种情况时会发出警告。请以普通用户身份运行 mise，让它自行调用 `sudo`。直接以 root 身份运行 mise（例如在容器构建中）也受支持。
:::

## 支持的后端 {#supported-backends}

需要提权时，mise 支持通过 `aqua`、`github`、`gitlab`、`forgejo`、`http` 和 `s3` 后端安装工具。工具移出临时目录并放到最终位置后仍须正常工作，而且不能设置工具级 [`postinstall`](/dev-tools/#tool-postinstall-commands) 命令。安装目录内部的符号链接会保留；指向目录外部的符号链接会被拒绝。

`packslip`、`npm` 等其他后端、核心工具，以及会记录自身安装路径的工具（例如 Python 虚拟环境）都要求目标目录可由当前用户写入。如果目标目录本身可写，或 mise 以 root 身份运行并直接安装，则不受这些限制。

## 目录 {#directories}

| 目录            | 默认值                           | 设置                                                                      | 环境变量                   |
| --------------- | -------------------------------- | ------------------------------------------------------------------------- | -------------------------- |
| 系统数据目录     | `/usr/local/share/mise`          |                                                                           | `MISE_SYSTEM_DATA_DIR`     |
| 系统安装目录     | `$MISE_SYSTEM_DATA_DIR/installs` | [`system_installs_dir`](/configuration/settings.html#system_installs_dir) | `MISE_SYSTEM_INSTALLS_DIR` |
| 系统 shims 目录 | `$MISE_SYSTEM_DATA_DIR/shims`    | [`system_shims_dir`](/configuration/settings.html#system_shims_dir)       | `MISE_SYSTEM_SHIMS_DIR`    |
| 系统配置目录     | `/etc/mise`                      |                                                                           | `MISE_SYSTEM_CONFIG_DIR`   |

这两个设置仅适用于全局配置，会展开 `~`，且最终必须解析为绝对路径。系统配置中声明的延迟安装工具会安装到系统安装目录，并在系统 shims 目录中发布[启动 shims](/dev-tools/shims.html#lazy-tools)。每用户目录位置请参阅[目录](/directories.html)。

### 在系统级和用户级安装间共享存储 {#share-storage}

发行版可以保留系统配置，同时将所有工具存储在用户主目录中。例如，Omarchy 可使用以下设置：

```toml
[settings]
system_installs_dir = "~/.local/share/mise/installs"
shims_dir = "~/.local/share/mise/shims"
system_shims_dir = "~/.local/share/mise/shims"
```

当两个 shims 目录相同时，mise 会使用同一把锁管理合并后的 shims。当两个安装目录相同时，mise 会将其视为用户存储，而不会重复扫描。

## 系统级安装的 shims {#system-shims}

`mise reshim --system` 会为系统安装目录中的工具，在系统 shims 目录中创建 shims。如果某个命令缺少 shim，请在 `mise install --system` 后运行该命令。与安装操作相同，目录不可写时更新 shim 会使用 `sudo`。[`mise activate --shims`](/dev-tools/shims.html) 会将系统 shims 目录加到 `PATH` 中，优先级低于用户自己的 shims 目录。

## 权限和 sudo {#permissions-and-sudo}

- 交互式安装可以提示输入 `sudo` 密码。CI 等非交互式安装要求 `sudo` 可免密运行，否则会失败。
- 提权安装时，目标目录及所有已存在的父目录都必须归 root 所有，且组用户和其他用户均不可写入。带 sticky bit 的 root 所有目录（例如 `/tmp`）允许使用。mise 会在解析符号链接后检查父目录。
- 将 [`system_packages.sudo`](/configuration/settings.html#system_packages.sudo) 设为 `false` 可阻止 mise 调用 `sudo`。需要 root 权限的安装会失败，但安装到可写目录仍可正常进行。
- 提权步骤会以 root 身份运行 `mise`，且不会加载任何配置文件；它只会写入系统安装目录和 shims 目录。自定义目录必须通过环境变量传递，因此请在 sudo 的 `env_keep` 中保留 `MISE_SYSTEM_DATA_DIR`，或 `MISE_SYSTEM_INSTALLS_DIR` 与 `MISE_SYSTEM_SHIMS_DIR`。例如，使用 `visudo` 编辑 `/etc/sudoers.d/` 下的文件：

  ```text
  Defaults env_keep += "MISE_SYSTEM_DATA_DIR"
  ```

## 其他共享目录 {#other-shared-directories}

`mise install --shared <DIR>` 可将工具安装到任意指定目录。若要让 mise 在此查找已安装版本，请将目录列入 [`shared_install_dirs`](/configuration/settings.html#shared_install_dirs)。mise 会读取这些目录，但不会自行向其中安装工具。系统安装目录只要存在就一定会被搜索，因此无需列出。
