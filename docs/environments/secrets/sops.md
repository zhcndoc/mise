# sops <Badge type="warning" text="实验性" />

mise 会读取加密的密钥文件，并通过 `env._.file` 将值作为环境变量提供。

- **格式**：`.env.json`、`.env.yaml`、`.env.toml`
- **加密**：[sops](https://getsops.io)，使用内置的 age 支持或外部的 `sops` CLI

## 示例

```json
{
  "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

```toml [mise.toml]
[env]
_.file = ".env.json"
```

如果该文件使用 sops 加密，mise 将自动解密该文件。

## 使用 sops 加密

:::: info
默认的 `sops.rops = true` 实现支持使用 age 加密的文件。设置
`sops.rops = false` 可使用 SOPS 支持的其他密钥服务和方法对应的外部 `sops` CLI，例如 AWS KMS、GCP KMS、Azure Key Vault、Vault
和 PGP。
::::

:::: warning
外部 `sops` CLI 目前不支持 TOML 输入/输出。mise 只能在默认 `sops.rops = true` 设置下解密 SOPS 加密的 `.env.toml` 文件。如果你将 `sops.rops = false`，mise 会调用外部 `sops` CLI，而加密的 TOML 环境文件会因配置错误而失败。在需要使用外部 CLI 路径时，请使用 `.env.json` 或 `.env.yaml`。
::::

1. 安装工具：`mise use -g sops age`

2. 生成一个 age 密钥并记录公钥：

```sh
age-keygen -o ~/.config/mise/age.txt
# 公钥: <公钥>
```

3. 加密文件：

```sh
sops encrypt -i --age "<公钥>" .env.json
```

:::: tip
`-i` 会覆盖原文件。加密后的文件可以安全提交到仓库。设置 `SOPS_AGE_KEY_FILE=~/.config/mise/age.txt` 或 `MISE_SOPS_AGE_KEY_FILE=~/.config/mise/age.txt` 可使用 sops 解密/编辑。
::::

4. 在配置中引用它：

```toml
[env]
_.file = ".env.json"
```

现在 `mise env` 会暴露这些值。

## 环境变量

mise 同时支持 mise 专用环境变量和标准的 SOPS 变量：

**mise 专用变量（最高优先级）：**

- `MISE_SOPS_AGE_KEY` - 直接提供 Age 私钥内容
- `MISE_SOPS_AGE_KEY_FILE` - Age 私钥文件路径

**标准 SOPS 变量（回退）：**

- `SOPS_AGE_KEY_FILE` - Age 私钥文件路径
- `SOPS_AGE_KEY` - 直接提供 Age 私钥内容

**优先级顺序：**

1. `MISE_SOPS_AGE_KEY`（mise 设置或环境变量，优先检查）
2. `MISE_SOPS_AGE_KEY_FILE` 或 `sops.age_key_file`（mise 设置或环境变量）
3. `SOPS_AGE_KEY_FILE`（标准）
4. `SOPS_AGE_KEY`（标准，直接密钥内容）
5. 默认：`~/.config/mise/age.txt`

这样你就可以专门为 mise 覆盖 SOPS 设置，同时为其他工具保留原有的标准 SOPS 配置。

## 脱敏

将文件中的密钥标记为敏感：

```toml
[env]
_.file = { path = ".env.json", redact = true }
```

使用已脱敏的值：

```bash
mise env --redacted
mise env --redacted --values
```

### CI 掩码处理（GitHub Actions）

```yaml
- name: 掩码处理密钥
  run: |
    for value in $(mise env --redacted --values); do
      echo "::add-mask::$value"
    done
- name: 安全使用密钥
  run: |
    mise exec -- ./deploy.sh
```

如果你使用 [mise-action](https://github.com/jdx/mise-action)，标记为 `redact = true` 的值会自动被掩码处理。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="sops" :level="2" />
