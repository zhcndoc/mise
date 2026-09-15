---
description: "偏执模式会禁用自动信任和 CI 信任，将直接文件批准绑定到配置内容，并在安装期间重新检查受支持的溯源信息。"
---

# 偏执模式

偏执模式会禁用自动信任和 CI 信任，将直接文件批准绑定到配置内容，并在安装期间重新检查受支持的溯源信息。通过 `trusted_config_paths` 接受的配置，或继承自 monorepo 根目录的信任，仍然属于基于路径的例外。批准命令后，它不会对命令进行沙箱隔离；请参阅[安全性](/security.html)了解每项控制措施的范围。

使用 `MISE_PARANOID=1` 为单次调用启用，或将其全局持久化：

```sh
mise settings set paranoid true
```

要恢复正常模式，请运行 `mise settings set paranoid false`。该设置仅适用于全局；项目无法为自身启用或禁用此设置。

## 配置文件

在正常模式下，简单配置可以在无需信任的情况下加载，并且 `mise run`、`mise install` 和 `mise exec` 等执行命令会自动信任其活动配置。其他命令可能会根据其发现文件的方式，提示、失败或跳过不受信任的文件。请参阅[`mise trust`](/cli/trust.html)了解正常模式规则。

偏执模式要求对非全局配置文件进行明确的信任，包括通常不需要信任的格式。直接文件批准会对内容进行哈希，因此编辑文件后需要重新获得信任。执行命令的自动信任和通常的 CI 信任豁免都会被禁用。在此模式下，Git worktree 之间不会共享信任。

在接受文件之前检查它：

```sh
mise trust --show
mise trust path/to/mise.toml
```

将路径替换为你检查过的配置。全局 `trusted_config_paths` 设置允许的路径，以及受信任 monorepo 根目录覆盖的后代路径，会绕过内容哈希检查，因此其中的更改不需要重新批准。全局和系统配置由操作员拥有，仍然不受此限制，因此可以全局设置偏执模式。

如果两种模式同时启用，[安全模式](/security.html#safe-mode)优先。它会抑制项目执行和环境注入，因此配置可以在无需信任提示的情况下加载；语法错误和被拒绝的操作仍会失败。在安全模式下加载不会授予后续正常模式或偏执模式调用所需的信任。

## 社区插件

偏执模式拒绝通过短名称安装不受信任的社区插件，除非通过 `--yes` 或 `MISE_YES=1` 启用了自动确认、mise 正在 CI 中运行，或安装使用了 `--force`。当短名称插件解析出的 URL 与 mise 内置注册表中的 asdf 或 vfox 远程仓库匹配，或该插件由 `mise-plugins` GitHub 组织维护时，该短名称插件会被信任。

要安装其他社区插件，请在命令行或 `[plugins]` 配置中指定其完整的 Git 仓库 URL。明确提供 URL 会绕过注册表信任检查，因为这是你主动选择并信任的来源：

```sh
mise plugin install example https://github.com/example/asdf-example
```

在正常模式下，mise 可能会改为在通过短名称安装不受信任的社区插件前发出警告并请求确认。

## 溯源重新验证

受支持的后端可以在安装校验和匹配的构件时，重复使用锁定文件中记录的溯源信息。这可以避免重复检查和 API 调用，但依赖于锁定文件已被正确生成。

在偏执模式下，受支持且已启用的溯源方法（例如 SLSA、Cosign、Minisign 和 GitHub 证明）会在安装期间再次运行，而不会因为存在溯源条目而被跳过。这可能需要网络访问。它不会添加后端不支持的验证，也不会重新扫描 mise 跳过安装的工具。

此行为也可以通过
[`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance) 设置单独启用。

## 另请参阅

- [安全模式](/security.html#safe-mode)，用于处理不受信任的项目元数据。
- [沙箱隔离](/sandboxing.html)，用于限制执行的命令。
- [锁定文件](/dev-tools/mise-lock.html)，用于了解校验和、溯源信息和后端覆盖范围。
- [联系](/contact.html)，用于提出改进建议或报告异常行为。
