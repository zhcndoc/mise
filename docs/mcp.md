# 模型上下文协议（MCP）

模型上下文协议（MCP）是一种标准协议，使 AI 助手能够与开发工具交互并访问项目上下文。Mise 提供了一个 MCP 服务器，允许 AI 助手查询有关你的开发环境的信息。

## 概述

当你运行 `mise mcp` 时，它会启动一个服务器，AI 助手可以连接到该服务器并查询有关你由 mise 管理的开发环境的信息。该服务器通过 stdin/stdout 使用 JSON-RPC 协议进行通信。

::: warning
MCP 功能处于实验阶段，需要通过 `MISE_EXPERIMENTAL=1` 启用实验性功能。
:::

## 用法

MCP 服务器通常由 AI 助手自动启动，但你也可以手动运行它进行测试：

```bash
# 启用实验性功能
export MISE_EXPERIMENTAL=1

# 启动 MCP 服务器（它会在 stdin 上等待 JSON-RPC 输入）
mise mcp
```

## 可用资源

MCP 服务器公开了以下只读资源，AI 助手可以查询这些资源：

### `mise://tools`

列出项目中由 mise 管理的所有工具，包括：

- 工具名称和版本
- 安装状态
- 配置来源

### `mise://tasks`

显示所有可用的 mise 任务，包括：

- 任务名称和描述
- 任务依赖
- 命令定义

### `mise://env`

显示在你的 mise 配置中定义的环境变量：

- 变量名称和值
- 特定环境的覆盖设置

### `mise://config`

提供有关 mise 配置的信息：

- 当前生效的配置文件
- 项目根目录
- 设置和偏好。

## 可用工具

以下工具可供 AI 助手调用：

### `install_tool`

安装特定版本的工具（尚未实现）

### `run_task`

执行一个 mise 任务，可带可选参数。

**参数：**

- `task`（必需，字符串）：要运行的任务名称
- `args`（可选，字符串数组）：传递给任务的参数

**示例：**

```json
{
  "task": "build",
  "args": ["--verbose"]
}
```

当 AI 助手调用此工具时，它将执行指定的任务并返回输出，包括 stdout、stderr 和退出状态。

## 与 AI 助手集成

### Claude Desktop

要在 Claude Desktop 中使用 mise，请将以下内容添加到你的 Claude 配置文件中：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mise": {
      "command": "mise",
      "args": ["mcp"],
      "env": {
        "MISE_EXPERIMENTAL": "1"
      }
    }
  }
}
```

添加此配置并重启 Claude Desktop 后，助手将能够：

- 查询你已安装的工具和版本
- 列出项目中可用的任务
- 直接执行任务（例如，“运行 build 任务”）
- 访问你 mise 配置中的环境变量
- 查看你的 mise 配置结构

### 其他 AI 助手

MCP 服务器通过 stdio 使用标准的 JSON-RPC 2.0，因此它与任何支持 Model Context Protocol 的 AI 助手都兼容。有关具体的集成说明，请参阅你的 AI 助手文档。

## 示例

当与 AI 助手集成时，你可以提出如下问题：

- “这个项目使用的是哪个版本的 Node.js？”
- “列出这个项目中所有可用的任务”
- “运行构建任务”
- “以详细输出执行测试任务”
- “mise 设置了哪些环境变量？”
- “向我展示这个项目的 mise 配置”

AI 助手将查询 MCP 服务器，以提供关于你的开发环境准确、最新的信息，并可以代表你执行任务。

## 技术细节

MCP 服务器的实现位于 [`src/cli/mcp.rs`](https://github.com/jdx/mise/blob/main/src/cli/mcp.rs)。它实现了 rmcp crate 中的 ServerHandler trait，用于处理：

- 资源列表和读取
- 工具调用（任务执行）
- 通过 stdio 进行 JSON-RPC 通信

有关模型上下文协议的更多信息，请访问 [官方 MCP 文档](https://modelcontextprotocol.io/docs/getting-started/intro)。
