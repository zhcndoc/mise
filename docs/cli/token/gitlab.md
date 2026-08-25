<!-- 由 usage-cli 根据使用规范生成 -->
# `mise token gitlab`

- **用法：** `mise token gitlab [--unmask] [HOST]`
- **效果：** 只读
- **源代码：** [`src/cli/token/gitlab.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/gitlab.rs)

显示 mise 将用于指定主机的 GitLab token

显示 mise 将使用哪个 token 来源，有助于调试身份验证问题。默认情况下，token 会被隐藏。

## 参数
- **`[HOST]`** — GitLab 主机名

  **默认值：** `gitlab.com`

## 标志
- **`--unmask`** — 显示完整的未隐藏 token
- **`-h --help`** — 显示帮助

示例：

```
$ mise token gitlab
gitlab.com: glpa…xxxx (source: GITLAB_TOKEN)

$ mise token gitlab --unmask
gitlab.com: glpat-xxxxxxxxxxxx (source: GITLAB_TOKEN)

$ mise token gitlab gitlab.mycompany.com
gitlab.mycompany.com: (none)
```
