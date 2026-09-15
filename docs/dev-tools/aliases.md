---
description: "使用 [tool_alias] 为工具指定不同的后端，或为版本请求命名。"
---

# 工具别名

使用 [tool_alias] 为工具指定不同的后端，或为版本请求命名。
将共享别名放在项目的 `mise.toml` 中；使用 `~/.config/mise/config.toml` 设置个人默认值。团队成员也需要别名定义以及工具声明。

::: warning 重命名的配置键
`[alias]` 已重命名为 `[tool_alias]`。旧键仍然有效，但已弃用。
对于 `alias ll='ls -la'` 等命令快捷方式，请使用
[Shell 别名](/shell-aliases.html)。
:::

## 别名后端

后端别名会更改 mise 获取工具的位置。例如，显式选择 mise 内置的 Node.js 后端：

```toml [mise.toml]
[tool_alias]
node = "core:node"

[tools]
node = "24"
```

使用 `mise tool node` 检查结果，然后运行 `mise install` 安装所选版本。如果已安装的插件或环境覆盖项选择了与预期不同的源，请参阅[后端选择](/dev-tools/backend_architecture.html#how-backend-selection-works)。

别名还可以从同一个 GitHub 仓库中选择不同的发布资产：

```toml [mise.toml]
[tool_alias]
dhall-json = "github:dhall-lang/dhall-haskell"
dhall-lsp = "github:dhall-lang/dhall-haskell"

[tools]
dhall-json = { version = "v1.42.2", matching = "dhall-json" }
dhall-lsp = { version = "latest", matching = "dhall-lsp-server" }
```

每个别名都有自己的版本请求和
[GitHub 资产筛选器](/dev-tools/backends/github.html#matching)。对于独立发布多个工具的仓库，这一点很重要。

## 别名版本

版本别名为版本请求提供一个稳定的名称。将团队的 Node.js 发布系列集中在一个位置：

```toml [mise.toml]
[tool_alias.node.versions]
project-lts = "24"

[tools]
node = "project-lts"
```

`project-lts` 会解析为对 Node.js 24 的请求。它不是精确的补丁版本锁定；使用 [mise.lock](/dev-tools/mise-lock.html) 记录解析后的版本。更改别名会更改所有使用该别名的声明的请求。

内置的 Node.js 后端已经提供了 `lts` 和命名的 LTS 版本等别名。你无需重新定义这些别名。传统的 asdf 插件作者可以通过 `bin/list-aliases` 提供自己的别名，每行包含一个别名和版本：

```bash
#!/usr/bin/env bash
printf '%s\n' 'recommended 2.0' 'legacy 1.0'
```

## 模板

别名值支持[模板](/templates.html)。例如，允许使用默认发布系列的显式环境覆盖：

```toml
[tool_alias.node.versions]
project-lts = "{{ env.PROJECT_NODE_VERSION | default(value='24') }}"
```

在调用 mise 之前设置 `PROJECT_NODE_VERSION`。避免通过在别名模板中调用同一个工具来计算工具的版本：版本解析可能发生在工具可用之前，或者通过 shim 重新进入 mise。
