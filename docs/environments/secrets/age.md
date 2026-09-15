---
description: "使用 age 加密直接在 mise.toml 中加密单个环境变量值。"
---

# 直接 age 加密 <Badge type="warning" text="experimental" />

使用 [age](https://github.com/FiloSottile/age) 加密直接在 `mise.toml` 中加密单个环境变量值。加密和解密功能已内置于 mise 中。下方可选的 `age-keygen` 命令来自独立的 age CLI。

这是将加密的环境变量直接存储在 `mise.toml` 中的一种简单方式。运行 `mise set --age-encrypt <key>=<value>` 即可使用。默认情况下，如果存在 SSH 密钥（`~/.ssh/id_ed25519` 或 `~/.ssh/id_rsa`），mise 会使用它。

- **内联存储**：值与 `mise.toml` 中的其他环境变量并列存放
- **多个接收者**：x25519 age 密钥和 SSH 接收者
- **自动解密**：在运行时当可用身份存在时

## 快速开始

1. 启用实验性功能：

```bash
mise settings set experimental=true
```

2. 使用现有的 SSH 身份，或安装 age 并生成专用身份。
   如果 `age.txt` 已包含你想保留的身份，则跳过密钥生成：

```bash
mise use -g age
mkdir -p ~/.config/mise
mise exec -- age-keygen -o ~/.config/mise/age.txt
# Public key: age1...
```

公钥是**接收者**：将其分享给需要为你加密的人。`age.txt` 包含解密所需的私有**身份**；请将其保存在仓库之外。

3. 加密一个值：

```bash
mise set --age-encrypt --prompt DB_PASSWORD
# 输入 DB_PASSWORD 的值： [隐藏输入]
```

::: warning
使用 `--prompt`，这样明文就不会成为命令或 shell 历史记录的一部分
:::

4. 值会作为 age 指令加密存储在 `mise.toml` 中：

```toml
[env]
DB_PASSWORD = { age = { value = "<base64>" } }
```

5. 运行需要该值的命令或任务。mise 会在启动进程之前将其解密：

```bash
# Bash example: checks availability without printing the password
mise exec -- bash -c 'test -n "$DB_PASSWORD" && echo "DB_PASSWORD is available"'
```

`mise env` 和 `mise set DB_PASSWORD` 会打印解密后的值。仅在确实需要输出明文时使用它们；请参阅[隐藏输出](/environments/#redactions)。

## CLI 标志

- `--age-encrypt` — 为该值启用 age 加密
- `--age-recipient <KEY>` — x25519 接收者（可重复设置多次）
- `--age-ssh-recipient <PATH|KEY>` — SSH 公钥或 `.pub`/私钥的路径（可重复设置多次）
- `--age-key-file <PATH>` — 使用从 age 身份文件派生的接收者
- `--prompt` — 提示输入该值，以避免意外将其暴露在 shell 历史记录中

如果未显式提供接收者，mise 会尝试使用默认值（见下文）。

## 存储格式

存储的载荷是经过 base64 编码的密文，而不是经过编码的明文密钥。`format` 字段用于标识载荷表示形式：

- `format = "raw"` — 未压缩的密文（通常用于较小的值）
- `format = "zstd"` — 经 zstd 压缩的密文（当密文 > 1KB 时使用）

## 解密身份

mise 按以下顺序查找身份：

1. `MISE_AGE_KEY` 环境变量
   - 可以包含一行或多行原始 `AGE-SECRET-KEY-...`，或者一个 age 身份文件内容
2. `settings.age.identity_files`（路径列表）
3. `settings.age.key_file`（单个路径）
4. 如果存在，则使用默认的 `~/.config/mise/age.txt`
5. 来自 `settings.age.ssh_identity_files` 的 SSH 身份以及常见默认值（`~/.ssh/id_ed25519`、`~/.ssh/id_rsa`）

在 `settings.age.key_file`、`settings.age.identity_files` 和 `settings.age.ssh_identity_files` 中配置的路径，是相对于声明它们的文件的配置根目录解析的。它们还支持 Tera 模板，包括 <span v-pre>`{{ config_root }}`</span> 以及来自 `env` 的值。绝对路径和以 `~` 开头的路径保留其现有含义。

解密后的值始终会标记为已隐藏。

Age 解密默认是严格模式。如果没有找到任何身份、没有可用身份能够解密该值，或者 age 载荷无效，mise 会失败，而不是继续使用部分解析的环境。

要允许命令和任务在 age 值无法解密时继续执行，请关闭严格模式：

```bash
mise settings set age.strict=false
```

在非严格模式下，mise 会跳过无法解密的值，并继续解析环境的其余部分。

## 接收者默认值（加密）

当使用 `--age-encrypt` 但未显式指定接收者时，mise 会尝试从以下来源推导接收者：

- 默认密钥文件 `~/.config/mise/age.txt` 中身份对应的公钥
- 如果存在相应的 `.pub` 文件，则从 SSH 私钥推导出的公钥

如果未找到任何接收者，命令将失败并报错，要求你提供接收者或配置 `settings.age.key_file`。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="age" :level="2" />

## 说明

- 此功能为实验性功能；标志和行为可能会发生变化
- `mise set KEY` 会打印解密后的值
