---
description: "通过 mise.toml 使用 nftables、firewalld 或 UFW 管理 Linux 主机防火墙，并兼顾其他工具添加的规则。"
socialDescription: "通过 mise.toml 使用 nftables、firewalld 或 UFW 管理 Linux 主机防火墙。"
---

# Linux 防火墙

在 `[bootstrap.linux.firewall]` 中声明 Linux 主机防火墙，mise 会使用 nftables、firewalld 或 UFW 应用配置。mise 会将自己的规则与其他工具或用户添加的规则分开管理，因此也可以在已有防火墙的主机上启用。

## 示例

以下示例会拒绝所有入站流量，仅允许来自任何地址的 HTTPS 流量，以及来自某个管理地址的 SSH 流量。应用前，请将 `203.0.113.10/32` 替换为你的网络地址，并将 `22` 替换为 SSH 端口。`backend = "auto"` 会使用已安装的防火墙，不会安装防火墙。

```toml
[bootstrap.linux.firewall]
backend = "auto"
default_incoming = "deny"
default_outgoing = "allow"

[[bootstrap.linux.firewall.rules]]
name = "https"
port = 443
protocol = "tcp"

[[bootstrap.linux.firewall.rules]]
name = "ssh-admin"
port = 22
protocol = "tcp"
source = "203.0.113.10/32"
action = "limit"
```

使用 [`mise bootstrap firewall status`](/cli/bootstrap/firewall/status.html) 检查策略，通过 `--dry-run` 预览命令，然后使用 [`mise bootstrap firewall apply`](/cli/bootstrap/firewall/apply.html) 应用配置：

```sh
mise bootstrap firewall status
mise bootstrap firewall apply --dry-run
mise bootstrap firewall apply
```

完整的 [`mise bootstrap`](/bootstrap.html) 会在软件包、文件和系统服务之后、Compose 项目之前应用防火墙配置。

## 避免将自己锁在主机外 {#ssh-lockout-protection}

通过 SSH 运行 mise 且入站策略设为 `deny` 或 `reject` 时，mise 会读取 `SSH_CONNECTION`。除非有一条有效的入站 TCP `allow` 或 `limit` 规则覆盖客户端地址、服务器地址和 SSH 端口，且未指定 `interface`，否则 mise 会拒绝应用配置。上方示例中的规则会允许来自 `203.0.113.10`、连接到 22 端口的客户端。

在存在覆盖连接的规则前，`mise bootstrap firewall apply` 和 `mise bootstrap` 会拒绝运行，且不会更改任何内容。只读命令 `mise bootstrap firewall status`、`apply --dry-run`、`mise bootstrap status`、`mise bootstrap plan` 和 `mise bootstrap --dry-run` 则会将防火墙状态报告为 `unknown` 并说明原因。此时 dry run 会警告需要手动处理，但仍以状态码 0 退出，因此 CI 中的 `mise bootstrap --dry-run` 检查无法发现锁定风险。以下情况 mise 也会拒绝应用：

- 缺少 `SSH_CONNECTION`（例如它被 `sudo` 移除），并且 mise 检测到父进程是 `sshd`，或无法检查进程的祖先关系。
- 覆盖当前连接的 `deny` 或 `reject` 规则排在 allow 规则之前（nftables 和 UFW），或者存在任何覆盖当前连接的规则（firewalld 无法保证 allow 规则优先生效）。

只有在你有其他方式访问主机时（例如云服务商控制台），才设置 `allow_lockout = true`。

各后端切换到新规则集时都不会出现空档：nftables 会在一个事务中替换规则表；firewalld 会修改永久策略后只重新加载一次；UFW 则先添加新规则，再移除旧规则，最后应用默认策略。规则集只应用一部分时不会中断当前会话。

## 选择后端 {#backends}

| `backend`          | mise 管理的内容                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"auto"`（默认）   | 若早先 mise 运行时使用的后端仍已安装，则继续使用；否则依次选择正在运行的 firewalld 或 UFW，再选择首先检测到的 nftables、firewalld 或 UFW |
| `"nftables"`       | 独立的 `inet mise_bootstrap` 表，保存到 `/etc/mise/bootstrap/firewall.nft`，并由 `mise-bootstrap-firewall.service` 在启动时加载 |
| `"firewalld"`      | 永久策略 `mise-bootstrap-in` 和 `mise-bootstrap-out`；如果 firewalld 未运行，mise 会启动它 |
| `"ufw"`            | 按声明顺序管理注释为 `mise:<name>` 的规则；规则就位后 mise 会启用 UFW |

无论 `default_incoming` 如何设置，nftables 输入链都会先于声明的规则接受已建立和相关连接、回环流量、ICMP 和 ICMPv6。mise 会在加载前检查生成的规则集；firewalld 则会在重新加载前验证其永久配置。

如果指定的后端命令未安装，apply 会失败，而不会回退到其他后端。`status` 和 `plan` 会显示当前使用的后端。后端发生变更时（例如从 UFW 改为 nftables），mise 会在 apply 过程中移除旧后端中的规则。

### 在同一次运行中安装后端

由于 `mise bootstrap` 会在软件包和系统服务之后应用防火墙，因此可以在一份配置中先安装后端，再应用策略：

```toml
[bootstrap.packages]
"apt:nftables" = "latest"

[bootstrap.linux.firewall]
backend = "nftables"
default_incoming = "deny"
# plus rules, such as the SSH rule from the example above
```

单独运行 `mise bootstrap firewall apply` 不会安装软件包，因此首次配置时请运行完整的 `mise bootstrap`。

## 编写规则

每个 `[[bootstrap.linux.firewall.rules]]` 条目代表一条规则。mise 根据 `name` 识别规则，因此请保持名称稳定。

| 字段          | 可用值                                     | 默认值       | 说明                                                           |
| ------------- | ------------------------------------------ | ------------ | -------------------------------------------------------------- |
| `name`        | 最多 64 个 ASCII 字母、数字、`-`、`_`        | 必填         | 在此防火墙内必须唯一                                           |
| `state`       | `"present"`、`"absent"`                    | `"present"`  | `"absent"` 会移除 mise 先前添加的规则                         |
| `direction`   | `"incoming"`、`"outgoing"`                | `"incoming"` |                                                                |
| `action`      | `"allow"`、`"limit"`、`"deny"`、`"reject"` | `"allow"`    | `"limit"` 仅支持入站 TCP，且 firewalld 不支持                  |
| `protocol`    | `"tcp"`、`"udp"`、`"sctp"`、`"dccp"`      | 任意         | UFW 只支持 `"tcp"` 和 `"udp"`                                |
| `port`        | 数字或范围，例如 `"8000-8010"`              | 任意         | 需要同时设置 `protocol`                                        |
| `source`      | IPv4 或 IPv6 CIDR，例如 `"10.0.0.0/8"`      | 任意         |                                                                |
| `destination` | IPv4 或 IPv6 CIDR                           | 任意         | 地址族必须与 `source` 相同                                     |
| `interface`   | 接口名称，例如 `"eth0"`                     | 任意         | 仅 nftables 和 UFW 支持                                        |

在 nftables 和 UFW 中，规则会按声明顺序应用；firewalld 则会自行对策略中的规则排序。如果规则需要的功能不受所选后端支持，mise 会要求你改选其他后端，而不会应用较弱的规则。

`action = "limit"` 会限制每个来源地址的新建入站 TCP 连接速率。UFW 使用自身的限速机制：某地址在 30 秒内尝试连接 6 次后会被拒绝。nftables 后端允许先突发 5 次，之后会丢弃某地址每分钟超过 12 次的新连接。这两个后端的限速规则并不相同。firewalld 只能对整条规则进行限速，这会导致单个地址耗尽所有地址共享的限额，因此 mise 不接受 firewalld 上的 `limit` 规则。

## 配置的合并方式

多个配置文件声明 `[bootstrap.linux.firewall]` 时，每个顶层键都采用最靠近项目的值；规则则按 `name` 合并，更靠近项目的规则会替换同名继承规则。在同一个文件中重复声明名称会导致错误。

## 移除规则或防火墙 {#ownership-and-deletion}

从配置中删除规则或整个配置段，都不会更改主机上的规则。mise 会保留它应用的规则，直到你显式移除。因此，不同配置文件可以分别添加规则而不会相互删除。

- 要移除一条规则，请保留其 `name` 并将 `state` 设为 `"absent"`。
- `state = "disabled"` 会从运行中的防火墙移除 mise 的策略，但保留规则记录。对于 UFW，此设置会禁用整台主机上的 UFW。
- `state = "absent"` 会删除 mise 的规则及对应记录，但保留其他规则。
- `exclusive = true` 会删除当前配置未声明的所有 mise 规则。对于 UFW，此操作会运行 `ufw reset`，同时删除并非由 mise 创建的规则。

status 会通过 `coexisting` 或 `exclusive` 显示上一种选择。禁用或删除防火墙、移除规则以及使用 exclusive 模式时，确认提示会将其标记为破坏性变更。`--yes` 和非交互运行会跳过该提示，因此应用前请检查 `exclusive`。使用 UFW 时，`apply --dry-run` 预览会列出 exclusive 模式将运行的 `ufw --force reset` 和 `ufw default` 策略命令。

## 预览和应用

```sh
mise bootstrap firewall status            # 查看后端、策略和各条规则
mise bootstrap firewall status --json     # 以 JSON 格式输出相同信息
mise bootstrap firewall status --missing  # 任何内容需要变更时返回 1
mise bootstrap firewall apply --dry-run   # 显示后端命令
mise bootstrap firewall apply             # 确认后应用
mise bootstrap firewall apply --yes       # 无需提示直接应用
```

plan 描述 mise 将执行的变更，不会检查服务是否可访问。mise 的规则只过滤进出主机本身的流量。转发流量（例如连接到 Docker 为容器发布的端口）不会经过这些规则；主机上的其他防火墙工具仍可能拦截或放行流量。请从使用各服务的网络测试其可达性。

## 参考

| 键                 | 可用值                                                        | 默认值      |
| ------------------ | ------------------------------------------------------------- | ----------- |
| `backend`          | `"auto"`, `"nftables"`, `"firewalld"`, `"ufw"`                | `"auto"`    |
| `state`            | `"enabled"`、`"disabled"`、`"absent"`                        | `"enabled"` |
| `default_incoming` | `"allow"`、`"deny"`、`"reject"`                             | `"deny"`    |
| `default_outgoing` | `"allow"`、`"deny"`、`"reject"`                             | `"allow"`   |
| `exclusive`        | `true` 会删除本配置未声明的 mise 规则                         | `false`     |
| `allow_lockout`    | `true` 会跳过 [SSH 锁定保护检查](#ssh-lockout-protection)      | `false`     |
| `rules`            | [规则](#write-rules)数组                                       | `[]`        |

### 权限

管理防火墙需要 root 权限，即使只是读取当前状态也不例外。你不是 root 时，mise 会通过 `sudo` 运行防火墙辅助程序来执行 `status`、`plan` 和 `apply`，并通过标准输入而非 shell 传递计划。设置 [`system_packages.sudo = false`](/configuration/settings.html#system_packages.sudo) 可禁止提权。mise 会将已应用的配置记录在 `/var/lib/mise/bootstrap/firewall.json` 中。

## macOS 和 Windows 上的行为

防火墙管理仅支持 Linux。在 macOS 和 Windows 上，`mise bootstrap` 与 `mise bootstrap plan` 会跳过此配置段，并发出警告 `ignoring [bootstrap.linux.firewall] on non-Linux host`。`mise bootstrap firewall apply` 会失败，而 `mise bootstrap firewall status` 会报告平台不受支持。

mise 仍会在所有平台解析此配置段。无效值（例如 `backend = "iptables"`）会导致加载该配置的 Mac 报错，而不只是应用配置的 Linux 机器报错。

要避免此警告，请将配置段放在只有 Linux 机器会加载的配置中，例如只有 Linux 机器会选择的[机器模块](/bootstrap/modules.html)，或启用了[平台环境](/configuration/environments.html#platform-environments)的 `mise.linux.toml` 文件。

## 故障排查

| 问题                                                        | 处理方法                                                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| "refusing firewall default incoming deny over SSH"          | 添加一条覆盖客户端地址和 SSH 端口的入站 TCP 规则，或参阅[锁定保护](#ssh-lockout-protection)                                              |
| "firewall backend 'ufw' requires command 'ufw'"             | 安装该后端，或使用 `backend = "auto"`                                                                                                         |
| 规则报错 "select backend"                                   | 该规则使用了后端不支持的 `limit`、`interface` 或协议；请修改规则或更换后端                                                                    |
| 策略拒绝流量，但容器端口仍可访问                            | Docker 会绕过这些规则转发已发布端口；请在 Compose 文件中将端口发布到 `127.0.0.1`，或通过 Docker 限制访问                                    |
| Mac 上出现 "only supported on Linux"                       | `mise bootstrap firewall apply` 仅在 Linux 上运行；`mise bootstrap` 会在 Mac 上跳过此配置段。参阅 [macOS 和 Windows](#on-macos-and-windows) |

## 另请参阅

- [引导配置](/bootstrap.html#how-it-runs)：查看防火墙在执行顺序中的位置。
- [Docker Compose 项目](/bootstrap/compose.html)：了解如何暴露防火墙允许访问的服务。
