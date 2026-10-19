---
description: "限制 mise exec 和 mise run 启动的命令可以访问的文件、网络和环境变量。"
socialDescription: "限制 mise exec 和 mise run 启动的命令可访问的文件、网络和环境变量。"
---

# 沙箱

[`mise exec`](/cli/exec.html) 和 [`mise run`](/cli/run.html) 可以限制启动命令能够读取和写入的文件、访问的网络地址，以及可见的环境变量。添加 `--deny-*` 或 `--allow-*` 标志，也可以在任务中设置对应属性。

沙箱只约束该命令。mise 加载配置、安装工具和运行钩子时不受其限制。若要加载未经审查的配置，请改用[安全模式](/security.html#safe-mode)。

## 平台支持

| 限制                                                                              | Linux                                   | macOS                                   | Windows          |
| --------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------- | ---------------- |
| Reads and writes (`--deny-read`, `--deny-write`, `--allow-read`, `--allow-write`) | Landlock, Linux 5.13 or later           | Seatbelt (`sandbox-exec`)               | Not enforced     |
| All network access (`--deny-net`)                                                 | seccomp, on x86_64 and arm64            | Seatbelt                                | Not enforced     |
| Access to particular hosts (`--allow-net`)                                        | Not supported; mise exits with an error | Not supported; mise exits with an error | Not enforced     |
| Environment variables (`--deny-env`, `--allow-env`)                               | Filtered by mise                        | Filtered by mise                        | Filtered by mise |

在 Windows 上，mise 会过滤环境变量，并警告文件、网络和进程限制不受支持，随后不应用这些限制直接运行命令。在容器中，Landlock 和 seccomp 由宿主机内核提供；如果 Landlock 不可用，命令会失败，而不会不受限制地运行。详见[平台详情](#platform-details)。

## 快速开始

<a id="run-untrusted-script-with-no-filesystem-writes"></a>

```sh
# Block network access
mise exec --deny-net -- npm run build

# Run a script that must not write files outside /tmp
mise exec --deny-write -- bash script.sh

# Write only to ./dist (on Linux it must already exist)
mkdir -p dist
mise exec --allow-write=./dist -- npm run build

# Deny everything, then allow reading the project and writing ./dist
mise exec --deny-all --allow-read=. --allow-write=./dist -- node build.js

# Pass only MYAPP_* variables, plus the essential ones
mise exec --allow-env='MYAPP_*' -- node app.js
```

`--deny-all` 仍会保留程序启动所需的[隐式访问权限](#implicit-access)，例如访问系统库和 `/tmp`。请将命令使用的缓存目录（例如 `~/.npm`）加入允许路径。在 Linux 上，允许路径必须在命令启动前存在（[原因](#linux)）。

## 标志和任务属性 {#cli-flags}

每个标志都可用于 `mise exec` 和 `mise run`，并且都有含义相同的任务属性。重复使用 `--allow-*` 标志可允许更多路径或变量。

| 标志                   | 任务属性           | 说明                                                                                              |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `--deny-all`           | `deny_all`         | 启用文件读取、写入、网络和环境变量限制                                                          |
| `--deny-read`          | `deny_read`        | 阻止读取，但保留[隐式路径](#implicit-access)                                                      |
| `--deny-write`         | `deny_write`       | 阻止写入，但允许写入 `/tmp` 和 `/dev`                                                          |
| `--deny-net`           | `deny_net`         | 阻止 IPv4 和 IPv6 socket；Unix socket 仍可使用                                                    |
| `--deny-env`           | `deny_env`         | 仅传递[必要变量](#environment-variables)                                                         |
| `--allow-read=<path>`  | `allow_read`       | 允许读取指定路径下的内容，并阻止读取其他路径                                                      |
| `--allow-write=<path>` | `allow_write`      | 允许读取和写入指定路径下的内容，并阻止写入其他路径                                                |
| `--allow-env=<var>`    | `allow_env`        | 传递指定变量或 `*` 模式匹配的变量，并阻止传递其他变量                                            |
| `--allow-net=<host>`   | `allow_net`        | 在任何平台上都不起作用；详见[访问特定主机](#access-to-particular-hosts)                            |
|                        | `pass_through_env` | 实验性功能。传递变量但不将其加入任务缓存键；此属性本身不会过滤其他变量                            |

## 对所有命令启用沙箱 {#default-restrictions}

`sandbox.*` 设置会将拒绝规则应用于每个 `mise exec` 和 `mise run` 命令：

```toml
[settings]
sandbox.deny_net = true
```

可用的设置包括 [`sandbox.deny_all`](/configuration/settings.html#sandbox.deny_all)、`sandbox.deny_read`、`sandbox.deny_write`、`sandbox.deny_net` 和 `sandbox.deny_env`，也可使用 `MISE_SANDBOX_DENY_NET` 等环境变量。将这些设置放在项目的 `mise.toml` 中，可应用于所有运行该项目任务的用户；也可以放在全局配置中。任务和标志仍可允许特定路径和环境变量，但无法允许特定主机。

## 任务沙箱

Declare restrictions next to the command:

```mise-toml
[tasks.build]
run = "npm run build"
deny_net = true
allow_write = ["./dist"]

[tasks.lint]
run = "npm run lint"
deny_write = true

[tasks.test]
run = "npm test"
deny_net = true
allow_write = ["./coverage", "./node_modules/.cache"]
allow_env = ["NODE_*", "npm_*"]
```

在 Linux 上，首次运行前请先创建 `dist`、`coverage` 和 `node_modules/.cache`。允许 `NODE_*` 和 `npm_*` 也会传递这些名称下的所有凭据或运行时选项；若要收紧规则，请逐一列出确切名称。

设置、任务属性和标志会合并生效。任一处都可以启用限制，任务与标志中的允许列表也会合并，因此标志只是添加例外，不会替换任务列表。`mise run` 上的标志会应用于该命令运行的所有任务，包括依赖任务。

任务中使用的相对路径以任务工作目录为基准，标志中的相对路径则以运行 mise 时所在的目录为基准。路径可以用 `~` 开头，任务路径也可使用 <code v-pre>{{config_root}}</code> 等模板。每个属性的说明请参阅[任务配置参考](/tasks/task-configuration.html)。

## 隐式访问权限

启用文件系统限制后，以下路径仍可访问，以便程序正常启动。

### 始终可读

- Linux: `/usr`, `/lib`, `/lib64`, `/bin`, `/sbin`, `/etc`, `/dev`, `/proc`,
  `/sys`, `/tmp`, `/nix`, `/snap`, `/home/linuxbrew`, and the file
  `/etc/resolv.conf` points to
- macOS: `/System`, `/Library`, `/usr`, `/bin`, `/sbin`, `/dev`, `/etc`,
  `/var/run`, `/tmp`, `/private/tmp`, `/private/etc`, `/private/var/run`,
  `/opt/homebrew`, `/nix`
- mise's data directory (`MISE_DATA_DIR`), so installed tools can run. On Linux
  this also covers `MISE_INSTALLS_DIR` when it is outside the data directory.

`--allow-read` 会在这些路径之外额外允许读取，不会替换它们。允许写入的路径也同时可读。

### 始终可写

- `/tmp`, and `/private/tmp` on macOS
- `/dev`, for `/dev/null`, `/dev/tty` and similar files

### 环境变量

启用环境变量过滤后，命令只能获得 `PATH`、`HOME`、`USER`、`SHELL`、`TERM`、`COLORTERM` 和 `LANG`，以及你明确允许的变量。除非另行允许，`[env]` 中设置的变量也会被移除。`PATH` 仍会包含 mise 添加的工具路径。任务还会保留 `pass_through_env` 中指定的变量，以及缓存 `env` 中的变量。Windows 上还会保留几个额外变量，详见 [Windows](#windows)。

## 沙箱阻止操作时

被阻止的操作会在命令内部失败，具体输出由命令决定。它会收到常规错误，例如 `Permission denied` 或 `Operation not permitted`；DNS 查询被阻止时通常会显示 `Could not resolve host`。mise 不会报告这些错误。

mise 会在命令运行前报告影响沙箱的问题：Linux 上允许路径不存在时会显示警告；使用 `--allow-net` 或 Landlock 不可用时则会报错。

## 访问特定主机

`--allow-net` 和任务属性 `allow_net` 无法将网络访问限制到特定主机：

- 在 Linux 和 macOS 上，mise 会在运行命令前报错退出：`per-host network filtering (--allow-net=<host>) is not supported on Linux`（或 `on macOS`）。Landlock 和 seccomp 无法指定主机，而 Seatbelt 的网络主机仅接受 `*` 或 `localhost`。
- 在 Windows 上，mise 会发出警告，然后不应用网络限制直接运行命令。

若要阻止网络 socket，请使用 `--deny-net`。若命令只能访问特定主机，请在 mise 之外配置防火墙或代理。

## 平台详情

### Linux

文件系统规则使用 Linux 5.13 起提供的 [Landlock](https://landlock.io/)。Landlock 在后续多个内核版本中增加了功能；mise 会使用当前运行内核所支持的功能，因此较旧的内核执行的规则较少。如果 Landlock 不可用或无法应用规则，命令会失败。

网络规则使用 [seccomp-bpf](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html) 过滤器阻止 IPv4 和 IPv6 socket，同时允许 Unix socket。它支持 x86_64 和 arm64；其他体系结构使用 `--deny-net` 时会报错。

命令启动时，每条允许路径都必须存在。Landlock 会将规则绑定到已打开的文件，因此路径不存在时，mise 会丢弃该规则并发出警告：`sandbox: <path> does not exist, so its rule was dropped`。若要让任务创建 `node_modules`，请改为允许其已存在的父目录：

```mise-toml
[tasks.install]
run = "npm install"
allow_write = [".", "~/.npm"] # node_modules does not exist yet
```

允许访问目录就会允许访问其中的所有内容。

### macOS

mise 会将规则写入 Seatbelt 配置文件，并通过 `sandbox-exec` 运行命令。Seatbelt 规则使用路径模式，因此允许路径可以暂时不存在。

`$TMPDIR` 通常指向 `/var/folders` 下的目录，而该位置不在可写列表中。如果程序需要在那里写入临时文件，请使用 `--allow-write="$TMPDIR"` 允许访问。

限制读取时，沙箱中的程序仍可列出 `/` 下一级目录的名称，并查找通往各允许路径的目录；许多运行时需要这些权限来定位自身。但程序不能列出这些目录的内容，也不能读取其中的其他内容。

### Windows

Windows 不提供文件系统、网络或进程沙箱。请求其中任一限制时，mise 会发出警告并在不应用该限制的情况下运行命令，因此带这些标志的命令成功运行并不能证明策略已生效。

环境变量过滤与其他平台相同。除常规变量外，`--deny-env` 还会保留 Windows 程序启动所需的变量：`SystemRoot`、`SystemDrive`、`windir`、`ComSpec`、`PATHEXT`、`TEMP`、`TMP`、`USERPROFILE` 和 `USERNAME`。变量名称匹配时不区分大小写。
