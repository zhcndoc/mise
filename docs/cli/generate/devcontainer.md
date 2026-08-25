<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise generate devcontainer`

- **Usage:** `mise generate devcontainer [FLAGS]`
- **Effect:** 修改状态
- **Source code:** [`src/cli/generate/devcontainer.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/devcontainer.rs)

生成一个用于执行 mise 的 devcontainer。

## Flags
- **`-i --image <IMAGE>`** — 用于 devcontainer 的镜像
- **`-m --mount-mise-data`** — 将 mise-data-volume 绑定到 devcontainer
- **`-n --name <NAME>`** — devcontainer 的名称
- **`-w --write`** — 写入 .devcontainer/devcontainer.json
- **`-h --help`** — 打印帮助

示例：

```
mise generate devcontainer
```
