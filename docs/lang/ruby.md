# Ruby

与 `rvm`、`rbenv` 或 `asdf` 类似，`mise` 可以在同一系统上管理 Ruby 的多个版本。

> 以下是使用 ruby mise 核心插件的说明。当没有安装名为 “ruby” 的 git 插件时会使用它。
> 如果你想使用 [asdf-ruby](https://github.com/asdf-vm/asdf-ruby)
> ，则使用 `mise plugins install ruby GIT_URL`。

这部分代码位于 mise 仓库中的
[`./src/plugins/core/ruby.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/ruby.rs)。

## 用法

下面的命令会安装 ruby-3.2.x 的最新版本（如果尚未安装 3.2.x 的某个版本），并将其设为全局默认：

```sh
mise use -g ruby@3.2
```

默认情况下，如果有预编译的 Ruby 二进制文件，mise 会安装该文件；否则会使用 [`ruby-build`](https://github.com/rbenv/ruby-build) 从源代码编译。源代码构建需要相应的[依赖项](https://github.com/rbenv/ruby-build/wiki#suggested-build-environment)。有关其他设置和故障排除方法，请参阅 ruby-build 的[自述文件](https://github.com/rbenv/ruby-build/blob/master/README.md)。

## 预编译二进制文件

mise 默认下载预编译的 Ruby 二进制文件。这会显著缩短安装时间。

预编译二进制文件来源于 [jdx/ruby](https://github.com/jdx/ruby)，并适用于
以下平台：

- macOS（仅限 arm64/Apple Silicon）
- Linux arm64
- Linux x86_64

如果你的平台或 Ruby 版本没有可用的预编译二进制文件，mise 会自动
回退到使用 ruby-build 从源代码编译。

### 仅使用预编译二进制文件

设置 `ruby.compile=false` 可完全选择退出源代码构建。在没有
构建工具链的主机上，这非常有用，因为静默回退到 ruby-build 会导致较晚的失败，
或引入你特意不安装的构建依赖：

```sh
mise settings ruby.compile=false
```

使用此设置时：

- 当请求的版本和平台不存在预编译二进制文件时，安装会报错，
  而不是回退到 ruby-build。
- `mise ls-remote ruby` 和模糊版本只会考虑具有预编译
  二进制文件的版本，因此 `ruby = "4.0"` 会解析为实际具有二进制文件的最新
  4.0.x 版本，而不是必须从源代码构建的版本。

如果你设置了自定义的 `ruby.precompiled_url` 模板，mise 将无法枚举可用版本，
版本列表将不会进行筛选。

`ruby.compile` 对 Windows 没有影响，因为 Windows 会从
[RubyInstaller2](https://rubyinstaller.org/) 安装 Ruby，而不是从 `jdx/ruby`
或 ruby-build 安装。

### 预编译构建修订版

预编译的 Ruby 二进制文件由 `jdx/ruby` 发布。有时某个 Ruby 版本的二进制文件会在不更改 Ruby 版本本身的情况下重新构建。这些重新构建会使用类似 `3.3.11-1` 或 `3.3.11-2` 的构建修订版发布标签。
Mise 会将这些构建修订版标签用于 `jdx/ruby` 预编译二进制文件，
而不是使用浮动的基础发布标签。

重新构建是为了修复可移植二进制包的变更，而不是 Ruby
自身版本号的变更。`jdx/ruby` 的发布历史包括以下原因导致的重新构建：

- 原生 gem 打包修复
- CA 证书查找修复
- RI 文档打包变更
- SLSA/溯源工作流修复
- 对现有发布的大规模重新生成

此列表并不详尽。

Mise 仍然将 Ruby 版本视为 `3.3.11`。如果没有 `mise.lock`，mise
在解析安装时会使用最新可用的预编译构建修订版。
这意味着稍后重新安装相同的 Ruby 版本时，如果发布了更新的重新构建，可能会获取到更新的版本。

使用 `mise.lock` 时，下载 URL 会记录所使用的预编译构建修订版：

```toml
[[tools.ruby]]
version = "3.3.11"

[tools.ruby.platforms.linux-x64]
url = "https://github.com/jdx/ruby/releases/download/3.3.11-1/ruby-3.3.11.x86_64_linux.tar.gz"
```

要查看你使用的是哪个预编译构建修订版，请检查平台 `url` 中的发布标签：

- `/releases/download/3.3.11-1/` 表示构建修订版 `1`
- `/releases/download/3.3.11-2/` 表示构建修订版 `2`

如果锁文件已经指向某个构建修订版，例如 `3.3.11-1`，mise 会继续使用该确切修订版以保证可复现性。要更新到同一 Ruby 版本的最新预编译构建修订版，请删除 `mise.lock` 中整个 Ruby 条目，或删除所有 Ruby 平台的 `url`，然后重新生成锁定条目并重新安装：

```sh
mise lock ruby
mise install --force ruby
```

提交更新后的 `mise.lock`，这样其他机器和 CI 就会使用相同的预编译构建修订版。

即使有可用的预编译二进制文件，也要始终从源代码编译：

```sh
mise settings ruby.compile=true
```

若要要求使用预编译二进制文件且绝不进行编译，请参阅
[仅使用预编译二进制文件](#precompiled-binaries-only)。

你还可以通过将 `ruby.precompiled_url` 设置为 GitHub 仓库（例如 `owner/repo`）
或完整的 URL 模板，使用自定义的预编译二进制文件来源。

你还可以安装特定的 ruby 变体。要获取某个变体的最新版本，只需使用
该变体前缀。

```sh
mise use -g ruby@truffleruby            # truffleruby 的最新版本
```

## 默认 gem

::: warning 计划弃用
默认包文件已弃用。它们目前仍受支持，但 mise 将从 `2026.11.0` 开始发出警告，
并将在 `2027.11.0` 中移除支持。

对于 Ruby CLI，请直接使用 [gem 后端](/dev-tools/backends/gem.html) 安装该工具：

```toml
[tools]
"gem:rubocop" = "latest"
```

对于确实应该安装到每个 Ruby 版本中的 gem，请使用工具级别的 `postinstall`
钩子：

```toml
[tools]
ruby = { version = "3.4", postinstall = "gem install rubocop" }
```

:::

mise 可以在安装新的 ruby 版本后自动安装一组默认 gem。
要使用此旧特性，请提供一个 `$HOME/.default-gems` 文件，每行列出一个 gem，例如：

```text
# 支持注释
pry
bcat ~> 0.6.0 # 支持版本约束
rubocop --pre # 安装预发布版本
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `ruby` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 ruby-build 或 ruby-install 以及默认 gem 安装设置环境变量：

```toml
[tools]
ruby = { version = "latest", install_env = { RUBY_CONFIGURE_OPTS = "--disable-install-doc" } }
```

## `.ruby-version` 和 `Gemfile` 支持

mise 使用 `mise.toml` 或 `.tool-versions` 文件在不同软件版本之间自动切换。
不过，它也可以读取 Ruby 特定的版本文件 `.ruby-version` 或 `Gemfile`
（如果其中指定了 Ruby 版本）。

为当前版本的 Ruby 创建一个 `.ruby-version` 文件：

```sh
ruby -v > .ruby-version
```

为 Ruby 启用惯用版本文件读取：

```sh
mise settings add idiomatic_version_file_enable_tools ruby
```

有关更多信息，请参阅[惯用版本文件](/configuration.html#idiomatic-version-files)。

## 手动更新 ruby-build

ruby-build 应该会每天更新，不过如果你发现某些版本尚不存在，你可以强制进行
更新：

```bash
mise cache clean
mise ls-remote ruby
```

## 设置

`ruby-build` 已经有一些
[设置](https://github.com/rbenv/ruby-build?tab=readme-ov-file#custom-build-configuration)，
此外，mise 还有一些额外的设置：

要向 `ruby-build` 本身传递选项，请使用 `ruby.ruby_build_cli_opts`。例如，`--keep`
会在安装后保留源代码树；设置 `RUBY_BUILD_BUILD_PATH` 可选择其保留位置：

```toml
[settings.ruby]
ruby_build_cli_opts = "--keep"

[env]
RUBY_BUILD_BUILD_PATH = "{{ config_root }}/.ruby-build"
```

诸如 `--enable-yjit` 的配置参数应放在 `ruby.ruby_build_opts` 中。mise 会将这些参数传递到
ruby-build 的 `--` 分隔符之后：

```toml
[settings.ruby]
ruby_build_opts = "--enable-yjit"
```

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="ruby" :level="3" />
