<!-- @由 usage-cli 根据使用规范生成 -->
# `mise completion`

- **用法**: `mise completion [--include-bash-completion-lib] [SHELL]`
- **效果**: 只读
- **源代码**: [`src/cli/completion.rs`](https://github.com/jdx/mise/blob/main/src/cli/completion.rs)

生成 shell 补全内容。

## 参数

### `[SHELL]`

要为其生成补全项的 Shell 类型

**可选项：**

- `bash`
- `fish`
- `powershell`
- `pwsh`
- `zsh`

## 标志

### `--include-bash-completion-lib`

在 bash 补全脚本中包含 bash 补全库

这是 bash 中补全正常工作所必需的，但默认不包含
你可以单独 source 它，或者启用此标志，以在脚本中启用它。

示例：

```
mise completion bash --include-bash-completion-lib > ~/.local/share/bash-completion/completions/mise
mise completion zsh  > /usr/local/share/zsh/site-functions/_mise
mise completion fish > ~/.config/fish/completions/mise.fish
mise completion powershell >> $PROFILE
```
