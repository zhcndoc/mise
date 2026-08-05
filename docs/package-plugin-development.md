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
    └── package_upgrade.lua
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

所有钩子都会接收完整的软件包批次。管理器必须面向批次进行处理。

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

`PackageUpgrade` 使用相同的上下文和响应。它是可选的；如果不存在升级钩子，mise 会调用 `PackageInstall`。该名称为未来的 `PackageUninstall` 钩子预留空间，但卸载和清理不属于 v1。

## 硬性约定

- 包插件绝不能在任何钩子中调用 `sudo`。mise 不会为它们提升权限。
- 版本字符串是不透明的。只能使用精确相等进行比较；绝不能解析或排序它们。
- `PackageInstalled` 无副作用、非交互式、绝不提升权限，并且应当快速执行。
- 钩子应当处理完整的请求批次。
- 在 `requires` 中声明每个所需的主机二进制文件。

对于 VS Code 实现，`PackageInstalled` 可以解析
`code --list-extensions --show-versions`，`PackageInstall` 可以运行
`code --install-extension name[@version]`，而 `PackageUpgrade` 可以运行
`code --update-extensions` 或重新安装所请求的扩展。
