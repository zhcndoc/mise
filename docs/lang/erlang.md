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

在 GitHub Actions 的 Linux runner 上，`ImageOS=ubuntu24`、`ImageOS=ubuntu22` 和 `ImageOS=ubuntu20`  
分别映射到预编译的 Erlang 构建目标 `ubuntu-24.04`、`ubuntu-22.04` 和  
`ubuntu-20.04`。不受支持的值会在默认的 `erlang.compile` 模式下禁用预编译 lockfile URL 解析，  
因此锁定安装可以回退到 kerl。

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
