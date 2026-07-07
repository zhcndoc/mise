# Mise + Ruby 食谱

以下是使用 mise 管理 Ruby 项目的一些技巧。

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
run = "rails server"

[tasks.test]
description = "运行测试"
alias = "t"
run = "rails test"

[tasks.lint]
description = "使用 Rubocop 进行 lint 检查"
alias = "l"
run = "rubocop"
```
