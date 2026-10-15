---
description: "Add packages to the project's dependencies"
---

<!-- 由 usage-cli 根据用法规范生成 -->
# `mise deps add`

- **用法：** `mise deps add [-D --dev] <PACKAGES>…`
- **作用：** 修改状态
- **源代码：** [`src/cli/deps/add.rs`](https://github.com/jdx/mise/blob/main/src/cli/deps/add.rs)

Add packages to the project's dependencies

Runs the package manager's own add command, which updates the project's
manifest (for npm, package.json) and its lockfile, not mise.toml. To install a
CLI tool from npm for mise to manage, use `mise use npm:<package>` instead.
Name each package as `<ecosystem>:<package>`, such as `npm:react` or
`npm:@types/react@19`. See
<https://mise.jdx.dev/dev-tools/deps.html#adding-and-removing-packages>.

## Arguments
- **`<PACKAGES>…`** — Packages to add, such as `npm:react` or `npm:@types/react@19`

## 标志
- **`-D --dev`** — 添加为开发依赖
- **`-h --help`** — 打印帮助

## Examples

Add react to package.json

```
mise deps add npm:react
```

Add vitest as a dev dependency

```
mise deps add -D npm:vitest
```

<!-- generated reference navigation -->

## 相关文档

- [项目依赖](/dev-tools/deps.html)。
- [`mise deps [FLAGS] [PROVIDER] [SUBCOMMAND]`](/cli/deps.html)。
- [全局标志和参数语法](/cli/#global-flags)。
