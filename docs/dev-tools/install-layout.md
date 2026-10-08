---
description: "实验性安装布局按安装内容命名每个安装实例，让简写共享安装，并允许同一版本的不同变体共存。"
---

# 安装布局 <Badge type="warning" text="实验性" />

默认情况下，mise 将工具安装到 `installs/<tool>/<version>`。该路径无法说明文件由哪个后端产生、面向哪个平台，或使用了哪些安装选项。因此 `age` 和 `aqua:FiloSottile/age` 会产生两个独立下载，同一版本的两个变体也会互相覆盖。

安装布局会为每个安装实例提供独立目录 `installs/<label>-<hash>/`，名称描述安装的内容。熟悉的 `installs/<tool>/<version>` 路径保留为指向该目录的链接。

::: warning 实验性
即使设置了 `experimental = true`，安装布局也需要显式启用：必须同时设置 `experimental = true` 和 `install_layout = "identity"`。后续版本可能会在启用 `experimental` 时默认开启它。实验期间目录名称、收据和目录格式都可能变化；虚拟环境、shebang 等安装时生成的文件会记录带哈希的路径。请在重新安装成本较低的环境中试用，并在依赖它之前阅读[降级与兼容性](#downgrading-and-compatibility)。
:::

## 快速开始

在 `mise.toml` 中启用布局；也可以使用 `mise settings set experimental=true` 和 `mise settings set install_layout=identity`（或 `MISE_INSTALL_LAYOUT=identity`）为所有项目启用：

```toml [mise.toml]
[settings]
experimental = true
install_layout = "identity"

[tools]
age = "1.2.1"
```

安装工具并查看其位置：

```sh
mise install
mise where age
# ~/.local/share/mise/installs/age-hlencrst
readlink ~/.local/share/mise/installs/age/1.2.1
# ../age-hlencrst
```

目录名称由可读标签和短哈希组成，因此 `ls installs/` 仍能显示每个目录的用途。哈希包含平台信息，所以在其他操作系统或架构上会与示例不同。

## 有哪些变化

启用布局后，新的安装实例如下：

```text
installs/
  age/                          the tool directory, as before
    1.2.1 -> ../age-hlencrst    version link
    1.2 -> ./1.2.1              runtime alias
    1 -> ./1.2.1                runtime alias
    latest -> ./1.2.1           runtime alias
  age-hlencrst/                 the installation itself
    .mise-install.toml          receipt
    age/age                     the tool's files
  .mise/                        catalog
```

**安装目录。** 每个安装实例位于 `installs/<label>-<hash>/`。容纳这些目录的目录称为安装存储；除 Windows 外，它就是 installs 目录本身，Windows 使用更短的同级目录（见 [Windows](#windows)）。标签来自后端，而不是 registry 简写，因此 registry 变化不会移动已有安装。`aqua:FiloSottile/age` 生成 `age`，`aqua:yarnpkg/berry` 生成 `berry`，`go:github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen` 生成 `oapi-codegen`。生成标签时，mise 会去掉后端前缀、选项以及末尾的 `@version` 或 `.git`，取最后一个路径段（跳过 `v2` 等 Go 主版本段），转为小写，将 `a-z0-9._-` 之外的字符替换为 `-`，并限制为 24 个字符。所有平台使用相同规则；布局发布后规则固定，因为修改它会改变所有路径。

哈希是安装身份的 base32 摘要的前八个字符。如果该名称已被其他身份占用，或被 mise 未创建的目录占用，新安装会每次增加两个哈希字符（十个、十二个，依此类推）。mise 永远不会为了腾出名称而重命名已有安装。

**收据。** 每个安装目录都包含 `.mise-install.toml` 收据，记录该安装响应的请求。以下是删减示例：

```toml
digest = "hlencrstldyjkqnpak2zyr453avqxfjf6so4vopt7au5nsxvzska"
dir = "age-hlencrst"
requested_as = "age"

[identity]
mode = "fallback"
backend = "aqua:FiloSottile/age"
version = "1.2.1"
platform = "linux-x64"
```

除身份外，收据还会保存后端提供的构件摘要、请求工具时使用的名称，以及写入收据的 mise 版本。mise 最后才写入收据，因此没有收据的目录是不完整安装。收据只描述安装是如何请求的，并不能证明文件仍是原始字节；将收据复制到缓存工具旁边也不会使该工具变得可信。

`mode` 表示身份约束的程度。`fallback` 由后端、版本、平台和选项标识请求；`resolved` 还会记录锁文件中的固定构件校验和（见[锁文件与选择](#lockfiles-and-selections)）。`fallback` 安装无法保证再次安装同一请求时得到相同字节。

**目录。** `installs/.mise/` 记录每个身份分配到的目录，以及每个无锁文件请求选择的安装实例。这是持久元数据，不是缓存。复制或缓存 installs 目录时，应同时保留它所描述的安装；如果安装存储是独立目录，也要一起保留（Windows 中是 `installs` 旁的 `i`，见 [Windows](#windows)）。

**版本链接。** `installs/<tool>/<version>` 指向安装实例，因此 IDE SDK 条目等已记录路径仍能工作。一个链接只能指向一个变体；同一版本存在两个变体时，链接指向最近安装的那个。mise 不会用链接决定请求代表哪个变体。在 Linux 和 macOS 上链接是相对链接（`../age-hlencrst`）。

**运行时别名。** `latest`、`1` 或 `1.2` 等别名在工具目录中保持原有格式（`1 -> ./1.2.1`）。它们先链接到版本链接，再链接到安装实例。

mise 仍会写入工具目录的 `.mise.backend.toml` 旁车文件和 `installs/.mise-installs.toml`。

## 不变的行为

- **已有安装保持原位。** 启用布局时，mise 不会移动或迁移已经存在的 `installs/<tool>/<version>` 目录。移动它们会破坏 shebang、虚拟环境和包管理器安装中嵌入的路径。当记录的后端与请求匹配时，mise 会继续原地使用旧布局安装；否则会在新布局中重新安装版本，而不会把另一个后端的文件解释成当前请求。要自行移动它们，请参阅[移动旧布局安装](#moving-legacy-installations)。
- **两种布局可以共用一个 installs 目录。** mise 通过收据和目录预留，而不是名称，区分带哈希目录与工具目录。
- **mise 不会自行回收旧布局安装。** 即使存在对应的带哈希安装，也不会因此删除或移动旧目录；`prune` 对旧布局的处理保持不变。只有 `mise installs migrate` 会移动它们。
- **无锁文件请求的 PATH 仍使用 `installs/<tool>/<alias>`。** 例如 `node = "20"` 时，activate 仍会将 `installs/node/20/bin` 加入 `PATH`。在需要使用安装目录本身的情况，请参阅[查找安装实例](#finding-an-installation-mise-where-and-mise-which)。
- **工具选项、后端和 registry 行为保持不变。** 变化只涉及文件落点和查找安装实例的方式。`mise backends switch` 会为每个切换的版本安装新后端的实例；它与旧后端的实例不同，旧实例会保留到被 prune，并将版本链接指向新实例。

## 如何决定身份

安装实例的身份是其响应请求的哈希，而不是磁盘中文件的哈希。已安装工具可以修改自身、添加包或生成文件，这些操作都不会重命名目录或使安装失效。身份包括：

- **规范化后的后端**，而不是简写。`age` 和 `aqua:FiloSottile/age` 会解析到同一后端，因此无论先使用哪种写法，它们都会共享一个安装实例。
- **具体版本**，按不透明字符串处理。
- **平台**，例如 `linux-x64` 或 `linux-x64-musl`，使同一版本的 glibc 和 musl 构建可以共存。
- **会改变安装内容的选项。** 后端决定请求中的哪些选项属于这一类。例如 `github:` 工具的 `matching` 决定安装哪个发布构件，不同值会产生不同安装。只影响版本列出或验证方式，或只在安装期间使用的选项（`depends`、`install_before`、`minimum_release_age`、`version_order`）不会拆分安装。`install_env` 可能改变构建产物，因此 mise 会将其哈希进身份，但不会记录其值。`postinstall` 钩子在安装后运行，不会拆分安装，编辑它也不会重新安装工具。
- **锁定输入**：请求来自锁文件且该平台有构件校验和时，校验和属于身份；锁文件为 npm 和 pipx 安装记录的依赖图也属于身份。

由于选项属于身份，使用相同后端和版本但选择不同发布构件的工具会得到独立安装。registry 条目 `restate-server` 和 `restatectl` 都使用 `github:restatedev/restate`，区别仅在 `matching` 选项。使用以下配置：

```toml [mise.toml]
[tools]
restate-server = "1.4.0"
restatectl = "1.4.0"
```

mise 会创建两个共享标签的目录，每个工具目录链接到自己的实例：

```text
installs/
  restate-hof7qzg3/                    restatectl 1.4.0
  restate-kcyl6hcz/                    restate-server 1.4.0
  restatectl/1.4.0 -> ../restate-hof7qzg3
  restate-server/1.4.0 -> ../restate-kcyl6hcz
```

两者不能互相满足，安装其中一个也不会替换另一个。任何会改变安装内容的选项不同的请求都遵循相同规则。

## 查找安装实例：`mise where` 和 `mise which` {#finding-an-installation-mise-where-and-mise-which}

- `mise where age` 会输出请求选中的安装目录，例如 `~/.local/share/mise/installs/age-hlencrst`。它输出的是真实目录，而不是版本链接，因此即使链接指向另一个变体，结果仍然正确。
- `mise which age` 会输出可执行文件。对于无锁文件请求，如果版本链接（例如 `~/.local/share/mise/installs/age/1.2.1/age/age`）指向选中的实例，就通过该链接查找；否则直接通过安装目录查找。

`mise activate`、`mise env` 和 `mise exec` 对 `PATH` 使用相同规则。无锁文件请求会在版本链接（如 `installs/age/1.2.1`）或别名（如 `installs/node/20`）解析到选中实例时，将该链接加入 `PATH`。如果之后安装了另一个变体，链接已指向它，则这些命令会使用选中安装实例自己的目录。来自锁文件条目的请求始终使用安装目录。

请使用这些命令或 `mise exec`，不要手工拼接路径。带哈希的名称不包含版本，版本链接是只能指向一个变体的共享状态。

## 锁文件与选择 {#lockfiles-and-selections}

**无锁文件请求。** 没有锁文件条目时，`node = "20"` 或 `age = "latest"` 会先解析为具体版本。然后 mise 记住满足该具体请求的安装实例。该选择由本机上请求相同后端、版本、平台和选项的所有项目共享，不绑定项目目录或简写形式。

选择具有粘性。运行工具、activate 和再次安装都会复用已记住的安装，mise 不会向上游查询重新发布的构件。`mise install --force` 或更新 `nightly` 等滚动版本时，会在同一目录重新安装，因此发出相同请求的所有项目都会看到刷新后的文件。不同版本或不同选项属于不同请求：一个项目升级到新版本不会改变其他项目对旧版本的选择。

**锁文件请求。** 当[锁文件](/dev-tools/mise-lock.html)为当前平台固定构件校验和时，校验和会成为身份的一部分，mise 会查找具有该身份的安装实例。如果无锁文件安装同一版本时获取的构件校验和正好是锁定值，mise 会直接采用该安装，无需下载或重新安装。因此，在安装同一构件后运行 `mise install --locked` 会复用它；否则 mise 会创建独立安装，同一版本的不同锁定构件可以共存。

一个固定值采用了无锁文件安装后，会继续保留该安装。如果随后在锁文件项目之外强制刷新无锁文件请求（`mise install --force age@1.2.1`），mise 会安装到新目录并将共享选择移动到新目录，而不会替换锁文件已采用的文件。

锁文件条目没有当前平台的校验和时不会固定任何内容，其请求使用与无锁文件请求相同的安装实例。

锁定安装永远不会改变无锁文件选择，因此安装或更新一个项目不会重新指向另一个项目的无锁文件请求。

无锁文件选择只保存在本机。要将特定选择带到其他机器或共享给团队成员，请提交锁文件。

## 选择安装实例：`mise installs`

一个无锁文件请求可能对应多个安装实例：例如无法原地替换锁文件安装的强制刷新，或其他项目的锁文件创建的安装。`mise installs ls` 会列出所有安装，并说明每个请求使用哪个：

```sh
mise installs ls jq
# Installation  Tool  Version  Platform   Status
# jq-hm3qa4vb   jq    1.7.1    linux-x64  selected
# jq-ezjqmxa4   jq    1.7.1    linux-x64  pinned
```

`selected` 表示无锁文件请求使用的安装，`pinned` 表示该安装被锁文件采用，`shared` 表示安装位于只读共享 installs 目录中。添加 `--json` 可查看包括选项和构件校验和在内的完整身份。

`mise installs select` 会将另一个安装实例设为选中项，并将版本链接（`installs/jq/1.7.1`）指向它：

```sh
mise installs select jq-ezjqmxa4
```

该选择适用于本机上所有以相同工具、版本、平台和选项发出无锁文件请求的项目。锁文件固定了构件的项目会继续使用该构件的安装。要选择共享 installs 目录中的安装，请传入其路径；选择记录在自己的 installs 目录中，不会写入共享目录。

**没有选中项时。** 请求第一次无锁文件安装时会选中它创建的安装。如果选择丢失（例如从收据重建了目录），或该请求从未以无锁文件方式安装，mise 会查看能响应它的安装实例。只有一个时，mise 会使用并选中它；存在多个时，mise 会停止而不是猜测，并列出它们：

```text
mise ERROR jq@1.7.1 matches several installations and none is selected:
  jq-hm3qa4vb
  jq-ezjqmxa4 (a lockfile pins it)
Choose one with `mise installs select <dir>`, or install a fresh one with `mise install --force jq@1.7.1`
```

如果选中的安装后来被 prune，再次安装会在同一目录恢复它，而不是选择另一个实例。

## 移动旧布局安装 {#moving-legacy-installations}

`mise installs migrate` 会将启用布局前创建的安装迁移到新布局。它不会复制文件，而是从后端重新安装每个版本到独立的 `<label>-<hash>` 目录，使工具记录的路径指向新位置。随后删除旧的 `installs/<tool>/<version>` 目录并在原位置放置版本链接，因此原先指向旧目录的路径（如虚拟环境解释器）仍可解析。

```sh
mise installs migrate --dry-run   # list what would move
mise installs migrate             # move every legacy installation
mise installs migrate node python@3.12.1
```

安装替代实例期间旧目录会被移到一旁，安装失败时会恢复。

无法重新安装的版本不会报错。这可能是因为发布被撤回、签名身份变化、网络不可用或安装器失败。mise 会将现有目录原样移动到独立的 `<label>-<hash>` 目录，写入与正常安装相同的收据，并让版本链接继续指向旧路径。工具记录的路径（例如虚拟环境 shebang 和 `node_modules/.bin` 链接）仍通过该链接解析。目录内容不会被重写，身份只能记录旧目录能提供的后端、版本、平台和请求选项；锁文件提供的构件校验和或 `npm:`、`pipx:` 安装的依赖图不会被重建。

```text
relocated aube@2.2.4 to ~/.local/share/mise/installs/aube-4h2kfq7a
  aube@2.2.4 could not be reinstalled (github.com/aubepkg/aube has no release 2.2.4 ...); moved as it is
170 migrated, 12 relocated, 0 kept legacy, 0 failed
```

如果连移动也失败（例如目录位于不同文件系统），它会原样保留在旧布局中并继续工作：

```text
skipped aube@2.2.4 (kept legacy layout): <why it was not reinstalled>; not moved either: <why>
```

A 后续的 `mise installs migrate` 会再次尝试。只有迁移过程本身失败时命令才会返回非零，例如旧目录无法恢复。移动会像重新安装一样记录，因此中断的迁移会在下一次运行时恢复。

每次迁移都会在移动前记录到 `installs/.mise/migrations/`。如果运行中断，下一次 `mise installs migrate` 会根据记录删除旧目录（替代安装已完成）或恢复旧目录并撤回未完成的替代安装。请在没有进程使用待移动工具时运行。记录的后端与工具当前解析到的后端不一致的版本会保留不动（mise 不会使用它们；如果不再需要可执行 `mise uninstall`），仍使用旧布局的 `http:`、`rust` 和 `dotnet` 工具也一样。

## 清理与卸载

两者每次都针对一个安装目录工作。

- `mise uninstall age@1.2.1` 会删除安装目录，以及所有包含该版本链接的工具目录中的相应链接。它不会跟随链接决定删除内容；如果安装存储下的路径既没有收据也没有目录预留，则拒绝删除。删除一个变体不会影响其他变体。
- 删除安装会保留目录记录，因此再次安装同一身份时仍会落到同一目录。`mise uninstall` 还会忘记指向该实例的选择，让相关请求重新选择；被 prune 的安装会保留选择，并在原目录恢复。
- `mise prune` 会在跟踪配置仍需要安装时保留它。无锁文件请求需要其选中的安装；跟踪的锁文件条目需要对应后端和版本的安装，如果当前平台有校验和则进一步限定到锁定构件。旧布局安装的清理行为不变。
- 模板版本（例如 <span v-pre>`node = "{{ vars.node }}"`</span>）依赖项目使用位置生效的 vars、env、`MISE_ENV`、`--no-env`、设置和 dotenv 文件，`mise prune` 无法从其他目录重现这些上下文。因此目录会在 `installs/.mise/snapshots/` 下保存配置模板版本的快照，解析配置工具的命令负责生成快照，`mise prune` 读取快照而不是重新渲染。只解析部分工具的命令（`mise exec node@22`）不会记录快照；prune、`mise ls --prunable` 以及升级后的自动删除只读取快照。一个快照覆盖一个上下文（`MISE_ENV` 加载的配置文件集合）；同一上下文的新快照会替换旧快照，使项目不再使用的版本可以被清理。快照加载的配置文件发生变化，或配置没有快照时，`mise prune` 会保留该配置模板工具的所有安装，直到项目再次运行命令。配置文件已删除的快照会被忽略，`mise prune --configs` 会移除它。配置文件之外的变化（例如 shell 变量）会在下一次此类命令中发现。工具选项中包含模板时，工具也视为模板工具。快照保存请求版本和命令最终解析的版本，因此会跟随项目别名，并以仅所有者可读的权限写入。包含后端选项或 `install_env` 的工具可能在其中保存任意名称的凭据，不会写入快照，prune 会保留其所有安装。要保留快照不再列出的版本，请在跟踪配置或锁文件中引用它。未启用新布局时，`mise prune` 会从运行位置渲染这些版本，可能失败。
- `mise plugins uninstall --purge` 也会删除新布局中该插件的安装实例。
- `mise ls` 和 `mise prune` 会分别列出每个安装实例。同一版本有多个安装时，`mise ls` 会显示每个目录（`1.2.1 [age-hlencrst]`），`mise prune` 只删除不再需要的实例。若该版本存在多个安装，`mise uninstall age@1.2.1` 会停止并要求使用 `--all`。
- 带收据的目录以及 `.mise` 都不是工具；`mise ls` 和 `mise prune` 永远不会把它们视为已安装工具。

## Windows

Windows 上的布局行为相同，但有以下差异：

- **真实 junction。** 版本链接是指向绝对目标的目录 junction，IDE SDK 选择器和其他程序都可以跟随。mise 不会用文本文件替代链接。junction 不需要管理员权限；UNC 路径上的目录会使用符号链接，可能需要管理员权限或开发者模式。
- **无法创建链接时只警告。** 如果 mise 无法创建链接，安装仍会成功并可通过 mise 使用，mise 会警告链接不可用。运行 `mise where` 可获取真实目录。
- **junction 目标是绝对路径。** 将 installs 目录复制到其他位置后，链接仍指向旧位置。mise 会相对于当前使用的 installs 目录，通过目录查找安装实例，因此只影响跟随链接的程序，不影响 mise。
- **更短的真实路径。** 安装实例位于 `%LOCALAPPDATA%\mise\i\`，而不是 `installs\`，路径短七个字符，因为安装器解压文件时的真实路径会计入 260 字符限制。版本链接、运行时别名和目录仍位于 `installs\`，因此 IDE 中的 `installs\java\21` 仍然有效：

  ```text
  %LOCALAPPDATA%\mise\
    installs\
      jq\1.7.1 -> %LOCALAPPDATA%\mise\i\jq-ezjqmxa4   junction
      .mise\                                           catalog
    i\
      jq-ezjqmxa4\                                     the installation
  ```

  设置 `MISE_INSTALLS_DIR` 会像其他平台一样将安装保留在该目录中。`MISE_INSTALL_STORE_DIR` 可在任意平台选择安装实例的存放位置，而不会移动链接。

- **路径长度。** 安装目录名称长度有上限：最多 24 个字符的标签、一个连字符和八个哈希字符，只有发生冲突时才会继续增长。它直接位于安装存储下，与版本字符串无关。数据目录和工具内部路径仍会计入限制，因此缩短 `MISE_INSTALL_STORE_DIR`（例如 `C:\m`）是主要手段。

## 降级与兼容性 {#downgrading-and-compatibility}

要关闭布局，请移除 `install_layout = "identity"`。之后 mise 会再次将新版本安装到 `installs/<tool>/<version>`，并保留已有带哈希目录。关闭期间：

- `mise where` 和 `mise exec` 仍会通过版本链接访问带哈希安装，`mise ls` 会将其显示为链接版本。
- `mise uninstall` 只删除该链接，保留带哈希目录。
- 重新启用布局时，会通过目录再次找到该安装实例。

旧版 mise 不会读取收据或目录。与关闭布局的当前 mise 一样，它们只能通过版本链接和运行时别名看到安装。一个链接只能指向一个变体，因此同一版本有多个变体时，旧版 mise 无法保证选中配置所指的那个。如果需要回退到旧版 mise，应预期重新安装存在多个版本变体的工具。

## 已知限制

- **部分安装仍使用旧布局。** `http:` 安装（链接到共享解压缓存）、`rust` 和 `dotnet` 不会获得带哈希目录。`mise install --system`、`--shared`、`mise install-into`（目标明确），以及通过 `mise link` 或 `path:` 引用的版本也不会使用新布局。mise 仍能在系统和共享 installs 目录中找到旧布局安装，并且不会将它们写入此布局。
- **生成文件会出现带哈希路径。** 虚拟环境、shebang 和包管理器安装会记录包含哈希的真实安装路径。它们对该安装仍有效，但不能移植到另一个安装实例。再次安装同一身份会落到同一目录。
- **命令行指定的版本只携带配置提供的选项。** 在项目中，`mise where tool@1.0`、`mise x tool@1.0` 等命令会使用配置为该工具设置的安装选项（如 `symlink_bins`、`matching` 模式）。在项目外，不带选项指定版本时，如果该版本只有一个安装，会像布局启用前一样使用它，不论创建时使用了哪些选项。存在多个安装时，`mise where` 会列出它们，其他命令会将该版本视为未安装；可指定选项选择一个，例如 `mise where 'tool[matching=server]@1.0'`，或使用 `mise install --force tool@1.0` 安装普通版本。
- **版本链接不是权威来源。** 硬编码的 `installs/<tool>/<version>` 路径只能看到最近安装的变体。
- **目录名称的信息量较少。** yarn 的 `berry` 或 `cli-dist` 等标签不如 registry 简写直观；简写仍是承载版本链接的工具目录名称。
- **真实路径不包含版本。** 请从版本链接、收据或 `mise ls` 中读取版本。
- **变体会占用磁盘空间。** 旧布局安装、带哈希安装和同一版本的多个变体都会分别占用空间，直到卸载它们。
