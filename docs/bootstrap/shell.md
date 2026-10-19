---
description: "通过 mise bootstrap 将 mise 激活命令写入 bash、zsh 和 fish 启动文件，并设置登录 shell。"
socialDescription: "将 mise 激活命令写入 shell 启动文件，并设置登录 shell。"
---

# Shell 激活与登录 shell

`[bootstrap.mise_shell_activate]` 会将 mise 激活配置写入 Shell 启动文件，`[bootstrap.user]` 则设置登录 Shell。`mise bootstrap` 会同时应用两者，因此新机器只需运行一次即可配置好 Shell。

## 在 Shell 中激活 mise

对于 zsh，只需设置一个键：

```toml
[bootstrap.mise_shell_activate]
zsh = true
```

`zsh = true` 会将 shims 写入 `~/.zprofile`，并将激活配置写入 `~/.zshrc`。对于 Bash，可设置 `bash = true`，写入 `~/.bash_profile` 和 `~/.bashrc`。对于 fish，可设置 `fish = "auto"`，将配置写入 `~/.config/fish/config.fish`；详见[fish：交互式 Shell 中激活，其他情况下使用 shims](#fish-activation-interactively-shims-otherwise)。可以单独应用此部分，也可以在完整运行中一并应用：

```sh
mise bootstrap mise-shell-activate apply
mise bootstrap
```

这些配置块与[Shell 设置](/shell-setup.html)中手动添加激活配置时使用的内容相同。

### 先将 mise 加入 PATH

配置块会直接通过命令名调用 `mise`，因此启动文件运行时 `mise` 必须已经位于 `PATH` 中。通过 Homebrew 等软件包管理器安装时会自动处理这一点。若通过 [mise.run](/installing-mise.html) 安装到 `~/.local/bin`，请在运行配置块前先将该目录加入 `PATH`，例如在 zsh 最先读取的 `~/.zshenv` 中添加一条 [`[dotfiles]` 行条目](/dotfiles/edits.html)：

```toml
[dotfiles]
"~/.zshenv/local-bin" = { line = 'export PATH="$HOME/.local/bin:$PATH"' }
```

对于 Bash，请在 `~/.bash_profile` 和 `~/.bashrc` 中使用 `position = "prepend"` 添加相同行，使其位于配置块之前。对于 fish，请在 `~/.config/fish/config.fish` 中前置一行，将 `~/.local/bin` 加入 `PATH`。`mise bootstrap` 会先应用 `[dotfiles]`，再配置 Shell 激活，因此一次运行即可写入两者。

### 登录文件为何使用 shims

激活命令运行时会应用环境，之后则在每次显示提示符或切换目录时通过钩子更新环境。编辑器或其他程序启动时只会读取一次登录配置文件，并保留当时的环境；因此，如果在登录配置文件中执行完整激活，工具版本就会固定为登录 Shell 启动目录对应的版本。Shims 则会在每次运行工具时根据当前目录选择版本。因此，登录文件 `~/.zprofile` 和 `~/.bash_profile` 使用 shims，而交互式 Shell 读取的 `~/.zshrc` 和 `~/.bashrc` 使用完整激活。fish 只有一个启动文件 `config.fish`，所以 `fish = "auto"` 会区分两种情况：交互式 Shell 使用完整激活，其他情况下使用 shims。两者的对比请参阅 [Shims](/dev-tools/shims.html#overview)。

Bash 登录 Shell 会读取 `~/.bash_profile`，但不会读取 `~/.bashrc`。如果 `~/.bash_profile` 未加载 `~/.bashrc`，交互式登录 Shell 就只会获得 shims，而不会激活 mise。

## 选择文件和模式

每个键对应一种 Shell 或一个启动文件。Shell 键是该 Shell 默认文件的快捷设置，文件键则指定单个文件：

| 键             | Shell | 文件                         | 默认模式     | 默认模式下写入的配置块                 |
| -------------- | ----- | ---------------------------- | ------------ | -------------------------------------- |
| `bash_profile` | bash  | `~/.bash_profile`            | `shims`      | `eval "$(mise activate bash --shims)"` |
| `bashrc`       | bash  | `~/.bashrc`                  | `activate`   | `eval "$(mise activate bash)"`         |
| `zprofile`     | zsh   | `~/.zprofile`                | `shims`      | `eval "$(mise activate zsh --shims)"`  |
| `zshrc`        | zsh   | `~/.zshrc`                   | `activate`   | `eval "$(mise activate zsh)"`          |
| `zshenv`       | zsh   | `~/.zshenv`                  | `shims`      | `eval "$(mise activate zsh --shims)"`  |
| `fish`         | fish  | `~/.config/fish/config.fish` | `activate`   | `mise activate fish \| source`         |

另一种模式会添加或移除 `--shims`。`bash` 和 `zsh` 快捷设置会涵盖上表中的登录和交互式启动文件，但不会写入 zsh 每次运行脚本都会读取的 `~/.zshenv`；若要配置该文件，请显式设置 `zshenv`。

Every key takes one of these values:

| 值                                   | 效果                                                 |
| ------------------------------------ | ----------------------------------------------------- |
| `true`                               | 使用默认模式启用                                      |
| `false`                              | 禁用，即使更宽范围的配置已启用                         |
| `"activate"` 或 `"shims"`            | 使用指定模式启用；设置 Shell 键时应用于所有文件        |
| `"auto"`                             | 仅用于 fish：交互式时激活，其他情况使用 shims          |
| `{ enabled = true, mode = "shims" }` | 以表格形式指定相同设置；`enabled` 为必填项             |

For example, this puts shims in both zsh files:

```toml
[bootstrap.mise_shell_activate]
zsh = "shims"
```

Within one config file, shell keys apply before file keys, so `zsh = true` with
`zshrc = false` writes only `~/.zprofile`. Across config files, the most local
value for each file wins, so a project config can turn off one file that your
global config enables without changing the others.

These files are fixed paths in your home directory and ignore `ZDOTDIR`. If you
set `ZDOTDIR`, set `zsh = false` and add the blocks with
[`[dotfiles]` edits](/dotfiles/edits.html) on the files in that directory:

```toml
[dotfiles]
"~/.config/zsh/.zprofile/activate" = { block = 'eval "$(mise activate zsh --shims)"' }
"~/.config/zsh/.zshrc/activate" = { block = 'eval "$(mise activate zsh)"' }
```

此处仅支持 bash、zsh 和 fish。对于 PowerShell、Nushell 或其他 Shell，请按照[Shell 设置](/shell-setup.html)中的说明，通过 `[dotfiles]` 编辑项添加对应的 `mise activate` 行。

### fish：交互式 Shell 中激活，其他情况下使用 shims

交互式 Shell 和脚本都会读取 fish 的 `config.fish`。若要在命令提示符中完整激活，并在其他情况下使用 shims，请设置仅 fish 支持的 `auto` 模式：

```toml
[bootstrap.mise_shell_activate]
fish = "auto"
```

It writes this block:

```fish
if status is-interactive
    mise activate fish | source
else
    mise activate fish --shims | source
end
```

bash 和 zsh 已经通过登录与交互式启动文件区分了这两种情况，因此对这两种 Shell 设置 `auto` 会被忽略并显示警告。

## 已有启动文件

mise 只管理标记之间的内容，文件其余部分保持不变。标记格式与 [`[dotfiles]` 编辑项](/dotfiles/edits.html)使用的格式相同：

```sh
# >>> mise:activate >>> managed by mise — do not edit between markers
eval "$(mise activate zsh)"
# <<< mise:activate <<<
```

如果标记外已经有一行 `eval "$(mise activate zsh)"`，请将其删除，否则激活会运行两次。应用更改后，请打开新的 Shell 并运行 `mise doctor`；修改启动文件不会影响已在运行的 Shell。mise 只会在运行 `mise bootstrap` 或 `mise bootstrap mise-shell-activate apply` 时编辑这些文件。

如果 `[dotfiles]` 已覆盖某个文件，mise 会跳过该文件的配置块，且不显示警告：

- 将整个文件部署到相同路径的条目。
- 在相同路径使用 `activate` ID 的编辑项，例如 `"~/.zshrc/activate"`。

如果文件使用 `mode = "track"` 或 `mode = "track-local"` 进行跟踪，mise 仍会写入配置块，因为跟踪只记录文件历史，不会写入文件。若要写入自定义配置块，请使用 `[dotfiles]` 编辑项，如上方 `ZDOTDIR` 示例所示。

## 预览并应用

```sh
mise bootstrap mise-shell-activate status            # show each block's state
mise bootstrap mise-shell-activate status --missing  # exit 1 if a block is missing or differs
mise bootstrap mise-shell-activate apply --dry-run   # print the edits
mise bootstrap mise-shell-activate apply --yes       # apply without a prompt
```

`mise bootstrap shell` 是较短的别名。`status --json` 会为每个文件返回一个条目，包含 `target`、`shell`、`path`、`mode` 和 `state`。状态可以是 `missing`、`applied` 或 `differs`；若状态为 `differs`，还会包含 `reason`。

## 设置登录 Shell {#set-your-login-shell}

`[bootstrap.user]` 用于设置当前用户的登录 Shell。以下配置会通过 Homebrew 安装 fish，并在 Apple Silicon Mac 上将其设为登录 Shell：

```toml
[bootstrap.packages]
"brew:fish" = "latest"

[bootstrap.user]
login_shell = "/opt/homebrew/bin/fish"
```

`mise bootstrap` 会先安装软件包，再更改登录 Shell，因此一次运行即可完成两项操作。单独运行 `mise bootstrap user apply` 时，请先安装 Shell。路径必须是绝对路径，例如 `/bin/zsh`；如果使用相对路径，mise 会忽略它并显示警告。

许多系统只接受 `/etc/shells` 中列出的 Shell，因此若路径尚未列出，mise 会先将其添加。随后，如果账户当前的 Shell 与目标不同，mise 会运行 `chsh -s /opt/homebrew/bin/fish`；此操作可能会要求输入密码。

`/etc/shells` 通常归 root 所有。mise 无法直接写入时会使用 sudo；交互式终端可以提示输入密码，否则需要配置免密 sudo。如果 [`system_packages.sudo`](/configuration/settings.html#system_packages.sudo) 为 `false`，mise 不会提权。

此操作只会更改账户的登录 Shell，不会影响当前 Shell。因此 `mise bootstrap` 结束时会提醒你启动新的登录会话。它也不会在新 Shell 中设置[mise 激活](#activate-mise-in-your-shell)。

`login_shell` 是一个模板，因此可以使用 `[vars]` 和其他[模板变量](/templates.html)，例如 <code v-pre>login_shell = "{{ vars.brew_prefix }}/bin/zsh"</code>。mise 会渲染该值，但不会执行 `exec()`。

项目配置可以覆盖全局 `login_shell`；以最靠近当前目录的值为准。mise 只会在运行 `mise bootstrap` 或 `mise bootstrap user apply` 时更改登录 Shell。mise 自身通过 `sudo` 运行时，会检查并更改 `SUDO_USER` 的 Shell，而不是 root 的 Shell；普通 root 会话（例如容器）则会更改 root 的 Shell。在 Windows 或缺少 `chsh` 的系统上，mise 会跳过此设置，并在 `status` 中报告为已跳过。

```sh
mise bootstrap user status            # show the login shell state
mise bootstrap user status --missing  # exit 1 if the shell differs or is not listed
mise bootstrap user apply --dry-run   # print the commands instead
mise bootstrap user apply --yes       # apply without a prompt
```

## 另请参阅

- 这些部分在执行顺序中的位置，请参阅 [Bootstrap](/bootstrap.html#how-it-runs)。
- 若要手动激活 mise 或设置 Shell 补全，请参阅 [Shell 设置](/shell-setup.html)。
- 若要添加自定义配置块和行，请参阅[编辑文件的一部分](/dotfiles/edits.html)。
