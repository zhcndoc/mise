---
description: "发现版本、验证发布者并强制执行 Packslip 安装策略。"
socialDescription: "发现版本、验证发布者并强制执行 Packslip 安装策略。"
---

# Packslip 验证与策略

mise 使用 Packslip 的签名元数据来发现版本、验证发布者并选择兼容的构建版本。本指南介绍 [Packslip 后端](/dev-tools/backends/packslip.html) 背后的发现和策略规则。有关安装示例和工具选项，请从该页面开始。

**manifest** 描述一个版本，**bundle** 包含该 manifest 及其签名证据，**artifact** 是由 manifest 命名的可下载构建版本。**signed release list** 为版本建立索引，并可以推荐或撤回版本。

## 检查工具和已接受的签名者

在调查验证错误之前，先确认正在使用的后端和版本，然后在不更改状态的情况下检查签名者状态：

```sh
mise tool hk
mise ls --current
mise packslip pins
mise packslip pins --json
```

将 `hk` 替换为受影响的工具。pins 命令会列出以前接受的身份；它们不会重新验证已安装的可执行文件，也不会授予新签名者信任。在执行签名者轮换流程之前，请将相关项目与其锁定文件条目及错误信息进行比较。

## 项目发现

| 项目形式                           | mise 查找的位置                                                        |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `github.com/owner/repo`            | 携带 `packslip.sigstore.json` 的 GitHub releases。                      |
| `github.com/owner/repo/tools/mytool` | 该仓库的 releases，使用 `packslip.tools-mytool.sigstore.json`。 |
| `tool.example.com`                 | `https://tool.example.com/.well-known/packslip.json`。                 |
| `example.com/tools/mytool`         | `https://example.com/.well-known/packslip/tools/mytool.json`。         |

GitHub monorepo 子路径标识一个工具，但签名身份仍固定到该仓库。无论 bundle 的文件名是什么，签名项目和版本都必须与请求的工具和版本匹配。

对于域名项目，签名列表提供 bundle URL；artifact 可以位于其他下载主机上。没有签名列表的域名无法安装。识别某个 forge 的签名颁发者并不能提供版本发现功能：GitHub 集成了 release API；其他主机需要签名列表位置。

## 版本解析

Packslip 版本使用语义化版本，包括诸如 `2026.9.1` 的兼容日期版本。版本决定排序和预发布状态；GitHub 的 release 顺序和可编辑的预发布标记都不决定这两者。

对于 GitHub 发现，mise 从诸如 `v1.2.3`、`mytool-v1.2.3` 或 `v4.1`（规范化为 `4.1.0`）这样的标签中读取版本。无法映射到版本的标签需要在签名列表中进行显式映射。在安装时，manifest 的版本必须与标签或列表条目一致。

### 签名版本列表

GitHub 仓库可以在其默认分支的 `.well-known/packslip.json` 发布补充签名列表；对于 monorepo 工具，则发布在 `.well-known/packslip/<tool>.json`。该列表可以撤回某个版本、提供 bundle URL 和摘要，或添加 release API 未公开的版本。

省略的版本仍然可以来自 GitHub releases：省略并不会撤回这些版本。对于域名项目，签名列表提供完整的版本索引。即使受信任的 stamper 已批准某个版本，供应商撤回仍会排除该版本。

### 版本列表连续性和最短期限

mise 会拒绝已过期的签名列表，以及低于其已接受的该项目最高版本的列表序列。一旦它接受了补充 GitHub 列表，该列表消失就会被视为错误。这可以防止列表缺失悄悄撤销某次撤回。记住的列表状态与[签名者固定](#signer-continuity)状态存储在一起。

启用[最短版本期限](/configuration/settings.html#minimum_release_age)后，发现时间戳有助于筛选候选版本。在下载 artifact 之前，mise 会根据有效截止时间检查已验证的透明日志时间戳。只有明确允许的未记录 bundle 才会改用签名发布日期。

### 推荐和回退

对于不受约束的 `latest` 请求，mise 会先考虑供应商的签名推荐；如果没有签名指针，则考虑 GitHub 的最新 release。如果没有符合条件的推荐，mise 会选择最高的符合条件的语义化版本。前缀和 channel 请求继续使用其正常的匹配规则；推荐不会改变它们的排序。

推荐必须通过签名、身份、摘要、版本期限、stamp 和主机检查。策略排除会发出警告并尝试另一个候选版本。不符合条件的签名推荐会直接回退到语义化版本选择，而不会查询 GitHub 的指针。签名或摘要失败，以及无效、过期、回滚或意外缺失的列表，都会停止解析。

对于带 stamp 的版本，mise 会从 stamp 的 URL 获取 bundle，并检查供应商的列表以确认撤回状态和任何记录的摘要。解析和安装使用相同的来源与验证策略。

### 缓存和离线使用

在线版本列表和 `latest` 解析会重新读取策略，以便撤回和信任变更生效。它们会将结果写入 mise 的远程版本缓存。离线时，两者都会使用该缓存；如果缓存为空，则返回没有版本。安装仍会重新检查验证策略。仅有缓存的版本列表不足以进行离线安装：所需的 bundle、artifact 和信任证据也必须可用。

## 验证检查

在解压版本之前，mise 会检查：

1. 根据预期的仓库身份或配置的密钥，验证 bundle 的签名以及适用的证书和透明日志证据。
2. 验证 manifest 的结构、请求的项目和版本，以及供应商列表或受信任 stamper 记录的任何 bundle 摘要。
3. 验证签名者连续性、锁定文件承诺以及适用的版本期限策略。
4. 验证所选 artifact 的摘要和大小，以及任何现有的锁定文件校验和。

经过验证的 manifest 会作为 `.mise-packslip.json` 保留在安装目录中。它为资源提供可执行文件路径和元数据。

验证会对签名者和下载的字节进行认证。manifest 中的 provenance 链接是独立的证据：mise 会记录其存在以进行连续性检查，但不会获取和验证所链接的构建 provenance。

## 签名者连续性

mise 会在两个位置保留信任：

| 状态                                                                                  | 记录内容                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [状态目录](/directories.html#local-state-mise)下的 `packslip/pins.toml` | 以前接受的签名者、签名方案、供应商与重新打包者状态、provenance 链接是否存在，以及版本列表连续性。            |
| `mise.lock`                                                                           | 项目的签名者和证明者承诺，以及每个平台的 artifact URL 和校验和，包括在另一台机器上首次安装时的情况。 |

对于无密钥签名者，连续性比较不包含标签或分支引用的工作流路径。同一工作流的新版本标签仍属于同一签名者。新的工作流路径或密钥需要显式信任决策。签名方案变更、从供应商变为重新打包者，或 provenance 链接丢失，也可能被拒绝。

删除 `pins.toml` 会重置每个已记录项目的本地连续性。这不是安装失败时的常规补救措施，也不会从项目锁定文件中移除签名者承诺。

请参阅[签名者变更](/dev-tools/backends/packslip.html#pinned-signers)，了解检查和重置命令，包括显式选项和锁定文件承诺如何影响轮换。

## Stamps

stamper 是一种注册表、镜像或审核服务，用于发布其批准的版本签名列表。默认不要求 stamp。若要强制要求，请配置所信任的主机，以及允许为每个主机的列表签名的密钥或身份：

```toml
[settings.packslip]
stampers = [
  "stamps.example.com=/path/to/stamper.pub",
  "reviews.example.com=https://github.com/example/reviews/",
]
```

每个条目都是 `host=PIN`。pin 可以是 minisign 格式的公钥行、公钥文件路径或 GitHub 身份前缀。请将示例主机和密钥路径替换为你信任的服务和 pin。

主机会在
`https://<host>/.well-known/packslip/<project>.json` 发布每个项目的一个列表。配置 stamper 后：

- 一个版本需要至少获得一个受信任主机的非 yanked 批准，才能被列出或安装。一个主机的撤回不会否决另一个主机的批准。
- 供应商撤回仍会排除该版本，与 stamp 无关。
- mise 会检查带 stamp 的 bundle 摘要和供应商列表摘要（如果存在），然后验证供应商签名。stamp 永远不会取代该签名。
- 没有摘要的 stamp 会被拒绝：批准必须标识 bundle 的内容，而不仅仅是其 URL。
- 过期、回滚、无效，或以前接受但现在缺失的 stamper 列表会导致错误。

若要在保留供应商验证的同时豁免某个工具，请设置其
[`trust = "vendor"`](/dev-tools/backends/packslip.html#trust) 工具选项。

### 镜像

stamper 可以镜像完全相同的供应商签名 bundle。mise 会从 stamp 的 URL 获取它，并检查供应商的列表以确认撤回状态和任何记录的摘要。删除 GitHub release asset 不会阻止已批准的版本镜像，只要供应商没有撤回该版本。此处不支持需要单独身份策略的重新签名重新打包者 bundle。

## 解读策略失败

| 失败情况                                         | 下一步                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 签名者或签名方案发生变化                         | 将旧 pin 和锁定文件承诺与发布者公布的轮换信息进行比较                                      |
| 签名列表已过期、回滚或消失                       | 检查发布者或 stamper 的当前列表；移除本地状态会丢弃连续性检查 |
| 版本已撤回或缺少所需 stamp                       | 选择符合已配置策略的版本                                                                     |
| Bundle 或 artifact 摘要不匹配                    | 检查版本来源或镜像；不要仅仅为了清除错误而接受新的字节                  |
| 没有匹配的 artifact 或无法解决的平局             | 检查平台和变体，或要求发布者区分其构建版本                         |
| 主机要求失败                                     | 安装所需条件或使用受支持的主机；绕过检查并不能提供该条件                |

这些错误对应不同阶段。更改 artifact 选项无法修复无效签名，忘记签名者 pin 也无法修复摘要不匹配。

## Artifact 选择

mise 使用签名元数据选择一个 artifact：

1. 匹配操作系统、架构和 libc。缺失字段只会使相应维度不受限制：通用 macOS 构建版本仍然要求 macOS。
2. 存在 `variant` 时，只考虑该变体。没有 `variant` 时，只考虑没有变体的 artifact。
3. 保留 mise 可以安装的格式，优先选择最具体的平台匹配，然后按照其归档／压缩格式偏好选择，而不是选择裸可执行文件。
4. 拒绝无法解决的平局，而不是在构建版本之间猜测。

不会选择 `deb`、`dmg` 和 `msi` 等安装器格式。当没有 GNU artifact，或所选 GNU artifact 声明的 `glibc_min` 高于主机检测到的版本时，glibc 主机可以使用匹配的静态 musl artifact。mise 会在调试日志中报告该回退。发布者必须使用变体区分替代构建版本。客户端选项无法解决两个描述完全相同的 artifact。

## 主机要求

选择 artifact 后，mise 会在下载之前检查其声明的要求。要求不会打破选择平局。确认 `glibc_min` 不兼容时，可以按照上文所述选择匹配的静态 musl 构建版本；其他要求不会选择另一个构建版本。

| 要求结果                                                                                   | mise 行为                       |
| -------------------------------------------------------------------------------------------- | ------------------------------- |
| glibc 不足，但存在匹配的静态 musl artifact                                                  | 选择 musl artifact。             |
| 确认缺少库、glibc 不足且没有回退版本，或操作系统版本不足                                    | 拒绝安装。                       |
| 所需命令缺失或版本过旧                                                                      | 发出警告并继续。                 |
| 无法完成某项检查                                                                            | 发出警告，而不是假设主机不兼容。 |

命令检查优先使用活跃的 mise 工具，而不是环境中的 PATH。mise 会检查操作系统可以执行的路径：在 Windows 上，`git.exe` 或 `node.cmd` 计入，但只有 shebang 的脚本不计入。

库检测取决于平台。例如，macOS 缺失的库文件可能仍存在于 dyld 共享缓存中，因此 mise 会将该缺失报告为未知。在 Linux 上，操作系统版本是 `uname -r` 返回的内核版本，读取到发行版后缀之前：`6.8.0-31-generic` 会按 `6.8.0` 进行比较。

[`ignore_requirements`](/dev-tools/backends/packslip.html#ignore-requirements) 工具选项允许在确认失败的情况下继续安装。它还会绕过 glibc 到 musl 的回退，并保留所选的 GNU artifact。它不会提供缺失的库，也不会让不兼容的可执行文件运行。
