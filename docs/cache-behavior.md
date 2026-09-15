---
description: "mise 分别缓存版本元数据、计算出的环境和任务结果"
---

# 缓存行为

mise 分别缓存版本元数据、计算出的环境和任务结果。请从与症状相关的缓存开始：清除版本列表不会重新安装工具，清除环境缓存不会更改你的配置。

```sh
mise cache path                 # show the actual cache directory
mise cache clear node           # clear Node's tool metadata
mise cache prune --dry-run      # preview stale cache files
```

## 工具缓存

后端会将元数据存储在 [`MISE_CACHE_DIR`](/directories.html#cache-mise) 下，其中包括远程版本列表，以及在适用情况下的别名、可执行文件目录和插件 `exec-env` 结果。具体文件取决于后端。请通过 mise 的命令检查值，例如 `mise ls-remote node`，而不要依赖内部缓存格式。

远程版本列表默认在一小时内有效，由 [`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 控制。若要在该时间段过期前再次检查：

```sh
mise cache clear node
mise ls-remote node
```

部分元数据也来自[版本服务](/troubleshooting.html#new-version-of-a-tool-is-not-available)。清除本地缓存不会刷新该远程服务。即使元数据已经刷新，锁定文件或显式版本固定也可能使安装继续使用较旧版本。

asdf 插件的 `exec-env` 输出会被缓存，以避免每次计算环境时都启动 Bash。插件作者应使用它来处理与安装相关的环境值；动态项目配置应放在[环境指令](/environments/)中。

## 环境缓存

实验性的 [`env_cache`](/configuration/settings.html#env_cache) 设置会将计算出的环境缓存在磁盘上。它可以帮助处理开销较大的环境提供程序和嵌套的 mise 调用：

```toml
# ~/.config/mise/config.toml
[settings]
env_cache = true
env_cache_ttl = "1h" # optional; the default is one hour
```

缓存位于状态目录下的 `env-cache/` 中，而不是工具元数据缓存中。`mise activate` 和 `mise exec` 会建立一个由嵌套命令继承的加密密钥。缓存重用需要使用相同的密钥；启动无关的会话并不能保证命中缓存。缓存会在磁盘上加密，但继承会话密钥的进程可以读取它。

缓存键包含配置路径及其修改时间、解析后的工具版本、相关设置、基础 `PATH` 和 mise 版本。条目还会在 `env_cache_ttl` 后过期，并且插件声明的监视文件也可以使其失效。文件监视覆盖范围取决于指令：对 dotenv 文件或 `_.source` 脚本的编辑，仍可能导致嵌套命令使用缓存的环境。如果这些编辑未生效，请清除或禁用缓存。外部服务中的更改（例如轮换密钥）并不是文件更改：请选择合适的 TTL，或禁用环境缓存。

对于必须重新计算环境值的命令，请在启动 mise 前设置 `MISE_ENV_CACHE=0`。例如，在包含 `test` 脚本的 Node.js 项目中：

```sh
MISE_ENV_CACHE=0 mise exec -- npm test
```

要为所有命令禁用缓存，请设置 `env_cache = false`。普通环境指令目前不支持按值设置 `cacheable = false` 的选项。因此，只要环境缓存有效，时间戳模板就可能被重复使用。

环境插件会在其 `MiseEnv` 返回值中声明可缓存性和监视文件。有关 Lua 返回格式，请参阅[环境插件开发](/env-plugin-development.html)。

要同时刷新缓存的环境和元数据，请运行 `mise cache clear`。无需删除已安装的工具或信任记录即可刷新环境。

## 任务缓存

任务可以根据源文件／输出的新旧程度跳过工作，或恢复之前缓存的输出。这些缓存与版本缓存和环境缓存分开。对于名为 `build` 的任务：

```sh
mise cache task build
mise cache clear --task build
```

有关配置、缓存键和重新运行行为，请参阅[任务缓存](/tasks/caching.html)。`--task` 会解析当前配置中的任务名称，并删除所有权可以得到验证的条目。对于无法验证任务所有权的旧条目，该命令会跳过。完整的 `mise cache clear` 会删除缓存根目录下的所有条目，包括其他项目和那些旧条目，以及环境缓存。

## 缓存自动清理

mise 会偶尔清理在 [`cache_prune_age`](/configuration/settings.html#cache_prune_age) 指定的时间内未被访问的文件，该设置默认为 30 天。这与缓存条目的有效期不同：过期的版本列表可能会在文件达到可清理的老化时间前很久就被重新获取。

```sh
mise cache prune --dry-run
mise cache prune
```

环境条目在清理时使用自己的 TTL。将 `cache_prune_age = "0s"` 设置为禁用基于时间的自动清理。在依赖显式清理命令的效果前，请先预览该命令。

对于 [CI](/continuous-integration.html)，缓存已安装的工具通常可以节省最多工作量。元数据缓存仍然可以帮助重复执行的任务；请根据运行器平台和项目配置选择缓存键，并确保即使没有恢复缓存，流水线也能正常工作。
