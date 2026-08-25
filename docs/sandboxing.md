# 沙箱化

Mise 支持用于 `mise exec` 和 `mise run` 的轻量级进程沙箱化，灵感来自 [zerobox](https://github.com/afshinm/zerobox)。沙箱化可通过细粒度控制限制文件系统、网络和环境变量访问。无需 Docker，开销极小。

## 快速开始

任何 `--deny-*` 或 `--allow-*` 标志都会隐式启用沙箱：

```bash
# 完全锁定 — 不允许写入、不允许网络、不允许环境变量
mise x --deny-all -- node script.js

# 仅阻止网络
mise x --deny-net -- npm run build

# 阻止写入，但 ./dist 除外
mise x --allow-write=./dist -- npm run build

# 阻止一切，仅允许特定例外
mise x --deny-all --allow-read=. --allow-write=./dist --allow-net=registry.npmjs.org -- npm install
```

## CLI 标志

| 标志                   | 描述                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--deny-all`           | 阻止读取、写入、网络和环境变量                                                                             |
| `--deny-read`          | 阻止文件系统读取（系统库和工具目录仍可访问）                                                    |
| `--deny-write`         | 阻止所有文件系统写入（`/tmp` 除外）                                                                            |
| `--deny-net`           | 阻止所有网络访问                                                                                               |
| `--deny-env`           | 阻止环境变量继承（仅 `PATH`、`HOME`、`USER`、`SHELL`、`TERM`、`LANG` 透传）                          |
| `--allow-read=<path>`  | 允许从特定路径读取（对其他所有内容隐含 `--deny-read`）                                             |
| `--allow-write=<path>` | 允许向特定路径写入（对其他所有内容隐含 `--deny-write`）                                              |
| `--allow-net=<host>`   | 允许连接到特定主机（对其他所有内容隐含 `--deny-net`）                                              |
| `--allow-env=<var>`    | 允许特定环境变量透传（对其他所有内容隐含 `--deny-env`）。支持通配符：`--allow-env='MYAPP_*'` |

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

在 `mise.toml` 中定义的任务可以声明沙箱权限：

```toml
[tasks.build]
run = "npm run build"
deny_net = true
allow_write = ["./dist"]

[tasks.lint]
run = "eslint ."
deny_all = true
allow_read = ["."]

[tasks.install]
run = "npm install"
deny_all = true
allow_read = ["."]
allow_write = ["./node_modules"]
allow_net = ["registry.npmjs.org"]
```

`mise run` 上的 CLI 标志会覆盖任务级配置：

```bash
# 使用任务声明的沙箱运行
mise run build

# 覆盖：还允许访问特定主机的网络
mise run --allow-net=registry.npmjs.org build
```

## 隐式访问

当文件系统限制处于活动状态时，某些路径仍然可访问，以便工具正常运行：

### 始终可读

- **系统路径**（Linux）：`/usr`、`/lib`、`/lib64`、`/bin`、`/sbin`、`/etc`、`/dev`、`/proc`、`/sys`、`/tmp`、`/nix`、`/snap`、`/home/linuxbrew`
- **系统路径**（macOS）：`/System`、`/Library`、`/usr`、`/bin`、`/sbin`、`/dev`、`/etc`、`/var/run`、`/tmp`、`/private`、`/opt/homebrew`、`/nix`
- **Mise 工具目录**：`~/.local/share/mise/installs/...`

### 始终可写

- `/tmp`（在 macOS 上为 `/private/tmp`）
- `/dev`（用于 `/dev/null`、`/dev/tty` 等）

### 隐式规则

- `--allow-write` 路径会被隐式视为可读
- `--allow-read` 路径包含上面的系统必需路径。

## 平台支持

| 功能                                    | Linux              | macOS    |
| --------------------------------------- | ------------------ | -------- |
| 拒绝/允许读取                          | Landlock           | Seatbelt |
| 拒绝/允许写入                          | Landlock           | Seatbelt |
| 拒绝所有网络                            | seccomp            | Seatbelt |
| 按主机网络（`--allow-net=<host>`）     | 不支持（v1）        | Seatbelt |
| 环境变量过滤                            | 内置               | 内置     |
| Docker 支持                             | 是                 | N/A      |

### Linux

文件系统沙箱使用 [Landlock](https://landlock.io/)（自 Linux 5.13 起可用）。网络沙箱使用 [seccomp-bpf](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html) 阻止创建 inet 套接字，同时允许 Unix 套接字。

如果 Landlock 不可用，或无法应用文件系统限制，则命令会失败。

**限制**：在 v1 中，Linux 不支持按主机网络过滤（`--allow-net=<host>`）。在 Linux 上，`--allow-net` 会回退为允许所有网络访问。这在 macOS 上可通过 Seatbelt 实现。

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

使用 Apple 的 `sandbox-exec`（Seatbelt）和生成的配置文件。支持包括按主机网络过滤在内的所有功能。

当读取受到限制时，Seatbelt 要求进程启动时能够访问根目录。沙箱进程可以直接枚举 `/` 下的名称，但无法读取未获允许的条目或其后代。

### Windows

目前 Windows 不支持沙箱。系统会打印警告，命令将在不受沙箱保护的情况下运行。

## 示例

### 运行不允许文件系统写入的不受信任脚本

```bash
mise x --deny-write -- bash untrusted-script.sh
```

### 在网络隔离下构建

```bash
mise x --deny-net -- make build
```

### 使用最小权限运行工具

```bash
mise x --deny-all --allow-read=./src --allow-write=./dist node@20 -- node build.js
```

### 将环境变量限制在某个命名空间

```bash
# 仅传递以 MYAPP_ 开头的环境变量
mise x --allow-env='MYAPP_*' -- node app.js

# 允许多个模式
mise x --allow-env='MYAPP_*' --allow-env='NODE_*' -- node app.js
```

### 沙箱化任务定义

```toml
[tasks.test]
run = "npm test"
deny_net = true
deny_write = true
allow_write = ["./coverage", "./node_modules/.cache"]
allow_env = ["NODE_*", "npm_*"]
```
