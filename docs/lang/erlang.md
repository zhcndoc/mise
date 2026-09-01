# Erlang

`mise` 可用于在同一系统上安装和管理 [erlang](https://www.erlang.org/) 的多个版本。

> 以下是使用 erlang 核心插件的说明。
> 当没有安装名为“erlang”的 git 插件时，会使用该插件。

其代码位于 mise 仓库中的
[`./src/plugins/core/erlang.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/erlang.rs)。

## 用法

以下命令会安装 erlang 并将其设为全局默认版本：

```sh
mise use -g erlang@26
```

使用 `mise ls-remote erlang` 查看可用版本。

## kerl

该插件在底层使用 [kerl](https://github.com/kerl/kerl) 来构建 erlang。  
有关如何配置 kerl 的信息，请参阅 kerl 的文档。

在 GitHub Actions Linux runners 上，`ImageOS=ubuntu24`、`ImageOS=ubuntu22` 和 `ImageOS=ubuntu20` 分别对应预编译 Erlang 构建目标。在默认的 `erlang.compile` 模式下，不受支持的值会将 Erlang/OTP 源代码归档记录为平台的锁定输入，以便安装过程可以复现 kerl 回退行为。

[Bob](https://github.com/hexpm/bob#erlang-builds) 发布的构建版本以 Ubuntu 为目标，但也可能在其他基于 glibc 且系统库兼容的 Linux 发行版上运行。设置 `erlang.precompiled_os` 可选择使用 Bob 的某个 Ubuntu 目标：

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
