---
description: "Install a tool version into a directory outside mise"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise install-into`

- **Usage:** `mise install-into <TOOL@VERSION> <PATH>`
- **Effect:** destructive — may delete or irreversibly overwrite
- **Source code:** [`src/cli/install_into.rs`](https://github.com/jdx/mise/blob/main/src/cli/install_into.rs)

Install a tool version into a directory outside mise

Downloads or builds TOOL@VERSION into PATH for use without mise. mise does not
track the result, so it does not appear in `mise ls`.

If PATH is not empty, mise asks before deleting its contents; --yes deletes
them without asking.

## Arguments
- **`<TOOL@VERSION>`** — Tool and version to install, such as `node@24`
- **`<PATH>`** — Directory to install into; its existing contents are deleted

## 标志
- **`-h --help`** — 打印帮助

## 示例

Install node 24 into ./mynode and run it

```
mise install-into node@24 ./mynode && ./mynode/bin/node -v
v24.11.0
```

<!-- 生成的参考导航 -->

## 相关文档

- [开发工具](/dev-tools/)。
- [所有命令](/cli/)。
- [全局标志和参数语法](/cli/#global-flags)。
