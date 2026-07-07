# 工具别名

::: tip
`[alias]` 已重命名为 `[tool_alias]`，以将其与 `[shell_alias]` 区分开来。
旧的 `[alias]` 键仍然有效，但已被弃用。

对于 shell 命令别名（如 `alias ll='ls -la'`），请参见 [Shell Aliases](/shell-aliases)。
:::

## 别名后端

工具可以设置别名，因此像 `node` 这样的工具，通常会映射到 `core:node`，现在可以改为映射到其他后端。

```toml [~/.config/mise/config.toml]
[tool_alias]
node = 'github:company/our-custom-node'   # https://github.com/company/our-custom-node 的简写
erlang = 'aqua:company/our-custom-erlang' # 使用一个 aqua 注册表条目
```

## 别名版本

mise 支持对运行时版本进行别名设置。这样做的一个用例是定义一个稳定的名称，
使其指向某个特定版本，这样你就可以在
`mise.toml`/`.tool-versions` 中通过符号名引用它。例如，你可能希望 `lts-iron` 映射到 Node.js 20，
这样就可以将其设置为 `node = "lts-iron"`。

用户别名可以通过在 `~/.config/mise/config.toml` 中添加 `tool_alias.<TOOL>.versions` 部分来创建：

```toml
[tool_alias.node.versions]
lts-iron = '20'
```

然后在固定工具版本时引用该别名：

```toml
[tools]
node = "lts-iron"
```

插件也可以通过 `bin/list-aliases` 脚本提供别名。下面是一个显示 node.js
版本的示例：

```bash
#!/usr/bin/env bash

echo "lts-krypton 24"
echo "lts-jod 22"
echo "lts-iron 20"
```

（mise 内置的 node 插件已经提供了这些 LTS 别名；上面的示例展示了其他插件可以使用的格式。）

## 模板

别名值可以是模板，详情请参见 [模板](/templates)。

```toml
[tool_alias.node.versions]
current = "{{exec(command='node --version')}}"
```
