<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap packages use`

- **用法**：`mise bootstrap packages use [FLAGS] <PACKAGE>…`
- **别名**：`u`
- **作用**：修改状态
- **源代码**：[`src/cli/system/use.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/use.rs)

将引导包添加到 [bootstrap.packages] 并安装它们

类似于工具的 `mise use`：将 `"manager:package" = "version"` 条目写入
mise.toml（默认写入本地配置，使用 `-g` 时写入全局配置），然后
安装所有缺失的内容。

版本通过 `@` 进行固定：`mise bootstrap packages use apt:curl@8.5.0-2`。没有
`@`（或使用 `@latest`）时，不会写入固定版本。brew formula 和 cask
则通过名称来指定版本（例如 `brew:postgresql@17`、
`brew-cask:temurin@17`），其中 `@` 是 Homebrew 名称的一部分，而不是
mise 的版本选择器。mas 使用数字 ADAM ID，不支持固定版本。

## 参数

### `<PACKAGE>…`

`manager:package[@version]` 形式的包

## 标志

### `-e --env <ENV>`

写入此环境的配置文件（mise.&lt;ENV>.toml）

### `-g --global`

写入全局配置（~/.config/mise/config.toml），而不是本地配置

### `-n --dry-run`

打印将要运行的命令，不写入配置或进行安装

### `-p --path <PATH>`

写入此配置文件或目录

### `-y --yes`

跳过确认提示

示例：

```
mise bootstrap packages use apk:zlib-dev apt:curl brew:jq brew-cask:firefox flatpak:org.mozilla.firefox flatpak-user:org.gnome.Builder mas:497799835
mise bootstrap packages use -g brew:postgresql@17
mise bootstrap packages use apt:curl@8.5.0-2
```
