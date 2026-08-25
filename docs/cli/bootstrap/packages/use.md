<!-- @由 usage-cli 根据 usage 规范生成 -->
# `mise bootstrap packages use`

- **用法：** `mise bootstrap packages use [FLAGS] <PACKAGE>…`
- **别名：** `u`
- **效果：** 修改状态
- **源代码：** [`src/cli/system/use.rs`](https://github.com/jdx/mise/blob/main/src/cli/system/use.rs)

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
- **`<PACKAGE>…`** — 采用 `manager:package[@version]` 形式的包

## 选项
- **`-e --env <ENV>`** — Write to the config file for this environment (mise.&lt;ENV>.toml)
- **`-g --global`** — Write to the global config (~/.config/mise/config.toml) instead of the local one
- **`-n --dry-run`** — Print the commands that would run without writing config or installing
- **`-p --path <PATH>`** — Write to this config file or directory

  **别名：** `--file`
- **`-y --yes`** — Skip the confirmation prompt
- **`-h --help`** — Print help

示例：

```
mise bootstrap packages use apk:zlib-dev apt:curl brew:jq brew-cask:firefox flatpak:org.mozilla.firefox flatpak-user:org.gnome.Builder mas:497799835
mise bootstrap packages use -g brew:postgresql@17
mise bootstrap packages use apt:curl@8.5.0-2
```
