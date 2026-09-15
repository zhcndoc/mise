---
description: "后端会解析工具的版本、安装工具，并提供其可执行文件路径和环境"
---

# 后端架构

后端会解析工具的版本、安装工具，并提供其可执行文件路径和环境。[注册表](/registry.html)会将`node`和`ripgrep`等短名称映射到后端。请从这些名称开始；当你需要特定发行版或注册表之外的工具时，选择显式后端。

## 什么是后端？

在`github:BurntSushi/ripgrep`中，`github`是后端，而`BurntSushi/ripgrep`用于标识上游项目。这些内容与`@`之后的版本请求相互独立：

```sh
mise ls-remote github:BurntSushi/ripgrep
mise use github:BurntSushi/ripgrep@latest
mise exec -- rg --version
```

通过后端安装工具不会向 mise 的注册表添加新条目。显式后端语法可以直接在你自己的配置中使用。

## 后端特性系统

内置后端实现了 Rust 的[`Backend` trait](https://github.com/jdx/mise/blob/main/src/backend/mod.rs)。安装流程使用该接口来：

1. 列出版本，或解析前缀、渠道等请求
2. 确定安装依赖项和工具选项
3. 下载或构建请求的版本，并执行该发行版所支持的验证
4. 记录安装信息，并公开可执行文件路径和环境变量

版本字符串不一定是语义化版本。后端可以支持日期版本、供应商前缀、标签和滚动渠道；后端决定`latest`的含义。锁文件会记录具体的解析结果。请参阅[版本排序](/dev-tools/#version-ordering)和[mise.lock](/dev-tools/mise-lock.html)。

有关扩展 API，请参阅[工具插件](/tool-plugin-development.html)和[后端插件](/backend-plugin-development.html)。它们的钩子接口与内部 Rust trait 相互独立。

## 后端类型

| 分发方式                     | 示例                                                 | 检查内容                                                                    |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| 内置语言支持                 | Node.js、Python、Java、Rust                          | 特定于语言的选项、系统库以及所需的任何构建工具                             |
| 已签名的发布清单             | `packslip:`                                          | 已发布的清单、受信任的签名者以及受支持的平台                               |
| 由注册表描述的下载           | `aqua:`                                              | 软件包条目及其针对各版本的下载和验证规则                                    |
| Forge 发布                   | `github:`、`gitlab:`、`forgejo:`                    | 与目标平台匹配的发布资源                                                     |
| 直接构件                     | `http:`、`s3:`                                       | 构件位置、身份验证、平台映射和完整性信息                                     |
| 语言软件包                   | `npm:`、`pipx:`、`cargo:`、`gem:`、`go:`、`dotnet:` | 所需的运行时或工具链，以及软件包管理器行为                                  |
| 其他软件包源                 | `conda:`、`pkgx:`、`spm:`                            | 后端特定的平台支持和依赖项                                                   |
| 外部插件                     | asdf、vfox 工具插件、后端插件                        | 插件代码、先决条件和受支持的平台                                             |

[后端参考](/dev-tools/backends/)列出了可用的后端及其选项。内置语言指南位于侧边栏的**Languages**下。

## 后端选择如何工作

`core:node`这样的显式标识符表示后端选择。`node`这样的短名称还取决于配置和本地状态：

- `[tool_alias]`和`[plugins]`可以选择其他来源
- 匹配的锁文件条目可以保留该解析所使用的后端
- 已安装的外部插件可以覆盖注册表简写，包括内置语言工具。已禁用的后端和现有安装也会影响此选择
- 否则，注册表会提供首选的可用后端，该后端可能取决于请求的版本和平台

使用`mise tool <name>`检查实际生效的后端，而不要根据工具的短名称进行推断。[解析实现](https://github.com/jdx/mise/blob/main/src/cli/args/backend_arg.rs)包含详细的优先级规则。

### 环境变量覆盖

`MISE_BACKENDS_<TOOL>`会覆盖该标识符的后端。将名称转换为大写，并将连字符替换为下划线。例如，在 POSIX shell 中：

```sh
MISE_BACKENDS_NODE=core:node mise tool node
```

导出的覆盖设置会影响后续命令，并且可以覆盖配置选择。当两台机器以不同方式解析同一简写时，请检查你的环境。

### 注册表系统

使用`mise registry node`检查注册表映射。要提交后端选择而不更改注册表，请使用[别名](/dev-tools/aliases.html)：

```toml [mise.toml]
[tool_alias]
node = "core:node"

[tools]
node = "24"
```

## 后端能力比较

验证方式和平台支持取决于后端及具体工具。支持 Windows 的后端并不意味着其安装的每个软件包都有 Windows 版本。同样，下载校验和并不能证明发布者的身份，除非该校验和经过身份验证。

请查阅各后端的验证选项和[安全指南](/security.html)。例如，packslip 会验证已签名的清单，而 aqua 可以应用其注册表条目中声明的验证方法。外部插件代码会在本地运行，因此必须与工具本身一样受到信任。

## 何时使用每种后端

对于受支持的工具，请从注册表简写开始。对于其他来源：

- 当发布者提供已签名的发布清单时，使用`packslip:`
- 当其注册表描述了所需的工具和发布版本时，使用`aqua:`
- 对于发布资源，使用 Forge 后端；对于你直接分发的构件，使用`http:`或`s3:`
- 当你需要该生态系统的软件包并且能够提供其运行时或构建依赖项时，使用语言软件包后端
- 当安装或环境设置需要自定义逻辑时，使用插件

::: warning 已弃用的后端
`ubi:`已弃用。迁移时请使用相应的`github:`或`gitlab:`后端，并检查其选项；请参阅[ubi 迁移指南](/dev-tools/backends/ubi.html)。
:::

## 后端依赖项

后端可能需要在安装期间使用其他工具。将所需工具与软件包一同声明，以便 mise 按顺序安装它们：

```toml [mise.toml]
[tools]
node = "24"
"npm:prettier" = "3"
```

依赖关系不会自动将缺失的工具添加到你的配置中。匹配的已配置工具会先安装；未配置的依赖项可能会由现有`PATH`中的合适可执行文件满足。否则安装会失败。有关显式`depends`声明，请参阅[工具依赖项](/dev-tools/#tool-dependencies)。

## 配置和覆盖

### 禁用后端

使用全局设置文件，阻止通过选定的后端进行安装：

```toml [~/.config/mise/config.toml]
[settings]
disable_backends = ["asdf", "vfox"]
```

被禁用的后端会从工具解析和新安装中排除。现有安装会保留在磁盘上，重新启用后端后即可再次使用。

### 为工具强制指定后端

可以直接将显式标识符用作工具键：

```toml [mise.toml]
[tools]
"core:node" = "24"
"aqua:BurntSushi/ripgrep" = "latest"
```

### 后端特定设置

添加选项前，请阅读所选后端的参考文档。例如，以下配置会从 Python 软件包中选择一个可选额外项：

```toml [mise.toml]
[tools]
python = "3.14"
uv = "latest"
"pipx:black" = { version = "latest", extras = ["jupyter"] }
```

[pipx 后端](/dev-tools/backends/pipx.html)可以使用 uv 或 pipx。后端选项不能与同一工具的另一种分发方式的选项互换。

## 后端问题排查

### 调试后端选择

```sh
mise tool node       # effective backend and tool information
mise plugins ls      # external plugins that may override defaults
mise config ls       # configuration files contributing to this directory
mise ls --current    # selected versions and their sources
mise doctor          # installation and activation diagnostics
```

如果选择正确但安装失败，请检查后端的先决条件、平台支持和身份验证要求；`MISE_DEBUG=1 mise install node`会添加诊断输出；分享日志前，请检查其中的凭据。
