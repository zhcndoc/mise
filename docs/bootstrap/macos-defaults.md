---
description: "从 mise 配置中声明并应用 macOS 偏好设置"
socialDescription: "从 mise 配置中声明并应用 macOS 偏好设置"
---

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
"com.apple.finder" = { AppleShowAllFiles = false }
```

友好设置和原始默认值共享相同的偏好设置键。对于友好设置部分未涵盖的偏好设置，请使用
`[bootstrap.macos.defaults]`。在同一个配置文件中，原始默认值会覆盖由友好设置生成的
原始 `(domain, key)`。在不同配置文件之间，正常的全局到本地优先级仍然适用，因此本地友好设置可以
覆盖同一对键的全局原始默认值。

## 预览和应用

```sh
mise bootstrap macos defaults status
mise bootstrap macos defaults apply --dry-run
mise bootstrap macos defaults apply
```

以偏好设置应发生更改的用户身份应用。除非你有意需要覆盖，否则请为每个偏好设置选择一个友好键
或一个原始条目。该示例将友好设置 `show_all_files = true` 和原始设置
`AppleShowAllFiles = false` 同时设定，以演示在同一个文件中原始条目会获胜。

## 友好设置部分

`[bootstrap.macos.dock]` 支持：

| Key                      | 原始默认值                             |
| ------------------------ | --------------------------------------- |
| `autohide_delay`         | `com.apple.dock.autohide-delay`         |
| `autohide_time_modifier` | `com.apple.dock.autohide-time-modifier` |
| `autohide`               | `com.apple.dock.autohide`               |
| `orientation`            | `com.apple.dock.orientation`            |
| `tilesize`               | `com.apple.dock.tilesize`               |
| `magnification`          | `com.apple.dock.magnification`          |
| `largesize`              | `com.apple.dock.largesize`              |
| `show_recents`           | `com.apple.dock.show-recents`           |
| `mru_spaces`             | `com.apple.dock.mru-spaces`             |

`autohide_delay` 和 `autohide_time_modifier` 接受整数或浮点数，例如
`0` 和 `0.5`。

`orientation` 必须是 `bottom`、`left` 或 `right`。

`[bootstrap.macos.finder]` 支持：

| Key                           | 原始默认值                                        |
| ----------------------------- | -------------------------------------------------- |
| `sort_folders_first`          | `com.apple.finder._FXSortFoldersFirst`             |
| `save_new_documents_to_cloud` | `NSGlobalDomain.NSDocumentSaveNewDocumentsToCloud` |
| `show_all_files`              | `com.apple.finder.AppleShowAllFiles`               |
| `show_pathbar`                | `com.apple.finder.ShowPathbar`                     |
| `show_status_bar`             | `com.apple.finder.ShowStatusBar`                   |
| `show_extensions_warning`     | `com.apple.finder.FXEnableExtensionChangeWarning`  |
| `preferred_view_style`        | `com.apple.finder.FXPreferredViewStyle`            |

`save_new_documents_to_cloud` 控制应用程序保存对话框的默认保存位置，而且是全局控制，
尽管它被归类在 `finder` 下。

`preferred_view_style` 必须是 `icon`、`list`、`column` 或 `gallery`。

`[bootstrap.macos.keyboard]` 支持：

| Key                             | 原始默认值                                           |
| ------------------------------- | ----------------------------------------------------- |
| `automatic_capitalization`      | `NSGlobalDomain.NSAutomaticCapitalizationEnabled`     |
| `automatic_spelling_correction` | `NSGlobalDomain.NSAutomaticSpellingCorrectionEnabled` |
| `key_repeat`                    | `NSGlobalDomain.KeyRepeat`                            |
| `initial_key_repeat`            | `NSGlobalDomain.InitialKeyRepeat`                     |
| `press_and_hold`                | `NSGlobalDomain.ApplePressAndHoldEnabled`             |
| `fn_state`                      | `NSGlobalDomain.com.apple.keyboard.fnState`           |

`[bootstrap.macos.trackpad]` 支持：

| 键                 | 原始默认值                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tap_to_click`      | `com.apple.AppleMultitouchTrackpad.Clicking`、`com.apple.driver.AppleBluetoothMultitouch.trackpad.Clicking`                               |
| `three_finger_drag` | `com.apple.AppleMultitouchTrackpad.TrackpadThreeFingerDrag`、`com.apple.driver.AppleBluetoothMultitouch.trackpad.TrackpadThreeFingerDrag` |

未知的友好键、无效的枚举值和不受支持的值类型会产生警告并被忽略。

## Dock 应用程序

使用 `apps` 按顺序声明固定的应用程序：

```toml
[bootstrap.macos.dock]
apps = [
  "/System/Applications/Utilities/Terminal.app",
  "/Applications/Firefox.app",
  "~/Applications/Example.app",
]
```

路径必须是绝对路径或以 `~/` 开头，以 `.app` 结尾，并且不能包含 `..` 组件。
重复路径（包括指向同一应用程序的符号链接）会被拒绝。每个声明的应用程序都必须在更改后的布局
可以应用之前作为目录存在。省略 `apps` 可保持布局不变；`apps = []` 会移除所有已识别的应用程序磁贴。

该列表负责管理固定在 `com.apple.dock` 的 `persistent-apps` 偏好设置中的应用程序。应用时会添加、
移除并重新排列这些应用程序，同时保留现有磁贴的书签和元数据。匹配应用程序时会解析符号链接；
新磁贴会保留声明的路径。非应用程序磁贴和未识别的磁贴会被保留，`persistent-others` 不受影响。
正在运行但未固定的应用程序和最近使用的应用程序部分不在此列表中。

状态会比较应用程序路径和顺序，因此 Dock 添加的元数据不会造成偏离。手动移动固定的应用程序会造成
偏离；应用时会恢复声明的顺序。没有捕获或同步操作。

通常的优先级规则适用：同一文件中的原始 `persistent-apps` 会覆盖 `apps`，而跨文件时更本地的配置
优先。生效的原始声明会保持精确的 plist 比较和整体值替换。`defaults_entries` 在同一文件中具有
高于简写默认值的通常优先级。

与其他 Dock 偏好设置一样，mise 不会重启 Dock。应用后可以在方便时重新启动它（`killall Dock`），
或者使用下面所述的现有 `post-defaults` hook。

## 原始默认值

`[bootstrap.macos.defaults]` 下的每个键都是一个偏好设置域。包含点号的域需要加引号。
TOML 值按如下方式映射为 property-list 类型：

| TOML 值   | property-list 类型 | 示例                           |
| ---------- | ------------------ | ------------------------------ |
| boolean    | boolean            | `autohide = true`              |
| integer    | integer            | `tilesize = 48`                |
| float      | real               | `scale = 1.5`                  |
| string     | string             | `orientation = "left"`         |
| array      | array              | `favorite-spaces = [1, 2, 3]`  |
| table      | dictionary         | `options = { enabled = true }` |

数组和表会递归转换，因此嵌套值会保留其类型。例如，Dock 条目可以声明为字典数组：

```toml
[bootstrap.macos.defaults."com.apple.dock"]
"persistent-apps" = [
  { "tile-type" = "file-tile", "tile-data" = { "file-label" = "Terminal" } },
]
```

配置的值会替换整个偏好设置值；数组和字典不会逐个元素合并。TOML 日期和时间不受支持，
会跳过并显示警告。二进制 plist 数据没有原生 TOML 类型，同样不受支持。

## 语义

`[bootstrap.macos.defaults]` 遵循与
[`[bootstrap.packages]`](/bootstrap/packages/) 相同的规则：

- **声明式且追加式** —（domain、key）对会跨越
  [配置层级](/configuration.html)（全局 → 项目）以并集方式合并；更本地的配置会覆盖全局配置
  声明的某个键值对，但不能移除它。mise 永远不会删除默认值。
- **按操作系统筛选** — 在 macOS 之外的任何系统上，此部分均不生效：
  `mise bootstrap macos defaults status` 和 `mise doctor` 会将条目标记为已跳过（因此不会静默隐藏），
  而 `mise bootstrap macos defaults apply` 会忽略它们，因此为 Linux 和 macOS 编写的共享配置可以
  原样使用。
- **仅手动应用** — mise 永远不会隐式写入默认值；只有
  `mise bootstrap macos defaults apply` 或完整的 `mise bootstrap` 才会执行，并且会在通常的确认
  提示之后进行。
- **严格类型化** — 只有值和 plist 类型都匹配时，现有值才会被视为同步：整数 `1` 不会满足配置的
  `true`。`mise bootstrap macos defaults apply` 会将其收敛为类型匹配的值。

用户默认值是按用户设置的，因此与系统软件包不同，它们从不涉及 sudo。不支持 `sudo defaults`
系统域。

## 当前主机偏好设置

对于通常使用 `defaults -currentHost` 写入的偏好设置，请使用显式条目：

```toml
[[bootstrap.macos.defaults_entries]]
domain = "NSGlobalDomain"
key = "com.apple.mouse.tapBehavior"
host = "current"
value = 1
```

条目接受与 `defaults` 相同的类型化值，包括数组和表。可选的 `host` 默认为 `"any"`；
`"current"` 会将读取、写入和同步限定在当前主机。同一个域和键可以在每个范围内独立管理。

偏好设置会按照域、键和主机从全局到本地合并。显式条目会覆盖同一文件中的简写默认值。
全局域别名 `-g` 和 `-globalDomain` 与 `NSGlobalDomain` 共享相同的标识。

状态会用 `(current host)` 标记当前主机域，JSON 条目会包含 `host`。标量试运行会包含
`-currentHost`。

## 目标字典更新

向默认值条目添加 `path`，即可在共享字典中管理嵌套值，而不会替换其同级项。例如，禁用一个
符号快捷键，同时保留其参数和其他快捷键：

```toml
[[bootstrap.macos.defaults_entries]]
domain = "com.apple.symbolichotkeys"
key = "AppleSymbolicHotKeys"
path = ["64", "enabled"]
value = false
```

每个 `path` 组件都是字面量字典键，因此组件中的点号不会作为分隔符。路径必须至少包含一个组件。
`value` 接受与 `defaults` 相同的类型，并完整替换选中的值，包括该值为数组或字典的情况。不支持
数组索引。

路径同时适用于 `host = "any"`（默认值）和 `host = "current"`。Mise 会读取所选主机范围中的
现有 plist，应用补丁，然后写入更新后的值。未选中的值会保留其类型，包括数据和日期。缺失的父级
字典会被创建；路径中的现有标量或数组会导致错误。状态只比较选中的值，试运行输出会显示其路径。

具有相同域、键、主机和路径的声明会从全局到本地合并，最后一个值获胜。同一偏好设置和主机的
祖先／后代补丁，或补丁与整体值声明，会在写入前被拒绝。所有补丁值都会在第一次偏好设置写入前
准备完成。与其他偏好设置一样，应用程序可能会并发更改某个值；这不是与这些应用程序之间的原子事务。

## 命令

```sh
mise bootstrap macos defaults status            # 显示默认值偏离
mise bootstrap macos defaults status --missing  # 如果有任何未设置或不一致则退出 1

mise bootstrap macos defaults apply           # 写入未设置或不一致的默认值
mise bootstrap macos defaults apply --dry-run # 打印计划写入的偏好设置
mise bootstrap macos defaults apply --yes     # 跳过确认提示
```

`mise bootstrap macos defaults status` 会将每一项报告为 `set`（匹配）、
`differs`（存在值但不匹配——会显示当前值）或
`unset`。`mise doctor` 会汇总相同的偏离情况。

## 应用重启

有些应用程序只有在重新启动后才会应用已更改的默认设置——mise 会在写入后打印一条提醒，而顶层的 `mise bootstrap` 会在其最终的后续摘要中包含同样的提醒。常见对象如下：

```sh
killall Dock
killall Finder
killall SystemUIServer
```

mise 不会自行终止应用程序。在 `mise bootstrap`
写入默认值后，后续摘要会提醒你重新启动应用；常见的
`post-defaults` hook 如下：

```toml
[bootstrap.hooks.post-defaults]
run = "killall Dock || true"
```

存储的值可能已经匹配，但 Dock 或 Finder 仍然显示其之前的行为。请检查状态，然后在方便时重新启动
受影响的应用。每次选中的 bootstrap 都会运行 post-defaults hook，即使没有偏好设置发生更改；
如果不希望如此，请使用上面的手动命令。

## 查找键

要发现某个设置的域和键，请在“系统设置”中更改它，然后对比更改前后 `defaults read` 的输出，或者直接读取某个域：

```sh
defaults read com.apple.dock
defaults read-type com.apple.dock tilesize
```
