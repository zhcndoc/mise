---
description: "将 .envrc 设置迁移到 mise.toml，并从已交由 mise 管理的项目中移除 direnv。"
---

# 从 direnv 迁移

进入目录时，mise 会设置环境变量、加载 dotenv 文件并添加 `PATH` 条目，因此项目可不再依赖 [direnv](https://direnv.net) 完成这些工作。将 `.envrc` 中的设置移到 `mise.toml`，然后移除 direnv hook。

::: warning Unsupported
不支持同时运行 direnv 和 mise。进入目录时，两者都会修改环境，其 shell hook 对应添加、恢复或移除哪些 `PATH` 条目也可能互相冲突。这类兼容性问题不视为 mise 缺陷，也不接受用于支持 direnv 兼容性的 pull request。
:::

## 你需要 direnv 吗？ {#do-you-need-direnv}

常见的 `.envrc` 语句在 mise 中都有对应写法：

| `.envrc`                            | `mise.toml`                                                             |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `export NODE_ENV=development`       | `NODE_ENV = "development"` under `[env]`                                |
| `dotenv` or `dotenv_if_exists`      | [`_.file = ".env"`](/environments/#env-file); a missing file is skipped |
| `PATH_add bin`                      | [`_.path = "bin"`](/environments/#env-path)                             |
| `source script.sh`                  | [`_.source = "script.sh"`](/environments/#env-source)                   |
| `source_env_if_exists .envrc.local` | A `mise.local.toml` next to `mise.toml`, kept out of version control    |
| `source_up`                         | Nothing; mise already merges the config files of parent directories     |
| `layout python`                     | [`_.python.venv`](/lang/python.html#automatic-virtualenv-activation)    |
| `layout node`                       | `_.path = "node_modules/.bin"`                                          |

此外，mise 还会将项目工具版本加入 `PATH`，在进入或离开项目时运行 [hooks](/hooks.html)，并设置 [shell 别名](/shell-aliases.html)；这些功能并非 direnv 提供。

## 将 `.envrc` 迁移到 `mise.toml` {#move-envrc}

如果 `.envrc` 会设置变量、加载 `.env` 并将 `bin` 加入 `PATH`，可在 `mise.toml` 中这样配置：

```toml [mise.toml]
[env]
NODE_ENV = "development"
_.file = ".env"
_.path = "bin"
```

如果项目没有 `.env` 文件，mise 会跳过 `_.file` 指令，因此你可以保留或删除该配置。默认值、取消设置变量和载入脚本等内容请参阅[环境变量](/environments/)。

## 移除 direnv {#remove-direnv}

1. 从各个 `.envrc` 中删除已迁移的语句，或直接删除整个文件。
2. 如果使用过 `use mise` 集成，请删除 `~/.config/direnv/lib/use_mise.sh`。
3. 如果不再于任何地方使用 direnv，请从 shell 启动文件中移除其 hook，例如 `eval "$(direnv hook zsh)"`。
4. 如果尚未[激活 mise](/shell-setup.html)，请先激活，然后打开新的 shell。
5. 在项目中运行 `mise env` 检查结果。`mise exec -- <command>` 可在不依赖交互式 shell 状态的情况下检查命令。

## `.envrc` 中的 `use mise` <Badge type="danger" text="deprecated" /> {#mise-inside-of-direnv-use-mise-in-envrc}

`use mise` 集成原本用于让 direnv 加载 mise 环境。此功能已弃用且不受支持，请改用 [`mise activate`](/shell-setup.html)。`mise direnv` 和 `mise direnv activate` 会输出弃用警告，并将在 mise 2027.10.4 中移除。该集成会让 direnv 控制导出的环境，因此不会运行 hooks、设置 shell 别名或安装缺失的工具。

要在现有配置中找到该集成，请检查 `.envrc` 文件中的 `use mise`、`~/.config/direnv/lib/use_mise.sh` 中的 `use_mise` 函数（由 `mise direnv activate` 写入），以及通过父级 `.envrc` 中的 `source_up` 或 `~/.config/direnv/direnvrc` 加载该集成的配置。

If you keep it while you migrate:

- 不要让两个工具同时管理同一运行时或虚拟环境。常见冲突是 direnv 的 `layout python` 与 mise 选择的 Python 版本并存。
- 该集成只会将 `.envrc` 旁的 `.tool-versions` 文件加入 direnv 监视列表。direnv 不会发现 `mise.toml` 或其他目录中配置文件的变更，因此编辑这些文件后请运行 `direnv reload`。

[Shims](/dev-tools/shims.html) 也可以在不使用 direnv 的情况下运行 mise 管理的工具，但不能实现 `mise activate` 的全部功能。
