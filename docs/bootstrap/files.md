---
description: "管理系统文件和目录，包括需要 root 权限的路径。"
socialDescription: "管理系统文件和目录，包括需要 root 权限的路径。"
---

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

在应用此示例之前，请在声明配置旁创建 `files/example.conf`。源文件由 mise
读取；`/etc/example.conf` 是其目标路径。对于包含凭据的文件模板，请使用
`"0600"` 模式，并设置仅允许目标服务账户或 root 读取的所有权。

文件内容可以来自 `source` 或内联的 `content`。相对源路径相对于声明它们的配置文件解析，以 `~/` 开头的源路径则相对于用户的主目录解析。现有文件必须准确声明一个内容源。目标必须是绝对路径，并且 mise 拒绝管理 `/` 本身。

目录创建使用 `mkdir -p` 语义，因此会自动创建缺失的父目录。配置的所有权和模式应用于声明的目录；隐式创建的父目录使用操作系统默认值。当父目录需要特定的所有权或权限时，请单独声明它。

默认情况下，节点类型错误的目标会被报告为 `unknown`，apply 会拒绝销毁它。为该文件或目录设置 `replace = true`，即可替换冲突的类型。将目录替换为文件时，只会删除空目录；递归销毁仍需要显式声明一个包含 `recursive = true` 的 `state = "absent"` 目录。

设置 `template = true`，使用 mise 的模板引擎渲染文件内容。此设置是显式的，因此字面形式的 <span v-pre>`{{ ... }}`</span> 内容默认保持不变。模板可以使用已配置的 `vars`、声明配置所在的目录 <span v-pre>`{{ config_root }}`</span>，以及目标路径 <span v-pre>`{{ target }}`</span>。模板可以使用 <span v-pre>`{{ secret(name="logical_name") }}`</span> 获取已声明的 [bootstrap secret input](/bootstrap/secrets.html)。密钥值绝不会包含在计划、试运行描述、状态输出或特权辅助程序输出中。

mise 会在应用更改之前比较内容、类型、模式、所有者和组。写入操作会先在目标目录中使用临时文件，然后执行原子重命名。系统首先尝试以当前用户身份进行更改。如果文件系统因权限错误拒绝某项操作，mise 会重试该操作，并在一次特权批处理中继续执行其余有序更改。因此，用户可写的目标不需要 `sudo`。如果当前用户无法检查目标或搜索其某个父目录，mise 会在一次特权批处理中比较其元数据和内容。计划和文件内容会通过标准输入发送给范围严格限定的 mise 辅助程序，因此文件内容不会出现在进程参数或日志中。

## 软件包之前的文件

在软件包管理器需要的文件和目录上设置 `phase = "pre-packages"`，例如仓库定义和签名密钥：

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

在源文件中提供供应商的密钥和仓库定义。应用文件后运行
`mise bootstrap --update`，以刷新软件包元数据；更改仓库文件不会自动刷新元数据。

早期文件会在账户和软件包管理器插件之后、`pre-packages` hook 之前运行。默认阶段为 `"post-packages"`，这会使文件位于内置软件包安装之后。每个文件在每次 bootstrap 运行中应用一次。两个阶段的服务通知都会为服务步骤收集。

声明的父目录必须不晚于其子项创建，并且不得早于其子项移除。冲突的阶段声明会在 bootstrap 更改之前导致验证失败。当早期文件需要声明的父目录时，将其阶段设置为
`"pre-packages"`。

`mise bootstrap files apply` 仍会应用所有已声明的文件和目录。
`mise bootstrap --only files` 会运行两个文件阶段；`--skip files` 会跳过两个阶段。
`--only packages` 不会应用文件。计划会包含每个文件的阶段。

## 预览和检查

```sh
mise bootstrap files status --json
mise bootstrap files apply --dry-run
```

在应用之前检查源路径、所有权、模式以及任何 `unknown` 状态。
检查可能需要提升权限才能读取受保护的目标。缺失的源必须在配置检出目录中修复；更改目标权限不会提供该源。

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

`mise bootstrap plan` 会包含这些资源，并自动将受管理的文件排列在其受管理的父目录之后。移除操作会反转这一依赖关系，因此会先移除子项，再移除其父项。

`mise bootstrap plan`、`mise bootstrap status` 和 `mise bootstrap files status` 的 JSON 输出包含受管理文件和目录的 `origin` 对象。该对象会标识声明配置、该配置的 `config_root`、由其文件名编码的任何配置环境，以及文件使用 `source` 时解析后的源路径。路径有效 UTF-8 时会作为普通字符串输出。在 Unix 上，包含非 UTF-8 字节的路径会使用 `mise:path-bytes:<base64url>`，从而确保来源信息无损。
