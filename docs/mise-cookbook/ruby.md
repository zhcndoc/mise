---
description: "从 Rails 应用的 .ruby-version 读取 Ruby 版本，并将 Bundler 和 Rails 命令作为 mise 任务运行。"
---

# Ruby on Rails

根据现有 Rails 应用的 `.ruby-version` 文件固定 Ruby 版本，并将应用的 Bundler 和 Rails 命令设为任务。本示例假定项目包含 `Gemfile`、`Gemfile.lock`、`bin/rails` 和 `.ruby-version`，且在开发依赖组中包含 RuboCop。

## 使用应用的 `.ruby-version` {#a-ruby-on-rails-project}

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ["ruby"]

[tasks.install]
description = "Install gem dependencies"
run = "bundle install"

[tasks.server]
description = "启动 Rails 服务器"
alias = "s"
run = "bin/rails server"

[tasks.test]
description = "运行测试"
alias = "t"
run = "bin/rails test"

[tasks.lint]
description = "Run RuboCop"
alias = "l"
run = "bundle exec rubocop"
```

此设置会让 mise 读取应用的 `.ruby-version`（例如 `ruby-3.4.7` 开头的 `ruby-` 会被忽略），这样版本只需保存在一个其他 Ruby 工具也会读取的文件中。由于此设置位于项目的 `mise.toml`，团队成员和 CI 也会读取 `.ruby-version`。如果应用没有 `.ruby-version`，请改为在 `[tools]` 下设置 `ruby = "4.0"`。mise 还可读取其他文件，详见 [Ruby 版本文件](/lang/ruby.html#version-files)。

克隆项目后运行 `mise run install`；如果尚未安装对应 Ruby 版本，mise 会先安装它。然后运行 `mise run test` 或 `mise run server`。binstub 和 `bundle exec` 会加载应用的 bundle，因此 Rails 和 RuboCop 会使用锁文件指定的版本。数据库初始化仍由应用自己的 `bin/setup` 或 `bin/rails db:prepare` 负责。

如果你的平台有对应的预编译构建，mise 会安装预编译版 Ruby。有关源码构建及所需系统库，请参阅[使用 ruby-build 编译](/lang/ruby.html#compiling-with-ruby-build)。

若要仅在 `Gemfile` 或 `Gemfile.lock` 变更时运行 `bundle install`，可使用实验性的 [`[deps.bundler]`](/dev-tools/deps.html) provider 替代 install 任务。
