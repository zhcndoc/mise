---
description: "使用自定义包管理器插件扩展引导包。"
socialDescription: "使用自定义包管理器插件扩展引导包。"
---

# 包管理器插件

包管理器插件扩展了 [`[bootstrap.packages]`](/bootstrap/packages/)，
而无需向 mise 核心添加包管理器。它们适用于由其他工具管理的机器级全局
状态，例如 VS Code 扩展、Helm 插件、krew 插件和 GitHub CLI 扩展。

同时声明插件源和软件包。下面的 `example/*` 仓库 URL 仅用于演示语法，
是**占位符**——在运行这些命令之前，请将其替换为受维护且可安装的插件仓库：

```toml
[bootstrap.plugins]
vscode = "https://github.com/example/mise-vscode-extensions" # 占位符
krew = "https://github.com/example/mise-krew" # 占位符

[bootstrap.packages]
"vscode:ms-python.python" = "latest"
"krew:ctx" = "latest"
```

`mise bootstrap` 会先安装声明的包插件，应用内置包管理器，安装 `[tools]`，
然后应用插件管理器。这样，插件就可以声明由全局 `[tools]` 条目提供的
`code`、`helm`、`kubectl` 或 `gh` 等主机命令。包插件钩子包括进程 PATH、
mise shim 和全局工具路径；项目专用的工具路径不会作为单独的依赖工具集添加。
请全局安装主机工具，或确保它位于钩子的 PATH 中。安装扩展与安装其主机工具是
两个独立的操作。

对于现有配置，请先运行 `mise bootstrap --dry-run` 来检查阶段顺序。范围更窄的
`plugins apply` 会安装插件本身；`packages apply` 则要求插件及其主机依赖已经就绪。

也可以使用更细化的命令：

```sh
mise bootstrap plugins status
mise bootstrap plugins status --missing
mise bootstrap plugins apply
mise bootstrap packages status
mise bootstrap packages apply
mise bootstrap packages prune --manager vscode --dry-run
```

你可以在不声明插件的情况下安装插件：

```sh
# placeholder URL — replace with a real package-plugin repository
mise plugins install package:vscode https://github.com/example/mise-vscode-extensions
```

请以需要更改其应用程序状态的用户身份运行。某个用户的 VS Code、Helm 或
GitHub CLI 配置文件中成功完成的安装，不会为主机上的所有用户配置其配置文件。

包插件会安装到主机应用程序自己的状态目录中。它们不会创建 mise 安装或 shim，
也不会使用 `sudo` 提权，并且不受 `system_packages.sudo` 影响。
`system_packages.managers` 设置基于名称，可以像内置管理器一样包含或排除插件管理器。

插件可以实现 `PackageUninstall`，以支持显式的破坏性命令
`mise bootstrap packages prune --manager <plugin>`。mise 仅移除其在插件安装期间
观察到从缺失变为已安装的软件包；之前已存在的软件包永远不会被认领。Prune
还会保留当前配置或受信任且可加载的已跟踪配置所引用的软件包。仅移除配置条目
不会卸载由主机管理的状态。

请参阅[软件包插件开发](/package-plugin-development.html)以创建插件。
