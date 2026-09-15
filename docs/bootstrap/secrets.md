---
description: "[bootstrap.secrets] 声明引导配置所需的敏感输入，而无需将其值存储在 mise 配置中。"
---

# 引导密钥输入

`[bootstrap.secrets]` 声明引导配置所需的敏感输入，而无需将其值存储在 mise 配置中。值来自环境，使 [fnox](https://fnox.jdx.dev/) 等密钥管理器成为提供方边界，而无需将特定于提供方的凭据添加到 mise 中。

```toml
[bootstrap.secrets]
cache_token = "MISE_CACHE_TOKEN"
database_password = {
  env = "PRODUCTION_DATABASE_PASSWORD",
  description = "生产数据库密码",
}

[bootstrap.files."/etc/example/service.env"]
content = '''
CACHE_TOKEN={{ secret(name="cache_token") }}
DATABASE_PASSWORD={{ secret(name="database_password") }}
'''
template = true
owner = "root"
group = "root"
mode = "0600"

[dotfiles."~/.config/example/credentials"]
source = "dotfiles/credentials.tmpl"
mode = "template"
```

简短声明会将逻辑名称直接映射到环境变量。表格形式还接受 `description` 和 `allow_empty = true`；默认情况下会拒绝空值。mise 只解析选定文件模板所引用的输入；未使用的声明不会阻止不相关的文件。mise 会解析被引用的输入，并在任何完整引导变更开始前渲染每个模板，因此缺失的输入不会导致文件被部分渲染，也不会让较早的引导步骤运行。

`.env` 示例假定值可以写成单行赋值。`secret()` 函数会插入值；它不会针对 shell、JSON、TOML 或其他目标格式为其添加引号或进行转义。请根据服务所使用的格式渲染和编码值，尤其要注意引号或换行符。

## 提供输入并检查可用性

使用 fnox 将由提供方提供的值注入引导进程：

```sh
fnox exec -- mise bootstrap --yes
fnox exec -- mise bootstrap plan
```

这有意保持松耦合集成。运行 mise 的机器在其环境已经填充完成时不需要 fnox，并且 mise 不会知道某个值来自 fnox、CI 密钥、`systemd` 还是 shell。

对于需要人工参与的一次性运行，`--prompt-secrets` 会安全地提示输入缺失的值。提示输入的值会保留在内存中，不会被导出：

```sh
mise bootstrap --prompt-secrets --yes
mise bootstrap files apply --prompt-secrets
mise dot apply --prompt-secrets
mise bootstrap plan --prompt-secrets
```

`mise bootstrap secrets status` 会报告逻辑名称、环境变量名称，以及 `available`、`missing`、`empty` 或 `invalid_unicode` 状态；它永远不会打印值。添加 `--json` 可获取机器可读的输出，或添加 `--missing` 在输入不可用时以状态码 1 退出。

对于[远程引导](/bootstrap/remote.html)，本地环境不会复制到 SSH 目标。请在目标上提供输入，或在需要人工参与的运行中使用 `--prompt-secrets`。

mise 会从其输出中隐藏已解析的值。计划、试运行、状态输出和特权辅助程序输出都不包含已渲染的文件内容。不存在用于显示引导密钥的命令。
