# 直接 age 加密 <Badge type="warning" text="experimental" />

使用 [age](https://github.com/FiloSottile/age) 加密，在 `mise.toml` 中直接加密单个环境变量值。无需安装 age 工具——mise 已内置支持。

这是一种将加密后的环境变量直接存储在 `mise.toml` 中的简单方法。你只需运行 `mise set --age-encrypt <key>=<value>` 即可使用。默认情况下，如果存在的话，mise 会使用你的 ssh 密钥（`~/.ssh/id_ed25519` 或 `~/.ssh/id_rsa`）。

- **内联存储**：值与 `mise.toml` 中的其他环境变量并列存放
- **多个接收者**：x25519 age 密钥和 SSH 接收者
- **自动解密**：在运行时当可用身份存在时

## 快速开始

1. 启用实验性功能：

```bash
mise settings set experimental=true
```

2. [可选] 生成一个 age 密钥（如果你想创建一个新的 age 密钥，并且不想使用你的 ssh 密钥）：

```bash
age-keygen -o ~/.config/mise/age.txt
# 注意输出的公钥，用于加密
```

3. 加密一个值：

```bash
mise set --age-encrypt --prompt DB_PASSWORD
# 输入 DB_PASSWORD 的值： [隐藏输入]
```

::: warning
建议使用 `--prompt`，以避免意外将该值暴露到你的 shell 历史记录中。不过你也可以不这样做，使用 `mise set --age-encrypt DB_PASSWORD="password123"`。
:::

4. 值会作为 age 指令加密存储在 `mise.toml` 中：

```toml
[env]
DB_PASSWORD = { age = { value = "<base64>" } }
```

5. 解密会自动进行：

```bash
mise env  # 变量会自动解密
```

## CLI 标志

- `--age-encrypt` — 为该值启用 age 加密
- `--age-recipient <KEY>` — x25519 接收者（可重复设置多次）
- `--age-ssh-recipient <PATH|KEY>` — SSH 公钥或 `.pub`/私钥的路径（可重复设置多次）
- `--age-key-file <PATH>` — 使用从 age 身份文件派生的接收者
- `--prompt` — 提示输入该值，以避免意外将其暴露在 shell 历史记录中

如果没有显式提供接收者，mise 将尝试使用默认值（见下文）。

## 存储格式

加密值以 base64 形式存储，并带有一个 `format` 字段：

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

解密后的值始终会被标记为已隐藏。

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

- 该功能处于实验阶段；标志和行为可能会发生变化。
- `mise set KEY` 将打印解密后的值
