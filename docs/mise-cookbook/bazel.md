---
description: "通过 mise 安装项目在 .bazelversion 中固定的 Bazel 版本，或运行 Bazelisk。"
---

# Bazel

安装项目 `.bazelversion` 文件中声明的 Bazel 版本，这样就不必在 `mise.toml` 中重复指定版本。

## 使用项目的 `.bazelversion` {#use-a-project-s-bazelversion}

在项目中为 `bazel` 启用[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)：

```sh
mise settings add --local idiomatic_version_file_enable_tools bazel
```

`--local` 会将此设置写入项目的 `mise.toml`，因此所有克隆项目的人都会读取 `.bazelversion`。去掉 `--local` 则会改为在全局配置中启用，让你的所有项目都使用此设置。

例如，项目可通过以下文件选择 Bazel 9.2.0：

```text [.bazelversion]
9.2.0
```

在该项目目录中安装所选工具并检查 Bazel：

```sh
mise install
mise exec -- bazel --version
```

`mise tool bazel --requested` 会显示 mise 读取到的版本请求。如果项目也在 `mise.toml` 中设置了 Bazel，请移除该条目，让 `.bazelversion` 决定所选版本。

## 检查 mise 可读取的值 {#supported-values}

mise 只读取 `.bazelversion` 的第一行。它接受具体的发行版本，包括候选版本和预发布版本：

| 值                                                       | mise 是否读取 |
| -------------------------------------------------------- | ------------- |
| `7.2.1`                                                  | 是            |
| `8.0.0rc1`                                               | 是            |
| `5.0.0-pre.20210317.1`                                   | 是            |
| `latest`、`latest-1`、`last_green`、`last_rc`、`rolling` | 否            |
| `8.x`、`8.*`                                             | 否            |
| 提交哈希或 `<FORK>/<VERSION>`                            | 否            |

即使后续行包含受支持的版本，只要第一行的值不受支持，mise 就不会读取到版本请求。若要不受此文件影响而单独选择 Bazel 版本，请在 `mise.toml` 中设置：

```sh
mise use bazel@9.2.0
```

## 改用 Bazelisk {#using-bazelisk-instead}

Bazelisk 是一种启动器，会自行读取 `.bazelversion` 并下载其中指定的 Bazel 发行版。如果项目依赖 `last_green` 之类的 Bazelisk 版本选择器，请通过 mise 安装 Bazelisk 并让它读取该文件：

```sh
mise use bazelisk
mise exec -- bazelisk --version
```

`.bazelversion` 选择的是 Bazel 版本，而不是 Bazelisk 版本，因此为 `bazelisk` 启用惯用版本文件不会产生作用。
