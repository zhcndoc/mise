# 软件包插件开发

软件包插件是一个基于 Lua 的 vfox 插件，为 [`[bootstrap.packages]`](/bootstrap/packages/) 实现机器级全局管理器。它封装由主机工具拥有的状态，而不是在 mise 的数据目录下安装带版本的工具。

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

- `PackageInstalled` 接收当前调用中的每个请求。这可能是合并后的 `[bootstrap.packages]` 声明，也可能是命令行中明确指定的子集。
- `PackageInstall` 只接收 mise 选中进行安装的请求，例如被报告为缺失的软件包，或请求版本不匹配的软件包。
- `PackageUpgrade` 接收被报告为已存在的可操作请求，包括已经是当前版本的软件包，以便管理器可以对其执行空操作。被报告为缺失或不可用的软件包，以及不受支持的固定版本请求，都会被省略。

当操作批次为空时，mise 不会调用操作钩子。

```lua
function PLUGIN:PackageInstalled(ctx)
  -- ctx.packages: {{ name = "diff", version = "1.3.4" | nil }, ...}
  return {
    packages = {
      { name = "diff", state = "installed", version = "1.3.4" },
      { name = "s3", state = "missing" },
    },
  }
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
`code --install-extension name[@version]`，而 `PackageUpgrade` 可以运行
`code --update-extensions` 或重新安装所请求的扩展。
