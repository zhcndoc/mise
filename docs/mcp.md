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

- Reading `mise://env` evaluates the project's environment config and returns
  the values, which can include secrets. Resource reads can also evaluate
  templates and environment directives, so a read is not a sandbox for config
  you have not reviewed.
- Resource reads follow mise's
  [trust rules](/security.html#configuration-trust), and the server cannot show
  the trust prompt. If the project's config needs trust, for example because
  it has `[env]`, templates or tool options, reads fail with
  a `Failed to load config` error that says the config files are not trusted,
  until you run `mise trust` in the project.
- `run_task` runs the project's commands with your account's access, and
  `install_tool` installs tools. Unlike `mise run` and `mise install` in a
  terminal, neither trusts the project for you: both refuse a project whose
  config files are not trusted, and list the `mise trust` commands to run after
  you review the files. The `mise` they start trusts nothing on its own either,
  因此，它在子目录中访问的配置也必须受信任；没有配置文件的项目中的[文件任务](/tasks/file-tasks.html)同样需要信任：请对包含 `mise-tasks/` 的目录运行 `mise trust <dir>`。`run_task` 接受任务名称，而不是要运行的脚本路径。
- `install_tool` 接受工具和版本，不接受[工具选项](/dev-tools/#tool-options)：它会拒绝 `"tool[option=value]"`，因为 `postinstall` 等选项会运行命令。
- `run_task` runs without stdin and sets `MISE_YES=1`, which answers mise's
  other confirmation prompts. Use your client's tool approval settings to decide
  which tasks may run, and review task definitions before allowing them.

To let an assistant inspect a project you have not trusted, add
`"env": { "MISE_SAFE": "1" }` to the server entry. In
[safe mode](/security.html#safe-mode), `mise://env` returns no project values
and `run_task` fails, while the other resources still list the project's tools,
tasks and config files.

## Resources {#available-resources}

Resources return JSON text. The server loads the project's configuration once
and keeps it until it exits, so after you edit `mise.toml` or task files,
restart the server from your client to refresh the resources. `run_task` starts
a new `mise run` each time and always uses the current files.

| URI                                  | Contents                                                                                                                                                                                                                                       |
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
