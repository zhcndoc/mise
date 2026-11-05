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

mise 会先从 mise-versions 查询列表，因为大多数仓库没有该文件，且 `raw.githubusercontent.com` 会限制共享 CI runner 的请求频率。当 mise-versions 不可用、未收录该仓库（例如私有仓库），或关闭了 [`use_versions_host`](/configuration/settings.html#use_versions_host) 时，mise 会直接从 GitHub 读取文件。默认分支上的更改大约十分钟内会反映到列表中；无论列表来自哪里，都会经过验证。

Versions the list omits can still come from GitHub releases; omission does not
withdraw them. For a domain project, the signed list is the entire release
index. A vendor withdrawal excludes a version even if a trusted stamper approved
it.

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
| `packslip/pins.toml` in the [state directory](/directories.html#local-state-mise) | Signers accepted before, signing scheme, vendor or repackager status, whether provenance links were present, forge repository IDs, and release-list state.       |
| `mise.lock`                                                                       | The project's signer, attestor, and forge-ID commitment beside each platform's artifact URL and checksum, which also applies on another machine's first install. |

For a keyless signer, continuity compares the workflow path without its tag or
branch ref, so a new release tag of the same workflow is the same signer. A new
workflow path or key needs an explicit trust decision. A
[`workflow`](/dev-tools/backends/packslip.html#workflow) list is one: a release
may move between the workflows it names. A change of signing
scheme, a change from vendor to repackager, or provenance links that disappear
can also be refused.

Deleting `pins.toml` resets local continuity for every recorded project. It is
not a routine fix for an installation failure, and it does not remove signer
commitments from a project's lockfile. To accept a rotation for one project,
follow [signer changes](/dev-tools/backends/packslip.html#pinned-signers).

### Renamed, transferred, and re-created repositories

A GitHub or GitLab project's name locates it, but the forge's repository ID
identifies it. GitHub Actions and GitLab CI signing certificates record that ID,
and it does not change when a repository is renamed or transferred to another
owner. mise pins the ID with the signer and compares each release's ID with the
pin:

| What happened to the name                          | Result                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Renamed, or transferred to another owner           | Installs. mise warns once that the project has a new name, and the pin follows it to that name.                           |
| Deleted and re-created, by anyone, under that name | Refused once the original is pinned, even though the name and workflow path match: the new repository has a different ID. |

The owner is not part of the identity: only a repository's current owner can
transfer it, and that owner already signs its releases.

Signer continuity then compares the workflow's path inside the repository, so
`github.com/old/tool/.github/workflows/release.yml` continues as
`github.com/new/tool/.github/workflows/release.yml`. Releases published before a
rename are signed under the old name and still install when the configuration
names the new one.

mise finds the pin by the repository ID in the release's certificate, not by
name. So if your configuration already uses the new name, or this machine never
saw the rename, the old name's pin still applies: the release must match its
signer, provenance, and attestor. After mise accepts the release, it moves the
pin and its release-list state to the new name, so each repository keeps one
pin. 固定项会记住仓库原来的名称，因此之后其他仓库即使取得该名称，也仍会被拒绝。错误信息会显示固定时记录的名称；请将该名称传给 `mise packslip forget`。

With no pin yet and a release signed under another name, mise asks the forge
which repository the requested name now belongs to. If it cannot ask, for
example offline or when rate-limited, it compares names only and refuses the
release.

没有仓库 ID 的固定项或 `mise.lock` 条目只按名称固定，且不会跟随仓库改名。`identity`、`identity_prefix` 和 `pubkey` 选项会生成这类记录。代码托管平台只能回答当前哪个仓库使用该名称，无法证明之前固定的是哪个仓库；因此，由另一个名称对应的仓库签署的发布会被视为不同签名者并遭到拒绝。若要更新机器上的固定项，请运行 `mise packslip forget <tool>` 后重新安装；若要更新锁文件条目，请将其删除并再次运行 `mise lock`。下次通过代码托管平台验证并接受该名称的发布时，mise 会加入仓库 ID。

This is still trust on first use. The first install on a machine with no pin and
no lockfile entry accepts whichever repository owns the name at that moment, so
a name taken over before that install is not detected. Commit `mise.lock` so
every machine starts from the IDs the project accepted.

## Release-list continuity {#release-list-continuity-and-minimum-age}

mise rejects an expired signed list, and a list whose sequence is below the
highest it has accepted for the project. Once it has accepted a supplementary
GitHub list, that list disappearing is an error, so a missing list cannot
silently undo a withdrawal. The list state is stored with the
[signer pin](#signer-continuity), and for a GitHub or GitLab project it follows
the repository ID through a
[rename](#renamed-transferred-and-re-created-repositories) the way the pin does:
a list accepted under the old name still sets the lowest sequence, and still may
not disappear, under the new one.

## Minimum release age

[`minimum_release_age`](/configuration/settings.html#minimum_release_age)
applies to packslip tools as to other backends; see
[Minimum release age](/security.html#minimum-release-age) for the setting
itself. Discovery timestamps filter candidates first. Before downloading an
artifact, mise checks the verified transparency-log timestamp against the
cutoff; only an explicitly allowed unlogged bundle uses the signed publication
timestamp instead. 如果已记录到透明日志的 bundle 条目没有经过验证的时间戳，则会被视为发布时间过近，而不会采用清单自行声明的时间。

The cutoff decides which release a version request may pick, so it does not
apply to a release that is already chosen. An exact pin such as
`"packslip:github.com/jdx/hk" = "2.0.1"` and a version recorded in `mise.lock`
both install and lock while the release is still within the cutoff. Requests
such as `latest` or `2` wait until a release is old enough.

## Stamps

A stamper is a registry, mirror, or review service that publishes a signed list
of the releases it approves. No stamps are required by default. To require them,
set [`packslip.stampers`](/configuration/settings.html#packslip.stampers) to the
hosts you trust and the key or identity allowed to sign each host's lists:

```toml
[settings.packslip]
stampers = [
  "stamps.example.com=/path/to/stamper.pub",
  "reviews.example.com=https://github.com/example/reviews/",
]
```

Each entry is `host=PIN`. The pin can be a minisign-format public-key line, the
path of a public-key file, or a GitHub identity prefix. Replace the example
hosts and key path with a service and pin you trust.

A host publishes one list per project at
`https://<host>/.well-known/packslip/<project>.json`. With stampers configured:

- A version needs a non-yanked approval from at least one trusted host to be
  listed or installed. One host's withdrawal does not veto another's approval.
- A vendor withdrawal still excludes the release, regardless of stamps.
- mise checks the stamped bundle digest and the vendor-list digest, when
  present, then verifies the vendor signature. A stamp never replaces that
  signature.
- A stamp without a digest is refused: the approval must identify the bundle's
  contents, not just its URL.
- Expired, rolled-back, or invalid stamper lists, and lists accepted before that
  are now missing, cause errors.

To exempt one tool while keeping vendor verification, set its
[`trust = "vendor"`](/dev-tools/backends/packslip.html#trust) tool option.

### Mirrors

A stamper can mirror the exact vendor-signed bundle. mise fetches a stamped
release from the stamp's URL and checks the vendor's list for withdrawals and
any recorded digest; resolution and installation use the same source and
policy. Deleting a GitHub release asset does not block an approved mirror of a
release the vendor has not withdrawn. Re-signed repackager bundles, which would
need a separate identity policy, are not supported.

## Artifact selection

mise uses the signed metadata to select one artifact:

1. Match OS, architecture, and libc. An absent field leaves only that dimension
   unrestricted: a universal macOS build still requires macOS.
2. With a `variant`, consider only that variant. Without one, consider only
   artifacts that have no variant.
3. Drop formats mise cannot install. Prefer the most specific platform match;
   between equally specific builds, prefer an archive over a bare executable.
4. Refuse an unresolved tie instead of guessing between builds.

Installer formats such as `deb`, `dmg`, and `msi` are never selected. A glibc
host can use a matching static musl artifact when there is no GNU artifact, or
when the selected GNU artifact declares a `glibc_min` above the host's detected
version; mise reports that fallback in the debug log. Publishers distinguish
alternative builds with variants, and no client option can choose between two
identically described artifacts.

## Host requirements

After selecting an artifact, mise checks its declared requirements before
downloading it. Requirements do not break a selection tie, and apart from the
musl fallback above they never select another build.

| Requirement result                                                                           | mise behavior                                      |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Insufficient glibc with a matching static musl artifact                                      | Select the musl artifact.                          |
| Confirmed missing library, insufficient glibc without a fallback, or insufficient OS version | Refuse installation.                               |
| Missing or outdated required command                                                         | Warn and continue.                                 |
| A check cannot be completed                                                                  | Warn instead of assuming the host is incompatible. |

Command checks prefer active mise tools over the ambient `PATH`. mise looks for
a path the OS can execute: on Windows, `git.exe` or `node.cmd` counts, but a
shebang-only script does not. 只有安装时才会检查这些命令；解析版本时不会启动它们。mise 会运行 `<command> --version` 读取最低版本，并以命令自身所在目录而非项目目录作为工作目录，因此环境 `PATH` 中版本管理器的 shim 会报告其在该目录中选择的版本。

Library detection depends on the platform. For example, a macOS library that is
absent from disk can still exist in the dyld shared cache, so mise reports that
absence as unknown. On Linux, the OS version is the kernel release from
`uname -r`, read up to the distribution's suffix: `6.8.0-31-generic` is compared
as `6.8.0`.

The [`ignore_requirements`](/dev-tools/backends/packslip.html#ignore-requirements)
tool option installs despite confirmed failures and keeps the GNU build instead
of falling back to musl.

## How mise verifies its own updates {#self-update}

[`mise self-update`](/cli/self-update.html) and automatic updates check mise's
own releases with packslip before replacing the running binary. Every release
from 2026.9.3 on must carry a `packslip.sigstore.json` bundle. If it is missing
or fails any check below, the update stops and the installed mise stays as it
is. mise checks that:

- The bundle's Sigstore signature and transparency-log entry are valid.
- The certificate names mise's GitHub repository by its built-in repository ID,
  so renaming the repository or moving it to another organization does not change
  what is trusted.
- The bundle was signed by the repository's `.github/workflows/release.yml`
  workflow, is the vendor's own, and is for the version being installed.
- The downloaded archive matches the signed digest.
- The transparency-log timestamp is older than
  [`self_update.minimum_release_age`](/configuration/settings.html#self_update.minimum_release_age).
  通过 `mise self-update 2026.10.4` 这样的命令指定版本时，会跳过此项检查。

每个发行版也都会检查归档中嵌入的签名；对于 2026.9.3 之前的发行版，这是唯一的检查。通过 [`self_update.repository`](/configuration/settings.html#self_update.repository) 配置的镜像必须提供原始 manifest 和归档字节，因此镜像只能提供文件，不能改变信任判断。如需使用 `packslip` CLI 安装 mise 本身，请参阅[安装 mise](/installing-mise.html#packslip)。
