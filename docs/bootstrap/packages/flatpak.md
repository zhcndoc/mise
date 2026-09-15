---
description: "通过 flatpak CLI 在系统范围或当前用户范围安装的 Flatpak 应用程序和运行时。"
---

# Flatpak

通过
[`flatpak`](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) CLI
以系统范围或当前用户范围安装的 Flatpak 应用程序和运行时。

```toml
[bootstrap.packages]
"flatpak:org.mozilla.firefox" = "latest"
"flatpak-user:org.gnome.Builder" = "latest"
```

使用 `flatpak` 管理器进行默认的系统范围安装，使用
`flatpak-user` 进行当前用户范围的安装。两者的作用域彼此独立，
因此配置可以管理其中任一作用域或同时管理两者，包括在两个作用域中使用相同的 ID。软件包名称是
`flatpak install` 和 `flatpak update` 所接受的应用程序或运行时 ID。

mise 不会隐式安装 Flatpak 或配置远程仓库。在应用配置之前，请安装
`flatpak` CLI 并添加所需的远程仓库（通常是 Flathub）：

```sh
# Choose the scope you intend to manage:
flatpak remote-add --system --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
mise bootstrap packages use flatpak:org.mozilla.firefox
mise bootstrap packages use flatpak-user:org.gnome.Builder
```

在安装前检查同一作用域中的远程仓库配置：

```sh
flatpak remotes --system
flatpak remotes --user
```

在用户作用域中添加 Flathub 不会使其对 `flatpak:` 系统条目可用。当多个远程仓库提供同一个 ID 时，请在 Flatpak 的配置中解决歧义；mise 声明不会按名称选择远程仓库。

## 命令

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager flatpak --dry-run
mise bootstrap packages apply --manager flatpak
mise bootstrap packages apply --manager flatpak-user
mise bootstrap packages upgrade --manager flatpak
mise bootstrap packages upgrade --manager flatpak-user
```

mise 始终向 Flatpak 传递明确的作用域，因此状态、应用和升级操作会针对同一安装执行。`flatpak` 传递 `--system`，而 `flatpak-user` 传递 `--user`。Flatpak 会从为该作用域配置的远程仓库中解析所配置的 ID。

Flatpak 不支持通过这些命令安装任意历史版本，因此不支持版本固定。在配置中使用 `"latest"`。

该管理器仅适用于 Linux，并要求 `flatpak` 位于 `PATH` 中。在其他平台上，或当缺少该命令时，共享配置会将 Flatpak 条目标记为已跳过。安装应用不会创建 mise shim；请通过桌面环境启动它，或在安装该应用的作用域中使用
`flatpak run org.mozilla.firefox` 启动它。
