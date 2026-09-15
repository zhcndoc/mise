---
description: "mise MCP 服务器允许 AI 助手检查项目的工具、任务、环境和配置，并运行 mise 任务。"
---

# Model Context Protocol (MCP)

mise MCP 服务器允许 AI 助手检查项目的工具、任务、环境和配置，并运行 mise 任务。它通过 stdin/stdout 使用 [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)。客户端会启动一个本地 `mise mcp` 进程；不需要 HTTP 服务器或监听端口。

::: warning Experimental
该服务器要求设置 `MISE_EXPERIMENTAL=1`。其资源和工具可能会发生变化。
:::

## 用法

启动服务器时选择项目目录。否则它会使用客户端的工作目录，该目录可能是你的主目录或不相关的工作区：

```sh
MISE_EXPERIMENTAL=1 mise --cd /absolute/path/to/project mcp
```

将路径替换为你的项目路径。此命令会等待 MCP 输入；不会打开交互式提示。通常应配置 MCP 客户端来启动它，而不是亲自在终端中运行它。

## 与 AI 助手集成

使用 mise 可执行文件、项目目录和实验性环境变量配置客户端。对于使用 `mcpServers` JSON 配置的客户端：

```json
{
  "mcpServers": {
    "mise": {
      "command": "/absolute/path/to/mise",
      "args": ["--cd", "/absolute/path/to/project", "mcp"],
      "env": {
        "MISE_EXPERIMENTAL": "1"
      }
    }
  }
}
```

替换两个路径。在 Windows 上，使用 `mise.exe` 的路径，并在 JSON 中转义反斜杠。对于不会继承 shell 的 `PATH` 的 GUI 客户端，使用绝对可执行文件路径会很有帮助。配置文件的位置和键名取决于客户端；请参阅其 MCP 设置指南。更改配置或切换项目后，重启或重新连接服务器。

### 访问和执行

仅将服务器连接到你信任的项目和客户端。读取 `mise://env` 会评估项目的环境配置并返回其值，其中可能包含机密信息。读取资源还可能评估配置模板和环境指令；只读查询并不能隔离不受信任的项目配置。

`run_task` 会使用你账户的访问权限执行项目命令。它在没有交互式 stdin 的情况下运行，并设置 `MISE_YES=1`，因此应使用客户端的工具批准控制来决定可以运行哪些任务。在允许助手执行任务之前，请先检查任务定义。请参阅 [安全](/security.html)，了解 mise 的配置信任模型。

## 可用资源

资源返回 JSON 文本。它们描述服务器启动时所选的项目。如果客户端继续显示缓存结果，请在编辑配置后重启服务器。

| URI                                  | 内容                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `mise://tools`                       | 活动工具版本、请求的版本、安装路径／状态以及配置来源。 |
| `mise://tools?include_inactive=true` | 活动工具以及其他已安装的版本。                                                     |
| `mise://tasks`                       | 任务定义、命令、描述、依赖项、源文件和执行选项。    |
| `mise://env`                         | 已解析的 mise 环境变量名称和值。                                            |
| `mise://config`                      | 活动配置文件路径和项目根目录。                                           |

`mise://config` 不会返回完整的设置转储。在 `mise://tasks` 中，`env` 字段当前为空对象；它不会公开特定任务的环境值。当你需要资源未提供的详细信息时，请使用源配置。

## 可用工具

### `list_commands`

列出 mise 命令及其帮助文本和声明的影响：`read`、`write` 或 `destructive`。缺少影响表示该命令未分类。这些声明描述命令；它们不会执行命令，也不会强制实施客户端批准策略。

可选的布尔值 `include_hidden` 默认为 `false`。例如：

```json
{
  "include_hidden": false
}
```

### `run_task`

运行任务，包括其正常的 mise 依赖项和环境：

| 参数      | 类型             | 必填 | 含义                                                           |
| --------- | ---------------- | ---- | ----------------------------------------------------------------- |
| `task`    | string           | 是   | 任务名称，例如 `build`。                                       |
| `args`    | array of strings | 否   | 在任务名称之后传递的参数。默认为空数组。 |

对于接受 `--verbose` 标志的任务，请传递：

```json
{
  "task": "build",
  "args": ["--verbose"]
}
```

这些是工具参数，而不是完整的 JSON-RPC 请求。`--verbose` 会传递给任务；它不会启用 mise 自身的详细日志记录。

响应包含任务完成后的 stdout 和 stderr。非零退出状态会生成包含退出代码和输出的工具错误。输出不会流式传输，需要终端输入的任务无法通过此工具提示输入。[`task.timeout`](/configuration/settings.html#task.timeout) 设置会限制执行时间。

### `install_tool`

服务器会公布 `install_tool`，但调用它当前会返回“not yet implemented”错误。在运行任务之前，请在此 MCP 工具之外使用 `mise install` 安装所需工具，或者如果客户端提供单独的命令执行功能，则使用该功能。

## 示例

连接到目标项目后，请让助手：

- 显示活动的 Node.js 版本以及它是否已安装
- 列出可用任务并检查 `build` 的依赖项
- 运行你已检查过的指定任务
- 显示哪些配置文件处于活动状态

如果工具列表或项目根目录不符合预期，请检查服务器的 `--cd` 参数。如果服务器无法启动，请在客户端日志中确认 mise 的绝对路径和 `MISE_EXPERIMENTAL=1`。

## 技术细节

实现位于 [`src/cli/mcp.rs`](https://github.com/jdx/mise/blob/main/src/cli/mcp.rs)。它使用 `rmcp` crate 通过 stdio 实现 MCP 资源列表、资源读取和工具调用。客户端需要支持 MCP；仅支持原始 JSON-RPC 并不能建立 MCP 会话。
