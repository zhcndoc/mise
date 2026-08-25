<!-- 由 usage-cli 根据使用规范生成 -->
# `mise plugins`

- **用法：** `mise plugins [FLAGS] <SUBCOMMAND>`
- **别名：** `p`、`plugin`、`plugin-list`
- **效果：** 只读
- **源代码：** [`src/cli/plugins/mod.rs`](https://github.com/jdx/mise/blob/main/src/cli/plugins/mod.rs)

管理插件。

## 标志
- **`-c --core`** — 仅内置插件
  通常不会显示这些插件
- **`-u --urls`** — 显示每个插件的 git URL
  例如：<https://github.com/mise-plugins/vfox-cmake.git>
- **`--user`** — 列出已安装的插件

  这是默认行为，但可以与 --core 一起使用
  以显示核心插件和用户插件
- **`-h --help`** — 打印帮助

## 子命令

- [`mise plugins install [FLAGS] [NEW_PLUGIN] [GIT_URL]`](/cli/plugins/install.md)
- [`mise plugins link [-f --force] <NAME> [DIR]`](/cli/plugins/link.md)
- [`mise plugins ls [-o --outdated] [-u --urls]`](/cli/plugins/ls.md)
- [`mise plugins ls-remote [-u --urls] [--only-names]`](/cli/plugins/ls-remote.md)
- [`mise plugins uninstall [-a --all] [-p --purge] [PLUGIN]…`](/cli/plugins/uninstall.md)
- [`mise plugins update [-j --jobs <JOBS>] [PLUGIN]…`](/cli/plugins/update.md)
