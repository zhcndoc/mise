# Linux 用户和组

`[bootstrap.groups]` 和 `[bootstrap.users]` 以声明方式管理本地 Linux
账户。Mise 会先应用组，再应用用户，并在应用特权文件之前应用账户，因此托管文件可以安全地引用在同一配置中创建的账户。

```toml
[bootstrap.groups.mise-cache]
system = true

[bootstrap.groups.container-readers]
system = true

[bootstrap.users.mise-cache]
system = true
group = "mise-cache"
groups = ["container-readers"]
home = "/var/lib/mise-cache"
shell = "/usr/sbin/nologin"
comment = "mise cache service"
create_home = true
```

现有用户必须显式指定主 `group`。该组可以在同一配置中管理，也可以已存在于主机上。可选的 `uid` 和 `gid` 字段用于固定数字 ID；如果请求的 ID 属于其他账户，mise 会报告 `unknown` 并拒绝应用。创建账户时，`system = true` 会选择平台的系统账户范围，但不会重新归类现有账户。更改现有的数字 UID 或 GID 只会更新账户数据库；mise 不会递归改写现有文件的所有权。

用户字段在指定时会收敛管理，省略时则不受管理：

- `uid`、`group`、`home`、`shell` 和 `comment` 管理相应的 passwd 字段。
- `groups` 管理附加组。默认情况下，mise 只添加缺失的成员关系，并保留配置中未列出的成员关系。
- `exclusive_groups = true` 会使 `groups` 成为精确配置。此时显式设置 `groups = []` 会移除所有附加组成员关系。
- `create_home` 控制新用户主目录的创建。普通用户默认为 `true`，系统用户默认为 `false`。
- `move_home = true` 会在更改 `home` 时移动现有主目录；不设置时，只会更改 passwd 条目。

名称会作为类型化的进程参数传递，绝不会通过 shell 传递。Mise 在其范围严格受限的提权辅助程序中使用标准的 shadow-utils 命令（`groupadd`、`groupmod`、`groupdel`、`useradd`、`usermod` 和 `userdel`）。此功能仅适用于 Linux。

在非 Linux 主机上，诸如 `mise bootstrap`、`mise bootstrap status` 和 `mise bootstrap plan` 之类的聚合命令会在发出警告后忽略这些声明，以便同一配置可以跨平台共享。显式执行 `mise bootstrap accounts` 命令时则会失败，而不是静默地不执行任何操作。当托管文件或目录将这些被忽略的声明之一指定为其所有者或组时，该所有权字段也会在发出警告后被忽略。其内容、模式以及任何不相关的本地所有者或组仍会正常收敛。

## 删除

删除操作是显式的，并按先用户、后组的顺序执行：

```toml
[bootstrap.users.old-service]
state = "absent"
remove_home = true

[bootstrap.groups.old-service]
state = "absent"
```

默认情况下会保留用户主目录。仅当还应删除账户的主目录和邮件存储时，才设置
`remove_home = true`。Mise 拒绝删除 UID 0、GID 0 或正在运行 mise 的用户。它还会保留操作系统的正常安全措施；例如，`groupdel` 会拒绝删除仍是其他用户主组的组。

## 命令

```sh
mise bootstrap accounts status
mise bootstrap accounts status --json
mise bootstrap accounts apply --dry-run
mise bootstrap accounts apply --yes
```

`mise bootstrap plan` 包含账户资源及其依赖项。
受管理的组排在引用它们的用户之前，受管理的账户排在将其指定为所有者或组的现有文件和目录之前，而不存在的用户排在移除受管理组之前。
