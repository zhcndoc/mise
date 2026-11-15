---
description: "[实验性] 通过 bootstrap 设置插件从 mise.toml 应用桌面和应用设置，例如 Linux 发行版自带的设置。"
socialDescription: "通过 bootstrap 设置插件从 mise.toml 应用桌面和应用设置。"
---

# Bootstrap 设置插件 <Badge type="warning" text="实验性" />

Bootstrap 设置插件可以根据 `[bootstrap.settings.<plugin>]` 部分应用某个程序或桌面的设置，例如 Linux 发行版的外观设置。插件知道这些设置存放在哪里。mise 会比较你声明的值和插件报告的值，并让插件只写入不同的设置。

此功能目前处于实验阶段：请设置 [`experimental = true`](/configuration/settings.html#experimental) 或 `MISE_EXPERIMENTAL=1` 后使用。

## 声明设置

在配置部分中指定插件名称，然后用 TOML 编写设置。插件接受哪些键由插件自身决定。以下示例使用名为 `desk` 的插件：

```toml
[bootstrap.settings.desk.appearance]
blur = true
blur_strength = 4
```

你可以随其他 bootstrap 部分一起预览和应用这些设置，也可以单独操作：

```sh
mise bootstrap --only settings --dry-run
mise bootstrap --only settings
mise bootstrap settings status
mise bootstrap settings apply
```

这些命令不会安装插件。请先运行 `mise bootstrap plugins apply`，或在 `--only` 中包含 `plugins`，以确保 [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html) 中声明的插件已安装，可以应用其配置部分。

试运行会列出每个将要更改的值及其当前值：

```text
mise would set desk: appearance.blur false -> true
mise would set desk: appearance.blur_strength 2 -> 4
```

如果某个值与配置不一致，例如有人在程序自身的设置中改动了它，或插件无法运行，那么 `mise bootstrap settings status --missing` 会以状态码 1 退出。为其他操作系统编写的插件配置部分会列为已跳过，但不会计入错误，因此一份配置可以包含各个平台的设置。目前 `mise bootstrap status` 和 `mise bootstrap plan` 尚不检查设置是否漂移，因此请使用此命令检测。

内置的 `[bootstrap.settings.macos]` 不是插件，而是用于声明 [macOS 偏好设置](/bootstrap/macos-defaults.html)，由 `macos-defaults` 部分应用。插件名称不能使用 `macos`。

不同配置文件中的配置部分会按键合并，并遵循其余 `[bootstrap]` 配置的优先级：更靠近项目的文件中的值优先。`desk_plugin` 和 `desk-plugin` 会被视为同一个插件，因此两种写法对应的配置也会合并。`appearance = { blur = true }` 和 `"appearance.blur" = true` 会设置同一个键。当 mise 读取多个互相独立的配置根目录时，它们不能为同一个键设置不同的值；出现这种情况时，mise 会拒绝应用设置。

如果某个插件尚未安装或无法在当前机器上运行，对应配置部分会被跳过，并列在 `bootstrap: follow-up` 输出中，因此一份配置可以包含适用于多个平台的配置部分。`mise bootstrap` 会在安装 `[tools]` 后应用设置，因此插件 `requires` 中的程序可以是全局工具之一。

## 插件来源

发行版或应用可以将设置插件放在 [`/usr/share/mise/plugins`](/directories.html#system-plugins)，供机器上的所有用户使用，无需安装。你也可以自行安装，并为其指定任意名称，通过 [`[bootstrap.plugins]`](/bootstrap/packages/plugins.html) 或 `mise plugins link` 完成。同名的已安装插件会覆盖系统插件。

## 编写插件 {#write-a-plugin}

Bootstrap 设置插件是一个包含两个钩子的 Lua 插件：

```text
mise-desk/
├── metadata.lua
├── mise.plugin.toml
└── hooks/
    ├── settings_read.lua    # report current values
    └── settings_write.lua   # write changed values
```

`mise.plugin.toml` 必须包含 `[bootstrap-settings]` 表，用于标记这是一个 bootstrap 设置插件。除 `supports_version_pins` 外，它接受与 [`[package-manager]`](/package-plugin-development.html#mise-plugin-toml) 相同的键：

```toml
[bootstrap-settings]
requires = ["hyprctl"]  # programs the hooks run
os = ["linux"]          # platforms the plugin runs on
```

mise 会将配置部分展开为点分隔的键。`[bootstrap.settings.desk.appearance]` 中的 `blur = true` 会变成值为 `true` 的 `appearance.blur` 键。列表仍作为一个整体值处理。

### SettingsRead

`ctx.keys` 包含 mise 要查询的键：通常是所有已声明的键；写入后则只包含刚刚写入的键。请在 `values` 中返回你能够识别的 `ctx.keys` 中每个键的当前值。未设置的键不要返回。

```lua [hooks/settings_read.lua]
function PLUGIN:SettingsRead(ctx)
  return { values = { ["appearance.blur"] = false, ["appearance.blur_strength"] = 2 } }
end
```

mise 会在检查状态、试运行以及每次写入前后调用此钩子。请勿在其中执行有副作用或会显示提示的操作。

### SettingsWrite

`ctx.changes` 只包含值不一致的键；每个键都是一个含有 `key`、`from`（未设置时为 `nil`）和 `to` 的表。请逐项写入。可以不返回内容，也可以返回 `follow_up`，其中列出需要用户执行、变更才会生效的步骤：

```lua [hooks/settings_write.lua]
function PLUGIN:SettingsWrite(ctx)
  for _, change in ipairs(ctx.changes) do
    -- write change.to for change.key
  end
  return { follow_up = { "log out and back in to apply the new theme" } }
end
```

运行 `SettingsWrite` 后，mise 会再次调用 `SettingsRead`；如果某个键仍不一致，就会报错并列出 `follow_up` 步骤。mise 按值比较数字，因此 `4` 和 `4.0` 相同；其他值必须类型相同，因此 `4` 与 `"4"` 不同。Lua 只能精确保存不超过 2^53 的整数，所以 mise 拒绝写入更大的整数。

### 规则 {#rules}

- 不要运行 `sudo`。设置插件只更改当前用户的设置。
- 只更改 `ctx.changes` 中的键。未声明的键并不表示需要将其重置。
- 请在 `requires` 中列出钩子会运行的所有程序。

这些钩子可以使用 [Plugin Lua 参考](/plugin-lua-modules.html)中的 `cmd`、`json`、`file` 等模块。
