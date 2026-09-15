---
description: "mise 可以限制由 mise exec 和 mise run 启动的命令对文件系统、网络和环境的访问"
---

# 沙箱

mise 可以限制由
`mise exec` 和 `mise run` 启动的命令对文件系统、网络和环境的访问。限制使用主机操作系统，
但 Linux 和 macOS 上的支持不同。在依赖策略之前，请先阅读[平台支持](#platform-support)；
Windows 不会强制执行文件系统或网络限制。

沙箱应用于子命令。mise 会在该命令的沙箱之外进行配置评估、工具安装和其他准备工作。对于不受信任的配置，
请参阅[安全模式](/security.html#safe-mode)。

## 快速开始

任何 `--deny-*` 或 `--allow-*` 标志都会启用相应的限制。在已安装 Node 的项目中：

```sh
# Block network access for a local build
mise exec --deny-net -- npm run build

# Restrict writes to an existing output directory, plus implicit system exceptions
mkdir -p dist
mise exec --allow-write=./dist -- npm run build

# Deny reads, writes, network, and nonessential environment variables,
# then allow reading this project and writing its output
mise exec --deny-all --allow-read=. --allow-write=./dist -- node build.js
```

npm 命令要求存在 `build` 脚本；最后一个命令要求存在 `build.js`。请根据构建实际使用的文件和缓存调整
允许的路径。`--deny-all` 会保留下文所述的[隐式访问](#implicit-access)；它不是一个具有空文件系统的容器。

## CLI 标志

| 标志                   | 描述                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--deny-all`           | 阻止读取、写入、网络和环境变量                                                                             |
| `--deny-read`          | 阻止文件系统读取（系统库和工具目录仍可访问）                                                    |
| `--deny-write`         | 阻止写入，但隐式临时路径和设备路径除外                                                                    |
| `--deny-net`           | 阻止所有网络访问                                                                                               |
| `--deny-env`           | 阻止继承环境变量（必要变量和显式例外仍会传递）                             |
| `--allow-read=<path>`  | 允许从特定路径读取（对其他所有路径隐式启用 `--deny-read`）                                             |
| `--allow-write=<path>` | 允许写入特定路径（对其他所有路径隐式启用 `--deny-write`） |
| `--allow-net=<host>`   | 在 macOS 上请求主机例外（请参阅平台限制）；在 Linux 上会被拒绝                                         |
| `--allow-env=<var>`    | 允许传递特定环境变量（对其他所有变量隐式启用 `--deny-env`）。支持通配符：`--allow-env='MYAPP_*'` |

这些标志可同时用于 `mise exec`（`mise x`）和 `mise run`。

## 默认限制

通过以下设置，可以为每次 `mise exec` 和 `mise run` 调用启用沙箱拒绝规则：

```toml
[settings.sandbox]
deny_all = true
```

可用设置与拒绝标志对应：`deny_all`、`deny_read`、`deny_write`、`deny_net` 和
`deny_env`。任务和 CLI 标志仍可根据需要添加 `allow_read`、`allow_write`、`allow_net` 或
`allow_env` 例外。

## 任务沙箱

Tasks can declare restrictions next to the command. This example assumes Node is configured,
`npm run build` exists, and the output directory has been created:

```toml
[tasks.build]
run = "npm run build"
deny_net = true
allow_write = ["./dist"]

[tasks.lint]
run = "npm run lint"
deny_write = true
```

```sh
mkdir -p dist
mise run build
```

全局设置、任务拒绝规则和 CLI 拒绝标志会合并。任务和 CLI 允许列表也会合并；CLI 标志会添加例外，而不是替换任务策略。任务路径相对于任务的工作目录，CLI 路径相对于调用 mise 的目录。

主机例外标志适用于需要网络访问的 macOS 任务：

```sh
mise run --allow-net=registry.npmjs.org build
```

包管理器可能会联系其他主机，并在输出目录之外写入缓存或锁定文件。只允许实际命令所需的资源。Linux 会拒绝
`--allow-net`；macOS 也可能拒绝下文所述的生成配置文件。对于不需要互联网套接字的命令，请使用
`--deny-net`。

## 隐式访问

当文件系统限制处于活动状态时，某些路径仍然可访问，以便工具正常运行：

### 始终可读

- **系统路径**（Linux）：`/usr`、`/lib`、`/lib64`、`/bin`、`/sbin`、`/etc`、`/dev`、`/proc`、`/sys`、`/tmp`、`/nix`、`/snap`、`/home/linuxbrew`
- **系统路径**（macOS）：`/System`、`/Library`、`/usr`、`/bin`、`/sbin`、`/dev`、`/etc`、`/var/run`、`/tmp`、`/private/tmp`、`/private/etc`、`/private/var/run`、`/opt/homebrew`、`/nix`
- **Mise 数据目录**：已配置的 `MISE_DATA_DIR`，而不仅是单个工具二进制文件

### 始终可写

- `/tmp`（在 macOS 上为 `/private/tmp`）
- `/dev`（用于 `/dev/null`、`/dev/tty` 等）

### 隐式规则

- `--allow-write` 路径会被隐式视为可读
- `--allow-read` 路径包含上面的系统必需路径。

当环境过滤处于活动状态时，`PATH`、`HOME`、`USER`、`SHELL`、`TERM`、`COLORTERM`
和 `LANG` 仍然可用，此外还有显式允许的变量以及任务专用的传递／缓存环境输入。即使使用
`--deny-net`，Unix 套接字仍然可用。

## 平台支持

| 功能                                 | Linux    | macOS    |
| --------------------------------------- | -------- | -------- |
| 拒绝／允许读取                        | Landlock | Seatbelt |
| 拒绝／允许写入                       | Landlock | Seatbelt |
| 拒绝所有网络                        | seccomp  | Seatbelt |
| 按主机允许网络（`--allow-net=<host>`） | 已拒绝 | Seatbelt |
| 环境过滤                           | 内置 | 内置 |
| Docker 支持                          | 是      | 不适用      |

### Linux

文件系统沙箱使用 [Landlock](https://landlock.io/)（自 Linux 5.13 起可用）。网络沙箱使用 [seccomp-bpf](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html) 阻止创建 inet 套接字，同时允许 Unix 套接字。

如果 Landlock 不可用，或无法应用文件系统限制，则命令会失败。

**限制**：Linux 不支持按主机进行网络过滤（`--allow-net=<host>`）。
mise 会在执行命令前返回错误；不会静默地允许所有网络访问。使用 `--deny-net` 阻止互联网套接字，
或者在需要时省略网络限制。

**限制**：构建沙箱时必须存在允许列表条目。Landlock 会将每条规则绑定到一个打开的描述符，因此尚未创建的路径无法由规则指定，mise 会警告该规则已被丢弃。如果其他规则涵盖了该路径，例如允许访问其祖先目录，则任务仍然可以访问该路径，但被丢弃的规则不会以任何方式授予额外访问权限。若要让任务创建某个内容，请允许一个已经存在且包含该内容的目录。

```toml
[tasks.install]
run = "npm install"
allow_read = ["package.json", "~/.npm"]
# not ["node_modules"] — that does not exist until the task creates it
allow_write = [".", "~/.npm"]
```

Landlock 无法将创建限制为单个名称，因此允许访问包含目录必然会授予对其中其他所有内容的写入权限。这仅适用于 Linux；在 macOS 上，Seatbelt 规则是路径模式，不要求路径存在。

### macOS

沙箱使用 Apple 的 `sandbox-exec`（Seatbelt）和生成的配置文件。构建配置文件时，网络主机例外会将主机名解析为 IP 地址。预期策略允许访问这些 IP，而不是特定的 HTTP 主机名或 URL 路径；共享同一 IP 的服务也可能可以访问。

**限制**：`sandbox-exec` 可能会拒绝生成的主机例外配置文件，并显示
`host must be * or localhost in network address`。这会阻止子命令启动；不会回退到不受限制的网络访问。如果需要访问选定的主机，请在你的 macOS 版本上验证该策略，并在
`--allow-net` 无法表达所需策略时使用外部网络控制。

当读取受到限制时，Seatbelt 要求进程启动时能够访问根目录。沙箱进程可以直接枚举 `/` 下的名称，但无法读取未允许的条目或其后代。Mise 还允许访问通向上述每个可读路径的目录的元数据，包括系统路径、`MISE_DATA_DIR` 以及由 `--allow-read` 或 `--allow-write` 指定的任何路径。`realpath` 会逐个组件解析路径，因此如果没有此权限，即使位于完全可读的目录中，可移植的可执行文件也无法解析自身的位置。该权限仅限元数据：可以对这些目录执行 stat，但不能列出目录内容，其中的其他条目仍然不可读。

### Windows

Windows 不支持文件系统和网络沙箱。mise 会发出警告，并在没有这些操作系统限制的情况下运行命令。不要将带有沙箱标志的 Windows 调用成功执行视为文件系统或网络策略已强制执行的证据。

## 示例

### 限制脚本写入 {#run-untrusted-script-with-no-filesystem-writes}

```bash
mise x --deny-write -- bash script.sh
```

### 在网络隔离下构建

```bash
mise x --deny-net -- make build
```

### 使用最小权限运行工具

```bash
mkdir -p dist
mise exec --deny-all --allow-read=. --allow-write=./dist -- node build.js
```

### 将环境变量限制在某个命名空间

```bash
# Pass MYAPP_* in addition to the essential variables
mise x --allow-env='MYAPP_*' -- node app.js

# 允许多个模式
mise x --allow-env='MYAPP_*' --allow-env='NODE_*' -- node app.js
```

### 沙箱化任务定义

在 Linux 上运行此任务之前创建 `coverage/` 和 `node_modules/.cache/`，并根据测试运行器调整路径。允许
`NODE_*` 和 `npm_*` 也会暴露任何匹配的凭据或运行时选项；如果需要更严格的策略，请列出确切的变量名。

```toml
[tasks.test]
run = "npm test"
deny_net = true
deny_write = true
allow_write = ["./coverage", "./node_modules/.cache"]
allow_env = ["NODE_*", "npm_*"]
```
