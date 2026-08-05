# 包管理器插件

包管理器插件扩展了 [`[bootstrap.packages]`](/bootstrap/packages/)，
而无需向 mise 核心添加包管理器。它们适用于由其他工具管理的机器级全局
状态，例如 VS Code 扩展、Helm 插件、krew 插件和 GitHub CLI 扩展。

同时声明插件源和软件包：

```toml
[bootstrap.plugins]
vscode = "https://github.com/mise-plugins/mise-vscode-extensions"
krew = "https://github.com/mise-plugins/mise-krew"

[bootstrap.packages]
"vscode:ms-python.python" = "latest"
"krew:ctx" = "latest"
```

`mise bootstrap` 会先安装已声明的软件包插件，应用内置的
包管理器，安装 `[tools]`，然后应用插件管理器。这样，插件就可以声明由同一配置中全局
`[tools]` 条目提供的主机命令，例如 `code`、`helm`、`kubectl` 或 `gh`。

也可以使用更细化的命令：

```sh
mise bootstrap plugins status
mise bootstrap plugins status --missing
mise bootstrap plugins apply
mise bootstrap packages status
mise bootstrap packages apply
```

你可以在不声明插件的情况下安装插件：

```sh
mise plugin install package:vscode https://github.com/mise-plugins/mise-vscode-extensions
```

软件包插件会安装到主机应用自身的状态目录中。
它们不会创建 mise 安装或 shim，绝不会使用 `sudo` 提权，也不受
`system_packages.sudo` 影响。`system_packages.managers` 设置基于名称，
可以像内置管理器一样包含或排除插件管理器。

此 API 的第一个版本不支持移除和清理软件包。
移除配置条目不会卸载由主机管理的状态。

请参阅[软件包插件开发](/package-plugin-development.html)以创建插件。
