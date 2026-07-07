# gem 后端

mise 可用于从 RubyGems 安装 CLI。其代码位于 mise 仓库中的 [`./src/backend/gem.rs`](https://github.com/jdx/mise/blob/main/src/backend/gem.rs)。

## 依赖

这依赖于已安装 `gem`（由 ruby 提供）。你可以使用 mise 安装，也可以不使用 mise 安装。
以下是使用 mise 安装 `ruby` 的方法：

```sh
mise use -g ruby
```

## 用法

以下命令会安装 [rubocop](https://rubygems.org/gems/rubocop) 的最新版本，并将其设为 PATH 中的当前激活版本：

```sh
mise use -g gem:rubocop
rubocop --version
```

该版本将以如下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"gem:rubocop" = "latest"
```

## Ruby 升级

如果某个 gem 包使用的 ruby 版本发生变化（由 mise 或系统 ruby 提供），你可能需要
重新安装该 gem。可以使用以下命令：

```sh
mise install -f gem:rubocop
```

或者你也可以重新安装所有 gem：

```sh
mise install -f "gem:*"
```

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置下方列出的环境变量来进行配置。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="gem" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `gem` 后端——这些内容应放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `gem install` 命令设置环境变量：

```toml
[tools]
"gem:rubocop" = { version = "latest", install_env = { GEM_HOST_API_KEY = "..." } }
```
