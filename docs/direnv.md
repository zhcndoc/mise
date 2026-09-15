---
description: "direnv 和 mise 都会在你进入目录时更改环境。"
---

# direnv <Badge type="warning" text="已弃用" />

[direnv](https://direnv.net) 和 mise 都会在你进入目录时更改环境。它们的 shell 钩子可能会对应该添加、恢复或删除哪些 `PATH` 条目产生分歧。

::: warning 不受支持的集成
在 mise 中使用 direnv 不受支持。兼容性问题不被视为 mise 的错误，并且不接受针对 direnv 兼容性的 PR。`use mise` 集成已弃用。
:::

## 你需要 direnv 吗？ {#do-you-need-direnv}

对于使用 direnv 设置变量、加载 dotenv 文件或激活 Python 环境的项目，mise 提供了相应的配置：

| 现有的 `.envrc` 行为             | mise 配置                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `export NODE_ENV=development`    | 使用 `[env]` 和 `NODE_ENV = "development"`                                           |
| 加载 dotenv 文件                 | [`env._.file`](/environments/#env-file)                                             |
| 将 `bin` 添加到 `PATH`           | [`env._.path`](/environments/#env-path)                                             |
| 从 Bash 脚本导出值               | [`env._.source`](/environments/#env-source)                                         |
| 激活 Python virtualenv           | [Python virtualenv 配置](/lang/python.html#automatic-virtualenv-activation)         |

例如：

```toml [mise.toml]
[env]
NODE_ENV = "development"
_.file = ".env"
_.path = "bin"
```

此示例假设项目有一个 `.env` 文件。如果没有，请删除该指令。有关默认值、取消设置值和获取脚本的信息，请参阅[环境](/environments/)。

将所需行为移入 `mise.toml` 后，移除项目的 direnv 集成，[激活 mise](/getting-started.html#activate-mise)，并打开一个全新的 shell 以验证环境。`mise exec -- <command>` 可以检查项目命令，而无需依赖交互式 shell 的当前状态。

## direnv 中的 mise（在 `.envrc` 中使用 `use mise`）

以下内容介绍的是已弃用的设置，适用于维护或移除现有集成的用户。它让 direnv 控制导出的环境，并不提供 mise 的完整激活行为。

该集成会生成一个 direnv 库函数：

```sh
mkdir -p ~/.config/direnv/lib
mise direnv activate > ~/.config/direnv/lib/use_mise.sh
```

`.envrc` 随后会这样调用它：

```sh
use mise
```

请注意 shell 函数 `use_mise` 与 direnv 的 `use mise` 语法之间的区别。现有项目也可能通过 `source_up` 从父级 `.envrc` 中加载它，或者从 `~/.config/direnv/direnvrc` 中加载它。

如果保留此集成，请避免让两个工具管理同一个运行时或 virtualenv。一个常见的冲突是 direnv 的 `layout python` 与 mise 选择的 Python 版本同时使用。`.tool-versions` 文件位于 `.envrc` 目录之外时，其更改也可能无法触发 direnv 刷新。

[Shims](/dev-tools/shims.html) 提供了另一种运行 mise 管理的工具的方式，但它们无法复现 `mise activate` 的全部功能，也不会使混用 shell 钩子成为受支持的设置。
