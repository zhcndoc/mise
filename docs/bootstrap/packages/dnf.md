---
description: "在 mise.toml 中声明 Fedora、RHEL、Rocky Linux 和 AlmaLinux 软件包，并通过 dnf 安装。"
---

# Fedora 和 RHEL 软件包（dnf）

`dnf` 管理器可在 Fedora、RHEL、CentOS Stream、Rocky Linux、AlmaLinux 和其他使用 `dnf` 的发行版上安装软件包。mise 未以 root 身份运行时会使用 [sudo](/bootstrap/packages/#sudo)。

```toml
[bootstrap.packages]
"dnf:openssl-devel" = "latest"
"dnf:postgresql-server" = "latest"
"dnf:bash" = "5.2.26-3.fc40" # version-release pin
```

```sh
mise bootstrap packages apply --manager dnf --dry-run
mise bootstrap packages apply --manager dnf
```

## 前置条件

在 `PATH` 中能找到 `dnf` 的 Linux 系统上可以使用此管理器。仅提供 `yum` 的系统（例如 CentOS 7）不受支持。在其他机器上，其条目会显示为[`skipped`](/bootstrap/packages/#choose-platforms)。

## 软件包名称

请使用软件包名称，例如 `openssl-devel`，不要使用 capability 或文件路径。mise 会通过 `rpm -q` 查询软件包名称，以检查安装状态。

## 软件包组

以 `@` 开头的名称（例如 `"dnf:@development-tools"`）表示 dnf 软件包组。mise 会通过 `dnf group list --installed` 检查，而不是运行 `rpm -q`；使用 `dnf install -y @<group>` 安装，并通过 `dnf group upgrade` 升级。软件包组没有版本，因此请使用 `"latest"`。不支持环境组（`@^name`）。

## COPR 仓库 {#copr}

请在 `[bootstrap.dnf.repos]` 中声明 [COPR](https://copr.fedorainfracloud.org/) 项目。mise 会在安装或升级 `dnf:` 软件包前启用这些仓库，因此无需使用 `pre-packages` 钩子也可从 COPR 安装软件包：

```toml
[bootstrap.dnf.repos]
ghostty = { copr = "scottames/ghostty" }
caddy = { copr = "@caddy/caddy" }

[bootstrap.packages]
"dnf:ghostty" = "latest"
"dnf:caddy" = "latest"
```

`copr` 使用 `owner/project` 指定项目；群组项目则使用 `@group/project`。`copr:` 前缀可加可不加。条目名称仅用于标识，因此更接近当前目录的配置可以替换同名条目。名称可以包含字母、数字、`_`、`-` 和 `.`。

mise 会按照 `dnf copr enable` 的方式启用 COPR：下载 COPR 为当前发行版发布的仓库文件，并原样写入 `/etc/yum.repos.d/_copr:copr.fedorainfracloud.org:<owner>:<project>.repo`。群组所有者会以 `group_<name>` 的形式写入该文件。这与 copr 插件使用的文件相同，因此：

- 已通过 `dnf copr enable` 启用的 COPR 会被视为已启用，mise 不会更改它。
- `dnf copr list`、`dnf copr disable` 和 `dnf copr remove` 命令也适用于 mise 启用的 COPR。
- 无需安装 copr 插件；相同配置也适用于会分层安装软件包的 [Fedora Atomic 主机](#fedora-atomic-hosts)。

只有在仓库文件缺失或其中的仓库已禁用时，mise 才会下载该文件；所有 COPR 均已启用时不会使用网络。文件中会标明 COPR 签名密钥，dnf 首次从该仓库安装软件包时会导入密钥。未传入 `--yes` 时，mise 会在启用 COPR 前询问，安装软件包前也一样。

mise 会像 copr 插件一样，根据 `/etc/os-release` 选择 COPR 构建目标（chroot）；如果设置了 `PLATFORM_ID`，则从中读取基础发行版版本。Fedora 及其衍生发行版（例如 Bazzite）使用 `fedora-<version>`，Rawhide 使用 `fedora-rawhide`。RHEL、CentOS Stream 及其重构版（例如 Rocky Linux、AlmaLinux、Oracle Linux 和 Alibaba Cloud Linux）使用 `epel-<major version>`。Amazon Linux 使用 `amazonlinux-<version>`。如果项目没有适用于当前发行版的构建版本，mise 会列出它支持的 chroot。无法启用的 COPR 会与本次运行中的其他失败一起报告；其他仓库和软件包仍会继续应用。对于不[分层安装软件包](#fedora-atomic-hosts)的 ostree 主机，mise 不会启用 COPR，因为它不会在那里安装软件包。

mise 不会禁用或移除仓库。删除条目后 COPR 仍会保持启用；请自行运行 `dnf copr remove <owner>/<project>` 或删除其仓库文件。

## Version pins

mise 会将固定版本以 `name-version` 或 `name-version-release` 的格式传递给 dnf。只固定版本号时（例如 `"5.2.26"`），任一发行版版本都可接受。上文的 Fedora 版本固定仅为示例：不同发行版及版本使用的 release 字符串并不相同。请从目标系统已启用的仓库中选择版本；mise 不会获取归档 RPM。

## mise 会运行的命令

| 操作                            | 命令                                  |
| ------------------------------- | ------------------------------------- |
| 检查安装状态（无需 sudo）        | `rpm -q <packages>`                   |
| 安装                            | `dnf install -y <packages>`           |
| `apply --update`                | `dnf install -y --refresh <packages>` |
| 升级                            | `dnf upgrade -y --refresh <packages>` |

未传入 `--update` 时，dnf 会在自身缓存过期后刷新元数据。`upgrade` 只处理配置中已安装的软件包。

## Fedora Atomic 主机

从 ostree 镜像启动的主机（Silverblue、Kinoite、Bazzite、Bluefin、secureblue）中，`/usr` 为只读目录，因此无法使用 `dnf install`。mise 会通过 `/run/ostree-booted` 检测这种情况。bootc Containerfile 中的构建并非从镜像启动，因此其中 `dnf` 可以正常运行。

默认情况下 mise 会停止并说明原因，因为这些系统不建议分层安装软件包；为 Fedora Workstation 编写的配置也不应在此悄悄分层安装大量软件包。状态检查仍然有效，因为 `rpm -q` 可以查询已启动镜像中的软件包。如需让 mise 使用 `rpm-ostree` 分层安装软件包，请显式启用：

```toml
[settings]
system_packages.ostree = "layer"
```

启用 `layer` 后：

- `apply` 会在单个 `rpm-ostree install --idempotent --allow-inactive` 事务中安装所有缺失的软件包（每次调用都会生成新的部署）；如果传入 `--update`，会先运行 `rpm-ostree refresh-md`。完成后会提示需要重启。和通常情况一样，此操作会使用 [sudo](/bootstrap/packages/#sudo)。
- 已为下一次部署请求的软件包会被视为已安装，并显示 `pending reboot`，因此下次运行时不会再次请求安装。
- 固定版本会发出警告并跳过，因为固定分层软件包版本会妨碍基础镜像更新。
- `state = "absent"` 会运行 `rpm-ostree uninstall`。
- `upgrade` 会失败并提示运行 `rpm-ostree upgrade`：分层软件包只能与基础镜像一同更新，因此 mise 无法逐个升级。

| 操作（`layer`）      | 命令                                                          |
| ------------------- | ------------------------------------------------------------- |
| 安装                | `rpm-ostree install --idempotent --allow-inactive <packages>` |
| `apply --update`    | `rpm-ostree refresh-md`，然后运行安装命令                      |
| 移除                | `rpm-ostree uninstall <packages>`                             |

## 移除软件包

在使用分层安装的 ostree 主机之外，mise 不会移除 dnf 软件包。删除条目后软件包仍会保持安装；请自行运行 `dnf remove`。
