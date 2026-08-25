<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise token github`

- **Usage：** `mise token github [FLAGS] [HOST]`
- **Effect：** 只读
- **Source code：** [`src/cli/token/github.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/github.rs)

显示 mise 将用于指定主机的 GitHub token

显示 mise 将使用的 token 来源，有助于调试身份验证问题。默认情况下会遮盖 token。

## 参数
- **`[HOST]`** — GitHub 主机名

  **默认值：** `github.com`

## 标志
- **`--oauth`** — 仅通过原生 GitHub OAuth 来源（缓存、刷新或设备代码流程）进行解析，绕过其他 token 来源
- **`--raw`** — 仅打印 token 值
- **`--refresh`** — 即使缓存的 token 尚未过期，也通过 refresh-token grant 或新的设备代码流程生成新的 OAuth token。在更改 GitHub App 的安装或权限后使用：缓存的 token 会保留其原始访问权限，直到过期
- **`--unmask`** — 显示完整的未遮盖 token
- **`-h --help`** — 打印帮助

示例：

```
$ mise token github
github.com: ghp_…xxxx (source: GITHUB_TOKEN)

$ mise token github --unmask
github.com: ghp_xxxxxxxxxxxx (source: GITHUB_TOKEN)

$ mise token github github.mycompany.com
github.mycompany.com: (none)

$ mise token github --oauth --refresh
github.com: gho_…xxxx (source: GitHub OAuth)
```
