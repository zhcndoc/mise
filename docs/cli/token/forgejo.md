<!-- 由 usage-cli 根据用法规范生成 -->
# `mise token forgejo`

- **Usage:** `mise token forgejo [--unmask] [HOST]`
- **Effect:** 只读
- **Source code:** [`src/cli/token/forgejo.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/forgejo.rs)

显示 mise 将用于指定主机的 Forgejo 令牌

显示 mise 将使用哪个令牌来源，有助于调试身份验证问题。默认情况下会对令牌进行掩码处理。

## 参数
- **`[HOST]`** — Forgejo 主机名

  **默认值：** `codeberg.org`

## 标志
- **`--unmask`** — 显示完整的未掩码令牌
- **`-h --help`** — 打印帮助

示例：

```
$ mise token forgejo
codeberg.org: a180…61f6 (source: FORGEJO_TOKEN)

$ mise token forgejo --unmask
codeberg.org: a18099ca69064be387fbe37b8ad1d333758361f6 (source: FORGEJO_TOKEN)

$ mise token forgejo forgejo.mycompany.com
forgejo.mycompany.com: (none)
```
