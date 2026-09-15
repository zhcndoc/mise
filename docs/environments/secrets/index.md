---
description: "选择如何向项目提供密钥值。"
---

# 密钥

选择如何向项目提供密钥值。mise 会将解析后的值作为环境变量传递给命令；密钥提供程序或加密密钥决定谁可以解析这些值。

| 方法                                               | 存储在仓库中                                           | 运行时要求                                                                    |
| -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| [fnox](https://github.com/jdx/fnox)（推荐）        | 由 fnox 管理的密钥引用或加密值                         | fnox 以及对其配置的提供程序的访问权限                                          |
| [sops](./sops.html)（实验性）                      | 加密的 JSON、YAML 或 TOML 文件                        | 解密身份；对于内置 age 支持之外的提供程序，还需要 SOPS CLI                     |
| [直接使用 age 加密](./age.html)（实验性）          | `mise.toml` 中的单个加密值                             | age 或 SSH 解密身份                                                            |

## 使用密钥管理器

为项目配置 fnox 并向其提供程序完成身份验证后，运行：

```sh
fnox exec -- mise run deploy
```

将 `deploy` 替换为你的任务。fnox 会在启动 mise 之前解析密钥，因此 mise 模板和任务可以从继承的环境中读取这些密钥。fnox 支持远程密钥存储，例如 1Password 和 AWS Secrets Manager，也支持远程加密，例如 AWS KMS。有关提供程序设置，请参阅 [fnox 文档](https://github.com/jdx/fnox)

[引导密钥输入](/bootstrap/secrets.html)为配置模板提供稳定的名称，同时由 fnox 处理提供程序和身份验证。

## 加密仓库文件或值

当密钥属于单独的文件时，使用 [sops](./sops.html)；当少量加密变量应与其余 `mise.toml` 内容放在一起时，使用[直接 age 值](./age.html)。提交密文，并单独分发解密身份。

加密可以保护存储的值。[脱敏](/environments/#redactions)会遮盖捕获的任务输出，而 [CI 掩码](/environments/#ci-masking)会保护 mise 输出捕获之外的日志。`mise env` 会有意导出明文值，包括那些标记为已脱敏的值。
