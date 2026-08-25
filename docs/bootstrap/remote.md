# 通过 SSH 进行远程引导

`mise bootstrap remote` 通过本地安装的 OpenSSH 客户端，将引导项目应用到一台或多台计算机。目标可以存放在版本化配置中，也可以通过命令行临时提供。

远程目标必须提供 POSIX shell，以及 `cksum`、`mktemp`、`tar` 和 `uname`。Linux 和 macOS 主机默认满足这些要求。负责协调的计算机需要本地的 `ssh` 和 `tar` 命令。

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

`source` 是发送到主机的本地项目目录。相对的 `source`、`identity_file` 和 `mise_bin` 路径均相对于声明它们的配置文件解析。主机级别的 `source` 会覆盖 `[bootstrap.remote].source`。主机级别的 `mise_env` 会覆盖 `[bootstrap.remote].mise_env`；这些有序值会作为 `MISE_ENV` 传递给暂存的 `mise bootstrap` 进程。使用 `--remote-env <ENV>` 可以为每个选定主机覆盖已配置的列表。当同一个清单名称在多个层级中声明时，优先级更高的配置文件生效。顶层 `exclude` 模式会合并所有已加载的配置层，并应用于每台主机，因此即使清单条目来自全局配置，更近的项目也可以添加机密模式。这个共享集合也会应用于临时的 `--host` 目标；清单中的主机级别排除项会叠加。只有选定的清单条目会被验证。Mise 会应用命令行覆盖项，并在打开任何 SSH 连接之前验证整个选定集合，因此未选定的过时条目不会阻塞无关目标，而选定的无效条目也不会导致部分执行。

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

默认情况下，源归档会排除 `.git`、`target` 和 `node_modules`。对于生成的文件和本地机密信息，请添加可重复的 `exclude` 配置项或 `--exclude` 标志。仅在调试时使用 `--keep-staging`；它会打印保留的路径，而不是删除该路径。

符号链接默认会以链接形式归档。使用可重复的、相对于源目录的 `copy_link` 条目或 `--copy-link <PATH>` 标志，可以仅将指定链接替换为暂存项目中的目标。选中的目录链接会被复制为真实目录，而其目标内部嵌套的链接仍会保留为链接。这是共享选定模块或 playbook 的更安全选择，不会更改深层依赖树中的无关链接。主机级别的 `copy_link` 条目会追加到顶层列表中，命令行条目则会追加到两者中。

设置 `copy_links = true` 或传递 `--copy-links`，可以递归取消遇到的所有符号链接的引用。这与 `rsync --copy-links` 等工具的行为一致，但可能会意外展开供应商目录、生成目录或依赖树深处的小型链接，并且可能复制源目录之外的内容。启用此全局模式时，会忽略显式的 `copy_link` 选择。

## Provisioning mise itself

默认情况下，mise 会检测远程操作系统、架构和 Linux libc 家族。当当前本地可执行文件与目标兼容时，mise 会上传该文件。这确保远程进程支持与其编排器相同的引导配置，而不会在不知不觉中使用较旧的已安装版本。

在 Linux 上，mise 还会检查可执行文件的 ELF 解释器。静态二进制文件无需检查目标 libc。对于动态链接的二进制文件，远程主机必须提供完全匹配的解释器路径以及相同的 libc 家族。对于 glibc 二进制文件，mise 会从 ELF 中提取所需的最高 `GLIBC_*` 符号版本，并在上传前验证远程加载器至少提供该 ABI。对于 musl 二进制文件，mise 会比较本地和远程加载器版本，并要求远程加载器至少同样新。随后，mise 会在远程运行 `mise version`，将其作为其他所有二进制文件和主机要求的最终依据。

当本地可执行文件无法在目标上运行时，mise 会自动从官方 GitHub 发布版本中解析同一 mise 版本对应的原始可执行文件。这涵盖 Linux x64、arm64 和 armv7（包括 glibc 和 musl），以及 macOS x64 和 arm64。mise 会下载 `SHASUMS256.txt` 及其 minisign 签名，使用 mise 内置的发布密钥验证清单，然后在上传前验证所选构件的 SHA-256 校验和。经过验证的构件会在命令执行期间缓存，因此使用相同平台的目标共享一次下载。

自动替换有意限制为官方发布二进制文件。在下载其他目标的文件之前，mise 会证明本地可执行文件与同一官方发布版本的签名校验和之一匹配。因此，调试构建、包含本地修改的源代码构建以及下游打包的二进制文件都会安全失败，而不会悄悄更改远程计算机上的代码。对于这些构建，或对于官方构件矩阵之外的平台，请使用下面的显式策略。无法识别 Linux libc 家族时，也必须使用显式策略。

以下三个显式后门可覆盖其他环境：

- `mise_bin` / `--mise-bin` 上传用户自行构建的本地可执行文件。这是没有官方预编译二进制文件的架构的主要路径。
- `remote_mise` / `--remote-mise` 在主机上运行已知兼容的现有命令，而不上传二进制文件。
- `bootstrap_command` / `--bootstrap-command` 在登录 shell 中运行显式的远程 shell 命令，然后打开一个全新的登录 shell，从安装后的配置文件、继承的 `PATH` 或常见的用户安装目录中定位 `mise`。mise 会在安装前记录每个可发现可执行文件的内容指纹和报告的版本，之后优先选择新添加或标识发生变化的路径，因此 `PATH` 中较早的旧可执行文件无法遮蔽已安装的版本。未发生变化且存在歧义的候选项会失败，并提示选择显式路径。这支持源代码构建、会编辑 shell 配置文件的安装程序以及特定站点的安装程序。试运行绝不会执行此命令；它会使用已安装的远程 `mise`，或失败并提示选择 `remote_mise` 或 `mise_bin`。

这些策略互斥。在命令行中提供其中一个策略，会替换所选清单主机声明的任何配置策略。`remote_mise` 是可执行文件名称或路径，而不是 shell 表达式。裸名称会通过远程登录 `PATH` 解析为绝对可执行文件，`~/` 路径使用远程登录用户的主目录，绝对路径按原样使用，而 `./bin/mise` 等相对路径则在暂存项目目录内解析。超出暂存项目目录的相对路径会被拒绝。路径可以包含空格，并且始终作为一个可执行文件参数传递。需要 shell 求值时，请使用 `bootstrap_command`。

```toml
[bootstrap.remote.hosts.arm-lab]
host = "arm-lab.example.com"
mise_bin = "./artifacts/mise-linux-armv5"

[bootstrap.remote.hosts.nix-builder]
host = "builder.example.com"
bootstrap_command = "nix profile install nixpkgs#mise"
```

mise 会在引导前运行 `mise version`，以验证每个上传的或选定的远程命令。

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

安装的内容与默认策略所暂存的可执行文件相同——本地二进制文件或经过校验和验证的官方发布构件——并且它会运行 bootstrap，因此主机会与负责编排的 mise 版本保持一致。Mise 会在目标文件旁边写入临时文件，然后将其重命名到目标位置，因此替换当前正在运行的 mise 不会截断该文件。如果目标中已经存在字节完全相同的可执行文件，则不会上传任何内容。试运行绝不会写入主机：`--dry-run` 会报告它将安装到的路径，并照常暂存可执行文件。

`install_mise` 可以与 `mise_bin` 组合使用，以安装本地构建的可执行文件。它不能与 `remote_mise` 或 `bootstrap_command` 组合，因为后两者已经在主机上提供了 mise。当主机应通过系统软件包、`nix profile install` 或特定站点的安装程序自行管理安装时，`bootstrap_command` 仍然是正确的选择。

SSH 用户必须能够写入安装路径；mise 不会为此提升权限，因此像 `/usr/local/bin/mise` 这样的路径需要使用已经拥有该目录的用户。请确保该目录仅对该用户可写。安装后，mise 会将目标的摘要与它写入的内容进行比较，如果不一致则失败，而不是运行其他内容，但这项检查是尽力而为的——当主机既不提供 `sha256sum` 也不提供 `shasum` 时会跳过检查，并且无法覆盖检查和运行之间的时间窗口。无论如何，任何能够写入安装目录的人都可以控制该账户在之后每次调用中作为 `mise` 运行的内容，因此目录权限才是真正的边界。在未使用 `install_mise` 时，暂存目录由 `mktemp -d` 创建，并且仅对 SSH 账户私有。

安装 mise 不会将其添加到主机的 `PATH` 中。当安装目录不在登录 `PATH` 中时，mise 会发出警告；bootstrap 项目可以声明 [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html)，使同一次运行将激活配置或 shim 写入主机的 shell 启动文件。

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

本地环境变量不会被复制到 SSH 主机，这是有意为之。显式配置的 `mise_env` 属于远程编排元数据，而不是继承的本地环境。有人值守运行时请使用 `--prompt-secrets`。基于提供程序的机密环境传输可以单独叠加，而无需将值放入配置、归档、进程参数、计划或日志中。
