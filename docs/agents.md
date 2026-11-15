---
description: "将项目的 mise 工具和环境变量加入编程代理的非交互式 shell 的 PATH，并提供经过测试的 Claude Code 钩子。"
socialDescription: "让编程代理直接使用项目的 mise 工具，无需为每条命令添加 mise x。"
---

# 编程代理

Claude Code 或 Codex 等编程代理会在非交互式 shell 中运行每条命令。因此，`.zshrc` 或 `.bashrc` 中的 `mise activate` 不会在这些 shell 里运行，代理也就无法使用项目工具或 `[env]`，除非它用 [`mise x --`](/cli/exec.html) 包装命令，或 shell 能在 `PATH` 中找到 [shims](/dev-tools/shims.html)。

这两种方式都可行，但各有代价。包装每条命令很繁琐，代理也容易忘记。shims 会根据命令运行时所在目录解析工具；如果当前目录的配置没有选择某个工具，就会报错 `No version is set for shim`。

mise 没有专门针对代理的模式。它现有的功能已经够用：`mise hook-env` 是 `mise activate` 在每次提示符出现前运行的命令，而且无需提示符也能使用。让代理在每条命令前运行它，就能获得与已激活的交互式 shell 相同的 `PATH` 和环境变量。

## Claude Code {#claude-code}

Claude Code 会在运行每条 Bash 命令前加载 `$CLAUDE_ENV_FILE` 指定的文件。只有 `SessionStart`、`Setup`、`CwdChanged` 和 `FileChanged` 钩子可以写入该文件。将以下内容加入 `~/.claude/settings.json` 或项目的 `.claude/settings.json`：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "[ -n \"$CLAUDE_ENV_FILE\" ] && echo 'eval \"$(mise hook-env -s bash)\"' >> \"$CLAUDE_ENV_FILE\"; true"
          }
        ]
      }
    ]
  }
}
```

钩子会追加一行：

```sh
eval "$(mise hook-env -s bash)"
```

如果 Claude Code 使用 zsh 运行命令，请改用 `-s zsh`。每条命令运行前都会执行这一行，因此会根据命令开始时代理所在的目录更新环境：代理运行 `cd subproject` 后，下一条命令就能使用该项目的工具；离开后，这些工具也会从环境中移除。它不会在一条命令执行过程中刷新，因此 `cd subproject && node --version` 中的 `node` 仍使用父项目的环境。如果上条命令之后没有变化，`hook-env` 不会输出内容，耗时只有几毫秒。

这行命令必须能找到 `mise`。安装程序可能没有将 `~/.local/bin` 加入未运行 `mise activate` 的 shell 的 `PATH`，代理使用的 shell 就属于这种情况。如果其中的 `command -v mise` 失败，请在钩子中写入绝对路径，例如 `eval "$(~/.local/bin/mise hook-env -s bash)"`。

如果希望整个会话都使用固定环境，也可以改为将 [`mise env`](/cli/env.html) 的输出写入文件。它会在会话开始时、会话启动所在目录中求值，之后不会跟随 `cd`：

```sh
mise env -s bash >> "$CLAUDE_ENV_FILE"
```

采用任一方式后，代理都可以直接运行 `node`、`cargo` 或 `python`，项目的 `[env]` 变量也会设置好。

mise 不会在这里自动安装缺失的工具。请先在项目中运行 [`mise install`](/cli/install.html)，或让代理运行该命令。mise 不会加载尚未[信任](/cli/trust.html)的配置。

## Codex {#codex}

Codex 默认通过登录 shell 运行命令，因此登录配置文件中的工具设置会生效。将 [shims 添加到登录配置文件](/dev-tools/shims.html#how-to-add-mise-shims-to-path)并在项目中运行 `mise install`。这种方式不如 Claude Code 的设置完整：它只会将项目的 `[env]` 变量添加到 shim 启动的工具及其子进程中，因此 shell 中运行 `echo "$FOO"` 仍看不到变量；当前目录配置没有选择的工具也会报错 `No version is set for shim`。请查阅 Codex 自身的文档，了解它如何选择 shell，因为 mise 无法更改这项行为。这里没有像 Claude Code 钩子那样对这种配置进行测试。

## 其他代理

凡是会在每条命令前加载文件，或允许你为 shell 指定 rc 文件的代理，都可以使用同一行命令。仅在会话启动时运行一次的命令本身并不足够，因为它只会更改该进程及其子进程的环境，后续命令不会继承。因此 Claude Code 钩子会把命令写入文件，而不是直接运行 `hook-env`。如果代理不支持这两种方式，可在登录配置文件中采用备用方案：[将 shims 加入 `PATH`](/ide-integration.html#adding-shims-to-path-default-shell)，并接受上述限制。

## Worktrees {#worktrees}

代理经常在 Git worktree 中工作，例如 `.claude/worktrees/<name>`。`hook-env` 无需针对每个 worktree 单独设置，因为它会读取命令实际运行目录中的配置。shims 更容易在这里遇到问题：worktree 通常使用自己的配置解析工具，因此更容易出现 `No version is set for shim`。

已安装的工具位于 mise 数据目录中，而不是 worktree 里，因此新 worktree 无需重新安装工具。

## 相关内容

- [AI 助手（MCP）](/mcp.html)介绍如何通过 `mise mcp` 让助手读取项目的任务和配置并运行任务。
- [Shims](/dev-tools/shims.html)介绍 shims 与通过 `PATH` 激活环境的取舍。
