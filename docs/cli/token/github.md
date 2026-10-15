---
description: "Show the GitHub token mise uses for a host"
---

<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise token github`

- **Usage：** `mise token github [FLAGS] [HOST]`
- **Effect：** 只读
- **Source code：** [`src/cli/token/github.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/github.rs)

Show the GitHub token mise uses for a host

Shows the token and where it came from, to debug authentication. The token
is masked unless you pass --unmask or --raw.

## 参数
- **`[HOST]`** — GitHub 主机名

  **默认值：** `github.com`

## Flags
- **`--oauth`** — Use only native GitHub OAuth (a cached token, a refresh, or the device-code flow), ignoring other token sources
- **`--raw`** — Print only the token, unmasked, for use in scripts
- **`--refresh`** — With --oauth, get a new OAuth token even if the cached one has not expired, through the refresh-token grant or a new device-code flow. Use it after changing the GitHub App's installations or permissions: cached tokens keep their original access until they expire.
- **`--unmask`** — Show the full unmasked token
- **`-h --help`** — Print help

## Examples

Show the token for github.com

```
mise token github
github.com: ghp_…xxxx (source: GITHUB_TOKEN)
```

Show the whole token

```
mise token github --unmask
github.com: ghp_xxxxxxxxxxxx (source: GITHUB_TOKEN)
```

Check a GitHub Enterprise host

```
mise token github github.mycompany.com
github.mycompany.com: (none)
```

Get a new token through native GitHub OAuth

```
mise token github --oauth --refresh
github.com: gho_…xxxx (source: GitHub OAuth)
```

Pass the resolved token to another tool

```
GH_TOKEN=$(mise token github --raw) gh api user
```

<!-- generated reference navigation -->

## 相关文档

- [Git provider authentication](/dev-tools/github-tokens.html)。
- [`mise token <SUBCOMMAND>`](/cli/token.html)。
- [Global flags and argument syntax](/cli/#global-flags)。
