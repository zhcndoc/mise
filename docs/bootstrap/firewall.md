---
description: "[bootstrap.linux.firewall] 以声明方式管理 Linux 主机防火墙。"
---

# Linux 主机防火墙

`[bootstrap.linux.firewall]` 以声明方式管理 Linux 主机防火墙。它支持原生 nftables、firewalld 策略和 UFW，同时将 mise 管理的规则与无关的主机规则分开。

此示例允许 HTTPS，并限制来自一个管理员地址的 SSH。应用之前，请将 `203.0.113.10/32` 替换为实际的管理网络，并使用主机的真实 SSH 端口。确保所选的防火墙命令已安装；`backend = "auto"` 会选择可用的后端，而不会安装后端。

```toml
[bootstrap.linux.firewall]
backend = "auto"
state = "enabled"
default_incoming = "deny"
default_outgoing = "allow"

[[bootstrap.linux.firewall.rules]]
name = "https"
port = 443
protocol = "tcp"
action = "allow"

[[bootstrap.linux.firewall.rules]]
name = "ssh-admin"
port = 22
protocol = "tcp"
source = "203.0.113.10/32"
action = "limit"
```

防火墙配置收敛在软件包、特权文件和系统服务之后运行，但在 Compose 项目之前运行。这样，配置就能在应用策略之前安装并启动所选的防火墙后端。

## 后端

`backend` 接受：

- `"auto"`（默认）：重用之前一次 mise 运行所记录的后端，然后优先使用已处于活动状态的 firewalld 或 UFW 安装；如果可用，则按 nftables、firewalld、UFW 的顺序使用。
- `"nftables"`：维护一个隔离的 `inet mise_bootstrap` 表和持久化的 `mise-bootstrap-firewall.service`。运行时替换通过经过语法检查的原子 nft 事务完成。
- `"firewalld"`：维护永久的 `mise-bootstrap-in` 和 `mise-bootstrap-out` 策略，并且仅在其永久配置验证通过后重新加载 firewalld。
- `"ufw"`：按声明顺序维护带有 `mise:<name>` 注释的规则，在默认策略之前应用这些规则，并在所有规则安装完成后启用 UFW。

显式选择的后端在其命令不可用时会安全失败。
所选后端和实际生效的状态可在 `status` 和 `plan` 中查看。

## 策略和规则

`state` 接受 `"enabled"`（默认值）、`"disabled"` 或 `"absent"`。
从配置中移除防火墙部分不会执行任何操作：必须明确请求
`state = "absent"` 才会删除。`disabled` 会保留 mise 保存的规则
模型，但会从运行时移除 nftables/firewalld 策略；对于 UFW，
则会全局禁用 UFW。`absent` 只会移除由 mise 管理的规则和
元数据。禁用和删除会被视为破坏性更改。

`default_incoming` 和 `default_outgoing` 接受 `"allow"`、`"deny"` 或
`"reject"`。默认情况下，传入流量被拒绝，传出流量被允许。

每个 `[[bootstrap.linux.firewall.rules]]` 支持：

- `name`（必需）：用于协调规则的稳定 ASCII 标识符
- `state`：`"present"`（默认值）或 `"absent"`
- `direction`：`"incoming"`（默认值）或 `"outgoing"`
- `action`：`"allow"`（默认值）、`"limit"`、`"deny"` 或 `"reject"`
- `protocol`：`"tcp"`、`"udp"`、`"sctp"` 或 `"dccp"`
- `port`：数字或包含边界的字符串范围，例如 `"8000-8010"`
- `source` 和 `destination`：IPv4 或 IPv6 CIDR 网络
- `interface`：接口名称（仅 nftables 和 UFW）

端口必须指定协议。一条规则不能混用 IPv4 和 IPv6 的源网络及
目标网络。UFW 仅支持 TCP 和 UDP；firewalld 策略规则不安全地支持
按规则匹配接口，因此对于这些组合，mise 会要求你选择
nftables 或 UFW，而不会悄悄弱化规则。

`action = "limit"` 会根据源地址限制新的传入 TCP 连接速率。
UFW 使用其原生的限制操作，在 30 秒内尝试连接六次后拒绝某个地址。
nftables 后端使用独立且有界的 IPv4 和 IPv6 计量器，速率为每分钟 12 个令牌，突发容量为五个数据包。
这些算法有意采用各后端的原生实现，而不是完全等效的实现。firewalld 只能限制整条规则，因此 mise 会拒绝该后端上的 limit 规则，而不是允许单个源耗尽共享的速率预算。

## 所有权和删除

默认情况下，后续配置会保留之前管理但自身未提及的规则。要显式移除某条规则，请使用同名规则并设置 `state = "absent"`。
这样，移除配置不会造成破坏，并允许分别分层的配置共存。

仅当配置拥有完整防火墙时，才设置 `exclusive = true`。
它会删除未声明的 mise 规则。对于 UFW，独占模式会执行 `ufw reset`，这也会删除无关的 UFW 规则，因此始终会被确认为破坏性操作。

## 预览目标的策略

```sh
mise bootstrap firewall status --json
mise bootstrap firewall apply --dry-run
```

检查所选后端、默认策略、规则顺序和删除操作。其他防火墙系统和容器网络可能会影响同一主机；请从使用该服务的网络验证最终的可达性。计划描述的是 mise 请求的更改，而不是端到端的连接测试。

## SSH 锁定保护

当 bootstrap 通过 SSH 运行且传入策略为 deny 或 reject 时，mise 会在进行更改前检查
`SSH_CONNECTION`。至少有一条现存的传入 TCP allow 或 limit 规则必须覆盖已连接的对等地址、服务器地址和服务器端口，且不能带有 `interface` 限制。否则，apply 会在提权前失败。明确的带外部署可以将 `allow_lockout = true` 作为显式的应急开关。

对于 UFW，规则会在 deny 策略之前按声明顺序安装。nftables 会以原子方式安装完整规则集，firewalld 会在单次经过验证的重新加载之前更改永久策略，因此中间状态不会丢弃活动的 SSH 连接。非独占的 UFW 更新会先暂存一个带有唯一标签的替换规则集，然后再移除之前的 mise 规则；只有在稳定规则生效后，才会替换暂存标签。后续运行会安全地清理因更新中断而遗留的暂存规则。

```sh
mise bootstrap firewall status
mise bootstrap firewall status --json
mise bootstrap firewall status --missing
mise bootstrap firewall apply --dry-run
mise bootstrap firewall apply --yes
```

防火墙管理仅支持 Linux，并使用与 bootstrap 账户、文件和服务相同的受限特权辅助程序协议。类型化计划通过标准输入传递；配置值绝不会插入 root shell 命令中。
