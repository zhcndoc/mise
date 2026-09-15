---
description: "软件包插件是一个基于 Lua 的 vfox 插件，为 [bootstrap.packages](/bootstrap/packages/) 实现机器级全局管理器"
---

# 软件包插件开发

软件包插件是一个基于 Lua 的 vfox 插件，为 [`[bootstrap.packages]`](/bootstrap/packages/) 实现机器级全局管理器。它封装由主机工具拥有的状态，而不是在 mise 的数据目录下安装带版本的工具。

从一个能够在不提示或进行更改的情况下报告已安装状态的管理器开始。
状态钩子会驱动预览和操作选择，因此不准确的回答可能导致不必要的安装，或隐藏缺失的软件包。有关用户配置，请参阅[软件包插件用法](/bootstrap/packages/plugins.html)。

## 布局

```text
mise-vscode-extensions/
├── metadata.lua
├── mise.plugin.toml
└── hooks/
    ├── package_installed.lua
    ├── package_install.lua
    ├── package_upgrade.lua
    └── package_uninstall.lua
```

必须同时包含 `hooks/package_installed.lua` 和 `hooks/package_install.lua`，
才能将仓库识别为软件包插件。只包含其中一个钩子的仓库仍会被视为普通的 vfox 插件。如果同时存在
`hooks/backend_install.lua`，mise 会将仓库视为工具后端；软件包插件和工具后端插件必须分属不同的仓库。

除了软件包管理器声明外，还要提供常规的 Lua 元数据：

```lua
PLUGIN = {
  name = "vscode-extensions",
  version = "1.0.0",
  description = "Manage VS Code extensions",
}
```

在 `mise.plugin.toml` 中：

```toml
[package-manager]
requires = ["code"]
supports_version_pins = true
os = ["macos", "linux"]
```

- `requires` 列出钩子会调用的宿主二进制文件。mise 会将其 shim 和全局工具集 bin 路径添加到 `PATH`，但不会自动安装这些工具；用户需要在 `[tools]` 中声明它们，或手动安装。
- `supports_version_pins` 默认为 `false`。
- `os` 是可选的，默认为所有平台。其值使用 mise 的平台名称，例如 `macos`、`linux` 和 `windows`。

## 钩子

钩子面向批次操作，但每个钩子都会接收其自身阶段的批次：

- `PackageInstalled` 接收当前调用中的每个请求。这可能是合并后的 `[bootstrap.packages]` 声明，也可能是在命令行中指定的明确子集。
- `PackageInstall` 只接收 mise 选定要安装的请求，例如被报告为缺失的软件包，或请求版本不匹配的软件包。
- `PackageUpgrade` 接收被报告为存在的可操作请求，包括已经是最新版本的软件包，以便管理器可以对它们执行空操作。被报告为缺失或不可用的软件包，以及不受支持的固定版本，会被省略。

当操作批次为空时，mise 不会调用操作钩子。

例如，VS Code 管理器可以使用一个主机命令检查扩展，并只返回所请求的标识：

```lua
function PLUGIN:PackageInstalled(ctx)
  local output = require("cmd").exec("code --list-extensions --show-versions")
  local installed = {}
  for line in output:gmatch("[^\r\n]+") do
    local name, version = line:match("^(.+)@([^@]+)$")
    if name then
      installed[name:lower()] = version
    end
  end
  local results = {}
  for _, package in ipairs(ctx.packages) do
    local version = installed[package.name:lower()]
    table.insert(results, {
      name = package.name,
      state = version and "installed" or "missing",
      version = version,
    })
  end
  return {packages = results}
end
```

`PackageInstalled` 必须无副作用、快速、非交互，并且绝不能提权。它必须为每个请求返回一个 `installed` 或 `missing` 条目。
当请求的固定版本与返回的版本不完全相等时，mise 会计算版本不匹配。

```lua
function PLUGIN:PackageInstall(ctx)
  -- ctx.dry_run: 打印计划执行的操作，但不执行任何操作
  -- ctx.update: 在适用时先刷新管理器元数据
  for _, package in ipairs(ctx.packages) do
    -- 安装 package.name，可选择指定 package.version
  end
  return {}
end
```

`PackageUpgrade` 使用相同的上下文和响应。它是可选的；如果不存在升级钩子，mise 会调用 `PackageInstall`。

操作批次不是完整的期望状态快照。显式命令可能只针对一个子集，而移除管理器的最后一条声明不会为该管理器生成批次。插件不得仅因为某个标识不在 `ctx.packages` 中，就推断应将其移除。

`PackageUninstall` 是可选的，仅用于显式的破坏性命令 `mise bootstrap packages prune --manager <plugin>`。mise 会在保护当前配置以及受信任且可加载的已跟踪配置中声明的软件包后，传递具体且已批准的移除批次：

```lua
function PLUGIN:PackageUninstall(ctx)
  for _, package in ipairs(ctx.packages) do
    -- uninstall package.name; package.version is the observed installed version
  end
  return {}
end
```

试运行不会调用此钩子。只有在 `PackageInstall` 之前被报告为缺失、之后又存在的软件包，mise 才会记录其所有权。已经安装的软件包，包括在引入所有权跟踪之前安装的软件包，从不会被认领或发送给 `PackageUninstall`。所有权账本会在移除和重新安装插件后继续保留。即使期望集合为空，显式 prune 仍然有效，包括移除最后一条声明之后。钩子返回或失败后，mise 会在可能的情况下调用 `PackageInstalled` 验证每个移除操作，并为仍然存在的任何软件包保留所有权。确认后，mise 会在调用钩子之前重新加载完整的期望集合；新声明的软件包会从已批准批次中移除，并且不会在没有再次确认的情况下添加新的移除候选项。

## 硬性约定

- 软件包插件绝不能在任何钩子中调用 `sudo`。mise 从不会为它们提权。
- 版本字符串是不透明的。只能使用完全相等进行比较；绝不能解析或排序它们。
- `PackageInstalled` 无副作用、非交互、绝不提权，并且应当快速执行。
- 钩子针对特定阶段的批次运行，不得将某个标识不在批次中视为卸载请求。
- `PackageUninstall` 只移除 mise 提供的标识，不得执行管理器范围的孤立项清理。
- 在 `requires` 中声明每个必需的宿主二进制文件。

对于 VS Code 实现，`PackageInstalled` 可以解析
`code --list-extensions --show-versions`，`PackageInstall` 可以运行
`code --install-extension name[@version]`，而 `PackageUpgrade` 只能重新安装所请求的扩展。对于选定批次，避免使用
`code --update-extensions`：它也会更新该批次之外的扩展。在状态钩子和操作钩子之间保持配置文件选择一致，并为所使用的 shell 引用软件包参数。

## 测试

在更改真实软件包之前，针对一次性主机配置文件或模拟主机 CLI 进行测试。
覆盖空批次、缺失和已安装的软件包、固定版本完全不匹配、操作失败以及子集请求。
验证状态调用永远不会改变状态，并且操作只会处理 `ctx.packages`。分别测试试运行和显式 prune 的所有权检查。

有关隔离的 mise 目录和发布验证，请参阅[插件发布](/plugin-publishing.html)；有关命令执行，请参阅[Lua 模块](/plugin-lua-modules.html#command-module)。
