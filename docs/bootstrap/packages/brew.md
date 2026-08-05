# brew

Homebrew 配方和 cask —— **无需安装 Homebrew**。

```toml
[bootstrap.packages]
"brew:postgresql@17" = "latest"
"brew:ffmpeg" = "latest"
"brew:imagemagick" = "latest"
"brew-cask:firefox" = "latest"
```

mise 直接将 [homebrew/core](https://formulae.brew.sh) 的配方安装到
标准的 Homebrew 前缀中——arm64 macOS 上是 `/opt/homebrew`，
Linux 上是 `/home/linuxbrew/.linuxbrew`。它会从
formulae.brew.sh API 获取元数据，解析运行时依赖闭包，从 ghcr.io 下载
预编译的 bottles（会验证 sha256 校验和），并执行与 `brew` 倒入 bottle
时相同的重定位、代码签名和链接工作。没有可用 bottle 的配方也会从源代码构建，
同样不需要 Homebrew（见 [源代码配方](#source-formulae)）。mise
对 homebrew/core 配方从不调用 `brew`。

当第三方 tap 发布了 Homebrew API 元数据（`api/formula/<name>.json`
或 `api/cask/<token>.json`）时，也可以直接支持。请使用与传给
Homebrew 相同的完整限定名称：

```toml
[bootstrap.packages]
"brew:railwaycat/emacsmacport/emacs-mac" = "latest"
"brew-cask:owner/tap/app" = "latest"
```

对于无法从 GitHub URL 推断的 tap，请添加一个 tap 源。这与
`[plugins]` 类似：键是 tap 名称，值是 GitHub git URL。

```toml
[bootstrap.brew.taps]
"acme/tools" = "https://github.com/acme/homebrew-tools.git"

[bootstrap.packages]
"brew:acme/tools/widget" = "latest"
"brew-cask:acme/tools/widget-app" = "latest"
```

`mise bootstrap packages brew tap` 和 `mise bootstrap packages brew untap`
会管理 `mise.toml` 中的 `[bootstrap.brew.taps]`；它们不会修改 Homebrew
安装。由于 mise 需要直接访问生成的 API 元数据的原始内容，目前不支持
非 GitHub 的 tap。

```sh
mise bootstrap packages brew tap railwaycat/emacsmacport
mise bootstrap packages brew tap acme/tools https://github.com/acme/homebrew-tools.git
mise bootstrap packages brew untap acme/tools
```

## Cask

Cask 使用 `brew-cask:` 管理器。mise 会直接从 Homebrew cask API（或 tap API 元数据）获取 cask 元数据，下载制品，在 cask 提供 sha256 时验证其 sha256，解压归档文件，并将应用程序包安装到 `/Applications`，同时将版本记录在 `<prefix>/Caskroom` 中。

```toml
[bootstrap.packages]
"brew-cask:firefox" = "latest"
"brew-cask:homebrew/cask/visual-studio-code" = "latest"
```

`brew-cask` 目前支持应用程序包 cask（`app` 制品）、二进制文件和生成的命令包装器 cask（`binary` 和 `command_wrapper` 制品）、简单的 macOS 安装器软件包（`pkg` 制品），以及来自 dmg 和常见归档格式的 shell 补全（`bash_completion`、`fish_completion`、`zsh_completion` 和 `generate_completions_from_executable`）。二进制制品和生成的包装器会暂存到 Caskroom 中，并链接到 Homebrew 前缀，通常位于 `<prefix>/bin` 下。软件包安装器会通过 mise 的常规系统软件包 sudo 路径运行，因此非交互式运行不会因等待密码而挂起。Pkg cask 必须在其 `uninstall` 元数据中包含 `pkgutil` 收据 ID，以便在安装器将文件写入 Caskroom 之外后，mise 能够验证其安装状态。`zap` 的 `pkgutil` ID 被视为清理元数据，而不是安装收据。对于包含生命周期钩子的 cask，mise 会获取由 API 元数据固定且经过 sha256 验证的 cask Ruby 源代码，并通过自有的 Cask DSL shim 运行受支持的 `preflight`/`postflight` 钩子，而不会委托给 Homebrew。mise 还支持结构化的 `preflight_steps` 和 `postflight_steps`，用于针对 `staged_path` 执行 `move`/`remove` 操作，使用 Homebrew 序列化命令基础、参数、环境、守卫条件和 sudo 设置执行 `run` 操作，以及执行具有与 Homebrew 兼容的名称/完整匹配、重试、通知和失败策略的 `terminate_process` 操作。需要自定义安装器选项、服务、不受支持的钩子 DSL、不受支持的结构化生命周期步骤或其他 cask 制品类型的 cask，会明确报告不受支持的制品错误，而不是委托给 Homebrew。

直接执行的 cask 安装仍由 mise 管理。其完成状态会记录在 `.mise-cask.toml` 中；mise 不会生成 Homebrew 私有的 `.metadata` 收据。如果某个 cask 已存在 Homebrew 元数据，mise 会保留这些元数据，并在进行修改前失败，而不是接管 Homebrew 的生命周期状态。状态检查使用已记录的安装事实，而不是根据更新后的 cask 定义重新构建这些事实；缺失或未知的收据以及待处理的事务会被报告为不健康状态，以便下一次应用操作能够协调它们。

之所以存在这一点，是因为共享库包——postgres、ffmpeg、imagemagick、php——从根本上说无法由 mise 的按项目后端（如 `aqua:` 或 `github:`）提供：它们的瓶装包是针对固定安装路径和共享依赖树构建的。将它们安装到 Homebrew 的标准前缀，才是让它们正常工作的关键。

## 支持的平台

| 平台                        | 前缀                         |
| --------------------------- | ---------------------------- |
| macOS arm64（Apple Silicon） | `/opt/homebrew`              |
| Linux x86_64                | `/home/linuxbrew/.linuxbrew` |
| Linux arm64                 | `/home/linuxbrew/.linuxbrew` |

不支持 Intel Mac——`brew` 管理器会报告在该平台不可用。在 Linux 上，如果某个 formula 没有适用于你的架构的 bottle（大多数 homebrew/core 都有 arm64 Linux bottle，但并非全部），则会改为从源代码构建。

## 前缀

如果前缀不存在，mise 会使用标准布局创建它——这是 brew 管理器唯一使用 sudo 的时候，模仿 Homebrew 自己的安装程序所做的事情（`mkdir` + `chown` 到你的用户）。之后，安装都只是以你的用户身份进行普通文件操作；不会有任何操作以 root 身份运行。

## 与真实 Homebrew 共存

mise 会像 brew 一样将瓶装包倒入 Cellar，并在每个 keg 中写入与 brew 兼容的 `INSTALL_RECEIPT.json` 文件。对于真正的 Homebrew 安装来说，mise 倒入的 keg 看起来就像它自己安装的一样：`brew list`、`brew upgrade` 和 `brew uninstall` 都可以对它们正常工作。反过来，mise 的状态检查会直接读取 Cellar，因此由 brew 安装的 formulae 也会被视为已安装。

对于非 keg-only formula，mise 会在 `opt` 记录旁维护 Homebrew 的
`<prefix>/var/homebrew/linked/<name>` 记录。对于已配置的 formula，如果任一记录缺失，`mise bootstrap packages
apply` 会在不重新倒入 keg 或替换其公共链接的情况下恢复该记录。只有当旧版 mise 安装现有的公共链接与 keg 的布局匹配时，才会将其识别为已链接。不会执行依赖闭包迁移。

无论 formula 是由 mise 还是由真正的 Homebrew 倒入的，mise 都会直接读取 Homebrew 前缀。它绝不会覆盖前缀中并非由它创建的文件——链接冲突会列出冲突文件并失败，而不会强行覆盖它们。

## 导入和清理

`mise bootstrap packages import --manager brew` 会将已安装的 Homebrew
formulae 快照到 `[bootstrap.packages]` 中，思路类似于
[`brew bundle dump`](https://docs.brew.sh/Brew-Bundle-and-Brewfile)。它会读取
Homebrew 前缀中的活动 `opt` 链接，并写入如下条目：

```toml
[bootstrap.packages]
"brew:ffmpeg" = "latest"
"brew:postgresql@17" = "latest"
```

默认情况下，导入只记录那些其活动 keg 收据表明是按请求安装的 formulae。传入 `--all` 也会包含依赖 formulae。
带有 tap 的 formulae 会使用完整限定名写入，并且当 mise 能推导出常规的 GitHub tap URL 时，会自动添加推断出的
`[bootstrap.brew.taps]` 条目：

```toml
[bootstrap.brew.taps]
"acme/tools" = "https://github.com/acme/homebrew-tools.git"

[bootstrap.packages]
"brew:acme/tools/widget" = "latest"
```

`mise bootstrap packages prune --manager brew` 会将当前配置以及可信、可加载、已跟踪的配置作为事实来源。它会移除那些不在已解析依赖闭包中的已链接 Homebrew formulae，这些闭包对应于已配置的 `brew:` 条目，包括由真实 Homebrew 安装的 formulae。

Prune 会移除活动 keg、其 `opt` 和已链接 keg 记录，以及指向该 keg 的前缀符号链接。使用 `--dry-run` 可预览操作，使用 `--yes` 可跳过确认提示。

这个命令是 mise 针对 bootstrap packages 的声明式清理，类似于
[`brew bundle cleanup`](https://docs.brew.sh/Manpage)。它不是上游的
`brew prune`，后者已被 Homebrew 移除，转而采用 cleanup 命令。

## 倒酒是如何工作的

对于依赖闭包中的每个公式（先处理依赖项）：

1. **获取**适用于你平台的瓶子（来自 ghcr.io），并根据 API 元数据验证其 sha256 值。
2. **提取**到 Cellar 内的临时目录中（未完成的倒酒过程永远不会显示为已安装的软件包）。
3. **重定位**：瓶子中嵌入了类似 `@@HOMEBREW_PREFIX@@` 的占位路径。mise 会将其重写为实际路径——在文本文件和二进制文件支持的可执行文件（例如 zipapp）的 shebang 前导部分中进行纯文本替换，同时保持其负载内容不变；并在 Mach-O 二进制文件中原地重写和重写加载命令（必要时将加载命令扩展到头部填充区域中），其行为与 brew 的 ruby-macho 完全一致。在 Linux 上，ELF 解释器和 rpath 会按照 brew 的 PatchELF gem 的方式进行修补：如果字符串不再适合原位置，就会将其移动到附加在二进制文件末尾的新段中，并将解释器指向 `<prefix>/lib/ld.so`（mise 会维护一个符号链接，将其指向系统的动态加载器；如果安装了通过 brew 构建的 glibc，则指向该 glibc）。
4. **重新签名**（macOS）：任何被修改的二进制文件都会使用 `codesign` 进行临时签名——在 arm64 上这是必需的，因为内核会终止签名不匹配的二进制文件。
5. **写入收据**：写入兼容 brew 的 `INSTALL_RECEIPT.json`。
6. **链接**：创建 `<prefix>/opt/<name>`，并将 keg 的 `bin`、`lib`、`include`、`share` 等目录符号链接到 prefix 中。对于非 keg-only 公式，还会创建 Homebrew 的 linked-keg 记录。[keg-only](https://docs.brew.sh/FAQ#what-does-keg-only-mean) 公式会获得 `opt` 链接，但不会链接到 prefix 中，与 brew 的行为相同。

## 源码公式

有些公式根本没有 bottle（仅源码公式），还有一些虽然在其他平台有 bottle，但在你的平台上没有。mise 会直接从源码构建这些公式——仍然不依赖 Homebrew：

1. **Ruby** — 由于公式本身就是 Ruby 代码，mise 会通过其常规工具机制提供一个由 mise 管理的 ruby（预编译、速度快；如果你已配置了 ruby，则会遵循你的配置）。
2. **Formula** — 该公式的 `.rb` 会从 homebrew/core 下载，并固定到生成 API 元数据时对应的精确 commit，同时使用 API 提供的 sha256 进行校验。
3. **Source** — 会下载稳定版源码归档，并使用 API 提供的 sha256 进行校验。
4. **Build deps** — 该公式的构建依赖（cmake、pkgconf、……）会被加入安装闭包，并优先作为常规 bottle 安装。
5. **Build** — mise 使用自己的 Formula-DSL shim 对公式进行求值，并在规范前缀下运行 `def install`，同时将 `PATH`、`PKG_CONFIG_PATH` 和编译器标志指向依赖的 keg。该 keg 会获得与已倒入 bottle 相同、兼容 brew 的收据，并带有 `poured_from_bottle: false`——这与 brew 标记其自身源码构建的方式完全一致。

该 shim 实现了 Formula DSL 中常用的子集
（configure/cmake/meson 风格构建、resources、patches、标准路径和环境辅助函数）。对于使用了 shim 未覆盖的 DSL 部分的公式——例如语言特定的辅助函数如 `virtualenv_install_with_resources`、VCS 下载，以及类似功能——会明确报出 `formula uses ...` 错误，而不是悄悄编译错误。

源码构建需要可用的工具链（macOS 上需要 Xcode Command Line Tools，Linux 上需要 gcc/make），这与在纯 Homebrew 下的要求完全一致。

## 升级

`mise bootstrap packages upgrade` 会重新根据 `formulae.brew.sh` API 解析已配置的配方，并倾倒任何当前版本与已链接 keg 不同的配方——新的 keg 会替换旧的，链接也会重新指向，就像 `brew upgrade` 所做的那样。由于瓶装包只存在于配方的当前版本中，因此“升级”和“安装当前瓶装包”是同一个操作。

## 限制

- **Cask 资源覆盖范围故意保持得很窄。** `brew-cask` 支持
  应用包、二进制资源，以及来自 dmg 和常见
  归档格式的简单 pkg 安装器。其他资源类型、不带 `pkgutil` ID 的 pkg 安装器，
  以及带有自定义选项的 pkg 安装器都会明确失败。
- **未实现 `brew services`。**
- **未实现 Cask 导入/清理。** 在 cask 卸载语义能够对应用和 pkg 资源安全之前，`import` 和 `prune` 仅适用于 formula。
- **源码构建覆盖常见的 formula 形态。** mise 的 formula shim
  实现了广泛使用的 DSL 子集（参见
  [源代码 formulae](#source-formulae)）；超出该范围的 formulae 会失败，并清楚地报出不受支持的功能名称。
- **请使用规范的 formula 名称。** `postgresql@17` 是一个 formula 名称，而不是
  mise 版本 pin——由 API 当前的稳定版本决定将安装什么。别名（`postgres`）可以正确安装，但 `mise bootstrap packages status`
  无法跟踪它们；mise 会发出警告并告诉你规范名称。
- `PATH` 由你决定：要使用链接
  二进制文件，`<prefix>/bin` 必须在 `PATH` 中，就像使用 Homebrew 本身一样。
