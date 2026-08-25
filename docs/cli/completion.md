<!-- @由 usage-cli 根据使用规范生成 -->
# `mise completion`

- **用法：** `mise completion [FLAGS] [SHELL]`
- **别名：** `complete`、`completions`
- **效果：** 只读
- **源代码：** [`src/cli/completion.rs`](https://github.com/jdx/mise/blob/main/src/cli/completion.rs)

生成 shell 补全内容。

## 参数
- **`[SHELL]`** — 要为其生成补全内容的 Shell 类型

  **可选项：** `bash`、`fish`、`powershell`、`zsh`、`pwsh`

## 标志
- **`--include-bash-completion-lib`** — 为兼容较旧的补全生成器而保留。

  usage-rs 的内置 bash 脚本是自包含的，因此现在此选项不执行任何操作。
- **`--install`** — 将脚本安装到此 shell 查找它的位置，而不是打印脚本

  只写入脚本文件，不执行其他操作：不会修改 shell rc 文件，也不会修改 PowerShell 配置文件。对于需要一次性添加专属配置行的 shell——zsh 的 `fpath+=`、PowerShell 的点源命令——会将其打印出来供你添加。

  **效果：** 修改状态
- **`--force`** — 替换目标路径中不是由 mise 写入的文件

  **效果：** 修改状态
- **`-h --help`** — 打印帮助

示例：

```
# put it where the shell looks, and print any one-time line it still needs
$ mise completion zsh --install

# or choose the path yourself
$ mise completion bash > ~/.local/share/bash-completion/completions/mise
$ mise completion zsh  > /usr/local/share/zsh/site-functions/_mise
$ mise completion fish > ~/.config/fish/completions/mise.fish
$ mise completion powershell >> $PROFILE
```
