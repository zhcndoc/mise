---
description: "在同一系统上安装和管理多个 Erlang 版本。"
socialDescription: "在同一系统上安装和管理多个 Erlang 版本。"
---

# Erlang

`mise` 可用于在同一系统上安装和管理 [erlang](https://www.erlang.org/) 的多个版本。

## 用法

为项目安装 Erlang，然后检查 OTP 发布版本，而不启动交互式 Erlang shell：

```sh
mise use erlang@latest
mise exec -- erl -noshell -eval 'io:format("~s~n", [erlang:system_info(otp_release)]), halt().'
```

使用 `mise use -g erlang@latest` 设置个人默认版本，或者将 `latest` 替换为应用程序所需的发布系列。

使用 `mise ls-remote erlang` 查看可用版本。

这些说明使用 mise 内置的 erlang 支持。已安装的同名外部插件可能会更改行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/erlang.rs)。

## kerl

mise 默认会尝试使用兼容的预编译构建，并在需要时回退到源代码构建。源代码构建使用 [kerl](https://github.com/kerl/kerl)，并需要其平台构建依赖项。设置 `erlang.compile = true` 以请求源代码构建，或设置为 `false`，以便在预编译构建不可用时失败。

有关构建依赖项和配置，请参阅 kerl 的文档。

在 GitHub Actions Linux runners 上，`ImageOS=ubuntu24`、`ImageOS=ubuntu22` 和 `ImageOS=ubuntu20` 分别对应预编译 Erlang 构建目标。在默认的 `erlang.compile` 模式下，不受支持的值会将 Erlang/OTP 源代码归档记录为平台的锁定输入，以便安装过程可以复现 kerl 回退行为。

由 [Bob](https://github.com/hexpm/bob#erlang-builds) 发布的构建以 Ubuntu 为目标，但也可能在其他具有兼容系统库的基于 glibc 的 Linux 发行版上运行。设置 `erlang.precompiled_os` 以选择 Bob 的某个 Ubuntu 目标：

```toml
[settings.erlang]
precompiled_os = "ubuntu-22.04"
```

可接受的目标包括 `ubuntu-20.04`、`ubuntu-22.04`、`ubuntu-24.04` 和 `ubuntu-26.04`。

预编译构建版本会链接到 OpenSSL、ncurses、ODBC 和 wxWidgets 等系统库。仅具有兼容的 glibc 版本并不能保证每个可选的 Erlang 应用都能正常运行。所选目标会记录在 `mise.lock` 中；请使用与所有使用该锁定文件的机器兼容的目标。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `erlang` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为 kerl 构建/安装命令以及由核心 `erlang` 后端运行的其他安装时命令设置环境变量：

```toml
[tools]
erlang = { version = "latest", install_env = { KERL_CONFIGURE_OPTIONS = "--without-javac" } }
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="erlang" :level="3" />
