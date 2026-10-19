---
description: "通过 SSH 根据主机清单或临时指定的主机，在其他机器上应用 bootstrap 配置。"
socialDescription: "通过 SSH 在其他机器上应用 bootstrap 配置。"
---

# 远程主机

`mise bootstrap remote` 通过 SSH 将 bootstrap 项目发送到其他机器，在每台机器上暂存 mise 并运行 `mise bootstrap`。目标主机来自配置中的清单，或通过命令行 `--host` 指定。

## 要求

- 运行命令的机器（Linux、macOS 或 Windows）需要安装 OpenSSH 的 `ssh` 和 `tar`。
- 每台主机都需要 POSIX shell 以及 `cksum`、`mktemp`、`tar` 和 `uname`。精简系统镜像可能需要先安装这些工具。
- 暂不支持使用原生 SSH 和 PowerShell 的 Windows 主机。

## 首次运行

请使用已检查过 bootstrap 配置的项目，并选择一台当前已能通过 SSH 访问的主机。将 `devbox` 替换为你的 SSH 主机名或别名：

```sh
ssh devbox uname -s
mise bootstrap remote --host devbox --dry-run
mise bootstrap remote --host devbox
```

`--source <DIR>` 用于指定要发送的项目目录。默认值为当前目录，或者主机清单中该主机的 `source`。远程试运行仍会建立连接、发送项目、暂存 mise 并检查主机；它只会跳过 bootstrap 的更改，因此不是离线计划。

::: warning 主机不会保留 mise
默认情况下，mise 会在临时暂存目录中运行，之后再删除该目录。主机会保留安装在 `~/.local/share/mise` 下的工具，但不会保留 mise 本身。如果配置会写入 shell 激活设置、运行用户服务，或需要在主机上再次执行，请添加 `--install-mise`。参见[在主机上保留 mise](#leaving-mise-installed-on-the-host)。
:::

如果仓库中包含本地密钥或生成的数据，请先检查项目实际发送的内容；参见[发送哪些内容](#what-gets-sent)。

## 主机清单 {#inventory-configuration}

在 `[bootstrap.remote.hosts]` 下声明主机，以便按名称或标签选择：

```toml
[bootstrap.remote]
source = "."
exclude = [".env.local", "artifacts"]
mise_env = ["linux", "server"]

[bootstrap.remote.hosts.cache]
host = "cache.example.com"
user = "ubuntu"
tags = ["cache", "production"]
mise_env = ["linux", "cache"]
```

| 键                  | 配置位置                       | 说明                                                                        |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `host`              | 主机条目                       | SSH 主机名或别名（必填）                                                    |
| `user`              | 主机条目                       | SSH 用户                                                                    |
| `port`              | 主机条目                       | SSH 端口                                                                    |
| `identity_file`     | 主机条目                       | SSH 私钥                                                                    |
| `ssh_options`       | 主机条目                       | OpenSSH `-o` 选项，例如 `ServerAliveInterval=30`                            |
| `tags`              | 主机条目                       | 供 `--tag` 选择的标签                                                       |
| `source`            | `[bootstrap.remote]` 或主机条目 | 要发送的本地项目目录                                                        |
| `exclude`           | `[bootstrap.remote]` 或主机条目 | 从发送内容中排除的匹配模式                                                 |
| `copy_link`         | `[bootstrap.remote]` 或主机条目 | 将指定符号链接作为其目标发送                                                |
| `copy_links`        | `[bootstrap.remote]` 或主机条目 | 将所有符号链接都作为其目标发送                                              |
| `mise_env`          | `[bootstrap.remote]` 或主机条目 | 在主机上加载的[配置环境](/configuration/environments.html)                  |
| `install_mise`      | `[bootstrap.remote]` 或主机条目 | 在主机上保留 mise：`true`、`false` 或可执行文件路径                         |
| `mise_bin`          | 主机条目                       | 要上传的本地 mise 可执行文件                                                |
| `remote_mise`       | 主机条目                       | 主机上已安装的 mise                                                         |
| `bootstrap_command` | 主机条目                       | 用于在主机上安装 mise 的 shell 命令                                         |

各主机的最终设置遵循以下规则：

* 相对路径形式的 `source`、`identity_file` 和 `mise_bin`，相对于声明它们的配置文件解析。
* 顶层的 `source`、`mise_env`、`install_mise`、`copy_link` 和 `copy_links` 是同一配置文件中所声明主机的默认值。除 `copy_link` 会在默认值上追加外，主机自身的值会替换默认值。设置 `install_mise = false` 可让某台主机不采用默认值。
* 每个已加载配置文件中的顶层 `exclude` 模式都会应用于所有主机，包括 `--host` 指定的目标。因此，即使主机清单位于全局配置中，项目也可以添加用于排除密钥文件的模式。主机自己的 `exclude` 会在这些规则上追加。
* 如果两个配置文件声明了同名主机，则以位置更靠近项目的配置为准。
* `mise_env` 会作为 `MISE_ENV` 传给主机上的 `mise bootstrap`。`--remote-env <ENV>` 会为所有选中的主机替换该值。
* mise 只检查你选中的主机，并会在建立任何连接之前，应用命令行覆盖项后检查所有目标。未选中的过期条目不会阻止运行；被选中的无效条目也不会导致部分主机已经执行、部分主机尚未执行的情况。

主机上运行的 `mise bootstrap` 会忽略 `[bootstrap.remote]`，因此主机不会继续对其他主机执行 bootstrap。

## 选择主机 {#selecting-hosts}

单独运行 `mise bootstrap remote` 不会选择任何主机，因此即使输错命令，也不会触达清单中的所有服务器。请明确指定目标主机：

```sh
# 按名称选择一个或多个清单主机
mise bootstrap remote cache

# 选择清单中的所有主机，或带有任一指定标签的主机
mise bootstrap remote --all
mise bootstrap remote --tag cache --tag canary

# 选择清单之外的服务器
mise bootstrap remote --host ubuntu@cache.example.com \
  --identity-file ~/.ssh/mise-cache \
  --source ./infra/mise-cache
```

这些选择方式可以组合使用。mise 会逐台执行 bootstrap：先按命令行顺序处理按名称指定的主机，再按清单顺序处理由 `--all` 或 `--tag` 选择的其他主机，最后按命令行顺序处理 `--host` 指定的目标。某台主机失败后，mise 会继续运行并在最后汇总所有失败；`--fail-fast` 则会在首次失败时停止。

命令行选项会应用于所有选中的主机。`--port` 和 `-i` 会替换主机清单中的对应值。`--ssh-option` 会追加到主机的 `ssh_options` 后面传入；OpenSSH 会使用每个选项收到的第一个值，因此无法覆盖清单中已经设置的选项。

| 选项                      | 作用                                                                         |
| ------------------------- | --------------------------------------------------------------------------- |
| `--port <PORT>`           | SSH 端口                                                                      |
| `-i`, `--identity-file`   | SSH 私钥                                                                      |
| `--ssh-option <OPTION>`   | 一个 OpenSSH `-o` 选项，例如 `ProxyJump=bastion`；可重复指定多个               |
| `--connect-timeout <SEC>` | 每次连接的 OpenSSH `ConnectTimeout`；默认 10 秒                                |

mise 会先于上述选项传入自己的 `ConnectTimeout`，因此在 `--ssh-option` 或 `ssh_options` 中设置 `ConnectTimeout` 不会生效；请改用 `--connect-timeout`。

mise 也会读取常规的 `~/.ssh/config`，并保留 OpenSSH 的主机密钥检查。

## 发送哪些内容

mise 会将源目录打包后发送给每台主机，并排除 `.git`、`target` 和 `node_modules`。对于本地密钥和生成文件，请添加 `exclude` 条目或 `--exclude` 选项。`--keep-staging` 会在主机上保留暂存目录用于调试，并打印该目录路径。

符号链接默认以链接形式发送。要发送链接目标，请在 `copy_link` 中填写相对于源目录的链接路径，或传入 `--copy-link <PATH>`。目录链接会被复制为真实目录，但其中的链接仍保持为链接，因此可以共享指定模块或 playbook，而不更改其他链接。主机级 `copy_link` 条目会追加到顶层列表中，命令行条目则会同时追加到两处。

`copy_links = true` 或 `--copy-links` 会像 `rsync --copy-links` 一样将所有链接替换为目标内容。这可能会连带复制大型 vendor 目录、生成目录或依赖目录，以及源目录之外的文件。使用此选项后，mise 也会忽略 `copy_link`。

## 在主机上准备 mise {#provisioning-mise-itself}

默认情况下，mise 会为每台主机提供与本机相同版本的 mise，这样主机就会像本机一样读取配置。如果当前 mise 可执行文件能在主机上运行，mise 会直接上传它；否则会下载适用于主机平台的该版本官方发行版（Linux x64、arm64 或 armv7，使用 glibc 或 musl；macOS x64 或 arm64），验证其签名和校验和，然后上传。同一平台的主机会共用一次下载。开始 bootstrap 前，mise 会在主机上运行 `mise version`，确认可执行文件能正常工作。

只有当前版本本身是官方发行版时，mise 才会替换为官方发行版。调试构建、带有本地更改的源码构建，或由 Linux 发行版打包的 mise 都不能替换；不在上述列表中的平台，或 mise 无法识别 libc 的 Linux 主机也不能替换。遇到这些情况时，请选择以下一种方式：

| 配置键或选项                               | 作用                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `mise_bin`、`--mise-bin`                   | 上传自行构建的 mise，例如适用于没有官方发行版架构的构建                                          |
| `remote_mise`、`--remote-mise`             | 使用主机上已经安装的 mise                                                                         |
| `bootstrap_command`、`--bootstrap-command` | 在主机上运行安装 mise 的 shell 命令，例如通过包管理器或站点安装程序安装                           |

```toml
[bootstrap.remote.hosts.arm-lab]
host = "arm-lab.example.com"
mise_bin = "./artifacts/mise-linux-armv5"

[bootstrap.remote.hosts.nix-builder]
host = "builder.example.com"
bootstrap_command = "nix profile install nixpkgs#mise"
```

每台主机只能设置其中一种；如果命令行指定了选项，则会替换主机清单中的设置。

`remote_mise` 是可执行文件名称或路径，不是 shell 表达式。单独的名称会通过主机的登录 `PATH` 查找；以 `~/` 开头的路径使用主机的主目录；绝对路径按原样使用。`./bin/mise` 等相对路径会在暂存的项目目录内解析，不能指向项目之外。

`bootstrap_command` 会在登录 shell 中运行。之后 mise 会启动新的登录 shell 来查找 `mise`，并优先选择该命令运行前不存在或已发生变化的可执行文件，避免 `PATH` 中较早出现的旧版本遮蔽新版本。如果无法判断哪个可执行文件是新安装的，mise 会停止并要求设置 `remote_mise`。试运行不会执行此命令：它会使用主机上已有的 mise，否则停止并要求设置 `remote_mise` 或 `mise_bin`。

::: details mise 如何判断当前可执行文件能否在主机上运行
mise 会检测主机的操作系统、架构，以及 Linux 上的 libc 系列。在 Linux 上，它还会读取可执行文件的 ELF 解释器。静态链接的可执行文件无需检查 libc。动态链接的可执行文件要求主机上具有相同的解释器路径和 libc 系列。对于 glibc，主机的加载器必须提供可执行文件所需的最高 `GLIBC_*` 符号版本；对于 musl，主机上的加载器版本不能低于本机。最终以主机上运行 `mise version` 的结果为准。

在为其他平台下载发行版之前，mise 会检查当前可执行文件是否与其官方发行版的某个签名校验和匹配。它会使用 minisign 签名和 mise 内置的发行密钥验证发行版的 `SHASUMS256.txt`，然后验证下载文件的 SHA-256 校验和。
:::

### 在主机上保留 mise {#leaving-mise-installed-on-the-host}

设置 `install_mise`，以便 mise 在运行结束后仍保留在主机上：

```toml
[bootstrap.remote]
install_mise = true

[bootstrap.remote.hosts.cache]
host = "cache.example.com"
install_mise = "/usr/local/bin/mise"
```

设为 `true` 时会安装到 `~/.local/bin/mise`，与 [mise.run](https://mise.run) 的安装位置相同。字符串值用于指定其他可执行文件路径。该路径必须是绝对路径或以 `~/` 开头，且不能是已存在的目录。命令行也支持相同的选项：

```sh
mise bootstrap remote cache --install-mise
mise bootstrap remote cache --install-mise=/usr/local/bin/mise
mise bootstrap remote cache --no-install-mise
```

指定路径时必须使用 `=`，因此单独的 `--install-mise` 不会误将主机名当作路径。`--install-mise` 会替换清单中设置的 `remote_mise` 或 `bootstrap_command`。在配置中，`install_mise` 可以与 `mise_bin` 配合使用，但不能与 `remote_mise` 或 `bootstrap_command` 同时使用，因为后两者已经会在主机上提供 mise。如果希望主机通过自己的包管理器管理安装，请使用 `bootstrap_command`。

mise 会安装原本要暂存的可执行文件，然后使用该文件运行 bootstrap，因此最终主机上的版本与本机运行的版本相同。替换正在运行的 mise 是安全的；如果目标可执行文件相同，则不会重复上传。试运行会报告安装路径，但实际使用临时副本。

::: warning 保护安装目录
mise 不会使用 sudo 安装自身，因此 SSH 用户必须对安装路径具有写入权限；例如，要安装到 `/usr/local/bin/mise`，该用户必须拥有对应目录。其他拥有目录写入权限的人也可以替换该用户使用的 `mise`，因此应确保只有该用户可以写入目录。仅当主机上有 `sha256sum` 或 `shasum` 时，mise 才会检查已安装文件的摘要，而且检查无法覆盖之后发生的更改。若不设置 `install_mise`，mise 会改为暂存到私有的 `mktemp -d` 目录中。
:::

安装 mise 不会自动将其所在目录加入主机的 `PATH`；如果登录 shell 的 `PATH` 不包含该目录，mise 会发出警告。许多 Linux 发行版默认会将 `~/.local/bin` 加入 `PATH`，macOS 则不会。依赖 [`[bootstrap.mise_shell_activate]`](/bootstrap/shell.html) 之前，请先在主机的 shell 启动文件中添加该目录，例如使用 [`[dotfiles]` 行条目](/bootstrap/shell.html#put-mise-on-path-first)；激活配置块会按名称调用 `mise`。

## 选项与密钥 {#bootstrap-controls-and-secrets}

远程运行支持与 [`mise bootstrap`](/bootstrap.html#choose-what-runs) 相同的 `--dry-run`、`--yes`、`--update`、`--only`、`--skip`、`--force-dotfiles` 和 `--prompt-secrets` 选项，还支持用于选择主机配置环境的 `--remote-env`：

```sh
mise bootstrap remote cache --dry-run
mise bootstrap remote cache --yes --update
mise bootstrap remote cache --only packages,files,services,compose
mise bootstrap remote cache --skip tools,task
mise bootstrap remote cache --force-dotfiles
mise bootstrap remote cache --prompt-secrets
mise bootstrap remote cache --remote-env linux,server
```

mise 不会将本机环境复制到主机。本机的 `-E` 只会改变 mise 读取哪些本地配置文件；主机会加载 `mise_env` 或 `--remote-env` 中指定的环境。本机设置的[密钥输入](/bootstrap/secrets.html)也不会在主机上可用。需要交互操作时，请使用 `--prompt-secrets`，或者确保主机上可以获取这些值。

## 在主机上接管配置仓库 {#private-configuration-repositories}

使用 `--adopt` 可在每台主机上安装配置仓库，而不是发送项目。它接受与[本地接管](/bootstrap/from-repository.html)相同的两种仓库格式：

```sh
mise bootstrap remote --host devbox --install-mise --adopt you/mise-config
```

`OWNER/REPO` 会展开为 `https://github.com/OWNER/REPO.git`。HTTPS 和 SSH URL、本机上的本地路径也都可用。其他传输方式和自定义 Git helper 不受支持；克隆时不会跟随 HTTP 重定向，因此请使用仓库的规范 URL。`--adopt` 不能与 `--source`、`--copy-link`、`--copy-links` 或 `--exclude` 同时使用。目标主机仍然必须通过 `--host` 或主机清单指定，不能从被接管仓库的主机清单中读取。

mise 会使用本机的 Git 凭据在本机获取一次仓库，为所有选中主机固定到同一个提交，并通过 SSH 将 Git bundle 发送到每台主机。它不会更改本机的全局配置，也不会复制本机的 Git 配置；私有仓库无需额外选项。如果主机上尚未安装 mise，请添加 `--install-mise`。

传输仓库不需要使用 [GitHub 中继](/bootstrap/github-relay.html)。只有后续 bootstrap 需要访问其他私有 GitHub 内容（例如私有的 `[bootstrap.repos]` 条目或私有发行版）时，才添加 `--github-relay-read-only --github-relay-repo OWNER/REPO`；每个仓库都要单独重复指定 `--github-relay-repo`。

### 全局配置

一个全局 mise 配置仓库会作为检出内容放入主机的全局配置目录，并保留原始的无凭据 origin、分支和 upstream。运行结束后会保留该检出目录。在主机上：

- origin 相同的现有检出目录会被重用；使用 `--update` 时会对其执行快进更新。
- 如果存在未提交更改、origin 不同、文件冲突，或仓库中有以 `.local.toml` 结尾的文件，运行会停止并等待你处理。
- 非空但尚未检出为 Git 仓库的目录，在你确认后可以接管；现有文件和本地覆盖项都会保留。

使用 `--dry-run` 时，mise 会执行除更改主机以外的所有步骤：获取仓库、连接、暂存并运行全部检查，然后报告将要执行克隆、快进还是接管，以及新文件数量。如果主机已有全局配置，后续 bootstrap 也会预览。

### Setup 仓库

对于通过 `mise dot origin set` 关联的 setup 仓库，主机会还原其中已跟踪的文件，而不是检出仓库，然后记录 origin。请确保需要的 mise 配置和模板源文件已在第一台机器上纳入版本控制；仅被引用的文件不会自动包含。如果配置声明了历史记录监视器，bootstrap 会像其他用户服务一样安装它。如果主机上的现有文件与仓库不同，setup 会在运行 bootstrap 前停止。

```sh
mise bootstrap remote --host devbox --install-mise --adopt you/setup --dry-run
```

使用 `--dry-run` 时，主机会显示将要写入的文件和等待处理的文件，但不会记录任何信息。setup 预览可能会暂存已解密的受跟踪配置，因此请将通过 `--keep-staging` 保留的目录视为敏感数据。

如果 setup 成功后主机无法自行访问仓库以继续同步，bootstrap 会告知你。请为主机配置自己的凭据，例如在主机上运行 `gh auth login` 和 `gh auth setup-git`，或者通过 `mise dot origin set` 设置 SSH URL。

## 使用本机的 GitHub 访问权限

`mise bootstrap remote` 接受与 [`mise ssh`](/cli/ssh.html) 相同的 `--github-relay-*` 选项，使主机上的 Git 和 mise 可以在本次运行期间使用本机凭据读取私有 GitHub 仓库。参见 [GitHub 中继](/bootstrap/github-relay.html)。

## 远程运行流程 {#transport-and-staging}

对于每台主机，mise 会执行以下步骤：

1. 使用常规 SSH 配置和主机密钥策略建立 OpenSSH 连接。
2. 使用 `mktemp` 创建私有的 `/tmp/mise-bootstrap.*` 暂存目录。
3. 在本机打包源目录并解压到暂存目录；如果使用 `--adopt`，则发送仓库 bundle。
4. 按上述说明暂存或安装 mise。
5. 在暂存项目或接管的配置中运行 `mise bootstrap`。
6. 移除暂存目录；即使 bootstrap 失败也会移除，除非指定 `--keep-staging`。

在 Unix 上，针对同一主机运行的所有命令会共用一个 OpenSSH 控制连接。终端无人操作时，mise 会设置 `BatchMode=yes`，因此需要密码时会直接失败，而不会一直等待。在有人操作的终端中，bootstrap 会获得 TTY，因此 SSH、sudo、确认和 `--prompt-secrets` 提示都可以正常交互。mise 不会放宽 OpenSSH 的主机密钥检查。
