---
description: "查找 mise 错误或警告信息，了解原因和解决方法。"
outline: [2, 3]
---

# 错误信息

查找 mise 输出的信息，了解错误原因和解决方法。对于没有明确报错信息的问题，例如运行了错误的工具版本，请参阅[故障排查](/troubleshooting.html)。

## mise 如何报告错误 {#reading-errors}

mise 会在 `mise ERROR` 行中输出错误，并将每个底层原因分别列出。因此，最具体的原因通常是 `Version:` 前的最后一行：

```text
mise ERROR error parsing config file: ~/src/app/mise.toml
mise ERROR Config files in ~/src/app/mise.toml are not trusted.
Trust them with `mise trust`. See https://mise.jdx.dev/cli/trust.html for more information.
mise ERROR Version: 2026.10.4 linux-x64 (2026-10-07)
mise ERROR Run with --verbose or MISE_VERBOSE=1 for more information
```

`Version:` 行和建议使用 `--verbose` 重试的提示并不是错误原因。使用 `--verbose` 或 `MISE_DEBUG=1` 时，mise 会输出更详细的报告，为原因从 `0` 开始编号，并附上源位置。分享这些输出前，请先参阅[收集诊断信息](/troubleshooting.html#mise-is-failing-or-not-working-right)。

## 加载配置 {#loading-config}

### `Invalid TOML in config file` {#invalid-toml}

配置文件存在语法错误。mise 会显示文件、行号和列号，并在错误位置下方标记：

```text
  × Invalid TOML in config file
   ╭─[~/src/app/mise.toml:1:7]
 1 │ [tools
   ·       ▲
   ·       ╰── unclosed table, expected `]`
```

请修复该位置的语法错误。在项目文件能够成功解析之前，mise 无法判断是否需要信任它，因此有语法错误且不受信任的文件会先报 [`Config files in <path> are not trusted`](#untrusted-config)。该错误上方的 `TOML parse error at line <N>, column <M>` 警告会指出实际问题。

### `Config files in <path> are not trusted` {#untrusted-config}

mise 找到了一个需要先信任才能加载的项目配置文件：其中包含 `[env]`、hooks、模板、工具选项或设置。通常 `<path>` 指配置文件，且此消息会出现在 `error parsing config file: <path>` 行之后。检查文件后再信任它：

```sh
mise trust ~/src/app/mise.toml
```

如果条件允许，mise 会在失败前先询问。若无法询问，例如在脚本、编辑器扩展或没有终端的命令中，以及你回答“否”后，就会出现此错误。回答“否”或运行 `mise trust --ignore` 后，后续命令会跳过该配置且不再报错，直到你运行 `mise trust` 信任它。

如果 `mise run` 因当前目录中的配置不受信任或信任请求被拒绝而找不到任务，它会改为输出 `Config file(s) in <dir> are not trusted: <files>`。`mise doctor` 对不受信任文件只会报告 `failed to load config: error parsing config file: <path>`；运行 `mise trust --show` 可查看从当前目录向上的各配置目录信任状态。

[`ignored_config_paths`](/configuration/settings.html#ignored_config_paths) 指定的路径永远不会被加载，`mise trust` 也不会覆盖此设置。若要信任你所管理目录下的所有配置（包括今后在其中创建的项目），请在全局配置中设置 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)。在 [paranoid 模式](/paranoid.html)下，每个项目配置都需要信任，并且文件变更后必须重新信任。哪些文件需要信任、哪些命令会自动信任配置，请参阅[配置文件信任](/security.html#configuration-trust)。

### `mise version <X> is required, but you are using <Y>` {#min-version}

项目设置的 [`min_version`](/configuration.html#minimum-mise-version) 高于当前 mise 版本。请使用安装 mise 的包管理器更新，或运行 `mise self-update`。`mise self-update` 会跳过发布未满 24 小时的版本；如果所需版本比当前版本更新，请明确指定版本：

```sh
mise self-update 2026.10.4
```

`mise version <X> is recommended, but you are using <Y>` 表示 `soft` 最低版本检查产生了警告。mise 仍会继续运行。

### `<feature> is experimental` {#experimental}

命令或配置使用了实验性功能，完整消息会以 `Enable it with mise settings experimental=true` 结尾。此命令会在全局配置中启用 [`experimental`](/configuration/settings.html#experimental)。若只想为某个项目启用，请将其添加到项目的 `mise.toml`：

```toml [mise.toml]
[settings]
experimental = true
```

实验性功能可能在任何一次发布中发生变化。

### `<operation> is disabled in safe mode (MISE_SAFE=1)` {#safe-mode}

通过 `MISE_SAFE=1` 或 `safe` 设置启用了[安全模式](/security.html#safe-mode)，而该命令执行了安全模式会拒绝的操作，例如运行任务、执行 `postinstall` 选项或在模板中调用 `exec()`。如果你信任该配置，可在关闭安全模式后运行命令；否则请改用只解析版本的命令，例如 `mise ls` 或 `mise lock`。

## 查找和安装工具 {#installing-tools}

### `<tool> not found in mise tool registry` {#not-in-registry}

注册表中没有此名称对应的条目。`mise install` 和 `mise use` 会报告 `Failed to install <tool>@<version>: <tool> not found in mise tool registry`；如果存在相似名称，还会附上 `Did you mean?` 列表。请检查该列表，或搜索注册表：

```sh
mise search ripgrep
```

对于未登记在注册表中的工具，请直接指定后端。详见[选择哪个后端](/dev-tools/backends/#which-backend-to-use)：

```sh
mise use github:owner/repo   # GitHub releases
mise use aqua:owner/repo     # a tool in the aqua registry
mise use npm:package-name    # an npm package
```

### `Failed to install <tool>@<version>: <cause>` {#failed-to-install}

冒号后的文字才是实际错误，通常对应本页的其他条目，例如 404、403 或校验和不匹配。多个工具安装失败时，mise 会先输出 `Failed to install tools: <list>`，再逐一列出原因。若某行以 `note: <tool>@<version> was not checked against its version list` 开头，表示 mise 无法获取版本列表，因此该版本可能不存在。

如果原因不明确，请添加 `--verbose` 重试；也可以单独安装该工具，并让安装器直接连接终端：

```sh
mise install node@24 --raw
```

### `HTTP status client error (404 Not Found)` {#http-404}

错误信息中的 URL 不存在。常见原因如下：

- 版本不存在。版本请求没有匹配到任何已列出的版本时，mise 会尝试按原样下载；例如 `node = "99"` 会因找不到 `node-v99.tar.gz` 而返回 404。运行 `mise ls-remote <tool>` 检查可用版本。
- 与前缀匹配的所有发行版都比[最低发行时限](/security.html#minimum-release-age)新。例如 Node.js 26.11.0 发布后的当天，`node = "26.11"` 会因找不到 `node-v26.11.tar.gz` 而返回 404，`mise ls-remote node` 也会提示有较新的发行版被隐藏。若要立即安装，请指定确切版本，例如 `node@26.11.0`；否则请等待该版本达到时限。
- 后端标识符中的仓库名或软件包名有误，例如 `github:owner/repo`。
- 仓库是私有的。请求没有携带可访问令牌时，GitHub 会返回 404 而不是 403。详见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。

### `[<config file>] <tool>@<version>: <cause>` {#failed-to-resolve-version}

mise 无法解析指定配置文件中的版本请求，例如 `[~/src/app/mise.toml] node@24: <cause>`。`<tool>@<version>:` 后面的文字会说明原因，通常是 mise 遇到网络错误或本页列出的某种 HTTP 错误，无法获取版本列表。此信息也会出现在 `Failed to resolve tool version list for <tool>` 警告中。

### `no versions found for <tool>` {#no-versions-found}

后端没有列出符合 `latest` 或 `prefix:` 请求的版本。如果 `node = "26"` 这类普通前缀没有匹配版本，mise 会尝试按原样下载，通常会返回 [404](#http-404)。若消息提到 `matching minimum_release_age`，则表示所有匹配的发行版都比[最低发行时限](/security.html#minimum-release-age)新，该设置默认为 24 小时。消息会指出最新的隐藏版本；可按提示明确安装，例如运行 `mise use node@24.11.1`，或调低 `minimum_release_age`。

`unable to fetch versions for <tool>: <cause>` 表示 mise 完全无法获取版本列表；原因会在后面注明。

### `HTTP status client error (401 Unauthorized)` {#http-401}

服务器拒绝了 mise 提交的凭据。对于 GitHub，令牌可能无效、已过期、属于其他主机，或缺少所需 scope。消息中会包含 `github auth:` 行：

- `github auth: yes (token from <source>)` 会指出令牌来源，例如 `GITHUB_TOKEN`、`gh CLI (hosts.yml)` 或 `github_tokens.toml`。
- `github auth: yes` 表示已提交配置的令牌，但无法确定其来源。
- `github auth: no` 表示 mise 没有提交令牌。

请在相应来源中修复或替换令牌。运行 `mise token github` 可查看 mise 使用的令牌及其来源。详见 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)。其他主机请检查对应后端的身份验证设置。

### `HTTP status client error (403 Forbidden)` / `GitHub rate limit exceeded` {#http-403}

GitHub 返回 403（或 429）通常表示 API 请求超出速率限制，这在 CI 中很常见。也可能是令牌无权访问该仓库，或组织策略拒绝了请求。错误消息中的三行可用于区分这些情况：

- `github auth:` 表示 mise 是否提交了令牌。
- `github rate limit:` 显示剩余配额及重置时间。
- `github response:` 显示 GitHub 提供的说明。

如果超出速率限制，请设置 GitHub 令牌，或等待 mise 在 `GitHub rate limit exceeded. Resets at <time>` 中显示的重置时间。访问公开仓库的令牌无需任何 scope。如果已设置令牌，请检查其是否有权访问仓库，以及是否已获组织授权。令牌设置请参阅 [GitHub、GitLab 和 Forgejo 令牌](/dev-tools/github-tokens.html)；CI 配置请参阅 [GitHub Actions 和其他 CI](/dev-tools/github-tokens.html#ci-github-actions)。

mise 会从 [mise-versions](https://mise-versions.jdx.dev) 主机获取公开发行版元数据和制品证明，以避免大多数 GitHub API 调用。因此，GitHub 返回 403 通常表示该主机请求失败，mise 随后改为请求 GitHub（错误信息会列出两次请求的失败原因）；也可能是设置了 `MISE_USE_VERSIONS_HOST=0`，或该工具来自私有仓库或 GitHub Enterprise。使用记录了下载 URL 的[锁文件](/dev-tools/mise-lock.html)可避免安装时的大多数 API 调用。

其他主机返回 403 时，需要设置对应后端的凭据；GitHub 令牌对此无效。

### `Checksum mismatch for file <file>` {#checksum-mismatch}

```text
文件 node-v24.0.0.tar.gz 的校验和不匹配：
期望值：sha256:abc123...
实际值：  sha256:def456...
```

下载文件与 mise 预期的校验和不一致。预期值来自 `mise.lock`、后端元数据或发行版的校验和文件。通常是下载未完成，或代理修改了文件，可重试一次。如果仍然失败，发布者可能替换了发行文件。更新锁文件条目之前，请先检查发行版页面；详见[校验和不匹配](/dev-tools/mise-lock.html#regenerating-checksums)。切勿为了绕过错误而删除校验和。清除缓存不会更改 `mise.lock` 中记录的校验和。

### `<tool>@<version> is not in the lockfile` / `No lockfile URL found` {#not-in-lockfile}

[严格锁文件模式](/dev-tools/mise-lock.html#strict-lockfile-mode)已通过 `--locked`、`MISE_LOCKED=1` 或 `locked` 设置启用，但 `mise.lock` 中没有本次安装所需的信息：

- `is not in the lockfile` 表示锁文件中没有记录该工具的版本。
- `No lockfile URL found for <tool> on platform <platform>` 表示该工具条目没有当前平台的下载 URL。

按照消息下方 `hint:` 行的提示运行 `mise lock`，并提交更新后的 `mise.lock`。若要为其他平台（例如 CI runner）添加条目，请参阅[准备平台条目](/dev-tools/mise-lock.html#preparing-platform-entries)。

## 运行工具 {#running-tools}

### `missing: <tool>@<version>` {#missing}

这是一个警告。项目请求的版本尚未安装，但该工具的其他版本已安装。请运行 `mise install`。若要更改此警告的显示时机，请设置 [`status.missing_tools`](/configuration/settings.html#status.missing_tools)。

### `No version is set for shim: <command>` / `Tool not installed for shim: <command>` {#shim-errors}

你在一个没有配置文件为该工具选择版本的目录中运行了 [shim](/dev-tools/shims.html)。请使用 `mise use <tool>@<version>` 添加版本，或使用 `mise use -g <tool>@<version>` 为所有目录设置默认版本；错误消息会列出可供选择的已安装版本。

`Tool not installed for shim` 表示配置选择的版本尚未安装，且未触发自动安装。请运行 `mise install`。

### `<tool>@<version> not installed` / `<command> is not a mise bin` {#not-installed}

`mise where` 和 `mise which` 会在你指定的版本或项目所选版本尚未安装时报告此错误。请运行 `mise install` 或 `mise install <tool>@<version>`。`mise ls <tool>` 会显示已安装的版本，以及配置文件请求的版本。

### `PATH is <N> characters, longer than the 8191 cmd.exe accepts` {#path-too-long}

在 Windows 上，mise 生成的 `PATH` 超过了 `cmd.exe` 可接受的长度，导致后者忽略它。详见 [PATH 过长](/troubleshooting.html#path-limits)。

## 任务和命令 {#tasks}

### `no task <name> found` / `no tasks defined in <dir>` {#task-not-found}

`no task <name> found` 会列出相似任务名称及当前可用的任务。请检查拼写、所选[配置环境](/configuration/environments.html)和单体仓库前缀。`mise tasks ls` 会列出当前目录的任务；`mise --cd <dir> tasks ls` 则会列出其他项目的任务。

`no tasks defined in <dir>` 表示 mise 没有找到任何任务。请确认当前位于项目目录中。如果消息列出了任务目录中的非可执行文件，请按提示为其添加执行权限。如果当前目录的配置不受信任或已被拒绝，mise 会改为报告 [`Config file(s) in <dir> are not trusted`](#untrusted-config)。

依赖项引用了不存在的任务时，则会报 `task not found: <name>`；详见[依赖关系和执行顺序](/tasks/architecture.html)。

### `[<task>] ERROR task failed` / `<command> exited with non-zero status` {#command-failed}

mise 运行的任务、插件脚本、hook 或安装器出现错误并退出。对于任务，mise 会输出 `[<task>] ERROR task failed`，并以任务的退出状态结束。使用 `--continue-on-error` 时，最终会显示 `ERROR <N> task(s) failed:` 汇总。对于插件脚本和安装器，则会报告 `<command> exited with non-zero status: exit code <N>`（或 `killed by <signal>`）。`mise exec` 和 shims 会直接传递命令的退出码，不附加错误消息。

错误消息上方命令自身的输出就是原因。如果该输出被隐藏，请添加 `--verbose` 重试；安装时也可使用 `mise install --raw`。如果命令在 mise 中的行为与 shell 中不同，请对比 `mise exec -- <command>` 使用的目录、工具和环境。
