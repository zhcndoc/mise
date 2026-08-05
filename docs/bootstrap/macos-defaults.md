# macOS 默认设置

mise 可以在 `mise.toml` 的 `[bootstrap.macos.defaults]` 部分中声明 macOS 用户默认设置（偏好设置），并通过
`mise bootstrap macos defaults apply` 或作为
[`mise bootstrap`](/bootstrap.html) 的一部分应用这些设置：

```toml
[bootstrap.macos.dock]
autohide = true
orientation = "left"
tilesize = 48
show_recents = false

[bootstrap.macos.finder]
show_all_files = true
show_pathbar = true
preferred_view_style = "list"

[bootstrap.macos.keyboard]
key_repeat = 2
initial_key_repeat = 15
press_and_hold = false

[bootstrap.macos.trackpad]
tap_to_click = true

[bootstrap.macos.defaults]
"com.apple.finder" = { AppleShowAllFiles = true }
```

这些整理后的部分会编译为原始的 defaults 条目。对于未被这些友好部分覆盖的偏好设置，请使用
`[bootstrap.macos.defaults]`。在同一个配置文件中，原始 defaults 会覆盖由友好设置生成的原始
`(domain, key)`。在不同配置文件之间，仍然遵循通常的全局到本地优先级，因此本地的友好设置可以覆盖全局原始默认值中的同一对 `(domain, key)`。

## 友好部分

`[bootstrap.macos.dock]` 支持：

| 键             | 原始默认值                     |
| -------------- | ------------------------------ |
| `autohide`      | `com.apple.dock.autohide`      |
| `orientation`   | `com.apple.dock.orientation`   |
| `tilesize`      | `com.apple.dock.tilesize`      |
| `magnification` | `com.apple.dock.magnification` |
| `largesize`     | `com.apple.dock.largesize`     |
| `show_recents`  | `com.apple.dock.show-recents`  |
| `mru_spaces`    | `com.apple.dock.mru-spaces`    |

`orientation` 必须是 `bottom`、`left` 或 `right`。

`[bootstrap.macos.finder]` 支持：

| 键                        | 原始默认值                                       |
| ------------------------- | ------------------------------------------------- |
| `show_all_files`          | `com.apple.finder.AppleShowAllFiles`              |
| `show_pathbar`            | `com.apple.finder.ShowPathbar`                    |
| `show_status_bar`         | `com.apple.finder.ShowStatusBar`                  |
| `show_extensions_warning` | `com.apple.finder.FXEnableExtensionChangeWarning` |
| `preferred_view_style`    | `com.apple.finder.FXPreferredViewStyle`           |

`preferred_view_style` 必须是 `icon`、`list`、`column` 或 `gallery`。

`[bootstrap.macos.keyboard]` 支持：

| 键                  | 原始默认值                                 |
| -------------------- | ------------------------------------------- |
| `key_repeat`         | `NSGlobalDomain.KeyRepeat`                  |
| `initial_key_repeat` | `NSGlobalDomain.InitialKeyRepeat`           |
| `press_and_hold`     | `NSGlobalDomain.ApplePressAndHoldEnabled`   |
| `fn_state`           | `NSGlobalDomain.com.apple.keyboard.fnState` |

`[bootstrap.macos.trackpad]` 支持：

| 键                 | 原始默认值                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tap_to_click`      | `com.apple.AppleMultitouchTrackpad.Clicking`, `com.apple.driver.AppleBluetoothMultitouch.trackpad.Clicking`                               |
| `three_finger_drag` | `com.apple.AppleMultitouchTrackpad.TrackpadThreeFingerDrag`, `com.apple.driver.AppleBluetoothMultitouch.trackpad.TrackpadThreeFingerDrag` |

未知的友好键、无效的枚举值以及不支持的值类型会发出警告并被忽略。

## 原始默认值

`[bootstrap.macos.defaults]` 下的每个键都是一个偏好域。包含点号的
域需要用引号括起来。值会映射到相应的 `defaults write` 类型：

| TOML 值   | 写入形式              | 示例                   |
| --------- | --------------------- | ---------------------- |
| boolean   | `-bool true/false`    | `autohide = true`      |
| integer   | `-int <n>`            | `tilesize = 48`        |
| float     | `-float <n>`          | `scale = 1.5`          |
| string    | `-string <s>`         | `orientation = "left"` |

其他 plist 结构（数组、字典、日期、数据）不受支持；使用它们的条目
解析不会有问题，但会在带有警告的情况下被跳过，因此为
更新版本 mise 编写的配置仍然可以正常工作。

## 语义

`[bootstrap.macos.defaults]` 遵循与
[`[bootstrap.packages]`](/bootstrap/packages/) 相同的规则：

- **声明式且可累加** — （domain, key）对会在
  [配置层级](/configuration.html)（全局 → 项目）之间按并集方式合并；更局部的配置可以覆盖全局配置为某个对声明的值，但不能移除它。mise 永远不会删除一个默认值。
- **受操作系统过滤** — 在 macOS 之外的任何系统上，该部分都不会生效：`mise bootstrap macos defaults status` 和 `mise doctor` 会将这些条目标记为已跳过（因此不会悄然不可见），而 `mise bootstrap macos defaults apply` 会忽略它们，所以为 Linux 和 macOS 同时编写的共享配置可以直接正常工作。
- **仅手动应用** — mise 从不隐式写入默认值；只有 `mise bootstrap macos defaults apply` 会在通常的确认提示之后执行写入。
- **严格类型** — 现有值只有在值和 plist 类型都匹配时才算同步：整数 `1` 不能满足配置中的 `true`。`mise bootstrap macos defaults apply` 会将其收敛为带类型的值。

用户默认值是按用户区分的，因此与系统包不同，绝不会涉及 sudo。不支持主机范围的偏好设置（`defaults -currentHost`）以及 `sudo defaults` 系统域。

## 命令

```sh
mise bootstrap macos defaults status            # 显示默认值偏离
mise bootstrap macos defaults status --missing  # 如果有任何未设置或不一致则退出 1

mise bootstrap macos defaults apply           # 写入未设置/不一致的默认值
mise bootstrap macos defaults apply --dry-run # 打印 `defaults write` 命令
mise bootstrap macos defaults apply --yes     # 跳过确认提示
```

`mise bootstrap macos defaults status` 将每一项报告为 `set`（匹配）、
`differs`（存在值但不匹配——会显示当前值）或
`unset`。`mise doctor` 会汇总相同的偏离情况。

## App 重启

有些应用程序只有在重新启动后才会应用已更改的默认设置——mise 会在写入后打印一条提醒，而顶层的 `mise bootstrap` 会在其最终的后续摘要中包含同样的提醒。常见对象如下：

```sh
killall Dock
killall Finder
killall SystemUIServer
```

mise 有意不自行终止应用程序。

## 查找键

要发现某个设置的域和键，请在“系统设置”中更改它，然后对比更改前后 `defaults read` 的输出，或者直接读取某个域：

```sh
defaults read com.apple.dock
defaults read-type com.apple.dock tilesize
```
