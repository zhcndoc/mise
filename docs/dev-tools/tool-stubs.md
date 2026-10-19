---
description: "提交一个声明工具和版本的可执行文件，以便通过 ./bin/tool 使用 mise 安装并运行该工具。"
---

# 工具存根

工具存根是一个可执行文件，其中记录了如何获取并运行某个工具。将它提交到仓库后，像 `./bin/py` 这样的命令便会运行指定版本，并将参数传递给该工具。存根首次运行时，mise 会安装工具；`mise install` 不会查找存根文件。

如果希望由可执行文件本身携带工具定义，例如让脚本目录无需项目级 `mise.toml` 也能运行，可以使用存根。如果一组工具应在首次使用时安装，请优先考虑在 `[tools]` 中设置 [`lazy = true`](/dev-tools/shims.html#lazy-tools)。如果只需要不含下载元数据的单行包装器，请参阅 [`mise exec` 包装器](#alternative-creating-simple-stubs-with-mise-x)。工具存根的设计参考了 Meta 的 [dotslash](https://github.com/facebook/dotslash)。

存根需要能从 `PATH` 找到 `mise`，除非使用 [`--bootstrap`](#bootstrap) 生成存根，该选项会先安装 mise。

## 编写存根 {#tool-non-http-stubs}

存根以运行 `mise tool-stub` 的 shebang 开头，后面跟着声明工具名称的 TOML。将其保存为 `bin/py`：

```toml [bin/py]
#!/usr/bin/env -S mise tool-stub

tool = "python"
version = "3.14"
bin = "python"
```

赋予它可执行权限并运行：

```sh
chmod +x ./bin/py
./bin/py --version
./bin/py -c 'import sys; print(sys.executable)'
```

该存根的名称是 `py`，但实际运行已安装的 `python` 可执行文件；存根路径之后的参数会传给 Python。后端存根对 `version` 的解析方式与 `mise.toml` 相同；如果所有人都必须使用相同构建版本，请指定精确版本或[锁定存根](#locked-tool-stub)。

Unix shebang 最多只能向解释器传递一个参数，因此 `env -S` 会将 shebang 行的其余部分拆分为多个独立参数。

## 存根字段 {#configuration-fields}

存根只包含一个工具声明，而不是完整的 `mise.toml`。字段应放在顶层，不要使用 `[tools]` 表：

| 字段                      | 默认值                                                       | 用途                                                           |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `tool`                    | 提供 URL 时为 `http:<file name>`，否则为文件名                | 工具名称或后端，例如 `python` 或 `github:cli/cli`               |
| `version`                 | `latest`                                                     | [版本请求](/dev-tools/versions.html)                            |
| `bin`                     | 存根的文件名                                                 | 要运行的可执行文件路径，相对于安装目录                          |
| `os`                      | 所有平台                                                     | 存根支持的平台，例如 `["linux", "macos/arm64"]`               |
| `install_env`             | 无                                                           | 安装时使用的环境变量                                            |
| `url`、`checksum`、`size` | 无                                                           | 在所有平台上使用的 HTTP 下载信息                                |
| `[platforms.<os>-<arch>]` | 无                                                           | 各平台对应的 `url`、`checksum`、`size` 和 `bin`                 |

其他键会作为[工具选项](/dev-tools/#tool-options)传给后端。例如，以下存根会从 GitHub CLI 的发行版中安装工具：

```toml [bin/gh]
#!/usr/bin/env -S mise tool-stub

tool = "github:cli/cli"
version = "latest"
bin = "gh"
```

## 从 URL 下载 {#http-stubs}

包含下载 URL 且没有 `tool` 字段的存根会使用 [HTTP 后端](/dev-tools/backends/http.html)。顶层 `url` 会用于所有平台，因此只应在制品能跨平台运行时使用，例如 JAR 或脚本。对于平台专属二进制文件，请为每个平台分别添加表。以下 URL 是占位符；请[生成](#generating-tool-stubs-http)存根以记录真实下载元数据。

```toml [bin/tool]
#!/usr/bin/env -S mise tool-stub

version = "1.0.0"

[platforms.linux-x64]
url = "https://releases.example.com/v{{version}}/tool-linux-x64.tar.gz"

[platforms.macos-arm64]
url = "https://releases.example.com/v{{version}}/tool-macos-arm64.tar.gz"
```

如果 `version` 保持为 `latest`，HTTP 存根会安装这些 URL 当前指向的内容。要升级版本，请修改 URL 并重新生成校验和。

### 可执行文件路径 {#platform-specific-binary-paths}

`bin` 路径应相对于安装目录设置；mise 会先去掉归档文件的顶层目录。如果各平台的目录布局或文件名不同，请分别设置：

```toml [bin/tool]
#!/usr/bin/env -S mise tool-stub

bin = "bin/tool" # used by platforms without their own bin

[platforms.linux-x64]
url = "https://example.com/tool-linux.tar.gz"

[platforms.windows-x64]
url = "https://example.com/tool-windows.zip"
bin = "tool.exe"
```

生成器会检测每个平台归档中的可执行文件；如果所有平台都一致，就写入单个 `bin` 字段，否则会分别写入各平台的 `bin` 字段。

## 生成存根 {#generating-tool-stubs-http}

[`mise generate tool-stub`](/cli/generate/tool-stub.html) 会生成 HTTP 存根。它会下载制品、记录校验和与文件大小、查找其中的可执行文件，并为生成的文件添加可执行权限。传入 `--platform-url` 后，mise 会根据文件名检测平台：

```sh
mise generate tool-stub ./bin/rg \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz
```

```toml [bin/rg]
#!/usr/bin/env -S mise tool-stub

[platforms.linux-x64]
url = "https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz"
checksum = "blake3:85bc9b662e1868a010691ae699ac4fb7c87f79fa9075a0efa14478164aafd4e7"
size = 2265718 # 2.2 MiB
```

mise 在归档中找到了 `rg`；由于存根也命名为 `rg`，因此不需要 `bin` 行。如果存根使用其他名称，则会生成 `bin = "rg"`。当归档中包含多个可执行文件且 mise 选错时，请传入 `--bin`。

使用其他平台的 URL 再次运行该命令，即可将其添加到同一个存根：

```sh
mise generate tool-stub ./bin/rg \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-aarch64-apple-darwin.tar.gz
mise generate tool-stub ./bin/rg \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-pc-windows-msvc.zip
```

再次运行同一平台时会替换该平台的条目，因此提交前请检查差异。如果 URL 的文件名无法表明适用平台，请在 URL 前加上平台前缀，例如 `linux-x64:https://...`。

只有制品能在所有平台运行时才应改用 `--url`。所有可用参数请参阅 [`mise generate tool-stub`](/cli/generate/tool-stub.html)。

校验和可以检测制品之后是否发生变化，但无法证明最初是谁发布了下载内容，因此请从可信来源获取 URL。

生成器支持读取 `.tar.gz`、`.tgz`、`.tar.xz`、`.txz`、`.tar.bz2`、`.tbz2`、`.tar.zst`、`.tzst`、`.zip` 和 `.7z` 归档。

### 供其他工具使用的校验和 {#checksums}

默认校验和算法为 `blake3`。对于 Bazel 等需要 SHA-256 的使用方，请传入 `--checksum-algorithm sha256`：

```sh
mise generate tool-stub ./bin/rg --checksum-algorithm sha256 \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz
```

`--skip-download` 会在不下载任何内容的情况下写入存根，因此不会记录校验和、文件大小或检测到的 `bin`。检查 `bin` 字段后，运行 `mise generate tool-stub ./bin/rg --fetch` 填充缺少的校验和与文件大小。`--fetch` 会使用通过 `--checksum-algorithm` 指定的算法，并保留已有校验和。`--checksum-algorithm` 不能与不计算校验和的 `--lock` 或 `--skip-download` 同时使用。

## 自动安装 mise 的存根 {#bootstrap}

添加 `--bootstrap` 可生成 bash 脚本而不是 TOML 文件，适用于尚未安装 mise 的团队成员：

```sh
mise generate tool-stub ./bin/rg --bootstrap \
  --platform-url https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz
```

脚本会从 `PATH` 或 `~/.local/bin/mise` 查找 mise。如果两处都不存在，则会将 mise 安装到 `~/.local/bin`，然后运行以注释形式嵌入脚本的存根。`--bootstrap-version 2026.10.4` 可以固定要安装的 mise 版本。

## 锁定存根 {#locked-tool-stub}

锁定后端存根会在该存根上方最近的项目配置对应的 `mise.lock` 中，记录一个具体版本及后端提供的平台下载元数据。之后安装时会使用记录的 URL、验证所记录的校验和，并在锁定模式（`--locked` 或 `MISE_LOCKED=1`）下运行。存储的 URL 可避免后续安装时再次查找发行版，但不会免除私有下载所需的身份验证，也不会免除后端执行的所有验证请求。

<a id="locking-a-stub"></a>

`mise generate tool-stub` 只能生成 HTTP 存根，而 `--lock` 可用于任何已有存根，因此使用后端存根时请先手动编写：

```sh
mkdir -p bin
cat > bin/node <<'STUB'
#!/usr/bin/env -S mise tool-stub
tool = "node"
version = "24"
STUB
chmod +x bin/node

# 解析版本，并在 mise.lock 中记录各平台的 URL 和校验和
mise generate tool-stub ./bin/node --lock
```

与 `mise.toml` 一样，存根会保留其版本请求（`24`），而 `mise.lock` 会为锁文件中已有的平台（或新锁文件中的默认平台）记录解析后的版本。如果存根上方找不到项目配置，`--lock` 将失败。

```toml [mise.lock]
lockfile_version = 3
tool-stubs = ["bin/node"]

[[tools.node]]
version = "24.21.0"
backend = "core:node"
specifiers = ["24"]
# ...platform URLs and checksums
```

`tool-stubs` 列出了锁文件中包含条目的存根路径，路径相对于锁文件所在目录。由于这些工具并未在配置文件中声明，`mise lock` 会通过此列表判断哪些条目应保留，并在更新其他锁定项时一并刷新。删除列表中的存根后，`mise lock` 会将其从列表移除并清理对应条目。

存根根据其文件所在位置查找锁文件，而不是根据运行时的工作目录；如果存根是符号链接，则会跟随链接找到实际位置。因此，无论当前工作目录为何，`./bin/node` 和指向它的 `~/.local/bin/node` 符号链接都会使用项目的 `mise.lock`。本地配置和环境配置（`mise.local.toml`、`mise.{env}.toml`）不会参与，因此提交到仓库的存根在每台机器上都会以相同方式锁定。在锁定模式下，如果当前平台没有对应条目，存根会像任何未锁定的工具一样被拒绝。

### 更新已锁定的版本 {#bumping-a-locked-version}

再次运行 `--lock` 以获取较新版本；此操作会从头解析存根的版本请求。传入 `--version` 可修改版本请求本身：

```sh
mise generate tool-stub ./bin/node --lock --version 26
```

`mise lock --bump` 也会重新解析锁文件中列出的存根的版本请求。

## 运行存根 {#usage}

`mise generate tool-stub` 生成的存根已经具有可执行权限。只有手动编写的存根才需要运行 `chmod +x`。

每次运行都会经过 mise；在存根发生变化前，mise 会缓存已解析的可执行文件。如果要在紧密循环中频繁调用，请通过 `mise exec` 运行脚本，并直接调用该工具。

要调试存根，请通过 [`mise tool-stub`](/cli/tool-stub.html) 运行：

```sh
mise tool-stub ./bin/rg --version
```

### Windows 上的行为 {#on-windows}

Windows 无法直接运行带 shebang 的脚本，因此 `mise generate tool-stub` 也会在存根旁生成 `.cmd` 启动器。运行 `.\bin\rg.cmd`；如果 `bin` 已加入 `PATH`，则可直接运行 `rg`，Windows 会通过 `PATHEXT` 找到启动器。

只要存根可能在 Windows 上运行，mise 就会生成启动器：`os` 包含 Windows 或未设置，并且存根包含 `[platforms.windows-*]` 表或完全没有平台表。仅支持 Linux 和 macOS 的存根不会生成启动器；名称已以 `.cmd`、`.bat` 或 `.exe` 结尾的存根也不会生成启动器。所有平台上都会生成此启动器，因此在 Linux 上生成并提交到仓库的存根，也能供 Windows 用户克隆后使用。如果存根不再支持 Windows，重新生成时会移除启动器。mise 只会删除自己生成的启动器，不会删除你手动编写的启动器。

不带扩展名的存根也会保留，因此 Git Bash 和 Cygwin 仍可通过 shebang 运行它。

## 存根与 mise prune {#pruning}

运行存根后，mise 会像跟踪已使用的配置文件一样，将其记录到 `~/.local/state/mise/tracked-stubs`。[`mise prune`](/cli/prune.html) 会保留被跟踪存根所需的工具版本。存根至少在这台机器上运行过一次后，才会保护对应工具；删除存根文件后，除非其他内容仍需要这些版本，否则它们可以再次被清理。

## 改用 `mise exec` 包装器 {#alternative-creating-simple-stubs-with-mise-x}

对于简单场景，可以使用调用 [`mise exec`](/cli/exec.html) 的 shell 脚本完成相同工作，无需编写 TOML：

```sh
mkdir -p ./bin
cat > ./bin/node <<'SCRIPT'
#!/usr/bin/env bash
exec mise exec node@24 -- node "$@"
SCRIPT
chmod +x ./bin/node
```

`node@24` 用于选择版本，`node "$@"` 指定要运行的可执行文件并传递调用方的参数。这类包装器需要 bash 和 mise，且不会记录下载元数据；如果需要平台 URL 或锁定数据，请使用工具存根。
