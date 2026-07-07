# Cargo 后端

即使没有对应的 asdf 插件，你也可以直接从 [Cargo Crates](https://crates.io/) 安装包。

这部分代码位于 mise 仓库中的 [`./src/backend/cargo.rs`](https://github.com/jdx/mise/blob/main/src/backend/cargo.rs)。

## 依赖项

这依赖于已安装 `cargo`。你可以通过 [rustup](https://rustup.rs/) 将其安装到你的
系统中：

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

或者你也可以通过 mise 安装它：

```sh
mise use -g rust
```

## 用法

以下命令会安装 [eza](https://crates.io/crates/eza) 的最新版本，并将其设为 PATH 上的当前版本：

```sh
$ mise use -g cargo:eza
$ eza --version
eza - 现代、持续维护的 ls 替代品
v0.17.1 [+git]
https://github.com/eza-community/eza
```

版本将以以下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"cargo:eza" = "latest"
```

### 使用 Git

你可以使用 `mise` 命令从 Git 仓库安装任意包。这允许你
安装特定的标签、分支或提交修订版：

```sh
# 安装特定标签
mise use cargo:https://github.com/username/demo@tag:<release_tag>

# 安装分支中的最新版本
mise use cargo:https://github.com/username/demo@branch:<branch_name>

# 安装特定提交修订版
mise use cargo:https://github.com/username/demo@rev:<commit_hash>
```

这将执行一个带有相应 Git 选项的 `cargo install` 命令。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列的环境变量来配置这些项。

某些 Cargo 设置只有在 mise 运行 `cargo install` 时才有意义。如果 `cargo-binstall`
安装的是预编译二进制文件，那么 Cargo 的构建设置和 `cargo install` 行为不会影响该
工件。当你需要让 Cargo 设置控制安装时，请将 `cargo.binstall = false`。

当 mise 使用 `cargo-binstall` 时，mise 只会运行一次 `cargo-binstall`，并让 `cargo-binstall`
自行处理回退顺序，包括其最终回退到使用 `cargo install` 进行编译。若 `cargo-binstall`
以错误退出，mise 不会再单独重试一次 `cargo install` 命令。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="cargo" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `cargo` 后端——这些内容
应写入 `mise.toml` 中的 `[tools]`。

当 `cargo-binstall` 可用时，mise 会将其用于注册表安装，除非某个工具选项需要
`cargo install` 从源码构建。

对于不会跳过 `cargo-binstall` 的选项，任何源码构建回退都由
`cargo-binstall` 自身处理。`cargo-binstall` 失败后，mise 不会再额外执行一次编译回退。

| 选项                       | `cargo-binstall` 行为                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `features`                 | 跳过 `cargo-binstall`；需要 `cargo install --features`。                                      |
| `default-features = false` | 跳过 `cargo-binstall`；需要 `cargo install --no-default-features`。                          |
| `bin`                      | 透传给 `cargo-binstall`；不会跳过它。                                                        |
| `crate`                    | 在适用时不会跳过 `cargo-binstall`。Git 安装始终使用 `cargo install`。                         |
| `locked`                   | 透传给 `cargo-binstall`；不会跳过它。                                                        |

### `install_env`

为 `cargo install` 或 `cargo-binstall` 命令设置环境变量：

```toml
[tools]
"cargo:eza" = { version = "latest", install_env = { CARGO_NET_GIT_FETCH_WITH_CLI = "true" } }
```

### `features`

安装额外组件（作为 `cargo install --features` 传入）：

```toml
[tools]
"cargo:cargo-edit" = { version = "latest", features = "add" }
```

此选项需要 `cargo install`；当它被设置时，mise 会跳过 `cargo-binstall`。

### `default-features`

禁用默认特性（作为 `cargo install --no-default-features` 传入）：

```toml
[tools]
"cargo:cargo-edit" = { version = "latest", default-features = false }
```

将其设置为 `false` 需要 `cargo install`；在这种情况下，mise 会跳过 `cargo-binstall`。

### `bin`

在有多个可用时，选择要安装的 CLI bin 名称（作为 `cargo install --bin` 传入）：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "tag:v1.0.0", bin = "demo" }
```

`cargo-binstall` 支持此选项，因此不会导致 mise 跳过 `cargo-binstall`。

### `crate`

在有多个可用时，选择要安装的 crate 名称（作为
`cargo install --git=<repo> <crate>` 传入）：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "tag:v1.0.0", crate = "demo" }
```

在适用时，此选项不会导致 mise 跳过 `cargo-binstall`。Git 安装本来就使用
`cargo install`。

### `locked`

在构建 CLI 时使用 Cargo.lock（传入 `cargo install --locked`）。这是默认行为，
传入 `false` 可禁用：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "latest", locked = false }
```

此选项不会导致 mise 跳过 `cargo-binstall`；它只会在
`cargo-binstall` 自身回退为使用 `cargo install` 编译时影响安装。
