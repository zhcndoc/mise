---
description: "基于 mise 构建的一组 shell 工具。"
---

# Shell 技巧

一组基于 mise 构建的 shell 工具。

## 提示符着色

在 Zsh 中，在现有的 `mise activate zsh` 设置之后添加一个提示符 hook。此示例会在 mise 的环境状态发生变化时，将提示符替换为蓝色标记，否则替换为绿色标记。它会保留 mise 的激活函数：

```zsh
# Put this after your existing mise activation in ~/.zshrc.
autoload -Uz add-zsh-hook
typeset -g _mise_prompt_diff="${__MISE_DIFF-}"

function _mise_prompt_colour {
  local previous_status=$?
  if [[ "${__MISE_DIFF-}" != "$_mise_prompt_diff" ]]; then
    PROMPT='%F{blue}❱ %f'
  else
    PROMPT='%F{green}❱ %f'
  fi
  _mise_prompt_diff="${__MISE_DIFF-}"
  return "$previous_status"
}

add-zsh-hook -d precmd _mise_prompt_colour
add-zsh-hook precmd _mise_prompt_colour
```

`__MISE_DIFF` 是内部状态，因此请将其视为一项需要在升级 mise 时维护的自定义设置。要撤销此设置，请使用 `add-zsh-hook -d precmd _mise_prompt_colour` 移除 `_mise_prompt_colour`，并恢复你常用的 `PROMPT` 或提示符主题。

## powerline-go 提示符中的当前配置环境

[powerline-go](https://github.com/justjanne/powerline-go) 的 `shell-var` segment 可用于在提示符中显示环境变量的值。当前的 mise [配置环境](/configuration/environments) `MISE_ENV` 就是一个很好的选择。

通常，它的工作方式正如你所期望的那样：在 `-modules` 中加入 `shell-var`，在参数中传入 `-shell-var MISE_ENV -shell-var-no-warn-empty`，并确保 `MISE_ENV` 已导出，以便 `powerline-go` 能够看到它。

如果你的 powerline-go 版本会在 `MISE_ENV` 未设置时发出警告，请确保定义该变量，同时保留 shell 启动前所做的任何选择：

```bash
export MISE_ENV="${MISE_ENV-}"
```

这会显示导出的 `MISE_ENV` 值。仅通过 `mise -E` 为单个命令选择的环境，或由 `auto_env` 选择的平台环境，都不会对该 shell 变量产生持久更改。

## 检查 mise hook 之后发生的变化

对于常规故障排查，请从 `mise config`、`mise doctor` 或 `MISE_DEBUG=1 mise env` 开始。如果你需要检查 shell 本身的状态记录，`__MISE_DIFF` 和 `__MISE_SESSION` 目前包含经过 base64 编码、zlib 压缩的 MessagePack 数据。

以下 Bash/Zsh 辅助函数需要 Python 和 `msgpack` 包。为解码器创建一个隔离的 Python 环境：

```sh
python3 -m venv ~/.cache/mise-env-inspect
~/.cache/mise-env-inspect/bin/python -m pip install msgpack
```

```bash
function mise_parse_env {
  printf '%s' "$1" | "$HOME/.cache/mise-env-inspect/bin/python" -c '
import base64, pprint, sys, zlib
import msgpack
value = sys.stdin.read().strip()
if not value:
    raise SystemExit("No mise state was supplied; activate mise first")
payload = zlib.decompress(base64.b64decode(value + "=" * (-len(value) % 4)))
pprint.pprint(msgpack.unpackb(payload, raw=False), sort_dicts=False)
'
}
```

在已激活的 shell 中使用它：

```sh
mise_parse_env "$__MISE_DIFF"
mise_parse_env "$__MISE_SESSION"
```

此格式属于实现细节，而非 API。解码后的数据可能包含环境值，包括机密信息；请在本地检查，并在分享诊断输出之前对其进行删减。
