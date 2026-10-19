---
description: "写入系统文件和目录并指定内容、所有者、用户组及权限；仅在需要更改时使用 sudo。"
socialDescription: "写入系统文件和目录并指定内容、所有者、用户组及权限。"
---

# 系统文件和目录

对于需要指定内容、所有者、用户组或权限模式的路径（例如 `/etc` 下的配置文件或服务数据目录），请使用 `[bootstrap.files]` 和 `[bootstrap.directories]`。mise 会创建、更新或删除每个声明的路径，并且只在必要时使用 `sudo`。

这两个配置部分也可用于写入主目录中的文件。如果你要编辑并保存在 dotfiles 仓库中的文件，请使用 [`[dotfiles]`](/dotfiles.html)，这样 mise 可以建立链接并将更改保存回仓库。主目录以外的文件、需要指定所有者或用户组的文件，以及更改时应重新加载服务的文件，请使用 `[bootstrap.files]`。

这些配置部分适用于 Linux 和 macOS。在 Windows 上，只要有任何适用条目，`mise bootstrap`、`mise bootstrap plan` 和 [`mise bootstrap files`](/cli/bootstrap/files.html) 就会失败。因此，共享配置中的条目应使用 [`os` 选择器](#choose-platforms)，例如 `unix`。

<a id="choose-platforms"></a>

## 示例

```toml
[bootstrap.directories."/opt/example"]
owner = "root"
group = "root"
mode = "0755"

[bootstrap.files."/etc/example.conf"]
source = "./files/example.conf"
owner = "root"
group = "root"
mode = "0644"
```

在此 `mise.toml` 旁创建 `files/example.conf`，然后通过 [`mise bootstrap files apply`](/cli/bootstrap/files/apply.html) 预览并应用：

```sh
mise bootstrap files apply --dry-run
mise bootstrap files apply
```

mise 会创建 `/opt/example`，将源文件复制到 `/etc/example.conf`，并为两者设置声明的所有者、用户组和权限模式。由于条目指定了所有者，两项更改都需要 root 权限，mise 会通过 `sudo` 执行。完整的 [`mise bootstrap`](/bootstrap.html) 也会应用这些配置部分。

## 设置文件内容

文件内容可以来自 mise 读取的 `source` 文件，也可以来自内联的 `content`。每个文件只能使用其中一种，不能同时设置：

```toml
[bootstrap.files."/etc/sysctl.d/90-inotify.conf"]
content = """
fs.inotify.max_user_watches = 524288
"""
```

相对路径形式的 `source` 会从声明该条目的配置文件所在目录解析；以 `~/` 开头的 `source` 则从你的主目录解析。

目标路径必须是绝对路径或以 `~/` 开头。mise 不会管理 `/` 本身。未设置 `source` 或 `content` 的文件只会管理其[权限](#permissions-without-content)。

### 将内容渲染为模板

设置 `template = true` 可使用 mise 的[模板引擎](/templates.html)渲染内容。否则，内容中的字面值 <code v-pre>{{ ... }}</code> 会原样写入。

```toml
[vars]
cache_dir = "/var/cache/example"

[bootstrap.files."/etc/example.conf"]
template = true
content = """
cache_dir = {{ vars.cache_dir }}
written_to = {{ target }}
"""
```

文件模板可以使用 `vars`、`env`、<code v-pre>{{ target }}</code>（目标路径）和 <code v-pre>{{ config_root }}</code>。此处的 `config_root` 是声明配置文件所在目录，例如 `.mise/config.toml` 对应 `.mise/`，全局配置则对应 `~/.config/mise`。这与 [systemd 单元](/bootstrap/systemd.html)、[LaunchAgents](/bootstrap/launchd.html) 和 [Compose 项目](/bootstrap/compose.html)不同；在这些配置中，`config_root` 指配置根目录，即项目目录，或全局配置中的 `MISE_GLOBAL_CONFIG_ROOT`（默认为 `$HOME`）。

模板可以使用 <code v-pre>{{ secret(name="api_token") }}</code> 读取已声明的[密钥输入](/bootstrap/secrets.html)。密钥值不会出现在计划、试运行、状态输出或 mise 特权辅助程序的输出中。对于包含凭据的文件，请设置 `mode = "0600"`，并指定只有服务账户或 root 才能读取的所有者。哪些 bootstrap 值会作为模板处理，以及哪些位置可以使用 `exec()`，参见 [bootstrap 中的模板](/bootstrap.html#templates)。

### 模板渲染结果为空时删除文件

同时设置 `template = true` 和 `remove_empty = true` 后，如果模板渲染结果只有空白字符，就会删除目标文件。这样，同一个声明就能启用或停用文件：

```toml
[vars]
proxy_host = "proxy.internal:3128"

[bootstrap.files."/etc/apt/apt.conf.d/95proxy"]
template = true
remove_empty = true
content = """
{% if vars.proxy_host %}Acquire::http::Proxy "http://{{ vars.proxy_host }}";
{% endif %}"""
```

设置 `proxy_host` 后，mise 会写入文件。将其设为 `""` 后，下次应用配置时会删除文件：计划会显示 `absent (template rendered empty)`，并像其他更改一样触发 `notify`。但如果目标实际是目录，mise 仍会拒绝删除。如果模板所需的密钥不可用，mise 就无法判断模板是否为空，因此状态会报告该文件为 `unknown`（未检查），mise 会保留文件，而应用操作会失败。该条目仍会被验证为一个存在的文件，因此它的父目录不能声明为不存在。

## 创建目录

声明目录时，mise 会像 `mkdir -p` 一样创建缺失的父目录。声明的所有者、用户组和权限模式只应用于该目录；mise 沿途创建的父目录使用操作系统默认设置。如果父目录也需要指定所有者或权限模式，请单独声明。

文件则有所不同：对于 `[bootstrap.files]` 目标，mise 不会创建缺失的父目录。状态和计划仍会显示 `create`，但由于父目录不存在，应用操作会失败。如果父目录可能尚不存在，请在 `[bootstrap.directories]` 中声明，mise 也会创建缺失的上级目录。mise 会先创建声明的目录，再创建其中的文件。

## 选择平台

在文件或目录上设置 `os`，可以只在符合条件的机器上管理它。该设置可以接受一个选择器，也可以接受选择器列表。选择器可以是操作系统（`linux`、`macos` 或 `windows`），也可以是适用于所有非 Windows 平台的 `unix`，并可选地附加架构，例如 `linux/x64` 或 `macos/arm64`。可使用与[特定操作系统工具](/dev-tools/#os-specific-tools)相同的名称，因此 `darwin`、`win` 和 `aarch64` 等别名也可用。

```toml
[bootstrap.files."/etc/docker/daemon.json"]
os = "linux"
source = "./files/docker-daemon.json"

[bootstrap.directories."~/.colima/default"]
os = "macos"

[bootstrap.files."~/.colima/default/colima.yaml"]
os = "macos"
source = "./files/colima.yaml"
```

Colima 配置文件声明了它的父目录，因为在 Colima 至少运行过一次之前，`~/.colima/default` 不会存在。

选择器与机器不匹配的条目会被跳过，效果等同于未声明：应用、状态检查和试运行都会忽略它，mise 也不会接触目标路径。

## 仅管理权限 {#permissions-without-content}

如果文件内容由其他对象（例如软件包、安装程序或你本人）管理，可以省略 `source` 和 `content`，仅管理文件的权限模式、所有者或用户组：

```toml
[bootstrap.files."/etc/ssh/sshd_config"]
mode = "0600"
owner = "root"
```

至少要设置 `mode`、`owner` 或 `group` 中的一项。mise 只会比较并更改已声明的字段：如果没有设置 `mode`，权限模式会保持原样，而不会重置为 `0644`。文件会被原位更改，因此内容和 inode 不受影响，硬链接和已打开的文件句柄也会继续指向该文件。与 `chown` 一样，更改所有者或用户组可能会清除 setuid 和 setgid 位；要保留它们，请声明 `mode`。

这些条目绝不会创建、替换或移除文件：

- 如果目标不存在，mise 会发出警告并跳过，但应用操作仍会成功。
- 如果目标是符号链接、目录或其他非普通文件，状态会显示为 `unknown`；应用操作会发出警告并保留它。mise 打开文件时不会跟随符号链接，因此更改不会写入链接目标。
- `template`、`remove_empty` 和 `replace` 需要与 `source` 或 `content` 一起使用，因此不能用于此类条目。
- [`mise bootstrap unapply`](/cli/bootstrap/unapply.html) 会保留该文件，因为 mise 从未管理其内容。

当 mise 更改文件权限时会触发 `notify`。

更改你拥有的文件权限时，会以你的身份运行。声明了 `owner` 或 `group`，或要更改其他用户拥有的文件权限时，则以 root 身份运行。在 Linux 和 macOS 上，即使文件所有者无法读取文件，也可以不使用 `sudo` 更改其权限；其他 Unix 系统可能会通过 `sudo` 重试该操作。如果 root 操作需要经过不受信任的符号链接（参见[mise 如何应用更改](#how-mise-applies-changes)），应用操作会发出警告并保留仅管理权限的文件，而不会失败。

## 在软件包前应用文件 {#files-before-packages}

对于包管理器所需的文件和目录（例如仓库定义和签名密钥），请设置 `phase = "pre-packages"`：

```toml
[bootstrap.directories."/etc/apt/keyrings"]
mode = "0755"
phase = "pre-packages"

[bootstrap.files."/etc/apt/keyrings/vendor.asc"]
source = "./files/vendor.asc"
phase = "pre-packages"

[bootstrap.files."/etc/apt/sources.list.d/vendor.sources"]
source = "./files/vendor.sources"
phase = "pre-packages"

[bootstrap.packages]
"apt:vendor-tool" = "latest"
```

请在源文件中放入供应商的密钥和仓库定义。更改仓库文件不会刷新包管理器元数据，因此请运行 `mise bootstrap --update`，在同一次运行中刷新元数据。对于 apt，[`[bootstrap.apt.sources]`](/bootstrap/packages/apt.html#sources) 会自行下载并检查密钥，并在软件源更改时刷新列表。对于 dnf，[`[bootstrap.dnf.repos]`](/bootstrap/packages/dnf.html#copr) 会启用 COPR 仓库。

`mise bootstrap` 会在账户和包管理器插件之后、`pre-packages` 钩子之前应用 `phase = "pre-packages"` 的文件。默认阶段为 `"post-packages"` 的文件会在内置包管理器安装软件包之后应用。每个文件在一次运行中只应用一次。

声明的父目录必须在子项之前或同时创建，并且要在子项之后或同时移除。因此，位于已声明目录中的 `pre-packages` 文件也要求该目录处于 `pre-packages` 阶段。阶段冲突会在 bootstrap 更改任何内容前通过验证失败。

`mise bootstrap --only files` 会运行两个阶段，`--skip files` 会跳过两个阶段。`--only packages` 不会应用文件。`mise bootstrap files apply` 会应用所有文件和目录，不受阶段设置影响。计划会显示每个条目的阶段。

## 更改后重启服务

在文件或目录中添加 `notify`，即可在 mise 更改该项时重新加载或重启[系统服务](/bootstrap/services.html#system-services)：

```toml
[bootstrap.files."/etc/docker/daemon.json"]
content = '{ "log-driver": "local" }'
notify = ["docker"]

[bootstrap.services.docker]
state = "running"
```

每个名称都必须是 `[bootstrap.services]` 中声明的系统服务；用户服务或未声明的名称会在更改任何内容前导致验证失败。服务的 `on_change` 设置决定重新加载、重启或不作处理；声明为 `state = "stopped"` 的服务绝不会因通知而启动。

通知只会在更改成功后运行。`mise bootstrap` 会收集两个文件阶段的通知，并在服务步骤中运行。`mise bootstrap files apply` 会在自身更改后立即运行通知；它还会询问是否将其他待处理的更改通知给已声明的系统服务，`--yes` 会自动确认。`mise bootstrap services apply` 不会运行通知，因为它没有文件更改需要响应。`mise bootstrap status` 和 `mise bootstrap plan` 会显示待处理的文件更改将触发哪些重新加载和重启。

## 配置合并方式

不同配置层级中的条目会根据目标路径合并，参见[配置层级](/configuration.html#configuration-hierarchy)。多个配置文件声明同一路径时，mise 会整体采用最靠近项目的声明，不会合并不同文件中的键。同一文件内的两个键如果解析到相同路径（例如 `"~/.oldrc"` 和 `"/home/you/.oldrc"`），则会报错。

同一路径不能同时声明为文件和目录；声明为存在的路径也不能位于声明为不存在的目录中。

## 移除文件和目录 {#removing-resources}

删除声明不会移除目标路径。要移除路径，请将其声明为不存在：

```toml
[bootstrap.files."/etc/obsolete.conf"]
state = "absent"

[bootstrap.directories."/opt/obsolete"]
state = "absent"

[bootstrap.files."~/.oldrc"]
state = "absent"
```

声明为不存在的文件会被移除，无论其内容为何；文件移除后，再次应用不会产生更改。移除主目录中由你拥有的文件时无需使用 `sudo`。

mise 移除目录前，该目录必须为空，否则应用操作会失败。要删除目录及其所有内容，请添加 `recursive = true`。试运行会将此操作显示为 `remove directory <path> recursively`；mise 会通过 `sudo` 执行，以免无法读取的条目导致删除过程半途停止。

要移除[机器模块](/bootstrap/modules.html)添加的文件和目录，请先运行 `mise bootstrap unapply <env>`，再删除相关声明。参见[移除模块资源](/bootstrap/modules.html#remove-a-module-s-resources)。

## 预览并应用

```sh
mise bootstrap files status            # state of each declared path
mise bootstrap files status --json     # the same, with origin details
mise bootstrap files status --missing  # exit 1 if anything would change
mise bootstrap files apply --dry-run   # print the changes without making them
mise bootstrap files apply             # apply after a confirmation prompt
mise bootstrap files apply --yes       # apply without prompting
```

状态会将每个路径列为 `create`、`update`、`remove`、`unchanged` 或 `unknown`，并显示其当前状态、目标状态以及声明它的配置文件。`unknown` 表示 mise 无法安全更改该路径：路径类型不符、经过不受信任的符号链接，或无法读取。状态行会说明原因，应用操作也会拒绝处理。读取受保护的目标时，状态检查可能会使用 `sudo`。

在 `status` 和 `apply` 中使用 `--prompt-secrets`，可提示输入缺失的[密钥输入](/bootstrap/secrets.html)，而不是直接失败。`mise bootstrap plan` 会按顺序先创建受管理的父目录，再创建文件；删除时则先移除子项，再移除父目录。

## mise 如何应用更改

mise 会比较内容、类型、权限模式、所有者和用户组，只更改不一致的项目。文件会先写入目标目录下的临时文件，再重命名覆盖目标，因此读取者不会看到只写入了一部分的文件。

每项更改都会尽可能以你的身份运行，因此你有写入权限的路径无需 `sudo`。如果文件系统因权限错误拒绝更改，mise 会通过 `sudo` 重试该操作以及同批次的剩余更改。有些更改始终需要 `sudo`：声明 `owner` 或 `group`、替换其他类型的路径，以及递归删除。如果你无法读取目标或搜索其某个父目录，mise 也会通过 `sudo` 检查。文件内容会通过标准输入传给提权辅助程序，不会出现在命令行中。设置 [`system_packages.sudo = false`](/configuration/settings.html#system_packages.sudo) 可禁止提权；此时需要 root 权限的更改会失败，除非 mise 本身已以 root 身份运行。

以你的身份运行更改时，会像处理其他路径一样跟随符号链接的父目录，因此当 `~/.ssh` 是符号链接时，`~/.ssh/config` 仍可正常使用。以 root 身份运行更改时，mise 会逐级解析父目录。只有当符号链接位于 root 拥有且其他用户无法写入的目录中时（例如 macOS 上的 `/etc`），mise 才会跟随该链接。其他符号链接父目录都会被拒绝，因为控制该链接的用户可能会将 root 的写入重定向到 `/etc/shadow` 等文件。状态和试运行会将此类目标报告为 `unknown`，并指出所经过的符号链接；应用操作则会失败。请改为声明解析后的路径。mise 自身以 root 身份运行时，所有更改都会按此方式处理。

如果目标类型不符（例如将目录声明为文件），状态会显示 `unknown`，应用操作会保留该目标。设置 `replace = true` 可替换不同类型的路径。文件只能替换空目录；要删除含有内容的目录，请将其声明为不存在并设置 `recursive = true`。

## 参考

| 键             | 适用对象    | 值                                                                           | 默认值                                                    |
| -------------- | ----------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `source`       | 文件        | 读取文件内容的源路径                                                          |                                                           |
| `content`      | 文件        | 内联内容                                                                      |                                                           |
| `template`     | 文件        | `true` 表示将内容作为模板渲染                                                  | `false`                                                   |
| `remove_empty` | 文件        | `true` 表示模板渲染结果为空时删除目标；需要设置 `template`                     | `false`                                                   |
| `owner`        | 两者        | 用户名                                                                        | 不管理                                                    |
| `group`        | 两者        | 用户组名称                                                                    | 不管理                                                    |
| `mode`         | 两者        | 八进制字符串，例如 `"0640"`                                                  | 有内容的文件为 `"0644"`，目录为 `"0755"`               |
| `state`        | 两者        | `"present"` 或 `"absent"`                                                   | `"present"`                                              |
| `recursive`    | 目录        | `true` 表示删除目录内容；仅适用于 `state = "absent"`                         | `false`                                                   |
| `replace`      | 两者        | `true` 表示替换类型不同的路径                                                  | `false`                                                   |
| `phase`        | 两者        | `"pre-packages"` 或 `"post-packages"`                                       | `"post-packages"`                                        |
| `os`           | 两者        | 单个选择器或选择器列表                                                        | 所有平台                                                  |
| `notify`       | 两者        | `[bootstrap.services]` 中的系统服务名称                                       | `[]`                                                      |

不存在的文件不能设置 `source`、`content` 或 `remove_empty`。文件未设置 `source` 或 `content`，且也没有设置 `mode`、`owner` 或 `group` 时，会报错。

### JSON 输出

`mise bootstrap plan`、`mise bootstrap status` 和 [`mise bootstrap files status`](/cli/bootstrap/files/status.html) 的 JSON 输出会为每个文件和目录包含一个 `origin` 对象，其中标明声明该条目的配置文件、该配置的 `config_root`、文件名中包含的任何[配置环境](/configuration/environments.html)，以及使用 `source` 时解析后的源路径。路径是有效 UTF-8 时会作为普通字符串输出。在 Unix 上，包含其他字节的路径会编码为 `mise:path-bytes:<base64url>`，因此不会丢失信息。

## 故障排查

| 问题                                                     | 处理方法                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 应用操作因文件父目录不存在而失败                         | 在 `[bootstrap.directories]` 中声明父目录；参见[创建目录](#create-directories)                                                        |
| 路径状态显示为 `unknown`                                 | 在 `mise bootstrap files status` 中查看原因。类型不符时设置 `replace = true`，或声明经过符号链接解析后的路径                         |
| 需要 root 权限的更改在无终端时失败                       | 只有无需密码时，mise 才会在此处使用 `sudo`。请以 root 运行 mise、配置免密 `sudo`，或以交互方式应用                                   |
| 状态中缺少某个条目                                       | 该条目的 `os` 选择器与当前机器不匹配                                                                                                  |
| Windows 上的 Bootstrap 报错 "only supported on Unix"    | 在 Windows 机器加载的配置条目中添加 `os = "unix"`                                                                                    |

## 另请参阅

- [Bootstrap](/bootstrap.html#how-it-runs) 介绍文件在执行顺序中的位置。
- [密钥输入](/bootstrap/secrets.html) 介绍文件模板中的凭据。
- [服务](/bootstrap/services.html#system-services) 介绍 `notify` 会重新加载的服务。
