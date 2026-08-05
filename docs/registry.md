---
editLink: false
---

# 注册表

<script setup>
import Registry from '/components/registry.vue';
</script>

默认在 `mise` 中别名的所有[工具](#tools)列表。

你可以使用这些 `mise use` 的简写。这使你能够使用工具，而无需知道完整名称。例如，要使用 `aws-cli` 工具，你可以这样做：

```shell
mise use aws-cli
```

而不是

```shell
mise use aqua:aws/aws-cli
```

如果某个工具在注册表中不可用，你可以通过其完整名称安装它。[github](./dev-tools/backends/github.html) 和 [aqua](./dev-tools/backends/aqua.html) 例如可以让你访问 GitHub 上几乎所有可用的程序。

## 浮动注册表

默认情况下，mise 使用经过测试并随该 mise 版本一同打包的 mise 和 aqua 注册表快照。系统包管理器缓慢提供 mise 更新的用户，可以选择使用最新的注册表数据，而无需替换 mise 可执行文件：

```shell
mise settings registry_floating=true
```

启用此功能后，mise 会获取随最新 mise 版本发布的简写注册表以及当前的官方 aqua 注册表。当远程注册表无法加载时，仍可使用随附的快照作为备用。快速命令和离线命令不会刷新 mise 注册表；它们会使用现有的缓存副本或随附的快照。
mise 注册表的缓存时间为 [`registry_cache_ttl`](/configuration/settings.html#registry_cache_ttl)，默认
为一小时；aqua 继续使用
[`aqua.registry_cache_ttl`](/configuration/settings.html#aqua-registry_cache_ttl)，默认
为一周。`mise cache clear` 会强制两者在下次在线使用时重新下载。

此行为默认不启用，因为浮动注册表可能包含在已安装的 mise 版本经过测试之后所做的更改。当有更新的软件包可用时，更新 mise 仍然是更好的选择。

## 后端

除了内置的 [核心工具](/core-tools.html) 之外，`mise` 还支持多种用于安装工具的 [后端](/dev-tools/backends/)。

对于新的注册表条目，后端分为以下接受等级：

**第 1 级 — 首选，通常会被接受：**

- [aqua](./dev-tools/backends/aqua.html) - 提供最多的功能和安全性，同时不需要插件
- [github](./dev-tools/backends/github.html) - 适用于那些无法在 aqua 注册表中找到、但可在 GitHub 上获取的工具
- [gitlab](./dev-tools/backends/gitlab.html) - 适用于那些无法在 aqua 注册表中找到、但可在 GitLab 上获取的工具

**第 2 级 — 要求较高，但低于第 3 级：**

- [conda](./dev-tools/backends/conda.html) - 对于那些无法通过 aqua/github 合理支持的工具，可能会被接受。之所以比第 3 级的门槛更低，是因为 mise 的 conda 后端不需要单独安装包管理器——包会直接从 anaconda.org 获取并解压，PATH 中不需要 `conda`/`mamba`/`micromamba`。

**第 3 级 — 要求非常高，很少被接受：**

- [pipx](./dev-tools/backends/pipx.html) - 仅适用于 Python 工具，要求 `python` 在 PATH 中
- [npm](./dev-tools/backends/npm.html) - 仅适用于 Node 工具，要求 `node` 在 PATH 中
- [gem](./dev-tools/backends/gem.html) - 仅适用于 Ruby 工具，要求 `ruby` 在 PATH 中
- [go](./dev-tools/backends/go.html) - 仅适用于 Go 工具，要求安装 `go` 才能编译。由于 Go 工具可以作为单个二进制文件分发，因此显然更推荐 aqua/github。
- [cargo](./dev-tools/backends/cargo.html) - 仅适用于 Rust 工具，要求安装 `cargo` 才能编译。由于 Rust 工具可以作为单个二进制文件分发，因此显然更推荐 aqua/github。
- [dotnet](./dev-tools/backends/dotnet.html) - 仅适用于 .NET 工具，要求安装 `dotnet` 才能编译。由于 .NET 工具可以作为单个二进制文件分发，因此显然更推荐 aqua/github。

这些都依赖于 PATH 中单独安装的运行时/工具链，这很脆弱——尤其是 `npm`/`pipx`/`gem`，它们会在安装时静默地将工具绑定到 PATH 中当时存在的那个 `node`/`python`/`ruby`。

**不接受：**

- 新的 `vfox` 和 `asdf` 工具由于供应链安全原因不被接受——请改用 [`aqua`](./dev-tools/backends/aqua.html)（首选）或 [`github`](./dev-tools/backends/github.html)。
- `ubi` 后端已弃用，不接受新的注册表条目。

用户仍然可以自行通过任何后端并使用显式语法来安装（`mise use vfox:owner/repo`, `mise use cargo:name` 等）——只是不会为它们提供注册表简写。

### 后端优先级

如果一个工具支持多个后端，它可以定义自己的优先级。如果你想禁用某个后端，可以使用以下命令：

```shell
mise settings disable_backends=asdf
```

这将禁用 [asdf](./dev-tools/backends/asdf.html) 后端。有关为工具设置默认后端的方法，请参见 [别名](/dev-tools/aliases.html)。请注意，在 Windows 上，`asdf` 后端默认是禁用的。

如果你想使用特定后端，也可以使用 `mise use aqua:1password/cli` 这种格式指定工具的完整名称。

### 环境变量覆盖

你可以使用形如 `MISE_BACKENDS_<TOOL>` 的环境变量来覆盖任意工具的后端。这具有最高优先级，并会覆盖任何注册表或别名配置：

```shell
# 为 php 使用 vfox 后端
export MISE_BACKENDS_PHP='vfox:mise-plugins/vfox-php'
mise install php@latest
```

环境变量中的工具名应使用 SHOUTY_SNAKE_CASE（大写并使用下划线）。例如，`my-tool` 会变成 `MISE_BACKENDS_MY_TOOL`。

来源：<https://github.com/jdx/mise/blob/main/registry/>】【。

## 工具 {#tools}

请注意，[`mise registry`](/cli/registry.html) 可用于列出注册表中的所有工具。未带任何参数的 [`mise use`](/cli/use.html) 将显示一个 `tui`，用于选择要安装的工具。

<Registry />
