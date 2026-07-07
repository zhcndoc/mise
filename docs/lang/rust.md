# Rust

可以安装 Rust/cargo，它在底层使用 rustup。mise 会在 rustup 尚未安装时先安装 rustup，并添加所请求的目标。默认情况下，mise 会遵循 `RUSTUP_HOME` 和 `CARGO_HOME` 环境变量作为主目录；如果未设置，则回退到它们的标准位置（`~/.rustup` 和 `~/.cargo`）。如果你想将 mise 的 rustup/cargo 与你其他的 rustup/cargo 安装隔离开来，可以通过设置 `MISE_RUSTUP_HOME` 和 `MISE_CARGO_HOME` 环境变量来更改这一点。

与大多数工具不同，这些不会出现在 `~/.local/share/mise/installs` 中，因为它们由 rustup 管理。mise 只会将 `RUSTUP_TOOLCHAIN` 环境变量设置为所请求的版本，而如果该版本不存在，rustup 会自动安装它。

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

`components` 选项允许你指定要安装哪些组件。多个组件可以通过逗号分隔来指定。可用组件集合会因不同版本和
工具链而异。请查阅 Rust 文档以获取最新的组件列表。

```toml
[tools]
"rust" = { version = "1.83.0", components = "rust-src,llvm-tools" }
```

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

`targets` 选项允许你指定用于交叉编译的目标平台列表。多个 target 可以
通过逗号分隔来指定。

```toml
[tools]
"rust" = {
  version = "1.83.0",
  targets = "wasm32-unknown-unknown,thumbv2-none-eabi",
}
```

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="rust" :level="3" />
