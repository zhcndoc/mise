# apk <Badge type="warning" text="experimental" />

Alpine Linux 的系统包。

```toml
[bootstrap.packages]
"apk:build-base" = "latest"
"apk:zlib-dev" = "1.3.1-r2" # 版本固定
```

## 行为

- 使用 `apk info -e -v` 检查包状态（只读，绝不提升权限）。
- 缺失的包使用 `apk add` 安装，在必要时通过 sudo 提权（参见 [sudo](/bootstrap/packages/#sudo)）。
- 版本锁定以 apk 原生的 `name=version` 语法传递给 apk。
- `mise bootstrap packages apply --update` 会添加 `--update-cache` 以刷新 apk 元数据。
- `mise bootstrap packages upgrade` 会对已安装的、已配置的包运行 `apk upgrade --available --update-cache`。

## 版本固定

当安装了不同版本时，固定条目（`"apk:zlib-dev" = "1.3.1-r2"`）会在 `mise bootstrap packages status` 中显示为 `version mismatch`，
而 `mise bootstrap packages apply` 会将该固定版本传递给 apk 以进行修正。
`"latest"` 条目则可由任何已安装版本满足 —— 使用
`mise bootstrap packages upgrade` 将它们升级到最新可用版本。
