# 偏执

偏执是一种可选行为，它会进一步锁定 mise，使恶意行为者更难危害你的系统。这些是我个人在自己的系统上不会使用的设置，因为我觉得这种行为相对于其带来的好处来说限制太多了。

可以通过 `MISE_PARANOID=1` 或某个设置来启用偏执模式：

```sh
mise settings paranoid=1
```

## 配置文件

通常情况下，`mise` 会在加载某些配置文件之前先确保它们是“受信任”的。这会提示你确认是否要加载该文件，例如：

```sh
$ mise install
mise ~/src/mise/.tool-versions is not trusted. Trust it [y/n]?
```

在正常模式下，mise 会在解析 `mise.toml` 文件之前检查信任，因为它们可能包含会执行代码或影响环境的行为。一些会查看之前跟踪过的配置的发现路径，可能会跳过不受信任的文件，而不是提示用户。那些直接需要不受信任配置的命令，例如 `mise lock`，在 mise 无法提示时，可能会因不受信任的配置错误而失败。当 mise 检测到自己在 CI 中运行时，除非启用了偏执模式，否则配置会被视为受信任。

在偏执模式下，所有配置文件在使用前都必须先被信任，包括通常不需要信任的格式。

另外，在正常模式下，一个配置文件只需要被信任一次。而在偏执模式下，会对文件内容进行哈希校验，以检查文件是否发生变化。如果你修改了配置文件，就需要重新信任它。

请注意，全局和系统配置文件（例如 `~/.config/mise/config.toml`）会被隐式信任，并且免于此检查。这使得可以在全局配置中启用偏执模式，而无需对该文件本身进行信任提示。

## 社区插件

在 paranoid 模式下，社区插件不能通过短名称直接安装。
你可以安装以下类型的插件：核心插件、由 mise 团队维护的插件，
或者被 mise 标记为“第一方”的插件——也就是由构建该工具的同一团队开发的
用于安装该工具的插件。

除此之外，以 “shfmt” 为例，你需要指定完整的 git 仓库
才能安装：

```sh
mise plugin install shfmt https://github.com/luizm/asdf-shfmt
```

这与正常模式不同，在正常模式下只需 `mise plugin install shfmt` 即可。

## 始终使用 HTTPS

mise 中的一些端点是通过 HTTP 获取的，例如检查最新的 mise 版本以及拉取工具的版本列表。这些并不是安全风险，恶意行为者注入虚假数据也不会引入安全风险。  
通常 mise 使用 HTTP，因为加载 TLS 模块大约需要 10ms，这会影响常用命令，因此会造成明显的延迟。  
在偏执模式下，所有端点都将通过 HTTPS 获取。

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

## 还有吗？

如果你对可以添加到 paranoid 的更多内容有建议，请告诉我。
