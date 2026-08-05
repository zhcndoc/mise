<!-- 由 usage-cli 根据使用规范生成 -->
# `mise token gitlab`

- **用法**：`mise token gitlab [--unmask] [HOST]`
- **作用**：只读
- **源代码**：[`src/cli/token/gitlab.rs`](https://github.com/jdx/mise/blob/main/src/cli/token/gitlab.rs)

GitLab 令牌。

## 参数

### `[HOST]`

GitLab 主机名

**默认：** `gitlab.com`

## 标志

### `--unmask`

显示完整的未掩码 token

示例：

```
$ mise token gitlab
gitlab.com: glpa…xxxx (source: GITLAB_TOKEN)

$ mise token gitlab --unmask
gitlab.com: glpat-xxxxxxxxxxxx (source: GITLAB_TOKEN)

$ mise token gitlab gitlab.mycompany.com
gitlab.mycompany.com: (none)
```
