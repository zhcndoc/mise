# 后端

后端是 mise 用来安装[工具](/dev-tools/index.html)和[插件](/plugins.html)的包管理器或生态系统。每个后端都可以从其生态系统中安装和管理多个工具。例如，`npm` 后端可以安装许多不同的工具，如 `npm:prettier`，或者 `pipx` 后端可以安装像 `pipx:black` 这样的工具。这使得 mise 能够利用不同的包管理器及其生态系统来支持各种各样的工具和语言。

当你运行 [`mise use`](/cli/use.html) 命令时，mise 会根据你要管理的工具来确定要使用的合适后端。然后该后端会处理安装、配置以及确保工具可用所需的任何其他步骤。

有关后端如何融入 mise 整体设计的更多细节，请参阅[后端架构文档](/dev-tools/backend_architecture.html)。

下面是 mise 中可用后端的列表：

- [asdf](/dev-tools/backends/asdf)（通过[插件](/plugins.html)提供工具）
- [aqua](/dev-tools/backends/aqua)
- [cargo](/dev-tools/backends/cargo)
- [conda](/dev-tools/backends/conda)
- [dotnet](/dev-tools/backends/dotnet)
- [forgejo](/dev-tools/backends/forgejo)
- [gem](/dev-tools/backends/gem)
- [github](/dev-tools/backends/github)
- [gitlab](/dev-tools/backends/gitlab)
- [go](/dev-tools/backends/go)
- [http](/dev-tools/backends/http)
- [npm](/dev-tools/backends/npm)
- [pipx](/dev-tools/backends/pipx)
- [pkgx](/dev-tools/backends/pkgx) <Badge type="warning" text="experimental" />
- [s3](/dev-tools/backends/s3)
- [spm](/dev-tools/backends/spm)
- [ubi](/dev-tools/backends/ubi)
- [vfox](/dev-tools/backends/vfox)（通过[插件](/plugins.html)提供工具）
- [custom backends](/backend-plugin-development)（使用一个插件构建你自己的后端，该插件本身可提供许多工具）
