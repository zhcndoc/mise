---
description: "从 RubyGems 将 Ruby 命令行应用安装到独立的工具目录中。"
---

# gem 后端

`gem` 后端从 RubyGems 将 Ruby 命令行应用安装到独立的工具目录中。将应用 gem 保留在项目的 `Gemfile` 中，并使用 Bundler 安装它们。相关代码位于 mise 仓库中的 [`./src/backend/gem.rs`](https://github.com/jdx/mise/blob/main/src/backend/gem.rs)。

## 依赖

此后端需要 Ruby 及其 `gem` 命令。带有原生扩展的 Gems 还需要该 gem 所需的编译器和库。

## 用法

在同一个项目中声明 Ruby 和 RuboCop：

```sh
mise use ruby@3.4 gem:rubocop
mise exec -- rubocop --version
```

这会将两个条目写入 `mise.toml`。添加 `-g` 以进行全局配置。

```toml
[tools]
ruby = "3.4"
"gem:rubocop" = "latest"
```

mise 的包装器会为所选工具设置 `GEM_HOME`。对于使用项目专属插件的 RuboCop 配置，最好在声明这些插件的 Gemfile 中使用 `bundle exec rubocop` 运行。

## Ruby 升级

如果 gem 软件包使用的 Ruby 版本发生变化（无论该版本由 mise 还是系统管理），你可能需要重新安装该 gem。可以使用以下命令完成：

```sh
mise install -f gem:rubocop
```

在你打算使用的 Ruby 版本下重新安装。在 Unix 上，mise 管理的 Ruby shebang 会遵循次版本路径，因此补丁版本升级可以继续工作；切换到另一个次版本或更改原生扩展兼容性仍可能需要重新安装。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置下方列出的环境变量来进行配置。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="gem" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `gem` 后端——这些内容应放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 `gem install` 命令设置环境变量。对于构建原生扩展的 gem，`MAKEFLAGS` 控制并行 make 任务数：

```toml
[tools]
"gem:rubocop" = { version = "latest", install_env = { MAKEFLAGS = "-j4" } }
```
