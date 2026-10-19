---
description: 按用途为每次工具安装命名，让简写名称共享安装，同时支持同一版本的多个变体共存。
socialDescription: 按用途为每次安装命名，让同一版本的多个变体共存。
---

# 标识式安装布局 <Badge type="warning" text="experimental" />

默认情况下，mise 会按旧布局将工具安装到 `installs/<tool>/<version>`。该路径无法说明文件由哪个后端生成、适用于哪个平台，也无法记录安装时使用的选项。因此，`age` 和 `aqua:FiloSottile/age` 会分别下载；同一版本的两个变体则会互相覆盖。

身份式布局会为每次安装创建独立目录 `installs/<label>-<hash>/`，目录名反映安装内容。常见的 `installs/<tool>/<version>` 路径仍然保留，但会成为指向该目录的链接。

::: warning Experimental
身份式布局需要设置 `experimental = true`。在 Windows 上，仅此设置即可启用；其他平台还需要 `install_layout = "identity"`。
该布局仍处于实验阶段，不同版本之间可能更改目录名、收据和目录清单格式。请在重新安装工具成本较低的环境中试用，并先阅读[关闭布局或降级](#downgrading-and-compatibility)。
:::

## 快速开始

在项目的 `mise.toml` 中启用该布局：

```toml [mise.toml]
[settings]
experimental = true
install_layout = "identity"

[tools]
age = "1.2.1"
```

若要全局启用，可运行 `mise settings experimental=true` 和 `mise settings install_layout=identity`，或导出 `MISE_EXPERIMENTAL=1` 与 `MISE_INSTALL_LAYOUT=identity`。在 Windows 上只需设置 `experimental = true`。详见 [`install_layout`](/configuration/settings.html#install_layout)。

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

启用身份式布局后，新安装的目录结构如下：

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

### 安装目录

每次安装都位于 `installs/<label>-<hash>/`。容纳这些目录的位置称为安装存储区：除 Windows 外，它就是 installs 目录本身；Windows 使用旁边一个路径更短的目录（详见 [Windows](#windows)）。

标签取自后端项目名的最后一部分，转换为小写并截取至多 24 个字符：`aqua:FiloSottile/age` 得到 `age`，`aqua:yarnpkg/berry` 得到 `berry`，`go:github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen` 得到 `oapi-codegen`。标签由后端决定，而不是由注册表简称决定，因此注册表发生更改时不会移动已有安装。

哈希是安装身份的 base32 摘要的前八个字符。如果该名称已被其他身份占用，或被 mise 未创建的目录占用，新安装会每次增加两个哈希字符（十个、十二个，依此类推）。mise 永远不会为了腾出名称而重命名已有安装。

### 安装收据

每个安装目录都包含 `.mise-install.toml` 收据，记录该安装对应的请求。以下内容已删节：

<!-- schema: skip -->

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

除身份信息外，收据还会记录后端提供的制品摘要、请求工具时使用的名称，以及写入收据的 mise 版本。mise 最后才写入收据，因此没有收据的目录代表安装尚未完成。收据只描述安装请求，不能证明文件仍是最初下载的内容；将收据复制到缓存工具旁边也不能使该工具变得可信。

`mode` 表示身份约束的程度。`fallback` 由后端、版本、平台和选项标识请求；`resolved` 还会记录锁文件中的固定构件校验和（见[锁文件与选择](#lockfiles-and-selections)）。`fallback` 安装无法保证再次安装同一请求时得到相同字节。

### 目录清单

`installs/.mise/` 会记录每种身份对应的目录，以及每个未锁定请求选用了哪个安装实例。这是持久元数据，不是缓存。复制或缓存 installs 目录时，请同时保留目录清单；如果安装存储区是单独的目录（Windows 上为 `installs` 旁边的 `i`），也要一并保留。

### 版本链接和别名

`installs/<tool>/<version>` 会链接到安装目录，因此 IDE SDK 配置等已有路径仍可使用。但一个链接只能指向一个变体：同一版本存在两个变体时，链接指向最近安装的那个。mise 不会根据链接决定请求对应哪个变体，因此硬编码的 `installs/<tool>/<version>` 路径只能访问最近安装的变体。在 Linux 和 macOS 上，此链接为相对链接（例如 `../age-hlencrst`）。

`latest`、`1` 或 `1.2` 这类运行时别名仍按现有格式保留在工具目录中（例如 `1 -> ./1.2.1`）。别名先指向版本链接，再由版本链接指向安装目录。

## 保持不变的行为 {#what-does-not-change}

- mise 不会移动或迁移启用布局前已存在的 `installs/<tool>/<version>` 目录。移动目录会破坏写入 shebang、虚拟环境和包管理器安装中的路径。若为该请求记录的后端相符，mise 会继续原地使用旧布局安装；否则会以身份式布局重新安装该版本，而不会将其他后端的文件重新解释为当前后端的安装。若要自行迁移，请参阅[迁移旧布局安装](#moving-legacy-installations)。
- 两种布局可以共用一个 installs 目录。mise 根据收据和目录清单中的保留记录识别带哈希的目录，而不是依据名称。
- mise 不会自行回收旧布局安装。即使存在带哈希的对应目录，也不会因此删除或移动旧目录；`prune` 对旧布局安装的处理保持不变。只有 `mise installs migrate` 会迁移它们。
- 工具选项、后端和注册表的行为保持不变；变化的只有文件存放位置和安装查找方式。`mise backends switch` 会安装每个已切换版本的新后端版本，并将版本链接指向新安装；该安装与旧后端的安装不同。旧安装会一直保留，直到被 prune。

## 如何决定身份

安装实例的身份由其满足的请求决定，而不是由磁盘中文件的哈希决定。已安装工具可以修改自身、添加包或生成文件，这些操作都不会重命名目录或使安装失效。身份包括：

- 规范化后的后端，而不是简称。`age` 和 `aqua:FiloSottile/age` 会解析到同一后端，因此无论先请求哪一种写法，它们都会共用一个安装实例。
- 具体版本，并将其视为不透明字符串。
- 平台，例如 `linux-x64` 或 `linux-x64-musl`，以便同一版本的 glibc 和 musl 构建可以共存。
- 会改变安装内容的选项；由后端决定哪些请求选项属于此类。例如，`github:` 工具的 `matching` 会选择要安装的发布制品，因此不同值会产生不同安装实例。只影响版本列出或验证方式，或只在安装期间生效的选项（例如 `prerelease`、`depends`、`minimum_release_age`、`version_order` 和 `auto_update`）不会拆分安装。`install_env` 可能改变构建产物，因此 mise 会将其纳入身份哈希，但绝不记录其值。`postinstall` hook 在安装完成后运行，不会拆分安装；编辑它也不会触发重新安装。
- 固定输入：请求来自锁文件且锁文件为当前平台固定了制品校验和时，会将该校验和纳入身份；对于支持依赖图的 `npm:` 和 `pypi:` 安装，也会纳入锁文件记录的依赖图。

由于选项属于身份的一部分，使用相同后端和版本、但选择不同发布制品的工具会分别安装。注册表条目 `restate-server` 和 `restatectl` 都使用 `github:restatedev/restate`，区别仅在于 `matching` 选项。使用以下配置时，mise 会创建两个共用标签的目录，每个工具目录分别链接到自己的安装实例：

```toml [mise.toml]
[tools]
restate-server = "1.4.0"
restatectl = "1.4.0"
```

```text
installs/
  restate-hof7qzg3/                    restatectl 1.4.0
  restate-kcyl6hcz/                    restate-server 1.4.0
  restatectl/1.4.0 -> ../restate-hof7qzg3
  restate-server/1.4.0 -> ../restate-kcyl6hcz
```

两者不能互相满足，安装其中一个也不会替换另一个。任何会改变安装内容的选项不同的请求都遵循相同规则。

## 查找安装实例：`mise where` 和 `mise which` {#finding-an-installation-mise-where-and-mise-which}

- `mise where age` 会输出请求所选安装实例的目录，例如 `~/.local/share/mise/installs/age-hlencrst`。它始终是实际目录，而不是版本链接，因此即使链接指向另一个变体，输出仍然正确。
- `mise which age` 会输出可执行文件路径。对于未锁定请求，如果版本链接指向所选安装实例，则通过该链接输出路径，例如 `~/.local/share/mise/installs/age/1.2.1/age/age`；否则会使用安装目录。

`mise activate`、`mise env` 和 `mise exec` 对 `PATH` 也遵循相同规则。若版本链接（例如 `installs/age/1.2.1`）或别名（例如 `installs/node/20`）解析到请求所选安装实例，未锁定请求会将该链接加入 `PATH`；因此 `node = "20"` 激活后仍会将 `installs/node/20/bin` 加入 `PATH`。若之后安装了该版本的另一变体，导致链接现在指向另一实例，则这些命令会改用所选实例自己的目录。来自锁文件条目的请求始终使用安装目录。

请使用这些命令或 `mise exec`，不要手动拼接路径。带哈希的目录名不包含版本号；请从版本链接、安装收据或 `mise ls` 中查看版本。

## 锁文件与选择 {#lockfiles-and-selections}

没有锁文件条目时，`node = "20"` 或 `age = "latest"` 会先解析为具体版本。随后 mise 会记住哪个安装实例满足了该具体请求。机器上所有使用相同后端、版本、平台和选项的项目都会共用此选择；它既不绑定到项目目录，也不受简称写法影响。

选择会持续保留。运行工具、激活环境或再次安装时，都会复用已记录的安装实例；mise 不会向上游查询是否重新发布了制品。`mise install --force` 或更新 `nightly` 这类滚动版本时，会在同一目录中重新安装，因此所有提出相同请求的项目都会使用更新后的文件。不同版本或不同选项属于不同请求：升级一个项目不会改变其他仍固定到旧版本的项目所选实例。

当[锁文件](/dev-tools/mise-lock.html)为当前平台固定了制品校验和时，该校验和会成为身份的一部分。mise 会查找身份匹配的安装实例。如果同版本的未锁定安装记录的制品校验和与锁文件固定值一致，mise 也会直接接管该实例，无需下载或重新安装。因此，在未锁定安装了同一制品后运行 `mise install --locked` 会复用它。否则 mise 会创建单独的安装实例，同一版本的不同固定制品可以并存。

锁文件接管未锁定安装后，会继续使用该实例。之后若强制刷新未锁定请求（例如在该锁文件所属项目之外运行 `mise install --force age@1.2.1`），mise 会安装到新目录并将共用选择切换到该目录，而不会替换锁文件已接管的文件。

锁文件条目未为当前平台指定校验和时，不会固定具体制品；它使用的安装实例与未锁定请求相同。锁定安装绝不会更改未锁定选择，因此在一个项目中安装或更新工具，不会重定向其他项目的未锁定请求。

无锁文件选择只保存在本机。要将特定选择带到其他机器或共享给团队成员，请提交锁文件。

## 选择安装实例：`mise installs`

一个未锁定请求可能对应多个安装实例，例如强制刷新时无法原地替换锁文件使用的安装，或其他项目的锁文件创建的安装。 [`mise installs ls`](/cli/installs/ls.html) 会列出所有安装实例，并说明每个请求使用了哪一个：

```sh
mise installs ls jq
# Installation  Tool  Version  Platform   Status
# jq-hm3qa4vb   jq    1.7.1    linux-x64  selected
# jq-ezjqmxa4   jq    1.7.1    linux-x64  pinned
```

`selected` 表示未锁定请求所使用的安装实例，`pinned` 表示有锁文件接管了该实例，`shared` 表示它位于只读共享安装目录中。添加 `--json` 可查看完整身份信息，包括选项和制品校验和。

[`mise installs select`](/cli/installs/select.html) 可将另一个安装实例设为选中项，并让版本链接（`installs/jq/1.7.1`）指向它：

```sh
mise installs select jq-ezjqmxa4
```

此选择会应用于本机所有未通过锁文件固定、且请求相同工具、版本、平台和选项的项目。锁文件固定了制品的项目会继续使用该制品对应的安装实例。若要选择共享安装目录中的实例，请传入其路径；选择记录会保存在你自己的 installs 目录中，不会写入共享目录。

某个请求首次以未锁定方式安装时，会选中该次创建的安装实例。如果选择记录丢失（例如目录清单根据收据重建），或者该请求过去只通过锁文件安装，mise 会查找所有能满足请求的安装实例。若恰好只有一个，mise 就使用并选中它；若有多个，则会停止而不猜测，并列出候选项：

```text
mise ERROR jq@1.7.1 matches several installations and none is selected:
  jq-hm3qa4vb
  jq-ezjqmxa4 (a lockfile pins it)
Choose one with `mise installs select <dir>`, or install a fresh one with `mise install --force jq@1.7.1`
```

如果选中的安装实例后来被 prune，再次安装时会在原目录中恢复它，而不是改选其他实例。

## 移动旧布局安装 {#moving-legacy-installations}

[`mise installs migrate`](/cli/installs/migrate.html) 会将启用布局前创建的安装迁移到新布局中。它不会复制文件，而是从对应后端重新安装每个版本到各自的 `<label>-<hash>` 目录，使工具记录的路径指向新位置。随后它会删除旧的 `installs/<tool>/<version>` 目录并在原处创建版本链接，因此虚拟环境解释器等指向旧目录的路径仍可解析。

```sh
mise installs migrate --dry-run   # list what would move
mise installs migrate             # move every legacy installation
mise installs migrate node python@3.12.1
```

安装替代实例期间旧目录会被移到一旁，安装失败时会恢复。

无法重新安装某个版本并不算错误。原因可能是其发布已撤回、签名身份与 mise 之前接受的身份不同、网络不可用，或安装器执行失败。此时 mise 会将现有目录原样移到独立的 `<label>-<hash>` 目录，写入与正常安装相同的收据，并在旧路径保留版本链接。工具记录的路径（例如虚拟环境 shebang 和 `node_modules/.bin` 链接）仍可通过该链接解析。目录中的内容不会被改写；身份只能根据旧目录能够提供的信息确定，包括后端、版本、平台和请求选项。锁文件中的摘要（例如制品校验和，或 `npm:`、`pipx:` 安装的依赖图）无法重建。

```text
relocated aube@2.2.4 to ~/.local/share/mise/installs/aube-4h2kfq7a
  aube@2.2.4 could not be reinstalled (github.com/aubepkg/aube has no release 2.2.4 ...); moved as it is
170 migrated, 12 relocated, 0 kept legacy, 0 failed
```

如果目录也无法移动（例如它与安装存储区位于不同文件系统），它会原样留在旧布局中，并继续正常工作：

```text
skipped aube@2.2.4 (kept legacy layout): <why it was not reinstalled>; not moved either: <why>
```

之后再次运行 `mise installs migrate` 时会重试。只有迁移过程本身出错时，命令才会以非零状态退出，例如旧目录无法恢复。移动过程会像重新安装一样记录下来，因此下次运行时会恢复中断的迁移。

每次迁移都会先记录到 `installs/.mise/migrations/`，再移动任何内容。因此如果运行中断，下次运行 `mise installs migrate` 时会根据情况删除旧目录（替代安装已完成）或将其恢复并撤销未完成的替代安装。请在没有程序使用待迁移工具时运行该命令。

如果某版本记录的后端与该工具当前解析出的后端不同，迁移会跳过它；mise 不会使用这类安装，若没有其他内容需要它们，可运行 `mise uninstall` 将其卸载。继续使用旧布局的工具也不会被迁移（详见[已知限制](#known-limits)）。

## 清理与卸载

两者每次都针对一个安装目录工作。

- `mise uninstall age@1.2.1` 会删除安装目录，以及各工具目录中指向该目录的版本链接。它不会跟随链接来决定删除对象；若安装存储区下的路径既没有收据，也未在目录清单中保留，则拒绝删除。删除一个变体不会影响其他变体。同一版本存在多个安装实例时，命令会停止并要求指定 `--all`。
- 删除安装实例时会保留其目录清单记录，因此再次安装相同身份时会使用同一目录。`mise uninstall` 也会忘记指向该实例的选择，因此相关请求会重新选择；`mise prune` 删除的实例仍保留选择记录，并会在原处恢复。
- 只要受跟踪的配置仍需要某个安装，`mise prune` 就会保留它。未锁定请求需要其当前选中的安装实例；受跟踪的锁文件条目需要相应后端和版本的安装实例，如果条目为当前平台指定了校验和，范围还会缩小到该固定制品。旧布局安装仍按原有方式清理。
- `mise plugins uninstall --purge` 也会删除该插件在身份式布局中的安装实例。
- `mise ls` 和 `mise prune` 会分别列出每个安装实例。同一版本有多个实例时，`mise ls` 会显示各自的目录（例如 `1.2.1 [age-hlencrst]`），`mise prune` 只会移除不再需要的实例。包含收据的目录和 `.mise` 永远不会被视为已安装工具。

### 模板版本与 `mise prune`

模板形式的工具版本（例如 <span v-pre>`node = "{{ vars.node }}"`</span>）取决于项目运行时所在目录中的 vars、env、`MISE_ENV`、`--no-env`、设置和 dotenv 文件。`mise prune` 无法从其他目录重现这些值，因此每当某条命令解析配置中的全部工具时，mise 都会将模板版本的渲染结果保存到 `installs/.mise/snapshots/`。工具选项中包含模板，也会使该工具被视为模板工具。

- `mise prune`、`mise ls --prunable` 和 `mise upgrade` 后的清理会读取快照，而不会重新渲染模板。如果命令解析的工具少于配置定义的数量（例如 `mise exec node@22`），就不会记录快照。
- 配置没有快照，或快照生成后配置文件发生了变化时，mise 会保留其模板工具的所有安装实例，直到你再次在该项目中运行 mise 命令。配置文件之外的变化（例如 Shell 变量）要到下次运行此类命令时才会被发现。
- 每个快照对应一个上下文：`MISE_ENV` 值和已加载配置文件集合。同一上下文的新快照会替换旧快照，因此项目不再使用的版本就可以被清理。快照会保存请求版本和命令最终选定的版本，所以项目别名会被解析。
- 快照仅所有者可读写。带有后端选项或 `install_env` 的工具不会生成快照，因为这些字段可能以任意名称保存凭据；prune 会保留它们的所有安装实例。
- 如果快照对应的配置文件已不存在，就会忽略该快照；运行 `mise prune --configs` 可将其删除。

若要保留快照中已不再列出的版本，请在受跟踪的配置或锁文件中引用它。在旧布局下，`mise prune` 会根据运行目录重新渲染这些版本，因此可能失败。

## Windows

身份式布局在 Windows 上的行为也相同，但有以下区别：

- Windows 上只需设置 `experimental = true` 即可启用，不需要设置 `install_layout = "identity"`，因为 Windows 最能受益于下文介绍的较短安装存储区。已有安装会留在原处。若要继续使用旧布局安装，请设置 `install_layout = "legacy"` 或 `MISE_INSTALL_LAYOUT=legacy`。

- 版本链接是指向绝对路径的目录 junction，因此 IDE SDK 选择器和其他程序都可以跟随它。mise 不会用文本文件代替链接。junction 无需管理员权限。UNC 路径下的目录会使用符号链接，这可能需要管理员权限或开发者模式。
- 如果 mise 无法创建链接，安装仍会成功，且可通过 mise 使用；mise 会警告链接不可用。运行 `mise where` 可获取实际目录。
- junction 的目标是绝对路径，因此将 installs 目录复制到其他位置后，链接仍会指向旧位置。mise 会根据当前使用的 installs 目录，通过目录清单查找安装实例，所以受影响的是跟随链接的其他程序，而不是 mise。
- 安装实例会放入 `%LOCALAPPDATA%\mise\i\`，而不是 `installs\`，路径缩短了 7 个字符。安装器会在实际路径中解压文件，路径长度也计入 260 字符限制。版本链接、运行时别名和目录清单仍位于 `installs\`，因此 IDE 中的 `installs\java\21` 仍可正常使用：

  ```text
  %LOCALAPPDATA%\mise\
    installs\
      jq\1.7.1 -> %LOCALAPPDATA%\mise\i\jq-ezjqmxa4   junction
      .mise\                                           catalog
    i\
      jq-ezjqmxa4\                                     the installation
  ```

  设置 `MISE_INSTALLS_DIR` 会像其他平台一样将安装保留在该目录中。`MISE_INSTALL_STORE_DIR` 可在任意平台选择安装实例的存放位置，而不会移动链接。

- 安装目录名长度有上限：标签最多 24 个字符，后接连字符和 8 个哈希字符；发生冲突时哈希才会更长。目录直接位于安装存储区下，与版本字符串长度无关。数据目录和工具内部路径仍计入长度限制，因此主要的剩余手段是使用较短的 `MISE_INSTALL_STORE_DIR`（例如 `C:\m`）。

## 关闭布局或降级 {#downgrading-and-compatibility}

若要关闭身份式布局，请移除 `install_layout = "identity"`（Windows 上若启用了 `experimental = true`，请改设 `install_layout = "legacy"`）。随后 mise 会将新版本重新安装到 `installs/<tool>/<version>`，并保留现有带哈希目录。关闭期间：

- `mise where` 和 `mise exec` 仍会通过版本链接访问带哈希安装，`mise ls` 会将其显示为链接版本。
- `mise uninstall` 只删除该链接，保留带哈希目录。
- 重新启用布局时，会通过目录再次找到该安装实例。

旧版 mise 不会读取收据或目录清单。和关闭该布局的当前版本一样，它们只能通过版本链接和运行时别名访问安装。一个链接只能指向一个变体，因此同一版本存在多个变体时，旧版 mise 不一定会使用配置指定的变体。若要回退到旧版 mise，请预期需要重新安装存在多个变体的工具。

<a id="known-limits"></a>

## 已知限制

- 部分安装仍使用旧布局。`http:` 安装（会链接到共用解压缓存）、`rust` 和 `dotnet` 不会放入带哈希目录。目标路径明确的 `mise install --system`、`--shared` 和 `mise install-into` 也不会使用带哈希目录；通过 `mise link` 或 `path:` 引用的版本同样如此。mise 仍会查找系统及共享安装目录中的旧布局安装，但不会因该布局而向其中写入。
- 工具在安装过程中生成的文件（例如虚拟环境、shebang 和包管理器安装）会记录实际安装路径，其中包含哈希。它们在对应安装实例中仍然有效，但不能沿用到其他实例。再次安装相同身份时会使用同一目录。
- 命令行指定的版本只携带配置为该工具设置的选项。在项目中，`mise where tool@1.0`、`mise exec tool@1.0` 等命令会使用项目配置设定的安装选项，例如 `matching`。在项目之外，裸版本会使用其唯一安装实例，不考虑选项；如果存在多个实例，`mise where` 会列出它们，其他命令则会将此版本视为未安装。请像 `mise where 'tool[matching=server]@1.0'` 一样明确指定选项，或运行 `mise install --force tool@1.0`。
- 旧布局安装、带哈希的安装以及同一版本的多个变体都会分别占用磁盘空间，直到你卸载它们。
