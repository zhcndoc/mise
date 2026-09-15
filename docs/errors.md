---
description: "本页面列出了 mise 发出的常见错误消息、它们的成因以及修复方法。"
---

# 错误

本页面列出了 mise 发出的常见错误消息、它们的成因以及修复方法。
它是 [故障排除](/troubleshooting.html) 的补充，后者按症状组织
（错误的工具版本、缓慢的提示、激活问题），而不是按错误消息组织。

从最终退出状态或版本行上方的具体失败信息及其嵌套原因开始查看。页脚通常只建议启用详细日志；它不是错误的原因。
例如，要诊断 Node 安装：

```sh
mise --verbose install node@24
MISE_DEBUG=1 mise install node@24
MISE_TRACE=1 mise install node@24
mise doctor
```

将 `install node@24` 替换为失败的命令。跟踪日志尤其详细；分享日志前，请检查其中的凭据、环境值和私有路径。

## `Config files in <dir> are not trusted. Trust them with mise trust.`

mise 发现了需要先获得信任才能加载的配置。检查文件，然后如果你接受其内容，请在该目录中运行 [`mise trust`](/cli/trust.html)。
`mise trust --show` 会显示当前的信任状态，但不会更改它。

在正常模式下，简单的工具版本／任务配置无需信任即可加载；在 CI 环境之外，`mise run`、`mise install` 和 `mise exec` 等命令会隐式信任其活动配置。环境指令、模板、工具选项以及
[偏执模式](/paranoid.html) 可能需要显式批准。列在
[`ignored_config_paths`](/configuration/settings.html#ignored_config_paths) 中的路径永远不会被加载；
`mise trust` 不会覆盖该设置。

仅对你打算信任的路径使用 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)，包括这些路径下未来的项目。

## `<tool> 未在 mise 工具注册表中找到`

你使用的工具名称在 [注册表](/registry.html) 中没有对应的简写。如果错误信息
中包含 “Did you mean?” 列表，请先检查是否有拼写错误。

如果注册表中没有对应条目，请选择支持该工具的后端。以下是语法示例；将仓库或软件包名称替换为真实名称：

```sh
mise use aqua:owner/repo     # 如果它在 aqua 注册表中
mise use github:owner/repo   # GitHub releases
mise use cargo:some-tool     # crates.io
mise use npm:some-tool       # npm
```

有关所有选项，请参阅 [后端](/dev-tools/backends/)。注册表只为常用工具提供简写名称。显式后端语法可以避免依赖注册表条目，但后端仍需要兼容的软件包或发布资源，以及任何所需的运行时。

## `Failed to install <tool>@<version>: <underlying error>`

对安装过程中实际出错内容的封装——冒号后的文本才是真正的错误，所以请从那里开始看起（它通常是本页列出的其他错误之一，比如 403 或校验和不匹配）。如果不清楚，请使用 `--verbose` 重新运行以查看完整输出，或者使用 `mise install <tool>@<version> --raw` 以串行方式运行安装，并将 stdin/stdout 连接到你的终端。

## `<tool>@<version> 未安装`

mise 已知请求的版本，但该版本尚未安装到磁盘上。运行
`mise install`（或 `mise install <tool>@<version>`）进行安装。`mise ls <tool>`
会显示已安装的版本，以及仅由配置文件请求但尚未安装的版本。

## `[<配置文件>] <工具>@<版本>: <错误>`（无法解析版本）

mise 无法解析由指定配置文件请求的版本——例如
当不存在该版本时，`[~/src/proj/mise.toml] node@99`。常见原因包括：

- **版本不存在**：运行 `mise ls-remote <tool>` 查看可用版本。
- **版本缓存过期**：最近发布的版本可能尚未缓存。对于 Node，运行
  `mise cache clear node`，或者将其替换为受影响的工具，然后重试。请参阅
  [新版本不可用](/troubleshooting.html#new-version-of-a-tool-is-not-available)。
- **网络／API 错误**：后端无法列出版本（速率限制、离线）。冒号后的底层错误会说明具体情况。

## `HTTP 状态客户端错误（401 未授权）`

对于 GitHub URL，这意味着 GitHub 拒绝了 mise 发送的凭据，通常是因为令牌无效、已过期、对应的是其他 GitHub 主机，或缺少必需的作用域。错误中会包含一行 `github auth:`，当 mise 解析出令牌时，该行会指明令牌来源，例如 `GITHUB_TOKEN`、`gh CLI (hosts.yml)` 或 `github_tokens.toml`。

检查或替换指定来源中的令牌。如果无法确定来源，mise 会打印 `github auth: yes`，并指向一个已配置的 GitHub 令牌。如果未发送 Authorization 标头，则会打印 `github auth: no`。有关支持的令牌来源和配置，请参阅
[GitHub Tokens](/dev-tools/github-tokens.html)。对于其他主机，请检查相应后端的身份验证设置。

## `HTTP 状态客户端错误（403 禁止访问）` / `GitHub 速率限制超出`

403 可能表示 API 速率限制、缺少仓库访问权限，或拒绝请求的组织策略。检查 URL 和响应正文。对于 GitHub，`github auth:` 和 `github rate limit:` 诊断行有助于区分这些情况。

如果错误报告了速率限制，请配置身份验证，或等待所述的重置时间。对于公共仓库，令牌不需要具有私有仓库访问权限。如果已经存在令牌，请验证其来源以及对该仓库的访问权限，包括任何必需的组织授权。请参阅 [GitHub Tokens](/dev-tools/github-tokens.html)。

对于非 GitHub 主机，请使用相关后端文档中说明的身份验证机制。添加 GitHub 令牌无法修复其他服务返回的 403。

## `文件 <file> 的校验和不匹配`

```text
文件 node-v24.0.0.tar.gz 的校验和不匹配：
期望值：sha256:abc123...
实际值：  sha256:def456...
```

下载的文件与预期校验和不匹配。确定该预期值的来源：锁定文件、后端注册表或上游发布校验和。同时检查 URL 和所选资源是否与预期的版本、操作系统及架构匹配。

下载不完整可能导致不匹配；检查网络或代理错误后，重试下载。上游替换发布资源也可能使之前记录的校验和失效。在更新锁定文件条目前，请对比发布者提供的信息。不要为了让错误消失而删除预期校验和或禁用验证。

有关如何记录资源 URL 和校验和，请参阅 [锁定文件](/dev-tools/mise-lock.html)。仅清除版本缓存不会更改 `mise.lock` 中固定的校验和。

## `mise version <X> is required, but you are using <Y>`

项目的配置文件声明了一个比你已安装的 mise 更新的 [`min_version`](/configuration.html)。使用 `mise self-update` 更新 mise（如果是通过独立安装程序安装的），或者通过你用于安装它的包管理器进行更新。

## `未找到任务 <name>`

当前配置层级中未定义名为该名称的[任务](/tasks/)。运行
`mise tasks ls` 查看可用任务。检查当前目录、所选环境和任务名称，包括任何单体仓库命名空间。使用 `mise --cd path/to/project tasks ls` 检查其他项目。有关文件任务和配置发现，请参阅[任务配置](/tasks/)。

## `<command> 退出并返回非零状态：退出代码 <N>` / `命令失败：退出代码 <N>`

这表示 mise 执行的命令失败了——可能是任务、插件脚本，或通过 `mise exec`／shims 运行的程序。先查看子命令的输出，然后检查其工作目录、参数、所选工具和环境。如果这些输入与交互式 shell 中的输入不同，任务或安装可能会失败。如果尚未显示命令的完整输出，请使用 `--verbose`（或 `MISE_DEBUG=1`）重新运行以查看。
