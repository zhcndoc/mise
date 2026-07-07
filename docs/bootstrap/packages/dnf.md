# dnf <Badge type="warning" text="experimental" />

适用于 RedHat 系 Linux（Fedora、RHEL、CentOS Stream、Rocky、
Alma 等）的系统包。

```toml
[bootstrap.packages]
"dnf:openssl-devel" = "latest"
"dnf:postgresql-server" = "latest"
"dnf:bash" = "5.2.26-3.fc40" # 版本或 版本-发布 版本锁定
```

## 行为

- 软件包状态通过 `rpm -q` 检查（只读，绝不提权）。
- 缺失的软件包使用 `dnf install -y` 安装，必要时通过 sudo 提权
  （见 [sudo](/bootstrap/packages/#sudo)）。
- 版本固定值会以 dnf 原生的 `name-version` /
  `name-version-release` 语法传入；仅版本固定值对该版本的任意
  发布版都算满足。
- `mise bootstrap packages apply --update` 会添加 `--refresh` 以强制进行元数据
  刷新；否则 dnf 会自行管理其元数据过期。
- `mise bootstrap packages upgrade` 会对已配置的
  软件包运行 `dnf upgrade -y --refresh` —— 只会处理已安装的软件包。

::: info
仅支持 `dnf`——不支持仅有旧版 `yum` 的系统。在 RHEL/CentOS 8+
以及当前所有 Fedora 版本中，`dnf` 都是默认值。
:::
