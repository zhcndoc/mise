---
description: "mise 可以在底层使用 rustup 安装 Rust/cargo。"
---

# Rust

mise 可以在底层使用 rustup 安装 Rust/cargo。如果尚未安装 rustup，它会先安装 rustup，然后安装请求的工具链、组件和目标。默认情况下，mise 会使用 `RUSTUP_HOME` 和 `CARGO_HOME` 环境变量指定的主目录；如果未设置，则回退到其标准位置（`~/.rustup` 和 `~/.cargo`）。如果要将 mise 的 rustup/cargo 与其他 rustup/cargo 安装隔离，请改为设置 `MISE_RUSTUP_HOME` 和 `MISE_CARGO_HOME` 环境变量。

这些变量也可以在 mise 配置中设置。它们会应用于同一次 mise 调用中的 Rust 操作：

```toml
[env]
MISE_RUSTUP_HOME = "{{env.HOME}}/.local/share/rustup"
MISE_CARGO_HOME = "{{env.HOME}}/.local/share/cargo"
```

`[env]` 中显式设置的 `RUSTUP_HOME` 和 `CARGO_HOME` 值优先于对应的 `MISE_` 变量。

当标准 Rust 主目录尚未初始化且未配置主目录覆盖时，mise 也可以复用由软件包管理器安装的 rustup。原始的 `PATH` 必须包含一个目录，其中有由 Homebrew、APT 和 pacman 等软件包管理器提供的 `rustup`、`cargo` 和 `rustc` 代理程序。显式设置 Rust 或 Cargo 主目录后，mise 将继续使用其管理的 rustup 初始化，而不是外部代理目录。

与大多数工具不同，Rust 工具链不会存储在 `~/.local/share/mise/installs` 中，因为它们由 rustup 管理。mise 会在那里保留一个用于安装跟踪的符号链接，将 `RUSTUP_TOOLCHAIN` 环境变量设置为请求的版本，并在运行 `mise install` 时要求 rustup 安装任何已配置的组件或目标。

## 用法

为当前项目安装最新的 stable 工具链并进行验证：

```sh
mise use rust
mise exec -- rustc --version
mise exec -- cargo --version
```

在 Cargo 项目中，使用 `mise exec -- cargo build` 或 mise 任务。为 `mise use` 添加 `-g` 可设置个人默认值。这些示例通过 mise 选择工具链；不需要激活 shell。

使用最新的 beta 版本 Rust：

```sh
mise use rust@beta
mise exec -- cargo build
```

使用滚动 nightly 通道：

```sh
mise use rust@nightly
mise exec -- cargo build
```

配置仍然是 `nightly`，而 mise 会将当前 Rust 通道清单解析为具体的 `nightly-YYYY-MM-DD` 工具链，以用于安装和锁定文件。这会使配置的通道保持滚动更新，同时让锁定安装具有可复现性。运行 `mise upgrade rust` 或 `mise lock --bump` 以推进锁定的 nightly。

如果要改为保留特定的 nightly，请显式配置其日期：

```sh
mise use rust@nightly-2026-08-13
```

显式指定日期的 nightly 是精确固定版本。使用 `--bump` 的命令（例如 `mise upgrade --bump rust`）可以将该固定版本替换为当前 nightly。

使用特定版本的 Rust：

```sh
mise use rust@1.82
mise exec -- cargo build
```

## 现有的 rustup 项目

如果项目已经使用 `rust-toolchain.toml`，请启用惯用文件发现功能，而不是在 `mise.toml` 中重复配置一个相冲突的 Rust 版本：

```sh
mise settings add idiomatic_version_file_enable_tools rust
mise install
mise exec -- rustup show active-toolchain
```

mise 会为其选择的工具链设置 `RUSTUP_TOOLCHAIN`。在将选择结果与独立运行的 rustup 调用进行比较时，请使用 `mise exec`，因为环境可能会改变 rustup 看到的覆盖设置。

## 与 Mr Boxington 共享 Cargo 构建

[Mr Boxington](https://mr-boxington.jdx.dev/)（`mbx`）是一个 Rust 构建缓存和调度器。它会跨项目、工作树和 CI 复用匹配的编译结果，因此新检出的代码也能受益于你已经完成的工作。并行的 Cargo 命令会共享 CPU 和内存预算，并且缓存会自动清理。你可以继续使用普通的 Cargo 命令；本地使用不需要缓存服务器。示例请参见[基准测试](https://mr-boxington.jdx.dev/benchmarks)。

启用 `mr_boxington` 工具选项，并将 mbx 作为单独的工具安装：

```sh
mise use --tool-option mr_boxington=true rust mr-boxington
```

这会写入等效配置：

```toml [mise.toml]
[tools]
rust = { version = "latest", mr_boxington = true }
mr-boxington = "latest"
```

在 `mise exec`、任务、已激活的 shell 和 mise shim 中运行的 Cargo 命令都会通过 mbx 执行。不需要 `mbx setup` 或 postinstall hook。mbx 使用其常规的 mise 版本选择和锁定文件条目，与 Rust 相互独立。

```sh
mise exec -- cargo build
```

编辑器和编码代理必须调用 mise 的 Cargo shim 或使用 `mise exec`。直接调用 rustup 的 Cargo 代理或工具链的 Cargo 二进制文件会绕过 mise。安全模式会忽略项目范围 Rust 条目中的选择启用设置。

显式的 `[wrappers.cargo]` 配置优先于此选项。当 Rust 在 mise 外部管理时，仍可使用[通用命令包装器配置](/dev-tools/shims.html#command-wrappers)。

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `rust` 后端——这些内容放在 `mise.toml` 的 `[tools]` 中。

### `mr_boxington`

设置 `mr_boxington = true` 可使用 Mr Boxington 包装 Cargo。默认为 `false`。要求活动工具配置中包含 `mr-boxington`；仅将 `mbx` 放在 `PATH` 中是不够的。请将其版本放在单独的 `[tools]` 条目中。

此选项适用于所选配置中第一个受平台支持的 Rust 版本。在项目的 Rust 条目中将其设置为 `false`，即可禁用继承的选择启用设置。显式配置的 Cargo 包装器不受影响。

### `install_env`

为 rustup 安装命令设置环境变量：

```toml
[tools]
rust = { version = "latest", install_env = { RUSTUP_DIST_SERVER = "https://static.rust-lang.org" } }
```

### `components`

`components` 选项指定要安装的组件。可以使用数组或逗号分隔的字符串指定多个组件。可用组件集合因发行版和工具链而异；当前列表请参阅 Rust 文档。

```toml
[tools]
"rust" = { version = "1.83.0", components = ["rust-src", "llvm-tools"] }
```

如果 Rust 工具链已经安装，`mise install` 仍会添加任何缺失的已配置组件。

### `profile`

`profile` 选项指定要安装的 rustup profile。支持以下值：

- `minimal`：包含获得可用编译器所需的尽可能少的组件（`rustc`、`rust-std` 和 `cargo`）
- `default`：包含 minimal profile 中的所有组件，并添加 `rust-docs`、`rustfmt` 和 `clippy`
- `complete`：包含通过 `rustup` 可用的所有组件。请避免使用此 profile：它包含元数据中曾经包含的每个组件，几乎总会失败。

如果未设置，则默认为 `rustup` 中配置的 profile。你可以通过运行 `rustup show profile` 来查看当前默认值。

```toml
[tools]
"rust" = { version = "1.83.0", profile = "minimal" }
```

### `targets`

`targets` 选项指定要为交叉编译安装的平台。可以使用数组或逗号分隔的字符串指定多个目标。

```toml
[tools]
rust = {
  version = "1.83.0",
  targets = ["wasm32-unknown-unknown", "thumbv7em-none-eabi"],
}
```

如果 Rust 工具链已经安装，`mise install` 仍会添加任何缺失的已配置目标。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="rust" :level="3" />
