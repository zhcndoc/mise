# apt <Badge type="warning" text="experimental" />

适用于 Debian 系 Linux（Debian、Ubuntu、Mint 等）的系统包。

```toml
[bootstrap.packages]
"apt:libssl-dev" = "latest"
"apt:curl" = "8.5.0-2ubuntu10" # 版本固定
"apt:gcc:arm64" = "latest"     # 架构限定符
```

## 行为

- 使用 `dpkg-query` 检查包状态（只读，绝不提权）。
- 缺失的包会通过 `apt-get install -y` 安装，必要时会使用
  sudo 提权（见 [sudo](/bootstrap/packages/#sudo)）。
- 版本锁定会以 apt 原生的 `name=version` 语法传递给 apt；
  `name:arch` 限定符会通过包名继续传递。
- 设置 `DEBIAN_FRONTEND=noninteractive`，因此安装过程绝不会因
  配置提示而阻塞。
- `mise bootstrap packages upgrade` 会先运行 `apt-get update`，然后对已配置的包执行
  `apt-get install --only-upgrade`，因此不会拉取任何尚未安装的包。

## 元数据刷新

如果 `/var/lib/apt/lists` 中不包含任何包列表（全新容器），mise 会在安装前自动运行 `apt-get update`。否则，它不会触碰 apt 元数据——如果安装因“Unable to locate package”而失败，请显式刷新：

```sh
mise bootstrap packages apply --update
```

## 版本固定

当安装了不同版本时，固定项（`"apt:curl" = "8.5.0-2ubuntu10"`）会在 `mise bootstrap packages status` 中显示为 `version mismatch`，
而 `mise bootstrap packages apply` 会将该固定版本传递给 apt 以进行修正。`"latest"` 项
由任何已安装版本满足——请使用 `mise bootstrap packages upgrade` 将它们升级到
最新可用版本。
