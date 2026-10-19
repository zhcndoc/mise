---
description: "从 RubyGems 安装 Ruby 命令行应用，每个应用使用独立目录和 GEM_HOME。"
---

# gem 后端

`gem` 后端使用 `gem install` 从 [RubyGems](https://rubygems.org/) 或其他 gem 注册表安装 Ruby 命令行应用。每个工具都有独立目录。应用依赖的 gem 应写在应用自己的 `Gemfile` 中，并通过 Bundler 安装。

## 要求

<span id="dependencies"></span>

请安装 Ruby，它会提供 `gem` 命令。配置中包含 `ruby` 时，mise 会先安装 Ruby，再安装 gem。包含原生扩展的 gem 还需要编译器及其构建所依赖的库。

## 用法

在同一个项目中声明 Ruby 和 RuboCop：

```sh
mise use ruby@3.4 gem:rubocop
mise exec -- rubocop --version
```

这会将两个条目写入 `mise.toml`。若要写入全局配置，请在 `mise use` 后添加 `-g`。

```toml
[tools]
ruby = "3.4"
"gem:rubocop" = "latest"
```

mise 会将 `GEM_HOME` 设为工具自己的目录，因此通过 `gem:` 安装的工具无法访问应用 bundle 中的 gem。如果 `.rubocop.yml` 加载了 `rubocop-rails` 等插件，请在 `Gemfile` 中声明 RuboCop 及其插件，并改用 `bundle exec rubocop` 运行。

## 升级 Ruby 后 {#ruby-upgrades}

gem 会针对某个 Ruby 版本安装。切换到另一个 Ruby 次版本（例如从 3.3 升到 3.4）后，或使用包含原生扩展的 gem 时，请在选中新 Ruby 版本后重新安装：

```sh
mise install --force gem:rubocop
```

在 Unix 上，由 mise 管理的 Ruby 进行补丁版本升级后，gem 通常仍能正常工作，因为 mise 会将 gem 可执行文件指向 Ruby 的次版本路径（例如 `.../ruby/3.4/bin/ruby`）。使用系统 Ruby 安装的 gem 则会运行 `PATH` 中排在最前面的 `ruby`。

## 工具选项

请在 `[tools]` 中的工具条目下设置这些选项。所有后端均接受的选项见[工具选项](/dev-tools/#tool-options)。

### `install_env`

为 `gem install` 设置环境变量。对于需要构建原生扩展的 gem，`MAKEFLAGS` 可控制并行 make 任务数：

```toml
[tools]
"gem:rubocop" = { version = "latest", install_env = { MAKEFLAGS = "-j4" } }
```

### `source`

从指定注册表安装某个 gem 并列出其版本，而不更改机器的 `gem sources`：

```toml
[tools]
"gem:internal-cli" = { version = "latest", source = "https://{{ env.GEM_TOKEN }}@gems.example.com/acme" }
```

私有注册表通过 URL 中的 Basic Auth 凭据进行身份验证（格式为 `token@host` 或 `user:token@host`，具体取决于注册表）。mise 会在输出和安装元数据中隐藏凭据。除 `localhost` 外，包含凭据的软件源必须使用 `https`。

对于 `rubygems.pkg.github.com` 上未提供凭据的 `https` 软件源，mise 会使用 GitHub 令牌（参见 [`mise token github`](/cli/token/github.html)）。令牌需要 `read:packages` 范围，默认的 `gh auth login` 不包含该范围（运行 `gh auth refresh -s read:packages` 添加）。GitHub Packages 无法列出版本，因此请固定一个版本：

```toml
[tools]
"gem:internal-cli" = { version = "1.4.2", source = "https://rubygems.pkg.github.com/acme" }
```

mise 会将此软件源与 rubygems.org 并列添加，而不会替换后者。依赖仍会从 rubygems.org 获取；同名的公开 gem 也可能从那里安装。若要避免这种情况，请固定确切版本，或使用代理 rubygems.org 的注册表。

## 故障排查

| 现象                                             | 处理方法                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Ruby 升级后 gem 无法正常工作                       | 使用 `mise install --force` 重新安装；参见[升级 Ruby 后](#ruby-upgrades)。               |
| 原生扩展构建失败                                  | 安装 gem 所需的编译器和库，然后重试安装。                                               |
| RuboCop 无法加载 `Gemfile` 中的插件                | 在项目中使用 `bundle exec` 运行；`gem:` 安装有独立的 `GEM_HOME`。                        |

Implementation: [`src/backend/gem.rs`](https://github.com/jdx/mise/blob/main/src/backend/gem.rs).
