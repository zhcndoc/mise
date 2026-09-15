---
description: "注册表将简短工具名称映射到一个或多个安装后端。"
editLink: false
---

# 注册表

<script setup>
import Registry from '/components/registry.vue';
</script>

注册表将简短工具名称映射到一个或多个安装后端。搜索下面的
[工具列表](#tools)，或查看随已安装的 mise 一同打包的注册表：

```sh
mise registry
mise registry aws-cli
mise use aws-cli
```

简写可以携带特定于后端的选项以及后端名称。例如，`aws-cli` 当前会选择带有注册表提供的可执行文件链接选项的 Aqua。显式选择 `aqua:aws/aws-cli` 会选择该后端，但并不意味着每个简写选项都相同。

如果某个工具没有简写，请使用完整的[后端标识符](/dev-tools/backends/)，例如
`github:owner/repo`。后端必须支持该项目的发布布局或软件包格式；仅仅是在 GitHub 上存在一个仓库并不足够。

## 浮动注册表

默认情况下，mise 使用经过测试并随该 mise 版本一同打包的 mise 和 aqua 注册表快照。系统包管理器缓慢提供 mise 更新的用户，可以选择使用最新的注册表数据，而无需替换 mise 可执行文件：

```shell
mise settings set registry_floating true
```

启用此功能后，mise 会获取随最新 mise 版本发布的简写注册表以及当前官方 aqua 注册表。当远程注册表无法加载时，仍会使用内置快照作为回退。快速和离线命令绝不会刷新 mise 注册表；它们会使用已有的缓存副本或内置快照。
mise 注册表的缓存时间为 [`registry_cache_ttl`](/configuration/settings.html#registry_cache_ttl)，默认为一小时；aqua 继续使用
[`aqua.registry_cache_ttl`](/configuration/settings.html#aqua.registry_cache_ttl)，默认为一周。`mise cache clear` 会强制两者在下一次在线使用时重新下载。

此行为默认不启用，因为浮动注册表可能包含在已安装的 mise 版本经过测试之后所做的更改。当有更新的软件包可用时，更新 mise 仍然是更好的选择。

## 后端

除了内置的 [核心工具](/core-tools.html) 之外，`mise` 还支持多种用于安装工具的 [后端](/dev-tools/backends/)。

这些级别适用于**新的注册表提交**，而不是你可能在自己的配置中使用的后端。新条目必须已经被广泛使用，通常需要拥有数千个 GitHub stars，并且必须列出可安装的版本。在提交简写之前，请参阅[贡献指南](/contributing.html)。仅仅有后端可用并不能使工具获得资格。

对于新的注册表条目，后端分为以下接受级别：

**第 1 级 — 首选，通常会被接受：**

- [packslip](./dev-tools/backends/packslip.html) - 当项目发布经过签名的发布清单时优先使用；无需插件或单独的包管理器即可验证签名者和构件摘要

**第 2 级 — 通常会被接受：**

- [aqua](./dev-tools/backends/aqua.html) - 精选的注册表元数据、SLSA 验证，以及针对没有 packslip 的工具提供的逐版本逻辑
- [github](./dev-tools/backends/github.html) - 用于 aqua 注册表中没有但 GitHub 上有的工具
- [gitlab](./dev-tools/backends/gitlab.html) - 用于 aqua 注册表中没有但 GitLab 上有的工具

**第 3 级 — 要求较高，但低于第 4 级：**

- [conda](./dev-tools/backends/conda.html) - 对于无法合理地通过 packslip/aqua/github/gitlab 支持的工具，可能会被接受。其要求低于第 4 级，因为 mise 的 conda 后端不要求单独安装包管理器——软件包会直接从 anaconda.org 获取并解压，无需在 PATH 中安装 `conda`/`mamba`/`micromamba`。

**第 4 级 — 要求非常高，很少被接受：**

- [pipx](./dev-tools/backends/pipx.html) - Python 应用程序；默认使用 uv，uv 可以提供 Python
- [npm](./dev-tools/backends/npm.html) - 仅适用于 node 工具，要求 `node` 位于 PATH 中
- [gem](./dev-tools/backends/gem.html) - 仅适用于 ruby 工具，要求 `ruby` 位于 PATH 中
- [go](./dev-tools/backends/go.html) - 仅适用于 go 工具，要求安装 `go` 以进行编译。由于 go 工具可以作为单个二进制文件分发，因此优先使用 packslip/aqua/github/gitlab。
- [cargo](./dev-tools/backends/cargo.html) - 仅适用于 rust 工具，要求安装 `cargo` 以进行编译。由于 rust 工具可以作为单个二进制文件分发，因此优先使用 packslip/aqua/github/gitlab。
- [dotnet](./dev-tools/backends/dotnet.html) - 仅适用于 dotnet 工具，要求安装 `dotnet` 以进行编译。由于 dotnet 工具可以作为单个二进制文件分发，因此优先使用 packslip/aqua/github/gitlab。

这些集成依赖于语言运行时或工具链，可能需要额外设置。
例如，npm 工具在运行时需要 Node，而 Ruby gem 依赖于用于安装它们的 Ruby 安装。注册表条目可用发布二进制文件时，应优先使用发布二进制文件；有关实际的运行时、安装程序和二进制文件下载行为，请参阅各后端页面。

**不接受：**

- 出于供应链安全原因，不接受新的 `vfox` 和 `asdf` 工具——请改用 [`packslip`](./dev-tools/backends/packslip.html)（首选）、[`aqua`](./dev-tools/backends/aqua.html)、[`github`](./dev-tools/backends/github.html) 或 [`gitlab`](./dev-tools/backends/gitlab.html)。
- `ubi` 后端已弃用，不接受用于新的注册表条目。

用户仍然可以自行通过任何后端并使用显式语法来安装（`mise use vfox:owner/repo`, `mise use cargo:name` 等）——只是不会为它们提供注册表简写。

### 后端优先级

显式安装的插件可以覆盖与其匹配的简写。否则，简写会按偏好顺序列出后端。平台支持、已禁用的后端以及版本边界会影响所选的符合条件的后端。如果你想禁用某个后端，可以使用以下命令：

```shell
mise settings set disable_backends asdf
```

这会将已配置的禁用后端列表替换为 `asdf`；如果还想禁用其他后端，请在同一个逗号分隔的值中加入它们。这会禁用 [asdf](./dev-tools/backends/asdf.html) 后端。请参阅[别名](/dev-tools/aliases.html)，了解如何为工具设置默认后端。请注意，`asdf` 后端在 Windows 上默认处于禁用状态。

如果你想使用特定后端，也可以使用 `mise use aqua:1password/cli` 这种格式指定工具的完整名称。

### 特定版本的后端

注册表后端可以声明其支持的第一个工具版本。对于较旧的版本请求，mise 会跳过该后端并使用下一个符合条件的后端。例如，`mise use hk@1.58.0` 使用 Aqua，而 `mise use hk@1.58.1` 使用 Packslip。
较旧的前缀（如 `hk@1.57`）也使用 Aqua；`latest` 和跨越该边界的前缀会保持正常的后端优先级。

这些边界适用于注册表简写。你仍然可以显式选择后端，而匹配的锁文件条目会保留其记录的后端。
有关注册表格式，请参阅[最低后端版本](/contributing.html#minimum-backend-versions)。

### 环境变量覆盖

你可以使用形如 `MISE_BACKENDS_<TOOL>` 的环境变量来覆盖任意工具的后端。这具有最高优先级，并会覆盖任何注册表或别名配置：

```shell
# 为 php 使用 vfox 后端
export MISE_BACKENDS_PHP='vfox:mise-plugins/vfox-php'
mise install php@latest
```

环境变量中的工具名应使用 SHOUTY_SNAKE_CASE（大写并使用下划线）。例如，`my-tool` 会变成 `MISE_BACKENDS_MY_TOOL`。

来源：<https://github.com/jdx/mise/blob/main/registry/>

## 工具 {#tools}

请注意，[`mise registry`](/cli/registry.html) 可用于列出注册表中的所有工具。未带任何参数的 [`mise use`](/cli/use.html) 将显示一个 `tui`，用于选择要安装的工具。

<Registry />
