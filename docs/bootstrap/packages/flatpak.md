# Flatpak

通过
[`flatpak`](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) CLI
系统范围安装的 Flatpak 应用程序和运行时。

```toml
[bootstrap.packages]
"flatpak:org.mozilla.firefox" = "latest"
"flatpak:org.gnome.Builder" = "latest"
```

Flatpak 软件包属于 `[bootstrap.packages]`，与 apt 软件包、
Homebrew 公式和 Mac App Store 应用程序一样。软件包名称是
`flatpak install` 和 `flatpak update` 接受的应用程序或运行时 ID。

mise 不会隐式安装 Flatpak 或配置远程仓库。在应用配置之前，请安装
`flatpak` CLI 并添加所需的远程仓库（通常是 Flathub）：

```sh
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
mise bootstrap packages use flatpak:org.mozilla.firefox
```

## 命令

```sh
mise bootstrap packages status --manager flatpak
mise bootstrap packages apply --manager flatpak
mise bootstrap packages upgrade --manager flatpak
```

mise 管理系统范围的 Flatpak 安装。对于缺失的软件包，`apply` 会运行
`flatpak install --system --noninteractive <id>`；对于已安装的软件包，`upgrade` 会运行
`flatpak update --system --noninteractive <id>`。Flatpak 会从系统远程仓库中解析配置的 ID。

Flatpak 不支持通过这些命令安装任意历史版本，因此不支持版本固定。在配置中使用 `"latest"`。

该管理器仅适用于 Linux，并要求 `flatpak` 位于 `PATH` 中。在其他平台上，
或当缺少该命令时，共享配置会将 Flatpak 条目列为已跳过。
