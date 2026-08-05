# 密钥

使用 mise 安全地管理敏感环境变量。有多种受支持的方法：

- **[fnox](https://github.com/jdx/fnox)** <Badge type="tip" text="推荐" /> — 功能齐全的密钥管理器，支持远程密钥存储（例如：1Password、AWS Secrets Manager）和远程加密（例如：AWS KMS）。使用 `fnox exec -- mise ...` 将密钥填充到 mise 的环境中。[引导密钥输入](/bootstrap/secrets.html)为配置模板提供稳定的逻辑名称，同时由 fnox 负责提供商和身份验证。
- [sops](/environments/secrets/sops) <Badge type="warning" text="实验性" /> — 加密整个文件，并通过 `env._.file` 加载
- [直接使用 age 加密](/environments/secrets/age) <Badge type="warning" text="实验性" /> — 在 `mise.toml` 中内联加密单个环境变量
