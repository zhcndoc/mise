# pkgx 后端 <Badge type="warning" text="experimental" />

`pkgx` 后端会从 [pkgx pantry](https://github.com/pkgxdev/pantry) 安装软件包，而无需调用 `pkgx` CLI。mise 会解析 pantry 元数据，从 `dist.pkgx.dev` 下载 pkgx bottles，在可用时验证 bottle 校验和，并写入设置软件包运行时环境的包装脚本。

此后端处于实验阶段。通过以下方式启用它：

```sh
mise settings experimental=true
```

或者为单个 shell/会话设置 `MISE_EXPERIMENTAL=1`。

## 用法

通过其 pantry 项目名称安装 pkgx 包：

```sh
mise use pkgx:stedolan.github.io/jq@1.7.1
jq --version
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

当启用 `--locked` 时，mise 会为当前平台要求一个锁文件 URL；如果锁文件缺失或不完整，它将失败，而不是进行实时 pantry 解析。

## 说明

- 该后端目前支持 pkgx 发布 bottles 的平台。
- 版本要求通过使用 npm 风格的 semver 范围从 pkgx pantry 元数据中解析。
- 来自 pantry 清单的运行时环境通过生成的包装器应用。
