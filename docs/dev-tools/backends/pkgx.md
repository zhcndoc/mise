---
description: "无需调用 pkgx CLI 即可从 pkgx pantry 安装软件包。"
---

# pkgx 后端 <Badge type="warning" text="实验性" />

`pkgx` 后端会从 [pkgx pantry](https://github.com/pkgxdev/pantry) 安装软件包，而无需调用 `pkgx` CLI。mise 会解析 pantry 元数据，从 `dist.pkgx.dev` 下载 pkgx bottles，在可用时验证 bottle 校验和，并写入设置软件包运行时环境的包装脚本。

此后端目前处于实验阶段。在 `mise.toml` 中为项目启用它：

```toml
[settings]
experimental = true
```

或者在单个命令前加上 `MISE_EXPERIMENTAL=1`。

## 用法

通过 pantry 项目名称安装 pkgx 软件包。这通常是域名和路径，而不是可执行文件名称：

```sh
mise use pkgx:stedolan.github.io/jq@1.7.1
mise exec -- jq --version
```

版本将以以下格式设置在 `mise.toml` 中：

```toml
[tools]
"pkgx:stedolan.github.io/jq" = "1.7.1"
```

## 锁文件

pkgx 后端支持 [`mise.lock`](/dev-tools/mise-lock)。锁定会在工具条目上记录主 bottle URL 和校验和，并在共享的 `[pkgx-packages]` 锁文件部分中记录传递性的 pkgx 依赖。

```sh
mise lock
mise install --locked
```

使用 `--locked` 时，mise 要求当前平台存在锁文件 URL；如果锁文件缺失或不完整，则会失败，而不会执行实时 pantry 解析。

## 说明

- 此后端目前支持 pkgx 发布 bottles 的平台
- 版本要求会使用 npm 风格的 semver 范围从 pkgx pantry 元数据中解析
- pantry 清单中的运行时环境会通过生成的包装器应用

## 故障排除

使用 `mise ls-remote pkgx:stedolan.github.io/jq` 检查软件包标识符和可用版本。某个版本仍需存在适用于你的平台的 bottles 及其传递性依赖。使用 `mise exec -- jq --version` 验证生成的启动器和运行时环境。

不要通过将启动器底层的二进制文件复制到其他位置来绕过启动器：包装器会提供 pantry 定义的库路径和环境。对于锁定安装，请同时保留共享的 `pkgx-packages` 条目和顶层工具条目。
