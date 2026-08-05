<!-- @由 usage-cli 根据用法规范生成 -->
# `mise ls-remote`

- **用法**：`mise ls-remote [FLAGS] [TOOL@VERSION] [PREFIX]`
- **效果**：只读
- **源代码**：[`src/cli/ls_remote.rs`](https://github.com/jdx/mise/blob/main/src/cli/ls_remote.rs)

列出可供安装的运行时版本。

请注意，结果可能会被缓存，运行 `mise cache clean` 可清除缓存并获取最新结果。

## 参数

### `[TOOL@VERSION]`

用于获取版本的工具

### `[PREFIX]`

在查询最新版本时使用的版本前缀
与“@”后面的第一个参数相同。

## 标志

### `--all`

显示所有已安装的插件和版本

### `--minimum-release-age <MINIMUM_RELEASE_AGE>`

仅显示在此时间或日期之前发布的版本

支持像 "2024-06-01" 这样的绝对日期，以及像 "90d" 或 "1y" 这样的相对时长。

### `-J --json`

以 JSON 格式输出（在可用时包含如 created_at 时间戳之类的版本元数据）

### `--no-versions-host`

禁用检查 mise-versions 主机

### `--prerelease`

对报告上游预发布元数据或选择加入基于正则表达式的预发布检测的后端，在输出中包含预发布版本。等同于在此命令执行期间设置 `MISE_PRERELEASES=1` 或 `prereleases` 设置。

### `--strict-metadata`

如果发布元数据获取失败，则失败

需要 --json 和 --no-versions-host。

这可以防止当某个后端生成元数据的上游请求失败时，元数据消费者接受空的回退结果。

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
