<!-- @由 usage-cli 根据 usage spec 生成 -->
# `mise patrons`

- **用法：** `mise patrons [-J --json] [--refresh]`
- **效果：** 只读
- **源代码：** [`src/cli/patrons.rs`](https://github.com/jdx/mise/blob/main/src/cli/patrons.rs)

显示以 Patron 级别成员身份支持 mise 的个人

列出来自 &lt;<https://jdx.dev/patrons.json>> 的 Patron 级别个人。
该列表每天刷新一次；支持终端将通过 OSC 8 超链接将每位 Patron 的
姓名渲染为可点击链接。

要出现在这里，请在 &lt;<https://jdx.dev/sponsors.html>> 成为 Patron。

## 标志
- **`-J --json`** — 以 JSON 格式输出
- **`--refresh`** — 绕过本地缓存并重新获取
- **`-h --help`** — 打印帮助

示例：

```
mise patrons
mise patrons -J
mise patrons --refresh
```
