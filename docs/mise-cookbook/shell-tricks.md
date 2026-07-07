# Shell 技巧

一组利用 mise 的 shell 工具。

## 提示符着色

在 ZSH 中，当 mise 更新环境时设置提示符颜色（例如在切换到项目目录时，或由于修改了 .mise\*.toml）：

```shell
# 像平常一样激活 mise
source <(command mise activate zsh)

typeset -i _mise_updated

# 替换默认的 mise hook
function _mise_hook {
  local diff=${__MISE_DIFF}
  source <(command mise hook-env -s zsh)
  [[ ${diff} == ${__MISE_DIFF} ]]
  _mise_updated=$?
}

_PROMPT="❱ "  # 或者使用 _PROMPT=${PROMPT} 来保留默认值

function _prompt {
  if (( ${_mise_updated} )); then
    PROMPT='%F{blue}${_PROMPT}%f'
  else
    PROMPT='%(?.%F{green}${_PROMPT}%f.%F{red}${_PROMPT}%f)'
  fi
}

add-zsh-hook precmd _prompt
```

现在，当 mise 对环境进行任何更新时，提示符将变为蓝色。

## powerline-go 提示符中的当前配置环境

[powerline-go](https://github.com/justjanne/powerline-go) 的
`shell-var` 段可用于在提示符中显示环境
变量的值。
当前的 mise [配置环境](/configuration/environments)、
`MISE_ENV` 就是一个很好的候选项。

大体上，这和预期一致：在 `-modules` 中包含 `shell-var`，
并在参数中添加 `-shell-var MISE_ENV -shell-var-no-warn-empty`，
同时确保 `MISE_ENV` 已导出，这样 `powerline-go` 才能“看到”它。

截至 2025 年 2 月，有一个需要注意的问题：`shell-var` 模块
不接受未设置的（与空值不同）环境变量。
为了解决这个问题，请在 shell 启动脚本的早期将 `MISE_ENV`
设置为空值，并避免手动 `unset` 它。
例如对于 bash，通常在 `~/.bashrc` 中：

```bash
export MISE_ENV=
```

## 检查 mise hook 之后发生了哪些变化

使用 record-query，你可以检查 `__MISE_DIFF` 和 `__MISE_SESSION` 变量，以查看由于 mise hook 导致你的环境中有哪些变化。

```toml [~/.config/mise/config.toml]
[tools]
"cargo:record-query" = "latest"
```

```shell
function mise_parse_env {
  rq -m < <(
    zcat -q < <(
      printf '\x1f\x8b\x08\x00\x00\x00\x00\x00'
      base64 -d <<< "$1"
    )
  )
}
```

```shell
$ mise_parse_env "${__MISE_DIFF}"
{
  "new": {
    ...
  },
  "old": {
    ...
  },
  "path": [
    ...
  ]
}
```
