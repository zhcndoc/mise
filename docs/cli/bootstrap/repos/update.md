<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap repos update`

- **用法：** `mise bootstrap repos update [FLAGS] [PATH]…`
- **效果：** 修改状态
- **源代码：** [`src/cli/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/bootstrap.rs)

## 参数
- **`[PATH]…`** — 仅更新匹配的已配置或展开的路径

## 标志
- **`-n --dry-run`** — 输出将运行的命令，但不实际运行
- **`-y --yes`** — 跳过确认提示
- **`--skip-dirty`** — 跳过存在本地更改的仓库，而不是失败
- **`-h --help`** — 输出帮助
