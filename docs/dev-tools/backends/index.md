---
description: "选择 mise 发现工具版本以及安装工具的位置和方式。"
---

# 后端

后端告诉 mise 在哪里查找工具版本以及如何安装工具。使用 `ripgrep` 这样的注册表简写来进行默认选择，或明确指定后端，例如 `github:BurntSushi/ripgrep`。

## 选择安装源

首先检查[注册表](/registry.html)：

```sh
mise registry ripgrep
mise ls-remote ripgrep
mise use ripgrep
mise exec -- rg --version
```

`mise use` 会安装工具，并将其记录在项目的 `mise.toml` 中。添加 `-g` 以使用全局配置。即使某个工具没有注册表简写，你也可以使用明确指定的后端；不要求提交到注册表。

| 来源                     | 后端                                                                                                                                                         | 检查事项                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 已签名的发布者清单       | [Packslip](./packslip.html)                                                                                                                                  | 发布者必须提供 Packslip 发布内容以及可验证的签名者。                                |
| 精选的二进制配方         | [Aqua](./aqua.html)                                                                                                                                          | Aqua 注册表必须包含适用于该工具和平台的条目。不需要 Aqua CLI。                      |
| 发布资产                 | [GitHub](./github.html)、[GitLab](./gitlab.html)、[Forgejo](./forgejo.html)                                                                                   | 发布内容必须包含适用于你平台的可安装资产。                                          |
| 直接下载                 | [HTTP](./http.html)、[S3](./s3.html)                                                                                                                         | 提供下载 URL，并为版本发现提供版本源。                                              |
| 语言包                   | [Cargo](./cargo.html)、[Go](./go.html)、[npm](./npm.html)、[pipx](./pipx.html)、[gem](./gem.html)、[.NET](./dotnet.html)、[Swift Package Manager](./spm.html) | 阅读后端的运行时和构建前置条件。                                                     |
| 二进制包生态系统         | [Conda](./conda.html)、[pkgx](./pkgx.html)（实验性）                                                                                                         | 软件包及其运行时依赖项必须支持你的平台。                                            |
| 插件定义的安装           | [vfox](./vfox.html)、[asdf](./asdf.html)（遗留）                                                                                                              | 在安装前检查插件及其依赖项。                                                        |
| 遗留发布安装程序         | [ubi](./ubi.html)（已弃用）                                                                                                                                  | 将现有配置迁移到适当的发布后端。                                                    |

内置语言支持记录在[语言指南](/lang/node.html)中。插件作者还可以创建用于管理一系列工具的[自定义后端](/backend-plugin-development.html)。

## 验证结果

列出的版本并不保证其发布者会为你的操作系统和架构提供构件。使用 `mise exec -- <command> --version` 检查安装情况和实际的可执行文件。如果选择失败，后端指南会说明其资产名称、身份验证和平台选项。

为了实现可复现的安装，请在 [mise.lock](/dev-tools/mise-lock.html) 中记录具体版本和受支持平台的校验和。不同后端的验证覆盖范围有所不同；在依赖特定签名或来源检查之前，请参阅[安全性](/security.html)和相应指南。

请参阅[后端架构](/dev-tools/backend_architecture.html)，了解选择、安装依赖项和实现生命周期。
