---
description: 了解 mise 如何查找 packslip 发行版、验证发布者、执行信任策略，并为你的平台选择构建版本。
socialDescription: 了解 mise 如何查找、验证和选择 packslip 发行版。
---

# 验证与策略

[`packslip 后端`](/dev-tools/backends/packslip.html) 使用签名元数据查找发行版、验证发布者，并为你的平台选择构建版本；[`mise self-update`](#self-update) 也会通过相同检查验证 mise 自身。工具选项和术语说明请参阅后端文档，具体错误的解决方法请参阅[故障排查](/dev-tools/backends/packslip.html#troubleshooting)。

**已签名发行列表**是由发布者签名的项目版本索引。它可以推荐或撤回版本，并指向相应的 bundle。

<a id="project-discovery"></a>

## 项目发现

| 项目形式                           | mise 查找的位置                                                        |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `github.com/owner/repo`            | 携带 `packslip.sigstore.json` 的 GitHub releases。                      |
| `github.com/owner/repo/tools/mytool` | 该仓库的 releases，使用 `packslip.tools-mytool.sigstore.json`。 |
| `tool.example.com`                 | `https://tool.example.com/.well-known/packslip.json`。                 |
| `example.com/tools/mytool`         | `https://example.com/.well-known/packslip/tools/mytool.json`。         |

GitHub monorepo 中的子路径用于标识某个工具，但签名身份仍固定到整个仓库。无论 bundle 文件名是什么，签名中的项目和版本都必须与请求的工具和发行版相符。

对于域名项目，签名列表提供 bundle URL，artifact 可以托管在其他下载站点上。没有签名列表的域名项目无法安装。识别代码托管平台的签名颁发者并不能发现发行版：GitHub 集成了 release API，其他站点则需要提供签名列表。

<a id="version-resolution"></a>

## 版本解析

packslip 格式要求使用语义化版本，其中也包括 `2026.9.1` 这样的日期版本。排序和预发行状态由版本号决定；GitHub 的 release 排序和可编辑的预发行标记都不参与判断。

在 GitHub 上发现发行版时，mise 会从 `v1.2.3`、`mytool-v1.2.3` 或 `v4.1`（按 `4.1.0` 处理）等 tag 中读取版本。不对应任何版本的 tag 必须在签名列表中显式映射。安装时，manifest 中的版本必须与 tag 或列表条目一致。

<a id="signed-release-lists"></a>

### 签名版本列表

GitHub 仓库可以在默认分支的 `.well-known/packslip.json` 发布补充签名列表；monorepo 中的工具则使用 `.well-known/packslip/<tool>.json`。列表可以撤回版本、提供 bundle URL 和摘要，或补充 release API 中未显示的版本。

列表中未提及的版本仍可能从 GitHub releases 获取；省略版本并不等于撤回。对于域名项目，签名列表就是完整的发行索引。供应商撤回的版本会被排除，即使受信任的 stamper 已批准它也一样。

对于不受约束的 `latest` 请求，mise 会先考虑供应商的签名推荐；如果没有签名指针，则考虑 GitHub 的最新 release。如果没有符合条件的推荐，mise 会选择最高的符合条件的语义化版本。前缀和 channel 请求继续使用其正常的匹配规则；推荐不会改变它们的排序。

发布者可以推荐较旧但仍受支持的版本，即使已有更新的主版本，因此 `latest` 不一定对应列表中的最高版本。

推荐版本必须通过签名、身份、摘要、发行时间、stamper 和主机检查。被策略排除时会发出警告并尝试下一个候选版本。不符合条件的签名推荐会直接回退到语义化版本选择，不再查询 GitHub 的指针。签名或摘要校验失败，以及列表无效、过期、回滚或意外缺失，都会中止解析。

在线版本列表和 `latest` 解析会重新读取策略，以便撤回和信任变更生效。它们会将结果写入 mise 的远程版本缓存。离线时，两者都会使用该缓存；如果缓存为空，则返回没有版本。安装仍会重新检查验证策略。仅有缓存的版本列表不足以进行离线安装：所需的 bundle、artifact 和信任证据也必须可用。

<a id="verification-checks"></a>

## 验证检查

在解压版本之前，mise 会检查：

1. 根据预期的仓库身份或配置的密钥，验证 bundle 的签名以及适用的证书和透明日志证据。
2. 验证 manifest 的结构、请求的项目和版本，以及供应商列表或受信任 stamper 记录的任何 bundle 摘要。
3. 验证签名者连续性、锁定文件承诺以及适用的版本期限策略。
4. 验证所选 artifact 的摘要和大小，以及任何现有的锁定文件校验和。

校验通过的 manifest 会保存在安装目录中的 `.mise-packslip.json`。它提供可执行文件路径，以及[手册页、补全脚本和技能](/dev-tools/packslip-resources.html)的元数据。

验证会确认签名者身份和下载文件内容。manifest 中的 provenance 链接属于独立证据：mise 会记录链接是否存在，以供连续性检查使用，但不会获取或验证链接指向的构建 provenance。

<a id="signer-continuity"></a>

## 签名者连续性

mise 会在两个位置保留信任决策：

| 位置                                                                              | 记录的内容                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [状态目录](/directories.html#local-state-mise)中的 `packslip/pins.toml`             | 先前接受的签名者、签名方案、供应商或重打包者状态、provenance 链接是否存在、代码托管平台仓库 ID，以及发行列表状态。                                                |
| `mise.lock`                                                                       | 项目对签名者、attestor 和代码托管平台 ID 的承诺，与各平台的 artifact URL 和校验和并列保存；在另一台机器上首次安装时也会生效。                                      |

对于无密钥签名者，连续性检查会比较工作流路径，但不比较其 tag 或分支引用，因此同一工作流的新发行版 tag 仍属于同一签名者。更换工作流路径或密钥则需要明确的信任决策。列出多个 [`workflow`](/dev-tools/backends/packslip.html#workflow) 即可表达一种授权：发行版可以在列表中的工作流之间切换。签名方案变更、签名者从供应商变为重打包者，或 provenance 链接消失，也可能被拒绝。

删除 `pins.toml` 会重置本机上所有已记录项目的连续性状态。这不是解决安装失败的常规方法，也不会移除项目锁定文件中的签名者承诺。如需接受某个项目的签名者轮换，请参阅[签名者变更](/dev-tools/backends/packslip.html#pinned-signers)。

<a id="renamed-transferred-and-re-created-repositories"></a>

### 重命名、转移和重新创建的仓库

GitHub 或 GitLab 项目的名称用于定位仓库，但代码托管平台的仓库 ID 才能标识它。GitHub Actions 和 GitLab CI 的签名证书会记录该 ID；仓库重命名或转移给其他所有者时，ID 不会改变。mise 会将 ID 与签名者一起固定，并将每个发行版的 ID 与固定值进行比较：

| 名称发生的变化                     | 结果                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| 重命名或转移给其他所有者           | 可以安装。mise 会针对项目改名发出一次警告，并将固定记录迁移到新名称。                         |
| 删除后由任何人使用相同名称重新创建 | 原仓库已被固定后会拒绝安装，即使名称和工作流路径相同也一样：新仓库的 ID 不同。                |

所有者不属于身份的一部分：只有仓库当前所有者可以转移仓库，而该所有者本来就可以为其发行版签名。

然后，签名者连续性会比较仓库内的工作流路径，因此 `github.com/old/tool/.github/workflows/release.yml` 改名后会对应 `github.com/new/tool/.github/workflows/release.yml`。重命名前发布的版本仍使用旧名称签名，但配置改用新名称后依然可以安装。

mise 会根据发行版证书中的仓库 ID 查找固定记录，而不是根据名称。因此，即使配置已使用新名称，或本机从未见过改名，旧名称对应的固定记录仍然适用：发行版必须匹配签名者、provenance 和 attestor。mise 接受发行版后，会将固定记录及其发行列表状态迁移到新名称，使每个仓库只保留一条固定记录。错误消息会使用记录中的名称；运行 `mise packslip forget` 时也请使用该名称。

尚无固定记录且发行版使用另一个名称签名时，mise 会向代码托管平台查询当前请求名称对应的仓库。如果无法查询（例如处于离线状态或触发速率限制），mise 只比较名称并拒绝该发行版。

这仍然属于“首次使用时信任”。在既没有固定记录、也没有锁定文件条目的机器上首次安装时，mise 会接受当时拥有该名称的仓库，因此无法发现安装前发生的名称接管。请提交 `mise.lock`，让每台机器都从项目已接受的 ID 开始。

## 发行列表连续性 {#release-list-continuity-and-minimum-age}

mise 会拒绝过期的签名列表，也会拒绝序号低于该项目已接受最高序号的列表。接受 GitHub 补充列表后，如果列表消失就会报错，避免缺失列表悄悄撤销已记录的版本撤回。列表状态与[签名者固定记录](#signer-continuity)一同保存；对于 GitHub 或 GitLab 项目，它也会像固定记录一样随仓库 ID 经[重命名](#renamed-transferred-and-re-created-repositories)迁移：旧名称下接受的列表仍会在新名称下决定最低序号，且不能消失。

## 最短发行等待时间 {#minimum-release-age}

[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 对 packslip 工具的作用与其他后端相同；该设置详见[最短发行等待时间](/security.html#minimum-release-age)。mise 会先依据发现时间戳筛选候选版本。下载 artifact 前，mise 会将已验证的透明日志时间戳与截止时间比较；只有明确允许不记录日志的 bundle 才会改用已签名的发布时间戳。

截止时间决定版本请求可以选择哪些发行版，因此不会应用于已经选定的发行版。只要发行版仍在等待期内，精确固定版本（例如 `"packslip:github.com/jdx/hk" = "2.0.1"`）和记录在 `mise.lock` 中的版本都可以安装并写入锁定文件。`latest` 或 `2` 等请求则会等待发行版达到规定时间。

## 发行签章 {#stamps}

签章服务（stamper）可以是注册表、镜像或审核服务，负责发布其批准发行版的签名列表。默认不要求签章。如需强制要求，请将 [`packslip.stampers`](/configuration/settings.html#packslip.stampers) 设置为你信任的主机，以及各主机列表允许使用的签名密钥或身份：

```toml
[settings.packslip]
stampers = [
  "stamps.example.com=/path/to/stamper.pub",
  "reviews.example.com=https://github.com/example/reviews/",
]
```

每个条目的格式为 `host=PIN`。PIN 可以是 minisign 格式的公钥行、公钥文件路径，或 GitHub 身份前缀。请将示例主机和密钥路径替换为你信任的服务和 PIN。

每个项目会在 `https://<host>/.well-known/packslip/<project>.json` 发布一份列表。配置签章服务后：

- 版本必须至少获得一个受信任主机的有效批准，才能列出或安装。一个主机撤回批准不会否决其他主机的批准。
- 无论是否存在签章，供应商撤回的发行版仍会被排除。
- mise 会检查签章中的 bundle 摘要以及（如有）供应商列表中的摘要，然后验证供应商签名。签章不能取代该签名。
- 没有摘要的签章会被拒绝：批准信息必须标识 bundle 内容，而不能只标识 URL。
- 签章服务列表过期、回滚或无效，以及先前接受的列表如今缺失，都会导致错误。

如需对某个工具豁免签章要求但继续验证供应商，请设置该工具的 [`trust = "vendor"`](/dev-tools/backends/packslip.html#trust) 选项。

### 镜像

签章服务可以镜像未经改动、由供应商签名的 bundle。mise 会从签章 URL 获取已签章发行版，并根据供应商列表检查撤回记录和已有摘要；解析与安装使用相同来源和策略。删除 GitHub release asset 不会阻止使用已批准的镜像，只要供应商尚未撤回该发行版。重新签名的重打包 bundle 需要单独的身份策略，目前不受支持。

<a id="artifact-selection"></a>

## 制品选择

mise 会根据签名元数据选择一个 artifact：

1. 匹配操作系统、架构和 libc。缺失字段只会使对应维度不受限制：通用 macOS 构建仍然要求 macOS。
2. 指定 `variant` 时，只考虑该变体；未指定时，只考虑没有变体的 artifact。
3. 排除 mise 无法安装的格式。优先选择平台匹配最具体的构建；匹配程度相同时，优先选择归档文件而非裸可执行文件。
4. 如果仍无法区分，则拒绝安装，不会猜测应选择哪个构建。

mise 从不选择 `deb`、`dmg` 和 `msi` 等安装程序格式。如果没有 GNU artifact，或所选 GNU artifact 声明的 `glibc_min` 高于主机检测到的版本，glibc 主机可以改用匹配的静态 musl artifact；mise 会在调试日志中报告此次回退。发布者应通过 variant 区分不同构建，客户端没有选项可以在描述完全相同的两个 artifact 之间做出选择。

<a id="host-requirements"></a>

## 主机要求

选定 artifact 后，mise 会在下载前检查其声明的运行要求。运行要求不会用于解决构建之间的平局；除上述 musl 回退外，也不会因此改选其他构建。

| 要求结果                                                                                   | mise 行为                       |
| -------------------------------------------------------------------------------------------- | ------------------------------- |
| glibc 不足，但存在匹配的静态 musl artifact                                                  | 选择 musl artifact。             |
| 确认缺少库、glibc 不足且没有回退版本，或操作系统版本不足                                    | 拒绝安装。                       |
| 所需命令缺失或版本过旧                                                                      | 发出警告并继续。                 |
| 无法完成某项检查                                                                            | 发出警告，而不是假设主机不兼容。 |

检查命令时，mise 优先使用当前激活的工具，而非环境中的 `PATH`。mise 会查找操作系统可以执行的路径：在 Windows 上，`git.exe` 或 `node.cmd` 都符合要求，但只有 shebang 的脚本不符合。

库检测方式取决于平台。例如，macOS 上某个库虽然不存在于磁盘中，但仍可能位于 dyld 共享缓存中，因此 mise 会将其是否存在报告为未知。在 Linux 上，操作系统版本取自 `uname -r` 返回的内核版本，并截取发行版后缀之前的部分进行比较：`6.8.0-31-generic` 会按 `6.8.0` 比较。

[`ignore_requirements`](/dev-tools/backends/packslip.html#ignore-requirements) 工具选项会在确认运行要求不满足时仍继续安装，并保留 GNU 构建而不回退到 musl。

## mise 如何验证自身更新 {#self-update}

[`mise self-update`](/cli/self-update.html) 和自动更新会在替换正在运行的二进制文件前，通过 packslip 检查 mise 自身的发行版。从 2026.9.3 开始，每个发行版都必须包含 `packslip.sigstore.json` bundle。如果缺少该文件或未通过以下任一检查，更新就会停止，已安装的 mise 保持不变。mise 会检查：

- bundle 的 Sigstore 签名和透明日志记录有效。
- 证书通过内置的仓库 ID 标识 mise 的 GitHub 仓库，因此仓库重命名或转移到其他组织不会改变受信任的对象。
- bundle 由仓库的 `.github/workflows/release.yml` 工作流签名，属于供应商发布内容，且对应正在安装的版本。
- 下载的归档文件与签名摘要一致。
- 透明日志时间戳早于
  [`self_update.minimum_release_age`](/configuration/settings.html#self_update.minimum_release_age).
  通过 `mise self-update 2026.10.4` 这样的命令指定版本时，会跳过此项检查。

每个发行版也都会检查归档中嵌入的签名；对于 2026.9.3 之前的发行版，这是唯一的检查。通过 [`self_update.repository`](/configuration/settings.html#self_update.repository) 配置的镜像必须提供原始 manifest 和归档字节，因此镜像只能提供文件，不能改变信任判断。如需使用 `packslip` CLI 安装 mise 本身，请参阅[安装 mise](/installing-mise.html#packslip)。
