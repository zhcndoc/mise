---
description: "在 mise.toml 中设置 macOS 用户偏好，例如 Dock、Finder、键盘和触控板选项，效果与 defaults 命令相同。"
socialDescription: "在 mise.toml 中设置 macOS 用户偏好，效果与 defaults 命令相同。"
---

# macOS 默认设置

在 `mise.toml` 中声明 macOS 偏好设置，然后运行 [`mise bootstrap`](/bootstrap.html) 或 [`mise bootstrap macos defaults apply`](/cli/bootstrap/macos/defaults/apply.html)；mise 会像 `defaults` 命令一样写入这些设置。常见的 Dock、Finder、键盘和触控板设置有对应的命名键；其他设置则按域和键放入 `[bootstrap.macos.defaults]`。

## 示例

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
"com.apple.screencapture" = { type = "png", "disable-shadow" = true }
```

请以需要更改偏好设置的用户身份应用：

```sh
mise bootstrap macos defaults apply --dry-run
mise bootstrap macos defaults apply
```

mise 只会写入缺失或不同的偏好设置，其余设置保持不变。Dock、Finder 和菜单栏的许多偏好设置只有在应用启动时才会读取，因此需要[重新启动这些应用](#app-restarts)才能看到更改。

## 命名设置 {#friendly-sections}

每个命名键会写入一项偏好设置，触控板键会写入两项。未知键、类型错误的值或超出所列选项的值都会被忽略，并显示警告。

`[bootstrap.macos.dock]` 会写入 `com.apple.dock` 域：

| 配置键                    | 偏好设置键               | 值                                                                         |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| `autohide`               | `autohide`               | 布尔值：指针未移至 Dock 上时隐藏 Dock                                      |
| `autohide_delay`         | `autohide-delay`         | 隐藏的 Dock 出现前等待的秒数，例如 `0`                                      |
| `autohide_time_modifier` | `autohide-time-modifier` | 显示和隐藏动画持续的秒数，例如 `0.5`                                        |
| `orientation`            | `orientation`            | `"bottom"`（底部）、`"left"`（左侧）或 `"right"`（右侧）                   |
| `tilesize`               | `tilesize`               | 图标大小，整数                                                               |
| `magnification`          | `magnification`          | 布尔值：放大指针下方的图标                                                   |
| `largesize`              | `largesize`              | 放大后图标的大小，整数                                                       |
| `show_recents`           | `show-recents`           | 布尔值：在 Dock 中显示最近使用的应用                                         |
| `mru_spaces`             | `mru-spaces`             | 布尔值：按最近使用情况重新排列桌面空间                                       |
| `apps`                   | `persistent-apps`        | 应用路径列表；参见[固定 Dock 应用](#dock-applications)                       |

除一个键外，`[bootstrap.macos.finder]` 都会写入 `com.apple.finder` 域：

| 配置键                        | 域                  | 偏好设置键                           | 值                                                             |
| ----------------------------- | ------------------ | ----------------------------------- | -------------------------------------------------------------- |
| `show_all_files`              | `com.apple.finder` | `AppleShowAllFiles`                 | 布尔值：显示隐藏文件                                              |
| `show_pathbar`                | `com.apple.finder` | `ShowPathbar`                       | 布尔值：显示路径栏                                                |
| `show_status_bar`             | `com.apple.finder` | `ShowStatusBar`                     | 布尔值：显示状态栏                                                |
| `show_extensions_warning`     | `com.apple.finder` | `FXEnableExtensionChangeWarning`    | 布尔值：更改文件扩展名之前发出警告                                |
| `sort_folders_first`          | `com.apple.finder` | `_FXSortFoldersFirst`               | 布尔值：按名称排序时将文件夹置顶                                  |
| `preferred_view_style`        | `com.apple.finder` | `FXPreferredViewStyle`              | `"icon"`（图标）、`"list"`（列表）、`"column"`（分栏）或 `"gallery"`（图库） |
| `save_new_documents_to_cloud` | `NSGlobalDomain`   | `NSDocumentSaveNewDocumentsToCloud` | 布尔值：所有应用默认将新文稿存储到 iCloud                         |

`[bootstrap.macos.keyboard]` 会写入 `NSGlobalDomain`：

| 配置键                          | 偏好设置键                              | 值                                                              |
| ------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `key_repeat`                    | `KeyRepeat`                            | 整数：按键重复间隔；值越低，重复越快                                 |
| `initial_key_repeat`            | `InitialKeyRepeat`                     | 整数：按住按键后开始重复前的延迟；值越低，延迟越短                   |
| `press_and_hold`                | `ApplePressAndHoldEnabled`             | 布尔值：设为 `false` 后，按住按键会重复输入，而不是显示重音选项       |
| `automatic_capitalization`      | `NSAutomaticCapitalizationEnabled`     | 布尔值                                                            |
| `automatic_spelling_correction` | `NSAutomaticSpellingCorrectionEnabled` | 布尔值                                                            |
| `fn_state`                      | `com.apple.keyboard.fnState`           | 布尔值：设为 `true` 后，F1 至 F12 会作为标准功能键使用               |

`[bootstrap.macos.trackpad]` 会将每个键同时写入 `com.apple.AppleMultitouchTrackpad` 和 `com.apple.driver.AppleBluetoothMultitouch.trackpad`，分别适用于内置触控板和蓝牙触控板：

| 配置键               | 偏好设置键                 | 值                               |
| ------------------- | ------------------------- | -------------------------------- |
| `tap_to_click`      | `Clicking`                | 布尔值：轻点以点按                   |
| `three_finger_drag` | `TrackpadThreeFingerDrag` | 布尔值：使用三指拖移                   |

## 固定 Dock 应用 {#dock-applications}

`apps` 按顺序声明固定在 Dock 中的应用：

```toml
[bootstrap.macos.dock]
apps = [
  "/System/Applications/Utilities/Terminal.app",
  "/Applications/Firefox.app",
  "~/Applications/Example.app",
]
```

路径必须是绝对路径或以 `~/` 开头，以 `.app` 结尾，且不能包含 `..`。重复项（包括指向同一应用的符号链接）会被拒绝。mise 应用新的布局前，每个应用都必须已存在。省略 `apps` 表示保留现有布局；`apps = []` 会移除 mise 能识别的所有应用图标。

mise 会在 `com.apple.dock` 的 `persistent-apps` 偏好设置中添加、移除和重新排序应用，并保留每个现有图标的书签和元数据。它会解析符号链接来匹配应用；新图标则保留你声明的路径。其他类型的图标以及 mise 无法识别的图标都会保持原样；存放 Dock 文件夹和文件的 `persistent-others` 不会更改。未固定到 Dock 的运行中应用和最近使用的应用区域不属于此列表。

状态检查会比较路径和顺序，因此 Dock 添加的元数据不会被视为变更。手动移动已固定的应用则会被视为变更，下次 apply 时会恢复声明的顺序。mise 没有将当前 Dock 布局写入配置的命令。

## 登录时打开应用 {#login-items}

`[bootstrap.macos.login_items]` 用于声明登录时打开的应用，对应“系统设置 → 通用 → 登录项与扩展 → 登录时打开”列表：

```toml
[bootstrap.macos.login_items]
apps = [
  "/Applications/Bitwarden.app",
  "/Applications/Ghostty.app",
  "~/Applications/Example.app",
]
```

路径遵循 [`dock.apps`](#dock-applications) 的相同规则：必须是绝对路径或以 `~/` 开头，以 `.app` 结尾，不包含 `..`，且不能重复。

默认情况下，此列表采用追加模式。`mise bootstrap status` 会报告缺失的已声明应用，`apply` 会添加这些应用；未声明的条目则保持不变，因为 Rectangle 等应用会自行注册。设置 `exclusive = true` 可让配置完全接管该列表，此时 `apply` 也会移除未声明的条目：

```toml
[bootstrap.macos.login_items]
apps = ["/Applications/Ghostty.app"]
exclusive = true
```

跨配置文件时，`apps` 会合并，并以最接近项目的 `exclusive` 设置为准。选中多个配置根目录时，只有所有设置了 `exclusive` 的根目录都将其设为 `true`，该选项才会生效。

mise 使用 `LSSharedFileList` API 管理此列表，因为 `SMAppService` 只能注册调用它的应用。Apple 从 macOS 10.11 起已弃用该 API，但它目前仍可用。若未来 macOS 将其移除，mise 会报错且不会更改任何内容。`mise bootstrap macos defaults apply` 会同时应用登录项和默认设置。

## 原始默认值

`[bootstrap.macos.defaults]` 下的每个键都是一个偏好设置域，其中的每个键则是一项偏好设置。域名中包含点号时请加引号。TOML 值会转换为对应的属性列表类型：

| TOML 值    | 属性列表类型        | 示例                           |
| ---------- | ------------------ | ------------------------------ |
| 布尔值      | 布尔值              | `autohide = true`              |
| 整数       | 整数               | `tilesize = 48`                |
| 浮点数      | 实数               | `scale = 1.5`                  |
| 字符串      | 字符串              | `orientation = "left"`         |
| 数组       | 数组               | `favorite-spaces = [1, 2, 3]`  |
| 表         | 字典               | `options = { enabled = true }` |

数组和表会递归转换，因此嵌套值会保留其类型。例如，Dock 条目可以是由字典组成的数组：

```toml
[bootstrap.macos.defaults."com.apple.dock"]
"persistent-apps" = [
  { "tile-type" = "file-tile", "tile-data" = { "file-label" = "Terminal" } },
]
```

声明的值会替换整个偏好设置；mise 不会逐项合并数组或字典。若要更改字典中的单个值，请参见[更改字典中的单个值](#targeted-dictionary-updates)。TOML 日期和时间会被跳过并显示警告；TOML 没有二进制数据类型，因此也不支持此类值。

### 查找偏好设置的域和键 {#finding-keys}

在“系统设置”中更改选项，然后比较更改前后的 `defaults read` 输出；也可以直接读取某个域：

```sh
defaults read com.apple.dock
defaults read-type com.apple.dock tilesize
```

## 显式条目

偏好设置需要指定主机范围或字典内路径时，请使用 `[[bootstrap.macos.defaults_entries]]`。每个条目可以设置：

| 字段     | 值                                                                                    |
| -------- | -------------------------------------------------------------------------------------- |
| `domain` | 偏好设置域，例如 `"NSGlobalDomain"`；`-g` 和 `-globalDomain` 含义相同                  |
| `key`    | 偏好设置键                                                                             |
| `value`  | 上表中任意类型                                                                         |
| `host`   | `"any"`（默认值）或 `"current"`                                                       |
| `path`   | 偏好设置中字典键组成的列表                                                             |

### 当前主机偏好设置

使用 `defaults -currentHost` 写入的偏好设置需要设置 `host = "current"`：

```toml
[[bootstrap.macos.defaults_entries]]
domain = "NSGlobalDomain"
key = "com.apple.mouse.tapBehavior"
host = "current"
value = 1
```

之后 mise 只会读取、写入并同步此机器上的偏好设置。同一域和键可在不同范围内分别管理。状态信息会在这些域后标注 `(current host)`，JSON 条目会包含 `host`，单个布尔值、数字或字符串的 dry run 输出则会显示 `-currentHost`。

### 更改字典中的单个值 {#targeted-dictionary-updates}

添加 `path` 可更改共享字典中的一个值，而不替换其周围的其他值。以下示例会关闭一个键盘快捷键，同时保留该快捷键的其他设置和所有其他快捷键：

```toml
[[bootstrap.macos.defaults_entries]]
domain = "com.apple.symbolichotkeys"
key = "AppleSymbolicHotKeys"
path = ["64", "enabled"]
value = false
```

`path` 中的每个元素都是字面量字典键，因此元素中的点号不会被视为分隔符。路径至少需要一个元素，且不支持数组索引。`value` 会完整替换选中的值，即使该值是数组或字典也一样。

mise 会读取选定主机范围内已有的偏好设置，更改指定值后再写回结果。其他值会保留原类型，包括数据和日期。路径中缺失的字典会自动创建；路径上的已有值若不是字典，则会报错。状态检查只比较选定值，dry run 会显示其路径。如果应用运行时会重写此偏好设置，请先退出该应用。

同一偏好设置和主机范围下，如果两个条目的路径互相包含，或一个条目指定路径、另一个条目声明整个值，mise 会在写入前拒绝这些条目。

## 沙盒应用

Safari 等沙盒应用会将偏好设置保存在 `~/Library/Containers/<domain>/Data/Library/Preferences/<domain>.plist`，而不是 `~/Library/Preferences` 中。如果 `~/Library/Containers/<domain>` 存在，mise 就会读写该容器中的文件；当前主机条目则使用容器的 `ByHost` 目录。这些文件与 `defaults` 使用的文件相同。

尚未启动过的应用还没有容器，因此请先启动一次，再应用其偏好设置。macOS 会保护其他应用的容器，所以终端可能需要“完全磁盘访问权限”（系统设置 > 隐私与安全性），`apply` 才能写入这些文件。

## 配置合并方式 {#semantics}

偏好设置会在[配置层级](/configuration.html#configuration-hierarchy)中按域、键、主机范围和路径合并。更接近项目的配置可以更改较不具体配置声明的值，但不能移除该设置；mise 永远不会删除偏好设置。

命名设置和原始 defaults 会写入相同的偏好设置。在同一个配置文件中，对于相同域和键，`[bootstrap.macos.defaults]` 的值优先于命名设置，而 `[[bootstrap.macos.defaults_entries]]` 条目又优先于两者。因此，同一文件中的原始 `persistent-apps` 值会替换 `apps`，并作为整体进行比较。跨文件时仍由更接近项目的配置优先，因此项目中的命名设置会覆盖全局配置中的原始默认值。

只有值及其类型都匹配时才算已设置：整数 `1` 不等同于 `true`，apply 会将其重写为布尔值。偏好设置属于当前用户，因此 mise 不会对其使用 `sudo`，也不支持通过 `sudo defaults` 写入的系统级域。

## 重新启动受影响的应用 {#app-restarts}

Dock、Finder 和菜单栏的许多偏好设置只有在应用启动时才会读取，因此即使已保存的值符合配置，应用仍可能显示旧行为。mise 不会重新启动这些应用。写入偏好设置后，它会显示提醒；`mise bootstrap` 也会在后续摘要中再次提醒。请自行重新启动：

```sh
killall Dock Finder SystemUIServer
```

若要在每次 bootstrap 时都重新启动 Dock，请添加一个[钩子](/bootstrap.html#hooks)。每次 bootstrap 包含 defaults 步骤时都会运行钩子，即使设置没有变化也一样：

```toml
[bootstrap.hooks]
post-defaults = "killall Dock || true"
```

## 撤销偏好设置

mise 永远不会删除偏好设置，因此移除声明后当前值仍会保留。若要恢复系统默认值，请从配置中移除该声明，并手动删除偏好设置：

```sh
defaults delete com.apple.dock autohide
```

## 预览和应用

```sh
mise bootstrap macos defaults status            # state of each preference
mise bootstrap macos defaults status --json     # the same, as JSON
mise bootstrap macos defaults status --missing  # exit 1 if any preference is unset or differs
mise bootstrap macos defaults apply --dry-run   # print the planned writes
mise bootstrap macos defaults apply             # apply after a confirmation prompt
mise bootstrap macos defaults apply --yes       # apply without prompting
```

状态命令会将每项偏好设置报告为 `set`（符合配置）、`differs`（存在值但不匹配，状态信息会显示该值）或 `unset`。`mise doctor` 也会汇总相同的偏差。

## Linux 和 Windows

在其他平台上会忽略这些配置段，因此同一份配置可供多台机器使用。[`mise bootstrap macos defaults status`](/cli/bootstrap/macos/defaults/status.html) 和 `mise doctor` 会将这些条目标记为 skipped，`apply` 不执行任何操作。

## 另请参阅

- [Bootstrap](/bootstrap.html#how-it-runs)：了解 defaults 步骤在执行顺序中的位置。
- [macOS LaunchAgents](/bootstrap/launchd.html)：了解如何在登录时运行程序。
- [Homebrew cask](/bootstrap/packages/brew-cask.html)：了解 Dock 中固定的应用。
