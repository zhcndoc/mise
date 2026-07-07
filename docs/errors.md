# 错误

本页面列出了 mise 发出的常见错误消息、它们的成因以及修复方法。
它是 [故障排除](/troubleshooting.html) 的补充，后者按症状组织
（错误的工具版本、缓慢的提示、激活问题），而不是按错误消息组织。

每个错误后面都会跟着一个通用页脚，如下所示：

```text
mise ERROR 版本：2026.7.0
mise ERROR 使用 --verbose 或 MISE_VERBOSE=1 运行以获取更多信息
```

真正的错误是页脚上方的那一行或多行。要获取有关任何错误的更多细节：

```sh
mise --verbose <command>    # 或 MISE_VERBOSE=1 — 显示堆栈跟踪和命令输出
MISE_DEBUG=1 mise <command> # 调试日志
MISE_TRACE=1 mise <command> # 跟踪日志（非常详细）
mise doctor                 # 关于你的设置的诊断和警告
```

## `配置文件在 <dir> 中未被信任。请使用 mise trust 进行信任。`

mise 在一个你尚未标记为受信任的目录中找到了配置文件（`mise.toml`、`.tool-versions` 等）。配置文件可以定义环境变量、模板和任务，因此在你批准之前，mise 不会从陌生目录中加载它们。

在该目录中运行 [`mise trust`](/cli/trust.html) 以信任它。若要信任整个项目树（例如 `~/src` 下的所有内容），请使用 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths) 设置。另请参阅 [paranoid mode](/paranoid.html) 以了解更严格的行为。

## `<tool> 未在 mise 工具注册表中找到`

你使用的工具名称在 [注册表](/registry.html) 中没有对应的简写。如果错误信息
中包含 “Did you mean?” 列表，请先检查是否有拼写错误。

如果该工具确实不在注册表中，你仍然可以通过显式指定后端来安装它：

```sh
mise use aqua:owner/repo     # 如果它在 aqua 注册表中
mise use github:owner/repo   # GitHub releases
mise use cargo:some-tool     # crates.io
mise use npm:some-tool       # npm
```

查看 [后端](/dev-tools/backends/) 了解所有选项。注册表只为常见工具提供简短名称——任何工具都可以使用显式后端语法安装。

## `Failed to install <tool>@<version>: <underlying error>`

对安装过程中实际出错内容的封装——冒号后的文本才是真正的错误，所以请从那里开始看起（它通常是本页列出的其他错误之一，比如 403 或校验和不匹配）。如果不清楚，请使用 `--verbose` 重新运行以查看完整输出，或者使用 `mise install <tool>@<version> --raw` 以串行方式运行安装，并将 stdin/stdout 连接到你的终端。

## `<tool>@<version> 未安装`

mise 已知所请求的版本，但磁盘上未安装。运行
`mise install`（或 `mise install <tool>@<version>`）来安装它。`mise ls <tool>`
会显示哪些版本已安装，以及哪些版本只是被配置文件请求。

## `[<config file>] <tool>@<version>: <error>`（无法解析版本）

mise 无法解析由指定配置文件请求的版本——例如
当不存在该版本时，`[~/src/proj/mise.toml] node@99`。常见原因包括：

- **该版本不存在**：请运行 `mise ls-remote <tool>` 查看可用版本。
- **版本缓存过期**：最近发布的版本可能尚未缓存。运行
  `mise cache clear` 后重试。参见
  [新版本不可用](/troubleshooting.html#new-version-of-a-tool-is-not-available)。
- **网络/API 错误**：后端无法列出版本（速率限制、离线）。
  冒号后的底层错误会说明这一点。

## `HTTP 状态客户端错误 (403 禁止访问)` / `GitHub 速率限制已超出`

你已经触发了 GitHub 的 API 速率限制，对于未认证请求来说，这个限制非常低。  
这在 CI 中尤其常见。如果没有配置 token，mise 会打印一条警告提醒你。

请在你的环境中将 GitHub token（不需要任何 scope）设置为 `GITHUB_TOKEN` 或 `MISE_GITHUB_TOKEN` —— 有关所有受支持的 token 来源，请参见 [GitHub Tokens](/dev-tools/github-tokens.html)。如果已经设置了 token，请确认它有效并且有权访问该仓库（私有仓库需要相应的 scope）。

错误输出中包含 `github auth:` 和 `github rate limit:` 两行，可帮助你判断当前属于哪种情况。

## `文件 <file> 的校验和不匹配`

```text
文件 node-v24.0.0.tar.gz 的校验和不匹配：
期望值：sha256:abc123...
实际值：  sha256:def456...
```

下载的文件与锁定文件、aqua
注册表或工具发布的校验和中的预期值不一致。按大致可能性排序，原因包括：

- **下载损坏或被截断**：运行 `mise cache clear` 并重试。
- **过期的锁定文件**：[`mise.lock`](/dev-tools/mise-lock.html) 中的校验和
  是为另一个制品记录的（例如，上游发布资源被重新上传了）。
  从 `mise.lock` 中删除受影响的条目，然后重新安装以重新锁定它。
- **篡改**：如果不匹配仍然存在，而且你无法解释原因，不要覆盖它——
  在安装前先验证上游发布。

## `mise version <X> is required, but you are using <Y>`

项目的配置文件声明了一个比你已安装的 mise 更新的 [`min_version`](/configuration.html)。使用 `mise self-update` 更新 mise（如果是通过独立安装程序安装的），或者通过你用于安装它的包管理器进行更新。

## `未找到任务 <name>`

当前配置层级中没有定义该名称的 [task](/tasks/)。运行
`mise tasks ls` 查看可用任务——请注意，任务会从当前目录及其父目录中的配置文件加载，因此在其他项目目录中定义的任务将不可见。

## `<command> 退出并返回非零状态：退出代码 <N>` / `命令失败：退出代码 <N>`

这表示某个命令执行失败了——可能是一个任务、一个插件脚本，或者通过 `mise exec`/shims 运行的程序。问题出在命令本身，而不是 mise 本身；mise 会传递该命令的退出代码。如果当前还没有显示完整输出，请使用 `--verbose`（或 `MISE_DEBUG=1`）重新运行，以查看命令的完整输出。
