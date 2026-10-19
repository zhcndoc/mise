---
description: "刷新或清除 mise 缓存的版本列表、环境和任务结果，并了解何时会重新获取数据。"
socialDescription: "刷新或清除 mise 缓存的版本列表、环境与任务结果。"
---

# 缓存

mise 会分别缓存工具元数据、计算后的环境和任务结果。请根据遇到的问题清理对应缓存：清除版本列表不会重新安装工具，清除环境缓存也不会更改配置。

```sh
mise cache path              # print the cache directory
mise cache clear node        # clear Node.js metadata
mise cache prune --dry-run   # list stale cache files
```

## 工具元数据缓存 {#tool-cache}

后端会在[缓存目录](/directories.html#cache-mise)中保存元数据，包括远程版本列表，以及因后端而异的别名、可执行文件目录和插件 `exec-env` 输出。请通过 `mise ls-remote node` 等命令读取这些信息，不要直接读取缓存文件，因为其格式可能会变化。

### mise 何时刷新版本列表 {#version-list-refresh}

频繁运行的命令无论缓存的版本列表有多旧，都会直接使用缓存，因此不会等待网络响应。这些命令包括 shell 激活、`mise exec`、`mise env`、`mise ls`、`mise current`、`mise which`、`mise where` 和 shims。仅当没有缓存列表时，它们才会获取列表。

用于报告最新版本的命令（`mise outdated`、`mise upgrade`、`mise ls-remote`、`mise lock` 和 `mise latest`）会在版本列表超过
[`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 指定的时长后重新获取；该时长默认为 1 小时。

只需要查找符合请求的版本的命令（例如 `mise install`、`mise use` 和 `mise run`）会缓存列表，时长为工具的
[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 减去 1 小时（版本主机快照最多会延迟 1 小时），范围为 1 到 24 小时：默认截止时间下为 23 小时；工具设置 `minimum_release_age = "6h"` 时为 5 小时；关闭截止时间时为 1 小时。无论如何，列表中尚未达到该等待时长的发行版本都不能安装。若列表没有为每个版本记录日期，或你自行设置了 `fetch_remote_versions_cache`，则列表会改为在 `fetch_remote_versions_cache` 指定的时长后重新获取。

同一缓存时长也适用于一次代表多个工具版本列表的 mise-versions 索引，以及 `pipx:` 工具注册表报告的最新发行版（即同一列表中日期最新的发行版）。维护者可以将 `latest` 指针移至任意版本，例如 npm 的 `latest` dist-tag 或 asdf 插件的 `latest-stable` 脚本；这类指针仍会在 `fetch_remote_versions_cache` 指定的时长后重新获取。

设置 [`prefer_offline`](/configuration/settings.html#prefer_offline) 可让所有命令都采用相同方式使用缓存列表；设置 [`offline`](/configuration/settings.html#offline) 则会完全阻止网络请求。

若要在缓存列表过期前查看新发行版：

```sh
mise cache clear node
mise ls-remote node
```

部分元数据来自[版本托管服务](/troubleshooting.html#new-version-of-a-tool-is-not-available)，清除本地缓存不会刷新该服务。即使列表已刷新，锁文件或固定版本仍可能让工具保持在旧版本。

asdf 插件的 `exec-env` 输出也会缓存；修改插件后请运行 `mise cache clear <tool>`。

## 环境缓存 <Badge type="warning" text="实验性" /> {#environment-caching}

实验性设置 [`env_cache`](/configuration/settings.html#env_cache) 会将计算后的环境缓存到磁盘。当环境 provider 较慢，或 mise 在自身内部嵌套运行时，此功能可以提升性能：

```toml [~/.config/mise/config.toml]
[settings]
env_cache = true
env_cache_ttl = "4h"
```

此缓存位于[状态目录](/directories.html#local-state-mise)下的 `env-cache/`，而不是缓存目录中。`mise activate` 和 `mise exec` 会创建一个 session key，嵌套命令会继承该密钥；只有密钥相同才会复用缓存环境，因此其他会话会单独计算环境。缓存会在磁盘上加密，但继承该 session key 的任何进程都可以读取它。

缓存键包含配置路径及修改时间、已解析的工具版本、相关设置、基础 `PATH` 和 mise 版本。条目会在 [`env_cache_ttl`](/configuration/settings.html#env_cache_ttl) 指定的时长后过期；env 插件声明为受监视的文件发生变化时，也会使缓存失效。修改 dotenv 文件或 `_.source` 脚本后，嵌套命令仍可能使用缓存环境；如果改动没有生效，请清除或禁用缓存。外部服务发生变化（例如密钥轮换）不属于文件变更，因此请设置合适的 TTL。

mise 不会缓存密钥。包含 `age` 加密值、sops 加密的 `_.file`、带有 `redact = true` 的指令，或返回 `redact = true` 的 env 插件，其环境都不会写入环境缓存；mise 每次都会重新计算。

环境指令无法逐项退出缓存，因此时间戳模板等值会一直保持不变，直到缓存过期。对需要新值的命令，可设置 `MISE_ENV_CACHE=0`：

```sh
MISE_ENV_CACHE=0 mise exec -- npm test
```

设置 `env_cache = false` 可为所有命令关闭缓存。Env 插件会在 `MiseEnv` 返回值中声明是否可缓存及受监视文件；详见 [Env 插件](/env-plugin-development.html)。

`mise cache clear` 也会清除缓存的环境。刷新环境无需移除已安装的工具或信任记录。

## 任务缓存 {#task-caches}

任务可以在源文件未变更时跳过执行，或恢复缓存的输出。这与元数据缓存和环境缓存相互独立。对于名为 `build` 的任务：

```sh
mise cache task build
mise cache clear --task build
```

`--task` 只会清除 mise 能关联到当前项目该任务的条目。不带参数运行 `mise cache clear` 会清除所有缓存，包括其他项目的任务缓存和环境缓存。配置和缓存键说明请参阅[任务缓存](/tasks/caching.html)。

## 清理缓存 {#cache-auto-pruning}

mise 会定期删除超过 [`cache_prune_age`](/configuration/settings.html#cache_prune_age) 未读取的缓存文件。这与缓存是否过期无关：版本列表可能会在文件达到清理时限之前很久就重新获取。

```sh
mise cache prune --dry-run
mise cache prune
```

无论清理时限如何，缓存环境都会根据自身 TTL 过期。设置 `cache_prune_age = "0s"` 可关闭基于时限的清理；定期清理和 `mise cache prune` 都会随之停止。

有关 CI 中的缓存键，请参阅[持续集成](/continuous-integration.html)。
