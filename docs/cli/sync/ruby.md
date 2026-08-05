<!-- 由 usage-cli 根据用法规范生成 -->
# `mise sync ruby`

- **用法**：`mise sync ruby [--brew]`
- **效果**：修改状态
- **源代码**：[`src/cli/sync/ruby.rs`](https://github.com/jdx/mise/blob/main/src/cli/sync/ruby.rs)

将外部工具中的所有 ruby 工具版本符号链接到 mise。

## 标志

### `--brew`

从 Homebrew 获取工具版本

示例：

```
brew install ruby
mise sync ruby --brew
mise use -g ruby - 使用 Homebrew 安装的最新 Ruby 版本
```
