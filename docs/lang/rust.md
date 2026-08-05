# Rust

Rust/cargo 可以安装，其底层使用 rustup。若尚未安装，mise 会安装 rustup，并安装所请求的工具链、组件和目标。默认情况下，mise 会使用
`RUSTUP_HOME` 和 `CARGO_HOME` 环境变量作为主目录；如果未设置，则回退到其标准位置（`~/.rustup` 和 `~/.cargo`）。
如果你希望将 mise 的 rustup/cargo 与其他 rustup/cargo 安装隔离，可以通过设置 `MISE_RUSTUP_HOME` 和
`MISE_CARGO_HOME` 环境变量来更改此设置。

与大多数工具不同，这些工具不会存在于 `~/.local/share/mise/installs` 中，因为它们由 rustup 管理。
mise 会在那里保留一个用于安装跟踪的符号链接，将 `RUSTUP_TOOLCHAIN` 环境变量设置为所请求的
版本，并在运行 `mise install` 时要求 rustup 安装所有已配置的组件或目标。

## 用法

使用最新稳定版的 rust：

```sh
mise use -g rust
cargo build
```

使用最新 beta 版的 rust：

```sh
mise use -g rust@beta
cargo build
```

使用指定版本的 rust：

```sh
mise use -g rust@1.82
cargo build
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `rust` 后端——这些
内容放在 `mise.toml` 的 `[tools]` 中。

### `install_env`

为 rustup 安装命令设置环境变量：

```toml
[tools]
rust = { version = "latest", install_env = { RUSTUP_DIST_SERVER = "https://static.rust-lang.org" } }
```

### `components`

`components` 选项允许你指定要安装的组件。可以将多个组件指定为数组，或使用逗号分隔。可用组件的集合可能因不同的发行版本和工具链而异。请查阅 Rust 文档以获取最新的组件列表。

```toml
[tools]
"rust" = { version = "1.83.0", components = ["rust-src", "llvm-tools"] }
```

如果 Rust 工具链已经安装，`mise install` 仍会添加任何缺失的已配置组件。

### `profile`

`profile` 选项允许你指定要安装的发布类型。支持以下值：

- `minimal`：包含尽可能少的组件，以获得一个可工作的编译器（`rustc`、`rust-std` 和 `cargo`）
- `default`：包含 minimal 配置文件中的所有组件，并额外添加 `rust-docs`、`rustfmt` 和 `clippy`
- `complete`：包含通过 `rustup` 可用的所有组件。不应使用此项，因为它包含元数据中曾经出现过的每一个组件，因此几乎总会失败。

如果未设置，则默认为 `rustup` 中配置的 profile。你可以通过运行 `rustup show profile` 来查看当前默认值。

```toml
[tools]
"rust" = { version = "1.83.0", profile = "minimal" }
```

### `targets`

`targets` 选项允许你指定要为交叉编译安装的平台列表。可以将多个目标指定为数组，或使用逗号分隔。

```toml
[tools]
"rust" = {
  version = "1.83.0",
  targets = ["wasm32-unknown-unknown", "thumbv2-none-eabi"],
}
```

如果 Rust 工具链已经安装，`mise install` 仍会添加任何缺失的已配置目标。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="rust" :level="3" />
