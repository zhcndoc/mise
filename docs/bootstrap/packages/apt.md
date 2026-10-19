---
description: "在 mise.toml 中声明 Debian 和 Ubuntu 软件包，通过 apt-get 安装并可固定版本。"
---

# Debian 和 Ubuntu 软件包（apt）

`apt` 管理器使用 `apt-get` 在 Debian、Ubuntu 和其他基于 Debian 的发行版上安装软件包。它通过 `dpkg-query` 检查安装状态；mise 未以 root 身份运行时会使用 [sudo](/bootstrap/packages/#sudo)。

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:curl" = "8.5.0-2ubuntu10" # 版本固定
"apt:gcc:arm64" = "latest"     # 架构限定符
```

```sh
mise bootstrap packages apply --manager apt --dry-run
mise bootstrap packages apply --manager apt
```

## 前置条件

在 `PATH` 中能找到 `apt-get` 的 Linux 系统上可以使用此管理器。在其他机器上，其条目会显示为[`skipped`](/bootstrap/packages/#choose-platforms)。

mise 会设置 `DEBIAN_FRONTEND=noninteractive`，因此 debconf 问题会采用默认答案。不过，直接从终端读取输入的软件包维护脚本仍可能提示用户。

## 软件包名称

请使用 `apt-get install` 所接受的软件包名称。追加 `:<arch>` 可指定体系结构，例如 `gcc:arm64`。机器的 dpkg 体系结构和 apt 源必须已提供该体系结构；此声明不会启用 multiarch。如需从其他仓库安装，请在[`[bootstrap.apt.sources]`](#sources) 中声明。

## 软件仓库与 PPA {#sources}

请在 `[bootstrap.apt.sources]` 中声明额外仓库。mise 会在安装或升级 `apt:` 软件包前添加这些仓库，因此软件包可以来自厂商仓库，或通过 PPA 安装较新版本：

```toml
[bootstrap.apt.sources]
git-core = { ppa = "git-core/ppa" }
fish = { ppa = "fish-shell/release-4" }

[bootstrap.apt.sources.docker]
uris = "https://download.docker.com/linux/ubuntu"
components = "stable"
key = "https://download.docker.com/linux/ubuntu/gpg"
fingerprint = "9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88"

[bootstrap.packages]
"apt:git" = "latest"
"apt:fish" = "latest"
"apt:docker-ce-cli" = "latest"
```

对于每个源，mise 都会写入 `/etc/apt/sources.list.d/mise-<name>.sources`，并将签名密钥内嵌在 `Signed-By` 字段中，使 apt 仅对该仓库信任此密钥；删除该文件也会同时移除密钥。内嵌密钥要求 apt 2.4 或更高版本（Ubuntu 22.04、Debian 12）。旧版 mise 曾写入 `/etc/apt/keyrings/mise-<name>.gpg` 的密钥，会在下次应用该源时移除。添加或更改源后，mise 会在安装前运行一次 `apt-get update`。未传入 `--yes` 时，mise 会在添加或更改源前询问，安装软件包前也一样。如果 apt 无法获取某个源的软件包列表，mise 会发出警告，并在下次 apply 时再次运行 `apt-get update`。名称可以包含字母、数字、`_`、`-` 和 `.`。

`ppa` 条目使用 `owner/archive` 指定 PPA，`ppa:` 前缀可加可不加。mise 会从 Launchpad 读取 PPA 签名密钥指纹，并从 `keyserver.ubuntu.com` 下载密钥。添加 `fingerprint` 可固定密钥并跳过 Launchpad 查询。如果未设置指纹，每当条目的源发生变化（例如改为另一个 PPA）时，mise 都会重新下载密钥。PPA 是为 Ubuntu 发行版构建的，因此 mise 只会在 Ubuntu 和 `/etc/os-release` 中设置了 `UBUNTU_CODENAME` 的发行版（例如 Linux Mint）上添加它们。在其他发行版上会跳过 PPA，因此相同配置也可用于 Debian。

其他仓库必须设置 `uris`、`key` 和 `fingerprint`：

| 字段            | 说明                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `uris`          | 仓库 URL，按软件厂商安装说明中提供的地址填写                                                                            |
| `suites`        | 默认为发行版代号，例如 `noble`；Linux Mint 等 Ubuntu 衍生版使用其 Ubuntu 基础版本的代号                                   |
| `components`    | 默认为 `main`；若 `suites` 是以 `/` 结尾的路径，则默认为空                                                              |
| `architectures` | 可选项；如果仓库只发布了部分体系结构的软件包，可设置为 `amd64` 等值                                                     |
| `key`           | 签名密钥的 http(s) URL；密钥可以是 ASCII 装甲格式或二进制格式                                                            |
| `fingerprint`   | 完整密钥指纹或指纹列表；空格会被忽略                                                                                    |

mise 只会保留下载内容中指纹与你所声明值相符的密钥；如果找不到匹配密钥则会失败。源文件中已有匹配密钥后，mise 会保留它，不再重新下载。如果密钥发生变化或不再匹配，下次 apply 时会替换该密钥。

已声明的源也会替换先前从其他位置安装的软件包。例如，系统镜像中自带 Ubuntu 的 `git`，而你声明了 `git-core` PPA 时，`mise bootstrap` 会安装 PPA 中的 `git`；安装完成前，状态会将旧版本显示为 `version mismatch`。mise 会在状态目录中记录哪些软件包已从声明的源安装，因此每个软件包针对每个源只迁移一次。该记录归运行 mise 的用户所有，因此分别运行 `mise` 和 `sudo mise` 可能导致软件包再次迁移。同一源之后发布的新版本会交由 `mise bootstrap packages upgrade` 处理，与其他 `latest` 软件包相同。固定版本或指定体系结构的软件包不会迁移。在尚未添加该源的机器上，试运行无法显示迁移结果，因为 apt 只有在添加源后才会获取其软件包列表。

自动安装工具的[系统依赖项](/configuration/settings.html#system_deps)时，mise 只会在无需询问用户的情况下添加已声明的源。需要询问的安装会使用 `mise bootstrap` 已添加的源。

mise 不会移除源。删除条目后，相关文件仍会保留；请自行删除 `/etc/apt/sources.list.d/mise-<name>.sources`。如果不希望 mise 生成仓库定义，请改用[`[bootstrap.files]`](/bootstrap/files.html#files-before-packages)写入定义。

## 固定版本

mise 会将固定版本以 `name=version` 的格式传递给 apt。版本与发行版相关，因此上文中的 `8.5.0-2ubuntu10` 仅为示例。请在目标机器上运行 `apt-cache policy curl` 查看可用版本，并固定到源中实际提供的版本。apt 源不再提供的版本无法通过 mise 安装。

## 软件包列表 {#metadata-refresh}

以下情况下，mise 会在安装前运行 `apt-get update`：`/var/lib/apt/lists` 中没有软件包列表（例如全新容器）；或模拟安装（`apt-get --simulate`，无需 root 权限）基于当前列表失败，例如列表中没有对应软件包或固定版本。模拟成功时，mise 会直接安装而不刷新列表。如需强制刷新：

```sh
mise bootstrap packages apply --update
```

## mise 会运行的命令

| 操作                            | 命令                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| 检查安装状态（无需 sudo）        | `dpkg-query -W <packages>`                                               |
| 安装                            | 必要时先运行 `apt-get update`，再运行 `apt-get install -y -- <packages>` |
| `apply --update`                | 先运行 `apt-get update`                                                  |
| 添加或更改源                    | 运行 `install -m 0644 /dev/stdin <file>`，然后运行 `apt-get update`      |
| 升级                            | 运行 `apt-get update`，然后运行 `apt-get install -y --only-upgrade -- <packages>` |

`upgrade` 只处理配置中已安装的软件包。apt 仍会安装升级时所需的新依赖项。

## 移除软件包

mise 不会移除 apt 软件包。删除条目后，软件包仍会保持安装状态；请自行运行 `apt-get remove`。
