---
description: "Homebrew formulae and casks — without requiring Homebrew to be installed."
---

# Homebrew formulae and casks

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

## First install

Use this manager when you want software in the shared Homebrew prefix. For a
CLI that needs project-specific version switching, use a [tool backend](/dev-tools/backends/).
These package declarations do not create mise shims or modify the current shell's PATH.

```sh
mise bootstrap packages status
mise bootstrap packages apply --manager brew --dry-run
mise bootstrap packages apply --manager brew
```

Check [platform support](#supported-platforms) first. Source builds need a
compiler and build tools, and some casks need permission to write system-owned
paths. An installation can include the package's dependencies.

## Third-party taps

Third-party taps are supported with the same fully-qualified name you would
pass to Homebrew:

```toml
[bootstrap.packages]
"brew:owner/tap/formula" = "latest"
"brew-cask:owner/tap/app" = "latest"
```

mise first looks for published Homebrew API metadata at
`api/formula/<name>.json` or `api/cask/<token>.json`. When a tap does not
publish it, mise fetches the Ruby definition at a pinned tap commit and
evaluates its metadata with mise's own Formula or Cask DSL shim. Formula
definitions are discovered with Homebrew's directory-wide precedence:
`Formula/`, then `HomebrewFormula/`, then the repository root. Nested formulae
are supported in the first two directories; root-level discovery is top-level
only. Formulae resolved this way are built from source. mise does not invoke or
install Homebrew. The shims support the commonly used DSL and report an error
when a definition cannot be evaluated or installed safely.

For taps whose GitHub URL cannot be inferred, add a tap source. This mirrors
`[plugins]`: the key is the tap name and the value is the GitHub git URL.

```toml
[bootstrap.brew.taps]
"acme/tools" = "https://github.com/acme/homebrew-tools.git"

[bootstrap.packages]
"brew:acme/tools/widget" = "latest"
"brew-cask:acme/tools/widget-app" = "latest"
```

`mise bootstrap packages brew tap` and `mise bootstrap packages brew untap`
manage `[bootstrap.brew.taps]` in `mise.toml`; they do not mutate a Homebrew
installation. Non-GitHub taps are not currently supported because mise needs
direct raw access to tap metadata and Ruby definitions.

```sh
mise bootstrap packages brew tap railwaycat/emacsmacport
mise bootstrap packages brew tap acme/tools https://github.com/acme/homebrew-tools.git
mise bootstrap packages brew untap acme/tools
```

## Cask

Casks use the `brew-cask:` manager. mise fetches cask metadata directly from
the Homebrew cask API (or from tap API metadata), downloads the artifact,
verifies its sha256 when the cask provides one, extracts the archive, and
installs app bundles into `/Applications` while recording the version under
`<prefix>/Caskroom`. For an ordinary managed app artifact, mise moves the bundle into
`/Applications` and leaves a symlink at its versioned Caskroom path instead of
retaining a second copy of the application.

```toml
[bootstrap.packages]
"brew-cask:firefox" = "latest"
"brew-cask:homebrew/cask/visual-studio-code" = "latest"
```

### 覆盖应用程序目录

By default, `app` artifacts are installed into `/Applications`, matching
Homebrew. Set the `MISE_BREW_CASK_OPT_APPDIR` environment variable to install
them somewhere else — for example, a user-writable `~/Applications` that does
not require elevation:

```sh
MISE_BREW_CASK_OPT_APPDIR="$HOME/Applications" mise bootstrap packages apply brew-cask:firefox
```

The value must be an absolute path, must not contain `..`, and must not resolve
to the filesystem root. It is resolved to a real path (symlinks are followed)
before use, so it acts as a fixed containment boundary for the app links mise
creates. An empty value is ignored and falls back to `/Applications`. When the
override is set, a cask that targets the default `/Applications` (as most do) is
relocated into the override directory, preserving any subdirectories the cask
requests; targets that a cask anchors under `$HOMEBREW_PREFIX/Applications` are
left in the Homebrew prefix and are never relocated. This mirrors Homebrew's own
`--appdir` install option.

To adopt an app that is already installed at the cask's destination, use the
table form with `adopt = true`:

```toml
[bootstrap.packages]
"brew-cask:textmate" = { version = "latest", adopt = true }
```

要为所有已配置的 cask 启用接管，请设置 Homebrew bootstrap 默认值。单个 cask 可以使用 `adopt = false` 选择退出：

```toml
[bootstrap.brew]
adopt = true

[bootstrap.packages]
"brew-cask:textmate" = "latest"
"brew-cask:replace-me" = { adopt = false }
```

As with Homebrew's `brew install --cask --adopt`, mise downloads and verifies
the current cask artifact, then adopts the existing app only when its content
is identical. If the existing app differs, it is left untouched and the install
fails, except for casks declaring `auto_updates: true`: matching Homebrew,
those adopt the existing app as-is because it may already have updated itself.
Adopted apps are tracked by the mise receipt without keeping a duplicate app
bundle in Caskroom.

Casks declaring `auto_updates: true` in their Homebrew metadata are installed
at the current version and then left to update themselves. mise does not expose
an `auto_updates` override: the cask definition remains authoritative. These
self-updating apps are also tracked by receipt without a duplicate Caskroom app
bundle. Install/apply and dependency installation leave installed self-updating
apps unchanged. Explicit `mise bootstrap packages upgrade` follows Homebrew's
default decision: `latest` and matching receipt versions skip. Otherwise, casks
with a single owned app upgrade when its live `CFBundleShortVersionString` and
`CFBundleVersion` indicate an older version using Homebrew's comparison rules,
including CSV and combined short/build versions. Current, newer, unreadable, or
incomparable app versions skip replacement. An outdated app that is running is
also skipped and left to update itself. Browsers, Electron apps, and similar
launch helper processes from their bundle on demand, so replacing the bundle
under a live process strands every helper it starts afterwards; the app's own
updater moves between versions without that. mise checks again after
downloading and acquiring the install lock, and once more right before the
bundle is replaced, because preflight steps and installers can start the app
themselves; that last skip restores what preflight protected and leaves the
receipt unchanged. An external self-updater can still change the app between
the lock check and replacement. Dry-run reports the decision without replacing
the app.

`mise bootstrap status` 会将这些条目标记为`已安装（自动更新）`。
对于由 mise 管理的 cask，`Current` 列是 mise 收据中记录的版本；实时应用程序可能已经自行更新到不同版本。JSON 状态会保留稳定的 `"state": "installed"` 值，并添加 `"auto_updates": true`。

### macOS 隐私与安全（TCC）

Replacing an app bundle under `/Applications` (or your configured appdir) is
the same class of operation as `brew reinstall --cask`: macOS may revoke
Privacy & Security grants for that app (Accessibility, Screen Recording, Full
Disk Access, Automation, and similar). mise does not manage TCC; after a
replacement you may need to re-grant permissions in System Settings.

迁移没有 Homebrew `.metadata` 的非托管应用程序包时，优先使用接管，这样 mise 可以记录所有权，而无需替换正在运行的应用程序包：

```toml
[bootstrap.brew]
adopt = true
```

或者选择性接管：

```toml
[bootstrap.packages]
"brew-cask:firefox" = { version = "latest", adopt = true }
```

每当替换现有 `.app` 时，mise 都会打印警告。当上游发布新的 cask 版本时，版本升级仍会替换应用程序包——请预期需要在这些升级后重新确认 TCC 提示，这与 Homebrew 的行为相同。

### Linux font casks

On Linux, cask support is limited to font-only casks without lifecycle
hooks or structured `preflight_steps` or `postflight_steps` — concepts from
Homebrew's cask DSL, documented in the
[Homebrew Cask Cookbook](https://docs.brew.sh/Cask-Cookbook). Fonts are
installed into `$XDG_DATA_HOME/fonts`, which defaults to `~/.local/share/fonts`:

```toml
[bootstrap.packages]
"brew-cask:font-heavy-data-nerd-font" = "latest"
```

Other Linux casks are reported as unavailable and skipped when they come from
`[bootstrap.packages]`, so macOS and Linux can share a package list. An
explicit request such as `mise bootstrap packages apply brew-cask:firefox`
still fails with a clear unsupported-platform error. You can also mark macOS
casks explicitly with `{ os = "macos" }`. This boundary will expand as mise
gains portable implementations for more cask artifact types.

### Supported artifacts and lifecycle actions

`brew-cask` currently supports app-bundle casks (`app` artifacts), binary and
generated command-wrapper casks (`binary` and `command_wrapper` artifacts),
generic prefix artifacts (`artifact`), font artifacts (`font`), simple macOS
installer packages (`pkg` artifacts), script-based cask installers, and shell completions
(`bash_completion`, `fish_completion`, `zsh_completion`, and
`generate_completions_from_executable`) from dmg and common archive formats.
Binary artifacts and generated wrappers are staged in the Caskroom and linked
into the Homebrew prefix, usually under `<prefix>/bin`. Package installers run
through mise's normal system-package sudo path, so non-interactive runs never
hang waiting for a password. Pkg casks must include `pkgutil` receipt IDs in
their `uninstall` metadata so mise can verify installed state after the
installer writes files outside the Caskroom. `zap` `pkgutil` IDs are treated as
cleanup metadata, not install receipts. For casks with lifecycle hooks, mise
fetches the sha256-verified cask Ruby source pinned by the API metadata and runs
supported `preflight`/`postflight` hooks through its own Cask DSL shim, without
delegating to Homebrew. mise also supports structured `preflight_steps` and
`postflight_steps` for `move`/`remove` operations against `staged_path`,
`set_permissions` operations that `chmod` existing `staged_path` or `appdir`
paths with Homebrew's recursive default, `run` operations using Homebrew's
serialized command bases, arguments, environment, guards, and sudo setting, and
`terminate_process` operations with Homebrew-compatible name/full matching,
retries, notices, and failure policy.
Structured `copy` and `symlink` steps support Homebrew path bases, templates,
guards, source globs, replacement, and sudo behavior. External paths created by
lifecycle steps are recorded in the mise receipt and restored if the install
transaction fails. A cask's formula and cask dependencies are installed first,
and declared cask conflicts fail before anything is modified. Casks that
require custom installer choices, services, unsupported hook DSL, unsupported
structured lifecycle steps, or other cask artifact types fail with a clear
unsupported artifact error instead of delegating to Homebrew.

### Ownership and installed state

Direct cask pours remain mise-owned. Their completed state is recorded in
`.mise-cask.toml`; mise does not synthesize Homebrew's private `.metadata`
receipts. A Homebrew-owned cask with `.metadata` and exactly one Caskroom version
satisfies a matching `brew-cask:` entry without transferring ownership.
Status reports it as installed and uses that Caskroom directory name for the
`Current` version; apply leaves it unchanged, and upgrade skips its lifecycle.
mise does not create `.mise-cask.toml`, adopt the cask, or change its metadata,
app targets, prefix binaries, or completion links; use Homebrew to upgrade,
reinstall, or remove it. If the Homebrew metadata has no version or multiple
versions, mise fails with Homebrew repair guidance instead of guessing which
installation is valid.

对于由 mise 管理的 cask，只要其收据和记录的目标仍然存在，状态就会将 cask 视为已安装。应用程序和字体内容指纹会保留用于 prune 和接管安全检查，但现有应用程序或字体内部的内容漂移**不会**将 cask 标记为缺失，也不会在 apply 时触发重新安装——替换 `/Applications/*.app` 会重置 macOS 隐私与安全（TCC）授权。二进制文件和补全符号链接仍要求记录的链接目标存在（通过廉价的 `readlink` 检查），并且目标可解析，因此悬空或被重新指向的链接仍可修复。缺失或未知的收据以及待处理事务仍会被报告为不健康，以便下一次 apply 进行协调。版本升级以及显式 remove + apply 仍会在你希望进行全新倒入时替换应用程序。

## Supported platforms

| 平台                        | 前缀                         |
| --------------------------- | ---------------------------- |
| macOS arm64（Apple Silicon） | `/opt/homebrew`              |
| Linux x86_64                | `/home/linuxbrew/.linuxbrew` |
| Linux arm64                 | `/home/linuxbrew/.linuxbrew` |

Intel Macs are not supported — the `brew` manager reports itself unavailable
there. On Linux, formulae without a bottle for your architecture (arm64
Linux bottles exist for most but not all of homebrew/core) are built from
source instead.

## 前缀

If the prefix doesn't exist, mise creates it with the standard layout.
Formula installation may elevate for prefix creation and ownership setup
(`mkdir` + `chown`), then writes formulae as the prefix owner. Cask installation
can also require elevation for package installers or lifecycle steps. Run mise
as the intended owner and let it request the privileges needed for each step.

Linked commands need `<prefix>/bin` on `PATH`. For example, in the appropriate
shell startup file:

```sh
# Apple Silicon macOS
export PATH="/opt/homebrew/bin:$PATH"

# Linux
# export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
```

Keg-only formulae are not linked there. Use their `<prefix>/opt/<formula>` path
when configuring compilers or services that need them. As with brew, formulae
that are keg-only only because macOS already provides them are not keg-only on
Linux and are linked normally.

### Locate an installed formula

`mise bootstrap packages where brew:unzip` prints the installed formula's
absolute `<prefix>/opt/unzip` root as one line. Append `/bin` to use its commands,
including commands from keg-only formulae:

```sh
if package_root="$(mise bootstrap packages where brew:unzip)"; then
  export PATH="$package_root/bin:$PATH"
fi
```

The lookup works for formulae installed by mise or Homebrew, with no package
declaration or Homebrew executable required. Library-only formulae also have
roots, so a successful lookup does not guarantee a `bin` directory exists.
The stable `opt` spelling follows upgrades that repoint the link. It describes
the active installation at lookup time; a concurrent upgrade or unlink can
change the target before a later command uses it.

Use the canonical installed formula name, such as `brew:openssl@3`.
`brew:homebrew/core/unzip` and `brew:owner/tap/unzip` both query the local
`unzip` rack; the lookup does not verify tap provenance or resolve aliases.
`@latest` and numeric `@` suffixes are literal parts of the formula name.
The command supports brew formulae on macOS arm64 and Linux x86_64/arm64;
casks and other package managers are unsupported.

A missing or unusable `opt` link produces an error on stderr, a nonzero exit
status, and empty stdout. Install or reconcile the formula separately with
`mise bootstrap packages apply brew:unzip`; inspect and restore an invalid
link as directed by the error. Lookup reads local records without repairing
them, downloading metadata, running subprocesses, or selecting another Cellar
version.

For this query, settings come exclusively from environment variables and global
CLI options, including `--cd`. Project/global configuration and `.miserc.toml`
are outside its inputs, so their errors and executable templates cannot affect
the lookup. Automatic updates and startup housekeeping are skipped.

## 与真实 Homebrew 共存

mise 会像 brew 一样将瓶装包倒入 Cellar，并在每个 keg 中写入与 brew 兼容的 `INSTALL_RECEIPT.json` 文件。对于真正的 Homebrew 安装来说，mise 倒入的 keg 看起来就像它自己安装的一样：`brew list`、`brew upgrade` 和 `brew uninstall` 都可以对它们正常工作。反过来，mise 的状态检查会直接读取 Cellar，因此由 brew 安装的 formulae 也会被视为已安装。

For non-keg-only formulae, mise maintains Homebrew's
`<prefix>/var/homebrew/linked/<name>` record alongside the `opt` record. For a
configured formula, if either record is missing, `mise bootstrap packages
apply` restores it without repouring the keg or replacing its public links.
Older mise installs are recognized as linked only when their existing public
links match the keg's layout. Dependency-closure migration is not performed.

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

`mise bootstrap packages prune --manager brew-cask` 会将相同的合并配置模型应用于直接 cask 制品，但其所有权边界有意更加狭窄。只有当 cask 的安装时 `.mise-cask.toml` 收据明确标记其可安全清理，并且每个记录的目标仍具有 mise 在安装后记录的完全一致内容指纹时，才会移除该 cask。该命令会移除这些目标及 cask 的 Caskroom 条目；`--dry-run` 可预览计划，`--yes` 可跳过确认。被接管的应用程序和自行更新的应用程序会在没有重复 Caskroom 包的情况下进行跟踪，因此 mise 无法证明目标位置后来存在的应用程序包仍然是其所拥有的那个。这些仅存在元数据的应用程序因此永远不会被 prune 移除。

在其收据包含清理元数据之前安装的 cask 会被跳过，直到后续升级或重新安装刷新该收据。带有 pkg 或命令包装器构件、安装或卸载生命周期操作、待处理事务、Homebrew `.metadata`、已更改目标，或与其他 mise cask 共享目标的 cask，也会被跳过并说明原因。Prune 从不运行 `zap` 元数据，也不会根据当前的 Homebrew API 重建历史卸载行为。

## 倒酒的工作原理

对于依赖闭包中的每个公式（先处理依赖项）：

1. **Fetch** the bottle for your platform from ghcr.io and verify its sha256
   against the API metadata.
2. **Extract** into a temporary directory inside the Cellar (incomplete
   pours are never visible as installed packages).
3. **Relocate**: bottles embed placeholder paths like `@@HOMEBREW_PREFIX@@`.
   mise rewrites them to real paths — plain replacement in text files and in
   the shebang preamble of binary-backed executables such as zipapps (leaving
   their payload untouched), and in-place and load-command rewriting in Mach-O
   binaries (growing load commands into header padding when needed, exactly
   like brew's ruby-macho does). On Linux, the ELF
   interpreter and rpath are patched the way brew's PatchELF gem does it:
   strings that no longer fit are moved into a new segment appended to the
   binary, and the interpreter is pointed at `<prefix>/lib/ld.so` (a symlink
   mise maintains to the system's dynamic loader, or to a brewed glibc when
   one is installed).
4. **Re-sign** (macOS): any modified binary is ad-hoc re-signed with
   `codesign` — required on arm64, where the kernel kills binaries whose
   signature doesn't match.
5. **Receipt**: a brew-compatible `INSTALL_RECEIPT.json` is written.
6. **Link**: `<prefix>/opt/<name>` is created and the keg's `bin`, `lib`,
   `include`, `share`, etc. are symlinked into the prefix. The Homebrew
   linked-keg record is created for non-keg-only formulae.
   [keg-only](https://docs.brew.sh/FAQ#what-does-keg-only-mean) formulae get
   the `opt` link but are not linked into the prefix, just as with brew.
   Keg-only reasons tied to macOS (`:provided_by_macos`, `:shadowed_by_macos`)
   do not apply on other OSes, where these formulae are linked normally —
   also matching brew.

## 源码公式

有些公式根本没有 bottle（仅源码公式），还有一些虽然在其他平台有 bottle，但在你的平台上没有。mise 会直接从源码构建这些公式——仍然不依赖 Homebrew：

1. **Ruby** — 由于公式本身就是 Ruby 代码，mise 会通过其常规工具机制提供一个由 mise 管理的 ruby（预编译、速度快；如果你已配置了 ruby，则会遵循你的配置）。
2. **Formula** — 该公式的 `.rb` 会从 homebrew/core 下载，并固定到生成 API 元数据时对应的精确 commit，同时使用 API 提供的 sha256 进行校验。
3. **Source** — 会下载稳定版源码归档，并使用 API 提供的 sha256 进行校验。
4. **Build deps** — 该公式的构建依赖（cmake、pkgconf、……）会被加入安装闭包，并优先作为常规 bottle 安装。
5. **Build** — mise 使用自己的 Formula-DSL shim 对公式进行求值，并在规范前缀下运行 `def install`，同时将 `PATH`、`PKG_CONFIG_PATH` 和编译器标志指向依赖的 keg。该 keg 会获得与已倒入 bottle 相同、兼容 brew 的收据，并带有 `poured_from_bottle: false`——这与 brew 标记其自身源码构建的方式完全一致。

The shim implements the commonly used subset of the formula DSL
(configure/cmake/meson-style builds, resources, patches, the standard path
and environment helpers). Formulae that use parts of the DSL the shim
doesn't cover — language-specific helpers like `virtualenv_install_with_resources`,
VCS downloads, and similar — fail with a clear `formula uses ...` error
rather than miscompiling silently.

源码构建需要可用的工具链（macOS 上需要 Xcode Command Line Tools，Linux 上需要 gcc/make），这与在纯 Homebrew 下的要求完全一致。

## 升级

`mise bootstrap packages upgrade` 会重新根据 `formulae.brew.sh` API 解析已配置的配方，并倾倒任何当前版本与已链接 keg 不同的配方——新的 keg 会替换旧的，链接也会重新指向，就像 `brew upgrade` 所做的那样。由于瓶装包只存在于配方的当前版本中，因此“升级”和“安装当前瓶装包”是同一个操作。

## Troubleshooting

- **Link conflict:** inspect the paths mise lists and identify their owner before changing them. Repeated apply does not authorize overwriting unrelated files.
- **Unsupported formula DSL or cask artifact:** read the named unsupported operation. mise's built-in installer has its own coverage; an upstream Homebrew recipe is not a guarantee of support.
- **Installed but command missing:** check the prefix's `bin` directory and whether the formula is keg-only.
- **Existing app differs:** decide whether to keep managing it outside mise or use the documented adoption workflow. `adopt` is not permission to overwrite a different app.
- **App replaced successfully but permissions changed:** check macOS Privacy & Security grants for that app.

## Limitations

- **Cask artifact coverage is intentionally narrow.** On macOS, `brew-cask`
  supports app bundles, binary artifacts, generated command wrappers, generic
  prefix artifacts, font artifacts, simple pkg installers, script-based
  installers, and shell completions from dmg and common archive formats. On Linux, it supports
  font-only casks without lifecycle hooks or structured `preflight_steps` or
  `postflight_steps`. Other artifact types, pkg installers without `pkgutil`
  IDs, and pkg installers with custom choices fail explicitly.
- **`brew services` is not implemented.**
- **Cask import is not implemented.** Cask prune is limited to mise-owned direct
  artifacts whose install-time receipt proves they can be removed safely. Pkg
  artifacts and casks with lifecycle actions are skipped until their uninstall
  semantics are supported.
- **Source builds cover the common formula shapes.** mise's formula shim
  implements the widely used subset of the DSL (see
  [Source formulae](#source-formulae)); formulae that reach beyond it fail
  with a clear error naming the unsupported feature.
- **Use canonical formula names.** `postgresql@17` is a formula name, not a
  mise version pin — the API's current stable version decides what gets
  installed. Aliases (`postgres`) install correctly but `mise bootstrap packages status`
  can't track them; mise warns and tells you the canonical name.
- `PATH` is up to you: `<prefix>/bin` must be on `PATH` to use linked
  binaries, just like with Homebrew itself.
