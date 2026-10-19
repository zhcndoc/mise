---
description: "通过 mise 使用预编译二进制或 ruby-build 安装 Ruby，并为各项目选择版本。"
---

# Ruby

如果有预编译二进制文件，mise 会直接安装 [Ruby](https://www.ruby-lang.org/)；否则会使用 ruby-build 从源码编译。在 Windows 上则会安装 RubyInstaller2 构建版本。

## 快速开始

为当前项目选择 Ruby 并检查其可执行文件：

```sh
mise use ruby@4.0
mise exec -- ruby --version
```

`mise use` 会将 `ruby = "4.0"` 写入 `mise.toml`。使用 `mise use -g ruby@4.0` 可设置个人默认版本。在已有的 Bundler 项目中，运行 `mise exec -- bundle install`，并在应用命令前加上 `mise exec -- bundle exec`。Rails 项目示例请参阅 [Ruby 指南](/mise-cookbook/ruby.html)。

## 选择版本

| 版本请求           | 选择结果                 |
| ------------------ | ------------------------ |
| `ruby@4.0`         | 最新的 4.0.x 版本        |
| `ruby@4.0.7`       | 指定版本                 |
| `ruby@latest`      | 最新的 CRuby 版本        |
| `ruby@truffleruby` | 最新的 TruffleRuby 版本  |
| `ruby@jruby`       | 最新的 JRuby 版本        |

除 CRuby 之外的实现使用 ruby-build 定义中的名称，并始终通过 ruby-build（或 ruby-install）安装。运行 `mise ls-remote ruby` 可列出所有版本。

## 版本文件

mise 可以读取 `.ruby-version` 和 `Gemfile` 中的 Ruby 版本。启用 Ruby 的相应设置：

```sh
mise settings add idiomatic_version_file_enable_tools ruby
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得相同的行为。详见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

之后，mise 会读取 `.ruby-version`（开头的 `ruby-` 会忽略）、`Gemfile` 中的 `ruby "4.0.7"` 行，或 Bundler 的 `ruby file: ".ruby-version"`；后者会相对于 `Gemfile` 所在目录解析。若要根据选定的 Ruby 写入 `.ruby-version`：

```sh
mise exec -- ruby -e 'puts RUBY_VERSION' > .ruby-version
```

## Gems 和 Bundler

`gem install` 会将 gem 安装到当前选定的 Ruby 版本中；除非 Bundler 配置了 `path`，否则 `bundle install` 也会如此。因此，切换版本后将无法使用已安装的 gem。mise 会为安装的每个 Ruby 添加 RubyGems 插件。安装 gem 或 Bundler 后，该插件会运行 [`mise reshim`](/cli/reshim.html)，为新可执行文件创建 [shims](/dev-tools/shims.html)。RubyGems 运行时，插件还会将 Ruby 的 `lib/pkgconfig` 目录加入 `PKG_CONFIG_PATH`，让原生扩展找到预编译 Ruby 随附的库。mise 不会自行设置 Ruby 环境变量。

若要在不同 Ruby 版本间保留某个 Ruby CLI，请使用 [gem 后端](/dev-tools/backends/gem.html)将其作为独立工具安装，例如 `mise use -g gem:rubocop`。

## mise 如何安装 Ruby

### 预编译二进制文件

默认情况下，mise 会从 [jdx/ruby](https://github.com/jdx/ruby) 下载预编译 CRuby，并验证其 GitHub 制品证明（[`ruby.github_attestations`](/lang/ruby.html#ruby.github_attestations)）。以下平台提供预编译二进制文件：

- macOS arm64（Apple Silicon）
- 使用 glibc（manylinux2014）的 Linux arm64 和 x86_64

如果当前平台或 Ruby 版本没有预编译二进制文件，mise 会改用 ruby-build 从源码编译。若始终从源码编译，请将 [`ruby.compile`](/lang/ruby.html#ruby.compile) 设为 `true`：

```sh
mise settings ruby.compile=true
```

jdx/ruby 未提供 musl 构建版本，因此在 Alpine 等 musl 系统上 mise 会编译 Ruby。在 Alpine 和 NixOS 上，mise 也默认从源码编译，因为此处的 [`all_compile`](/configuration/settings.html#all_compile) 默认值为 `true`；此默认行为已弃用，并将在 mise 2027.8.0 中更改。如果你托管了自己的 musl 二进制文件，可通过 [`ruby.precompiled_url`](/lang/ruby.html#ruby.precompiled_url) 提供 URL，并设置 [`ruby.precompiled_arch`](/lang/ruby.html#ruby.precompiled_arch) 和 [`ruby.precompiled_os`](/lang/ruby.html#ruby.precompiled_os) 来使用它们。

### 仅使用预编译二进制文件

若主机没有构建工具链，且回退到 ruby-build 会延迟失败或引入构建依赖项，请将 `ruby.compile` 设为 `false`：

```sh
mise settings ruby.compile=false
```

如果请求的版本和平台没有预编译二进制文件，安装就会失败。`mise ls-remote ruby` 和 `ruby = "4.0"` 等版本前缀只会考虑有预编译二进制文件的版本，因此前缀会解析为存在预编译文件的最新 4.0.x 版本。使用自定义的 `ruby.precompiled_url` 模板时，mise 无法列出可用二进制文件，因此版本列表不会经过筛选。

### 重新构建的二进制文件 {#precompiled-build-revisions}

jdx/ruby 有时会在不更改 Ruby 版本号的情况下发布新构建，例如修复软件包问题。每次构建都有自己的发布标签，例如 `3.3.11-1` 或 `3.3.11-2`；mise 仍会将版本视为 `3.3.11`。没有 `mise.lock` 时，安装会选择最新构建；有 `mise.lock` 时，锁定的 URL 会固定构建版本：

```toml [mise.lock]
[[tools.ruby]]
version = "3.3.11"

[tools.ruby."platforms.linux-x64"]
url = "https://github.com/jdx/ruby/releases/download/3.3.11-1/ruby-3.3.11.x86_64_linux.tar.gz"
```

若要更新到同一版本的最新构建，请从 `mise.lock` 删除 Ruby 条目，或删除所有 Ruby 平台的 `url`，然后运行：

```sh
mise lock ruby
mise install --force ruby
```

请提交更新后的 `mise.lock`，以便其他机器和 CI 使用相同构建。

### 使用 ruby-build 编译

源码构建使用 [ruby-build](https://github.com/rbenv/ruby-build)，并需要其[构建依赖项](https://github.com/rbenv/ruby-build/wiki#suggested-build-environment)。每次源码构建前，mise 都会将自带的 ruby-build 与最新版本比较；若不同则先更新。将 [`ruby.ruby_install`](/lang/ruby.html#ruby.ruby_install) 设为 `true`，可改用 [ruby-install](https://github.com/postmodern/ruby-install) 编译。

`ruby.ruby_build_cli_opts` 会向 ruby-build 本身传递标志，`ruby.ruby_build_opts` 则向 Ruby 的 `configure` 传递参数。例如，`--keep` 会在安装后保留源码树，而 `RUBY_BUILD_BUILD_PATH` 用于指定其存放位置：

```toml [mise.toml]
[settings.ruby]
ruby_build_cli_opts = "--keep"

[env]
RUBY_BUILD_BUILD_PATH = "{{ config_root }}/.ruby-build"
```

如 `--enable-yjit` 等 configure 参数应放在 `ruby.ruby_build_opts` 中。mise 会在 ruby-build 的 `--` 分隔符后传入这些参数：

```toml [mise.toml]
[settings.ruby]
ruby_build_opts = "--enable-yjit"
```

ruby-build 也会从环境或 `install_env` 中读取自己的[环境变量](https://github.com/rbenv/ruby-build#custom-build-configuration)，例如 `RUBY_CONFIGURE_OPTS`。

### Windows

在 Windows 上，mise 会安装 [RubyInstaller2](https://rubyinstaller.org/) 构建版本。`ruby.compile` 在此平台上无效。

## 从其他 Ruby 管理器迁移

为 rbenv、rvm 或 chruby 配置的项目通常都有 `.ruby-version`；请按[版本文件](#version-files)中的说明启用它。

若要复用通过 Homebrew 安装的 Ruby，请使用 [`mise sync ruby`](/cli/sync/ruby.html) 将 Homebrew 中带版本号的 `ruby@X.Y` formula 链接到 mise，再通过 `mise use` 选择版本：

```sh
mise sync ruby --brew
mise ls ruby --installed
```

## 故障排除

已安装且名为 `ruby` 的插件优先于内置安装器。如果 mise 的行为与本页所述不同，请检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

### 缺少 Ruby 版本 {#manually-updating-ruby-build}

Ruby 版本列表通常来自 mise 的版本主机，并根据 [`fetch_remote_versions_cache`](/configuration/settings.html#fetch_remote_versions_cache) 设置进行缓存。如果预期版本缺失，请清除缓存后重新列出：

```sh
mise cache clear ruby
mise ls-remote ruby
```

将 [`use_versions_host`](/configuration/settings.html#use_versions_host) 设为 `false`，或将 `ruby.compile` 设为 `false` 时，mise 会直接使用 ruby-build 列出版本，并先更新 ruby-build。

## 工具选项

Ruby 没有专用工具选项。`install_env` 会应用于 ruby-build 或 ruby-install、默认 gem 安装和 `postinstall` 命令。可用它按项目覆盖设置；若要为所有项目设置默认值，请使用 `ruby.ruby_build_opts`：

```toml [mise.toml]
[tools]
ruby = { version = "4.0", install_env = { RUBY_CONFIGURE_OPTS = "--disable-install-doc" } }
```

其他通用选项请参阅[工具选项](/dev-tools/#tool-options)。

## 默认 gem 文件 <Badge type="danger" text="deprecated" /> {#default-gems}

mise 会将 `~/.default-gems`（[`ruby.default_packages_file`](/lang/ruby.html#ruby.default_packages_file)）中列出的 gem 安装到每个新 Ruby 版本中。每行指定一个 gem，也可附带版本约束（`bcat ~> 0.6.0`）或 `--pre`；`#` 用于添加注释。自 2026.11.0 起，mise 会对此文件发出警告，并将在 2027.11.0 停止读取。请改用 [gem 后端](/dev-tools/backends/gem.html)安装 Ruby CLI，例如配置 `"gem:rubocop" = "latest"`；也可以对每个 Ruby 版本都需要的 gem 使用 [`postinstall`](/dev-tools/#tool-postinstall-commands) 命令。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="ruby" :level="3" />
