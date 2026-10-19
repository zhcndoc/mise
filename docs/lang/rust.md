---
description: "通过 rustup 使用 mise 安装 Rust 工具链，包括组件、目标平台和 rust-toolchain.toml。"
---

# Rust

mise 通过 rustup 安装 Rust 工具链，必要时会先安装 rustup，并设置 `RUSTUP_TOOLCHAIN`，使 `cargo` 和 `rustc` 使用配置所选的工具链。

## 快速开始

为当前项目安装最新的稳定版 Rust 并检查版本：

```sh
mise use rust
mise exec -- rustc --version
mise exec -- cargo --version
```

在 Cargo 项目中运行 `mise exec -- cargo build` 或 mise 任务。这些命令会通过 mise 选择工具链，不需要激活 Shell。为 `mise use` 添加 `-g` 可设置个人默认版本。

## 选择版本

| 版本请求                  | 选择结果                                                       |
| ------------------------- | -------------------------------------------------------------- |
| `rust` 或 `rust@latest`   | 最新的稳定版本，例如 `1.99.0`                                  |
| `rust@1.99`               | 最新的 1.99.x 版本                                             |
| `rust@stable`             | rustup 的 `stable` 通道，由 `mise upgrade` 原位更新            |
| `rust@beta`               | rustup 的 `beta` 通道，由 `mise upgrade` 原位更新              |
| `rust@nightly`            | 当前 nightly，按日期工具链安装并锁定                            |
| `rust@nightly-2026-08-13` | 对应的 nightly 版本                                             |

配置中的 `nightly` 请求会保持为 `nightly`，但 mise 会安装当前日期对应的工具链，例如 `nightly-2026-10-07`，并将其记录在 `mise.lock` 中，确保锁定安装可复现。`mise upgrade rust` 或 `mise lock --bump` 可将已锁定的 nightly 更新到较新版本。带日期的 nightly 是精确版本固定；添加 `--bump`（例如运行 `mise upgrade --bump rust`）会将其替换为当前 nightly。

mise 也会使 rustup 自身的 `nightly` 工具链与带日期的版本保持同步，因此 `cargo +nightly` 可以正常工作。如果你通过 rustup 为 `nightly` 添加了组件或目标，mise 不会替换它；之后运行 `rustup update nightly` 只会更新该工具链，不会触及 mise 安装的带日期版本。

## 版本文件

如果项目中有 `rust-toolchain.toml`，可以让 mise 读取该文件，而不必在 `mise.toml` 中重复声明版本：

```sh
mise settings add idiomatic_version_file_enable_tools rust
mise install
mise exec -- rustup show active-toolchain
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得相同的行为。mise 会读取文件中 `[toolchain]` 表的 `channel`、`profile`、`components` 和 `targets` 键。详见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

由于 rustup 的优先级规则中，mise 设置的 `RUSTUP_TOOLCHAIN` 高于 `rust-toolchain.toml`，因此 mise 环境中会使用 mise 选择的工具链。如果 mise 未读取项目的 `rust-toolchain.toml`，全局配置中的 `rust` 条目就会覆盖它。可运行 `mise exec -- rustup show active-toolchain` 检查 Cargo 实际使用的工具链。

## Cargo、rustup 和已安装的二进制文件 {#where-rustup-and-cargo-live}

rustup 和 Cargo 会将状态保存在 `RUSTUP_HOME` 和 `CARGO_HOME` 中，默认分别为 `~/.rustup` 和 `~/.cargo`。如果环境中已设置这些变量，mise 会使用对应值。若要将 mise 的工具链与其他 rustup 安装隔离，请设置 [`rust.rustup_home`](/lang/rust.html#rust.rustup_home) 和 [`rust.cargo_home`](/lang/rust.html#rust.cargo_home)；它们的优先级高于环境变量：

```toml [mise.toml]
[settings.rust]
rustup_home = "~/.local/share/rustup"
cargo_home = "~/.local/share/cargo"
```

也可以通过 `MISE_RUSTUP_HOME` 和 `MISE_CARGO_HOME` 环境变量设置这些选项。若在 `[env]` 中设置 `RUSTUP_HOME` 或 `CARGO_HOME`，则其优先级高于以上所有设置。

如果尚未初始化 `~/.rustup` 和 `~/.cargo`，且未配置其他目录，mise 会复用通过 Homebrew、APT 或 pacman 等软件包管理器安装的 rustup。`PATH` 中必须有包含 `rustup`、`cargo` 和 `rustc` 代理命令的目录。如果显式设置了 Rust 或 Cargo 主目录，mise 则会自行初始化 rustup。

`cargo install` 会将二进制文件放入 `$CARGO_HOME/bin`，该目录位于 `PATH` 中，并由所有工具链共享。若要为项目固定 Rust CLI 版本，请使用 [`cargo:` 后端](/dev-tools/backends/cargo.html)安装，例如运行 `mise use cargo:ripgrep`。

## 环境变量

| 变量               | 值                                       |
| ------------------ | ---------------------------------------- |
| `RUSTUP_TOOLCHAIN` | 选定的工具链，例如 `1.99.0`              |
| `RUSTUP_HOME`      | 上文所述的 rustup 主目录                 |
| `CARGO_HOME`       | 上文所述的 Cargo 主目录                  |

mise 也会将 `$CARGO_HOME/bin` 或软件包管理器的代理目录加入 `PATH`。

## 从镜像安装

mise 会将环境变量传递给 rustup，因此只要设置 rustup 自身的变量，就可以使用 [panamax](https://github.com/panamax-rs/panamax) 等 rustup 镜像：

```toml
[env]
RUSTUP_DIST_SERVER = "https://mirror.example.com"
RUSTUP_UPDATE_ROOT = "https://mirror.example.com/rustup"
```

`RUSTUP_DIST_SERVER` 是 rustup 下载工具链的服务器。mise 也会从 `$RUSTUP_DIST_SERVER/dist/channel-rust-nightly.toml` 读取 `nightly` 通道清单，以解析 `rust@nightly`。设置 `RUSTUP_UPDATE_ROOT` 后，mise 会从 `$RUSTUP_UPDATE_ROOT/dist/<host-triple>/rustup-init` 下载 `rustup-init`，而不是访问 `https://sh.rust.rs`。Triple 使用 mise 的构建目标；如果设置了 [`arch`](/configuration/settings.html#arch)，则使用该设置中的体系结构。

## 使用 Mr Boxington 缓存 Cargo 构建 {#share-cargo-builds-with-mr-boxington}

[Mr Boxington](https://mr-boxington.jdx.dev/)（`mbx`）可在项目、工作树和 CI 之间缓存 Rust 编译，并在共享的 CPU 和内存预算内调度并行 Cargo 命令。详见其[基准测试](https://mr-boxington.jdx.dev/benchmarks)。启用 `mr_boxington` 工具选项，并将 mbx 添加为独立工具：

```sh
mise use --tool-option mr_boxington=true rust mr-boxington
```

这会写入：

```toml [mise.toml]
[tools]
rust = { version = "latest", mr_boxington = true }
mr-boxington = "latest"
```

之后，无论是在 `mise exec`、任务、已激活的 Shell，还是通过 mise 的 shims 运行 Cargo，都会经由 mbx 执行，无需 `mbx setup` 或 postinstall 步骤。绕过 mise 的调用（例如 rustup 的 Cargo 代理或工具链的 `cargo` 二进制文件）不会使用 mbx，因此请让编辑器和编码代理调用 mise 的 Cargo shim 或使用 `mise exec`。仅将 `mbx` 加入 `PATH` 并不足够；当前生效的 `[tools]` 中必须包含 `mr-boxington`。

此选项会应用于配置为当前平台选择的第一个 Rust 版本。mbx 有自己的版本和锁文件条目，与 Rust 相互独立。在[安全模式](/security.html#safe-mode)中，项目配置无法启用此选项。若要关闭从其他配置继承的选择加入设置，请在项目的 Rust 条目中设置 `mr_boxington = false`。

显式配置的 [`[wrappers.cargo]`](/dev-tools/shims.html#command-wrappers) 优先于此选项。若 Rust 由 mise 以外的工具管理，请直接配置该包装器。

## mise 如何安装 Rust

如果尚未初始化 rustup，mise 会从 `sh.rustup.rs` 下载 `rustup-init`（Windows 上为 `win.rustup.rs`），然后按配置的方案、组件和目标运行 `rustup toolchain install`。工具链保存在 `RUSTUP_HOME` 中，而非 mise 的安装目录；mise 会在其中维护一个链接以跟踪版本。即使工具链已安装，`mise install` 仍会补齐缺少的已配置组件和目标，以及 `minimal` 或 `default` 方案所需的组件，例如 `cargo`、`rustc` 和适用于主机的 `rust-std`。`rust.default_host` 设置传给 `rustup-init` 的主机 Triple。 (详见 [rust.default_host](/lang/rust.html#rust.default_host)。)

已安装且名为 `rust` 的插件优先于内置安装器。如果 mise 的行为与本页所述不同，请检查 [`mise plugins ls`](/cli/plugins/ls.html)，并参阅[选择其他实现](/core-tools.html#selecting-another-implementation)。

## 工具选项

### `components`

要安装的组件，可以是数组或逗号分隔的字符串。运行 `mise exec -- rustup component list` 可查看工具链提供的组件。

```toml [mise.toml]
[tools]
rust = { version = "1.99", components = ["rust-src", "llvm-tools"] }
```

### `profile`

要安装的 rustup 方案：

- `minimal`：`rustc`、`rust-std` 和 `cargo`
- `default`：在 minimal 方案基础上增加 `rust-docs`、`rustfmt` 和 `clippy`
- `complete`：安装 rustup 提供的所有组件；该方案包含元数据中曾发布的每个组件，几乎总会失败

未设置时，mise 会使用 rustup 配置的方案；可通过 `rustup show profile` 查看。

```toml [mise.toml]
[tools]
rust = { version = "1.99", profile = "minimal" }
```

### `targets`

交叉编译所需的平台，可以是数组或逗号分隔的字符串：

```toml [mise.toml]
[tools]
rust = {
  version = "1.99",
  targets = ["wasm32-unknown-unknown", "thumbv7em-none-eabi"],
}
```

### `mr_boxington`

通过 Mr Boxington 运行 Cargo。详见[使用 Mr Boxington 缓存 Cargo 构建](#share-cargo-builds-with-mr-boxington)。

### `install_env`

为 `rustup-init` 和 `rustup toolchain install` 设置环境变量。工具链由 rustup 自行下载，因此 rustup 会读取这些变量，例如通过 `RUSTUP_DIST_SERVER` 设置镜像：

```toml [mise.toml]
[tools]
rust = { version = "latest", install_env = { RUSTUP_DIST_SERVER = "https://rust-mirror.example.com" } }
```

其他通用选项请参阅[工具选项](/dev-tools/#tool-options)。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="rust" :level="3" />
