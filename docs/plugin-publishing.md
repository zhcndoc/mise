---
description: "从 Git 或签名归档发布 mise 插件，测试已发布版本，并说明如何固定版本。"
socialDescription: "从 Git 或签名归档发布 mise 插件，并说明如何固定版本。"
---

# 发布插件

发布 mise 插件时，需要将插件放到用户可获取的位置：使用标签固定版本的 Git 仓库，或经过签名的 packslip 归档。随后，用户可以运行 `mise plugins install` 安装插件，也可以在 `mise.toml` 的 `[plugins]` 中列出它。

mise 注册表不接受由 asdf 或 vfox 插件提供的新工具（参见[后端准入等级](/contributing/registry.html#backend-acceptance-tiers)），因此用户需要通过你的仓库 URL 安装插件。本指南适用于 Lua 工具、后端、环境和包管理器插件。shell 脚本插件请参见 [asdf 插件（旧版）](/asdf-legacy-plugins.html)。

## 发布前检查 {#publishing-checklist}

- `metadata.lua` 设置 `name` 和 `version`，并通过 `description`、`homepage` 和 `license` 描述插件。参见 [metadata.lua](/plugin-lua-modules.html#metadata)。
- README 应列出安装命令、`[tools]` 或 `[env]` 配置示例、支持的平台、插件会调用的外部程序，以及测试过的最低 mise 版本。
- 插件应在 README 列出的每个平台上通过[隔离测试](#testing-before-publication)。

## 发布前测试 {#testing-before-publication}

使用独立的 mise 目录进行测试，避免受测插件替换已安装的插件或更改全局配置。

### 在隔离环境中测试 mise {#automated-testing}

在插件目录中运行以下命令。子 shell 可避免导出变量影响当前 shell，`trap` 则会在子 shell 退出时删除临时目录：

```sh
plugin_dir="$PWD"
(
  test_dir="$(mktemp -d)"
  trap 'rm -rf "$test_dir"' EXIT
  export MISE_CONFIG_DIR="$test_dir/config"
  export MISE_SYSTEM_CONFIG_DIR="$test_dir/system"
  export MISE_GLOBAL_CONFIG_FILE="$test_dir/global.toml"
  export MISE_DATA_DIR="$test_dir/data"
  export MISE_CACHE_DIR="$test_dir/cache"
  export MISE_STATE_DIR="$test_dir/state"
  export MISE_ENV_CACHE=0
  export MISE_YES=1
  mkdir -p "$test_dir/project"
  cd "$test_dir/project"
  mise plugins link test-plugin "$plugin_dir"
  # 在此处添加对应插件类型的检查
)
```

取消设置 shell 中会影响运行结果的其他 `MISE_*` 变量，例如 `MISE_SAFE` 或 `MISE_DISABLE_BACKENDS`。这些目录只隔离 mise 自身的状态；包管理器插件以及插件调用的安装程序仍可能更改机器上的内容。

随后根据插件类型运行相应检查。以下名称均为占位符：

| 插件类型         | 检查内容                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 工具             | `mise ls-remote test-plugin`、`mise use test-plugin@1.0.0`、`mise exec -- example --version`。覆盖测试 `PostInstall` 和 `EnvKeys`；如果插件会读取惯用版本文件，还应在项目未为该工具设置 `[tools]` 条目、且该工具已列入 `idiomatic_version_file_enable_tools` 时测试此文件。 |
| 后端             | `mise ls-remote test-plugin:example`、`mise use test-plugin:example@1.0.0`、`mise exec -- example --version`                                                                                                                                                                |
| 环境             | 在 `[env]` 下添加 `_.test-plugin = { ... }`，然后检查 `mise env --json` 或 `mise exec -- printenv MY_VAR`。                                                                                                                                                                  |
| 包管理器         | 遵循[包管理器插件](/package-plugin-development.html)中的测试建议。                                                                                                                                                                                                          |

请测试固定版本的工具，而不是 `latest`，这样上游发布新版本时不会影响测试结果。`mise exec --` 后面的命令必须是工具的可执行文件名。

### 测试已发布的版本 {#manual-testing}

[`mise plugins link`](/cli/plugins/link.html) 使用当前工作树，其中包含发行包不会收录的未提交、未跟踪和已忽略文件，因此插件可能在链接状态下运行正常，安装后却失败。请将 `git ls-tree -r --name-only v1.2.3` 的结果与工作树进行比较，然后在全新的隔离目录中安装该标签，并重复上述检查：

```sh
mise plugins install test-plugin 'https://github.com/your-org/my-plugin#v1.2.3'
```

请在 README 列出的每种操作系统上通过 CI 运行这些检查。

## 标记发行版本

在 `metadata.lua` 中将 `version` 设置为新发行版本并提交。然后为该提交创建标签并推送：

```sh
git tag -a v1.2.3 -m "v1.2.3"
git push origin v1.2.3
```

用户通过标签（`#v1.2.3`）选择发行版本。mise 不会读取 `PLUGIN.version` 来决定安装哪个版本；插件自身的版本号也与它管理的工具版本无关。请在发行说明中写出固定版本的安装命令，以及用户需要修改的配置。

## 告诉用户如何安装 {#distribution-methods}

请在 README 中提供以下两种安装方式：

```toml
# mise.toml：在此目录运行 `mise install` 的用户都会安装该插件
[plugins]
my-plugin = "https://github.com/your-org/my-plugin#v1.2.3"
```

```sh
mise plugins install my-plugin 'https://github.com/your-org/my-plugin#v1.2.3'
```

`#v1.2.3` 用于固定标签，完整的提交 SHA 用于固定不可变更的版本；mise 不接受缩写 SHA。如果没有 `#`，用户会获取默认分支。插件引用使用 `#`，而不是工具版本请求中的 `@version` 语法。

对于私有仓库，用户可以通过 SSH（`git@github.com:your-org/my-plugin.git`）安装，也可以通过 HTTPS 配合 Git 凭据助手安装。不要让用户把令牌放进 URL，否则令牌会留在 shell 历史记录、`mise.toml` 和插件的 Git 远端配置中。访问失败时，请先运行 `git ls-remote <url>`，再排查插件本身。

GitHub 会为每个标签提供 zip 归档，因此用户从归档安装托管在 GitHub 上的插件时无需额外构建：

```sh
mise plugins install my-plugin https://github.com/your-org/my-plugin/archive/refs/tags/v1.2.3.zip
```

如果托管服务不提供标签归档，请将归档作为发行资源发布：

```sh
git archive --format=zip --prefix=my-plugin/ --output=my-plugin-v1.2.3.zip v1.2.3
```

归档安装不包含 Git 历史，因此 `mise plugins update` 会跳过它。如需更新，用户可以运行 `mise plugins install --force my-plugin <new-archive-url>`。[插件](/plugins.html)一节列出了用户可用的所有安装来源。

## 发布经过签名的 packslip 归档 {#packslip}

vfox 插件也可以作为经过签名的 [packslip](/dev-tools/backends/packslip.html) 发行包发布。mise 会先检查发布方签名和归档摘要，再安装或替换插件，而且不需要检出 Git 仓库。用户通过签名清单中的版本指定要安装的版本：

```sh
mise plugins install vfox:my-plugin 'packslip:your-org/my-plugin#1.2.3'
```

```toml
[plugins]
"vfox:my-plugin" = "packslip:your-org/my-plugin#1.2.3"
```

插件发行包必须满足以下条件，mise 才会接受：

- 仓库托管在 GitHub 上，发行包中包含已签名的 `packslip.sigstore.json` 清单；
- 清单中的制品是 `tar.gz` 归档，声明了 `extensions.mise.plugin = "vfox"`，未指定操作系统、架构或 libc，也未声明可执行文件和主机依赖；
- 归档根目录包含 `metadata.lua`，且只包含普通文件和目录：不得有符号链接或硬链接、`.git` 目录、绝对路径、`..` 路径段，也不得包含带 `\` 或 `:` 的名称。

在仓库的 `packslip.toml` 中声明该制品：

<!-- schema: skip -->
```toml
[[artifact]]
path = "dist/my-plugin.tar.gz"
format = "tar.gz"
portable = true
bin = []

[artifact.extensions.mise]
plugin = "vfox"
```

创建归档时不要添加顶层目录，并列出插件所需的文件和目录：

```sh
mkdir -p dist
git archive --format=tar HEAD metadata.lua hooks lib LICENSE | gzip -n > dist/my-plugin.tar.gz
```

请在 CI 中使用 packslip GitHub Action 签署清单，参见[mise 发布工具](/dev-tools/backends/packslip.html#why-publish-one)和 [packslip 发布指南](https://packslip.dev/docs/publishing/)。[vfox-bfs 发行工作流](https://github.com/jdx/vfox-bfs/blob/main/.github/workflows/release.yml)会构建并签署归档，在 Linux 和 macOS 上安装验证结果，然后将 `vfox-bfs.tar.gz` 和 `packslip.sigstore.json` 上传至 GitHub 发行页面。

mise 会对插件发行包应用 packslip 后端的发行时间和签名者检查。它会记住此前接受的签名者，并拒绝其他签名者签署的发行包，因此所有发行包都应使用同一工作流签名。参见[签名者变更](/dev-tools/backends/packslip.html#pinned-signers)。

普通的 `mise plugins update my-plugin` 会保留显式版本固定。当项目在 `[plugins]` 中固定插件时，用户可以修改其中的版本，然后运行 `mise plugins install --force vfox:my-plugin` 来升级。已安装的 packslip 插件与 `[plugins]` 中的固定版本不一致时，mise 不会发出警告，因此通过 `mise plugins update` 改用其他版本会造成两处版本不一致而不被察觉。通过命令行安装插件的用户可以运行 `mise plugins update my-plugin#1.3.0`，或使用新版本重新安装：

```sh
mise plugins install --force vfox:my-plugin 'packslip:your-org/my-plugin#1.3.0'
```

## 发布更新 {#maintenance-and-updates}

用户如何升级取决于插件的安装方式。项目在 `[plugins]` 中固定插件时，用户需要在那里更改引用，然后重新安装插件：

```toml
[plugins]
my-plugin = "https://github.com/your-org/my-plugin#v1.3.0"
```

```sh
mise plugins install --force my-plugin
```

`[plugins]` 中的引用只在 mise 安装插件时生效。在已经安装插件的机器上，只修改引用不会替换旧版本；只运行 `mise plugins update my-plugin#v1.3.0` 则会让检出版本偏离配置中的固定版本。只要检出版本和固定版本不一致，每次运行 `mise install` 都会收到警告。

通过命令行安装插件的用户可以运行：

```sh
mise plugins update my-plugin#v1.3.0
```

`mise plugins update my-plugin` 不会移动已检出到标签的插件。

更新插件不会重新安装它已经安装的工具版本。发布新版本时，既要在全新环境中测试，也要在已有安装上测试；尤其是在更改二进制文件路径或环境钩子时。如果要重命名选项或更改默认值，请在一段时间内继续兼容旧写法，并在发行说明中注明替代写法。

## 托管到 mise-plugins

社区插件由 [mise-plugins](https://github.com/mise-plugins) 组织托管。如需讨论将插件迁移到该组织，请发起 [GitHub 讨论](https://github.com/jdx/mise/discussions)。托管在该组织下不会自动获得注册表简称。

## 安全 {#security-considerations}

插件以用户权限运行。所有传入命令的内容都应视为不可信，包括工具名称、版本、路径和选项：要么正确引用 shell 参数，要么使用 `http`、`file` 和 `archiver` [模块](/plugin-lua-modules.html#module-index)来避免调用 shell。每次下载都应在 `PreInstall` 中返回校验和。不要将凭据放入仓库，也不要打印令牌或可能包含令牌的响应正文。配置可信度和锁文件的保护范围详见[安全](/security.html)。

## 故障排查

- 插件链接后能正常工作，安装后却失败：参见[测试已发布的版本](#manual-testing)。
- 显示的版本不正确：区分 `PLUGIN.version`、插件的 Git 引用（`mise plugins ls --urls`）和工具版本（`mise ls --current`）。
- 安装插件时出现身份验证错误：参见[告诉用户如何安装](#distribution-methods)中有关私有仓库的建议。
