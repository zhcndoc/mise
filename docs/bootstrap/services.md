# 系统服务

`[bootstrap.services]` 以声明方式管理现有 Linux
systemd 系统单元的生命周期。[bootstrap.files] 和软件包安装会先执行，
因此服务可以由软件包安装，或作为受管理的单元文件提供。文件变更后，mise
会在应用服务变更前重新加载 systemd。

```toml
[bootstrap.packages]
"apt:docker.io" = "latest"

[bootstrap.services.docker]
state = "running"
enabled = true
```

不带单元后缀的名称会自动添加 `.service`。也接受显式单元名称，例如
`postgresql@16-main.service`，以及套接字和计时器。

## 选项

- `state`：`"running"`（默认）或 `"stopped"`
- `enabled`：该单元是否在启动时启动（默认值为 `true`）
- `masked`：systemd 是否必须阻止该单元启动（默认值为
  `false`）
- `on_change`：更改后的受管理文件或目录通知服务时采取的操作：`"reload_or_restart"`（默认值）、`"reload"`、
  `"restart"` 或 `"none"`

受管理的文件和目录可以通知一个或多个服务。通知仅在资源实际发生更改后运行；试运行会显示相同的操作。对于声明为 `state = "stopped"` 的服务，通知永远不会启动或重启该服务；`on_change` 仅在期望的服务状态为运行时生效。

```toml
[bootstrap.files."/etc/docker/daemon.json"]
content = '{ "log-driver": "local" }'
notify = ["docker"]

[bootstrap.services.docker]
state = "running"
enabled = true
on_change = "reload_or_restart"
```

所有通知名称都会在任何引导变更之前进行验证，因此拼写错误不会导致主机处于部分配置状态。Mise 会运行一次 `daemon-reload`，重新检查所有受影响的单元，并在更改任何服务之前验证每个操作。仅当发生更改的通知源是该单元在 systemd 系统单元搜索目录中的受管理文件时，才会重试缺失的单元（包括实例化单元的 `name@.service` 模板）。来自普通配置文件的通知无法使无关的缺失单元出现，因此仍保持为 `unknown`。这使得通过 `[bootstrap.files]` 新写入的单元可以安全启动，同时不会削弱默认拒绝的安全行为。一旦交互式用户确认了受管理文件的更改，其通知处理程序就会作为该已确认更改的一部分运行；无关的服务偏差仍可单独确认。

`mise bootstrap services status` 和 `mise bootstrap services apply` 仅检查并使服务生命周期状态达到期望状态。它们不会在文件发生更改之前为其合成文件通知。聚合命令 `mise bootstrap status` 和 `mise bootstrap plan` 会包含待处理受管理文件更改所产生的通知后果，而 `mise bootstrap files apply` 仅在因果文件操作成功后运行这些处理程序。

被屏蔽的单元还必须处于停止并禁用状态：

```toml
[bootstrap.services.old-worker]
state = "stopped"
enabled = false
masked = true
```

当单元缺失、systemd 不可用或单元无法启用（例如静态单元）时，Mise 不会进行猜测。状态和计划会将资源报告为 `unknown`；应用操作会默认拒绝执行，而不是运行不安全的命令。

```sh
mise bootstrap services status
mise bootstrap services status --json
mise bootstrap services apply --dry-run
mise bootstrap services apply --yes
```

系统服务管理仅支持 Linux，并且需要 root 权限。仅在需要进行更改时，Mise 才会通过 sudo 提示。
