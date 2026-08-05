# Bootstrap 密钥输入

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
```

简写声明会将逻辑名称直接映射到环境变量。表单还接受 `description` 和 `allow_empty = true`；默认情况下会拒绝空值。Mise 只解析所选文件模板引用的输入；未使用的声明不会阻止无关文件。所引用的输入会被解析，并且所有模板都会在任何完整引导变更开始之前完成渲染，因此缺少输入不会导致文件被部分渲染，也不会允许更早的引导步骤运行。

使用 fnox 将由提供方管理的值注入引导进程：

```sh
fnox exec -- mise bootstrap --yes
fnox exec -- mise bootstrap plan
```

这有意保持松耦合集成。运行 mise 的机器在其环境已经填充完成时不需要 fnox，并且 mise 不会知道某个值来自 fnox、CI 密钥、`systemd` 还是 shell。

对于需要人工参与的一次性运行，`--prompt-secrets` 会安全地提示输入缺失的值。提示输入的值会保留在内存中，不会被导出：

```sh
mise bootstrap --prompt-secrets --yes
mise bootstrap files apply --prompt-secrets
mise bootstrap plan --prompt-secrets
```

`mise bootstrap secrets status` 会报告逻辑名称、环境变量名称，以及 `available`、`missing`、`empty` 或 `invalid_unicode` 状态；它永远不会打印值。添加 `--json` 可获取机器可读的输出，或添加 `--missing` 在输入不可用时以状态码 1 退出。

Mise 会从其输出中对已解析的值进行脱敏。计划、试运行、状态输出和特权辅助程序输出均不包含渲染后的文件内容。没有用于显示引导密钥的命令。
