# 偏执

偏执是一种可选行为，它会进一步锁定 mise，使恶意行为者更难危害你的系统。这些是我个人在自己的系统上不会使用的设置，因为我觉得这种行为相对于其带来的好处来说限制太多了。

偏执模式可以通过 `MISE_PARANOID=1` 或全局设置启用：

```sh
mise settings paranoid=1
```

该设置仅适用于全局，因此项目配置无法为自身启用或禁用偏执模式。

## 配置文件

通常，`mise` 会确保某些配置文件在加载前已“受信任”。这可能会提示你确认是否要加载该文件，例如：

```sh
$ mise env
mise ~/src/mise/mise.toml is not trusted. Trust it [y/n]?
```

在正常模式下，`mise run`、诸如 `mise <TASK>` 这样的裸任务调用、`mise install`、`mise exec` 和 `mise watch` 会自动信任其活动配置，因为它们会明确执行项目定义的行为。通过 `hook-env` 自动激活 shell 则不会自动信任配置。

其他命令会在解析 `mise.toml` 文件前检查信任状态，因为这些文件可能包含执行代码或影响环境的行为。某些查看以前已跟踪配置的发现路径可能会跳过不受信任的文件，而不是发出提示。直接需要不受信任配置的命令可能会在 mise 无法发出提示时因不受信任配置错误而失败。当 mise 检测到自己正在 CI 中运行时，除非启用了偏执模式，否则会假定配置受到信任。

在偏执模式下，所有配置文件都必须先受到信任，包括通常不需要信任的格式。执行命令的自动信任功能会被禁用。在正常模式下，配置文件只需信任一次。在偏执模式下，文件内容会被哈希处理，以检查其是否发生变化。如果你更改了配置文件，就需要再次信任它。

请注意，全局和系统配置文件（例如 `~/.config/mise/config.toml`）会被隐式信任，并且免于此检查。这使得可以在全局配置中启用偏执模式，而无需对该文件本身进行信任提示。

当两种模式都启用时，[安全模式](/security.html#safe-mode)优先级更高。安全模式会禁用项目定义的代码执行和环境注入，同时保留工具定义、任务元数据、插件声明和工具别名等不可执行配置。因此，它会在不发出信任提示或不受信任配置错误的情况下加载不受信任的配置。其他配置错误仍会被报告。

## 社区插件

偏执模式拒绝通过短名称安装不受信任的社区插件，除非通过 `--yes` 或 `MISE_YES=1` 启用了自动确认、mise 正在 CI 中运行，或安装使用了 `--force`。当短名称插件解析出的 URL 与 mise 内置注册表中的 asdf 或 vfox 远程仓库匹配，或该插件由 `mise-plugins` GitHub 组织维护时，该短名称插件会被信任。

要安装其他社区插件，请在命令行或 `[plugins]` 配置中指定其完整的 Git 仓库 URL。明确提供 URL 会绕过注册表信任检查，因为这是你主动选择并信任的来源：

```sh
mise plugin install example https://github.com/example/asdf-example
```

在正常模式下，mise 可能会改为在通过短名称安装不受信任的社区插件前发出警告并请求确认。

## 溯源重新验证

通常，当一个 lockfile 同时包含某个工具的校验和和溯源条目时，
`mise install` 会信任该 lockfile，并跳过溯源重新验证，以避免
重复的 API 调用（例如对 GitHub 的调用）。当你信任该 lockfile 是
正确生成时，这种做法是安全的。

在 paranoid 模式下，`mise install` 会始终在安装时重新验证溯源（SLSA、cosign、minisign、
GitHub artifact attestations），即使 lockfile 中已经有一个
溯源条目也是如此。这确保了加密验证会在每次安装时都执行，
而不只是首次生成 lockfile 时执行。

此行为也可以通过
[`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 设置单独启用。

## 另请参阅

[安全模式](/security.html#safe-mode)（`MISE_SAFE=1`）是一种相关但不同的控制：偏执模式强化了 _信任_（加载和重新验证哪些配置），而安全模式则为 mise 针对你不控制的配置运行时的 _代码执行_ 设置了硬性边界。

## 更多？

如果你对可以添加到 paranoid 的更多内容有建议，请告诉我。
