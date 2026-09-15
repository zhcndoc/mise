---
description: "使用 mise 选择 Ruby，并使用任务运行应用程序的 Bundler 和 Rails 命令。"
---

# Ruby 食谱

使用 mise 选择 Ruby，并使用任务运行应用程序的 Bundler 和 Rails 命令。本示例假设已有一个包含 `Gemfile`、`Gemfile.lock` 和 `bin/rails` 的 Rails 项目。在使用 lint 任务之前，请将 RuboCop 添加到开发 bundle 中。按照 [Ruby 指南](/lang/ruby.html)中的说明安装 Ruby 的平台依赖。

## 一个 Ruby on Rails 项目

```toml [mise.toml]
min_version = "2024.9.5"

[env]
# 项目信息
PROJECT_NAME = "{{ config_root | basename }}"

[tools]
# 使用指定版本安装 Ruby
ruby = "{{ get_env(name='RUBY_VERSION', default='3.3.3') }}"

[tasks."bundle:install"]
description = "安装 gem 依赖"
run = "bundle install"

[tasks.server]
description = "启动 Rails 服务器"
alias = "s"
run = "bundle exec rails server"

[tasks.test]
description = "运行测试"
alias = "t"
run = "bundle exec rails test"

[tasks.lint]
description = "使用 Rubocop 进行 lint 检查"
alias = "l"
run = "bundle exec rubocop"
```

克隆后运行 `mise run bundle:install`，然后运行 `mise run test` 或 `mise run server`。`bundle exec` 会选择项目 bundle 中的可执行文件，包括锁定的 Rails 和 RuboCop 版本。数据库创建等应用程序设置仍属于 Rails 项目自身说明的一部分。
