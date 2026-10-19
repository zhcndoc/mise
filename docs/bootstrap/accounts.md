---
description: "使用 mise bootstrap 创建、更新和移除本地 Linux 用户及用户组。"
---

# Linux 用户和组

`[bootstrap.groups]` 和 `[bootstrap.users]` 用于声明本地 Linux 账户，例如服务用户及其所属组。mise 会先应用这些声明，再写入[系统文件](/bootstrap/files.html)，因此同一份配置中的文件可以将这些账户指定为所有者。

## 示例

以下配置会为缓存服务创建系统用户，并为其创建专属组；通过另一个组授予该用户读取容器日志的权限：

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

先预览更改，再应用：

```sh
mise bootstrap accounts apply --dry-run
mise bootstrap accounts apply
```

## 应用前须知

应用更改需要 root 权限。除非当前已是 root，否则 mise 会通过 sudo 启动一个具有提权权限的自身进程，并由该进程运行 shadow-utils 中的 `groupadd`、`groupmod`、`groupdel`、`useradd`、`usermod` 和 `userdel` 命令。交互式终端中 sudo 可以提示输入密码；其他情况下则需要配置免密 sudo。
[`system_packages.sudo = false`](/configuration/settings.html#system_packages.sudo) 会禁止提权，因此只有 root 可以应用更改。账户名称会作为参数传给这些命令，不会经过 Shell。

精简镜像中可能缺少这些命令，此时 mise 会因 `required account command 'useradd' was not found` 而停止。请安装提供这些命令的软件包，例如 Alpine 上的 `shadow`。

## 修改已有账户

mise 只管理你设置的字段，账户的其他部分保持不变。修改已有账户前请先检查试运行结果：即使是配置范围之外的文件，UID、GID 和组变更也会影响账户数据库。

- `uid` 和 `gid` 可固定数字 ID。如果请求的 ID 已属于其他账户，mise 会将资源报告为 `unknown`，且不会应用更改。
- 修改已有用户的 `uid` 或主 `group` 会运行 `usermod`，同时更改其主目录和邮件暂存目录中的文件所有权。其他位置的文件仍保留旧 ID，mise 不会改写它们。
- 修改组的 `gid` 只会更新组数据库。
- mise 创建账户时，`system = true` 会选用系统 ID 范围；它不会更改已有账户的类别。
- `groups` 会添加缺少的附属组，并保留未列出的现有组成员关系。设置 `exclusive_groups = true` 后，列表会被视为精确集合；`groups = []` 会移除所有附属组成员关系。
- 修改 `home` 只会更新账户条目；同时设置 `move_home = true` 才会移动现有主目录。

## 配置如何合并

多个配置文件声明了同一个用户或组时，会整体使用最靠近当前目录的声明；mise 不会跨文件合并字段。

一次运行中，mise 会先创建和更新组，再处理用户；然后处理将这些账户设为所有者或所属组的[系统文件和目录](/bootstrap/files.html)。移除时顺序相反：先移除用户，再移除其依赖的组。`mise bootstrap plan` 会显示这些依赖关系。

## 移除用户和组

删除声明不会移除账户。若要移除账户，请将其状态声明为 absent：

```toml
[bootstrap.users.old-service]
state = "absent"
remove_home = true

[bootstrap.groups.old-service]
state = "absent"
```

除非设置 `remove_home = true`，否则 mise 会保留用户的主目录；启用后也会删除邮件暂存目录。mise 不会移除 UID 0、GID 0 或当前运行 mise 的用户。操作系统自身的检查仍然有效，例如，如果某个组仍是其他用户的主组，`groupdel` 就会拒绝删除它。

## 预览并应用

```sh
mise bootstrap accounts status
mise bootstrap accounts status --json
mise bootstrap accounts apply --dry-run
mise bootstrap accounts apply --yes
```

`mise bootstrap` 会先应用账户，再处理其他部分。若要通过 `--only` 将新账户设为文件所有者，请同时包含这两部分：`mise bootstrap --only accounts,files`。

## 参考

账户名称最多可包含 32 个 ASCII 字母、数字、`_` 或 `-`，必须以字母或 `_` 开头，并可用 `$` 结尾。

用户字段：

| 字段               | 默认值                                  | 说明                                                                       |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| `group`            | 除非 `state = "absent"`，否则必填        | 主组。请在同一配置中声明该组，或确保主机上已存在该组                   |
| `groups`           | 不管理                                   | 要添加的附属组                                                             |
| `exclusive_groups` | `false`                                 | 移除 `groups` 中未列出的附属组；需要同时设置 `groups`                     |
| `uid`              | 不管理                                   | 数字用户 ID                                                                |
| `home`             | 不管理                                   | 主目录，必须是绝对路径                                                     |
| `create_home`      | `true`；`system = true` 时为 `false`     | 为新用户创建主目录                                                         |
| `move_home`        | `false`                                 | 修改 `home` 时移动现有主目录；需要同时设置 `home`                          |
| `shell`            | 不管理                                   | 登录 Shell，必须是绝对路径                                                 |
| `comment`          | 不管理                                   | 注释（GECOS）字段，不得包含 `:` 或换行                                     |
| `system`           | `false`                                 | 在系统 ID 范围内创建用户                                                   |
| `state`            | `"present"`                             | `"absent"` 会移除用户；此时只接受 `remove_home`                            |
| `remove_home`      | `false`                                 | `state = "absent"` 时同时删除主目录和邮件暂存目录                          |

组字段：

| 字段     | 默认值      | 说明                                                               |
| -------- | ----------- | ------------------------------------------------------------------ |
| `gid`    | 不管理      | 数字组 ID                                                         |
| `system` | `false`     | 在系统 ID 范围内创建组                                            |
| `state`  | `"present"` | `"absent"` 会移除该组；此时不能设置 `gid` 或 `system`              |

## macOS 和 Windows 上的行为

账户配置仅适用于 Linux。在其他平台上，`mise bootstrap`、`mise bootstrap status` 和 `mise bootstrap plan` 会忽略这些声明并显示警告，因此同一份配置可用于多个平台；而显式运行 `mise bootstrap accounts` 命令时会报错，不会静默跳过。如果[系统文件或目录](/bootstrap/files.html)将被忽略的账户设为所有者或所属组，该字段也会被忽略并显示警告；文件内容、权限模式以及其他所有者或所属组仍会应用。

## 另请参阅

- 账户在执行顺序中的位置，请参阅 [Bootstrap](/bootstrap.html#how-it-runs)。
- 这些账户所拥有的文件，请参阅[系统文件和目录](/bootstrap/files.html)。
