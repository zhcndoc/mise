---
description: "通过 mise MCP 服务器将 AI 助手连接到项目的工具、任务、环境和配置。"
socialDescription: "将 AI 助手连接到项目的 mise 工具、任务和环境。"
---

# AI 助手（MCP）

[`mise mcp`](/cli/mcp.html) 会运行一个
[模型上下文协议（MCP）](https://modelcontextprotocol.io/docs/getting-started/intro)
服务器，让 AI 助手读取项目的工具、任务、环境变量和配置文件，并运行项目任务。客户端会将
`mise mcp` 作为本地进程启动，通过 stdin 和 stdout 与其通信；该服务器不会监听任何端口。

## 连接客户端 {#integration-with-ai-assistants}

配置客户端时，请让它在项目目录下启动 mise。如果没有传入 `--cd`，服务器会使用客户端的工作目录，
该目录可能是你的主目录或其他工作区。对于使用 `mcpServers` JSON 配置的客户端：

```json
{
  "mcpServers": {
    "mise": {
      "command": "/absolute/path/to/mise",
      "args": ["--cd", "/absolute/path/to/project", "mcp"]
    }
  }
}
```

请使用 mise 的绝对路径，因为图形界面客户端通常不会继承 shell 的 `PATH`。运行
`command -v mise` 查找路径；在 PowerShell 中则运行 `(Get-Command mise).Source`。在 Windows 上，
请指定 `mise.exe` 的路径，并在 JSON 中转义反斜杠。

配置文件的位置和键名取决于具体客户端。例如，VS Code 在 `.vscode/mcp.json` 中使用 `servers`
键。支持命令行配置的客户端使用相同的命令和参数，例如 Claude Code：

```sh
claude mcp add mise -- mise --cd /absolute/path/to/project mcp
```

修改配置或切换项目后，请重启服务器或重新连接。

## 安全 {#access-and-execution}

Connect the server only to a project and a client you trust.

- 读取 `mise://env` 时会计算项目的环境配置并返回变量值，其中可能包含机密信息。读取资源还可能会
  计算模板和环境指令，因此读取未经审查的配置并不具备沙箱保护。
- 资源读取遵循 mise 的[信任规则](/security.html#configuration-trust)，但服务器无法显示信任
  提示。如果项目配置需要信任（例如包含 `[env]`、模板或工具选项），读取会因配置文件尚未受信任而
  返回 `Failed to load config` 错误；在项目中运行 `mise trust` 后即可恢复。
- `run_task` 会以你的账户权限运行项目命令，`install_tool` 会安装工具。与在终端中运行
  `mise run` 和 `mise install` 不同，这两个工具都不会代你信任项目：如果配置文件尚未受信任，它们
  会拒绝操作，并列出你审查文件后需要运行的 `mise trust` 命令。它们启动的 `mise` 进程本身也不会
  自动信任任何配置，因此它访问到的子目录配置也必须获得信任。
- `run_task` 不会连接 stdin，并会设置 `MISE_YES=1`，从而自动确认 mise 的其他提示。请通过客户端
  的工具审批设置决定允许运行哪些任务，并在批准前检查任务定义。

若要让助手检查尚未信任的项目，请在服务器配置中添加
`"env": { "MISE_SAFE": "1" }`。在[安全模式](/security.html#safe-mode)下，
`mise://env` 不会返回项目变量，`run_task` 会失败；其他资源仍会列出项目工具、任务和配置文件。

## 资源 {#available-resources}

资源以 JSON 文本形式返回。服务器只在启动时加载一次项目配置，并在退出前一直使用该配置。因此，
修改 `mise.toml` 或任务文件后，请通过客户端重启服务器以刷新资源。每次调用 `run_task` 都会启动
新的 `mise run` 进程，并始终使用当前文件。

| URI                                  | 内容                                                                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mise://tools`                       | 当前启用的工具版本、请求的版本、安装路径、是否已安装，以及请求该工具的配置文件。                                                                                                      |
| `mise://tools?include_inactive=true` | 当前启用的工具及其他已安装版本。                                                                                                                                                      |
| `mise://tasks`                       | 任务定义，包括 monorepo 子项目任务：命令、描述、依赖项、源文件和选项。`env` 字段会按原样列出任务的环境指令（例如 `"NODE_ENV=test"`），不会计算其值。                           |
| `mise://env`                         | 解析后的环境变量名称和值。                                                                                                                                                            |
| `mise://config`                      | 当前生效的配置文件路径和项目根目录；不包含设置项。                                                                                                                                    |

读取 `mise://tools` 时会解析每个版本请求；如果本机没有匹配的已安装版本，mise 可能会通过网络获取版本
列表。以下为精简示例：

```json
{
  "node": [
    {
      "version": "24.21.0",
      "requested_version": "24",
      "install_path": "/home/me/.local/share/mise/installs/node/24.21.0",
      "installed": true,
      "active": true,
      "source": { "type": "mise.toml", "path": "/home/me/src/app/mise.toml" }
    }
  ]
}
```

## 工具 {#available-tools}

| 工具            | 参数                                        | 功能                                                                                                                                                                                                 |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_commands` | `include_hidden`（boolean，默认 `false`）   | 列出 mise 命令、帮助文本和声明的影响级别：`read`、`write` 或 `destructive`。未声明影响级别的命令属于未分类，并不代表安全。该工具不会运行命令。 |
| `run_task`      | `task`（string），`args`（string 数组）     | 使用任务的依赖项和环境运行任务，并在完成后返回输出。                                                                                                       |
| `install_tool`  | `tool`（string），`version`（string）      | 与 `mise install` 相同，用于安装工具。`version` 默认为配置的版本，或 `latest`。返回包含 `tool`、已安装的 `version`、`install_path` 和安装日志 `output` 的 JSON。 |

`list_commands` 返回的条目示例如下：

```json
{
  "bin": "mise",
  "commands": [
    {
      "command": "tasks ls",
      "help": "List available tasks",
      "effect": "read",
      "hidden": false
    }
  ]
}
```

助手可以使用如下参数调用 `run_task`：

```json
{
  "task": "build",
  "args": ["--verbose"]
}
```

此处的 `--verbose` 会传递给任务，而不是 mise。任务结束后，结果中会包含其 stdout 和 stderr；
输出不会以流的形式传回，任务也无法读取终端输入。如果任务以非零状态码退出，工具错误中会包含
退出码和输出。[`task.timeout`](/configuration/settings.html#task.timeout) 设置用于限制任务的
最长运行时间。

## 提示示例 {#examples}

连接到目标项目后，请让助手：

- 显示当前使用的 Node.js 版本及其是否已安装。
- 列出可用任务以及 `build` 依赖的任务。
- 运行一个经过审查的指定任务。
- 显示当前生效的配置文件。

## 故障排除 {#troubleshooting}

- 出现意外的任务或工具：检查服务器配置中 `--cd` 后面的路径。
- `Failed to load config`：在项目中运行 `mise trust`；也可以运行 `mise doctor` 查找问题。
- 服务器无法启动：检查客户端 MCP 日志中的 mise 绝对路径。在终端运行
  `mise --cd /absolute/path/to/project mcp`；它会向 stderr 输出 `Starting mise MCP server...` 并等待输入。
- 修改配置后资源仍未更新：通过客户端重启服务器。
