---
description: "设置一台使用 mise 的机器"
---

# 使用 mise 设置一台机器

在原来的位置继续编辑你的 dotfiles。本指南介绍如何保存本地历史记录、恢复文件，以及如何选择通过 Git 仓库共享你的设置。从一个文件开始；尝试恢复一次更改后，再添加更多文件。

## 安装 mise

如果已经安装了 mise，可以跳过前两条命令

```sh
curl https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"
```

## 跟踪文件

在使用 zsh 的 macOS 上：

```sh
mise dot track ~/.zshrc
```

在使用 Bash 的 Omarchy 上，改用 `~/.bashrc`。选择一个已经存在的文件；下面的示例使用 `~/.zshrc`。

跟踪会将文件当前的内容保存为**检查点**，这是一个之后可以恢复的版本。它会保留文件原来的位置，并将以下条目添加到 `~/.config/mise/config.toml`：

```toml
[dotfiles]
"~/.zshrc" = { mode = "track" }
```

## 自动保存编辑内容

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

监视器会将编辑内容保存到本地 Git 历史记录中。在 Linux 上，它作为 systemd 用户服务运行；在 macOS 上作为 LaunchAgent 运行；在 Windows 上作为计划任务运行。历史记录仓库与所编辑的文件分开存储。

如果你更希望手动保存，可以跳过服务，并在编辑后运行 `mise dot save`。

## 检查并恢复更改

编辑已跟踪的文件，然后立即保存一个检查点，这样无需等待监视器即可检查它：

```sh
mise dot save ~/.zshrc
mise dot history --path ~/.zshrc
```

要查看某个检查点的更改，请将 `CHECKPOINT_ID` 替换为列表中的 ID：

```sh
mise dot history diff CHECKPOINT_ID --path ~/.zshrc --patch
```

要恢复到上一个版本：

```sh
mise dot rollback ~/.zshrc
```

回滚会选择与当前文件不同的最新已保存版本。确认前请检查建议的更改。它会先保存当前内容，因此你可以撤销回滚：

```sh
mise dot undo
```

回滚会创建一个新的提交，并保留你之前留下的版本。如果启用了下面介绍的共享功能，恢复的版本可以到达你的其他机器。

## 共享你的设置（可选）

要在多台计算机之间共享更改，请连接一个私有 Git 仓库，称为 **origin**。首先，跟踪你的 mise 配置，这样下一台机器也可以安装你的工具并启动监视器：

```sh
mise dot track ~/.config/mise/config.toml
```

创建一个空的私有 GitHub 仓库，然后在此机器上进行身份验证：

```sh
mise use -g gh
mise x gh -- gh auth login --hostname github.com --git-protocol https --web
mise x gh -- gh auth setup-git --hostname github.com
```

凭据助手允许后台同步在无需交互式提示的情况下进行身份验证。你也可以使用凭据可供监视器使用的 SSH 远程仓库。

连接之前，请检查已跟踪的文件及其历史记录。每个已保存的版本都会被共享，包括之前的本地编辑内容。之后从文件中删除凭据，也不会将其从旧提交中删除。对于需要加密的文件，请在首次保存之前配置[加密跟踪](/history.html#encrypted-shared-files)，并将私有解密密钥保存在跟踪范围之外。

将 `you/setup` 替换为你的仓库。此示例启用自动共享：

```sh
mise dot origin set https://github.com/you/setup.git --sync sync
```

确认前请检查连接预览。监视器运行时，默认情况下，已保存的编辑会在五分钟内推送。它每十五分钟检查一次其他机器上的更改，并将其应用到你的文件中。在下面设置第二台机器后，编辑内容可以双向传递。

### 选择同步时机

如果你希望决定何时交换更改，请在连接时使用 `--sync manual`。之后可以使用 `mise settings set history.sync MODE` 更改模式：

| 模式         | 监视器行为                                                   |
| ------------ | ------------------------------------------------------------ |
| `sync`       | 发布已保存的更改，获取并应用传入的更改                       |
| `manual`     | 在本地保存；等待你运行网络命令                             |
| `fetch-only` | 获取远程更改，供你检查和应用                             |

在手动模式下，mise 会继续在本地保存。运行以下命令来保存最新编辑、推送所有累积的提交、获取远程更改并应用它们：

```sh
mise dot save
mise dot sync
mise dot pull
```

当你想立即同步时，这些命令在自动模式下也适用。当共享的更改更新了工具、服务或模板源时，运行 `mise bootstrap` 以应用该配置并渲染模板。

## 设置另一台机器

先安装 Git。然后安装 mise，并使用同一个仓库主机进行身份验证：

```sh
curl https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"
mise use -g gh
mise x gh -- gh auth login --hostname github.com --git-protocol https --web
mise x gh -- gh auth setup-git --hostname github.com
mise bootstrap --adopt you/setup
```

确认前请检查建议的文件。Bootstrap 会恢复已跟踪的文件，并应用已保存的 mise 配置，包括监视器服务。如果历史记录中缺少配置或必需的模板源，bootstrap 会报告你需要在第一台机器上跟踪并共享哪些文件。

如果现有文件不同，请按照报告的冲突说明操作，然后才能继续设置。在此机器上启用自动共享并检查其状态：

```sh
mise settings set history.sync sync
mise dot status
```

如果希望此机器使用其他模式，请在这里选择 `manual` 或 `fetch-only`。

有关通过 SSH 进行设置的信息，请参阅[远程 bootstrap](/bootstrap/remote.html)。对于私有 GitHub 仓库，可以从此机器借用只读访问权限：

```sh
mise bootstrap remote --host devbox --install-mise --adopt you/setup \
  --github-relay-read-only --github-relay-repo you/setup
```

本次运行只读借用 GitHub 访问权限。目标机器需要拥有自己的凭据才能持续同步。

## 解决冲突

如果两台机器更改了相同的行，mise 会保留两个版本，并暂停为所有已跟踪文件推送和应用传入的更改。它会继续在本地保存并获取更新。在受支持的 Linux 和 macOS 安装上，桌面通知默认启用。`status` 和 `mise doctor` 也会报告暂停状态，包括在 Windows 或无头机器上。

检查冲突：

```sh
mise dot status
mise dot conflicts ~/.zshrc
```

第二条命令会显示已保存的本地版本与获取的仓库版本之间的差异。传入 `--difftool` 可使用 Git 配置的差异工具；如果未设置差异工具，则使用其配置的合并工具。检查不会更改或解决任一方。

选择仓库中的文件版本：

```sh
mise dot pull --take-remote ~/.zshrc
```

或者保留此机器上的版本：

```sh
mise dot pull --keep-local ~/.zshrc
```

在共享恢复之前，先解决所有报告的冲突。在手动模式下，运行 `mise dot sync` 来发布你的解决结果。

## 使用模板（可选）

对于直接编辑的文件，请使用跟踪。当你希望 mise 根据配置值渲染文件时，请使用模板。

将以下条目添加到 `~/.config/mise/config.toml`，并将它们合并到现有的 `[vars]` 和 `[dotfiles]` 表中。此示例使用一个未占用的目标路径：

```toml
[vars]
email = "you@example.com"

[dotfiles]
"~/templates" = { mode = "track" }
"~/.config/mise-template-example.ini" = { source = "~/templates/example.ini.tera", mode = "template" }
```

创建 `~/templates/example.ini.tera`（如果需要，请先创建 `~/templates`）：

```ini
[user]
    email = {{ vars.email }}
```

运行 `mise bootstrap` 以渲染 `~/.config/mise-template-example.ini`。它将包含 `[vars]` 中的电子邮件地址。之后如需更改，请编辑模板或其变量。跟踪 `~/templates` 会保存并共享这些源文件。若还要保存渲染文件的历史记录，请为它添加跟踪条目。

请参阅[dotfiles](/dotfiles.html)了解模板和特定操作系统的变体。

## 添加更多文件

在 Omarchy 上，从你编辑的单个配置文件开始。在跟踪目录之前，请先检查该目录：主题、插件、背景和应用程序状态可能不适合放入 dotfile 历史记录。对于嵌套的 Git 仓库，历史记录会记录它所指向的提交；请单独备份该仓库。

更新之前，保存当前已跟踪的文件：

```sh
mise dot save --best-effort
```

这会保存你已跟踪的 dotfiles。对于软件包和其他系统状态，请使用操作系统的备份工具。

在 macOS 上，你可以将已跟踪的文件与其 Linux 对应文件分开：

```sh
mise dot track ~/.zshrc --os macos
```

在任一平台上，都可以使用以下命令检查跟踪和监视器状态：

```sh
mise dot status
```

有关目录排除和保存选项，请参阅[dotfiles](/dotfiles.html)。有关服务管理和其他平台的信息，请参阅[用户服务](/bootstrap/services.html)。
