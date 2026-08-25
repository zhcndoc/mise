# 缓存行为

mise 在很多地方都会使用缓存，以提高效率。关于缓存应保留多长时间的细节，最终都应该可以配置。目前的行为中可能还存在一些空缺，也就是某些内容是硬编码的，但我很乐意添加更多设置来覆盖所需的任何配置。

下面我会解释它在缓存方面使用的行为。如果你看到某些内容似乎没有更新，那么这里是一个很好的起点。

## 工具缓存

每个工具/后端都有一个缓存，存储在 `~/$MISE_CACHE_DIR/<TOOL>` 中。它保存该工具可用版本列表（`mise ls-remote <TOOL>`）、惯用文件名（见下文）、别名列表、每个工具安装中的 bin 目录，以及在工具安装后运行 `exec-env` 的结果。

默认情况下，远程版本每天更新一次。该文件是 zlib messagepack，如果你想查看它，可以运行以下命令（需要 [msgpack-cli](https://github.com/msgpack/msgpack-cli)）。

```sh
cat ~/$MISE_CACHE_DIR/node/remote_versions.msgpack.z | perl -e 'use Compress::Raw::Zlib;my $d=new Compress::Raw::Zlib::Inflate();my $o;undef $/;$d->inflate(<>,$o);print $o;' | msgpack-cli decode
```

请注意，如果脚本不仅仅是导出静态值，那么缓存 `exec-env` 可能会有问题。绝大多数 `exec-env` 脚本只导出静态值。

缓存 `exec-env` 极大提升了 mise 的性能，因为 mise 初始化时否则每次都需要调用 bash。

## 环境缓存

对于更高级的缓存需求（包括像密钥管理器这样的动态环境提供者），mise 提供了 [`env_cache`](/configuration/settings.html#env_cache) 设置。启用后，mise 会将计算得到的环境加密后缓存到磁盘。

```toml
# ~/.config/mise/config.toml
[settings]
env_cache = true
env_cache_ttl = "1h"  # 可选，默认值为 1h
```

缓存失效会在以下情况自动发生：

- 任何配置文件发生变化（mise.toml、.tool-versions 等）
- 工具版本发生变化
- 设置发生变化
- mise 版本发生变化
- TTL 到期（可通过 `env_cache_ttl` 配置）
- 任何被监视的文件发生变化（来自模块或 `_.source` 指令）

环境插件（vfox 模块）可以通过在其 `MiseEnv` 钩子中返回 `{cacheable = true, watch_files = [...]}` 来声明自己可被缓存。详情请参见 [环境插件开发](/env-plugin-development.html)。

通过设置 `cacheable = false`，指令可以选择不使用缓存：

```toml
[env]
TIMESTAMP = { value = "{{ now() }}", cacheable = false }
_.source = { path = "dynamic.sh", cacheable = false }
```

## 缓存自动清理

mise 将自动删除其缓存目录中的旧文件（通过 [`cache_prune_age`](https://mise.jdx.dev/configuration/settings.html#cache_prune_age) 配置）。其中的大部分内容如果超过 24 小时或几天，也会被 mise 忽略。因此，在 CI 作业中存储此目录很可能是浪费的。
