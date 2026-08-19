# 通过 SSH 进行远程引导

`mise bootstrap remote` 通过本地安装的 OpenSSH 客户端，将引导项目应用到一台或多台计算机。目标可以存放在版本化配置中，也可以通过命令行临时提供。

远程目标必须提供 POSIX shell，以及 `cksum`、`mktemp`、`tar` 和 `uname`。Linux 和 macOS 主机默认满足这些要求。负责协调的计算机需要本地的 `ssh` 和 `tar` 命令。

```toml
[bootstrap.remote]
source = "."
exclude = [".env.local", "artifacts"]
copy_link = ["modules/common", "playbooks/shared"]

[bootstrap.remote.hosts.cache]
host = "cache.example.com"
user = "ubuntu"
port = 22
identity_file = "~/.ssh/mise-cache"
tags = ["cache", "production"]
ssh_options = ["ServerAliveInterval=30"]
```

`source` 是发送到主机的本地项目目录。相对路径形式的 `source`、`identity_file` 和 `mise_bin` 将根据声明它们的配置文件进行解析。主机级别的 `source` 会覆盖 `[bootstrap.remote].source`。当同一个清单名称在多个层级中声明时，优先级更高的配置文件生效。顶层的 `exclude` 模式会在所有已加载的配置层之间合并，并应用于每台主机，因此即使清单条目来自全局配置，距离更近的项目也可以添加机密文件模式。这个共享集合同样适用于临时的 `--host` 目标；清单主机级别的排除项会在此基础上追加。只有选中的清单条目会被验证。Mise 会应用命令行覆盖项，并在建立任何 SSH 连接之前验证整个选中集合，因此未选中的过时条目不会阻止无关目标，而选中的无效条目也不会导致部分执行。

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
3. 在本地归档源目录，并将其解压到暂存目录中；
4. 准备用于远程运行的确切 mise 可执行文件；
5. 在暂存的项目中执行 `mise bootstrap`；以及
6. 删除暂存目录，包括在 bootstrap 失败之后。

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

## Bootstrap 控制项和机密

远程执行会直接转发重要的收敛控制项：

```sh
mise bootstrap remote cache --dry-run
mise bootstrap remote cache --yes --update
mise bootstrap remote cache --only packages,files,services,compose
mise bootstrap remote cache --skip tools,task
mise bootstrap remote cache --prompt-secrets
```

本地环境变量不会被有意复制到 SSH 主机。请在交互式运行时使用
`--prompt-secrets`。还可以单独叠加由提供商支持的机密环境传输，而无需将值放入配置、
归档、进程参数、计划或日志中。
