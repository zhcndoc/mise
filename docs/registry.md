---
description: "查阅 mise 支持的工具简称，以及每个工具使用的安装后端。"
editLink: false
---

# 注册表

<script setup>
import Registry from '/components/registry.vue';
</script>

注册表会将 `jq` 或 `aws-cli` 这类简短工具名称映射到相应安装后端，因此无需填写完整后端标识符即可运行 `mise use jq`。可搜索下方的[工具列表](#tools)，也可查询已安装的 mise。

注册表位于 mise 仓库的 [`registry/`](https://github.com/jdx/mise/tree/main/registry) 目录中，每个 mise 发行版都会内置一份副本。没有简称的工具仍可使用其[后端标识符](/dev-tools/backends/)安装，例如 `github:owner/repo`；前提是对应后端支持该项目的发行版布局或软件包格式。

## 查看工具简称 {#inspect-a-shorthand}

```sh
mise registry           # every shorthand and its backends, preferred first
mise registry aws-cli   # aqua:aws/aws-cli asdf:MetricMike/asdf-awscli
mise search jq          # fuzzy-match names and show descriptions
mise tool aws-cli       # the backend and options mise uses for this tool
```

[`mise registry`](/cli/registry.html) 会将别名单独列出；`mise registry --json --security` 还会显示各工具后端执行的签名和来源验证。[`mise search`](/cli/search.html) 会在每个匹配项旁显示说明。无参数运行 [`mise use`](/cli/use.html) 可通过交互界面选择工具。

## 简称设置的选项 {#options-a-shorthand-sets}

工具简称除了指定后端外，还可以设置后端选项。`aws-cli` 会通过 `aqua:aws/aws-cli` 安装，并启用 `symlink_bins = true`。如果自行填写 `aqua:aws/aws-cli`，则不会应用此选项，安装结果也会不同。运行 `mise tool aws-cli` 可查看该简称应用的选项。

## 简称使用哪个后端 {#which-backend-a-shorthand-uses}

mise 会从简称列出的后端中，选择第一个已启用、支持当前平台且涵盖所请求版本的后端。后端可以声明 `min_version` 和不包含在内的 `max_version`。hk 的 packslip 后端从 1.58.1 起适用，因此 `hk@1.58.1` 及更新版本会使用 packslip 安装，较旧版本则使用 aqua。锁文件条目、已安装插件、[`[tool_alias]`](/dev-tools/aliases.html) 或 `MISE_BACKENDS_<TOOL>` 环境变量都可以覆盖此选择。运行 `mise tool <name>` 可查看 mise 实际使用的后端；完整的选择顺序请参阅[后端选择机制](/dev-tools/backends/#how-backend-selection-works)。

<a id="floating-registries"></a>

## 浮动注册表

默认情况下，mise 使用经过测试并随发行版一同打包的 mise 和 aqua 注册表快照。如果系统包管理器提供 mise 更新较慢，可以在不替换 mise 的情况下使用最新注册表数据：

```sh
mise settings registry_floating=true
```

启用 [`registry_floating`](/configuration/settings.html#registry_floating) 后，mise 会获取随最新版 mise 发布的简称注册表，以及当前官方 aqua 注册表。无法加载远程注册表时，仍会回退到内置快照。快速模式和离线命令不会刷新 mise 注册表，而是使用缓存副本或内置快照。mise 注册表的缓存时长由 [`registry_cache_ttl`](/configuration/settings.html#registry_cache_ttl) 控制，aqua 注册表则由 [`aqua.registry_cache_ttl`](/configuration/settings.html#aqua.registry_cache_ttl) 控制。运行 `mise cache clear` 后，mise 会在下次联网时重新下载两者。

浮动注册表可能包含在当前 mise 版本测试完成后才加入的变更，因此默认关闭。如果已有 mise 更新可用，升级 mise 仍是更好的选择。

## Adding a tool to the registry {#backends}

注册表经过人工维护：新增简称应对应广泛使用的工具，且某些后端会优先于其他后端。提交前请阅读[向注册表添加工具](/contributing/registry.html#backend-acceptance-tiers)。使用工具并不一定需要简称，也可以直接填写后端标识符，例如 `github:owner/repo` 或 `cargo:name`。

## 工具 {#tools}

后端旁边的徽章表示 mise 通过该后端安装时，除校验和外还会执行的签名或来源验证：

| 徽章                                 | 验证内容                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| packslip                             | A [signed release manifest](/dev-tools/backends/packslip.html), verified against the project's pinned signer                                               |
| attestations, SLSA, cosign, minisign | [aqua verification](/dev-tools/backends/aqua.html#security-verification) that the bundled aqua registry configures for at least one version of the package |

aqua 徽章来自注册表元数据，因此某项验证可能只适用于部分版本或平台。其他后端（例如 `github:`）会在安装时检测发行版提供的内容，因此不会在此处显示徽章。如果某个工具由 [mise-versions.jdx.dev](https://mise-versions.jdx.dev/) 跟踪，其详情链接会打开对应工具页面，其中列出版本和 mise 报告的安全信息。在命令行中，`mise tool <name>` 会报告 mise 将使用的后端所执行的验证；`mise registry --json --security` 则会合并某工具已登记的所有后端验证。

<Registry />
