---
description: "mise reads encrypted secret files and makes values available as environment variables via env._.file."
---

# sops <Badge type="warning" text="experimental" />

mise 会读取加密的密钥文件，并通过 `env._.file` 将值作为环境变量提供。

- **格式**：`.env.json`、`.env.yaml`、`.env.toml`
- **加密**：[sops](https://getsops.io)，使用内置的 age 支持或外部的 `sops` CLI

<span id="example"></span>

## 选择解密方法

默认的内置实现处理使用 age 加密的文件。要使用 AWS KMS、GCP KMS、Azure Key Vault、Vault 或 PGP，请安装 SOPS CLI，向提供商进行身份验证，并按照下文所述设置 `sops.rops = false`。

## 使用 sops 加密

::: info
默认的 `sops.rops = true` 实现支持使用 age 加密的文件。设置 `sops.rops = false`，即可对其他密钥服务以及 SOPS 支持的方法（例如 AWS KMS、GCP KMS、Azure Key Vault、Vault 和 PGP）使用外部的 `sops` CLI。
:::

::: warning
外部的 `sops` CLI 目前不支持 TOML 输入/输出。只有使用默认的 `sops.rops = true` 设置时，mise 才能解密使用 SOPS 加密的 `.env.toml` 文件。如果设置 `sops.rops = false`，mise 将调用 `sops` CLI，且加密的 TOML 环境变量文件会因配置错误而失败。当你需要使用外部 CLI 路径时，请使用 `.env.json` 或 `.env.yaml`。
:::

1. 安装工具并启用实验性功能：

```sh
mise use -g sops age
mise settings set experimental=true
```

2. 复用现有的 age 身份，或者在文件不存在时创建一个：

```sh
mkdir -p ~/.config/mise
mise exec -- age-keygen -o ~/.config/mise/age.txt
# Public key: <public key>
```

3. 使用你的值创建 `.env.json`。此示例使用占位符：

```json [.env.json]
{
  "API_TOKEN": "replace-with-your-token"
}
```

使用 `age-keygen` 输出的公钥对其加密：

```sh
mise exec -- sops encrypt -i --age "<public key>" .env.json
```

::: tip
`-i` 标志会将明文文件替换为密文。提交加密后的文件，并将 `age.txt` 保存在仓库之外。外部的 SOPS CLI 会读取 `SOPS_AGE_KEY_FILE`；`MISE_SOPS_AGE_KEY_FILE` 仅用于配置 mise。要编辑文件：

```sh
SOPS_AGE_KEY_FILE="$HOME/.config/mise/age.txt" mise exec -- sops .env.json
```

:::

Age 密钥文件使用标准的 SOPS/age 格式：每行放置一个身份。
空行和以 `#` 开头的行会被忽略，解密时会尝试所有身份。

4. 在配置中引用：

```toml
[env]
_.file = { path = ".env.json", redact = true }
```

现在，mise 会为 `mise exec`、任务和 shell 激活解密该文件。
`mise env` 会打印明文值；`redact = true` 不会隐藏这些导出内容。

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

脱敏适用于捕获的任务输出。`mise env --redacted` 会有意导出匹配的密钥，而不是将其隐藏。有关输出模式的限制，请参阅[脱敏](/environments/#redactions)。

### CI 掩码处理（GitHub Actions）

有关 mise-action 集成以及保留空白字符和多行值的手动掩码示例，请参阅 [CI 掩码处理](/environments/#ci-masking)。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="sops" :level="2" />
