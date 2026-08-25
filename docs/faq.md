# 常见问题解答

## 我不想把 `mise.toml`/`.tool-versions` 文件放进我的项目里，因为 git 会把它显示为未跟踪文件

使用 [`mise.local.toml`](https://mise.jdx.dev/configuration.html#mise-toml)，并将其添加到全局 gitignore 文件中。此文件不应被提交。

如果你真的想使用 `mise.toml` 或 `.tool-versions`，这里有 3 种方法让 git 忽略这些文件：

- 将 `mise.toml` 添加到项目的 `.git/info/exclude` 中。这个文件只属于你的项目，因此
  不需要提交它。
- 将 `mise.toml` 添加到项目的 `.gitignore` 文件中。缺点是你需要
  提交对忽略文件的更改。
- 将 `mise.toml` 添加到全局 gitignore（`core.excludesFile`）中。这将使 git
  忽略所有项目中的 `mise.toml` 文件。如果需要，你可以通过
  `git add --force mise.toml` 明确地把它添加到某个项目中。

## “nodejs”和“node”（或“golang”和“go”）有什么区别？

它们是别名。例如，`mise use nodejs@14.0` 与 `mise install node@14.0` 是一样的。这
意味着不可能让它们对应不同的插件。

这样做是为了方便，你不需要记住哪个才是“官方”名称。不过如果
别名相关的功能出现了问题，请提交工单，或者直接坚持使用“node”和“go”。
在内部，当 mise 读取配置文件或接收 CLI 输入时，它会将“nodejs”和“golang”替换掉。

当 mise _写入_ `mise.toml`（`mise use`、`mise unuse`）时，它会写入规范名称——
`nodejs` 条目会变成 `node`，同时保留其注释。`.tool-versions` 文件不受影响，仍然
使用 asdf 的拼写方式。

## `mise activate` 有什么作用？

它会注册一个 shell 钩子，使得每次显示 shell 提示符时都运行 `mise hook-env`。
`mise hook-env` 会检查当前的环境变量（最重要的是 `PATH`，但某些工具还会用到其他变量，比如
`GOROOT` 或 `JAVA_HOME`），并对已发生变化的变量进行添加、移除或更新。

例如，如果你 `cd` 到一个使用 `java 18` 而不是 `java 17`
的不同目录中，那么在下一个提示符显示之前，shell 会执行：`eval "$(mise hook-env)"`
，这会在当前 shell 会话中执行类似下面的内容：

```sh
export JAVA_HOME=$HOME/.local/share/installs/java/18
export PATH=$HOME/.local/share/installs/java/18/bin:$PATH
```

实际上，更新 `PATH` 比这更复杂一些，因为它还需要移除 java-17，
但你应该能明白这个意思。

你可能会觉得每次显示提示符时都运行 `mise hook-env` 太过频繁了，
它应该只在 `cd` 时运行；不过，在很多情况下，即使目录没有变化，它也需要运行，
例如当前 shell 中刚刚编辑了 `.tool-versions` 或
`mise.toml` 的时候。

由于它是在提示符显示时运行的，如果你尝试在
非交互式会话中使用 `mise activate`（比如 bash 脚本），它将永远不会调用 `mise hook-env`，实际上也就
永远不会修改 `PATH`，因为它从不显示提示符。对于这种设置，你可以每次需要更新 PATH 时手动调用
`mise hook-env`，或者改用 [垫片](/dev-tools/shims.md)
（更推荐）。
或者，如果你只需要在某些命令中使用 mise，只需在命令前加上
[`mise x --`](./cli/exec)。
例如，`mise x -- npm test` 或 `mise x -- ./my_script.sh`。

如果没有发生任何更改，`mise hook-env` 会在不同情况下提前退出。这可以避免
每次运行命令时都给你的 shell 提示符增加延迟。你也可以自己运行 `mise hook-env`
来查看它的输出，不过如果你所在的 shell 已经激活过了，很可能什么也不会输出。

`mise activate` 还会在大多数 shell 中创建一个名为 `mise` 的 shell 函数。
这是一个技巧，使得 `mise shell`
和 `mise deactivate` 可以正常工作，而无需用 `eval "$(mise shell)"` 来包裹它们。

## Windows 支持？

::: warning
虽然 mise 在 WSL 中运行得非常好，但原生 Windows 也受支持，不过目前是通过 shim 来实现，直到有人添加 [powershell](https://github.com/jdx/mise/discussions/6733) 支持为止。

由于你需要使用 shim，这意味着除非你通过 [`mise x`](/cli/exec) 或 [`mise run`](/cli/run) 运行 mise，否则你不会获得来自 mise.toml 的环境变量。
:::

## 如何将 mise 与 HTTP 代理一起使用？

简短答案：只需设置 `http_proxy` 和 `https_proxy` 环境变量。这些变量应使用小写。

如果某些插件未配置为使用这些环境变量，那么这对它们可能不起作用。  
如果你在通过代理安装某个特定内容时遇到问题，你应该在该插件的仓库中提交一个 issue。

## 简写插件名称如何映射到仓库？

例如：`mise plugin install elixir` 是如何知道要获取 <https://github.com/asdf-vm/asdf-elixir> 的？

我们维护着一个 [索引](https://github.com/mise-plugins/registry)，其中包含 mise 作为基础使用的简写名称。
每当 mise 发布新版本时，这个索引都会定期更新。这个仓库会直接存储到代码库中的 [registry/](https://github.com/jdx/mise/blob/main/registry/) 里。

## "node@20" 是否表示 node 的最新可用版本？

这取决于具体命令。通常，对于大多数命令以及配置文件中，"node@20" 会指向 node-20.x 的最新 _已安装_ 版本。你可以通过运行
`mise latest --installed node@20` 来找到这个版本，或者查看 `~/.local/share/mise/installs/node/20`
这个符号链接
指向哪里：

```sh
$ ls -l ~/.local/share/mise/installs/node/20
[...] /home/jdx/.local/share/mise/installs/node/20 -> node-v20.0.0-linux-x64
```

不过也有一些例外，例如以下命令：

- `mise install node@20`
- `mise latest node@20`
- `mise upgrade node@20`

这些命令会使用 node-20.x 的最新 _可用_ 版本。这样通常是合理的，因为你
不会希望安装一个已经安装过的版本。

## 如何从 asdf 迁移？

- 安装 mise，并按照[入门指南](/getting-started)中的说明设置 `mise activate`
- 从你的 shell rc 文件中移除 asdf
- 在包含 asdf `.tool-versions` 文件的目录中运行 `mise install`，mise 就会安装这些工具

::: info
请注意，`mise` 不会像 `asdf` 那样将 `~/.tool-versions` 文件视为全局配置文件。`mise` 使用
`~/.config/mise/config.toml` 文件进行全局配置。
:::

下面是一个示例脚本，可用于将你的全局 `.tool-versions` 文件迁移到 mise：

```shell
mv ~/.tool-versions ~/.tool-versions.bak
cat ~/.tool-versions.bak | tr -s ' ' | tr ' ' '@' | xargs -n2 mise use -g
```

当你对 mise 感到满意后，可以删除 `.tool-versions.bak` 文件，并[卸载 `asdf`](https://asdf-vm.com/manage/core.html#uninstall)。

## mise 与 asdf 的兼容性如何？

mise 应该能够读取/安装 asdf 使用的任何 `.tool-versions` 文件。任何 asdf 插件都应该可以在 mise 中使用。mise 中的命令略有不同，例如 `mise install node@20.0.0` 与 `asdf install node 20.0.0`——这样做是为了可以一次指定多个工具。不过，仍然支持 asdf 风格的语法：(`mise install node 20.0.0`)。大多数命令都是如此，尽管该命令的帮助信息可能会说明支持 asdf 风格语法。拿不准时，直接试试 asdf 语法，看看是否可行——大概率是可以的。

::: info
更新（2025-01-01）：mise 的设计目标是与用 bash 编写的 asdf（<=0.15）兼容。用 go 编写的新 asdf（>=0.16）有一些 mise 不支持的命令，比如 `asdf set`。`mise set` 是一个已存在的命令，但它与 `asdf set` 完全不同——在 mise 中，它用于设置环境变量。

这件事对可用性本身并不那么重要，更多是为了让那些在插件代码中调用 asdf 命令的插件能够继续正常工作。
:::

使用 `mise use` 之类的命令可能会输出与 asdf 不兼容的 `.tool-versions` 文件，例如使用模糊版本。你可以设置 `--pin` 或 `MISE_PIN=1`，让 `mise use` 在 `.tool-versions` 中输出与 asdf 兼容的版本。或者，你也可以让 `mise.toml` 和 `.tool-versions` 并排放置。`mise.toml` 中定义的工具会覆盖同一目录下 `.tool-versions` 中定义的工具。

不过，总的来说，与 asdf 的兼容性已经不再是设计目标。长期以来，已经没有理由优先选择 asdf 而不是 mise，因此用户应该迁移。虽然有不少用户所在的团队同时使用两者，但这种配置带来的问题通常不会被优先处理。

## 如何禁用/强制 CLI 颜色输出？

mise 使用 [console.rs](https://docs.rs/console/latest/console/fn.colors_enabled.html)，它
遵循 [clicolors 规范](https://bixense.com/clicolors/)：

- `CLICOLOR != 0`：支持 ANSI 颜色，并且在程序没有通过管道输出时应当使用。
- `CLICOLOR == 0`：不要输出 ANSI 颜色转义代码。
- `CLICOLOR_FORCE != 0`：无论如何都应启用 ANSI 颜色。

## mise 是安全的吗？

提供安全的供应链极其重要。与 asdf 相比，mise 已经提供了更安全的
使用体验。欢迎以安全为导向的评估和贡献。我们也敦促用户关注他们所使用的插件，
并敦促插件作者关注他们所服务的用户。

有关更多详情，请参阅 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md)。

## 什么是 usage？

usage（<https://usage.jdx.dev/>）是一个用于定义 CLI 工具的规范和 CLI。

参数、标志、环境变量和配置文件都可以在 Usage 规范中定义。可以把它看作是面向 CLI 的 OpenAPI（swagger）。

mise 将 usage 嵌入其中，用于任务参数解析、帮助信息和自动补全，因此不需要单独安装 `usage` CLI。请参阅[自动补全](/installing-mise.html#autocompletion)。

你可以在文件任务中利用 usage 来实现自动补全，请参见 [文件任务参数](/tasks/file-tasks.html#arguments)。

## 什么是 pitchfork？

pitchfork（<https://pitchfork.jdx.dev/>）是一个面向开发者的进程管理器。

它通过以下功能处理守护进程管理：失败时自动重启、智能就绪检查、在进入项目目录时基于 shell 的自动启动/停止，以及用于周期性任务的类似 cron 的调度。

## VSCode for Windows 扩展出现 `spawn EINVAL` 错误

在 VSCode 中，由于一个 [Node.js 安全修复](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2#command-injection-via-args-parameter-of-child_processspawn-without-shell-option-enabled-on-windows-cve-2024-27980---high)，许多扩展会抛出“error spawn EINVAL”错误。

默认的 `exe` shim 模式应该可以解决此问题。如果你使用的是较旧的模式，可以将 [windows_shim_mode](https://mise.jdx.dev/configuration/settings.html#windows_shim_mode) 更改为 `exe`、`hardlink` 或 `symlink`。

## `mise install` 和 `mise use` 有什么区别？

`mise install` 会下载并安装某个工具版本，但**不会**将其添加到任何配置文件中。
除非该工具已经列在 `mise.toml` 或 `.tool-versions` 中，否则它不会在你的 shell 中自动激活。

`mise use` 会安装该工具**并**将其添加到 `mise.toml`（或使用 `-g` 时添加到 `~/.config/mise/config.toml`），因此当你进入该目录时，它会自动激活。

如果你只是想为某个项目固定一个工具版本，请使用 `mise use`。如果你想安装
一个已经列在配置中的版本，请使用 `mise install`。

::: tip
`mise install node`（不带版本）如果 node 不在你的配置中，将安装**最新**版本。
`mise install`（不带参数）只会安装配置文件中列出的工具。
:::

## `latest` 是否表示最新的远程版本？

这取决于上下文。在配置文件和大多数命令中，`latest` 会解析为最新的**已安装**版本。这意味着，如果你已安装 node 20.0.0，而远程可用的是 node 22.0.0，`latest` 仍然会指向 20.0.0。

不过，有些命令会将 `latest` 解析为最新**可用的**（远程）版本：

- `mise install node@latest` — 安装最新可用版本
- `mise x node@latest -- node -v` — 使用最新可用版本
- `mise latest node` — 显示最新可用版本

要升级到最新可用版本并更新你的配置，请运行：

```sh
mise upgrade node
# 或者同时更新 mise.toml：
mise upgrade --bump node
```

## 我的配置文件被忽略了 / `mise trust` 问题

mise 要求你信任不是由你创建的配置文件。安全配置文件——仅包含 `min_version`、值为纯版本字符串或字符串数组的 `[tools]` 条目，以及不包含模板的 `[tasks]`——无需信任即可加载。工具选项表和其他顶层设置需要信任。在普通模式下，`mise run`、裸任务调用（例如 `mise <TASK>`）、`mise install`、`mise exec` 和 `mise watch` 会自动信任当前活动配置，因为它们会明确执行项目定义的行为。其他不安全的配置需要信任。常见问题：

- **意外拒绝信任**：如果 mise 提示你信任某个文件而你选择了否，它会将该文件添加到忽略列表中。检查[ mise 状态目录](/directories.html)中的 `ignored-configs` 目录（默认：`~/.local/state/mise/ignored-configs/`），并删除相关符号链接以取消忽略它。
- **符号链接配置**：如果你的配置是符号链接（例如通过 GNU Stow），mise 可能会跟踪符号链接目标路径。尝试使用指向实际文件路径的 `mise trust`。
- **CI**：在检测到 CI 时，除非启用了 paranoid 模式，否则 mise 会假定配置已受信任。
- **非交互模式**：在非交互式 shell 中，例如 IDE 扩展或没有 TTY 的脚本中，mise 无法提示你信任配置。在普通模式的 `mise run`、`mise <TASK>`、`mise install`、`mise exec` 和 `mise watch` 之外，直接加载不受信任的 `mise.toml` 的命令可能会因不受信任配置错误而失败。发现之前已跟踪配置的命令则可能改为跳过不受信任的条目。你可以提前运行 `mise trust`，或者在全局设置中设置 [`trusted_config_paths`](/configuration/settings.html#trusted_config_paths)，以指定你信任的配置。
- **全局配置**（`~/.config/mise/config.toml`）应该会自动受信任。如果没有，请明确运行 `mise trust ~/.config/mise/config.toml`。

运行 `mise doctor`（`mise dr`）可以查看是否有配置文件不受信任——它会在“problems”下列出这些文件。

## 习惯用法版本文件（`.python-version`、`.node-version` 等）是如何工作的？

习惯用法版本文件（`.python-version`、`.node-version`、`.ruby-version` 等）在 mise 中**默认是禁用的**。只有当你通过
[`idiomatic_version_file_enable_tools`](/configuration/settings.html#idiomatic_version_file_enable_tools) 为每个工具显式启用时，才会读取它们：

```sh
# 启用读取 .node-version 文件
mise settings add idiomatic_version_file_enable_tools node
```

如果你之前启用了习惯用法文件，而现在希望让 mise 停止读取它们
（例如，因为 `uv` 管理 `.python-version`），只需不要将该工具添加到列表中即可。

更多信息请参见 [习惯用法版本文件](/configuration.html#idiomatic-version-files)。

## `mise activate`、shims、`mise exec` 和 `mise env` 之间有什么关系？

它们的核心作用都一样：设置你的环境（主要是 `PATH`），让 mise 管理的工具可用。区别在于它们作用的 _时机_ 和 _方式_：

| 方法                              | 工作方式                                               | 最适合                                  |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `mise activate`                     | 挂钩到你的 shell 提示符，动态更新 PATH                 | 交互式终端使用                           |
| `mise activate --shims`             | 一次性把 shims 目录添加到 PATH                         | IDE、简单配置（不支持 hooks/env）         |
| `mise exec` / `mise x`              | 设置环境，运行单个命令，然后退出                       | 脚本、CI、一次性命令                      |
| `mise env`                          | 打印可供 `eval` 的环境变量                             | 与其他工具集成                           |
| `mise run`                          | 设置环境，然后运行一个任务                             | 任务执行                                 |
| Shims (`~/.local/share/mise/shims`) | 每次调用时都会执行 mise 的包装脚本                     | 非交互式 shell、IDE                       |

::: warning
`mise activate --shims` **不**支持 hooks、来自 `[env]` 的环境变量，或 `watch_files`。
它只会把 shims 放到 PATH 中。如果你需要这些功能，请使用 `mise activate`（不带 `--shims`）。
:::

## `mise exec` 是如何工作的？

`mise exec`（或 `mise x`）会读取你的配置，设置 `PATH` 和环境变量，然后运行你在 `--` 之后指定的命令：

```sh
# 使用你的 mise.toml 中的任意 node 版本
mise x -- node script.js

# 使用特定版本覆盖（当它与配置不同时很有用）
mise x node@22 -- node script.js
```

Discord 上一个常见的写法是：当 `mise.toml` 中已经有 `node@20` 时，使用 `mise x node@20 -- node script.js`。这样可以工作，但有些多余——如果你只是想使用配置中的版本，`mise x -- node script.js` 会更简单。

## `mise use` 会写到哪里？

`mise use` 会写入你目录层级中最近的 `mise.toml`。如果父目录中有一个
`mise.toml`（对于 `-g` 来说，包括 `~/.config/mise/config.toml`），它就会更新那个文件。

```sh
mise use node@22           # 写入最近的 mise.toml（可能是父目录中的文件！）
mise use -g node@22        # 写入 ~/.config/mise/config.toml
mise use --path mise.toml node@22  # 写入指定文件
```

使用 `mise cfg` 查看 mise 在当前目录中正在读取哪些配置文件。

## mise 用于开发工具，而不是应用程序或系统包

mise 管理 **开发工具版本**（node、python、go、rust 等）和 CLI 实用工具。
它不能替代像 `apt`、`brew` 或 `pacman` 这样的系统包管理器。

mise **不**做的事情：

- 安装系统库（libssl、zlib 等）
- 管理桌面应用程序
- 处理工具编译所需的系统级依赖

如果 mise 安装的工具需要系统库，请先使用操作系统的软件包管理器安装该库。你可以在 [`[bootstrap.packages]`](/bootstrap/packages/) 中声明这些软件包，让 `mise bootstrap` 安装它们：如果平台的软件包管理器负责管理这些软件包，就通过 apt/dnf/pacman 安装；对于 `brew:` 和 `brew-cask:` 条目，则通过 mise 内置的 Homebrew 安装程序安装，整个过程不需要安装 Homebrew。无论哪种方式，它们都是主机软件包，而不是 `[tools]` 条目。

## 如何安装其他用户可以在不使用 mise 的情况下运行的工具？

有两项功能可以安装运行时无需 mise、且能在 `PATH` 上使用的二进制文件。

对于有 Homebrew formula 的工具，请使用带有 `brew:` 条目的 [`[bootstrap.packages]`](/bootstrap/packages/)：

```toml
[bootstrap.packages]
"brew:ffmpeg" = "latest"
"brew:jq" = "latest"
```

mise 会将 bottles 写入规范前缀（Linux 上为 `/home/linuxbrew/.linuxbrew`，arm64 macOS 上为 `/opt/homebrew`），并创建常规的 `<prefix>/bin` 链接，同时不要求安装 Homebrew 本身。一旦将 `<prefix>/bin` 添加到 `PATH`，这些二进制文件的行为就与其他 Homebrew 安装的程序一样。
[Keg-only](https://docs.brew.sh/FAQ#what-does-keg-only-mean) formula 是例外：与 brew 一样，mise 不会将它们放入前缀目录，因此它们的二进制文件会保留在
`<prefix>/opt/<name>/bin`。

在 arm64 macOS 以及运行 mise brew 管理器的 x86_64/arm64 Linux 上，`mise bootstrap packages import --manager brew` 会将现有的 Homebrew 或 Linuxbrew 设置快照保存到你的配置中——可以保存你按需安装的 formula，也可以通过 `--all` 保存所有已链接的 formula。

对于 mise 支持的任何后端，请使用 [`mise install-into`](/cli/install-into.html)。它会将一个工具版本安装到你选择的目录中，以便在 mise 之外使用：

```sh
mise install-into node@22 /opt/node
/opt/node/bin/node -v
```

请将其指向一个新的或空的目录：`install-into` 会删除目标位置中已有的内容；执行前会显示确认提示，默认选择否，也可以通过 `--yes` 跳过询问。它只会写入该目录，因此请像处理上面的 brew 前缀一样，手动将其 `bin` 目录添加到 `PATH`。如果工具需要 `JAVA_HOME` 之类的环境变量，或需要 mise 通常在运行时应用的其他配置，仍然需要手动设置。

这两种方式都与 Homebrew 做出了相同的取舍：为所有人提供 `PATH` 上的一个版本，而不支持按项目选择版本。如果你需要按项目选择版本，请将工具保留在 `[tools]` 中，并让 [`mise bootstrap`](/bootstrap.html) 通过一条命令统一配置每个用户的激活状态、配置和工具——或者通过 [`mise bootstrap remote`](/bootstrap/remote.html) 在多台主机上完成。

## mise 版本控制是如何工作的？

mise 使用 [Calver](https://calver.org/) 版本控制（`2024.1.0`）。
破坏性变更会很少，但一旦发生，
它们会尽可能提前在 CLI 中通知。

与其使用 SemVer 的大版本发布来传达大型发布中的变更，
不如通过 `experimental = true` 之类的设置来选择启用新功能和变更。
这样插件作者和用户就可以
立即测试新功能，而无需等待主要版本发布。

Calver 中的数字（YYYY.MM.RELEASE）仅表示发布日期——并不表示兼容性
或新增了多少功能。
每次发布都会小而渐进。
