# 系统文件和目录

`[bootstrap.files]` 和 `[bootstrap.directories]` 以声明方式管理可能需要 root
权限的绝对路径。它们与管理用户主目录中文件的 `[dotfiles]` 相互独立。

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

文件内容可以来自 `source` 或内联的 `content`。相对 source 路径相对于声明它们的配置文件进行解析。已存在的文件必须声明且只能声明一个内容来源。目标必须是绝对路径，mise 拒绝管理 `/` 本身。

Mise 只创建显式声明的目录。如果需要创建多个缺失的层级，请声明每个目录，以确保其所有权和模式是有意设置的；mise 绝不会使用进程默认值创建未声明的祖先目录。

默认情况下，节点类型错误的目标会被报告为 `unknown`，apply 会拒绝销毁它。为该文件或目录设置 `replace = true`，即可替换冲突的类型。将目录替换为文件时，只会删除空目录；递归销毁仍需要显式声明一个包含 `recursive = true` 的 `state = "absent"` 目录。

设置 `template = true`，即可使用 mise 的模板引擎渲染文件内容。这样做是显式的，因此字面量 <span v-pre>`{{ ... }}`</span> 内容默认会保持不变。模板可以使用已声明的
[bootstrap secret input](/bootstrap/secrets.html)，其形式为
<span v-pre>`{{ secret(name="logical_name") }}`</span>。机密值永远不会包含在计划、试运行描述、状态输出或特权辅助程序输出中。

Mise 会在应用更改前比较内容、类型、模式、所有者和组。
写入操作会先在目标目录中创建临时文件，然后执行原子重命名。如果当前用户无法检查目标，或无法搜索其父目录之一，mise 会在一次特权批处理中比较其元数据和内容。计划和文件内容会通过标准输入发送给权限范围严格限定的 mise 辅助程序，因此文件内容不会出现在进程参数或日志中。

## 移除资源

移除始终是显式的：

```toml
[bootstrap.files."/etc/obsolete.conf"]
state = "absent"

[bootstrap.directories."/opt/obsolete"]
state = "absent"
```

目录在移除前必须为空。递归删除目录需要额外设置 `recursive = true`，并会在计划中显示为破坏性操作。

从配置中移除声明不会移除其目标。

## 命令

```sh
mise bootstrap files status
mise bootstrap files status --json
mise bootstrap files apply --dry-run
mise bootstrap files apply --yes
```

文件和目录发生更改后，可能会通知已配置的 `[bootstrap.services]`：

```toml
[bootstrap.files."/etc/example/config.toml"]
content = "enabled = true"
notify = ["example"]
```

在所有受管理的文件完成收敛后，完整的 `mise bootstrap` 流程会应用通知。专用的 `mise bootstrap files apply` 命令也会在文件更改成功后运行处理程序。`mise bootstrap services apply` 仅收敛生命周期状态，并且绝不会在产生因果关系的文件更改之前触发处理程序。

`mise bootstrap plan` 包含这些资源，并会自动将受管理的文件安排在其受管理的父目录之后。移除时会反转这一依赖关系，因此会先移除子项，再移除其父项。
