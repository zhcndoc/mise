# Conda 后端

你可以直接从 [conda-forge](https://conda-forge.org/) 和其他
Anaconda 频道安装软件包，而无需安装 conda 或 mamba。

这个后端从 anaconda.org API 获取预先构建的软件包并直接解压它们，
使其成为将 conda 软件包作为独立 CLI 工具安装的一种轻量级方式。

其代码位于 mise 仓库中的 [`./src/backend/conda.rs`](https://github.com/jdx/mise/blob/main/src/backend/conda.rs)。

## 依赖项

无。与其他 conda 工具不同，此后端不需要安装 conda、mamba 或 micromamba。  
它会直接从 anaconda.org 下载并解压软件包。

## 用法

以下命令会安装 [ruff](https://anaconda.org/conda-forge/ruff) 的最新版本
并将其设置为 PATH 上的活动版本：

```sh
$ mise use -g conda:ruff
$ ruff --version
ruff 0.8.0
```

版本将以以下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"conda:ruff" = "latest"
```

### 指定版本

```sh
mise use -g conda:ruff@0.7.0
```

### 使用不同的频道

默认情况下，软件包会从 `conda-forge` 安装。你可以指定其他频道：

```sh
mise use -g "conda:ruff[channel=bioconda]"
```

或者在 `mise.toml` 中：

```toml
[tools]
"conda:ruff" = { version = "latest", channel = "bioconda" }
```

## 平台支持

conda 后端会自动为你的平台选择合适的软件包：

| 平台        | Conda 子目录    |
| ----------- | --------------- |
| Linux x64   | linux-64        |
| Linux ARM64 | linux-aarch64   |
| macOS x64   | osx-64          |
| macOS ARM64 | osx-arm64       |
| Windows x64 | win-64          |

如果没有可用的特定平台软件包，后端将回退到 `noarch` 软件包。

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
"conda:bioconductor-deseq2" = { version = "latest", channel = "bioconda" }
```

## 常见渠道

- `conda-forge` - 社区维护的软件包（默认）
- `bioconda` - 生物信息学软件包
- `nvidia` - NVIDIA CUDA 软件包

## 限制

- 只能安装单个包，不能安装带依赖项的完整 conda 环境
- 最适合不需要复杂依赖树的独立 CLI 工具
- 不管理 Python 环境或像完整 conda/mamba 那样的包依赖
