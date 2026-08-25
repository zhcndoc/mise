<!-- 由 usage-cli 根据用法规范生成 -->
# `mise 过期`

- **用法：** `mise outdated [FLAGS] [TOOL@VERSION]…`
- **作用：** 只读
- **源代码：** [`src/cli/outdated.rs`](https://github.com/jdx/mise/blob/main/src/cli/outdated.rs)

显示过期的工具版本

请参阅 `mise upgrade` 以升级这些版本。

## 参数
- **`[TOOL@VERSION]…`** — 要显示过期版本的工具
  例如：node@20 python@3.10
  如果未指定，将显示全局和本地配置中的所有工具

## 标志
- **`-b --bump`** — 与可用的最新版本进行比较，而不是与当前配置匹配的版本进行比较

  例如，如果你的配置中有 `node = "20"`，默认情况下 `mise outdated` 只会显示其他 20.x 版本，而不会显示 21.x 或 22.x 版本。

  使用此标志时，如果有 21.x 或更新的版本，将显示这些版本，而不是 20.x 版本。
- **`-J --json`** — 以 JSON 格式输出
- **`--inactive`** — 显示过期的工具，包括已安装但未激活且不在当前配置中的工具

  默认情况下，`mise outdated` 只显示来自当前配置的工具。
- **`--local`** — 仅显示本地配置文件中定义的过期工具

  这将仅显示项目本地 mise.toml 中定义的工具，并跳过全局配置（~/.config/mise/config.toml）中定义的工具。
- **`--monorepo`** — 为未来的 monorepo 过期检查预留；`mise outdated --monorepo` 尚未实现。
- **`--no-header`** — 不显示表头
- **`-h --help`** — 输出帮助信息

弃用：

`--bump` 的 `-l` 简写已弃用，并将在 mise 2027.8.5 中移除。移除后，`-l` 将成为 `--local` 的简写。请改用 `-b` 或 `--bump`。

示例：

```
$ mise outdated
Plugin  Requested  Current  Latest
python  3.11       3.11.0   3.11.1
node    20         20.0.0   20.1.0

$ mise outdated node
Plugin  Requested  Current  Latest
node    20         20.0.0   20.1.0

$ mise outdated --json
{"python": {"requested": "3.11", "current": "3.11.0", "latest": "3.11.1"}, ...}

$ mise outdated --local
Plugin  Requested  Current  Latest
node    20         20.0.0   20.1.0
```
