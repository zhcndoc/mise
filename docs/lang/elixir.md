---
description: "通过 mise 安装 Hex 预编译的 Elixir，并搭配兼容的 Erlang/OTP。"
---

# Elixir

mise 从 Hex 安装预编译的 Elixir 发行版。Elixir 运行于 Erlang/OTP 之上，因此也要安装 [Erlang](/lang/erlang.html)。

## 快速开始 {#quick-start}

声明 Erlang 版本，以及一个针对相同 OTP 主版本编译的 Elixir 构建：

```sh
mise use erlang@29 elixir@1.20.4-otp-29
mise exec -- elixir --version
```

`elixir --version` 会同时显示 Elixir 和 Erlang/OTP 的版本，便于排查版本不匹配的问题。配置了这两个工具时，mise 会先安装 Erlang，再安装 Elixir。

在已有的 Mix 项目中，运行 `mise exec -- mix deps.get` 获取应用依赖；选择 Elixir 版本不会安装这些依赖。给 `mise use` 添加 `-g` 可设置个人默认版本。

## 选择版本 {#choosing-a-version}

Hex 会为多个 Erlang/OTP 主版本发布 Elixir 构建，版本格式为 `X.Y.Z-otp-NN`。请选择后缀与 Erlang 主版本相同的构建：

| 版本请求               | 选择的版本                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `elixir@1.20.4-otp-28` | 针对 OTP 28 编译的 Elixir 1.20.4                            |
| `elixir@1.20.4`        | 不带 OTP 后缀的 Elixir 1.20.4 构建                          |
| `elixir@1.20`          | 最新的 1.20.x，针对其支持的最新 OTP 编译                    |
| `elixir@latest`        | 最新发行版，针对其支持的最新 OTP 编译                        |

`1.20` 或 `latest` 这类前缀会选择针对最新 OTP 版本的构建。只有 Erlang 也使用最新主版本时，它才会与之匹配；如果 Erlang 固定在较旧主版本，而 Elixir 仍使用 `latest`，两者就会不匹配。运行 `mise ls-remote elixir 1.20` 可列出可用构建。

## 版本文件 {#version-files}

mise 可以读取 `.exenv-version`。若要让 Elixir 使用此文件，请启用对应设置：

```sh
mise settings add idiomatic_version_file_enable_tools elixir
```

此命令会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用。另请参阅[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

## Hex、Rebar 与 Mix 归档 {#hex-rebar-and-mix-archives}

除非已在 shell 或 `[env]` 中设置 `MIX_HOME` 或 `MIX_ARCHIVES`，否则 mise 会将它们设为所选 Elixir 版本目录中的路径：

| 变量           | 值                        |
| -------------- | ------------------------- |
| `MIX_HOME`     | `<install>/.mix`          |
| `MIX_ARCHIVES` | `<install>/.mix/archives` |

mise 还会将 `<install>/.mix/escripts` 加入 `PATH`。因此，`mix archive.install`、`mix escript.install`、Hex 和 Rebar 都是按 Elixir 版本分别管理的。安装新的 Elixir 版本后，需要重新安装 Hex 和 Rebar：

```sh
mise exec -- mix local.hex --force
mise exec -- mix local.rebar --force
```

若要让不同版本共用它们，请同时设置这两个变量，并将共享的 escripts 目录加入 `PATH`。如果 shell 或 `[env]` 已设置 `MIX_HOME` 或 `MIX_ARCHIVES`，mise 不会覆盖它们：

```toml [mise.toml]
[env]
MIX_HOME = "{{env.HOME}}/.mix"
MIX_ARCHIVES = "{{env.HOME}}/.mix/archives"
_.path = ["{{env.HOME}}/.mix/escripts"]
```

## mise 如何安装 Elixir {#how-mise-installs-elixir}

mise 会从 `builds.hex.pm` 下载对应构建的 zip 归档，并在 `PATH` 中使用已配置的 Erlang 运行 `elixir --version` 进行检查。[`mise lock`](/cli/lock.html) 会记录 Hex 为该构建发布的校验和。

如果已安装名为 `elixir` 的插件，它会优先于内置安装器。如果 mise 的行为与本文描述不符，请检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

## 工具选项 {#tool-options}

Elixir 没有专属选项。`install_env`、`postinstall` 和 `os` 等通用选项的用法请参阅[工具选项](/dev-tools/#tool-options)。`install_env` 只会影响 `elixir --version` 检查和 `postinstall` 命令，不会为后续使用设置 `MIX_HOME` 或其他变量；请在 `[env]` 中设置这些变量。
