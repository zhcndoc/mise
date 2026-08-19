<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise install`

- **用法**: `mise install [FLAGS] [TOOL@VERSION]…`
- **别名**: `i`
- **作用**: 修改状态
- **源代码**: [`src/cli/install.rs`](https://github.com/jdx/mise/blob/main/src/cli/install.rs)

安装一个工具版本

将工具版本安装到 `~/.local/share/mise/installs/<TOOL>/<VERSION>`  
仅安装不会激活这些工具，因此它们不会出现在 PATH 中。  
若要在一条命令中同时安装和/或激活，请使用 `mise use`，它会在当前目录中创建一个 `mise.toml` 文件，  
以便在位于该目录内时激活此工具。  
或者，运行 `mise exec <TOOL>@<VERSION> -- <COMMAND>` 来执行工具，而无需创建配置文件。

工具将并行安装。要禁用此行为，请设置 `--jobs=1` 或 `MISE_JOBS=1`

## 参数

### `[TOOL@VERSION]…`

要安装的工具，例如：node@20

## 标志

### `-f --force`

即使已经安装，也强制重新安装  
未指定工具时，重新安装所有已配置的工具

### `-j --jobs <JOBS>`

并行运行的任务数  
小于 1 的值将按 1 处理  
[默认值：4]

### `-n --dry-run`

显示将要安装的内容，但不实际安装

### `-v --verbose…`

显示安装输出

此参数将打印后端输出，例如下载、配置和编译输出。

### `--dry-run-code`

类似于 `--dry-run`，但如果有工具需要安装，则以代码 1 退出

这对脚本检查是否需要安装工具很有用。

### `--include-task-tools`

还会安装当前作用域内的任务所需的工具

这会准备任务工具，但不会运行任务命令或依赖项。  
与 `--monorepo` 结合使用，可包含每个已配置根目录中的任务。

### `--minimum-release-age <MINIMUM_RELEASE_AGE>`

仅安装在此日期之前发布或早于此时长的版本

支持像 "2024-06-01" 这样的绝对日期，以及像 "90d" 或 "1y" 这样的相对时长。

### `--monorepo`

从每个 [monorepo].config_roots 配置根目录安装工具

使用当前激活的 MISE_ENV，并且需要 monorepo_root = true，以及在 monorepo 根配置中显式指定  
[monorepo].config_roots。

### `--raw`

将后端安装命令的 stdin/stdout/stderr 直接连接到终端  
这会隐含设置 --jobs=1

### `--shared <SHARED>`

将工具安装到共享目录

安装到指定目录，而不是默认安装位置。  
根据路径不同，可能需要提升权限。

### `--system`

将工具安装到系统级共享目录

安装到 /usr/local/share/mise/installs（或 MISE_SYSTEM_DATA_DIR/installs）。  
可能需要提升权限（例如 sudo）。

示例：

```
mise install node@20.0.0  # install specific node version
mise install node@20      # install fuzzy node version
mise install node         # install version specified in mise.toml
mise install              # installs everything specified in mise.toml
mise install --include-task-tools # also install tools required by tasks
```
