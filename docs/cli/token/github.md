<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise token github`

- **用法**: `mise token github [FLAGS] [HOST]`
- **源代码**: [`src/cli/token/github.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/github.rs)

GitHub 令牌

## 参数

### `[HOST]`

GitHub 主机名

**默认：** `github.com`

## 标志

### `--oauth`

仅通过原生 GitHub OAuth 来源解析（缓存、刷新或设备代码流程），绕过其他令牌来源

### `--raw`

仅打印令牌值

### `--refresh`

即使缓存的 OAuth 令牌尚未过期，也通过刷新令牌授权或新的设备代码流程生成一个新的 OAuth 令牌。在更改 GitHub App 的安装或权限后使用：缓存令牌会保留其原有访问权限，直到过期

### `--unmask`

显示完整的未掩码令牌

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
