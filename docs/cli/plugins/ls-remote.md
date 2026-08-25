<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise plugins ls-remote`

- **Usage:** `mise plugins ls-remote [-u --urls] [--only-names]`
- **Aliases:** `list-remote`, `list-all`
- **Effect:** read-only
- **Source code:** [`src/cli/plugins/ls_remote.rs`](https://github.com/jdx/mise/blob/main/src/cli/plugins/ls_remote.rs)

列出所有可用的远程插件

完整列表在这里：<https://github.com/jdx/mise/blob/main/registry/>

示例：

```
mise plugins ls-remote
```

## Flags
- **`-u --urls`** — 显示每个插件的 git URL，例如：<https://github.com/mise-plugins/mise-poetry.git>
- **`--only-names`** — 仅显示每个插件的名称，默认情况下会在已安装的插件旁显示一个“*”
- **`-h --help`** — 打印帮助
