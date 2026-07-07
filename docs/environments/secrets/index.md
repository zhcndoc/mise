# 密钥

使用 mise 安全地管理敏感环境变量。有多种受支持的方法：

- **[fnox](https://github.com/jdx/fnox)** <Badge type="tip" text="recommended" /> — 功能完备的密钥管理器，支持远程密钥存储（例如：1Password、AWS Secrets Manager）和远程加密（例如：AWS KMS）。这是 @jdx 维护的一个独立项目，可与 mise 良好配合使用。mise 和 fnox 之间没有直接集成，需要单独进行设置。
- [sops](/environments/secrets/sops) <Badge type="warning" text="experimental" /> — 加密整个文件，并通过 `env._.file` 加载
- [Direct age encryption](/environments/secrets/age) <Badge type="warning" text="experimental" /> — 在 `mise.toml` 中直接对单个环境变量进行内联加密
