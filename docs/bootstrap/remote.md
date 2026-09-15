---
description: "通过 SSH 将引导配置应用到远程计算机"
socialDescription: "通过 SSH 将引导配置应用到远程计算机"
---

# 通过 SSH 进行远程引导

`mise bootstrap remote` 通过本地安装的 OpenSSH 客户端，将引导项目应用到一台或多台计算机。目标可以存放在版本化配置中，也可以通过命令行临时提供。

远程目标必须提供 POSIX shell 以及 `cksum`、`mktemp`、`tar` 和 `uname`。精简镜像可能需要先安装这些工具。目前不支持原生 Windows SSH/PowerShell 目标。编排计算机可以是 Windows、macOS 或 Linux，并且需要本地的 `ssh` 和 `tar` 命令。

## 首次远程运行

使用包含经过审核的引导配置的项目，以及一个你已经可以访问的 SSH 主机。将 `devbox` 替换为你的 SSH 主机或别名：

```sh
ssh devbox uname -s
mise bootstrap remote --host devbox --source . --dry-run
mise bootstrap remote --host devbox --source .
```

远程 dry run 仍会通过 SSH 连接、传输项目、暂存 mise 并检查目标。它会抑制引导资源变更，并不是离线计划。除非设置了 `--keep-staging`，否则临时暂存内容会被清理。

如果希望目标在运行后保留 mise，请使用 `--install-mise`。在传输包含本地机密或生成数据的仓库前，请检查归档排除项。

## 清单配置

```toml
[bootstrap.remote]
source = "."
exclude = [".env.local", "artifacts"]
copy_link = ["modules/common", "playbooks/shared"]
mise_env = ["linux", "server"]

[bootstrap.remote.hosts.cache]
host = "cache.example.com"
user = "ubuntu"
port = 22
identity_file = "~/.ssh/mise-cache"
tags = ["cache", "production"]
ssh_options = ["ServerAliveInterval=30"]
mise_env = ["linux", "cache"]
```

`source` 是发送到主机的本地项目目录。相对的 `source`、`identity_file` 和 `mise_bin` 路径，会相对于声明它们的配置文件进行解析。主机级别的 `source` 会覆盖 `[bootstrap.remote].source`。主机级别的 `mise_env` 会覆盖 `[bootstrap.remote].mise_env`；这些有序值会作为 `MISE_ENV` 传递给暂存的 `mise bootstrap` 进程。使用 `--remote-env <ENV>` 可以为每个选定主机覆盖已配置的列表。当多个配置层声明了相同的清单名称时，优先级更高的配置文件生效。顶层 `exclude` 模式会在所有已加载的配置层之间合并，并应用于每台主机，因此即使清单条目来自全局配置，更近的项目也可以添加机密文件模式。这个共享集合也适用于临时的 `--host` 目标；清单中的主机级别排除项会在此基础上追加。只有选定的清单条目会被验证。mise 会应用命令行覆盖项，并在打开任何 SSH 连接之前验证完整的选定集合，因此未选中的过期条目不会阻止无关目标，而选中的无效条目也不会导致部分运行。

远程清单属于编排元数据。在暂存项目内部运行的 `mise bootstrap` 进程不会递归执行其中的 `[bootstrap.remote]` 部分。

## 选择主机

默认情况下，目标名称必须明确指定，因此不会因意外执行不带参数的命令而为清单中的每台服务器配置环境：

```sh
# 一个或多个命名的清单条目
mise bootstrap remote cache

# 清单中的所有主机，或匹配任意重复标签的主机
mise bootstrap remote --all
mise bootstrap remote --tag cache --tag canary

# 不在清单中的服务器
mise bootstrap remote --host ubuntu@cache.example.com \
  --identity-file ~/.ssh/mise-cache \
  --source ./infra/mise-cache
```

可以组合使用命名选择器和临时选择器。显式目标名称按照命令行中的顺序首先执行。随后，`--all` 和 `--tag` 按声明顺序添加剩余的清单主机，最后按照命令行顺序添加临时的 `--host` 目标。默认情况下，mise 会在某个目标失败后继续执行，并在最后报告所有失败；`--fail-fast` 则会在首次失败时停止。

命令行中的连接、源和 mise bootstrap 选项会覆盖所有已选主机的对应设置。`--ssh-option` 会直接映射为单独的 OpenSSH `-o` 参数，因此无需让 mise 另行发明一套 SSH 配置语言，仍可使用 ProxyJump、自定义主机密钥文件以及其他原生 OpenSSH 功能。

## 传输与暂存

对于每个目标，mise：

1. 使用用户常规的 SSH 配置和主机密钥策略打开 OpenSSH 连接；
2. 创建经过验证的 `/tmp/mise-bootstrap.*` 目录；
3. 在本地归档源目录，并将其解压到暂存目录；
4. 配置远程运行所使用的确切 mise 可执行文件；除非 `install_mise` 使其保留在主机上，否则会将其暂存；
5. 在暂存项目中执行 `mise bootstrap`；以及
6. 删除暂存目录，包括引导失败后也会删除。

在 Unix 上，同一目标的所有命令都会复用一个 OpenSSH 控制连接。在非交互式调用中，mise 会设置 `BatchMode=yes`，使密码提示直接失败而不是一直挂起。在有人值守的终端中，bootstrap 命令会获得一个 TTY，以便 SSH、sudo、确认提示和 `--prompt-secrets` 提示仍然可用。OpenSSH 现有的主机密钥验证不会被自动弱化。

默认情况下，`.git`、`target` 和 `node_modules` 会从源归档中排除。对于生成文件和本地机密，请添加可重复的 `exclude` 配置条目或 `--exclude` 标志。仅在调试时使用 `--keep-staging`；它会输出保留的路径，而不是删除目录。

符号链接默认会以链接形式归档。使用可重复的、相对于源目录的 `copy_link` 条目或 `--copy-link <PATH>` 标志，可以仅将指定链接替换为暂存项目中的目标。选中的目录链接会被复制为真实目录，而其目标内部嵌套的链接仍会保留为链接。这是共享选定模块或 playbook 的更安全选择，不会更改深层依赖树中的无关链接。主机级别的 `copy_link` 条目会追加到顶层列表中，命令行条目则会追加到两者中。

设置 `copy_links = true` 或传递 `--copy-links`，可以递归取消遇到的所有符号链接的引用。这与 `rsync --copy-links` 等工具的行为一致，但可能会意外展开供应商目录、生成目录或依赖树深处的小型链接，并且可能复制源目录之外的内容。启用此全局模式时，会忽略显式的 `copy_link` 选择。

## Provisioning mise itself

默认情况下，mise 会检测远程操作系统、架构和 Linux libc 家族。当当前本地可执行文件与目标兼容时，mise 会上传该文件。这确保远程进程支持与其编排器相同的引导配置，而不会在不知不觉中使用较旧的已安装版本。

在 Linux 上，mise 还会检查可执行文件的 ELF 解释器。静态二进制文件无需检查目标 libc。对于动态链接的二进制文件，远程主机必须提供完全相同的解释器路径和相同的 libc 家族。对于 glibc 二进制文件，mise 会从 ELF 中提取所需的最高 `GLIBC_*` 符号版本，并在上传前验证远程加载器提供的 ABI 至少达到该版本。对于 musl 二进制文件，mise 会比较本地和远程加载器的版本，并要求远程加载器至少达到本地版本。随后，mise 会在远程运行 `mise version`，作为其他所有二进制文件和主机要求的最终依据。

当本地可执行文件无法在目标上运行时，mise 会自动从官方 GitHub release 中解析相同 mise 版本的原始可执行文件。这涵盖 glibc 和 musl 上的 Linux x64、arm64 和 armv7，以及 macOS x64 和 arm64。mise 会下载 `SHASUMS256.txt` 及其 minisign 签名，使用 mise 内置的 release 密钥验证清单，然后在上传前验证所选构件的 SHA-256 校验和。已验证的构件会在命令执行期间缓存，因此使用相同平台的目标会共享一次下载。

自动替换有意限制为官方发布二进制文件。在下载其他目标的文件之前，mise 会证明本地可执行文件与同一官方发布版本的签名校验和之一匹配。因此，调试构建、包含本地修改的源代码构建以及下游打包的二进制文件都会安全失败，而不会悄悄更改远程计算机上的代码。对于这些构建，或对于官方构件矩阵之外的平台，请使用下面的显式策略。无法识别 Linux libc 家族时，也必须使用显式策略。

以下三个显式后门可覆盖其他环境：

- `mise_bin` / `--mise-bin` 会上传用户自行构建的本地可执行文件。这是没有官方预编译二进制文件的架构的主要路径。
- `remote_mise` / `--remote-mise` 会在主机上运行已知兼容的现有命令，而不上传二进制文件。
- `bootstrap_command` / `--bootstrap-command` 会在登录 shell 中运行显式的远程 shell 命令，然后打开一个新的登录 shell，从安装后的 profile、继承的 `PATH` 或常见的用户安装目录中定位 `mise`。mise 会在安装前记录每个可发现可执行文件的内容指纹和报告版本，之后优先选择新添加或身份发生变化的路径，因此 `PATH` 中较早的旧可执行文件无法遮蔽已安装的文件。未发生变化且存在歧义的候选项会失败，并提示选择显式路径。这支持源代码构建、会修改 shell profile 的安装程序以及特定站点的安装程序。dry run 永远不会执行此命令；它会使用已安装的远程 `mise`，或者失败并提示选择 `remote_mise` 或 `mise_bin`。

这些策略互斥。在命令行中提供其中一个策略，会替换所选清单主机声明的任何配置策略。`remote_mise` 是可执行文件名称或路径，而不是 shell 表达式。裸名称会通过远程登录 `PATH` 解析为绝对可执行文件，`~/` 路径使用远程登录用户的主目录，绝对路径按原样使用，而 `./bin/mise` 等相对路径则在暂存项目目录内解析。超出暂存项目目录的相对路径会被拒绝。路径可以包含空格，并且始终作为一个可执行文件参数传递。需要 shell 求值时，请使用 `bootstrap_command`。

```toml
[bootstrap.remote.hosts.arm-lab]
host = "arm-lab.example.com"
mise_bin = "./artifacts/mise-linux-armv5"

[bootstrap.remote.hosts.nix-builder]
host = "builder.example.com"
bootstrap_command = "nix profile install nixpkgs#mise"
```

mise 会在引导前运行 `mise version`，验证每个上传的或选定的远程命令。

### 将 mise 保留在主机上

默认情况下，配置的可执行文件位于暂存目录中，并会随暂存目录一同删除，因此目标会保留安装在 `~/.local/share/mise` 下的工具，但不会保留安装这些工具的 mise。设置 `install_mise` 可将 mise 保留在计算机上：

```toml
[bootstrap.remote]
install_mise = true

[bootstrap.remote.hosts.cache]
host = "cache.example.com"
install_mise = "/usr/local/bin/mise"
```

`true` 会将其安装到 `~/.local/bin/mise`，这也是 [mise.run](https://mise.run) 使用的路径。字符串值会将其安装到指定路径；该路径必须是绝对路径或以 `~/` 开头，并且表示可执行文件而不是目录——如果路径中已经存在目录，则会拒绝安装，而不是将可执行文件作为子项放入其中。主机级别的值会替换 `[bootstrap.remote].install_mise`，因此 `install_mise = false` 可以让某台主机退出项目级别的默认设置。

```sh
mise bootstrap remote cache --install-mise
mise bootstrap remote cache --install-mise=/usr/local/bin/mise
mise bootstrap remote cache --no-install-mise
```

`--install-mise` 在路径前要求使用 `=`，这样不带参数的标志就不会消耗目标名称。与其他命令行配置 mise 的选项一样，它会替换选定清单主机声明的 `remote_mise` 或 `bootstrap_command`。

安装的内容与默认策略会暂存的可执行文件相同——本地二进制文件或经过校验和验证的官方发布构件——并且它就是运行引导的文件，因此主机会与编排它的 mise 版本保持一致。mise 会在目标文件旁边写入临时文件，然后将其重命名到目标位置，因此替换当前正在运行的 mise 不会将其截断。当目标已经包含字节完全相同的可执行文件时，不会上传任何内容。dry run 不会写入持久安装路径：`--dry-run` 会报告该路径，并使用临时暂存的可执行文件进行检查。

`install_mise` 可以与 `mise_bin` 组合使用，以安装本地构建的可执行文件。它不能与 `remote_mise` 或 `bootstrap_command` 组合，因为后两者已经在主机上提供了 mise。当主机应通过系统软件包、`nix profile install` 或特定站点的安装程序自行管理安装时，`bootstrap_command` 仍然是正确的选择。

SSH 用户必须能够写入安装路径；mise 不会为此提升权限，因此像 `/usr/local/bin/mise` 这样的路径需要使用已经拥有该目录的用户。请确保该目录仅对该用户可写。安装后，mise 会将目标的摘要与它写入的内容进行比较，如果不一致则失败，而不是运行其他内容，但这项检查是尽力而为的——当主机既不提供 `sha256sum` 也不提供 `shasum` 时会跳过检查，并且无法覆盖检查和运行之间的时间窗口。无论如何，任何能够写入安装目录的人都可以控制该账户在之后每次调用中作为 `mise` 运行的内容，因此目录权限才是真正的边界。在未使用 `install_mise` 时，暂存目录由 `mktemp -d` 创建，并且仅对 SSH 账户私有。

安装 mise 不会将其加入主机的 `PATH`。当安装目录不在登录 `PATH` 中时，mise 会发出警告，并且引导项目可以声明 [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)，以便同一次运行将激活配置或 shim 写入主机的 shell 启动文件。

## Bootstrap controls and secrets

远程执行会直接转发重要的收敛控制项：

```sh
mise bootstrap remote cache --dry-run
mise bootstrap remote cache --yes --update
mise bootstrap remote cache --only packages,files,services,compose
mise bootstrap remote cache --skip tools,task
mise bootstrap remote cache --prompt-secrets
mise bootstrap remote cache --remote-env linux,server
```

本地环境变量不会有意复制到 SSH 主机。显式配置的 `mise_env` 是远程编排元数据，而不是继承的本地环境。有人值守的运行请使用 `--prompt-secrets`。Provider 支持的机密环境传输可以单独叠加使用，而不会将值放入配置、归档、进程参数、计划或日志中。

## 私有配置仓库

将配置仓库安装到远程用户的持久全局 mise 配置目录中：

```sh
# Authenticate on this machine first (for example, using gh auth login).
mise bootstrap remote --host devbox --adopt jdx/dotfiles \
  --github-relay-read-only --github-relay-repo jdx/dotfiles
```

`OWNER/REPO` 会展开为 `https://github.com/OWNER/REPO.git`。显式 Git URL、SSH 语法以及发起机器上的本地路径同样有效。网络仓库必须使用 HTTPS 或 SSH；其他传输方式和自定义 Git helper 会被拒绝。源代码克隆不会跟随 HTTP 重定向，因此请使用仓库的规范 URL。`--adopt` 与 `--source` 冲突。目标仍然来自显式的 `--host` 或清单选择器，而不会来自下载仓库中的清单。

mise 使用**本地 Git 身份验证**获取一次仓库，为每个选定目标固定该 commit，并通过 SSH 传输 Git bundle。它不会修改发起机器的全局配置，也不会复制其 Git 配置。远程 checkout 会保留原始的无凭据 origin、分支和 upstream。临时暂存会被移除；已安装的全局配置不会被移除。当目标尚未安装 mise 时，请使用 `--install-mise` 同时持久安装 mise。

除非 `--update` 请求安全的 fast-forward，否则会复用已有的匹配 checkout。脏 checkout、origin 不匹配、冲突文件以及以 `.local.toml` 结尾的源文件都需要手动解决。确认后，可以采用非空的非 Git 目录：现有文件和本地覆盖项会被保留。使用 `--adopt` 时，`--dry-run` 会像 `--source . --dry-run` 一样预览整个操作：在本地获取 revision，连接目标，暂存 mise 和 bundle，然后目标运行每项检查（脏 checkout、origin 不匹配、采用冲突、`.local.toml` 文件），并说明它将执行的操作：clone、fast-forward，或采用并显示新文件数量。当目标上已经存在全局配置时，后续引导也会使用 `--dry-run` 进行预览。不会更改实际配置。私有暂存目录通常会在之后被删除；`--keep-staging` 会保留它以便调试。设置预览可以暂存解密后的、显式跟踪的配置，以及检查引导所需的配置和配置目录输入。请将保留的暂存内容视为敏感数据；与此预览无关的已加密跟踪文件不会被解密。

`--adopt` 使用仓库，而不是清单的归档源和 copy-link 设置。显式的 `--source`、`--copy-link`、`--copy-links` 和 `--exclude` 标志不能与它组合使用。

**setup repository**（使用 `mise dot origin set` 连接并携带 `.mise-history/format.toml` 的仓库）会从中进行设置，而不是 checkout：远程主机会将传输的分支获取到自己的历史存储中，通过可恢复的 pull 写入这台机器显式登记的文件，并记录该连接。请显式跟踪后续引导所需的 mise 配置和模板源；引用不会登记这些内容。如果该配置声明了历史 watcher，引导会像其他用户服务一样安装它。发生冲突时，整个设置会暂停，直到引导运行前解决冲突。使用 `--dry-run` 时，目标会显示该计划（将写入的文件，以及等待决策的文件），不会记录连接，也不会保留获取的分支：

```sh
mise bootstrap remote --host devbox --install-mise --adopt jdx/dotfiles \
  --github-relay-read-only --github-relay-repo jdx/dotfiles --dry-run
```

借用的 GitHub 访问权限为只读，并会在会话结束时失效：远程主机可以通过它获取内容，但无法发布内容。如果设置成功但主机之后无法自行访问仓库，引导会对此进行提示；请为主机提供自己的凭据以进行持续同步（在主机上执行 `mise x gh -- gh auth login` 和 `mise x gh -- gh auth setup-git`，或者通过 `mise dot origin set` 使用 SSH URL）。

relay 与初始传输相互独立。当引导需要其他私有 GitHub 内容时启用 relay，并使用重复的 `--github-relay-repo` 为每个所需仓库授权。简写形式永远不会启用或扩大 relay 访问范围。

## 借用 GitHub 访问权限一个会话

```sh
mise ssh devbox --github-relay-read-only --github-relay-repo jdx/dotfiles
mise ssh devbox --github-relay-read-only --github-relay-repo jdx/dotfiles \
  -- git clone https://github.com/jdx/dotfiles.git

# Deliberately allow every repository your local credential can read:
mise ssh devbox --github-relay-read-only --github-relay-all-repos

# Ordinary OpenSSH, without provisioning mise or starting a relay:
mise ssh devbox -i ~/.ssh/devbox -p 2222 -o ServerAliveInterval=30 -- uname -a
```

相同的 relay 标志也适用于 `mise bootstrap remote`。启用 relay 需要仓库允许列表或显式的所有仓库访问权限，不能同时使用两者。凭据会在发起机器上通过 mise 现有的 GitHub token 解析机制解析；不会自动登录，也不会创建新的凭据存储。

所拥有的 SSH 连接会转发一个私有 Unix socket。远程 mise 请求以及 Git 的 GitHub HTTPS/SSH 传输会使用仅限会话的适配器。本地 broker 会授权仓库元数据、refs、内容、releases、assets 以及 smart-HTTP clone/fetch。Push、API 修改、GraphQL 和其他端点都会被拒绝。只会跟随经过批准的 GitHub asset 重定向，并且不会携带身份验证。请求大小限制为 8 MiB，接受的连接数限制为 32；响应会以流式方式传输。默认并发数为 8 个请求，默认总请求超时为 5 分钟。这两个限制可以在发起机器上配置。

借用的访问权限会在会话结束时失效，包括失败和断开连接的情况。目标上不会安装 GitHub token 或持久传输重写。今后独立进行私有仓库更新时，需要使用该机器自己的凭据，或另一个启用了 relay 的会话。没有 relay 时，现有的远程身份验证照常工作。

::: warning Trust the target with the content you authorize
受入侵的目标可以在会话期间读取已授权的私有内容。将凭据保留在本地可以限制凭据暴露，但不会使目标变得可信。请使用范围狭窄的仓库允许列表。
:::

relay 支持目前仅限于 Linux/macOS 客户端，以及运行兼容 mise 的 POSIX Linux/macOS 目标。不支持 Windows、GitHub Enterprise、远程 `gh`、写入操作和无人值守/持久 relay 访问。

只读访问包括 Git clone/fetch、仓库元数据、内容、refs、releases、release assets 以及 tar/zip 源代码归档。归档和 asset 重定向仅限于已批准的 GitHub 下载主机，并且绝不会携带你的凭据。恢复请求会保留其范围标头，被拒绝的下载会失败，而不会被保存为构件。

### 观察和限制借用的访问权限

```sh
mise ssh devbox --github-relay-read-only --github-relay-repo jdx/dotfiles \
  --github-relay-log-requests --github-relay-max-duration 1h

# Structured relay events for troubleshooting or auditing:
mise bootstrap remote --host devbox --adopt jdx/dotfiles \
  --github-relay-read-only --github-relay-repo jdx/dotfiles \
  --github-relay-log-requests --github-relay-log-format jsonl
```

请求日志默认关闭。可以按次调用启用，或将偏好保存到你的**本地全局** mise 配置中：

```toml
[settings.github_relay]
log_requests = true
log_format = "text" # or "jsonl"
max_duration = "1h" # default "0s": until the session ends
request_timeout = "5m"
concurrency = 8 # 1-32; excess requests fail closed rather than queue
```

`--github-relay-no-log-requests` 会覆盖已保存的日志记录偏好。格式和持续时间标志也会覆盖各自的设置。这些偏好永远不会启用 relay 或授权仓库：访问权限和范围仍然需要在每次调用时使用显式标志指定。

事件会输出到发起机器的 stderr，而不是远程命令的 stdout。它们会显示方法、仓库和固定的操作名称、状态，以及响应标头所需的时间。已批准的下载重定向仅通过主机名标识。查询值、refs、文件名、标头、凭据、请求正文和签名下载 URL 都会被省略；被拒绝的路径会显示为 `unapproved operation`。JSONL 仅适用于 relay 事件；其他 mise 诊断信息仍可能出现在 stderr 中。

每个 relay 都会打印会话结束摘要，即使请求日志处于关闭状态：收到的请求数（不包括 heartbeat 探测）、被拒绝/不可用的请求数、收到的上游响应字节数，以及最多 128 个被请求的已授权仓库。重定向会作为单独的日志事件记录，但不会增加传入请求计数。

持续时间限制从本地 relay 创建时开始。到期后会立即撤销借用的访问权限并取消活动传输；远程适配器随后会在检测到 heartbeat 探测失败后结束其命令。不会安装任何凭据来延长超出此限制的访问权限。
