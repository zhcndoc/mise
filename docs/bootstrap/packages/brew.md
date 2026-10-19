---
description: "无论是否已安装 Homebrew，都可将 formula 安装到标准 Homebrew 前缀目录。"
---

# Homebrew formula（brew）

`brew` 管理器会将 [Homebrew](https://brew.sh) formula 安装到标准 Homebrew 前缀目录。mise 自行下载并安装 formula，因此无需预先安装 Homebrew；已有的 Homebrew 安装也能识别和管理 mise 安装的内容。应用程序和字体请使用 [`brew-cask`](/bootstrap/packages/brew-cask.html)。

```toml
[bootstrap.packages]
"brew:postgresql@17" = "latest"
"brew:ffmpeg" = "latest"
"brew:imagemagick" = "latest"
```

```sh
mise bootstrap packages apply --manager brew --dry-run
mise bootstrap packages apply --manager brew
```

试运行会列出即将安装的每个 formula（依赖项优先），以及创建前缀目录所需的 sudo 命令。mise 会同时安装每个 formula 的运行时依赖项。

## 支持的平台

| 平台                    | 前缀目录                       |
| ---------------------- | ---------------------------- |
| macOS on Apple Silicon | `/opt/homebrew`              |
| Linux x86_64           | `/home/linuxbrew/.linuxbrew` |
| Linux arm64            | `/home/linuxbrew/.linuxbrew` |

`brew` 管理器不支持 Intel Mac，这类平台会跳过对应条目。不过 [`brew-cask`](/bootstrap/packages/brew-cask.html#supported-platforms) 可以在 Intel Mac 上运行。homebrew/core 中的大多数 formula 都提供 Linux arm64 瓶装包，但并非全部；其余 formula 会由 mise [从源码构建](#source-formulae)。

## 前缀目录与 PATH {#the-prefix}

如果前缀目录不存在，mise 会按 Homebrew 的标准目录结构创建它，并使用 sudo 创建目录、将其所有权交给当前用户。之后 mise 会以该用户身份安装 formula，因此请使用应拥有此前缀目录的用户运行 mise。

链接的命令会放在 `<prefix>/bin` 中。这些包不会生成 mise shim，而且 mise 不会修改当前 shell 的 `PATH`，因此请在 shell 启动文件中添加该目录：

::: code-group

```sh [macOS]
export PATH="/opt/homebrew/bin:$PATH"
```

```sh [Linux]
export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
```

:::

模板可以通过 <code v-pre>{{ system_brew_prefix }}</code> 读取前缀，因此同一份配置可用于两个平台：

```toml
[env]
PKG_CONFIG_PATH = "{{ system_brew_prefix }}/opt/mysql-client/lib/pkgconfig"
```

## Formula 名称

请使用 Homebrew 中的 formula 名称，例如 `brew:jq` 或 `brew:openssl@3`。`brew:homebrew/core/jq` 指向相同的 formula。其他 tap 中的 formula 请使用完整名称，详见[第三方 tap](#third-party-taps)。

使用 `postgres` 这样的别名或已重命名 formula 的旧名称时，mise 会安装其规范名称。状态无法跟踪别名，因此 mise 会发出警告并显示应改用的规范名称。

## 固定版本 {#choose-a-formula-version}

Homebrew 只为 formula 的当前版本发布瓶装包，因此 mise 无法安装旧版本。若要固定到某个主版本，请声明带版本号的 formula，例如 `"brew:postgresql@17" = "latest"`；`@17` 是 formula 名称的一部分。如果在值中指定版本，例如 `"brew:jq" = "1.7"`，而已安装的是其他版本，状态就会报告 `version mismatch`，`apply` 和 `upgrade` 也会发出警告并跳过该条目。

## 升级 {#upgrades}

`mise bootstrap packages upgrade --manager brew` 会为每个已配置且安装版本与 Homebrew API 不一致的 formula 安装当前瓶装包，然后像 `brew upgrade` 一样将链接指向新版本。

## 第三方 tap

要使用其他 tap 中的 formula，请像传给 Homebrew 一样使用完整名称：

```toml
[bootstrap.packages]
"brew:railwaycat/emacsmacport/emacs-mac" = "latest"
```

如果 tap 提供已发布的 API 元数据，mise 会读取这些数据；否则会直接读取 tap 中的 Ruby 定义，并[从源码构建](#source-formulae)相应的 formula。对于不提供 API 元数据的 tap，mise 也会以相同方式读取其中的 cask 定义，然后按常规方式安装。如果定义使用了 mise 尚未实现的 Homebrew 功能，安装会失败，并在错误信息中指出该功能。

mise 会在 `https://github.com/<owner>/homebrew-<tap>.git` 查找 tap。如果 tap 位于名称不同的仓库中，请在 `[bootstrap.brew.taps]` 下添加它的 URL。目前只支持 GitHub 上的 tap。

```toml
[bootstrap.brew.taps]
"acme/tools" = "https://github.com/acme/tools.git"

[bootstrap.packages]
"brew:acme/tools/widget" = "latest"
"brew-cask:acme/tools/widget-app" = "latest"
```

[`mise bootstrap packages brew tap`](/cli/bootstrap/packages/brew/tap.html) 和 [`untap`](/cli/bootstrap/packages/brew/untap.html) 默认会编辑全局配置中的 `[bootstrap.brew.taps]`。传入 `--local` 可写入项目的 `mise.toml`，传入 `--path` 则可指定其他文件。这两条命令都不会修改 Homebrew 安装。

```sh
mise bootstrap packages brew tap railwaycat/emacsmacport
mise bootstrap packages brew tap acme/tools https://github.com/acme/tools.git --local
mise bootstrap packages brew untap acme/tools
```

## 仅 keg formula

仅 keg formula（例如 `openssl@3`）不会链接到 `<prefix>/bin` 或 `<prefix>/lib`。请改为将编译器和构建选项指向 `<prefix>/opt/<formula>`。与 Homebrew 一样，如果某个 formula 仅因 macOS 已提供该工具而被标为仅 keg（例如 `curl`），它在 Linux 上仍会正常链接。

### 查找已安装的 formula

[`mise bootstrap packages where`](/cli/bootstrap/packages/where.html) 会输出 formula 的 `<prefix>/opt/<formula>` 目录，同样适用于仅 keg formula。添加 `/bin` 即可使用其中的命令：

```sh
if package_root="$(mise bootstrap packages where brew:unzip)"; then
  export PATH="$package_root/bin:$PATH"
fi
```

无需额外声明，即可查询由 mise 或 Homebrew 安装的 formula。后续升级时，`opt` 路径仍会指向当前版本。只包含库文件的 formula 有根目录，但可能没有 `bin` 目录。

请使用规范的 formula 名称。`brew:owner/tap/unzip` 和 `brew:homebrew/core/unzip` 都会查询已安装的 `unzip`，不会检查它来自哪个 tap，也不会解析别名。`where` 不会查询 cask 或其他管理器安装的包。

如果 formula 尚未安装或其 `opt` 链接已损坏，`where` 不会向 stdout 输出内容，而会在 stderr 解释问题并以非零状态退出。请运行 `mise bootstrap packages apply brew:unzip` 安装它。`where` 只读取前缀目录，不读取 mise 配置文件，因此即使 `mise.toml` 不受信任或无效也能使用。

## 与 Homebrew 共存 {#coexistence-with-a-real-homebrew}

mise 会像 Homebrew 一样将瓶装包安装到 Cellar，并写入兼容 Homebrew 的收据，因此 `brew list`、`brew upgrade` 和 `brew uninstall` 都可以管理 mise 安装的 formula。反过来，mise 会直接读取前缀目录，因此 Homebrew 安装的 formula 也会被视为已安装。

mise 不会覆盖它未创建的前缀目录文件。遇到链接冲突时，操作会失败并列出冲突文件。如果已配置 formula 的 `opt` 链接或 linked-keg 记录缺失，状态会报告 `needs repair`，`apply` 则会恢复链接而不重新安装 formula。

## 导入与清理 {#importing-and-pruning}

[`mise bootstrap packages import --manager brew`](/cli/bootstrap/packages/import.html) 会将已安装的 formula 记录到 `[bootstrap.packages]`，类似于 [`brew bundle dump`](https://docs.brew.sh/Brew-Bundle-and-Brewfile)。默认只导入用户主动安装的 formula；传入 `--all` 还会包含其依赖项：

```toml
[bootstrap.packages]
"brew:ffmpeg" = "latest"
"brew:postgresql@17" = "latest"
```

其他 tap 中的 formula 会以完整名称写入，mise 也会为每个 tap 添加 `[bootstrap.brew.taps]` 条目。它会使用配置中已有的 URL；如果没有，则使用 `https://github.com/<owner>/homebrew-<tap>.git`。

[`mise bootstrap packages prune --manager brew`](/cli/bootstrap/packages/prune.html) 用于显式清理，类似于 `brew bundle cleanup`。它会移除当前配置或 mise 跟踪的任何可信配置文件中未声明、且并非已声明 formula 或 cask 所依赖的已链接 formula，其中也包括由 Homebrew 安装的 formula。对于每个移除项，它都会删除 keg、`opt` 链接以及前缀目录中的链接：

```sh
mise bootstrap packages prune --manager brew --dry-run
mise bootstrap packages prune --manager brew
```

删除 `brew:` 条目不会立即卸载 formula；只有运行 prune 后才会卸载。

## 未提供瓶装包的 formula {#source-formulae}

如果当前平台没有可用的瓶装包，mise 会从源码构建 formula。它会通过 mise 安装 Ruby（或使用你配置的版本）来解析 formula，根据 Homebrew API 中的校验和下载 formula 定义及源码归档，将构建依赖作为瓶装包安装，然后在前缀目录中执行 formula 的安装步骤。最终会像瓶装包一样生成兼容 Homebrew 的收据。

从源码构建需要 macOS 上的 Xcode Command Line Tools，或 Linux 上的 gcc 和 make。mise 实现了 Homebrew formula 语言中常用的功能，例如 configure、CMake 和 Meson 构建、resources 及 patches。若 formula 使用了其他功能（例如 `virtualenv_install_with_resources` 或 VCS 下载），mise 会以 `formula uses ...` 错误中止，而不会错误构建。

## mise 如何安装 formula {#how-pouring-works}

对每个 formula（先处理依赖项），mise 会从 ghcr.io 下载瓶装包，并将其 sha256 与 Homebrew API 中的值进行校验；随后解压到 Cellar、替换 Homebrew 占位路径、在 macOS 上重新签署已修改的二进制文件、写入兼容 Homebrew 的收据，并将 keg 链接到前缀目录。仅 keg formula 只会创建 `opt` 链接。mise 从不运行 `brew`。

与 `brew install` 一样，mise 会将瓶装包附带的 `etc` 和 `var` 文件复制到前缀目录中。已有文件绝不会被覆盖；瓶装包中的副本会以 `<file>.default` 名称写在旁边。之后，mise 会执行 Homebrew API 中声明式的 `post_install_steps`，例如 `ca-certificates` 会生成 `etc/ca-certificates/cert.pem`，`openssl@4` 会将自己的 `cert.pem` 链接到该文件。mise 实现了通用步骤类型（`symlink`、`copy`、`move`、`remove`、`mkdir_p`、`touch`、`write`、`set_permissions` 和 `run`）。遇到工具专用步骤类型（例如 `compile_gsettings_schemas`）时，mise 会跳过并发出警告；如果已安装 Homebrew 且 formula 需要该步骤，请运行 `brew postinstall <formula>`。与 Homebrew 一样，步骤失败只会产生警告，不会导致安装失败。

## 故障排查

| 现象                                       | 处理方法                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 链接冲突                                   | 移动或删除列出的文件前，请先确认每个文件由哪个程序管理。再次运行 `apply` 不会覆盖这些文件。                                    |
| `formula uses ...` 或不支持的功能          | mise 无法构建此 formula。请使用 Homebrew 安装，或移除此条目。                                                              |
| 已安装，但找不到命令                      | 确认 `<prefix>/bin` 已加入 `PATH`，并检查该 formula 是否为[仅 keg](#keg-only-formulae)。                                    |
| 状态显示 `needs repair`                   | 运行 `mise bootstrap packages apply` 恢复 formula 的链接。                                                               |

mise 尚未实现 `brew services`。
