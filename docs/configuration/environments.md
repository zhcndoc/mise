# 配置环境

可以在同一目录下为不同环境（如 `development` 和 `production`）使用单独的 `mise.toml` 文件。要启用此功能，请使用以下方法之一将 `MISE_ENV` 设置为某个环境，例如 `development` 或 `production`：

- CLI 标志：`-E development` 或 `--env development`
- 环境变量：`MISE_ENV=development`
- `.miserc.toml` 文件：`env = ["development"]`

随后，mise 会在当前目录、父目录以及 `MISE_CONFIG_DIR` 目录中查找 `mise.{MISE_ENV}.toml` 文件。

## 在 .miserc.toml 中设置 MISE_ENV

你可以在 `.miserc.toml` 文件中设置 `MISE_ENV`，该文件会在发现其他配置文件之前很早就被加载。这使你可以将环境配置提交到版本控制：

```toml
# .miserc.toml
env = ["development"]
```

### .miserc.toml 中的模板

`.miserc.toml` 支持 [Tera 模板](/templates#miserc-template-support)，这对于像 `ceiling_paths` 这样引用 home 或 XDG 目录的设置很有用：

<div v-pre>

```toml
# .miserc.toml

# 在 $HOME 处停止配置搜索
ceiling_paths = ["{{ env.HOME }}"]

# 或使用 XDG 配置主目录变量
ignored_config_paths = ["{{ xdg_config_home }}/mise/shared.toml"]
```

</div>

请注意，此时只有 OS 级别的上下文可用（环境变量、`cwd`、`arch()`、`os()` 等）——来自 `mise.toml` 的设置此时尚未加载。

搜索的文件位置（按优先级顺序）：

1. 当前目录及其父目录中的 `.miserc.toml` 和 `.config/miserc.toml`
2. `~/.config/mise/miserc.toml`（全局）
3. `/etc/mise/miserc.toml`（系统）

注意：`MISE_ENV` 不能在 `mise.toml` 中设置，因为它决定了首先要加载哪些配置文件。

mise 还会在当前目录及其父目录中查找类似 `mise.local.toml` 和 `mise.{MISE_ENV}.local.toml` 的“本地”文件。
这些文件不打算提交到版本控制中。
（将 `mise.local.toml` 和 `mise.*.local.toml` 添加到你的 `.gitignore` 文件中。）

这些文件的优先级按以下顺序排列（上面的覆盖下面的）：

- `mise.{MISE_ENV}.local.toml`
- `mise.local.toml`
- `mise.{MISE_ENV}.toml`
- `mise.toml`

如果设置了 `MISE_OVERRIDE_CONFIG_FILENAMES`，则会使用它而不是上述所有规则。

你也可以使用诸如 `mise/config.{MISE_ENV}.toml` 或 `.config/mise.{MISE_ENV}.toml` 之类的路径。这些规则遵循 [Configuration](/configuration) 中的顺序。

使用 `mise config` 查看正在使用哪些文件。

关于哪个文件会被写入的规则有所不同，因为我们最终需要选定一个文件。更多信息请参阅 [`mise use`](/cli/use.html) 的文档。

可以指定多个环境，例如 `MISE_ENV=ci,test`，其中后面的环境优先级更高。

## 平台环境

启用[`auto_env` 设置](/configuration/settings.html#auto_env)后，mise 会根据当前平台自动将以下内容视为活动的配置环境：

| 环境         | 值                                             |
| ------------ | ---------------------------------------------- |
| `{os_family}` | `unix`（在 Windows 上未定义——请使用 `windows`） |
| `{os}`        | `linux`, `macos`, `windows`                    |
| `{os}-{arch}` | 例如 `linux-x64`, `macos-arm64`, `windows-x64` |

架构使用 mise 的重映射名称：`x86_64` → `x64`，`aarch64` → `arm64`。

这会使诸如 `mise.windows.toml`、`mise.macos-arm64.toml` 或 `mise.unix.toml` 之类的配置文件自动加载，并选择匹配的锁文件，例如 `mise.windows.lock`。所有常规的配置文件位置和 `.local.toml` 变体都可正常工作。

平台环境的优先级低于显式的 `MISE_ENV` 条目。完整顺序为（后面的覆盖前面的）：`unix` < `{os}` < `{os}-{arch}` < 显式 `MISE_ENV` 条目。

平台环境只影响配置文件的发现和锁文件的选择。它们不会被添加到 `MISE_ENV` 本身：`{{ mise_env }}` 模板变量以及传递给子进程和任务的 `MISE_ENV` 变量，只会反映显式环境。

### 推出

`auto_env` 目前**默认禁用**。从 mise `2027.6.0` 开始，它将默认启用；在 `2026.12.0` 到那之前，如果 mise 发现某个本会被新加载的平台特定配置文件，就会发出警告。要显式控制该行为：

```toml
# .miserc.toml
auto_env = true # 立即采用新行为
# or
auto_env = false # 保持旧行为并消除警告
```

或者设置 `MISE_AUTO_ENV=true` / `MISE_AUTO_ENV=false`。与 `MISE_ENV` 一样，这是一个早期初始化设置：必须在 `.miserc.toml` 中或通过环境变量设置——在 `mise.toml` 中设置无效，因为读取 `mise.toml` 时配置文件发现过程已经完成。
