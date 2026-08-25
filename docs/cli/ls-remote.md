<!-- @由 usage-cli 根据用法规范生成 -->
# `mise ls-remote`

- **用法：** `mise ls-remote [FLAGS] [TOOL@VERSION] [PREFIX]`
- **别名：** `list-all`、`list-remote`
- **效果：** 只读
- **源代码：** [`src/cli/ls_remote.rs`](https://github.com/jdx/mise/blob/main/src/cli/ls_remote.rs)

列出可供安装的运行时版本。

请注意，结果可能会被缓存，运行 `mise cache clean` 可清除缓存并获取最新结果。

## 参数
- **`[TOOL@VERSION]`** — 用于获取版本的工具
- **`[PREFIX]`** — 查询最新版本时使用的版本前缀
  与 "@" 后的第一个参数相同

## 标志
- **`--all`** — 显示所有已安装的插件和版本
- **`--minimum-release-age <MINIMUM_RELEASE_AGE>`** — 仅显示在此时间长度或日期之前发布的版本

  支持类似 "2024-06-01" 的绝对日期以及类似 "90d" 或 "1y" 的相对时长。
- **`-J --json`** — 以 JSON 格式输出（在可用时包含 created_at 时间戳等版本元数据）
- **`--no-versions-host`** — 禁用对 mise-versions 主机的检查
- **`--prerelease`** — 对于提供上游预发布元数据或选择加入基于正则表达式的预发布检测的后端，在输出中包含预发布版本
  等效于在此命令执行期间设置 `MISE_PRERELEASES=1` 或 `prereleases` 设置。
- **`--strict-metadata`** — 如果版本发布元数据获取失败则失败

  需要 --json 和 --no-versions-host。

  这可以防止元数据使用者在后端获取元数据的上游请求失败时接受空的回退结果。
- **`-h --help`** — 打印帮助

示例：

```
$ mise ls-remote node
18.0.0
20.0.0

$ mise ls-remote node@20
20.0.0
20.1.0

$ mise ls-remote node 20
20.0.0
20.1.0

$ mise ls-remote node --minimum-release-age 2024-01-01
20.0.0

$ mise ls-remote github:cli/cli --json
[{"version":"2.62.0","created_at":"2024-11-14T15:40:35Z","prerelease":false},{"version":"2.61.0","created_at":"2024-10-23T19:22:15Z","prerelease":false}]
```
