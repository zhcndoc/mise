# 提示与技巧

使用 `mise` 的一些实用技巧汇总。

## macOS Rosetta

如果你需要在 Apple Silicon 上以 x86_64 运行工具，可以使用 mise 来实现，但目前你需要使用 x86_64 版本的 mise 本身。这样做的一个常见原因是为了支持编译 node <=14。

你可以通过 [`MISE_ARCH`](https://mise.jdx.dev/configuration/settings.html#arch) 设置来实现，也可以按照下面的说明使用专用的 Rosetta mise 二进制文件：

首先，你需要一个为 x86_64 构建的 mise 版本：

```sh
$ curl https://mise.run | MISE_INSTALL_PATH=~/.local/bin/mise-x64 MISE_INSTALL_ARCH=x64 sh
$ ~/.local/bin/mise-x64 --version
mise 2024.x.x
```

::: warning
如果 `~/.local/bin` 不在 PATH 中，你需要在所有命令前加上 `~/.local/bin/mise-x64`。
:::

现在你可以使用 `mise-x64` 来安装工具：

```sh
mise-x64 use -g node@20
```

## Shebang

你可以在 shebang 中指定一个工具及其版本，而无需先
设置 `mise.toml`/`.tool-versions` 配置：

```typescript
#!/usr/bin/env -S mise x node@20 -- node
// “env -S” 允许在 shebang 中使用多个参数
console.log(`运行 node：${process.version}`);
```

这在 mise 未被激活的环境中也很有用
（例如非交互式会话）。

## 引导脚本

你可以下载 <https://mise.run> 脚本，用于项目引导脚本中：

```sh
curl https://mise.run > setup-mise.sh
chmod +x setup-mise.sh
./setup-mise.sh
```

::: tip
这个文件包含校验和，因此将其提交到你的项目中比动态调用 `curl https://mise.run` 更安全——不过当然，这也意味着它只会获取脚本创建时最新版本的 mise。
:::

## 项目本地任务入口点

如果你希望贡献者在不先安装 mise 的情况下运行项目任务，可以将
[`mise generate bootstrap`](/cli/generate/bootstrap.html) 与
[`mise generate task-stubs`](/cli/generate/task-stubs.html) 配合使用：

```sh
mkdir -p bin
mise generate bootstrap --localize --write bin/mise
mise generate task-stubs --mise-bin ./bin/mise
./bin/test
```

生成的任务存根会像小型项目命令一样运行，而 `bin/mise`
会下载并运行该项目固定版本的 mise 二进制文件。

## 机器引导

除了 `[tools]` 之外，mise 还可以声明项目或工作站所需的其余机器设置，并且 [`mise bootstrap`](/cli/bootstrap.html)
会通过一条命令将其收敛到目标状态——先是系统包，然后是仓库，然后是 dotfiles，然后
shell 激活，然后是 macOS 默认设置，然后是 LaunchAgents，然后是 systemd 用户
服务，然后是登录 shell，然后是工具，最后如果你定义了一个 `bootstrap` 任务，还会执行它：

```toml
[bootstrap.packages]                      # 操作系统包 (apk/apt/dnf/pacman/brew)
"apk:build-base" = "latest"
"apt:build-essential" = "latest"
"brew:postgresql@17" = "latest"

[bootstrap.repos]                         # 在 dotfiles 之前克隆的 git 仓库
"~/src/dotfiles" = { url = "git@github.com:jdx/dotfiles.git", ref = "main" }

[dotfiles]                             # dotfiles：符号链接/复制/模板
"~/.gitconfig" = { mode = "symlink" }
"~/.config/nvim" = { mode = "symlink" }

[bootstrap.mise_shell_activate]       # shell 启动文件中的 mise 激活
zprofile = "shims"
zshrc = "activate"
fish = "activate"

[bootstrap.macos.dock]                 # 友好的 macOS 默认设置
autohide = true
orientation = "left"

[bootstrap.macos.finder]
show_pathbar = true

[bootstrap.macos.launchd.agents.my-sync]      # macOS 用户 LaunchAgents
program = "~/.local/bin/my-sync"
run_at_load = true

[bootstrap.linux.systemd.units.my-sync]       # Linux systemd 用户服务
exec_start = "~/.local/bin/my-sync --watch"
restart = "on-failure"

[bootstrap.user]                       # 当前用户的登录 shell
login_shell = "/bin/zsh"

[bootstrap.hooks.post-defaults]        # 可选的阶段钩子
run = "killall Dock || true"

[tasks.bootstrap]                      # 其他任何内容，且 PATH 上可用 tools
run = "gh auth status || gh auth login"
```

```sh
mise bootstrap --yes   # 新笔记本或容器 -> 可开始工作
```

一切都是声明式且幂等的：再次运行时会跳过任何已经处于目标状态的内容，`mise bootstrap packages status --missing` 和 `mise bootstrap dotfiles status --missing` 可用于 CI 检查，而且不会有任何内容被隐式应用。例外是 `[bootstrap.hooks]` 和 `[tasks.bootstrap]`，
它们是在 `mise bootstrap` 期间运行的命令式命令，可能会产生副作用；除非钩子命令本身被编写为可安全收敛，否则应将其视为非幂等。参见
[Bootstrap](/bootstrap.html)、[Bootstrap Packages](/bootstrap/packages/)、[Repos](/bootstrap/repos.html)、[Dotfiles](/dotfiles.html)、
[Shell Activation](/bootstrap/shell.html)、
[macOS Defaults](/bootstrap/macos-defaults.html)、[launchd](/bootstrap/launchd.html)、
[systemd](/bootstrap/systemd.html) 和 [User Login Shell](/bootstrap/user.html)。

## 通过 zsh zinit 安装

[Zinit](https://github.com/zdharma-continuum/zinit) 是 ZSH 的一个插件管理器，通过这段配置你将获得 mise（以及 shell 补全的用法）：

```sh
zinit as="command" lucid from="gh-r" for \
    id-as="usage" \
    atpull="%atclone" \
    jdx/usage
    #atload='eval "$(mise activate zsh)"' \

zinit as="command" lucid from="gh-r" for \
    id-as="mise" mv="mise* -> mise" \
    atclone="./mise* completion zsh > _mise" \
    atpull="%atclone" \
    atload='eval "$(mise activate zsh)"' \
    jdx/mise
```

## CI/CD

在 CI/CD 中使用 mise 是一种很好的方式，可以同步开发/构建所使用的工具版本。

### GitHub Actions

在不使用 action 的情况下，mise 也很容易使用：

```yaml
jobs:
  build:
    steps:
      - run: |
          curl https://mise.run | sh
          echo "$HOME/.local/bin" >> $GITHUB_PATH
          echo "$HOME/.local/share/mise/shims" >> $GITHUB_PATH
```

或者你也可以使用自定义 action [`jdx/mise-action`](https://github.com/jdx/mise-action)：

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: jdx/mise-action@v3
      - run: node -v # 将会是来自 `mise.toml`/`.tool-versions` 的 node 版本
```

## `mise set`

你可以使用 [`mise set`](/cli/set.html) 来代替手动编辑 `mise.toml` 以添加环境变量：

```sh
mise set NODE_ENV=production
```

## 使用 Tera 读取不受支持的版本文件

一些项目本地的版本文件已经作为[惯用版本文件](https://mise.jdx.dev/configuration.html#idiomatic-version-files)受到支持。对于其他版本文件，您可以在 `mise.toml` 中使用 Tera 模板读取文件，并将版本分配给相应的工具。

例如，要使用 `.hvm` 文件并指定普通的 Hugo 版本：

```toml
[tools]
hugo = "{{ read_file(path='.hvm') | trim }}"
```

HVM 也支持带有 `/extended` 后缀的版本。在 mise 中，Hugo 和 Hugo Extended 是两个独立的工具，因此需要去掉该后缀，并改用 `hugo-extended`：

```toml
[tools]
hugo-extended = "{{ read_file(path='.hvm') | trim | replace(from='/extended', to='') }}"
```

有关 Tera 函数和过滤器的更多细节，请参见[模板](/templates.html)。

## [`mise run`](/cli/run.html) 简写

只要任务名称不与 mise 提供的命令冲突，你就可以省略 `run` 部分：

```sh
mise test
```

::: warning
不要在脚本中这样做，因为 mise 未来版本可能会添加一个命令，并与你的任务发生冲突。
:::

## 编辑时监视任务

[`mise watch`](/cli/watch.html) 会在文件更改时重新运行任务。它使用
`watchexec`，你可以使用 mise 全局安装它：

```sh
mise use -g watchexec@latest
mise watch test
```

对于应在更改时重启的长时间运行进程，使用 `--restart`：

```sh
mise watch --restart dev
```

## 共享任务目录

对于拥有大量任务的项目，
[`task_config.includes`](/tasks/task-configuration.html#task-config-includes)
可以从额外的目录、`tasks.toml` 文件或远程 git 仓库加载任务定义：

```toml
[task_config]
includes = [
  "mise-tasks",
  "tasks.toml",
  "git::https://github.com/myorg/shared-tasks.git//tasks?ref=v1.0.0",
]
```

被包含的 `tasks.toml` 文件使用与 `[tasks]` 表相同的结构，只是没有
`[tasks.]` 前缀。

## 使用模板复用任务定义

实验性的 [任务模板](/tasks/templates.html) 允许多个任务共享
通用工具、环境变量和命令默认值：

```toml
[settings]
experimental = true

[task_templates."node:test"]
tools = { node = "24", pnpm = "latest" }
run = "pnpm test"

[tasks.test]
extends = "node:test"
run = "pnpm test -- --watch=false"
```

这在 monorepo 中尤其有用，因为其中每个包都需要类似的构建、
测试或 lint 任务，并且只需进行少量本地覆盖。

## 从任务输出中去除敏感信息

如果某个任务可能在 CI 日志中回显敏感信息，请在任务或配置中添加 `redactions`。
列出的环境变量会在任务输出中替换为 `[redacted]`：

```toml
redactions = ["API_KEY", "PASSWORD"]
```

也支持 glob 模式：

```toml
redactions = ["SECRETS_*"]
```

## 软件验证

请参阅 [安全](/security.html#software-verification) 了解 mise 的软件验证控制，
包括 aqua 签名、SLSA 来源证明以及 GitHub 产物证明。

## 最低发布年龄

请参阅 [安全](/security.html#minimum-release-age) 以了解供应链延迟控制、后端支持以及传递依赖过滤行为。

## [`mise up --bump`](/cli/upgrade.html)

使用 `mise up --bump` 将所有软件升级到最新版本并更新 `mise.toml` 文件。这会保持与之前相同的 semver 范围，
因此如果你原来有 `node = "24"`，而 node 26 是最新版本，那么 `mise up --bump node` 会将 `mise.toml` 改为 `node = "26"`。

## cargo-binstall

cargo-binstall 有点像 ubi，但专用于 Rust 工具。它会为 cargo 发布版本获取二进制文件。如果已安装，mise 会自动将其用于 `cargo:` 工具
因此如果你使用 `cargo:`，你应该把它加上，这样 `mise i` 会快很多。

```sh
mise use -g cargo-binstall
```

## [`mise cache clear`](/cli/cache.html)

mise 会出于显而易见的原因缓存一些内容，但有时你希望它使用新鲜数据（也许它没有注意到一个新发布版本）。运行 `mise cache clear` 来移除缓存，这基本上等同于运行 `rm -rf ~/.cache/mise/*`。

## [`mise en`](/cli/en.html)

`mise en` 是 `mise activate` 的一个很好的替代方案，如果你因为某些原因不想一直使用 mise。它会在你当前目录中设置 mise 环境，
但之后不会持续运行并更新环境变量。

## 进入项目时自动安装

通过将以下内容添加到 `mise.toml`，在进入项目时自动安装工具：

```toml
[hooks]
enter = "mise i -q"
```

## [`mise tool [TOOL]`](/cli/tool.html)

使用 `mise tool [TOOL]` 获取有关某个工具正在使用的后端以及其他信息：

```sh
❯ mise tool ripgrep
Backend:            aqua:BurntSushi/ripgrep
Installed Versions: 14.1.1
Active Version:     14.1.1
Requested Version:  latest
Config Source:      ~/src/mise/mise.toml
Tool Options:       [none]
```

## [`mise cfg`](/cli/config.html)

使用 `mise cfg` 列出 mise 在特定目录中正在读取的配置文件：

```sh
❯ mise cfg
Path                                    Tools
~/.config/mise/config.toml              (none)
~/.mise/config.toml                     (none)
~/src/mise.toml                         (none)
~/src/mise/.config/mise/conf.d/foo.toml (none)
~/src/mise/mise.toml                    actionlint, bun, cargo-binstall, cargo:…
~/src/mise/mise.local.toml              (none)
```

这有助于弄清楚配置文件的加载顺序，从而判断哪个配置文件会覆盖其他配置。

## `mise.lock`

当启用锁文件时，mise 会将完整版本和 tarball 校验和（如果后端支持）更新到 `mise.lock` 中。
这些内容可以通过 [`mise up`](/cli/upgrade.html) 更新。你需要手动创建锁文件，然后 mise 会将工具添加进去：

```sh
touch mise.lock
mise i
```

锁文件使用一种统一格式，采用 `[tools.name.assets]` 部分来组织每个工具下的资产信息。资产信息包括校验和、文件大小以及可选的下载 URL。旧版锁文件使用单独的 `[tools.name.checksums]` 和 `[tools.name.sizes]` 部分，会自动迁移到新格式。

请注意，至少目前来说，mise 需要实际安装该工具才能获取 tarball 校验和（否则它就需要先下载 tarball，才能获取其校验和，因为通常下载后它会被删除）。因此，你可能需要先运行类似 `mise uninstall --all` 的命令，以便让它重新安装所有内容。不过，即使它不知道校验和，它仍会保存完整版本，所以它依然会锁定版本，只是不会附带校验和。

## 锁文件 URL 跟踪（避免速率限制）

当你使用锁文件（`mise.lock`）时，mise 会为每个工具资产存储确切的下载 URL。这意味着在首次安装之后，后续的 `mise install` 运行将使用锁文件中的 URL，而不是向 GitHub（或其他提供商）发起 API 调用。这带来了几个好处：

- **避免 GitHub API 速率限制**：无需为每次安装重复发起 API 调用，这会很快耗尽你的速率限制，尤其是在 CI 或大型团队中。
- **无需 GITHUB_TOKEN**：由于 URL 已经已知，对于简单安装，你不需要配置 `GITHUB_TOKEN`。有关令牌配置的更多信息，请参见 [GitHub Tokens](/dev-tools/github-tokens.html)。
- **更快的安装**：跳过 API 查询可加快重复安装速度。

这在 CI/CD 中，或在具有严格网络或身份验证要求的环境中工作时尤其有用。
