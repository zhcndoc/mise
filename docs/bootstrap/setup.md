---
description: "跟踪 dotfiles、声明工具和软件包，并通过私有 Git 仓库让另一台机器使用相同配置。"
socialDescription: "跟踪 dotfiles、声明工具和软件包，并从 Git 为另一台机器初始化。"
---

# 初始化机器

本教程将先把一台机器从跟踪单个文件逐步配置为完整的声明式环境，再用一条命令让第二台机器达到相同状态。你仍在原位置编辑文件；mise 会在本地保存文件历史，并通过私有 Git 仓库共享这些历史。

每台机器都需要安装 Git（macOS 上需要 Xcode Command Line Tools），并准备一个位于 GitHub 或其他 Git 托管平台的空私有仓库。以下示例使用 zsh；[Shell 激活](/bootstrap/shell.html)一节也提供 Bash 和 fish 的对应配置。

## 在第一台机器上

### 安装 mise

如果 `mise --version` 已经可以运行，请跳过此步骤。

```sh
curl -fsSL https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"
```

安装程序会将 `mise` 放到 `~/.local/bin`。这里的 `export` 只会影响当前 shell；稍后会将该目录加入新 shell 的 `PATH`。其他安装方式请参阅[安装 mise](/installing-mise.html)。

### 跟踪文件

跟踪 shell 的启动文件：

```sh
mise dot track ~/.zshrc
```

选择一个已存在的文件。如果你使用 Bash，请改为跟踪 `~/.bashrc`；本教程其余部分均使用 `~/.zshrc`。

跟踪会将文件当前内容保存为一个检查点，以便之后恢复。文件会留在原位，mise 则会将以下条目添加到 `~/.config/mise/config.toml`：

```toml
[dotfiles]
"~/.zshrc" = { mode = "track" }
```

### 自动保存编辑内容

将此表添加到 `~/.config/mise/config.toml`：

```toml
[bootstrap.services.mise-history]
builtin = "history-watch"
```

安装服务并检查其是否正在运行：

```sh
mise bootstrap services apply
mise dot status
```

监视器会将编辑内容保存到本地 Git 历史中，与文件本身分开存放。它在 Linux 上以 systemd 用户服务运行，在 macOS 上以 LaunchAgent 运行，在 Windows 上则作为计划任务运行。如果你更愿意手动保存，可以跳过此服务，并在编辑后运行 `mise dot save`。

### 声明工具、软件包和 shell 激活

将此机器其余的配置添加到 `~/.config/mise/config.toml`，并与已有的 `[dotfiles]` 表合并：

```toml
[tools]
node = "24"

[bootstrap.packages]
"brew:tmux" = { os = "macos" }
"apt:tmux" = "latest"

[dotfiles]
"~/.zshrc" = { mode = "track" }
"~/.zshenv/local-bin" = { line = 'export PATH="$HOME/.local/bin:$PATH"' }

[bootstrap.mise_shell_activate]
zprofile = "shims"
```

每部分各司其职：

- `[tools]` 使用 mise 安装 Node.js。
- `[bootstrap.packages]` 在 macOS 上使用 Homebrew 安装 tmux，在 Debian 或 Ubuntu 上使用 apt 安装。如果某台机器上缺少相应包管理器，则会跳过对应条目，因此同一份配置可以同时列出两种安装方式。
- `[dotfiles]` 中的行条目会在 `~/.zshenv` 中将 `~/.local/bin` 加入 `PATH`。zsh 会先读取此文件，因此新 shell 能找到 `mise`。如果你通过会自动将 mise 加入 `PATH` 的包管理器安装它，请删去这一行。
- `zprofile = "shims"` 会为登录 shell 将工具 shim 加入 `PATH`，也包括编辑器在没有提示符的情况下启动的 shell。

对于交互式 shell，如果跟踪的 `~/.zshrc` 中还没有 `eval "$(mise activate zsh)"`，请添加这一行。该行会随跟踪文件同步到其他机器。此配置只设置了 `zprofile`，因此 mise 不会改动 `~/.zshrc`；如果设置 `zsh = true`，mise 也会将自己的激活代码块添加到跟踪文件中。两种模式的详情请参阅 [Shell 激活](/bootstrap/shell.html)。

预览变更，然后应用：

```sh
mise bootstrap --dry-run
mise bootstrap
```

打开新的 shell 并运行 `mise doctor`，检查激活是否正常。

### 检查和恢复变更

编辑跟踪文件后，立即保存一个检查点。这样无需等待监视器，也可以查看此次变更：

```sh
mise dot save ~/.zshrc
mise dot history --path ~/.zshrc
```

要查看检查点中的变更，请将 `CHECKPOINT_ID` 替换为列表中的某个 ID：

```sh
mise dot history diff CHECKPOINT_ID --path ~/.zshrc --patch
```

要恢复到上一个版本：

```sh
mise dot rollback ~/.zshrc
```

rollback 会选择与当前文件不同的最新已保存版本，显示差异并应用它。它会先保存当前内容，因此你之后仍可撤销回滚：

```sh
mise dot undo
```

回滚会创建一个新提交，因此被回滚掉的版本仍会保留在历史记录中。共享配置后，恢复的版本也会同步到其他机器。

### 连接私有仓库 {#share-your-setup-optional}

要共享配置，请连接一个私有 Git 仓库，称为 origin。首先跟踪 mise 配置，这样下一台机器也会获取工具、软件包、shell 激活设置和监视器：

```sh
mise dot track ~/.config/mise/config.toml
```

在仓库托管平台上完成身份验证。GitHub 用户可运行：

```sh
mise use -g gh
mise exec gh -- gh auth login --hostname github.com --git-protocol https --web
mise exec gh -- gh auth setup-git --hostname github.com
```

Git 凭据助手可以让监视器在后台完成身份验证，无需交互提示。使用监视器可访问凭据的 SSH 远程仓库也可以。

::: warning 所有已保存版本都会被共享
连接 origin 会推送所有已保存版本，包括较早的编辑内容。即使之后从文件中删除凭据，它仍会保留在旧提交中。如果文件需要加密，请在首次保存前配置[加密文件](/dotfiles/encryption.html)，并避免跟踪私有解密密钥。
:::

将 `you/setup` 替换为你的仓库地址并连接：

```sh
mise dot origin set https://github.com/you/setup.git --sync sync
```

mise 会先显示连接预览，然后建立连接。监视器运行时，`--sync sync` 会在每次保存后不久推送编辑内容（由 [`history.sync_interval`](/configuration/settings.html#history.sync_interval) 控制），并按计划检查其他机器上的变更（由 [`history.fetch_interval`](/configuration/settings.html#history.fetch_interval) 控制）。如果只希望在主动请求时交换变更，请改用 `--sync manual` 或 `--sync fetch-only` 连接；参见[选择同步模式](/dotfiles/sync.html#choose-a-sync-mode)。

## 在新机器上 {#set-up-another-machine}

### 安装并完成身份验证

安装 Git 和 mise，并在仓库托管平台上完成身份验证：

```sh
curl -fsSL https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"
mise exec gh@latest -- gh auth login --hostname github.com --git-protocol https --web
mise exec gh@latest -- gh auth setup-git --hostname github.com
```

`mise exec gh@latest` 可以运行 `gh`，而不会将其写入全局配置；共享配置稍后会负责提供它。

### 接入现有配置

```sh
mise bootstrap --adopt you/setup
```

`you/setup` 是 GitHub 仓库的简写。使用其他托管平台时，请传入完整 URL，例如 `git@gitea.example.com:you/setup.git`。

mise 会列出要恢复的文件并恢复它们，然后根据恢复的配置运行 bootstrap：安装软件包和工具、写入 `PATH` 行与 shell 激活设置，并启动监视器。如果历史记录中缺少所需配置或模板源文件，bootstrap 会指出需要在第一台机器上跟踪并共享哪些文件。

对于文件配置无法覆盖的操作（例如安装 shell 插件或修复权限），请将其放入共享配置的 `[tasks.bootstrap]`：

~~~toml
[tasks.bootstrap]
run = "install -d -m 700 ~/.ssh"
~~~

文件恢复后，接入流程会运行此任务；之后每次运行 `mise bootstrap` 时也会再次运行，因此请确保重复执行不会产生问题。

### 如果机器上已存在这些文件 {#when-the-machine-already-has-these-files}

新机器上通常已经存在 `~/.zshrc`。接入时 mise 绝不会覆盖该文件。与仓库版本相同的文件会直接接受，但存在差异的文件需要你选择处理方式；在此之前，接入流程会停止，不会运行任何 bootstrap 操作：

```text
the setup from <url> is paused; nothing was bootstrapped.
```

列出待处理文件，然后采用所有文件的仓库版本：

~~~sh
mise dot status
mise dot pull --take-remote-all
~~~

要预先选择此行为，请使用 `--take-remote-all`：

~~~sh
mise bootstrap --adopt you/setup --take-remote-all
~~~

mise 会先保存每个将被替换的版本，因此 `mise dot undo` 可以撤销整次 pull。你为最后一个文件作出决定后，同一条 `pull` 命令会写入其余跟踪文件。然后运行 `mise bootstrap`，完成 dotfiles 以外的配置，例如工具和服务。

要逐个处理文件，请指定文件名：

```sh
mise dot pull --take-remote ~/.zshrc
```

如果要保留这台机器上的文件版本，请先保存它。`--keep-local` 会发布这台机器已保存的版本；新机器目前尚无已保存版本：

```sh
mise dot save ~/.zshrc
mise dot pull --keep-local ~/.zshrc
```

`--keep-local` 也可以为全局选择指定例外。以下命令会采用仓库中除 `~/.zshrc` 以外所有文件的版本：

```sh
mise dot pull --take-remote-all --keep-local ~/.zshrc
```

如果在运行 `mise bootstrap --adopt` 前将冲突文件移到其他位置，就无需作出上述选择，因为 mise 会直接写入缺失的文件。

如果这台机器已有自己的历史记录（例如在共享前跟踪了相同文件），由于两份历史彼此无关，接入流程会停止。`--replace-history` 会丢弃本机历史并采用仓库历史。存在差异的文件仍需作出选择，因此请同时使用 `--take-remote-all`：

```sh
mise bootstrap --adopt you/setup --replace-history --take-remote-all
```

mise 会先在接入的历史上保存即将替换的版本，因此 `mise dot undo` 可以恢复这些版本。`--force-dotfiles` 与此无关：它适用于 `[dotfiles]` 的链接和复制目标，不影响共享历史。

### 检查连接

```sh
mise dot status
```

新机器会按照 [`history.sync`](/configuration/settings.html#history.sync) 中设置的模式共享变更。此后，在任一机器上的编辑都会同步到另一台机器。pull 只会恢复文件，不会运行配置流程；因此共享配置中的工具、软件包、服务或 `bootstrap` 任务发生变更后，请运行 `mise bootstrap` 以应用这些变更。在此之前，`mise dot status` 会持续提醒你。

要通过 SSH 从当前机器配置远程主机，请参阅[远程主机](/bootstrap/remote.html#private-configuration-repositories)。mise 会在当前机器上使用其 Git 凭据获取私有仓库，然后发送到远程主机。远程主机只需在之后同步时配置自己的凭据。

## 添加更多文件

跟踪你手动编辑的配置文件。跟踪目录前，请使用 `mise dot track --dry-run <dir>` 预览内容：主题、插件、缓存和应用状态通常不应加入历史记录。mise 会跳过嵌套 Git 仓库，不会记录其内容；请将其根目录作为独立条目跟踪，或单独备份。参阅[嵌套仓库](/dotfiles/history.html#nested-repositories)。

升级系统前，先保存所有内容：

```sh
mise dot save --best-effort
```

此命令只会保存已跟踪的 dotfiles。软件包和其他系统状态请使用操作系统的备份工具。

如果要在另一种操作系统上使用文件的不同版本，请为对应系统跟踪该文件，例如 `mise dot track ~/.zshrc --os macos`。有关变体、排除项和保存选项，请参阅[历史记录](/dotfiles/history.html)。

## 后续步骤

- 如果两台机器修改了相同的行，mise 会暂停共享并保留两个版本。`mise dot status` 和 `mise doctor` 会报告冲突；请按[解决冲突](/dotfiles/sync.html#resolve-a-conflict)选择要保留的版本。
- 如果要根据变量生成文件（例如每台机器使用不同邮箱的 `~/.gitconfig`），请使用模板；参阅[模板](/dotfiles/managed.html#templates)。
- 如果每台机器需要不同的配置组合，请参阅[机器模块](/bootstrap/modules.html)。
- 关于其他平台上的监视器和服务管理，请参阅[服务](/bootstrap/services.html)。
