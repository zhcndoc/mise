---
description: "mise 可用于在同一系统上安装和管理多个版本的 bun。"
---

# Bun

`mise` 可用于在同一系统上安装和管理 [bun](https://bun.sh/) 的多个版本。

## 用法

为当前项目安装 Bun，并检查所选的可执行文件：

```sh
mise use bun@latest
mise exec -- bun --version
```

在项目之外使用 `mise use -g bun@latest` 设置个人默认版本。提交项目的
`mise.toml`，以便团队成员选择相同的版本请求。

使用 `mise ls-remote bun` 查看可用版本。

> [!NOTE]
> 使用 `mise upgrade bun` 进行更新。运行 `bun upgrade` 会更改已安装的二进制文件，但不会更新 mise 记录的版本。

这些说明使用 mise 内置的 bun 支持。已安装的同名外部插件可能会更改行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详细信息，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/bun.rs)。

## 版本文件

启用[idiomatic version files](/configuration.html#idiomatic-version-files)，以读取 .bun-version 或 package.json 中的版本声明：

~~~sh
mise settings add idiomatic_version_file_enable_tools bun
~~~

例如，下面的 package.json 会选择 Bun 1.2.0：

~~~json [package.json]
{
  "devEngines": {
    "runtime": { "name": "bun", "version": "1.2.0" }
  }
}
~~~

mise 会先检查 devEngines.runtime，然后回退到 devEngines.packageManager 和顶层 packageManager 字段（例如 packageManager = "bun@1.2.0"）。

devEngines 的运行时和软件包管理器声明可以是对象或数组；数组中只读取第一项。engines 兼容性字段不会用于选择版本。有关软件包管理器声明格式，请参阅[软件包管理器版本](/lang/node.html#package-manager-versions-in-package-json)。

## 工具选项
以下 [tool-options](/dev-tools/#tool-options) 适用于 `bun` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为核心 `bun` 后端运行的安装时命令设置环境变量：

```toml
[tools]
bun = { version = "latest", install_env = { HTTPS_PROXY = "http://proxy.example" } }
```
