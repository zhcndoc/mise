---
description: "编写 Lua 插件，将 VS Code 扩展等软件包管理器接入 bootstrap packages。"
---

# 编写软件包管理器插件 {#package-manager-plugins}

软件包管理器插件会向[`[bootstrap.packages]`](/bootstrap/packages/)添加一个管理器，用于管理属于其他程序的软件包，例如 VS Code 扩展、`gh` 扩展或 Helm 插件。mise 会询问插件哪些已请求的软件包已经安装，然后分批交由插件安装、升级或移除。

这些软件包仍由宿主程序自行管理，不会存放在 mise 的数据目录中。用户可按照 bootstrap 指南中的[软件包管理器插件说明](/bootstrap/packages/plugins.html)进行配置。

## 快速开始 {#layout}

软件包管理器插件的目录结构如下：

```text
mise-vscode-extensions/
├── metadata.lua
├── mise.plugin.toml
└── hooks/
    ├── package_installed.lua   # required: report what is installed
    ├── package_install.lua     # required: install a batch
    ├── package_upgrade.lua     # optional: upgrade a batch
    └── package_uninstall.lua   # optional: remove a batch for prune
```

`hooks/package_installed.lua` 和 `hooks/package_install.lua` 同时存在时，mise 会将该目录识别为软件包管理器插件；如果只存在其中一个，则会被识别为工具插件。若目录中还包含 `hooks/backend_install.lua`，它就会成为后端插件，因此请将软件包管理器插件放在独立仓库中。

用户安装插件时会选择管理器名称，并将该名称用作 `[bootstrap.packages]` 中的软件包前缀。例如，在 `[bootstrap.plugins]` 中设置 `vscode = "..."` 后，软件包可写为 `"vscode:ms-python.python"`。`PLUGIN.name` 无需与管理器名称一致，但管理器名称不能与 `brew`、`apt` 等内置管理器重名。

请直接使用管理器名称链接工作副本，不要添加 `package:` 前缀；修改任何内容前先检查状态：

```sh
mise plugins link vscode ./mise-vscode-extensions
mise bootstrap packages status
mise bootstrap packages apply --dry-run
```

## 完整示例 {#complete-example}

此插件在 Linux 和 macOS 上通过 `code` 命令管理 VS Code 扩展。

```lua [metadata.lua]
PLUGIN = {
    name = "vscode-extensions",
    version = "0.1.0",
    description = "Manage VS Code extensions",
}
```

```toml [mise.plugin.toml]
[package-manager]
requires = ["code"]
supports_version_pins = true
os = ["macos", "linux"]
```

```lua [hooks/package_installed.lua]
local cmd = require("cmd")

function PLUGIN:PackageInstalled(ctx)
    local installed = {}
    local output = cmd.exec("code --list-extensions --show-versions")
    for line in output:gmatch("[^\r\n]+") do
        local name, version = line:match("^(.+)@([^@]+)$")
        if name then
            installed[name:lower()] = version
        end
    end
    local results = {}
    for _, pkg in ipairs(ctx.packages) do
        local version = installed[pkg.name:lower()]
        table.insert(results, {
            name = pkg.name,
            state = version and "installed" or "missing",
            version = version,
        })
    end
    return { packages = results }
end
```

```lua [hooks/package_install.lua]
local cmd = require("cmd")

function PLUGIN:PackageInstall(ctx)
    for _, pkg in ipairs(ctx.packages) do
        local spec = pkg.version and (pkg.name .. "@" .. pkg.version) or pkg.name
        if ctx.dry_run then
            print("would install " .. spec)
        else
            cmd.exec('code --install-extension "$EXTENSION"', { env = { EXTENSION = spec } })
        end
    end
end
```

```lua [hooks/package_upgrade.lua]
local cmd = require("cmd")

function PLUGIN:PackageUpgrade(ctx)
    for _, pkg in ipairs(ctx.packages) do
        if ctx.dry_run then
            print("would upgrade " .. pkg.name)
        elseif not pkg.version then
            -- --force updates this extension; --update-extensions would update all of them
            cmd.exec('code --install-extension "$EXTENSION" --force', { env = { EXTENSION = pkg.name } })
        end
    end
end
```

```lua [hooks/package_uninstall.lua]
local cmd = require("cmd")

function PLUGIN:PackageUninstall(ctx)
    for _, pkg in ipairs(ctx.packages) do
        cmd.exec('code --uninstall-extension "$EXTENSION"', { env = { EXTENSION = pkg.name } })
    end
end
```

将插件链接为 `vscode` 后，以下配置会安装两个扩展：

```toml [mise.toml]
[bootstrap.packages]
"vscode:ms-python.python" = "latest"
"vscode:golang.go" = "0.40.0"
```

`mise bootstrap packages apply` 会先将两个请求传给 `PackageInstalled`，再将报告为缺失或版本不符的项目传给 `PackageInstall`，最后再次调用 `PackageInstalled`，记录由 mise 安装的软件包。`mise bootstrap packages upgrade` 会将已安装的软件包传给 `PackageUpgrade`。这些命令通过 `EXTENSION` 环境变量传递扩展名称，而不会将名称拼接到命令行中。

## mise.plugin.toml {#mise-plugin-toml}

`[package-manager]` 表用于描述管理器：

| 键                       | 默认值         | 说明                                                                                                  |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `requires`              | 无             | 钩子运行所需的宿主程序。mise 会将自身 shim 和全局工具加入 `PATH`，但不会安装这些程序                     |
| `supports_version_pins` | `false`        | 管理器是否支持安装固定版本，例如 `"0.40.0"`                                                            |
| `os`                    | 所有平台       | 管理器支持运行的平台：`macos`、`linux` 或 `windows`                                                    |

缺少 `requires` 中的程序时，mise 会将管理器标记为不可用，并提示用户将程序加入 `[tools]` 或自行安装。钩子可访问进程原有的 `PATH`、mise 的 shim，以及全局配置中的工具。`supports_version_pins` 为 `false` 时，mise 会发出警告并跳过固定版本的请求。

## Hooks {#hooks}

| 钩子               | 文件                          | 必需     | mise 何时调用                                                         |
| ------------------ | ----------------------------- | -------- | --------------------------------------------------------------------- |
| `PackageInstalled` | `hooks/package_installed.lua` | 是       | 在每个操作前后读取所有请求的状态                                     |
| `PackageInstall`   | `hooks/package_install.lua`   | 是       | 安装缺失的软件包和版本不符的软件包                                    |
| `PackageUpgrade`   | `hooks/package_upgrade.lua`   | 否       | 用于 `mise bootstrap packages upgrade`；缺省时回退到 `PackageInstall` |
| `PackageUninstall` | `hooks/package_uninstall.lua` | 否       | 用于 `mise bootstrap packages prune --manager <name>`                 |

`ctx.packages` 中的每个请求都是包含 `name` 和 `version` 的表。钩子调用 `error()` 报错时，整批操作都会失败。批次为空时，mise 不会调用操作钩子。钩子可以使用 [Plugin Lua 参考](/plugin-lua-modules.html)中的 `cmd`、`json`、`file` 等模块；运行宿主程序的方式请参阅[命令模块](/plugin-lua-modules.html#command-module)。`print()` 会输出一行 `mise [vscode] ...` 消息。

### PackageInstalled {#packageinstalled}

| `ctx` 字段  | 值                                                                                 |
| ----------- | ---------------------------------------------------------------------------------- |
| `packages`  | 本次运行中的所有请求；`version` 是请求固定的版本，`"latest"` 时为 `nil`               |

请返回 `{ packages = { ... } }`，其中每个请求都对应一个条目：

| 字段      | 值                                              |
| --------- | ----------------------------------------------- |
| `name`    | 请求中的 `name`                                  |
| `state`   | `"installed"` 或 `"missing"`                    |
| `version` | 若软件包已安装，则为其已安装版本                 |

请求是合并后的 `[bootstrap.packages]` 声明，或者命令行中指定的子集。mise 会用字符串精确比较固定请求的 `version` 与已安装版本，并将不匹配的软件包视为待安装项目。缺少条目或 `state` 为其他值都会导致错误。

状态查询、预览和所有操作都会调用此钩子，因此请保持其运行速度，并遵守[规则](#hard-contracts)。返回错误结果会导致不必要的安装，或掩盖缺失的软件包。

### PackageInstall {#packageinstall}

| `ctx` 字段  | 值                                                                         |
| ----------- | -------------------------------------------------------------------------- |
| `packages`  | `PackageInstalled` 报告为缺失或版本不符的请求                              |
| `dry_run`   | `--dry-run` 时为 `true`：打印计划执行的操作，不作任何更改                   |
| `update`    | `--update` 时为 `true`：如有管理器元数据，先刷新元数据                     |

可不返回内容或返回一个表。逐个安装请求；如果设置了 `version`，则安装对应版本。

### PackageUpgrade {#packageupgrade}

`PackageUpgrade` 接收与 `PackageInstall` 相同的 `ctx`。`ctx.packages` 中包含 `PackageInstalled` 报告为已安装的请求，也包括已是最新版本的项目，因此钩子可以跳过它们。缺失的软件包不会包含在内；`mise bootstrap packages upgrade` 会提示用户对这些软件包运行 `apply`。升级时只能处理 `ctx.packages` 中的软件包：例如 `code --update-extensions` 会升级所有扩展。未实现此钩子时，mise 会调用 `PackageInstall`。

### PackageUninstall {#packageuninstall}

| `ctx` 字段  | 值                                                         |
| ----------- | ---------------------------------------------------------- |
| `packages`  | 要移除的软件包；`version` 为已安装版本                     |

mise 只会将自己安装的软件包传给 `PackageUninstall`：也就是 `PackageInstall` 执行前由 `PackageInstalled` 报告为缺失、执行后又报告为已安装的软件包。原本已存在的软件包，以及仍在当前配置或 mise 跟踪的其他可信配置中声明的软件包，都不会传入。试运行不会调用此钩子。钩子返回或报错后，mise 会再次调用 `PackageInstalled`，并记录仍处于已安装状态的软件包。

mise 会在状态目录中按管理器名称记录自行安装的软件包，因此即使移除并重新安装插件，该记录仍会保留；即便管理器的最后一项声明已删除，prune 仍可正常工作。用户确认 prune 后，mise 会重新加载配置，并跳过期间新增声明的软件包；它绝不会添加用户未确认的待移除项目。

## 约束规则 {#hard-contracts}

- 不要在任何钩子中运行 `sudo`。mise 不会为软件包管理器插件提权。
- 将版本视为不透明字符串，并使用 `==` 比较；不要解析或排序版本。
- 确保 `PackageInstalled` 没有副作用，也不会提示用户输入。
- 不要将批次中缺少某个软件包视为要求移除该软件包。命令可能只针对部分软件包；如果管理器的最后一项声明被移除，甚至不会发送任何批次。
- `PackageUninstall` 只能移除传入的软件包，不能移除管理器认为未使用的所有软件包。
- 在 `requires` 中列出钩子运行的所有宿主程序。
- 所有钩子都应使用相同的宿主配置或作用范围，以确保 `PackageInstalled` 查询的是操作钩子所更改的软件包。

## 测试 {#testing}

修改真实软件包前，请先使用宿主程序的临时配置，或在 `PATH` 中放置一个会记录参数的模拟命令进行测试。测试内容应覆盖空配置、缺失和已安装的软件包、版本不符的固定版本、操作失败，以及命令行指定部分软件包的情况。确认 `mise bootstrap packages status` 不会更改任何内容、每项操作只处理 `ctx.packages` 中的软件包，且 `--dry-run` 不会产生更改。请分别测试 `mise bootstrap packages prune --manager vscode --dry-run` 和实际 prune。

隔离测试环境的搭建方式请参阅[发布插件](/plugin-publishing.html#testing-before-publication)。
