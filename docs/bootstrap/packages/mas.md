# mas <Badge type="warning" text="experimental" />

通过 [`mas`](https://github.com/mas-cli/mas) CLI 安装 Mac App Store 应用。

```toml
[bootstrap.packages]
"brew:mas" = "latest"
"mas:497799835" = "latest"       # Xcode
```

`mas` 应用属于 `[bootstrap.packages]`，就像 apt 包、
Homebrew formulae 和 cask 一样。包名就是 App Store 应用 ID：
一个可被 `mas install` 和 `mas upgrade` 接受的数字 ADAM ID。

mise 不会隐式安装 `mas`。请先自行安装它，例如使用内置的 brew 管理器：

```toml
[bootstrap.packages]
"brew:mas" = "latest"
"mas:497799835" = "latest"
```

或者，如果你已经在全局配置了一个普通的 mise 工具，也可以这样安装：

```sh
mise use -g mas
```

## 命令

```sh
mise bootstrap packages use mas:497799835
mise bootstrap packages status
mise bootstrap packages apply --manager mas
mise bootstrap packages upgrade --manager mas
```

`mise bootstrap packages apply` 会为缺失的应用运行 `mas install <id>`。
`mise bootstrap packages upgrade` 会为已安装的应用运行 `mas upgrade <id>`。
这两个命令都需要数字形式的 ADAM ID；像
`com.apple.dt.Xcode` 这样的 bundle 标识符不是有效的软件包名称。

## 注意事项

`mas` 仅适用于 macOS，且必须位于 `PATH` 中。在其他平台上，或者当
`mas` 命令缺失时，共享配置会将这些条目标记为跳过，
而不是失败。像 `mise bootstrap packages apply
--manager mas` 这样的显式命令在 `mas` 不可用时仍会失败，这与其他
包管理器的行为一致。

Mac App Store 操作可能需要已登录 App Store 的 Apple 账户、macOS 身份验证、付费应用的先前购买/认领，以及有效的 Spotlight 索引。mise 会直接展示 `mas` 返回的错误，而不会尝试自行购买或认领应用。

## 查找 ID

使用 `mas search` 或复制 App Store URL 并提取数字 ID：

```sh
mas search xcode
```

例如，Xcode 的 App Store URL 包含 `id497799835`，因此包条目为：

```toml
[bootstrap.packages]
"mas:497799835" = "latest"
```
