---
description: "通过 mise 安装 Erlang/OTP：优先使用可用的预编译版本，也可通过 kerl 从源码构建。"
---

# Erlang

如果你的平台有对应的预编译构建，mise 会直接安装 Erlang/OTP；否则会使用 [kerl](https://github.com/kerl/kerl) 从源码编译。

## 快速开始 {#quick-start}

为项目安装 Erlang，然后在不启动交互式 shell 的情况下输出 OTP 发行版本：

```sh
mise use erlang@29
mise exec -- erl -noshell -eval 'io:format("~s~n", [erlang:system_info(otp_release)]), halt().'
# 29
```

使用 `mise use -g erlang@29` 可设置个人默认版本。若要使用 Elixir，请参阅 [Elixir 指南](/lang/elixir.html)，了解如何为你的 OTP 主版本选择 Elixir 构建。

## 选择版本 {#choosing-a-version}

`erlang@29` 会选择最新的 29.x 版本，`erlang@29.1.1` 会选择指定版本，`erlang@latest` 则会选择最新发行版。运行 `mise ls-remote erlang` 可列出可用版本。完整语法请参阅[版本请求](/dev-tools/versions.html)。

## 版本文件 {#version-files}

mise 不会读取 Erlang 专属版本文件。请在 `mise.toml` 或 `.tool-versions` 中设置版本。

## mise 如何安装 Erlang {#kerl}

默认情况下，mise 会先尝试使用适用于当前平台的预编译构建；如果没有可用构建，则改用 kerl 从源码编译：

| 平台                                                                 | 默认来源                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| macOS (x64, arm64)                                                   | 使用 [erlef/otp_builds](https://github.com/erlef/otp_builds) 提供的预编译构建               |
| Windows (x64, x86)                                                   | 使用 [Erlang/OTP GitHub 发行版](https://github.com/erlang/otp/releases) 提供的预编译构建     |
| Ubuntu 20.04、22.04 和 24.04 (x64, arm64)，包括 GitHub Actions       | 使用 `builds.hex.pm` 上的 [Bob](https://github.com/hexpm/bob#erlang-builds) 预编译构建       |
| 其他 Linux 发行版，以及 Alpine 等 musl 系统                           | 使用 kerl 从源码编译                                                                          |

将 [`erlang.compile`](/lang/erlang.html#erlang.compile) 设为 `true` 可始终从源码构建；设为 `false` 则在没有预编译构建时直接报错，而不进行编译。mise 不会设置 Erlang 环境变量；安装目录中的 `bin` 会加入 `PATH`。

在 Linux 上，mise 会读取 `/etc/os-release` 来识别 Ubuntu 发行版。在 GitHub Actions 的 Ubuntu runner 上，则读取 runner 的 `ImageOS`（`ubuntu20`、`ubuntu22` 或 `ubuntu24`）。如果没有适用的预编译构建，[`mise lock`](/cli/lock.html) 会记录 Erlang/OTP 源码归档，使所有使用锁文件的机器都编译相同的发行版。如果在 macOS 或 Windows 上运行 `mise lock` 并解析 Linux 平台，它会记录 Bob 的 Ubuntu 24.04 构建。

在 Alpine 和 NixOS 上，[`all_compile`](/configuration/settings.html#all_compile) 当前默认为 `true`，因此 mise 会直接编译 Erlang，不会尝试使用预编译构建。此默认值已弃用，并将在 mise 2027.8.0 中更改，但对 Erlang 影响不大：mise 没有适用于 musl 的预编译 Erlang，因此 Alpine 始终需要编译。mise 不会将 NixOS 识别为 Ubuntu 发行版，所以即使默认值更改，除非选择 Bob 的某个目标版本，否则 NixOS 仍会编译。在启用了 [nix-ld](https://github.com/Mic92/nix-ld) 的 NixOS 上，可将 `all_compile = false`，并设置 [`erlang.precompiled_os`](/lang/erlang.html#erlang.precompiled_os) 来使用 Bob 的构建（见下一节）。如果设置 `erlang.compile = false`，在没有适用预编译构建时安装会失败而非编译，因此不要在 Alpine 上设置，也不要在未配置 `erlang.precompiled_os` 的 NixOS 上设置。若要继续编译，请显式设置 `all_compile = true`。

如果已安装名为 `erlang` 的插件，它会优先于内置安装器。如果 mise 的行为与本文描述不符，请检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

### 在其他发行版上使用 Bob 的 Ubuntu 构建 {#bobs-ubuntu-builds-on-other-distributions}

Bob 的构建面向 Ubuntu，但也可能在系统库兼容的其他 glibc Linux 发行版上运行。Ubuntu 26.04 目前不会被自动识别。设置 [`erlang.precompiled_os`](/lang/erlang.html#erlang.precompiled_os) 可指定 Bob 的一个目标版本：

```toml [mise.toml]
[settings.erlang]
precompiled_os = "ubuntu-24.04"
```

可选目标为 `ubuntu-20.04`、`ubuntu-22.04`、`ubuntu-24.04` 和 `ubuntu-26.04`。

预编译构建会链接 OpenSSL、ncurses、ODBC 和 wxWidgets 等系统库。仅有兼容的 glibc 并不能保证所有可选 Erlang 应用都能正常工作。`mise.lock` 会记录所选目标，因此应选择一个能在所有使用此锁文件的机器上运行的目标。

### 使用 kerl 从源码构建 {#source-builds-with-kerl}

从源码构建需要安装 kerl 的[构建依赖](https://github.com/kerl/kerl#building-erlangotp)。mise 会自行下载 kerl 和 Erlang/OTP 源码归档，并按每个 CPU 一个 make 任务的方式运行 `kerl build-install`。若要传入 configure 参数，请通过 `install_env` 设置 `KERL_CONFIGURE_OPTIONS`：

```toml [mise.toml]
[tools]
erlang = { version = "29", install_env = { KERL_CONFIGURE_OPTIONS = "--without-javac" } }
```

mise 会自行设置 `KERL_BASE_DIR`、`KERL_DOWNLOAD_DIR` 和 `KERL_BUILD_BACKEND`，因此在 `install_env` 中为这些变量指定的值会被忽略。

## 工具选项 {#tool-options}

Erlang 没有专属选项。`install_env` 会传递给 kerl 源码构建、Linux 预编译构建的安装步骤以及 `postinstall` 命令。其他通用选项请参阅[工具选项](/dev-tools/#tool-options)。

## 设置 {#settings}

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="erlang" :level="3" />
