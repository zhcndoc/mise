# 插件

mise 中的插件是一种通过新增功能来扩展 `mise` 的方式，例如添加额外工具或环境变量管理。

从历史上看，它曾是添加新工具的唯一方式（因为当时唯一的后端是 [asdf](/dev-tools/backends/asdf.html)）。

该后端的工作方式是：每个工具都有自己独立的插件，需要手动安装。不过现在有了 [core tools](/core-tools.html)
以及 [aqua](/dev-tools/backends/aqua.html)/[github](/dev-tools/backends/github.html) 等后端，在 mise 中运行大多数工具已经不再需要插件。

出于安全原因，应避免使用工具插件。除非某个工具非常流行，并且由于某些原因无法使用 aqua/github，否则不会接受将其作为基于 asdf/plugins 构建的 mise 新工具。

唯一的例外是：如果该工具需要设置环境变量，或者安装过程很复杂，那么插件可以提供诸如 [全局设置环境变量](/environments/#plugin-provided-env-directives) 之类的功能，而无需依赖某个工具已安装。它们还可以提供 [版本别名](/dev-tools/aliases.html#aliased-versions)。

如果你想将一个新工具集成到 mise 中，你应该优先尝试将其加入 [aqua registry](https://mise.en.dev/dev-tools/backends/aqua.html)
，或者看看是否可以通过 [github](https://mise.en.dev/dev-tools/backends/github.html) 安装。
与 github 相比，Aqua 明显更受推荐，因为它拥有更好的用户体验和更多功能，例如 slsa 验证，以及针对旧版本使用不同逻辑的能力。

你可以在 `mise` 中通过 [`mise plugins`](/cli/plugins.html) 管理所有已安装的插件。

```shell
mise plugins ls --urls
# 插件                          Url                                                     Ref  Sha
# 1password                       https://github.com/mise-plugins/mise-1password-cli.git  HEAD f5d5aab
# vfox-mise-plugins-vfox-dart     https://github.com/mise-plugins/vfox-dart               HEAD 1424253
# ...
```

## 后端插件

后端插件通过现代后端方法提供增强功能。这些插件使用 `plugin:tool` 格式，并且相比传统插件具有以下优势：

- **多个工具**：单个插件可以管理多个工具
- **增强方法**：用于列出版本、安装以及设置环境变量的后端方法
- **跨平台**：可在 Windows、macOS 和 Linux 上运行
- **性能**：比基于 shell 的插件执行更快

示例用法：

```bash
# 安装后端插件
mise plugin install my-plugin https://github.com/username/my-plugin

# 使用 plugin:tool 格式
mise install my-plugin:some-tool@1.0.0
mise use my-plugin:some-tool@latest
```

有关创建后端插件，请参见 [后端插件开发](backend-plugin-development.md)。你可以使用 [mise-backend-plugin-template](https://github.com/jdx/mise-backend-plugin-template) 快速开始。

## 工具插件

工具插件使用传统的基于钩子的方式，借助 Lua 脚本实现。这些插件提供：

- **基于钩子**：使用 `PreInstall`、`PostInstall`、`Available` 等钩子
- **单工具**：每个插件管理一个工具
- **跨平台**：可在 Windows、macOS 和 Linux 上运行
- **灵活**：对安装和环境设置拥有完全控制权

示例用法：

```bash
# 安装一个工具插件
mise plugin install my-tool https://github.com/username/my-tool-plugin

# 直接使用该工具
mise install my-tool@1.0.0
mise use my-tool@latest
```

有关创建工具插件，请参见 [Tool Plugin Development](tool-plugin-development.md)。`[mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template)` 提供了一个可直接使用的起点。

## 环境插件

环境插件提供环境变量和 PATH 修改，而不管理工具版本。它们非常适合用于集成密钥管理器、设置动态配置，以及统一团队环境。

示例用法：

```bash
# 安装一个环境插件
mise plugin install my-env-plugin https://github.com/username/my-env-plugin
```

```toml
# 在 mise.toml 中配置
[env]
_.my-env-plugin = { api_url = "https://api.example.com", debug = true }
```

与工具插件不同，环境插件：

- 只实现环境钩子（`MiseEnv`、`MisePath`）
- 通过 `env._.<plugin-name>` 语法激活
- 不管理工具版本或安装

有关创建环境插件，请参阅 [环境插件开发](env-plugin-development.md)。[mise-env-plugin-template](https://github.com/jdx/mise-env-plugin-template) 仓库提供了一个可直接使用的起始模板。

## 通用插件使用

有关安装和使用后端插件和工具插件的面向最终用户文档，请参阅 [使用插件](plugin-usage.md)。

## asdf（Legacy）插件

mise 可以在底层使用 asdf 的插件生态系统以实现向后兼容。这些插件包含诸如
`bin/install`（用于安装）和 `bin/list-all`（用于列出所有可用版本）之类的 shell 脚本。

与现代后端相比，asdf 插件存在局限性，应仅在必要时使用。它们只适用于 Linux/macOS，并且比原生后端更慢。

有关使用和创建这些插件的完整文档，请参见 [asdf（Legacy）插件](asdf-legacy-plugins.md)。

## 插件作者

<https://github.com/mise-plugins> 是一个用于社区开发插件的 GitHub 组织。
请参阅 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) 了解这里的插件会如何以不同方式处理的更多细节。

如果你希望你的插件托管在这里，请告诉我（GitHub discussion 或 Discord 都可以），
我很乐意为你托管。

## 工具选项

mise 支持“工具选项”，这是在 `mise.toml` 中指定的配置，用于更改工具的行为。其中一个例子是在 python 运行时中使用 virtualenv：

```toml
[tools]
python = { version='3.11', virtualenv='.venv' }
```

这将作为 `MISE_TOOL_OPTS__VIRTUALENV=.venv` 传递给所有插件脚本。用户可以指定任何选项，并且它会以该格式传递给插件。

目前，这只支持简单字符串，但如果有需要，我们可以相当容易地将其兼容为更复杂的类型
（数组、表）。

## 模板

插件自定义仓库值可以是模板，详情请参见 [模板](/templates)。

```toml
[plugins]
"vfox-backend:my-plugin" = "https://{{ get_env(name='GIT_USR', default='empty') }}:{{ get_env(name='GIT_PWD', default='empty') }}@github.com/foo/my-plugin.git"
```
