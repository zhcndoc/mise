---
description: "mise 将跟踪的 dotfiles 保存到 Git 前先进行加密，可选择 age 或 SSH 接收者，并从共享历史中移除明文。"
socialDescription: "将跟踪的 dotfiles 加密后再保存到 Git，并从历史中移除明文。"
---

# 加密文件

mise 可以在将受跟踪文件保存到 Git 前使用 age 加密。这样，历史记录和远程仓库只保存密文，而你编辑
的文件仍可正常读取。请在首次保存文件前完成设置：事后加密不会移除历史中已有的明文版本。

## 加密文件 {#encrypt-a-file}

在全局配置中列出公钥接收者，并将要加密的文件或目录标记出来：

```toml
[history.encryption]
recipients = ["<age-or-plugin-public-recipient>", "<recovery-public-recipient>"]

[dotfiles]
"~/.config/app/credentials" = { mode = "track", encrypt = true }
```

将占位内容替换为各台机器的公钥接收者和独立的恢复密钥；[选择接收者](#choose-recipients)介绍了
如何获取它们。公钥接收者会随仓库共享。请勿跟踪私钥。

若要从第一个检查点起就加密新文件，请先配置接收者，然后运行：

```sh
mise dot track ~/.config/app/credentials --encrypt
```

请单独运行 `mise dot track --encrypt`，不要将它作为
[`mise dot capture`](/dotfiles/history.html#capturing-an-external-command) 中的命令，以便 mise 在保存条目
前检查首个加密检查点。

受跟踪的模板源文件也可以加密：

```toml
[dotfiles]
"~/templates/private" = { mode = "track", encrypt = true }
"~/.config/app/config" = { mode = "template", source = "~/templates/private/app.tera" }
```

渲染后的文件不会加密。请单独设置其[权限](/dotfiles/managed.html#permissions)，并决定是否跟踪该文件。

## 加密范围 {#what-encryption-covers}

mise 会在将文件内容存入 Git 前加密。文件名和公开元数据仍可见，你编辑或还原的文件也保持未加密。
缺少密钥或接收者时，操作会中止；mise 绝不会退回到保存明文。

mise 会将每个保存的版本加密给列表中的所有接收者。缺少对应接收者的机器仍可传输加密历史，但无法
读取这些文件：拉取操作若需要检查或应用这类文件，就会以 `cannot unlock <path>` 失败，而不会跳过。

## 选择接收者 {#choose-recipients}

接收者是公钥。每台需要读取历史记录的机器都必须在列表中有自己的接收者。mise 接受以下格式：

| 接收者         | 示例                       | 说明                                        |
| -------------- | -------------------------- | ------------------------------------------- |
| age x25519     | `age1qyqszq...`            | 通过 `age-keygen` 生成；可在无人值守时使用。 |
| SSH 公钥       | `ssh-ed25519 AAAAC3Nza...` | 可用现有密钥，但不能设置口令。              |
| 带标签的 age   | `age1tag1...`              | 可在无人值守时使用。                        |
| age 插件       | `age1yubikey1...`          | 仅支持交互式操作；见下方警告。              |

与接收者匹配的私钥就是 mise 用于解密的身份密钥。mise 会在 `~/.config/mise/age.txt`、
`~/.ssh/id_ed25519` 和 `~/.ssh/id_rsa` 中查找身份密钥。可通过以下设置指定其他位置：
[`age.key_file`](/configuration/settings.html#age.key_file),
[`age.identity_files`](/configuration/settings.html#age.identity_files), or
[`age.ssh_identity_files`](/configuration/settings.html#age.ssh_identity_files)
。

::: warning 插件接收者会阻止自动保存
`age1yubikey1...` 等插件接收者需要交互式终端，而 mise 会一次性解析整个列表。监视器在后台运行，
因此列表中只要包含任何插件接收者，自动保存就会停止并报告
`plugin-dependent age recipients require interactive synchronization`，即使列表中也有原生接收者。
对于由监视器保存的文件，请仅使用 age、带标签的 age 和 SSH 格式。
:::

### 使用现有 SSH 密钥 {#use-an-existing-ssh-key}

如果 SSH 私钥没有口令，其公钥可直接用作接收者，无需安装其他工具。添加 `.pub` 文件中的内容：

```sh
cat ~/.ssh/id_ed25519.pub
```

```toml
[history.encryption]
recipients = ["ssh-ed25519 AAAAC3Nza... you@desktop"]
```

之后 mise 会使用 `~/.ssh/id_ed25519` 解密。

mise 不会提示输入 SSH 密钥口令，因此受口令保护的 SSH 密钥完全无法用于解密历史记录。mise 首次
需要该密钥时，错误会指出文件及失败原因。请改为生成专用 age 密钥。此处与 Git 身份验证不同：
Git 更适合使用受口令保护并托管在 SSH agent 中的密钥，而 agent 无法协助 age 解密。

### 生成专用 age 密钥 {#generate-a-dedicated-age-key}

安装 age CLI 并创建身份密钥：

```sh
mise use -g age
mkdir -p ~/.config/mise
mise exec -- age-keygen -o ~/.config/mise/age.txt
# Public key: age1qyqszq...
```

`age.txt` 保存私钥身份，mise 会从该路径读取。命令打印的 `age1...` 值就是接收者。请勿跟踪此文件，
并使用 `chmod 600 ~/.config/mise/age.txt` 限制其访问权限。在每台机器上重复此操作，并将所有公钥加入
`recipients`。

### 添加恢复接收者 {#add-a-recovery-recipient}

如果唯一保存身份密钥的机器丢失，加密历史记录就会无法读取，因为重新加密前必须先解密。请生成一个
不存放在任何机器上的第二身份密钥：

```sh
(umask 077 && mise exec -- age-keygen -o ~/recovery-key.txt)
cat ~/recovery-key.txt
```

将其公钥加入 `recipients`，把文件内容存入密码管理器或其他离线位置，然后删除本地副本：

```sh
rm ~/recovery-key.txt
```

请像保存备用验证码一样保管此密钥：加入后，它可以解密所有加密内容。不要将它放在受跟踪路径或监视器
会保存的位置。

以下配置为两台机器和一个恢复密钥设置了接收者：

```toml
[history.encryption]
recipients = [
  "age1qyqszq...",  # desktop
  "age1ljx8w2...",  # laptop
  "age1v9zm4f...",  # recovery, stored in the password manager
]
```

替换机器需要能访问 Git 远程仓库，并拥有匹配的 age 身份密钥。请将这两项分别保存在可恢复的位置，
并先在新机器上测试还原，再依赖此方案。

### 更改接收者 {#change-recipients}

更改列表后，保存操作会重新加密它捕获的文件。未被此次保存捕获的文件会继续使用旧加密方式，包括
未在保存命令中指定且设置了 `autosave = false` 的文件，以及其他平台的
[变体](/dotfiles/history.html#variants)。若要一并重新加密这些文件，请在更改列表后运行：

```sh
mise dot save --re-encrypt
```

此命令会重新加密每个文件已保存的版本，但不会保存尚未保存的编辑内容。当前机器必须能够解锁每个
文件；如果有任何文件无法解锁，则不会保存任何内容，错误会列出这些文件。

历史记录中已有的提交仍使用提交时的接收者列表，因此后来添加的机器只能读取更改后保存的版本，无法
读取之前的版本。保存需要所有机器读取的私密内容前，请先添加每台机器的接收者。

## 历史记录中已有明文 {#plaintext-already-in-history}

加密之前已保存的文件不会删除 Git 中较早的明文版本。推送前，mise 会根据加密设置检查所有可到达的
提交，包括中间保存记录和合并父提交。即使最新版本已加密，只要较早版本仍是明文，推送就会被阻止。
若要推送，请移除这段历史记录或显式允许明文历史。

### 已保存版本中的机密 {#secrets-in-saved-versions}

凭据过滤器会检查文件名，因此即使受跟踪的 `~/.bashrc` 中导出了多个令牌，也会照常保存。推送前，
mise 还会读取远程仓库尚未包含的版本；如果某一行看起来像机密，就会拒绝发布。识别内容包括服务商
令牌（`ghp_`、`github_pat_`、`glpat-`、`sk-`、`AKIA`、`xox`）、私钥区块，以及赋值给以 `_KEY`、
`_TOKEN`、`_SECRET` 或 `_PASSWORD` 结尾名称的内容。错误只会指出文件、行号和保存版本，不会显示
机密值。超过 1 MiB 的文件和二进制文件不会读取。

从当前文件中删除机密并不能解决问题，因为较早版本仍保留该值，而加密仅保护之后的保存记录。请轮换
机密、[从历史记录中移除明文](#remove-plaintext-from-history)，并在再次保存文件前启用加密。若仍要
发布，可使用 [`--allow-plaintext-history`](#allow-plaintext-history)；该选项会同时跳过此检查和加密
检查。远程仓库已有的版本不会再次读取。此扫描仅能拦截明显情况，不能证明版本中不含机密。

### 允许明文历史 {#allow-plaintext-history}

若仍要发布较早的未加密版本，可在单次同步时跳过检查：

```sh
mise dot sync --allow-plaintext-history
```

若要在每次同步和拉取时都允许此行为（包括监视器的操作），请将以下内容加入全局配置：

```toml
[settings.history]
allow_plaintext_history = true
```

这两种方式都会将旧明文发布到远程仓库。之后的保存仍遵循各文件的加密设置。mise 会忽略项目配置中的
[`history.allow_plaintext_history`](/configuration/settings.html#history.allow_plaintext_history)
设置。

### 从历史记录中移除明文 {#remove-plaintext-from-history}

如果启用加密前曾保存凭据，请先轮换这些凭据。加密无法保护旧提交中的副本，即使仓库是私有的也一样。

停止监视器服务，并备份历史仓库。请妥善保护备份，因为其中同样包含明文。如果服务名称与本文使用的
`mise-history` 相同，请停止服务并移除其已安装定义：

```sh
mise bootstrap services remove mise-history
```

此命令会通过 Linux、macOS 或 Windows 上的用户服务管理器停止服务，并防止修复期间监视器重新启动。
如果服务使用了其他名称，请改用实际名称。

如果明文从未推送到远程仓库，可以删除受影响的检查点，并在启用加密后重新保存当前文件。这会删除
最后一个安全提交之后的所有检查点，包括其他文件的更改。可通过 `mise dot history` 查找该提交，
也可使用下面的 `git log` 命令检查仓库。

请将下面的 `safe` 和凭据路径替换为相应提交及受跟踪文件，并确保保存前已为该路径配置加密。历史记录
使用裸 Git 仓库，因此请用 `git update-ref` 移动分支：

```sh
repo="${MISE_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/mise}/history/repo.git"
git --git-dir="$repo" log --all -- home/.config/app/credentials
old="$(git --git-dir="$repo" rev-parse refs/heads/main)"
safe="<commit before plaintext was saved>"

if git --git-dir="$repo" merge-base --is-ancestor "$safe" "$old"; then
  git --git-dir="$repo" update-ref -m "remove plaintext history" \
    refs/heads/main "$safe" "$old" &&
    mise dot save ~/.config/app/credentials \
      --description "save encrypted credentials" &&
    mise dot sync
fi
```

祖先关系检查会拒绝当前历史记录之外的提交。将 `old` 传给 `update-ref` 后，如果其他进程移动了分支，
更新就会失败。保存操作会以加密形式记录当前文件，并重建 mise 检查点索引。移动分支会使被丢弃的
提交无法到达，但不会立即从仓库中删除其中的明文对象。确认历史修复正确且不再需要这些对象进行恢复
后，再将其清除：

```sh
git --git-dir="$repo" reflog expire --expire=now --all
git --git-dir="$repo" gc --prune=now
```

备份仍包含已丢弃的历史记录。确定不再需要后，才能删除备份。

如果要保留较晚的检查点，请在单独且安全的副本上使用
[git-filter-repo](https://github.com/newren/git-filter-repo) 等工具。替换本地 `refs/heads/main` 前，
请确认所有可到达的提交都不再包含受保护路径的明文。不要直接过滤 mise 正在使用的仓库。

如果明文已推送，请暂停所有使用该仓库的机器上的历史记录功能。修复历史后，使用 Git 的
`--force-with-lease` 推送替换分支；mise 自身绝不会强制推送。在其他每台机器上，将现有历史存储移到
安全备份位置，然后运行 `mise bootstrap --adopt <url>`，从审核过的替换分支创建新的存储。重新接管时，
mise 会先比较现有文件和传入配置，再创建本地历史关系：相同的文件会被接受，有差异的文件则等待你
决定。如果某台机器上的本地历史与此无关且准备丢弃，可使用
[一次性替换历史记录](/dotfiles/sync.html#adopt-the-origins-history)：
`mise bootstrap --adopt <url> --replace-history --yes`。

普通的 `mise dot sync` 从不会替换现有历史记录。所有机器都改用替换后的历史前，请勿重启任何监视器，
否则旧存储可能会重新引入明文。Git 托管服务仍可能保留旧对象或备份。

修复完成后，重新启动监视器：

```sh
mise bootstrap services apply
```
