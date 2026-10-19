---
description: "生成或更新工具 stub"
---

<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate tool-stub`

- **用法：** `mise generate tool-stub [FLAGS] <OUTPUT>`
- **效果：** 修改状态
- **源代码：** [`src/cli/generate/tool_stub.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/tool_stub.rs)

Generate or update a tool stub

A tool stub is an executable file that names a tool and where to get it;
running it installs the tool if needed and runs it. See
<https://mise.jdx.dev/dev-tools/tool-stubs.html>.

Pass --url or --platform-url to create or extend a stub. mise downloads each
artifact to record its checksum, size, and binary path unless you pass
--skip-download. On an existing stub, new platforms are added and URLs you pass
again are replaced. --fetch fills in missing checksums and sizes, and --lock
records lock data for an existing stub, including one that uses a registry tool.

## 参数
- **`<OUTPUT>`** — 工具存根的输出文件路径

## 标志
- **`-b --bin <BIN>`** — 提取的归档文件中的二进制路径

  If not specified and the archive is downloaded, mise detects the most likely binary.
- **`--bootstrap`** — Make the stub install mise when it is missing

  The stub becomes a bash script that:
  1. Uses mise from PATH, or ~/.local/bin/mise
  2. Otherwise installs mise to ~/.local/bin with the embedded installer
  3. Runs the tool stub with mise
- **`--bootstrap-version <BOOTSTRAP_VERSION>`** — mise version the --bootstrap script installs; defaults to the latest release

  Pin a version such as `2026.10.0` to keep the installer reproducible.
- **`--checksum-algorithm <ALGORITHM>`** — Checksum algorithm for downloaded artifacts

  Not available with --lock or --skip-download, which do not compute checksums.

  **选项：** `blake3`、`sha256`

  **默认值：** `blake3`
- **`--fetch`** — 获取现有工具存根文件的校验和和大小

  Reads an existing stub file and fills in missing checksum and size fields by downloading the files. URLs must already be present in the stub.
- **`--lock`** — Resolve and record lock data (exact version, platform URLs and checksums) for an existing stub

  The data goes into the `mise.lock` of the nearest project config above the
  stub, and the stub keeps its version request. It is an error when no project
  config is found.
- **`--platform-bin <PLATFORM_BIN>`** — Binary path inside the archive for one platform, such as `linux-x64:bin/tool`; repeatable
- **`--platform-url <PLATFORM_URL>`** — Download URL for one platform, as `PLATFORM:URL` or a bare URL; repeatable

  With a bare URL, mise detects the platform from the file name, such as `--platform-url https://nodejs.org/dist/v24.11.0/node-v24.11.0-darwin-arm64.tar.gz`. When the output file already exists, new platforms are added to its platforms table, and a platform you pass again gets the new URL.
- **`--skip-download`** — Do not download artifacts, so checksums, sizes, and the detected binary path are left out
- **`-u --url <URL>`** — URL to download the tool from
- **`--version <VERSION>`** — Version of the tool

## 示例

下载并检查实际归档文件，以检测其二进制文件和校验和

```
mise generate tool-stub ./bin/node --platform-url https://nodejs.org/dist/v24.11.0/node-v24.11.0-darwin-arm64.tar.gz
```

向同一存根添加 Linux 构件

```
mise generate tool-stub ./bin/node --platform-url linux-x64:https://nodejs.org/dist/v24.11.0/node-v24.11.0-linux-x64.tar.gz
```

Draft a stub without downloading; replace the placeholder URL before running it

```
mise generate tool-stub ./bin/my-tool --url https://example.com/my-tool.tar.gz --skip-download
```

填充现有存根中缺失的校验和和大小

```
mise generate tool-stub ./bin/node --fetch
```

Resolve and record the version and platform lock data of an existing registry-backed stub

```
mise generate tool-stub ./bin/registry-node --lock --version 24
```

<!-- 生成的参考导航 -->

## 相关文档

- [便携式工具存根](/dev-tools/tool-stubs.html)。
- [`mise generate <SUBCOMMAND>`](/cli/generate.html)。
- [全局标志和参数语法](/cli/#global-flags)。
