---
description: "为项目配置和环境文件启用绑定内容的信任，拒绝未登记插件，并可选择重新验证来源证明。"
socialDescription: "按需启用 paranoid 防护：配置文件信任、环境文件、插件和来源证明。"
---

# Paranoid 模式

Paranoid 模式会要求 mise 在信任通常会自动加载的内容前先征求你的批准。它分为四类，可全部启用，也可只启用所需类别：

| 类别         | 要求                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------ |
| `config`     | 每个项目配置文件都需按内容单独批准，包括 CI 中的文件；不自动信任。                           |
| `env_files`  | 批准 `env._.file`、`env._.source` 和 `env_file` 设置所加载的文件。                           |
| `plugins`    | 拒绝通过简写名称安装未登记的社区插件。                                                     |
| `provenance` | 每次安装都重新验证来源证明，并向 mise-versions 确认“无 attestation”的结果。                |

Paranoid 模式不会沙箱化你批准的命令；参见[沙箱](/sandboxing.html)。

使用 `MISE_PARANOID=1` 可为单条命令启用所有类别，也可为所有命令启用：

```sh
mise settings paranoid=true
```

`mise settings paranoid=false` 会关闭所有类别。也可以指定要启用的类别：

```sh
mise settings paranoid=env_files,plugins
```

```toml
# ~/.config/mise/config.toml
[settings]
paranoid = ["env_files", "plugins"]
```

环境变量 `MISE_PARANOID=config,env_files` 用于选择类别。若名称无效，命令会报错并列出有效类别。[`paranoid`](/configuration/settings.html#paranoid) 设置仅限全局配置使用，项目无法更改。

## 仅批准 dotenv 文件 {#approving-only-env-files}

全局 `find_up` 条目会从当前所在仓库加载 dotenv 文件。若要批准这些文件，但不改变项目配置的信任方式，只需单独启用 `env_files`：

```toml
# ~/.config/mise/config.toml
[settings]
paranoid = ["env_files"]

[env]
_.file = [{ path = ".env", find_up = true }]
```

在包含 `.env` 的仓库中，mise 会拒绝加载该文件，直到你批准其当前内容；每次编辑后都需要重新批准：

```sh
mise trust .env
```

项目配置、CI、插件和来源证明的行为与未启用 paranoid mode 时相同。

## 配置文件 {#config}

`config` 类别会以下列方式改变[常规信任规则](/security.html#configuration-trust)：

- Every config file outside global and system config needs trust, including
  files that normally load without it: `.tool-versions`, idiomatic version files
  such as `.nvmrc`, task files, and a `mise.toml` that only lists tools. The
  exception is `.miserc.toml`, which still loads without trust: it can only
  choose which config files load, and those files need trust.
- Trust is bound to content. `mise trust` stores a hash of the file, and any edit
  makes it untrusted again.
- Each file is trusted on its own. Trusting `mise.toml` does not trust
  `mise.local.toml` beside it.
- `mise run`, `mise install`, `mise exec`, `mise watch` and the `mise daemons`
  start, restart and register commands do not trust the config they load.
- CI does not make config trusted, and `--yes`, `MISE_YES=1` and `CI` do not
  answer the trust prompt. In a terminal, mise still asks.
- Trust is not shared between git worktrees.
- Trusting a monorepo root trusts only that file. Trust each subproject's config
  separately.

Read each file, then approve it. `mise trust --show` lists the config files from
the current directory up and whether each is trusted:

```sh
mise trust --show
mise trust path/to/mise.toml
```

For unattended runs, review the config and run `mise trust` before the job loads
it.

These stay trusted by path, without a hash, so editing them needs no new
approval:

- configs under [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)
- global and system config, which is where you turn paranoid mode on

If [safe mode](/security.html#safe-mode) is also on, it takes precedence: project
config loads without a trust prompt because it cannot run code, and nothing is
marked trusted.

### Remote includes

A remote [`include`](/configuration.html#include) must be pinned to a full
lowercase commit sha (`?ref=` followed by 40 or 64 hex digits) or to an OCI
digest (`@sha256:` followed by 64 lowercase hex digits), so that the hash of the
trusted file covers what it pulls in. A branch, a tag or a missing ref fails to
load:

```toml
include = [
  "git::https://github.com/myorg/platform.git//mise.toml?ref=0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c",
]
```

### 环境文件 {#environment-files}

`env_files` 类别适用于此处。`env._.file` 加载的文件或 `env._.source` 运行的脚本，不受引用它们的配置文件的信任状态保护，因为修改它们会改变所有命令的环境。每个已有文件都需要基于其内容单独信任；未获批准时会报错并指出路径，但不会显示文件中的值。文件一旦修改，信任就会失效：

```sh
mise trust
```

不带路径运行 `mise trust` 会信任最近的未信任配置，以及该配置读取的所有环境文件和脚本；文件修改后需要再次批准。`mise trust .env` 则只信任该文件。

此规则适用于所有 `_.file` 格式、`_.source` 脚本，以及 [`env_file`](/configuration/settings.html#env_file) 设置找到的文件，也包括全局 `find_up = true` 条目或 glob 在仓库中找到的文件。它不适用于全局 `_.file` 或 `_.source` 条目中由你明确指定的单个文件（不含 glob）。

无论是否启用 `config` 类别，文件批准都绑定于文件内容。若要无需逐次批准就加载文件，请将其放在 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths) 下。与其他按路径信任的设置一样，它仅限全局配置使用，项目不能将自己的文件排除在信任检查之外。

## 社区插件 {#plugins}

`plugins` 类别会改变这一行为。普通模式下，通过简写名称安装社区插件时会要求确认；Paranoid 模式则直接拒绝。与配置文件信任不同，`--yes`、`MISE_YES=1`、CI 和 `--force` 仍可允许安装。

A short name counts as trusted when its URL matches an asdf or vfox plugin in
mise's registry, or when the plugin is in the `mise-plugins` GitHub
organization. To install any other plugin, give its full Git URL on the command
line or in `[plugins]`. Naming the URL is your decision to trust that source:

```sh
mise plugins install example https://github.com/example/asdf-example
```

## 重新验证来源证明 {#provenance}

`provenance` 类别会启用 [`locked_verify_provenance`](/configuration/settings.html#locked_verify_provenance)。每次安装都会重新运行后端支持的来源证明检查，例如 SLSA、Cosign、Minisign 和 GitHub attestations，而不是复用 [`mise.lock`](/dev-tools/mise-lock.html#provenance-and-security) 中记录的结果。此操作可能需要网络连接，不会增加后端不支持的检查，也不会重新检查已安装的工具。

## 来自 mise-versions 的证明

mise asks [mise-versions](/configuration/settings.html#use_versions_host)
whether a public GitHub release artifact has GitHub attestations, so installs do
not spend your GitHub API rate limit. mise verifies any attestation it returns
and requires it to name the artifact's repository, so mise-versions cannot vouch
for an artifact. It can, however, answer that an artifact has none. Normal mode
accepts that answer, and a lockfile written afterwards records no provenance.

`provenance` 类别会在跳过验证前，通过 GitHub 确认“无 attestation”的结果。每个没有 attestations 的资源文件会额外消耗一次 GitHub API 请求。

在两种模式下，如果 mise-versions 无法响应（例如超时、连接中断，或返回 `429`、`5xx`），mise 都会改为查询 GitHub attestation API，并以相同方式验证 GitHub 返回的结果。如果 GitHub 也失败，则由 [`provenance_api_failures_fatal`](/configuration/settings.html#provenance_api_failures_fatal) 决定后续处理方式。
