---
description: "直接安装 Conda 软件包及其依赖项，无需单独安装 Conda"
---

# Conda 后端

`conda` 后端会从 [conda-forge](https://conda-forge.org/) 或其他 Anaconda 频道直接安装命令行软件包及其传递依赖项。它会解析依赖项并直接下载软件包，因此无需安装 conda、mamba 或 micromamba。

所选软件包中的命令会在该软件包隔离的 conda 前缀中运行。mise 会设置
`CONDA_PREFIX`，使前缀的可执行文件目录可供命令进程使用，并在启动命令前应用
`etc/conda/activate.d` 脚本。这使命令能够使用其打包的运行时依赖项，而无需将依赖项命令添加到交互式 shell 的 `PATH` 中。

相关代码位于 mise 仓库的 [`./src/backend/conda.rs`](https://github.com/jdx/mise/blob/main/src/backend/conda.rs) 中。

## 依赖项

无需单独的 conda 软件包管理器。所选软件包仍必须支持你的操作系统、架构和本机运行时环境。

## 用法

在当前项目中安装 ruff 并验证其可执行文件：

```sh
mise use conda:ruff
mise exec -- ruff --version
```

这会将以下内容写入 `mise.toml`。添加 `-g` 可进行全局配置。

```toml
[tools]
"conda:ruff" = "latest"
```

### 指定版本

使用 `mise ls-remote conda:ruff` 列出版本，然后使用
`mise use conda:ruff@VERSION` 选择一个版本。将 `VERSION` 替换为列出的版本。

### 使用不同的频道

默认频道为 `conda-forge`。对于发布在团队频道中的软件包，将以下占位符替换为其软件包名称和频道名称：

```toml
[tools]
"conda:my-tool" = { version = "latest", channel = "my-team" }
```

解析器会使用所选频道来获取软件包及其依赖项。完整的依赖项集合必须在该频道中可用；这不是多频道 conda 环境规范。

## 平台支持

conda 后端会自动为你的平台选择合适的软件包：

| 平台        | Conda 子目录    |
| ----------- | --------------- |
| Linux x64   | linux-64        |
| Linux ARM64 | linux-aarch64   |
| macOS x64   | osx-64          |
| macOS ARM64 | osx-arm64       |
| Windows x64 | win-64          |

解析器会同时考虑平台子目录和 `noarch`。`noarch` 软件包仍可能依赖于特定平台的软件包，因此不能保证安装在每台主机上都能正常工作。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列出的环境变量来设置这些项。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="conda" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `conda` 后端——这些
应写入 `mise.toml` 中的 `[tools]`。

### `channel`

为特定包覆盖 conda 通道：

```toml
[tools]
"conda:my-tool" = { version = "latest", channel = "my-team" }
```

## 常见渠道

- `conda-forge` - 社区维护的软件包（默认）
- `bioconda` - 生物信息学软件包
- `nvidia` - NVIDIA CUDA 软件包

## 限制

- mise 会在每个工具的隔离前缀中解析并安装传递依赖项。它不会导入或维护通用的 `environment.yml`。
- 只有属于所请求软件包的命令会暴露给你的 shell。依赖项的可执行文件仍可在该工具的启动器环境中使用。
- 解析器为每个工具使用一个频道。来自 bioconda 等频道的软件包可能需要另一个频道中的依赖项，而此配置无法提供这些依赖项。
- 兼容的 libc 或 GPU 驱动程序等本机要求仍由主机负责。

如果找不到某个命令，请检查所请求的软件包是否确实提供 CLI。如果解析失败，请在更改版本之前检查软件包是否可用、所选频道以及错误中报告的平台。
