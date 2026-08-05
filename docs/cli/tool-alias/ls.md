<!-- @由 usage-cli 根据用法规范生成 -->
# `mise tool-alias ls`

- **用法**：`mise tool-alias ls [--no-header] [TOOL]`
- **别名**：`list`
- **效果**：只读
- **源代码**：[`src/cli/tool_alias/ls.rs`](https://github.com/jdx/mise/blob/main/src/cli/tool_alias/ls.rs)

列出工具版本别名  
显示可以指定的别名。  
这些别名可以来自用户配置，或来自 `bin/list-aliases` 中的插件。

对于用户配置，别名定义如下，位于 `~/.config/mise/config.toml`：

```
[tool_alias.node.versions]
lts = "22.0.0"
```

## 参数

### `[TOOL]`

显示 &lt;TOOL> 的别名

## 标志

### `--no-header`

不显示表头

示例：

```
$ mise tool-alias ls
node  lts-jod      22
```
